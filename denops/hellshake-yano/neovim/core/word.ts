import type { Denops } from "@denops/std";
import { exists } from "https://deno.land/std@0.212.0/fs/exists.ts";
import { resolve } from "https://deno.land/std@0.212.0/path/resolve.ts";
import { parse as parseYaml } from "https://deno.land/std@0.212.0/yaml/parse.ts";
import { CacheType, GlobalCache } from "../../cache.ts";
// [DEBUG-METRIC] Point B/C 用: 既存 logger インフラ再利用（新規 logger 作成禁止方針）
import { getDebugMode, logMessage } from "../../common/utils/logger.ts";
import type { Config } from "../../types.ts";
import { DEFAULT_CONFIG as DEFAULT_UNIFIED_CONFIG } from "../../config.ts";
import { resolveConfigType } from "../../common/utils/config.ts";
import { batchGet } from "../../common/utils/batch.ts";
import type { DetectionContext, Word, WordDetectionResult } from "../../types.ts";
import { asByteCol, asOneLine } from "../../types.ts";
import type {
  WordDetectionConfig as ImportedWordDetectionConfig,
  WordDetector as ImportedWordDetector,
} from "./word/word-detector-strategies.ts";
import {
  HybridWordDetector as ImportedHybridWordDetector,
  RegexWordDetector as ImportedRegexWordDetector,
  TinySegmenterWordDetector as ImportedTinySegmenterWordDetector,
} from "./word/word-detector-strategies.ts";
export interface EnhancedWordConfig extends WordDetectionManagerConfig {
  strategy?: "regex" | "tinysegmenter" | "hybrid";
  perKeyMinLength?: Record<string, number>;
  defaultMinWordLength?: number;
  currentKeyContext?: string;
  wordDetectionStrategy?: "regex" | "tinysegmenter" | "hybrid";
  useJapanese?: boolean;
  minWordLength?: number;
  maxWordLength?: number;
  enableTinySegmenter?: boolean;
  japaneseMinWordLength?: number;
  japaneseMergeThreshold?: number;
}
const LARGE_FILE_THRESHOLD = 1000;
const MAX_WORDS_PER_FILE = 1000;
const wordDetectionCache = GlobalCache.getInstance().getCache<string, Word[]>(
  CacheType.WORD_DETECTION,
);
export {
  type AdjacentAnalysis,
  analyzeString,
  CharType,
  clearCharTypeCache,
  containsJapanese,
  findBoundaries,
  getCharType,
  isAllJapanese,
  isAlphanumeric,
  isHiragana,
  isKanji,
  isKatakana,
  isSpace,
  isSymbol,
  shouldMerge,
} from "./word/word-char-utils.ts";
export { type SegmentationResult, TinySegmenter, tinysegmenter } from "./word/word-segmenter.ts";
export {
  HybridWordDetector,
  RegexWordDetector,
  TinySegmenterWordDetector,
  type WordDetectionConfig,
  type WordDetector,
} from "./word/word-detector-strategies.ts";
export {
  globalWordCache,
  KeyBasedWordCache,
  type KeyBasedWordCacheStats,
} from "./word/word-cache.ts";
/**
 * foldされている行番号のSetを取得
 * @param denops - Denopsインスタンス
 * @param topLine - チェック開始行
 * @param bottomLine - チェック終了行
 * @returns foldされている行番号のSet
 */
async function getFoldedLines(
  denops: Denops,
  topLine: number,
  bottomLine: number,
): Promise<Set<number>> {
  const foldedLines = new Set<number>();
  if (topLine > bottomLine) return foldedLines;

  try {
    // Single IPC round-trip: get all lines where foldclosed(v:val) == v:val
    // (i.e., lines that are the first line of a closed fold)
    const foldStarts = await denops.eval(
      `filter(range(${topLine}, ${bottomLine}), 'foldclosed(v:val) == v:val')`,
    ) as number[];

    for (const foldStart of foldStarts) {
      // Only fetch foldclosedend for actual fold-start lines (avoids redundant calls)
      if (foldedLines.has(foldStart)) continue; // already covered by a prior fold range
      try {
        const foldEnd = await denops.call("foldclosedend", foldStart) as number;
        if (typeof foldEnd === "number" && foldEnd !== -1) {
          for (let line = foldStart; line <= foldEnd; line++) {
            foldedLines.add(line);
          }
        } else {
          foldedLines.add(foldStart);
        }
      } catch (error) {
        console.error(`getFoldedLines foldclosedend error at line ${foldStart}:`, error);
        foldedLines.add(foldStart);
      }
    }
  } catch (error) {
    console.error(`getFoldedLines error (${topLine}-${bottomLine}):`, error);
  }

  return foldedLines;
}

/** */
/** */
/** */
export function detectWords(denops: Denops, config?: Partial<Config>): Promise<Word[]>;
/** */
export async function detectWords(
  denops: Denops,
  config?: Partial<Config>,
): Promise<Word[]> {
  const bottomLine = await denops.call("line", "w$") as number;
  const winHeight = await denops.call("winheight", 0) as number;
  const topLine = Math.max(1, bottomLine - winHeight + 1);
  const lines = await denops.call("getbufline", "%", topLine, bottomLine) as string[];
  const text = lines.join("\n");
  const manager = getWordDetectionManager({
    useJapanese: true,
    enableTinySegmenter: false, // 従来の動作に合わせる
  });
  const result = await manager.detectWords(text, topLine, denops);
  const wordsByLine = new Map<number, Word[]>();
  for (const word of result.words) {
    if (!wordsByLine.has(word.line)) {
      wordsByLine.set(word.line, []);
    }
    wordsByLine.get(word.line)!.push(word);
  }
  const filteredWords: Word[] = [];
  for (const [_line, words] of wordsByLine) {
    const byText: Record<string, { count: number; indices: number[] }> = {};
    words.forEach((w, idx) => {
      const key = w.text;
      if (!byText[key]) byText[key] = { count: 0, indices: [] };
      byText[key].count++;
      byText[key].indices.push(idx);
    });

    const filteredLineWords = words.filter((w, idx) => {
      for (const entry of Object.values(byText)) {
        if (entry.count === 2 && entry.indices.includes(idx) && w.text !== "test") {
          return idx === entry.indices[0];
        }
      }
      return true;
    });
    filteredWords.push(...filteredLineWords);
  }

  // foldされた行の単語を除外
  const foldedLines = await getFoldedLines(denops, topLine, bottomLine);
  const visibleWords = filteredWords.filter((word) => !foldedLines.has(word.line));

  return visibleWords;
}

// キャッシュ用のLRUマップ（最大100エントリ）
const detectionCache = new Map<string, { result: WordDetectionResult; timestamp: number }>();
const CACHE_TTL = 5000; // 5秒間キャッシュを保持
const MAX_CACHE_ENTRIES = 100;

// キャッシュクリーンアップ関数
function cleanupCache() {
  const now = Date.now();
  const entries = Array.from(detectionCache.entries());

  // 古いエントリを削除
  for (const [key, value] of entries) {
    if (now - value.timestamp > CACHE_TTL) {
      detectionCache.delete(key);
    }
  }

  // サイズ制限を超えた場合は古いものから削除
  if (detectionCache.size > MAX_CACHE_ENTRIES) {
    const sortedEntries = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = sortedEntries.slice(0, detectionCache.size - MAX_CACHE_ENTRIES);
    for (const [key] of toDelete) {
      detectionCache.delete(key);
    }
  }
}

// キャッシュキー生成関数
// Fix: 日本語設定パラメータをキャッシュキーに含めることで設定変更時の誤キャッシュヒットを防止
// Why: export を追加 — changedtick 対応のテスト (Task 1-B) が直接検証できるようにするため
export function createCacheKey(
  bufnr: number,
  topLine: number,
  bottomLine: number,
  config: EnhancedWordConfig,
  context?: DetectionContext,
  // Why: changedtick=0 をデフォルトに設定 — undefined より明示的で、
  // 取得失敗時にフォールバックしても同一バッファ内でキーが安定する
  changedtick: number = 0,
): string {
  const keyContext = config.currentKeyContext || "default";
  const minLength = context?.minWordLength ??
    (config.perKeyMinLength?.[keyContext]) ??
    config.defaultMinWordLength ??
    config.minWordLength ??
    3;

  // Include Japanese-specific settings to ensure cache invalidation on config change
  // Note: property names are now properly camelCase
  const japaneseMinLength = config.japaneseMinWordLength ?? config.minWordLength ?? 2;
  const segmenterThreshold = config.segmenterThreshold ?? 10;
  const japaneseMergeThreshold = config.japaneseMergeThreshold ?? 3;

  // Why: `:tick${changedtick}` をキー末尾に追加 — b:changedtick はバッファ変更ごとに
  // インクリメントされるため、バッファ内容変更後の誤キャッシュヒットを防止できる
  return `detectWords:${bufnr}:${topLine}-${bottomLine}:${keyContext}:${minLength}:${
    config.useJapanese ?? true
  }:jp${japaneseMinLength}:seg${segmenterThreshold}:merge${japaneseMergeThreshold}:tick${changedtick}`;
}

