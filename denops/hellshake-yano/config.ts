/**
 * 設定管理モジュール
 * Phase 1: モジュール分割でmain.tsから分離
 * Phase 2: データ構造の簡潔化 - 階層化設定の追加
 * Phase 3: 命名規則の統一 - camelCase統一と明確な命名規則
 * Phase 5: 型定義の整理 - 主要な型定義はtypes.tsに移行
 */

// Import consolidated types from types.ts
import type {
  Config as TypesConfig,
  HighlightColor,
  HintPositionType
} from "./types.ts";

// Re-export types for backward compatibility
export type { HighlightColor, HintPositionType };
// Re-export Config from types.ts to ensure consistency
export type { Config } from "./types.ts";

// HighlightColor interface moved to types.ts for consolidation
// Use: import type { HighlightColor } from "./types.ts";

// Phase 2: 階層化された設定インターフェース

// 基本設定
export interface CoreConfig {
  enabled: boolean;
  markers: string[];
  motionCount: number;
}

// ヒント関連設定
export interface HintConfig {
  hintPosition: HintPositionType;
  visualHintPosition: "start" | "end" | "same" | "both" | "overlay";
  maxHints: number;
  highlightSelected: boolean;
  useNumbers: boolean;
  singleCharKeys: string[];
  multiCharKeys: string[];
  maxSingleCharHints?: number;
  useHintGroups: boolean;
  highlightHintMarker?: string | HighlightColor;
  highlightHintMarkerCurrent?: string | HighlightColor;
}

// 単語検出関連設定
export interface WordConfig {
  useJapanese?: boolean; // オプショナルにして既存設定と一致
  detectionStrategy: "regex" | "tinysegmenter" | "hybrid";
  enableTinySegmenter: boolean;
  segmenterThreshold: number;
  japaneseMinWordLength: number;
  japaneseMergeParticles: boolean;
  japaneseMergeThreshold: number;
  defaultMinWordLength: number;
  perKeyMinLength?: Record<string, number>;
  currentKeyContext?: string; // 内部使用
}

// パフォーマンス関連設定
export interface PerformanceConfig {
  debounceDelay: number;
  cacheSize?: number;
  batchThreshold?: number;
  motionTimeout: number;
  suppressOnKeyRepeat: boolean;
  keyRepeatThreshold: number;
  keyRepeatResetDelay: number;
  perKeyMotionCount?: Record<string, number>;
  defaultMotionCount?: number;
  triggerOnHjkl: boolean;
  countedMotions: string[];
}

// デバッグ設定
export interface DebugConfig {
  debugMode: boolean;
  performanceLog: boolean;
  coordinateDebug: boolean;
}

// 階層化された設定の構造
export interface HierarchicalConfig {
  core: CoreConfig;
  hint: HintConfig;
  word: WordConfig;
  performance: PerformanceConfig;
  debug: DebugConfig;
}

// Phase 3: camelCase統一のための新しい型定義
export interface CamelCaseConfig {
  // Core settings
  enabled: boolean;
  markers: string[];
  motionCount: number;
  motionTimeout: number;
  hintPosition: HintPositionType;
  visualHintPosition?: "start" | "end" | "same" | "both" | "overlay";
  triggerOnHjkl: boolean;
  countedMotions: string[];
  maxHints: number;
  debounceDelay: number;

  // Hint settings
  useNumbers: boolean;
  highlightSelected: boolean;
  debugCoordinates: boolean;
  singleCharKeys?: string[];
  multiCharKeys?: string[];
  maxSingleCharHints?: number;
  useHintGroups?: boolean;

  // Word detection settings
  useJapanese?: boolean;
  wordDetectionStrategy?: "regex" | "tinysegmenter" | "hybrid";
  enableTinySegmenter?: boolean;
  segmenterThreshold?: number;
  japaneseMinWordLength?: number;
  japaneseMergeParticles?: boolean;
  japaneseMergeThreshold?: number;
  highlightHintMarker?: string | HighlightColor;
  highlightHintMarkerCurrent?: string | HighlightColor;
  suppressOnKeyRepeat?: boolean;
  keyRepeatThreshold?: number;

