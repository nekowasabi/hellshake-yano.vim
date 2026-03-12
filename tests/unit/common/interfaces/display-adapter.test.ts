/**
 * tests/unit/common/interfaces/display-adapter.test.ts
 *
 * DisplayAdapter インターフェースの契約テスト (TDD Red Phase)
 *
 * インターフェースが正しいシグネチャを持つことをコンパイル時に保証する。
 */

import { assertEquals } from "@std/assert";
import type {
  DisplayAdapter,
  HintItem,
} from "../../../../denops/hellshake-yano/common/interfaces/display-adapter.ts";

/**
 * テスト用の DisplayAdapter スタブ実装
 *
 * インターフェースの全メソッドを実装することでコンパイル時に契約を検証する。
 */
class StubDisplayAdapter implements DisplayAdapter {
  private shownHints: HintItem[] = [];
  private hidden = false;
  private partialKeys: string[] = [];

  async showHint(hint: HintItem): Promise<void> {
    this.shownHints.push(hint);
  }

  async showHintWithWindow(hint: HintItem, _windowId: number): Promise<void> {
    this.shownHints.push(hint);
  }

  async hideAll(): Promise<void> {
    this.hidden = true;
    this.shownHints = [];
  }

  async highlightPartialMatches(keys: string[]): Promise<void> {
    this.partialKeys = keys;
  }

  async getHighlightGroup(_type: string): Promise<string> {
    return "HellshakeYanoMarker";
  }

  getShownHints(): HintItem[] {
    return this.shownHints;
  }

  isHidden(): boolean {
    return this.hidden;
  }

  getPartialKeys(): string[] {
    return this.partialKeys;
  }
}

Deno.test("DisplayAdapter: showHint() はヒントを保存する", async () => {
  const adapter = new StubDisplayAdapter();
  const hint: HintItem = { hint: "a", line: 1, col: 5 };

  await adapter.showHint(hint);

  assertEquals(adapter.getShownHints().length, 1);
  assertEquals(adapter.getShownHints()[0], hint);
});

Deno.test("DisplayAdapter: showHintWithWindow() はウィンドウIDと共にヒントを保存する", async () => {
  const adapter = new StubDisplayAdapter();
  const hint: HintItem = { hint: "ab", line: 3, col: 10 };

  await adapter.showHintWithWindow(hint, 42);

  assertEquals(adapter.getShownHints().length, 1);
  assertEquals(adapter.getShownHints()[0].hint, "ab");
});

Deno.test("DisplayAdapter: hideAll() は全ヒントを消去する", async () => {
  const adapter = new StubDisplayAdapter();
  await adapter.showHint({ hint: "a", line: 1, col: 1 });
  await adapter.showHint({ hint: "b", line: 2, col: 1 });

  await adapter.hideAll();

  assertEquals(adapter.getShownHints().length, 0);
  assertEquals(adapter.isHidden(), true);
});

Deno.test("DisplayAdapter: highlightPartialMatches() はキー一覧を記録する", async () => {
  const adapter = new StubDisplayAdapter();

  await adapter.highlightPartialMatches(["a", "ab", "ac"]);

  assertEquals(adapter.getPartialKeys(), ["a", "ab", "ac"]);
});

Deno.test("DisplayAdapter: getHighlightGroup() はハイライトグループ名を返す", async () => {
  const adapter = new StubDisplayAdapter();

  const group = await adapter.getHighlightGroup("marker");

  assertEquals(typeof group, "string");
  assertEquals(group.length > 0, true);
});
