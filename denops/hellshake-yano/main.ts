import type { Denops } from "@denops/std";
import {
  detectWords,
  detectWordsWithConfig,
  detectWordsWithManager,
  type EnhancedWordConfig,
  extractWordsFromLineWithConfig,
  extractWordsUnified,
  type UnifiedWordExtractionConfig,
} from "./word.ts";
import {
  getWordDetectionManager,
  resetWordDetectionManager,
  type WordDetectionManagerConfig,
} from "./word/manager.ts";
import {
  assignHintsToWords,
  calculateHintPosition,
  calculateHintPositionWithCoordinateSystem,
  clearHintCache,
  generateHints,
  generateHintsWithGroups,
  validateHintKeyConfig,
} from "./hint.ts";
// Dictionary system imports
import { DictionaryLoader } from "./word/dictionary-loader.ts";
import { VimConfigBridge } from "./word/dictionary-loader.ts";
// Validation system imports
import {
  validateConfig,
  getDefaultConfig,
  getMinLengthForKey,
  getMotionCountForKey,
  normalizeBackwardCompatibleFlags,
  normalizeColorName,
  generateHighlightCommand,
  validateHighlightConfig,
  validateHighlightColor,
} from "./validation/index.ts";
// Import types from the central types module for consistency
import type {
  Config,
  HighlightColor,
  HintKeyConfig,
  HintMapping,
  HintPositionWithCoordinateSystem,
} from "./types.ts";

// Re-export types for backward compatibility
export type { Config, HighlightColor };
import { getPerKeyValue, mergeConfig } from "./config.ts";
import {
  CommandFactory,
  disable,
  enable,
  setCount,
  setTimeout as setTimeoutCommand,
  toggle,
} from "./commands.ts";
import {
  cleanupPlugin,
  getPluginState,
  getPluginStatistics,
  healthCheck,
  initializePlugin,
  type PluginState,
  updatePluginState,
} from "./lifecycle.ts";
import { LRUCache } from "./utils/cache.ts";
import { validateConfigValue } from "./utils/validation.ts";

// deno-lint-ignore prefer-const
let config: Config = getDefaultConfig();

/**
 * 現在表示中のヒントマッピングの配列
 */
let currentHints: HintMapping[] = [];

/**
 * ヒントが現在表示されているかどうかのフラグ
 */
let hintsVisible = false;

/**
 * Neovimのextmark用ネームスペースID（Vimの場合はundefined）
 */
let extmarkNamespace: number | undefined;
let fallbackMatchIds: number[] = []; // matchadd()のフォールバック用ID

/**
 * デバウンス用のタイムアウトID
 * @type {number | undefined}
 */
let debounceTimeoutId: number | undefined;

/**
 * 最後にヒントを表示した時刻（ミリ秒）
 * @type {number}
 */
let lastShowHintsTime = 0;

const wordsCache = new LRUCache<string, any[]>(100);
const hintsCache = new LRUCache<string, string[]>(50);

/**
 * パフォーマンス測定結果を格納するオブジェクト
 * @property showHints - ヒント表示処理の実行時間（ミリ秒）
 * @property hideHints - ヒント非表示処理の実行時間（ミリ秒）
 * @property wordDetection - 単語検出処理の実行時間（ミリ秒）
 * @property hintGeneration - ヒント生成処理の実行時間（ミリ秒）
 */
let performanceMetrics: PerformanceMetrics = {
  showHints: [],
  hideHints: [],
  wordDetection: [],
  hintGeneration: [],
};

/**
 * パフォーマンス測定結果を保持するインターフェース
 * @property showHints - ヒント表示処理の実行時間（ミリ秒）
 * @property hideHints - ヒント非表示処理の実行時間（ミリ秒）
 * @property wordDetection - 単語検出処理の実行時間（ミリ秒）
 * @property hintGeneration - ヒント生成処理の実行時間（ミリ秒）
 */
interface PerformanceMetrics {
  showHints: number[];
  hideHints: number[];
  wordDetection: number[];
  hintGeneration: number[];
}

/**
 * デバッグ情報を格納するインターフェース
 */
interface DebugInfo {
  /** 現在の設定情報 */
  config: Config;
  /** ヒントの表示状態 */
  hintsVisible: boolean;
  /** 現在のヒントマッピング配列 */
  currentHints: HintMapping[];
  /** パフォーマンス測定結果 */
  metrics: PerformanceMetrics;
  /** デバッグ情報取得時刻 */
  timestamp: number;
}

/**
 * パフォーマンス測定結果を記録する
 *
 * @param operation - 測定対象の操作名
 * @param startTime - 操作開始時刻（ミリ秒）
 * @param endTime - 操作終了時刻（ミリ秒）
 */
function recordPerformance(
  operation: keyof PerformanceMetrics,
  startTime: number,
  endTime: number,
): void {
  if (!config.performance_log) return;

  const duration = endTime - startTime;
  performanceMetrics[operation].push(duration);

  // 最新50件のみ保持（メモリ使用量制限）
  if (performanceMetrics[operation].length > 50) {
    performanceMetrics[operation] = performanceMetrics[operation].slice(-50);
  }

  // デバッグモードの場合はコンソールにもログ出力
  if (config.debug_mode) {
    console.log(`[hellshake-yano:PERF] ${operation}: ${duration}ms`);
  }
}



/**
 * 現在のデバッグ情報を収集する
 *
 * @returns 現在の設定、ヒント状態、パフォーマンス指標を含むデバッグ情報
 */
function collectDebugInfo(): DebugInfo {
  return {
    config: { ...config },
    hintsVisible,
    currentHints: [...currentHints],
    metrics: {
      showHints: [...performanceMetrics.showHints],
      hideHints: [...performanceMetrics.hideHints],
      wordDetection: [...performanceMetrics.wordDetection],
      hintGeneration: [...performanceMetrics.hintGeneration],
    },
    timestamp: Date.now(),
  };
}

/**
 * デバッグ情報のクリア
 */
function clearDebugInfo(): void {
  performanceMetrics = {
    showHints: [],
    hideHints: [],
    wordDetection: [],
    hintGeneration: [],
  };
}

/**
 * 後方互換性のあるフラグを正規化する
 *
 * @param cfg - 正規化する設定オブジェクト
 * @returns 後方互換性を保ちつつ正規化された設定
 */

/**
 * メイン設定を単語検出マネージャー用設定に変換する
 *
 * @param config - 変換元のメイン設定
 * @returns WordDetectionManagerが使用する形式の設定
 */
function convertConfigForManager(config: Config): WordDetectionManagerConfig {
  return {
    // 基本設定
    strategy: config.word_detection_strategy || "hybrid",
    use_japanese: config.use_japanese,
    enable_tinysegmenter: config.enable_tinysegmenter,
    segmenter_threshold: config.segmenter_threshold,

    // 日本語分割精度設定
    min_word_length: config.japanese_min_word_length,

    // パフォーマンス設定
    cache_enabled: true,
    auto_detect_language: true,
    performance_monitoring: false, // デバッグ情報が必要な場合のみ有効

    // タイムアウト設定（motion_timeoutから算出）
    timeout_ms: Math.max(config.motion_timeout || 2000, 1000),

    // デフォルトストラテジー
    default_strategy: config.word_detection_strategy || "hybrid",
  };
}

/**
 * メイン設定と単語検出マネージャーの設定を同期する
 *
 * @param config - 同期元のメイン設定
 */
function syncManagerConfig(config: Config): void {
  try {
    // マネージャー用設定に変換
    const managerConfig = convertConfigForManager(config);

    // マネージャーを取得または作成し、設定を更新（globalConfigも渡す）
    const manager = getWordDetectionManager(managerConfig, config);

    // 既存のマネージャーがある場合は設定を更新
    if (manager) {
      manager.updateConfig(managerConfig);
    }
  } catch (error) {
  }
}

/**
 * プラグインのメインエントリポイント
 */
