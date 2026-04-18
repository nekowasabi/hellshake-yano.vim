/**
 * Hint Utility Functions Tests
 *
 * Test suite to expose the +1 bug in convertToDisplayColumn
 * Fix double conversion issue in convertToDisplayColumn
 */

import { assertEquals, assertThrows } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import {
  areWordsAdjacent,
  calculateHintPosition,
  calculateWordGap,
  convertToDisplayColumn,
  getWordDisplayEndCol,
  getWordDisplayStartCol,
  isPositionWithinWord,
} from "../denops/hellshake-yano/neovim/core/hint.ts";
import { getByteLength } from "../denops/hellshake-yano/neovim/core/word.ts";
import type { Word } from "../denops/hellshake-yano/types.ts";

Deno.test("convertToDisplayColumn function", async (t) => {
  // ===== Tests that expose the +1 bug =====

  await t.step("should return 1 for line start (charIndex=0)", () => {
    // Word.col is 1-based, so position 0 should map to display column 1
    assertEquals(convertToDisplayColumn("hello", 0), 1);
  });

  await t.step("should NOT add extra +1 for ASCII text", () => {
    // "hello" at charIndex=5 should return 5 (not 6)
    // Current implementation returns 6 due to the bug
    const line = "hello";
    const result = convertToDisplayColumn(line, 5);
    assertEquals(result, 5, "Expected 5 but got 6 due to +1 bug");
  });

  await t.step("should NOT add extra +1 for single character", () => {
    // "h" at charIndex=1 should return 1 (not 2)
    const line = "h";
    const result = convertToDisplayColumn(line, 1);
    assertEquals(result, 1, "Expected 1 but got 2 due to +1 bug");
  });

  await t.step("should handle tabs correctly without extra +1", () => {
    // "\thello" at charIndex=1 (after tab) should return tabWidth (8), not tabWidth+1 (9)
    const line = "\thello";
    const result = convertToDisplayColumn(line, 1, 8);
    assertEquals(result, 8, "Expected 8 but got 9 due to +1 bug");
  });

  await t.step("should handle Japanese characters without extra +1", () => {
    // "あ" (2-width char) at charIndex=1 should return 2, not 3
    const line = "あ";
    const result = convertToDisplayColumn(line, 1);
    assertEquals(result, 2, "Expected 2 but got 3 due to +1 bug");
  });

  await t.step("should handle mixed content without extra +1", () => {
    // "h\tあ" at charIndex=2 (after tab and before Japanese char) should return 9
    // "h"(1) + "\t"(8) = 9 display columns
    const line = "h\tあ";
    const result = convertToDisplayColumn(line, 2, 8);
    assertEquals(result, 9, "Expected 9 for h + tab width");
  });

  await t.step("should handle negative charIndex edge case", () => {
    // Negative charIndex should return 1
    assertEquals(convertToDisplayColumn("hello", -1), 1);
  });

  await t.step("should handle empty line", () => {
    // Empty line with charIndex=0 should return 1
    assertEquals(convertToDisplayColumn("", 0), 1);
  });

  // ===== Integration tests with Word objects =====

  await t.step("should work correctly with Word.col (1-based)", () => {
    // Word.col is 1-based as per types.ts comment
    // If we have a word at col=1, convertToDisplayColumn should return 1 for charIndex=0
    const word: Word = { text: "hello", line: 1, col: 1 };
    const displayCol = convertToDisplayColumn("hello", 0);
    assertEquals(displayCol, word.col, "convertToDisplayColumn should match Word.col semantics");
  });
});

Deno.test("getWordDisplayEndCol function", async (t) => {
  await t.step("should calculate end column correctly for ASCII", () => {
    const word: Word = { text: "hello", line: 1, col: 1 };
    const endCol = getWordDisplayEndCol(word);
    assertEquals(endCol, 5); // start=1, width=5, end=1+5-1=5
  });

  await t.step("should calculate end column correctly for Japanese", () => {
    const word: Word = { text: "あい", line: 1, col: 1 };
    const endCol = getWordDisplayEndCol(word);
    assertEquals(endCol, 4); // start=1, width=4, end=1+4-1=4
  });

  await t.step("should calculate end column correctly with tabs", () => {
    const word: Word = { text: "hello", line: 1, col: 9 }; // after a tab
    const endCol = getWordDisplayEndCol(word);
    assertEquals(endCol, 13); // start=9, width=5, end=9+5-1=13
  });
});

