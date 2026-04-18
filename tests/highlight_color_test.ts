import { assertEquals, assertThrows } from "@std/assert";
import type { Config } from "../denops/hellshake-yano/types.ts";
import { getDefaultConfig, validateConfig } from "../denops/hellshake-yano/main.ts";

/**
 * ハイライト色設定機能のテスト
 * Process 50 Sub5: カスタムハイライト色設定
 */

Deno.test("ハイライト色設定: デフォルト値のテスト", () => {
  const defaultConfig = getDefaultConfig();

  // デフォルト値の確認
  assertEquals(defaultConfig.highlightHintMarker, "DiffAdd");
  assertEquals(defaultConfig.highlightHintMarkerCurrent, "DiffText");
});

Deno.test("ハイライト色設定: カスタム値の設定テスト", () => {
  const customConfig: Partial<Config> = {
    highlightHintMarker: "Search",
    highlightHintMarkerCurrent: "IncSearch",
  };

  const validation = validateConfig(customConfig);
  assertEquals(validation.valid, true);
  assertEquals(validation.errors.length, 0);
});

Deno.test("ハイライト色設定: 有効なハイライトグループ名のテスト", () => {
  const validHighlightGroups = [
    "Search",
    "IncSearch",
    "Visual",
    "DiffAdd",
    "DiffChange",
    "DiffDelete",
    "DiffText",
    "ErrorMsg",
    "WarningMsg",
    "Question",
    "Title",
    "MoreMsg",
    "ModeMsg",
    "NonText",
    "SpecialKey",
    "Directory",
    "LineNr",
    "CursorLine",
    "CursorColumn",
    "ColorColumn",
    "SignColumn",
    "VertSplit",
    "StatusLine",
    "StatusLineNC",
    "WildMenu",
    "Pmenu",
    "PmenuSel",
    "PmenuSbar",
    "PmenuThumb",
    "TabLine",
    "TabLineSel",
    "TabLineFill",
    "MatchParen",
    "Comment",
    "Constant",
    "String",
    "Character",
    "Number",
    "Boolean",
    "Float",
    "Identifier",
    "Function",
    "Statement",
    "Conditional",
    "Repeat",
    "Label",
    "Operator",
    "Keyword",
    "Exception",
    "PreProc",
    "Include",
    "Define",
    "Macro",
    "PreCondit",
    "Type",
    "StorageClass",
    "Structure",
    "Typedef",
    "Special",
    "SpecialChar",
    "Tag",
    "Delimiter",
    "SpecialComment",
    "Debug",
    "Underlined",
    "Ignore",
    "Error",
    "Todo",
  ];

  // 各有効なハイライトグループ名をテスト
  for (const group of validHighlightGroups) {
    const config: Partial<Config> = {
      highlightHintMarker: group,
      highlightHintMarkerCurrent: group,
    };

    const validation = validateConfig(config);
    assertEquals(validation.valid, true, `${group} should be valid`);
  }
});

Deno.test("ハイライト色設定: 無効な型のテスト", () => {
  // highlightHintMarker が数値の場合
  const invalidConfig1: any = { highlightHintMarker: 123 };

  const validation1 = validateConfig(invalidConfig1);
  assertEquals(validation1.valid, false);
  assertEquals(
    validation1.errors.some((e) => e.includes("highlightHintMarker must be a string")),
    true,
  );

  // highlightHintMarkerCurrent が配列の場合
  const invalidConfig2: any = { highlightHintMarkerCurrent: ["Search", "IncSearch"] };

  const validation2 = validateConfig(invalidConfig2);
  assertEquals(validation2.valid, false);
  assertEquals(
    validation2.errors.some((e) => e.includes("highlightHintMarkerCurrent must be a string")),
    true,
  );

  // highlightHintMarker が空文字列の場合
  const invalidConfig3: Partial<Config> = { highlightHintMarker: "" };

  const validation3 = validateConfig(invalidConfig3);
  assertEquals(validation3.valid, false);
  assertEquals(
    validation3.errors.some((e) => e.includes("highlightHintMarker must be a non-empty string")),
    true,
  );
});

Deno.test("ハイライト色設定: null と undefined のテスト", () => {
  // null 値のテスト
  const nullConfig: any = { highlightHintMarker: null, highlightHintMarkerCurrent: null };

  const validation1 = validateConfig(nullConfig);
  assertEquals(validation1.valid, false);
  assertEquals(validation1.errors.length >= 2, true);

  // undefined 値のテスト（設定なしの場合は有効）
  const undefinedConfig: Partial<Config> = {
    highlightHintMarker: undefined,
    highlightHintMarkerCurrent: undefined,
  };

  const validation2 = validateConfig(undefinedConfig);
  assertEquals(validation2.valid, true); // undefinedは設定なしを意味するので有効
});

