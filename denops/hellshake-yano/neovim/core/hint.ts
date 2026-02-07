import type {
  HintKeyConfig,
  HintMapping,
  HintPosition,
  HintPositionWithCoordinateSystem,
  Word,
} from "../../types.ts";
import { DEFAULT_HINT_MARKERS } from "../../types.ts";
import type { Config } from "../../types.ts";
import { HintGeneratorFactory } from "./hint/hint-generator-strategies.ts";
import { type CacheStatistics, CacheType, GlobalCache } from "../../cache.ts";
import { Core } from "./core.ts";
import {
  isAlphanumeric,
  isControlCharacter,
  isDigit,
  isValidSymbol,
  isWhitespace,
} from "../../validation-utils.ts";
export type { HintKeyConfig, HintMapping, HintPosition };
const globalCache = GlobalCache.getInstance();
const hintCache = globalCache.getCache<string, string[]>(CacheType.HINTS);
const assignmentCacheNormal = globalCache.getCache<string, Word[]>(
  CacheType.HINT_ASSIGNMENT_NORMAL,
);
const assignmentCacheVisual = globalCache.getCache<string, Word[]>(
  CacheType.HINT_ASSIGNMENT_VISUAL,
);
const assignmentCacheOther = globalCache.getCache<string, Word[]>(CacheType.HINT_ASSIGNMENT_OTHER);
const CHAR_WIDTH_CACHE = globalCache.getCache<number, number>(CacheType.CHAR_WIDTH);
for (let i = 0x20; i <= 0x7E; i++) CHAR_WIDTH_CACHE.set(i, 1);
function charWidth(cp: number, tw: number): number {
  if (cp === 9) return tw;
  if (cp >= 0x20 && cp <= 0x7E) return 1;
  if (cp < 0x20 || (cp >= 0x7F && cp < 0xA0)) return 0;
  if (
    (cp >= 0xB0 && cp <= 0xF7) || (cp >= 0x2000 && cp <= 0x2EFF) ||
    (cp >= 0x3000 && cp <= 0x9FFF) || (cp >= 0xF900 && cp <= 0xFAFF) ||
    (cp >= 0xFF00 && cp <= 0xFFEF) || (cp >= 0x1F000 && cp <= 0x1F9FF) ||
    (cp >= 0x20000 && cp <= 0x2EBEF)
  ) return 2;
  return 1;
}
export function getCharDisplayWidth(char: string, tabWidth = 8): number {
  if (!char) return 0;
  const cp = char.codePointAt(0);
  if (cp === undefined) return 0;
  if (tabWidth === 8 && CHAR_WIDTH_CACHE.has(cp)) return CHAR_WIDTH_CACHE.get(cp)!;
  const w = charWidth(cp, tabWidth);
  if (tabWidth === 8 && w !== tabWidth) CHAR_WIDTH_CACHE.set(cp, w);
  return w;
}
export function getDisplayWidth(text: string, tabWidth = 8): number {
  if (!text) return 0;
  let total = 0;
  for (let i = 0; i < text.length;) {
    const cp = text.codePointAt(i);
    if (cp === undefined) {
      i++;
      continue;
    }
    total += charWidth(cp, tabWidth);
    i += cp > 0xFFFF ? 2 : 1;
  }
  return total;
}
import { getByteLength } from "./word.ts";
export const BATCH_PROCESS_THRESHOLD = 500;
export const BATCH_BATCH_SIZE = 250;
export function convertToDisplayColumn(line: string, charIndex: number, tabWidth = 8): number {
  if (charIndex <= 0) {
    return 1;
  }
  const substring = line.slice(0, charIndex);
  return getDisplayWidth(substring, tabWidth);
}
export function getWordDisplayEndCol(word: Word, tabWidth = 8): number {
  const textWidth = getDisplayWidth(word.text, tabWidth);
  return word.col + textWidth - 1;
}
export function areWordsAdjacent(word1: Word, word2: Word, tabWidth = 8): boolean {
  if (word1.line !== word2.line) return false;
  const e1 = getWordDisplayEndCol(word1, tabWidth);
  const e2 = getWordDisplayEndCol(word2, tabWidth);
  const d = word1.col < word2.col ? word2.col - e1 - 1 : word1.col - e2 - 1;
  return d <= 0;
}

export type DirectionalContext = "up" | "down" | "none";

