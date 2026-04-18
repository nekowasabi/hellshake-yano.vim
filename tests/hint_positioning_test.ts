/**
 * Process 50 Sub3: ヒント表示位置の改善（Phase 2）
 * マークは単語の先頭に表示するテスト
 */

import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import {
  calculateHintPosition,
  type HintPosition,
} from "../denops/hellshake-yano/neovim/core/hint.ts";
import type { Word } from "../denops/hellshake-yano/types.ts";

describe("Hint Positioning - Word Start Display", () => {
  describe("Basic word start positioning", () => {
    it("should position hint at word start", () => {
      const word: Word = { text: "hello", line: 1, col: 5 };
      const position = calculateHintPosition(word, "start");

      assertEquals(position.line, 1);
      assertEquals(position.col, 5); // 単語の開始位置
      assertEquals(position.display_mode, "before");
    });

    it("should position hint before word for start mode", () => {
      const word: Word = { text: "world", line: 2, col: 10 };
      const position = calculateHintPosition(word, "start");

      assertEquals(position.line, 2);
      assertEquals(position.col, 10);
      assertEquals(position.display_mode, "before");
    });

    it("should handle single character words", () => {
      const word: Word = { text: "a", line: 3, col: 1 };
      const position = calculateHintPosition(word, "start");

      assertEquals(position.line, 3);
      assertEquals(position.col, 1);
      assertEquals(position.display_mode, "before");
    });
  });

  describe("Line start edge cases", () => {
    it("should handle words at line beginning", () => {
      const word: Word = { text: "beginning", line: 1, col: 1 };
      const position = calculateHintPosition(word, "start");

      assertEquals(position.line, 1);
      assertEquals(position.col, 1);
      assertEquals(position.display_mode, "before");
    });

    it("should handle indented lines correctly", () => {
      const word: Word = { text: "indented", line: 5, col: 5 }; // 4つのスペース後
      const position = calculateHintPosition(word, "start");

      assertEquals(position.line, 5);
      assertEquals(position.col, 5);
      assertEquals(position.display_mode, "before");
    });

    it("should handle deeply indented words", () => {
      const word: Word = { text: "deep", line: 10, col: 20 }; // 深いインデント
      const position = calculateHintPosition(word, "start");

      assertEquals(position.line, 10);
      assertEquals(position.col, 20);
      assertEquals(position.display_mode, "before");
    });
  });

  describe("Display mode variations", () => {
    it("should support overlay mode", () => {
      const word: Word = { text: "end", line: 1, col: 10 };
      const position = calculateHintPosition(word, "overlay");

      assertEquals(position.line, 1);
      assertEquals(position.col, 10);
      assertEquals(position.display_mode, "overlay");
    });

    it("should support end positioning", () => {
      const word: Word = { text: "test", line: 2, col: 5 };
      const position = calculateHintPosition(word, "end");

      assertEquals(position.line, 2);
      assertEquals(position.col, 8); // 5 + 4 - 1 = 8 (単語の終端)
      assertEquals(position.display_mode, "after");
    });
  });

  describe("Multi-line content", () => {
    it("should handle words on different lines", () => {
      const words: Word[] = [
        { text: "first", line: 1, col: 1 },
        { text: "second", line: 2, col: 5 },
        { text: "third", line: 3, col: 10 },
      ];

      const positions = words.map((word) => calculateHintPosition(word, "start"));

      assertEquals(positions[0].line, 1);
      assertEquals(positions[0].col, 1);
      assertEquals(positions[1].line, 2);
      assertEquals(positions[1].col, 5);
      assertEquals(positions[2].line, 3);
      assertEquals(positions[2].col, 10);
    });

    it("should preserve line separation", () => {
      const word1: Word = { text: "line1", line: 100, col: 50 };
      const word2: Word = { text: "line2", line: 101, col: 1 };

      const pos1 = calculateHintPosition(word1, "start");
      const pos2 = calculateHintPosition(word2, "start");

      assertEquals(pos1.line, 100);
      assertEquals(pos2.line, 101);
      assertEquals(pos2.col, 1); // 次の行の開始
    });
  });

  describe("Position calculation edge cases", () => {
    it("should handle zero-width scenarios gracefully", () => {
      const word: Word = { text: "", line: 1, col: 1 };
      const position = calculateHintPosition(word, "start");

      assertEquals(position.line, 1);
      assertEquals(position.col, 1);
      assertEquals(position.display_mode, "before");
    });

    it("should handle long words", () => {
      const longWord: Word = {
        text: "verylongwordthatspansmultiplescreencolumns",
        line: 1,
        col: 1,
      };
      const position = calculateHintPosition(longWord, "start");

      assertEquals(position.line, 1);
      assertEquals(position.col, 1);
      assertEquals(position.display_mode, "before");
    });

    it("should handle maximum line numbers", () => {
      const word: Word = { text: "maxline", line: 999999, col: 1 };
      const position = calculateHintPosition(word, "start");

      assertEquals(position.line, 999999);
      assertEquals(position.col, 1);
    });
  });

  describe("Configuration compatibility", () => {
    it("should maintain backward compatibility with existing hintPosition settings", () => {
      const word: Word = { text: "compat", line: 1, col: 5 };

      // 既存の設定値での動作確認
      const startPos = calculateHintPosition(word, "start");
      const endPos = calculateHintPosition(word, "end");
      const overlayPos = calculateHintPosition(word, "end");

      assertEquals(startPos.display_mode, "before");
      assertEquals(endPos.display_mode, "after");
      assertEquals(overlayPos.display_mode, "after");
    });

    it("should handle invalid hintPosition gracefully", () => {
      const word: Word = { text: "invalid", line: 1, col: 1 };
      const position = calculateHintPosition(word, "invalid_mode" as any);

      // デフォルトで "start" 動作になること
      assertEquals(position.line, 1);
      assertEquals(position.col, 1);
      assertEquals(position.display_mode, "before");
    });
  });
});
