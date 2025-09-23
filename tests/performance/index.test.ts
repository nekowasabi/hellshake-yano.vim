import { assertEquals, assertExists } from "@std/assert";

Deno.test("performance/index.ts の全エクスポートが利用可能", async () => {
  const performanceModule = await import("../../denops/hellshake-yano/performance/index.ts");

  // 型のエクスポート確認は実行時では直接確認できないため、関数と値のエクスポートを確認
  assertExists(performanceModule.recordPerformance);
  assertExists(performanceModule.getPerformanceMetrics);
  assertExists(performanceModule.clearPerformanceMetrics);
  assertExists(performanceModule.performanceMetrics);
  assertExists(performanceModule.collectDebugInfo);
  assertExists(performanceModule.clearDebugInfo);

  assertEquals(typeof performanceModule.recordPerformance, "function");
  assertEquals(typeof performanceModule.getPerformanceMetrics, "function");
  assertEquals(typeof performanceModule.clearPerformanceMetrics, "function");
  assertEquals(typeof performanceModule.performanceMetrics, "object");
  assertEquals(typeof performanceModule.collectDebugInfo, "function");
  assertEquals(typeof performanceModule.clearDebugInfo, "function");
});

Deno.test("performance/index.ts からの基本的な機能動作確認", async () => {
  const {
    recordPerformance,
    getPerformanceMetrics,
    clearPerformanceMetrics,
    collectDebugInfo,
    clearDebugInfo,
  } = await import("../../denops/hellshake-yano/performance/index.ts");

  // テスト前にクリア
  clearPerformanceMetrics();

  const config = { performance_log: true, debug_mode: false, motion_count: { w: 10 } };

  // パフォーマンス記録
  recordPerformance("showHints", 1000, 1025, config);

  // メトリクス取得
  const metrics = getPerformanceMetrics();
  assertEquals(metrics.showHints.length, 1);
  assertEquals(metrics.showHints[0], 25);

  // デバッグ情報収集
  const debugInfo = collectDebugInfo(config, false, [], metrics);
  assertEquals(debugInfo.config.performance_log, true);
  assertEquals(debugInfo.hintsVisible, false);
  assertEquals(debugInfo.metrics.showHints[0], 25);

  // デバッグ情報クリア
  clearDebugInfo();
  const clearedMetrics = getPerformanceMetrics();
  assertEquals(clearedMetrics.showHints.length, 0);
});