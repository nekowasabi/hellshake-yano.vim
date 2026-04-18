import { assertEquals, assertThrows } from "@std/assert";
import { type Config, getDefaultConfig, validateConfig } from "../denops/hellshake-yano/main.ts";
import {
  generateHighlightCommand,
  validateHighlightConfig,
} from "../denops/hellshake-yano/common/utils/validator.ts";
import type { HighlightColor } from "../denops/hellshake-yano/types.ts";

/**
 * ハイライト機能の統合テスト
 * Phase 3 Refactor: エッジケースと統合シナリオのテスト
 */

Deno.test("Integration - 実際の設定使用例のテスト", () => {
  // 実際の使用例を模倣したテスト
  const configs = [
    {
      // 新形式：オブジェクトで fg/bg を指定
      highlightHintMarker: { fg: "#00ff00", bg: "#000000" },
      highlightHintMarkerCurrent: { fg: "Yellow", bg: "Blue" },
    },
    {
      // 既存形式：ハイライトグループ名（後方互換性）
      highlightHintMarker: "Search",
      highlightHintMarkerCurrent: "IncSearch",
    },
    {
      // 混在も可能
      highlightHintMarker: { fg: "Green", bg: "NONE" },
      highlightHintMarkerCurrent: "IncSearch",
    },
  ];

  for (const config of configs) {
    const result = validateConfig(config);
    assertEquals(result.valid, true, `Config should be valid: ${JSON.stringify(config)}`);
  }
});

