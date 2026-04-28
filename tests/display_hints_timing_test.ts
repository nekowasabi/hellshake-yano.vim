/**
 * tests/display_hints_timing_test.ts
 *
 * Process 20: displayHintsWithExtmarksBatch timing 記録テスト
 *
 * Why: extmark 描画劣化の実測のため、debugMode 有効時に
 *      displayHintsWithExtmarksBatch の所要時間 / バッチ数 / マーク数を
 *      DEBUG ログで出力する。debugMode 無効時はオーバーヘッドゼロを
 *      保証 (early evaluate) するため、ログが出ないことも検証する。
 */

import { assertStringIncludes } from "@std/assert";
import { spy } from "@std/testing/mock";
import { MockDenops } from "./helpers/mock.ts";
import { Core } from "../denops/hellshake-yano/neovim/core/core.ts";
import { setDebugMode } from "../denops/hellshake-yano/common/utils/logger.ts";
import type { HintMapping } from "../denops/hellshake-yano/types.ts";

function buildHints(count: number): HintMapping[] {
  const hints: HintMapping[] = [];
  for (let i = 0; i < count; i++) {
    hints.push({
      hint: `H${i}`,
      hintCol: 1,
      hintByteCol: 1,
      word: {
        text: `w${i}`,
        line: (i % 5) + 1,
        col: 1,
        byteCol: 1,
      },
    } as HintMapping);
  }
  return hints;
}

function buildBufferDenops(lineCount: number): MockDenops {
  const denops = new MockDenops();
  denops.onCall("nvim_create_namespace", () => 7);
  denops.onCall("bufnr", () => 1);
  denops.onCall("bufexists", () => 1);
  denops.onCall("line", (arg: unknown) => (arg === "$" ? lineCount : 1));
  // batch() は batch.ts → callAtomic 経由で呼ばれる。空配列を返すと
  // displayHintsWithExtmarksBatch が動作する想定で十分（line content も
  // nvim_buf_get_lines 経由で 1 RPC 化されているため、空応答でも flow を満たす）
  return denops;
}

function findDebugLog(
  consoleSpy: ReturnType<typeof spy<typeof console, "log">>,
  marker: string,
): string | undefined {
  for (const call of consoleSpy.calls) {
    const msg = String(call.args[0] ?? "");
    if (
      msg.includes("[DEBUG]") &&
      msg.includes("[hellshake-yano:perf]") &&
      msg.includes(marker)
    ) {
      return msg;
    }
  }
  return undefined;
}

Deno.test({
  name: "[REGRESSION] displayHintsWithExtmarksBatch logs timing when debugMode is true",
  async fn() {
    Core.resetForTesting();
    setDebugMode(true);
    const core = Core.getInstance({ enabled: true });
    const denops = buildBufferDenops(10);
    const hints = buildHints(5);

    const logSpy = spy(console, "log");
    try {
      await core.displayHintsWithExtmarksBatch(denops, 1, hints, "normal");

      const found = findDebugLog(logSpy, "displayHintsWithExtmarksBatch");
      if (!found) {
        throw new Error(
          `Expected DEBUG log containing 'displayHintsWithExtmarksBatch'. Logs: ${
            JSON.stringify(logSpy.calls.map((c) => c.args[0]))
          }`,
        );
      }
      assertStringIncludes(found, "ms");
      assertStringIncludes(found, "batches=");
      assertStringIncludes(found, "marks=");
    } finally {
      logSpy.restore();
      setDebugMode(false);
      Core.resetForTesting();
    }
  },
});

Deno.test({
  name: "[REGRESSION] displayHintsWithExtmarksBatch does not log when debugMode is false",
  async fn() {
    Core.resetForTesting();
    setDebugMode(false);
    const core = Core.getInstance({ enabled: true });
    const denops = buildBufferDenops(10);
    const hints = buildHints(5);

    const logSpy = spy(console, "log");
    try {
      await core.displayHintsWithExtmarksBatch(denops, 1, hints, "normal");

      const found = findDebugLog(logSpy, "displayHintsWithExtmarksBatch");
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
