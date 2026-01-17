/**
 * @fileoverview Hellshake-Yano.vim メインエントリーポイント
 * Phase 5: 統合型エントリーポイント
 *
 * 環境判定に基づいて自動的に以下を実行:
 * - Vim環境: vim/レイヤーを初期化
 * - Neovim環境: neovim/レイヤーを初期化
 */
import type { Denops } from "@denops/std";
import { Config, DEFAULT_CONFIG } from "./config.ts";
import type { DebugInfo, HintMapping, Word, WindowInfo } from "./types.ts";

// 統合レイヤーのインポート
import { Initializer } from "./integration/initializer.ts";
import { initializeDebugMode } from "./common/utils/logger.ts";

// Neovim固有のインポート（従来の実装維持）
import { generateHints } from "./neovim/core/hint.ts";
import { Core } from "./neovim/core/core.ts";
import {
  clearCaches,
  clearDebugInfo as clearDebugInfoPerformance,
  collectDebugInfo,
  detectWordsOptimized,
  generateHintsFromConfig,
  recordPerformance,
  resetPerformanceMetrics,
} from "./common/utils/performance.ts";
import { validateConfig } from "./config.ts";
import {
  addToDictionary,
  editDictionary,
  initializeDictionarySystem,
  reloadDictionary,
  showDictionary,
  validateDictionary,
} from "./neovim/dictionary.ts";
import {
  cleanupPendingTimers,
  displayHintsAsync,
  displayHintsOptimized as displayHintsOptimizedInternal,
  hideHints as hideHintsDisplay,
  highlightCandidateHintsAsync as highlightCandidateHintsAsyncInternal,
  highlightCandidateHintsHybrid,
} from "./neovim/display/extmark-display.ts";

// 設定関連のエクスポート
export { getDefaultConfig } from "./config.ts";
export type { Config } from "./config.ts";

/** プラグインの設定 */
let config: Config = DEFAULT_CONFIG;

/** 現在のヒントのマッピング */
let currentHints: HintMapping[] = [];

/** ヒントが表示されているかどうか */
let hintsVisible = false;

/** Neovim の extmark 名前空間 */
let extmarkNamespace: number | undefined;

/** matchadd のフォールバック用 ID リスト */
const fallbackMatchIds: number[] = [];

// テスト用に関数を再エクスポート
export { detectWordsOptimized, generateHintsFromConfig, validateConfig };
export { cleanupPendingTimers, collectDebugInfo };

/**
 * プラグインのメインエントリーポイント（環境判定型）
 * @param denops - Denops インスタンス
 * @throws {Error} プラグインの初期化に失敗した場合
 *
 * フロー:
 * 1. Initializer経由で環境判定を実行
 * 2. 実装選択結果に基づいてenvironment判定を実行
 * 3. Neovim環境 -> initializeNeovimLayer()
 * 4. Vim環境 -> initializeVimLayer()
 */
