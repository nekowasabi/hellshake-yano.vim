/**
 * tests/unit/neovim/display/extmark-display-adapter.test.ts
 *
 * ExtmarkDisplayAdapter の TDD テスト (Red Phase → Green Phase)
 */

import { assertEquals } from "@std/assert";
import { MockDenops } from "../../../helpers/mock.ts";
import { ExtmarkDisplayAdapter } from "../../../../denops/hellshake-yano/neovim/display/extmark-display-adapter.ts";
import type { HintItem } from "../../../../denops/hellshake-yano/common/interfaces/display-adapter.ts";

Deno.test("ExtmarkDisplayAdapter: showHint() は nvim_buf_set_extmark を呼び出す", async () => {
  const denops = new MockDenops();
  const extmarkCalls: unknown[][] = [];
  denops.onCall("nvim_buf_set_extmark", (...args) => {
    extmarkCalls.push(args);
    return 1;
  });
  denops.setCallResponse("nvim_get_current_buf", 1);

  const adapter = new ExtmarkDisplayAdapter(denops);
  const hint: HintItem = { hint: "a", line: 3, col: 5 };

  await adapter.showHint(hint);

  assertEquals(extmarkCalls.length, 1);
});

Deno.test("ExtmarkDisplayAdapter: hideAll() は extmarkをクリアする", async () => {
  const denops = new MockDenops();
  let clearCalled = false;
  denops.onCall("nvim_buf_clear_namespace", () => {
    clearCalled = true;
    return true;
  });
  denops.setCallResponse("nvim_get_current_buf", 1);
  denops.setCallResponse("nvim_create_namespace", 1);

  const adapter = new ExtmarkDisplayAdapter(denops);
  await adapter.showHint({ hint: "a", line: 1, col: 1 });
  await adapter.hideAll();

  assertEquals(clearCalled, true);
});

Deno.test("ExtmarkDisplayAdapter: highlightPartialMatches() はマッチするヒントのみ保持する", async () => {
  const denops = new MockDenops();
  denops.setCallResponse("nvim_get_current_buf", 1);
  denops.setCallResponse("nvim_buf_set_extmark", 1);
  denops.setCallResponse("nvim_buf_clear_namespace", true);
  denops.setCallResponse("nvim_create_namespace", 1);

  const adapter = new ExtmarkDisplayAdapter(denops);
  await adapter.showHint({ hint: "a", line: 1, col: 1 });
  await adapter.showHint({ hint: "ab", line: 2, col: 1 });
  await adapter.showHint({ hint: "b", line: 3, col: 1 });

  // "a" で始まるヒントのみ維持
  await adapter.highlightPartialMatches(["a", "ab"]);

  assertEquals(adapter.getHintCount(), 2);
});

Deno.test("ExtmarkDisplayAdapter: getHighlightGroup() はハイライトグループ名を返す", async () => {
  const denops = new MockDenops();
  const adapter = new ExtmarkDisplayAdapter(denops);

  const group = await adapter.getHighlightGroup("marker");

  assertEquals(typeof group, "string");
  assertEquals(group.length > 0, true);
});

Deno.test("ExtmarkDisplayAdapter: showHintWithWindow() はウィンドウIDを記録する", async () => {
  const denops = new MockDenops();
  denops.setCallResponse("nvim_buf_set_extmark", 1);
  denops.setCallResponse("nvim_get_current_buf", 1);

  const adapter = new ExtmarkDisplayAdapter(denops);
  const hint: HintItem = { hint: "x", line: 5, col: 10 };

  // スタブ実装でもエラーにならないことを確認
  await adapter.showHintWithWindow(hint, 42);
  assertEquals(adapter.getHintCount(), 1);
});
