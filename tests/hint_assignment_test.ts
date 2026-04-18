/**
 * ヒント割り当て設定のテスト
 * Process 50 Sub2: 1文字/2文字ヒントキー設定機能
 */

import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import {
  generateHints,
  type HintKeyConfig,
  validateHintKeyConfig,
} from "../denops/hellshake-yano/neovim/core/hint.ts";

describe("Hint Assignment with Character Groups", () => {
  describe("Single Character Hints", () => {
    it("should use only specified keys for single-char hints", () => {
      const config: HintKeyConfig = {
        singleCharKeys: ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
        multiCharKeys: ["Q", "W", "E", "R"],
        maxSingleCharHints: 9,
      };

      const hints = generateHints(12, { groups: true, ...config });

      // 最初の9個は singleCharKeys から
      assertEquals(hints.slice(0, 9), ["A", "S", "D", "F", "G", "H", "J", "K", "L"]);

      // 10個目以降は multiCharKeys を使った2文字ヒント
      assertEquals(hints[9], "QQ");
      assertEquals(hints[10], "QW");
      assertEquals(hints[11], "QE");
    });

    it("should limit single-char hints by maxSingleCharHints", () => {
      const config: HintKeyConfig = {
        singleCharKeys: ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
        multiCharKeys: ["Q", "W"],
        maxSingleCharHints: 5, // 9個使えるが5個に制限
      };

      const hints = generateHints(8, { groups: true, ...config });

      // 最初の5個のみ singleCharKeys から
      assertEquals(hints.slice(0, 5), ["A", "S", "D", "F", "G"]);

      // 6個目以降は2文字ヒント
      assertEquals(hints[5], "QQ");
      assertEquals(hints[6], "QW");
      assertEquals(hints[7], "WQ");
    });
  });

  describe("Multi Character Hints", () => {
    it("should generate multi-char hints from specified keys", () => {
      const config: HintKeyConfig = { singleCharKeys: ["A", "S"], multiCharKeys: ["Q", "W", "E"] };

      const hints = generateHints(7, { groups: true, ...config });

      // 最初の2個は singleCharKeys
      assertEquals(hints.slice(0, 2), ["A", "S"]);

      // 残りは multiCharKeys の組み合わせ
      const multiCharHints = hints.slice(2);
      assertEquals(multiCharHints.length, 5);

      // QQ, QW, QE, WQ, WW の順になるはず
      assertEquals(multiCharHints[0], "QQ");
      assertEquals(multiCharHints[1], "QW");
      assertEquals(multiCharHints[2], "QE");
      assertEquals(multiCharHints[3], "WQ");
      assertEquals(multiCharHints[4], "WW");
    });

    it("should handle number hints after alphabet exhaustion", () => {
      const config: HintKeyConfig = {
        singleCharKeys: ["A"],
        multiCharKeys: ["Q", "W"], // 2文字で最大4通り
      };

      const hints = generateHints(7, { groups: true, ...config });

      // 1個目は A
      assertEquals(hints[0], "A");

      // 2-5個目は2文字（QQ, QW, WQ, WW）
      assertEquals(hints[1], "QQ");
      assertEquals(hints[2], "QW");
      assertEquals(hints[3], "WQ");
      assertEquals(hints[4], "WW");

      // 6個目以降は生成されない（数字フォールバックなし）
      assertEquals(hints[5], undefined);
      assertEquals(hints[6], undefined);
    });
  });

  describe("Configuration Validation", () => {
    it("should validate singleCharKeys are single characters", () => {
      const config: HintKeyConfig = {
        singleCharKeys: ["A", "AB", "C"], // ABは無効
        multiCharKeys: ["Q"],
      };

      const result = validateHintKeyConfig(config);

      assertEquals(result.valid, false);
      assertEquals(result.errors.length, 1);
      assertEquals(result.errors[0], "Invalid single char keys (must be single character): AB");
    });

    it("should detect overlapping keys between groups", () => {
      const config: HintKeyConfig = {
        singleCharKeys: ["A", "S", "D"],
        multiCharKeys: ["A", "Q", "W"], // Aが重複
      };

      const result = validateHintKeyConfig(config);

      assertEquals(result.valid, false);
      assertEquals(result.errors.length, 1);
      assertEquals(result.errors[0], "Keys cannot be in both groups: A");
    });

    it("should accept valid configuration", () => {
      const config: HintKeyConfig = {
        singleCharKeys: ["A", "S", "D", "F"],
        multiCharKeys: ["Q", "W", "E", "R"],
        maxSingleCharHints: 4,
      };

      const result = validateHintKeyConfig(config);

      assertEquals(result.valid, true);
      assertEquals(result.errors.length, 0);
    });
  });

  describe("Fallback Behavior", () => {
    it("should work with default when no groups specified", () => {
      const config: HintKeyConfig = {};

      const hints = generateHints(5, { groups: true, ...config });

      // デフォルトのA-Zを使用
      assertEquals(hints, ["A", "B", "C", "D", "E"]);
    });

    it("should use singleCharKeys for multi-char if multiCharKeys not specified", () => {
      const config: HintKeyConfig = { singleCharKeys: ["A", "S", "D"] };

      const hints = generateHints(6, { groups: true, ...config });

      // singleCharKeysのみが定義されている場合、multiCharKeysは生成されない
      // 代わりにデフォルトのマーカーが使用される
      assertEquals(hints.slice(0, 3), ["A", "S", "D"]);

      // 追加のヒントは数字になるか、デフォルトマーカーから生成される
      // singleCharKeysからは2文字ヒントを生成しない（厳密分離のため）
      const additionalHints = hints.slice(3);
      for (const hint of additionalHints) {
        // 2文字ヒントはsingleCharKeysからは生成されない
        if (hint.length === 2) {
          const [first] = hint.split("");
          assertEquals(["A", "S", "D"].includes(first), false);
        }
      }
    });
  });
});