export function filterWordsByDirection(
  words: Word[],
  cursor: { line: number; col: number },
  context: DirectionalContext,
): Word[] {
  if (context === "none") {
    return words;
  }
  return words.filter((word) => {
    if (context === "down") {
      if (word.line > cursor.line) return true;
      if (word.line === cursor.line) return word.col > cursor.col;
      return false;
    }
    if (word.line < cursor.line) return true;
    if (word.line === cursor.line) return word.col < cursor.col;
    return false;
  });
}

export function resolveDirectionalContext(
  key: string | undefined,
  enabled: boolean,
): DirectionalContext {
  if (!enabled || !key) {
    return "none";
  }
  const normalized = key.toLowerCase();
  if (normalized === "j") return "down";
  if (normalized === "k") return "up";
  return "none";
}
function getAssignmentCacheForMode(mode: string) {
  return mode === "visual"
    ? assignmentCacheVisual
    : mode === "normal"
    ? assignmentCacheNormal
    : assignmentCacheOther;
}
function createAssignmentCacheKey(
  words: Word[],
  cursorLine: number,
  cursorCol: number,
  hintPositionSetting: string,
  optimizationConfig?: { skipOverlapDetection?: boolean },
  bothMinWordLength?: number,
): string {
  const sig = hashString(words.map((w) => `${w.line},${w.col}`).join(";"));
  const skip = optimizationConfig?.skipOverlapDetection ?? false;
  const threshold = bothMinWordLength ?? 0;
  return `${words.length}-${cursorLine}-${cursorCol}-${hintPositionSetting}-${skip}-${threshold}-${sig}`;
}
function hashString(value: string): string {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = ((h << 5) - h) + value.charCodeAt(i);
    h |= 0;
  }
  return h.toString(36);
}
function createSingleHintMapping(word: Word, hint: string, pos: string): HintMapping {
  let hc: number | undefined, hbc: number | undefined;
  const c = () => {
    if (hc === undefined) {
      if (pos === "end") {
        hc = word.col + word.text.length - 1;
        hbc = word.byteCol ? word.byteCol + getByteLength(word.text) - 1 : hc;
      } else {
        hc = word.col;
        hbc = word.byteCol ?? word.col;
      }
    }
  };
  return {
    word,
    hint,
    get hintCol() {
      c();
      return hc ?? word.col;
    },
    get hintByteCol() {
      c();
      return hbc ?? (word.byteCol ?? word.col);
    },
  };
}
function storeAssignmentCache(
  cache: ReturnType<typeof globalCache.getCache>,
  cacheKey: string,
  sortedWords: Word[],
): void {
  cache.set(cacheKey, sortedWords.slice());
}
export interface GenerateHintsOptions {
  /** ヒント文字として使用するマーカー配列 */
  markers?: string[];
  /** 最大ヒント数制限 */
  maxHints?: number;
  /** 複数文字ヒント用のキー配列 */
  keys?: string[];
  /** 数字専用モード */
  numeric?: boolean;
  /** グループベースのヒント生成 */
  groups?: boolean;
  /** 1文字ヒント用のキー配列（groupsモード時） */
  singleCharKeys?: string[];
  /** 複数文字ヒント用のキー配列（groupsモード時） */
  multiCharKeys?: string[];
  /** 1文字ヒントの最大数（groupsモード時） */
  maxSingleCharHints?: number;
  /** 数字複数文字ヒントを使用（groupsモード時） */
  useNumericMultiCharHints?: boolean;
}
export function generateHints(wordCount: number, options?: GenerateHintsOptions): string[];