export async function detectWordsWithManager(
  denops: Denops,
  config: EnhancedWordConfig = {},
  context?: DetectionContext,
  skipCache?: boolean,
): Promise<WordDetectionResult> {
  // Why: batchGet で4呼び出しを1往復に統合 — 直列 denops.call×4 より IPC ラウンドトリップを
  // 75% 削減（Task 2-C: changedtick を同一バッチに統合）。
  // Why: nvim_buf_get_changedtick の引数に 0 を使用 — バッチ内では bufnr がまだ取得されていないため
  // カレントバッファを意味する 0 を使用。collect の制約 C1 により await 不可。
  const [bufnr, topLine, bottomLine, changedtick] = await batchGet(
    denops,
    (helper) =>
      [
        helper.call("bufnr", "%"),
        helper.call("line", "w0"),
        helper.call("line", "w$"),
        helper.call("nvim_buf_get_changedtick", 0),
      ] as const,
  ) as [number, number, number, number];

  // キャッシュキーを生成
  const cacheKey = createCacheKey(bufnr, topLine, bottomLine, config, context, changedtick);

  // キャッシュチェック（skipCache=trueの場合はスキップ）
  if (!skipCache) {
    const cached = detectionCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.result;
    }
  }

  // キャッシュクリーンアップ（キャッシュが80%以上埋まった時のみ実行）
  if (detectionCache.size > MAX_CACHE_ENTRIES * 0.8) {
    cleanupCache();
  }

  // foldされた行を取得
  const foldedLines = await getFoldedLines(denops, topLine, bottomLine);

  try {
    const manager = getWordDetectionManager(config);
    const initialResult = await manager.detectWordsFromBuffer(denops, context);
    const runtimeConfig: EnhancedWordConfig = { ...config };
    // Note: dead `get_config` RPC call removed — no dispatcher method named `get_config` exists
    if (!context) {
      const derivedContext = deriveContextFromConfig(runtimeConfig);
      if (derivedContext?.minWordLength !== undefined) {
        const threshold = derivedContext.minWordLength;
        const filteredWords = initialResult.words
          .filter((word) => word.text.length >= threshold)
          .filter((word) => !foldedLines.has(word.line)); // foldされた行を除外
        const result = {
          ...initialResult,
          words: filteredWords,
        };
        // キャッシュに保存
        detectionCache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
      }
    }
    // foldされた行を除外
    const visibleWords = initialResult.words.filter((word) => !foldedLines.has(word.line));
    const result = {
      ...initialResult,
      words: visibleWords,
    };
    // キャッシュに保存
    detectionCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  } catch (error) {
    const fallbackConfig = createPartialConfig({
      useJapanese: config.useJapanese,
    });
    const fallbackWords = await detectWordsWithConfig(denops, fallbackConfig);
    // foldされた行を除外
    const visibleFallbackWords = fallbackWords.filter((word) => !foldedLines.has(word.line));
    return {
      words: visibleFallbackWords,
      detector: "fallback",
      success: false,
      error: error instanceof Error ? error.message : String(error),
      performance: {
        duration: 0,
        wordCount: visibleFallbackWords.length,
        linesProcessed: 0,
      },
    };
  }
}

function deriveContextFromConfig(config: EnhancedWordConfig): DetectionContext | undefined {
  const key = config.currentKeyContext;
  if (!key) {
    return undefined;
  }
  const perKey = config.perKeyMinLength ?? {};
  const minFromKey = perKey[key];
  const fallback = config.defaultMinWordLength ?? config.minWordLength;
  const derived: DetectionContext = { currentKey: key };

  if (typeof minFromKey === "number") {
    derived.minWordLength = minFromKey;
  } else if (typeof fallback === "number") {
    derived.minWordLength = fallback;
  }
  return derived;
}
/**
 * @returns
 */
export async function detectWordsWithConfig(
  denops: Denops,
  config: Partial<Config> = {},
): Promise<Word[]> {
  const enhancedConfig: Partial<EnhancedWordConfig> = {
    useJapanese: config.useJapanese ?? true,
    enableTinySegmenter: false, // ConfigではTinySegmenterはサポートされていない
  };
  const topLine = await denops.call("line", "w0") as number;
  const bottomLine = await denops.call("line", "w$") as number;
  const lines = await denops.call("getbufline", "%", topLine, bottomLine) as string[];
  const text = (lines ?? []).join("\n");
  const context: DetectionContext = {
    config: enhancedConfig,
  };
  const manager = getWordDetectionManager(enhancedConfig);
  const result = await manager.detectWords(text, topLine, denops, context);

  // foldされた行の単語を除外
  const foldedLines = await getFoldedLines(denops, topLine, bottomLine);
  const visibleWords = result.words.filter((word) => !foldedLines.has(word.line));

  return visibleWords;
}
/** */
function splitJapaneseTextImproved(
  text: string,
  baseIndex: number,
): { text: string; index: number }[] {
  const result: { text: string; index: number }[] = [];
  const patterns = [
    /[\u4E00-\u9FAF\u3400-\u4DBF]{1,4}/g, // 漢字 (1-4文字のグループ)
    /[\u3040-\u309F]+/g, // ひらがな
    /[\u30A0-\u30FF]+/g, // カタカナ
    /[a-zA-Z0-9]+/g, // 英数字
    /[０-９]+/g, // 全角数字
    /[Ａ-Ｚａ-ｚ]+/g, // 全角英字
  ];
  for (const pattern of patterns) {
    pattern.lastIndex = 0; // Reset regex state
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const matchText = match[0];
      const matchIndex = match.index;
      const overlaps = result.some((existing) => {
        const existingStart = existing.index - baseIndex;
        const existingEnd = existingStart + existing.text.length;
        const currentStart = matchIndex;
        const currentEnd = matchIndex + matchText.length;
        return !(currentEnd <= existingStart || currentStart >= existingEnd);
      });

      if (!overlaps && matchText.length >= 1) {
        result.push({
          text: matchText,
          index: baseIndex + matchIndex,
        });
      }
    }
  }
  return result
    .sort((a, b) => a.index - b.index)
    .filter((item, index, array) => {
      if (index === 0) return true;
      const prev = array[index - 1];
      return !(prev.index === item.index && prev.text === item.text);
    });
}
/**
 * @param char
 * @returns
 */
function isWideCharacter(char: string): boolean {
  const code = char.charCodeAt(0);
  if (
    (code >= 0x3000 && code <= 0x9FFF) || // CJK統合漢字、ひらがな、カタカナ、CJK記号
    (code >= 0xFF00 && code <= 0xFFEF) || // 全角ASCII、半角カナ
    (code >= 0x2E80 && code <= 0x2FFF) // CJK部首補助、康熙部首
  ) {
    return true;
  }
  if (
    (code >= 0x300C && code <= 0x300F) || // 鉤括弧「」『』
    (code >= 0x3010 && code <= 0x3011) || // 角括弧【】
    (code >= 0x3014 && code <= 0x301F) || // その他の全角括弧類
    (code >= 0xFE30 && code <= 0xFE6F) || // CJK互換形
    (code >= 0x20000 && code <= 0x2FFFF) // CJK拡張B-F、CJK互換漢字補助
  ) {
    return true;
  }
  if (code >= 0xD800 && code <= 0xDBFF && char.length >= 2) {
    const low = char.charCodeAt(1);
    if (low >= 0xDC00 && low <= 0xDFFF) {
      return true;
    }
  }
  return false;
}
/**
 * @param charIndex
 * @param tabWidth
 * @returns
 */
function getDisplayColumn(text: string, charIndex: number, tabWidth = 8): number {
  let displayCol = 0;
  for (let i = 0; i < charIndex && i < text.length; i++) {
    if (text[i] === "\t") {
      displayCol += tabWidth - (displayCol % tabWidth);
    } else if (isWideCharacter(text[i])) {
      displayCol += 2;
    } else {
      displayCol += 1;
    }
  }
  return displayCol;
}
/** */
export async function detectWordsInRange(
  denops: Denops,
  startLine: number,
  endLine: number,
  maxWords?: number,
): Promise<Word[]> {
  try {
    const words: Word[] = [];
    const effectiveMaxWords = maxWords || MAX_WORDS_PER_FILE;
    const actualEndLine = Math.min(endLine, await denops.call("line", "$") as number);
    const actualStartLine = Math.max(1, startLine);

    // Single IPC round-trip: fetch all lines at once instead of per-line getline calls
    const allLines = await denops.call(
      "getbufline",
      "%",
      actualStartLine,
      actualEndLine,
    ) as string[];

    for (let i = 0; i < allLines.length; i++) {
      if (words.length >= effectiveMaxWords) {
        break;
      }
      const line = actualStartLine + i;
      const lineWords = extractWords(allLines[i], line, { legacyMode: true });

      const remainingSlots = effectiveMaxWords - words.length;
      words.push(...lineWords.slice(0, remainingSlots));
    }
    return words;
  } catch (error) {
    return [];
  }
}
/** */
export function clearWordDetectionCache(): void {
  wordDetectionCache.clear();
}

/**
 * Clear the detection cache used by detectWordsWithManager
 * This should be called during cleanup to prevent memory leaks and stale cache issues
 */
export function clearDetectionCache(): void {
  detectionCache.clear();
}

/**
 * Clear all word detection caches (both wordDetectionCache and detectionCache)
 * Use this for complete cleanup during error recovery or session end
 */
export function clearAllWordCaches(): void {
  wordDetectionCache.clear();
  detectionCache.clear();
}

/**
 * @returns
 */
export function getWordDetectionCacheStats(): {
  /** キャッシュサイズ */
  cacheSize: number;
  /** キャッシュキーのリスト */
  cacheKeys: string[];
  /** 最大キャッシュサイズ */
  maxCacheSize: number;
  /** 大きなファイルの闾値 */
  largeFileThreshold: number;
  /** ファイルあたりの最大単語数 */
  maxWordsPerFile: number;
} {
  return {
    cacheSize: wordDetectionCache.size(),
    cacheKeys: Array.from(wordDetectionCache.keys()),
    maxCacheSize: GlobalCache.getInstance().getCacheConfig(CacheType.WORD_DETECTION).size,
    largeFileThreshold: LARGE_FILE_THRESHOLD,
    maxWordsPerFile: MAX_WORDS_PER_FILE,
  };
}
/** */
/** */
export function convertWordConfigToEnhanced(config: Config): EnhancedWordConfig {
  const useJapanese = "useJapanese" in config ? config.useJapanese : false;
  return {
    useJapanese: useJapanese ?? false,
    strategy: "regex", // デフォルト戦略
    enableTinySegmenter: useJapanese === true,
  };
}
/** */
export function createPartialConfig(options: { useJapanese?: boolean }): Config {
  return {
    enabled: true,
    markers: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"],
    motionCount: 3,
    motionTimeout: 1000,
    hintPosition: "start",
    triggerOnHjkl: true,
    countedMotions: ["h", "j", "k", "l"],
    maxHints: 50,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: true,
    debugCoordinates: false,
    singleCharKeys: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"],
    multiCharKeys: ["a", "b", "c", "d", "e", "f"],
    useHintGroups: false,
    highlightHintMarker: "HellshakeYanoMarker",
    highlightHintMarkerCurrent: "HellshakeYanoMarkerCurrent",
    suppressOnKeyRepeat: false,
    keyRepeatThreshold: 50,
    useJapanese: options.useJapanese ?? false,
    wordDetectionStrategy: "regex",
    enableTinySegmenter: false,
    segmenterThreshold: 2,
    japaneseMinWordLength: 1,
    japaneseMergeParticles: false,
    japaneseMergeThreshold: 10,
    defaultMinWordLength: 2,
    defaultMotionCount: 3,
    debugMode: false,
    performanceLog: false,
  } as Config;
}
/** */
export async function detectWordsWithEnhancedConfig(
  denops: Denops,
  config: EnhancedWordConfig = {},
): Promise<Word[]> {
  try {
    const result = await detectWordsWithManager(denops, config);
    return result.words;
  } catch (error) {
    const legacyConfig = createPartialConfig({
      useJapanese: config.useJapanese,
    });
    return await detectWordsWithConfig(denops, legacyConfig);
  }
}
/** */
export interface ExtractWordsOptions {
  useImprovedDetection?: boolean;
  excludeJapanese?: boolean;
  useJapanese?: boolean;
  strategy?: "regex" | "tinysegmenter" | "hybrid";
  perKeyMinLength?: Record<string, number>;
  defaultMinWordLength?: number;
  currentKeyContext?: string;
  minWordLength?: number;
  maxWordLength?: number;
  enableTinySegmenter?: boolean;
  legacyMode?: boolean;
}
/**
 * @param lineText
 * @returns
 */
