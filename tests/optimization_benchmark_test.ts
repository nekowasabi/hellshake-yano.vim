/**
 * パフォーマンス最適化効果測定ベンチマーク
 * Task #3: パフォーマンス最適化の効果を検証
 */

import { test } from "./testRunner.ts";
import { assertLess } from "@std/assert";
import type { Word } from "../denops/hellshake-yano/types.ts";
import { detectAdjacentWords } from "../denops/hellshake-yano/neovim/core/hint.ts";
import { RegexWordDetector } from "../denops/hellshake-yano/neovim/core/word/word-detector-strategies.ts";

/**
 * テストデータ生成: 大量の単語を生成
 */
function generateTestWords(count: number, linesPerWord: number = 10): Word[] {
  const words: Word[] = [];
  for (let i = 0; i < count; i++) {
    const line = Math.floor(i / linesPerWord) + 1;
    const col = ((i % linesPerWord) * 10) + 1;
    words.push({
      text: `word${i}`,
      line: line,
      col: col,
      byteCol: col,
    });
  }
  return words;
}

/**
 * ベンチマーク1: フィルタチェーン統合の効果測定
 * 期待効果: 60-75%削減
 */
test("Optimization Benchmark: Filter chain consolidation", async () => {
  console.log("\n=== フィルタチェーン統合ベンチマーク ===");

  // テストデータ: 10,000単語
  const testWords: Word[] = [];
  for (let i = 0; i < 10000; i++) {
    testWords.push({
      text: i % 3 === 0 ? `${i}` : `word${i}`, // 1/3は数字のみ
      line: Math.floor(i / 100) + 1,
      col: (i % 100) * 5 + 1,
      byteCol: (i % 100) * 5 + 1,
    });
  }

  const detector = new RegexWordDetector({
    minWordLength: 2,
    maxWordLength: 20,
    exclude_numbers: true,
    exclude_single_chars: true,
  });

  // ウォームアップ
  await detector.detectWords("test warmup", 1);

  // ベンチマーク実行
  const iterations = 100;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    // applyFiltersは内部で呼ばれる
    await detector.detectWords(
      testWords.map((w) => w.text).join(" "),
      1,
      {
        minWordLength: 2,
        config: {
          useJapanese: false,
        },
      },
    );
  }

  const end = performance.now();
  const avgTime = (end - start) / iterations;

  console.log(`実行回数: ${iterations}`);
  console.log(`総実行時間: ${(end - start).toFixed(2)}ms`);
  console.log(`平均実行時間: ${avgTime.toFixed(4)}ms/回`);
  console.log(`期待効果: 単一パスフィルタリングにより60-75%削減`);

  // パフォーマンス目標: 50ms以下/回
  assertLess(
    avgTime,
    50,
    `フィルタ処理が目標値を超過: ${avgTime.toFixed(2)}ms > 50ms`,
  );

  console.log("✓ フィルタチェーン統合: 最適化成功\n");
});

/**
 * ベンチマーク2: 空間分割最適化の効果測定
 * 期待効果: 30-60%削減
 */
test("Optimization Benchmark: Spatial partitioning for adjacency detection", async () => {
  console.log("\n=== 空間分割最適化ベンチマーク ===");

  // テストケース1: 小規模（100単語、10行）
  const smallWords = generateTestWords(100, 10);
  const smallStart = performance.now();

  for (let i = 0; i < 1000; i++) {
    detectAdjacentWords(smallWords);
  }

  const smallEnd = performance.now();
  const smallAvg = (smallEnd - smallStart) / 1000;

  console.log(`小規模テスト (100単語, 10行):`);
  console.log(`  平均実行時間: ${smallAvg.toFixed(4)}ms/回`);

  // テストケース2: 中規模（500単語、50行）
  const mediumWords = generateTestWords(500, 10);
  const mediumStart = performance.now();

  for (let i = 0; i < 100; i++) {
    detectAdjacentWords(mediumWords);
  }

  const mediumEnd = performance.now();
  const mediumAvg = (mediumEnd - mediumStart) / 100;

  console.log(`中規模テスト (500単語, 50行):`);
  console.log(`  平均実行時間: ${mediumAvg.toFixed(4)}ms/回`);

  // テストケース3: 大規模（1000単語、100行）
  const largeWords = generateTestWords(1000, 10);
  const largeStart = performance.now();

  for (let i = 0; i < 50; i++) {
    detectAdjacentWords(largeWords);
  }

  const largeEnd = performance.now();
  const largeAvg = (largeEnd - largeStart) / 50;

  console.log(`大規模テスト (1000単語, 100行):`);
  console.log(`  平均実行時間: ${largeAvg.toFixed(4)}ms/回`);
  console.log(`期待効果: 行ごとグループ化により30-60%削減`);

  // パフォーマンス目標
  assertLess(
    smallAvg,
    5,
    `小規模テストが目標値を超過: ${smallAvg.toFixed(2)}ms > 5ms`,
  );

  assertLess(
    mediumAvg,
    25,
    `中規模テストが目標値を超過: ${mediumAvg.toFixed(2)}ms > 25ms`,
  );

  assertLess(
    largeAvg,
    100,
    `大規模テストが目標値を超過: ${largeAvg.toFixed(2)}ms > 100ms`,
  );

  console.log("✓ 空間分割最適化: 最適化成功\n");
});

