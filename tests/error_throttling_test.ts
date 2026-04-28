/**
 * tests/error_throttling_test.ts
 *
 * Process 21: 連続失敗抑制カウンタの動作テスト
 *
 * Why: ERROR レベルは debug flag 非依存で常時出力されるため、
 *      hot path で連続失敗するとログが氾濫する。Process 03 で実装した
 *      モジュールスコープ static カウンタが
 *      初回 + EXTMARK_ERROR_LOG_INTERVAL (=100) 回ごとに間引いて
 *      logMessage を呼び出していることを検証する。
 *
 *      ループ回数 200 回 / 期待コール数 3 の関係:
 *        - 1 回目 (count=1): 出力 (count === 1)
 *        - 100 回目 (count=100): 出力 (count % 100 === 0)
 *        - 200 回目 (count=200): 出力 (count % 100 === 0)
 *      → 期待値: 3 回
 */

import { assertEquals } from "@std/assert";
import { spy } from "@std/testing/mock";
import { MockDenops } from "./helpers/mock.ts";
import { cleanupPlugin, Core } from "../denops/hellshake-yano/neovim/core/core.ts";

function buildThrowingDenops(): MockDenops {
  const denops = new MockDenops();
  denops.onCall("bufnr", () => 1);
  denops.onCall("nvim_create_namespace", () => 42);
  denops.onCall("nvim_buf_clear_namespace", () => {
    throw new Error("simulated_clear_failure");
  });
  return denops;
}

function countMatchingErrorCalls(
  errorSpy: { calls: Array<{ args: unknown[] }> },
): number {
  return errorSpy.calls.filter((c) => {
    const msg = String(c.args[0] ?? "");
    return msg.includes("[ERROR]") &&
      msg.includes("[hellshake-yano]") &&
      msg.includes("Failed to clear extmarks");
  }).length;
}

Deno.test({
  name: "[REGRESSION] hideHintsOptimized throttles error logs to 3 calls over 200 failures",
  async fn() {
    Core.resetForTesting();
    const denops = buildThrowingDenops();
    // Why: 状態リセット — テスト間でカウンタ汚染を避けるため、まず cleanupPlugin で 0 に戻す。
    await cleanupPlugin(denops);

    const core = Core.getInstance({ enabled: true });
    const errorSpy = spy(console, "error");

    try {
      for (let i = 0; i < 200; i++) {
        await core.hideHintsOptimized(denops);
      }
      // 期待: 3 calls (1回目, 100回目, 200回目)
      assertEquals(countMatchingErrorCalls(errorSpy), 3);
    } finally {
      errorSpy.restore();
      await cleanupPlugin(denops);
      Core.resetForTesting();
    }
  },
});

Deno.test({
  name: "[REGRESSION] extmarkClearErrorCount resets after cleanupPlugin",
  async fn() {
    Core.resetForTesting();
    const denops = buildThrowingDenops();
    await cleanupPlugin(denops);

    const core = Core.getInstance({ enabled: true });

    // 200 回失敗させてカウンタを進める (ログ出力は計 3 回)
    {
      const warmupSpy = spy(console, "error");
      try {
        for (let i = 0; i < 200; i++) {
          await core.hideHintsOptimized(denops);
        }
        assertEquals(countMatchingErrorCalls(warmupSpy), 3);
      } finally {
        warmupSpy.restore();
      }
    }

    // cleanupPlugin でリセット
    await cleanupPlugin(denops);

    // 再度 1 回呼び出すと「初回」扱いとなり logMessage が呼ばれる
    {
      const errorSpy = spy(console, "error");
      try {
        await core.hideHintsOptimized(denops);
        assertEquals(countMatchingErrorCalls(errorSpy), 1);
      } finally {
        errorSpy.restore();
      }
    }

    await cleanupPlugin(denops);
    Core.resetForTesting();
  },
});
