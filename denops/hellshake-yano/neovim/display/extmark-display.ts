import type { Denops } from "@denops/std";
import type { Config, HintMapping, Word } from "../../types.ts";
import { assignHintsToWords, calculateHintPosition, OVERLAP_SKIP_OPTS } from "../core/hint.ts";
import { generateHintsFromConfig, recordPerformance } from "../../common/utils/performance.ts";
import { clearDetectionCache } from "../core/word.ts";
import { batchGet, callAtomic } from "../../common/utils/batch.ts";
import { logMessage } from "../../common/utils/logger.ts";

/** Module-level singleton to avoid per-line TextEncoder instantiation */
const TEXT_ENCODER = new TextEncoder();

/**
 * RC-2 (PLAN-followup-cycle3): multi-buffer 切替時に line/col が
 * ターゲットバッファのサイズを超えて E5555 (Invalid 'col'/'line') を発生させる
 * 問題への対策。投入前に座標をバリデーション/クランプする純関数として切り出し、
 * テスト容易性を確保する。
 */
export const EXTMARK_CLAMP_WARN_INTERVAL = 100;
let extmarkClampWarnCount = 0;

/**
 * RC-2 (PLAN-followup-cycle3 Process 02): set_extmark callAtomic 失敗時の throttling
 * Why: ERROR レベルは debug flag 非依存で常時出力されるため、hot path で連続失敗すると
 *      ログが氾濫する。初回 + N 回ごとに間引く (PLAN.md Process 03 と同パターン)。
 */
export const EXTMARK_SET_FAIL_LOG_INTERVAL = 100;
let extmarkSetFailCount = 0;

/** テスト用: warn カウンタをリセット */
export function resetExtmarkClampWarnCounter(): void {
  extmarkClampWarnCount = 0;
}

/** テスト用: set_extmark 失敗カウンタをリセット */
export function resetExtmarkSetFailCounter(): void {
  extmarkSetFailCount = 0;
}

/**
 * Clamp/skip 判定の結果。
 * - "ok":   そのまま投入可能
 * - "clamp": col を line 長に丸めて投入
 * - "skip":  投入から除外
 */
export interface ClampResult {
  action: "ok" | "clamp" | "skip";
  line: number;
  col: number;
  reason?: "line-overflow" | "negative" | "line-missing" | "col-clamped";
}

/**
 * Why: callAtomic 失敗による extmark バッチ全体の停止を投入前に防ぐ。
 *      col overflow は clamp（mark 維持）、line overflow は skip（投入不可）と
 *      使い分けることで、ヒント可視化を最大限残しつつ E5555 を回避する。
 *
 * @param line - 0-indexed buffer line
 * @param col - 0-indexed byte column
 * @param bufLineCount - 対象バッファの total line count
 * @param lineLengthCache - 既に取得済の line ごとの byte length
 */
export function clampMarkPosition(
  line: number,
  col: number,
  bufLineCount: number,
  lineLengthCache: Map<number, number>,
): ClampResult {
  // 防御的: 負値は skip
  if (line < 0 || col < 0) {
    emitClampWarn(`skipped mark with negative position (line=${line}, col=${col})`);
    return { action: "skip", line, col, reason: "negative" };
  }

  // line overflow: bufLineCount と等しい / 超過は skip
  if (line >= bufLineCount) {
    emitClampWarn(
      `skipped marks due to line overflow (line=${line}, bufLineCount=${bufLineCount})`,
    );
    return { action: "skip", line, col, reason: "line-overflow" };
  }

  // line content が取得できなかった場合は skip（cache miss）
  const lineLength = lineLengthCache.get(line);
  if (lineLength === undefined) {
    return { action: "skip", line, col, reason: "line-missing" };
  }

  // col overflow: clamp（投入は継続）
  if (col > lineLength) {
    logMessage("DEBUG", "ExtmarkClamp", `clamped col ${col} -> ${lineLength} at line ${line}`);
    return { action: "clamp", line, col: lineLength, reason: "col-clamped" };
  }

  return { action: "ok", line, col };
}

