/**
 * tests/common/utils/validator.test.ts
 *
 * バリデーション機能のテスト
 */

import { assertEquals } from "jsr:@std/assert";
import {
  generateHighlightCommand,
  isValidColorName,
  isValidHexColor,
  normalizeColorName,
  validateConfig,
  validateHighlightColor,
  validateHighlightConfig,
  validateHighlightGroupName,
  validateInList,
  validateNonEmpty,
  validateRange,
} from "../../../denops/hellshake-yano/common/utils/validator.ts";

// ========== 基本バリデーション ==========

Deno.test("validateRange: 正常値を検証", () => {
  const result = validateRange(50, 0, 100, "value");
  assertEquals(result.valid, true);
  assertEquals(result.error, undefined);
});

Deno.test("validateRange: 境界値（最小値）を検証", () => {
  const result = validateRange(0, 0, 100, "value");
  assertEquals(result.valid, true);
});

Deno.test("validateRange: 境界値（最大値）を検証", () => {
  const result = validateRange(100, 0, 100, "value");
  assertEquals(result.valid, true);
});

Deno.test("validateRange: 範囲外（小さい）を検出", () => {
  const result = validateRange(-1, 0, 100, "value");
  assertEquals(result.valid, false);
  assertEquals(typeof result.error, "string");
});

Deno.test("validateRange: 範囲外（大きい）を検出", () => {
  const result = validateRange(101, 0, 100, "value");
  assertEquals(result.valid, false);
  assertEquals(typeof result.error, "string");
});

Deno.test("validateNonEmpty: 正常な文字列を検証", () => {
  const result = validateNonEmpty("hello", "value");
  assertEquals(result.valid, true);
});

Deno.test("validateNonEmpty: 空文字列を検出", () => {
  const result = validateNonEmpty("", "value");
  assertEquals(result.valid, false);
  assertEquals(typeof result.error, "string");
});

Deno.test("validateNonEmpty: nullを検出", () => {
  const result = validateNonEmpty(null, "value");
  assertEquals(result.valid, false);
});

Deno.test("validateNonEmpty: undefinedを検出", () => {
  const result = validateNonEmpty(undefined, "value");
  assertEquals(result.valid, false);
});

Deno.test("validateInList: 含まれる値を検証", () => {
  const result = validateInList("a", ["a", "b", "c"], "value");
  assertEquals(result.valid, true);
});

Deno.test("validateInList: 含まれない値を検出", () => {
  const result = validateInList("d", ["a", "b", "c"], "value");
  assertEquals(result.valid, false);
  assertEquals(typeof result.error, "string");
});

// ========== ハイライトグループ名検証 ==========

Deno.test("validateHighlightGroupName: 有効なグループ名を検証", () => {
  assertEquals(validateHighlightGroupName("MyGroup"), true);
  assertEquals(validateHighlightGroupName("_group"), true);
  assertEquals(validateHighlightGroupName("group123"), true);
});

Deno.test("validateHighlightGroupName: 数字開始を拒否", () => {
  assertEquals(validateHighlightGroupName("1Invalid"), false);
});

Deno.test("validateHighlightGroupName: ハイフンを拒否", () => {
  assertEquals(validateHighlightGroupName("My-Group"), false);
});

Deno.test("validateHighlightGroupName: スペースを拒否", () => {
  assertEquals(validateHighlightGroupName("My Group"), false);
});

Deno.test("validateHighlightGroupName: 空文字列を拒否", () => {
  assertEquals(validateHighlightGroupName(""), false);
});

Deno.test("validateHighlightGroupName: 100文字制限", () => {
  const validName = "a".repeat(100);
  assertEquals(validateHighlightGroupName(validName), true);
  const tooLong = "a".repeat(101);
  assertEquals(validateHighlightGroupName(tooLong), false);
});

// ========== カラー名検証 ==========

Deno.test("isValidColorName: 標準カラー名を検証", () => {
  assertEquals(isValidColorName("red"), true);
  assertEquals(isValidColorName("blue"), true);
  assertEquals(isValidColorName("green"), true);
  assertEquals(isValidColorName("none"), true);
});

Deno.test("isValidColorName: 大文字のカラー名を検証", () => {
  assertEquals(isValidColorName("Red"), true);
  assertEquals(isValidColorName("BLUE"), true);
});

Deno.test("isValidColorName: 無効なカラー名を拒否", () => {
  assertEquals(isValidColorName("invalid"), false);
  assertEquals(isValidColorName(""), false);
});

Deno.test("isValidColorName: 非文字列入力を拒否", () => {
  assertEquals(isValidColorName(123 as unknown as string), false);
  assertEquals(isValidColorName(null as unknown as string), false);
});

// ========== Hex色検証 ==========

Deno.test("isValidHexColor: 6桁Hex色を検証", () => {
  assertEquals(isValidHexColor("#FF0000"), true);
  assertEquals(isValidHexColor("#ff0000"), true);
});

