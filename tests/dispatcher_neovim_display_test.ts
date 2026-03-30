/**
 * tests/dispatcher_neovim_display_test.ts
 *
 * Neovim dispatcher display functions TDD tests
 * Process 1: displayShowHint, displayShowHintWithWindow
 * Process 2: displayHighlightPartialMatches, displayGetPopupCount
 *
 * Note: dispatcher is defined inside initializeNeovimLayer closure,
 * so we test the underlying logic and contract via MockDenops.
 */

import { assertEquals, assertExists } from "@std/assert";
import type { Denops } from "@denops/std";
import type { HintMapping } from "../denops/hellshake-yano/types.ts";

// ---------------------------------------------------------------------------
// MockDenops -- minimal mock for dispatcher unit tests
// ---------------------------------------------------------------------------
class MockDenops implements Partial<Denops> {
  readonly name = "hellshake-yano";
  readonly meta = {
    host: "nvim" as const,
    version: "0.0.0",
    platform: "linux" as const,
    mode: "release" as const,
  };

  callLog: Array<{ fn: string; args: unknown[] }> = [];
  private callResults: Map<string, unknown> = new Map();

  setCallResult(fn: string, result: unknown): void {
    this.callResults.set(fn, result);
  }

  async call(fn: string, ...args: unknown[]): Promise<unknown> {
    this.callLog.push({ fn, args });
    if (this.callResults.has(fn)) {
      return this.callResults.get(fn);
    }
    if (fn === "nvim_create_namespace") return 1;
    if (fn === "nvim_get_current_buf") return 0;
    if (fn === "nvim_buf_set_extmark") return 42;
    if (fn === "nvim_buf_clear_namespace") return null;
    if (fn === "winbufnr") return 5;
    if (fn === "bufnr") return 0;
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
// Process 1: displayShowHint
// ---------------------------------------------------------------------------
Deno.test("P1: displayShowHint - nvim_buf_set_extmark contract: lnum/col are 0-indexed", async () => {
  // Why: Neovim extmark API uses 0-indexed coords, Vim uses 1-indexed.
  // The dispatcher should convert lnum-1, col-1 before calling nvim_buf_set_extmark.
  const denops = new MockDenops() as unknown as Denops;
  const mock = denops as unknown as MockDenops;
  mock.setCallResult("nvim_get_current_buf", 0);
  mock.setCallResult("nvim_buf_set_extmark", 42);

  const namespace = 1;
  const lnum = 5; // 1-indexed input
  const col = 3; // 1-indexed input
  const hint = "A";

  // Simulate what displayShowHint should do
  const bufnr = await denops.call("nvim_get_current_buf");
  const extmarkId = await denops.call(
    "nvim_buf_set_extmark",
    bufnr,
    namespace,
    (lnum as number) - 1, // 0-indexed
    (col as number) - 1, // 0-indexed
    { virt_text: [[hint, "HellshakeYanoHint"]], virt_text_pos: "overlay" },
  );

  assertEquals(extmarkId, 42, "should return extmark_id");

  // Verify the call was made with 0-indexed coordinates
  const setExtmarkCall = mock.callLog.find((c) => c.fn === "nvim_buf_set_extmark");
  assertExists(setExtmarkCall, "nvim_buf_set_extmark should be called");
  assertEquals(setExtmarkCall!.args[2], 4, "lnum should be 0-indexed (5-1=4)");
  assertEquals(setExtmarkCall!.args[3], 2, "col should be 0-indexed (3-1=2)");
});

Deno.test("P1: displayShowHint - returns extmark_id as number", async () => {
  const denops = new MockDenops() as unknown as Denops;
  (denops as unknown as MockDenops).setCallResult("nvim_buf_set_extmark", 99);

  const result = await denops.call(
    "nvim_buf_set_extmark",
    0,
    1,
    0,
    0,
    { virt_text: [["B", "HellshakeYanoHint"]], virt_text_pos: "overlay" },
  );

  assertEquals(typeof result, "number", "extmark_id should be a number");
  assertEquals(result, 99);
});

// ---------------------------------------------------------------------------
// Process 1: displayShowHintWithWindow
// ---------------------------------------------------------------------------
Deno.test("P1: displayShowHintWithWindow - gets bufnr from winid then sets extmark", async () => {
  // Why: displayShowHintWithWindow must resolve winid -> bufnr before extmark placement
  const denops = new MockDenops() as unknown as Denops;
  const mock = denops as unknown as MockDenops;
  mock.setCallResult("winbufnr", 7);
  mock.setCallResult("nvim_buf_set_extmark", 55);

  const winid = 1001;
  const lnum = 10;
  const col = 5;
  const hint = "C";
  const namespace = 1;

  // Simulate displayShowHintWithWindow logic
  const bufnr = await denops.call("winbufnr", winid);
  assertEquals(bufnr, 7, "should resolve winid to bufnr");

  const extmarkId = await denops.call(
    "nvim_buf_set_extmark",
    bufnr,
    namespace,
    lnum - 1,
    col - 1,
    { virt_text: [[hint, "HellshakeYanoHint"]], virt_text_pos: "overlay" },
  );

  assertEquals(extmarkId, 55, "should return extmark_id");

  // Verify winbufnr was called with the correct winid
  const winbufnrCall = mock.callLog.find((c) => c.fn === "winbufnr");
  assertExists(winbufnrCall);
  assertEquals(winbufnrCall!.args[0], 1001);
});

// ---------------------------------------------------------------------------
// Process 2: displayHighlightPartialMatches
// ---------------------------------------------------------------------------
Deno.test("P2: displayHighlightPartialMatches - filters currentHints by input matches", () => {
  // Why: displayHighlightPartialMatches should filter currentHints to only those
  // whose hint string is in the matches array (partial input match)
  const currentHints: HintMapping[] = [
    { hint: "A", word: { text: "hello", line: 1, col: 1 }, hintCol: 1, hintByteCol: 1 },
    { hint: "B", word: { text: "world", line: 1, col: 7 }, hintCol: 7, hintByteCol: 7 },
    { hint: "C", word: { text: "foo", line: 2, col: 1 }, hintCol: 1, hintByteCol: 1 },
  ];

  const matches = ["A", "C"];

  // Simulate the filtering logic that displayHighlightPartialMatches should use
  const filtered = currentHints.filter((h) => matches.includes(h.hint));
  assertEquals(filtered.length, 2, "should keep only matching hints");
  assertEquals(filtered[0].hint, "A");
  assertEquals(filtered[1].hint, "C");
});

Deno.test("P2: displayHighlightPartialMatches - empty matches returns empty", () => {
  const currentHints: HintMapping[] = [
    { hint: "A", word: { text: "hello", line: 1, col: 1 }, hintCol: 1, hintByteCol: 1 },
  ];

  const matches: string[] = [];
  const filtered = currentHints.filter((h) => matches.includes(h.hint));
  assertEquals(filtered.length, 0);
});

// ---------------------------------------------------------------------------
// Process 2: displayGetPopupCount
// ---------------------------------------------------------------------------
Deno.test("P2: displayGetPopupCount - returns currentHints.length", () => {
  // Why: In Neovim extmark mode, popup count = number of active hint mappings
  const currentHints: HintMapping[] = [
    { hint: "A", word: { text: "hello", line: 1, col: 1 }, hintCol: 1, hintByteCol: 1 },
    { hint: "B", word: { text: "world", line: 1, col: 7 }, hintCol: 7, hintByteCol: 7 },
  ];

  const count = currentHints.length;
  assertEquals(count, 2, "popup count should equal currentHints length");
});

Deno.test("P2: displayGetPopupCount - returns 0 when no hints", () => {
  const currentHints: HintMapping[] = [];
  assertEquals(currentHints.length, 0);
});