/**
 * 連続失敗抑制つき WARN 出力（PLAN.md Process 03 と同パターン）
 */
function emitClampWarn(message: string): void {
  if (
    extmarkClampWarnCount === 0 ||
    extmarkClampWarnCount % EXTMARK_CLAMP_WARN_INTERVAL === 0
  ) {
    logMessage("WARN", "ExtmarkClamp", message);
  }
  extmarkClampWarnCount++;
}

export const HIGHLIGHT_BATCH_SIZE = 15;
/** Maximum hint length for small batch synchronous display */
export const MAX_HINT_LENGTH = 15;
/** Default priority for extmark hints */
export const DEFAULT_HINT_PRIORITY = 200;
/** Line offset for multi-window hint distance penalty calculation */
export const MULTI_WINDOW_LINE_OFFSET = 10000;
/** Default hint count for batch processing */
export const DEFAULT_HINT_COUNT = 10;

let _isRenderingHints = false;
let pendingHighlightTimerId: number | undefined;

export function isRenderingHints(): boolean {
  return _isRenderingHints;
}
export function abortCurrentRendering(): void {
  _isRenderingHints = false;
}

/** Tracks whether prop_type_add has already been registered (Vim only) */
let propTypeRegistered = false;

/** Computed once at module load — avoids repeated env checks per keystroke */
const TIMEOUT_DELAY: number = (() => {
  try {
    const isDeno = typeof Deno !== "undefined";
    const isTest = isDeno &&
      (Deno.env?.get?.("DENO_TEST") === "1" || Deno.args?.includes?.("test"));
    const isCI = isDeno && Deno.env?.get?.("CI") === "true";
    if (isCI) return 30;
    if (isTest) return 20;
  } catch {
    // --allow-env not granted; fall through to default
  }
  return 0;
})();

export function cleanupPendingTimers(): void {
  if (pendingHighlightTimerId !== undefined) {
    clearTimeout(pendingHighlightTimerId);
    pendingHighlightTimerId = undefined;
  }
}

function getHighlightGroupName(config: Config): string {
  const configValue = config.highlightHintMarker;
  if (typeof configValue === "string") {
    return configValue;
  }
  return "HellshakeYanoMarker";
}

export async function displayHintsOptimized(
  denops: Denops,
  words: Word[],
  hints: string[],
  config: Config,
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
  currentHints?: HintMapping[],
  hintsVisible?: { value: boolean },
): Promise<HintMapping[]> {
  const cp = await denops.call("getpos", ".") as [number, number, number, number];
  const cl = cp[1], cc = cp[2];
  let ah = hints;
  if (hints.length < words.length) ah = generateHintsFromConfig(words.length, config);
  // Why: overlap filter を常時スキップ。日本語連続語で priorityRules(symbolsPriority:1, wordsPriority:2) が誤削除する既知バグを回避（core.ts:1004-1016 と対称）
  const nh = assignHintsToWords(words, ah, cl, cc, "normal", {
    hintPosition: config.hintPosition,
    bothMinWordLength: config.bothMinWordLength,
  }, OVERLAP_SKIP_OPTS);
  if (currentHints) {
    currentHints.length = 0;
    currentHints.push(...nh);
  }
  if (hintsVisible) hintsVisible.value = true;
  await displayHintsBatched(denops, nh, config, extmarkNamespace, fallbackMatchIds);
  return nh;
}

export function displayHintsAsync(
  denops: Denops,
  config: Config,
  hints: HintMapping[],
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
): Promise<void> {
  return displayHintsBatched(denops, hints, config, extmarkNamespace, fallbackMatchIds);
}

