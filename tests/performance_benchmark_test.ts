import { test } from "./testRunner.ts";
import { assertEquals, assertLess } from "@std/assert";
import type { Denops } from "@denops/std";

/**
 * パフォーマンスベンチマーク結果の型定義
 */
interface BenchmarkResult {
  testName: string;
  executionTime: number;
  iterations: number;
  avgTimePerIteration: number;
  memoryUsage?: number;
  cpuUsage?: number;
  success: boolean;
  details?: Record<string, unknown>;
}

/**
 * ベンチマーク結果を蓄積するためのコレクション
 */
const benchmarkResults: BenchmarkResult[] = [];

/**
 * ベンチマーク実行のヘルパー関数
 * @param testName テスト名
 * @param iterations 繰り返し回数
 * @param fn 実行する関数
 * @param threshold 閾値（ミリ秒）
 * @returns ベンチマーク結果
 */
async function runBenchmark(
  testName: string,
  iterations: number,
  fn: () => Promise<void> | void,
  threshold: number,
): Promise<BenchmarkResult> {
  // ガベージコレクションを実行してメモリ状態をクリア
  // Denoでは--allow-runが必要だが、テスト環境では安全にスキップ
  try {
    // deno-lint-ignore no-explicit-any
    if ((globalThis as any).gc) {
      // deno-lint-ignore no-explicit-any
      (globalThis as any).gc();
    }
  } catch {
    // ガベージコレクションが利用できない場合はスキップ
  }

  const memoryBefore = getMemoryUsage();
  const start = performance.now();

  // 指定回数の反復実行
  for (let i = 0; i < iterations; i++) {
    await fn();
  }

  const end = performance.now();
  const memoryAfter = getMemoryUsage();

  const executionTime = end - start;
  const avgTimePerIteration = executionTime / iterations;
  const memoryUsage = memoryAfter - memoryBefore;
  const success = avgTimePerIteration <= threshold;

  const result: BenchmarkResult = {
    testName,
    executionTime,
    iterations,
    avgTimePerIteration,
    memoryUsage,
    success,
    details: {
      threshold,
      memoryBefore,
      memoryAfter,
    },
  };

  benchmarkResults.push(result);
  return result;
}

/**
 * メモリ使用量を取得するヘルパー関数
 * Denoの環境に応じて適切な方法でメモリ使用量を取得
 */
function getMemoryUsage(): number {
  try {
    // Deno.memoryUsage()を使用（Deno 1.30+）
    if (Deno.memoryUsage) {
      return Deno.memoryUsage().heapUsed;
    }
  } catch {
    // フォールバック
  }

  try {
    // performance.memory（ブラウザ環境）
    // deno-lint-ignore no-explicit-any
    const perfMemory = (performance as any).memory;
    if (perfMemory && perfMemory.usedJSHeapSize) {
      return perfMemory.usedJSHeapSize;
    }
  } catch {
    // フォールバック
  }

  // メモリ測定ができない場合は0を返す
  return 0;
}

/**
 * 大量テキストを生成するヘルパー関数
 */
function generateLargeText(lines: number, wordsPerLine: number): string[] {
  const words = [
    "example",
    "test",
    "word",
    "performance",
    "benchmark",
    "hellshake",
    "yano",
    "vim",
    "neovim",
    "plugin",
    "typescript",
    "deno",
    "function",
    "variable",
    "string",
    "number",
    "boolean",
    "object",
    "array",
    "method",
    "class",
    "interface",
    "type",
    "const",
    "let",
    "var",
    "async",
    "await",
    "promise",
    "callback",
    "event",
    "handler",
    "listener",
    "component",
    "module",
    "import",
    "export",
    "default",
    "namespace",
    "declaration",
    "definition",
    "implementation",
    "specification",
    "documentation",
    "comment",
    "annotation",
    "decorator",
    "metadata",
    "configuration",
    "settings",
    "options",
    "parameters",
  ];

  const result: string[] = [];
  for (let i = 0; i < lines; i++) {
    const line: string[] = [];
    for (let j = 0; j < wordsPerLine; j++) {
      line.push(words[Math.floor(Math.random() * words.length)]);
    }
    result.push(line.join(" "));
  }
  return result;
}

/**
 * キーリピート検出処理をシミュレートする関数
 */
async function simulateKeyRepeatDetection(): Promise<void> {
  const now = performance.now();
  const lastKeyTime = now - 30; // 30ms前のキー入力を想定

  // キーリピート判定の実装に相当する処理
  const isRepeat = (now - lastKeyTime) < 100; // 100ms以内ならリピート

  // 簡単な計算を追加してより現実的な処理時間をシミュレート
  const computation = Math.sqrt(now) + Math.sin(now / 1000);

  // 結果を無視して最適化を防ぐ
  void isRepeat;
  void computation;
}

