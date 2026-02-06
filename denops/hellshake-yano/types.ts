import type { Config } from "./config.ts";
import type { Denops as DenopsStd } from "@denops/std";
export type { Config } from "./config.ts";
export type Denops = DenopsStd;
export interface Word {
  text: string;
  line: number;
  col: number;
  byteCol?: number;
  /** Window ID for multi-window support (optional) */
  winid?: number;
  /** Buffer number for multi-window support (optional) */
  bufnr?: number;
}

/**
 * Window information for multi-window hint display
 * Corresponds to Vim's window_detector.vim
 */
export interface WindowInfo {
  /** Window ID (unique identifier) */
  winid: number;
  /** Buffer number displayed in this window */
  bufnr: number;
  /** First visible line number (1-indexed) */
  topline: number;
  /** Last visible line number (1-indexed) */
  botline: number;
  /** Window width in columns */
  width: number;
  /** Window height in lines */
  height: number;
  /** Whether this is the current window */
  isCurrent: boolean;
}
export interface HintMapping {
  word: Word;
  hint: string;
  hintCol: number;
  hintByteCol: number;
}

export interface HintPosition {
  line: number;
  col: number;
  display_mode: HintDisplayMode;
}
export interface HintPositionWithCoordinateSystem extends HintPosition {
  vim_col: number;
  nvim_col: number;
  vim_line: number;
  nvim_line: number;
}
export interface CoreState {
  config: Config;
  currentHints: HintMapping[];
  hintsVisible: boolean;
  isActive: boolean;
}
export interface HighlightColor {
  fg?: string;
  bg?: string;
}
export interface PerformanceMetrics {
  showHints: number[];
  hideHints: number[];
  wordDetection: number[];
  hintGeneration: number[];
}
export interface DebugInfo {
  config: Config;
  hintsVisible: boolean;
  currentHints: HintMapping[];
  metrics: PerformanceMetrics;
  timestamp: number;
}
export interface DetectionContext {
  currentKey?: string;
  minWordLength?: number;
  metadata?: Record<string, unknown>;
  bufnr?: number;
  config?: Partial<Config>;
  strategy?: string;
  fileType?: string;
  syntaxContext?: SyntaxContext;
  lineContext?: LineContext;
}
export interface SyntaxContext {
  inComment: boolean;
  inString: boolean;
  inFunction: boolean;
  inClass: boolean;
  language: string;
  syntaxGroups?: string[];
}
export interface LineContext {
  isComment: boolean;
  isDocString: boolean;
  isImport: boolean;
  indentLevel: number;
  lineType: string;
  precedingChar?: string;
  followingChar?: string;
}
export interface WordDetectionResult {
  words: Word[];
  detector: string;
  success: boolean;
  error?: string;
  performance: PerformanceMetric;
}
export interface HintKeyConfig {
  singleCharKeys?: string[];
  multiCharKeys?: string[];
  markers?: string[];
  maxSingleCharHints?: number;
  useDistancePriority?: boolean;
  allowSymbolsInSingleChar?: boolean;
  numericOnlyMultiChar?: boolean;
  useNumericMultiCharHints?: boolean;
}
export const DEFAULT_HINT_MARKERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export type HintPositionType = "start" | "end" | "overlay" | "same" | "both";
export type HintDisplayMode = "before" | "after" | "overlay";
export type DetectionStrategy = "regex" | "tinysegmenter" | "hybrid";
export type MotionKey =
  | "f"
  | "F"
  | "t"
  | "T"
  | "w"
  | "W"
  | "b"
  | "B"
  | "e"
  | "E"
  | "/"
  | "?"
  | "n"
  | "N"
  | "h"
  | "j"
  | "k"
  | "l"
  | ";"
  | ","
  | string;