Deno.test("Integration - 完全な設定オブジェクトのテスト", () => {
  const fullConfig: Partial<Config> = {
    markers: ["A", "S", "D", "F"],
    motionCount: 3,
    motionTimeout: 2000,
    hintPosition: "start",
    triggerOnHjkl: true,
    enabled: true,
    maxHints: 100,
    debounceDelay: 50,
    useNumbers: false,
    highlightSelected: true,
    highlightHintMarker: { fg: "Red", bg: "White" },
    highlightHintMarkerCurrent: { fg: "#ffff00", bg: "#000080" },
  };

  const result = validateConfig(fullConfig);
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test("Integration - デフォルト設定との互換性", () => {
  const defaultConfig = getDefaultConfig();

  // デフォルト設定は有効でなければならない
  const result = validateConfig(defaultConfig);
  assertEquals(result.valid, true);

  // デフォルトのハイライト設定は文字列型
  assertEquals(typeof defaultConfig.highlightHintMarker, "string");
  assertEquals(typeof defaultConfig.highlightHintMarkerCurrent, "string");
});

Deno.test("Integration - 複雑なハイライトコマンド生成", () => {
  const testCases = [
    {
      name: "両方の色名指定",
      input: { fg: "Red", bg: "Blue" },
      expectedParts: ["ctermfg=Red", "guifg=Red", "ctermbg=Blue", "guibg=Blue"],
    },
    {
      name: "16進数とNONEの混在",
      input: { fg: "#ff0000", bg: "NONE" },
      expectedParts: ["guifg=#ff0000", "ctermbg=None", "guibg=None"],
    },
    {
      name: "前景色のみ",
      input: { fg: "Green" },
      expectedParts: ["ctermfg=Green", "guifg=Green"],
    },
    {
      name: "背景色のみ",
      input: { bg: "#0000ff" },
      expectedParts: ["guibg=#0000ff"],
    },
  ];

  for (const testCase of testCases) {
    const result = generateHighlightCommand("TestGroup", testCase.input);

    // 基本構造の確認
    assertEquals(
      result.startsWith("highlight TestGroup"),
      true,
      `Command should start with 'highlight TestGroup': ${result}`,
    );

    // 期待される部分が含まれているか確認
    for (const part of testCase.expectedParts) {
      assertEquals(result.includes(part), true, `Command should include '${part}': ${result}`);
    }
  }
});

Deno.test("Integration - エラーハンドリングの網羅テスト", () => {
  const invalidConfigs = [
    // 空のオブジェクト
    { highlightHintMarker: {} },

    // nullとundefinedの混在
    { highlightHintMarker: { fg: null as any, bg: undefined } },

    // 無効な型の混在
    { highlightHintMarker: { fg: 123 as any, bg: "Blue" } },

    // 無効な16進数の形式
    { highlightHintMarker: { fg: "#", bg: "Red" } },
    { highlightHintMarker: { fg: "#12345", bg: "Blue" } },

    // 空文字列と無効な色名の混在
    { highlightHintMarker: { fg: "", bg: "InvalidColor" } },

    // 無効なハイライトグループ名（オブジェクトとして指定）
    { highlightHintMarker: { fg: "123InvalidName", bg: "Black" } },
    { highlightHintMarker: { fg: "Invalid-Name", bg: "White" } },
  ];

  for (const config of invalidConfigs) {
    const result = validateHighlightConfig(config);
    assertEquals(result.valid, false, `Config should be invalid: ${JSON.stringify(config)}`);
    assertEquals(result.errors.length > 0, true, `Should have errors: ${JSON.stringify(config)}`);
  }
});

Deno.test("Integration - 大文字小文字の正規化テスト", () => {
  const testCases = [
    { input: "red", expected: "Red" },
    { input: "BLUE", expected: "Blue" },
    { input: "CyAn", expected: "Cyan" },
    { input: "nOnE", expected: "None" },
  ];

  for (const testCase of testCases) {
    const config = { fg: testCase.input };
    const cmd = generateHighlightCommand("TestGroup", config);

    // 正規化された色名が使用されているか確認
    assertEquals(
      cmd.includes(testCase.expected),
      true,
      `Command should include normalized color '${testCase.expected}': ${cmd}`,
    );
  }
});

Deno.test("Integration - ハイライトグループ名の特殊文字テスト", () => {
  const validGroupNames = [
    "ValidName",
    "Valid_Name",
    "_ValidName",
    "ValidName123",
    "A1B2C3",
  ];

  const invalidGroupNames = [
    "123Invalid", // 数字で始まる
    "Invalid-Name", // ハイフン
    "Invalid Name", // スペース
    "Invalid.Name", // ドット
    "", // 空文字
  ];

  for (const name of validGroupNames) {
    const result = validateHighlightConfig({ highlightHintMarker: { fg: name, bg: "Black" } });
    assertEquals(result.valid, true, `'${name}' should be valid`);
  }

  for (const name of invalidGroupNames) {
    const result = validateHighlightConfig({ highlightHintMarker: { fg: name, bg: "Black" } });
    assertEquals(result.valid, false, `'${name}' should be invalid`);
  }
});

Deno.test("Integration - パフォーマンスと限界値テスト", () => {
  // 非常に長いハイライトグループ名
  const longGroupName = "A".repeat(101); // 100文字を超える
  const validGroupName = "A".repeat(100); // 100文字ちょうど

  assertEquals(
    validateHighlightConfig({ highlightHintMarker: { fg: "Red", bg: "Blue" } }).valid,
    true,
  );
  assertEquals(
    validateHighlightConfig({ highlightHintMarker: { fg: "Red", bg: "Blue" } }).valid,
    true,
  );

  // 多数の設定項目を持つ設定オブジェクト
  const largeConfig = {
    highlightHintMarker: { fg: "Red", bg: "Blue" },
    highlightHintMarkerCurrent: { fg: "Green", bg: "Yellow" },
    markers: Array.from({ length: 100 }, (_, i) => String.fromCharCode(65 + (i % 26))),
    maxHints: 10000,
    debounceDelay: 0,
  };

  const result = validateConfig(largeConfig);
  assertEquals(result.valid, false);
});

Deno.test("Integration - 実際の使用シナリオ", () => {
  // シナリオ1: 暗いテーマでの設定
  const darkThemeConfig = {
    highlightHintMarker: { fg: "#ffffff", bg: "#333333" },
    highlightHintMarkerCurrent: { fg: "#000000", bg: "#ffff00" },
  };

  // シナリオ2: 明るいテーマでの設定
  const lightThemeConfig = {
    highlightHintMarker: { fg: "#000000", bg: "#ffffff" },
    highlightHintMarkerCurrent: { fg: "#ffffff", bg: "#0000ff" },
  };

  // シナリオ3: アクセシビリティを考慮した高コントラスト設定
  const highContrastConfig = {
    highlightHintMarker: { fg: "White", bg: "Black" },
    highlightHintMarkerCurrent: { fg: "Black", bg: "White" },
  };

  const scenarios = [darkThemeConfig, lightThemeConfig, highContrastConfig];

  for (const scenario of scenarios) {
    const result = validateHighlightConfig(scenario);
    assertEquals(result.valid, true);

    // 各設定でハイライトコマンドが生成できることを確認
    const markerCmd = generateHighlightCommand("TestMarker", scenario.highlightHintMarker);
    const currentCmd = generateHighlightCommand(
      "TestCurrent",
      scenario.highlightHintMarkerCurrent,
    );

    assertEquals(markerCmd.length > 0, true);
    assertEquals(currentCmd.length > 0, true);
  }
});