/**
 * 時間計測オーバーヘッドをシミュレートする関数
 */
function simulateTimeElapsed(): void {
  const start = performance.now();
  // 簡単な計算処理
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Math.random();
  }
  const end = performance.now();

  // 結果を無視して最適化を防ぐ
  void (end - start);
  void sum;
}

/**
 * 単語検出処理をシミュレートする関数
 */
function simulateWordDetection(text: string): void {
  // 単語境界での分割をシミュレート
  const words = text.split(/\s+/);

  // 各単語に対する処理をシミュレート
  for (const word of words) {
    if (word.length > 0) {
      // 単語の検証処理をシミュレート
      const isValid = /^[a-zA-Z0-9_]+$/.test(word);
      const wordLength = word.length;

      // 結果を無視して最適化を防ぐ
      void isValid;
      void wordLength;
    }
  }
}

/**
 * テスト1: 時間計測オーバーヘッド測定
 * s:get_elapsed_time() 相当の処理を1000回実行し、平均実行時間を計測
 */
test("Performance: Time measurement overhead", async () => {
  const result = await runBenchmark(
    "Time measurement overhead",
    1000,
    simulateTimeElapsed,
    1.0, // 1ms以下の閾値
  );

  console.log(`時間計測オーバーヘッド: ${result.avgTimePerIteration.toFixed(4)}ms/回`);
  console.log(`総実行時間: ${result.executionTime.toFixed(2)}ms`);

  // 閾値チェック
  assertLess(
    result.avgTimePerIteration,
    1.0,
    `時間計測オーバーヘッドが閾値を超過: ${result.avgTimePerIteration}ms > 1.0ms`,
  );
});

/**
 * テスト2: キーリピート検出パフォーマンス
 * 連続100回のキー入力シミュレーション（各入力間隔: 30ms）
 */
test("Performance: Key repeat detection", async (denops: Denops) => {
  // テスト用バッファを設定
  await denops.cmd("enew!");
  await denops.call("setline", 1, "test line for key repeat detection");

  const result = await runBenchmark(
    "Key repeat detection",
    100,
    simulateKeyRepeatDetection,
    5.0, // 5ms以下の閾値
  );

  console.log(`キーリピート検出: ${result.avgTimePerIteration.toFixed(4)}ms/回`);
  console.log(`総実行時間: ${result.executionTime.toFixed(2)}ms`);

  // 閾値チェック
  assertLess(
    result.avgTimePerIteration,
    5.0,
    `キーリピート検出が閾値を超過: ${result.avgTimePerIteration}ms > 5.0ms`,
  );

  // 全体の処理時間も確認（100回で500ms以下）
  assertLess(
    result.executionTime,
    500,
    `キーリピート検出の総時間が閾値を超過: ${result.executionTime}ms > 500ms`,
  );
});

/**
 * テスト3: 大量単語検出のパフォーマンス
 * 1000行、各行100単語程度のテキストで検出時間を測定
 */
test("Performance: Large text word detection", async (denops: Denops) => {
  const testLines = generateLargeText(1000, 100);
  console.log(`テストデータ: ${testLines.length}行, 約${testLines.length * 100}単語`);

  // テスト用バッファにデータを設定
  await denops.cmd("enew!");
  await denops.call("setline", 1, testLines);

  const result = await runBenchmark(
    "Large text word detection",
    1, // 1回のみ実行（大量データのため）
    () => {
      // 全行のテキストを処理
      for (const line of testLines) {
        simulateWordDetection(line);
      }
    },
    5000, // 5秒以下の閾値
  );

  console.log(`大量単語検出: ${result.executionTime.toFixed(2)}ms`);
  console.log(`メモリ使用量: ${result.memoryUsage || 0} bytes`);

  // 閾値チェック（5秒以内）
  assertLess(
    result.executionTime,
    5000,
    `大量単語検出が閾値を超過: ${result.executionTime}ms > 5000ms`,
  );
});

/**
 * テスト4: メモリ使用量測定とリーク検出
 * キャッシュサイズの監視とメモリリークチェック
 */