export async function main(denops: Denops): Promise<void> {
  // Neovimの場合のみextmarkのnamespaceを作成
  if (denops.meta.host === "nvim") {
    extmarkNamespace = await denops.call(
      "nvim_create_namespace",
      "hellshake_yano_hints",
    ) as number;
  }

  // プラグイン初期化時にマネージャーに初期設定を同期
  syncManagerConfig(config);

  // dispatcherの設定
  denops.dispatcher = {
    /**
     * 設定を更新（検証処理付き）
     */
    updateConfig(newConfig: unknown): void {
      // 型安全のため、Partial<Config>として処理
      let cfg = newConfig as Partial<Config>;

      // 後方互換性のあるフラグを正規化
      cfg = normalizeBackwardCompatibleFlags(cfg);

      // カスタムマーカー設定の検証と適用
      if (cfg.markers && Array.isArray(cfg.markers)) {
        // マーカーの検証: 文字列配列であることを確認
        const validMarkers = cfg.markers.filter((m): m is string =>
          typeof m === "string" && m.length > 0
        );
        if (validMarkers.length > 0) {
          config.markers = validMarkers;
        } else {
        }
      }

      // motion_count の検証（1以上の整数）
      if (typeof cfg.motion_count === "number") {
        if (cfg.motion_count >= 1 && Number.isInteger(cfg.motion_count)) {
          config.motion_count = cfg.motion_count;
        } else {
        }
      }

      // motion_timeout の検証（100ms以上）
      if (typeof cfg.motion_timeout === "number") {
        if (cfg.motion_timeout >= 100) {
          config.motion_timeout = cfg.motion_timeout;
        } else {
        }
      }

      // hint_position の検証（'start', 'end', 'overlay'のみ許可）
      if (typeof cfg.hint_position === "string") {
        const validPositions = ["start", "end", "overlay"];
        if (validPositions.includes(cfg.hint_position)) {
          config.hint_position = cfg.hint_position;
        } else {
        }
      }

      // visual_hint_position の検証と適用
      if (typeof cfg.visual_hint_position === "string") {
        const validPositions = ["start", "end", "same", "both"];
        if (validPositions.includes(cfg.visual_hint_position)) {
          config.visual_hint_position = cfg.visual_hint_position;
        } else {
        }
      }

      // trigger_on_hjkl の適用
      if (typeof cfg.trigger_on_hjkl === "boolean") {
        config.trigger_on_hjkl = cfg.trigger_on_hjkl;
      }

      // counted_motions の適用
      if (Array.isArray(cfg.counted_motions)) {
        // 各要素が1文字の文字列か検証
        const validKeys = cfg.counted_motions.filter((key: any) =>
          typeof key === "string" && key.length === 1
        );
        if (validKeys.length === cfg.counted_motions.length) {
          config.counted_motions = [...validKeys];
        } else {
          console.warn(
            `[hellshake-yano] Some keys in counted_motions are invalid, using valid keys only: ${validKeys}`,
          );
          config.counted_motions = [...validKeys];
        }
      }

      // enabled の適用
      if (typeof cfg.enabled === "boolean") {
        config.enabled = cfg.enabled;
      }

      // use_numbers の適用（数字対応）
      if (typeof cfg.use_numbers === "boolean") {
        config.use_numbers = cfg.use_numbers;
        // 数字を使用する場合、マーカーを再生成
        if (cfg.use_numbers) {
          const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
          const numbers = "0123456789".split("");
          config.markers = [...letters, ...numbers];
        } else {
          config.markers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
        }
      }

      // highlight_selected の適用（UX改善）
      if (typeof cfg.highlight_selected === "boolean") {
        config.highlight_selected = cfg.highlight_selected;
      }

      // debug_coordinates の適用（デバッグ用）
      if (typeof cfg.debug_coordinates === "boolean") {
        config.debug_coordinates = cfg.debug_coordinates;
      }

      // maxHints の検証（1以上の整数）
      if (typeof cfg.maxHints === "number") {
        if (cfg.maxHints >= 1 && Number.isInteger(cfg.maxHints)) {
          config.maxHints = cfg.maxHints;
        } else {
        }
      }

      // debounceDelay の検証（0以上の数値）
      if (typeof cfg.debounceDelay === "number") {
        if (cfg.debounceDelay >= 0) {
          config.debounceDelay = cfg.debounceDelay;
        } else {
        }
      }

      // single_char_keys の検証と適用
      if (cfg.single_char_keys && Array.isArray(cfg.single_char_keys)) {
        const validKeys = cfg.single_char_keys.filter((k): k is string =>
          typeof k === "string" && k.length === 1
        );
        if (validKeys.length > 0) {
          config.single_char_keys = validKeys;
        } else {
        }
      }

      // multi_char_keys の検証と適用
      if (cfg.multi_char_keys && Array.isArray(cfg.multi_char_keys)) {
        const validKeys = cfg.multi_char_keys.filter((k): k is string =>
          typeof k === "string" && k.length === 1
        );
        if (validKeys.length > 0) {
          config.multi_char_keys = validKeys;
        } else {
        }
      }

      // max_single_char_hints の検証
      if (typeof cfg.max_single_char_hints === "number") {
        if (cfg.max_single_char_hints >= 0 && Number.isInteger(cfg.max_single_char_hints)) {
          config.max_single_char_hints = cfg.max_single_char_hints;
        } else {
        }
      }

      // use_hint_groups の適用
      if (typeof cfg.use_hint_groups === "boolean") {
        config.use_hint_groups = cfg.use_hint_groups;
      } else {
        // Option 2+3: Auto-detect hint groups mode when single_char_keys or multi_char_keys are defined
        // If use_hint_groups is not explicitly set but single/multi char keys are defined,
        // automatically enable hint groups for better user experience
        if (
          (config.single_char_keys && config.single_char_keys.length > 0) ||
          (config.multi_char_keys && config.multi_char_keys.length > 0)
        ) {
          config.use_hint_groups = true;
          if (config.debug_mode) {
            console.log(
              "[hellshake-yano] Auto-enabled hint groups due to single_char_keys/multi_char_keys presence",
            );
          }
        }
      }

      // per_key_motion_count の検証と適用（process4追加）
      if (cfg.per_key_motion_count && typeof cfg.per_key_motion_count === "object") {
        const validCounts: Record<string, number> = {};
        for (const [key, count] of Object.entries(cfg.per_key_motion_count)) {
          if (typeof count === "number" && count >= 1 && Number.isInteger(count)) {
            validCounts[key] = count;
          }
        }
        if (Object.keys(validCounts).length > 0) {
          config.per_key_motion_count = validCounts;
        }
      }

      // default_motion_count の検証と適用（process4追加）
      if (typeof cfg.default_motion_count === "number") {
        if (cfg.default_motion_count >= 1 && Number.isInteger(cfg.default_motion_count)) {
          config.default_motion_count = cfg.default_motion_count;
        }
      }

      if (typeof cfg.use_japanese === "boolean") {
        config.use_japanese = cfg.use_japanese;
      }

      if (typeof cfg.word_detection_strategy === "string") {
        const validStrategies = ["regex", "tinysegmenter", "hybrid"];
        if (validStrategies.includes(cfg.word_detection_strategy)) {
          config.word_detection_strategy = cfg.word_detection_strategy;

          // マネージャーをリセットして新しい設定を適用
          resetWordDetectionManager();
        } else {
        }
      }

      if (typeof cfg.enable_tinysegmenter === "boolean") {
        config.enable_tinysegmenter = cfg.enable_tinysegmenter;
        resetWordDetectionManager();
      }

      if (typeof cfg.segmenter_threshold === "number") {
        if (cfg.segmenter_threshold >= 1 && Number.isInteger(cfg.segmenter_threshold)) {
          config.segmenter_threshold = cfg.segmenter_threshold;
          resetWordDetectionManager();
        } else {
        }
      }

      if (cfg.highlight_hint_marker !== undefined) {
        const markerResult = validateHighlightColor(cfg.highlight_hint_marker);
        if (markerResult.valid) {
          config.highlight_hint_marker = cfg.highlight_hint_marker;
          const displayValue = typeof cfg.highlight_hint_marker === "string"
            ? cfg.highlight_hint_marker
            : JSON.stringify(cfg.highlight_hint_marker);
        } else {
        }
      }

      if (cfg.highlight_hint_marker_current !== undefined) {
        const currentResult = validateHighlightColor(cfg.highlight_hint_marker_current);
        if (currentResult.valid) {
          config.highlight_hint_marker_current = cfg.highlight_hint_marker_current;
          const displayValue = typeof cfg.highlight_hint_marker_current === "string"
            ? cfg.highlight_hint_marker_current
            : JSON.stringify(cfg.highlight_hint_marker_current);
        } else {
        }
      }

      if (typeof cfg.debug_mode === "boolean") {
        config.debug_mode = cfg.debug_mode;
      }

      if (typeof cfg.performance_log === "boolean") {
        config.performance_log = cfg.performance_log;
        // パフォーマンスログが無効化された場合、既存のメトリクスをクリア
        if (!cfg.performance_log) {
          clearDebugInfo();
        }
      }

      // 設定更新後、マネージャーに設定を伝播
      syncManagerConfig(config);
    },

    /**
     * ヒントを表示（デバウンス機能付き）
     */
    async showHints(): Promise<void> {
      // デバウンス処理
      const now = Date.now();
      if (now - lastShowHintsTime < config.debounceDelay) {
        if (debounceTimeoutId) {
          clearTimeout(debounceTimeoutId);
        }
        debounceTimeoutId = setTimeout(() => {
          this.showHintsInternal();
        }, config.debounceDelay) as unknown as number;
        return;
      }

      await this.showHintsInternal();
    },

    /**
     * 内部的なヒント表示処理（最適化版）
     */
    async showHintsInternal(mode?: unknown): Promise<void> {
      const modeString = mode ? String(mode) : "normal";
      const startTime = performance.now();
      lastShowHintsTime = Date.now();

      // デバウンスタイムアウトをクリア
      if (debounceTimeoutId) {
        clearTimeout(debounceTimeoutId);
        debounceTimeoutId = undefined;
      }

      // 日本語テキスト対応: 毎回キャッシュをクリアして正確な位置を計算
      clearHintCache();

      const maxRetries = 2;
      let retryCount = 0;

      while (retryCount <= maxRetries) {
        try {
          // プラグインが無効化されている場合は何もしない
          if (!config.enabled) {
            await denops.cmd("echo 'hellshake-yano is disabled'");
            return;
          }

          // すでに表示中の場合は何もしない
          if (hintsVisible) {
            return;
          }

          // バッファの状態をチェック
          const bufnr = await denops.call("bufnr", "%") as number;
          if (bufnr === -1) {
            throw new Error("No valid buffer available");
          }

          const buftype = await denops.call("getbufvar", bufnr, "&buftype") as string;
          if (buftype && buftype !== "") {
            await denops.cmd("echo 'hellshake-yano: Cannot show hints in special buffer type'");
            return;
          }

          // キャッシュを使用して単語を検出（最適化）
          const words = await detectWordsOptimized(denops, bufnr);
          if (words.length === 0) {
            await denops.cmd("echo 'No words found for hints'");
            return;
          }

          // maxHints設定を使用してヒント数を制限
          let effectiveMaxHints: number;

          // hint groups使用時は実際の容量を計算
          if (config.use_hint_groups && config.single_char_keys && config.multi_char_keys) {
            const singleCharCount = Math.min(
              config.single_char_keys.length,
              config.max_single_char_hints || config.single_char_keys.length,
            );
            const multiCharCount = config.multi_char_keys.length * config.multi_char_keys.length;
            const numberHintCount = 100; // 2桁数字ヒント
            const totalCapacity = singleCharCount + multiCharCount + numberHintCount;
            effectiveMaxHints = Math.min(config.maxHints, totalCapacity);
          } else {
            // 従来の計算方法
            effectiveMaxHints = Math.min(
              config.maxHints,
              config.markers.length * config.markers.length,
            );
          }

          const limitedWords = words.slice(0, effectiveMaxHints);

          if (words.length > effectiveMaxHints) {
            await denops.cmd(
              `echo 'Too many words (${words.length}), showing first ${effectiveMaxHints} hints'`,
            );
          }

          // カーソル位置を取得
          const cursorLine = await denops.call("line", ".") as number;
          const cursorCol = await denops.call("col", ".") as number;

          // キャッシュを使用してヒントを生成（最適化）
          // bothモードの場合は2倍のヒントを生成
          const isBothMode = modeString === "visual" && config.visual_hint_position === "both";
          const hintsNeeded = isBothMode ? limitedWords.length * 2 : limitedWords.length;
          const hints = generateHintsOptimized(hintsNeeded, config.markers);
          currentHints = assignHintsToWords(
            limitedWords,
            hints,
            cursorLine,
            cursorCol,
            modeString,
            {
              hint_position: config.hint_position,
              visual_hint_position: config.visual_hint_position,
            },
          );

          if (currentHints.length === 0) {
            await denops.cmd("echo 'No valid hints could be generated'");
            return;
          }

          // バッチ処理でヒントを非同期表示（最適化）（モード情報付き）
          displayHintsAsync(denops, currentHints, { mode: modeString });
          hintsVisible = true;

          const endTime = performance.now();
          recordPerformance("showHints", startTime, endTime);

          // ユーザー入力を待機
          await waitForUserInput(denops);
          return; // 成功した場合はリトライループを抜ける
        } catch (error) {
          retryCount++;

          // ヒントをクリア
          await hideHints(denops);

          if (retryCount <= maxRetries) {
            // リトライする場合
            await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms待機
          } else {
            // 最大リトライ回数に達した場合
            await denops.cmd(
              "echohl ErrorMsg | echo 'hellshake-yano: Failed to show hints after retries' | echohl None",
            );
            try {
              await denops.cmd("call feedkeys('\\<C-g>', 'n')"); // ベル音
            } catch {
              // ベル音が失敗しても続行
            }
            throw error;
          }
        }
      }
    },

    /**
     * キー情報付きヒント表示（Process4 sub2実装）
     * @param key - 押下されたキー文字
     * @param mode - 現在のVimモード (process2 追加)
     */
    async showHintsWithKey(key: unknown, mode?: unknown): Promise<void> {
      try {
        const keyString = String(key);

        // グローバル設定のcurrent_key_contextを更新
        config.current_key_context = keyString;

        const modeString = mode ? String(mode) : "normal";
        // 既存のshowHintsInternal処理を呼び出し（モード情報付き）
        await this.showHintsInternal(modeString);
      } catch (error) {
        // フォールバック: 通常のshowHintsを呼び出し
        await this.showHints();
      }
    },

    /**
     * ヒントを非表示
     */
    async hideHints(): Promise<void> {
      const startTime = performance.now();
      // デバウンスタイムアウトをクリア
      if (debounceTimeoutId) {
        clearTimeout(debounceTimeoutId);
        debounceTimeoutId = undefined;
      }
      await hideHints(denops);

      const endTime = performance.now();
      recordPerformance("hideHints", startTime, endTime);
    },

    /**
     * キャッシュをクリア
     */
    clearCache(): void {
      wordsCache.clear();
      hintsCache.clear();
    },

    /**
     * デバッグ情報を取得（拡充版）
     */
    async debug(): Promise<unknown> {
      try {
        const bufnr = await denops.call("bufnr", "%") as number;
        const bufname = await denops.call("bufname", bufnr) as string;
        const buftype = await denops.call("getbufvar", bufnr, "&buftype") as string;
        const readonly = await denops.call("getbufvar", bufnr, "&readonly") as number;
        const lineCount = await denops.call("line", "$") as number;

        return {
          config,
          hintsVisible,
          currentHintsCount: currentHints.length,
          currentHints: currentHints.map((h) => ({
            hint: h.hint,
            word: h.word.text,
            line: h.word.line,
            col: h.word.col,
          })),
          host: denops.meta.host,
          extmarkNamespace,
          fallbackMatchIdsCount: fallbackMatchIds.length,
          buffer: {
            number: bufnr,
            name: bufname,
            type: buftype,
            readonly: readonly === 1,
            lineCount,
          },
          capabilities: {
            hasExtmarks: denops.meta.host === "nvim" && extmarkNamespace !== undefined,
            canUseFallback: true,
          },
        };
      } catch (error) {
        return {
          error: `Failed to gather debug info: ${error}`,
          config,
          hintsVisible,
          currentHintsCount: currentHints.length,
          host: denops.meta.host,
          extmarkNamespace,
        };
      }
    },

    /**
     * エラーハンドリングのテスト
     */
    async testErrorHandling(): Promise<void> {
      try {
        // テスト1: 無効なバッファでのヒント表示
        try {
          await denops.cmd("new"); // 新しいバッファを作成
          await denops.cmd("setlocal buftype=nofile"); // 特殊バッファタイプに設定
          await denops.dispatcher.showHints?.();
        } catch (error) {
        }

        // テスト2: 読み取り専用バッファでのヒント表示
        try {
          await denops.cmd("new"); // 新しいバッファを作成
          await denops.cmd("put ='test content for hints'");
          await denops.cmd("setlocal readonly");
          await denops.dispatcher.showHints?.();
        } catch (error) {
        }

        // テスト3: プラグイン無効状態でのヒント表示
        try {
          const originalEnabled = config.enabled;
          config.enabled = false;
          await denops.dispatcher.showHints?.();
          config.enabled = originalEnabled;
        } catch (error) {
        }

        // テスト4: extmarkフォールバック機能
        try {
          // 通常のバッファでテスト
          await denops.cmd("new");
          await denops.cmd("put ='word1 word2 word3'");
          await denops.cmd("normal! gg");

          const debugInfo = await denops.dispatcher.debug?.() as {
            capabilities?: { hasExtmarks?: boolean };
            buffer?: { type?: string; readonly?: boolean };
          };
        } catch (error) {
        }

        await denops.cmd("echo 'Error handling tests completed. Check console for results.'");
      } catch (error) {
        await denops.cmd("echohl ErrorMsg | echo 'Error handling test failed' | echohl None");
      }
    },

    /**
     * 設定のテスト
     */
    async testConfig(): Promise<void> {
      try {
        // テスト1: カスタムマーカー設定
        await denops.dispatcher.updateConfig?.({
          markers: ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"],
        });

        // テスト2: 無効なマーカー設定
        await denops.dispatcher.updateConfig?.({
          markers: [123, null, "", "valid"], // 混在した無効な値
        });

        // テスト3: hint_position設定
        for (const pos of ["start", "end", "overlay", "invalid"]) {
          await denops.dispatcher.updateConfig?.({ hint_position: pos });
        }

        // テスト4: motion_count検証
        for (const count of [0, -1, 1.5, 3, 10]) {
          await denops.dispatcher.updateConfig?.({ motion_count: count });
        }

        // テスト5: motion_timeout検証
        for (const timeout of [50, 100, 500, 2000]) {
          await denops.dispatcher.updateConfig?.({ motion_timeout: timeout });
        }

        // 現在の設定を表示
        const debugInfo = await denops.dispatcher.debug?.();

        await denops.cmd("echo 'Configuration test completed. Check console for results.'");
      } catch (error) {
      }
    },

    /**
     * 複数文字ヒントのテスト
     */
    async testMultiCharHints(): Promise<void> {
      try {
        // テストファイルを開く
        await denops.cmd("edit tmp/claude/multi_char_test.txt");

        // ヒントを表示
        await denops.dispatcher.showHints?.();

        const debugInfo = await denops.dispatcher.debug?.() as {
          currentHints?: Array<{ hint: string; word: string; line: number; col: number }>;
        };

        if (debugInfo.currentHints) {
          debugInfo.currentHints.forEach((h, i: number) => {
          });

          // 複数文字ヒントの存在を確認
          const multiCharHints = debugInfo.currentHints.filter((h) => h.hint.length > 1);

          if (multiCharHints.length > 0) {
            multiCharHints.slice(0, 5).forEach((h) => {
            });
          }
        }
      } catch (error) {
      }
    },

    /**
     * パフォーマンステスト
     */
    async testPerformance(): Promise<void> {
      try {
        // テストファイルを開く
        await denops.cmd("edit tmp/claude/performance_test.txt");

        const startTime = Date.now();

        // 1. 単語検出の性能テスト
        const wordDetectionStart = Date.now();
        const words = await detectWords(denops);
        const wordDetectionTime = Date.now() - wordDetectionStart;

        // 2. ヒント生成の性能テスト
        const hintGenerationStart = Date.now();
        const hints = generateHints(words.length, config.markers, config.maxHints);
        const hintGenerationTime = Date.now() - hintGenerationStart;

        // 3. 実際のヒント表示性能テスト
        const fullTestStart = Date.now();
        await denops.dispatcher.showHints?.();
        const fullTestTime = Date.now() - fullTestStart;

        // 4. キャッシュ効果のテスト
        const cachedTestStart = Date.now();
        await denops.dispatcher.hideHints?.();
        await denops.dispatcher.showHints?.();
        const cachedTestTime = Date.now() - cachedTestStart;

        // 5. デバウンス機能のテスト
        const debounceTestStart = Date.now();
        await denops.dispatcher.hideHints?.();

        // 連続してshowHintsを呼び出してデバウンス効果をテスト
        const promises = [];
        for (let i = 0; i < 5; i++) {
          promises.push(denops.dispatcher.showHints?.());
        }
        await Promise.all(promises);
        const debounceTestTime = Date.now() - debounceTestStart;

        const totalTime = Date.now() - startTime;

        // 統計情報を表示
        const debugInfo = await denops.dispatcher.debug?.() as any;

        // キャッシュ統計
        try {
          const { getWordDetectionCacheStats } = await import("./word.ts");
          const { getHintCacheStats } = await import("./hint.ts");

          const wordCacheStats = getWordDetectionCacheStats();
          const hintCacheStats = getHintCacheStats();
        } catch (error) {
        }

        await denops.cmd("echo 'Performance test completed. Check console for detailed results.'");
      } catch (error) {
        await denops.cmd("echohl ErrorMsg | echo 'Performance test failed' | echohl None");
      }
    },

    /**
     * 大量単語でのストレステスト
     */
    async testStress(): Promise<void> {
      try {
        // パフォーマンステストファイルを開く
        await denops.cmd("edit tmp/claude/performance_test.txt");

        // maxHintsを一時的に大きな値に設定
        const originalMaxHints = config.maxHints;
        config.maxHints = 500;

        const startTime = Date.now();

        // ストレステスト実行
        await denops.dispatcher.showHints?.();

        const endTime = Date.now();
        const executionTime = endTime - startTime;

        // 結果を取得
        const debugInfo = await denops.dispatcher.debug?.() as any;

        // 設定を元に戻す
        config.maxHints = originalMaxHints;

        await denops.cmd(
          `echo 'Stress test completed in ${executionTime}ms with ${
            debugInfo?.currentHintsCount || 0
          } hints'`,
        );
      } catch (error) {
        await denops.cmd("echohl ErrorMsg | echo 'Stress test failed' | echohl None");
      }
    },

    /**
     * デバッグ情報を取得
     */
    getDebugInfo(): DebugInfo {
      return collectDebugInfo();
    },

    /**
     * パフォーマンス情報をクリア
     */
    clearPerformanceLog(): void {
      clearDebugInfo();
    },

    /**
     * デバッグモードのトグル
     */
    toggleDebugMode(): boolean {
      config.debug_mode = !config.debug_mode;
      return config.debug_mode;
    },

    /**
     * パフォーマンスログのトグル
     */
    togglePerformanceLog(): boolean {
      config.performance_log = !config.performance_log;
      if (!config.performance_log) {
        clearDebugInfo();
      }
      return config.performance_log;
    },
  };
}

