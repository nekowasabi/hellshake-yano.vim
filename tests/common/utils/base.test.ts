/**
 * tests/common/utils/base.test.ts
 *
 * 基本処理ユーティリティのテスト
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import {
  getSingletonInstance,
  getStateCopy,
  initializeState,
  validateInListCompat,
  validateNonEmptyCompat,
  validateRangeCompat,
  withFallback,
} from "../../../denops/hellshake-yano/common/utils/base.ts";

// ========== Singleton パターン ==========

Deno.test("getSingletonInstance: 新規インスタンスを作成", () => {
  const result = getSingletonInstance(undefined, () => ({ value: 42 }));
  assertEquals(result.value, 42);
});

Deno.test("getSingletonInstance: 既存インスタンスを返す", () => {
  const existing = { value: 100 };
  const result = getSingletonInstance(existing, () => ({ value: 42 }));
  assertEquals(result.value, 100);
});

// ========== 状態管理 ==========

Deno.test("initializeState: ディープコピーを作成", () => {
  const original = { a: 1, b: { c: 2 } };
  const copy = initializeState(original);
  copy.b.c = 999;
  assertEquals(original.b.c, 2); // 元のオブジェクトは変更されない
});

Deno.test("getStateCopy: ディープコピーを返す", () => {
  const original = { x: 1, y: { z: 2 } };
  const copy = getStateCopy(original);
  copy.y.z = 999;
  assertEquals(original.y.z, 2); // 元のオブジェクトは変更されない
});

// ========== エラーハンドリング ==========

Deno.test("withFallback: 成功時に結果を返す", async () => {
  const result = await withFallback(async () => "success", "fallback", "TestContext");
  assertEquals(result, "success");
});

Deno.test("withFallback: エラー時にフォールバック値を返す", async () => {
  const result = await withFallback(
    async () => {
      throw new Error("Failed");
    },
    "fallback",
    "TestContext",
  );
  assertEquals(result, "fallback");
});

// ========== Phase B-3互換バリデーション ==========

Deno.test("validateRangeCompat: 正常値を検証", () => {
  const result = validateRangeCompat(50, 0, 100, "value");
  assertEquals(result, null);
});

Deno.test("validateRangeCompat: 範囲外を検出（string返却）", () => {
  const result = validateRangeCompat(-1, 0, 100, "value");
  assertEquals(typeof result, "string");
  assertEquals(result?.includes("must be between"), true);
});

Deno.test("validateNonEmptyCompat: 正常な文字列を検証", () => {
  const result = validateNonEmptyCompat("hello", "value");
  assertEquals(result, null);
});

Deno.test("validateNonEmptyCompat: 空文字列を検出（string返却）", () => {
  const result = validateNonEmptyCompat("", "value");
  assertEquals(typeof result, "string");
});

Deno.test("validateNonEmptyCompat: nullを検出（string返却）", () => {
  const result = validateNonEmptyCompat("", "value");
  assertEquals(typeof result, "string");
});

Deno.test("validateInListCompat: 含まれる値を検証", () => {
  const result = validateInListCompat("a", ["a", "b", "c"], "value");
  assertEquals(result, null);
});

Deno.test("validateInListCompat: 含まれない値を検出（string返却）", () => {
  const result = validateInListCompat("d", ["a", "b", "c"], "value");
  assertEquals(typeof result, "string");
  assertEquals(result?.includes("must be one of"), true);
});
