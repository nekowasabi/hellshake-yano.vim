/**
 * 設定管理モジュール
 *
 * ⚠️ 重要な移行通知 ⚠️
 * ===================
 * Process2 Sub9: 旧インターフェース廃止予定
 *
 * 以下のインターフェースはv3.0.0で削除される予定です:
 * - CoreConfig      (@deprecated)
 * - HintConfig      (@deprecated)
 * - WordConfig      (@deprecated)
 * - PerformanceConfig (@deprecated)
 *
 * 🔄 移行パス:
 * 1. UnifiedConfigを使用するように既存のコードを更新
 * 2. 階層構造からフラット構造（camelCase）への変更
 * 3. 移行ヘルパー関数の活用: toUnifiedConfig(), fromUnifiedConfig()
 *
 * 📅 タイムライン:
 * - v2.5.0: 廃止予定警告開始
 * - v2.8.0: 廃止予定警告強化
 * - v3.0.0: 完全削除
 *
 * 詳細な移行ガイドは各インターフェースの@deprecatedコメントを参照
 */

// Import consolidated types from types.ts
import type { Config as BaseConfig, HighlightColor, HintPositionType } from "./types.ts";

// Re-export HighlightColor for backward compatibility
export type { HighlightColor };

// HighlightColor interface moved to types.ts for consolidation
// Use: import type { HighlightColor } from "./types.ts";

/**
 * 基本設定インターフェース
 * プラグインの基本的な動作を制御する設定項目を定義します。
 * Phase 2の階層化された設定構造の一部として使用されます。
 *
 * @deprecated このインターフェースはv3.0.0で削除される予定です。
 * 代わりにUnifiedConfigを使用してください。
 * 移行方法: CoreConfig → UnifiedConfigのフラット構造
 * @see UnifiedConfig - 統一設定インターフェース
 * @since 1.0.0
 * @remove v3.0.0
 *
 * @interface CoreConfig
 * @example
 * ```typescript
 * // 廃止予定 - 使用しないでください
 * const coreConfig: CoreConfig = {
 *   enabled: true,
 *   markers: ['A', 'S', 'D', 'F'],
 *   motionCount: 3
 * };
 *
 * // 推奨: UnifiedConfigを使用
 * const unifiedConfig: UnifiedConfig = {
 *   enabled: true,
 *   markers: ['A', 'S', 'D', 'F'],
 *   motionCount: 3,
 *   // その他のプロパティ...
 * };
 * ```
 */
// CoreConfig削除: process4 sub2-2で削除（未使用のため）

/**
 * ヒント関連設定インターフェース
 * ヒントの表示位置、文字、ハイライトなどの設定を定義します。
 * ユーザビリティとパフォーマンスの最適化に関する設定が含まれます。
 *
 * @deprecated このインターフェースはv3.0.0で削除される予定です。
 * 代わりにUnifiedConfigを使用してください。
 * 移行方法: HintConfig → UnifiedConfigのフラット構造（camelCase）
 * @see UnifiedConfig - 統一設定インターフェース
 * @since 1.0.0
 * @remove v3.0.0
 *
 * @interface HintConfig
 * @example
 * ```typescript
 * // 廃止予定 - 使用しないでください
 * const hintConfig: HintConfig = {
 *   hintPosition: 'start',
 *   visualHintPosition: 'end',
 *   maxHints: 336,
 *   highlightSelected: true,
 *   useNumbers: true,
 *   singleCharKeys: ['A', 'S', 'D'],
 *   multiCharKeys: ['B', 'C', 'E'],
 *   useHintGroups: true
 * };
 *
 * // 推奨: UnifiedConfigを使用
 * const unifiedConfig: UnifiedConfig = {
 *   hintPosition: 'start',
 *   visualHintPosition: 'end',
 *   maxHints: 336,
 *   highlightSelected: true,
 *   useNumbers: true,
 *   singleCharKeys: ['A', 'S', 'D'],
 *   multiCharKeys: ['B', 'C', 'E'],
 *   useHintGroups: true,
 *   // その他の統合されたプロパティ...
 * };
 * ```
 */
export interface HintConfig {
  /** 通常モードでのヒント表示位置 */
  hintPosition: "start" | "end" | "same";
  /** Visualモードでのヒント表示位置 */
  visualHintPosition: "start" | "end" | "same" | "both";
  /** パフォーマンス最適化のための最大ヒント表示数 */
  maxHints: number;
  /** 選択中のヒントをハイライト表示するか */
  highlightSelected: boolean;
  /** 数字(0-9)をヒント文字として使用するか */
  useNumbers: boolean;
  /** 1文字ヒント専用のキー配列 */
  singleCharKeys: string[];
  /** 2文字以上のヒント専用のキー配列 */
  multiCharKeys: string[];
  /** 1文字ヒントの最大表示数（オプション） */
  maxSingleCharHints?: number;
  /** ヒントグループ機能を使用するか */
  useHintGroups: boolean;
  /** ヒントマーカーのハイライト色設定（オプション） */
  highlightHintMarker?: string | HighlightColor;
  /** 選択中ヒントマーカーのハイライト色設定（オプション） */
  highlightHintMarkerCurrent?: string | HighlightColor;
}

/**
 * 単語検出関連設定インターフェース
 * 日本語を含む多言語対応の単語検出アルゴリズムの設定を定義します。
 * TinySegmenterやハイブリッド方式での単語境界検出を制御します。
 *
 * @deprecated このインターフェースはv3.0.0で削除される予定です。
 * 代わりにUnifiedConfigを使用してください。
 * 移行方法: WordConfig → UnifiedConfigの単語検出プロパティ（camelCase）
 * @see UnifiedConfig - 統一設定インターフェース
 * @since 1.0.0
 * @remove v3.0.0
 *
 * @interface WordConfig
 * @example
 * ```typescript
 * // 廃止予定 - 使用しないでください
 * const wordConfig: WordConfig = {
 *   useJapanese: true,
 *   detectionStrategy: 'hybrid',
 *   enableTinySegmenter: true,
 *   segmenterThreshold: 4,
 *   japaneseMinWordLength: 2,
 *   japaneseMergeParticles: true,
 *   japaneseMergeThreshold: 2,
 *   defaultMinWordLength: 3
 * };
 *
 * // 推奨: UnifiedConfigを使用
 * const unifiedConfig: UnifiedConfig = {
 *   useJapanese: true,
 *   wordDetectionStrategy: 'hybrid',  // detectionStrategy → wordDetectionStrategy
 *   enableTinySegmenter: true,
 *   segmenterThreshold: 4,
 *   japaneseMinWordLength: 2,
 *   japaneseMergeParticles: true,
 *   japaneseMergeThreshold: 2,
 *   defaultMinWordLength: 3,
 *   // その他の統合されたプロパティ...
 * };
 * ```
 */
export interface WordConfig {
  /** 日本語を含む単語検出を行うか（オプション、既存設定と互換性のため） */
  useJapanese?: boolean;
  /** 単語検出アルゴリズム（regex: 正規表現、tinysegmenter: 形態素解析、hybrid: ハイブリッド） */
  detectionStrategy: "regex" | "tinysegmenter" | "hybrid";
  /** TinySegmenter（日本語形態素解析）を有効にするか */
  enableTinySegmenter: boolean;
  /** TinySegmenterを使用する最小文字数の閾値 */
  segmenterThreshold: number;
  /** 日本語単語として扱う最小文字数 */
  japaneseMinWordLength: number;
  /** 助詞や接続詞を前の単語と結合するか */
  japaneseMergeParticles: boolean;
  /** 単語結合時の最大文字数の閾値 */
  japaneseMergeThreshold: number;
  /** デフォルトの最小単語長 */
  defaultMinWordLength: number;
  /** キー別の最小文字数設定（オプション） */
  perKeyMinLength?: Record<string, number>;
  /** 内部使用：現在のキーコンテキスト（オプション） */
  currentKeyContext?: string;
}

