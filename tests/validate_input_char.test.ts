/**
 * ValidateInputChar Tests (process50 sub4)
 *
 * TDD Red-Green-Refactor サイクルに従ってVim環境での無効キー入力時のヒント自動非表示機能をテスト
 *
 * @goal Vimでヒント表示後、ヒント文字以外を入力したときに自動的にヒントを非表示にする
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { Core } from "../denops/hellshake-yano/core.ts";
import type { Config } from "../denops/hellshake-yano/config.ts";
import { DEFAULT_CONFIG } from "../denops/hellshake-yano/config.ts";

/**
 * テスト用のConfig生成ヘルパー
 */
function createTestConfig(overrides: Partial<Config> = {}): Config {
  return {
    ...DEFAULT_CONFIG,
    singleCharKeys: ["a", "s", "d", "f"],
    multiCharKeys: ["g", "h"],
    useNumericMultiCharHints: false,
    ...overrides,
  };
}

Deno.test("process50 sub4: validateInputChar - 基本的な有効性検証", async (t) => {
  await t.step("有効なsingleCharKey入力の場合、trueを返す", () => {
    const config = createTestConfig();
    const core = Core.getInstance(config);

    // singleCharKeysに含まれる文字
    const validChars = ["a", "s", "d", "f"];
    for (const char of validChars) {
      const result = core.validateInputChar(char);
      assertEquals(result, true, `"${char}" should be valid`);
    }
  });

  await t.step("有効なmultiCharKey入力の場合、trueを返す", () => {
    const config = createTestConfig();
    const core = Core.getInstance(config);

    // multiCharKeysに含まれる文字
    const validChars = ["g", "h"];
    for (const char of validChars) {
      const result = core.validateInputChar(char);
      assertEquals(result, true, `"${char}" should be valid`);
    }
  });

  await t.step("無効な文字入力の場合、falseを返す", () => {
    const config = createTestConfig();
    const core = Core.getInstance(config);

    // singleCharKeys/multiCharKeysに含まれない文字
    const invalidChars = ["x", "y", "z", "1", "2", "3"];
    for (const char of invalidChars) {
      const result = core.validateInputChar(char);
      assertEquals(result, false, `"${char}" should be invalid`);
    }
  });

  await t.step("ESC（制御文字）の場合、falseを返す", () => {
    const config = createTestConfig();
    const core = Core.getInstance(config);

    // ESCキー（charCode 27）
    const result = core.validateInputChar("\x1b");
    assertEquals(result, false, "ESC should be invalid");
  });
});

Deno.test("process50 sub4: validateInputChar - 大文字小文字の正規化", async (t) => {
  await t.step("小文字で設定されたキーの大文字入力がtrueを返す", () => {
    const config = createTestConfig({
      singleCharKeys: ["a", "s", "d", "f"],
    });
    const core = Core.getInstance(config);

    // 小文字設定だが、大文字で入力
    const result = core.validateInputChar("A");
    assertEquals(result, true, "Upper case 'A' should match lower case 'a'");
  });

  await t.step("大文字で設定されたキーの小文字入力がtrueを返す", () => {
    const config = createTestConfig({
      singleCharKeys: ["A", "S", "D", "F"],
    });
    const core = Core.getInstance(config);

    // 大文字設定だが、小文字で入力
    const result = core.validateInputChar("a");
    assertEquals(result, true, "Lower case 'a' should match upper case 'A'");
  });

  await t.step("数値キーは大文字小文字の影響を受けない", () => {
    const config = createTestConfig({
      useNumericMultiCharHints: true,
    });
    const core = Core.getInstance(config);

    // 数値は常にそのまま
    const result = core.validateInputChar("5");
    assertEquals(result, true, "Numeric '5' should be valid when useNumericMultiCharHints is true");
  });
});

Deno.test("process50 sub4: validateInputChar - useNumericMultiCharHints設定", async (t) => {
  await t.step("useNumericMultiCharHints=trueの場合、数値入力がtrueを返す", () => {
    const config = createTestConfig({
      useNumericMultiCharHints: true,
    });
    const core = Core.getInstance(config);

    // 0-9の数値
    const numericChars = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    for (const char of numericChars) {
      const result = core.validateInputChar(char);
      assertEquals(result, true, `Numeric "${char}" should be valid`);
    }
  });

  await t.step("useNumericMultiCharHints=falseの場合、数値入力がfalseを返す", () => {
    const config = createTestConfig({
      useNumericMultiCharHints: false,
    });
    const core = Core.getInstance(config);

    // 0-9の数値
    const numericChars = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    for (const char of numericChars) {
      const result = core.validateInputChar(char);
      assertEquals(result, false, `Numeric "${char}" should be invalid when useNumericMultiCharHints is false`);
    }
  });
});

