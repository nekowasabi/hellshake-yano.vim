import type { Denops } from "@denops/std";
import type { Config, HintMapping, Word } from "../../types.ts";
import { assignHintsToWords, calculateHintPosition, OVERLAP_SKIP_OPTS } from "../core/hint.ts";
import { generateHintsFromConfig, recordPerformance } from "../../common/utils/performance.ts";
import { clearDetectionCache } from "../core/word.ts";
import { batchGet, callAtomic } from "../../common/utils/batch.ts";

/** Module-level singleton to avoid per-line TextEncoder instantiation */
const TEXT_ENCODER = new TextEncoder();

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
    const isTest = isDeno && (Deno.env?.get?.("DENO_TEST") === "1" || Deno.args?.includes?.("test"));
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
          } catch { propTypeRegistered = true; /* already registered */ }
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
async function processExtmarksForBuffer(
  denops: Denops,
  hints: HintMapping[],
  config: Config,
  extmarkNamespace: number,
  bufnr: number,
): Promise<number[]> {
  const highlightGroup = getHighlightGroupName(config);
  const extmarkIds: number[] = [];

  // Why: callAtomic (一括取得) instead of per-hint nvim_buf_get_lines — O(N) IPC を O(1) に削減。
  // 制約 C2: callAtomic はエラー発生時に途中停止するため、事前に uniqueLines の重複を除去して呼び出す。
  const uniqueLines = [...new Set(hints.map((h) => h.word.line - 1))].filter((l) => l >= 0);
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
    const line = h.word.line - 1; // 0-indexed
    const col = (h.hintByteCol !== undefined && h.hintByteCol > 0)
      ? h.hintByteCol - 1
      : (h.word.byteCol !== undefined && h.word.byteCol > 0)
      ? h.word.byteCol - 1
      : h.word.col - 1;

    // Validate line and col to prevent E5555 (col out of range) errors
    if (line < 0 || col < 0) {
      continue; // Skip invalid positions
    }

    // Get line length from pre-fetched cache; skip if buffer/line unavailable
    const lineLength = lineLengthCache.get(line);
    if (lineLength === undefined) {
      // Buffer or line doesn't exist, skip this hint
      continue;
    }

    // Skip if col is beyond line length (would cause E5555)
    if (col > lineLength) {
      continue;
    }

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
      // callAtomic failed — log and return partial IDs collected so far
      console.warn(
        `[hellshake-yano] callAtomic failed for nvim_buf_set_extmark in buffer ${bufnr}:`,
        error,
      );
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
      existResults = await batchGet(denops, (helper) =>
        buffers.map((bufnr) => helper.call("bufexists", bufnr) as Promise<number>)
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
      .map((bufnr) => [
        "nvim_buf_clear_namespace",
        bufnr,
        extmarkNamespace,
        0,
        -1,
      ] as [string, ...unknown[]]);

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
    existResults = await batchGet(denops, (helper) =>
      buffers.map((bufnr) => helper.call("bufexists", bufnr) as Promise<number>)
    ) as number[];
  } catch (error) {
    console.error("[hellshake-yano] Failed to batch check bufexists:", error);
    existResults = buffers.map(() => 0);
  }

  const clearCalls = buffers
    .filter((_, i) => existResults[i])
    .map((bufnr) => [
      "nvim_buf_clear_namespace",
      bufnr,
      extmarkNamespace,
      0,
      -1,
    ] as [string, ...unknown[]]);

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
    const [cp, currentWinId] = await batchGet(denops, (helper) => [
      helper.call("getpos", ".") as Promise<[number, number, number, number]>,
      helper.call("win_getid") as Promise<number>,
    ] as const);
    const cl = cp[1], cc = cp[2];

    let ah = hints;
    if (hints.length < words.length) {
      ah = generateHintsFromConfig(words.length, config);
    }

    // Apply distance penalty for non-current windows
    const adjustedWords = words.map(w => ({
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
    const restoredHints = nh.map(h => ({
      ...h,
      word: {
        ...h.word,
        line: h.word.originalLine ?? h.word.line,
      }
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
