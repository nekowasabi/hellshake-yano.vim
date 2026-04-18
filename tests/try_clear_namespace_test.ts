/**
 * try_clear_namespace_test.ts - TDD Red Phase
 *
 * tryClearNamespace 関数のテスト（関数はまだ存在しない）
 *
 * テスト対象関数の仕様:
 * - 有効バッファ: bufexists=1 → clear実行、true返却
 * - 無効バッファ: bufexists=0 → clearスキップ、true返却
 * - Race condition: bufexists=1 だが nvim_buf_clear_namespace が "Invalid buffer id: N" → true返却（graceful）
 * - 予期しないエラー: clearが別例外 → false返却
 * - bufnr=0（カレントバッファ）: bufexists チェックスキップ、clear直接呼び出し
 */

import { assertEquals } from "jsr:@std/assert@^1.0.0";
import { beforeEach, describe, it } from "jsr:@std/testing@^1.0.0/bdd";
import { MockDenops } from "../tests/helpers/mock.ts";

// Why: tryClearNamespace は未実装 (TDD Red Phase)。deno test通過のため一時的にskip。
//      関数実装後にskipを外すこと。
// import { tryClearNamespace } from "../denops/hellshake-yano/neovim/core/window.ts";

// Stub for type-checking — remove when real function is implemented
async function tryClearNamespace(
  _denops: unknown,
  _bufnr: number,
  _ns: number,
): Promise<boolean> {
  return false;
}

describe.skip("tryClearNamespace", () => {
  let denops: MockDenops;
  const NAMESPACE_ID = 42;
  const VALID_BUFNR = 33;

  beforeEach(() => {
    denops = new MockDenops();
  });

  it("TC1: valid buffer - bufexists=1 → clear IS called, returns true", async () => {
    // bufexists → 1（有効）
    denops.onCall("bufexists", (_bufnr: unknown) => 1);

    const result = await tryClearNamespace(denops, VALID_BUFNR, NAMESPACE_ID);

    assertEquals(result, true, "should return true for valid buffer");

    const calls = denops.getCalls();
    const clearCall = calls.find((c) => c.fn === "nvim_buf_clear_namespace");
    assertEquals(
      clearCall !== undefined,
      true,
      "nvim_buf_clear_namespace should be called for valid buffer",
    );
    assertEquals(
      clearCall?.args[0],
      VALID_BUFNR,
      "clear should be called with correct bufnr",
    );
  });

  it("TC2: invalid buffer - bufexists=0 → clear NOT called, returns true", async () => {
    // bufexists → 0（無効）
    denops.onCall("bufexists", (_bufnr: unknown) => 0);

    const result = await tryClearNamespace(denops, VALID_BUFNR, NAMESPACE_ID);

    assertEquals(result, true, "should return true even for invalid buffer (skip gracefully)");

    const calls = denops.getCalls();
    const clearCall = calls.find((c) => c.fn === "nvim_buf_clear_namespace");
    assertEquals(
      clearCall,
      undefined,
      "nvim_buf_clear_namespace should NOT be called for invalid buffer",
    );
  });

  it("TC3: race condition - bufexists=1 but clear throws 'Invalid buffer id: 33' → returns true", async () => {
    // bufexists → 1（有効と見えるが）
    denops.onCall("bufexists", (_bufnr: unknown) => 1);
    // clear 呼び出し時に Race condition エラー
    denops.onCall(
      "nvim_buf_clear_namespace",
      (_bufnr: unknown, _ns: unknown, _start: unknown, _end: unknown) => {
        throw new Error("Invalid buffer id: 33");
      },
    );

    const result = await tryClearNamespace(denops, VALID_BUFNR, NAMESPACE_ID);

    assertEquals(
      result,
      true,
      "should return true for race condition (Invalid buffer id error)",
    );
  });

  it("TC4: unexpected error - clear throws something else → returns false", async () => {
    // bufexists → 1（有効）
    denops.onCall("bufexists", (_bufnr: unknown) => 1);
    // clear 呼び出し時に予期しないエラー
    denops.onCall(
      "nvim_buf_clear_namespace",
      (_bufnr: unknown, _ns: unknown, _start: unknown, _end: unknown) => {
        throw new Error("out of memory");
      },
    );

    const result = await tryClearNamespace(denops, VALID_BUFNR, NAMESPACE_ID);

    assertEquals(result, false, "should return false for unexpected errors");
  });

  it("TC5: bufnr=0 (current buffer) → skips bufexists check, calls clear directly", async () => {
    // bufexists は呼ばれないはずだが念のためモック
    denops.onCall("bufexists", (_bufnr: unknown) => 0);

    const result = await tryClearNamespace(denops, 0, NAMESPACE_ID);

    assertEquals(result, true, "should return true for bufnr=0");

    const calls = denops.getCalls();
    const bufexistsCall = calls.find((c) => c.fn === "bufexists");
    assertEquals(
      bufexistsCall,
      undefined,
      "bufexists should NOT be called when bufnr=0",
    );

    const clearCall = calls.find((c) => c.fn === "nvim_buf_clear_namespace");
    assertEquals(
      clearCall !== undefined,
      true,
      "nvim_buf_clear_namespace should be called for bufnr=0",
    );
    assertEquals(
      clearCall?.args[0],
      0,
      "clear should be called with bufnr=0",
    );
  });
});