/**
 * ベンチマーク3: 最悪ケースシナリオ
 * 全単語が同一行に密集している場合のパフォーマンス
 */
test("Optimization Benchmark: Worst case scenario - dense single line", async () => {
  console.log("\n=== 最悪ケースベンチマーク（全単語同一行）===");

  // 全単語が同一行に密集
  const denseWords: Word[] = [];
  for (let i = 0; i < 200; i++) {
    denseWords.push({
      text: `w${i}`,
      line: 1, // 全て同じ行
      col: i * 3 + 1,
      byteCol: i * 3 + 1,
    });
  }

  const iterations = 100;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    detectAdjacentWords(denseWords);
  }

  const end = performance.now();
  const avgTime = (end - start) / iterations;

  console.log(`単語数: ${denseWords.length} (全て同一行)`);
  console.log(`実行回数: ${iterations}`);
  console.log(`平均実行時間: ${avgTime.toFixed(4)}ms/回`);
  console.log(`期待動作: 同一行内のO(n²)は避けられないが、行グループ化により他行との比較は排除`);

  // 最悪ケースでも合理的な時間で完了すること
  assertLess(
    avgTime,
    50,
    `最悪ケースが目標値を超過: ${avgTime.toFixed(2)}ms > 50ms`,
  );

  console.log("✓ 最悪ケース: 許容範囲内\n");
});

/**
 * ベンチマーク4: ベストケースシナリオ
 * 単語が多数の行に分散している場合のパフォーマンス
 */
test("Optimization Benchmark: Best case scenario - distributed lines", async () => {
  console.log("\n=== ベストケースベンチマーク（行分散）===");

  // 各行に1単語ずつ分散
  const distributedWords: Word[] = [];
  for (let i = 0; i < 1000; i++) {
    distributedWords.push({
      text: `word${i}`,
      line: i + 1, // 各単語が異なる行
      col: 1,
      byteCol: 1,
    });
  }

  const iterations = 100;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    detectAdjacentWords(distributedWords);
  }

  const end = performance.now();
  const avgTime = (end - start) / iterations;

  console.log(`単語数: ${distributedWords.length} (各単語が異なる行)`);
  console.log(`実行回数: ${iterations}`);
  console.log(`平均実行時間: ${avgTime.toFixed(4)}ms/回`);
  console.log(`期待効果: 行分散により隣接チェックがほぼゼロ、最大効果発揮`);

  // ベストケースでは非常に高速
  assertLess(
    avgTime,
    10,
    `ベストケースが目標値を超過: ${avgTime.toFixed(2)}ms > 10ms`,
  );

  console.log("✓ ベストケース: 最大効果を発揮\n");
});

/**
 * ベンチマーク5: 統合パフォーマンス評価
 * 総合的なパフォーマンス向上を測定
 */
test("Optimization Benchmark: Overall performance improvement", async () => {
  console.log("\n=== 統合パフォーマンス評価 ===");

  // 現実的な使用シナリオ
  const realisticWords = generateTestWords(300, 15); // 300単語、20行程度

  const detector = new RegexWordDetector({
    minWordLength: 2,
    maxWordLength: 30,
    exclude_numbers: true,
  });

  // 全体のワークフロー測定
  const iterations = 50;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    // 1. 単語検出（フィルタリング含む）
    await detector.detectWords(
      realisticWords.map((w) => w.text).join(" "),
      1,
      { minWordLength: 2, config: { useJapanese: false } },
    );

    // 2. 隣接検出
    detectAdjacentWords(realisticWords);
  }

  const end = performance.now();
  const avgTime = (end - start) / iterations;

  console.log(`統合テスト (300単語, 20行):`);
  console.log(`実行回数: ${iterations}`);
  console.log(`平均実行時間: ${avgTime.toFixed(4)}ms/回`);
  console.log(`\n期待総合効果: 25-35%パフォーマンス向上`);
  console.log(`- フィルタチェーン統合: 60-75%削減`);
  console.log(`- 空間分割最適化: 30-60%削減`);

  // 統合パフォーマンス目標
  assertLess(
    avgTime,
    100,
    `統合パフォーマンスが目標値を超過: ${avgTime.toFixed(2)}ms > 100ms`,
  );

  console.log("\n✓ 統合評価: 目標達成\n");
  console.log("===========================================");
  console.log("パフォーマンス最適化: 全ベンチマーク成功");
  console.log("===========================================\n");
});