async function displayHintsBatched(
  denops: Denops,
  hints: HintMapping[],
  config: Config,
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
): Promise<void> {
  _isRenderingHints = true;
  try {
    for (let i = 0; i < hints.length; i += HIGHLIGHT_BATCH_SIZE) {
      if (!_isRenderingHints) break;
      const batch = hints.slice(i, i + HIGHLIGHT_BATCH_SIZE);
      if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
        await processExtmarksBatched(denops, batch, config, extmarkNamespace);
      } else if (fallbackMatchIds) {
        await processMatchaddBatched(denops, batch, config, fallbackMatchIds);
      }
      // Why: setTimeout(r, 1) ではなく Promise.resolve() — 1ms の人工遅延はスループットを下げるだけで UIブロッキング防止には不要
      if (i + HIGHLIGHT_BATCH_SIZE < hints.length) await Promise.resolve();
    }
  } finally {
    _isRenderingHints = false;
  }
}

async function clearHintDisplay(
  denops: Denops,
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
): Promise<void> {
  if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
    await denops.call("nvim_buf_clear_namespace", 0, extmarkNamespace, 0, -1);
  } else if (fallbackMatchIds) {
    for (const mid of fallbackMatchIds) {
      try {
        await denops.call("matchdelete", mid);
      } catch { /* ignore */ }
    }
    fallbackMatchIds.length = 0;
  }
}

export async function hideHints(
  denops: Denops,
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
  hintsVisible?: { value: boolean },
  currentHints?: HintMapping[],
): Promise<void> {
  const st = performance.now();
  try {
    abortCurrentRendering();
    await clearHintDisplay(denops, extmarkNamespace, fallbackMatchIds);
    if (hintsVisible) hintsVisible.value = false;
    if (currentHints) currentHints.length = 0;
  } finally {
    recordPerformance("hideHints", performance.now() - st);
  }
}

export function highlightCandidateHintsAsync(
  denops: Denops,
  input: string,
  hints: HintMapping[],
  config: Config,
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
  onComplete?: () => void,
): void {
  if (pendingHighlightTimerId !== undefined) {
    clearTimeout(pendingHighlightTimerId);
    pendingHighlightTimerId = undefined;
  }
  pendingHighlightTimerId = setTimeout(() => {
    pendingHighlightTimerId = undefined;
    highlightCandidateHintsOptimized(
      denops,
      input,
      hints,
      config,
      extmarkNamespace,
      fallbackMatchIds,
    )
      .then(() => {
        if (onComplete) onComplete();
      })
      .catch(() => {
        if (onComplete) onComplete();
      });
  }, TIMEOUT_DELAY) as unknown as number;
}

export async function highlightCandidateHintsHybrid(
  denops: Denops,
  input: string,
  hints: HintMapping[],
  config: Config,
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
  onComplete?: () => void,
): Promise<void> {
  const SBS = MAX_HINT_LENGTH;
  const cands = hints.filter((h) => h.hint.startsWith(input));
  await clearHintDisplay(denops, extmarkNamespace, fallbackMatchIds);
  if (cands.length === 0) {
    if (onComplete) onComplete();
    return;
  }
  const sc = cands.slice(0, SBS);
  const ac = cands.slice(SBS);
  await displayHintsBatched(denops, sc, config, extmarkNamespace, fallbackMatchIds);
  const shouldRedraw = await denops.call("hellshake_yano#core#should_redraw") as boolean;
  if (shouldRedraw) {
    await denops.cmd("redraw");
  }
  if (ac.length > 0) {
    queueMicrotask(async () => {
      try {
        await displayHintsBatched(denops, ac, config, extmarkNamespace, fallbackMatchIds);
        if (onComplete) onComplete();
      } catch {
        if (onComplete) onComplete();
      }
    });
  } else {
    if (onComplete) onComplete();
  }
}

async function highlightCandidateHintsOptimized(
  denops: Denops,
  input: string,
  hints: HintMapping[],
  config: Config,
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
): Promise<void> {
  const cands = hints.filter((h) => h.hint.startsWith(input));
  await clearHintDisplay(denops, extmarkNamespace, fallbackMatchIds);
  await displayHintsBatched(denops, cands, config, extmarkNamespace, fallbackMatchIds);
}

