/**
 * tests/hide_hints_error_logging_test.ts
 *
 * Process 11: hideHintsOptimized の logMessage 出力テスト
 *
 * Why: 空 catch でエラーを握り潰すと nvim_buf_clear_namespace の失敗が
 *      観測できなくなる。Process 02 で logMessage("ERROR", ...) に置換した
 *      ことを検証する Red Phase テスト。
 *
 *      logMessage は内部で console.error を呼ぶため、console.error を spy
 *      することで間接的に呼び出しを検証する（logger.ts:107）。
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { spy } from "@std/testing/mock";
import { MockDenops } from "./helpers/mock.ts";
import { Core } from "../denops/hellshake-yano/neovim/core/core.ts";

Deno.test({
  name: "[REGRESSION] hideHintsOptimized logs ERROR when nvim_buf_clear_namespace throws",
  async fn() {
    Core.resetForTesting();
    const core = Core.getInstance({ enabled: true });

    const denops = new MockDenops();
    denops.onCall("bufnr", () => 1);
    denops.onCall("nvim_create_namespace", () => 42);
    denops.onCall("nvim_buf_clear_namespace", () => {
      throw new Error("mock_clear_failure");
    });

    const errorSpy = spy(console, "error");

    try {
      await core.hideHintsOptimized(denops);

      // 検証: console.error が 1 回以上呼ばれている
      // (Process 03 throttling が入った後も初回は出力される想定)
      const calls = errorSpy.calls;
      const matched = calls.find((c) => {
        const msg = String(c.args[0] ?? "");
        return msg.includes("ERROR") &&
          msg.includes("hellshake-yano") &&
          msg.includes("Failed to clear extmarks");
      });
      if (!matched) {
        throw new Error(
          `Expected console.error to be called with 'Failed to clear extmarks' message. Calls: ${
            JSON.stringify(calls.map((c) => c.args))
          }`,
        );
      }
      const logged = String(matched.args[0]);
      assertStringIncludes(logged, "[ERROR]");
      assertStringIncludes(logged, "[hellshake-yano]");
      assertStringIncludes(logged, "Failed to clear extmarks");
      assertStringIncludes(logged, "mock_clear_failure");
    } finally {
      errorSpy.restore();
      Core.resetForTesting();
    }
  },
});
