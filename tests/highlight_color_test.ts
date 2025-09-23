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
  assertEquals(defaultConfig.highlight_hint_marker, "DiffAdd");
  assertEquals(defaultConfig.highlight_hint_marker_current, "DiffText");
});

Deno.test("ハイライト色設定: カスタム値の設定テスト", () => {
  const customConfig: Partial<Config> = {
    highlight_hint_marker: "Search",
    highlight_hint_marker_current: "IncSearch",
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
      highlight_hint_marker: group,
      highlight_hint_marker_current: group,
    };

    const validation = validateConfig(config);
    assertEquals(validation.valid, true, `${group} should be valid`);
  }
});

Deno.test("ハイライト色設定: 無効な型のテスト", () => {
  // highlight_hint_marker が数値の場合
  const invalidConfig1: any = {
    highlight_hint_marker: 123,
  };

  const validation1 = validateConfig(invalidConfig1);
  assertEquals(validation1.valid, false);
  assertEquals(
    validation1.errors.some((e: string) => e.includes("highlight_hint_marker must be a string")),
    true,
  );

  // highlight_hint_marker_current が配列の場合
  const invalidConfig2: any = {
    highlight_hint_marker_current: ["Search", "IncSearch"],
  };

  const validation2 = validateConfig(invalidConfig2);
  assertEquals(validation2.valid, false);
  assertEquals(
    validation2.errors.some((e: string) => e.includes("highlight_hint_marker_current must be a string")),
    true,
  );

  // highlight_hint_marker が空文字列の場合
  const invalidConfig3: Partial<Config> = {
    highlight_hint_marker: "",
  };

  const validation3 = validateConfig(invalidConfig3);
  assertEquals(validation3.valid, false);
  assertEquals(
    validation3.errors.some((e: string) => e.includes("highlight_hint_marker must be a non-empty string")),
    true,
  );
});

Deno.test("ハイライト色設定: null と undefined のテスト", () => {
  // null 値のテスト
  const nullConfig: any = {
    highlight_hint_marker: null,
    highlight_hint_marker_current: null,
  };

  const validation1 = validateConfig(nullConfig);
  assertEquals(validation1.valid, false);
  assertEquals(validation1.errors.length >= 2, true);

  // undefined 値のテスト（設定なしの場合は有効）
  const undefinedConfig: Partial<Config> = {
    highlight_hint_marker: undefined,
    highlight_hint_marker_current: undefined,
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
    const config: Partial<Config> = {
      highlight_hint_marker: invalidName,
    };

    const validation = validateConfig(config);
    assertEquals(validation.valid, false, `${invalidName} should be invalid`);
    assertEquals(
      validation.errors.some((e: string) =>
        e.includes(
          "highlight_hint_marker must contain only alphanumeric characters and underscores",
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
      highlight_hint_marker: validName,
      highlight_hint_marker_current: validName,
    };

    const validation = validateConfig(config);
    assertEquals(validation.valid, true, `${validName} should be valid`);
  }
});

Deno.test("ハイライト色設定: 長すぎる名前のテスト", () => {
  // 100文字以上の名前（通常のVimハイライトグループ名としては長すぎる）
  const tooLongName = "a".repeat(101);

  const config: Partial<Config> = {
    highlight_hint_marker: tooLongName,
  };

  const validation = validateConfig(config);
  assertEquals(validation.valid, false);
  assertEquals(
    validation.errors.some((e) =>
      e.includes("highlight_hint_marker must be 100 characters or less")
    ),
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
    const config: Partial<Config> = {
      highlight_hint_marker: invalidName,
    };

    const validation = validateConfig(config);
    assertEquals(validation.valid, false, `${invalidName} should be invalid`);
    assertEquals(
      validation.errors.some((e: string) =>
        e.includes("highlight_hint_marker must start with a letter or underscore")
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
      highlight_hint_marker: validName,
      highlight_hint_marker_current: validName,
    };

    const validation = validateConfig(config);
    assertEquals(validation.valid, true, `${validName} should be valid`);
  }
});

Deno.test("ハイライト色設定: 複合設定のテスト", () => {
  // 他の設定と組み合わせたテスト
  const complexConfig: Partial<Config> = {
    markers: ["A", "B", "C"],
    motion_count: 5,
    motion_timeout: 3000,
    hint_position: "overlay",
    trigger_on_hjkl: false,
    enabled: true,
    highlight_hint_marker: "MyCustomMarker",
    highlight_hint_marker_current: "MyCustomMarkerCurrent",
    use_numbers: true,
    highlight_selected: true,
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
  assertEquals(defaultConfig.highlight_hint_marker, "DiffAdd");
  assertEquals(defaultConfig.highlight_hint_marker_current, "DiffText");
});