export type CacheKey = string;
export type Timestamp = number;
export interface CacheEntry<T> {
  key: CacheKey;
  value: T;
  timestamp: Timestamp;
  ttl?: number;
}
export interface ValidationResult<T> {
  isValid: boolean;
  value?: T;
  errors: string[];
  warnings?: string[];
}
export interface PerformanceMetric {
  duration: number;
  wordCount: number;
  linesProcessed: number;
  memoryUsage?: number;
  cacheHits?: number;
}
export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };
export type Optional<T> = T | null | undefined;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export function isWord(obj: unknown): obj is Word {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as Word).text === "string" &&
    typeof (obj as Word).line === "number" &&
    typeof (obj as Word).col === "number" &&
    (obj as Word).line > 0 &&
    (obj as Word).col > 0 &&
    ((obj as Word).byteCol === undefined || typeof (obj as Word).byteCol === "number") &&
    ((obj as Word).winid === undefined || typeof (obj as Word).winid === "number") &&
    ((obj as Word).bufnr === undefined || typeof (obj as Word).bufnr === "number")
  );
}

export function isWindowInfo(obj: unknown): obj is WindowInfo {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as WindowInfo).winid === "number" &&
    typeof (obj as WindowInfo).bufnr === "number" &&
    typeof (obj as WindowInfo).topline === "number" &&
    typeof (obj as WindowInfo).botline === "number" &&
    typeof (obj as WindowInfo).width === "number" &&
    typeof (obj as WindowInfo).height === "number" &&
    typeof (obj as WindowInfo).isCurrent === "boolean" &&
    (obj as WindowInfo).winid > 0 &&
    (obj as WindowInfo).bufnr > 0 &&
    (obj as WindowInfo).topline > 0 &&
    (obj as WindowInfo).botline >= (obj as WindowInfo).topline
  );
}

export function isHintMapping(obj: unknown): obj is HintMapping {
  return (
    typeof obj === "object" &&
    obj !== null &&
    isWord((obj as HintMapping).word) &&
    typeof (obj as HintMapping).hint === "string" &&
    (obj as HintMapping).hint.length > 0 &&
    typeof (obj as HintMapping).hintCol === "number" &&
    (obj as HintMapping).hintCol > 0 &&
    typeof (obj as HintMapping).hintByteCol === "number" &&
    (obj as HintMapping).hintByteCol > 0
  );
}

export function isConfig(obj: unknown): obj is Config {
  return (
    typeof obj === "object" &&
    obj !== null &&
    Array.isArray((obj as Config).markers) &&
    typeof (obj as Config).motionCount === "number" &&
    typeof (obj as Config).motionTimeout === "number" &&
    typeof (obj as Config).hintPosition === "string" &&
    typeof (obj as Config).triggerOnHjkl === "boolean" &&
    Array.isArray((obj as Config).countedMotions) &&
    typeof (obj as Config).enabled === "boolean"
  );
}

export function isHintPosition(obj: unknown): obj is HintPosition {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as HintPosition).line === "number" &&
    typeof (obj as HintPosition).col === "number" &&
    (obj as HintPosition).line > 0 &&
    (obj as HintPosition).col > 0 &&
    ["before", "after", "overlay"].includes((obj as HintPosition).display_mode)
  );
}