async function processExtmarksBatched(
  denops: Denops,
  hints: HintMapping[],
  config: Config,
  extmarkNamespace: number,
): Promise<void> {
  const highlightGroup = getHighlightGroupName(config);
  for (const h of hints) {
    // Use hintByteCol for byte position (nvim_buf_set_extmark expects byte index)
    // Fall back to word.byteCol or word.col if hintByteCol is not available
    const line = h.word.line - 1; // 0-indexed
    const col = (h.hintByteCol !== undefined && h.hintByteCol > 0)
      ? h.hintByteCol - 1
      : (h.word.byteCol !== undefined && h.word.byteCol > 0)
      ? h.word.byteCol - 1
      : h.word.col - 1;

    try {
      await denops.call("nvim_buf_set_extmark", 0, extmarkNamespace, line, col, {
        virt_text: [[h.hint, highlightGroup]],
        virt_text_pos: "overlay",
        priority: DEFAULT_HINT_PRIORITY,
      });
    } catch (error) {
      // Skip if col is out of range (e.g., due to display column vs byte column mismatch)
      console.warn(`[hellshake-yano] Skipping extmark at line ${line + 1}, col ${col + 1}:`, error);
    }
  }
}

async function processMatchaddBatched(
  denops: Denops,
  hints: HintMapping[],
  config: Config,
  fallbackMatchIds: number[],
): Promise<void> {
  const highlightGroup = getHighlightGroupName(config);
  for (const h of hints) {
    const p = calculateHintPosition(h.word, "offset");
    const isSym = !h.hint.match(/^[A-Za-z0-9]+$/);
    if (isSym) {
      try {
        if (!propTypeRegistered && await denops.call("exists", "*prop_type_add") === 1) {
          try {
            await denops.call("prop_type_add", "HellshakeYanoSymbol", {
              highlight: highlightGroup,
            });
            propTypeRegistered = true;
          } catch {
            propTypeRegistered = true; /* already registered */
          }
        }
        if (propTypeRegistered) {
          await denops.call("prop_add", p.line, p.col, {
            type: "HellshakeYanoSymbol",
            length: h.hint.length,
            text: h.hint,
          });
        } else {
          let eh = h.hint;
          const ne = ["\\", ".", "[", "]", "^", "$", "*"];
          if (ne.some((c) => h.hint.includes(c))) {
            eh = h.hint.replace(/\\/g, "\\\\").replace(/\./g, "\\.").replace(/\[/g, "\\[")
              .replace(/\]/g, "\\]").replace(/\^/g, "\\^").replace(/\$/g, "\\$").replace(
                /\*/g,
                "\\*",
              );
          }
          const pat = `\\%${p.line}l\\%${p.col}c.`;
          const mid = await denops.call("matchadd", highlightGroup, pat, 10) as number;
          fallbackMatchIds.push(mid);
        }
      } catch {
        const pat = `\\%${p.line}l\\%${p.col}c.`;
        const mid = await denops.call("matchadd", highlightGroup, pat) as number;
        fallbackMatchIds.push(mid);
      }
    } else {
      const pat = `\\%${p.line}l\\%${p.col}c.\\{${h.hint.length}}`;
      const mid = await denops.call("matchadd", highlightGroup, pat) as number;
      fallbackMatchIds.push(mid);
    }
  }
}

// ============================================================================
// Multi-Window / Multi-Buffer Extmark Support (Phase MW)
// ============================================================================

/**
 * State tracking for multi-buffer extmarks.
 * Tracks only buffer numbers — nvim_buf_clear_namespace clears the whole
 * namespace anyway, so storing individual extmark IDs is unnecessary overhead.
 */
export const MULTI_BUFFER_EXTMARK_STATE = new Set<number>();

/**
 * Display hints across multiple buffers using extmarks
 *
 * This function handles hint display when words come from multiple windows/buffers.
 * Each word's bufnr is used to set extmarks in the correct buffer.
 *
 * @param denops - Denops instance
 * @param hints - Hint mappings (words must have bufnr set)
 * @param config - Plugin configuration
 * @param extmarkNamespace - Neovim extmark namespace
 * @returns Map of bufnr -> extmark IDs for later cleanup
 */