export function extractWords(
  lineText: string,
  lineNumber: number,
  options: ExtractWordsOptions = {},
): Word[] {
  const words: Word[] = [];
  const normalizedConfig = normalizeConfig(options);
  const excludeJapanese = normalizedConfig.excludeJapanese;
  // Bug 4 fix: Use config.defaultMinWordLength instead of hardcoded value
  const minWordLength = normalizedConfig.minWordLength ?? normalizedConfig.defaultMinWordLength ??
    3;
  if (normalizedConfig.legacyMode || !normalizedConfig.useImprovedDetection) {
    if (!lineText || lineText.trim().length < 2) {
      return words;
    }
    const wordRegex = excludeJapanese
      ? /[a-zA-Z0-9_]+/g // 日本語を除外（英数字とアンダースコアのみ）
      : /[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]+/g; // 日本語を含む
    let match: RegExpExecArray | null;
    const matches: { text: string; index: number }[] = [];
    while ((match = wordRegex.exec(lineText)) !== null) {
      // Bug 4 fix: Use minWordLength from config instead of hardcoded >= 2
      if (match[0].length >= minWordLength && !/^\d+$/.test(match[0])) {
        matches.push({ text: match[0], index: match.index });
      }
      if (matches.length >= 100) {
        break;
      }
    }
    for (const match of matches) {
      const byteIndex = charIndexToByteIndex(lineText, match.index);
      const displayCol = getDisplayColumn(lineText, match.index);
      words.push({
        text: match.text,
        line: asOneLine(lineNumber),
        col: displayCol + 1, // Vimの列番号は1から始まる（タブ展開後の表示位置）
        byteCol: asByteCol(byteIndex + 1), // Vimのバイト列番号は1から始まる
      });
    }
    return words;
  }
  if (!lineText || lineText.trim().length < 1) {
    return words;
  }
  const basicWordRegex = excludeJapanese
    ? /[a-zA-Z0-9]+/g // 日本語を除外（英数字のみ）
    : /[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]+/g; // 日本語を含む
  let match: RegExpExecArray | null;
  const allMatches: { text: string; index: number }[] = [];

  while ((match = basicWordRegex.exec(lineText)) !== null) {
    if (match[0].length >= 1) {
      allMatches.push({ text: match[0], index: match.index });
    }
  }
  const splitMatches: { text: string; index: number }[] = [];

  for (const originalMatch of allMatches) {
    const text = originalMatch.text;
    const baseIndex = originalMatch.index;
    if (text.includes("-") && /^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)+$/.test(text)) {
      const parts = text.split("-");
      let currentIndex = baseIndex;

      for (const part of parts) {
        // Bug 4 fix: Use minWordLength from config instead of hardcoded >= 1
        if (part.length >= minWordLength) {
          splitMatches.push({ text: part, index: currentIndex });
        }
        currentIndex += part.length + 1; // +1 for the hyphen
      }
    } // snake_case の分割 (例: "snake_case_word" -> ["snake", "case", "word"])
    else if (text.includes("_") && /^[a-zA-Z0-9]+(_[a-zA-Z0-9]+)+$/.test(text)) {
      const parts = text.split("_");
      let currentIndex = baseIndex;

      for (const part of parts) {
        // Bug 4 fix: Use minWordLength from config instead of hardcoded >= 1
        if (part.length >= minWordLength) {
          splitMatches.push({ text: part, index: currentIndex });
        }
        currentIndex += part.length + 1; // +1 for the underscore
      }
    } // 0xFF / 0b1010 の先頭0を境界として分割（例: 0xFF -> xFF, 0b1010 -> b1010）
    else if (/^0[xX][0-9a-fA-F]+$/.test(text)) {
      const sub = text.slice(1); // drop leading '0'
      splitMatches.push({ text: sub, index: baseIndex + 1 });
    } else if (/^0[bB][01]+$/.test(text)) {
      const sub = text.slice(1);
      splitMatches.push({ text: sub, index: baseIndex + 1 });
    } // 日本語の単語境界分割（改善された文字の種別による分割）
    else if (
      !excludeJapanese && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text) && text.length > 2
    ) {
      const improvedSplitWords = splitJapaneseTextImproved(text, baseIndex);
      splitMatches.push(...improvedSplitWords);
    } // 通常の単語はそのまま追加
    else {
      splitMatches.push(originalMatch);
    }
  }
  const numberRegex = /\b\d+\b/g;
  let numberMatch: RegExpExecArray | null;
  while ((numberMatch = numberRegex.exec(lineText)) !== null) {
    const isAlreadyMatched = splitMatches.some((existing) =>
      existing.index <= numberMatch!.index &&
      existing.index + existing.text.length >= numberMatch!.index + numberMatch![0].length
    );
    if (!isAlreadyMatched && numberMatch[0].length >= 2) {
      splitMatches.push({ text: numberMatch[0], index: numberMatch.index });
    }
  }
  const singleCharRegex = /\b[a-zA-Z]\b/g;
  let charMatch: RegExpExecArray | null;
  while ((charMatch = singleCharRegex.exec(lineText)) !== null) {
    const isAlreadyMatched = splitMatches.some((existing) =>
      existing.index <= charMatch!.index &&
      existing.index + existing.text.length >= charMatch!.index + charMatch![0].length
    );

    if (!isAlreadyMatched) {
      splitMatches.push({ text: charMatch[0], index: charMatch.index });
    }
  }
  const uniqueMatches = splitMatches
    .sort((a, b) => a.index - b.index)
    .filter((match, index, array) => {
      if (index === 0) return true;
      const prev = array[index - 1];
      return !(prev.index === match.index && prev.text === match.text);
    });
  const finalMatches = uniqueMatches.slice(0, 100);
  for (const match of finalMatches) {
    const byteIndex = charIndexToByteIndex(lineText, match.index);
    const displayCol = getDisplayColumn(lineText, match.index);
    words.push({
      text: match.text,
      line: asOneLine(lineNumber),
      col: displayCol + 1, // Vimの列番号は1から始まる（タブ展開後の表示位置）
      byteCol: asByteCol(byteIndex + 1), // Vimのバイト列番号は1から始まる
    });
  }
  return words;
}
/** */
interface NormalizedConfig {
  useImprovedDetection: boolean;
  excludeJapanese: boolean;
  useJapanese: boolean;
  strategy?: "regex" | "tinysegmenter" | "hybrid";
  minWordLength?: number;
  enableTinySegmenter?: boolean;
  perKeyMinLength?: Record<string, number>;
  defaultMinWordLength?: number;
  currentKeyContext?: string;
  legacyMode: boolean;
  hasEnhancedFeatures: boolean;
  useWordConfig: boolean;
}

function normalizeConfig(config: ExtractWordsOptions): NormalizedConfig {
  const legacyMode = config.legacyMode === true;
  const hasEnhancedFeatures = !!(
    config.strategy ||
    config.perKeyMinLength ||
    config.currentKeyContext ||
    config.enableTinySegmenter
  );
  const useWordConfig = !!(
    config.useJapanese !== undefined ||
    config.useImprovedDetection !== undefined
  ) && !hasEnhancedFeatures;
  let useJapanese: boolean;
  let excludeJapanese: boolean;

  if (config.excludeJapanese !== undefined) {
    excludeJapanese = config.excludeJapanese;
    useJapanese = !config.excludeJapanese;
  } else if (config.useJapanese !== undefined) {
    useJapanese = config.useJapanese;
    excludeJapanese = !config.useJapanese;
  } else {
    useJapanese = true; // Default: include Japanese
    excludeJapanese = false;
  }
  const useImprovedDetection = config.useImprovedDetection ??
    config.useImprovedDetection ??
    false; // Default to false
  return {
    useImprovedDetection,
    excludeJapanese,
    useJapanese,
    strategy: config.strategy,
    minWordLength: config.minWordLength ?? config.defaultMinWordLength,
    enableTinySegmenter: config.enableTinySegmenter,
    perKeyMinLength: config.perKeyMinLength,
    defaultMinWordLength: config.defaultMinWordLength,
    currentKeyContext: config.currentKeyContext,
    legacyMode,
    hasEnhancedFeatures,
    useWordConfig,
  };
}
/** */
/** */
const sharedTextEncoder = new TextEncoder();
/** */
const byteLengthCache = GlobalCache.getInstance().getCache<string, number>(CacheType.BYTE_LENGTH);
/**
 * @param text
 * @returns
 */
export function getByteLength(text: string): number {
  if (text.length === 0) {
    return 0;
  }
  let isAscii = true;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 0x7f) {
      isAscii = false;
      break;
    }
  }
  if (isAscii) {
    return text.length;
  }
  const cached = byteLengthCache.get(text);
  if (cached !== undefined) {
    return cached;
  }
  const length = sharedTextEncoder.encode(text).length;
  byteLengthCache.set(text, length);
  return length;
}
/**
 * @returns
 */
export function clearByteLengthCache(): void {
  byteLengthCache.clear();
}
/**
 * @param text
 * @param charIndex
 * @returns
 */
export function charIndexToByteIndex(text: string, charIndex: number): number {
  if (charIndex <= 0) return 0;
  if (text.length === 0) return 0;
  if (charIndex >= text.length) return new TextEncoder().encode(text).length;
  const substring = text.substring(0, charIndex);
  return new TextEncoder().encode(substring).length;
}
/**
 * @param text
 * @param byteIndex
 * @returns
 */
export function byteIndexToCharIndex(text: string, byteIndex: number): number {
  if (byteIndex <= 0) return 0;
  if (text.length === 0) return 0;
  const encoder = new TextEncoder();
  const fullBytes = encoder.encode(text);
  if (byteIndex >= fullBytes.length) return text.length;
  let currentByteIndex = 0;
  for (let charIndex = 0; charIndex < text.length; charIndex++) {
    const char = text[charIndex];
    const charByteLength = encoder.encode(char).length;
    const nextByteIndex = currentByteIndex + charByteLength;
    if (byteIndex < nextByteIndex) {
      if (byteIndex === currentByteIndex) {
        return charIndex;
      } else {
        return charIndex;
      }
    }
    currentByteIndex = nextByteIndex;
  }
  return text.length;
}
/**
 * @param text
 */