export async function main(denops: Denops): Promise<void> {
  try {
    // Step 0: デバッグモードの初期化（g:hellshake_yano.debugMode をチェック）
    await initializeDebugMode(denops);

    // Step 1: Initializer経由で初期化（環境判定と設定マイグレーション）
    const initializer = new Initializer(denops);
    const initResult = await initializer.initialize();

    // Step 2: 初期化結果がdenops-unified実装の場合
    if (initResult.implementation === "denops-unified") {
      await initializeDenopsUnified(denops);
    }
    // VimScript版の場合は既にcommand-registry経由でコマンド登録済み
  } catch (error) {
    // エラーログ（オプション）
    console.error("main() initialization failed:", error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Denops統合実装の初期化
 * 環境判定を行い、Vim/Neovim別の初期化を呼び出し
 */
async function initializeDenopsUnified(denops: Denops): Promise<void> {
  try {
    // 環境判定: has('nvim')を確認
    const isNeovim = (await denops.call("has", "nvim") as number) ? true : false;

    if (isNeovim) {
      await initializeNeovimLayer(denops);
    } else {
      await initializeVimLayer(denops);
    }
  } catch (error) {
    console.error("initializeDenopsUnified failed:", error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Vim環境初期化関数
 * vim/レイヤーのコンポーネント初期化とdispatcher登録
 */
async function initializeVimLayer(denops: Denops): Promise<void> {
  try {
    // Core初期化
    const core = Core.getInstance(DEFAULT_CONFIG);
    await core.initializePlugin(denops);

    // g:hellshake_yanoが未定義の場合は空のオブジェクトをフォールバック
    const userConfig = await denops.eval("g:hellshake_yano").catch(() => ({})) as Partial<
      Config
    >;

    // Configを直接使用
    const defaultConfig = DEFAULT_CONFIG;
    config = { ...defaultConfig, ...userConfig } as Config;

    // Coreインスタンスの設定を更新
    core.updateConfig(config);

    // Dictionary初期化
    await initializeDictionarySystem(denops);

    // Dispatcher登録（Vim環境用の最小実装）
    denops.dispatcher = {
      // 基本制御
      // deno-lint-ignore require-await
      async enable(): Promise<void> {
        const core = Core.getInstance(config);
        core.enable();
      },

      async disable(): Promise<void> {
        const core = Core.getInstance(config);
        core.disable();
      },

      async toggle(): Promise<void> {
        const core = Core.getInstance(config);
        core.toggle();
      },

      // 設定管理
      async updateConfig(cfg: unknown): Promise<void> {
        if (typeof cfg === "object" && cfg !== null) {
          const core = Core.getInstance(config);
          const configUpdate = cfg as Partial<Config>;
          core.updateConfig(configUpdate);
          config = { ...config, ...configUpdate };
        }
      },

      async getConfig(): Promise<Config> {
        return config;
      },

      async validateConfig(cfg: unknown): Promise<{ valid: boolean; errors: string[] }> {
        return validateConfig(cfg as Partial<Config>);
      },

      // Process3 Sub2: 日本語セグメント化API
      async segmentJapaneseText(
        text: unknown,
        options?: unknown,
      ): Promise<{ segments: string[]; success: boolean; error?: string; source: string }> {
        const core = Core.getInstance(config);
        const textStr = typeof text === "string" ? text : String(text);
        const opts = typeof options === "object" && options !== null
          ? options as { mergeParticles?: boolean }
          : { mergeParticles: true };

        try {
          const result = await core.segmentJapaneseText(textStr, opts);
          return result;
        } catch (error) {
          return {
            segments: [],
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            source: "fallback",
          };
        }
      },

      // デバッグ・ユーティリティ
      async healthCheck(): Promise<void> {
        const core = Core.getInstance(config);
        await core.getHealthStatus(denops);
      },

      async getStatistics(): Promise<unknown> {
        const core = Core.getInstance(config);
        return core.getStatistics();
      },

      async debug(): Promise<DebugInfo> {
        const core = Core.getInstance(config);
        return core.collectDebugInfo();
      },

      async clearCache(): Promise<void> {
        const core = Core.getInstance(config);
        core.clearCache();
        clearCaches();
      },

      // Dictionary管理
      async reloadDictionary(): Promise<void> {
        await reloadDictionary(denops);
      },

      async addToDictionary(word: unknown, meaning?: unknown, type?: unknown): Promise<void> {
        if (typeof word === "string") {
          await addToDictionary(
            denops,
            word,
            typeof meaning === "string" ? meaning : undefined,
            typeof type === "string" ? type : undefined,
          );
        }
      },

      async editDictionary(): Promise<void> {
        await editDictionary(denops);
      },

      async showDictionary(): Promise<void> {
        await showDictionary(denops);
      },

      async validateDictionary(): Promise<void> {
        await validateDictionary(denops);
      },
    };
  } catch (error) {
    console.error("initializeVimLayer failed:", error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Neovim環境初期化関数
 * 既存neovim/レイヤーを統合フローに組み込み
 */
async function initializeNeovimLayer(denops: Denops): Promise<void> {
  try {
    // 既存のNeovim初期化ロジック
    const core = Core.getInstance(DEFAULT_CONFIG);
    await core.initializePlugin(denops);

    // g:hellshake_yanoが未定義の場合は空のオブジェクトをフォールバック
    const userConfig = await denops.eval("g:hellshake_yano").catch(() => ({})) as Partial<
      Config
    >;

    // Configを直接使用
    const defaultConfig = DEFAULT_CONFIG;
    config = { ...defaultConfig, ...userConfig } as Config;

    // Coreインスタンスの設定を更新
    core.updateConfig(config);

    if (denops.meta.host === "nvim") {
      extmarkNamespace = await denops.call("nvim_create_namespace", "hellshake-yano") as number;
    }

    await initializeDictionarySystem(denops);

    denops.dispatcher = {
      // deno-lint-ignore require-await
      async enable(): Promise<void> {
        const core = Core.getInstance(config);
        core.enable();
      },

      async disable(): Promise<void> {
        const core = Core.getInstance(config);
        core.disable();
      },

      async toggle(): Promise<void> {
        const core = Core.getInstance(config);
        core.toggle();
      },

      async setCount(count: unknown): Promise<void> {
        if (typeof count === "number") {
          const core = Core.getInstance(config);
          core.setMotionThreshold(count);
        }
      },

      async setTimeout(timeout: unknown): Promise<void> {
        if (typeof timeout === "number") {
          const core = Core.getInstance(config);
          core.setMotionTimeout(timeout);
        }
      },

      async showHints(): Promise<void> {
        const startTime = performance.now();
        try {
          await displayHintsAsync(
            denops,
            config,
            currentHints,
            extmarkNamespace,
            fallbackMatchIds,
          );
          hintsVisible = true;
        } catch (error) {
          throw error;
        } finally {
          recordPerformance("showHints", performance.now() - startTime);
        }
      },

      async hideHints(): Promise<void> {
        await hideHintsDisplay(
          denops,
          extmarkNamespace,
          fallbackMatchIds,
          { value: hintsVisible },
          currentHints,
        );
        hintsVisible = false;
      },

      async highlightCandidateHints(input: unknown): Promise<void> {
        if (typeof input !== "string") return;
        highlightCandidateHintsAsyncInternal(
          denops,
          input,
          currentHints,
          config,
          extmarkNamespace,
          fallbackMatchIds,
        );
      },

      async detectWords(bufnr: unknown): Promise<Word[]> {
        const startTime = performance.now();
        try {
          const bufferNumber = typeof bufnr === "number" ? bufnr : 0;
          return await detectWordsOptimized(denops, bufferNumber);
        } finally {
          recordPerformance("wordDetection", performance.now() - startTime);
        }
      },

      async generateHints(wordCount: unknown): Promise<string[]> {
        const startTime = performance.now();
        try {
          const count = typeof wordCount === "number" ? wordCount : 0;
          // singleCharKeysとmultiCharKeysを使用するように修正
          const hintConfig = {
            singleCharKeys: config.singleCharKeys,
            multiCharKeys: config.multiCharKeys,
            maxSingleCharHints: config.maxSingleCharHints,
            useNumericMultiCharHints: config.useNumericMultiCharHints,
            // フォールバック用にmarkersも設定
            markers: config.markers || ["a", "s", "d", "f"],
          };
          return generateHints(count, hintConfig);
        } finally {
          recordPerformance("hintGeneration", performance.now() - startTime);
        }
      },

      async getDebugInfo(): Promise<DebugInfo> {
        return collectDebugInfo(hintsVisible, currentHints, config);
      },

      async clearDebugInfo(): Promise<void> {
        clearDebugInfoPerformance();
      },

      async getConfig(): Promise<Config> {
        return config;
      },

      async validateConfig(cfg: unknown): Promise<{ valid: boolean; errors: string[] }> {
        return validateConfig(cfg as Partial<Config>);
      },

      async healthCheck(): Promise<void> {
        const core = Core.getInstance(config);
        await core.getHealthStatus(denops);
      },

      async getStatistics(): Promise<unknown> {
        const core = Core.getInstance(config);
        return core.getStatistics();
      },

      async reloadDictionary(): Promise<void> {
        await reloadDictionary(denops);
      },

      async addToDictionary(word: unknown, meaning?: unknown, type?: unknown): Promise<void> {
        if (typeof word === "string") {
          await addToDictionary(
            denops,
            word,
            typeof meaning === "string" ? meaning : undefined,
            typeof type === "string" ? type : undefined,
          );
        }
      },

      async editDictionary(): Promise<void> {
        await editDictionary(denops);
      },

      async showDictionary(): Promise<void> {
        await showDictionary(denops);
      },

      async validateDictionary(): Promise<void> {
        await validateDictionary(denops);
      },

      async showHintsWithKey(key: unknown, mode?: unknown): Promise<void> {
        const core = Core.getInstance(config);
        await core.showHintsWithKey(
          denops,
          typeof key === "string" ? key : "",
          typeof mode === "string" ? mode : undefined,
        );
      },

      async showHintsInternal(mode?: unknown): Promise<void> {
        const core = Core.getInstance(config);
        await core.showHintsInternal(
          denops,
          typeof mode === "string" ? mode : "normal",
        );
      },

      async updateConfig(cfg: unknown): Promise<void> {
        if (typeof cfg === "object" && cfg !== null) {
          const core = Core.getInstance(config);
          const configUpdate = cfg as Partial<Config>;
          core.updateConfig(configUpdate);
          // グローバル設定も更新（直接Configを使用）
          config = { ...config, ...configUpdate };
        }
      },

      async clearCache(): Promise<void> {
        const core = Core.getInstance(config);
        core.clearCache();
        clearCaches();
      },

      async debug(): Promise<DebugInfo> {
        const core = Core.getInstance(config);
        return core.collectDebugInfo();
      },

      async clearPerformanceLog(): Promise<void> {
        resetPerformanceMetrics();
      },

      async segmentJapaneseText(
        text: unknown,
        options?: unknown,
      ): Promise<{ segments: string[]; success: boolean; error?: string; source: string }> {
        const core = Core.getInstance(config);
        const textStr = typeof text === "string" ? text : String(text);
        const opts = typeof options === "object" && options !== null
          ? options as { mergeParticles?: boolean }
          : { mergeParticles: true };

        try {
          const result = await core.segmentJapaneseText(textStr, opts);
          return result;
        } catch (error) {
          return {
            segments: [],
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            source: "fallback",
          };
        }
      },

      // ========================================
      // Multi-window support methods (Process 7)
      // ========================================

      /**
       * Show hints across multiple windows
       * @returns Array of hint mappings for all visible windows
       */
      async showHintsMultiWindow(): Promise<HintMapping[]> {
        const core = Core.getInstance(config);
        return await core.showHintsMultiWindow(denops);
      },

      /**
       * Hide hints from all windows
       */
      async hideHintsMultiWindow(): Promise<void> {
        const core = Core.getInstance(config);
        await core.hideHintsMultiWindow(denops);
      },

      /**
       * Toggle multi-window mode
       * @returns New state of multi-window mode
       */
      // deno-lint-ignore require-await
      async toggleMultiWindowMode(): Promise<boolean> {
        const core = Core.getInstance(config);
        return core.toggleMultiWindowMode();
      },

      /**
       * Get visible windows in current tabpage
       * @returns Array of WindowInfo for visible editable windows
       */
      async getVisibleWindows(): Promise<WindowInfo[]> {
        const core = Core.getInstance(config);
        return await core.getVisibleWindows(denops);
      },

      /**
       * Check if multi-window mode is currently active
       * @returns true if multiple editable windows are visible and mode is enabled
       */
      async isMultiWindowModeActive(): Promise<boolean> {
        const core = Core.getInstance(config);
        return await core.isMultiWindowModeActive(denops);
      },

      /**
       * Update multi-window configuration
       * @param updates - Configuration updates for multi-window settings
       */
      // deno-lint-ignore require-await
      async updateMultiWindowConfig(updates: unknown): Promise<void> {
        if (typeof updates === "object" && updates !== null) {
          const core = Core.getInstance(config);
          const validUpdates: {
            multiWindowMode?: boolean;
            multiWindowExcludeTypes?: string[];
            multiWindowMaxWindows?: number;
          } = {};

          const u = updates as Record<string, unknown>;
          if (typeof u.multiWindowMode === "boolean") {
            validUpdates.multiWindowMode = u.multiWindowMode;
          }
          if (Array.isArray(u.multiWindowExcludeTypes)) {
            validUpdates.multiWindowExcludeTypes = u.multiWindowExcludeTypes.filter(
              (t): t is string => typeof t === "string"
            );
          }
          if (typeof u.multiWindowMaxWindows === "number") {
            validUpdates.multiWindowMaxWindows = u.multiWindowMaxWindows;
          }

          core.updateMultiWindowConfig(validUpdates);
          // Update global config as well
          config = { ...config, ...validUpdates };
        }
      },

      /**
       * Enable multi-window mode
       */
      // deno-lint-ignore require-await
      async enableMultiWindowMode(): Promise<void> {
        const core = Core.getInstance(config);
        core.enableMultiWindowMode();
        config = { ...config, multiWindowMode: true };
      },

      /**
       * Disable multi-window mode
       */
      // deno-lint-ignore require-await
      async disableMultiWindowMode(): Promise<void> {
        const core = Core.getInstance(config);
        core.disableMultiWindowMode();
        config = { ...config, multiWindowMode: false };
      },

      /**
       * Check if multi-window mode is enabled in config
       * @returns true if multiWindowMode config is true
       */
      // deno-lint-ignore require-await
      async isMultiWindowModeEnabled(): Promise<boolean> {
        const core = Core.getInstance(config);
        return core.isMultiWindowModeEnabled();
      },
    };
    // updatePluginStateはcore.tsに統合されたため、必要に応じてCoreクラス経由で呼び出し
  } catch (error) {
    // updatePluginStateはcore.tsに統合されたため、必要に応じてCoreクラス経由で呼び出し
    throw error;
  }
}

/**
 * 最適化されたヒント表示
 * オリジナルのdisplayHintsOptimized関数のラッパー
 * @param denops - Denops インスタンス
 * @param words - 対象の単語配列
 * @param hints - ヒント配列
 * @param config - プラグイン設定
 * @param extmarkNamespace - Neovim の extmark 名前空間（オプション）
 * @param fallbackMatchIds - matchadd のフォールバック ID 配列（オプション）
 */
export async function displayHintsOptimized(
  denops: Denops,
  words: Word[],
  hints: string[],
  config: Config,
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
): Promise<void> {
  const mappings = await displayHintsOptimizedInternal(
    denops,
    words,
    hints,
    config,
    extmarkNamespace,
    fallbackMatchIds,
    currentHints,
    { value: hintsVisible },
  );
  currentHints = mappings;
  hintsVisible = true;
}

/**
 * ヒントを非表示にする
 * @param denops - Denops インスタンス
 */
export async function hideHints(denops: Denops): Promise<void> {
  await hideHintsDisplay(
    denops,
    extmarkNamespace,
    fallbackMatchIds,
    { value: hintsVisible },
    currentHints,
  );
  hintsVisible = false;
  currentHints = [];
}

/**
 * 非同期で候補ヒントをハイライトする
 * @param denops - Denops インスタンス
 * @param input - 入力文字列
 * @param hints - ヒントマッピング配列
 * @param config - プラグイン設定
 * @param onComplete - 完了時のコールバック（オプション）
 */
export function highlightCandidateHintsAsync(
  denops: Denops,
  input: string,
  hints: HintMapping[],
  config: Config,
  onComplete?: () => void,
): void {
  highlightCandidateHintsAsyncInternal(
    denops,
    input,
    hints,
    config,
    extmarkNamespace,
    fallbackMatchIds,
    onComplete,
  );
}

// Re-export highlightCandidateHintsHybrid from display.ts
export { highlightCandidateHintsHybrid };

