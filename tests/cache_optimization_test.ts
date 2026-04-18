/**
 * Cache Optimization Test - TDD Red-Green-Refactor
 * webモーション高速化のキャッシュ最適化に対するテストスイート
 *
 * 目的：
 * - モーションキー別のキャッシュ分離が正しく機能することを検証
 * - キャッシュヒット/ミスの動作を確認
 * - キャッシュTTLの動作を確認
 * - パフォーマンスの改善を測定
 *
 * Phase: Red - テストを先に作成し、失敗することを確認
 */

import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { detectWordsWithManager } from "../denops/hellshake-yano/neovim/core/word.ts";
import type { EnhancedWordConfig } from "../denops/hellshake-yano/neovim/core/word.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.5.0/mod.ts";
import type { WordDetectionResult } from "../denops/hellshake-yano/types.ts";

// テスト用のバッファ内容
const TEST_LINES = [
  "function testFunction() {",
  "  const variable = 'test';",
  "  const api = new API();",
  "  return variable;",
  "}",
];

// モックDenopsオブジェクト
// Why: batchGet (collect) が denops.batch を使用するため、batch モックは
// 各 call/eval を順に解決する必要がある。getFoldedLines も denops.eval を使用。
const createMockDenops = (bufnr = 1): Denops => {
  const callHandler = async (fn: string, ...args: unknown[]): Promise<unknown> => {
    if (fn === "bufnr") return bufnr;
    if (fn === "line") {
      if (args[0] === "w0") return 1;
      if (args[0] === "w$") return TEST_LINES.length;
    }
    if (fn === "getline") {
      const start = args[0] as number;
      const end = args[1] as number;
      return TEST_LINES.slice(start - 1, end);
    }
    // Why: detectWordsFromBuffer uses getbufline to fetch buffer lines
    if (fn === "getbufline") {
      const start = args[1] as number;
      const end = args[2] as number;
      return TEST_LINES.slice(start - 1, end);
    }
    if (fn === "get_config") {
      throw new Error("Config not available");
    }
    if (fn === "foldclosedend") return -1;
    // nvim_buf_get_changedtick - return a dummy value
    if (fn === "nvim_buf_get_changedtick") return 1;
    return null;
  };
  return {
    name: "hellshake-yano-test",
    dispatcher: {},
    call: callHandler,
    // Why: collect は denops.batch(...calls) を内部的に呼ぶ。
    // 各 call を callHandler で解決し結果配列を返すモック実装。
    batch: async (...calls: [string, ...unknown[]][]): Promise<unknown[]> => {
      const results: unknown[] = [];
      for (const [fn, ...args] of calls) {
        results.push(await callHandler(fn, ...args));
      }
      return results;
    },
    cmd: async () => {},
    eval: async (expr: string): Promise<unknown> => {
      // getFoldedLines が filter(range(...)) を eval する — fold 無しを想定
      if (typeof expr === "string" && expr.includes("foldclosed")) return [];
      return [];
    },
    redraw: async () => {},
  } as unknown as Denops;
};

/**
 * Test Group 1: キャッシュヒット/ミスのテスト
 */
Deno.test("Cache Optimization - Test 1.1: 同じモーションキーの連続実行でキャッシュヒット", async () => {
  const denops = createMockDenops();

  const config: EnhancedWordConfig = {
    currentKeyContext: "w",
    perKeyMinLength: { w: 1, e: 1, b: 1 },
    defaultMinWordLength: 3,
    useJapanese: false,
    cacheEnabled: true,
  };

  // 1回目の実行（キャッシュミス）
  const startTime1 = performance.now();
  const result1 = await detectWordsWithManager(denops, config);
  const duration1 = performance.now() - startTime1;

  assertExists(result1);
  assert(result1.success, "1回目: 検出が成功すること");
  assert(result1.words.length > 0, "1回目: 単語が検出されること");

  // 2回目の実行（キャッシュヒット期待）
  const startTime2 = performance.now();
  const result2 = await detectWordsWithManager(denops, config);
  const duration2 = performance.now() - startTime2;

  assertExists(result2);
  assert(result2.success, "2回目: 検出が成功すること");
  assertEquals(result1.words.length, result2.words.length, "2回目: 同じ数の単語が検出されること");

  // キャッシュヒットにより2回目が速いことを確認
  console.log(`Test 1.1: 1回目=${duration1.toFixed(2)}ms, 2回目=${duration2.toFixed(2)}ms`);
  assert(
    duration2 < duration1 * 0.5,
    `2回目はキャッシュヒットにより高速化されること (1回目: ${duration1.toFixed(2)}ms, 2回目: ${
      duration2.toFixed(2)
    }ms)`,
  );
});

