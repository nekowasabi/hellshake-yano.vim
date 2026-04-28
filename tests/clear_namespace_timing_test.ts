/**
 * tests/clear_namespace_timing_test.ts
 *
 * Process 06: nvim_buf_clear_namespace timing 計測テスト
 *
 * Why: hot path の nvim_buf_clear_namespace 所要時間が show/hide サイクル
 *      繰り返しで増加するかを実測するため、debugMode 有効時に
 *      DEBUG ログ ("clearNamespace: Xms") を出力する。
 *      debugMode 無効時はオーバーヘッドゼロを保証する。
 */

import { assertStringIncludes } from "@std/assert";
import { spy } from "@std/testing/mock";
import { MockDenops } from "./helpers/mock.ts";
import { Core } from "../denops/hellshake-yano/neovim/core/core.ts";
import { setDebugMode } from "../denops/hellshake-yano/common/utils/logger.ts";

function buildSuccessDenops(): MockDenops {
  const denops = new MockDenops();
  denops.onCall("bufnr", () => 1);
  denops.onCall("nvim_create_namespace", () => 99);
  denops.onCall("nvim_buf_clear_namespace", () => true);
  return denops;
}

function findClearNamespaceLog(
  consoleSpy: ReturnType<typeof spy<typeof console, "log">>,
): string | undefined {
  for (const call of consoleSpy.calls) {
    const msg = String(call.args[0] ?? "");
    if (
      msg.includes("[DEBUG]") &&
      msg.includes("[hellshake-yano:perf]") &&
      msg.includes("clearNamespace")
    ) {
      return msg;
    }
  }
  return undefined;
}

Deno.test({
  name: "[REGRESSION] hideHintsOptimized logs clearNamespace timing when debugMode is true",
  async fn() {
    Core.resetForTesting();
    setDebugMode(true);
    const core = Core.getInstance({ enabled: true });
    const denops = buildSuccessDenops();

    const logSpy = spy(console, "log");
    try {
      await core.hideHintsOptimized(denops);

      const found = findClearNamespaceLog(logSpy);
      if (!found) {
        throw new Error(
          `Expected DEBUG log containing 'clearNamespace'. Logs: ${
            JSON.stringify(logSpy.calls.map((c) => c.args[0]))
          }`,
        );
      }
      assertStringIncludes(found, "ms");
    } finally {
      logSpy.restore();
      setDebugMode(false);
      Core.resetForTesting();
    }
  },
});

Deno.test({
  name: "[REGRESSION] hideHintsOptimized does not log clearNamespace when debugMode is false",
  async fn() {
    Core.resetForTesting();
    setDebugMode(false);
    const core = Core.getInstance({ enabled: true });
    const denops = buildSuccessDenops();

    const logSpy = spy(console, "log");
    try {
      await core.hideHintsOptimized(denops);

      const found = findClearNamespaceLog(logSpy);
      if (found) {
        throw new Error(
          `debugMode=false なのに DEBUG ログが出力された: ${found}`,
        );
      }
    } finally {
      logSpy.restore();
      Core.resetForTesting();
    }
  },
});
