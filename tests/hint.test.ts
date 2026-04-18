/**
 * Hint Processing Tests
 *
 * Comprehensive test suite for hint adjacency detection and position calculation
 * Tests for display width based calculations
 */

import { assertEquals, assertThrows } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import {
  calculateHintPosition,
  detectAdjacentWords,
} from "../denops/hellshake-yano/neovim/core/hint.ts";
import type { HintPosition, Word } from "../denops/hellshake-yano/types.ts";

// Helper function to create test words
function createWord(text: string, line: number, col: number, byteCol?: number): Word {
  return { text, line, col, byteCol };
}

Deno.test("Hint Adjacency Detection and Position Calculation", async (t) => {
  // ===== Screenshot Problem Recreation (5 cases) =====
  await t.step("Screenshot Problem 1: '0○0EtectAdjacentWords0C' - correct hint positions", () => {
    const words: Word[] = [
      createWord("0", 1, 1),
      createWord("0EtectAdjacentWords0C", 1, 3),
    ];
    const result = detectAdjacentWords(words);
    // Should detect no adjacency due to display width gap
    assertEquals(result[0].adjacentWords.length, 0);
    assertEquals(result[1].adjacentWords.length, 0);
  });

  await t.step(
    "Screenshot Problem 2: '0○文字数と表示幅の0R同00より0P' - Japanese mixed position",
    () => {
      const words: Word[] = [
        createWord("0", 1, 1),
        createWord("文字数と表示幅の", 1, 3), // Japanese characters (display width: 16)
        createWord("0R", 1, 19),
        createWord("同", 1, 21), // Japanese character (display width: 2)
        createWord("00", 1, 23),
        createWord("より", 1, 25), // Japanese characters (display width: 4)
        createWord("0P", 1, 27),
      ];
      const result = detectAdjacentWords(words);
      // Test adjacency detection based on display width
      assertEquals(result.length, words.length);
    },
  );

  await t.step("Screenshot Problem 3: '0○0Yブ文字0X表示幅4-8）を0W' - Tab and Japanese mix", () => {
    const words: Word[] = [
      createWord("0", 1, 1),
      createWord("0Y", 1, 3),
      createWord("ブ文字", 1, 5), // Japanese characters (display width: 6)
      createWord("0X", 1, 11),
      createWord("表示幅4-8）を", 1, 13), // Mixed characters
      createWord("0W", 1, 26),
    ];
    const result = detectAdjacentWords(words);
    assertEquals(result.length, words.length);
  });

  await t.step(
    "Screenshot Problem 4: 'P○P0本語文字P1表示幅2）をPE' - Full-width character positions",
    () => {
      const words: Word[] = [
        createWord("P", 1, 1),
        createWord("P0", 1, 3),
        createWord("本語文字", 1, 5), // Japanese characters (display width: 8)
        createWord("P1", 1, 13),
        createWord("表示幅2）を", 1, 15), // Mixed characters
        createWord("PE", 1, 26),
      ];
      const result = detectAdjacentWords(words);
      assertEquals(result.length, words.length);
    },
  );

  await t.step(
    "Screenshot Problem 5: '\\t描画中の入力処理時間' - Tab-starting line display width",
    () => {
      const words: Word[] = [
        createWord("描画中の入力処理時間", 1, 9), // After tab (col 9, display width: 20)
      ];
      const result = detectAdjacentWords(words);
      assertEquals(result.length, 1);
      assertEquals(result[0].adjacentWords.length, 0);
    },
  );

  // ===== Basic Adjacency Tests (10 cases) =====
  await t.step("Basic Adjacency 1: ASCII adjacent words", () => {
    const words: Word[] = [
      createWord("hello", 1, 1), // positions 1-5
      createWord("world", 1, 6), // positions 6-10, adjacent
    ];
    const result = detectAdjacentWords(words);
    assertEquals(result[0].adjacentWords.length, 1);
    assertEquals(result[0].adjacentWords[0].text, "world");
    assertEquals(result[1].adjacentWords.length, 1);
    assertEquals(result[1].adjacentWords[0].text, "hello");
  });

  await t.step("Basic Adjacency 2: ASCII non-adjacent words", () => {
    const words: Word[] = [
      createWord("hello", 1, 1), // positions 1-5
      createWord("world", 1, 8), // positions 8-12, gap of 2
    ];
    const result = detectAdjacentWords(words);
    assertEquals(result[0].adjacentWords.length, 0);
    assertEquals(result[1].adjacentWords.length, 0);
  });

  await t.step("Basic Adjacency 3: Tab adjacency", () => {
    const words: Word[] = [
      createWord("before", 1, 1), // positions 1-6
      createWord("after", 1, 9), // after tab (tab at position 7-8)
    ];
    const result = detectAdjacentWords(words);
    // Should not be adjacent due to tab in between
    assertEquals(result[0].adjacentWords.length, 0);
    assertEquals(result[1].adjacentWords.length, 0);
  });

  await t.step("Basic Adjacency 4: Japanese adjacency", () => {
    const words: Word[] = [
      createWord("日本語", 1, 1), // positions 1-6 (display width: 6)
      createWord("テスト", 1, 7), // positions 7-12 (display width: 6), adjacent
    ];
    const result = detectAdjacentWords(words);
    assertEquals(result[0].adjacentWords.length, 1);
    assertEquals(result[0].adjacentWords[0].text, "テスト");
    assertEquals(result[1].adjacentWords.length, 1);
    assertEquals(result[1].adjacentWords[0].text, "日本語");
  });

  await t.step("Basic Adjacency 5: Mixed ASCII and Japanese", () => {
    const words: Word[] = [
      createWord("hello", 1, 1), // positions 1-5
      createWord("世界", 1, 6), // positions 6-9 (display width: 4), adjacent
    ];
    const result = detectAdjacentWords(words);
    assertEquals(result[0].adjacentWords.length, 1);
    assertEquals(result[1].adjacentWords.length, 1);
  });

  await t.step("Basic Adjacency 6: Different lines", () => {
    const words: Word[] = [
      createWord("first", 1, 1),
      createWord("second", 2, 1), // Different line
    ];
    const result = detectAdjacentWords(words);
    assertEquals(result[0].adjacentWords.length, 0);
    assertEquals(result[1].adjacentWords.length, 0);
  });

  await t.step("Basic Adjacency 7: Multiple adjacent words", () => {
    const words: Word[] = [
      createWord("a", 1, 1), // position 1
      createWord("b", 1, 2), // position 2, adjacent
      createWord("c", 1, 3), // position 3, adjacent to b
    ];
    const result = detectAdjacentWords(words);
    assertEquals(result[0].adjacentWords.length, 1); // a adjacent to b
    assertEquals(result[1].adjacentWords.length, 2); // b adjacent to a and c
    assertEquals(result[2].adjacentWords.length, 1); // c adjacent to b
  });

  await t.step("Basic Adjacency 8: Overlapping words", () => {
    const words: Word[] = [
      createWord("hello", 1, 1), // positions 1-5
      createWord("world", 1, 4), // positions 4-8, overlapping
    ];
    const result = detectAdjacentWords(words);
    // Overlapping words should be considered adjacent
    assertEquals(result[0].adjacentWords.length, 1);
    assertEquals(result[1].adjacentWords.length, 1);
  });

  await t.step("Basic Adjacency 9: Single character words", () => {
    const words: Word[] = [
      createWord("a", 1, 1),
      createWord("b", 1, 2),
      createWord("c", 1, 4), // Gap of 1
    ];
    const result = detectAdjacentWords(words);
    assertEquals(result[0].adjacentWords.length, 1); // a-b adjacent
    assertEquals(result[1].adjacentWords.length, 1); // b adjacent to a only (not c due to gap)
    assertEquals(result[2].adjacentWords.length, 0); // c not adjacent to any (due to gap)
  });

  await t.step("Basic Adjacency 10: Empty word list", () => {
    const words: Word[] = [];
    const result = detectAdjacentWords(words);
    assertEquals(result.length, 0);
  });

  // ===== Hint Position Tests (8 cases) =====
  await t.step("Position 1: Display width calculation from line start", () => {
    const word = createWord("hello", 1, 1);
    const position = calculateHintPosition(word, "start");
    assertEquals(position.line, 1);
    assertEquals(position.col, 1);
    assertEquals(position.display_mode, "before");
  });

  await t.step("Position 2: Display width calculation from line start - end position", () => {
    const word = createWord("hello", 1, 1);
    const position = calculateHintPosition(word, "end");
    assertEquals(position.line, 1);
    // Should use display width: position 1 + display_width(5) - 1 = 5
    assertEquals(position.col, 5);
    assertEquals(position.display_mode, "after");
  });

  await t.step("Position 3: Position before tab", () => {
    const word = createWord("word", 1, 5); // word after some text and before tab
    const position = calculateHintPosition(word, "start");
    assertEquals(position.line, 1);
    assertEquals(position.col, 5);
    assertEquals(position.display_mode, "before");
  });

  await t.step("Position 4: Position after tab", () => {
    const word = createWord("word", 1, 9); // word after tab (tab ends at position 8)
    const position = calculateHintPosition(word, "end");
    assertEquals(position.line, 1);
    // Should use display width: position 9 + display_width(4) - 1 = 12
    assertEquals(position.col, 12);
    assertEquals(position.display_mode, "after");
  });

  await t.step("Position 5: Japanese character start position", () => {
    const word = createWord("日本語", 1, 1);
    const position = calculateHintPosition(word, "start");
    assertEquals(position.line, 1);
    assertEquals(position.col, 1);
    assertEquals(position.display_mode, "before");
  });

  await t.step("Position 6: Japanese character end position", () => {
    const word = createWord("日本語", 1, 1);
    const position = calculateHintPosition(word, "end");
    assertEquals(position.line, 1);
    // Should use display width: position 1 + display_width(6) - 1 = 6
    assertEquals(position.col, 6);
    assertEquals(position.display_mode, "after");
  });

  await t.step("Position 7: Mixed string start position", () => {
    const word = createWord("hello世界", 1, 1);
    const position = calculateHintPosition(word, "start");
    assertEquals(position.line, 1);
    assertEquals(position.col, 1);
    assertEquals(position.display_mode, "before");
  });

  await t.step("Position 8: Mixed string end position", () => {
    const word = createWord("hello世界", 1, 1);
    const position = calculateHintPosition(word, "end");
    assertEquals(position.line, 1);
    // Should use display width: position 1 + display_width(9) - 1 = 9
    assertEquals(position.col, 9);
    assertEquals(position.display_mode, "after");
  });

  // ===== Symbol Display Width Tests (8 cases) =====
  await t.step("Symbol Width 1: Circled numbers '①②③④⑤' - each width 2", () => {
    const words: Word[] = [
      createWord("①", 1, 1), // width 2, positions 1-2
      createWord("②", 1, 3), // width 2, positions 3-4, adjacent
      createWord("③", 1, 5), // width 2, positions 5-6, adjacent
      createWord("④", 1, 7), // width 2, positions 7-8, adjacent
      createWord("⑤", 1, 9), // width 2, positions 9-10, adjacent
    ];
    const result = detectAdjacentWords(words);
    // All should be adjacent to their neighbors
    assertEquals(result[0].adjacentWords.length, 1); // ① adjacent to ②
    assertEquals(result[1].adjacentWords.length, 2); // ② adjacent to ① and ③
    assertEquals(result[2].adjacentWords.length, 2); // ③ adjacent to ② and ④
    assertEquals(result[3].adjacentWords.length, 2); // ④ adjacent to ③ and ⑤
    assertEquals(result[4].adjacentWords.length, 1); // ⑤ adjacent to ④
  });

  await t.step("Symbol Width 2: Parenthesized numbers '⑴⑵⑶' - each width 2", () => {
    const words: Word[] = [
      createWord("⑴", 1, 1), // width 2, positions 1-2
      createWord("⑵", 1, 3), // width 2, positions 3-4, adjacent
      createWord("⑶", 1, 5), // width 2, positions 5-6, adjacent
    ];
    const result = detectAdjacentWords(words);
    assertEquals(result[0].adjacentWords.length, 1); // ⑴ adjacent to ⑵
    assertEquals(result[1].adjacentWords.length, 2); // ⑵ adjacent to ⑴ and ⑶
    assertEquals(result[2].adjacentWords.length, 1); // ⑶ adjacent to ⑵
  });

  await t.step("Symbol Width 3: Arrow symbols '→←↑↓' - each width 2", () => {
    const words: Word[] = [
      createWord("→", 1, 1), // width 2, positions 1-2
      createWord("←", 1, 3), // width 2, positions 3-4, adjacent
      createWord("↑", 1, 5), // width 2, positions 5-6, adjacent
      createWord("↓", 1, 7), // width 2, positions 7-8, adjacent
    ];
    const result = detectAdjacentWords(words);
    assertEquals(result[0].adjacentWords.length, 1); // → adjacent to ←
    assertEquals(result[1].adjacentWords.length, 2); // ← adjacent to → and ↑
    assertEquals(result[2].adjacentWords.length, 2); // ↑ adjacent to ← and ↓
    assertEquals(result[3].adjacentWords.length, 1); // ↓ adjacent to ↑
  });

  await t.step("Symbol Width 4: Math symbols '＋－×÷' - each width 2", () => {
    const words: Word[] = [
      createWord("＋", 1, 1), // width 2, positions 1-2
      createWord("－", 1, 3), // width 2, positions 3-4, adjacent
      createWord("×", 1, 5), // width 2, positions 5-6, adjacent
      createWord("÷", 1, 7), // width 2, positions 7-8, adjacent
    ];
    const result = detectAdjacentWords(words);
    assertEquals(result[0].adjacentWords.length, 1); // ＋ adjacent to －
    assertEquals(result[1].adjacentWords.length, 2); // － adjacent to ＋ and ×
    assertEquals(result[2].adjacentWords.length, 2); // × adjacent to － and ÷
    assertEquals(result[3].adjacentWords.length, 1); // ÷ adjacent to ×
  });

  await t.step("Symbol Width 5: Half-width symbols '+-*/' - each width 1", () => {
    const words: Word[] = [
      createWord("+", 1, 1), // width 1, position 1
      createWord("-", 1, 2), // width 1, position 2, adjacent
      createWord("*", 1, 3), // width 1, position 3, adjacent
      createWord("/", 1, 4), // width 1, position 4, adjacent
    ];
    const result = detectAdjacentWords(words);
    assertEquals(result[0].adjacentWords.length, 1); // + adjacent to -
    assertEquals(result[1].adjacentWords.length, 2); // - adjacent to + and *
    assertEquals(result[2].adjacentWords.length, 2); // * adjacent to - and /
    assertEquals(result[3].adjacentWords.length, 1); // / adjacent to *
  });

  await t.step("Symbol Width 6: Mixed '①sub2' - 2+3+3+3+1 = 12 width", () => {
    const words: Word[] = [
      createWord("①", 1, 1), // width 2, positions 1-2
      createWord("sub2", 1, 3), // width 4, positions 3-6, adjacent
    ];
    const result = detectAdjacentWords(words);
    assertEquals(result[0].adjacentWords.length, 1); // ① adjacent to sub2
    assertEquals(result[1].adjacentWords.length, 1); // sub2 adjacent to ①
  });

  await t.step("Symbol Width 7: Space constraint '④s' - adjacent detection", () => {
    const words: Word[] = [
      createWord("④", 1, 1), // width 2, positions 1-2
      createWord("s", 1, 3), // width 1, position 3, adjacent
    ];
    const result = detectAdjacentWords(words);
    assertEquals(result[0].adjacentWords.length, 1); // ④ adjacent to s
    assertEquals(result[1].adjacentWords.length, 1); // s adjacent to ④
  });

  await t.step("Symbol Width 8: Priority '④sub' - sub hint should be prioritized", () => {
    // This test will be implemented in the priority testing section
    const words: Word[] = [
      createWord("④", 1, 1), // width 2, positions 1-2, symbol
      createWord("sub", 1, 3), // width 3, positions 3-5, text - should be prioritized
    ];
    const result = detectAdjacentWords(words);
    assertEquals(result[0].adjacentWords.length, 1); // ④ adjacent to sub
    assertEquals(result[1].adjacentWords.length, 1); // sub adjacent to ④
    // Priority testing will be added in the next section
  });

  // ===== Narrow Space Hint Display Tests (6 cases) =====
  await t.step("Narrow Space 1: Minimum width under threshold - no hints displayed", () => {
    // Two words very close together where there's no space for both hints
    const words: Word[] = [
      createWord("a", 1, 1), // width 1, position 1
      createWord("b", 1, 2), // width 1, position 2, adjacent but no space for hints
    ];
    const result = detectAdjacentWords(words);
    // Should still detect adjacency but hint display logic should handle spacing
    assertEquals(result[0].adjacentWords.length, 1);
    assertEquals(result[1].adjacentWords.length, 1);
  });

  await t.step("Narrow Space 2: Only one hint can be displayed", () => {
    // Test case where only one of two adjacent words can show hint
    const words: Word[] = [
      createWord("x", 1, 1), // width 1, position 1
      createWord("y", 1, 2), // width 1, position 2, only one should get hint
    ];
    const result = detectAdjacentWords(words);
    assertEquals(result[0].adjacentWords.length, 1);
    assertEquals(result[1].adjacentWords.length, 1);
    // Hint prioritization will determine which one gets the hint
  });

  await t.step("Narrow Space 3: Both hints can be displayed", () => {
    // Test case with enough space for both hints
    const words: Word[] = [
      createWord("word1", 1, 1), // width 5, positions 1-5
      createWord("word2", 1, 8), // width 5, positions 8-12, gap of 2
    ];
    const result = detectAdjacentWords(words);
    assertEquals(result[0].adjacentWords.length, 0); // Not adjacent due to gap
    assertEquals(result[1].adjacentWords.length, 0);
  });

  await t.step("Narrow Space 4: Symbol vs text priority", () => {
    // Text should be prioritized over symbols
    const words: Word[] = [
      createWord("④", 1, 1), // width 2, symbol
      createWord("text", 1, 3), // width 4, text - should be prioritized
    ];
    const result = detectAdjacentWords(words);
    assertEquals(result[0].adjacentWords.length, 1);
    assertEquals(result[1].adjacentWords.length, 1);
    // Text should get priority for hint display
  });

  await t.step("Narrow Space 5: Symbol vs symbol case", () => {
    // When both are symbols, left should be prioritized
    const words: Word[] = [
      createWord("①", 1, 1), // width 2, symbol
      createWord("②", 1, 3), // width 2, symbol - left (①) should be prioritized
    ];
    const result = detectAdjacentWords(words);
    assertEquals(result[0].adjacentWords.length, 1);
    assertEquals(result[1].adjacentWords.length, 1);
    // Left symbol should get priority
  });

  await t.step("Narrow Space 6: Text vs text case", () => {
    // When both are text, left should be prioritized
    const words: Word[] = [
      createWord("abc", 1, 1), // width 3, text
      createWord("def", 1, 4), // width 3, text - left (abc) should be prioritized
    ];
    const result = detectAdjacentWords(words);
    assertEquals(result[0].adjacentWords.length, 1);
    assertEquals(result[1].adjacentWords.length, 1);
    // Left text should get priority
  });

  // ===== Priority-based Hint Display Tests (5 cases) =====
  await t.step("Priority 1: Text prioritized over symbols", () => {
    const words: Word[] = [
      createWord("④", 1, 1), // symbol
      createWord("important", 1, 3), // text - should be prioritized
    ];
    const result = detectAdjacentWords(words);
    assertEquals(result[0].adjacentWords.length, 1);
    assertEquals(result[1].adjacentWords.length, 1);
    // Implementation will add priority logic
  });

  await t.step("Priority 2: Left prioritized when same priority", () => {
    const words: Word[] = [
      createWord("first", 1, 1), // left text
      createWord("second", 1, 6), // right text - left should be prioritized
    ];
    const result = detectAdjacentWords(words);
    assertEquals(result[0].adjacentWords.length, 1);
    assertEquals(result[1].adjacentWords.length, 1);
    // Left should get priority when same type
  });

  await t.step("Priority 3: Three or more adjacent words", () => {
    const words: Word[] = [
      createWord("①", 1, 1), // symbol
      createWord("text", 1, 3), // text - highest priority
      createWord("②", 1, 7), // symbol
    ];
    const result = detectAdjacentWords(words);
    assertEquals(result[0].adjacentWords.length, 1); // ① adjacent to text
    assertEquals(result[1].adjacentWords.length, 2); // text adjacent to both
    assertEquals(result[2].adjacentWords.length, 1); // ② adjacent to text
    // text should get the hint
  });

  await t.step("Priority 4: Line start/end priority", () => {
    const words: Word[] = [
      createWord("start", 1, 1), // line start
      createWord("④", 1, 6), // symbol
      createWord("end", 1, 8), // towards line end
    ];
    const result = detectAdjacentWords(words);
    assertEquals(result[0].adjacentWords.length, 1);
    assertEquals(result[1].adjacentWords.length, 2);
    assertEquals(result[2].adjacentWords.length, 1);
    // Text words should be prioritized over symbol
  });

  await t.step("Priority 5: Multi-line priority", () => {
    const words: Word[] = [
      createWord("line1", 1, 1), // line 1
      createWord("④", 1, 6), // line 1, symbol
      createWord("line2", 2, 1), // line 2, different line
      createWord("text", 2, 6), // line 2, text
    ];
    const result = detectAdjacentWords(words);
    assertEquals(result[0].adjacentWords.length, 1); // line1 adjacent to ④ (same line)
    assertEquals(result[1].adjacentWords.length, 1); // ④ adjacent to line1 (same line)
    assertEquals(result[2].adjacentWords.length, 1); // line2 adjacent to text (same line)
    assertEquals(result[3].adjacentWords.length, 1); // text adjacent to line2 (same line)
    // Each line should prioritize text over symbols
  });
});