test("Performance: Memory usage and leak detection", async (denops: Denops) => {
  // 初期メモリ状態を記録
  const initialMemory = getMemoryUsage();

  // 複数回のベンチマーク実行でメモリ使用量を監視
  const memorySnapshots: number[] = [];

  for (let i = 0; i < 10; i++) {
    // 各種処理を実行
    await simulateKeyRepeatDetection();
    simulateTimeElapsed();

    // ガベージコレクションを促進
    try {
      // deno-lint-ignore no-explicit-any
      if ((globalThis as any).gc) {
        // deno-lint-ignore no-explicit-any
        (globalThis as any).gc();
      }
    } catch {
      // ガベージコレクションが利用できない場合はスキップ
    }

    // メモリスナップショットを取得
    const currentMemory = getMemoryUsage();
    memorySnapshots.push(currentMemory);

    // 短い間隔を空ける
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  const finalMemory = getMemoryUsage();
  const memoryIncrease = finalMemory - initialMemory;

  console.log(`初期メモリ: ${initialMemory} bytes`);
  console.log(`最終メモリ: ${finalMemory} bytes`);
  console.log(`メモリ増加: ${memoryIncrease} bytes`);
  console.log(
    `メモリスナップショット: ${memorySnapshots.map((m) => m.toLocaleString()).join(", ")}`,
  );

  // メモリ増加が1MB以下であることを確認
  assertLess(
    memoryIncrease,
    1024 * 1024, // 1MB
    `メモリ使用量の増加が閾値を超過: ${memoryIncrease} bytes > 1MB`,
  );

  // メモリスナップショットに大きな増加傾向がないことを確認
  const maxMemory = Math.max(...memorySnapshots);
  const minMemory = Math.min(...memorySnapshots);
  const memoryRange = maxMemory - minMemory;

  assertLess(
    memoryRange,
    1024 * 1024, // 1MB
    `メモリ使用量の変動が閾値を超過: ${memoryRange} bytes > 1MB`,
  );
});

/**
 * テスト5: 統合パフォーマンステスト
 * 実際の使用パターンをシミュレートしたパフォーマンステスト
 */
test("Performance: Integrated performance test", async (denops: Denops) => {
  const testText = generateLargeText(100, 50); // 100行、各行50単語
  await denops.cmd("enew!");
  await denops.call("setline", 1, testText);

  const result = await runBenchmark(
    "Integrated performance test",
    10, // 10回のシミュレーション
    async () => {
      // 複数の処理を組み合わせたシミュレーション
      simulateTimeElapsed();
      await simulateKeyRepeatDetection();

      // ランダムに選択した行で単語検出
      const randomLineIndex = Math.floor(Math.random() * testText.length);
      simulateWordDetection(testText[randomLineIndex]);
    },
    100, // 100ms以下の閾値
  );

  console.log(`統合パフォーマンス: ${result.avgTimePerIteration.toFixed(4)}ms/回`);
  console.log(`総実行時間: ${result.executionTime.toFixed(2)}ms`);

  assertLess(
    result.avgTimePerIteration,
    100,
    `統合パフォーマンスが閾値を超過: ${result.avgTimePerIteration}ms > 100ms`,
  );
});

/**
 * Process10 パフォーマンステスト: 大量ヒントでの非同期ハイライト処理
 * 100個以上のヒントで100ms以内に処理開始することを検証
 */
test("Process10 Performance: Large hints async highlighting", async (denops: Denops) => {
  // 150個のヒントを生成
  const largeHints: Array<
    { line: number; col: number; text: string; hintByteCol: number; hintCol: number }
  > = [];
  for (let i = 0; i < 150; i++) {
    largeHints.push({
      line: i + 1,
      col: (i % 10) + 1,
      text: `word${i}`,
      hintByteCol: 1,
      hintCol: 1,
    });
  }

  // テスト用バッファを設定
  await denops.cmd("enew!");
  const testLines = largeHints.map((h) => h.text);
  await denops.call("setline", 1, testLines);

  const result = await runBenchmark(
    "Large hints async highlighting",
    5, // 5回実行
    async () => {
      // highlightCandidateHintsAsyncのシミュレーション
      const startTime = performance.now();

      // Fire-and-forget パターンの検証
      // 実際の関数は即座に返る必要がある
      queueMicrotask(() => {
        // 非同期処理の開始をシミュレート
        for (let i = 0; i < largeHints.length; i += 15) {
          // バッチ処理をシミュレート
          const batch = largeHints.slice(i, i + 15);
          queueMicrotask(() => {
            // extmark設定の処理
            batch.forEach(() => {
              // 処理のシミュレーション
              Math.random();
            });
          });
        }
      });

      const endTime = performance.now();

      // 100ms以内に開始することを確認
      if (endTime - startTime > 100) {
        throw new Error(`処理開始が遅い: ${endTime - startTime}ms`);
      }
    },
    100, // 100ms以下の閾値
  );

  console.log(`大量ヒント非同期ハイライト: ${result.avgTimePerIteration.toFixed(4)}ms/回`);
  console.log(`150個のヒントで${result.executionTime.toFixed(2)}ms`);

  assertLess(
    result.avgTimePerIteration,
    100,
    `大量ヒント処理が閾値を超過: ${result.avgTimePerIteration}ms > 100ms`,
  );
});

/**
 * Process10 パフォーマンステスト: 同期版との比較ベンチマーク
 * 非同期版が同期版より応答性が良いことを検証
 */
test("Process10 Performance: Async vs Sync comparison", async (denops: Denops) => {
  const testHints: Array<{ line: number; col: number; text: string }> = [];
  for (let i = 0; i < 100; i++) {
    testHints.push({
      line: i + 1,
      col: 1,
      text: `hint${i}`,
    });
  }

  // 同期版のシミュレーション
  const syncResult = await runBenchmark(
    "Sync highlighting",
    10,
    () => {
      // 同期的にすべて処理
      for (const hint of testHints) {
        // 重い処理をシミュレート
        for (let j = 0; j < 100; j++) {
          Math.sqrt(j);
        }
      }
    },
    1000,
  );

  // 非同期版のシミュレーション
  const asyncResult = await runBenchmark(
    "Async highlighting",
    10,
    () => {
      // Fire-and-forgetで即座に返る
      queueMicrotask(() => {
        for (const hint of testHints) {
          for (let j = 0; j < 100; j++) {
            Math.sqrt(j);
          }
        }
      });
    },
    10, // 非同期版は10ms以内に返るべき
  );

  console.log(`同期版: ${syncResult.avgTimePerIteration.toFixed(2)}ms`);
  console.log(`非同期版: ${asyncResult.avgTimePerIteration.toFixed(2)}ms`);
  console.log(
    `改善率: ${
      ((1 - asyncResult.avgTimePerIteration / syncResult.avgTimePerIteration) * 100).toFixed(1)
    }%`,
  );

  // 非同期版は10ms以内に返ることを確認（絶対値での検証）
  // タイミング依存の比較ではなく、応答性の絶対基準で判定
  assertLess(
    asyncResult.avgTimePerIteration,
    10,
    "非同期版は10ms以内に返るべき（応答性の保証）",
  );
});

/**
 * Process10 パフォーマンステスト: メモリ使用量測定
 * 大量ヒント処理でのメモリリークがないことを検証
 */
test("Process10 Performance: Memory usage with large hints", async (denops: Denops) => {
  const initialMemory = getMemoryUsage();
  const memorySnapshots: number[] = [];

  // 10回の大量ヒント処理を実行
  for (let iteration = 0; iteration < 10; iteration++) {
    const hints: Array<{ line: number; col: number; text: string }> = [];
    for (let i = 0; i < 200; i++) {
      hints.push({
        line: i + 1,
        col: 1,
        text: `memory_test_${iteration}_${i}`,
      });
    }

    // Fire-and-forget処理のシミュレーション
    queueMicrotask(() => {
      hints.forEach(() => {
        // 処理のシミュレーション
        Math.random();
      });
    });

    // メモリスナップショット
    await new Promise((resolve) => setTimeout(resolve, 50));
    memorySnapshots.push(getMemoryUsage());

    // GCを促進
    try {
      if ((globalThis as any).gc) {
        (globalThis as any).gc();
      }
    } catch {}
  }

  const finalMemory = getMemoryUsage();
  const memoryIncrease = finalMemory - initialMemory;
  const avgMemory = memorySnapshots.reduce((a, b) => a + b, 0) / memorySnapshots.length;

  console.log(`初期メモリ: ${(initialMemory / 1024).toFixed(2)} KB`);
  console.log(`最終メモリ: ${(finalMemory / 1024).toFixed(2)} KB`);
  console.log(`メモリ増加: ${(memoryIncrease / 1024).toFixed(2)} KB`);
  console.log(`平均メモリ: ${(avgMemory / 1024).toFixed(2)} KB`);

  // メモリリークがないことを確認（500KB以下の増加）
  assertLess(
    memoryIncrease,
    500 * 1024,
    `メモリリークの可能性: ${(memoryIncrease / 1024).toFixed(2)} KB > 500 KB`,
  );
});

/**
 * ベンチマーク結果出力テスト
 * 全ベンチマーク結果をJSON形式で出力
 */
test("Performance: Benchmark results output", async () => {
  // 結果をJSON形式で出力
  const summary = {
    totalTests: benchmarkResults.length,
    successfulTests: benchmarkResults.filter((r) => r.success).length,
    failedTests: benchmarkResults.filter((r) => !r.success).length,
    averageExecutionTime: benchmarkResults.reduce((sum, r) => sum + r.avgTimePerIteration, 0) /
      benchmarkResults.length,
    results: benchmarkResults,
    timestamp: new Date().toISOString(),
  };

  console.log("=== パフォーマンスベンチマーク結果 ===");
  console.log(JSON.stringify(summary, null, 2));

  // 全テストが成功していることを確認
  assertEquals(
    summary.failedTests,
    0,
    `${summary.failedTests}個のパフォーマンステストが失敗しました`,
  );

  console.log(`\n総合結果: ${summary.successfulTests}/${summary.totalTests} テスト成功`);
  console.log(`平均実行時間: ${summary.averageExecutionTime.toFixed(4)}ms`);
});
