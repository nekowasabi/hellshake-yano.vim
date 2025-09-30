/**
 * @fileoverview Hellshake-Yano.vim メインエントリーポイント
 */
import type { Denops } from "@denops/std";
import { generateHintsWithGroups } from "./hint.ts";
import { assignHintsToWords } from "./hint.ts";
import { Core } from "./core.ts";
import type { DebugInfo, HintMapping, Word } from "./types.ts";
import { Config, DEFAULT_CONFIG } from "./config.ts";

// 後方互換性のための型の再エクスポート
export type { Config, HighlightColor } from "./types.ts";
// テスト用関数の再エクスポート
export { getDefaultConfig } from "./config.ts";

// 新しいモジュールからのインポート
import {
  clearCaches,
  clearDebugInfo as clearDebugInfoPerformance,
  collectDebugInfo,
  detectWordsOptimized,
  generateHintsFromConfig,
  recordPerformance,
  resetPerformanceMetrics,
} from "./performance.ts";
import { validateConfig } from "./validation.ts";
import {
  getMinLengthForKey,
  getMotionCountForKey,
  normalizeBackwardCompatibleFlags,
  syncManagerConfig,
} from "./compatibility.ts";
import {
  addToDictionary,
  editDictionary,
  initializeDictionarySystem,
  reloadDictionary,
  showDictionary,
  validateDictionary,
} from "./dictionary.ts";
import {
  cleanupPendingTimers,
  displayHintsAsync,
  displayHintsOptimized as displayHintsOptimizedInternal,
  hideHints as hideHintsDisplay,
  highlightCandidateHintsAsync as highlightCandidateHintsAsyncInternal,
} from "./display.ts";

/** プラグインの設定 */
let config: Config = DEFAULT_CONFIG;

/** 現在のヒントのマッピング */
let currentHints: HintMapping[] = [];

/** ヒントが表示されているかどうか */
let hintsVisible = false;

/** Neovim の extmark 名前空間 */
let extmarkNamespace: number | undefined;

/** matchadd のフォールバック用 ID リスト */
let fallbackMatchIds: number[] = [];

// テスト用に関数を再エクスポート
export { getMinLengthForKey, getMotionCountForKey, normalizeBackwardCompatibleFlags };
export { detectWordsOptimized, generateHintsFromConfig, validateConfig };
export { cleanupPendingTimers, collectDebugInfo, syncManagerConfig };

// 後方互換性のためのエクスポート
export { clearDebugInfo } from "./performance.ts";

/**
 * プラグインのメインエントリーポイント
 * @param denops - Denops インスタンス
 * @throws {Error} プラグインの初期化に失敗した場合
 */
export async function main(denops: Denops): Promise<void> {
  try {
    // initializePluginはcore.tsに統合されているのでCoreクラス経由で呼び出し
    const core = Core.getInstance(DEFAULT_CONFIG);
    await core.initializePlugin(denops);

    // g:hellshake_yanoが未定義の場合は空のオブジェクトをフォールバック
    const userConfig = await denops.eval("g:hellshake_yano").catch(() => ({})) as Partial<
      Config
    >;
    const normalizedUserConfig = normalizeBackwardCompatibleFlags(userConfig);

    // Configを直接使用
    const defaultConfig = DEFAULT_CONFIG;
    config = { ...defaultConfig, ...normalizedUserConfig } as Config;

    // デバッグログ: 設定の内容を確認
    if (config.debug || config.debugMode) {
      console.log("[hellshake-yano] Configuration loaded:");
      console.log("  singleCharKeys:", config.singleCharKeys);
      console.log("  multiCharKeys:", config.multiCharKeys);
      console.log("  singleCharKeys type:", typeof config.singleCharKeys);
      console.log("  multiCharKeys type:", typeof config.multiCharKeys);

      // 記号の詳細な確認
      if (config.singleCharKeys && Array.isArray(config.singleCharKeys)) {
        const symbols = config.singleCharKeys.filter((k) => !k.match(/[A-Za-z0-9]/));
        if (symbols.length > 0) {
          console.log("  Symbols in singleCharKeys:", symbols);
          console.log("  Symbol characters (char codes):");
          symbols.forEach((s) => {
            console.log(`    "${s}" = ${s.charCodeAt(0)}`);
          });
        }
      }

      // ヒント生成のテスト
      const testHintConfig = {
        singleCharKeys: config.singleCharKeys,
        multiCharKeys: config.multiCharKeys,
        maxSingleCharHints: config.maxSingleCharHints,
      };
      const testHints = generateHintsWithGroups(15, testHintConfig);
      console.log("  Test hint generation (first 15):", testHints);
      const symbolHints = testHints.filter((h) => !h.match(/^[A-Za-z0-9]+$/));
      if (symbolHints.length > 0) {
        console.log("  Symbol hints generated:", symbolHints);
      }
    }

    // Coreインスタンスの設定を更新（use_japanese, enable_tinysegmenterなどが反映される）
    core.updateConfig(config);
    syncManagerConfig(config);

    if (denops.meta.host === "nvim") {
      extmarkNamespace = await denops.call("nvim_create_namespace", "hellshake-yano") as number;
    }

    await initializeDictionarySystem(denops);

    denops.dispatcher = {
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
          console.error("showHints error:", error);
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
          return generateHintsWithGroups(count, hintConfig);
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
          // 正規化を追加（snake_case -> camelCase変換）
          const normalizedConfig = normalizeBackwardCompatibleFlags(configUpdate);
          core.updateConfig(normalizedConfig);
          // グローバル設定も更新（直接Configを使用）
          config = { ...config, ...normalizedConfig };
          syncManagerConfig(config);
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
    };
    // updatePluginStateはcore.tsに統合されたため、必要に応じてCoreクラス経由で呼び出し
  } catch (error) {
    console.error("Plugin initialization failed:", error);
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

// 後方互換性のためのエクスポート（必要なもののみ）
export {
  generateHighlightCommand,
  isValidColorName,
  isValidHexColor,
  normalizeColorName,
  validateHighlightColor,
  validateHighlightConfig,
  validateHighlightGroupName,
} from "./validation.ts";

// 必要な追加のエクスポート
export { generateHintsOptimized } from "./performance.ts";
export {
  abortCurrentRendering,
  highlightCandidateHintsHybrid,
  isRenderingHints,
} from "./display.ts";