export async function displayHintsMultiBuffer(
  denops: Denops,
  hints: HintMapping[],
  config: Config,
  extmarkNamespace: number,
): Promise<Map<number, number[]>> {
  // Clear existing hints before displaying new ones
  // clearHintsMultiBuffer already clears all tracked buffers — no extra call needed
  await clearHintsMultiBuffer(denops, extmarkNamespace);

  _isRenderingHints = true;
  const extmarkIdsByBuffer = new Map<number, number[]>();

  try {
    // Group hints by buffer
    const hintsByBuffer = groupHintsByBuffer(hints);

    // Process each buffer
    for (const [bufnr, bufferHints] of hintsByBuffer) {
      if (!_isRenderingHints) break;

      const extmarkIds = await processExtmarksForBuffer(
        denops,
        bufferHints,
        config,
        extmarkNamespace,
        bufnr,
      );

      extmarkIdsByBuffer.set(bufnr, extmarkIds);

      // Track buffer for cleanup (IDs not needed — clear_namespace clears all)
      MULTI_BUFFER_EXTMARK_STATE.add(bufnr);
    }
  } finally {
    _isRenderingHints = false;
  }

  return extmarkIdsByBuffer;
}

/**
 * Group hints by their buffer number
 *
 * @param hints - Array of hint mappings
 * @returns Map of bufnr -> hints for that buffer
 */
function groupHintsByBuffer(hints: HintMapping[]): Map<number, HintMapping[]> {
  const grouped = new Map<number, HintMapping[]>();

  for (const hint of hints) {
    const bufnr = hint.word.bufnr ?? 0; // Default to current buffer (0)
    if (!grouped.has(bufnr)) {
      grouped.set(bufnr, []);
    }
    grouped.get(bufnr)!.push(hint);
  }

  return grouped;
}

/**
 * Process extmarks for a specific buffer
 *
 * @param denops - Denops instance
 * @param hints - Hints for this buffer
 * @param config - Plugin configuration
 * @param extmarkNamespace - Neovim extmark namespace
 * @param bufnr - Target buffer number
 * @returns Array of created extmark IDs
 */