export function isDetectionStrategy(value: unknown): value is DetectionStrategy {
  return typeof value === "string" && ["regex", "tinysegmenter", "hybrid"].includes(value);
}
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
export type RequiredProperties<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type SafeKeys<T> = keyof T;
export type ValueOf<T> = T[keyof T];
export function createMinimalConfig(): Config {
  return {
    enabled: true,
    markers: [
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M",
      "N",
      "O",
      "P",
      "Q",
      "R",
      "S",
      "T",
      "U",
      "V",
      "W",
      "X",
      "Y",
      "Z",
    ],
    motionCount: 3,
    motionTimeout: 2000,
    hintPosition: "start",
    triggerOnHjkl: true,
    countedMotions: [],
    maxHints: 100,
    debounceDelay: 50,
    useNumbers: false,
    directionalHintFilter: false,
    highlightSelected: false,
    debugCoordinates: false,
    singleCharKeys: [],
    multiCharKeys: [],
    useHintGroups: false,
    continuousHintMode: false,
    recenterCommand: "normal! zz",
    maxContinuousJumps: 50,
    highlightHintMarker: "DiffAdd",
    highlightHintMarkerCurrent: "DiffText",
    suppressOnKeyRepeat: true,
    keyRepeatThreshold: 50,
    useJapanese: false,
    wordDetectionStrategy: "hybrid",
    enableTinySegmenter: true,
    segmenterThreshold: 4,
    japaneseMinWordLength: 2,
    japaneseMergeParticles: true,
    japaneseMergeThreshold: 2,
    defaultMinWordLength: 3,
    defaultMotionCount: 3,
    debugMode: false,
    performanceLog: false,
    motionCounterEnabled: true,
    motionCounterThreshold: 3,
    motionCounterTimeout: 2000,
    showHintOnMotionThreshold: true,
    multiWindowMode: false,
    multiWindowExcludeTypes: ["help", "quickfix", "terminal", "popup", "nofile"],
    multiWindowMaxWindows: 4,
  };
}
export interface WordDetectionConfig {
  minLength?: number;
  maxWords?: number;
  pattern?: string;
  bufnr?: number;
  config?: Partial<Config>;
}
export interface DetectWordsParams {
  denops: Denops;
  bufnr?: number;
  config?: Partial<Config>;
}
export interface HintGenerationConfig {
  wordCount: number;
  markers?: string;
  config?: Partial<Config>;
  words?: string[];
  hintKeys?: string;
}
export interface GenerateHintsParams {
  wordCount: number;
  markers?: string | string[];
  config?: Partial<Config>;
}
export interface ShowHintsConfig {
  debounce?: number;
  force?: boolean;
  debounceDelay?: number;
}
export interface HintOperationsDependencies {
  detectWordsOptimized: (denops: Denops, bufnr?: number) => Promise<Word[]>;
  generateHintsOptimized: (wordCount: number, config?: Partial<Config>) => string[];
  assignHintsToWords: (words: Word[], hints: string[]) => HintMapping[];
  displayHintsAsync: (
    denops: Denops,
    hints: HintMapping[],
    config?: Partial<Config>,
  ) => Promise<void>;
  hideHints: (denops: Denops) => Promise<void>;
  recordPerformance: (operation: string, startTime: number, endTime: number) => void;
  clearHintCache: () => void;
}
export interface HintOperationsConfig {
  denops: Denops;
  config?: Partial<Config>;
  dependencies?: HintOperationsDependencies;
}
export interface HintOperations {
  show: (denops: Denops, config?: ShowHintsConfig) => Promise<void>;
  hide: (denops: Denops) => Promise<void>;
  clear: (denops: Denops) => Promise<void>;
  isHintsVisible: () => boolean;
  getCurrentHints: () => HintMapping[];
}
export interface CommandObject {
  command: string;
  config: Config;
}
export interface Controller {
  enable: () => void;
  disable: () => void;
  toggle: () => void;
}
export interface ConfigManager {
  getConfig: () => Config;
  updateConfig: (newConfig: Partial<Config>) => void;
  setCount: (count: number) => void;
  setTimeout: (timeout: number) => void;
}
export interface DebugController {
  getStatistics: () => PluginStatistics;
  clearCache: () => void;
  toggleDebugMode: () => void;
}
export interface ExtendedDebugInfo extends DebugInfo {
  performanceDetails?: {
    minExecutionTime?: number;
    maxExecutionTime?: number;
    avgExecutionTime?: number;
  };
  cacheDetails?: { wordCacheSize?: number; hintCacheSize?: number; cacheHitRate?: number };
}
export interface InitializeOptions {
  force?: boolean;
  debug?: boolean;
  config?: Partial<Config>;
  cacheSizes?: { words?: number; hints?: number };
}
export interface InitializeResult {
  extmarkNamespace: number | null;
  caches: {
    words: import("./cache.ts").LRUCache<string, Word[]>;
    hints: import("./cache.ts").LRUCache<string, string[]>;
  };
}
export interface HealthCheckResult {
  healthy: boolean;
  issues: string[];
  recommendations: string[];
}
export interface EnhancedConfig extends Config {
  default_min_length?: number;
  min_length?: number;
  minWordLength?: number;
}
export interface PerformanceStats {
  count: number;
  average: number;
  max: number;
  min: number;
}
export interface PluginStatistics {
  cacheStats: {
    words: import("./cache.ts").CacheStatistics;
    hints: import("./cache.ts").CacheStatistics;
  };
  performanceStats: {
    showHints: PerformanceStats;
    hideHints: PerformanceStats;
    wordDetection: PerformanceStats;
    hintGeneration: PerformanceStats;
  };
  currentState: { initialized: boolean; hintsVisible: boolean; currentHintsCount: number };
}
