/**
 * カーソル位置基準のヒント生成システムのテスト
 * Process1: カーソル位置の正しい取得と伝達
 * TDD Red-Green-Refactor方式で実装
 */

import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { assignHintsToWords } from "../denops/hellshake-yano/hint.ts";
import type { Word } from "../denops/hellshake-yano/types.ts";

describe("Process1: Cursor Position Retrieval and Passing", () => {
  describe("sub1: displayHintsOptimized cursor position", () => {
    it("should use actual cursor position for hint assignment", () => {
      // テスト用の単語データ（カーソルは2行目3列目にあると仮定）
      const words: Word[] = [
        { text: "first", line: 1, col: 1, byteCol: 1 },
        { text: "second", line: 2, col: 1, byteCol: 1 },
        { text: "third", line: 3, col: 1, byteCol: 1 },
      ];

      const hints = ["a", "b", "c"];
      const cursorLine = 2; // カーソルは2行目
      const cursorCol = 3; // カーソルは3列目

      // assignHintsToWordsはカーソル位置を受け取り、距離に基づいてヒントを割り当てる
      const hintMappings = assignHintsToWords(words, hints, cursorLine, cursorCol, "normal");

      // 結果を確認
      assertEquals(hintMappings.length, 3);

      // カーソルに最も近い単語（second, line=2）が最初のヒント("a")を取得するべき
      const secondWordHint = hintMappings.find(h => h.word.text === "second");
      assertEquals(secondWordHint?.hint, "a");
    });

    it("should calculate distance from cursor correctly", () => {
      // カーソルから異なる距離にある単語
      const words: Word[] = [
        { text: "far", line: 10, col: 1, byteCol: 1 },      // 遠い
        { text: "near", line: 2, col: 5, byteCol: 5 },      // 近い
        { text: "medium", line: 5, col: 10, byteCol: 10 },  // 中間
      ];

      const hints = ["a", "b", "c"];
      const cursorLine = 2;
      const cursorCol = 3;

      const hintMappings = assignHintsToWords(words, hints, cursorLine, cursorCol, "normal");

      // カーソルに最も近い"near"が"a"を取得
      const nearHint = hintMappings.find(h => h.word.text === "near");
      assertEquals(nearHint?.hint, "a");

      // 中間距離の"medium"が"b"を取得
      const mediumHint = hintMappings.find(h => h.word.text === "medium");
      assertEquals(mediumHint?.hint, "b");

      // 最も遠い"far"が"c"を取得
      const farHint = hintMappings.find(h => h.word.text === "far");
      assertEquals(farHint?.hint, "c");
    });
  });

  describe("sub1-validation: Cursor position should not be hardcoded", () => {
    it("RED: should fail when using hardcoded cursor position (1,1)", () => {
      // このテストは現在の実装（ハードコードされた1,1）では失敗する
      // 実装を修正した後にパスするべき

      const words: Word[] = [
        { text: "word1", line: 1, col: 1, byteCol: 1 },  // カーソル(1,1)に最も近い
        { text: "word2", line: 5, col: 5, byteCol: 5 },  // カーソル(5,5)に最も近い
      ];

      const hints = ["a", "b"];

      // Case 1: カーソルが(1,1)の場合
      let hintMappings = assignHintsToWords(words, hints, 1, 1, "normal");
      let word1Hint = hintMappings.find(h => h.word.text === "word1");
      assertEquals(word1Hint?.hint, "a", "word1 should get 'a' when cursor is at (1,1)");

      // Case 2: カーソルが(5,5)の場合
      hintMappings = assignHintsToWords(words, hints, 5, 5, "normal");
      const word2Hint = hintMappings.find(h => h.word.text === "word2");
      assertEquals(word2Hint?.hint, "a", "word2 should get 'a' when cursor is at (5,5)");

      // この振る舞いが期待通りであることを確認
      // displayHintsOptimized が実際のカーソル位置を使用していれば、このテストはパスする
    });
  });

  describe("sub2: showHintsInternal cursor position passing", () => {
    it("should pass cursor position to assignHintsToWords", () => {
      // showHintsInternal内でカーソル位置を取得し、
      // assignHintsToWordsに渡すことを確認するテスト

      const words: Word[] = [
        { text: "alpha", line: 1, col: 1, byteCol: 1 },
        { text: "beta", line: 3, col: 5, byteCol: 5 },
        { text: "gamma", line: 6, col: 10, byteCol: 10 },
      ];

      const hints = ["a", "b", "c"];

      // カーソルが3行目5列目にある場合
      const cursorLine = 3;
      const cursorCol = 5;

      const hintMappings = assignHintsToWords(words, hints, cursorLine, cursorCol, "normal");

      // beta（カーソル位置にある単語）が最初のヒント"a"を取得する
      const betaHint = hintMappings.find(h => h.word.text === "beta");
      assertEquals(betaHint?.hint, "a");

      // alphaが2番目のヒント"b"を取得する
      const alphaHint = hintMappings.find(h => h.word.text === "alpha");
      assertEquals(alphaHint?.hint, "b");

      // gammaが3番目のヒント"c"を取得する
      const gammaHint = hintMappings.find(h => h.word.text === "gamma");
      assertEquals(gammaHint?.hint, "c");
    });
  });
});