export async function processExtmarksForBuffer(
  denops: Denops,
  hints: HintMapping[],
  config: Config,
  extmarkNamespace: number,
  bufnr: number,
): Promise<number[]> {
  const highlightGroup = getHighlightGroupName(config);
  const extmarkIds: number[] = [];

  // Why: nvim_buf_line_count を 1 回だけ取得し、line overflow を投入前に検出する (RC-2)。
  //      multi-buffer 切替時にターゲットバッファのサイズを超える line/col を渡すと
  //      callAtomic が E5555 で停止するため、事前バリデーションで防ぐ。
  let bufLineCount = Number.MAX_SAFE_INTEGER; // 取得失敗時はバリデーション無効化
  try {
    bufLineCount = await denops.call("nvim_buf_line_count", bufnr) as number;
  } catch {
    // バッファが消えた等 — 既存の callAtomic 失敗ハンドラに委ねる（保険として残す）
  }

  // Why: callAtomic (一括取得) instead of per-hint nvim_buf_get_lines — O(N) IPC を O(1) に削減。
  // 制約 C2: callAtomic はエラー発生時に途中停止するため、事前に uniqueLines の重複を除去して呼び出す。
  const uniqueLines = [...new Set(hints.map((h) => h.word.line - 1))]
    .filter((l) => l >= 0 && l < bufLineCount);
  const lineLengthCache = new Map<number, number>();

  if (uniqueLines.length > 0) {
    const lineCalls: Array<[string, ...unknown[]]> = uniqueLines.map((line) => [
      "nvim_buf_get_lines",
      bufnr,
      line,
      line + 1,
      false,
    ]);
    try {
      const lineResults = await callAtomic(denops, lineCalls);
      for (let i = 0; i < uniqueLines.length; i++) {
        const lineContent = lineResults[i] as string[];
        const byteLen = lineContent.length > 0 ? TEXT_ENCODER.encode(lineContent[0]).length : 0;
        lineLengthCache.set(uniqueLines[i], byteLen);
      }
    } catch {
      // Buffer might not exist — individual hints will be skipped below via cache miss
    }
  }

  // Why: callAtomic (一括送信) instead of per-hint nvim_buf_set_extmark — O(N) IPC を O(1) に削減。
  // ヒント50個で 50 IPC → 1 IPC（-98%削減）。
  // C2: callAtomic はエラー時途中停止するため、事前に行長チェック（Task 3-B）で
  //     無効な extmark を除外済みであることが前提。
  const extmarkCalls: Array<[string, ...unknown[]]> = [];
  // validHints は extmarkCalls と同インデックスで対応し、結果からIDを復元するために使用
  const validHints: Array<{ line: number; col: number }> = [];

  for (const h of hints) {
    if (!_isRenderingHints) break;

    // Use hintByteCol for byte position (nvim_buf_set_extmark expects byte index)
    // Fall back to word.byteCol or word.col if hintByteCol is not available
    const rawLine = h.word.line - 1; // 0-indexed
    const rawCol = (h.hintByteCol !== undefined && h.hintByteCol > 0)
      ? h.hintByteCol - 1
      : (h.word.byteCol !== undefined && h.word.byteCol > 0)
      ? h.word.byteCol - 1
      : h.word.col - 1;

    // Why: clampMarkPosition で投入前に line/col をバリデーション/クランプする (RC-2)。
    //      line overflow → skip、col overflow → clamp、line < 0 / col < 0 → skip。
    const clamped = clampMarkPosition(rawLine, rawCol, bufLineCount, lineLengthCache);
    if (clamped.action === "skip") {
      continue;
    }
    const line = clamped.line;
    const col = clamped.col;

    extmarkCalls.push([
      "nvim_buf_set_extmark",
      bufnr,
      extmarkNamespace,
      line,
      col,
      {
        // id オプションを省略してNeovimに自動割り当てさせる
        virt_text: [[h.hint, highlightGroup]],
        virt_text_pos: "overlay",
        priority: DEFAULT_HINT_PRIORITY,
      },
    ]);
    validHints.push({ line, col });
  }

  if (extmarkCalls.length > 0) {
    try {
      const results = await callAtomic(denops, extmarkCalls);
      for (const result of results) {
        extmarkIds.push(result as number);
      }
    } catch (error) {
      // Why: callAtomic failed — log via logMessage with throttling instead of console.warn.
      //      ERROR レベルは debug flag 非依存で常時出力されるため、hot path で連続失敗時の
      //      ログ氾濫を防ぐ (PLAN-followup-cycle3 Process 02、PLAN.md Process 03 と同パターン)。
      extmarkSetFailCount++;
      if (
        extmarkSetFailCount === 1 ||
        extmarkSetFailCount % EXTMARK_SET_FAIL_LOG_INTERVAL === 0
      ) {
        logMessage(
          "ERROR",
          "ExtmarkSetFail",
          `callAtomic failed for nvim_buf_set_extmark in buffer ${bufnr} (count=${extmarkSetFailCount}): ${
            String(error)
          }`,
        );
      }
    }
  }

  return extmarkIds;
}

/**
 * Clear hints from all tracked buffers
 *
 * @param denops - Denops instance
 * @param extmarkNamespace - Neovim extmark namespace
 */
