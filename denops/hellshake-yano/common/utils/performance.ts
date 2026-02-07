/**
 * denops/hellshake-yano/common/utils/performance.ts
 *
 * パフォーマンス計測とキャッシュ管理
 *
 * performance.tsの機能を統合しています:
 * - パフォーマンスメトリクス記録
 * - LRUキャッシュ管理
 * - デバッグ情報収集
 */

import type { Denops } from "jsr:@denops/std@^7.4.0";
import type { Config } from "../types/config.ts";
import type { HintMapping } from "../types/hint.ts";
import type { DenopsWord as Word } from "../types/word.ts";
import { LRUCache } from "../cache/unified-cache.ts";
import { detectWordsWithManager } from "../../neovim/core/word.ts";
import { generateHints } from "../../neovim/core/hint.ts";

/**
 * パフォーマンスメトリクス
 */
export interface PerformanceMetrics {
  showHints: number[];
  hideHints: number[];
  wordDetection: number[];
  hintGeneration: number[];
  wordDetectionMultiWindow: number[];
  wordDetectionVisual: number[];
}

/**
 * デバッグ情報
 */
export interface DebugInfo {
  config: Config;
  hintsVisible: boolean;
  currentHints: HintMapping[];
  metrics: PerformanceMetrics;
  timestamp: number;
}

// グローバルメトリクス
let performanceMetrics: PerformanceMetrics = {
  showHints: [],
  hideHints: [],
  wordDetection: [],
  hintGeneration: [],
  wordDetectionMultiWindow: [],
  wordDetectionVisual: [],
};

// グローバルキャッシュ
const WORDS_CACHE = new LRUCache<string, Word[]>(100);
const HINTS_CACHE = new LRUCache<string, string[]>(50);

// ========== パフォーマンス記録 ==========

/**
 * パフォーマンス記録
 *
 * @param operation - 操作の種類
 * @param duration - 所要時間（ミリ秒）
 */
export function recordPerformance(
  operation: keyof PerformanceMetrics,
  duration: number,
): void {
  const metrics = performanceMetrics[operation];
  metrics.push(duration);
  if (metrics.length > 50) metrics.shift();
}

/**
 * メトリクス取得
 *
 * @returns パフォーマンスメトリクス
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  return performanceMetrics;
}

/**
 * メトリクスリセット
 */
export function resetPerformanceMetrics(): void {
  performanceMetrics = {
    showHints: [],
    hideHints: [],
    wordDetection: [],
    hintGeneration: [],
    wordDetectionMultiWindow: [],
    wordDetectionVisual: [],
  };
}

// ========== キャッシュ管理 ==========

/**
 * 単語キャッシュを取得
 *
 * @returns 単語キャッシュ
 */
export function getWordsCache(): LRUCache<string, Word[]> {
  return WORDS_CACHE;
}

/**
 * ヒントキャッシュを取得
 *
 * @returns ヒントキャッシュ
 */
export function getHintsCache(): LRUCache<string, string[]> {
  return HINTS_CACHE;
}

/**
 * キャッシュをクリア
 */
export function clearCaches(): void {
  WORDS_CACHE.clear();
  HINTS_CACHE.clear();
}

// ========== デバッグ情報 ==========

/**
 * デバッグ情報を収集
 *
 * @param hintsVisible - ヒント表示中かどうか
 * @param currentHints - 現在のヒントマッピング
 * @param config - 設定オブジェクト
 * @returns デバッグ情報
 */
export function collectDebugInfo(
  hintsVisible: boolean,
  currentHints: HintMapping[],
  config: Config,
): DebugInfo {
  return {
    config,
    hintsVisible,
    currentHints,
    metrics: performanceMetrics,
    timestamp: Date.now(),
  };
}

/**
 * デバッグ情報をクリア
 * パフォーマンスメトリクスをリセットします
 */
export function clearDebugInfo(): void {
  resetPerformanceMetrics();
}

// ========== 最適化された操作 ==========

/**
 * 単語を最適化されたキャッシュ付きで検出
 *
 * @param denops Denopsインスタンス
 * @param bufnr バッファ番号
 * @returns 検出された単語
 */
export async function detectWordsOptimized(
  denops: Denops,
  bufnr: number,
): Promise<Word[]> {
  const cacheKey = `detectWords:${bufnr}`;
  const cached = WORDS_CACHE.get(cacheKey);
  if (cached) return cached;

  const result = await detectWordsWithManager(denops, {});
  const words = Array.isArray(result) ? result : (result as { words?: Word[] }).words || [];
  WORDS_CACHE.set(cacheKey, words);
  return words;
}

/**
 * ヒントを最適化されたキャッシュ付きで生成
 *
 * @param wordCount 単語数
 * @param markers マーカー配列
 * @returns 生成されたヒント
 */
export function generateHintsOptimized(
  wordCount: number,
  markers: string[],
): string[] {
  const cacheKey = `generateHints:${wordCount}:${markers.join("")}`;
  const cached = HINTS_CACHE.get(cacheKey);
  if (cached) return cached;

  const hints = generateHints(wordCount, markers);
  HINTS_CACHE.set(cacheKey, hints);
  return hints;
}

/**
 * Config付きのヒントを生成
 *
 * @param wordCount 単語数
 * @param config 設定オブジェクト
 * @returns 生成されたヒント
 */
export function generateHintsFromConfigOptimized(
  wordCount: number,
  config: Config,
): string[] {
  const hintConfig = {
    singleCharKeys: config.singleCharKeys,
    multiCharKeys: config.multiCharKeys,
    maxSingleCharHints: config.maxSingleCharHints,
    useNumericMultiCharHints: config.useNumericMultiCharHints,
    markers: config.markers,
  };
  const cacheKey = `generateHints:${wordCount}:${JSON.stringify(hintConfig)}`;
  const cached = HINTS_CACHE.get(cacheKey);
  if (cached) return cached;

  const hints = generateHints(wordCount, {
    groups: true,
    ...hintConfig,
  });
  HINTS_CACHE.set(cacheKey, hints);
  return hints;
}

/**
 * Config付きのヒント生成（互換性のため）
 *
 * @param wordCount 単語数
 * @param config 設定オブジェクト
 * @returns 生成されたヒント
 */
export function generateHintsFromConfig(
  wordCount: number,
  config: Config,
): string[] {
  return generateHintsFromConfigOptimized(wordCount, config);
}
