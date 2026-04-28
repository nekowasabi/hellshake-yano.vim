/* * Hellshake-Yano Core Class * Phase1: 基盤作成
 * プラグインの中核となるロジックを統合管理するCoreクラス
 * TDD Red-Green-Refactor方法論に従って実装 */
import type { Denops } from "@denops/std";
import { type CacheStatistics, LRUCache } from "../../cache.ts";
// [DEBUG-METRIC] Point A 用: 既存 logger インフラ再利用（新規 logger 作成禁止方針）
import { getDebugMode, logMessage } from "../../common/utils/logger.ts";
import type { Config } from "../../types.ts";
import { DEFAULT_CONFIG, getDefaultConfig, mergeConfig, validateConfig } from "../../config.ts";
import type {
  CommandObject,
  ConfigManager,
  Controller,
  CoreState,
  DebugController,
  DebugInfo,
  DetectionContext,
  EnhancedConfig,
  ExtendedDebugInfo,
  HealthCheckResult,
  HighlightColor,
  HintKeyConfig,
  HintMapping,
  HintOperations,
  HintOperationsDependencies,
  InitializeOptions,
  InitializeResult,
  PerformanceMetrics,
  PerformanceStats,
  PluginStatistics,
  WindowInfo,
  Word,
  WordDetectionResult,
} from "../../types.ts";
import type { EnhancedWordConfig } from "./word.ts";
import { detectWordsWithConfig, detectWordsWithManager } from "./word.ts";
import { TinySegmenter } from "./word/word-segmenter.ts";
import type { SegmentationResult } from "./word/word-segmenter.ts";
import {
  assignHintsToWords,
  filterWordsByDirection,
  generateHints,
  OVERLAP_SKIP_OPTS,
  resolveDirectionalContext,
  validateHintKeyConfig,
} from "./hint.ts";
import {
  DictionaryLoader,
  HintPatternProcessor,
  type UserDictionary,
  VimConfigBridge,
} from "./word.ts";
import {
  isControlCharacter,
  isValidColorName,
  isValidHexColor,
  validateHighlightColor,
  validateHighlightGroupName,
} from "../../validation-utils.ts";
import { callAtomic } from "../../common/utils/batch.ts";
import { MULTI_BUFFER_EXTMARK_STATE } from "../display/extmark-display.ts";

/** Neovim extmark namespace name */
const EXTMARK_NAMESPACE = "hellshake_yano_hints";
const CORE_TEXT_ENCODER = new TextEncoder();

// Why: hot path (hideHintsOptimized の nvim_buf_clear_namespace) で連続失敗が起きた際に、
//   ERROR レベルログが debug flag 非依存で常時出力されるためログ氾濫を招く。
//   モジュールスコープのカウンタで初回 + N 回ごとに間引くことで検知能力を維持しつつ抑制する。
//   cleanupPlugin でリセットすることで pluginState ライフサイクルと整合させる。
let extmarkClearErrorCount = 0;
const EXTMARK_ERROR_LOG_INTERVAL = 100;

/**
 * RC-1 (PLAN-followup-cycle3 Process 03): getline キャッシュヒット率の累積計測。
 * Why: 単発の cacheHit ログだけでは長期傾向 (キャッシュ無効化頻度) が見えない。
 *      hits / (hits+misses) を 100 回ごとに集計し、cache miss 理由も併記することで
 *      mitigation 設計 (Process 04 viewport 切替) の効果検証材料とする。
 *      debugMode 配下のみで動作し、hot path はゼロコスト。
 */
let getlineCacheHitCount = 0;
let getlineCacheMissCount = 0;
let getlineCacheLastMissReason: string = "";
const GETLINE_CACHE_REPORT_INTERVAL = 100;
export const VIEWPORT_GETLINE_THRESHOLD = 5000;

/** テスト用: getline cache 計測カウンタをリセット */
export function resetGetlineCacheStats(): void {
  getlineCacheHitCount = 0;
  getlineCacheMissCount = 0;
  getlineCacheLastMissReason = "";
}

/** テスト用: getline cache 計測カウンタを取得 */
export function getGetlineCacheStats(): {
  hits: number;
  misses: number;
  lastMissReason: string;
} {
  return {
    hits: getlineCacheHitCount,
    misses: getlineCacheMissCount,
    lastMissReason: getlineCacheLastMissReason,
  };
}

export function resolveGetlineScope(
  totalLineCount: number,
  viewportStart: number,
  viewportEnd: number,
): { scope: "full" | "viewport"; startLine: number; endLine: number } {
  if (totalLineCount >= VIEWPORT_GETLINE_THRESHOLD) {
    return {
      scope: "viewport",
      startLine: Math.max(1, viewportStart),
      endLine: Math.max(viewportStart, viewportEnd),
    };
  }
  return { scope: "full", startLine: 1, endLine: totalLineCount };
}

/**
 * @param threshold
 * @param timeoutMs
 */
class MotionCounter {
  private count = 0;
  private lastMotionTime = 0;
  private timeoutMs: number;
  private threshold: number;
  private onThresholdReached?: () => void;
  constructor(threshold = 3, timeoutMs = 2000, onThresholdReached?: () => void) {
    this.threshold = threshold;
    this.timeoutMs = timeoutMs;
    this.onThresholdReached = onThresholdReached;
  }
  increment(): boolean {
    const now = Date.now();
    if (this.lastMotionTime && now - this.lastMotionTime > this.timeoutMs) this.count = 0;
    this.count++;
    this.lastMotionTime = now;
    if (this.count >= this.threshold) {
      if (this.onThresholdReached) this.onThresholdReached();
      this.count = 0;
      return true;
    }
    return false;
  }
  getCount(): number {
    return this.count;
  }
  reset(): void {
    this.count = 0;
    this.lastMotionTime = 0;
  }
}
/** */
class MotionManager {
  private counters = new Map<number, MotionCounter>();
  getCounter(bufnr: number, threshold?: number, timeout?: number): MotionCounter {
    if (!this.counters.has(bufnr)) this.counters.set(bufnr, new MotionCounter(threshold, timeout));
    return this.counters.get(bufnr)!;
  }
  resetCounter(bufnr: number): void {
    const counter = this.counters.get(bufnr);
    if (counter) counter.reset();
  }
  clearAll(): void {
    this.counters.clear();
  }
}
/**
 * @param config
 */
class CommandFactory {
  constructor(private config: Config) {}
  createCommand(command: string): CommandObject {
    return { command, config: this.config };
  }
  getController(): Controller {
    const core = Core.getInstance(this.config);
    return {
      enable: () => core.enable(),
      disable: () => core.disable(),
      toggle: () => core.toggle(),
    };
  }
  getConfigManager(): ConfigManager {
    return {
      getConfig: () => this.config,
      updateConfig: (newConfig: Partial<Config>) => {
        Object.assign(this.config, newConfig);
      },
      setCount: (count: number) => {
        this.config.motionCount = count;
      },
      setTimeout: (timeout: number) => {
        this.config.motionTimeout = timeout;
      },
    };
  }
  getDebugController(): DebugController {
    return {
      getStatistics: () => Core.getInstance(this.config).getStatistics(),
      clearCache: () => Core.getInstance(this.config).clearCache(),
      toggleDebugMode: () => {
        this.config.debugMode = !this.config.debugMode;
      },
    };
  }
}
/** */
export const HIGHLIGHT_BATCH_SIZE = 15;
export const HYBRID_SYNC_BATCH_SIZE = 15;