/**
 * キャッシュを使用した最適化済み単語検出
 * @param denops - Denopsインスタンス
 * @param bufnr - バッファ番号
 * @returns 検出された単語の配列
 */
async function detectWordsOptimized(denops: Denops, bufnr: number): Promise<any[]> {
  try {
    const enhancedConfig: EnhancedWordConfig = {
      strategy: config.word_detection_strategy,
      use_japanese: config.use_japanese,
      enable_tinysegmenter: config.enable_tinysegmenter,
      segmenter_threshold: config.segmenter_threshold,
      cache_enabled: true,
      auto_detect_language: true,
    };

    // current_key_contextからコンテキストを作成
    const context = config.current_key_context
      ? {
        minWordLength: getMinLengthForKey(config, config.current_key_context),
      }
      : undefined;

    const result = await detectWordsWithManager(denops, enhancedConfig, context);

    if (result.success) {
      return result.words;
    } else {
      // フォールバックとしてレガシーメソッドを使用
      return await detectWordsWithConfig(denops, {
        use_japanese: config.use_japanese,
      });
    }
  } catch (error) {
    // 最終フォールバックとしてレガシーメソッドを使用
    return await detectWordsWithConfig(denops, {
      use_japanese: config.use_japanese,
    });
  }
}

/**
 * キャッシュを使用した最適化済みヒント生成
 * @param wordCount - 単語の数
 * @param markers - ヒントマーカーの文字配列
 * @returns 生成されたヒント文字列の配列
 */