/**
 * パフォーマンス関連設定インターフェース
 * プラグインのパフォーマンス最適化とレスポンシブネスに関する設定を定義します。
 * デバウンス処理、キーリピート処理、モーション制御などが含まれます。
 *
 * @deprecated このインターフェースはv3.0.0で削除される予定です。
 * 代わりにUnifiedConfigを使用してください。
 * 移行方法: PerformanceConfig → UnifiedConfigのパフォーマンスプロパティ（camelCase）
 * @see UnifiedConfig - 統一設定インターフェース
 * @since 1.0.0
 * @remove v3.0.0
 *
 * @interface PerformanceConfig
 * @example
 * ```typescript
 * // 廃止予定 - 使用しないでください
 * const performanceConfig: PerformanceConfig = {
 *   debounceDelay: 50,
 *   motionTimeout: 2000,
 *   suppressOnKeyRepeat: true,
 *   keyRepeatThreshold: 50,
 *   keyRepeatResetDelay: 300,
 *   triggerOnHjkl: true,
 *   countedMotions: ['j', 'k']
 * };
 *
 * // 推奨: UnifiedConfigを使用
 * const unifiedConfig: UnifiedConfig = {
 *   debounceDelay: 50,
 *   motionTimeout: 2000,
 *   suppressOnKeyRepeat: true,
 *   keyRepeatThreshold: 50,
 *   triggerOnHjkl: true,
 *   countedMotions: ['j', 'k'],
 *   // その他の統合されたプロパティ...
 * };
 * ```
 */
export interface PerformanceConfig {
  /** ヒント表示のデバウンス遅延時間（ミリ秒） */
  debounceDelay: number;
  /** キャッシュサイズの制限（オプション、将来の拡張用） */
  cacheSize?: number;
  /** バッチ処理の閾値（オプション、将来の拡張用） */
  batchThreshold?: number;
  /** モーションのタイムアウト時間（ミリ秒） */
  motionTimeout: number;
  /** キーリピート時のヒント表示を抑制するか */
  suppressOnKeyRepeat: boolean;
  /** キーリピートと判定する時間の閾値（ミリ秒） */
  keyRepeatThreshold: number;
  /** キーリピート終了と判定する遅延時間（ミリ秒） */
  keyRepeatResetDelay: number;
  /** キー別のモーション回数設定（オプション） */
  perKeyMotionCount?: Record<string, number>;
  /** デフォルトのモーション回数（オプション） */
  defaultMotionCount?: number;
  /** hjklキーでのトリガーを有効にするか */
  triggerOnHjkl: boolean;
  /** カウント対象のモーション文字列配列 */
  countedMotions: string[];
}

/**
 * デバッグ設定インターフェース
 * 開発者向けのデバッグ情報とログ出力の制御設定を定義します。
 * 本番環境では通常すべて無効にします。
 *
 * @interface DebugConfig
 * @example
 * ```typescript
 * const debugConfig: DebugConfig = {
 *   debugMode: false,
 *   performanceLog: false,
 *   coordinateDebug: false
 * };
 * ```
 */
export interface DebugConfig {
  /** デバッグモードの有効/無効 */
  debugMode: boolean;
  /** パフォーマンスログの出力有効/無効 */
  performanceLog: boolean;
  /** 座標系デバッグログの出力有効/無効 */
  coordinateDebug: boolean;
}


/**
 * camelCase統一のための新しい設定インターフェース
 * snake_caseからcamelCaseへの移行を支援し、モダンなJavaScript/TypeScriptの慣習に合わせます。
 *
 * @interface CamelCaseConfig
 * @example
 * ```typescript
 * const config: CamelCaseConfig = {
 *   enabled: true,
 *   motionCount: 3,
 *   motionTimeout: 2000,
 *   hintPosition: 'start',
 *   useNumbers: true,
 *   triggerOnHjkl: true
 * };
 * ```
 */
export interface CamelCaseConfig {
  // Core settings
  enabled: boolean;
  markers: string[];
  motionCount: number;
  motionTimeout: number;
  hintPosition: "start" | "end" | "same";
  visualHintPosition?: "start" | "end" | "same" | "both";
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

/**
 * モダン設定インターフェース
 * Phase 3で導入された後方互換性を保持しながら、現代的な命名規則を採用した設定インターフェース。
 * snake_caseとcamelCaseの両方を同時サポートし、漸進的な移行を可能にします。
 * Proxyを使用した双方向アクセスでシームレスな互換性を提供します。
 *
 * @interface ModernConfig
 * @extends CamelCaseConfig
 * @example
 * ```typescript
 * const config = createModernConfig({
 *   motionCount: 3,    // camelCase
 *   motion_timeout: 2000  // snake_case (互換性のため)
 * });
 *
 * // 両方のアクセス方法が有効
 * console.log(config.motionCount);    // 3
 * console.log(config.motion_count);   // 3 (同じ値)
 * ```
 */
export interface ModernConfig extends CamelCaseConfig {
  // snake_case properties for backward compatibility
  motion_count?: number;
  motion_timeout?: number;
  hint_position?: HintPositionType;
  visual_hint_position?: "start" | "end" | "same";
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

/**
 * 統一設定インターフェース (UnifiedConfig)
 * Process2 sub1で導入された完全にフラット化されたcamelCase設定インターフェース。
 * 階層構造を排除し、32個の設定項目をすべて一つの階層で定義します。
 * TDD Red-Green-Refactor方式で実装された型安全な設定システムです。
 *
 * @interface UnifiedConfig
 * @example
 * ```typescript
 * const config: UnifiedConfig = {
 *   enabled: true,
 *   markers: ['A', 'S', 'D', 'F'],
 *   motionCount: 3,
 *   motionTimeout: 2000,
 *   hintPosition: 'start',
 *   useNumbers: true,
 *   highlightSelected: true
 * };
 * ```
 */
// UnifiedConfigインターフェースに useImprovedDetection プロパティを追加
// WordConfig削除後の後方互換性のため

export interface UnifiedConfig {
  // Core settings (6 properties)
  /** プラグインの有効/無効状態 */
  enabled: boolean;
  /** ヒント表示に使用するマーカー文字の配列 */
  markers: string[];
  /** 必要なモーション回数 */
  motionCount: number;
  /** モーションのタイムアウト時間（ミリ秒） */
  motionTimeout: number;
  /** 通常モードでのヒント表示位置 */
  hintPosition: "start" | "end" | "same";
  /** Visualモードでのヒント表示位置 */
  visualHintPosition?: "start" | "end" | "same" | "both";

  // Hint settings (8 properties)
  /** hjklキーでのトリガーを有効にするか */
  triggerOnHjkl: boolean;
  /** カウント対象のモーション文字列配列 */
  countedMotions: string[];
  /** パフォーマンス最適化のための最大ヒント表示数 */
  maxHints: number;
  /** ヒント表示のデバウンス遅延時間（ミリ秒） */
  debounceDelay: number;
  /** 数字(0-9)をヒント文字として使用するか */
  useNumbers: boolean;
  /** 選択中のヒントをハイライト表示するか */
  highlightSelected: boolean;
  /** 座標系デバッグログの出力有効/無効 */
  debugCoordinates: boolean;
  /** 1文字ヒント専用のキー配列 */
  singleCharKeys: string[];