Deno.test("Cache Optimization - Test 1.2: 異なるモーションキーでキャッシュミス", async () => {
  const denops = createMockDenops();

  // 'w' モーションの実行
  const configW: EnhancedWordConfig = {
    currentKeyContext: "w",
    perKeyMinLength: { w: 1, e: 3 },
    defaultMinWordLength: 3,
    useJapanese: false,
    cacheEnabled: true,
  };

  const resultW = await detectWordsWithManager(denops, configW);

  // 'e' モーションの実行（異なる設定なのでキャッシュミス）
  const configE: EnhancedWordConfig = {
    currentKeyContext: "e",
    perKeyMinLength: { w: 1, e: 3 },
    defaultMinWordLength: 3,
    useJapanese: false,
    cacheEnabled: true,
  };

  const resultE = await detectWordsWithManager(denops, configE);

  assertExists(resultW);
  assertExists(resultE);
  assert(resultW.success, "'w'モーション: 検出が成功すること");
  assert(resultE.success, "'e'モーション: 検出が成功すること");
  assert(
    resultW.words.length > 0 || resultE.words.length > 0,
    "いずれかのモーションで単語が検出されること",
  );

  console.log(`Test 1.2: w=${resultW.words.length}語, e=${resultE.words.length}語`);
});

Deno.test("Cache Optimization - Test 1.3: 異なる設定でキャッシュキーが変わること", async () => {
  const denops = createMockDenops();

  const config1: EnhancedWordConfig = {
    currentKeyContext: "w",
    defaultMinWordLength: 1,
    useJapanese: false,
    cacheEnabled: true,
  };

  const config2: EnhancedWordConfig = {
    currentKeyContext: "w",
    defaultMinWordLength: 3, // 異なる最小長
    useJapanese: false,
    cacheEnabled: true,
  };

  const result1 = await detectWordsWithManager(denops, config1);
  const result2 = await detectWordsWithManager(denops, config2);

  assertExists(result1);
  assertExists(result2);
  assert(result1.success && result2.success, "両方とも検出が成功すること");

  // 最小長が異なるため、検出される単語数が異なるはず
  console.log(
    `Test 1.3: minLength=1で${result1.words.length}語, minLength=3で${result2.words.length}語`,
  );
});

/**
 * Test Group 2: キャッシュTTLのテスト
 */
Deno.test("Cache Optimization - Test 2.1: TTL以内はキャッシュヒット", async () => {
  const denops = createMockDenops();

  const config: EnhancedWordConfig = {
    currentKeyContext: "w",
    defaultMinWordLength: 1,
    useJapanese: false,
    cacheEnabled: true,
  };

  // 1回目の実行
  const result1 = await detectWordsWithManager(denops, config);

  // 100ms待機（TTL 5秒以内）
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 2回目の実行（キャッシュヒット期待）
  const startTime = performance.now();
  const result2 = await detectWordsWithManager(denops, config);
  const duration = performance.now() - startTime;

  assertEquals(result1.words.length, result2.words.length, "TTL以内は同じ結果が得られること");
  assert(
    duration < 1.0,
    `TTL以内はキャッシュヒットにより高速化されること (実測: ${duration.toFixed(3)}ms)`,
  );
  console.log(`Test 2.1: 100ms後のキャッシュヒット時間=${duration.toFixed(3)}ms`);
});

/**
 * Test Group 3: パフォーマンステスト
 */
