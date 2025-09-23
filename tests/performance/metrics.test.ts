import { assertEquals, assertExists } from "@std/assert";
import type { PerformanceMetrics } from "../../denops/hellshake-yano/performance/metrics.ts";

Deno.test("PerformanceMetrics インターフェースが存在する", () => {
  // Type-only test: コンパイル時にインターフェースが存在することを確認
  const metrics: PerformanceMetrics = {
    showHints: [],
    hideHints: [],
    wordDetection: [],
    hintGeneration: [],
  };

  assertExists(metrics);
  assertEquals(Array.isArray(metrics.showHints), true);
  assertEquals(Array.isArray(metrics.hideHints), true);
  assertEquals(Array.isArray(metrics.wordDetection), true);
  assertEquals(Array.isArray(metrics.hintGeneration), true);
});

Deno.test("PerformanceMetrics の各プロパティは number 配列である", () => {
  const metrics: PerformanceMetrics = {
    showHints: [10.5, 20.3],
    hideHints: [5.2],
    wordDetection: [],
    hintGeneration: [30.1, 40.7, 50.9],
  };

  // 各プロパティが number 配列であることを確認
  metrics.showHints.forEach((time: number) => assertEquals(typeof time, "number"));
  metrics.hideHints.forEach((time: number) => assertEquals(typeof time, "number"));
  metrics.wordDetection.forEach((time: number) => assertEquals(typeof time, "number"));
  metrics.hintGeneration.forEach((time: number) => assertEquals(typeof time, "number"));
});

Deno.test("performanceMetrics オブジェクトが存在し、適切に初期化されている", async () => {
  const { performanceMetrics } = await import("../../denops/hellshake-yano/performance/metrics.ts");

  assertExists(performanceMetrics);
  assertEquals(Array.isArray(performanceMetrics.showHints), true);
  assertEquals(Array.isArray(performanceMetrics.hideHints), true);
  assertEquals(Array.isArray(performanceMetrics.wordDetection), true);
  assertEquals(Array.isArray(performanceMetrics.hintGeneration), true);

  // 初期状態では空配列であることを確認
  assertEquals(performanceMetrics.showHints.length, 0);
  assertEquals(performanceMetrics.hideHints.length, 0);
  assertEquals(performanceMetrics.wordDetection.length, 0);
  assertEquals(performanceMetrics.hintGeneration.length, 0);
});

Deno.test("recordPerformance 関数の基本機能", async () => {
  const { recordPerformance, performanceMetrics } = await import("../../denops/hellshake-yano/performance/metrics.ts");

  // テスト前に初期化
  performanceMetrics.showHints = [];

  const config = { performance_log: true, debug_mode: false };
  const startTime = 1000;
  const endTime = 1050;

  recordPerformance("showHints", startTime, endTime, config);

  assertEquals(performanceMetrics.showHints.length, 1);
  assertEquals(performanceMetrics.showHints[0], 50);
});

Deno.test("recordPerformance 関数のログ無効時の動作", async () => {
  const { recordPerformance, performanceMetrics } = await import("../../denops/hellshake-yano/performance/metrics.ts");

  // テスト前に初期化
  performanceMetrics.hideHints = [];

  const config = { performance_log: false, debug_mode: false };
  const startTime = 1000;
  const endTime = 1050;

  recordPerformance("hideHints", startTime, endTime, config);

  // ログが無効の場合は記録されない
  assertEquals(performanceMetrics.hideHints.length, 0);
});

Deno.test("recordPerformance 関数の50件制限", async () => {
  const { recordPerformance, performanceMetrics } = await import("../../denops/hellshake-yano/performance/metrics.ts");

  // テスト前に初期化
  performanceMetrics.wordDetection = [];

  const config = { performance_log: true, debug_mode: false };

  // 52件のデータを追加
  for (let i = 0; i < 52; i++) {
    recordPerformance("wordDetection", i * 10, (i * 10) + 5, config);
  }

  // 最新50件のみ保持されることを確認
  assertEquals(performanceMetrics.wordDetection.length, 50);
  assertEquals(performanceMetrics.wordDetection[0], 5); // 3番目以降のデータ（5ms）が最初になる
  assertEquals(performanceMetrics.wordDetection[49], 5); // 最後のデータ（5ms）
});

Deno.test("recordPerformance 関数の無効な時刻範囲エラー", async () => {
  const { recordPerformance } = await import("../../denops/hellshake-yano/performance/metrics.ts");

  const config = { performance_log: true, debug_mode: false };

  // startTime > endTime の場合はエラーが発生する
  try {
    recordPerformance("showHints", 1050, 1000, config);
    throw new Error("Expected error was not thrown");
  } catch (error) {
    assertEquals((error as Error).message.includes("Invalid time range"), true);
  }
});

Deno.test("getPerformanceMetrics 関数でメトリクス取得", async () => {
  const { getPerformanceMetrics, performanceMetrics, recordPerformance } = await import("../../denops/hellshake-yano/performance/metrics.ts");

  // テスト前に初期化
  performanceMetrics.showHints = [];
  performanceMetrics.hideHints = [];

  const config = { performance_log: true, debug_mode: false };

  // テストデータを追加
  recordPerformance("showHints", 1000, 1025, config);
  recordPerformance("hideHints", 2000, 2010, config);

  const metrics = getPerformanceMetrics();

  // 元データのコピーが返されることを確認
  assertEquals(metrics.showHints.length, 1);
  assertEquals(metrics.showHints[0], 25);
  assertEquals(metrics.hideHints.length, 1);
  assertEquals(metrics.hideHints[0], 10);

  // 返されたオブジェクトを変更しても元データに影響しないことを確認
  metrics.showHints.push(999);
  assertEquals(performanceMetrics.showHints.length, 1); // 元データは変わらない
});

Deno.test("clearPerformanceMetrics 関数でメトリクスクリア", async () => {
  const { clearPerformanceMetrics, performanceMetrics, recordPerformance } = await import("../../denops/hellshake-yano/performance/metrics.ts");

  // テスト前に一度クリア
  clearPerformanceMetrics();

  const config = { performance_log: true, debug_mode: false };

  // テストデータを追加
  recordPerformance("showHints", 1000, 1025, config);
  recordPerformance("hideHints", 2000, 2010, config);
  recordPerformance("wordDetection", 3000, 3015, config);
  recordPerformance("hintGeneration", 4000, 4020, config);

  // データが存在することを確認
  assertEquals(performanceMetrics.showHints.length, 1);
  assertEquals(performanceMetrics.hideHints.length, 1);
  assertEquals(performanceMetrics.wordDetection.length, 1);
  assertEquals(performanceMetrics.hintGeneration.length, 1);

  // クリア実行
  clearPerformanceMetrics();

  // 全てのメトリクスが空配列になることを確認
  assertEquals(performanceMetrics.showHints.length, 0);
  assertEquals(performanceMetrics.hideHints.length, 0);
  assertEquals(performanceMetrics.wordDetection.length, 0);
  assertEquals(performanceMetrics.hintGeneration.length, 0);
});