  // Extended hint settings (4 properties)
  /** 2文字以上のヒント専用のキー配列 */
  multiCharKeys: string[];
  /** 1文字ヒントの最大表示数（オプション） */
  maxSingleCharHints?: number;
  /** ヒントグループ機能を使用するか */
  useHintGroups: boolean;
  /** ヒントマーカーのハイライト色設定 */
  highlightHintMarker: string | HighlightColor;

  // Word detection settings (7 properties)
  /** 選択中ヒントマーカーのハイライト色設定 */
  highlightHintMarkerCurrent: string | HighlightColor;
  /** キーリピート時のヒント表示を抑制するか */
  suppressOnKeyRepeat: boolean;
  /** キーリピートと判定する時間の閾値（ミリ秒） */
  keyRepeatThreshold: number;
  /** 日本語を含む単語検出を行うか */
  useJapanese: boolean;
  /** 単語検出アルゴリズム */
  wordDetectionStrategy: "regex" | "tinysegmenter" | "hybrid";
  /** TinySegmenter（日本語形態素解析）を有効にするか */
  enableTinySegmenter: boolean;
  /** TinySegmenterを使用する最小文字数の閾値 */
  segmenterThreshold: number;

  // Japanese word settings (7 properties)
  /** 日本語単語として扱う最小文字数 */
  japaneseMinWordLength: number;
  /** 助詞や接続詞を前の単語と結合するか */
  japaneseMergeParticles: boolean;
  /** 単語結合時の最大文字数の閾値 */
  japaneseMergeThreshold: number;
  /** キー別の最小文字数設定（オプション） */
  perKeyMinLength?: Record<string, number>;
  /** デフォルトの最小単語長 */
  defaultMinWordLength: number;
  /** キー別のモーション回数設定（オプション） */
  perKeyMotionCount?: Record<string, number>;
  /** デフォルトのモーション回数 */
  defaultMotionCount: number;
  /** 内部使用：現在のキーコンテキスト（オプション） */
  currentKeyContext?: string;

  // Debug settings (2 properties)
  /** デバッグモードの有効/無効 */
  debugMode: boolean;
  /** パフォーマンスログの出力有効/無効 */
  performanceLog: boolean;

  // Additional settings for backward compatibility
  /** 改善された単語検出を使用するか（WordConfig互換性のため） */
  useImprovedDetection?: boolean;
}

/**
 * デフォルト統一設定定数
 * UnifiedConfigの型安全な初期値を定義します。
 * 既存のgetDefaultConfig()から値を継承し、完全にフラット化された構造で提供します。
 *
 * @constant {UnifiedConfig} DEFAULT_UNIFIED_CONFIG
 * @example
 * ```typescript
 * const config = { ...DEFAULT_UNIFIED_CONFIG, motionCount: 5 };
 * console.log(config.enabled);     // true
 * console.log(config.motionCount); // 5
 * ```
 */
export const DEFAULT_UNIFIED_CONFIG: UnifiedConfig = {
  // Core settings
  enabled: true,
  markers: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  motionCount: 3,
  motionTimeout: 2000,
  hintPosition: "start",
  visualHintPosition: "end",

  // Hint settings
  triggerOnHjkl: true,
  countedMotions: [],
  maxHints: 336,
  debounceDelay: 50,
  useNumbers: false,
  highlightSelected: false,
  debugCoordinates: false,
  singleCharKeys: [
    "A", "S", "D", "F", "G", "H", "J", "K", "L", "N", "M",
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  ],

  // Extended hint settings
  multiCharKeys: ["B", "C", "E", "I", "O", "P", "Q", "R", "T", "U", "V", "W", "X", "Y", "Z"],
  maxSingleCharHints: 21, // Length of singleCharKeys
  useHintGroups: true,
  highlightHintMarker: "DiffAdd",

  // Word detection settings
  highlightHintMarkerCurrent: "DiffText",
  suppressOnKeyRepeat: true,
  keyRepeatThreshold: 50,
  useJapanese: false,
  wordDetectionStrategy: "hybrid",
  enableTinySegmenter: true,
  segmenterThreshold: 4,

  // Japanese word settings
  japaneseMinWordLength: 2,
  japaneseMergeParticles: true,
  japaneseMergeThreshold: 2,
  perKeyMinLength: {}, // Default empty record
  defaultMinWordLength: 3,
  perKeyMotionCount: {}, // Default empty record
  defaultMotionCount: 3, // Default motion count for keys not specified

  // Debug settings
  debugMode: false,
  performanceLog: false,

  // Additional settings for backward compatibility
  useImprovedDetection: true,
};

/**
 * メイン設定インターフェース
 * プラグインの核となる設定インターフェースで、既存コードとの互換性を維持しています。
 * snake_caseの命名規則を使用し、全ての機能設定を含んでいます。
 * 新規実装ではCamelCaseConfigまたはModernConfigの使用を検討してください。
 *
 * @interface Config
 * @example
 * ```typescript
 * const config: Config = {
 *   enabled: true,
 *   markers: ['A', 'S', 'D', 'F'],
 *   motion_count: 3,
 *   motion_timeout: 2000,
 *   hint_position: 'start',
 *   use_numbers: true,
 *   highlight_selected: true,
 *   debug_mode: false
 * };
 * ```
 */
export interface Config {
  markers: string[];
  motion_count: number;
  motion_timeout: number;
  hint_position: HintPositionType;
  visual_hint_position?: "start" | "end" | "same" | "both"; // Visual Modeでのヒント位置 (デフォルト: 'end')
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
 * デフォルト設定を取得する関数 (Process2 Sub4で統一)
 * プラグインの標準的な設定値を返します。既存コードとの互換性を維持しています。
 * 内部的にはgetDefaultUnifiedConfig()を使用し、デフォルト値管理を統一しています。
 * この設定はパフォーマンス、ユーザビリティ、日本語対応を考慮して最適化されています。
 *
 * @returns {Config} プラグインのデフォルト設定
 * @example
 * ```typescript
 * const config = getDefaultConfig();
 * console.log(config.motion_count);     // 3
 * console.log(config.motion_timeout);   // 2000
 * console.log(config.enabled);          // true
 * console.log(config.maxHints);         // 336
 * ```
 */
export function getDefaultConfig(): Config {
  // Process2 Sub4: UnifiedConfigベースのデフォルト値管理に統一
  const unified = getDefaultUnifiedConfig();
  return fromUnifiedConfig(unified);
}

/**
 * 統一デフォルト設定を取得する関数 (Process2 Sub4)
 * DEFAULT_UNIFIED_CONSTANTの値を返し、デフォルト値管理を統一
 * TDD Red-Green-Refactor方式で実装された型安全なデフォルト値取得
 *
 * @returns {UnifiedConfig} 完全なUnifiedConfigデフォルト値
 * @example
 * ```typescript
 * const config = getDefaultUnifiedConfig();
 * console.log(config.motionCount);     // 3
 * console.log(config.hintPosition);    // 'start'
 * console.log(config.useNumbers);      // true
 * console.log(config.enabled);         // true
 * ```
 */
export function getDefaultUnifiedConfig(): UnifiedConfig {
  return DEFAULT_UNIFIED_CONFIG;
}

/**
 * 最小設定を作成する関数 (Process2 Sub4対応)
 * UnifiedConfigベースの部分設定を受け取り、デフォルト値で補完した完全なUnifiedConfigを返す
 * TDD Red-Green-Refactor方式で実装された型安全な最小設定作成
 *
 * @param {Partial<UnifiedConfig>} [partialConfig={}] 部分的な設定値
 * @returns {UnifiedConfig} デフォルト値で補完された完全なUnifiedConfig
 * @example
 * ```typescript
 * const config = createMinimalConfig({
 *   motionCount: 5,
 *   hintPosition: 'end'
 * });
 * console.log(config.motionCount);     // 5 (指定値)
 * console.log(config.hintPosition);    // 'end' (指定値)
 * console.log(config.useNumbers);      // true (デフォルト値)
 * console.log(config.enabled);         // true (デフォルト値)
 * ```
 */
export function createMinimalConfig(partialConfig: Partial<UnifiedConfig> = {}): UnifiedConfig {
  const defaults = getDefaultUnifiedConfig();
  return { ...defaults, ...partialConfig };
}

/**
 * 設定値のバリデーション関数
 * camelCaseとsnake_caseの両方の命名規則に対応した設定値検証を行います。
 * 各設定項目の型、範囲、必須条件をチェックし、エラー情報を返します。
 *
 * @param {Partial<Config | CamelCaseConfig>} config 検証する設定オブジェクト
 * @returns {{ valid: boolean; errors: string[] }} バリデーション結果
 * @example
 * ```typescript
 * const result = validateConfig({ motion_count: 5, motionTimeout: 1000 });
 * if (result.valid) {
 *   console.log('設定は有効です');
 * } else {
 *   console.error('エラー:', result.errors);
 * }
 *
 * const invalidResult = validateConfig({ motion_count: -1 });
 * // { valid: false, errors: ['motion_count/motionCount must be a positive integer'] }
 * ```
 */
/**
 * ハイライトグループ名の検証関数
 * Vimのハイライトグループ名として有効かチェックします。
 *
 * @param {string} name 検証するハイライトグループ名
 * @returns {boolean} 有効な場合true
 */
export function isValidHighlightGroup(name: string): boolean {
  // 空文字列は無効
  if (!name || name === '') {
    return false;
  }

  // 長さチェック（100文字以内）
  if (name.length > 100) {
    return false;
  }

  // 数字で始まる場合は無効
  if (/^[0-9]/.test(name)) {
    return false;
  }

  // 特殊文字を含む場合は無効（英数字とアンダースコアのみ許可）
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    return false;
  }

