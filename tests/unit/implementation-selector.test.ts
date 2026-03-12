/**
 * tests/unit/implementation-selector.test.ts
 *
 * ImplementationSelector._editorType 依存解消の TDD テスト
 * getImplementationMatrix から _editorType パラメータを削除する
 */

import { assertEquals } from "jsr:@std/assert@1.0.9";
import { describe, it } from "jsr:@std/testing@1.0.7/bdd";
import type { Denops } from "jsr:@denops/std@7.4.0";
import {
  ImplementationSelector,
} from "../../denops/hellshake-yano/integration/implementation-selector.ts";

describe("ImplementationSelector.getImplementationMatrix (without _editorType)", () => {
  it("should work without editorType parameter", () => {
    const mockDenops = {} as Denops;
    const selector = new ImplementationSelector(mockDenops);

    // _editorType なしで呼び出せること
    assertEquals(
      selector.getImplementationMatrix(true, true, undefined),
      "denops-unified",
    );
    assertEquals(
      selector.getImplementationMatrix(true, true, "legacy"),
      "vimscript-pure",
    );
    assertEquals(
      selector.getImplementationMatrix(false, false, undefined),
      "vimscript-pure",
    );
  });
});
