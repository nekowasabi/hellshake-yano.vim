/**
 * denops/hellshake-yano/common/types/config.ts
 *
 * 設定型の一元管理
 *
 * Config型とDEFAULT_CONFIGを定義します。
 * 既存のconfig.tsから抽出し、phase-b3のSystemConfigを統合。
 */

/**
 * ハイライトカラー型
 */
export interface HighlightColor {
  bg?: string;
  fg?: string;
  ctermbg?: string;
  ctermfg?: string;
}

/**
 * ヒント位置タイプ
 */
export type HintPositionType = "start" | "end" | "overlay" | "both";

/**
 * 単語検出戦略
 */
export type WordDetectionStrategy = "regex" | "tinysegmenter" | "hybrid";

/**
 * Config型: プラグインの設定
 *
 * @property enabled - プラグインの有効/無効
 * @property markers - ヒントマーカー文字列の配列
 * @property motionCount - モーション検出の閾値
 * @property motionTimeout - モーション検出のタイムアウト（ミリ秒）
 * @property hintPosition - ヒントの表示位置
 * @property triggerOnHjkl - hjklキーでトリガーするか
 * @property countedMotions - カウント付きモーションのリスト
 * @property maxHints - 最大ヒント数
 * @property debounceDelay - デバウンス遅延（ミリ秒）
 * @property useNumbers - 数字をヒントに使用するか
 * @property directionalHintFilter - `j`/`k`で方向限定ヒントを適用するか
 * @property highlightSelected - 選択されたヒントをハイライトするか
 * @property debugCoordinates - 座標デバッグモード
 * @property singleCharKeys - 1文字ヒントに使用するキー
 * @property multiCharKeys - 複数文字ヒントに使用するキー
 * @property maxSingleCharHints - 1文字ヒントの最大数
 * @property useHintGroups - ヒントグループを使用するか
 * @property continuousHintMode - 連続ヒントモード
 * @property recenterCommand - 再センタリングコマンド
 * @property maxContinuousJumps - 連続ジャンプの最大回数
 * @property highlightHintMarker - ヒントマーカーのハイライト
 * @property highlightHintMarkerCurrent - 現在のヒントマーカーのハイライト
 * @property suppressOnKeyRepeat - キーリピート時に抑制するか
 * @property keyRepeatThreshold - キーリピート判定閾値（ミリ秒）
 * @property useJapanese - 日本語サポートを使用するか
 * @property wordDetectionStrategy - 単語検出戦略
 * @property enableTinySegmenter - TinySegmenterを有効化するか
 * @property segmenterThreshold - セグメンタ閾値
 * @property japaneseMinWordLength - 日本語最小単語長
 * @property japaneseMergeParticles - 助詞をマージするか
 * @property japaneseMergeThreshold - マージ閾値
 * @property perKeyMinLength - キー別最小単語長
 * @property defaultMinWordLength - デフォルト最小単語長
 * @property perKeyMotionCount - キー別モーションカウント
 * @property defaultMotionCount - デフォルトモーションカウント
 * @property currentKeyContext - 現在のキーコンテキスト
 * @property motionCounterEnabled - モーションカウンタ有効化
 * @property motionCounterThreshold - モーションカウンタ閾値
 * @property motionCounterTimeout - モーションカウンタタイムアウト
 * @property showHintOnMotionThreshold - モーション閾値でヒント表示
 * @property debugMode - デバッグモード
 * @property performanceLog - パフォーマンスログ
 * @property debug - デバッグフラグ（オプション）
 * @property useNumericMultiCharHints - 数字付き複数文字ヒント
 * @property bothMinWordLength - both位置の最小単語長
 */
export interface Config {
  enabled: boolean;
  markers: string[];
  motionCount: number;
  motionTimeout: number;
  hintPosition: HintPositionType;
  triggerOnHjkl: boolean;
  countedMotions: string[];
  maxHints: number;
  debounceDelay: number;
  useNumbers: boolean;
  directionalHintFilter: boolean;
  highlightSelected: boolean;
  debugCoordinates: boolean;
  singleCharKeys: string[];
  multiCharKeys: string[];
  maxSingleCharHints?: number;
  useHintGroups: boolean;
  continuousHintMode: boolean;
  recenterCommand: string;
  maxContinuousJumps: number;
  highlightHintMarker: string | HighlightColor;
  highlightHintMarkerCurrent: string | HighlightColor;
  suppressOnKeyRepeat: boolean;
  keyRepeatThreshold: number;
  useJapanese: boolean;
  wordDetectionStrategy: WordDetectionStrategy;
  enableTinySegmenter: boolean;
  segmenterThreshold: number;
  japaneseMinWordLength: number;
  japaneseMergeParticles: boolean;
  japaneseMergeThreshold: number;
  perKeyMinLength?: Record<string, number>;
  defaultMinWordLength: number;
  perKeyMotionCount?: Record<string, number>;
  defaultMotionCount: number;
  currentKeyContext?: string;
  motionCounterEnabled: boolean;
  motionCounterThreshold: number;
  motionCounterTimeout: number;
  showHintOnMotionThreshold: boolean;
  debugMode: boolean;
  performanceLog: boolean;
  debug?: boolean;
  useNumericMultiCharHints?: boolean;
  bothMinWordLength?: number;
  // Multi-window support (Phase MW)
  multiWindowMode: boolean;
  multiWindowExcludeTypes: string[];
  multiWindowMaxWindows: number;
}

/**
 * DEFAULT_CONFIG: デフォルト設定値
 *
 * プラグインのデフォルト設定を定義します。
 */
export const DEFAULT_CONFIG: Config = {
  enabled: true,
  markers: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  motionCount: 3,
  motionTimeout: 2000,
  hintPosition: "start",
  triggerOnHjkl: true,
  countedMotions: [],
  maxHints: 336,
  debounceDelay: 50,
  useNumbers: false,
  directionalHintFilter: false,
  highlightSelected: false,
  debugCoordinates: false,
  singleCharKeys: [
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
  multiCharKeys: [
    "B",
    "C",
    "E",
    "I",
    "O",
    "P",
    "Q",
    "R",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
  ],
  maxSingleCharHints: 21,
  useHintGroups: true,
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
  perKeyMinLength: {},
  defaultMinWordLength: 3,
  perKeyMotionCount: {},
  defaultMotionCount: 3,
  motionCounterEnabled: true,
  motionCounterThreshold: 3,
  motionCounterTimeout: 2000,
  showHintOnMotionThreshold: true,
  debugMode: false,
  performanceLog: false,
  debug: false,
  useNumericMultiCharHints: false,
  bothMinWordLength: 5,
  // Multi-window support (Phase MW)
  multiWindowMode: false,
  multiWindowExcludeTypes: ["help", "quickfix", "terminal", "popup", "nofile"],
  multiWindowMaxWindows: 4,
};
