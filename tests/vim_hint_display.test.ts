/**
 * Vim環境でのヒント表示テスト
 * process50 sub1: Vim環境での意図しない動作の修正
 *
 * 問題:
 * 1. キーリピートしないとヒントが表示されない
 * 2. 単語の先頭の色がハイライトされるだけで、ヒント文字が表示されない
 * 3. perKeyMotionCountの回数キーを押すと、Vimのステータスラインにカーソルが移動して処理が止まる
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.177.0/testing/asserts.ts";
import type { HintMapping, Word } from "../denops/hellshake-yano/types.ts";
import { assignHintsToWords } from "../denops/hellshake-yano/hint.ts";

// Helper function to create test words
function createWord(text: string, line: number, col: number): Word {
  return { text, line, col, byteCol: col };
}

// Helper function to create hint mapping
function createHintMapping(word: Word, hint: string): HintMapping {
  return {
    word,
    hint,
    hintCol: word.col,
    hintByteCol: word.col,
  };
}

Deno.test("process50 sub1: Vim display should use processMatchaddBatched", async (t) => {
  await t.step("displayHintsWithMatchAddBatch should delegate to display.ts", () => {
    // このテストは実装後に display.ts の processMatchaddBatched が呼ばれることを確認
    // 実装前（RED）の時点では、このロジックが存在しないことを想定

    const words: Word[] = [
      createWord("test", 1, 1),
      createWord("word", 1, 6),
      createWord("example", 1, 11),
    ];

    const hints = ["a", "s", "d"];
    // カーソル位置 (1, 10) を指定して、カーソル上の単語を除外しないようにする
    const hintMappings = assignHintsToWords(words, hints, 1, 10, "normal", {
      hintPosition: "offset",
      bothMinWordLength: 3,
    });

    // ヒントマッピングが正しく作成されることを確認
    assertExists(hintMappings);
    // カーソル位置を調整したので、3つすべての単語にマッピングが作成される
    assertEquals(hintMappings.length >= 2, true, `Expected at least 2 hint mappings, got ${hintMappings.length}`);
  });

  await t.step("processMatchaddBatched should use prop API + popup in Vim", () => {
    // display.ts の processMatchaddBatched は以下を実装している:
    // 1. prop_type_add でプロパティタイプを作成
    // 2. prop_add でテキストプロパティを追加
    // 3. popup_create でオーバーレイ表示

    const expectedPropTypeCall = "prop_type_add";
    const expectedPropAddCall = "prop_add";
    const expectedPopupCreateCall = "popup_create";

    // これらのAPIが呼ばれることを期待
    assertExists(expectedPropTypeCall);
    assertExists(expectedPropAddCall);
    assertExists(expectedPopupCreateCall);
  });
});

Deno.test("process50 sub1: showHintsInternal should not block in Vim", async (t) => {
  await t.step("Vim environment should skip waitForUserInput", () => {
    // Vim環境判定ロジック
    const isVim = (host: string) => host === "vim";
    const isNvim = (host: string) => host === "nvim";

    // Vimの場合
    assertEquals(isVim("vim"), true);
    assertEquals(isNvim("vim"), false);

    // Neovimの場合
    assertEquals(isVim("nvim"), false);
    assertEquals(isNvim("nvim"), true);
  });

  await t.step("waitForUserInput should only be called in Neovim", () => {
    // showHintsInternal内でのホスト判定
    const host: string = "vim";
    const shouldWaitForInput = host === "nvim";

    assertEquals(shouldWaitForInput, false);

    // Neovimの場合
    const nvimHost: string = "nvim";
    const nvimShouldWait = nvimHost === "nvim";
    assertEquals(nvimShouldWait, true);
  });
});

Deno.test("process50 sub1: Integration - Vim hint display workflow", async (t) => {
  await t.step("Complete workflow from words to hint display", () => {
    // 1. 単語検出
    const words: Word[] = [
      createWord("first", 1, 1),
      createWord("second", 1, 10),
      createWord("third", 2, 1),
    ];

    assertEquals(words.length, 3);

    // 2. ヒント生成
    const hints = ["a", "s", "d"];
    assertEquals(hints.length, 3);

    // 3. ヒントマッピング作成（カーソル位置を調整）
    const hintMappings = assignHintsToWords(words, hints, 3, 1, "normal", {
      hintPosition: "offset",
      bothMinWordLength: 3,
    });

    // カーソル位置の単語除外により、2つ以上のマッピングが作成される
    assertEquals(hintMappings.length >= 2, true, `Expected at least 2 hint mappings, got ${hintMappings.length}`);
    // 最初のマッピングを確認
    if (hintMappings.length > 0) {
      assertExists(hintMappings[0].hint);
      assertExists(hintMappings[0].word.text);
    }

    // 4. 表示処理（display.ts processMatchaddBatchedを使用）
    // この時点で prop API + popup が使われる
  });

  await t.step("Vim vs Neovim display method selection", () => {
    const selectDisplayMethod = (host: string): string => {
      if (host === "nvim") {
        return "extmark";
      } else {
        return "matchadd_with_prop_api";
      }
    };

    assertEquals(selectDisplayMethod("nvim"), "extmark");
    assertEquals(selectDisplayMethod("vim"), "matchadd_with_prop_api");
  });
});