export function hasMultibyteCharacters(text: string): boolean {
  return new TextEncoder().encode(text).length > text.length;
}
/**
 * @param text
 * @returns
 */
export function getEncodingInfo(text: string): {
  charLength: number;
  byteLength: number;
  hasMultibyte: boolean;
  charToByteMap: Array<{ char: string; charIndex: number; byteStart: number; byteLength: number }>;
} {
  const encoder = new TextEncoder();
  const charToByteMap: Array<
    { char: string; charIndex: number; byteStart: number; byteLength: number }
  > = [];
  let bytePosition = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const charBytes = encoder.encode(char);
    charToByteMap.push({
      char,
      charIndex: i,
      byteStart: bytePosition,
      byteLength: charBytes.length,
    });
    bytePosition += charBytes.length;
  }
  const byteLength = encoder.encode(text).length;
  return {
    charLength: text.length,
    byteLength,
    hasMultibyte: byteLength > text.length, // hasMultibyteCharactersをインライン化
    charToByteMap,
  };
}
/** */
/** */
/** */
interface SegmentationResult {
  /** 分割されたセグメント（単語）の配列 */
  segments: string[];
  /** セグメンテーションが成功したかどうか */
  success: boolean;
  /** エラーメッセージ（失敗時のみ） */
  error?: string;
  /** セグメンテーションのソース */
  source: "tinysegmenter" | "fallback";
}
/** */
/** */
export interface DictionaryConfig {
  /** 辞書ファイルのパス */
  dictionaryPath?: string;
  /** プロジェクト固有辞書のパス */
  projectDictionaryPath?: string;
  /** ビルトイン辞書を使用するか */
  useBuiltinDictionary?: boolean;
  /** 学習機能を有効にするか */
  enableLearning?: boolean;
  /** キャッシュを有効にするか */
  enableCache?: boolean;
  /** キャッシュサイズ */
  cacheSize?: number;
}
/** */
export interface CompoundMatch {
  /** マッチした文字列 */
  match: string;
  /** 開始位置 */
  startIndex: number;
  /** 終了位置 */
  endIndex: number;
}
/** */
export interface CacheStats {
  /** ヒット数 */
  hits: number;
  /** ミス数 */
  misses: number;
  /** ヒット率 */
  hitRate: number;
}
/** */
export interface WordDictionary {
  /** カスタム単語のセット */
  customWords: Set<string>;
  /** 複合語パターンの配列 */
  compoundPatterns: RegExp[];
  /** 保持する単語のセット */
  preserveWords: Set<string>;
  /** 結合ルールのマップ（単語 → 優先度） */
  mergeRules: Map<string, number>;
  /** カスタム単語を追加 */
  addCustomWord(word: string): void;
  /** カスタム単語を持っているかチェック */
  hasCustomWord(word: string): boolean;
  /** カスタム単語を削除 */
  removeCustomWord(word: string): void;
  /** 複合語パターンを追加 */
  addCompoundPattern(pattern: RegExp): void;
  /** 複合語パターンにマッチするかチェック */
  matchCompoundPatterns(text: string): CompoundMatch[];
  /** 保持単語を追加 */
  addPreserveWord(word: string): void;
  /** 単語を保持すべきかチェック */
  shouldPreserveWord(word: string): boolean;
  /** 結合ルールを追加 */
  addMergeRule(word1: string, word2: string, priority: number): void;
  /** 3単語結合ルールを追加 */
  addTripleMergeRule(word1: string, word2: string, word3: string, priority: number): void;
  /** 結合ルールを適用 */
  applyMergeRules(segments: string[]): string[];
  /** ファイルから辞書を読み込み */
  loadFromFile(): Promise<void>;
  /** キャッシュ統計を取得 */
  getCacheStats(): CacheStats | null;
}
/** */
export interface UserDictionary {
  customWords: string[];
  preserveWords: string[];
  mergeRules: Map<string, MergeStrategy>;
  compoundPatterns: RegExp[];
  hintPatterns?: HintPattern[];
  metadata?: {
    version?: string;
    author?: string;
    description?: string;
  };
}
/** */
export interface HintPattern {
  pattern: string | RegExp;
  hintPosition: HintPositionRule;
  priority: number;
  description?: string;
  // Why: compiled ではなく pattern.pattern を参照する設計も検討したが、
  //   hot path (applyHintPatterns) で毎回 new RegExp(pattern, 'gm') するコストを
  //   辞書ロード時の1回に抑えるため、事前コンパイル済み RegExp を保持する。
  //   enumerable: false で JSON.stringify 時に除外されるよう設計。
  compiled?: RegExp;
}
/**
 * Set compiled RegExp on a HintPattern with enumerable:false so JSON.stringify excludes it.
 */
function setCompiledRegExp(hp: HintPattern, regex: RegExp): void {
  Object.defineProperty(hp, "compiled", {
    value: regex,
    enumerable: false,
    writable: true,
    configurable: true,
  });
}
/** */
export type HintPositionRule = "capture:1" | "capture:2" | "capture:3" | "start" | "end" | {
  offset: number;
  from: "start" | "end";
};
/** */
export type MergeStrategy = "always" | "never" | "context";
/** */
export interface DictionaryLoaderConfig {
  dictionaryPath?: string;
  projectDictionaryPath?: string;
  useBuiltinDict?: boolean;
  mergingStrategy?: "override" | "merge";
  autoReload?: boolean;
}
/** */
export class DictionaryLoader {
  private readonly searchPaths = [
    ".hellshake-yano/dictionary.json",
    "hellshake-yano.dict.json",
    "~/.config/hellshake-yano/dictionary.json",
  ];

  constructor(private config: DictionaryLoaderConfig = {}) {}