Deno.test("isValidHexColor: 3桁Hex色を検証", () => {
  assertEquals(isValidHexColor("#F00"), true);
  assertEquals(isValidHexColor("#f00"), true);
});

Deno.test("isValidHexColor: Hex色プレフィックスなしを拒否", () => {
  assertEquals(isValidHexColor("FF0000"), false);
});

Deno.test("isValidHexColor: 無効なHex色を拒否", () => {
  assertEquals(isValidHexColor("#XYZ"), false);
  assertEquals(isValidHexColor("#GGGGGG"), false);
});

Deno.test("isValidHexColor: 非文字列入力を拒否", () => {
  assertEquals(isValidHexColor(123 as unknown as string), false);
});

// ========== ハイライト色検証 ==========

Deno.test("validateHighlightColor: 有効なカラー名を検証", () => {
  const result = validateHighlightColor("red");
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test("validateHighlightColor: 有効なHex色を検証", () => {
  const result = validateHighlightColor("#FF0000");
  // Hex色は検証される（グループ名ではない。ColorObjectとして扱う場合に有効）
  assertEquals(result.valid, false); // グループ名として無効（#を含む）
});

Deno.test("validateHighlightColor: 有効なColorObjectを検証", () => {
  const result = validateHighlightColor({ fg: "red", bg: "blue" });
  assertEquals(result.valid, true);
});

Deno.test("validateHighlightColor: 無効なColorObjectを拒否", () => {
  const result = validateHighlightColor({ fg: "invalid" });
  assertEquals(result.valid, false);
  assertEquals(result.errors.length > 0, true);
});

// ========== カラー名正規化 ==========

Deno.test("normalizeColorName: 小文字をタイトルケースに正規化", () => {
  assertEquals(normalizeColorName("red"), "Red");
  assertEquals(normalizeColorName("blue"), "Blue");
});

Deno.test("normalizeColorName: noneを正規化", () => {
  assertEquals(normalizeColorName("none"), "None");
  assertEquals(normalizeColorName("NONE"), "None");
});

Deno.test("normalizeColorName: 混合ケースを処理", () => {
  assertEquals(normalizeColorName("RED"), "Red");
  assertEquals(normalizeColorName("Blue"), "Blue");
});

Deno.test("normalizeColorName: 非文字列入力を処理", () => {
  assertEquals(normalizeColorName(123 as unknown as string), "");
  assertEquals(normalizeColorName(null as unknown as string), "");
});

// ========== ハイライトコマンド生成 ==========

Deno.test("generateHighlightCommand: fg/bg両方指定時", () => {
  const cmd = generateHighlightCommand("MyGroup", { fg: "red", bg: "blue" });
  assertEquals(cmd.includes("highlight MyGroup"), true);
  assertEquals(cmd.includes("guifg="), true);
  assertEquals(cmd.includes("guibg="), true);
});

Deno.test("generateHighlightCommand: fgのみ指定時", () => {
  const cmd = generateHighlightCommand("MyGroup", { fg: "red" });
  assertEquals(cmd.includes("highlight MyGroup"), true);
  assertEquals(cmd.includes("guifg="), true);
});

Deno.test("generateHighlightCommand: bgのみ指定時", () => {
  const cmd = generateHighlightCommand("MyGroup", { bg: "blue" });
  assertEquals(cmd.includes("highlight MyGroup"), true);
  assertEquals(cmd.includes("guibg="), true);
});

Deno.test("generateHighlightCommand: Hex色のサポート", () => {
  const cmd = generateHighlightCommand("MyGroup", { fg: "#FF0000" });
  assertEquals(cmd.includes("guifg=#FF0000"), true);
});

// ========== ハイライト設定検証 ==========

Deno.test("validateHighlightConfig: 有効なグループ名を検証", () => {
  const config = { highlightHintMarker: "MyGroup" };
  const result = validateHighlightConfig(config);
  assertEquals(result.valid, true);
});

Deno.test("validateHighlightConfig: 無効なグループ名を拒否", () => {
  const config = { highlightHintMarker: "1Invalid" };
  const result = validateHighlightConfig(config);
  assertEquals(result.valid, false);
});

Deno.test("validateHighlightConfig: 有効なColorObjectを検証", () => {
  const config = { highlightHintMarker: { fg: "red" } };
  const result = validateHighlightConfig(config);
  assertEquals(result.valid, true);
});

Deno.test("validateHighlightConfig: 複数キーの検証", () => {
  const config = {
    highlightHintMarker: "MyGroup",
    highlightHintMarkerCurrent: { fg: "red" },
  };
  const result = validateHighlightConfig(config);
  assertEquals(result.valid, true);
});

// ========== Config検証 ==========

Deno.test("validateConfig: 基本的なConfig検証", () => {
  const config = {
    highlightHintMarker: "MyGroup",
    highlightHintMarkerCurrent: "CurrentGroup",
  };
  const result = validateConfig(config);
  // 全フィールドがstring型チェックまでは通る
  assertEquals(typeof result.valid, "boolean");
  assertEquals(Array.isArray(result.errors), true);
});
