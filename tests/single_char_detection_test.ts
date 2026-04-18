#!/usr/bin/env -S deno test --allow-all

import { assertEquals } from "@std/assert";
import { extractWords } from "../denops/hellshake-yano/neovim/core/word.ts";

Deno.test("Single Character Word Detection Tests", async (t) => {
  await t.step("Basic single character detection", async (t) => {
    await t.step("should detect single alphabetic characters with improved detection", () => {
      const line = "A B C D E F G H I J K L";
      const words = extractWords(line, 1, { useImprovedDetection: true });

      assertEquals(words.length, 12);
      assertEquals(words.map((w) => w.text), [
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H",
        "I",
        "J",
        "K",
        "L",
      ]);
      assertEquals(words[0].col, 1);
      assertEquals(words[1].col, 3);
      assertEquals(words[2].col, 5);
    });

    await t.step("should NOT detect single characters without improved detection", () => {
      const line = "A B C D E F G H I J K L";
      // Process4 Analysis: この行は意図的に従来動作をテストしています
      // useImprovedDetection=false により新実装内で従来動作をエミュレート
      const words = extractWords(line, 1, { useImprovedDetection: false });

      assertEquals(words.length, 0); // 従来版では1文字単語は検出されない
    });

    await t.step("should detect single digits with improved detection", () => {
      const line = "1 2 3 4 5 6 7 8 9 0";
      const words = extractWords(line, 1, { useImprovedDetection: true });

      assertEquals(words.length, 10);
      assertEquals(words.map((w) => w.text), ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]);
    });
  });

  await t.step("Mixed content detection", async (t) => {
    await t.step("should detect both single and multi-character words", () => {
      const line = "test a I word hello world the end";
      const words = extractWords(line, 1, { useImprovedDetection: true });

      const singleCharWords = words.filter((w) => w.text.length === 1);
      const multiCharWords = words.filter((w) => w.text.length > 1);

      assertEquals(singleCharWords.map((w) => w.text), ["a", "I"]);
      assertEquals(multiCharWords.map((w) => w.text), [
        "test",
        "word",
        "hello",
        "world",
        "the",
        "end",
      ]);
    });

    await t.step("should preserve column positions correctly", () => {
      const line = "A B C";
      const words = extractWords(line, 1, { useImprovedDetection: true });

      assertEquals(words.length, 3);
      // プロパティ毎に個別にテスト（byteColが自動追加されるため）
      assertEquals(words[0].text, "A");
      assertEquals(words[0].line, 1);
      assertEquals(words[0].col, 1);

      assertEquals(words[1].text, "B");
      assertEquals(words[1].line, 1);
      assertEquals(words[1].col, 3);

      assertEquals(words[2].text, "C");
      assertEquals(words[2].line, 1);
      assertEquals(words[2].col, 5);
    });
  });

  await t.step("Target characters for hint assignment", async (t) => {
    await t.step("should detect all problem characters mentioned in issue", () => {
      // 問題で報告された文字をテスト
      const problemChars = [
        "A",
        "S",
        "D",
        "F",
        "G",
        "J",
        "K",
        "L",
        "Q",
        "W",
        "E",
        "R",
        "T",
        "Y",
        "U",
        "I",
        "O",
        "P",
      ];
      const line = problemChars.join(" ");
      const words = extractWords(line, 1, { useImprovedDetection: true });

      assertEquals(words.length, problemChars.length);
      assertEquals(words.map((w) => w.text), problemChars);
    });

    await t.step("should detect singleCharKeys", () => {
      const singleCharKeys = ["A", "S", "D", "F", "G", "H", "J", "K", "L", "N", "M"];
      const line = singleCharKeys.join(" ");
      const words = extractWords(line, 1, { useImprovedDetection: true });

      assertEquals(words.length, singleCharKeys.length);
      assertEquals(words.map((w) => w.text), singleCharKeys);
    });

    await t.step("should detect multiCharKeys", () => {
      const multiCharKeys = [
        "B",
        "C",
        "E",
        "I",
        "O",
        "P",
        "Q",
        "R",
        "T",
        "U",
        "V",
        "W",
        "X",
        "Y",
        "Z",
      ];
      const line = multiCharKeys.join(" ");
      const words = extractWords(line, 1, { useImprovedDetection: true });

      assertEquals(words.length, multiCharKeys.length);
      assertEquals(words.map((w) => w.text), multiCharKeys);
    });
  });

  await t.step("Edge cases", async (t) => {
    await t.step("should handle empty lines", () => {
      const words = extractWords("", 1, { useImprovedDetection: true });
      assertEquals(words.length, 0);
    });

    await t.step("should handle whitespace-only lines", () => {
      const words = extractWords("   ", 1, { useImprovedDetection: true });
      assertEquals(words.length, 0);
    });

    await t.step("should handle mixed punctuation", () => {
      const line = "A, B; C. D! E? F:";
      const words = extractWords(line, 1, { useImprovedDetection: true });

      const singleCharWords = words.filter((w) => w.text.length === 1);
      assertEquals(singleCharWords.map((w) => w.text), ["A", "B", "C", "D", "E", "F"]);
    });
  });
});
