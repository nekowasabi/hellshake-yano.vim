/**
 * tests/unit/common/interfaces/visual-handler.test.ts
 *
 * VisualHandler インターフェースの契約テスト (TDD Red Phase)
 */

import { assertEquals } from "@std/assert";
import type {
  VisualConfig,
  VisualHandler,
  VisualRange,
  VisualState,
} from "../../../../denops/hellshake-yano/common/interfaces/visual-handler.ts";

class StubVisualHandler implements VisualHandler {
  private config: VisualConfig | null = null;
  private state: VisualState = {
    isActive: false,
    startLine: 0,
    endLine: 0,
    startCol: 0,
    endCol: 0,
  };
  private shownRanges: VisualRange[] = [];

  async initialize(config: VisualConfig): Promise<void> {
    this.config = config;
    this.state = { ...this.state, isActive: true };
  }

  async getState(): Promise<VisualState> {
    return { ...this.state };
  }

  async showHints(range: VisualRange): Promise<void> {
    this.shownRanges.push(range);
    this.state = {
      isActive: true,
      startLine: range.startLine,
      endLine: range.endLine,
      startCol: range.startCol,
      endCol: range.endCol,
    };
  }

  getConfig(): VisualConfig | null {
    return this.config;
  }

  getShownRanges(): VisualRange[] {
    return this.shownRanges;
  }
}

Deno.test("VisualHandler: initialize() はビジュアルモードを設定する", async () => {
  const handler = new StubVisualHandler();
  const config: VisualConfig = { mode: "char" };

  await handler.initialize(config);
  const state = await handler.getState();

  assertEquals(state.isActive, true);
  assertEquals(handler.getConfig(), config);
});

Deno.test("VisualHandler: getState() は VisualState を返す", async () => {
  const handler = new StubVisualHandler();

  const state = await handler.getState();

  assertEquals(typeof state.isActive, "boolean");
  assertEquals(typeof state.startLine, "number");
  assertEquals(typeof state.endLine, "number");
});

Deno.test("VisualHandler: showHints() はビジュアル範囲内のヒントを表示する", async () => {
  const handler = new StubVisualHandler();
  const range: VisualRange = {
    startLine: 3,
    endLine: 7,
    startCol: 1,
    endCol: 20,
  };

  await handler.showHints(range);
  const state = await handler.getState();

  assertEquals(state.startLine, 3);
  assertEquals(state.endLine, 7);
  assertEquals(handler.getShownRanges().length, 1);
});
