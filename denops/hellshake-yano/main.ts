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
import type { DebugInfo, HintMapping, WindowInfo, Word } from "./types.ts";

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
import {
  detectWordsMultiWindow,
  detectWordsWithManager,
  type EnhancedWordConfig,
} from "./neovim/core/word.ts";
import { validateConfig } from "./config.ts";
import {
  addToDictionary,
  editDictionary,
  initializeDictionarySystem,
  isInDictionary,
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

// Phase 2.2: Vim display統合
import { VimPopupDisplay } from "./vim/display/popup-display.ts";

// Phase 2.3: Vim visual統合
import { VimVisual } from "./vim/features/visual.ts";

// Phase 3.1: Motion統合
import { VimMotionDetector, type KeyRepeatConfig } from "./vim/features/motion.ts";

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
    console.error(
      "main() initialization failed:",
      error instanceof Error ? error.message : String(error),
    );
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
    console.error(
      "initializeDenopsUnified failed:",
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

/**
 * TypeScript Word -> VimScript互換データへの変換
 */
function toVimWordData(word: Word): Record<string, unknown> {
  const encoder = new TextEncoder();
  const byteLen = encoder.encode(word.text).length;
  const col = word.byteCol ?? word.col; // byteCol 優先
  const result: Record<string, unknown> = {
    text: word.text,
    lnum: word.line, // キー名変換: line -> lnum
    col: col,
    end_col: col + byteLen,
  };
  if (word.winid !== undefined) result.winid = word.winid;
  if (word.bufnr !== undefined) result.bufnr = word.bufnr;
  return result;
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

    // Phase 2.2: Vim display統合 - VimPopupDisplay初期化
    const vimDisplay = new VimPopupDisplay(denops);

    // Phase 3.1: Motion統合 - VimMotionDetector初期化
    const motionDetector = new VimMotionDetector(
      config.motionTimeout ?? 2000,
      config.motionCount ?? 2
    );

    // Dispatcher登録（Vim環境用の最小実装）
    denops.dispatcher = {
      // 基本制御
      // deno-lint-ignore require-await
      async enable(): Promise<void> {
        const core = Core.getInstance(config);
        core.enable();
      },

      // deno-lint-ignore require-await
      async disable(): Promise<void> {
        const core = Core.getInstance(config);
        core.disable();
      },

      // deno-lint-ignore require-await
      async toggle(): Promise<void> {
        const core = Core.getInstance(config);
        core.toggle();
      },

      // 設定管理
      // deno-lint-ignore require-await
      async updateConfig(cfg: unknown): Promise<void> {
        if (typeof cfg === "object" && cfg !== null) {
          const core = Core.getInstance(config);
          const configUpdate = cfg as Partial<Config>;
          core.updateConfig(configUpdate);
          config = { ...config, ...configUpdate };
        }
      },

      // deno-lint-ignore require-await
      async getConfig(): Promise<Config> {
        return config;
      },

      // deno-lint-ignore require-await
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

      // deno-lint-ignore require-await
      async getStatistics(): Promise<unknown> {
        const core = Core.getInstance(config);
        return core.getStatistics();
      },

      // deno-lint-ignore require-await
      async debug(): Promise<DebugInfo> {
        const core = Core.getInstance(config);
        return core.collectDebugInfo();
      },

      // deno-lint-ignore require-await
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

      async isInDictionary(word: unknown): Promise<boolean> {
        if (typeof word === "string") {
          return await isInDictionary(denops, word);
        }
        return false;
      },

      // 1. detectWordsVisible: 画面内単語検出
      async detectWordsVisible(): Promise<Record<string, unknown>[]> {
        const startTime = performance.now();
        try {
          const result = await detectWordsWithManager(denops, config as EnhancedWordConfig);
          return result.words.map(toVimWordData);
        } catch (_error) {
          return []; // フォールバック: 空配列（VimScript側のローカル実装が使われる）
        } finally {
          recordPerformance("wordDetection", performance.now() - startTime);
        }
      },

      // 2. detectWordsMultiWindow: マルチウィンドウ単語検出
      async detectWordsMultiWindow(_windows: unknown): Promise<Record<string, unknown>[]> {
        const startTime = performance.now();
        try {
          const words = await detectWordsMultiWindow(denops, config as Config);
          return words.map(toVimWordData);
        } catch (_error) {
          return [];
        } finally {
          recordPerformance("wordDetectionMultiWindow", performance.now() - startTime);
        }
      },

      // 3. getMinWordLength: キー別最小単語長取得
      // deno-lint-ignore require-await
      async getMinWordLength(key: unknown): Promise<number> {
        if (typeof key !== "string") return 3;
        const perKey = config.perKeyMinLength;
        if (perKey && typeof perKey === "object" && key in perKey) {
          const val = (perKey as Record<string, number>)[key];
          if (typeof val === "number" && val > 0) return val;
        }
        return config.defaultMinWordLength ?? 3;
      },

      // Phase 1.3 Process 1: generateHints API追加
      // deno-lint-ignore require-await
      async generateHints(wordCount: unknown): Promise<string[]> {
        const startTime = performance.now();
        try {
          const count = typeof wordCount === "number" ? wordCount : 0;
          if (count <= 0) {
            return [];
          }
          const hintConfig = {
            singleCharKeys: config.singleCharKeys,
            multiCharKeys: config.multiCharKeys,
            maxSingleCharHints: config.maxSingleCharHints,
            useNumericMultiCharHints: config.useNumericMultiCharHints,
            markers: config.markers || ["a", "s", "d", "f"],
          };
          return generateHints(count, hintConfig);
        } finally {
          recordPerformance("hintGeneration", performance.now() - startTime);
        }
      },

      // Phase 2.2: Display統合メソッド

      // displayShowHint: 現在ウィンドウにヒント表示
      async displayShowHint(lnum: unknown, col: unknown, hint: unknown): Promise<number> {
        if (typeof lnum !== "number" || typeof col !== "number" || typeof hint !== "string") {
          return -1;
        }
        try {
          // screenpos()で論理座標を画面座標に変換（Vim popup_create()は画面座標を期待）
          const screen = await denops.call("screenpos", await denops.call("win_getid"), lnum, col) as { row: number; col: number };
          if (screen.row === 0 || screen.col === 0) {
            return -1; // 画面外
          }
          return await vimDisplay.showHint(screen.row, screen.col, hint);
        } catch {
          return -1;
        }
      },

      // displayShowHintWithWindow: 指定ウィンドウにヒント表示
      async displayShowHintWithWindow(winid: unknown, lnum: unknown, col: unknown, hint: unknown): Promise<number> {
        if (typeof winid !== "number" || typeof lnum !== "number" || typeof col !== "number" || typeof hint !== "string") {
          return -1;
        }
        try {
          // screenpos()で論理座標を画面座標に変換
          const screen = await denops.call("screenpos", winid, lnum, col) as { row: number; col: number };
          if (screen.row === 0 || screen.col === 0) {
            return -1; // 画面外
          }
          return await vimDisplay.showHint(screen.row, screen.col, hint);
        } catch {
          return -1;
        }
      },

      // displayHideAll: 全ヒント非表示
      async displayHideAll(): Promise<void> {
        await vimDisplay.hideAll();
      },

      // displayHighlightPartialMatches: 部分マッチハイライト
      async displayHighlightPartialMatches(matches: unknown): Promise<void> {
        if (!Array.isArray(matches)) return;
        const validMatches = matches.filter((m): m is string => typeof m === "string");
        await vimDisplay.highlightPartialMatches(validMatches);
      },

      // displayGetPopupCount: 表示中ヒント数（テスト用）
      // deno-lint-ignore require-await
      async displayGetPopupCount(): Promise<number> {
        return vimDisplay.getPopupCount();
      },

      // Phase 3.1: Motion統合メソッド

      // motionDetect: モーション連打検出
      // deno-lint-ignore require-await
      async motionDetect(
        motionKey: unknown,
        count: unknown,
        keyRepeatConfig: unknown
      ): Promise<{
        shouldShowHints: boolean;
        skipReason?: string;
        newCount: number;
      }> {
        if (typeof motionKey !== "string" || typeof count !== "number") {
          return { shouldShowHints: false, skipReason: "invalid_params", newCount: 0 };
        }

        // keyRepeatConfig の型検証
        const defaultKeyRepeatConfig: KeyRepeatConfig = {
          enabled: true,
          threshold: 50,
          resetDelay: 300,
        };

        let validConfig = defaultKeyRepeatConfig;
        if (typeof keyRepeatConfig === "object" && keyRepeatConfig !== null) {
          const cfg = keyRepeatConfig as Record<string, unknown>;
          validConfig = {
            enabled: typeof cfg.enabled === "boolean" ? cfg.enabled : true,
            threshold: typeof cfg.threshold === "number" ? cfg.threshold : 50,
            resetDelay: typeof cfg.resetDelay === "number" ? cfg.resetDelay : 300,
          };
        }

        return motionDetector.detectMotion(motionKey, count, validConfig);
      },

      // motionResetState: 状態リセット
      // deno-lint-ignore require-await
      async motionResetState(): Promise<void> {
        motionDetector.resetState();
      },

      // motionSetThreshold: 閾値設定
      // deno-lint-ignore require-await
      async motionSetThreshold(threshold: unknown): Promise<void> {
        if (typeof threshold === "number" && threshold > 0) {
          motionDetector.setThreshold(threshold);
        }
      },

      // motionSetTimeout: タイムアウト設定
      // deno-lint-ignore require-await
      async motionSetTimeout(timeoutMs: unknown): Promise<void> {
        if (typeof timeoutMs === "number" && timeoutMs > 0) {
          motionDetector.setTimeout(timeoutMs);
        }
      },

      // motionGetState: 現在状態取得（テスト用）
      // deno-lint-ignore require-await
      async motionGetState(): Promise<{
        lastMotion: string;
        lastMotionTime: number;
        motionCount: number;
        timeoutMs: number;
        threshold: number;
      }> {
        return motionDetector.getState();
      },

      // Phase 2.3: Visual統合メソッド

      // getVisualRange: ビジュアル選択範囲を取得
      async getVisualRange(): Promise<Record<string, unknown>> {
        try {
          const visual = new VimVisual(denops);
          const range = await visual.getVisualRange();
          return {
            mode: range.mode,
            start_line: range.startLine,
            start_col: range.startCol,
            end_line: range.endLine,
            end_col: range.endCol,
          };
        } catch (_error) {
          return {
            mode: "none",
            start_line: 0,
            start_col: 0,
            end_line: 0,
            end_col: 0,
          };
        }
      },

      // detectWordsInVisualRange: ビジュアル選択範囲内の単語検出
      async detectWordsInVisualRange(): Promise<Record<string, unknown>[]> {
        const startTime = performance.now();
        try {
          // 1. ビジュアル選択範囲を取得
          const visual = new VimVisual(denops);
          const range = await visual.getVisualRange();

          // 2. 全画面内の単語を検出
          const result = await detectWordsWithManager(denops, config as EnhancedWordConfig);

          // 3. 選択範囲内の単語のみにフィルタリング
          const filteredWords = VimVisual.filterWordsInRange(result.words, range);

          return filteredWords.map(toVimWordData);
        } catch (_error) {
          return [];
        } finally {
          recordPerformance("wordDetectionVisual", performance.now() - startTime);
        }
      },
    };
  } catch (error) {
    console.error(
      "initializeVimLayer failed:",
      error instanceof Error ? error.message : String(error),
    );
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
      extmarkNamespace = await denops.call(
        "nvim_create_namespace",
        "hellshake_yano_hints",
      ) as number;
    }

    await initializeDictionarySystem(denops);

    denops.dispatcher = {
      // deno-lint-ignore require-await
      async enable(): Promise<void> {
        const core = Core.getInstance(config);
        core.enable();
      },

      // deno-lint-ignore require-await
      async disable(): Promise<void> {
        const core = Core.getInstance(config);
        core.disable();
      },

      // deno-lint-ignore require-await
      async toggle(): Promise<void> {
        const core = Core.getInstance(config);
        core.toggle();
      },

      // deno-lint-ignore require-await
      async setCount(count: unknown): Promise<void> {
        if (typeof count === "number") {
          const core = Core.getInstance(config);
          core.setMotionThreshold(count);
        }
      },

      // deno-lint-ignore require-await
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

      // deno-lint-ignore require-await
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

      // deno-lint-ignore require-await
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

      // deno-lint-ignore require-await
      async getDebugInfo(): Promise<DebugInfo> {
        return collectDebugInfo(hintsVisible, currentHints, config);
      },

      // deno-lint-ignore require-await
      async clearDebugInfo(): Promise<void> {
        clearDebugInfoPerformance();
      },

      // deno-lint-ignore require-await
      async getConfig(): Promise<Config> {
        return config;
      },

      // deno-lint-ignore require-await
      async validateConfig(cfg: unknown): Promise<{ valid: boolean; errors: string[] }> {
        return validateConfig(cfg as Partial<Config>);
      },

      async healthCheck(): Promise<void> {
        const core = Core.getInstance(config);
        await core.getHealthStatus(denops);
      },

      // deno-lint-ignore require-await
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

      async isInDictionary(word: unknown): Promise<boolean> {
        if (typeof word === "string") {
          return await isInDictionary(denops, word);
        }
        return false;
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

      // deno-lint-ignore require-await
      async updateConfig(cfg: unknown): Promise<void> {
        if (typeof cfg === "object" && cfg !== null) {
          const core = Core.getInstance(config);
          const configUpdate = cfg as Partial<Config>;
          core.updateConfig(configUpdate);
          // グローバル設定も更新（直接Configを使用）
          config = { ...config, ...configUpdate };
        }
      },

      // deno-lint-ignore require-await
      async clearCache(): Promise<void> {
        const core = Core.getInstance(config);
        core.clearCache();
        clearCaches();
      },

      // deno-lint-ignore require-await
      async debug(): Promise<DebugInfo> {
        const core = Core.getInstance(config);
        return core.collectDebugInfo();
      },

      // deno-lint-ignore require-await
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
              (t): t is string => typeof t === "string",
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

      // 1. detectWordsVisible: 画面内単語検出
      async detectWordsVisible(): Promise<Record<string, unknown>[]> {
        const startTime = performance.now();
        try {
          const result = await detectWordsWithManager(denops, config as EnhancedWordConfig);
          return result.words.map((word: Word) => {
            const encoder = new TextEncoder();
            const byteLen = encoder.encode(word.text).length;
            const col = word.byteCol ?? word.col;
            const resultData: Record<string, unknown> = {
              text: word.text,
              lnum: word.line,
              col: col,
              end_col: col + byteLen,
            };
            if (word.winid !== undefined) resultData.winid = word.winid;
            if (word.bufnr !== undefined) resultData.bufnr = word.bufnr;
            return resultData;
          });
        } catch (_error) {
          return [];
        } finally {
          recordPerformance("wordDetection", performance.now() - startTime);
        }
      },

      // 2. detectWordsMultiWindow: マルチウィンドウ単語検出
      async detectWordsMultiWindow(_windows: unknown): Promise<Record<string, unknown>[]> {
        const startTime = performance.now();
        try {
          const words = await detectWordsMultiWindow(denops, config as Config);
          return words.map((word: Word) => {
            const encoder = new TextEncoder();
            const byteLen = encoder.encode(word.text).length;
            const col = word.byteCol ?? word.col;
            const resultData: Record<string, unknown> = {
              text: word.text,
              lnum: word.line,
              col: col,
              end_col: col + byteLen,
            };
            if (word.winid !== undefined) resultData.winid = word.winid;
            if (word.bufnr !== undefined) resultData.bufnr = word.bufnr;
            return resultData;
          });
        } catch (_error) {
          return [];
        } finally {
          recordPerformance("wordDetectionMultiWindow", performance.now() - startTime);
        }
      },

      // 3. getMinWordLength: キー別最小単語長取得
      // deno-lint-ignore require-await
      async getMinWordLength(key: unknown): Promise<number> {
        if (typeof key !== "string") return 3;
        const perKey = config.perKeyMinLength;
        if (perKey && typeof perKey === "object" && key in perKey) {
          const val = (perKey as Record<string, number>)[key];
          if (typeof val === "number" && val > 0) return val;
        }
        return config.defaultMinWordLength ?? 3;
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