  // Per-key settings
  perKeyMinLength?: Record<string, number>;
  defaultMinWordLength?: number;
  perKeyMotionCount?: Record<string, number>;
  defaultMotionCount?: number;
  currentKeyContext?: string;

  // Legacy compatibility
  minWordLength?: number;
  enable?: boolean;
  keyRepeatResetDelay?: number;
  debugMode?: boolean;
  performanceLog?: boolean;

  // Boolean naming convention (internal)
  isEnabled?: boolean;
  shouldUseNumbers?: boolean;
  shouldHighlightSelected?: boolean;
  shouldTriggerOnHjkl?: boolean;
  hasDebugCoordinates?: boolean;
}

// Phase 3: 後方互換性のための型定義
// snake_caseとcamelCaseの両方をサポート
export interface ModernConfig extends CamelCaseConfig {
  // snake_case properties for backward compatibility
  motion_count?: number;
  motion_timeout?: number;
  hint_position?: HintPositionType;
  visual_hint_position?: "start" | "end" | "same" | "both" | "overlay";
  trigger_on_hjkl?: boolean;
  counted_motions?: string[];
  use_numbers?: boolean;
  highlight_selected?: boolean;
  debug_coordinates?: boolean;
  single_char_keys?: string[];
  multi_char_keys?: string[];
  max_single_char_hints?: number;
  use_hint_groups?: boolean;
  use_japanese?: boolean;
  word_detection_strategy?: "regex" | "tinysegmenter" | "hybrid";
  enable_tinysegmenter?: boolean;
  segmenter_threshold?: number;
  japanese_min_word_length?: number;
  japanese_merge_particles?: boolean;
  japanese_merge_threshold?: number;
  highlight_hint_marker?: string | HighlightColor;
  highlight_hint_marker_current?: string | HighlightColor;
  suppress_on_key_repeat?: boolean;
  key_repeat_threshold?: number;
  per_key_min_length?: Record<string, number>;
  default_min_word_length?: number;
  per_key_motion_count?: Record<string, number>;
  default_motion_count?: number;
  current_key_context?: string;
  min_word_length?: number;
  enable?: boolean;
  key_repeat_reset_delay?: number;
  debug_mode?: boolean;
  performance_log?: boolean;
}

// 設定の型定義（既存互換性のため維持）
// Note: Renamed to LocalConfig to avoid conflict with types.ts Config
interface LocalConfig {
  markers: string[];
  motion_count: number;
  motion_timeout: number;
  hint_position: HintPositionType;
  visual_hint_position?: "start" | "end" | "same" | "both" | "overlay"; // Visual Modeでのヒント位置 (デフォルト: 'end')
  trigger_on_hjkl: boolean;
  counted_motions: string[];
  enabled: boolean;
  maxHints: number; // パフォーマンス最適化: 最大ヒント数
  debounceDelay: number; // デバウンス遅延時間
  use_numbers: boolean; // 数字(0-9)をヒント文字として使用
  highlight_selected: boolean; // 選択中のヒントをハイライト（UX改善）
  debug_coordinates: boolean; // 座標系デバッグログの有効/無効
  single_char_keys?: string[]; // 1文字ヒント専用キー
  multi_char_keys?: string[]; // 2文字以上ヒント専用キー
  max_single_char_hints?: number; // 1文字ヒントの最大数
  use_hint_groups?: boolean; // ヒントグループ機能を使用するか
  use_japanese?: boolean; // 日本語を含む単語検出を行うか（デフォルト: false）
  word_detection_strategy?: "regex" | "tinysegmenter" | "hybrid"; // 単語検出アルゴリズム（デフォルト: "hybrid"）
  enable_tinysegmenter?: boolean; // TinySegmenterを有効にするか（デフォルト: true）
  segmenter_threshold?: number; // TinySegmenterを使用する最小文字数（デフォルト: 4）
  // 日本語分割精度設定
  japanese_min_word_length?: number; // 日本語の最小単語長（デフォルト: 2）
  japanese_merge_particles?: boolean; // 助詞や接続詞を前の単語と結合（デフォルト: true）
  japanese_merge_threshold?: number; // 結合する最大文字数（デフォルト: 2）
  highlight_hint_marker?: string | HighlightColor; // ヒントマーカーのハイライト色
  highlight_hint_marker_current?: string | HighlightColor; // 選択中ヒントのハイライト色
  suppress_on_key_repeat?: boolean; // キーリピート時のヒント表示抑制（デフォルト: true）
  key_repeat_threshold?: number; // リピート判定の閾値（ミリ秒、デフォルト: 50）