function generateHintsOptimized(wordCount: number, markers: string[]): string[] {
  // Option 2+3: Auto-detect hint groups mode when single_char_keys or multi_char_keys are defined
  // unless explicitly disabled by use_hint_groups=false
  const shouldUseHintGroups = config.use_hint_groups !== false &&
    (config.single_char_keys || config.multi_char_keys);

  if (shouldUseHintGroups && (config.single_char_keys || config.multi_char_keys)) {
    if (config.debug_mode) {
      console.log("[hellshake-yano] Auto-detected hint groups mode:", {
        use_hint_groups: config.use_hint_groups,
        has_single_char_keys: !!config.single_char_keys,
        has_multi_char_keys: !!config.multi_char_keys,
        shouldUseHintGroups,
      });
    }

    const hintConfig: HintKeyConfig = {
      single_char_keys: config.single_char_keys,
      multi_char_keys: config.multi_char_keys,
      max_single_char_hints: config.max_single_char_hints,
      markers: markers,
    };

    // 設定の検証
    const validation = validateHintKeyConfig(hintConfig);
    if (!validation.valid) {
      if (config.debug_mode) {
        console.error("[hellshake-yano] Invalid hint key configuration:", validation.errors);
      }
      // フォールバックとして通常のヒント生成を使用
      return generateHints(wordCount, markers);
    }

    return generateHintsWithGroups(wordCount, hintConfig);
  }

  // 従来のヒント生成処理
  // キャッシュヒットチェック
  const cacheKey = `${wordCount}-${markers?.join("") || "default"}`;
  const cachedHints = hintsCache.get(cacheKey);
  if (cachedHints) {
    return cachedHints.slice(0, wordCount);
  }

  // キャッシュミスの場合、新たにヒントを生成
  const hints = generateHints(wordCount, markers);

  // キャッシュを更新（最大1000個まで）
  if (wordCount <= 1000) {
    hintsCache.set(cacheKey, hints);
  }

  return hints;
}

/**
 * バッチ処理で最適化されたヒント表示
 */
async function displayHintsOptimized(
  denops: Denops,
  hints: HintMapping[],
  mode: string = "normal",
  signal?: AbortSignal,
): Promise<void> {
  try {
    // バッファの存在確認
    const bufnr = await denops.call("bufnr", "%") as number;
    if (bufnr === -1) {
      throw new Error("Invalid buffer: no current buffer available");
    }

    // バッファが読み込み専用かチェック
    const readonly = await denops.call("getbufvar", bufnr, "&readonly") as number;
    if (readonly) {
    }

    if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
      // Neovim: バッチ処理でextmarkを作成
      await displayHintsWithExtmarksBatch(denops, bufnr, hints, mode, signal);
    } else {
      // Vim: バッチ処理でmatchaddを作成
      await displayHintsWithMatchAddBatch(denops, hints, mode, signal);
    }
  } catch (error) {
    // フォールバックとして通常の表示処理を使用
    await displayHints(denops, hints, mode);
  }
}

// グローバル状態管理
let _isRenderingHints = false;
let _renderingAbortController: AbortController | null = null;
let _highlightAbortController: AbortController | null = null;

// バッチ処理の設定
const HIGHLIGHT_BATCH_SIZE = 15; // 1バッチあたりの処理数（パフォーマンス調整可能）

/**
 * 非同期ヒント表示関数
 * fire-and-forgetパターンで描画を実行し、入力をブロックしない
 */
export function displayHintsAsync(
  denops: Denops,
  hints: HintMapping[],
  config: any,
  onComplete?: () => void,
): void {
  // 前の描画をキャンセル
  if (_renderingAbortController) {
    _renderingAbortController.abort();
  }

  // 新しいAbortControllerを作成
  _renderingAbortController = new AbortController();
  const currentController = _renderingAbortController;

  // 描画状態を設定
  _isRenderingHints = true;

  // 非同期で描画を実行（awaitしない）
  (async () => {
    try {
      // AbortSignalをチェックしながら描画
      if (currentController.signal.aborted) {
        return;
      }

      await displayHintsOptimized(denops, hints, config.mode || "normal", currentController.signal);

      // 完了コールバックを実行
      if (onComplete && !currentController.signal.aborted) {
        onComplete();
      }
    } catch (error) {
      // エラーは内部でキャッチして、外部に投げない
      console.error("[hellshake-yano] Async rendering error:", error);
    } finally {
      // この描画が現在のものである場合のみフラグをリセット
      if (currentController === _renderingAbortController) {
        _isRenderingHints = false;
        _renderingAbortController = null;
      }
    }
  })();
}

/**
 * 描画中かどうかを取得
 */
export function isRenderingHints(): boolean {
  return _isRenderingHints;
}

/**
 * 現在の描画をキャンセル
 */
export function abortCurrentRendering(): void {
  if (_renderingAbortController) {
    _renderingAbortController.abort();
    _renderingAbortController = null;
    _isRenderingHints = false;
  }
}

/**
 * バッチ処理でextmarkを作成
 */
