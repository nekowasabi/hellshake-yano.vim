import type { Denops } from "@denops/std";
import type { Config, HintMapping, Word } from "./types.ts";
import { assignHintsToWords, calculateHintPosition } from "./hint.ts";
import { generateHintsFromConfig, recordPerformance } from "./performance.ts";

export const HIGHLIGHT_BATCH_SIZE = 15;
let _isRenderingHints = false;
let pendingHighlightTimerId: number | undefined;

export function isRenderingHints(): boolean { return _isRenderingHints; }
export function abortCurrentRendering(): void { _isRenderingHints = false; }

function getTimeoutDelay(): number {
  const isDeno = typeof Deno !== "undefined";
  const isTest = isDeno && (Deno.env?.get?.("DENO_TEST") === "1" || Deno.args?.includes?.("test"));
  const isCI = isDeno && Deno.env?.get?.("CI") === "true";
  if (isCI) return 30;
  if (isTest) return 20;
  return 0;
}

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
  const nh = assignHintsToWords(words, ah, cl, cc, "normal", {
    hintPosition: config.hintPosition,
    bothMinWordLength: config.bothMinWordLength,
  });
  if (currentHints) { currentHints.length = 0; currentHints.push(...nh); }
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
      if (i + HIGHLIGHT_BATCH_SIZE < hints.length) await new Promise((r) => setTimeout(r, 1));
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
    // popup を全てクローズ（Vim prop API使用時）
    for (const mid of fallbackMatchIds) {
      try {
        await denops.call("popup_close", mid);
      } catch { /* ignore */ }
    }

    // prop を全て削除（Vim prop API使用時）
    try {
      await denops.call("prop_remove", {
        type: "HellshakeYanoMarker",
        all: true
      });
    } catch { /* ignore */ }

    // matchadd も削除（フォールバック用）
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
  const delay = getTimeoutDelay();
  pendingHighlightTimerId = setTimeout(() => {
    pendingHighlightTimerId = undefined;
    highlightCandidateHintsOptimized(denops, input, hints, config, extmarkNamespace, fallbackMatchIds)
      .then(() => { if (onComplete) onComplete(); })
      .catch(() => { if (onComplete) onComplete(); });
  }, delay) as unknown as number;
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
  const SBS = 15;
  const cands = hints.filter((h) => h.hint.startsWith(input));
  await clearHintDisplay(denops, extmarkNamespace, fallbackMatchIds);
  if (cands.length === 0) { if (onComplete) onComplete(); return; }
  const sc = cands.slice(0, SBS);
  const ac = cands.slice(SBS);
  await displayHintsBatched(denops, sc, config, extmarkNamespace, fallbackMatchIds);
  await denops.cmd("redraw");
  if (ac.length > 0) {
    queueMicrotask(async () => {
      try {
        await displayHintsBatched(denops, ac, config, extmarkNamespace, fallbackMatchIds);
        if (onComplete) onComplete();
      } catch { if (onComplete) onComplete(); }
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
    const p = calculateHintPosition(h.word, { hintPosition: "offset" });
    await denops.call("nvim_buf_set_extmark", 0, extmarkNamespace, p.line - 1, p.col - 1, {
      virt_text: [[h.hint, highlightGroup]],
      virt_text_pos: "overlay",
    });
  }
}

export async function processMatchaddBatched(
  denops: Denops,
  hints: HintMapping[],
  config: Config,
  fallbackMatchIds: number[],
): Promise<void> {
  const highlightGroup = getHighlightGroupName(config);

  // Vim prop API サポートチェック
  const hasPropAPI = await denops.call("exists", "*prop_type_add") === 1;
  const hasPopupAPI = await denops.call("exists", "*popup_create") === 1;

  // prop type を初期化（prop API利用可能な場合）
  if (hasPropAPI) {
    try {
      // 既存の prop type をクリーンアップ
      await denops.call("prop_type_delete", "HellshakeYanoMarker", {});
    } catch {
      // prop type が存在しない場合は無視
    }

    try {
      // prop type を追加（テキストプロパティ用、ハイライトなし）
      // popupでハイライトするため、propにはhighlightを設定しない
      await denops.call("prop_type_add", "HellshakeYanoMarker", {});
    } catch (e) {
      console.error("Failed to add prop type:", e);
    }
  }

  for (const h of hints) {
    // Vim座標系を使用してヒント位置を計算
    const p = calculateHintPosition(h.word, {
      hintPosition: "offset",
      coordinateSystem: "vim"
    });

    // Vim prop API + popup を使用（Vim 8.2+）
    if (hasPropAPI && hasPopupAPI) {
      try {
        // vim_col/vim_lineが含まれることを確認
        if (!('vim_col' in p) || !('vim_line' in p)) {
          throw new Error("calculateHintPosition did not return vim coordinates");
        }

        // ヒントの表示文字幅を取得（マルチバイト文字対応）
        const hintWidth = await denops.call("strwidth", h.hint) as number;

        // テキストプロパティを追加（位置マーカーのみ、textは使わない）
        await denops.call("prop_add", p.vim_line, p.vim_col, {
          type: "HellshakeYanoMarker",
          id: h.word.line * 10000 + h.word.col, // ユニークID
          length: 1, // 1文字分のマーカー
        });

        // popup でオーバーレイ表示（ヒント文字を表示）
        // textpropを使用する場合、line/colは-1にしてpropの位置に自動追従させる
        const popupId = await denops.call("popup_create", h.hint, {
          line: -1,  // textpropを使用するため-1（propの位置に自動配置）
          col: -1,   // textpropを使用するため-1（propの位置に自動配置）
          textprop: "HellshakeYanoMarker",
          textpropid: h.word.line * 10000 + h.word.col,
          width: hintWidth,
          height: 1,
          highlight: highlightGroup,
          zindex: 1000, // 最前面に表示
          wrap: false,  // 折り返さない
          fixed: true,  // 固定位置
        }) as number;

        // popup ID を fallbackMatchIds に保存（クリーンアップ用）
        fallbackMatchIds.push(popupId);
      } catch (e) {
        // エラー時は matchadd にフォールバック
        console.error("Failed to use prop API, falling back to matchadd:", e);
        const vim_line = 'vim_line' in p ? p.vim_line : p.line;
        const vim_col = 'vim_col' in p ? p.vim_col : p.col;
        const pat = `\\%${vim_line}l\\%${vim_col}c.\\{${h.hint.length}}`;
        const mid = await denops.call("matchadd", highlightGroup, pat, 10) as number;
        fallbackMatchIds.push(mid);
      }
    } else {
      // prop API が使えない場合は matchadd にフォールバック
      const vim_line = 'vim_line' in p ? p.vim_line : p.line;
      const vim_col = 'vim_col' in p ? p.vim_col : p.col;
      const pat = `\\%${vim_line}l\\%${vim_col}c.\\{${h.hint.length}}`;
      const mid = await denops.call("matchadd", highlightGroup, pat) as number;
      fallbackMatchIds.push(mid);
    }
  }
}
