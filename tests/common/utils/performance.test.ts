/**
 * tests/common/utils/performance.test.ts
 *
 * パフォーマンス計測機能のテスト
 */

import { assert, assertEquals, assertExists } from "jsr:@std/assert";
import {
  clearCaches,
  clearDebugInfo,
  collectDebugInfo,
  getHintsCache,
  getPerformanceMetrics,
  getWordsCache,
  recordPerformance,
  resetPerformanceMetrics,
} from "../../../denops/hellshake-yano/common/utils/performance.ts";

// ========== 基本パフォーマンス計測 ==========

Deno.test("recordPerformance: パフォーマンス記録", () => {
  resetPerformanceMetrics();
  recordPerformance("showHints", 10.5);
  const metrics = getPerformanceMetrics();
  assertEquals(metrics.showHints.length, 1);
  assertEquals(metrics.showHints[0], 10.5);
});

Deno.test("recordPerformance: 複数回記録", () => {
  resetPerformanceMetrics();
  recordPerformance("showHints", 10);
  recordPerformance("showHints", 15);
  recordPerformance("showHints", 12);
  const metrics = getPerformanceMetrics();
  assertEquals(metrics.showHints.length, 3);
});

Deno.test("recordPerformance: キャップ制御（50個以上は削除）", () => {
  resetPerformanceMetrics();
  for (let i = 0; i < 60; i++) {
    recordPerformance("showHints", i);
  }
  const metrics = getPerformanceMetrics();
  assertEquals(metrics.showHints.length, 50);
});

Deno.test("resetPerformanceMetrics: メトリクスリセット", () => {
  recordPerformance("showHints", 10);
  resetPerformanceMetrics();
  const metrics = getPerformanceMetrics();
  assertEquals(metrics.showHints.length, 0);
  assertEquals(metrics.hideHints.length, 0);
  assertEquals(metrics.wordDetection.length, 0);
  assertEquals(metrics.hintGeneration.length, 0);
});

Deno.test("getPerformanceMetrics: 異なる操作の記録", () => {
  resetPerformanceMetrics();
  recordPerformance("showHints", 10);
  recordPerformance("hideHints", 5);
  recordPerformance("wordDetection", 20);
  recordPerformance("hintGeneration", 15);

  const metrics = getPerformanceMetrics();
  assertEquals(metrics.showHints.length, 1);
  assertEquals(metrics.hideHints.length, 1);
  assertEquals(metrics.wordDetection.length, 1);
  assertEquals(metrics.hintGeneration.length, 1);
});

// ========== デバッグ情報 ==========

Deno.test("collectDebugInfo: デバッグ情報収集", () => {
  resetPerformanceMetrics();
  recordPerformance("showHints", 10);

  // テスト用の最小限のConfig型を作成
  const testConfig = {
    enabled: true,
    markers: ["a"],
    motionCount: 1,
    motionTimeout: 1000,
  } as any;

  const debugInfo = collectDebugInfo(true, [], testConfig);
  assertEquals(debugInfo.hintsVisible, true);
  assertEquals(Array.isArray(debugInfo.currentHints), true);
  assertExists(debugInfo.config);
  assertExists(debugInfo.metrics);
  assertExists(debugInfo.timestamp);
});

Deno.test("collectDebugInfo: タイムスタンプの妥当性", () => {
  const before = Date.now();
  const testConfig = { enabled: true } as any;
  const debugInfo = collectDebugInfo(false, [], testConfig);
  const after = Date.now();

  assert(debugInfo.timestamp >= before);
  assert(debugInfo.timestamp <= after);
});

Deno.test("clearDebugInfo: デバッグ情報クリア", () => {
  recordPerformance("showHints", 10);
  clearDebugInfo();

  const metrics = getPerformanceMetrics();
  assertEquals(metrics.showHints.length, 0);
});

// ========== キャッシュ操作 ==========

Deno.test("getWordsCache: キャッシュ取得", () => {
  const cache = getWordsCache();
  assertExists(cache);
  assertEquals(typeof cache.get, "function");
  assertEquals(typeof cache.set, "function");
  assertEquals(typeof cache.clear, "function");
});

Deno.test("getHintsCache: ヒントキャッシュ取得", () => {
  const cache = getHintsCache();
  assertExists(cache);
  assertEquals(typeof cache.get, "function");
  assertEquals(typeof cache.set, "function");
  assertEquals(typeof cache.clear, "function");
});

Deno.test("clearCaches: キャッシュクリア", () => {
  const wordsCache = getWordsCache();
  const hintsCache = getHintsCache();

  // キャッシュに値を設定
  wordsCache.set("test1", []);
  hintsCache.set("test2", []);

  clearCaches();

  // クリア後、キャッシュは空になるはず
  assertEquals(wordsCache.get("test1"), undefined);
  assertEquals(hintsCache.get("test2"), undefined);
});