Deno.test("process50 sub4: validateInputChar - 空文字列と特殊ケース", async (t) => {
  await t.step("空文字列の場合、falseを返す", () => {
    const config = createTestConfig();
    const core = Core.getInstance(config);

    const result = core.validateInputChar("");
    assertEquals(result, false, "Empty string should be invalid");
  });

  await t.step("複数文字の場合、最初の文字のみで検証する", () => {
    const config = createTestConfig({
      singleCharKeys: ["a"],
    });
    const core = Core.getInstance(config);

    // 複数文字の文字列の場合
    const result = core.validateInputChar("abc");
    // 実装により異なるが、通常は最初の文字'a'で検証されるべき
    // ここでは実装に応じて調整が必要
    assertEquals(result, true, "Multi-char string 'abc' should validate first char 'a'");
  });

  await t.step("スペース文字の場合、設定に応じて検証する", () => {
    const config = createTestConfig({
      singleCharKeys: [" "],
    });
    const core = Core.getInstance(config);

    const result = core.validateInputChar(" ");
    assertEquals(result, true, "Space should be valid if included in singleCharKeys");
  });
});

Deno.test("process50 sub4: validateInputChar - 複雑な設定での検証", async (t) => {
  await t.step("singleCharKeys と multiCharKeys の両方に文字がある場合", () => {
    const config = createTestConfig({
      singleCharKeys: ["a", "s", "d", "f"],
      multiCharKeys: ["g", "h", "j", "k"],
    });
    const core = Core.getInstance(config);

    // 両方のキーセットからの文字
    const allValidChars = ["a", "s", "d", "f", "g", "h", "j", "k"];
    for (const char of allValidChars) {
      const result = core.validateInputChar(char);
      assertEquals(result, true, `"${char}" should be valid`);
    }

    // 無効な文字
    const invalidChars = ["x", "y", "z"];
    for (const char of invalidChars) {
      const result = core.validateInputChar(char);
      assertEquals(result, false, `"${char}" should be invalid`);
    }
  });

  await t.step("カスタムキーセットでの検証", () => {
    const config = createTestConfig({
      singleCharKeys: ["q", "w", "e", "r"],
      multiCharKeys: ["t", "y", "u", "i"],
      useNumericMultiCharHints: true,
    });
    const core = Core.getInstance(config);

    // 有効な文字（アルファベット + 数値）
    const validChars = ["q", "w", "e", "r", "t", "y", "u", "i", "0", "5", "9"];
    for (const char of validChars) {
      const result = core.validateInputChar(char);
      assertEquals(result, true, `"${char}" should be valid`);
    }

    // 無効な文字
    const invalidChars = ["a", "s", "d", "f"];
    for (const char of invalidChars) {
      const result = core.validateInputChar(char);
      assertEquals(result, false, `"${char}" should be invalid`);
    }
  });
});

Deno.test("process50 sub4: validateInputChar - エッジケース", async (t) => {
  await t.step("singleCharKeys/multiCharKeysが空配列の場合", () => {
    const config = createTestConfig({
      singleCharKeys: [],
      multiCharKeys: [],
      useNumericMultiCharHints: false,
    });
    const core = Core.getInstance(config);

    // すべての文字が無効
    const testChars = ["a", "b", "1", "2"];
    for (const char of testChars) {
      const result = core.validateInputChar(char);
      assertEquals(result, false, `"${char}" should be invalid when no keys are configured`);
    }
  });

  await t.step("重複したキー設定がある場合", () => {
    const config = createTestConfig({
      singleCharKeys: ["a", "a", "b"],
      multiCharKeys: ["b", "c"],
    });
    const core = Core.getInstance(config);

    // 重複キーでも正しく検証される
    const result1 = core.validateInputChar("a");
    assertEquals(result1, true, "'a' should be valid");

    const result2 = core.validateInputChar("b");
    assertEquals(result2, true, "'b' should be valid (appears in both)");

    const result3 = core.validateInputChar("c");
    assertEquals(result3, true, "'c' should be valid");
  });

  await t.step("nullやundefinedの入力に対する堅牢性", () => {
    const config = createTestConfig();
    const core = Core.getInstance(config);

    // TypeScriptの型システムでは防がれるが、実行時の安全性を確認
    // @ts-ignore - 意図的にnullを渡してテスト
    const resultNull = core.validateInputChar(null);
    assertEquals(resultNull, false, "null should be invalid");

    // @ts-ignore - 意図的にundefinedを渡してテスト
    const resultUndefined = core.validateInputChar(undefined);
    assertEquals(resultUndefined, false, "undefined should be invalid");
  });
});