  // キー別最小文字数設定（process1追加）
  per_key_min_length?: Record<string, number>; // キー別の最小文字数設定
  default_min_word_length?: number; // per_key_min_lengthに存在しないキーのデフォルト値
  current_key_context?: string; // 内部使用：現在のキーコンテキスト

  // キー別motion_count設定（process1追加）
  per_key_motion_count?: Record<string, number>; // キー別のmotion_count設定
  default_motion_count?: number; // per_key_motion_countに存在しないキーのデフォルト値

  // 後方互換性のため残す
  min_word_length?: number; // 旧形式の最小文字数設定
  enable?: boolean; // enabled のエイリアス（後方互換性）
  key_repeat_reset_delay?: number; // リピート終了判定の遅延（ミリ秒、デフォルト: 300）
  debug_mode?: boolean; // デバッグモードの有効/無効（デフォルト: false）
  performance_log?: boolean; // パフォーマンスログの有効/無効（デフォルト: false）
}

/**
 * デフォルト設定を取得（後方互換性のため維持）
 */
export function getDefaultConfig(): TypesConfig {
  return {
    markers: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
    motion_count: 3,
    motion_timeout: 2000,
    hint_position: "start",
    visual_hint_position: "end", // Visual Modeでは単語の末尾にヒント表示
    trigger_on_hjkl: true,
    counted_motions: [],
    enabled: true,
    maxHints: 336, // Approach A対応: 11単文字 + 225二文字 + 100数字 = 336個
    debounceDelay: 50, // 50msのデバウンス
    use_numbers: true, // デフォルトで数字を使用可能
    highlight_selected: true, // デフォルトで選択中ヒントをハイライト
    debug_coordinates: false, // デフォルトでデバッグログは無効
    single_char_keys: [
      "A",
      "S",
      "D",
      "F",
      "G",
      "H",
      "J",
      "K",
      "L",
      "N",
      "M",
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
    ],
    multi_char_keys: ["B", "C", "E", "I", "O", "P", "Q", "R", "T", "U", "V", "W", "X", "Y", "Z"],
    // max_single_char_hints: undefined, // デフォルトは制限なし（single_char_keysの長さ）
    use_hint_groups: true, // デフォルトで有効
    // use_japanese: デフォルト値を設定しない（ユーザー設定を優先）
    word_detection_strategy: "hybrid" as const, // ハイブリッド方式をデフォルトに
    enable_tinysegmenter: true, // TinySegmenterを有効に
    segmenter_threshold: 4, // 4文字以上でセグメンテーション
    japanese_min_word_length: 2, // 2文字以上の単語のみヒント表示
    japanese_merge_particles: true, // 助詞を前の単語と結合
    japanese_merge_threshold: 2, // 2文字以下の単語を結合対象とする
    highlight_hint_marker: "DiffAdd", // ヒントマーカーのハイライト色（後方互換性のため文字列）
    highlight_hint_marker_current: "DiffText", // 選択中ヒントのハイライト色（後方互換性のため文字列）
    debug_mode: false, // デバッグモード無効
    performance_log: false, // パフォーマンスログ無効
  };
}

/**
 * 設定値のバリデーション（camelCaseとsnake_case両方に対応）
 */