async function displayHintsWithExtmarksBatch(
  denops: Denops,
  bufnr: number,
  hints: HintMapping[],
  mode: string = "normal",
  signal?: AbortSignal,
): Promise<void> {
  const batchSize = 50; // バッチサイズ
  let extmarkFailCount = 0;
  const maxFailures = 5;

  for (let i = 0; i < hints.length; i += batchSize) {
    // Check if the operation was aborted
    if (signal?.aborted) {
      return;
    }

    const batch = hints.slice(i, i + batchSize);

    try {
      // バッチ内の各extmarkを作成
      await Promise.all(batch.map(async (mapping, index) => {
        const { word, hint } = mapping;
        try {
          // バッファの有効性を再確認
          const bufValid = await denops.call("bufexists", bufnr) as number;
          if (!bufValid) {
            throw new Error(`Buffer ${bufnr} no longer exists`);
          }

          // HintMappingのhintCol/hintByteColを使用して位置を決定
          // bothモードでも各マッピングは正しい位置情報を持っている
          const hintLine = word.line;
          const hintCol = mapping.hintCol || word.col;
          const hintByteCol = mapping.hintByteCol || mapping.hintCol || word.byteCol || word.col;

          // 行とカラムの境界チェック
          const lineCount = await denops.call("line", "$") as number;
          if (hintLine > lineCount || hintLine < 1) {
            return;
          }

          // Neovim用の0ベース座標に変換
          const nvimLine = hintLine - 1;
          const nvimCol = hintByteCol - 1;

          await denops.call(
            "nvim_buf_set_extmark",
            bufnr,
            extmarkNamespace,
            nvimLine,
            Math.max(0, nvimCol),
            {
              virt_text: [[hint, "HellshakeYanoMarker"]],
              virt_text_pos: "overlay",
              priority: 100,
            },
          );
        } catch (extmarkError) {
          extmarkFailCount++;

          // フォールバックとしてmatchaddを使用
          try {
            const pattern = `\\%${word.line}l\\%${word.col}c.`;
            const matchId = await denops.call(
              "matchadd",
              "HellshakeYanoMarker",
              pattern,
              100,
            ) as number;
            fallbackMatchIds.push(matchId);
          } catch (matchError) {
          }

          // 失敗が多すぎる場合はextmarkを諦めてmatchaddに切り替え
          if (extmarkFailCount >= maxFailures) {
            const remainingHints = hints.slice(i + index + 1);
            if (remainingHints.length > 0) {
              await displayHintsWithMatchAddBatch(denops, remainingHints, mode, signal);
            }
            return;
          }
        }
      }));

      // バッチ間の小さな遅延（CPU負荷を減らす）
      if (i + batchSize < hints.length && hints.length > 100) {
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    } catch (batchError) {
      // バッチエラーの場合は次のバッチに続く
    }
  }
}

/**
 * バッチ処理でmatchaddを作成
 */
async function displayHintsWithMatchAddBatch(
  denops: Denops,
  hints: HintMapping[],
  mode: string = "normal",
  signal?: AbortSignal,
): Promise<void> {
  const batchSize = 100; // matchaddはより高速なので大きなバッチサイズ

  for (let i = 0; i < hints.length; i += batchSize) {
    // Check if the operation was aborted
    if (signal?.aborted) {
      return;
    }

    const batch = hints.slice(i, i + batchSize);

    try {
      // バッチ内の各matchを作成
      const matchPromises = batch.map(async (mapping) => {
        const { word, hint } = mapping;
        try {
          // HintMappingのhintCol/hintByteColを使用して位置を決定
          // bothモードでも各マッピングは正しい位置情報を持っている
          const hintLine = word.line;
          const hintCol = mapping.hintCol || word.col;
          const hintByteCol = mapping.hintByteCol || mapping.hintCol || word.byteCol || word.col;

          // VimはbyteColを使用
          const vimCol = hintByteCol;
          const pattern = `\\%${hintLine}l\\%${vimCol}c.`;

          const matchId = await denops.call(
            "matchadd",
            "HellshakeYanoMarker",
            pattern,
            100,
          ) as number;
          fallbackMatchIds.push(matchId);

          return matchId;
        } catch (matchError) {
          return null;
        }
      });

      await Promise.all(matchPromises);

      // バッチ間の小さな遅延（CPU負荷を減らす）
      if (i + batchSize < hints.length && hints.length > 200) {
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    } catch (batchError) {
      // バッチエラーの場合は次のバッチに続く
    }
  }
}

/**
 * ヒントを表示する（エラーハンドリング強化版）
 */
async function displayHints(
  denops: Denops,
  hints: HintMapping[],
  mode: string = "normal",
): Promise<void> {
  try {
    // バッファの存在確認
    const bufnr = await denops.call("bufnr", "%") as number;
    if (bufnr === -1) {
      throw new Error("Invalid buffer: no current buffer available");
    }

    // バッファが読み込み専用かチェック
    const readonly = await denops.call("getbufvar", bufnr, "&readonly") as number;
    if (readonly) {
    }

    if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
      // Neovim: extmarkを使用（フォールバック付き）
      let extmarkFailCount = 0;
      const maxFailures = 3;

      for (const { word, hint } of hints) {
        try {
          // バッファの有効性を再確認
          const bufValid = await denops.call("bufexists", bufnr) as number;
          if (!bufValid) {
            throw new Error(`Buffer ${bufnr} no longer exists`);
          }

          const position = calculateHintPositionWithCoordinateSystem(
            word,
            config.hint_position,
            config.debug_coordinates,
            mode === "visual",
            config.visual_hint_position,
          );
          // デバッグログ追加（パフォーマンスのためコメントアウト）
          const col = position.nvim_col; // Neovim extmark用（既に0ベース変換済み）
          let virtTextPos: "overlay" | "eol" = "overlay";

          if (position.display_mode === "overlay") {
            virtTextPos = "overlay";
          }

          // 行とカラムの境界チェック
          const lineCount = await denops.call("line", "$") as number;
          if (word.line > lineCount || word.line < 1) {
            continue;
          }

          await denops.call(
            "nvim_buf_set_extmark",
            bufnr,
            extmarkNamespace,
            position.nvim_line,
            Math.max(0, col),
            {
              virt_text: [[hint, "HellshakeYanoMarker"]],
              virt_text_pos: virtTextPos,
              priority: 100,
            },
          );
        } catch (extmarkError) {
          extmarkFailCount++;

          // フォールバックとしてmatchadd()を使用
          try {
            const pattern = `\\%${word.line}l\\%${word.col}c.`;
            const matchId = await denops.call(
              "matchadd",
              "HellshakeYanoMarker",
              pattern,
              100,
            ) as number;
            fallbackMatchIds.push(matchId);
          } catch (matchError) {
          }

          // 失敗が多すぎる場合はextmarkを諦めてmatchaddに切り替え
          if (extmarkFailCount >= maxFailures) {
            const currentIndex = hints.findIndex((h) => h.word === word && h.hint === hint);
            if (currentIndex !== -1) {
              await displayHintsWithMatchAdd(denops, hints.slice(currentIndex));
            }
            break;
          }
        }
      }
    } else {
      // Vim または extmark が利用できない場合: matchadd()を使用
      await displayHintsWithMatchAdd(denops, hints);
    }
  } catch (error) {
    // 最後の手段としてユーザーに通知
    await denops.cmd(
      "echohl ErrorMsg | echo 'hellshake-yano: Failed to display hints' | echohl None",
    );

    // 音声フィードバック（可能な場合）
    try {
      await denops.cmd("call feedkeys('\\<C-g>', 'n')"); // ベル音
    } catch {
      // ベル音も失敗した場合は何もしない
    }

    throw error;
  }
}

/**
 * matchadd()を使用してヒントを表示する（フォールバック機能）
 */
async function displayHintsWithMatchAdd(
  denops: Denops,
  hints: HintMapping[],
  mode: string = "normal",
): Promise<void> {
  try {
    for (const { word, hint } of hints) {
      try {
        const position = calculateHintPositionWithCoordinateSystem(
          word,
          config.hint_position,
          config.debug_coordinates,
        );
        let pattern: string;

        switch (position.display_mode) {
          case "before":
          case "after":
            pattern = `\\%${position.vim_line}l\\%${position.vim_col}c.`;
            break;
          case "overlay":
            // 単語全体にマッチ（オーバーレイ風）
            pattern = `\\%${position.vim_line}l\\%>${position.vim_col - 1}c\\%<${
              position.vim_col + word.text.length + 1
            }c`;
            break;
          default:
            pattern = `\\%${position.vim_line}l\\%${position.vim_col}c.`;
        }

        const matchId = await denops.call(
          "matchadd",
          "HellshakeYanoMarker",
          pattern,
          100,
        ) as number;
        fallbackMatchIds.push(matchId);

        // Vimではテキストの表示はできないので、ヒント文字の情報をコメントとして記録
      } catch (matchError) {
      }
    }
  } catch (error) {
    throw error;
  }
}

/**
 * ヒントの表示だけをクリアする（currentHintsは保持）
 * highlightCandidateHints用の専用関数
 *
 * @param denops - Denopsインスタンス
 */
async function clearHintDisplay(denops: Denops): Promise<void> {
  try {
    if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
      // Neovim: extmarkをクリア
      try {
        const bufnr = await denops.call("bufnr", "%") as number;
        if (bufnr !== -1) {
          const bufExists = await denops.call("bufexists", bufnr) as number;
          if (bufExists) {
            await denops.call("nvim_buf_clear_namespace", bufnr, extmarkNamespace, 0, -1);
          }
        }
      } catch (extmarkError) {
      }
    }

    // フォールバック用のmatchをクリア
    if (fallbackMatchIds.length > 0) {
      try {
        for (const matchId of fallbackMatchIds) {
          try {
            await denops.call("matchdelete", matchId);
          } catch (matchError) {
            // 個別のmatch削除エラーは警告のみ
          }
        }
        fallbackMatchIds = [];
      } catch (error) {
        // 最後の手段として全matchをクリア
        try {
          await denops.call("clearmatches");
        } catch (clearError) {
        }
      }
    }

    // Vim またはその他のケース: 全matchをクリア
    if (denops.meta.host !== "nvim") {
      try {
        await denops.call("clearmatches");
      } catch (clearError) {
      }
    }
  } catch (error) {
  }
  // 注意: currentHints, hintsVisible, fallbackMatchIds は保持する
}

/**
 * ヒントを非表示にする（エラーハンドリング強化版）
 *
 * @param denops - Denopsインスタンス
 * @throws Vim/Neovim APIエラーが発生した場合（ただし内部でキャッチして継続）
 */
async function hideHints(denops: Denops): Promise<void> {
  if (!hintsVisible) {
    return;
  }

  try {
    if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
      // Neovim: extmarkをクリア
      try {
        const bufnr = await denops.call("bufnr", "%") as number;
        if (bufnr !== -1) {
          const bufExists = await denops.call("bufexists", bufnr) as number;
          if (bufExists) {
            await denops.call("nvim_buf_clear_namespace", bufnr, extmarkNamespace, 0, -1);
          }
        }
      } catch (extmarkError) {
      }
    }

    // フォールバック用のmatchをクリア
    if (fallbackMatchIds.length > 0) {
      try {
        for (const matchId of fallbackMatchIds) {
          try {
            await denops.call("matchdelete", matchId);
          } catch (matchError) {
            // 個別のmatch削除エラーは警告のみ
          }
        }
        fallbackMatchIds = [];
      } catch (error) {
        // 最後の手段として全matchをクリア
        try {
          await denops.call("clearmatches");
        } catch (clearError) {
        }
      }
    }

    // Vim またはその他のケース: 全matchをクリア
    if (denops.meta.host !== "nvim") {
      try {
        await denops.call("clearmatches");
      } catch (clearError) {
      }
    }
  } catch (error) {
  } finally {
    // エラーが発生しても状態はリセットする
    currentHints = [];
    hintsVisible = false;
    fallbackMatchIds = [];
  }
}

/**
 * 候補のヒントをハイライト表示（UX改善）
 */
async function highlightCandidateHints(
  denops: Denops,
  inputPrefix: string,
): Promise<void> {
  if (!config.highlight_selected) return;

  try {
    // 候補となるヒントを分類
    const matchingHints = currentHints.filter((h) => h.hint.startsWith(inputPrefix));
    const nonMatchingHints = currentHints.filter((h) => !h.hint.startsWith(inputPrefix));

    if (currentHints.length === 0) return;

    // バッファの存在確認
    const bufnr = await denops.call("bufnr", "%") as number;
    if (bufnr === -1) return;

    // 表示だけをクリア（currentHintsは保持）
    await clearHintDisplay(denops);

    // Neovimの場合はextmarkで再表示
    if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
      // マッチするヒントを表示（1文字目をハイライト）
      for (const hint of matchingHints) {
        try {
          // 既存の位置情報を使用（再計算しない）
          const line = hint.word.line - 1; // 0ベースに変換
          let col = 0;
          if (hint.hintByteCol !== undefined && hint.hintByteCol > 0) {
            col = hint.hintByteCol - 1;
          } else if (hint.hintCol !== undefined && hint.hintCol > 0) {
            col = hint.hintCol - 1;
          } else {
            col = (hint.word.byteCol || hint.word.col) - 1;
          }

          // ヒントテキストを分割
          const firstChar = hint.hint.substring(0, inputPrefix.length);
          const remainingChars = hint.hint.substring(inputPrefix.length);

          // 分割したテキストを異なるハイライトで表示
          const virtText: Array<[string, string]> = [];
          if (firstChar) {
            virtText.push([firstChar, "HellshakeYanoMarkerCurrent"]);
          }
          if (remainingChars) {
            virtText.push([remainingChars, "HellshakeYanoMarker"]);
          }

          await denops.call(
            "nvim_buf_set_extmark",
            bufnr,
            extmarkNamespace,
            line,
            Math.max(0, col),
            {
              virt_text: virtText,
              virt_text_pos: "overlay",
              priority: 999,
            },
          );
        } catch (error) {
        }
      }

      // マッチしないヒントを通常表示
      for (const hint of nonMatchingHints) {
        try {
          // 既存の位置情報を使用（再計算しない）
          const line = hint.word.line - 1; // 0ベースに変換
          let col = 0;
          if (hint.hintByteCol !== undefined && hint.hintByteCol > 0) {
            col = hint.hintByteCol - 1;
          } else if (hint.hintCol !== undefined && hint.hintCol > 0) {
            col = hint.hintCol - 1;
          } else {
            col = (hint.word.byteCol || hint.word.col) - 1;
          }

          await denops.call(
            "nvim_buf_set_extmark",
            bufnr,
            extmarkNamespace,
            line,
            Math.max(0, col),
            {
              virt_text: [[hint.hint, "HellshakeYanoMarker"]],
              virt_text_pos: "overlay",
              priority: 100,
            },
          );
        } catch (error) {
        }
      }
    } else {
      // Vimの場合はmatchaddで再表示
      // マッチするヒントをHellshakeYanoMarkerCurrentで表示
      for (const hint of matchingHints) {
        try {
          const position = calculateHintPositionWithCoordinateSystem(
            hint.word,
            config.hint_position,
            config.debug_coordinates,
          );

          let pattern: string;
          switch (position.display_mode) {
            case "before":
            case "after":
              pattern = `\\%${position.vim_line}l\\%${position.vim_col}c.`;
              break;
            case "overlay":
              pattern = `\\%${position.vim_line}l\\%>${position.vim_col - 1}c\\%<${
                position.vim_col + hint.word.text.length + 1
              }c`;
              break;
            default:
              pattern = `\\%${position.vim_line}l\\%${position.vim_col}c.`;
          }

          const matchId = await denops.call(
            "matchadd",
            "HellshakeYanoMarkerCurrent",
            pattern,
            999,
          ) as number;
          fallbackMatchIds.push(matchId);
        } catch (error) {
        }
      }

      // マッチしないヒントをHellshakeYanoMarkerで表示
      for (const hint of nonMatchingHints) {
        try {
          const position = calculateHintPositionWithCoordinateSystem(
            hint.word,
            config.hint_position,
            config.debug_coordinates,
          );

          let pattern: string;
          switch (position.display_mode) {
            case "before":
            case "after":
              pattern = `\\%${position.vim_line}l\\%${position.vim_col}c.`;
              break;
            case "overlay":
              pattern = `\\%${position.vim_line}l\\%>${position.vim_col - 1}c\\%<${
                position.vim_col + hint.word.text.length + 1
              }c`;
              break;
            default:
              pattern = `\\%${position.vim_line}l\\%${position.vim_col}c.`;
          }

          const matchId = await denops.call(
            "matchadd",
            "HellshakeYanoMarker",
            pattern,
            100,
          ) as number;
          fallbackMatchIds.push(matchId);
        } catch (error) {
        }
      }
    }

    // ヒント表示状態を保持
    hintsVisible = true;
  } catch (error) {
    // エラー時は元のヒントを復元
    hintsVisible = false;
  }
}

