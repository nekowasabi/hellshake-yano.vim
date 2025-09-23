import { assertEquals, assertExists } from "@std/assert";
import type { DebugInfo } from "../../denops/hellshake-yano/performance/debug.ts";

Deno.test("DebugInfo インターフェースが存在する", () => {
  // Type-only test: コンパイル時にインターフェースが存在することを確認
  const debugInfo: DebugInfo = {
    config: { performance_log: true, debug_mode: false, motion_count: { w: 10 } },
    hintsVisible: false,
    currentHints: [],
    metrics: {
      showHints: [],
      hideHints: [],
      wordDetection: [],
      hintGeneration: [],
    },
    timestamp: Date.now(),
  };

  assertExists(debugInfo);
  assertEquals(typeof debugInfo.config, "object");
  assertEquals(typeof debugInfo.hintsVisible, "boolean");
  assertEquals(Array.isArray(debugInfo.currentHints), true);
  assertEquals(typeof debugInfo.metrics, "object");
  assertEquals(typeof debugInfo.timestamp, "number");
});

Deno.test("DebugInfo の各プロパティの型チェック", () => {
  const debugInfo: DebugInfo = {
    config: { performance_log: false, debug_mode: true, motion_count: { f: 5 } },
    hintsVisible: true,
    currentHints: [
      { hint: "a", position: { line: 1, col: 5 }, word: "test" },
      { hint: "b", position: { line: 2, col: 10 }, word: "example" },
    ],
    metrics: {
      showHints: [10.5, 20.3],
      hideHints: [5.2],
      wordDetection: [15.1, 25.7],
      hintGeneration: [30.1, 40.7, 50.9],
    },
    timestamp: 1234567890,
  };

  // config の型チェック
  assertEquals(typeof debugInfo.config.performance_log, "boolean");
  assertEquals(typeof debugInfo.config.debug_mode, "boolean");
  assertEquals(typeof debugInfo.config.motion_count, "object");

  // hintsVisible の型チェック
  assertEquals(typeof debugInfo.hintsVisible, "boolean");

  // currentHints の型チェック
  assertEquals(Array.isArray(debugInfo.currentHints), true);
  if (debugInfo.currentHints.length > 0) {
    const hint = debugInfo.currentHints[0];
    assertEquals(typeof hint.hint, "string");
    assertEquals(typeof hint.position, "object");
    assertEquals(typeof hint.word, "string");
  }

  // metrics の型チェック
  assertEquals(Array.isArray(debugInfo.metrics.showHints), true);
  assertEquals(Array.isArray(debugInfo.metrics.hideHints), true);
  assertEquals(Array.isArray(debugInfo.metrics.wordDetection), true);
  assertEquals(Array.isArray(debugInfo.metrics.hintGeneration), true);

  // timestamp の型チェック
  assertEquals(typeof debugInfo.timestamp, "number");
});

Deno.test("collectDebugInfo 関数でデバッグ情報収集", async () => {
  const { collectDebugInfo } = await import("../../denops/hellshake-yano/performance/debug.ts");

  const config = {
    performance_log: true,
    debug_mode: false,
    motion_count: { w: 10, f: 5 },
    min_length: 3,
  };

  const hintsVisible = true;

  const currentHints = [
    { hint: "a", position: { line: 1, col: 5 }, word: "test" },
    { hint: "b", position: { line: 2, col: 10 }, word: "example" },
  ];

  const metrics = {
    showHints: [10.5, 20.3],
    hideHints: [5.2],
    wordDetection: [15.1, 25.7],
    hintGeneration: [30.1, 40.7],
  };

  const startTime = Date.now();
  const debugInfo = collectDebugInfo(config, hintsVisible, currentHints, metrics);
  const endTime = Date.now();

  // 収集されたデバッグ情報の検証
  assertEquals(debugInfo.config.performance_log, true);
  assertEquals(debugInfo.config.debug_mode, false);
  assertEquals(debugInfo.config.motion_count.w, 10);
  assertEquals(debugInfo.config.motion_count.f, 5);

  assertEquals(debugInfo.hintsVisible, true);
  assertEquals(debugInfo.currentHints.length, 2);
  assertEquals(debugInfo.currentHints[0].hint, "a");
  assertEquals(debugInfo.currentHints[1].word, "example");

  assertEquals(debugInfo.metrics.showHints.length, 2);
  assertEquals(debugInfo.metrics.showHints[0], 10.5);
  assertEquals(debugInfo.metrics.hideHints.length, 1);

  // タイムスタンプが適切な範囲内であることを確認
  assertEquals(debugInfo.timestamp >= startTime, true);
  assertEquals(debugInfo.timestamp <= endTime, true);

  // 返されたデータがディープコピーであることを確認
  debugInfo.currentHints.push({ hint: "c", position: { line: 3, col: 15 }, word: "new" });
  assertEquals(currentHints.length, 2); // 元の配列は変更されない
});

Deno.test("clearDebugInfo 関数でメトリクスクリア", async () => {
  const { clearDebugInfo } = await import("../../denops/hellshake-yano/performance/debug.ts");
  const { performanceMetrics, recordPerformance } = await import("../../denops/hellshake-yano/performance/metrics.ts");

  const config = { performance_log: true, debug_mode: false };

  // テストデータを追加
  recordPerformance("showHints", 1000, 1025, config);
  recordPerformance("hideHints", 2000, 2010, config);
  recordPerformance("wordDetection", 3000, 3015, config);
  recordPerformance("hintGeneration", 4000, 4020, config);

  // データが存在することを確認
  assertEquals(performanceMetrics.showHints.length >= 1, true);
  assertEquals(performanceMetrics.hideHints.length >= 1, true);
  assertEquals(performanceMetrics.wordDetection.length >= 1, true);
  assertEquals(performanceMetrics.hintGeneration.length >= 1, true);

  // クリア実行
  clearDebugInfo();

  // 全てのメトリクスが空配列になることを確認
  assertEquals(performanceMetrics.showHints.length, 0);
  assertEquals(performanceMetrics.hideHints.length, 0);
  assertEquals(performanceMetrics.wordDetection.length, 0);
  assertEquals(performanceMetrics.hintGeneration.length, 0);
});