export function validateConfig(config: Partial<TypesConfig | CamelCaseConfig>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // motion_count / motionCount の検証
  const motionCountValue = (config as any).motion_count ?? (config as any).motionCount;
  if (motionCountValue !== undefined) {
    if (!Number.isInteger(motionCountValue) || motionCountValue <= 0) {
      errors.push("motion_count/motionCount must be a positive integer");
    }
  }

  // motion_timeout / motionTimeoutの検証
  const motionTimeoutValue = (config as any).motion_timeout ?? (config as any).motionTimeout;
  if (motionTimeoutValue !== undefined) {
    if (!Number.isInteger(motionTimeoutValue) || motionTimeoutValue <= 0) {
      errors.push("motion_timeout/motionTimeout must be a positive integer");
    }
  }

  // maxHintsの検証
  if (config.maxHints !== undefined) {
    if (!Number.isInteger(config.maxHints) || config.maxHints <= 0) {
      errors.push("maxHints must be a positive integer");
    }
  }

  // debounceDelayの検証
  if (config.debounceDelay !== undefined) {
    if (!Number.isInteger(config.debounceDelay) || config.debounceDelay < 0) {
      errors.push("debounceDelay must be a non-negative integer");
    }
  }

  // hint_position / hintPositionの検証
  const hintPositionValue = (config as any).hint_position ?? (config as any).hintPosition;
  if (hintPositionValue !== undefined) {
    const validPositions = ["start", "end", "same"];
    if (!validPositions.includes(hintPositionValue)) {
      errors.push(`hint_position/hintPosition must be one of: ${validPositions.join(", ")}`);
    }
  }

  // visual_hint_position / visualHintPositionの検証
  const visualHintPositionValue = (config as any).visual_hint_position ?? (config as any).visualHintPosition;
  if (visualHintPositionValue !== undefined) {
    const validPositions = ["start", "end", "same"];
    if (!validPositions.includes(visualHintPositionValue)) {
      errors.push(`visual_hint_position/visualHintPosition must be one of: ${validPositions.join(", ")}`);
    }
  }

  // word_detection_strategy / wordDetectionStrategyの検証
  const wordDetectionStrategyValue = (config as any).word_detection_strategy ?? (config as any).wordDetectionStrategy;
  if (wordDetectionStrategyValue !== undefined) {
    const validStrategies = ["regex", "tinysegmenter", "hybrid"];
    if (!validStrategies.includes(wordDetectionStrategyValue)) {
      errors.push(`word_detection_strategy/wordDetectionStrategy must be one of: ${validStrategies.join(", ")}`);
    }
  }

  // markers配列の検証
  if (config.markers !== undefined) {
    if (!Array.isArray(config.markers) || config.markers.length === 0) {
      errors.push("markers must be a non-empty array");
    } else {
      const uniqueMarkers = new Set(config.markers);
      if (uniqueMarkers.size !== config.markers.length) {
        errors.push("markers must contain unique values");
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 階層化設定のデフォルト値を取得
 */
export function getDefaultHierarchicalConfig(): HierarchicalConfig {
  return {
    core: {
      enabled: true,
      markers: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
      motionCount: 3,
    },
    hint: {
      hintPosition: "start",
      visualHintPosition: "end",
      maxHints: 336,
      highlightSelected: true,
      useNumbers: true,
      singleCharKeys: [
        "A", "S", "D", "F", "G", "H", "J", "K", "L", "N", "M",
        "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
      ],
      multiCharKeys: ["B", "C", "E", "I", "O", "P", "Q", "R", "T", "U", "V", "W", "X", "Y", "Z"],
      useHintGroups: true,
      highlightHintMarker: "DiffAdd",
      highlightHintMarkerCurrent: "DiffText",
    },
    word: {
      useJapanese: undefined, // デフォルトは未設定（既存設定と同じ）
      detectionStrategy: "hybrid",
      enableTinySegmenter: true,
      segmenterThreshold: 4,
      japaneseMinWordLength: 2,
      japaneseMergeParticles: true,
      japaneseMergeThreshold: 2,
      defaultMinWordLength: 3,
    },
    performance: {
      debounceDelay: 50,
      motionTimeout: 2000,
      suppressOnKeyRepeat: true,
      keyRepeatThreshold: 50,
      keyRepeatResetDelay: 300,
      triggerOnHjkl: true,
      countedMotions: [],
    },
    debug: {
      debugMode: false,
      performanceLog: false,
      coordinateDebug: false,
    },
  };
}

/**
 * フラット設定から階層化設定を作成
 */
export function createHierarchicalConfig(flatConfig: Partial<TypesConfig> = {}): HierarchicalConfig {
  const defaults = getDefaultHierarchicalConfig();

  return {
    core: {
      enabled: flatConfig.enabled ?? flatConfig.enable ?? defaults.core.enabled,
      markers: flatConfig.markers ?? defaults.core.markers,
      motionCount: flatConfig.motion_count ?? defaults.core.motionCount,
    },
    hint: {
      hintPosition: (flatConfig.hint_position ?? defaults.hint.hintPosition) as "start" | "end" | "same",
      visualHintPosition: flatConfig.visual_hint_position ?? defaults.hint.visualHintPosition,
      maxHints: flatConfig.maxHints ?? defaults.hint.maxHints,
      highlightSelected: flatConfig.highlight_selected ?? defaults.hint.highlightSelected,
      useNumbers: flatConfig.use_numbers ?? defaults.hint.useNumbers,
      singleCharKeys: flatConfig.single_char_keys ?? defaults.hint.singleCharKeys,
      multiCharKeys: flatConfig.multi_char_keys ?? defaults.hint.multiCharKeys,
      maxSingleCharHints: flatConfig.max_single_char_hints,
      useHintGroups: flatConfig.use_hint_groups ?? defaults.hint.useHintGroups,
      highlightHintMarker: flatConfig.highlight_hint_marker ?? defaults.hint.highlightHintMarker,
      highlightHintMarkerCurrent: flatConfig.highlight_hint_marker_current ?? defaults.hint.highlightHintMarkerCurrent,
    },
    word: {
      useJapanese: flatConfig.use_japanese ?? defaults.word.useJapanese,
      detectionStrategy: flatConfig.word_detection_strategy ?? defaults.word.detectionStrategy,
      enableTinySegmenter: flatConfig.enable_tinysegmenter ?? defaults.word.enableTinySegmenter,
      segmenterThreshold: flatConfig.segmenter_threshold ?? defaults.word.segmenterThreshold,
      japaneseMinWordLength: flatConfig.japanese_min_word_length ?? defaults.word.japaneseMinWordLength,
      japaneseMergeParticles: flatConfig.japanese_merge_particles ?? defaults.word.japaneseMergeParticles,
      japaneseMergeThreshold: flatConfig.japanese_merge_threshold ?? defaults.word.japaneseMergeThreshold,
      defaultMinWordLength: flatConfig.default_min_word_length ?? flatConfig.min_word_length ?? defaults.word.defaultMinWordLength,
      perKeyMinLength: flatConfig.per_key_min_length,
      currentKeyContext: flatConfig.current_key_context,
    },
    performance: {
      debounceDelay: flatConfig.debounceDelay ?? defaults.performance.debounceDelay,
      motionTimeout: flatConfig.motion_timeout ?? defaults.performance.motionTimeout,
      suppressOnKeyRepeat: flatConfig.suppress_on_key_repeat ?? defaults.performance.suppressOnKeyRepeat,
      keyRepeatThreshold: flatConfig.key_repeat_threshold ?? defaults.performance.keyRepeatThreshold,
      keyRepeatResetDelay: flatConfig.key_repeat_reset_delay ?? defaults.performance.keyRepeatResetDelay,
      perKeyMotionCount: flatConfig.per_key_motion_count,
      defaultMotionCount: flatConfig.default_motion_count,
      triggerOnHjkl: flatConfig.trigger_on_hjkl ?? defaults.performance.triggerOnHjkl,
      countedMotions: flatConfig.counted_motions ?? defaults.performance.countedMotions,
    },
    debug: {
      debugMode: flatConfig.debug_mode ?? defaults.debug.debugMode,
      performanceLog: flatConfig.performance_log ?? defaults.debug.performanceLog,
      coordinateDebug: flatConfig.debug_coordinates ?? defaults.debug.coordinateDebug,
    },
  };
}

/**
 * 階層化設定をフラット設定に変換（後方互換性のため）
 */
export function flattenHierarchicalConfig(hierarchicalConfig: HierarchicalConfig): TypesConfig {
  return {
    // Core
    enabled: hierarchicalConfig.core.enabled,
    markers: hierarchicalConfig.core.markers,
    motion_count: hierarchicalConfig.core.motionCount,

    // Hint
    hint_position: hierarchicalConfig.hint.hintPosition,
    visual_hint_position: hierarchicalConfig.hint.visualHintPosition,
    maxHints: hierarchicalConfig.hint.maxHints,
    highlight_selected: hierarchicalConfig.hint.highlightSelected,
    use_numbers: hierarchicalConfig.hint.useNumbers,
    single_char_keys: hierarchicalConfig.hint.singleCharKeys,
    multi_char_keys: hierarchicalConfig.hint.multiCharKeys,
    max_single_char_hints: hierarchicalConfig.hint.maxSingleCharHints,
    use_hint_groups: hierarchicalConfig.hint.useHintGroups,
    highlight_hint_marker: hierarchicalConfig.hint.highlightHintMarker,
    highlight_hint_marker_current: hierarchicalConfig.hint.highlightHintMarkerCurrent,

    // Word
    use_japanese: hierarchicalConfig.word.useJapanese,
    word_detection_strategy: hierarchicalConfig.word.detectionStrategy,
    enable_tinysegmenter: hierarchicalConfig.word.enableTinySegmenter,
    segmenter_threshold: hierarchicalConfig.word.segmenterThreshold,
    japanese_min_word_length: hierarchicalConfig.word.japaneseMinWordLength,
    japanese_merge_particles: hierarchicalConfig.word.japaneseMergeParticles,
    japanese_merge_threshold: hierarchicalConfig.word.japaneseMergeThreshold,
    default_min_word_length: hierarchicalConfig.word.defaultMinWordLength,
    per_key_min_length: hierarchicalConfig.word.perKeyMinLength,
    current_key_context: hierarchicalConfig.word.currentKeyContext,

    // Performance
    debounceDelay: hierarchicalConfig.performance.debounceDelay,
    motion_timeout: hierarchicalConfig.performance.motionTimeout,
    suppress_on_key_repeat: hierarchicalConfig.performance.suppressOnKeyRepeat,
    key_repeat_threshold: hierarchicalConfig.performance.keyRepeatThreshold,
    key_repeat_reset_delay: hierarchicalConfig.performance.keyRepeatResetDelay,
    per_key_motion_count: hierarchicalConfig.performance.perKeyMotionCount,
    default_motion_count: hierarchicalConfig.performance.defaultMotionCount,
    trigger_on_hjkl: hierarchicalConfig.performance.triggerOnHjkl,
    counted_motions: hierarchicalConfig.performance.countedMotions,

    // Debug
    debug_mode: hierarchicalConfig.debug.debugMode,
    performance_log: hierarchicalConfig.debug.performanceLog,
    debug_coordinates: hierarchicalConfig.debug.coordinateDebug,
  };
}

/**
 * 階層化設定のマージ（部分的な設定更新をサポート）
 */
export function mergeHierarchicalConfig(
  baseConfig: HierarchicalConfig,
  updates: Partial<HierarchicalConfig>
): HierarchicalConfig {
  return {
    core: { ...baseConfig.core, ...updates.core },
    hint: { ...baseConfig.hint, ...updates.hint },
    word: { ...baseConfig.word, ...updates.word },
    performance: { ...baseConfig.performance, ...updates.performance },
    debug: { ...baseConfig.debug, ...updates.debug },
  };
}

/**
 * 設定をマージ（部分的な設定更新をサポート）
 */
export function mergeConfig(baseConfig: TypesConfig, updates: Partial<TypesConfig>): TypesConfig {
  // バリデーションを実行
  const validation = validateConfig(updates);
  if (!validation.valid) {
    throw new Error(`Invalid config: ${validation.errors.join(", ")}`);
  }

  // 後方互換性のため、enableフィールドをenabledにマッピング
  if (updates.enable !== undefined) {
    updates.enabled = updates.enable;
  }

  // 後方互換性のため、min_word_lengthをdefault_min_word_lengthにマッピング
  if (updates.min_word_length !== undefined) {
    updates.default_min_word_length = updates.min_word_length;
  }

  return { ...baseConfig, ...updates };
}

/**
 * 設定の深いコピーを作成
 */
export function cloneConfig(config: TypesConfig): TypesConfig {
  return JSON.parse(JSON.stringify(config));
}

/**
 * キー別設定を取得するヘルパー関数
 */
export function getPerKeyValue<T>(
  config: TypesConfig,
  key: string,
  perKeyRecord: Record<string, T> | undefined,
  defaultValue: T | undefined,
  fallbackValue: T
): T {
  // キー別設定が存在する場合
  if (perKeyRecord && perKeyRecord[key] !== undefined) {
    return perKeyRecord[key];
  }

  // デフォルト値が設定されている場合
  if (defaultValue !== undefined) {
    return defaultValue;
  }

  // フォールバック値を使用
  return fallbackValue;
}

// ===== Phase 3: 命名規則統一の実装 =====

/**
 * snake_caseからcamelCaseへの変換マッピング
 */
const SNAKE_TO_CAMEL_MAPPING: Record<string, string> = {
  motion_count: "motionCount",
  motion_timeout: "motionTimeout",
  hint_position: "hintPosition",
  visual_hint_position: "visualHintPosition",
  trigger_on_hjkl: "triggerOnHjkl",
  counted_motions: "countedMotions",
  use_numbers: "useNumbers",
  highlight_selected: "highlightSelected",
  debug_coordinates: "debugCoordinates",
  single_char_keys: "singleCharKeys",
  multi_char_keys: "multiCharKeys",
  max_single_char_hints: "maxSingleCharHints",
  use_hint_groups: "useHintGroups",
  use_japanese: "useJapanese",
  word_detection_strategy: "wordDetectionStrategy",
  enable_tinysegmenter: "enableTinySegmenter",
  segmenter_threshold: "segmenterThreshold",
  japanese_min_word_length: "japaneseMinWordLength",
  japanese_merge_particles: "japaneseMergeParticles",
  japanese_merge_threshold: "japaneseMergeThreshold",
  highlight_hint_marker: "highlightHintMarker",
  highlight_hint_marker_current: "highlightHintMarkerCurrent",
  suppress_on_key_repeat: "suppressOnKeyRepeat",
  key_repeat_threshold: "keyRepeatThreshold",
  per_key_min_length: "perKeyMinLength",
  default_min_word_length: "defaultMinWordLength",
  per_key_motion_count: "perKeyMotionCount",
  default_motion_count: "defaultMotionCount",
  current_key_context: "currentKeyContext",
  min_word_length: "minWordLength",
  key_repeat_reset_delay: "keyRepeatResetDelay",
  debug_mode: "debugMode",
  performance_log: "performanceLog",
};

/**
 * Deprecation warning情報
 */
export interface DeprecationWarning {
  property: string;
  replacement: string;
  message: string;
}

/**
 * 命名規則バリデーション結果
 */
export interface NamingValidation {
  followsConvention: boolean;
  hasConfigSuffix: boolean;
  hasManagerSuffix: boolean;
  hasBooleanPrefix: boolean;
}

/**
 * snake_case設定をcamelCase設定に変換
 */
export function convertSnakeToCamelConfig(config: Partial<TypesConfig>): CamelCaseConfig {
  const camelConfig: any = {};

  // 既存のプロパティをコピー
  Object.assign(camelConfig, config);

  // snake_caseをcamelCaseに変換
  for (const [snakeKey, camelKey] of Object.entries(SNAKE_TO_CAMEL_MAPPING)) {
    if ((config as any)[snakeKey] !== undefined) {
      camelConfig[camelKey] = (config as any)[snakeKey];
    }
  }

  return camelConfig as CamelCaseConfig;
}

/**
 * プロキシを使用して双方向アクセスを可能にするModernConfigを作成
 */
export function createModernConfig(input: Partial<CamelCaseConfig | TypesConfig> = {}): ModernConfig {
  const defaultConfig = getDefaultConfig();
  const baseConfig = { ...defaultConfig, ...input };
  const camelConfig = convertSnakeToCamelConfig(baseConfig);

  // inputで明示的に指定された値を優先
  Object.assign(camelConfig, input);

  // バリデーション実行
  const validation = validateConfig(camelConfig);
  if (!validation.valid) {
    throw new Error(`Invalid config: ${validation.errors.join(", ")}`);
  }

  // Proxyでsnake_caseとcamelCaseの双方向アクセスを実現
  const result = new Proxy(camelConfig as ModernConfig, {
    get(target: any, prop: string | symbol) {
      if (typeof prop === "string") {
        // snake_caseアクセス時はcamelCaseに変換してアクセス
        const camelProp = SNAKE_TO_CAMEL_MAPPING[prop];
        if (camelProp && target[camelProp] !== undefined) {
          return target[camelProp];
        }

        // boolean型の命名規則プロパティ
        if (prop === "isEnabled") return target.enabled;
        if (prop === "shouldUseNumbers") return target.useNumbers;
        if (prop === "shouldHighlightSelected") return target.highlightSelected;
        if (prop === "shouldTriggerOnHjkl") return target.triggerOnHjkl;
        if (prop === "hasDebugCoordinates") return target.debugCoordinates;
      }

      return target[prop as keyof ModernConfig];
    },

    set(target: any, prop: string | symbol, value: any) {
      if (typeof prop === "string") {
        // snake_case設定時はcamelCaseも同期
        const camelProp = SNAKE_TO_CAMEL_MAPPING[prop];
        if (camelProp) {
          target[camelProp] = value;
          target[prop] = value; // snake_caseも保持
          return true;
        }

        // camelCase設定時はsnake_caseも同期
        const snakeProps = Object.entries(SNAKE_TO_CAMEL_MAPPING)
          .filter(([_, camel]) => camel === prop)
          .map(([snake, _]) => snake);

        if (snakeProps.length > 0) {
          target[prop] = value;
          snakeProps.forEach(snakeProp => {
            target[snakeProp] = value;
          });
          return true;
        }

        // boolean型の命名規則プロパティ（読み取り専用）
        if ([
          "isEnabled", "shouldUseNumbers", "shouldHighlightSelected",
          "shouldTriggerOnHjkl", "hasDebugCoordinates"
        ].includes(prop)) {
          // これらは元のプロパティと同期する読み取り専用
          return true;
        }
      }

      target[prop as keyof ModernConfig] = value;
      return true;
    }
  });

  // 初期値をsnake_case形式でも設定
  for (const [snakeKey, camelKey] of Object.entries(SNAKE_TO_CAMEL_MAPPING)) {
    if ((result as any)[camelKey] !== undefined) {
      (result as any)[snakeKey] = (result as any)[camelKey];
    }
  }

  return result;
}

/**
 * 命名規則のバリデーション
 */
export function validateNamingConvention(name: string): NamingValidation {
  const hasConfigSuffix = name.endsWith("Config");
  const hasManagerSuffix = name.endsWith("Manager");
  const hasBooleanPrefix = /^(is|has|should)[A-Z]/.test(name);

  const followsConvention = hasConfigSuffix || hasManagerSuffix || hasBooleanPrefix;

  return {
    followsConvention,
    hasConfigSuffix,
    hasManagerSuffix,
    hasBooleanPrefix,
  };
}

/**
 * Deprecation warningsを取得
 */
export function getDeprecationWarnings(config: Partial<TypesConfig> | Partial<CamelCaseConfig>): DeprecationWarning[] {
  const warnings: DeprecationWarning[] = [];

  for (const [snakeKey, camelKey] of Object.entries(SNAKE_TO_CAMEL_MAPPING)) {
    if ((config as any)[snakeKey] !== undefined) {
      warnings.push({
        property: snakeKey,
        replacement: camelKey,
        message: `Property '${snakeKey}' is deprecated. Use '${camelKey}' instead.`,
      });
    }
  }

  return warnings;
}