/**
 * 候補のヒントを非同期でハイライト表示（UX改善）
 *
 * @description fire-and-forgetパターンで描画を実行し、入力をブロックしない
 * @param denops - Denops インスタンス
 * @param inputPrefix - ユーザーが入力した文字列のプレフィックス
 * @param onComplete - 描画完了時のコールバック（オプション）
 * @returns void - Promiseを返さない（非ブロッキング）
 *
 * @example
 * // 1文字目入力後のハイライト更新
 * highlightCandidateHintsAsync(denops, "a");
 *
 * // 完了コールバック付き
 * highlightCandidateHintsAsync(denops, "ab", () => {
 *   console.log("Highlight rendering completed");
 * });
 */
export function highlightCandidateHintsAsync(
  denops: Denops,
  inputPrefix: string,
  onComplete?: () => void,
): void {
  // 前のハイライト描画をキャンセル
  if (_highlightAbortController) {
    _highlightAbortController.abort();
  }

  // 新しいAbortControllerを作成
  _highlightAbortController = new AbortController();
  const currentController = _highlightAbortController;

  // 非同期でハイライト処理を実行（awaitしない）
  (async () => {
    try {
      // AbortSignalをチェックしながら処理
      if (currentController.signal.aborted) {
        return;
      }

      await highlightCandidateHintsOptimized(denops, inputPrefix, currentController.signal);

      // 完了コールバックを実行
      if (onComplete && !currentController.signal.aborted) {
        onComplete();
      }
    } catch (error) {
      // エラーは内部でキャッチして、外部に投げない（非ブロッキング保証）
      if (error instanceof Error) {
        console.error("[hellshake-yano] Async highlight error:", error.message, error.stack);
      } else {
        console.error("[hellshake-yano] Async highlight error:", error);
      }
    } finally {
      // この描画が現在のものである場合のみフラグをリセット
      if (currentController === _highlightAbortController) {
        _highlightAbortController = null;
      }
    }
  })();
}

/**
 * バッチ処理でヒントのハイライトを最適化
 *
 * @description 大量のヒントを処理する際にメインスレッドをブロックしないよう、
 *              バッチごとに制御を返しながら段階的に描画を行う
 * @param denops - Denops インスタンス
 * @param inputPrefix - マッチングに使用する入力プレフィックス
 * @param signal - 中断シグナル
 * @throws Error - バッファが無効な場合やその他の描画エラー
 */
async function highlightCandidateHintsOptimized(
  denops: Denops,
  inputPrefix: string,
  signal: AbortSignal,
): Promise<void> {
  if (!config.highlight_selected) return;

  // 候補となるヒントを分類
  const matchingHints = currentHints.filter((h) => h.hint.startsWith(inputPrefix));
  const nonMatchingHints = currentHints.filter((h) => !h.hint.startsWith(inputPrefix));

  if (currentHints.length === 0) return;

  // バッファの存在確認
  const bufnr = await denops.call("bufnr", "%") as number;
  if (bufnr === -1 || signal.aborted) return;

  // 表示だけをクリア（currentHintsは保持）
  await clearHintDisplay(denops);

  if (signal.aborted) return;

  // Neovimの場合はextmarkで再表示
  if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
    await processExtmarksBatched(
      denops,
      matchingHints,
      nonMatchingHints,
      inputPrefix,
      bufnr,
      signal,
    );
  } else {
    // Vimの場合はmatchaddで再表示
    await processMatchaddBatched(denops, matchingHints, nonMatchingHints, signal);
  }

  if (!signal.aborted) {
    // ヒント表示状態を保持
    hintsVisible = true;
  }
}

/**
 * Neovim extmarkのバッチ処理
 */