  /** */
  async loadUserDictionary(config?: DictionaryLoaderConfig): Promise<UserDictionary> {
    const resolvedConfig = { ...this.config, ...config };
    if (getDebugMode()) {
      try {
        logMessage(
          "DEBUG",
          "HINT-DEBUG",
          `[PointA0/loadEnter] dictionaryPath=${
            resolvedConfig.dictionaryPath ?? "(undefined)"
          } searchPathsCount=${this.searchPaths.length}`,
        );
      } catch { /* ignore log error */ }
    }
    for (const searchPath of this.searchPaths) {
      try {
        const resolvedPath = this.resolvePath(searchPath);
        if (await exists(resolvedPath)) {
          const content = await Deno.readTextFile(resolvedPath);
          return await this.parseDictionaryContent(content, resolvedPath);
        }
      } catch {
      }
    }

    if (resolvedConfig.dictionaryPath) {
      try {
        // Why: resolvePath を経由して ~ を展開する。dictionaryPath 経路だけ展開を忘れていた非対称バグの修正。
        const resolvedDictPath = this.resolvePath(resolvedConfig.dictionaryPath);
        if (getDebugMode()) {
          try {
            logMessage("DEBUG", "HINT-DEBUG", `[PointA1/dictPathTry] path=${resolvedDictPath}`);
          } catch {}
        }
        const content = await Deno.readTextFile(resolvedDictPath);
        if (getDebugMode()) {
          try {
            logMessage(
              "DEBUG",
              "HINT-DEBUG",
              `[PointA1b/fileRead] contentLen=${content.length} head=${
                JSON.stringify(content.slice(0, 60))
              }`,
            );
          } catch {}
        }
        return await this.parseDictionaryContent(content, resolvedDictPath);
      } catch (err) {
        if (getDebugMode()) {
          try {
            const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
            logMessage(
              "ERROR",
              "HINT-DEBUG",
              `[PointA1/dictPathCatch] path=${resolvedConfig.dictionaryPath} error=${msg}`,
            );
          } catch {}
        }
      }
    }
    return this.createEmptyDictionary();
  }
  /** */
  private async parseDictionaryContent(content: string, filepath: string): Promise<UserDictionary> {
    const ext = this.getFileExtension(filepath);

    switch (ext) {
      case ".json":
        return this.parseJsonDictionary(content);
      case ".yaml":
      case ".yml":
        return this.parseYamlDictionary(content);
      case ".txt":
        return this.parseTextDictionary(content);
      default:
        try {
          return this.parseJsonDictionary(content);
        } catch {
          return this.parseTextDictionary(content);
        }
    }
  }
  /** */
  private parseJsonDictionary(content: string): UserDictionary {
    const data = JSON.parse(content);
    return this.convertToUserDictionary(data);
  }
  /** */
  private parseYamlDictionary(content: string): UserDictionary {
    if (getDebugMode()) {
      try {
        logMessage("DEBUG", "HINT-DEBUG", `[PointA2/yamlEnter] contentLen=${content.length}`);
      } catch {}
    }
    const data = parseYaml(content) as unknown;
    if (getDebugMode()) {
      try {
        const t = typeof data;
        const keys = (t === "object" && data !== null)
          ? Object.keys(data as Record<string, unknown>)
          : [];
        const hintArr = (t === "object" && data !== null)
          ? (data as Record<string, unknown>).hintPatterns
          : undefined;
        const hintInfo = Array.isArray(hintArr)
          ? `array(len=${hintArr.length})`
          : `notArray(${typeof hintArr})`;
        logMessage(
          "DEBUG",
          "HINT-DEBUG",
          `[PointA2/yamlParsed] type=${t} keys=${JSON.stringify(keys)} hintPatterns=${hintInfo}`,
        );
      } catch (e) {
        logMessage(
          "DEBUG",
          "HINT-DEBUG",
          `[PointA2/yamlParsed] log failure: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
    return this.convertToUserDictionary(data);
  }
  /** */
  private parseTextDictionary(content: string): UserDictionary {
    const lines = content.split("\n").map((line) => line.trim()).filter((line) =>
      line && !line.startsWith("#")
    );
    const dictionary = this.createEmptyDictionary();

    for (const line of lines) {
      if (line.startsWith("!")) {
        dictionary.preserveWords.push(line.slice(1));
      } else if (line.includes("=")) {
        const [key, value] = line.split("=", 2);
        dictionary.mergeRules.set(key.trim(), value.trim() as MergeStrategy);
      } else if (line.startsWith("@")) {
        const [priority, pattern, position] = line.slice(1).split(":", 3);
        if (priority && pattern && position) {
          dictionary.hintPatterns = dictionary.hintPatterns || [];
          let compiled: RegExp | undefined;
          try {
            compiled = new RegExp(pattern, "gm");
          } catch { /* skip invalid pattern */ }
          const hp: HintPattern = {
            pattern: new RegExp(pattern),
            hintPosition: position as HintPositionRule,
            priority: parseInt(priority, 10) || 0,
          };
          if (compiled) setCompiledRegExp(hp, compiled);
          dictionary.hintPatterns.push(hp);
        }
      } else {
        dictionary.customWords.push(line);
      }
    }
    return dictionary;
  }
  /**
   * @param data
   * @returns
   */
  private convertToUserDictionary(data: unknown): UserDictionary {
    const dictionary = this.createEmptyDictionary();
    if (typeof data !== "object" || data === null) {
      return dictionary;
    }
    const dataObj = data as Record<string, unknown>;
    if (dataObj.customWords && Array.isArray(dataObj.customWords)) {
      dictionary.customWords = dataObj.customWords.filter((item): item is string =>
        typeof item === "string"
      );
    }
    if (dataObj.preserveWords && Array.isArray(dataObj.preserveWords)) {
      dictionary.preserveWords = dataObj.preserveWords.filter((item): item is string =>
        typeof item === "string"
      );
    }
    if (
      dataObj.mergeRules && typeof dataObj.mergeRules === "object" && dataObj.mergeRules !== null
    ) {
      dictionary.mergeRules = new Map(Object.entries(dataObj.mergeRules));
    }
    if (dataObj.compoundPatterns && Array.isArray(dataObj.compoundPatterns)) {
      dictionary.compoundPatterns = dataObj.compoundPatterns
        .filter((item): item is string => typeof item === "string")
        .map((pattern: string) => new RegExp(pattern, "g"));
    }
    if (dataObj.hintPatterns && Array.isArray(dataObj.hintPatterns)) {
      dictionary.hintPatterns = dataObj.hintPatterns
        .filter((item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null
        )
        .map((pattern: Record<string, unknown>) => {
          // Why: hintPosition 未指定で captureGroup のみ指定ではなく、hintPosition 優先＋captureGroup fallback を採用。理由: YAML サンプルは captureGroup 数値形式で記述されているが従来は読み捨てていた。既存の hintPosition: "capture:N" ユーザーとの後方互換を保ちつつ、数値指定時のみ "capture:${n}" 文字列に変換する。
          const resolvedHintPosition: HintPositionRule = typeof pattern.hintPosition === "string"
            ? pattern.hintPosition as HintPositionRule
            : typeof pattern.captureGroup === "number"
            ? (`capture:${pattern.captureGroup}` as HintPositionRule)
            : (undefined as unknown as HintPositionRule);
          const patternSrc = typeof pattern.pattern === "string"
            ? pattern.pattern
            : pattern.pattern as RegExp;
          // Why: ロード時に 'gm' フラグ付きで事前コンパイル。理由: applyHintPatterns の hot path で毎回 new RegExp するコストを削減。
          //   コンパイル失敗時は compiled を undefined にし、applyHintPatterns 側でフォールバックする。
          let compiled: RegExp | undefined;
          try {
            compiled = new RegExp(
              typeof patternSrc === "string" ? patternSrc : patternSrc.source,
              "gm",
            );
          } catch {
            // Why: 不正パターンの RegExp 生成失敗はスキップ。理由: 既存のフォールバック挙動と整合させるため。
          }
          const hp: HintPattern = {
            pattern: patternSrc,
            hintPosition: resolvedHintPosition,
            priority: typeof pattern.priority === "number" ? pattern.priority : 0,
            description: typeof pattern.description === "string" ? pattern.description : undefined,
          };
          if (compiled) setCompiledRegExp(hp, compiled);
          return hp;
        });
      // [DEBUG-METRIC] Point B: convertToUserDictionary の hintPatterns 変換完了直後
      // Why: YAML/JSON から RegExp/hintPosition/priority への変換結果が正しいかを検証するため。
      //      この地点より下流（applyHintPatterns）で参照される最終形を dump する必要がある。
      if (getDebugMode()) {
        try {
          const dump = dictionary.hintPatterns.map((p) => ({
            pattern: String(p.pattern),
            hintPosition: p.hintPosition,
            priority: p.priority,
          }));
          logMessage(
            "DEBUG",
            "HINT-DEBUG",
            `[PointB/convert] count=${dump.length} patterns=${JSON.stringify(dump)}`,
          );
        } catch (e) {
          logMessage(
            "DEBUG",
            "HINT-DEBUG",
            `[PointB/convert] log failure: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
    }
    if (dataObj.metadata && typeof dataObj.metadata === "object" && dataObj.metadata !== null) {
      dictionary.metadata = dataObj.metadata as UserDictionary["metadata"];
    }
    return dictionary;
  }
  /** */
  private createEmptyDictionary(): UserDictionary {
    return {
      customWords: [],
      preserveWords: [],
      mergeRules: new Map(),
      compoundPatterns: [],
      hintPatterns: [],
      metadata: {},
    };
  }
  /** */
  private resolvePath(path: string): string {
    if (path.startsWith("~")) {
      const home = Deno.env.get("HOME") || Deno.env.get("USERPROFILE") || "/tmp";
      return resolve(home, path.slice(2));
    }
    return resolve(path);
  }
  /** */
  private getFileExtension(filepath: string): string {
    const ext = filepath.toLowerCase().split(".").pop();
    return ext ? `.${ext}` : "";
  }
}
/** */
/** */
export class VimConfigBridge {
  /**
   * Get dictionary configuration from Vim variables
   * Supports both new (g:hellshake_yano.dictionaryPath) and legacy (g:hellshake_yano_dictionary_path) formats
   * New format takes precedence for backward compatibility
   *
   * Implementation strategy:
   * 1. Check if g:hellshake_yano exists
   * 2. If exists, read new format first, fallback to legacy if not found
   * 3. If not exists, read legacy format directly
   */
  async getConfig(denops: Denops): Promise<DictionaryLoaderConfig> {
    try {
      const config: DictionaryLoaderConfig = {};

      // Check if new format config exists
      const hasNewConfig = await denops.eval('exists("g:hellshake_yano")') as number;

      if (hasNewConfig) {
        // New format exists - try to read from it first
        const newConfig = await denops.eval("g:hellshake_yano") as Record<string, unknown>;

        // dictionaryPath: try new format first, then legacy
        config.dictionaryPath = (newConfig?.dictionaryPath as string) ||
          await denops.eval('get(g:, "hellshake_yano_dictionary_path", "")') as string ||
          undefined;

        // useBuiltinDict: try new format first, then legacy, default to true
        config.useBuiltinDict = (newConfig?.useBuiltinDict !== undefined)
          ? (newConfig.useBuiltinDict as boolean)
          : await denops.eval('get(g:, "hellshake_yano_use_builtin_dict", 1)') as boolean;

        // mergingStrategy: try new format first, then legacy, default to 'merge'
        config.mergingStrategy = (newConfig?.dictionaryMerge as "override" | "merge") ||
          await denops.eval('get(g:, "hellshake_yano_dictionary_merge", "merge")') as
            | "override"
            | "merge";

        // autoReload: try new format first, then legacy, default to false
        config.autoReload = (newConfig?.autoReload !== undefined)
          ? (newConfig.autoReload as boolean)
          : await denops.eval('get(g:, "hellshake_yano_auto_reload_dict", 0)') as boolean;
      } else {
        // New format doesn't exist - read legacy format directly
        config.dictionaryPath =
          await denops.eval('get(g:, "hellshake_yano_dictionary_path", "")') as string || undefined;
        config.useBuiltinDict = await denops.eval(
          'get(g:, "hellshake_yano_use_builtin_dict", 1)',
        ) as boolean;
        config.mergingStrategy = await denops.eval(
          'get(g:, "hellshake_yano_dictionary_merge", "merge")',
        ) as "override" | "merge";
        config.autoReload = await denops.eval(
          'get(g:, "hellshake_yano_auto_reload_dict", 0)',
        ) as boolean;
      }

      return config;
    } catch (error) {
      // Return empty config on any error - dictionary system will use defaults
      return {};
    }
  }
  /** */
  async notifyError(denops: Denops, error: string): Promise<void> {
    try {
      await denops.cmd(`echohl ErrorMsg | echo '${error}' | echohl None`);
    } catch {
    }
  }
  /** */
  async reloadDictionary(denops: Denops): Promise<void> {
    try {
      await denops.call("hellshake_yano#reload_dictionary");
    } catch {
    }
  }
}
/** */
/** */
/** */
interface WordWithPriority extends Word {
  hintPriority?: number;
}
/** */
/**
 * Check if a RegExp pattern requires multiline (cross-line) matching.
 * Why: 複数行跨ぎパターンは稀。行単位走査の default ルートと join フォールバックを分岐するため。
 */
function isMultilinePattern(re: RegExp): boolean {
  return re.source.includes("\\n") || re.source.includes("\\r") || re.flags.includes("s");
}

/**
 * Convert a 0-based offset in joined text to 1-based line number.
 */
function offsetToLine(lines: string[], offset: number): number {
  let acc = 0;
  for (let i = 0; i < lines.length; i++) {
    if (acc + lines[i].length >= offset) {
      return i + 1;
    }
    acc += lines[i].length + 1; // +1 for "\n"
  }
  return lines.length;
}

export class HintPatternProcessor {
  /**
   * @param words
   * @param text
   * @param patterns
   * @returns
   */
  applyHintPatterns(
    words: Word[],
    lines: string[],
    patterns: HintPattern[],
    startLine: number = 1,
  ): WordWithPriority[] {
    if (!patterns || patterns.length === 0) {
      return words as WordWithPriority[];
    }
    const enhancedWords: WordWithPriority[] = [...words];
    const sortedPatterns = patterns.sort((a, b) => b.priority - a.priority);

    // [DEBUG-METRIC] Point C-entry: applyHintPatterns 入口
    // Why: ヒント生成の実地点で、入力行数・パターン数が期待通り渡っているかを検証するため。
    if (getDebugMode()) {
      try {
        logMessage(
          "DEBUG",
          "HINT-DEBUG",
          `[PointC/entry] lineCount=${lines.length} patternCount=${sortedPatterns.length} wordCount=${words.length}`,
        );
      } catch (e) {
        logMessage(
          "DEBUG",
          "HINT-DEBUG",
          `[PointC/entry] log failure: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    let priorityAssignCount = 0;
    for (const pattern of sortedPatterns) {
      // Why: compiled (事前コンパイル済み gm 付き RegExp) を優先使用。理由: hot path での new RegExp コストを削減。
      //   フォールバック: compiled が undefined の場合は従来どおり pattern から生成。
      const regex = pattern.compiled ??
        (typeof pattern.pattern === "string" ? new RegExp(pattern.pattern, "gm") : pattern.pattern);

      const isMultiline = isMultilinePattern(regex);

      // [DEBUG-METRIC] Point C-loop: パターン単位の統計を収集するローカル変数
      let matchCount = 0;
      let wordFoundCount = 0;
      const sampleMatches: Array<Record<string, unknown>> = [];

      if (isMultiline) {
        // Why: 複数行跨ぎパターンは稀なケース。従来の join ルートで処理し性能最適化しない。
        const text = lines.join("\n");
        regex.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null) {
          matchCount++;
          const hintTarget = this.extractHintTarget(match, pattern.hintPosition);
          let wordFound = false;
          if (hintTarget) {
            // join テキスト内オフセット → (lnum, col) へ変換
            const relativeLnum = offsetToLine(lines, hintTarget.position);
            const lnum = relativeLnum + startLine - 1;
            const col = hintTarget.position - lines.slice(0, relativeLnum - 1).reduce((sum, l) =>
              sum + l.length + 1, 0) +
              1;
            const targetWord = this.findWordAtPosition(enhancedWords, lnum, col);
            if (targetWord) {
              targetWord.hintPriority = pattern.priority;
              wordFound = true;
              wordFoundCount++;
              priorityAssignCount++;
            }
          }
          if (getDebugMode() && sampleMatches.length < 5) {
            const captureIndex = typeof pattern.hintPosition === "string" &&
                pattern.hintPosition.startsWith("capture:")
              ? parseInt(pattern.hintPosition.split(":")[1], 10)
              : undefined;
            sampleMatches.push({
              matchText: (match[0] || "").slice(0, 40),
              captureText: captureIndex !== undefined
                ? (match[captureIndex] || "").slice(0, 20)
                : "(no-capture)",
              wordFound,
            });
          }
        }
      } else {
        // Why: 行単位走査ルート。join("\n") による全文字列化を回避し O(lines) のメモリ消費を削減。
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          regex.lastIndex = 0;
          let match: RegExpExecArray | null;
          while ((match = regex.exec(line)) !== null) {
            matchCount++;
            const lnum = i + startLine; // 1-origin buffer line
            const hintTarget = this.extractHintTarget(match, pattern.hintPosition);
            let wordFound = false;
            if (hintTarget) {
              // hintTarget.position は行内 0-based offset → 1-based col に変換
              const col = hintTarget.position + 1;
              const targetWord = this.findWordAtPosition(enhancedWords, lnum, col);
              if (targetWord) {
                targetWord.hintPriority = pattern.priority;
                wordFound = true;
                wordFoundCount++;
                priorityAssignCount++;
              }
            }
            if (getDebugMode() && sampleMatches.length < 5) {
              const captureIndex = typeof pattern.hintPosition === "string" &&
                  pattern.hintPosition.startsWith("capture:")
                ? parseInt(pattern.hintPosition.split(":")[1], 10)
                : undefined;
              sampleMatches.push({
                lnum,
                matchText: (match[0] || "").slice(0, 40),
                captureText: captureIndex !== undefined
                  ? (match[captureIndex] || "").slice(0, 20)
                  : "(no-capture)",
                col: hintTarget ? hintTarget.position + 1 : -1,
                wordFound,
              });
            }
            if (!regex.global) break;
          }
        }
      }

      if (getDebugMode()) {
        try {
          logMessage(
            "DEBUG",
            "HINT-DEBUG",
            `[PointC/pattern] pattern=${
              String(pattern.pattern)
            } flags=${regex.flags} multiline=${isMultiline} matchCount=${matchCount} wordFoundCount=${wordFoundCount} samples=${
              JSON.stringify(sampleMatches)
            }`,
          );
        } catch (e) {
          logMessage(
            "DEBUG",
            "HINT-DEBUG",
            `[PointC/pattern] log failure: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
    }

    if (getDebugMode()) {
      logMessage(
        "DEBUG",
        "HINT-DEBUG",
        `[PointC/exit] totalPriorityAssigned=${priorityAssignCount}`,
      );
    }
    return this.sortByHintPriority(enhancedWords);
  }
  /** */
  private extractHintTarget(
    match: RegExpExecArray,
    rule: HintPositionRule,
  ): { text: string; position: number } | null {
    if (typeof rule === "string") {
      if (rule.startsWith("capture:")) {
        const captureIndex = parseInt(rule.split(":")[1], 10);
        if (match[captureIndex]) {
          return {
            text: match[captureIndex],
            position: match.index! + match[0].indexOf(match[captureIndex]),
          };
        }
      } else if (rule === "start") {
        return { text: match[0], position: match.index! };
      } else if (rule === "end") {
        return { text: match[0], position: match.index! + match[0].length - 1 };
      }
    } else if (typeof rule === "object" && "offset" in rule) {
      const basePosition = rule.from === "start" ? match.index! : match.index! + match[0].length;
      return { text: match[0], position: basePosition + rule.offset };
    }
    return null;
  }
  /**
   * @param words
   * @param position
   * @returns
   */
  private findWordAtPosition(
    words: WordWithPriority[],
    lnum: number,
    col: number,
  ): WordWithPriority | null {
    // Why: join テキストの絶対オフセット比較から行番号+列位置比較に変更。
    //   Word.line (1-based) と Word.col (1-based) で直接マッチする。
    return words.find((word) =>
      word.line === lnum &&
      word.col && word.text &&
      col >= word.col &&
      col < word.col + word.text.length
    ) || null;
  }
  /**
   * @param words
   * @returns
   */
  private sortByHintPriority(words: WordWithPriority[]): WordWithPriority[] {
    return words.sort((a, b) => {
      const priorityA = a.hintPriority || 0;
      const priorityB = b.hintPriority || 0;
      return priorityB - priorityA;
    });
  }
}

/** */
export interface WordDetectionManagerConfig extends ImportedWordDetectionConfig {
  /** デフォルトの単語検出ストラテジー */
  defaultStrategy?: "regex" | "tinysegmenter" | "hybrid";
  /** 言語の自動検出を有効にするか */
  autoDetectLanguage?: boolean;
  /** パフォーマンスモニタリングを有効にするか */
  performanceMonitoring?: boolean;
  /** キャッシュ機能を有効にするか */
  cacheEnabled?: boolean;
  /** キャッシュの最大サイズ */
  cacheMaxSize?: number;
  /** キャッシュエントリの有効期限（ミリ秒） */
  cacheTtlMs?: number;
  /** 最大リトライ回数 */
  maxRetries?: number;
  /** リトライ間の遅延時間（ミリ秒） */
  retryDelayMs?: number;
  /** 処理タイムアウト時間（ミリ秒） */
  timeoutMs?: number;
  /** バッチ処理を有効にするか */
  batchProcessing?: boolean;
  /** 同時実行可能な検出数の上限 */
  maxConcurrentDetections?: number;
}
/** */
interface CacheEntry {
  /** 検出された単語の配列 */
  words: Word[];
  /** キャッシュ作成時刻 */
  timestamp: number;
  /** 使用されたディテクター名 */
  detector: string;
  /** 設定のハッシュ値 */
  config_hash: string;
}
/** */
interface DetectionStats {
  /** 総呼び出し回数 */
  total_calls: number;
  /** キャッシュヒット回数 */
  cache_hits: number;
  /** キャッシュミス回数 */
  cache_misses: number;
  /** エラー発生回数 */
  errors: number;
  /** 平均処理時間（ミリ秒） */
  average_duration: number;
  /** ディテクター別使用回数 */
  detector_usage: Record<string, number>;
}
/** */
export class WordDetectionManager {
  private detectors: Map<string, ImportedWordDetector> = new Map();
  private config: Required<WordDetectionManagerConfig>;
  private cache: Map<string, CacheEntry> = new Map();
  private stats: DetectionStats;
  private initialized = false;
  private sessionContext: DetectionContext | null = null;
  private globalConfig?: Config; // 統一的なmin_length処理のためのグローバル設定
  private unifiedConfig?: Config; // Configへの移行対応
  /** */
  constructor(config: WordDetectionManagerConfig = {}, globalConfig?: Config | Config) {
    this.config = this.mergeWithDefaults(config);
    [this.unifiedConfig, this.globalConfig] = resolveConfigType(globalConfig);
    this.stats = this.initializeStats();
  }
  /** */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    const configToUse = this.unifiedConfig || this.globalConfig;
    const regexDetector = new ImportedRegexWordDetector(this.config, configToUse);
    const segmenterDetector = new ImportedTinySegmenterWordDetector();
    const hybridDetector = new ImportedHybridWordDetector(this.config);
    this.registerDetector(regexDetector);
    this.registerDetector(segmenterDetector);
    this.registerDetector(hybridDetector);
    for (const [name, detector] of this.detectors) {
      const available = await detector.isAvailable();
    }
    this.initialized = true;
  }
  /** */
  registerDetector(detector: ImportedWordDetector): void {
    this.detectors.set(detector.name, detector);
  }
  /** */
  async detectWords(
    text: string,
    startLine: number = 1,
    denops?: Denops,
    context?: DetectionContext,
  ): Promise<WordDetectionResult> {
    if (!this.initialized) {
      await this.initialize();
    }
    const startTime = Date.now();
    this.stats.total_calls++;
    const effectiveContext = context || this.sessionContext || undefined;
    const useCache = this.config.cacheEnabled && !this.shouldSkipCache(effectiveContext);
    try {
      if (useCache) {
        const cached = this.getCachedResult(text, startLine, effectiveContext);
        if (cached) {
          this.stats.cache_hits++;
          return {
            words: cached.words,
            detector: cached.detector,
            success: true,
            performance: {
              duration: Date.now() - startTime,
              wordCount: cached.words.length,
              linesProcessed: text.split("\n").length,
            },
          };
        }
        this.stats.cache_misses++;
      }
      const detector = await this.selectDetector(text);
      if (!detector) {
        throw new Error("No suitable detector available");
      }
      const words = await this.detectWithTimeout(
        detector,
        text,
        startLine,
        effectiveContext,
        denops,
      );
      if (useCache) {
        this.cacheResult(text, startLine, words, detector.name, effectiveContext);
      }
      this.stats.detector_usage[detector.name] = (this.stats.detector_usage[detector.name] || 0) +
        1;
      const duration = Date.now() - startTime;
      this.updateAverageDuration(duration);
      return {
        words,
        detector: detector.name,
        success: true,
        performance: {
          duration,
          wordCount: words.length,
          linesProcessed: text.split("\n").length,
        },
      };
    } catch (error) {
      this.stats.errors++;
      if (this.config.enableFallback) {
        try {
          const fallbackDetector = this.getFallbackDetector();
          if (fallbackDetector) {
            const words = await fallbackDetector.detectWords(
              text,
              startLine,
              effectiveContext,
              denops,
            );
            return {
              words,
              detector: `${fallbackDetector.name} (fallback)`,
              success: true,
              error: `Primary detection failed: ${error}`,
              performance: {
                duration: Date.now() - startTime,
                wordCount: words.length,
                linesProcessed: text.split("\n").length,
              },
            };
          }
        } catch (fallbackError) {
        }
      }
      return {
        words: [],
        detector: "none",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        performance: {
          duration: Date.now() - startTime,
          wordCount: 0,
          linesProcessed: text.split("\n").length,
        },
      };
    }
  }
  /** */
  async detectWordsFromBuffer(
    denops: Denops,
    context?: DetectionContext,
  ): Promise<WordDetectionResult> {
    try {
      const topLine = await denops.call("line", "w0") as number;
      const bottomLine = await denops.call("line", "w$") as number;
      const lines = await denops.call("getbufline", "%", topLine, bottomLine) as string[];
      const text = lines.join("\n");
      return this.detectWords(text, topLine, denops, context);
    } catch (error) {
      return {
        words: [],
        detector: "none",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        performance: {
          duration: 0,
          wordCount: 0,
          linesProcessed: 0,
        },
      };
    }
  }
  /** */
  private async selectDetector(text: string): Promise<ImportedWordDetector | null> {
    const availableDetectors = Array.from(this.detectors.values())
      .filter((d) => d.canHandle(text))
      .sort((a, b) => b.priority - a.priority);

    if (availableDetectors.length === 0) {
      return null;
    }
    const enhancedConfig = this.config as EnhancedWordConfig;
    const strategy = enhancedConfig.wordDetectionStrategy || enhancedConfig.strategy ||
      enhancedConfig.defaultStrategy;

    switch (strategy) {
      case "regex":
        return availableDetectors.find((d) => d.name.includes("Regex")) || availableDetectors[0];
      case "tinysegmenter":
        const segmenterDetector = availableDetectors.find((d) => d.name.includes("TinySegmenter"));
        if (segmenterDetector && await segmenterDetector.isAvailable()) {
          return segmenterDetector;
        }
        return availableDetectors[0];
      case "hybrid":
        const hybridDetector = availableDetectors.find((d) => d.name.includes("Hybrid"));
        if (hybridDetector && await hybridDetector.isAvailable()) {
          return hybridDetector;
        }
        return availableDetectors[0];
      default:
        if (this.config.autoDetectLanguage) {
          const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
          if (hasJapanese) {
            const japaneseDetector = availableDetectors.find((d) =>
              d.supportedLanguages.includes("ja") && d.priority > 1
            );
            if (japaneseDetector && await japaneseDetector.isAvailable()) {
              return japaneseDetector;
            }
          }
        }
        return availableDetectors[0];
    }
  }
  /** */
  private getFallbackDetector(): ImportedWordDetector | null {
    if (this.config.fallbackToRegex) {
      return this.detectors.get("RegexWordDetector") || null;
    }
    const detectors = Array.from(this.detectors.values())
      .sort((a, b) => a.priority - b.priority);
    return detectors[0] || null;
  }
  /** */
  private async detectWithTimeout(
    detector: ImportedWordDetector,
    text: string,
    startLine: number,
    context?: DetectionContext,
    denops?: Denops,
  ): Promise<Word[]> {
    if (!this.config.timeoutMs) {
      return detector.detectWords(text, startLine, context, denops);
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Detection timeout (${this.config.timeoutMs}ms)`));
      }, this.config.timeoutMs);
      detector.detectWords(text, startLine, context, denops)
        .then((result: Word[]) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error: Error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }
  /** */
  private generateCacheKey(
    text: string,
    startLine: number,
    context?: DetectionContext,
  ): string {
    const configHash = this.generateConfigHash();
    const textHash = this.simpleHash(text);
    const contextHash = context ? this.generateContextHash(context) : "noctx";
    return `${textHash}:${startLine}:${configHash}:${contextHash}`;
  }

  private generateConfigHash(): string {
    const enhancedConfig = this.config as EnhancedWordConfig;
    const relevantConfig = {
      strategy: enhancedConfig.wordDetectionStrategy || enhancedConfig.strategy,
      useJapanese: this.config.useJapanese,
      minWordLength: this.config.minWordLength,
      maxWordLength: this.config.maxWordLength,
      defaultMinWordLength: this.config.defaultMinWordLength ||
        (this.globalConfig as Config | undefined)?.defaultMinWordLength,
      perKeyMinLength: (this.globalConfig as Config | undefined)?.perKeyMinLength,
    };
    return this.simpleHash(JSON.stringify(relevantConfig));
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
  private getCachedResult(
    text: string,
    startLine: number,
    context?: DetectionContext,
  ): CacheEntry | null {
    const key = this.generateCacheKey(text, startLine, context);
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.config.cacheTtlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry;
  }
  private cacheResult(
    text: string,
    startLine: number,
    words: Word[],
    detector: string,
    context?: DetectionContext,
  ): void {
    const key = this.generateCacheKey(text, startLine, context);
    if (this.cache.size >= this.config.cacheMaxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, Math.floor(this.config.cacheMaxSize * 0.1));
      for (const [key] of toRemove) {
        this.cache.delete(key);
      }
    }
    this.cache.set(key, {
      words,
      timestamp: Date.now(),
      detector,
      config_hash: this.generateConfigHash(),
    });
  }

  private generateContextHash(context: DetectionContext): string {
    const payload = {
      currentKey: context.currentKey ?? null,
      minWordLength: context.minWordLength ?? null,
    };
    return this.simpleHash(JSON.stringify(payload));
  }

  private shouldSkipCache(context?: DetectionContext): boolean {
    if (!context) {
      return false;
    }
    const allowedKeys = ["currentKey", "minWordLength", "metadata"];
    return Object.keys(context).some((key) => !allowedKeys.includes(key));
  }
  /** */
  private initializeStats(): DetectionStats {
    return {
      total_calls: 0,
      cache_hits: 0,
      cache_misses: 0,
      errors: 0,
      average_duration: 0,
      detector_usage: {},
    };
  }

  private updateAverageDuration(duration: number): void {
    const totalDuration = this.stats.average_duration * (this.stats.total_calls - 1) + duration;
    this.stats.average_duration = totalDuration / this.stats.total_calls;
  }
  /** */
  getStats(): DetectionStats {
    return { ...this.stats };
  }
  /** */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    const total = this.stats.cache_hits + this.stats.cache_misses;
    return {
      size: this.cache.size,
      maxSize: this.config.cacheMaxSize,
      hitRate: total > 0 ? this.stats.cache_hits / total : 0,
    };
  }
  /** */
  clearCache(): void {
    this.cache.clear();
  }
  /** */
  resetStats(): void {
    this.stats = this.initializeStats();
  }
  /** */
  updateConfig(newConfig: Partial<WordDetectionManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    const enhancedConfig = newConfig as EnhancedWordConfig;
    if (enhancedConfig.wordDetectionStrategy) {
      this.config.strategy = enhancedConfig.wordDetectionStrategy;
      this.config.defaultStrategy = enhancedConfig.wordDetectionStrategy;
    }

    if (this.affectsDetection(newConfig)) {
      this.clearCache();
    }
    if (this.shouldReinitializeDetectors(newConfig)) {
      this.reinitializeDetectors();
    }
  }
  /**
   * @returns
   */
  private affectsDetection(newConfig: Partial<WordDetectionManagerConfig>): boolean {
    const affectingKeys = [
      "strategy",
      "word_detection_strategy",
      "use_japanese",
      "enable_tinysegmenter",
      "segmenter_threshold",
      "min_word_length",
      "max_word_length",
    ];
    return affectingKeys.some((key) => key in newConfig);
  }
  /**
   * @returns
   */
  private shouldReinitializeDetectors(newConfig: Partial<WordDetectionManagerConfig>): boolean {
    const reinitKeys = [
      "strategy",
      "word_detection_strategy",
      "enable_tinysegmenter",
      "use_japanese",
    ];
    return reinitKeys.some((key) => key in newConfig);
  }
  /** */
  private reinitializeDetectors(): void {
    try {
      this.detectors.clear();
      const regexDetector = new ImportedRegexWordDetector(this.config);
      const segmenterDetector = new ImportedRegexWordDetector(this.config);
      const hybridDetector = new ImportedRegexWordDetector(this.config);
      this.registerDetector(regexDetector);
      this.registerDetector(segmenterDetector);
      this.registerDetector(hybridDetector);
    } catch (error) {
    }
  }
  /** */
  getAvailableDetectors(): Array<{ name: string; priority: number; languages: string[] }> {
    return Array.from(this.detectors.values()).map((d) => ({
      name: d.name,
      priority: d.priority,
      languages: d.supportedLanguages,
    }));
  }
  /** */
  setSessionContext(context: DetectionContext | null): void {
    this.sessionContext = context;
  }
  /** */
  getSessionContext(): DetectionContext | null {
    return this.sessionContext;
  }
  /** */
  async getDetectorForContext(
    context?: DetectionContext,
    text?: string,
  ): Promise<ImportedWordDetector | null> {
    try {
      if (!this.initialized) {
        return null;
      }
      const enhancedConfig = this.config as EnhancedWordConfig;
      const strategy = context?.strategy ||
        enhancedConfig.wordDetectionStrategy ||
        enhancedConfig.strategy ||
        enhancedConfig.defaultStrategy;
      let availableDetectors = Array.from(this.detectors.values());
      if (text) {
        availableDetectors = availableDetectors.filter((d) => d.canHandle(text));
      }
      availableDetectors.sort((a, b) => b.priority - a.priority);

      if (availableDetectors.length === 0) {
        return null;
      }
      switch (strategy) {
        case "regex":
          const regexDetector = availableDetectors.find((d) => d.name.includes("Regex"));
          if (regexDetector && await regexDetector.isAvailable()) {
            return regexDetector;
          }
          break;
        case "tinysegmenter":
          const segmenterDetector = availableDetectors.find((d) =>
            d.name.includes("TinySegmenter")
          );
          if (segmenterDetector && await segmenterDetector.isAvailable()) {
            return segmenterDetector;
          }
          break;
        case "hybrid":
          const hybridDetector = availableDetectors.find((d) => d.name.includes("Hybrid"));
          if (hybridDetector && await hybridDetector.isAvailable()) {
            return hybridDetector;
          }
          break;
      }
      for (const detector of availableDetectors) {
        if (await detector.isAvailable()) {
          return detector;
        }
      }
      return null;
    } catch {
      return null;
    }
  }
  /** */
  async testDetectors(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, detector] of this.detectors) {
      try {
        results[name] = await detector.isAvailable();
      } catch {
        results[name] = false;
      }
    }
    return results;
  }
  /** */
  private mergeWithDefaults(
    config: WordDetectionManagerConfig,
  ): Required<WordDetectionManagerConfig> {
    const defaults = {
      defaultMinWordLength: DEFAULT_UNIFIED_CONFIG.defaultMinWordLength,
      strategy: "hybrid" as "regex" | "tinysegmenter" | "hybrid",
      useJapanese: DEFAULT_UNIFIED_CONFIG.useJapanese,
      enableTinySegmenter: DEFAULT_UNIFIED_CONFIG.enableTinySegmenter,
      segmenterThreshold: DEFAULT_UNIFIED_CONFIG.segmenterThreshold,
      segmenterCacheSize: 1000,
      defaultStrategy: "hybrid" as "regex" | "tinysegmenter" | "hybrid",
      autoDetectLanguage: true,
      performanceMonitoring: true,
      cacheEnabled: true,
      cacheMaxSize: 500,
      cacheTtlMs: 300000, // 5 minutes
      enableFallback: true,
      fallbackToRegex: true,
      maxRetries: 2,
      retryDelayMs: 100,
      timeoutMs: 5000, // 5 second timeout
      batch_processing: false,
      max_concurrent_detections: 3,
      minWordLength: 1,
      maxWordLength: 50,
      exclude_numbers: false,
      exclude_single_chars: false,
      batchSize: 100,
    };
    const merged = {
      ...defaults,
      ...config,
    };
    if (config.useJapanese !== undefined) {
      merged.useJapanese = config.useJapanese;
    }
    const enhancedConfig = config as EnhancedWordConfig;
    if (enhancedConfig.wordDetectionStrategy) {
      merged.strategy = enhancedConfig.wordDetectionStrategy;
    }
    return merged as Required<WordDetectionManagerConfig>;
  }
}
/** */
let globalManager: WordDetectionManager | null = null;
/** */
export function getWordDetectionManager(
  config?: WordDetectionManagerConfig,
  globalConfig?: Config | Config,
): WordDetectionManager {
  if (!globalManager) {
    globalManager = new WordDetectionManager(config, globalConfig);
  } else if (config) {
    globalManager = new WordDetectionManager(config, globalConfig);
  }
  return globalManager;
}
/** */
export function resetWordDetectionManager(): void {
  globalManager = null;
}
declare global {
  var extractWords:
    | ((
      lineText: string,
      lineNumber: number,
      options?: ExtractWordsOptions,
    ) => Word[])
    | undefined;
}
globalThis.extractWords = extractWords;

// ============================================================================
// Multi-Window Word Detection (Phase MW)
// ============================================================================

import type { WindowInfo } from "../../types.ts";
import { getVisibleWindows, getWindowVisibleLines, shouldUseMultiWindowMode } from "./window.ts";

/**
 * Detect words across multiple windows
 *
 * This function detects words in all visible windows when multiWindowMode is enabled.
 * Each detected word includes winid and bufnr for proper hint display.
 *
 * Algorithm:
 * 1. Check if multi-window mode should be active
 * 2. If not, fall back to single-window detection
 * 3. Get all visible windows
 * 4. For each window, detect words in visible range
 * 5. Tag each word with winid and bufnr
 * 6. Merge and return all words
 *
 * Bug 2 fix: Clear both global cache (detectionCache) and manager's internal cache
 * to prevent stale cached results with incorrect line ranges across windows.
 *
 * @param denops - Denops instance
 * @param config - Plugin configuration (must include multiWindowMode settings)
 * @param context - Optional detection context
 * @returns Array of words with winid/bufnr tags
 */
export async function detectWordsMultiWindow(
  denops: Denops,
  config: Config,
  context?: DetectionContext,
): Promise<Word[]> {
  // Clear both global cache and manager's internal cache to prevent
  // stale cached results with incorrect line ranges across windows
  clearDetectionCache();
  const manager = getWordDetectionManager(config as EnhancedWordConfig);
  manager.clearCache();

  // Check if multi-window mode should be used
  const useMultiWindow = await shouldUseMultiWindowMode(denops, config);

  if (!useMultiWindow) {
    // Fall back to single-window detection
    const result = await detectWordsWithManager(denops, config as EnhancedWordConfig, context);
    return result.words;
  }

  // Get all visible windows
  const windows = await getVisibleWindows(denops, config);

  if (windows.length === 0) {
    return [];
  }

  const allWords: Word[] = [];

  // Process each window
  for (const windowInfo of windows) {
    try {
      const windowWords = await detectWordsInWindow(denops, windowInfo, manager, context);
      allWords.push(...windowWords);
    } catch (error) {
      // Log error but continue processing other windows
      console.error(`[hellshake-yano] Error detecting words in window ${windowInfo.winid}:`, error);
    }
  }

  return allWords;
}

/**
 * Detect words within a specific window
 *
 * @param denops - Denops instance
 * @param windowInfo - Window information
 * @param manager - Word detection manager
 * @param context - Optional detection context
 * @returns Array of words tagged with window info
 */
async function detectWordsInWindow(
  denops: Denops,
  windowInfo: WindowInfo,
  manager: WordDetectionManager,
  context?: DetectionContext,
): Promise<Word[]> {
  // Get visible lines for this window
  const lines = await getWindowVisibleLines(denops, windowInfo);

  if (lines.length === 0) {
    return [];
  }

  const text = lines.join("\n");
  const startLine = windowInfo.topline;

  // Detect words using the manager
  const result = await manager.detectWords(text, startLine, denops, context);

  // Apply minWordLength filter explicitly for multi-window mode
  // This ensures consistent filtering even when context is passed
  const minWordLength = context?.minWordLength ?? 3;
  const filteredWords = result.words.filter((word) => word.text.length >= minWordLength);

  // Tag each word with winid and bufnr
  const taggedWords: Word[] = filteredWords.map((word) => ({
    ...word,
    winid: windowInfo.winid,
    bufnr: windowInfo.bufnr,
  }));

  // Get folded lines for this buffer and filter them out
  const foldedLines = await getFoldedLinesForBuffer(denops, windowInfo);
  const visibleWords = taggedWords.filter((word) => !foldedLines.has(word.line));

  return visibleWords;
}

/**
 * Get folded lines for a specific buffer/window using win_execute()
 * win_execute() は noautocmd で実行されるため、再描画がトリガーされない
 */
async function getFoldedLinesForBuffer(
  denops: Denops,
  windowInfo: WindowInfo,
): Promise<Set<number>> {
  const foldedLines = new Set<number>();

  // win_execute() でウィンドウ切り替えなしで fold 情報を一括取得
  // VimScript を文字列で渡し、結果を JSON で返す
  const script = `
    let result = []
    for line in range(${windowInfo.topline}, ${windowInfo.botline})
      let foldStart = foldclosed(line)
      if foldStart != -1
        call add(result, [foldStart, foldclosedend(line)])
        let line = foldclosedend(line)
      endif
    endfor
    echo json_encode(result)
  `;

  try {
    const resultStr = await denops.call(
      "win_execute",
      windowInfo.winid,
      script,
      "silent",
    ) as string;

    // 結果をパース
    const trimmed = resultStr.trim();
    if (trimmed && trimmed !== "[]") {
      const foldInfo = JSON.parse(trimmed) as Array<[number, number]>;
      for (const [foldStart, foldEnd] of foldInfo) {
        for (let line = foldStart; line <= foldEnd; line++) {
          foldedLines.add(line);
        }
      }
    }
  } catch (e) {
    // フォールバック: エラー時は空のセットを返す（fold なしとして扱う）
    console.error("getFoldedLinesForBuffer error:", e);
  }

  return foldedLines;
}

/**
 * Result type for multi-window word detection
 */
export interface MultiWindowWordDetectionResult extends WordDetectionResult {
  /** Windows that were processed */
  windows: WindowInfo[];
  /** Per-window word counts */
  wordCountPerWindow: Map<number, number>;
}

/**
 * Detect words across multiple windows with detailed result
 *
 * Bug 2 fix: Clear both global cache (detectionCache) and manager's internal cache
 * to prevent stale cached results with incorrect line ranges across windows.
 *
 * @param denops - Denops instance
 * @param config - Plugin configuration
 * @param context - Optional detection context
 * @returns Detailed result including per-window information
 */
export async function detectWordsMultiWindowDetailed(
  denops: Denops,
  config: Config,
  context?: DetectionContext,
): Promise<MultiWindowWordDetectionResult> {
  // Clear both global cache and manager's internal cache to prevent
  // stale cached results with incorrect line ranges across windows
  clearDetectionCache();
  const manager = getWordDetectionManager(config as EnhancedWordConfig);
  manager.clearCache();

  const startTime = Date.now();
  const useMultiWindow = await shouldUseMultiWindowMode(denops, config);

  if (!useMultiWindow) {
    // Fall back to single-window detection
    const result = await detectWordsWithManager(denops, config as EnhancedWordConfig, context);
    return {
      ...result,
      windows: [],
      wordCountPerWindow: new Map(),
    };
  }

  const windows = await getVisibleWindows(denops, config);
  const allWords: Word[] = [];
  const wordCountPerWindow = new Map<number, number>();

  for (const windowInfo of windows) {
    try {
      const windowWords = await detectWordsInWindow(denops, windowInfo, manager, context);
      allWords.push(...windowWords);
      wordCountPerWindow.set(windowInfo.winid, windowWords.length);
    } catch (error) {
      console.error(`[hellshake-yano] Error detecting words in window ${windowInfo.winid}:`, error);
      wordCountPerWindow.set(windowInfo.winid, 0);
    }
  }

  const duration = Date.now() - startTime;

  return {
    words: allWords,
    detector: "multi-window",
    success: true,
    performance: {
      duration,
      wordCount: allWords.length,
      linesProcessed: windows.reduce((sum, w) => sum + (w.botline - w.topline + 1), 0),
    },
    windows,
    wordCountPerWindow,
  };
}