Deno.test("ハイライト色設定: 特殊文字を含む無効な名前のテスト", () => {
  const invalidNames = [
    "Search-Invalid",
    "Search Invalid",
    "Search@Invalid",
    "Search#Invalid",
    "Search$Invalid",
    "Search%Invalid",
    "Search^Invalid",
    "Search&Invalid",
    "Search*Invalid",
    "Search(Invalid)",
    "Search[Invalid]",
    "Search{Invalid}",
    "Search|Invalid",
    "Search\\Invalid",
    "Search/Invalid",
    "Search<Invalid>",
    "Search,Invalid",
    "Search.Invalid",
    "Search?Invalid",
    "Search:Invalid",
    "Search;Invalid",
    "Search'Invalid",
    'Search"Invalid',
    "Search`Invalid",
    "Search~Invalid",
    "Search!Invalid",
    "Search+Invalid",
    "Search=Invalid",
  ];

  for (const invalidName of invalidNames) {
    const config: Partial<Config> = { highlightHintMarker: invalidName };

    const validation = validateConfig(config);
    assertEquals(validation.valid, false, `${invalidName} should be invalid`);
    assertEquals(
      validation.errors.some((e) =>
        e.includes(
          "highlightHintMarker must contain only alphanumeric characters and underscores",
        )
      ),
      true,
    );
  }
});

Deno.test("ハイライト色設定: 有効な名前のパターンテスト", () => {
  const validNames = [
    "Search",
    "IncSearch",
    "MyCustomHighlight",
    "Custom123",
    "highlight_group",
    "HIGHLIGHT_GROUP",
    "Highlight123Group",
    "A",
    "a",
    "Z",
    "z",
    "ABC123_def",
    "group_1",
    "Group2",
    "my_custom_highlight_123",
  ];

  for (const validName of validNames) {
    const config: Partial<Config> = {
      highlightHintMarker: validName,
      highlightHintMarkerCurrent: validName,
    };

    const validation = validateConfig(config);
    assertEquals(validation.valid, true, `${validName} should be valid`);
  }
});

Deno.test("ハイライト色設定: 長すぎる名前のテスト", () => {
  // 100文字以上の名前（通常のVimハイライトグループ名としては長すぎる）
  const tooLongName = "a".repeat(101);

  const config: Partial<Config> = { highlightHintMarker: tooLongName };

  const validation = validateConfig(config);
  assertEquals(validation.valid, false);
  assertEquals(
    validation.errors.some((e) => e.includes("highlightHintMarker must be 100 characters or less")),
    true,
  );
});

Deno.test("ハイライト色設定: 数字で始まる無効な名前のテスト", () => {
  const invalidNames = [
    "1Search",
    "2IncSearch",
    "123Group",
    "9CustomHighlight",
  ];

  for (const invalidName of invalidNames) {
    const config: Partial<Config> = { highlightHintMarker: invalidName };

    const validation = validateConfig(config);
    assertEquals(validation.valid, false, `${invalidName} should be invalid`);
    assertEquals(
      validation.errors.some((e) =>
        e.includes("highlightHintMarker must start with a letter or underscore")
      ),
      true,
    );
  }
});

Deno.test("ハイライト色設定: アンダースコアで始まる有効な名前のテスト", () => {
  const validNames = [
    "_Search",
    "_IncSearch",
    "_CustomHighlight",
    "_123Group",
    "__double_underscore",
  ];

  for (const validName of validNames) {
    const config: Partial<Config> = {
      highlightHintMarker: validName,
      highlightHintMarkerCurrent: validName,
    };

    const validation = validateConfig(config);
    assertEquals(validation.valid, true, `${validName} should be valid`);
  }
});

Deno.test("ハイライト色設定: 複合設定のテスト", () => {
  // 他の設定と組み合わせたテスト
  const complexConfig: Partial<Config> = {
    markers: ["A", "B", "C"],
    motionCount: 5,
    motionTimeout: 3000,
    hintPosition: "end",
    triggerOnHjkl: false,
    enabled: true,
    highlightHintMarker: "MyCustomMarker",
    highlightHintMarkerCurrent: "MyCustomMarkerCurrent",
    useNumbers: true,
    highlightSelected: true,
  };

  const validation = validateConfig(complexConfig);
  assertEquals(validation.valid, true);
  assertEquals(validation.errors.length, 0);
});

Deno.test("ハイライト色設定: デフォルト設定との整合性テスト", () => {
  const defaultConfig = getDefaultConfig();

  // デフォルト設定が自分自身の検証を通ることを確認
  const validation = validateConfig(defaultConfig);
  assertEquals(validation.valid, true);
  assertEquals(validation.errors.length, 0);

  // デフォルトのハイライト色が vim-searchx と同じことを確認
  assertEquals(defaultConfig.highlightHintMarker, "DiffAdd");
  assertEquals(defaultConfig.highlightHintMarkerCurrent, "DiffText");
});