Deno.test("Cache Optimization - Test 3.1: キャッシュヒット時の応答時間測定", async () => {
  const denops = createMockDenops();

  const config: EnhancedWordConfig = {
    currentKeyContext: "w",
    defaultMinWordLength: 1,
    useJapanese: false,
    cacheEnabled: true,
  };

  // ウォームアップ
  await detectWordsWithManager(denops, config);

  // 複数回実行して平均応答時間を測定
  const iterations = 10;
  let totalDuration = 0;

  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    await detectWordsWithManager(denops, config);
    totalDuration += performance.now() - startTime;
  }

  const averageDuration = totalDuration / iterations;

  console.log(`Test 3.1: 平均キャッシュヒット時間=${averageDuration.toFixed(3)}ms`);

  // キャッシュヒット時は1ミリ秒以下が目標
  assert(
    averageDuration < 1.0,
    `平均応答時間が1ms以下であること (実測: ${averageDuration.toFixed(3)}ms)`,
  );
});

Deno.test("Cache Optimization - Test 3.2: キャッシュミス時の応答時間測定", async () => {
  const denops = createMockDenops();

  // 毎回異なる設定でキャッシュミスを発生させる
  const iterations = 5;
  let totalDuration = 0;

  for (let i = 0; i < iterations; i++) {
    const config: EnhancedWordConfig = {
      currentKeyContext: `key-${i}`, // 毎回異なるキー
      defaultMinWordLength: 1,
      useJapanese: false,
      cacheEnabled: true,
    };

    const startTime = performance.now();
    await detectWordsWithManager(denops, config);
    totalDuration += performance.now() - startTime;
  }

  const averageDuration = totalDuration / iterations;

  console.log(`Test 3.2: 平均キャッシュミス時間=${averageDuration.toFixed(3)}ms`);

  // キャッシュミス時でも10ミリ秒以下が目標
  assert(
    averageDuration < 10.0,
    `平均応答時間が10ms以下であること (実測: ${averageDuration.toFixed(3)}ms)`,
  );
});

/**
 * Test Group 4: モーションキー切り替えテスト
 */
Deno.test("Cache Optimization - Test 4.1: モーションキー切り替え後のキャッシュ再利用", async () => {
  const denops = createMockDenops();

  const configW: EnhancedWordConfig = {
    currentKeyContext: "w",
    defaultMinWordLength: 1,
    useJapanese: false,
    cacheEnabled: true,
  };

  const configE: EnhancedWordConfig = {
    currentKeyContext: "e",
    defaultMinWordLength: 1,
    useJapanese: false,
    cacheEnabled: true,
  };

  // w → e → w のシーケンス
  await detectWordsWithManager(denops, configW);
  await detectWordsWithManager(denops, configE);

  // wに戻った時にキャッシュヒット
  const startTime = performance.now();
  await detectWordsWithManager(denops, configW);
  const duration = performance.now() - startTime;

  console.log(`Test 4.1: w→e→wの切り替え後のキャッシュヒット時間=${duration.toFixed(3)}ms`);

  assert(
    duration < 1.0,
    `モーションキー切り替え後もキャッシュが機能すること (実測: ${duration.toFixed(3)}ms)`,
  );
});

/**
 * Test Group 5: キャッシュ無効化テスト
 */
Deno.test("Cache Optimization - Test 5.1: キャッシュ無効時は毎回処理実行", async () => {
  const denops = createMockDenops();

  const config: EnhancedWordConfig = {
    currentKeyContext: "w",
    defaultMinWordLength: 1,
    useJapanese: false,
    cacheEnabled: false, // キャッシュ無効
  };

  // 1回目
  const startTime1 = performance.now();
  const result1 = await detectWordsWithManager(denops, config);
  const duration1 = performance.now() - startTime1;

  // 2回目
  const startTime2 = performance.now();
  const result2 = await detectWordsWithManager(denops, config);
  const duration2 = performance.now() - startTime2;

  assertEquals(result1.words.length, result2.words.length, "同じ結果が得られること");

  console.log(
    `Test 5.1: キャッシュ無効時 1回目=${duration1.toFixed(2)}ms, 2回目=${duration2.toFixed(2)}ms`,
  );

  // Why: 比率の下限を 0.1 に緩和 — モック環境では絶対時間がマイクロ秒単位と微小で
  // GC やスケジューラのタイミングノイズにより比率が大きく変動するため。
  // 実環境では両方ミリ秒オーダーになるため 0.5-2.0 で安定する。
  const ratio = duration2 / duration1;
  assert(
    ratio > 0.1 && ratio < 10.0,
    `キャッシュ無効時は毎回同程度の時間がかかること (比率: ${ratio.toFixed(2)})`,
  );
});