  return true;
}

/**
 * UnifiedConfig用統合バリデーション関数 (Process2 Sub3)
 * TDD Red-Green-Refactor方式で実装された単一バリデーション関数
 * camelCase形式のエラーメッセージで統一されたバリデーション
 *
 * @param config 検証するUnifiedConfig（部分設定可）
 * @returns バリデーション結果（valid: boolean, errors: string[]）
 * @example
 * ```typescript
 * const result = validateUnifiedConfig({ motionCount: 3, hintPosition: 'start' });
 * if (result.valid) {
 *   console.log('設定は有効です');
 * } else {
 *   console.error('エラー:', result.errors);
 * }
 * ```
 */
export function validateUnifiedConfig(
  config: Partial<UnifiedConfig>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Core settings validation (6 properties)
  // enabled - boolean（バリデーション不要、型で保証）

  // markers - 配列の検証
  if (config.markers !== undefined) {
    if (!Array.isArray(config.markers)) {
      errors.push("markers must be an array");
    } else if (config.markers.length === 0) {
      errors.push("markers must not be empty");
    } else {
      // すべて文字列かチェック
      if (!config.markers.every(m => typeof m === "string")) {
        errors.push("markers must be an array of strings");
      } else {
        const uniqueMarkers = new Set(config.markers);
        if (uniqueMarkers.size !== config.markers.length) {
          errors.push("markers must contain unique values");
        }
      }
    }
  }

  // motionCount - 正の整数
  if (config.motionCount !== undefined) {
    if (config.motionCount === null || !Number.isInteger(config.motionCount) || config.motionCount <= 0) {
      errors.push("motionCount must be a positive integer");
    }
  }

  // motionTimeout - 100ms 以上の整数
  if (config.motionTimeout !== undefined) {
    if (!Number.isInteger(config.motionTimeout) || config.motionTimeout < 100) {
      errors.push("motionTimeout must be at least 100ms");
    }
  }

  // hintPosition - 列挙値
  if (config.hintPosition !== undefined) {
    const validPositions = ["start", "end", "overlay", "same"];
    if (config.hintPosition === null || !validPositions.includes(config.hintPosition)) {
      errors.push("hintPosition must be one of: start, end, overlay");
    }
  }

  // visualHintPosition - 列挙値（オプショナル）
  if (config.visualHintPosition !== undefined) {
    const validPositions = ["start", "end", "same", "both"];
    if (!validPositions.includes(config.visualHintPosition)) {
      errors.push(`visualHintPosition must be one of: ${validPositions.join(", ")}`);
    }
  }

  // Hint settings validation (8 properties)
  // triggerOnHjkl, useNumbers, highlightSelected - boolean（型で保証）

  // countedMotions - 配列（バリデーション不要、型で保証）

  // maxHints - 正の整数
  if (config.maxHints !== undefined) {
    if (!Number.isInteger(config.maxHints) || config.maxHints <= 0) {
      errors.push("maxHints must be a positive integer");
    }
  }

  // debounceDelay - 非負整数（0を許可）
  if (config.debounceDelay !== undefined) {
    if (!Number.isInteger(config.debounceDelay) || config.debounceDelay < 0) {
      errors.push("debounceDelay must be a non-negative number");
    }
  }

  // useNumbers - boolean
  if (config.useNumbers !== undefined && typeof config.useNumbers !== "boolean") {
    errors.push("useNumbers must be a boolean");
  }

  // debugCoordinates - boolean（型で保証）

  // singleCharKeys, multiCharKeys - 配列（型で保証）

  // Extended hint settings validation (4 properties)
  // maxSingleCharHints - オプショナル正の整数
  if (config.maxSingleCharHints !== undefined) {
    if (!Number.isInteger(config.maxSingleCharHints) || config.maxSingleCharHints <= 0) {
      errors.push("maxSingleCharHints must be a positive integer");
    }
  }

  // useHintGroups - boolean（型で保証）

  // highlightHintMarker - ハイライトグループ名の検証
  if (config.highlightHintMarker !== undefined) {
    if (typeof config.highlightHintMarker === 'string') {
      if (config.highlightHintMarker === '') {
        errors.push("highlightHintMarker must be a non-empty string");
      } else if (!isValidHighlightGroup(config.highlightHintMarker)) {
        if (config.highlightHintMarker.length > 100) {
          errors.push("highlightHintMarker must be 100 characters or less");
        } else if (/^[0-9]/.test(config.highlightHintMarker)) {
          errors.push("highlightHintMarker must start with a letter or underscore");
        } else {
          errors.push("highlightHintMarker must contain only alphanumeric characters and underscores");
        }
      }
    } else if (typeof config.highlightHintMarker !== 'object') {
      errors.push("highlightHintMarker must be a string or HighlightColor object");
    }
  }

  // highlightHintMarkerCurrent - ハイライトグループ名の検証
  if (config.highlightHintMarkerCurrent !== undefined) {
    if (typeof config.highlightHintMarkerCurrent === 'string') {
      if (config.highlightHintMarkerCurrent === '') {
        errors.push("highlightHintMarkerCurrent must be a non-empty string");
      } else if (!isValidHighlightGroup(config.highlightHintMarkerCurrent)) {
        if (config.highlightHintMarkerCurrent.length > 100) {
          errors.push("highlightHintMarkerCurrent must be 100 characters or less");
        } else if (/^[0-9]/.test(config.highlightHintMarkerCurrent)) {
          errors.push("highlightHintMarkerCurrent must start with a letter or underscore");
        } else {
          errors.push("highlightHintMarkerCurrent must contain only alphanumeric characters and underscores");
        }
      }
    } else if (typeof config.highlightHintMarkerCurrent !== 'object') {
      errors.push("highlightHintMarkerCurrent must be a string or HighlightColor object");
    }
  }

  // Word detection settings validation (7 properties)
  // suppressOnKeyRepeat - boolean（型で保証）

  // keyRepeatThreshold - 非負整数
  if (config.keyRepeatThreshold !== undefined) {
    if (!Number.isInteger(config.keyRepeatThreshold) || config.keyRepeatThreshold < 0) {
      errors.push("keyRepeatThreshold must be a non-negative integer");
    }
  }

  // useJapanese - オプショナルboolean（型で保証）

  // wordDetectionStrategy - 列挙値
  if (config.wordDetectionStrategy !== undefined) {
    const validStrategies = ["regex", "tinysegmenter", "hybrid"];
    if (!validStrategies.includes(config.wordDetectionStrategy)) {
      errors.push(`wordDetectionStrategy must be one of: ${validStrategies.join(", ")}`);
    }
  }

  // enableTinySegmenter - boolean（型で保証）

  // segmenterThreshold - 正の整数
  if (config.segmenterThreshold !== undefined) {
    if (!Number.isInteger(config.segmenterThreshold) || config.segmenterThreshold <= 0) {
      errors.push("segmenterThreshold must be a positive integer");
    }
  }

  // Japanese word settings validation (7 properties)
  // japaneseMinWordLength - 正の整数
  if (config.japaneseMinWordLength !== undefined) {
    if (!Number.isInteger(config.japaneseMinWordLength) || config.japaneseMinWordLength <= 0) {
      errors.push("japaneseMinWordLength must be a positive integer");
    }
  }

  // japaneseMergeParticles - boolean（型で保証）

  // japaneseMergeThreshold - 正の整数
  if (config.japaneseMergeThreshold !== undefined) {
    if (!Number.isInteger(config.japaneseMergeThreshold) || config.japaneseMergeThreshold <= 0) {
      errors.push("japaneseMergeThreshold must be a positive integer");
    }
  }

  // perKeyMinLength, perKeyMotionCount - Record<string, number>（バリデーション不要、型で保証）

  // defaultMinWordLength - 正の整数
  if (config.defaultMinWordLength !== undefined) {
    if (!Number.isInteger(config.defaultMinWordLength) || config.defaultMinWordLength <= 0) {
      errors.push("defaultMinWordLength must be a positive integer");
    }
  }

  // defaultMotionCount - オプショナル正の整数
  if (config.defaultMotionCount !== undefined) {
    if (!Number.isInteger(config.defaultMotionCount) || config.defaultMotionCount <= 0) {
      errors.push("defaultMotionCount must be a positive integer");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 既存validateConfig関数（互換性維持）
 * validateUnifiedConfig()にリダイレクトされる統合バリデーション
 * snake_caseとcamelCase両方の入力をサポート
 *
 * @deprecated この関数は内部的にvalidateUnifiedConfig()を使用します。新しいコードではvalidateUnifiedConfig()を直接使用してください。
 * @param config 検証する設定オブジェクト
 * @returns バリデーション結果
 */
export function validateConfig(
  config: Partial<Config | CamelCaseConfig>,
): { valid: boolean; errors: string[] } {
  // 入力されたconfigが数値型のhighlight_hint_markerなどを含む場合、
  // 直接バリデーションする必要がある
  const errors: string[] = [];
  const c = config as any;

  // motion_count の型チェック
  if (c.motion_count !== undefined && c.motion_count === null) {
    errors.push("motion_count cannot be null");
  }

  // hint_position の型チェック
  if (c.hint_position !== undefined && c.hint_position === null) {
    errors.push("hint_position cannot be null");
  }

  // highlight_hint_marker の型チェック
  if (c.highlight_hint_marker !== undefined) {
    if (c.highlight_hint_marker === null) {
      errors.push("highlight_hint_marker cannot be null");
    } else if (typeof c.highlight_hint_marker === 'number') {
      errors.push("highlight_hint_marker must be a string");
    } else if (Array.isArray(c.highlight_hint_marker)) {
      errors.push("highlight_hint_marker must be a string");
    } else if (typeof c.highlight_hint_marker === 'string') {
      if (c.highlight_hint_marker === '') {
        errors.push("highlight_hint_marker must be a non-empty string");
      } else if (!isValidHighlightGroup(c.highlight_hint_marker)) {
        if (c.highlight_hint_marker.length > 100) {
          errors.push("highlight_hint_marker must be 100 characters or less");
        } else if (/^[0-9]/.test(c.highlight_hint_marker)) {
          errors.push("highlight_hint_marker must start with a letter or underscore");
        } else {
          errors.push("highlight_hint_marker must contain only alphanumeric characters and underscores");
        }
      }
    }
  }

  // highlight_hint_marker_current の型チェック
  if (c.highlight_hint_marker_current !== undefined) {
    if (c.highlight_hint_marker_current === null) {
      errors.push("highlight_hint_marker_current cannot be null");
    } else if (typeof c.highlight_hint_marker_current === 'number') {
      errors.push("highlight_hint_marker_current must be a string");
    } else if (Array.isArray(c.highlight_hint_marker_current)) {
      errors.push("highlight_hint_marker_current must be a string");
    } else if (typeof c.highlight_hint_marker_current === 'string') {
      if (c.highlight_hint_marker_current === '') {
        errors.push("highlight_hint_marker_current must be a non-empty string");
      } else if (!isValidHighlightGroup(c.highlight_hint_marker_current)) {
        if (c.highlight_hint_marker_current.length > 100) {
          errors.push("highlight_hint_marker_current must be 100 characters or less");
        } else if (/^[0-9]/.test(c.highlight_hint_marker_current)) {
          errors.push("highlight_hint_marker_current must start with a letter or underscore");
        } else {
          errors.push("highlight_hint_marker_current must contain only alphanumeric characters and underscores");
        }
      }
    }
  }

  // 早期エラーがあれば返す
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // 旧設定をUnifiedConfigに変換してvalidateUnifiedConfig()に委譲
  const unifiedConfig = toUnifiedConfig(config as any);
  const result = validateUnifiedConfig(unifiedConfig);

  // エラーメッセージをsnake_case形式に変換
  // 注意: maxHints と debounceDelay は新しいUnified Config APIの一部で、camelCase形式を保持します
  const convertedErrors = result.errors.map(error => {
    return error
      .replace(/highlightHintMarker/g, 'highlight_hint_marker')
      .replace(/highlightHintMarkerCurrent/g, 'highlight_hint_marker_current')
      .replace(/motionCount/g, 'motion_count')
      .replace(/motionTimeout/g, 'motion_timeout')
      .replace(/hintPosition/g, 'hint_position')
      .replace(/visualHintPosition/g, 'visual_hint_position')
      .replace(/triggerOnHjkl/g, 'trigger_on_hjkl')
      .replace(/countedMotions/g, 'counted_motions')
      .replace(/useNumbers/g, 'use_numbers')
      .replace(/highlightSelected/g, 'highlight_selected')
      .replace(/debugCoordinates/g, 'debug_coordinates')
      .replace(/singleCharKeys/g, 'single_char_keys')
      .replace(/multiCharKeys/g, 'multi_char_keys')
      .replace(/maxSingleCharHints/g, 'max_single_char_hints')
      .replace(/useHintGroups/g, 'use_hint_groups')
      .replace(/suppressOnKeyRepeat/g, 'suppress_on_key_repeat')
      .replace(/keyRepeatThreshold/g, 'key_repeat_threshold')
      .replace(/useJapanese/g, 'use_japanese')
      .replace(/wordDetectionStrategy/g, 'word_detection_strategy')
      .replace(/enableTinySegmenter/g, 'enable_tinysegmenter')
      .replace(/segmenterThreshold/g, 'segmenter_threshold')
      .replace(/japaneseMinWordLength/g, 'japanese_min_word_length')
      .replace(/japaneseMergeParticles/g, 'japanese_merge_particles')
      .replace(/japaneseMergeThreshold/g, 'japanese_merge_threshold')
      .replace(/defaultMinWordLength/g, 'default_min_word_length');
  });

  // 初期エラーとconvertedErrorsを結合
  const allErrors = [...errors, ...convertedErrors];
  return { valid: result.valid && errors.length === 0, errors: allErrors };
}





/**
 * 設定マージ関数
 * 部分的な設定更新をサポートし、バリデーションと後方互換性を維持します。
 * 更新される設定値はバリデーションが実行され、無効な値の場合はエラーがスローされます。
 *
 * @param {Config} baseConfig ベースとなる設定
 * @param {Partial<Config>} updates 更新する設定値
 * @returns {Config} マージされた新しい設定
 * @throws {Error} 設定値のバリデーションに失敗した場合
 * @example
 * ```typescript
 * const base = getDefaultConfig();
 * const updates = {
 *   motion_count: 5,
 *   enabled: false,
 *   enable: true  // 後方互換性のため自動でenabledにマッピング
 * };
 *
 * const merged = mergeConfig(base, updates);
 * console.log(merged.motion_count); // 5
 * console.log(merged.enabled);      // true (enableが優先される)
 *
 * // バリデーションエラーの例
 * try {
 *   mergeConfig(base, { motion_count: -1 }); // Error: Invalid config
 * } catch (error) {
 *   console.error(error.message);
 * }
 * ```
 */
export function mergeConfig(baseConfig: Config, updates: Partial<Config>): Config {
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
 * 設定のディープコピーを作成する関数
 * 元の設定オブジェクトに影響を与えずに完全に独立したコピーを作成します。
 * JSONのシリアライズ/デシリアライズで実装されています。
 *
 * @param {Config} config コピーする設定オブジェクト
 * @returns {Config} ディープコピーされた設定
 * @example
 * ```typescript
 * const original = getDefaultConfig();
 * const copy = cloneConfig(original);
 *
 * copy.motion_count = 10;
 * copy.markers.push('Z');
 *
 * console.log(original.motion_count);  // 3 (元の値が保持される)
 * console.log(copy.motion_count);      // 10
 * console.log(original.markers.length === copy.markers.length - 1); // true
 * ```
 */
export function cloneConfig(config: Config): Config {
  return JSON.parse(JSON.stringify(config));
}

/**
 * キー別設定を取得するヘルパー関数
 * 指定されたキーに対応する設定値を、優先度に従って取得します。
 * 優先度: キー別設定 > デフォルト値 > フォールバック値
 * per_key_min_lengthやper_key_motion_countなどのキー固有設定で使用されます。
 *
 * @template T 設定値の型
 * @param {Config} config プラグインの設定オブジェクト
 * @param {string} key 取得対象のキー
 * @param {Record<string, T> | undefined} perKeyRecord キー別設定レコード
 * @param {T | undefined} defaultValue デフォルト値
 * @param {T} fallbackValue フォールバック値
 * @returns {T} 取得された設定値
 * @example
 * ```typescript
 * const config = {
 *   ...getDefaultConfig(),
 *   per_key_min_length: { 'w': 4, 'b': 2 },
 *   default_min_word_length: 3
 * };
 *
 * // キー別設定がある場合
 * const wMinLength = getPerKeyValue(config, 'w', config.per_key_min_length, config.default_min_word_length, 1);
 * console.log(wMinLength); // 4
 *
 * // キー別設定がない場合はデフォルト値
 * const eMinLength = getPerKeyValue(config, 'e', config.per_key_min_length, config.default_min_word_length, 1);
 * console.log(eMinLength); // 3
 *
 * // デフォルト値もない場合はフォールバック値
 * const fallbackConfig = { ...config, default_min_word_length: undefined };
 * const fMinLength = getPerKeyValue(fallbackConfig, 'f', fallbackConfig.per_key_min_length, fallbackConfig.default_min_word_length, 1);
 * console.log(fMinLength); // 1
 * ```
 */
export function getPerKeyValue<T>(
  config: Config,
  key: string,
  perKeyRecord: Record<string, T> | undefined,
  defaultValue: T | undefined,
  fallbackValue: T,
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

/**
 * snake_caseからcamelCaseへの変換マッピング定数
 * Phase 3の命名規則統一化で使用される変換テーブルです。
 * snake_caseのプロパティ名を対応するcamelCaseにマッピングします。
 * 双方向アクセスや移行支援に使用され、後方互換性を維持します。
 *
 * @constant {Record<string, string>}
 * @example
 * ```typescript
 * console.log(SNAKE_TO_CAMEL_MAPPING.motion_count); // 'motionCount'
 * console.log(SNAKE_TO_CAMEL_MAPPING.hint_position); // 'hintPosition'
 * console.log(SNAKE_TO_CAMEL_MAPPING.use_numbers); // 'useNumbers'
 * ```
 */
// SNAKE_TO_CAMEL_MAPPING constant removed as part of Process4 Sub2-4

/**
 * 非推奨警告情報インターフェース
 * snake_caseのプロパティが使用された時の警告情報を表現します。
 * 新しいcamelCaseのプロパティへの移行を支援します。
 *
 * @interface DeprecationWarning
 * @example
 * ```typescript
 * const warning: DeprecationWarning = {
 *   property: 'motion_count',
 *   replacement: 'motionCount',
 *   message: "Property 'motion_count' is deprecated. Use 'motionCount' instead."
 * };
 * ```
 */
export interface DeprecationWarning {
  /** 非推奨のプロパティ名 */
  property: string;
  /** 推奨される代替プロパティ名 */
  replacement: string;
  /** 警告メッセージ */
  message: string;
}

/**
 * 命名規則バリデーション結果インターフェース
 * TypeScript/JavaScriptのモダンな命名規則に従っているかを検証する結果を表現します。
 * コードの一貫性と可読性を向上させるためのバリデーションです。
 *
 * @interface NamingValidation
 * @example
 * ```typescript
 * const result: NamingValidation = {
 *   followsConvention: true,
 *   hasConfigSuffix: true,
 *   hasManagerSuffix: false,
 *   hasBooleanPrefix: false
 * };
 * ```
 */
export interface NamingValidation {
  /** 命名規則に従っているかの全体的な結果 */
  followsConvention: boolean;
  /** 'Config'接尾辞を持っているか */
  hasConfigSuffix: boolean;
  /** 'Manager'接尾辞を持っているか */
  hasManagerSuffix: boolean;
  /** ブール型の接頭辞(is/has/should)を持っているか */
  hasBooleanPrefix: boolean;
}

/**
 * snake_case設定をcamelCase設定に変換する関数
 * 既存のsnake_caseの設定プロパティをcamelCaseに変換します。
 * 元のプロパティも保持されるため、互換性が維持されます。
 *
 * @param {Partial<Config>} config 変換元のsnake_case設定
 * @returns {CamelCaseConfig} 変換されたcamelCase設定
 * @example
 * ```typescript
 * const snakeConfig = {
 *   motion_count: 5,
 *   hint_position: 'end',
 *   use_numbers: true,
 *   debug_mode: false
 * };
 *
 * const camelConfig = convertSnakeToCamelConfig(snakeConfig);
 * console.log(camelConfig.motionCount);    // 5
 * console.log(camelConfig.hintPosition);   // 'end'
 * console.log(camelConfig.useNumbers);     // true
 * console.log(camelConfig.debugMode);      // false
 * // 元のsnake_caseプロパティも保持される
 * console.log(camelConfig.motion_count);   // 5
 * ```
 */
// convertSnakeToCamelConfig function removed as part of Process4 Sub2-4

/**
 * モダン設定を作成する関数
 * Proxyを使用してsnake_caseとcamelCaseの双方向アクセスを可能にする設定オブジェクトを作成します。
 * 既存コードとの互換性を保ちながら、モダンなコーディングスタイルをサポートします。
 * 設定値のバリデーションも自動的に実行されます。
 *
 * @param {Partial<CamelCaseConfig | Config>} [input={}] 初期設定値
 * @returns {ModernConfig} 双方向アクセス可能なモダン設定
 * @throws {Error} 設定値のバリデーションに失敗した場合
 * @example
 * ```typescript
 * const config = createModernConfig({
 *   motionCount: 5,        // camelCase
 *   hint_position: 'end',  // snake_case
 *   enabled: true
 * });
 *
 * // 両方のアクセス方法が有効
 * console.log(config.motionCount);    // 5
 * console.log(config.motion_count);   // 5 (同じ値)
 *
 * console.log(config.hintPosition);   // 'end'
 * console.log(config.hint_position);  // 'end' (同じ値)
 *
 * // ブール型の命名規則アクセスも可能
 * console.log(config.isEnabled);      // true
 * console.log(config.shouldUseNumbers); // 設定に応じた値
 *
 * // 設定値の更新も双方向で同期
 * config.motionCount = 10;
 * console.log(config.motion_count);   // 10
 * ```
 */
// createModernConfig function simplified as part of Process4 Sub2-4
// Complex Proxy-based snake_case/camelCase mapping removed
export function createModernConfig(input: Partial<CamelCaseConfig | Config> = {}): ModernConfig {
  const defaultConfig = getDefaultConfig();
  const baseConfig = { ...defaultConfig, ...input };

  // バリデーション実行
  const validation = validateConfig(baseConfig);
  if (!validation.valid) {
    throw new Error(`Invalid config: ${validation.errors.join(", ")}`);
  }

  return baseConfig as ModernConfig;
}

/**
 * 命名規則のバリデーション関数
 * 指定された名前がTypeScript/JavaScriptのモダンな命名規則に従っているかを検証します。
 * Config/Manager接尾辞やブール型の接頭辞（is/has/should）をチェックします。
 *
 * @param {string} name 検証する名前
 * @returns {NamingValidation} バリデーション結果
 * @example
 * ```typescript
 * const result1 = validateNamingConvention('UserConfig');
 * console.log(result1.followsConvention); // true
 * console.log(result1.hasConfigSuffix);   // true
 *
 * const result2 = validateNamingConvention('isEnabled');
 * console.log(result2.followsConvention); // true
 * console.log(result2.hasBooleanPrefix);  // true
 *
 * const result3 = validateNamingConvention('user_config'); // snake_case
 * console.log(result3.followsConvention); // false
 * ```
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
 * 非推奨警告を取得する関数
 * 設定オブジェクトから非推奨のsnake_caseプロパティを検出し、適切な警告メッセージを生成します。
 * 新しいcamelCaseプロパティへの移行を支援するための情報を提供します。
 *
 * @param {Partial<Config> | Partial<CamelCaseConfig>} config チェックする設定オブジェクト
 * @returns {DeprecationWarning[]} 非推奨警告の配列
 * @example
 * ```typescript
 * const config = {
 *   motion_count: 3,      // 非推奨
 *   hint_position: 'end', // 非推奨
 *   enabled: true,        // OK (共通)
 *   motionTimeout: 2000   // OK (camelCase)
 * };
 *
 * const warnings = getDeprecationWarnings(config);
 * console.log(warnings);
 * // [
 * //   {
 * //     property: 'motion_count',
 * //     replacement: 'motionCount',
 * //     message: "Property 'motion_count' is deprecated. Use 'motionCount' instead."
 * //   },
 * //   {
 * //     property: 'hint_position',
 * //     replacement: 'hintPosition',
 * //     message: "Property 'hint_position' is deprecated. Use 'hintPosition' instead."
 * //   }
 * // ]
 * ```
 */
// getDeprecationWarnings function simplified as part of Process4 Sub2-4
// SNAKE_TO_CAMEL_MAPPING dependency removed
export function getDeprecationWarnings(
  config: Partial<Config> | Partial<CamelCaseConfig>,
): DeprecationWarning[] {
  // Simplified implementation - no longer checks for deprecated properties
  // as hierarchical config system has been removed
  return [];
}

/**
 * 設定変換レイヤー (Process2 Sub2)
 * 旧設定(Config)からUnifiedConfigへの変換
 * TDD Red-Green-Refactor方式で実装
 * 全32個のプロパティをsnake_case → camelCaseに変換
 */

/**
 * プロパティ値を取得するヘルパー関数
 * snake_case、camelCase両方からの値取得を支援する
 *
 * @param config 設定オブジェクト
 * @param snakeProp snake_caseのプロパティ名
 * @param camelProp camelCaseのプロパティ名
 * @param defaultValue デフォルト値
 * @returns 取得された値またはデフォルト値
 */
// getConfigValue function removed as part of Process4 Sub2-4

/**
 * 旧設定をUnifiedConfigに変換する関数
 * snake_case/camelCase両方の入力に対応し、完全にフラット化されたUnifiedConfigを出力
 * 32個のプロパティをすべて変換し、型安全性を保証する
 *
 * @param config 変換元の旧設定（Configまたは部分設定）
 * @returns 変換されたUnifiedConfig
 * @example
 * ```typescript
 * const oldConfig = { motion_count: 5, hint_position: 'end' };
 * const unified = toUnifiedConfig(oldConfig);
 * console.log(unified.motionCount);   // 5
 * console.log(unified.hintPosition);  // 'end'
 * ```
 */
export function toUnifiedConfig(config: Partial<Config> | Partial<CamelCaseConfig> = {}): UnifiedConfig {
  const defaults = DEFAULT_UNIFIED_CONFIG;
  const c = config as any;

  return {
    enabled: c.enabled ?? defaults.enabled,
    markers: c.markers ?? defaults.markers,
    motionCount: c.motionCount ?? c.motion_count ?? defaults.motionCount,
    motionTimeout: c.motionTimeout ?? c.motion_timeout ?? defaults.motionTimeout,
    hintPosition: c.hintPosition ?? c.hint_position ?? defaults.hintPosition,
    visualHintPosition: c.visualHintPosition ?? c.visual_hint_position ?? defaults.visualHintPosition,
    triggerOnHjkl: c.triggerOnHjkl ?? c.trigger_on_hjkl ?? defaults.triggerOnHjkl,
    countedMotions: c.countedMotions ?? c.counted_motions ?? defaults.countedMotions,
    maxHints: c.maxHints ?? defaults.maxHints,
    debounceDelay: c.debounceDelay ?? defaults.debounceDelay,
    useNumbers: c.useNumbers ?? c.use_numbers ?? defaults.useNumbers,
    highlightSelected: c.highlightSelected ?? c.highlight_selected ?? defaults.highlightSelected,
    debugCoordinates: c.debugCoordinates ?? c.debug_coordinates ?? defaults.debugCoordinates,
    singleCharKeys: c.singleCharKeys ?? c.single_char_keys ?? defaults.singleCharKeys,
    multiCharKeys: c.multiCharKeys ?? c.multi_char_keys ?? defaults.multiCharKeys,
    maxSingleCharHints: c.maxSingleCharHints ?? c.max_single_char_hints ?? defaults.maxSingleCharHints,
    useHintGroups: c.useHintGroups ?? c.use_hint_groups ?? defaults.useHintGroups,
    highlightHintMarker: c.highlightHintMarker ?? c.highlight_hint_marker ?? defaults.highlightHintMarker,
    highlightHintMarkerCurrent: c.highlightHintMarkerCurrent ?? c.highlight_hint_marker_current ?? defaults.highlightHintMarkerCurrent,
    suppressOnKeyRepeat: c.suppressOnKeyRepeat ?? c.suppress_on_key_repeat ?? defaults.suppressOnKeyRepeat,
    keyRepeatThreshold: c.keyRepeatThreshold ?? c.key_repeat_threshold ?? defaults.keyRepeatThreshold,
    useJapanese: c.useJapanese ?? c.use_japanese ?? defaults.useJapanese,
    wordDetectionStrategy: c.wordDetectionStrategy ?? c.word_detection_strategy ?? defaults.wordDetectionStrategy,
    enableTinySegmenter: c.enableTinySegmenter ?? c.enable_tinysegmenter ?? defaults.enableTinySegmenter,
    segmenterThreshold: c.segmenterThreshold ?? c.segmenter_threshold ?? defaults.segmenterThreshold,
    japaneseMinWordLength: c.japaneseMinWordLength ?? c.japanese_min_word_length ?? defaults.japaneseMinWordLength,
    japaneseMergeParticles: c.japaneseMergeParticles ?? c.japanese_merge_particles ?? defaults.japaneseMergeParticles,
    japaneseMergeThreshold: c.japaneseMergeThreshold ?? c.japanese_merge_threshold ?? defaults.japaneseMergeThreshold,
    perKeyMinLength: c.perKeyMinLength ?? c.per_key_min_length ?? defaults.perKeyMinLength,
    defaultMinWordLength: c.defaultMinWordLength ?? c.default_min_word_length ?? c.min_word_length ?? defaults.defaultMinWordLength,
    perKeyMotionCount: c.perKeyMotionCount ?? c.per_key_motion_count ?? defaults.perKeyMotionCount,
    defaultMotionCount: c.defaultMotionCount ?? c.default_motion_count ?? c.motion_count ?? defaults.defaultMotionCount,
    currentKeyContext: c.currentKeyContext ?? c.current_key_context ?? defaults.currentKeyContext,
    debugMode: c.debugMode ?? c.debug_mode ?? defaults.debugMode,
    performanceLog: c.performanceLog ?? c.performance_log ?? defaults.performanceLog,
    useImprovedDetection: c.useImprovedDetection ?? c.use_improved_detection ?? defaults.useImprovedDetection,
  };
}

/**
 * UnifiedConfigを旧設定(Config)に変換する関数
 * camelCase → snake_caseの逆変換を行い、既存コードとの互換性を維持
 * 32個のプロパティをすべて変換し、後方互換性のための追加プロパティも含む
 *
 * @param config 変換元のUnifiedConfig
 * @returns 変換された旧設定(Config)
 * @example
 * ```typescript
 * const unified = { motionCount: 5, hintPosition: 'end' };
 * const oldConfig = fromUnifiedConfig(unified);
 * console.log(oldConfig.motion_count);   // 5
 * console.log(oldConfig.hint_position);  // 'end'
 * ```
 */
export function fromUnifiedConfig(config: Partial<UnifiedConfig> = {}): Config {
  const d = DEFAULT_UNIFIED_CONFIG;
  return {
    enabled: config.enabled ?? d.enabled,
    markers: config.markers ?? d.markers,
    motion_count: config.motionCount ?? d.motionCount,
    motion_timeout: config.motionTimeout ?? d.motionTimeout,
    hint_position: config.hintPosition ?? d.hintPosition,
    visual_hint_position: config.visualHintPosition ?? d.visualHintPosition,
    trigger_on_hjkl: config.triggerOnHjkl ?? d.triggerOnHjkl,
    counted_motions: config.countedMotions ?? d.countedMotions,
    maxHints: config.maxHints ?? d.maxHints,
    debounceDelay: config.debounceDelay ?? d.debounceDelay,
    use_numbers: config.useNumbers ?? d.useNumbers,
    highlight_selected: config.highlightSelected ?? d.highlightSelected,
    debug_coordinates: config.debugCoordinates ?? d.debugCoordinates,
    single_char_keys: config.singleCharKeys ?? d.singleCharKeys,
    multi_char_keys: config.multiCharKeys ?? d.multiCharKeys,
    max_single_char_hints: config.maxSingleCharHints ?? d.maxSingleCharHints,
    use_hint_groups: config.useHintGroups ?? d.useHintGroups,
    highlight_hint_marker: config.highlightHintMarker ?? d.highlightHintMarker,
    highlight_hint_marker_current: config.highlightHintMarkerCurrent ?? d.highlightHintMarkerCurrent,
    suppress_on_key_repeat: config.suppressOnKeyRepeat ?? d.suppressOnKeyRepeat,
    key_repeat_threshold: config.keyRepeatThreshold ?? d.keyRepeatThreshold,
    use_japanese: config.useJapanese ?? d.useJapanese,
    word_detection_strategy: config.wordDetectionStrategy ?? d.wordDetectionStrategy,
    enable_tinysegmenter: config.enableTinySegmenter ?? d.enableTinySegmenter,
    segmenter_threshold: config.segmenterThreshold ?? d.segmenterThreshold,
    japanese_min_word_length: config.japaneseMinWordLength ?? d.japaneseMinWordLength,
    japanese_merge_particles: config.japaneseMergeParticles ?? d.japaneseMergeParticles,
    japanese_merge_threshold: config.japaneseMergeThreshold ?? d.japaneseMergeThreshold,
    per_key_min_length: config.perKeyMinLength ?? d.perKeyMinLength,
    default_min_word_length: config.defaultMinWordLength ?? d.defaultMinWordLength,
    per_key_motion_count: config.perKeyMotionCount ?? d.perKeyMotionCount,
    default_motion_count: config.defaultMotionCount ?? d.defaultMotionCount,
    current_key_context: config.currentKeyContext ?? d.currentKeyContext,
    debug_mode: config.debugMode ?? d.debugMode,
    performance_log: config.performanceLog ?? d.performanceLog,
  };
}