Deno.test("areWordsAdjacent function", async (t) => {
  await t.step("should detect adjacent words correctly", () => {
    const word1: Word = { text: "hello", line: 1, col: 1 };
    const word2: Word = { text: "world", line: 1, col: 6 };
    assertEquals(areWordsAdjacent(word1, word2), true);
  });

  await t.step("should detect non-adjacent words", () => {
    const word1: Word = { text: "hello", line: 1, col: 1 };
    const word2: Word = { text: "world", line: 1, col: 8 }; // gap of 1
    assertEquals(areWordsAdjacent(word1, word2), false);
  });

  await t.step("should handle different lines", () => {
    const word1: Word = { text: "hello", line: 1, col: 1 };
    const word2: Word = { text: "world", line: 2, col: 1 };
    assertEquals(areWordsAdjacent(word1, word2), false);
  });
});

Deno.test("calculateHintPosition function", async (t) => {
  const word: Word = { text: "hello", line: 1, col: 5 };

  await t.step("should return start position correctly", () => {
    assertEquals(calculateHintPosition(word, "start").col, 5);
  });

  await t.step("should return end position correctly", () => {
    assertEquals(calculateHintPosition(word, "end").col, 9); // 5+5-1=9
  });

  await t.step("should return overlay position correctly", () => {
    assertEquals(calculateHintPosition(word, "overlay").col, 5);
  });
});

Deno.test("isPositionWithinWord function", async (t) => {
  const word: Word = { text: "hello", line: 1, col: 5 }; // cols 5-9

  await t.step("should detect position within word", () => {
    assertEquals(isPositionWithinWord(7, word), true);
  });

  await t.step("should detect position before word", () => {
    assertEquals(isPositionWithinWord(4, word), false);
  });

  await t.step("should detect position after word", () => {
    assertEquals(isPositionWithinWord(10, word), false);
  });

  await t.step("should include start and end positions", () => {
    assertEquals(isPositionWithinWord(5, word), true); // start
    assertEquals(isPositionWithinWord(9, word), true); // end
  });
});

Deno.test("calculateWordGap function", async (t) => {
  await t.step("should calculate gap between words correctly", () => {
    const word1: Word = { text: "hello", line: 1, col: 1 }; // cols 1-5
    const word2: Word = { text: "world", line: 1, col: 7 }; // cols 7-11
    assertEquals(calculateWordGap(word1, word2), 1); // gap of 1 (col 6)
  });

  await t.step("should detect touching words", () => {
    const word1: Word = { text: "hello", line: 1, col: 1 }; // cols 1-5
    const word2: Word = { text: "world", line: 1, col: 6 }; // cols 6-10
    assertEquals(calculateWordGap(word1, word2), 0); // touching
  });

  await t.step("should detect overlapping words", () => {
    const word1: Word = { text: "hello", line: 1, col: 1 }; // cols 1-5
    const word2: Word = { text: "world", line: 1, col: 5 }; // cols 5-9 (overlap at 5)
    assertEquals(calculateWordGap(word1, word2), -1); // overlapping
  });

  await t.step("should handle different lines", () => {
    const word1: Word = { text: "hello", line: 1, col: 1 };
    const word2: Word = { text: "world", line: 2, col: 1 };
    assertEquals(calculateWordGap(word1, word2), Infinity);
  });
});

Deno.test("getByteLength function", async (t) => {
  await t.step("should calculate byte length for ASCII", () => {
    assertEquals(getByteLength("hello"), 5);
  });

  await t.step("should calculate byte length for Japanese", () => {
    assertEquals(getByteLength("あ"), 3); // UTF-8: 3 bytes for ひらがな
  });

  await t.step("should calculate byte length for emoji", () => {
    assertEquals(getByteLength("😀"), 4); // UTF-8: 4 bytes for emoji
  });

  await t.step("should handle empty string", () => {
    assertEquals(getByteLength(""), 0);
  });
});
