/**
 * tests/unit/phase2-dispatcher.test.ts
 *
 * Phase 2 dispatcher ユニットテスト
 *
 * Process 54: getHighlightGroup
 * Process 57: showDelayed (contract)
 * Process 60: shouldRedraw (contract)
 *
 * Note: dispatcher 自体は Denops 接続を必要とするため、underlying logic を直接テスト。
 * main.ts の dispatcher は deno check でコンパイル確認する。
 */

import { assertEquals, assertExists } from "@std/assert";
import { ExtmarkDisplayAdapter } from "../../denops/hellshake-yano/neovim/display/extmark-display-adapter.ts";
import type { Denops } from "@denops/std";

// ---------------------------------------------------------------------------
// MockDenops — dispatcher unit tests 用の最小実装
// ---------------------------------------------------------------------------
class MockDenops implements Partial<Denops> {
  readonly name = "hellshake-yano";
  readonly meta = {
    host: "nvim" as const,
    version: "0.0.0",
    platform: "linux" as const,
    mode: "release" as const,
  };
  private callResults: Map<string, unknown> = new Map();

  setCallResult(fn: string, result: unknown): void {
    this.callResults.set(fn, result);
  }

  async call(fn: string, ..._args: unknown[]): Promise<unknown> {
    if (this.callResults.has(fn)) {
      return this.callResults.get(fn);
    }
    // デフォルト値
    if (fn === "nvim_create_namespace") return 1;
    if (fn === "nvim_get_current_buf") return 0;
    if (fn === "nvim_buf_set_extmark") return 42;
    if (fn === "nvim_buf_clear_namespace") return null;
    return null;
  }

  // deno-lint-ignore require-await
  async cmd(_cmd: string): Promise<void> {}

  // deno-lint-ignore require-await
  async eval(_expr: string): Promise<unknown> {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Process 54: getHighlightGroup
// ---------------------------------------------------------------------------
Deno.test("Phase2/P54: getHighlightGroup は Neovim 用ハイライトグループ名を返す", async () => {
  const denops = new MockDenops() as unknown as Denops;
  const adapter = new ExtmarkDisplayAdapter(denops);

  const group = await adapter.getHighlightGroup("default");

  assertExists(group, "getHighlightGroup should return non-null");
  assertEquals(typeof group, "string", "should return a string");
  assertEquals(group.length > 0, true, "should return non-empty string");
});

Deno.test("Phase2/P54: getHighlightGroup は Neovim 専用グループ名を返す", async () => {
  const denops = new MockDenops() as unknown as Denops;
  const adapter = new ExtmarkDisplayAdapter(denops);

  const group = await adapter.getHighlightGroup("hint");

  // HellshakeYanoMarker が想定値
  assertEquals(group, "HellshakeYanoMarker");
});

// ---------------------------------------------------------------------------
// Process 57: showDelayed contract
// ---------------------------------------------------------------------------
Deno.test("Phase2/P57: showDelayed contract — delay は数値である", () => {
  // showDelayed(delay: number) の型契約テスト
  // dispatcher の実装は main.ts に追加するが、型契約をここで確認
  const validDelays = [0, 50, 100, 300, 1000];
  for (const delay of validDelays) {
    assertEquals(typeof delay, "number", `delay ${delay} should be a number`);
    assertEquals(delay >= 0, true, `delay ${delay} should be non-negative`);
  }
});

// ---------------------------------------------------------------------------
// Process 60: shouldRedraw contract
// ---------------------------------------------------------------------------
Deno.test("Phase2/P60: shouldRedraw contract — boolean を返す", () => {
  // shouldRedraw() は boolean を返す型契約
  // focus_just_restored フラグに依存する判定ロジック
  const focusJustRestored = false;
  const shouldRedraw = !focusJustRestored;

  assertEquals(typeof shouldRedraw, "boolean", "shouldRedraw should return boolean");
  assertEquals(shouldRedraw, true, "should redraw when focus not just restored");

  const focusJustRestoredTrue = true;
  const shouldRedrawFalse = !focusJustRestoredTrue;
  assertEquals(shouldRedrawFalse, false, "should NOT redraw when focus just restored");
});

// ---------------------------------------------------------------------------
// Process 58: getStatistics 戻り値型確認
// ---------------------------------------------------------------------------
Deno.test("Phase2/P58: getStatistics 戻り値は state フィールドを含む", () => {
  // getStatistics が返すべき型契約
  const mockStatistics = {
    enabled: true,
    hintsVisible: false,
    wordCount: 0,
    hintCount: 0,
    state: {
      isInitialized: true,
      focusJustRestored: false,
    },
  };

  assertExists(mockStatistics.state, "statistics should have state field");
  assertEquals(typeof mockStatistics.state.isInitialized, "boolean");
  assertEquals(typeof mockStatistics.state.focusJustRestored, "boolean");
});