export function generateHints(wordCount: number, markers?: string[], maxHints?: number): string[];
export function generateHints(
  wordCount: number,
  optionsOrMarkers?: GenerateHintsOptions | string[],
  maxHints?: number,
): string[] {
  let options: GenerateHintsOptions;
  if (Array.isArray(optionsOrMarkers)) {
    options = {
      markers: optionsOrMarkers,
      maxHints: maxHints,
    };
  } else {
    options = optionsOrMarkers || {};
  }
  const effectiveWordCount = options.maxHints ? Math.min(wordCount, options.maxHints) : wordCount;

  if (effectiveWordCount <= 0) {
    return [];
  }
  const config: HintKeyConfig = {
    singleCharKeys: options.singleCharKeys,
    multiCharKeys: options.multiCharKeys,
    maxSingleCharHints: options.maxSingleCharHints,
    useNumericMultiCharHints: options.useNumericMultiCharHints || options.numeric,
    markers: options.markers || DEFAULT_HINT_MARKERS.split(""),
  };
  return HintGeneratorFactory.generate(effectiveWordCount, config);
}
export function assignHintsToWords(
  words: Word[],
  hints: string[],
  cursorLine: number,
  cursorCol: number,
  mode: string = "normal",
  config?: { hintPosition?: string; bothMinWordLength?: number },
  optimizationConfig?: { skipOverlapDetection?: boolean },
): HintMapping[] {
  if (words.length === 0 || hints.length === 0) {
    return [];
  }
  const hintPositionSetting = config?.hintPosition ?? "start";
  const bothMinWordLength = config?.bothMinWordLength;
  const assignmentCache = getAssignmentCacheForMode(mode);
  const cacheKey = createAssignmentCacheKey(
    words,
    cursorLine,
    cursorCol,
    hintPositionSetting,
    optimizationConfig,
    bothMinWordLength,
  );
  const cachedWords = assignmentCache.get(cacheKey);
  if (cachedWords) {
    if (hintPositionSetting === "both") {
      const mappings: HintMapping[] = [];
      let hintIndex = 0;
      const nextHint = () => {
        const hint = hints[hintIndex];
        hintIndex += 1;
        return hint;
      };
      cachedWords.forEach((word) => {
        const useBothHints = bothMinWordLength === undefined ||
          word.text.length >= bothMinWordLength;
        if (useBothHints) {
          const startHint = nextHint();
          if (startHint) mappings.push(createSingleHintMapping(word, startHint, "start"));
          const endHint = nextHint();
          if (endHint) mappings.push(createSingleHintMapping(word, endHint, "end"));
        } else {
          const hint = nextHint();
          if (hint) mappings.push(createSingleHintMapping(word, hint, "start"));
        }
      });
      return mappings;
    }
    return cachedWords.map((word, i) =>
      createSingleHintMapping(word, hints[i] || "", hintPositionSetting)
    );
  }
  let filteredWords = words;
  const shouldSkipOverlapDetection = optimizationConfig?.skipOverlapDetection ?? false;

  if (!shouldSkipOverlapDetection) {
    const adjacencyResults = detectAdjacentWords(words);
    const priorityRules = { symbolsPriority: 1, wordsPriority: 2 };
    const wordsToSkip = new Set<Word>();
    for (const { word, adjacentWords } of adjacencyResults) {
      if (shouldSkipHintForOverlap(word, adjacentWords, priorityRules)) {
        wordsToSkip.add(word);
      }
    }
    filteredWords = words.filter((word) => !wordsToSkip.has(word));
  }
  const sortedWords = sortWordsByDistanceOptimized(filteredWords, cursorLine, cursorCol);

  // カーソル位置の単語を除外（カーソル位置にAヒントを作成しても入力することはまずありえないため）
  const wordsExcludingCursor = sortedWords.filter((word) =>
    !(word.line === cursorLine && isPositionWithinWord(cursorCol, word))
  );

  const mappings: HintMapping[] = [];
  if (hintPositionSetting === "both") {
    let hintIndex = 0;
    const nextHint = () => {
      const hint = hints[hintIndex];
      hintIndex += 1;
      return hint;
    };
    wordsExcludingCursor.forEach((word) => {
      const useBothHints = bothMinWordLength === undefined || word.text.length >= bothMinWordLength;
      if (useBothHints) {
        const startHint = nextHint();
        if (startHint) mappings.push(createSingleHintMapping(word, startHint, "start"));
        const endHint = nextHint();
        if (endHint) mappings.push(createSingleHintMapping(word, endHint, "end"));
      } else {
        const hint = nextHint();
        if (hint) mappings.push(createSingleHintMapping(word, hint, "start"));
      }
    });
  } else {
    wordsExcludingCursor.forEach((word, i) =>
      mappings.push(createSingleHintMapping(word, hints[i] || "", hintPositionSetting))
    );
  }
  storeAssignmentCache(assignmentCache, cacheKey, wordsExcludingCursor);
  return mappings;
}
function sortWordsByDistanceOptimized(
  words: Word[],
  cursorLine: number,
  cursorCol: number,
): Word[] {
  return words.map((word) => ({
    word,
    distance: Math.abs(word.line - cursorLine) * 1000 + Math.abs(word.col - cursorCol),
  }))
    .sort((a, b) =>
      a.distance !== b.distance
        ? a.distance - b.distance
        : a.word.line !== b.word.line
        ? a.word.line - b.word.line
        : a.word.col - b.word.col
    )
    .map((item) => item.word);
}
export function clearHintCache(): void {
  hintCache.clear();
  assignmentCacheNormal.clear();
  assignmentCacheVisual.clear();
  assignmentCacheOther.clear();
}
export function getHintCacheStats(): { hintCacheSize: number; assignmentCacheSize: number } {
  return {
    hintCacheSize: hintCache.size(),
    assignmentCacheSize: assignmentCacheNormal.size() + assignmentCacheVisual.size() +
      assignmentCacheOther.size(),
  };
}
interface HintCacheStatistics {
  [key: string]: CacheStatistics | number;
  totalSize: number;
  totalHits: number;
  totalMisses: number;
  overallHitRate: number;
}

