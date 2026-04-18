/**
 * TDDテスト: 数字フォールバック削除の検証
 *
 * このテストは、generateHints関数が
 * singleCharKeysとmultiCharKeysの組み合わせのみを生成し、
 * 数字フォールバック（00, 01, 02...）を生成しないことを検証します。
 */

import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { generateHints, type HintKeyConfig } from "../denops/hellshake-yano/neovim/core/hint.ts";

describe("Hint Generation Without Number Fallback", () => {
  describe("Strict single/multi char keys separation", () => {
    it("should NOT generate number hints when hints exceed multi_char combinations", () => {
      const config: HintKeyConfig = {
        singleCharKeys: ["A", "S", "D", "F", "G"], // 5個
        multiCharKeys: ["B", "C", "E"], // 3×3=9個の2文字組み合わせ
      };

      // 最大: 5個（single） + 9個（multi） = 14個
      const hints = generateHints(20, { groups: true, ...config });

      // 14個までしか生成されない（数字フォールバックなし）
      assertEquals(hints.length, 14);

      // 数字ヒントが含まれていないことを確認
      const numberHints = hints.filter((h: string) => /^\d{2}$/.test(h));
      assertEquals(numberHints.length, 0, "No number hints should be generated");

      // 生成されたヒントの内容を確認
      // 1文字ヒント
      assertEquals(hints.slice(0, 5), ["A", "S", "D", "F", "G"]);

      // 2文字ヒント（B, C, Eの組み合わせ）
      const multiCharHints = hints.slice(5);
      multiCharHints.forEach((hint: string) => {
        assertEquals(hint.length, 2, "Multi-char hints should be 2 characters");
        const [first, second] = hint.split("");
        assertExists(["B", "C", "E"].includes(first), "First char should be from multiCharKeys");
        assertExists(["B", "C", "E"].includes(second), "Second char should be from multiCharKeys");
      });
    });

    it("should work with the actual user configuration", () => {
      // ユーザーの実際の設定
      const config: HintKeyConfig = {
        singleCharKeys: "ASDFGNM0123456789".split(""), // 17個
        multiCharKeys: "BCEIOPQRTUVWXYZ".split(""), // 15×15=225個
      };

      // 最大: 17 + 225 = 242個
      const hints250 = generateHints(250, { groups: true, ...config });

      // 242個で停止（数字フォールバックなし）
      assertEquals(hints250.length, 242);

      // 数字の2文字ヒント（00, 01等）が含まれていないことを確認
      const numberHints = hints250.filter((h: string) => /^\d{2}$/.test(h));
      assertEquals(numberHints.length, 0, "No '00', '01' style number hints");

      // 最後のヒントがZZであることを確認（multiCharKeysの最後の組み合わせ）
      assertEquals(hints250[hints250.length - 1], "ZZ");
    });

    it("should handle small hint requests correctly", () => {
      const config: HintKeyConfig = { singleCharKeys: ["A", "S", "D"], multiCharKeys: ["B", "C"] };

      // 3個のヒントのみ要求
      const hints = generateHints(3, { groups: true, ...config });

      assertEquals(hints.length, 3);
      assertEquals(hints, ["A", "S", "D"]);
    });

    it("should generate multi-char hints when single-char is exhausted", () => {
      const config: HintKeyConfig = {
        singleCharKeys: ["A", "S"], // 2個
        multiCharKeys: ["B", "C"], // 2×2=4個
      };

      // 5個要求（2個のsingle + 3個のmulti）
      const hints = generateHints(5, { groups: true, ...config });

      assertEquals(hints.length, 5);
      assertEquals(hints[0], "A");
      assertEquals(hints[1], "S");
      assertEquals(hints[2], "BB");
      assertEquals(hints[3], "BC");
      assertEquals(hints[4], "CB");
    });

    it("should respect maxSingleCharHints setting", () => {
      const config: HintKeyConfig = {
        singleCharKeys: ["A", "S", "D", "F", "G"],
        multiCharKeys: ["B", "C"],
        maxSingleCharHints: 2, // 1文字ヒントを2個に制限
      };

      const hints = generateHints(5, { groups: true, ...config });

      assertEquals(hints.length, 5);
      // 最初の2個のみ1文字ヒント
      assertEquals(hints[0], "A");
      assertEquals(hints[1], "S");
      // 残りは2文字ヒント
      assertEquals(hints[2], "BB");
      assertEquals(hints[3], "BC");
      assertEquals(hints[4], "CB");
    });

    it("should NOT generate 3-character hints anymore", () => {
      const config: HintKeyConfig = {
        singleCharKeys: ["A"], // 1個
        multiCharKeys: ["B", "C"], // 2×2=4個
      };

      // 10個要求しても、5個（1+4）しか生成されない
      const hints = generateHints(10, { groups: true, ...config });

      assertEquals(hints.length, 5);

      // 3文字のヒントが存在しないことを確認
      const threeCharHints = hints.filter((h: string) => h.length === 3);
      assertEquals(threeCharHints.length, 0, "No 3-character hints should be generated");
    });

    it("should handle empty multiCharKeys", () => {
      const config: HintKeyConfig = {
        singleCharKeys: ["A", "S", "D"],
        multiCharKeys: [], // 空
      };

      const hints = generateHints(5, { groups: true, ...config });

      // singleCharKeysの3個のみ生成
      assertEquals(hints.length, 3);
      assertEquals(hints, ["A", "S", "D"]);
    });

    it("should handle empty singleCharKeys", () => {
      const config: HintKeyConfig = {
        singleCharKeys: [], // 空
        multiCharKeys: ["B", "C"],
      };

      const hints = generateHints(3, { groups: true, ...config });

      // multiCharKeysから2文字ヒントのみ生成
      assertEquals(hints.length, 3);
      assertEquals(hints, ["BB", "BC", "CB"]);
    });
  });

  describe("Edge cases", () => {
    it("should handle zero word count", () => {
      const config: HintKeyConfig = { singleCharKeys: ["A"], multiCharKeys: ["B"] };

      const hints = generateHints(0, { groups: true, ...config });
      assertEquals(hints.length, 0);
    });

    it("should handle negative word count", () => {
      const config: HintKeyConfig = { singleCharKeys: ["A"], multiCharKeys: ["B"] };

      const hints = generateHints(-1, { groups: true, ...config });
      assertEquals(hints.length, 0);
    });

    it("should handle both keys empty with markers fallback", () => {
      const config: HintKeyConfig = {
        singleCharKeys: [],
        multiCharKeys: [],
        markers: ["X", "Y", "Z"],
      };

      const hints = generateHints(3, { groups: true, ...config });

      // markersにフォールバック（従来の動作）
      assertEquals(hints.length, 3);
      assertEquals(hints[0], "X");
    });
  });
});