export async function clearHintsMultiBuffer(
  denops: Denops,
  extmarkNamespace: number,
): Promise<void> {
  const buffers = [...MULTI_BUFFER_EXTMARK_STATE];

  if (buffers.length > 0) {
    // Why: batchGet instead of sequential bufexists calls — O(N) IPC を O(1) に削減。
    // Step 1: bufexists を一括チェック
    let existResults: number[];
    try {
      existResults = await batchGet(
        denops,
        (helper) => buffers.map((bufnr) => helper.call("bufexists", bufnr) as Promise<number>),
      ) as number[];
    } catch (error) {
      console.error("[hellshake-yano] Failed to batch check bufexists:", error);
      existResults = buffers.map(() => 0);
    }

    // Why: callAtomic instead of sequential nvim_buf_clear_namespace calls — 制約 C2 対応のため
    // existResults で事前フィルタし、存在するバッファのみを atomic 呼び出しに渡す。
    // Step 2: 存在するバッファだけ clear_namespace を一括実行
    const clearCalls = buffers
      .filter((_, i) => existResults[i])
      .map((bufnr) =>
        [
          "nvim_buf_clear_namespace",
          bufnr,
          extmarkNamespace,
          0,
          -1,
        ] as [string, ...unknown[]]
      );

    if (clearCalls.length > 0) {
      try {
        await callAtomic(denops, clearCalls);
      } catch (error) {
        console.error("[hellshake-yano] Failed to atomic clear namespaces:", error);
      }
    }
  }

  // Clear tracking state
  MULTI_BUFFER_EXTMARK_STATE.clear();
}

/**
 * Clear hints from specific buffers
 *
 * @param denops - Denops instance
 * @param extmarkNamespace - Neovim extmark namespace
 * @param buffers - Buffer numbers to clear
 */
export async function clearHintsForBuffers(
  denops: Denops,
  extmarkNamespace: number,
  buffers: number[],
): Promise<void> {
  if (buffers.length === 0) return;

  // Why: batchGet + callAtomic instead of sequential per-buffer calls — clearHintsMultiBuffer と同様の IPC削減。
  // 制約 C2: callAtomic は途中停止するため batchGet で存在確認してからフィルタする。
  let existResults: number[];
  try {
    existResults = await batchGet(
      denops,
      (helper) => buffers.map((bufnr) => helper.call("bufexists", bufnr) as Promise<number>),
    ) as number[];
  } catch (error) {
    console.error("[hellshake-yano] Failed to batch check bufexists:", error);
    existResults = buffers.map(() => 0);
  }

  const clearCalls = buffers
    .filter((_, i) => existResults[i])
    .map((bufnr) =>
      [
        "nvim_buf_clear_namespace",
        bufnr,
        extmarkNamespace,
        0,
        -1,
      ] as [string, ...unknown[]]
    );

  if (clearCalls.length > 0) {
    try {
      await callAtomic(denops, clearCalls);
    } catch (error) {
      console.error("[hellshake-yano] Failed to atomic clear namespaces:", error);
    }
  }

  for (const bufnr of buffers) {
    MULTI_BUFFER_EXTMARK_STATE.delete(bufnr);
  }
}

/**
 * Hide hints across multiple buffers
 *
 * Enhanced version of hideHints that handles multi-buffer scenarios.
 *
 * @param denops - Denops instance
 * @param extmarkNamespace - Neovim extmark namespace
 * @param fallbackMatchIds - Fallback match IDs for Vim
 * @param hintsVisible - Visibility state reference
 * @param currentHints - Current hints reference
 */
export async function hideHintsMultiBuffer(
  denops: Denops,
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
  hintsVisible?: { value: boolean },
  currentHints?: HintMapping[],
): Promise<void> {
  const st = performance.now();
  try {
    abortCurrentRendering();

    if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
      // Clear all tracked multi-buffer extmarks
      await clearHintsMultiBuffer(denops, extmarkNamespace);
      // Also clear current buffer for safety
      await denops.call("nvim_buf_clear_namespace", 0, extmarkNamespace, 0, -1);
    } else if (fallbackMatchIds) {
      for (const mid of fallbackMatchIds) {
        try {
          await denops.call("matchdelete", mid);
        } catch { /* ignore */ }
      }
      fallbackMatchIds.length = 0;
    }

    if (hintsVisible) hintsVisible.value = false;
    if (currentHints) currentHints.length = 0;

    // Clear detection cache to prevent memory leaks and stale cache issues
    // This is especially important for multi-buffer scenarios where cache can accumulate
    clearDetectionCache();
  } finally {
    recordPerformance("hideHints", performance.now() - st);
  }
}

