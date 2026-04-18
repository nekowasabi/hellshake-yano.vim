/**
 * tests/unit/common/utils/batch.test.ts
 *
 * batchGet / callAtomic ラッパーのユニットテスト
 */

import { assertEquals, assertRejects } from "@std/assert";
import { batchGet, callAtomic } from "../../../../denops/hellshake-yano/common/utils/batch.ts";
import type { Denops } from "@denops/std";
import { BatchError } from "jsr:@denops/core@^7.0.1/error";

// ========== モック ==========

/**
 * 成功レスポンスを返す Denops モック（denops.batch ベース）
 */
function createSuccessDenops(results: unknown[]): Partial<Denops> {
  return {
    batch: (..._calls: [string, ...unknown[]][]) => {
      return Promise.resolve(results);
    },
  };
}

/**
 * エラーレスポンスを返す Denops モック（BatchError をスロー）
 * @param partialResults - エラー発生前に成功した結果
 * @param errMsg - エラーメッセージ
 */
function createErrorDenops(
  partialResults: unknown[],
  _idx: number,
  _errType: number,
  errMsg: string,
): Partial<Denops> {
  return {
    batch: (..._calls: [string, ...unknown[]][]) => {
      return Promise.reject(new BatchError(errMsg, partialResults));
    },
  };
}

// ========== batchGet モック ==========

/**
 * collect() が使用する denops.batch を模倣するモック
 * collect() は内部で denops.batch(...calls) を呼ぶため、
 * batch メソッドをモックする必要がある。
 */
function createBatchDenops(results: unknown[]): Partial<Denops> {
  return {
    batch: (..._calls: [string, ...unknown[]][]) => {
      return Promise.resolve(results);
    },
    // collect() が CollectHelper 経由で call/eval を呼ぶため stub が必要
    call: (_fn: string, ..._args: unknown[]) => Promise.resolve(undefined),
    eval: (_expr: string) => Promise.resolve(undefined),
  };
}

// ========== テスト ==========

// ---- batchGet テスト ----

Deno.test("batchGet: 正しい型で結果を返す", async () => {
  // モック: denops.batch が [42, "hello", true] を返す
  const denops = createBatchDenops([42, "hello", true]) as unknown as Denops;

  const [num, str, bool] = await batchGet(denops, (d) =>
    [
      d.eval("42"),
      d.eval("'hello'"),
      d.eval("v:true"),
    ] as const);

  assertEquals(num, 42);
  assertEquals(str, "hello");
  assertEquals(bool, true);
});

Deno.test("batchGet: 空のコールバックで空配列を返す", async () => {
  const denops = createBatchDenops([]) as unknown as Denops;

  const results = await batchGet(denops, (_d) => [] as const);

  assertEquals(results, []);
});

Deno.test("batchGet: 単一呼び出しで正しい値を返す", async () => {
  const denops = createBatchDenops([99]) as unknown as Denops;

  const [val] = await batchGet(denops, (d) =>
    [
      d.call("bufnr", "%"),
    ] as const);

  assertEquals(val, 99);
});

Deno.test("batchGet: denops.batch が1回だけ呼ばれる", async () => {
  let batchCallCount = 0;
  const mockDenops: Partial<Denops> = {
    batch: (..._calls: [string, ...unknown[]][]) => {
      batchCallCount++;
      return Promise.resolve([1, 2, 3]);
    },
    call: (_fn: string, ..._args: unknown[]) => Promise.resolve(undefined),
    eval: (_expr: string) => Promise.resolve(undefined),
  };

  await batchGet(mockDenops as unknown as Denops, (d) =>
    [
      d.eval("line('w0')"),
      d.eval("line('w$')"),
      d.call("bufnr", "%"),
    ] as const);

  assertEquals(batchCallCount, 1);
});

// ---- callAtomic テスト ----

Deno.test("callAtomic: 正常時に結果配列を返す", async () => {
  const expectedResults = [1, "ok", true];
  const denops = createSuccessDenops(expectedResults) as Denops;

  const calls: Array<[string, ...unknown[]]> = [
    ["nvim_get_current_buf"],
    ["nvim_buf_get_name", 0],
    ["nvim_get_mode"],
  ];

  const results = await callAtomic(denops, calls);
  assertEquals(results, expectedResults);
});

Deno.test("callAtomic: 空の calls 配列で空の結果を返す", async () => {
  const denops = createSuccessDenops([]) as Denops;

  const results = await callAtomic(denops, []);
  assertEquals(results, []);
});

Deno.test("callAtomic: 単一呼び出しで正常に結果を返す", async () => {
  const denops = createSuccessDenops([42]) as Denops;

  const calls: Array<[string, ...unknown[]]> = [
    ["nvim_get_current_buf"],
  ];

  const results = await callAtomic(denops, calls);
  assertEquals(results, [42]);
});

Deno.test("callAtomic: エラー時に適切な例外をスロー", async () => {
  const denops = createErrorDenops(
    [1], // index 0 は成功、index 1 でエラー
    1,
    0, // Exception type
    "Invalid argument",
  ) as Denops;

  const calls: Array<[string, ...unknown[]]> = [
    ["nvim_get_current_buf"],
    ["nvim_buf_set_name", -999, "invalid"], // 無効なバッファ番号
  ];

  await assertRejects(
    () => callAtomic(denops, calls),
    Error,
    "callAtomic failed: Invalid argument",
  );
});

Deno.test("callAtomic: エラーメッセージにエラー内容が含まれる", async () => {
  const denops = createErrorDenops(
    [],
    0,
    1, // Validation type
    "Wrong number of arguments",
  ) as Denops;

  const calls: Array<[string, ...unknown[]]> = [
    ["nvim_buf_set_extmark"], // 引数不足
  ];

  await assertRejects(
    () => callAtomic(denops, calls),
    Error,
    "callAtomic failed: Wrong number of arguments",
  );
});
