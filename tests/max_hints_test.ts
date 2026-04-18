#!/usr/bin/env -S deno test --allow-all

/**
 * maxHints設定とhint groups容量計算のテスト
 */

import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { generateHints, type HintKeyConfig } from "../denops/hellshake-yano/neovim/core/hint.ts";

describe("Max Hints and Capacity Calculation", () => {
  describe("Hint capacity with custom keys", () => {
    it("should calculate correct capacity for user's config", () => {
      // ユーザーの設定を再現
      const config: HintKeyConfig = {
        singleCharKeys: ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";"],
        multiCharKeys: ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
        maxSingleCharHints: 10,
      };

      // 期待される容量
      const singleCharCount = 10; // A,S,D,F,G,H,J,K,L,;
      const multiCharCount = 10 * 10; // QQ,QW,QE... (10×10 = 100)
      // 数字フォールバックはなし
      const expectedCapacity = singleCharCount + multiCharCount; // 110

      // 実際に生成してテスト
      const hints = generateHints(expectedCapacity, { groups: true, ...config });
      assertEquals(hints.length, expectedCapacity);

      // 最初の10個は1文字ヒント
      for (let i = 0; i < 10; i++) {
        assertEquals(hints[i].length, 1);
        assertEquals(config.singleCharKeys!.includes(hints[i]), true);
      }

      // 次の100個は2文字アルファベット
      for (let i = 10; i < 110; i++) {
        assertEquals(hints[i].length, 2);
        // 各文字がmultiCharKeysに含まれることを確認
        for (const char of hints[i]) {
          assertEquals(config.multiCharKeys!.includes(char), true);
        }
      }

      // 数字ヒントはなし
      assertEquals(hints[110], undefined);
    });

    it("should handle vim config line scenario", () => {
      // Vim設定の実際のシナリオ
      const config: HintKeyConfig = {
        singleCharKeys: ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";"],
        multiCharKeys: ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
        maxSingleCharHints: 10,
      };

      // Vim設定で検出される単語数（実際の例）
      const wordCount = 42; // let, g, hellshake, yano, use, japanese, false, hint, position, start, など

      const hints = generateHints(wordCount, { groups: true, ...config });
      assertEquals(hints.length, wordCount);

      // すべての単語にヒントが割り当てられることを確認

      // 最初の単語 "let" には最初のヒント "A" が割り当てられるべき
      assertEquals(hints[0], "A");
    });

    it("should support maximum capacity", () => {
      // デフォルト設定での最大容量
      const config: HintKeyConfig = {
        singleCharKeys: ["A", "S", "D", "F", "G", "H", "J", "K", "L", "N", "M"],
        multiCharKeys: [
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
        ],
        maxSingleCharHints: 11,
      };

      // 最大容量: 11 + (15×15) = 236 (数字フォールバックなし)
      const maxCapacity = 236;
      const hints = generateHints(maxCapacity, { groups: true, ...config });

      assertEquals(hints.length, maxCapacity);

      // 各セクションの検証
      let index = 0;

      // 1文字ヒント（11個）
      for (let i = 0; i < 11; i++, index++) {
        assertEquals(hints[index].length, 1);
      }

      // 2文字アルファベット（225個）
      for (let i = 0; i < 225; i++, index++) {
        assertEquals(hints[index].length, 2);
        assertEquals(/^[A-Z]{2}$/.test(hints[index]), true);
      }

      // 数字ヒントはなし
      assertEquals(index, maxCapacity);
    });
  });

  describe("effectiveMaxHints calculation", () => {
    it("should respect maxHints setting", () => {
      const config: HintKeyConfig = {
        singleCharKeys: ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";"],
        multiCharKeys: ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
        maxSingleCharHints: 10,
      };

      // 容量は210だが、50個のみ要求
      const requestedCount = 50;
      const hints = generateHints(requestedCount, { groups: true, ...config });

      assertEquals(hints.length, requestedCount);

      // 最初の10個は1文字
      for (let i = 0; i < 10; i++) {
        assertEquals(hints[i].length, 1);
      }

      // 残りの40個は2文字アルファベット
      for (let i = 10; i < 50; i++) {
        assertEquals(hints[i].length, 2);
        assertEquals(/^[A-Z]{2}$/.test(hints[i]), true);
      }
    });

    it("should handle more words than capacity gracefully", () => {
      const config: HintKeyConfig = {
        singleCharKeys: ["A"],
        multiCharKeys: ["B", "C"], // 容量: 1 + 4 = 5 (数字フォールバックなし)
      };

      // 容量を超える数を要求
      const requestedCount = 110;
      const hints = generateHints(requestedCount, { groups: true, ...config });

      // 5個のみ生成可能（数字フォールバックなし、３文字ヒントなし）
      assertEquals(hints.length, 5);

      // 最初は1文字
      assertEquals(hints[0], "A");

      // 次は2文字アルファベット（BB, BC, CB, CC）
      assertEquals(hints[1], "BB");
      assertEquals(hints[4], "CC");

      // 数字ヒントはなし
      assertEquals(hints[5], undefined);
      assertEquals(hints[104], undefined);

      // 3文字ヒントもなし
      assertEquals(hints[105], undefined);
    });
  });
});
