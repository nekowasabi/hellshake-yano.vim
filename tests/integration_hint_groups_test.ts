/**
 * 統合テスト: ヒントグループ機能
 * Process 50 Sub2の統合動作確認
 */

import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { MockDenops } from "./helpers/mock.ts";

// generateHintsOptimized を直接テストできるようにエクスポートを追加する必要があるため、
// ここではヒント生成機能をシミュレート
import {
  generateHints,
  type HintKeyConfig,
  validateHintKeyConfig,
} from "../denops/hellshake-yano/neovim/core/hint.ts";

describe("Integration: Hint Groups Feature", () => {
  describe("Configuration and Hint Generation", () => {
    it("should use hint groups when configured", () => {
      // 設定例: ホームポジションキーと上段キーを分ける
      const config: HintKeyConfig = {
        singleCharKeys: ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";"],
        multiCharKeys: ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
        maxSingleCharHints: 10,
      };

      // 15個の単語に対してヒントを生成
      const hints = generateHints(15, { groups: true, ...config });

      // 最初の10個は singleCharKeys から
      assertEquals(hints.slice(0, 10), ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";"]);

      // 11個目以降は multiCharKeys の組み合わせ
      assertEquals(hints[10], "QQ");
      assertEquals(hints[11], "QW");
      assertEquals(hints[12], "QE");
      assertEquals(hints[13], "QR");
      assertEquals(hints[14], "QT");
    });

    it("should validate configuration before use", () => {
      // 無効な設定
      const invalidConfig: HintKeyConfig = {
        singleCharKeys: ["A", "S", "D"],
        multiCharKeys: ["A", "Q"], // Aが重複
        maxSingleCharHints: 3,
      };

      const validation = validateHintKeyConfig(invalidConfig);
      assertEquals(validation.valid, false);
      assertEquals(validation.errors.length, 1);
      assertEquals(validation.errors[0], "Keys cannot be in both groups: A");
    });

    it("should fall back to default when no groups specified", () => {
      const config: HintKeyConfig = {};

      const hints = generateHints(5, { groups: true, ...config });

      // デフォルトのA-Zを使用
      assertEquals(hints, ["A", "B", "C", "D", "E"]);
    });
  });

  describe("Real-world Scenarios", () => {
    it("should handle Vim-like home row configuration", () => {
      // Vimのホームロウを1文字ヒントに、それ以外を2文字に
      const config: HintKeyConfig = {
        singleCharKeys: ["A", "S", "D", "F", "J", "K", "L", ";"],
        multiCharKeys: ["G", "H", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
        maxSingleCharHints: 8,
      };

      const hints = generateHints(20, { groups: true, ...config });

      // ホームロウキーが優先的に使われる
      assertEquals(hints.slice(0, 8), ["A", "S", "D", "F", "J", "K", "L", ";"]);

      // 9個目以降は2文字ヒント
      assertEquals(hints[8], "GG");
      assertEquals(hints[9], "GH");
    });

    it("should handle limited single-char scenario", () => {
      // 少数の1文字ヒント、多数の2文字ヒント
      const config: HintKeyConfig = {
        singleCharKeys: ["F", "J"], // 最も押しやすい2キーのみ
        multiCharKeys: ["A", "S", "D", "G", "H", "K", "L"],
        maxSingleCharHints: 2,
      };

      const hints = generateHints(10, { groups: true, ...config });

      // 最初の2個のみ1文字
      assertEquals(hints[0], "F");
      assertEquals(hints[1], "J");

      // 残りは全て2文字
      assertEquals(hints[2], "AA");
      assertEquals(hints[3], "AS");
      assertEquals(hints[4], "AD");
    });
  });

  describe("Performance", () => {
    it("should generate hints efficiently for large word counts", () => {
      const config: HintKeyConfig = {
        singleCharKeys: ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
        multiCharKeys: ["Q", "W", "E", "R", "T"],
        maxSingleCharHints: 9,
      };

      const startTime = Date.now();
      const hints = generateHints(100, { groups: true, ...config });
      const elapsedTime = Date.now() - startTime;

      // 9 + 25 = 34個のヒントのみ生成可能（数字フォールバックなし）
      assertEquals(hints.length, 34);
      assertEquals(elapsedTime < 200, true);

      // 最初の9個は1文字
      assertEquals(hints.slice(0, 9), ["A", "S", "D", "F", "G", "H", "J", "K", "L"]);

      // 10個目以降は2文字組み合わせ
      assertEquals(hints[9], "QQ");

      // より多くのヒントが必要な場合は適切に生成される
      assertEquals(hints.length >= 10, true);
    });

    it("should handle edge case with very few keys", () => {
      const config: HintKeyConfig = { singleCharKeys: ["A"], multiCharKeys: ["B", "C"] };

      const hints = generateHints(10, { groups: true, ...config });

      assertEquals(hints[0], "A");
      assertEquals(hints[1], "BB");
      assertEquals(hints[2], "BC");
      assertEquals(hints[3], "CB");
      assertEquals(hints[4], "CC");
      // 5個目以降は生成されない（数字フォールバックなし）
      assertEquals(hints.length, 5);
      assertEquals(hints[5], undefined);
      assertEquals(hints[6], undefined);
      assertEquals(hints[7], undefined);
      assertEquals(hints[8], undefined);
      assertEquals(hints[9], undefined);
    });
  });

  describe("Backward Compatibility", () => {
    it("should work with legacy markers configuration", () => {
      const config: HintKeyConfig = {
        markers: ["X", "Y", "Z"], // 従来のmarkers設定
      };

      const hints = generateHints(5, { groups: true, ...config });

      // markersが singleCharKeys として使われる
      assertEquals(hints[0], "X");
      assertEquals(hints[1], "Y");
      assertEquals(hints[2], "Z");
      assertEquals(hints[3], "XX");
      assertEquals(hints[4], "XY");
    });

    it("should prioritize new config over legacy markers", () => {
      const config: HintKeyConfig = {
        singleCharKeys: ["A", "B"],
        markers: ["X", "Y", "Z"], // これは無視される
      };

      const hints = generateHints(4, { groups: true, ...config });

      // singleCharKeys が優先される
      assertEquals(hints[0], "A");
      assertEquals(hints[1], "B");
      // singleCharKeysのみでmultiCharKeysが未定義の場合、2個のみ生成される
      assertEquals(hints.length, 2);
      assertEquals(hints[2], undefined);
      assertEquals(hints[3], undefined);
    });
  });
});