export function getGlobalCacheStats(): HintCacheStatistics {
  const allStats = globalCache.getAllStats();
  const hintRelatedTypes = [
    "HINTS",
    "HINT_ASSIGNMENT_NORMAL",
    "HINT_ASSIGNMENT_VISUAL",
    "HINT_ASSIGNMENT_OTHER",
  ];
  const hintStats: Record<string, CacheStatistics> = {};
  let totalSize = 0;
  let totalHits = 0;
  let totalMisses = 0;

  for (const type of hintRelatedTypes) {
    if (allStats[type]) {
      hintStats[type] = allStats[type];
      totalSize += allStats[type].size;
      totalHits += allStats[type].hits;
      totalMisses += allStats[type].misses;
    }
  }
  return {
    ...hintStats,
    totalSize,
    totalHits,
    totalMisses,
    overallHitRate: totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0,
  };
}
export interface CalculateHintPositionOptions {
  hintPosition?: string;
  coordinateSystem?: "vim" | "nvim";
  displayMode?: "before" | "after" | "overlay";
  enableDebug?: boolean;
  tabWidth?: number;
}
export function calculateHintPosition(
  word: Word,
  hintPositionOrOptions?: string | CalculateHintPositionOptions,
): HintPosition | HintPositionWithCoordinateSystem {
  const opts: CalculateHintPositionOptions = typeof hintPositionOrOptions === "string"
    ? { hintPosition: hintPositionOrOptions }
    : (hintPositionOrOptions || {});
  const pos = opts.hintPosition || "start";
  const tw = opts.tabWidth || 8;
  const isEnd = pos === "end";
  const col = isEnd ? getWordDisplayEndCol(word, tw) : word.col;
  const byteCol = isEnd && word.byteCol
    ? word.byteCol + getByteLength(word.text) - 1
    : word.byteCol || word.col;
  const dm = opts.displayMode || (isEnd ? "after" : pos === "overlay" ? "overlay" : "before");
  return opts.coordinateSystem
    ? {
      line: word.line,
      col,
      display_mode: dm,
      vim_col: col,
      nvim_col: Math.max(0, byteCol - 1),
      vim_line: word.line,
      nvim_line: word.line - 1,
    }
    : { line: word.line, col, display_mode: dm };
}
export function isNumericOnlyKeys(keys: string[]): boolean {
  if (!Array.isArray(keys) || keys.length === 0) {
    return false;
  }
  return keys.every((key) => key.length === 1 && key >= "0" && key <= "9");
}
export function generateMultiCharHintsFromKeys(
  keys: string[],
  count: number,
  startLength: number = 2,
): string[] {
  const hints: string[] = [];
  if (count <= 0 || keys.length === 0) {
    return hints;
  }
  if (isNumericOnlyKeys(keys)) {
    for (let i = 1; i <= 9 && hints.length < count; i++) {
      hints.push(String(i).padStart(2, "0"));
    }
    for (let i = 10; i < 100 && hints.length < count; i++) {
      hints.push(String(i).padStart(2, "0"));
    }
    if (hints.length < count) {
      hints.push("00");
    }
    return hints;
  }
  const maxLength = 2; // 2文字までに制限（3文字生成を廃止）

  const generateForLength = (length: number, prefix: string[]): boolean => {
    if (prefix.length === length) {
      hints.push(prefix.join(""));
      return hints.length < count;
    }

    for (const key of keys) {
      prefix.push(key);
      const shouldContinue = generateForLength(length, prefix);
      prefix.pop();
      if (!shouldContinue) {
        return false;
      }
    }
    return true;
  };

  for (let length = startLength; length <= maxLength && hints.length < count; length++) {
    const shouldContinue = generateForLength(length, []);
    if (!shouldContinue) {
      break;
    }
  }
  return hints;
}
const VALID_SYMBOLS = [";", ":", "[", "]", "'", '"', ",", ".", "/", "\\", "-", "=", "`"];
function validateCharacterValidity(keys: string[]): string[] {
  const errors: string[] = [];
  const invalidChars: string[] = [];
  const whitespaceChars: string[] = [];
  const controlChars: string[] = [];

  for (const key of keys) {
    if (key.length !== 1) continue; // 長さエラーは別の関数で検出

    if (isWhitespace(key)) {
      whitespaceChars.push(key);
      continue;
    }

    if (isControlCharacter(key)) {
      controlChars.push(key);
      continue;
    }

    if (!isAlphanumeric(key) && !isValidSymbol(key)) {
      invalidChars.push(key);
    }
  }

  if (whitespaceChars.length > 0) {
    errors.push(
      `singleCharKeys cannot contain whitespace characters: ${JSON.stringify(whitespaceChars)}`,
    );
  }
  if (controlChars.length > 0) {
    errors.push(
      `singleCharKeys cannot contain control characters: ${JSON.stringify(controlChars)}`,
    );
  }
  if (invalidChars.length > 0) {
    errors.push(
      `singleCharKeys contains invalid characters: ${
        invalidChars.join(", ")
      } (allowed: a-z, A-Z, 0-9, ${VALID_SYMBOLS.join(" ")})`,
    );
  }
  return errors;
}
function validateNumericOnlyMode(config: HintKeyConfig): string[] {
  const errors: string[] = [];

  if (config.numericOnlyMultiChar === true && config.multiCharKeys) {
    const isAllDigits = config.multiCharKeys.every(isDigit);

    if (!isAllDigits) {
      const nonDigits = config.multiCharKeys.filter((k) => !isDigit(k));
      errors.push(
        `numericOnlyMultiChar is true but multiCharKeys contains non-digit characters: ${
          nonDigits.join(", ")
        }`,
      );
    }
  }
  return errors;
}
export function validateHintKeyConfig(config: HintKeyConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (config.singleCharKeys) {
    const invalidLength = config.singleCharKeys.filter((k) => k.length !== 1);
    if (invalidLength.length > 0) {
      errors.push(
        `Invalid single char keys (must be single character): ${invalidLength.join(", ")}`,
      );
    }
    if (config.singleCharKeys.some((k) => k.length === 0)) {
      errors.push("singleCharKeys cannot contain empty strings");
    }
    errors.push(...validateCharacterValidity(config.singleCharKeys));
    const uniqueKeys = new Set(config.singleCharKeys);
    if (uniqueKeys.size !== config.singleCharKeys.length) {
      errors.push("singleCharKeys must contain unique values");
    }
  }
  if (config.multiCharKeys) {
    const invalidMulti = config.multiCharKeys.filter((k) => k.length !== 1);
    if (invalidMulti.length > 0) {
      errors.push(`Multi char keys must be single characters: ${invalidMulti.join(", ")}`);
    }
  }
  if (config.singleCharKeys && config.multiCharKeys) {
    const overlap = config.singleCharKeys.filter((k) => config.multiCharKeys!.includes(k));
    if (overlap.length > 0) {
      errors.push(`Keys cannot be in both groups: ${overlap.join(", ")}`);
    }
  }
  errors.push(...validateNumericOnlyMode(config));
  if (config.maxSingleCharHints !== undefined) {
    if (config.maxSingleCharHints < 0) {
      errors.push("max_single_char_hints must be non-negative");
    }
  }
  if (config.useNumericMultiCharHints !== undefined) {
    if (typeof config.useNumericMultiCharHints !== "boolean") {
      errors.push("useNumericMultiCharHints must be a boolean value");
    }
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}
let adjacencyCache = GlobalCache.getInstance().getCache<
  string,
  { word: Word; adjacentWords: Word[] }[]
>(CacheType.ADJACENCY);

export function detectAdjacentWords(words: Word[]): { word: Word; adjacentWords: Word[] }[] {
  if (words.length === 0) {
    return [];
  }
  const cacheKey = words.map((w) => `${w.text}:${w.line}:${w.col}`).join("|");

  if (adjacencyCache.has(cacheKey)) {
    return adjacencyCache.get(cacheKey)!;
  }
  const result: { word: Word; adjacentWords: Word[] }[] = [];
  const tabWidth = 8;

  // 空間分割最適化: 行ごとにグループ化して30-60%削減
  const wordsByLine = new Map<number, Word[]>();
  for (const word of words) {
    const lineWords = wordsByLine.get(word.line);
    if (lineWords) {
      lineWords.push(word);
    } else {
      wordsByLine.set(word.line, [word]);
    }
  }

  // 同一行内のみ隣接チェック
  for (const word of words) {
    const adjacentWords: Word[] = [];
    const lineWords = wordsByLine.get(word.line);

    if (lineWords) {
      for (const otherWord of lineWords) {
        if (word === otherWord) continue;
        if (areWordsAdjacent(word, otherWord, tabWidth)) {
          adjacentWords.push(otherWord);
        }
      }
    }

    result.push({ word, adjacentWords });
  }
  adjacencyCache.set(cacheKey, result);
  return result;
}
export function isSymbolWord(word: Word): boolean {
  if (!word.text || word.text.trim().length === 0) {
    return false;
  }
  const symbolPattern = /^[\-\*#`\[\](){}.,;:!?]+$/;

  return symbolPattern.test(word.text);
}
export function shouldSkipHintForOverlap(
  word: Word,
  adjacentWords: Word[],
  priorityRules: { symbolsPriority: number; wordsPriority: number },
): boolean {
  if (!adjacentWords.length) return false;
  const isSym = isSymbolWord(word);
  for (const adj of adjacentWords) {
    const isAdjSym = isSymbolWord(adj);
    if (isSym && !isAdjSym && priorityRules.symbolsPriority < priorityRules.wordsPriority) {
      return true;
    }
    if (
      isSym === isAdjSym &&
      (word.text.length < adj.text.length ||
        (word.text.length === adj.text.length && word.col < adj.col))
    ) return true;
  }
  return false;
}
export function canDisplayHint(
  word: Word,
  adjacentWords: Word[],
  minHintWidth = 2,
  tabWidth = 8,
): boolean {
  if (!adjacentWords.length) return true;
  const cw = getDisplayWidth(word.text, tabWidth);
  const ce = word.col + cw - 1;
  for (const adj of adjacentWords) {
    if (word.line !== adj.line) continue;
    const aw = getDisplayWidth(adj.text, tabWidth);
    const ae = adj.col + aw - 1;
    const space = ce < adj.col ? adj.col - ce - 1 : word.col > ae ? word.col - ae - 1 : 0;
    if (space < minHintWidth) return false;
  }
  return true;
}
export function prioritizeHints(
  words: { word: Word; adjacentWords: Word[] }[],
  tabWidth = 8,
): Word[] {
  const processed = new Set<Word>();
  return words.filter(({ word, adjacentWords }) => {
    if (processed.has(word)) return false;
    const canDisplay = canDisplayHint(word, adjacentWords, 2, tabWidth);
    if (canDisplay) processed.add(word);
    return canDisplay;
  }).map((w) => w.word);
}
export function getWordDisplayStartCol(word: Word, tabWidth = 8): number {
  return word.col;
}
export function isPositionWithinWord(position: number, word: Word, tabWidth = 8): boolean {
  const startCol = getWordDisplayStartCol(word, tabWidth);
  const endCol = getWordDisplayEndCol(word, tabWidth);
  return position >= startCol && position <= endCol;
}
export function calculateWordGap(word1: Word, word2: Word, tabWidth = 8): number {
  if (word1.line !== word2.line) {
    return Infinity; // Different lines
  }
  const word1EndCol = getWordDisplayEndCol(word1, tabWidth);
  const word2EndCol = getWordDisplayEndCol(word2, tabWidth);

  if (word1.col < word2.col) {
    return word2.col - word1EndCol - 1;
  } else {
    return word1.col - word2EndCol - 1;
  }
}
export class HintManager {
  private config: Config;
  private currentKeyContext?: string;
  constructor(config: Config) {
    this.config = config;
    this.currentKeyContext = config.currentKeyContext;
  }
  onKeyPress(key: string): void {
    if (this.currentKeyContext !== key) this.clearCurrentHints();
    this.currentKeyContext = key;
    this.config.currentKeyContext = key;
  }
  getMinLengthForKey(key: string): number {
    return Core.getMinLengthForKey(this.config, key);
  }
  clearCurrentHints(): void {}
  getCurrentKeyContext(): string | undefined {
    return this.currentKeyContext;
  }
  getConfig(): Readonly<Config> {
    return this.config;
  }
}