const DEFAULT_SINGLE_KEYS = [
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
const DEFAULT_MULTI_KEYS = [
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
];

function normalizeCancelKey(result: number | string): string | null {
  if (typeof result === "string") {
    return result === "\r" ? "<CR>" : (/^[A-Za-z]$/.test(result) ? result.toUpperCase() : result);
  }
  if (result === 13) {
    return "<CR>";
  }
  if (result >= 32 && result <= 126) {
    const char = String.fromCharCode(result);
    return /^[A-Za-z]$/.test(char) ? char.toUpperCase() : char;
  }
  return null;
}

function isConfiguredCancelKey(result: number | string, cancelKeys?: string[]): boolean {
  if (!cancelKeys || cancelKeys.length === 0) {
    return false;
  }
  const normalized = normalizeCancelKey(result);
  if (normalized === null) {
    return false;
  }
  const configured = cancelKeys.map((key) =>
    key === "\r" ? "<CR>" : (/^[A-Za-z]$/.test(key) ? key.toUpperCase() : key)
  );
  return configured.includes(normalized);
}

interface PluginState {
  /** プラグインの現在のステータス */
  status: "uninitialized" | "initialized" | "cleaned";
  /** 初期化済みフラグ */
  initialized: boolean;
  /** ヘルスステータス */
  healthy: boolean;
  /** ヒント表示状態 */
  hintsVisible: boolean;
  /** 現在のヒントマッピング配列 */
  currentHints: HintMapping[];
  /** キャッシュオブジェクト */
  caches: {
    words: LRUCache<string, Word[]>;
    hints: LRUCache<string, string[]>;
  };
  /** パフォーマンスメトリクス */
  performanceMetrics: PerformanceMetrics;
}
/** */
let pluginState: PluginState = {
  status: "uninitialized",
  initialized: false,
  healthy: true,
  hintsVisible: false,
  currentHints: [],
  caches: {
    words: new LRUCache<string, Word[]>(100),
    hints: new LRUCache<string, string[]>(50),
  },
  performanceMetrics: {
    showHints: [],
    hideHints: [],
    wordDetection: [],
    hintGeneration: [],
  },
};
/** */
/** */
function initializePlugin(denops: Denops, options?: InitializeOptions): Promise<InitializeResult> {
  pluginState.status = "initialized";
  pluginState.initialized = true;
  if (options?.cacheSizes) {
    if (options.cacheSizes.words) {
      pluginState.caches.words = new LRUCache<string, Word[]>(options.cacheSizes.words);
    }
    if (options.cacheSizes.hints) {
      pluginState.caches.hints = new LRUCache<string, string[]>(options.cacheSizes.hints);
    }
  }
  return Promise.resolve({
    extmarkNamespace: null,
    caches: pluginState.caches,
  });
}
function cleanupPlugin(denops: Denops): Promise<void> {
  pluginState.status = "cleaned";
  pluginState.initialized = false;
  pluginState.hintsVisible = false;
  pluginState.caches.words.clear();
  pluginState.caches.hints.clear();
  // Why: pushPerformanceMetric() 経由で debugMode 有効時のみ蓄積されるが、
  //   cleanup 時にリセットしないと debug 長期セッションで配列が無制限に成長する。
  //   pluginState.performanceMetrics の 4 配列を空配列に置換することで潜在的リークを防止。
  pluginState.performanceMetrics.showHints = [];
  pluginState.performanceMetrics.hideHints = [];
  pluginState.performanceMetrics.wordDetection = [];
  pluginState.performanceMetrics.hintGeneration = [];
  // Why: pluginState ライフサイクルと連続失敗カウンタを整合させる。
  //   再 initialize 後の最初の失敗を確実に観測するため、cleanup 時にリセットする。
  extmarkClearErrorCount = 0;
  // Why: getline cache 統計も pluginState ライフサイクルと整合させる。
  //   再初期化後の長期傾向を独立して計測できるようにするため、cleanup 時にリセット。
  getlineCacheHitCount = 0;
  getlineCacheMissCount = 0;
  getlineCacheLastMissReason = "";
  return Promise.resolve();
}
/** */
function healthCheck(denops: Denops): Promise<HealthCheckResult> {
  return Promise.resolve({
    healthy: true,
    issues: [],
    recommendations: [],
  });
}
/** */
/** */
function getPluginStatistics(): PluginStatistics {
  const calculateStats = (metrics: number[]): PerformanceStats => {
    if (metrics.length === 0) {
      return { count: 0, average: 0, max: 0, min: 0 };
    }
    const count = metrics.length;
    const sum = metrics.reduce((a, b) => a + b, 0);
    const average = sum / count;
    const max = Math.max(...metrics);
    const min = Math.min(...metrics);
    return { count, average, max, min };
  };
  return {
    cacheStats: {
      words: pluginState.caches.words.getStats
        ? pluginState.caches.words.getStats()
        : { hits: 0, misses: 0, size: 0, maxSize: 0, hitRate: 0 },
      hints: pluginState.caches.hints.getStats
        ? pluginState.caches.hints.getStats()
        : { hits: 0, misses: 0, size: 0, maxSize: 0, hitRate: 0 },
    },
    performanceStats: {
      showHints: calculateStats(pluginState.performanceMetrics.showHints),
      hideHints: calculateStats(pluginState.performanceMetrics.hideHints),
      wordDetection: calculateStats(pluginState.performanceMetrics.wordDetection),
      hintGeneration: calculateStats(pluginState.performanceMetrics.hintGeneration),
    },
    currentState: {
      initialized: pluginState.initialized,
      hintsVisible: pluginState.hintsVisible,
      currentHintsCount: pluginState.currentHints ? pluginState.currentHints.length : 0,
    },
  };
}
function updatePluginState(updates: Partial<PluginState>): void {
  Object.assign(pluginState, updates);
}
function getPluginState(): PluginState {
  return pluginState;
}
function enable(config: Config): void {
  config.enabled = true;
}
function disable(config: Config): void {
  config.enabled = false;
}
function toggle(config: Config): boolean {
  config.enabled = !config.enabled;
  return config.enabled;
}
function setCount(config: Config, count: number): void {
  config.motionCount = count;
}
function setTimeoutCommand(config: Config, timeout: number): void {
  config.motionTimeout = timeout;
}
/** */
export class Core {
  /** シングルトンインスタンス */
  private static instance: Core | null = null;
  /** プラグインの設定 */
  private config: Config;
  /** プラグインのアクティブ状態 */
  private isActive: boolean = false;
  /** 現在表示中のヒントマッピング */
  private currentHints: HintMapping[] = [];
  /** パフォーマンス測定のメトリクス */
  private performanceMetrics: PerformanceMetrics = {
    showHints: [],
    hideHints: [],
    wordDetection: [],
    hintGeneration: [],
  };
  /** 辞書システムのローダー */
  private dictionaryLoader: DictionaryLoader | null = null;
  /** Vim設定ブリッジ */
  private vimConfigBridge: VimConfigBridge | null = null;
  /** キャッシュ済み辞書データ (applyHintPatterns で参照) */
  // Why: loadedDict をインスタンスに保持。理由: initializeDictionarySystem で 1 回ロードした辞書を
  //   showHintsInternal から毎回アクセス可能にするため。再ロードは reload 時のみ発生。
  private cachedDictionary: UserDictionary | null = null;
  /** HintPatternProcessor の遅延初期化インスタンス */
  // Why: new HintPatternProcessor() を showHintsInternal 呼び出しごとに生成するのではなく
  //   1 回だけ生成して再利用。理由: applyHintPatterns はステートレスなので使い回し可能。
  private hintPatternProcessor: HintPatternProcessor | null = null;
  /** ヒント描画中かどうかの状態 */
  private _isRenderingHints: boolean = false;
  /** 描画処理を中断するためのAbortController */
  private _renderingAbortController: AbortController | null = null;
  /** ペンディング中のハイライトタイマー */
  private _pendingHighlightTimer: number | null = null;
  /** モーションカウンターの管理クラス */
  private motionManager: MotionManager = new MotionManager();
  /** 連続ヒントモードが現在有効かどうか */
  private continuousModeActive = false;
  /** 現在の連続ジャンプ回数 */
  private continuousJumpCount = 0;
  /** 直近のジャンプが発生したバッファ番号 */
  private lastJumpBufnr: number | null = null;
  /** バッファ行キャッシュ — changedtick 一致時に getline RPC をスキップ */
  // Why: showHints 毎に getline(1,"$") が 300-600ms の RPC 転送を発生させるため、
  //   changedtick 連動の配列キャッシュでスキップする。copy しない（mutate しない前提）。
  private cachedBuffer: {
    bufnr: number;
    changedtick: number;
    lines: string[];
    startLine: number;
    endLine: number;
    scope: "full" | "viewport";
  } | null = null;
  private constructor(config?: Partial<Config>) {
    this.config = { ...getDefaultConfig(), ...config };
  }
  public static getInstance(config?: Partial<Config>): Core {
    if (!Core.instance) {
      Core.instance = new Core(config);
    }
    return Core.instance;
  }
  public static resetForTesting(): void {
    Core.instance = null;
  }
  reset(): void {
    Core.instance = null;
  }
  async initialize(denops: Denops, options?: InitializeOptions): Promise<void> {
    try {
      await initializePlugin(denops, options || {});
    } catch (error) {
      throw error;
    }
  }
  async cleanup(denops?: Denops): Promise<void> {
    try {
      if (denops) {
        await cleanupPlugin(denops);
      }
      if (this._renderingAbortController) {
        this._renderingAbortController.abort();
      }
      this._isRenderingHints = false;
      this._renderingAbortController = null;
      if (this._pendingHighlightTimer !== null) {
        clearTimeout(this._pendingHighlightTimer);
        this._pendingHighlightTimer = null;
      }
    } catch (error) {
      console.error("[hellshake-yano] Core: Cleanup failed:", error);
    }
  }
  async getHealthStatus(denops: Denops): Promise<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      const result = await healthCheck(denops);
      return result;
    } catch (error) {
      return {
        healthy: false,
        issues: [`Health check error: ${error instanceof Error ? error.message : String(error)}`],
        recommendations: ["Try reinitializing the plugin"],
      };
    }
  }
  getStatistics(): {
    cacheStats: { words: CacheStatistics; hints: CacheStatistics };
    performanceStats: {
      showHints: { count: number; average: number; max: number; min: number };
      hideHints: { count: number; average: number; max: number; min: number };
      wordDetection: { count: number; average: number; max: number; min: number };
      hintGeneration: { count: number; average: number; max: number; min: number };
    };
    currentState: { initialized: boolean; hintsVisible: boolean; currentHintsCount: number };
  } {
    try {
      return getPluginStatistics();
    } catch (error) {
      console.error("[hellshake-yano] Core: Get statistics failed:", error);
      return {
        cacheStats: {
          words: { size: 0, maxSize: 0, hitRate: 0, hits: 0, misses: 0 },
          hints: { size: 0, maxSize: 0, hitRate: 0, hits: 0, misses: 0 },
        },
        performanceStats: {
          showHints: { count: 0, average: 0, max: 0, min: 0 },
          hideHints: { count: 0, average: 0, max: 0, min: 0 },
          wordDetection: { count: 0, average: 0, max: 0, min: 0 },
          hintGeneration: { count: 0, average: 0, max: 0, min: 0 },
        },
        currentState: { initialized: false, hintsVisible: false, currentHintsCount: 0 },
      };
    }
  }
  updateState(updates: Partial<PluginState>): void {
    try {
      updatePluginState(updates);
    } catch (error) {
      console.error("[hellshake-yano] Core: Update state failed:", error);
    }
  }
  recordPerformanceMetric(operation: string, duration: number): void {
    try {
      const state = getPluginState();
      if (state.performanceMetrics[operation as keyof typeof state.performanceMetrics]) {
        state.performanceMetrics[operation as keyof typeof state.performanceMetrics].push(duration);
      }
    } catch (error) {
      console.error("[hellshake-yano] Core: Record performance metric failed:", error);
    }
  }
  getConfig(): Config {
    return { ...this.config };
  }
  updateConfig(newConfig: Partial<Config>): void {
    if (newConfig.motionCounterThreshold !== undefined && newConfig.motionCounterThreshold <= 0) {
      throw new Error("threshold must be greater than 0");
    }
    if (newConfig.motionCounterTimeout !== undefined && newConfig.motionCounterTimeout <= 0) {
      throw new Error("timeout must be greater than 0");
    }

    // mergeConfig を使用して Vim の数値真偽値を正規化
    this.config = mergeConfig(this.config, newConfig);
  }
  isEnabled(): boolean {
    return this.config.enabled;
  }
  isHintsVisible(): boolean {
    return this.isActive && this.currentHints.length > 0;
  }
  getContinuousJumpCount(): number {
    return this.continuousJumpCount;
  }
  private resetContinuousModeState(): void {
    this.continuousModeActive = false;
    this.continuousJumpCount = 0;
    this.lastJumpBufnr = null;
  }
  private async executeRecenterCommand(denops: Denops): Promise<void> {
    const command = this.config.recenterCommand?.trim() || "normal! zz";
    if (!command) {
      return;
    }
    try {
      await denops.cmd(command);
    } catch (error) {
      console.error("[hellshake-yano] Core: Recenter command failed", error);
      throw error;
    }
  }
  detectWords(context?: DetectionContext): WordDetectionResult {
    return {
      words: [],
      detector: "minimal",
      success: true,
      performance: {
        duration: 0,
        wordCount: 0,
        linesProcessed: 0,
      },
    };
  }
  generateHints(words: Word[]): HintMapping[] {
    return [];
  }
  showHintsLegacy(hints: HintMapping[]): void {
    if (!this.isEnabled()) {
      return;
    }
    this.currentHints = [...hints];
    this.isActive = true;
  }
  hideHints(): void {
    this.currentHints = [];
    this.isActive = false;
  }
  async hideHintsOptimized(denops: Denops): Promise<void> {
    try {
      this.currentHints = [];
      this.isActive = false;
      if (this._renderingAbortController) {
        this._renderingAbortController.abort();
      }
      const bufnr = await denops.call("bufnr", "%") as number;
      if (bufnr === -1) {
        return;
      }

      if (denops.meta.host === "nvim") {
        try {
          const extmarkNamespace = await denops.call(
            "nvim_create_namespace",
            EXTMARK_NAMESPACE,
          ) as number;
          // Why: show/hide サイクル繰り返しで nvim_buf_clear_namespace の所要時間が
          //   増加するか実測するための timing 計測。debugMode 配下でのみ評価することで
          //   通常 path のオーバーヘッドをゼロに保つ (early evaluate)。
          const isDebug = getDebugMode();
          const clearStart = isDebug ? performance.now() : 0;
          await denops.call("nvim_buf_clear_namespace", bufnr, extmarkNamespace, 0, -1);
          if (isDebug) {
            const duration = performance.now() - clearStart;
            logMessage(
              "DEBUG",
              "hellshake-yano:perf",
              `clearNamespace: ${duration.toFixed(2)}ms`,
            );
          }
        } catch (error) {
          // Why: 空 catch でエラー握り潰しを止め、ERROR レベルで可視化する。
          //   ただし hot path のため連続失敗時のログ氾濫を防ぐべく
          //   初回 + EXTMARK_ERROR_LOG_INTERVAL 回ごとに間引いて出力する。
          extmarkClearErrorCount++;
          if (
            extmarkClearErrorCount === 1 ||
            extmarkClearErrorCount % EXTMARK_ERROR_LOG_INTERVAL === 0
          ) {
            logMessage(
              "ERROR",
              "hellshake-yano",
              `Failed to clear extmarks: ${String(error)}`,
            );
          }
        }
      } else {
        try {
          const matches = await denops.call("getmatches") as Array<{ id: number; group: string }>;
          for (const match of matches) {
            if (match.group === "HellshakeYanoMarker" || match.group.startsWith("HellshakeYano")) {
              await denops.call("matchdelete", match.id);
            }
          }
        } catch (error) {
        }
      }
    } catch (error) {
    }
  }
  /*   * sub2-5-4: clearCache - キャッシュをクリア   * main.ts のキャッシュクリア機能をCoreクラスに移植
   * 内部状態とヒントをリセットする   */
  clearCache(): void {
    try {
      this.currentHints = [];
      this.isActive = false;
      if (this._renderingAbortController) {
        this._renderingAbortController.abort();
      }
      this.clearDebugInfo();
      if (this.dictionaryLoader) {
      }
    } catch (error) {
    }
  }

  /**
   * Invalidate the buffer line cache for the given bufnr (or unconditionally).
   * Called from TextChanged / TextChangedI / BufLeave autocmd to ensure
   * stale cache is never reused after an edit.
   *
   * Why: changedtick alone can miss same-tick edits in edge cases;
   *      explicit invalidation via autocmd guarantees correctness.
   */
  invalidateBufferCache(bufnr?: number): void {
    if (bufnr !== undefined) {
      if (this.cachedBuffer?.bufnr === bufnr) {
        this.cachedBuffer = null;
      }
    } else {
      this.cachedBuffer = null;
    }
  }
  /*   * 現在のヒント一覧を取得   * @returns 現在表示中のヒントマッピング配列
   */
  getCurrentHints(): HintMapping[] {
    return [...this.currentHints];
  }
  /*   * Phase2: 状態管理の移行 - 現在の状態を取得   * @returns 現在のCoreState
   */
  getState(): CoreState {
    return {
      config: { ...this.config },
      currentHints: [...this.currentHints],
      hintsVisible: this.isHintsVisible(),
      isActive: this.isActive,
    };
  }
  /*   * Phase2: 状態管理の移行 - 状態を設定   * @param state 新しいCoreState
   */
  setState(state: CoreState): void {
    this.config = { ...state.config };
    this.currentHints = [...state.currentHints];
    this.isActive = state.isActive;
    if (state.hintsVisible && state.currentHints.length === 0) {
      this.isActive = true;
    }
  }
  /*   * Phase2: 状態管理の移行 - 状態を初期化
   */
  initializeState(): void {
    this.isActive = false;
    this.currentHints = [];
  }
  /*   * 指定されたキーの最小文字数を取得   * @param key - 対象のキー
   * @returns 最小文字数
   */
  private getMinLengthForKey(key: string): number {
    const unifiedConfig = this.config; // 既にConfig形式
    if (unifiedConfig.perKeyMinLength && unifiedConfig.perKeyMinLength[key] !== undefined) {
      return unifiedConfig.perKeyMinLength[key];
    }
    return unifiedConfig.defaultMinWordLength || 1;
  }
  /*   * 単語検出用のEnhancedWordConfigを作成   * @returns 単語検出に最適化された設定オブジェクト
   */
  private createEnhancedWordConfig(): EnhancedWordConfig {
    return {
      strategy: this.config.wordDetectionStrategy,
      useJapanese: this.config.useJapanese,
      enableTinySegmenter: this.config.enableTinySegmenter,
      segmenterThreshold: this.config.segmenterThreshold,
      cacheEnabled: true,
      autoDetectLanguage: true,
      // キャッシュに必要な設定を追加
      currentKeyContext: this.config.currentKeyContext,
      perKeyMinLength: this.config.perKeyMinLength,
      defaultMinWordLength: this.config.defaultMinWordLength,
      minWordLength: this.config.bothMinWordLength,
    };
  }
  /*   * Phase4: 単語検出機能の移行 - 最適化された単語検出   * キャッシュを使用して高速に単語を検出する
   * main.tsのdetectWordsOptimized関数と同等の機能を提供
   *   * @param bufnr - バッファ番号
   * @returns 検出された単語の配列
   */
  async detectWordsOptimized(denops: Denops, bufnr: number): Promise<Word[]> {
    try {
      const enhancedConfig = this.createEnhancedWordConfig();
      const context = this.config.currentKeyContext
        ? {
          minWordLength: this.getMinLengthForKey(this.config.currentKeyContext),
        }
        : undefined;
      const result = await detectWordsWithManager(denops, enhancedConfig, context);

      if (result.success) {
        return result.words;
      } else {
        return await this.fallbackWordDetection(denops);
      }
    } catch (error) {
      return await this.fallbackWordDetection(denops);
    }
  }
  /*   * フォールバック用の単語検出
   *   * @returns 検出された単語の配列
   */
  private async fallbackWordDetection(denops: Denops): Promise<Word[]> {
    const fallbackConfig = {
      useJapanese: this.config.useJapanese,
    };
    return await detectWordsWithConfig(denops, fallbackConfig);
  }
  /* Phase5: ヒント生成機能の移行 - 最適化されたヒント生成   * main.tsのgenerateHintsOptimized関数の機能をCoreクラスに統合した実装。 */
  generateHintsOptimized(wordCount: number, markers: string[]): string[] {
    if (wordCount < 0) {
      throw new Error("wordCount must be non-negative");
    }

    if (wordCount === 0) {
      return [];
    }
    const unifiedConfig = this.config; // 既にConfig形式
    if (unifiedConfig.singleCharKeys || unifiedConfig.multiCharKeys) {
      const hintConfig: HintKeyConfig = {
        singleCharKeys: unifiedConfig.singleCharKeys,
        multiCharKeys: unifiedConfig.multiCharKeys,
        markers: markers.length > 0 ? markers : undefined,
        maxSingleCharHints: unifiedConfig.maxSingleCharHints,
        useNumericMultiCharHints: unifiedConfig.useNumericMultiCharHints,
      };
      const validation = validateHintKeyConfig(hintConfig);
      if (!validation.valid && validation.errors) {
        return generateHints(wordCount, markers);
      }
      return generateHints(wordCount, {
        groups: true,
        singleCharKeys: hintConfig.singleCharKeys,
        multiCharKeys: hintConfig.multiCharKeys,
        maxSingleCharHints: hintConfig.maxSingleCharHints,
        useNumericMultiCharHints: hintConfig.useNumericMultiCharHints,
        markers: hintConfig.markers,
      });
    }
    return generateHints(wordCount, markers);
  }
  /* Phase6: 表示処理系の移行 - 最適化されたヒント表示   * main.tsのdisplayHintsOptimized関数の機能をCoreクラスに統合した実装。 */
  async displayHintsOptimized(
    denops: Denops,
    hints: HintMapping[],
    mode: string = "normal",
    signal?: AbortSignal,
  ): Promise<void> {
    try {
      const bufnr = await denops.call("bufnr", "%") as number;
      if (bufnr === -1) {
        throw new Error("Invalid buffer: no current buffer available");
      }
      const readonly = await denops.call("getbufvar", bufnr, "&readonly") as number;
      if (readonly) {
      }
      if (signal?.aborted) {
        return;
      }

      if (denops.meta.host === "nvim") {
        await this.displayHintsWithExtmarksBatch(denops, bufnr, hints, mode, signal);
      } else {
        await this.displayHintsWithMatchAddBatch(denops, hints, mode, signal);
      }
    } catch (error) {
      await this.displayHintsWithMatchAddBatch(denops, hints, mode, signal);
    }
  }
  /* Phase6: 表示処理系の移行 - 非同期ヒント表示   * main.tsのdisplayHintsAsync関数の機能をCoreクラスに統合した実装。 */
  async displayHintsAsync(
    denops: Denops,
    hints: HintMapping[],
    config: { mode?: string; [key: string]: unknown },
    signal?: AbortSignal,
  ): Promise<void> {
    if (this._renderingAbortController) {
      this._renderingAbortController.abort();
    }
    this._renderingAbortController = new AbortController();
    const currentController = this._renderingAbortController;
    if (signal) {
      signal.addEventListener("abort", () => {
        if (currentController === this._renderingAbortController) {
          currentController.abort();
        }
      });
    }
    this._isRenderingHints = true;
    try {
      if (currentController.signal.aborted) {
        return;
      }
      const mode = config.mode || "normal";
      const bufnr = await denops.call("bufnr", "%") as number;
      await this.displayHintsWithExtmarksBatch(
        denops,
        bufnr,
        hints,
        mode,
        currentController.signal,
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
    } finally {
      if (currentController === this._renderingAbortController) {
        this._isRenderingHints = false;
        this._renderingAbortController = null;
      }
    }
  }
  /* Phase6: 表示処理系の移行 - Extmarksバッチ表示   * main.tsのdisplayHintsWithExtmarksBatch関数の機能をCoreクラスに統合した実装。 */
  async displayHintsWithExtmarksBatch(
    denops: Denops,
    bufnr: number,
    hints: HintMapping[],
    mode: string = "normal",
    signal?: AbortSignal,
  ): Promise<void> {
    const batchSize = 200;
    // Why: debugMode 無効時はオーバーヘッドゼロを保証するため、
    //   関数冒頭で 1 度だけ評価し、以降の `if (isDebug)` 分岐で参照する。
    //   performance.now() / バッチ計測変数も isDebug=false 時は実質未使用となる。
    const isDebug = getDebugMode();
    const perfStart = isDebug ? performance.now() : 0;
    let batchCount = 0;
    let totalMarks = 0;
    let extmarkNamespace: number;
    try {
      extmarkNamespace = await denops.call(
        "nvim_create_namespace",
        EXTMARK_NAMESPACE,
      ) as number;
    } catch (error) {
      await this.displayHintsWithMatchAddBatch(denops, hints, mode, signal);
      return;
    }

    if (signal?.aborted || hints.length === 0) {
      if (isDebug) {
        const duration = performance.now() - perfStart;
        logMessage(
          "DEBUG",
          "hellshake-yano:perf",
          `displayHintsWithExtmarksBatch: ${
            duration.toFixed(2)
          }ms, batches=0, marks=0 (early-return)`,
        );
      }
      return;
    }

    try {
      const [bufValid, lineCount] = await Promise.all([
        denops.call("bufexists", bufnr) as Promise<number>,
        denops.call("line", "$") as Promise<number>,
      ]);
      if (!bufValid || lineCount < 1) {
        return;
      }

      const candidates = hints.filter((mapping) => {
        const line = mapping.word.line;
        return line >= 1 && line <= lineCount;
      });
      if (candidates.length === 0) {
        return;
      }

      const uniqueLines = [...new Set(candidates.map((mapping) => mapping.word.line - 1))];
      const lineCalls = uniqueLines.map((line) =>
        [
          "nvim_buf_get_lines",
          bufnr,
          line,
          line + 1,
          false,
        ] as [string, ...unknown[]]
      );
      const lineResults = await callAtomic(denops, lineCalls);
      const lineLengthCache = new Map<number, number>();
      for (let i = 0; i < uniqueLines.length; i++) {
        const lineContent = lineResults[i] as string[];
        const byteLength = lineContent.length > 0
          ? CORE_TEXT_ENCODER.encode(lineContent[0]).length
          : 0;
        lineLengthCache.set(uniqueLines[i], byteLength);
      }

      const extmarkCalls: Array<[string, ...unknown[]]> = [];
      for (const mapping of candidates) {
        const { word, hint } = mapping;
        const line = word.line - 1;
        const hintByteCol = mapping.hintByteCol || mapping.hintCol || word.byteCol || word.col;
        const col = Math.max(0, hintByteCol - 1);
        const lineByteLength = lineLengthCache.get(line);
        if (lineByteLength === undefined || col > lineByteLength) {
          continue;
        }

        extmarkCalls.push([
          "nvim_buf_set_extmark",
          bufnr,
          extmarkNamespace,
          line,
          col,
          {
            virt_text: [[hint, "HellshakeYanoMarker"]],
            virt_text_pos: "overlay",
            priority: 100,
          },
        ]);
      }

      for (let i = 0; i < extmarkCalls.length; i += batchSize) {
        if (signal?.aborted) {
          if (isDebug) {
            const duration = performance.now() - perfStart;
            logMessage(
              "DEBUG",
              "hellshake-yano:perf",
              `displayHintsWithExtmarksBatch: ${
                duration.toFixed(2)
              }ms, batches=${batchCount}, marks=${totalMarks} (aborted)`,
            );
          }
          return;
        }
        const slice = extmarkCalls.slice(i, i + batchSize);
        // Why: callAtomic のバッチサイズが extmark 劣化の要因かを特定するため、
        //   呼び出し回数 (batchCount) と累積マーク数 (totalMarks) を計測する。
        //   batch.ts に instrumentation を入れず呼び出し側でラップすることで
        //   他用途の callAtomic に副作用を出さない (Coding Principle 3)。
        if (isDebug) {
          batchCount++;
          totalMarks += slice.length;
        }
        await callAtomic(denops, slice);
      }
      if (isDebug) {
        const duration = performance.now() - perfStart;
        logMessage(
          "DEBUG",
          "hellshake-yano:perf",
          `displayHintsWithExtmarksBatch: ${
            duration.toFixed(2)
          }ms, batches=${batchCount}, marks=${totalMarks}`,
        );
      }
    } catch (_batchError) {
      try {
        await denops.call("nvim_buf_clear_namespace", bufnr, extmarkNamespace, 0, -1);
      } catch {
        // ignore cleanup failure before fallback
      }
      if (isDebug) {
        const duration = performance.now() - perfStart;
        logMessage(
          "DEBUG",
          "hellshake-yano:perf",
          `displayHintsWithExtmarksBatch: ${
            duration.toFixed(2)
          }ms, batches=${batchCount}, marks=${totalMarks} (fallback)`,
        );
      }
      await this.displayHintsWithExtmarksSequential(denops, bufnr, extmarkNamespace, hints, signal);
    }
  }

  private async displayHintsWithExtmarksSequential(
    denops: Denops,
    bufnr: number,
    extmarkNamespace: number,
    hints: HintMapping[],
    signal?: AbortSignal,
  ): Promise<void> {
    let extmarkFailCount = 0;
    const maxFailures = 5;
    const lineCount = await denops.call("line", "$") as number;

    for (const mapping of hints) {
      if (signal?.aborted || extmarkFailCount >= maxFailures) {
        return;
      }
      const { word, hint } = mapping;
      const hintLine = word.line;
      const hintByteCol = mapping.hintByteCol || mapping.hintCol || word.byteCol || word.col;
      if (hintLine > lineCount || hintLine < 1) {
        continue;
      }

      try {
        await denops.call(
          "nvim_buf_set_extmark",
          bufnr,
          extmarkNamespace,
          hintLine - 1,
          Math.max(0, hintByteCol - 1),
          {
            virt_text: [[hint, "HellshakeYanoMarker"]],
            virt_text_pos: "overlay",
            priority: 100,
          },
        );
      } catch {
        extmarkFailCount++;
      }
    }
  }
  /* Phase6: 表示処理系の移行 - MatchAddバッチ表示   * main.tsのdisplayHintsWithMatchAddBatch関数の機能をCoreクラスに統合した実装。 */
  async displayHintsWithMatchAddBatch(
    denops: Denops,
    hints: HintMapping[],
    mode: string = "normal",
    signal?: AbortSignal,
  ): Promise<void> {
    const batchSize = 100; // matchaddはより高速なので大きなバッチサイズ

    for (let i = 0; i < hints.length; i += batchSize) {
      if (signal?.aborted) {
        return;
      }
      const batch = hints.slice(i, i + batchSize);
      try {
        const matchPromises = batch.map(async (mapping) => {
          const { word, hint } = mapping;
          try {
            const hintLine = word.line;
            const hintCol = mapping.hintCol || word.col;
            const hintByteCol = mapping.hintByteCol || mapping.hintCol || word.byteCol || word.col;
            const vimCol = hintByteCol;
            const pattern = `\\%${hintLine}l\\%${vimCol}c.`;
            const matchId = await denops.call(
              "matchadd",
              "HellshakeYanoMarker",
              pattern,
              100,
            ) as number;
            return matchId;
          } catch (matchError) {
            return null;
          }
        });
        await Promise.all(matchPromises);
      } catch (batchError) {
      }
    }
  }
  /*   * Phase7: showHints系の移行 - ヒントを表示   * main.tsのshowHints関数の機能をCoreクラスに統合した実装。
   * デバウンス処理はmain.tsで管理し、Coreクラスは純粋なヒント表示ワークフローを提供します。
   *   * @returns Promise<void> - 非同期で完了
   */
  async showHints(denops: Denops): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }
    await this.showHintsInternal(denops);
  }
  /*   * Phase7: showHints系の移行 - 内部的なヒント表示処理（最適化版）   * main.tsのshowHintsInternal関数の機能をCoreクラスに統合した実装。
   * 単語検出、ヒント生成、ヒント表示の完全なワークフローを提供します。
   *   * @param mode - 表示モード（デフォルト: "normal"）
   * @returns Promise<void> - 非同期で完了
   */
  async showHintsInternal(denops: Denops, mode?: string): Promise<void> {
    const modeString = mode || "normal";
    try {
      if (!this.isEnabled()) {
        return;
      }

      // Multi-window mode check: delegate to showHintsMultiWindow if active
      if (this.config.multiWindowMode) {
        const { shouldUseMultiWindowMode } = await import("./window.ts");
        if (await shouldUseMultiWindowMode(denops, this.config)) {
          await this.showHintsMultiWindowInternal(denops, modeString);
          return;
        }
      }

      const bufnr = await denops.call("bufnr", "%") as number;
      if (bufnr === -1) {
        return;
      }

      await this.hideHintsOptimized(denops);

      const detectedWords = await this.detectWordsOptimized(denops, bufnr);

      if (detectedWords.length === 0) {
        return;
      }

      const cursorPos = await denops.call("getpos", ".") as
        | [number, number, number, number]
        | undefined;
      const cursorLine = cursorPos ? cursorPos[1] : 1;
      const cursorCol = cursorPos ? cursorPos[2] : 1;
      const directionalContext = resolveDirectionalContext(
        this.config.currentKeyContext,
        this.config.directionalHintFilter,
      );
      const words = filterWordsByDirection(
        detectedWords,
        { line: cursorLine, col: cursorCol },
        directionalContext,
      );

      if (words.length === 0) {
        return;
      }
      const unifiedConfig = this.config; // 既にConfig形式
      let hints: string[];
      if (unifiedConfig.singleCharKeys || unifiedConfig.multiCharKeys) {
        const hintConfig: HintKeyConfig = {
          singleCharKeys: unifiedConfig.singleCharKeys,
          multiCharKeys: unifiedConfig.multiCharKeys,
          maxSingleCharHints: unifiedConfig.maxSingleCharHints,
          useNumericMultiCharHints: unifiedConfig.useNumericMultiCharHints,
          markers: unifiedConfig.markers, // フォールバック用
        };
        hints = generateHints(words.length, {
          groups: true,
          singleCharKeys: hintConfig.singleCharKeys,
          multiCharKeys: hintConfig.multiCharKeys,
          maxSingleCharHints: hintConfig.maxSingleCharHints,
          useNumericMultiCharHints: hintConfig.useNumericMultiCharHints,
          markers: hintConfig.markers,
        });
      } else {
        const markers = unifiedConfig.markers || ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
        hints = this.generateHintsOptimized(words.length, markers);
      }

      if (hints.length === 0) {
        return;
      }

      if (getDebugMode()) {
        try {
          logMessage(
            "DEBUG",
            "HINT-DEBUG",
            `[PointE2/beforeAssign] wordsCount=${words.length} hintsCount=${hints.length} directionalEnabled=${
              directionalContext !== "none"
            } mode=${modeString}`,
          );
        } catch (_e) { /* noop */ }
      }

      // Why: HintPatternProcessor は従来 dead code だった。captureGroup / hintPosition を実機能化するため
      //   showHintsInternal から直接呼び出す。辞書未指定 / hintPatterns 空の場合は no-op で通過。
      const hintPatterns = this.cachedDictionary?.hintPatterns ?? [];
      if (hintPatterns.length > 0) {
        // [Timing/getline] + [Timing/join]: bufferLines 取得と join の所要時間を計測
        // Why: hintPatterns 処理が体感遅延の原因かを分離確認するため。debugMode=false では no-op。
        const _t0 = getDebugMode() ? performance.now() : 0;
        // Why: 大規模バッファで getline(1,"$") が 800-900ms まで悪化したため、
        //   line('w0')..line('w$') の viewport 行だけを取得する。単語検出も表示対象は
        //   viewport 中心なので、辞書パターン適用の行番号は startLine で補正する。
        const _bufnr = await denops.call("bufnr", "%") as number;
        const _changedtick = await denops.call("getbufvar", _bufnr, "changedtick") as number;
        const _totalLineCount = await denops.call("line", "$") as number;
        const _useViewportGetline = _totalLineCount >= VIEWPORT_GETLINE_THRESHOLD;
        const _viewportStart = _useViewportGetline ? await denops.call("line", "w0") as number : 1;
        const _viewportEnd = _useViewportGetline
          ? await denops.call("line", "w$") as number
          : _totalLineCount;
        const _getlineScope = resolveGetlineScope(_totalLineCount, _viewportStart, _viewportEnd);
        const _startLine = _getlineScope.startLine;
        const _endLine = _getlineScope.endLine;
        const _cacheScope = _getlineScope.scope;
        let bufferLines: string[];
        const _cacheHit = this.cachedBuffer !== null &&
          this.cachedBuffer.bufnr === _bufnr &&
          this.cachedBuffer.changedtick === _changedtick &&
          this.cachedBuffer.scope === _cacheScope &&
          this.cachedBuffer.startLine === _startLine &&
          this.cachedBuffer.endLine === _endLine;
        // RC-1 Process 03: cache hit/miss 累積カウンタ更新 + miss 理由記録
        // Why: 単発の cacheHit ログだけでは長期傾向が見えない。hits/misses を累積し
        //      100 回ごとに hit rate を出力することで mitigation 効果を計測可能にする。
        let _missReason = "";
        if (_cacheHit) {
          getlineCacheHitCount++;
        } else {
          getlineCacheMissCount++;
          if (this.cachedBuffer === null) {
            _missReason = "no-cache";
          } else if (this.cachedBuffer.bufnr !== _bufnr) {
            _missReason = "bufnr-changed";
          } else if (this.cachedBuffer.changedtick !== _changedtick) {
            _missReason = "changedtick-changed";
          } else if (this.cachedBuffer.scope !== _cacheScope) {
            _missReason = "scope-changed";
          } else if (
            this.cachedBuffer.startLine !== _startLine ||
            this.cachedBuffer.endLine !== _endLine
          ) {
            _missReason = "viewport-changed";
          } else {
            _missReason = "unknown";
          }
          getlineCacheLastMissReason = _missReason;
        }
        if (_cacheHit && this.cachedBuffer) {
          bufferLines = this.cachedBuffer.lines;
        } else {
          bufferLines = await denops.call("getline", _startLine, _endLine) as string[];
          this.cachedBuffer = {
            bufnr: _bufnr,
            changedtick: _changedtick,
            lines: bufferLines,
            startLine: _startLine,
            endLine: _endLine,
            scope: _cacheScope,
          };
        }
        if (getDebugMode()) {
          const _totalCalls = getlineCacheHitCount + getlineCacheMissCount;
          logMessage(
            "DEBUG",
            "HINT-DEBUG",
            `[Timing/getline] elapsed=${
              (performance.now() - _t0).toFixed(2)
            }ms lineCount=${bufferLines.length} fullLineCount=${_totalLineCount} scope=${_cacheScope} range=${_startLine}..${_endLine} cacheHit=${_cacheHit}${
              _missReason ? ` missReason=${_missReason}` : ""
            }`,
          );
          // 100 回ごとに hit rate サマリーを出力
          if (_totalCalls > 0 && _totalCalls % GETLINE_CACHE_REPORT_INTERVAL === 0) {
            const _hitRate = (getlineCacheHitCount / _totalCalls * 100).toFixed(1);
            logMessage(
              "DEBUG",
              "HINT-DEBUG",
              `[Cache/getline] hits=${getlineCacheHitCount} misses=${getlineCacheMissCount} hitRate=${_hitRate}% lastMiss=${getlineCacheLastMissReason}`,
            );
          }
        }
        // Why: join("\n") を廃止し行単位走査に変更。300-600ms の join コストを削減。
        if (!this.hintPatternProcessor) {
          this.hintPatternProcessor = new HintPatternProcessor();
        }
        const _t2 = getDebugMode() ? performance.now() : 0;
        const enhancedWords = this.hintPatternProcessor.applyHintPatterns(
          words,
          bufferLines,
          hintPatterns,
          _startLine,
        );
        if (getDebugMode()) {
          logMessage(
            "DEBUG",
            "HINT-DEBUG",
            `[Timing/applyHintPatterns] elapsed=${
              (performance.now() - _t2).toFixed(2)
            }ms wordCount=${words.length} patternCount=${hintPatterns.length}`,
          );
        }
        // [DEBUG-METRIC] PointD: applyHintPatterns の効果を観測
        if (getDebugMode()) {
          const prioritized = enhancedWords.filter(
            (w: { hintPriority?: number }) => (w.hintPriority ?? 0) > 0,
          );
          logMessage(
            "DEBUG",
            "HINT-DEBUG",
            `[PointD/applyHintPatterns] prioritizedCount=${prioritized.length} totalWords=${enhancedWords.length} patternsApplied=${hintPatterns.length}`,
          );
        }
        words.splice(0, words.length, ...enhancedWords);
      }

      // Why: skipOverlapDetection: true — detectAdjacentWords + shouldSkipHintForOverlap が
      // 日本語文書で 30-60% の単語を過剰削除するため無効化。割当制御は assignHintsToWords に委ねる。
      const hintMappings = assignHintsToWords(
        words,
        hints,
        cursorLine,
        cursorCol,
        modeString,
        {
          hintPosition: this.config.hintPosition,
          bothMinWordLength: this.config.bothMinWordLength,
        },
        OVERLAP_SKIP_OPTS,
      );

      await this.displayHintsOptimized(denops, hintMappings, modeString);
      this.currentHints = hintMappings;
      this.isActive = true;

      await this.waitForUserInput(denops);
    } catch (error) {
      this.hideHints();
    }
  }
  /* Phase7: showHints系の移行 - キー指定でのヒント表示   * main.tsのshowHintsWithKey関数の機能をCoreクラスに統合した実装。 */
  async showHintsWithKey(denops: Denops, key: string, mode?: string): Promise<void> {
    try {
      this.config.currentKeyContext = key;
      const modeString = mode || "normal";
      await this.showHintsInternal(denops, modeString);
    } catch (error) {
      await this.showHints(denops);
    }
  }
  /*   * Phase 8: ユーティリティ機能 - パフォーマンス測定を記録   * @param operation 測定対象の操作名
   * @param startTime 開始時刻（performance.now()の値）
   * @param endTime 終了時刻（performance.now()の値）
   */
  recordPerformance(
    operation: keyof PerformanceMetrics,
    startTime: number,
    endTime: number,
  ): void {
    if (!this.config.performanceLog) return;
    const duration = endTime - startTime;
    this.performanceMetrics[operation].push(duration);
    if (this.performanceMetrics[operation].length > 50) {
      this.performanceMetrics[operation] = this.performanceMetrics[operation].slice(-50);
    }
  }
  /*   * Phase 8: ユーティリティ機能 - デバッグ情報を収集   * @returns デバッグ情報オブジェクト
   */
  collectDebugInfo(): DebugInfo {
    return {
      config: { ...this.config },
      hintsVisible: this.isActive,
      currentHints: [...this.currentHints],
      metrics: {
        showHints: [...this.performanceMetrics.showHints],
        hideHints: [...this.performanceMetrics.hideHints],
        wordDetection: [...this.performanceMetrics.wordDetection],
        hintGeneration: [...this.performanceMetrics.hintGeneration],
      },
      timestamp: Date.now(),
    };
  }
  /*   * Phase 8: ユーティリティ機能 - デバッグ情報をクリア
   */
  clearDebugInfo(): void {
    this.performanceMetrics = {
      showHints: [],
      hideHints: [],
      wordDetection: [],
      hintGeneration: [],
    };
  }

  /**
   * Phase D-6: Process3 Sub1 - TinySegmenter連携
   * 日本語テキストをセグメント化する
   * @param text セグメント化する日本語テキスト
   * @param options セグメント化オプション
   * @returns セグメント化結果
   */
  async segmentJapaneseText(
    text: string,
    options?: { mergeParticles?: boolean },
  ): Promise<SegmentationResult> {
    const segmenter = TinySegmenter.getInstance();
    return await segmenter.segment(text, options);
  }

  /*   * Phase 8: ユーティリティ機能 - 現在のヒントを設定（テスト用）   * @param hints ヒントマッピングの配列
   */
  setCurrentHints(hints: HintMapping[]): void {
    this.currentHints = hints;
    this.isActive = hints.length > 0;
  }
  /*   * Phase 8: ユーティリティ機能 - ユーザー入力を待機   * ヒント表示後にユーザーの文字入力を待ち、対応するヒントの位置へジャンプする。
  /**
 * main.tsのwaitForUserInput関数から移行した実装。   * @param denops Denopsインスタンス
   */
  /*   * ヒントターゲットへのジャンプ処理を実行（REFACTOR: 重複コードの共通化）
   *   * @param target - ジャンプ対象のヒントマッピング
   * @param context - ジャンプのコンテキスト情報（デバッグ用）
   */
  private async jumpToHintTarget(
    denops: Denops,
    target: HintMapping,
    context: string,
  ): Promise<void> {
    try {
      const jumpCol = target.hintByteCol || target.hintCol ||
        target.word.byteCol || target.word.col;
      await denops.call("cursor", target.word.line, jumpCol);
    } catch (jumpError) {
      await denops.cmd("echohl ErrorMsg | echo 'Failed to jump to target' | echohl None");
    }
  }
  /*   * エラーメッセージとフィードバック表示（REFACTOR: 重複コードの共通化）
   *   * @param message - 表示するメッセージ
   * @param withBell - ベル音を鳴らすかどうか（デフォルト: true）
   */
  private async showErrorFeedback(denops: Denops, message: string, withBell = true): Promise<void> {
    await denops.cmd(`echohl WarningMsg | echo '${message}' | echohl None`);
    if (withBell) {
      try {
        await denops.cmd("call feedkeys('\\<C-g>', 'n')"); // ベル音
      } catch (error) {
        console.error("[hellshake-yano] Core: Bell sound failed:", error);
      }
    }
  }
  async postJumpHandler(denops: Denops, _target: HintMapping): Promise<void> {
    if (!this.config.continuousHintMode) {
      this.resetContinuousModeState();
      await this.hideHintsOptimized(denops);
      return;
    }

    const bufnr = await denops.call("bufnr", "%") as number;

    if (this.continuousModeActive && this.lastJumpBufnr !== null && this.lastJumpBufnr !== bufnr) {
      await denops.cmd(
        "echohl WarningMsg | echo '[hellshake-yano] Continuous hint loop stopped (buffer changed)' | echohl None",
      );
      this.resetContinuousModeState();
      await this.hideHintsOptimized(denops);
      return;
    }

    if (!this.continuousModeActive) {
      this.continuousJumpCount = 0;
    }
    this.continuousModeActive = true;
    this.lastJumpBufnr = bufnr;

    await this.hideHintsOptimized(denops);

    this.continuousJumpCount += 1;
    const maxJumps = this.config.maxContinuousJumps > 0
      ? this.config.maxContinuousJumps
      : DEFAULT_CONFIG.maxContinuousJumps;

    if (this.continuousJumpCount > maxJumps) {
      await denops.cmd(
        "echohl WarningMsg | echo '[hellshake-yano] Continuous hint loop stopped (max jumps reached)' | echohl None",
      );
      this.resetContinuousModeState();
      return;
    }

    try {
      await this.executeRecenterCommand(denops);
    } catch (_error) {
      await denops.cmd(
        "echohl WarningMsg | echo '[hellshake-yano] Failed to recenter cursor. Continuous mode disabled.' | echohl None",
      );
      this.resetContinuousModeState();
      return;
    }

    try {
      await this.showHintsInternal(denops);
    } catch (error) {
      this.resetContinuousModeState();
      throw error;
    }
  }
  /*   * ユーザーのヒント選択入力を待機し、選択された位置にジャンプする   * main.tsから移行された完全版実装。hideHintsOptimizedを使用して
   * 実際の表示を適切に非表示にする重要なバグ修正を含む。
   *   * @throws ユーザーがESCでキャンセルした場合
   */
  async waitForUserInput(denops: Denops): Promise<void> {
    const config = this.config;
    const currentHints = this.currentHints;
    if (currentHints.length === 0) return;
    let timeoutId: number | undefined;
    try {
      const inputTimeout = config.motionTimeout || 2000;
      await new Promise((resolve) => setTimeout(resolve, 50));
      const inputPromise = denops.call("getchar") as Promise<number | string>;
      const timeoutPromise = new Promise<number | string>((resolve) => {
        timeoutId = setTimeout(() => resolve(-2), inputTimeout) as unknown as number; // -2 = 全体タイムアウト
      });
      const result = await Promise.race([inputPromise, timeoutPromise]);

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
      // 特殊キー（文字列）の場合、静かに終了してキーを送り返す
      if (typeof result === "string") {
        if (isConfiguredCancelKey(result, config.cancelKeys)) {
          await this.hideHintsOptimized(denops);
          await denops.cmd(`call feedkeys(${JSON.stringify(result)}, 'm')`);
          this.resetContinuousModeState();
          return;
        }
        await this.hideHintsOptimized(denops);
        await denops.cmd(`call feedkeys(${JSON.stringify(result)}, 'm')`);
        this.resetContinuousModeState();
        return;
      }
      const char = result as number;
      if (char === -2) {
        if (config.motionCount === 1) {
          const singleCharHints = currentHints.filter((h) => h.hint.length === 1);
          if (singleCharHints.length === 1) {
            await this.jumpToHintTarget(denops, singleCharHints[0], "timeout auto-select");
            await this.postJumpHandler(denops, singleCharHints[0]);
            return;
          }
        }
        await this.hideHintsOptimized(denops);
        return;
      }
      if (char === 27) {
        await denops.cmd("echo 'Cancelled'");
        this.resetContinuousModeState();
        await this.hideHintsOptimized(denops);
        return;
      }
      if (char < 32 && char !== 13) { // Enter(13)以外の制御文字
        await denops.cmd(`call feedkeys(nr2char(${char}), 'm')`);
        this.resetContinuousModeState();
        await this.hideHintsOptimized(denops);
        return;
      }
      const wasUpperCase = char >= 65 && char <= 90;
      const wasNumber = char >= 48 && char <= 57;
      const wasLowerCase = char >= 97 && char <= 122;
      if (wasLowerCase) {
        await this.hideHintsOptimized(denops);
        const originalChar = String.fromCharCode(char);
        await denops.cmd(`call feedkeys('${originalChar}', 'm')`);
        this.resetContinuousModeState();
        return;
      }
      let inputChar: string;
      try {
        inputChar = String.fromCharCode(char);
        if (/[a-zA-Z]/.test(inputChar)) {
          inputChar = inputChar.toUpperCase();
        }
      } catch (_charError) {
        await denops.cmd("echohl ErrorMsg | echo 'Invalid character input' | echohl None");
        this.resetContinuousModeState();
        await this.hideHintsOptimized(denops);
        return;
      }
      const allKeys = [...(config.singleCharKeys || []), ...(config.multiCharKeys || [])];
      if (config.useNumericMultiCharHints) {
        allKeys.push(...["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
      }
      const normalizedKeys = allKeys.map((k) => /[a-zA-Z]/.test(k) ? k.toUpperCase() : k);
      const validKeysSet = new Set(normalizedKeys);
      if (!validKeysSet.has(inputChar)) {
        if (isConfiguredCancelKey(char, config.cancelKeys)) {
          this.resetContinuousModeState();
          await this.hideHintsOptimized(denops);
          const originalChar = String.fromCharCode(char);
          await denops.cmd(`call feedkeys('${originalChar}', 'm')`);
          return;
        }
        // ヒント以外のキーが入力された場合、ヒントを非表示にしてキーを通常処理に送る
        this.resetContinuousModeState();
        await this.hideHintsOptimized(denops);
        const originalChar = String.fromCharCode(char);
        await denops.cmd(`call feedkeys('${originalChar}', 'm')`);
        return;
      }
      const matchingHints = currentHints.filter((h) => h.hint.startsWith(inputChar));
      // 🔒 必須: 候補ハイライト表示（削除禁止）
      await this.highlightCandidateHintsHybrid(denops, currentHints, inputChar);

      if (matchingHints.length === 0) {
        // ヒントが見つからない場合、キーを送り返す
        this.resetContinuousModeState();
        await this.hideHintsOptimized(denops);
        const originalChar = String.fromCharCode(char);
        await denops.cmd(`call feedkeys('${originalChar}', 'm')`);
        return;
      }
      const singleCharTarget = matchingHints.find((h) => h.hint === inputChar);
      const multiCharHints = matchingHints.filter((h) => h.hint.length > 1);

      if (config.useHintGroups) {
        const defaultSingleKeys = config.useNumericMultiCharHints
          ? DEFAULT_SINGLE_KEYS.filter((k) => !/^\d$/.test(k))
          : DEFAULT_SINGLE_KEYS;
        const singleOnlyKeys = config.singleCharKeys || defaultSingleKeys;
        const multiOnlyKeys = config.multiCharKeys || DEFAULT_MULTI_KEYS;
        const shouldJumpImmediately = singleOnlyKeys.includes(inputChar) &&
          singleCharTarget &&
          !(config.useNumericMultiCharHints && /^\d$/.test(inputChar));

        if (shouldJumpImmediately) {
          await this.jumpToHintTarget(denops, singleCharTarget, "single char hint (hint groups)");
          await this.postJumpHandler(denops, singleCharTarget);
          return;
        }
        const isMultiCharKey = multiOnlyKeys.includes(inputChar) ||
          (config.useNumericMultiCharHints && /^\d$/.test(inputChar));

        if (isMultiCharKey && multiCharHints.length > 0) {
        }
      } else {
        if (singleCharTarget) {
          await this.jumpToHintTarget(denops, singleCharTarget, "single char target (Option 3)");
          await this.postJumpHandler(denops, singleCharTarget);
          return;
        }
      }
      let secondResult: number | string;
      try {
        if (config.useHintGroups) {
          const multiOnlyKeys = config.multiCharKeys || DEFAULT_MULTI_KEYS;
          const isMultiCharKey = multiOnlyKeys.includes(inputChar) ||
            (config.useNumericMultiCharHints && /^\d$/.test(inputChar));

          if (isMultiCharKey) {
            secondResult = await denops.call("getchar") as number | string;
          } else {
            const secondInputPromise = denops.call("getchar") as Promise<number | string>;
            const secondTimeoutPromise = new Promise<number | string>((resolve) => {
              timeoutId = setTimeout(() => resolve(-1), 800) as unknown as number; // 800ms後にタイムアウト
            });
            secondResult = await Promise.race([secondInputPromise, secondTimeoutPromise]);

            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = undefined;
            }
          }
        } else {
          const secondInputPromise = denops.call("getchar") as Promise<number | string>;
          const secondTimeoutPromise = new Promise<number | string>((resolve) => {
            timeoutId = setTimeout(() => resolve(-1), 800) as unknown as number; // 800ms後にタイムアウト
          });
          secondResult = await Promise.race([secondInputPromise, secondTimeoutPromise]);

          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = undefined;
          }
        }
      } catch (error) {
        return; // エラー時は処理を中止
      }

      // 特殊キー（文字列）の場合、静かに終了してキーを送り返す
      if (typeof secondResult === "string") {
        if (isConfiguredCancelKey(secondResult, config.cancelKeys)) {
          await this.hideHintsOptimized(denops);
          await denops.cmd(`call feedkeys(${JSON.stringify(secondResult)}, 'm')`);
          this.resetContinuousModeState();
          return;
        }
        await this.hideHintsOptimized(denops);
        await denops.cmd(`call feedkeys(${JSON.stringify(secondResult)}, 'm')`);
        this.resetContinuousModeState();
        return;
      }
      const secondChar = secondResult as number;
      if (secondChar === -1) {
        if (matchingHints.length === 1) {
          await this.jumpToHintTarget(denops, matchingHints[0], "auto-select single candidate");
          await this.postJumpHandler(denops, matchingHints[0]);
          return;
        } else if (singleCharTarget) {
          await this.jumpToHintTarget(denops, singleCharTarget, "timeout select single char hint");
          await this.postJumpHandler(denops, singleCharTarget);
          return;
        } else {
          await denops.cmd(`echo 'Timeout - ${matchingHints.length} candidates available'`);
        }
        await this.hideHintsOptimized(denops);
        this.resetContinuousModeState();
        return;
      }
      if (secondChar === 27) {
        await denops.cmd("echo 'Cancelled'");
        await this.hideHintsOptimized(denops);
        this.resetContinuousModeState();
        return;
      }
      // 制御文字や特殊キー（PgUp, Upなど）の場合、静かに終了してキーを送り返す
      if (secondChar < 32 || secondChar > 127) {
        await this.hideHintsOptimized(denops);
        await denops.cmd(`call feedkeys(nr2char(${secondChar}), 'm')`);
        this.resetContinuousModeState();
        return;
      }
      let secondInputChar: string;
      try {
        secondInputChar = String.fromCharCode(secondChar);
        if (/[a-zA-Z]/.test(secondInputChar)) {
          secondInputChar = secondInputChar.toUpperCase();
        }
      } catch (_charError) {
        await denops.cmd("echohl ErrorMsg | echo 'Invalid second character' | echohl None");
        await this.hideHintsOptimized(denops);
        return;
      }
      const secondValidPattern = (config.useNumbers || config.useNumericMultiCharHints)
        ? /[A-Z0-9]/
        : /[A-Z]/;
      const secondErrorMessage = (config.useNumbers || config.useNumericMultiCharHints)
        ? "Second character must be alphabetic or numeric"
        : "Second character must be alphabetic";

      if (!secondValidPattern.test(secondInputChar)) {
        if (isConfiguredCancelKey(secondChar, config.cancelKeys)) {
          await this.hideHintsOptimized(denops);
          const originalChar = String.fromCharCode(secondChar);
          await denops.cmd(`call feedkeys('${originalChar}', 'm')`);
          this.resetContinuousModeState();
          return;
        }
        await this.showErrorFeedback(denops, secondErrorMessage, false);
        this.resetContinuousModeState();
        await this.hideHintsOptimized(denops);
        return;
      }
      const fullHint = inputChar + secondInputChar;
      const target = currentHints.find((h) => h.hint === fullHint);

      if (target) {
        await this.jumpToHintTarget(denops, target, `hint "${fullHint}"`);
        await this.postJumpHandler(denops, target);
        return;
      } else if (isConfiguredCancelKey(secondChar, config.cancelKeys)) {
        await this.hideHintsOptimized(denops);
        const originalChar = String.fromCharCode(secondChar);
        await denops.cmd(`call feedkeys('${originalChar}', 'm')`);
        this.resetContinuousModeState();
        return;
      } else {
        await this.showErrorFeedback(denops, `Invalid hint combination: ${fullHint}`);
      }
      await this.hideHintsOptimized(denops);
      this.resetContinuousModeState();
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      try {
        await denops.cmd("echohl ErrorMsg | echo 'Input error - hints cleared' | echohl None");
        await denops.cmd("call feedkeys('\\<C-g>', 'n')"); // ベル音
      } catch (error) {
        console.error("[hellshake-yano] Core: Error feedback failed:", error);
      }
      await this.hideHintsOptimized(denops);
      this.resetContinuousModeState();
      throw error;
    }
  }
  highlightCandidateHintsAsync(
    denops: Denops,
    hintMappings: HintMapping[],
    partialInput: string,
    config: { mode?: "normal" | "visual" | "operator" } = {},
  ): void {
    if (this._renderingAbortController) {
      this._renderingAbortController.abort();
    }
    this._renderingAbortController = new AbortController();
    const signal = this._renderingAbortController.signal;
    if (this._pendingHighlightTimer !== null) {
      clearTimeout(this._pendingHighlightTimer);
      this._pendingHighlightTimer = null;
    }
    this._pendingHighlightTimer = setTimeout(async () => {
      this._pendingHighlightTimer = null;
      try {
        if (signal.aborted) return;
        if (!partialInput) {
          return;
        }
        const mode = config.mode || "normal";
        const bufnr = await denops.call("bufnr", "%") as number;
        if (signal.aborted) return;
        const extmarkNamespace = await denops.call(
          "nvim_create_namespace",
          EXTMARK_NAMESPACE,
        ) as number;
        if (signal.aborted) return;
        await denops.call("nvim_buf_clear_namespace", bufnr, extmarkNamespace, 0, -1);
        if (signal.aborted) return;
        const candidateHints: HintMapping[] = [];
        const nonCandidateHints: HintMapping[] = [];
        for (const mapping of hintMappings) {
          const isCandidate = mapping.hint.startsWith(partialInput);
          if (isCandidate) {
            candidateHints.push(mapping);
          } else {
            nonCandidateHints.push(mapping);
          }
        }
        const totalHints = candidateHints.length + nonCandidateHints.length;
        if (totalHints <= HIGHLIGHT_BATCH_SIZE) {
          for (const mapping of hintMappings) {
            if (signal.aborted) return;
            const isCandidate = mapping.hint.startsWith(partialInput);
            const { word, hint } = mapping;
            const hintLine = word.line;
            const hintByteCol = mapping.hintByteCol || mapping.hintCol || word.byteCol || word.col;
            const nvimLine = hintLine - 1;
            const nvimCol = hintByteCol - 1;
            const highlightGroup = this.getHighlightGroupName(isCandidate);
            const priority = isCandidate ? 1001 : 1000;
            try {
              await denops.call(
                "nvim_buf_set_extmark",
                bufnr,
                extmarkNamespace,
                nvimLine,
                nvimCol,
                {
                  "virt_text": [[hint, highlightGroup]],
                  "virt_text_pos": "overlay",
                  "priority": priority,
                },
              );
            } catch (error) {
            }
          }
          return;
        }
        await this.processBatchedExtmarks(
          denops,
          candidateHints,
          true,
          bufnr,
          extmarkNamespace,
          signal,
        );
        if (signal.aborted) return;
        await this.processBatchedExtmarks(
          denops,
          nonCandidateHints,
          false,
          bufnr,
          extmarkNamespace,
          signal,
        );
      } catch (error) {
      }
    }, 0) as unknown as number;
  }
  async highlightCandidateHintsHybrid(
    denops: Denops,
    hintMappings: HintMapping[],
    partialInput: string,
    config: { mode?: "normal" | "visual" | "operator" } = {},
  ): Promise<void> {
    const SYNC_BATCH_SIZE = HYBRID_SYNC_BATCH_SIZE;
    try {
      if (this._renderingAbortController) {
        this._renderingAbortController.abort();
      }
      this._renderingAbortController = new AbortController();
      const signal = this._renderingAbortController.signal;
      if (!partialInput) {
        return;
      }
      // マルチバッファ対応: 全ヒントからユニークなバッファを取得
      const uniqueBuffers = new Set<number>();
      const hintsForBufferDetection = this.currentHints.length > 0
        ? this.currentHints
        : hintMappings;
      for (const mapping of hintsForBufferDetection) {
        const bufnr = mapping.word?.bufnr ?? 0;
        if (bufnr > 0) uniqueBuffers.add(bufnr);
      }
      // フォールバック: 現在のバッファ
      if (uniqueBuffers.size === 0) {
        uniqueBuffers.add(await denops.call("bufnr", "%") as number);
      }
      const extmarkNamespace = await denops.call(
        "nvim_create_namespace",
        EXTMARK_NAMESPACE,
      ) as number;
      if (signal.aborted) return;
      // 各バッファのextmarkをクリア
      const clearCalls = [...uniqueBuffers].map((bufnr) =>
        [
          "nvim_buf_clear_namespace",
          bufnr,
          extmarkNamespace,
          0,
          -1,
        ] as [string, ...unknown[]]
      );
      try {
        await callAtomic(denops, clearCalls);
      } catch {
        for (const bufnr of uniqueBuffers) {
          await denops.call("nvim_buf_clear_namespace", bufnr, extmarkNamespace, 0, -1);
        }
      }
      if (signal.aborted) return;
      const candidateHints: HintMapping[] = [];
      const nonCandidateHints: HintMapping[] = [];
      for (const mapping of hintMappings) {
        if (mapping.hint.startsWith(partialInput)) {
          candidateHints.push(mapping);
        } else {
          nonCandidateHints.push(mapping);
        }
      }
      const syncCandidates = candidateHints.slice(0, SYNC_BATCH_SIZE);
      const asyncCandidates = candidateHints.slice(SYNC_BATCH_SIZE);
      // フォールバック用に現在のバッファを取得
      const currentBufnr = await denops.call("bufnr", "%") as number;
      await this.setHintExtmarksBatch(
        denops,
        syncCandidates,
        currentBufnr,
        extmarkNamespace,
        true,
        signal,
      );
      const syncNonCandidates = nonCandidateHints.slice(0, Math.min(5, nonCandidateHints.length));
      await this.setHintExtmarksBatch(
        denops,
        syncNonCandidates,
        currentBufnr,
        extmarkNamespace,
        false,
        signal,
      );
      const shouldRedraw = await denops.call("hellshake_yano#core#should_redraw") as boolean;
      if (shouldRedraw) {
        await denops.cmd("redraw");
      }
      const asyncNonCandidates = nonCandidateHints.slice(5);
      if (asyncCandidates.length > 0 || asyncNonCandidates.length > 0) {
        queueMicrotask(async () => {
          try {
            await this.setHintExtmarksBatch(
              denops,
              asyncCandidates,
              currentBufnr,
              extmarkNamespace,
              true,
              signal,
            );
            await this.setHintExtmarksBatch(
              denops,
              asyncNonCandidates,
              currentBufnr,
              extmarkNamespace,
              false,
              signal,
            );
          } catch (err) {
          }
        });
      }
    } catch (error) {
    }
  }
  private getHighlightGroupName(isCandidate: boolean): string {
    const configValue = isCandidate
      ? this.config.highlightHintMarkerCurrent
      : this.config.highlightHintMarker;
    if (typeof configValue === "string") {
      return configValue;
    }
    return isCandidate ? "HellshakeYanoMarkerCurrent" : "HellshakeYanoMarker";
  }
  private async setHintExtmark(
    denops: Denops,
    mapping: HintMapping,
    bufnr: number,
    extmarkNamespace: number,
    isCandidate: boolean = true,
  ): Promise<number | undefined> {
    const { word, hint } = mapping;
    const hintLine = word.line;
    // Why: hintByteCol は word.ts で byteIndex+1 として設定済みの 1-indexed バイトオフセット。
    // hintByteCol → hintCol → word.byteCol → word.col の順にフォールバック。
    const hintByteCol = mapping.hintByteCol || mapping.hintCol || word.byteCol || word.col;
    // Why: nvim_buf_set_extmark は 0-indexed を要求するため -1 する。
    const nvimLine = hintLine - 1;
    const nvimCol = hintByteCol - 1;
    const highlightGroup = this.getHighlightGroupName(isCandidate);

    try {
      // Why: bufexists guard added here — the async microtask path in highlightCandidateHintsHybrid
      // captures currentBufnr at call time but runs later; the buffer may be deleted by then.
      // Checking here covers both sync and async callers without duplicating the guard.
      const bufValid = await denops.call("bufexists", bufnr) as number;
      if (!bufValid) {
        return undefined;
      }
      // Why: Invalid 'line' / 'col' エラーを防ぐため、nvim_buf_line_count と行バイト長で
      // 範囲チェックを行う。out-of-range の場合は extmark をスキップして undefined を返す。
      const lineCount = await denops.call("nvim_buf_line_count", bufnr) as number;
      if (nvimLine < 0 || nvimLine >= lineCount) {
        return undefined;
      }
      const lineBytes = await denops.call(
        "nvim_buf_get_lines",
        bufnr,
        nvimLine,
        nvimLine + 1,
        false,
      ) as string[];
      if (!lineBytes || lineBytes.length === 0) {
        return undefined;
      }
      const lineByteLen = new TextEncoder().encode(lineBytes[0]).length;
      // Why: clamp — col がバイト長を超える場合、行末に寄せることで
      // Invalid 'col' エラーを回避しつつヒントを表示継続する。
      const safeNvimCol = Math.min(Math.max(0, nvimCol), lineByteLen);

      const extmarkId = await denops.call(
        "nvim_buf_set_extmark",
        bufnr,
        extmarkNamespace,
        nvimLine,
        safeNvimCol,
        {
          "virt_text": [[hint, highlightGroup]],
          "virt_text_pos": "overlay",
          "priority": 1001,
        },
      ) as number;
      return extmarkId;
    } catch (error) {
      console.error(`[hellshake-yano] Failed to set hint extmark in buffer ${bufnr}:`, error);
      return undefined;
    }
  }
  private async setHintExtmarksBatch(
    denops: Denops,
    mappings: HintMapping[],
    currentBufnr: number,
    extmarkNamespace: number,
    isCandidate: boolean,
    signal: AbortSignal,
  ): Promise<void> {
    if (signal.aborted || mappings.length === 0) {
      return;
    }

    const highlightGroup = this.getHighlightGroupName(isCandidate);
    const priority = isCandidate ? 1001 : 1000;
    const byBuffer = new Map<number, HintMapping[]>();
    for (const mapping of mappings) {
      const targetBufnr = mapping.word?.bufnr ?? currentBufnr;
      const bufferHints = byBuffer.get(targetBufnr);
      if (bufferHints) {
        bufferHints.push(mapping);
      } else {
        byBuffer.set(targetBufnr, [mapping]);
      }
    }

    for (const [bufnr, bufferHints] of byBuffer) {
      if (signal.aborted) return;

      try {
        const [bufValid, lineCount] = await Promise.all([
          denops.call("bufexists", bufnr) as Promise<number>,
          denops.call("nvim_buf_line_count", bufnr) as Promise<number>,
        ]);
        if (!bufValid || lineCount < 1) {
          continue;
        }

        const candidates = bufferHints.filter((mapping) => {
          const line = mapping.word.line;
          return line >= 1 && line <= lineCount;
        });
        if (candidates.length === 0) {
          continue;
        }

        const uniqueLines = [...new Set(candidates.map((mapping) => mapping.word.line - 1))];
        const lineCalls = uniqueLines.map((line) =>
          [
            "nvim_buf_get_lines",
            bufnr,
            line,
            line + 1,
            false,
          ] as [string, ...unknown[]]
        );
        const lineResults = await callAtomic(denops, lineCalls);
        const lineLengthCache = new Map<number, number>();
        for (let i = 0; i < uniqueLines.length; i++) {
          const lineContent = lineResults[i] as string[];
          const byteLength = lineContent.length > 0
            ? CORE_TEXT_ENCODER.encode(lineContent[0]).length
            : 0;
          lineLengthCache.set(uniqueLines[i], byteLength);
        }

        const extmarkCalls: Array<[string, ...unknown[]]> = [];
        for (const mapping of candidates) {
          const { word, hint } = mapping;
          const line = word.line - 1;
          const hintByteCol = mapping.hintByteCol || mapping.hintCol || word.byteCol || word.col;
          const lineByteLength = lineLengthCache.get(line);
          if (lineByteLength === undefined) {
            continue;
          }
          const col = Math.min(Math.max(0, hintByteCol - 1), lineByteLength);
          extmarkCalls.push([
            "nvim_buf_set_extmark",
            bufnr,
            extmarkNamespace,
            line,
            col,
            {
              "virt_text": [[hint, highlightGroup]],
              "virt_text_pos": "overlay",
              "priority": priority,
            },
          ]);
        }

        if (extmarkCalls.length > 0) {
          await callAtomic(denops, extmarkCalls);
          MULTI_BUFFER_EXTMARK_STATE.add(bufnr);
        }
      } catch {
        for (const mapping of bufferHints) {
          if (signal.aborted) return;
          const extmarkId = await this.setHintExtmark(
            denops,
            mapping,
            bufnr,
            extmarkNamespace,
            isCandidate,
          );
          if (extmarkId !== undefined) {
            MULTI_BUFFER_EXTMARK_STATE.add(bufnr);
          }
        }
      }
    }
  }
  private async processBatchedExtmarks(
    denops: Denops,
    hints: HintMapping[],
    isCandidate: boolean,
    bufnr: number,
    extmarkNamespace: number,
    signal: AbortSignal,
  ): Promise<void> {
    const batchSize = HIGHLIGHT_BATCH_SIZE;
    const highlightGroup = this.getHighlightGroupName(isCandidate);
    const priority = isCandidate ? 1001 : 1000;
    for (let i = 0; i < hints.length; i += batchSize) {
      if (signal.aborted) return;
      const batch = hints.slice(i, i + batchSize);
      for (const mapping of batch) {
        if (signal.aborted) return;
        const { word, hint } = mapping;
        const hintLine = word.line;
        const hintByteCol = mapping.hintByteCol || mapping.hintCol || word.byteCol || word.col;
        const nvimLine = hintLine - 1;
        const nvimCol = hintByteCol - 1;
        try {
          await denops.call(
            "nvim_buf_set_extmark",
            bufnr,
            extmarkNamespace,
            nvimLine,
            nvimCol,
            {
              "virt_text": [[hint, highlightGroup]],
              "virt_text_pos": "overlay",
              "priority": priority,
            },
          );
        } catch (error) {
        }
      }
      if (i + batchSize < hints.length) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }
  /*   * Phase 9: Dictionary System Migration
   * 辞書システムの移行 - TDD Green Phase Implementation
   */
  /*   * Initialize dictionary system
   *   * @returns Promise<void>
   */
  async initializeDictionarySystem(denops: Denops): Promise<void> {
    try {
      this.dictionaryLoader = new DictionaryLoader();
      this.vimConfigBridge = new VimConfigBridge();
      await this.registerDictionaryCommands(denops);
      const dictConfig = await this.vimConfigBridge.getConfig(denops);
      // [DEBUG-METRIC] Point A: 辞書ロード完了地点
      // Why: 戻り値破棄ではなく const で捕捉する方針を採用。理由: パス解決・パース結果・hintPatterns 実体を
      //      検証するには戻り値が必須だが、ロジック変更ではなく「受け取るだけ」の最小改変に留める。
      const loadedDict = await this.dictionaryLoader.loadUserDictionary(dictConfig);
      // Why: loadedDict を cachedDictionary に保持。理由: showHintsInternal で applyHintPatterns を呼ぶ際、
      //   hintPatterns にアクセスするため。毎回 loadUserDictionary を呼ぶと I/O コストが発生する。
      this.cachedDictionary = loadedDict;
      if (getDebugMode()) {
        try {
          let resolvedPath = "(none)";
          if (dictConfig.dictionaryPath) {
            resolvedPath = dictConfig.dictionaryPath.startsWith("~")
              ? (Deno.env.get("HOME") || "") + dictConfig.dictionaryPath.slice(1)
              : dictConfig.dictionaryPath;
          }
          let fileExists = false;
          if (resolvedPath !== "(none)") {
            try {
              Deno.statSync(resolvedPath);
              fileExists = true;
            } catch {
              fileExists = false;
            }
          }
          const hintPatterns = loadedDict.hintPatterns || [];
          const parseSuccess = loadedDict !== null && typeof loadedDict === "object";
          const firstPatternSummary = hintPatterns.length > 0
            ? JSON.stringify({
              pattern: String(hintPatterns[0].pattern),
              hintPosition: hintPatterns[0].hintPosition,
              priority: hintPatterns[0].priority,
            })
            : "(none)";
          logMessage(
            "DEBUG",
            "HINT-DEBUG",
            `[PointA/dictLoad] resolvedPath=${resolvedPath} fileExists=${fileExists} parseSuccess=${parseSuccess} hintPatternsCount=${hintPatterns.length} firstPattern=${firstPatternSummary}`,
          );
        } catch (e) {
          logMessage(
            "DEBUG",
            "HINT-DEBUG",
            `[PointA/dictLoad] log failure: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
    } catch (error) {
      // Silently handle dictionary initialization errors
      // Dictionary system is optional - plugin should continue to work without it
      // Error details are logged but not propagated to avoid blocking plugin initialization
      if (this.config.debugMode) {
        console.error(
          "[Dictionary] Initialization failed:",
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  }
  /*   * Register dictionary-related Vim commands
   *   * @returns Promise<void>
   */
  private async registerDictionaryCommands(denops: Denops): Promise<void> {
    await denops.cmd(
      `command! -nargs=+ HellshakeYanoAddWord call denops#request("${denops.name}", "addToDictionary", split('<args>'))`,
    );
    await denops.cmd(
      `command! HellshakeYanoReloadDict call denops#request("${denops.name}", "reloadDictionary", [])`,
    );
    await denops.cmd(
      `command! HellshakeYanoEditDict call denops#request("${denops.name}", "editDictionary", [])`,
    );
    await denops.cmd(
      `command! HellshakeYanoShowDict call denops#request("${denops.name}", "showDictionary", [])`,
    );
    await denops.cmd(
      `command! HellshakeYanoValidateDict call denops#request("${denops.name}", "validateDictionary", [])`,
    );
  }
  /*   * Check if dictionary system is initialized   * @returns boolean - True if dictionary system is ready
   */
  hasDictionarySystem(): boolean {
    return this.dictionaryLoader !== null && this.vimConfigBridge !== null;
  }
  /*   * Reload user dictionary
   *   * @returns Promise<void>
   */
  async reloadDictionary(denops: Denops): Promise<void> {
    try {
      if (!this.dictionaryLoader || !this.vimConfigBridge) {
        await this.initializeDictionarySystem(denops);
      }
      if (!this.vimConfigBridge || !this.dictionaryLoader) {
        throw new Error("Dictionary system not initialized");
      }
      const dictConfig = await this.vimConfigBridge.getConfig(denops);
      const dictionary = await this.dictionaryLoader.loadUserDictionary(dictConfig);
      this.cachedDictionary = dictionary;
      await denops.cmd('echo "Dictionary reloaded successfully"');
    } catch (error) {
      await denops.cmd(`echoerr "Failed to reload dictionary: ${error}"`);
    }
  }
  /*   * Edit dictionary file
   *   * @returns Promise<void>
   */
  async editDictionary(denops: Denops): Promise<void> {
    try {
      if (!this.dictionaryLoader || !this.vimConfigBridge) {
        await this.initializeDictionarySystem(denops);
      }
      if (!this.vimConfigBridge) {
        throw new Error("Dictionary system not initialized");
      }
      const dictConfig = await this.vimConfigBridge.getConfig(denops);
      const dictionaryPath = dictConfig.dictionaryPath || ".hellshake-yano/dictionary.json";

      if (dictionaryPath) {
        await denops.cmd(`edit ${dictionaryPath}`);
      } else {
        const newPath = ".hellshake-yano/dictionary.json";
        try {
          await Deno.mkdir(".hellshake-yano", { recursive: true });
          await Deno.writeTextFile(
            newPath,
            JSON.stringify(
              {
                "words": [],
                "patterns": [],
                "meta": {
                  "version": "1.0.0",
                  "created": new Date().toISOString(),
                  "description": "User dictionary for hellshake-yano.vim",
                },
              },
              null,
              2,
            ),
          );
          await denops.cmd(`edit ${newPath}`);
          await denops.cmd('echo "Created new dictionary file: ' + newPath + '"');
        } catch (createError) {
          throw new Error(`Failed to create dictionary file: ${createError}`);
        }
      }
    } catch (error) {
      await denops.cmd(`echoerr "Failed to edit dictionary: ${error}"`);
    }
  }
  /*   * Show dictionary contents in a new buffer
   *   * @returns Promise<void>
   */
  async showDictionary(denops: Denops): Promise<void> {
    try {
      if (!this.dictionaryLoader || !this.vimConfigBridge) {
        await this.initializeDictionarySystem(denops);
      }
      if (!this.vimConfigBridge || !this.dictionaryLoader) {
        throw new Error("Dictionary system not initialized");
      }
      const dictConfig = await this.vimConfigBridge.getConfig(denops);
      const dictionary = await this.dictionaryLoader.loadUserDictionary(dictConfig);
      await denops.cmd("new");
      await denops.cmd("setlocal buftype=nofile");
      await denops.cmd("setlocal bufhidden=wipe");
      await denops.cmd("setlocal noswapfile");
      await denops.cmd("file [HellshakeYano Dictionary]");
      const content = JSON.stringify(dictionary, null, 2);
      const lines = content.split("\n");
      await denops.call("setline", 1, lines);
    } catch (error) {
      await denops.cmd(`echoerr "Failed to show dictionary: ${error}"`);
    }
  }
  /*   * Validate dictionary format
   *   * @returns Promise<void>
   */
  async validateDictionary(denops: Denops): Promise<void> {
    try {
      if (!this.dictionaryLoader || !this.vimConfigBridge) {
        await this.initializeDictionarySystem(denops);
      }
      if (!this.vimConfigBridge) {
        throw new Error("Dictionary system not initialized");
      }
      const dictConfig = await this.vimConfigBridge.getConfig(denops);
      if (dictConfig.dictionaryPath) {
        try {
          await Deno.stat(dictConfig.dictionaryPath);
        } catch (_) {
          await denops.cmd(`echoerr "Dictionary file not found"`);
          return;
        }
      }
      const result = { errors: [] as string[] };
      if (result.errors.length === 0) {
        await denops.cmd('echo "Dictionary format is valid"');
      } else {
        await denops.cmd(`echoerr "Dictionary validation failed: ${result.errors.join(", ")}"`);
      }
    } catch (error) {
      await denops.cmd(`echoerr "Failed to validate dictionary: ${error}"`);
    }
  }
  /* Add word to user dictionary */
  async addToDictionary(
    denops: Denops,
    word: string,
    meaning: string,
    type: string,
  ): Promise<void> {
    try {
      if (!word || !word.trim()) {
        await denops.cmd('echoerr "Invalid word: word cannot be empty"');
        return;
      }
      if (!this.dictionaryLoader || !this.vimConfigBridge) {
        await this.initializeDictionarySystem(denops);
      }
      if (!this.vimConfigBridge || !this.dictionaryLoader) {
        throw new Error("Dictionary system not initialized");
      }
      const dictConfig = await this.vimConfigBridge.getConfig(denops);
      const dictionaryPath = dictConfig.dictionaryPath || ".hellshake-yano/dictionary.json";
      let dictionary: UserDictionary;
      try {
        dictionary = await this.dictionaryLoader.loadUserDictionary(dictConfig);
      } catch (_) {
        dictionary = {
          customWords: [],
          preserveWords: [],
          mergeRules: new Map(),
          compoundPatterns: [],
          metadata: {
            version: "1.0.0",
            description: "User dictionary for hellshake-yano.vim",
          },
        };
      }
      const wordEntry = word.trim();
      const existingIndex = dictionary.customWords.indexOf(wordEntry);
      if (existingIndex === -1) {
        dictionary.customWords.push(wordEntry);
      }
      let jsonDictionary;
      try {
        const content = await Deno.readTextFile(dictionaryPath);
        jsonDictionary = JSON.parse(content);
      } catch (_) {
        jsonDictionary = {
          words: [],
          patterns: [],
          meta: {
            version: "1.0.0",
            created: new Date().toISOString(),
            description: "User dictionary for hellshake-yano.vim",
          },
        };
      }
      const structuredWordEntry = {
        word: word.trim(),
        meaning: meaning.trim() || word.trim(),
        type: type.trim() || "unknown",
        added: new Date().toISOString(),
      };
      if (!jsonDictionary.words) {
        jsonDictionary.words = [];
      }
      const jsonExistingIndex = jsonDictionary.words.findIndex((w: unknown) =>
        typeof w === "object" && w !== null && "word" in w &&
        (w as { word: string }).word === structuredWordEntry.word
      );
      if (jsonExistingIndex !== -1) {
        jsonDictionary.words[jsonExistingIndex] = structuredWordEntry;
      } else {
        jsonDictionary.words.push(structuredWordEntry);
      }
      try {
        await Deno.mkdir(".hellshake-yano", { recursive: true });
      } catch (_) {
      }
      await Deno.writeTextFile(dictionaryPath, JSON.stringify(jsonDictionary, null, 2));
      await this.dictionaryLoader!.loadUserDictionary(dictConfig);

      await denops.cmd(`echo "Word added to dictionary: ${word}"`);
    } catch (error) {
      await denops.cmd(`echoerr "Failed to add word to dictionary: ${error}"`);
    }
  }

  /**
   * Check if a word exists in the dictionary
   * @param word - The word to check
   * @returns boolean - True if word exists in dictionary
   */
  async isInDictionary(denops: Denops, word: string): Promise<boolean> {
    try {
      if (!this.dictionaryLoader || !this.vimConfigBridge) {
        await this.initializeDictionarySystem(denops);
      }
      const dictConfig = await this.vimConfigBridge!.getConfig(denops);
      const dictionary = await this.dictionaryLoader!.loadUserDictionary(dictConfig);

      // Check in customWords array
      if (dictionary.customWords.includes(word)) {
        return true;
      }

      // Check in preserveWords array
      if (dictionary.preserveWords.includes(word)) {
        return true;
      }

      return false;
    } catch {
      // On error, return false (word not found)
      return false;
    }
  }

  /* Vimのハイライトグループ名として有効かどうか検証する */
  static validateHighlightGroupName(groupName: string): boolean {
    if (!groupName || groupName.length === 0) {
      return false;
    }
    if (groupName.length > 100) {
      return false;
    }
    const firstChar = groupName.charAt(0);
    if (!/[a-zA-Z_]/.test(firstChar)) {
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(groupName)) {
      return false;
    }
    return true;
  }
  public static isValidColorName(colorName: string): boolean {
    if (!colorName || typeof colorName !== "string") {
      return false;
    }
    const validColorNames = [
      "black",
      "darkblue",
      "darkgreen",
      "darkcyan",
      "darkred",
      "darkmagenta",
      "brown",
      "darkgray",
      "darkgrey",
      "lightgray",
      "lightgrey",
      "lightblue",
      "lightgreen",
      "lightcyan",
      "lightred",
      "lightmagenta",
      "yellow",
      "white",
      "red",
      "green",
      "blue",
      "cyan",
      "magenta",
      "gray",
      "grey",
      "none",
      "NONE",
    ];
    return validColorNames.includes(colorName.toLowerCase());
  }
  /**
   * main.ts の isValidHexColor 関数の実装をCore.isValidHexColor静的メソッドとして移植   * @param hexColor 検証する16進数色（例: "#ff0000", "#fff"）
   * @returns
   */
  public static isValidHexColor(hexColor: string): boolean {
    if (!hexColor || typeof hexColor !== "string") {
      return false;
    }
    if (!hexColor.startsWith("#")) {
      return false;
    }
    const hex = hexColor.slice(1);
    if (hex.length !== 3 && hex.length !== 6) {
      return false;
    }
    return /^[0-9a-fA-F]+$/.test(hex);
  }
  /**
   * main.ts の normalizeColorName 関数の実装をCore.normalizeColorName静的メソッドとして移植   * @param color 正規化する色値
   * @returns
   */
  public static normalizeColorName(color: string): string {
    if (!color || typeof color !== "string") {
      return color;
    }
    if (color.startsWith("#")) {
      return color;
    }
    return color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
  }
  /**
   * @param colorConfig 検証するハイライト色設定
   * @returns 検証結果
   */
  public static validateHighlightColor(
    colorConfig: string | HighlightColor,
  ): { valid: boolean; errors: string[] } {
    return validateHighlightColor(colorConfig);
  }
  /**
   * main.ts の generateHighlightCommand 関数の実装をCore.generateHighlightCommand静的メソッドとして移植   * @param hlGroupName ハイライトグループ名
   * @param colorConfig
   * @returns
   */
  public static generateHighlightCommand(
    hlGroupName: string,
    colorConfig: string | HighlightColor,
  ): string {
    if (typeof colorConfig === "string") {
      return `highlight default link ${hlGroupName} ${colorConfig}`;
    }
    const { fg, bg } = colorConfig;
    const parts = [`highlight ${hlGroupName}`];

    if (fg !== undefined) {
      const normalizedFg = Core.normalizeColorName(fg);
      if (fg.startsWith("#")) {
        parts.push(`guifg=${fg}`);
      } else {
        parts.push(`ctermfg=${normalizedFg}`);
        parts.push(`guifg=${normalizedFg}`);
      }
    }

    if (bg !== undefined) {
      const normalizedBg = Core.normalizeColorName(bg);
      if (bg.startsWith("#")) {
        parts.push(`guibg=${bg}`);
      } else {
        parts.push(`ctermbg=${normalizedBg}`);
        parts.push(`guibg=${normalizedBg}`);
      }
    }
    return parts.join(" ");
  }
  /**
   * main.ts の validateHighlightConfig 関数の実装をCore.validateHighlightConfig静的メソッドとして移植   * @param config 検証する設定オブジェクト
   * @returns
   */
  public static validateHighlightConfig(
    config: {
      highlightHintMarker?: string | HighlightColor;
      highlightHintMarkerCurrent?: string | HighlightColor;
    },
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (config.highlightHintMarker !== undefined) {
      const markerResult = Core.validateHighlightColor(config.highlightHintMarker);
      if (!markerResult.valid) {
        errors.push(...markerResult.errors.map((e) => `highlightHintMarker: ${e}`));
      }
    }
    if (config.highlightHintMarkerCurrent !== undefined) {
      const currentResult = Core.validateHighlightColor(config.highlightHintMarkerCurrent);
      if (!currentResult.valid) {
        errors.push(...currentResult.errors.map((e) => `highlightHintMarkerCurrent: ${e}`));
      }
    }
    return { valid: errors.length === 0, errors };
  }
  /**
   * main.ts の getMinLengthForKey 関数の実装をCore.getMinLengthForKey静的メソッドとして移植   * @param config プラグインの設定オブジェクト（Config または Config）
   * @param key
   * @returns
   */
  public static getMinLengthForKey(config: Config | Config, key: string): number {
    const unifiedConfig = config as EnhancedConfig;
    if (
      "perKeyMinLength" in unifiedConfig && unifiedConfig.perKeyMinLength &&
      typeof unifiedConfig.perKeyMinLength === "object"
    ) {
      const perKeyValue = (unifiedConfig.perKeyMinLength as Record<string, number>)[key];
      if (perKeyValue !== undefined && perKeyValue > 0) return perKeyValue;
    }
    if (
      "defaultMinWordLength" in unifiedConfig &&
      typeof unifiedConfig.defaultMinWordLength === "number"
    ) {
      return unifiedConfig.defaultMinWordLength;
    }
    if (
      "default_min_length" in unifiedConfig && typeof unifiedConfig.default_min_length === "number"
    ) {
      return unifiedConfig.default_min_length;
    }
    if ("min_length" in unifiedConfig && typeof unifiedConfig.min_length === "number") {
      return unifiedConfig.min_length;
    }
    if ("minWordLength" in unifiedConfig && typeof unifiedConfig.minWordLength === "number") {
      return unifiedConfig.minWordLength;
    }
    return 3;
  }
  /**
   * main.ts の getMotionCountForKey 関数の実装をCore.getMotionCountForKey静的メソッドとして移植   * @param key 対象のキー文字（例: 'f', 't', 'w'など）
   * @param config
   * @returns
   */
  public static getMotionCountForKey(key: string, config: Config | Config): number {
    const unifiedConfig = config as Config;
    if (unifiedConfig.perKeyMotionCount && unifiedConfig.perKeyMotionCount[key] !== undefined) {
      const value = unifiedConfig.perKeyMotionCount[key];
      if (value >= 1 && Number.isInteger(value)) {
        return value;
      }
    }
    if (unifiedConfig.defaultMotionCount !== undefined && unifiedConfig.defaultMotionCount >= 1) {
      return unifiedConfig.defaultMotionCount;
    }
    if (unifiedConfig.motionCount !== undefined && unifiedConfig.motionCount >= 1) {
      return unifiedConfig.motionCount;
    }
    return 3;
  }
  /*   * sub2-3-2: isRenderingHints - ヒントの描画処理中かどうかを取得   * 非同期描画の状態を外部から確認するためのステータス関数
  /**
 * main.ts の isRenderingHints 関数をCoreクラスに移植   * @returns boolean 描画処理中の場合はtrue、そうでなければfalse   * const core = Core.getInstance();
   */
  isRenderingHints(): boolean {
    return this._isRenderingHints;
  }
  /* sub2-3-3: abortCurrentRendering - 現在実行中の描画処理を中断   * 進行中の非同期描画処理を安全に中断します */
  /**
   * main.ts の abortCurrentRendering 関数をCoreクラスに移植
   * const core = Core.getInstance();
   * core.abortCurrentRendering();
   */
  abortCurrentRendering(): void {
    if (this._renderingAbortController) {
      this._renderingAbortController.abort();
      this._isRenderingHints = false;
      this._renderingAbortController = null;
    }
  }

  enablePlugin(): void {
    this.config.enabled = true;
  }
  /*   * プラグインを無効化 (commands.ts HellshakeYanoController.disable() 統合)
   */
  disablePlugin(): void {
    this.config.enabled = false;
  }
  /*   * プラグインの有効/無効を切り替え (commands.ts HellshakeYanoController.toggle() 統合)
   * @returns 切り替え後の状態
   */
  togglePlugin(): boolean {
    this.config.enabled = !this.config.enabled;
    return this.config.enabled;
  }
  /*   * プラグインが有効かどうかを確認 (commands.ts HellshakeYanoController.isEnabled() 統合)
   * @returns プラグインの有効状態
   */
  isPluginEnabled(): boolean {
    return this.config.enabled;
  }
  /*   * モーション回数を設定 (commands.ts HellshakeYanoConfigManager.setCount() 統合)
   * @param count 正の整数のモーション回数
   * @throws Error countが正の整数でない場合
   */
  setMotionCount(count: number): void {
    if (!Number.isInteger(count) || count <= 0) {
      throw new Error("Motion count must be a positive integer");
    }
    this.config.motionCount = count;
  }
  /*   * モーションタイムアウト時間を設定 (commands.ts HellshakeYanoConfigManager.setTimeout() 統合)
   * @param timeout 100以上の整数のタイムアウト時間（ミリ秒）
   * @throws Error timeoutが100未満の整数でない場合
   */
  setMotionTimeout(timeout: number): void {
    if (!Number.isInteger(timeout) || timeout < 100) {
      throw new Error("timeout must be an integer >= 100ms");
    }
    this.config.motionTimeout = timeout;
  }
  /*   * デバッグモードを切り替え (commands.ts DebugController.toggleDebugMode() 統合)
   * @returns 切り替え後のデバッグモード状態
   */
  toggleDebugMode(): boolean {
    this.config.debugMode = !this.config.debugMode;
    return this.config.debugMode;
  }
  /*   * パフォーマンスログを切り替え (commands.ts DebugController.togglePerformanceLog() 統合)
   * @returns 切り替え後のパフォーマンスログ状態
   */
  togglePerformanceLog(): boolean {
    this.config.performanceLog = !this.config.performanceLog;
    return this.config.performanceLog;
  }
  /*   * 座標デバッグを切り替え (commands.ts DebugController.toggleCoordinateDebug() 統合)
   * @returns 切り替え後の座標デバッグ状態
   */
  toggleCoordinateDebug(): boolean {
    this.config.debugCoordinates = !this.config.debugCoordinates;
    return this.config.debugCoordinates;
  }
  /*   * コマンドファクトリーを取得 (commands.ts CommandFactory 統合)
   * @returns CommandFactoryインスタンス
   */
  getCommandFactory(): CommandFactory {
    return new CommandFactory(this.config);
  }
  /*   * 設定を安全に更新 (commands.ts updateConfigSafely() 統合)
   * @param updates 更新する設定値
   * @param validator バリデーション関数（オプション）
   * @throws Error バリデーションが失敗した場合
   */
  updateConfigSafely(
    updates: Partial<Config>,
    validator?: (config: Partial<Config>) => { valid: boolean; errors: string[] },
  ): void {
    if (validator) {
      const result = validator(updates);
      if (!result.valid) {
        throw new Error(`Configuration validation failed: ${result.errors.join(", ")}`);
      }
    }
    Object.assign(this.config, updates);
  }
  /*   * 設定を元に戻す機能付きの更新 (commands.ts updateConfigWithRollback() 統合)
   * @param updates 更新する設定値
   * @returns ロールバック関数を含むオブジェクト
   */
  updateConfigWithRollback(
    updates: Partial<Config>,
  ): { rollback: () => void } {
    const originalValues: Partial<Config> = {};
    for (const key in updates) {
      if (key in this.config) {
        const configKey = key as keyof Config;
        (originalValues as Record<string, unknown>)[configKey] = this.config[configKey];
      }
    }
    Object.assign(this.config, updates);
    return {
      rollback: () => {
        Object.assign(this.config, originalValues);
      },
    };
  }
  /*   * バッチ設定更新 (commands.ts batchUpdateConfig() 統合)
   * @param updateFunctions 設定更新関数の配列
   * @throws Error いずれかの更新関数でエラーが発生した場合
   */
  batchUpdateConfig(
    updateFunctions: Array<(config: Config) => void>,
  ): void {
    const backup = { ...this.config };
    try {
      updateFunctions.forEach((fn) => fn(this.config));
    } catch (error) {
      Object.assign(this.config, backup);
      throw error;
    }
  }
  /*   * モーションカウンターをインクリメントします
   * @param denops Denopsインスタンス
   * @param bufnr バッファ番号
   * @returns カウント結果（triggered: 閾値到達したか、count: 現在のカウント）
   */
  async incrementMotionCounter(
    denops: Denops,
    bufnr: number,
  ): Promise<{ triggered: boolean; count: number }> {
    if (!this.config.motionCounterEnabled) {
      return { triggered: false, count: 0 };
    }
    const counter = this.motionManager.getCounter(
      bufnr,
      this.config.motionCounterThreshold,
      this.config.motionCounterTimeout,
    );
    const triggered = counter.increment();
    const count = triggered ? 0 : counter.getCount(); // triggeredの時はリセットされるので0
    if (triggered && this.config.showHintOnMotionThreshold) {
    }
    return { triggered, count };
  }
  /*   * 指定バッファのモーションカウントを取得します
   * @param bufnr バッファ番号
   * @returns 現在のカウント
   */
  async getMotionCount(bufnr: number): Promise<number> {
    const counter = this.motionManager.getCounter(bufnr);
    return counter.getCount();
  }
  /*   * 指定バッファのモーションカウンターをリセットします
   * @param bufnr バッファ番号
   */
  async resetMotionCounter(bufnr: number): Promise<void> {
    this.motionManager.resetCounter(bufnr);
  }
  /*   * 指定バッファのモーションカウンターをクリアします
   * @param bufnr バッファ番号
   */
  async clearMotionCounter(bufnr: number): Promise<void> {
    this.motionManager.resetCounter(bufnr);
  }
  /*   * モーションカウンターの閾値を設定します
   * @param threshold 新しい閾値
   */
  setMotionThreshold(threshold: number): void {
    if (threshold < 1) {
      throw new Error("Threshold must be at least 1");
    }
    this.config.motionCounterThreshold = threshold;
  }
  /*   * モーション設定を更新します
   * @param updates 更新する設定
   */
  updateMotionConfig(
    updates: Partial<{
      enabled: boolean;
      threshold: number;
      timeout: number;
      showHintOnThreshold: boolean;
    }>,
  ): void {
    if (updates.enabled !== undefined) {
      this.config.motionCounterEnabled = updates.enabled;
    }
    if (updates.threshold !== undefined) {
      this.setMotionThreshold(updates.threshold);
    }
    if (updates.timeout !== undefined) {
      if (updates.timeout < 100) {
        throw new Error("Timeout must be at least 100ms");
      }
      this.config.motionCounterTimeout = updates.timeout;
    }
    if (updates.showHintOnThreshold !== undefined) {
      this.config.showHintOnMotionThreshold = updates.showHintOnThreshold;
    }
  }
  /*   * 設定を更新（高度な検証処理付き）
   * dispatcher.ts の createConfigDispatcher 機能を統合
   */
  async updateConfigAdvanced(newConfig: Partial<Config>): Promise<void> {
    try {
      this.validateAndApplyMarkers(newConfig);
      this.validateAndApplyMotionCount(newConfig);
      this.validateAndApplyMotionTimeout(newConfig);
      this.validateAndApplyOtherConfigs(newConfig);
      this.syncManagerConfigInternal();
    } catch (error) {
    }
  }
  /*   * 設定をリセット（拡張版）
   */
  resetConfigExtended(): void {
    try {
      this.config = getDefaultConfig();
      this.syncManagerConfigInternal();
    } catch (error) {
    }
  }
  /*   * 詳細なデバッグ情報を取得
   * 注意: extendedプロパティは将来の拡張用に追加予定
   */
  getExtendedDebugInfo(): ExtendedDebugInfo {
    const baseInfo = this.getDebugInfo();
    return {
      ...baseInfo,
      performanceDetails: {
        minExecutionTime: 0,
        maxExecutionTime: 0,
        avgExecutionTime: 0,
      },
      cacheDetails: {
        wordCacheSize: pluginState.caches.words.size(),
        hintCacheSize: pluginState.caches.hints.size(),
        cacheHitRate: 0,
      },
    };
  }
  /*   * ヒントを表示（デバウンス機能付き、拡張版）
   */
  async showHintsWithExtendedDebounce(denops: Denops): Promise<void> {
    await this.showHintsWithDebounce(denops);
  }
  /*   * 入力待機をキャンセル
   */
  async cancelInput(denops: Denops): Promise<void> {
    this.isActive = false;
    this.hideHints(); // 同期的に状態をクリア
    await this.hideHintsAsync(denops);
    this.currentHints = [];
  }
  /*   * 入力文字の分類情報を分析
   */
  analyzeInputCharacter(char: number): {
    char: number;
    wasUpperCase: boolean;
    wasNumber: boolean;
    wasLowerCase: boolean;
    inputString: string;
  } {
    const wasUpperCase = char >= 65 && char <= 90;
    const wasNumber = char >= 48 && char <= 57;
    const wasLowerCase = char >= 97 && char <= 122;
    let inputString: string;
    if (wasUpperCase) {
      inputString = String.fromCharCode(char + 32); // 大文字を小文字に変換
    } else {
      inputString = String.fromCharCode(char);
    }
    return {
      char,
      wasUpperCase,
      wasNumber,
      wasLowerCase,
      inputString,
    };
  }
  /*   * 入力文字が制御文字かどうかをチェック
   */
  isControlCharacter(char: number): boolean {
    if (char === 27) return true;
    if (char < 32 && char !== 13) return true;
    return false;
  }
  /*   * ヒント候補を検索
   */
  findMatchingHints(inputString: string, currentHints: HintMapping[]): HintMapping[] {
    return currentHints.filter((hint) =>
      hint.hint && hint.hint.toLowerCase().startsWith(inputString.toLowerCase())
    );
  }
  /*   * 単文字マッチのヒントを検索
   */
  findExactMatch(inputString: string, currentHints: HintMapping[]): HintMapping | undefined {
    return currentHints.find((hint) =>
      hint.hint && hint.hint.toLowerCase() === inputString.toLowerCase()
    );
  }
  /*   * 複数文字入力管理を作成
   */
  createMultiCharInputManager(): {
    appendInput: (inputString: string) => void;
    getAccumulatedInput: () => string;
    isInMultiCharMode: () => boolean;
    reset: () => void;
    isValidInput: (currentHints: HintMapping[]) => boolean;
  } {
    let inputBuffer = "";
    let isMultiCharMode = false;
    return {
      appendInput(inputString: string): void {
        inputBuffer += inputString;
        isMultiCharMode = true;
      },

      getAccumulatedInput(): string {
        return inputBuffer;
      },

      isInMultiCharMode(): boolean {
        return isMultiCharMode;
      },

      reset(): void {
        inputBuffer = "";
        isMultiCharMode = false;
      },

      isValidInput(currentHints: HintMapping[]): boolean {
        if (inputBuffer.length === 0) return false;
        return currentHints.some((hint) =>
          hint.hint && hint.hint.toLowerCase().startsWith(inputBuffer.toLowerCase())
        );
      },
    };
  }
  /*   * プラグインの初期化処理
   */
  async initializePlugin(denops: Denops): Promise<{
    extmarkNamespace: number | null;
    caches?: {
      words: LRUCache<string, Word[]>;
      hints: LRUCache<string, string[]>;
    };
  }> {
    let extmarkNamespace: number | null = null;
    try {
      if (denops.meta.host === "nvim") {
        extmarkNamespace = await denops.call(
          "nvim_create_namespace",
          EXTMARK_NAMESPACE,
        ) as number;
      }
      return { extmarkNamespace, caches: pluginState.caches };
    } catch (error) {
      return { extmarkNamespace: null, caches: pluginState.caches };
    }
  }
  /*   * マネージャーとの設定同期
   */
  syncManagerConfig(config?: Partial<Config>): void {
    if (config) {
      this.updateConfig(config);
    }
    this.syncManagerConfigInternal();
  }
  /*   * カスタムマーカー設定の検証と適用
   */
  private validateAndApplyMarkers(cfg: Partial<Config>): void {
    if (cfg.markers && Array.isArray(cfg.markers)) {
      const validMarkers = cfg.markers.filter((m): m is string =>
        typeof m === "string" && m.length > 0
      );
      if (validMarkers.length > 0) {
        this.config.markers = validMarkers;
      }
    }
  }
  /*   * motion_count の検証と適用
   */
  private validateAndApplyMotionCount(cfg: Partial<Config>): void {
    if (typeof cfg.motionCount === "number") {
      if (cfg.motionCount >= 1 && Number.isInteger(cfg.motionCount)) {
        this.config.motionCount = cfg.motionCount;
      }
    }
  }
  /*   * motion_timeout の検証と適用
   */
  private validateAndApplyMotionTimeout(cfg: Partial<Config>): void {
    if (typeof cfg.motionTimeout === "number") {
      if (cfg.motionTimeout >= 100) {
        this.config.motionTimeout = cfg.motionTimeout;
      }
    }
  }
  /*   * その他の設定項目の検証と適用
   */
  private validateAndApplyOtherConfigs(cfg: Partial<Config>): void {
    if (typeof cfg.enabled === "boolean") {
      this.config.enabled = cfg.enabled;
    }
    if (typeof cfg.debugMode === "boolean") {
      this.config.debugMode = cfg.debugMode;
    }

    if (typeof cfg.performanceLog === "boolean") {
      this.config.performanceLog = cfg.performanceLog;
    }
    if (typeof cfg.hintPosition === "string") {
      this.config.hintPosition = cfg.hintPosition;
    }
    if (typeof cfg.maxHints === "number" && cfg.maxHints > 0) {
      this.config.maxHints = cfg.maxHints;
    }

    if (typeof cfg.debounceDelay === "number" && cfg.debounceDelay >= 0) {
      this.config.debounceDelay = cfg.debounceDelay;
    }
  }
  /*   * 内部的なマネージャー設定同期処理
   */
  private syncManagerConfigInternal(): void {
    try {
    } catch (error) {
    }
  }
  /*   * プラグインを有効化します
   */
  enable(): void {
    this.config.enabled = true;
  }
  /*   * プラグインを無効化します
   */
  disable(): void {
    this.config.enabled = false;
  }
  /*   * プラグインの有効/無効を切り替えます
   * @returns 切り替え後の有効状態
   */
  toggle(): boolean {
    this.config.enabled = !this.config.enabled;
    return this.config.enabled;
  }
  /*   * 設定をデフォルト値にリセットします
   */
  resetConfig(): void {
    this.config = getDefaultConfig();
  }
  /*   * デバッグ情報を取得します
   * @returns デバッグ情報オブジェクト
   */
  getDebugInfo(): DebugInfo {
    return {
      config: this.config,
      hintsVisible: this.isActive,
      currentHints: this.currentHints,
      metrics: pluginState.performanceMetrics,
      timestamp: Date.now(),
    };
  }
  /*   * パフォーマンスログをクリアします
   */
  clearPerformanceLog(): void {
  }
  /*   * デバウンス付きでヒントを表示します
   * @param denops Denopsインスタンス
   */
  async showHintsWithDebounce(denops: Denops): Promise<void> {
    await this.showHints(denops);
  }
  /*   * 即座にヒントを表示します
   * @param denops Denopsインスタンス
   */
  async showHintsImmediately(denops: Denops): Promise<void> {
    this.isActive = true;
    this.currentHints = [
      {
        word: { text: "dummy", line: 1, col: 1 },
        hint: "a",
        hintCol: 1,
        hintByteCol: 1,
      },
    ];
    const maybeMockDenops = denops as unknown;
    if (
      typeof maybeMockDenops === "object" &&
      maybeMockDenops !== null &&
      "call" in maybeMockDenops &&
      typeof (maybeMockDenops as { call?: unknown }).call === "function"
    ) {
      try {
        await ((maybeMockDenops as { call: () => Promise<void> }).call());
      } catch (error) {
        this.isActive = false;
        this.currentHints = [];
        throw error;
      }
    }
  }
  /*   * ヒントを非表示にします（オーバーロード対応）
   * @param denops Denopsインスタンス（オプショナル）
   */
  async hideHintsAsync(denops?: Denops): Promise<void> {
    this.hideHints();
    if (denops) {
      await this.hideHintsOptimized(denops);
    }
  }
  /*   * Optimized word detection with enhanced configuration support
   * @param params Detection parameters including denops and configuration
   * @returns Promise resolving to array of detected words
   */
  public static async detectWordsOptimized(params: {
    denops: Denops;
    bufnr?: number;
    config?: Partial<Config>;
  }): Promise<Word[]> {
    const core = Core.getInstance();
    if (core.detectWords) {
      const context: DetectionContext = {
        bufnr: params.bufnr || 0,
        config: params.config,
      };
      const result = await core.detectWords(context);
      return result.words;
    }
    return [];
  }
  /*   * Factory function for testing word detection
   * @param mockDetector Optional mock detector for testing
   * @returns Word detection function
   */
  static createDetectWordsOptimized(
    mockDetector?: (
      params: { denops: Denops; bufnr?: number; config?: Partial<Config> },
    ) => Promise<Word[]>,
  ) {
    return mockDetector || Core.detectWordsOptimized.bind(Core);
  }
  /*   * Optimized hint generation with enhanced configuration support
   * @param params Generation parameters including word count and configuration
   * @returns Array of generated hints
   */
  public static generateHintsOptimized(params: {
    wordCount: number;
    markers?: string | string[];
    config?: Partial<Config>;
  }): string[] {
    const core = Core.getInstance();
    if (core.generateHints) {
      const words: Word[] = Array.from({ length: params.wordCount }, (_, i) => ({
        text: `word${i}`,
        line: 1,
        col: i + 1,
      }));
      const hints = core.generateHints(words);
      return hints.map((h) => h.hint || h.toString());
    }
    const markers = typeof params.markers === "string"
      ? params.markers
      : Array.isArray(params.markers)
      ? params.markers.join("")
      : "abcdefghijklmnopqrstuvwxyz";
    const hints: string[] = [];
    for (let i = 0; i < params.wordCount && i < markers.length; i++) {
      hints.push(markers[i]);
    }
    return hints;
  }
  /*   * Factory function for testing hint generation
   * @param mockGenerator Optional mock generator for testing
   * @returns Hint generation function
   */
  static createGenerateHintsOptimized(
    mockGenerator?: (
      params: { wordCount: number; markers?: string | string[]; config?: Partial<Config> },
    ) => string[],
  ) {
    return mockGenerator || Core.generateHintsOptimized.bind(Core);
  }
  /*   * Clear hint cache for regeneration
   * Consolidated from core/generation.ts
   */
  static clearHintCache(): void {
    const core = Core.getInstance();
    if (core.clearCache) {
      core.clearCache();
    }
  }
  public static hintsVisible = false;
  public static currentHints: HintMapping[] = [];
  /*   * Show hints with debounce support
   * @param denops Denops instance
   * @param config Show hints configuration
   */
  public static async showHints(
    denops: Denops,
    config: { debounce?: number; force?: boolean; debounceDelay?: number } = {},
  ): Promise<void> {
    const core = Core.getInstance();
    if (core.showHints) {
      await core.showHints(denops);
    }
    (Core as any).hintsVisible = true;
  }
  /*   * Hide hints and clear display
   * @param denops Denops instance
   */
  public static async hideHints(denops: Denops): Promise<void> {
    const core = Core.getInstance();
    if (core.hideHints) {
      await core.hideHints();
    }
    (Core as any).hintsVisible = false;
    (Core as any).currentHints = [];
  }
  /*   * Clear hint display completely
   * @param denops Denops instance
   */
  public static async clearHintDisplay(denops: Denops): Promise<void> {
    const core = Core.getInstance();
    if (core.hideHints) {
      await core.hideHints();
    }
    (Core as any).hintsVisible = false;
    (Core as any).currentHints = [];
  }
  /*   * Create hint operations manager with dependency injection
   * @param config Configuration for hint operations
   * @returns Hint operations interface
   */
  static createHintOperations(config?: {
    denops: Denops;
    config?: Partial<Config>;
    dependencies?: HintOperationsDependencies;
  }): HintOperations {
    const { denops, dependencies } = config || {};
    return {
      show: Core.showHints.bind(Core),
      hide: Core.hideHints.bind(Core),
      clear: Core.clearHintDisplay.bind(Core),
      isHintsVisible: () => (Core as any).hintsVisible,
      getCurrentHints: () => (Core as any).currentHints,
    };
  }
  /*   * Check if hints are currently visible
   * @returns Boolean indicating hint visibility state
   */
  static isHintsVisible(): boolean {
    return (Core as any).hintsVisible;
  }
  /*   * Get current hints array
   * @returns Array of current hint mappings
   */
  static getCurrentHints(): HintMapping[] {
    return (Core as any).currentHints;
  }

  // ========================================
  // Multi-window support methods (Process 7)
  // ========================================

  /**
   * Internal method for multi-window hint display with user input handling
   * Called from showHintsInternal when multiWindowMode is active
   * @param denops - Denops instance
   * @param mode - Display mode (default: "normal")
   */
  async showHintsMultiWindowInternal(denops: Denops, mode?: string): Promise<void> {
    // フォーカス復帰直後は処理をスキップ（ちらつき防止）
    // hideHints() より前にチェックすることで、画面クリアによるちらつきを防止
    const shouldRedraw = await denops.call("hellshake_yano#core#should_redraw") as boolean;
    if (!shouldRedraw) {
      return; // VimScript側の遅延処理後に再度呼ばれる
    }

    const modeString = mode || "normal";
    try {
      await this.hideHintsMultiWindow(denops);

      const hintMappings = await this.showHintsMultiWindow(denops);

      if (hintMappings.length === 0) {
        return;
      }

      this.currentHints = hintMappings;
      this.isActive = true;

      // Wait for user input and handle jump (including cross-window jump)
      await this.waitForUserInputMultiWindow(denops);
    } catch (error) {
      console.error("[hellshake-yano] showHintsMultiWindowInternal error:", error);
      this.hideHints();
    }
  }

  /**
   * Wait for user input in multi-window mode and handle cross-window jump
   * @param denops - Denops instance
   */
  async waitForUserInputMultiWindow(denops: Denops): Promise<void> {
    try {
      const inputChars: string[] = [];
      const maxInputLength = 2; // Support 2-char hints

      while (inputChars.length < maxInputLength) {
        const char = await denops.call("getcharstr") as string;

        // ESC to cancel
        if (char === "\x1b" || char === "") {
          await this.hideHintsMultiWindow(denops);
          return;
        }
        if (isConfiguredCancelKey(char, this.config.cancelKeys)) {
          await this.hideHintsMultiWindow(denops);
          await denops.cmd(`call feedkeys(${JSON.stringify(char)}, 'm')`);
          this.resetContinuousModeState();
          return;
        }

        inputChars.push(char);
        const inputStr = inputChars.join("");

        // Update highlight for candidate hints (Bug 1 fix)
        if (this.currentHints.length > 0) {
          await this.highlightCandidateHintsHybrid(denops, this.currentHints, inputStr);
        }

        // Find matching hint
        const matchingHint = this.currentHints.find((h) => h.hint === inputStr);

        if (matchingHint) {
          await this.hideHintsMultiWindow(denops);

          // Handle cross-window jump if winid is present
          if (
            matchingHint.word.winid && matchingHint.word.winid !== await denops.call("win_getid")
          ) {
            await denops.call("win_gotoid", matchingHint.word.winid);
          }

          // Move cursor to target position
          // Use byteCol fallback chain (same as jumpToHintTarget) for correct multi-byte handling
          const col = matchingHint.hintByteCol ??
            matchingHint.hintCol ??
            matchingHint.word.byteCol ??
            matchingHint.word.col;
          await denops.call("cursor", matchingHint.word.line, col);
          // Bug 3 fix: Call postJumpHandler for continuousHintMode check
          await this.postJumpHandler(denops, matchingHint);
          return;
        }

        // Check if any hints start with current input
        const possibleMatches = this.currentHints.filter((h) => h.hint.startsWith(inputStr));
        if (possibleMatches.length === 0) {
          // No matches, cancel
          await this.hideHintsMultiWindow(denops);
          return;
        }
      }

      // Max input reached without match
      await this.hideHintsMultiWindow(denops);
    } catch (error) {
      console.error("[hellshake-yano] waitForUserInputMultiWindow error:", error);
      await this.hideHintsMultiWindow(denops);
    }
  }

  /**
   * Show hints across multiple windows
   * Detects words in all visible windows and displays hints
   * @param denops - Denops instance
   * @param config - Optional partial config override
   * @returns Array of hint mappings for all visible windows
   */
  async showHintsMultiWindow(denops: Denops, config?: Partial<Config>): Promise<HintMapping[]> {
    const effectiveConfig = { ...this.config, ...config };
    try {
      const { detectWordsMultiWindow } = await import("./word.ts");
      const { displayHintsAutoMultiBuffer } = await import("../display/extmark-display.ts");
      const { generateHints } = await import("./hint.ts");

      // Create DetectionContext with minWordLength from config
      // This ensures consistent word filtering across all windows
      const context: DetectionContext = {
        minWordLength: effectiveConfig.defaultMinWordLength ?? 3,
      };

      const words = await detectWordsMultiWindow(denops, effectiveConfig, context);
      if (words.length === 0) {
        return [];
      }

      const hints = generateHints(words.length, {
        singleCharKeys: effectiveConfig.singleCharKeys,
        multiCharKeys: effectiveConfig.multiCharKeys,
        markers: effectiveConfig.markers,
      });

      // Get or create extmark namespace for multi-buffer display
      let extmarkNamespace: number | undefined;
      if (denops.meta.host === "nvim") {
        extmarkNamespace = await denops.call(
          "nvim_create_namespace",
          EXTMARK_NAMESPACE,
        ) as number;
      }

      // Use auto multi-buffer display with extmark namespace
      const hintMappings = await displayHintsAutoMultiBuffer(
        denops,
        words,
        hints,
        effectiveConfig,
        extmarkNamespace,
      );
      this.currentHints = hintMappings;

      return hintMappings;
    } catch (error) {
      console.error("[hellshake-yano] showHintsMultiWindow error:", error);
      return [];
    }
  }

  /**
   * Hide hints from all windows/buffers
   * @param denops - Denops instance
   */
  async hideHintsMultiWindow(denops: Denops): Promise<void> {
    try {
      const { hideHintsMultiBuffer } = await import("../display/extmark-display.ts");

      // Get extmark namespace for proper cleanup
      let extmarkNamespace: number | undefined;
      if (denops.meta.host === "nvim") {
        extmarkNamespace = await denops.call(
          "nvim_create_namespace",
          EXTMARK_NAMESPACE,
        ) as number;
      }

      await hideHintsMultiBuffer(denops, extmarkNamespace);
      this.currentHints = [];
    } catch (error) {
      console.error("[hellshake-yano] hideHintsMultiWindow error:", error);
    }
  }

  /**
   * Check if multi-window mode is currently active
   * @param denops - Denops instance
   * @returns true if multiple editable windows are visible and mode is enabled
   */
  async isMultiWindowModeActive(denops: Denops): Promise<boolean> {
    const { shouldUseMultiWindowMode } = await import("./window.ts");
    return await shouldUseMultiWindowMode(denops, this.config);
  }

  /**
   * Get visible windows in current tabpage
   * @param denops - Denops instance
   * @returns Array of WindowInfo for visible editable windows
   */
  async getVisibleWindows(denops: Denops): Promise<WindowInfo[]> {
    const { getVisibleWindows } = await import("./window.ts");
    return await getVisibleWindows(denops, this.config);
  }

  /**
   * Enable multi-window mode
   */
  enableMultiWindowMode(): void {
    this.config.multiWindowMode = true;
  }

  /**
   * Disable multi-window mode
   */
  disableMultiWindowMode(): void {
    this.config.multiWindowMode = false;
  }

  /**
   * Toggle multi-window mode
   * @returns New state of multi-window mode
   */
  toggleMultiWindowMode(): boolean {
    this.config.multiWindowMode = !this.config.multiWindowMode;
    return this.config.multiWindowMode;
  }

  /**
   * Check if multi-window mode is enabled in config
   * @returns true if multiWindowMode config is true
   */
  isMultiWindowModeEnabled(): boolean {
    return this.config.multiWindowMode;
  }

  /**
   * Update multi-window configuration
   * @param updates - Configuration updates for multi-window settings
   */
  updateMultiWindowConfig(updates: {
    multiWindowMode?: boolean;
    multiWindowExcludeTypes?: string[];
    multiWindowMaxWindows?: number;
  }): void {
    if (updates.multiWindowMode !== undefined) {
      this.config.multiWindowMode = updates.multiWindowMode;
    }
    if (updates.multiWindowExcludeTypes !== undefined) {
      this.config.multiWindowExcludeTypes = updates.multiWindowExcludeTypes;
    }
    if (updates.multiWindowMaxWindows !== undefined) {
      this.config.multiWindowMaxWindows = updates.multiWindowMaxWindows;
    }
  }
}
/* * API統合クラス (process4 sub4-1) * api.tsの機能をcore.tsに統合するために作成された専用クラス
 * 既存のCoreクラスのシングルトンパターンを維持しつつ、
 * 通常のコンストラクタでテスト可能なAPIインターフェースを提供
 */
/* * ハイライト色設定インターフェース
 * fg（前景色）とbg（背景色）を個別に指定するための型定義 * @interface HighlightColor - Already defined in types.ts, importing from there
 */
export { validateHighlightGroupName };
export { isValidColorName };
export { isValidHexColor, validateHighlightColor };
/** */
export class HellshakeYanoCore {
  /** プラグインの設定 */
  private config: Config;
  /** CommandFactoryインスタンス */
  private commandFactory: CommandFactory;
  constructor(initialConfig: Config = getDefaultConfig()) {
    this.config = initialConfig;
    this.commandFactory = new CommandFactory(this.config);
  }
  enable(): void {
    enable(this.config);
  }
  disable(): void {
    disable(this.config);
  }
  toggle(): boolean {
    return toggle(this.config);
  }
  isEnabled(): boolean {
    return this.config.enabled;
  }
  getConfig(): Config {
    return { ...this.config };
  }
  updateConfig(updates: Partial<Config>): void {
    const validation = validateConfig(updates);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(", ")}`);
    }
    this.config = { ...this.config, ...updates };
  }
  resetConfig(): void {
    this.config = getDefaultConfig();
    this.commandFactory = new CommandFactory(this.config);
  }
  setCount(count: number): void {
    setCount(this.config, count);
  }
  setTimeout(timeout: number): void {
    setTimeoutCommand(this.config, timeout);
  }
  async initialize(denops: Denops, options: any = {}): Promise<void> {
    await initializePlugin(denops, { config: this.config, ...options });
  }
  async cleanup(denops: Denops): Promise<void> {
    await cleanupPlugin(denops);
  }
  getDebugInfo(): any {
    const state = getPluginState();
    return {
      config: this.config,
      state: {
        initialized: state.initialized,
        hintsVisible: state.hintsVisible,
        currentHintsCount: state.currentHints.length,
      },
      cacheStats: {
        words: state.caches.words.getStats(),
        hints: state.caches.hints.getStats(),
      },
    };
  }
  getStatistics(): any {
    return getPluginStatistics();
  }
  async healthCheck(denops: Denops): Promise<any> {
    return await healthCheck(denops);
  }
  clearCache(): void {
    const state = getPluginState();
    state.caches.words.clear();
    state.caches.hints.clear();
  }
  async incrementMotionCounter(
    denops: Denops,
    bufnr: number,
  ): Promise<{ triggered: boolean; count: number }> {
    const core = Core.getInstance();
    return core.incrementMotionCounter(denops, bufnr);
  }
  /*   * 指定バッファのモーションカウントを取得します
   * @param bufnr バッファ番号
   * @returns 現在のカウント
   */
  async getMotionCount(bufnr: number): Promise<number> {
    const core = Core.getInstance();
    return core.getMotionCount(bufnr);
  }
  /*   * 指定バッファのモーションカウンターをリセットします
   * @param bufnr バッファ番号
   */
  async resetMotionCounter(bufnr: number): Promise<void> {
    const core = Core.getInstance();
    return core.resetMotionCounter(bufnr);
  }
  /*   * モーションカウンターの閾値を設定します
   * @param threshold 新しい閾値
   */
  setMotionThreshold(threshold: number): void {
    const core = Core.getInstance();
    core.setMotionThreshold(threshold);
  }
  /*   * モーション設定を更新します
   * @param updates 更新する設定
   */
  updateMotionConfig(
    updates: Partial<{
      enabled: boolean;
      threshold: number;
      timeout: number;
      showHintOnThreshold: boolean;
    }>,
  ): void {
    const core = Core.getInstance();
    core.updateMotionConfig(updates);
  }
  /*   * Create a cache for display width calculations   * @param maxSize - Maximum number of entries in cache (default: 1000)
   * @returns LRUCache instance for caching display width calculations
   */
  static async createDisplayWidthCache(
    maxSize = 1000,
  ): Promise<import("./cache.ts").LRUCache<string, number>> {
    const { LRUCache } = await import("./cache.ts");
    return new (LRUCache as any)(maxSize) as import("./cache.ts").LRUCache<string, number>;
  }
  /*   * 一般的な文字列のグローバルキャッシュ（遅延初期化）
   * 頻繁に計算される文字列の表示幅をキャッシュ
   */
  private static _globalDisplayWidthCache: import("./cache.ts").LRUCache<string, number> | null =
    null;
  /*   * グローバルキャッシュのゲッター（遅延初期化）
   */
  private static async getGlobalDisplayWidthCache(): Promise<
    import("./cache.ts").LRUCache<string, number>
  > {
    if (!this._globalDisplayWidthCache) {
      this._globalDisplayWidthCache = await this.createDisplayWidthCache(2000);
    }
    return this._globalDisplayWidthCache;
  }
  /* Cached version of getDisplayWidth for improved performance */
  static async getDisplayWidthCached(text: string, tabWidth = 8): Promise<number> {
    if (text == null || text.length === 0) {
      return 0;
    }
    const cacheKey = `${text}_${tabWidth}`;
    const cache = await this.getGlobalDisplayWidthCache();
    const cached = cache.get(cacheKey);

    if (cached !== undefined) {
      return cached;
    }
    const { getDisplayWidth } = await import("./hint.ts");
    const width = getDisplayWidth(text, tabWidth);
    cache.set(cacheKey, width);
    return width;
  }
  /* Get display width using Vim's strdisplaywidth() function */
  static async getVimDisplayWidth(denops: Denops, text: string): Promise<number> {
    try {
      const fn = await import("https://deno.land/x/denops_std@v5.0.1/function/mod.ts");
      const width = await fn.strdisplaywidth(denops, text);
      return typeof width === "number" ? width : 0;
    } catch (error) {
      const { getDisplayWidth } = await import("./hint.ts");
      return getDisplayWidth(text);
    }
  }
  /* Clear the global display width cache */
  static async clearDisplayWidthCache(): Promise<void> {
    if (this._globalDisplayWidthCache) {
      this._globalDisplayWidthCache.clear();
    }
    const { GlobalCache, CacheType } = await import("./cache.ts");
    const CHAR_WIDTH_CACHE = (GlobalCache as any).getInstance().getCache(
      CacheType.CHAR_WIDTH,
    ) as Map<number, number>;
    CHAR_WIDTH_CACHE.clear();
    for (let i = 0x20; i <= 0x7E; i++) {
      CHAR_WIDTH_CACHE.set(i, 1);
    }
  }
  /* 性能監視用キャッシュ統計の取得   * 文字列キャッシュと文字キャッシュの統計情報を提供。 */
  static async getDisplayWidthCacheStats() {
    const { GlobalCache, CacheType } = await import("./cache.ts");
    const CHAR_WIDTH_CACHE = (GlobalCache as any).getInstance().getCache(
      CacheType.CHAR_WIDTH,
    ) as Map<number, number>;
    const cache = await this.getGlobalDisplayWidthCache();
    return {
      stringCache: cache.getStats(),
      charCacheSize: CHAR_WIDTH_CACHE.size,
    };
  }
  /* テキストに全角文字が含まれているかをチェックするユーティリティ関数   * コストの高い幅計算の前の高速スクリーニングに有用。 */
  static hasWideCharacters(text: string): boolean {
    if (!text || text.length === 0) {
      return false;
    }

    for (let i = 0; i < text.length;) {
      const codePoint = text.codePointAt(i);
      if (codePoint === undefined) {
        i++;
        continue;
      }
      if (
        codePoint >= 0x1100 && (
          this.isInCJKRange(codePoint) ||
          this.isInEmojiRange(codePoint) ||
          this.isInExtendedWideRange(codePoint)
        )
      ) {
        return true;
      }
      i += codePoint > 0xFFFF ? 2 : 1;
    }
    return false;
  }
  /*   * 最適化された範囲を使用したCJK文字の高速チェック
   * @param codePoint Unicodeコードポイント
   * @returns CJK文字の場合true
   */
  private static isInCJKRange(codePoint: number): boolean {
    const CJK_RANGES = [
      [0x3000, 0x303F], // CJK記号と句読点
      [0x3040, 0x309F], // ひらがな
      [0x30A0, 0x30FF], // カタカナ
      [0x4E00, 0x9FFF], // CJK統合漢字
      [0xFF00, 0xFFEF], // 半角・全角形式
    ] as const;

    for (const [start, end] of CJK_RANGES) {
      if (codePoint >= start && codePoint <= end) {
        return true;
      }
    }
    return (
      (codePoint >= 0x1100 && codePoint <= 0x115F) || // ハングル字母
      (codePoint >= 0x2E80 && codePoint <= 0x2EFF) || // CJK部首補助
      (codePoint >= 0x2F00 && codePoint <= 0x2FDF) || // 康熙部首
      (codePoint >= 0x3100 && codePoint <= 0x312F) || // 注音字母
      (codePoint >= 0x3130 && codePoint <= 0x318F) || // ハングル互換字母
      (codePoint >= 0x3200 && codePoint <= 0x33FF) || // 囲みCJK文字・月 + CJK互換
      (codePoint >= 0x3400 && codePoint <= 0x4DBF) || // CJK拡張A
      (codePoint >= 0xAC00 && codePoint <= 0xD7AF) || // ハングル音節
      (codePoint >= 0xF900 && codePoint <= 0xFAFF) // CJK互換漢字
    );
  }
  /*   * 絵文字範囲の高速チェッカー
   * @param codePoint Unicodeコードポイント
   * @returns 絵文字の場合true
   */
  private static isInEmojiRange(codePoint: number): boolean {
    const EMOJI_RANGES = [
      [0x1F600, 0x1F64F], // 顔文字
      [0x1F300, 0x1F5FF], // その他の記号と絵文字
      [0x1F680, 0x1F6FF], // 交通・地図記号
      [0x1F1E6, 0x1F1FF], // 地域表示記号
    ] as const;

    for (const [start, end] of EMOJI_RANGES) {
      if (codePoint >= start && codePoint <= end) {
        return true;
      }
    }
    return (
      (codePoint >= 0x1F000 && codePoint <= 0x1F0FF) || // 麻雀/ドミノ/トランプ
      (codePoint >= 0x1F100 && codePoint <= 0x1F2FF) || // 囲み英数字/表意文字補助
      (codePoint >= 0x1F700 && codePoint <= 0x1F9FF) || // 拡張絵文字範囲
      (codePoint >= 0x1FA00 && codePoint <= 0x1FAFF) // チェス記号 + 拡張絵記号
    );
  }
  /*   * 拡張全角文字範囲チェッカー（矢印、記号など）
   * @param codePoint Unicodeコードポイント
   * @returns 幅が2の文字の場合true
   */
  private static isInExtendedWideRange(codePoint: number): boolean {
    return (
      this.isLatinMathSymbol(codePoint) ||
      (codePoint >= 0x2190 && codePoint <= 0x21FF) || // 矢印
      (codePoint >= 0x2460 && codePoint <= 0x24FF) || // 囲み英数字（④ など）
      (codePoint >= 0x2500 && codePoint <= 0x25FF) || // 罫線素片（□ など）
      (codePoint >= 0x2600 && codePoint <= 0x26FF) || // その他の記号
      (codePoint >= 0x2700 && codePoint <= 0x27BF) || // 装飾記号
      (codePoint >= 0xFE10 && codePoint <= 0xFE1F) || // 縦書き形式
      (codePoint >= 0xFE30 && codePoint <= 0xFE6F) // CJK互換形式 + 小字形バリエーション
    );
  }
  /*   * 幅が2であるべきLatin-1補助数学記号かチェック
   * @param codePoint Unicodeコードポイント
   * @returns 数学記号の場合true
   */
  private static isLatinMathSymbol(codePoint: number): boolean {
    return (
      codePoint === 0x00D7 || // × (multiplication sign)
      codePoint === 0x00F7 // ÷ (division sign)
    );
  }

  // ============================================================================
  // Multi-Window Support (Phase MW)
  // ============================================================================

  /**
   * Show hints across multiple windows
   * Delegates to Core singleton for actual implementation
   * @param denops - Denops instance
   * @param config - Optional partial configuration override
   * @returns Promise resolving to hint mappings
   */
  async showHintsMultiWindow(
    denops: Denops,
    config?: Partial<Config>,
  ): Promise<HintMapping[]> {
    const core = Core.getInstance(this.config);
    return await core.showHintsMultiWindow(denops, config);
  }

  /** Hide hints across multiple buffers */
  async hideHintsMultiWindow(denops: Denops): Promise<void> {
    const core = Core.getInstance(this.config);
    await core.hideHintsMultiWindow(denops);
  }

  /** Check if multi-window mode is active */
  async isMultiWindowModeActive(denops: Denops): Promise<boolean> {
    try {
      const { shouldUseMultiWindowMode } = await import("./window.ts");
      return await shouldUseMultiWindowMode(denops, this.config);
    } catch {
      return false;
    }
  }

  /** Get visible windows information */
  async getVisibleWindows(denops: Denops): Promise<WindowInfo[]> {
    try {
      const { getVisibleWindows } = await import("./window.ts");
      return await getVisibleWindows(denops, this.config);
    } catch {
      return [];
    }
  }

  /** Enable multi-window mode */
  enableMultiWindowMode(): void {
    this.config.multiWindowMode = true;
  }

  /** Disable multi-window mode */
  disableMultiWindowMode(): void {
    this.config.multiWindowMode = false;
  }

  /** Toggle multi-window mode */
  toggleMultiWindowMode(): boolean {
    this.config.multiWindowMode = !this.config.multiWindowMode;
    return this.config.multiWindowMode;
  }

  /** Check if multi-window mode is enabled in config */
  isMultiWindowModeEnabled(): boolean {
    return this.config.multiWindowMode;
  }

  /** Update multi-window configuration */
  updateMultiWindowConfig(
    updates: {
      multiWindowMode?: boolean;
      multiWindowExcludeTypes?: string[];
      multiWindowMaxWindows?: number;
    },
  ): void {
    if (updates.multiWindowMode !== undefined) {
      this.config.multiWindowMode = updates.multiWindowMode;
    }
    if (updates.multiWindowExcludeTypes !== undefined) {
      this.config.multiWindowExcludeTypes = updates.multiWindowExcludeTypes;
    }
    if (updates.multiWindowMaxWindows !== undefined) {
      if (updates.multiWindowMaxWindows < 1) {
        throw new Error("multiWindowMaxWindows must be at least 1");
      }
      this.config.multiWindowMaxWindows = updates.multiWindowMaxWindows;
    }
  }
}
export { isControlCharacter };

export type InputCharacterInfo = {
  char: number;
  wasUpperCase: boolean;
  wasNumber: boolean;
  wasLowerCase: boolean;
  inputString: string;
};

export const {
  detectWordsOptimized,
  createDetectWordsOptimized,
  generateHintsOptimized,
  createGenerateHintsOptimized,
  clearHintCache,
  showHints,
  hideHints,
  clearHintDisplay,
  createHintOperations,
  isHintsVisible,
  getCurrentHints,
} = Core;
export { CommandFactory, MotionCounter, MotionManager };
export { cleanupPlugin, getPluginState, getPluginStatistics, initializePlugin, updatePluginState };
function recordPerformanceMetric(operation: string, duration: number): void {
  const state = getPluginState();
  if (state.performanceMetrics[operation as keyof typeof state.performanceMetrics]) {
    state.performanceMetrics[operation as keyof typeof state.performanceMetrics].push(duration);
  }
}
export { recordPerformanceMetric };