async function processExtmarksBatched(
  denops: Denops,
  matchingHints: HintMapping[],
  nonMatchingHints: HintMapping[],
  inputPrefix: string,
  bufnr: number,
  signal: AbortSignal,
): Promise<void> {
  // マッチするヒントを優先的に処理
  let processed = 0;

  for (const hint of matchingHints) {
    if (signal.aborted) return;

    try {
      const line = hint.word.line - 1; // 0ベースに変換
      let col = 0;
      if (hint.hintByteCol !== undefined && hint.hintByteCol > 0) {
        col = hint.hintByteCol - 1;
      } else if (hint.hintCol !== undefined && hint.hintCol > 0) {
        col = hint.hintCol - 1;
      } else {
        col = (hint.word.byteCol || hint.word.col) - 1;
      }

      // ヒントテキストを分割
      const firstChar = hint.hint.substring(0, inputPrefix.length);
      const remainingChars = hint.hint.substring(inputPrefix.length);

      // 分割したテキストを異なるハイライトで表示
      const virtText: Array<[string, string]> = [];
      if (firstChar) {
        virtText.push([firstChar, "HellshakeYanoMarkerCurrent"]);
      }
      if (remainingChars) {
        virtText.push([remainingChars, "HellshakeYanoMarker"]);
      }

      await denops.call(
        "nvim_buf_set_extmark",
        bufnr,
        extmarkNamespace,
        line,
        Math.max(0, col),
        {
          virt_text: virtText,
          virt_text_pos: "overlay",
          priority: 999,
        },
      );
    } catch (error) {
      // エラーは無視して続行
    }

    processed++;
    // バッチサイズに達したら制御を返す
    if (processed % HIGHLIGHT_BATCH_SIZE === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  // マッチしないヒントを通常表示
  for (const hint of nonMatchingHints) {
    if (signal.aborted) return;

    try {
      const line = hint.word.line - 1; // 0ベースに変換
      let col = 0;
      if (hint.hintByteCol !== undefined && hint.hintByteCol > 0) {
        col = hint.hintByteCol - 1;
      } else if (hint.hintCol !== undefined && hint.hintCol > 0) {
        col = hint.hintCol - 1;
      } else {
        col = (hint.word.byteCol || hint.word.col) - 1;
      }

      await denops.call(
        "nvim_buf_set_extmark",
        bufnr,
        extmarkNamespace,
        line,
        Math.max(0, col),
        {
          virt_text: [[hint.hint, "HellshakeYanoMarker"]],
          virt_text_pos: "overlay",
          priority: 100,
        },
      );
    } catch (error) {
      // エラーは無視して続行
    }

    processed++;
    // バッチサイズに達したら制御を返す
    if (processed % HIGHLIGHT_BATCH_SIZE === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
}

/**
 * Vim matchaddのバッチ処理
 */
async function processMatchaddBatched(
  denops: Denops,
  matchingHints: HintMapping[],
  nonMatchingHints: HintMapping[],
  signal: AbortSignal,
): Promise<void> {
  let processed = 0;

  // マッチするヒントをHellshakeYanoMarkerCurrentで表示
  for (const hint of matchingHints) {
    if (signal.aborted) return;

    try {
      const position = calculateHintPositionWithCoordinateSystem(
        hint.word,
        config.hint_position,
        config.debug_coordinates,
      );

      let pattern: string;
      switch (position.display_mode) {
        case "before":
        case "after":
          pattern = `\\%${position.vim_line}l\\%${position.vim_col}c.`;
          break;
        case "overlay":
          pattern = `\\%${position.vim_line}l\\%>${position.vim_col - 1}c\\%<${
            position.vim_col + hint.word.text.length + 1
          }c`;
          break;
        default:
          pattern = `\\%${position.vim_line}l\\%${position.vim_col}c.`;
      }

      const matchId = await denops.call(
        "matchadd",
        "HellshakeYanoMarkerCurrent",
        pattern,
        999,
      ) as number;
      fallbackMatchIds.push(matchId);
    } catch (error) {
      // エラーは無視して続行
    }

    processed++;
    // バッチサイズに達したら制御を返す
    if (processed % HIGHLIGHT_BATCH_SIZE === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  // マッチしないヒントをHellshakeYanoMarkerで表示
  for (const hint of nonMatchingHints) {
    if (signal.aborted) return;

    try {
      const position = calculateHintPositionWithCoordinateSystem(
        hint.word,
        config.hint_position,
        config.debug_coordinates,
      );

      let pattern: string;
      switch (position.display_mode) {
        case "before":
        case "after":
          pattern = `\\%${position.vim_line}l\\%${position.vim_col}c.`;
          break;
        case "overlay":
          pattern = `\\%${position.vim_line}l\\%>${position.vim_col - 1}c\\%<${
            position.vim_col + hint.word.text.length + 1
          }c`;
          break;
        default:
          pattern = `\\%${position.vim_line}l\\%${position.vim_col}c.`;
      }

      const matchId = await denops.call(
        "matchadd",
        "HellshakeYanoMarker",
        pattern,
        100,
      ) as number;
      fallbackMatchIds.push(matchId);
    } catch (error) {
      // エラーは無視して続行
    }

    processed++;
    // バッチサイズに達したら制御を返す
    if (processed % HIGHLIGHT_BATCH_SIZE === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
}

/**
 * ユーザーのヒント選択入力を待機し、選択された位置にジャンプする
 *
 * ユーザーが入力したヒント文字列に対応する位置にカーソルを移動します。
 * 複数文字のヒントにも対応し、タイムアウト機能を備えています。
 *
 * @param denops - Denopsインスタンス
 * @throws ユーザーがESCでキャンセルした場合
 * @example
 * ```typescript
 * // ヒント表示後に呼び出し
 * await waitForUserInput(denops);
 * // ユーザーが "A" を入力すると、ヒント "A" の位置にジャンプ
 * ```
 */
async function waitForUserInput(denops: Denops): Promise<void> {
  let timeoutId: number | undefined;

  try {
    // 入力タイムアウト設定（設定可能）
    const inputTimeout = config.motion_timeout || 2000;

    // プロンプトを表示
    // await denops.cmd("echo 'Select hint: '");

    // タイムアウト付きでユーザー入力を取得
    const inputPromise = denops.call("getchar") as Promise<number>;
    const timeoutPromise = new Promise<number>((resolve) => {
      timeoutId = setTimeout(() => resolve(-2), inputTimeout) as unknown as number; // -2 = 全体タイムアウト
    });

    const char = await Promise.race([inputPromise, timeoutPromise]);

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }

    // 全体タイムアウトの場合
    if (char === -2) {
      await hideHints(denops);
      return;
    }

    // ESCキーの場合はキャンセル
    if (char === 27) {
      await hideHints(denops);
      return;
    }

    // Ctrl+C やその他の制御文字の処理
    if (char < 32 && char !== 13) { // Enter(13)以外の制御文字
      await hideHints(denops);
      return;
    }

    // 元の入力が大文字かどうかを記録（A-Z: 65-90）
    const wasUpperCase = char >= 65 && char <= 90;
    // 元の入力が数字かどうかを記録（0-9: 48-57）
    const wasNumber = char >= 48 && char <= 57;
    // 元の入力が小文字かどうかを記録（a-z: 97-122）
    const wasLowerCase = char >= 97 && char <= 122;

    // 小文字の場合は、ヒントをキャンセルして通常のVim動作を実行
    if (wasLowerCase) {
      await hideHints(denops);
      // 小文字をそのままVimに渡す
      const originalChar = String.fromCharCode(char);
      await denops.call("feedkeys", originalChar, "n");
      return;
    }

    // 文字に変換
    let inputChar: string;
    try {
      inputChar = String.fromCharCode(char);
      // アルファベットの場合は大文字に変換（数字はそのまま）
      if (/[a-zA-Z]/.test(inputChar)) {
        inputChar = inputChar.toUpperCase();
      }
    } catch (_charError) {
      await denops.cmd("echohl ErrorMsg | echo 'Invalid character input' | echohl None");
      await hideHints(denops);
      return;
    }

    // 現在のキー設定に数字が含まれているかチェック
    const allKeys = [...(config.single_char_keys || []), ...(config.multi_char_keys || [])];
    const hasNumbers = allKeys.some((k) => /^\d$/.test(k));

    // 有効な文字範囲チェック（use_numbersがtrueまたはキー設定に数字が含まれていれば数字を許可）
    const validPattern = (config.use_numbers || hasNumbers) ? /[A-Z0-9]/ : /[A-Z]/;
    const errorMessage = (config.use_numbers || hasNumbers)
      ? "Please use alphabetic characters (A-Z) or numbers (0-9) only"
      : "Please use alphabetic characters only";

    if (!validPattern.test(inputChar)) {
      await denops.cmd(`echohl WarningMsg | echo '${errorMessage}' | echohl None`);
      try {
        await denops.cmd("call feedkeys('\\<C-g>', 'n')"); // ベル音
      } catch {
        // ベル音が失敗しても続行
      }
      await hideHints(denops);
      return;
    }

    // 入力文字で始まる全てのヒントを探す（単一文字と複数文字の両方）
    const matchingHints = currentHints.filter((h) => h.hint.startsWith(inputChar));

    if (matchingHints.length === 0) {
      // 該当するヒントがない場合は終了（視覚・音声フィードバック付き）
      await denops.cmd("echohl WarningMsg | echo 'No matching hint found' | echohl None");
      try {
        await denops.cmd("call feedkeys('\\<C-g>', 'n')"); // ベル音
      } catch {
        // ベル音が失敗しても続行
      }
      await hideHints(denops);
      return;
    }

    // 単一文字のヒントと複数文字のヒントを分離
    const singleCharTarget = matchingHints.find((h) => h.hint === inputChar);
    const multiCharHints = matchingHints.filter((h) => h.hint.length > 1);

    if (config.use_hint_groups) {
      // デフォルトのキー設定
      const singleOnlyKeys = config.single_char_keys ||
        [
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
        ];
      const multiOnlyKeys = config.multi_char_keys ||
        ["B", "C", "E", "I", "O", "P", "Q", "R", "T", "U", "V", "W", "X", "Y", "Z"];

      // 1文字専用キーの場合：即座にジャンプ（タイムアウトなし）
      if (singleOnlyKeys.includes(inputChar) && singleCharTarget) {
        try {
          // ヒント位置情報を使用（Visual modeでの語尾ジャンプ対応）
          const jumpCol = singleCharTarget.hintByteCol || singleCharTarget.hintCol ||
            singleCharTarget.word.byteCol || singleCharTarget.word.col;

          // デバッグログ: ジャンプ位置の詳細
          if (config.debug_mode) {
            console.log(`[hellshake-yano:DEBUG] Jump to single char hint:`);
            console.log(`  - text: "${singleCharTarget.word.text}"`);
            console.log(`  - line: ${singleCharTarget.word.line}`);
            console.log(`  - col: ${singleCharTarget.word.col} (display)`);
            console.log(`  - byteCol: ${singleCharTarget.word.byteCol} (byte)`);
            console.log(`  - hintCol: ${singleCharTarget.hintCol} (hint display)`);
            console.log(`  - hintByteCol: ${singleCharTarget.hintByteCol} (hint byte)`);
            console.log(`  - jumpCol (used): ${jumpCol}`);
          }

          await denops.call("cursor", singleCharTarget.word.line, jumpCol);
          // await denops.cmd(`echo 'Jumped to "${singleCharTarget.word.text}"' | redraw`);
        } catch (jumpError) {
          await denops.cmd("echohl ErrorMsg | echo 'Failed to jump to target' | echohl None");
        }
        await hideHints(denops);
        return;
      }

      // 2文字専用キーの場合：必ず2文字目を待つ（タイムアウトなし）
      if (multiOnlyKeys.includes(inputChar) && multiCharHints.length > 0) {
        // 2文字目の入力を待つ処理は後続のコードで実行される
        // ただし、タイムアウト処理をスキップするフラグを設定
        // この場合は通常の処理フローを続ける
      }
    } else {
      // Option 3: 1文字ヒントが存在する場合は即座にジャンプ（他の条件に関係なく）
      if (singleCharTarget) {
        try {
          // ヒント位置情報を使用（Visual modeでの語尾ジャンプ対応）
          const jumpCol = singleCharTarget.hintByteCol || singleCharTarget.hintCol ||
            singleCharTarget.word.byteCol || singleCharTarget.word.col;

          // デバッグログ: ジャンプ位置の詳細
          if (config.debug_mode) {
            console.log(`[hellshake-yano:DEBUG] Jump to single char target (Option 3):`);
            console.log(`  - text: "${singleCharTarget.word.text}"`);
            console.log(`  - line: ${singleCharTarget.word.line}`);
            console.log(`  - col: ${singleCharTarget.word.col} (display)`);
            console.log(`  - byteCol: ${singleCharTarget.word.byteCol} (byte)`);
            console.log(`  - hintCol: ${singleCharTarget.hintCol} (hint display)`);
            console.log(`  - hintByteCol: ${singleCharTarget.hintByteCol} (hint byte)`);
            console.log(`  - jumpCol (used): ${jumpCol}`);
          }

          await denops.call("cursor", singleCharTarget.word.line, jumpCol);
          // await denops.cmd(`echo 'Jumped to "${singleCharTarget.word.text}"' | redraw`);
        } catch (jumpError) {
          await denops.cmd("echohl ErrorMsg | echo 'Failed to jump to target' | echohl None");
        }
        await hideHints(denops);
        return;
      }
    }

    // 候補のヒントをハイライト表示（UX改善）
    // Option 3: 1文字ヒントが存在する場合はハイライト処理をスキップ
    const shouldHighlight = config.highlight_selected && !singleCharTarget;

    if (shouldHighlight) {
      // 非同期版を使用してメインスレッドをブロックしない
      highlightCandidateHintsAsync(denops, inputChar);
    }

    // 第2文字の入力を待機
    // await denops.cmd(`echo 'Select hint: ${inputChar}' | redraw`);

    let secondChar: number;

    if (config.use_hint_groups) {
      const multiOnlyKeys = config.multi_char_keys ||
        ["B", "C", "E", "I", "O", "P", "Q", "R", "T", "U", "V", "W", "X", "Y", "Z"];

      if (multiOnlyKeys.includes(inputChar)) {
        // 2文字専用キーの場合：タイムアウトなしで2文字目を待つ
        secondChar = await denops.call("getchar") as number;
      } else {
        // それ以外（従来の動作）：タイムアウトあり
        const secondInputPromise = denops.call("getchar") as Promise<number>;
        const secondTimeoutPromise = new Promise<number>((resolve) => {
          timeoutId = setTimeout(() => resolve(-1), 800) as unknown as number; // 800ms後にタイムアウト
        });

        secondChar = await Promise.race([secondInputPromise, secondTimeoutPromise]);

        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
      }
    } else {
      // 従来の動作：タイムアウトあり
      const secondInputPromise = denops.call("getchar") as Promise<number>;
      const secondTimeoutPromise = new Promise<number>((resolve) => {
        timeoutId = setTimeout(() => resolve(-1), 800) as unknown as number; // 800ms後にタイムアウト
      });

      secondChar = await Promise.race([secondInputPromise, secondTimeoutPromise]);

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    }

    if (secondChar === -1) {
      // タイムアウトの場合
      if (matchingHints.length === 1) {
        // 候補が1つの場合は自動選択
        const target = matchingHints[0];
        try {
          // ヒント位置情報を使用（Visual modeでの語尾ジャンプ対応）
          const jumpCol = target.hintByteCol || target.hintCol || target.word.byteCol ||
            target.word.col;

          // デバッグログ: ジャンプ位置の詳細
          if (config.debug_mode) {
            console.log(`[hellshake-yano:DEBUG] Auto-select single candidate:`);
            console.log(`  - text: "${target.word.text}"`);
            console.log(`  - line: ${target.word.line}`);
            console.log(`  - col: ${target.word.col} (display)`);
            console.log(`  - byteCol: ${target.word.byteCol} (byte)`);
            console.log(`  - hintCol: ${target.hintCol} (hint display)`);
            console.log(`  - hintByteCol: ${target.hintByteCol} (hint byte)`);
            console.log(`  - jumpCol (used): ${jumpCol}`);
          }

          await denops.call("cursor", target.word.line, jumpCol);
          // await denops.cmd(`echo 'Auto-selected "${target.word.text}"'`);
        } catch (jumpError) {
          await denops.cmd("echohl ErrorMsg | echo 'Failed to jump to target' | echohl None");
        }
      } else if (singleCharTarget) {
        // タイムアウトで単一文字ヒントがある場合はそれを選択
        try {
          // ヒント位置情報を使用（Visual modeでの語尾ジャンプ対応）
          const jumpCol = singleCharTarget.hintByteCol || singleCharTarget.hintCol ||
            singleCharTarget.word.byteCol || singleCharTarget.word.col;

          // デバッグログ: ジャンプ位置の詳細
          if (config.debug_mode) {
            console.log(`[hellshake-yano:DEBUG] Timeout select single char hint:`);
            console.log(`  - text: "${singleCharTarget.word.text}"`);
            console.log(`  - line: ${singleCharTarget.word.line}`);
            console.log(`  - col: ${singleCharTarget.word.col} (display)`);
            console.log(`  - byteCol: ${singleCharTarget.word.byteCol} (byte)`);
            console.log(`  - hintCol: ${singleCharTarget.hintCol} (hint display)`);
            console.log(`  - hintByteCol: ${singleCharTarget.hintByteCol} (hint byte)`);
            console.log(`  - jumpCol (used): ${jumpCol}`);
          }

          await denops.call("cursor", singleCharTarget.word.line, jumpCol);
          // await denops.cmd(`echo 'Selected "${singleCharTarget.word.text}" (timeout)' | redraw`);
        } catch (jumpError) {
          await denops.cmd("echohl ErrorMsg | echo 'Failed to jump to target' | echohl None");
        }
      } else {
        await denops.cmd(`echo 'Timeout - ${matchingHints.length} candidates available'`);
      }
      await hideHints(denops);
      return;
    }

    // ESCキーの場合はキャンセル
    if (secondChar === 27) {
      await denops.cmd("echo 'Cancelled'");
      await hideHints(denops);
      return;
    }

    // 第2文字を結合
    let secondInputChar: string;
    try {
      secondInputChar = String.fromCharCode(secondChar);
      // アルファベットの場合は大文字に変換（数字はそのまま）
      if (/[a-zA-Z]/.test(secondInputChar)) {
        secondInputChar = secondInputChar.toUpperCase();
      }
    } catch (_charError) {
      await denops.cmd("echohl ErrorMsg | echo 'Invalid second character' | echohl None");
      await hideHints(denops);
      return;
    }

    // 有効な文字範囲チェック（数字対応）
    const secondValidPattern = config.use_numbers ? /[A-Z0-9]/ : /[A-Z]/;
    const secondErrorMessage = config.use_numbers
      ? "Second character must be alphabetic or numeric"
      : "Second character must be alphabetic";

    if (!secondValidPattern.test(secondInputChar)) {
      await denops.cmd(`echohl WarningMsg | echo '${secondErrorMessage}' | echohl None`);
      await hideHints(denops);
      return;
    }

    const fullHint = inputChar + secondInputChar;

    // 完全なヒントを探す
    const target = currentHints.find((h) => h.hint === fullHint);

    if (target) {
      // カーソルを移動（byteColが利用可能な場合は使用）
      try {
        // ヒント位置情報を使用（Visual modeでの語尾ジャンプ対応）
        const jumpCol = target.hintByteCol || target.hintCol || target.word.byteCol ||
          target.word.col;

        // デバッグログ: ジャンプ位置の詳細
        if (config.debug_mode) {
          console.log(`[hellshake-yano:DEBUG] Jump to hint "${fullHint}":`);
          console.log(`  - text: "${target.word.text}"`);
          console.log(`  - line: ${target.word.line}`);
          console.log(`  - col: ${target.word.col} (display)`);
          console.log(`  - byteCol: ${target.word.byteCol} (byte)`);
          console.log(`  - hintCol: ${target.hintCol} (hint display)`);
          console.log(`  - hintByteCol: ${target.hintByteCol} (hint byte)`);
          console.log(`  - jumpCol (used): ${jumpCol}`);
        }

        await denops.call("cursor", target.word.line, jumpCol);
        // await denops.cmd(`echo 'Jumped to "${target.word.text}"'`);
      } catch (jumpError) {
        await denops.cmd("echohl ErrorMsg | echo 'Failed to jump to target' | echohl None");
      }
    } else {
      // 無効なヒント組み合わせの場合（視覚・音声フィードバック付き）
      await denops.cmd(
        `echohl ErrorMsg | echo 'Invalid hint combination: ${fullHint}' | echohl None`,
      );
      try {
        await denops.cmd("call feedkeys('\\<C-g>', 'n')"); // ベル音
      } catch {
        // ベル音が失敗しても続行
      }
    }

    // ヒントを非表示
    await hideHints(denops);
  } catch (error) {
    // タイムアウトをクリア
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // エラー時のユーザーフィードバック
    try {
      await denops.cmd("echohl ErrorMsg | echo 'Input error - hints cleared' | echohl None");
      await denops.cmd("call feedkeys('\\<C-g>', 'n')"); // ベル音
    } catch {
      // フィードバックが失敗しても続行
    }

    await hideHints(denops);
    throw error;
  }
}










// Dictionary system variables
let dictionaryLoader: DictionaryLoader | null = null;
let vimConfigBridge: VimConfigBridge | null = null;

/**
 * Initialize dictionary system
 */
async function initializeDictionarySystem(denops: Denops): Promise<void> {
  try {
    dictionaryLoader = new DictionaryLoader();
    vimConfigBridge = new VimConfigBridge();

    // Register dictionary commands
    await registerDictionaryCommands(denops);

    // Load initial dictionary
    const dictConfig = await vimConfigBridge.getConfig(denops);
    await dictionaryLoader.loadUserDictionary(dictConfig);

    if (config.debug_mode) {
      console.log("[hellshake-yano] Dictionary system initialized");
    }
  } catch (error) {
    console.error("[hellshake-yano] Failed to initialize dictionary system:", error);
  }
}

/**
 * Register dictionary-related Vim commands
 */
async function registerDictionaryCommands(denops: Denops): Promise<void> {
  // Reload dictionary command
  await denops.cmd(
    `command! HellshakeYanoReloadDict call denops#request("${denops.name}", "reloadDictionary", [])`,
  );

  // Edit dictionary command
  await denops.cmd(
    `command! HellshakeYanoEditDict call denops#request("${denops.name}", "editDictionary", [])`,
  );

  // Show dictionary command
  await denops.cmd(
    `command! HellshakeYanoShowDict call denops#request("${denops.name}", "showDictionary", [])`,
  );

  // Validate dictionary command
  await denops.cmd(
    `command! HellshakeYanoValidateDict call denops#request("${denops.name}", "validateDictionary", [])`,
  );
}

/**
 * Reload dictionary from files
 */
export async function reloadDictionary(denops: Denops): Promise<void> {
  try {
    if (!dictionaryLoader || !vimConfigBridge) {
      await initializeDictionarySystem(denops);
      return;
    }

    const dictConfig = await vimConfigBridge.getConfig(denops);
    const dictionary = await dictionaryLoader.loadUserDictionary(dictConfig);

    // Update word detection manager with new dictionary
    const manager = getWordDetectionManager({
      enable_tinysegmenter: config.use_japanese !== false,
      // Note: dictionary is handled internally by the manager
    });

    await denops.cmd('echo "Dictionary reloaded successfully"');
  } catch (error) {
    await denops.cmd(`echoerr "Failed to reload dictionary: ${error}"`);
  }
}

/**
 * Edit dictionary file
 */
export async function editDictionary(denops: Denops): Promise<void> {
  try {
    if (!dictionaryLoader || !vimConfigBridge) {
      await initializeDictionarySystem(denops);
    }

    const dictConfig = await vimConfigBridge!.getConfig(denops);
    const dictionaryPath = dictConfig.dictionaryPath || ".hellshake-yano/dictionary.json";

    if (dictionaryPath) {
      await denops.cmd(`edit ${dictionaryPath}`);
    } else {
      // Create new dictionary file if not exists
      const newPath = ".hellshake-yano/dictionary.json";
      await denops.cmd(`edit ${newPath}`);

      // Insert template
      const template = {
        customWords: ["例: 機械学習"],
        preserveWords: ["例: HelloWorld"],
        mergeRules: {
          "の": "always",
          "を": "always",
        },
        hintPatterns: [
          {
            pattern: "^-\\s*\\[\\s*\\]\\s*(.)",
            hintPosition: "capture:1",
            priority: 100,
            description: "Checkbox first character",
          },
        ],
      };

      await denops.call("setline", 1, JSON.stringify(template, null, 2).split("\n"));
    }
  } catch (error) {
    await denops.cmd(`echoerr "Failed to edit dictionary: ${error}"`);
  }
}

/**
 * Show current dictionary content
 */
export async function showDictionary(denops: Denops): Promise<void> {
  try {
    if (!dictionaryLoader || !vimConfigBridge) {
      await initializeDictionarySystem(denops);
    }

    const dictConfig = await vimConfigBridge!.getConfig(denops);
    const dictionary = await dictionaryLoader!.loadUserDictionary(dictConfig);

    // Create a new buffer to show dictionary content
    await denops.cmd("new");
    await denops.cmd("setlocal buftype=nofile");
    await denops.cmd("setlocal bufhidden=wipe");
    await denops.cmd("setlocal noswapfile");
    await denops.cmd("file [HellshakeYano Dictionary]");

    const content = JSON.stringify(dictionary, null, 2);
    await denops.call("setline", 1, content.split("\n"));

    // Set to readonly
    await denops.cmd("setlocal readonly");
    await denops.cmd("setlocal nomodifiable");
  } catch (error) {
    await denops.cmd(`echoerr "Failed to show dictionary: ${error}"`);
  }
}

/**
 * Validate dictionary format
 */
export async function validateDictionary(denops: Denops): Promise<void> {
  try {
    if (!dictionaryLoader || !vimConfigBridge) {
      await initializeDictionarySystem(denops);
    }

    const dictConfig = await vimConfigBridge!.getConfig(denops);
    // Simple validation - check if file exists
    const result = { valid: true, errors: [] as string[] };
    if (dictConfig.dictionaryPath) {
      try {
        await Deno.stat(dictConfig.dictionaryPath);
      } catch {
        result.valid = false;
        result.errors.push("Dictionary file not found");
      }
    }

    if (result.valid) {
      await denops.cmd('echo "Dictionary format is valid"');
    } else {
      await denops.cmd(`echoerr "Dictionary validation failed: ${result.errors.join(", ")}"`);
    }
  } catch (error) {
    await denops.cmd(`echoerr "Failed to validate dictionary: ${error}"`);
  }
}

// 後方互換性のための再エクスポート
// これらの関数はvalidationモジュールに移動済みですが、
// 既存のコードとの互換性維持のためmain.tsからも再エクスポートします
export {
  validateConfig,
  getDefaultConfig,
  getMinLengthForKey,
  getMotionCountForKey,
  normalizeBackwardCompatibleFlags,
  normalizeColorName,
  generateHighlightCommand,
  validateHighlightConfig,
  validateHighlightColor,
  validateHighlightGroupName,
  isValidColorName,
  isValidHexColor,
} from "./validation/index.ts";