/**
 * Display hints with automatic multi-buffer detection
 *
 * This function automatically detects if hints span multiple buffers
 * and uses the appropriate display method.
 *
 * @param denops - Denops instance
 * @param words - Words to display hints for
 * @param hints - Hint strings
 * @param config - Plugin configuration
 * @param extmarkNamespace - Neovim extmark namespace
 * @param fallbackMatchIds - Fallback match IDs for Vim
 * @param currentHints - Current hints reference
 * @param hintsVisible - Visibility state reference
 * @returns Created hint mappings
 */
export async function displayHintsAutoMultiBuffer(
  denops: Denops,
  words: Word[],
  hints: string[],
  config: Config,
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
  currentHints?: HintMapping[],
  hintsVisible?: { value: boolean },
): Promise<HintMapping[]> {
  // Check if we have multi-buffer words
  const hasMultiBuffer = words.some((w) => w.bufnr !== undefined && w.bufnr !== 0);

  if (hasMultiBuffer && denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
    // Use multi-buffer display
    // Why: batchGet instead of two sequential denops.call — reduces IPC round-trips from 2 to 1
    const [cp, currentWinId] = await batchGet(denops, (helper) =>
      [
        helper.call("getpos", ".") as Promise<[number, number, number, number]>,
        helper.call("win_getid") as Promise<number>,
      ] as const);
    const cl = cp[1], cc = cp[2];

    let ah = hints;
    if (hints.length < words.length) {
      ah = generateHintsFromConfig(words.length, config);
    }

    // Apply distance penalty for non-current windows
    const adjustedWords = words.map((w) => ({
      ...w,
      line: w.winid !== currentWinId ? w.line + MULTI_WINDOW_LINE_OFFSET : w.line,
      originalLine: w.line,
    }));

    // Why: overlap filter を常時スキップ。日本語連続語で priorityRules(symbolsPriority:1, wordsPriority:2) が誤削除する既知バグを回避（core.ts:1004-1016 と対称）
    const nh = assignHintsToWords(adjustedWords, ah, cl, cc, "normal", {
      hintPosition: config.hintPosition,
      bothMinWordLength: config.bothMinWordLength,
    }, OVERLAP_SKIP_OPTS);

    // Restore original line values to prevent hint spacing issues
    const restoredHints = nh.map((h) => ({
      ...h,
      word: {
        ...h.word,
        line: h.word.originalLine ?? h.word.line,
      },
    }));

    if (currentHints) {
      currentHints.length = 0;
      currentHints.push(...restoredHints);
    }
    if (hintsVisible) hintsVisible.value = true;

    await displayHintsMultiBuffer(denops, restoredHints, config, extmarkNamespace);

    return restoredHints;
  } else {
    // Fall back to standard display
    return displayHintsOptimized(
      denops,
      words,
      hints,
      config,
      extmarkNamespace,
      fallbackMatchIds,
      currentHints,
      hintsVisible,
    );
  }
}

/**
 * Get the current multi-buffer extmark state (for debugging)
 *
 * @returns Set of tracked buffer numbers
 */
export function getMultiBufferExtmarkState(): Set<number> {
  return new Set(MULTI_BUFFER_EXTMARK_STATE);
}

// Single buffer extmark tracking for LazyGit buffer switch fix
let singleBufferTrackedBufnr: number | null = null;

export function getSingleBufferExtmarkState(): number | null {
  return singleBufferTrackedBufnr;
}

export function clearSingleBufferExtmarkState(): void {
  singleBufferTrackedBufnr = null;
}

export function clearHintDisplayTracked(): void {
  singleBufferTrackedBufnr = null;
  MULTI_BUFFER_EXTMARK_STATE.clear();
}
