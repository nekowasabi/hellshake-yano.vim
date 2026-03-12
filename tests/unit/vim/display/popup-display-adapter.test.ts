/**
 * tests/unit/vim/display/popup-display-adapter.test.ts
 *
 * PopupDisplayAdapter の TDD テスト (Red Phase → Green Phase)
 */

import { assertEquals } from "@std/assert";
import { MockDenops } from "../../../helpers/mock.ts";
import { PopupDisplayAdapter } from "../../../../denops/hellshake-yano/vim/display/popup-display.ts";
import type { HintItem } from "../../../../denops/hellshake-yano/common/interfaces/display-adapter.ts";

Deno.test("PopupDisplayAdapter: showHint() は popup_create を呼び出す", async () => {
  const denops = new MockDenops();
  const popupCalls: unknown[][] = [];
  denops.onCall("popup_create", (...args) => {
    popupCalls.push(args);
    return 1;
  });

  const adapter = new PopupDisplayAdapter(denops);
  const hint: HintItem = { hint: "a", line: 3, col: 5 };

  await adapter.showHint(hint);

  assertEquals(popupCalls.length, 1);
  // popup_create("a", { line: 3, col: 5, ... })
  assertEquals(popupCalls[0][0], "a");
});

Deno.test("PopupDisplayAdapter: hideAll() は全 popup を閉じる", async () => {
  const denops = new MockDenops();
  let popupId = 1;
  const closedIds: unknown[] = [];
  denops.onCall("popup_create", () => popupId++);
  denops.onCall("popup_close", (id) => {
    closedIds.push(id);
  });

  const adapter = new PopupDisplayAdapter(denops);
  await adapter.showHint({ hint: "a", line: 1, col: 1 });
  await adapter.showHint({ hint: "b", line: 2, col: 1 });
  await adapter.hideAll();

  assertEquals(closedIds.length, 2);
});

Deno.test("PopupDisplayAdapter: highlightPartialMatches() はマッチしない popup を閉じる", async () => {
  const denops = new MockDenops();
  let popupId = 10;
  const closedIds: unknown[] = [];
  denops.onCall("popup_create", () => popupId++);
  denops.onCall("popup_close", (id) => {
    closedIds.push(id);
  });

  const adapter = new PopupDisplayAdapter(denops);
  await adapter.showHint({ hint: "a", line: 1, col: 1 });
  await adapter.showHint({ hint: "ab", line: 2, col: 1 });
  await adapter.showHint({ hint: "b", line: 3, col: 1 });

  // "a", "ab" のみ維持 → "b" を閉じる
  await adapter.highlightPartialMatches(["a", "ab"]);

  assertEquals(closedIds.length, 1);
});

Deno.test("PopupDisplayAdapter: getHighlightGroup() はグループ名を返す", async () => {
  const denops = new MockDenops();
  const adapter = new PopupDisplayAdapter(denops);

  const group = await adapter.getHighlightGroup("marker");

  assertEquals(group, "HintMarker");
});
