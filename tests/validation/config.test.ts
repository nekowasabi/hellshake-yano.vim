import { assertEquals } from "https://deno.land/std@0.200.0/assert/mod.ts";
import { validateConfig, getMinLengthForKey, getMotionCountForKey, normalizeBackwardCompatibleFlags, normalizeColorName, generateHighlightCommand, validateHighlightConfig } from "../../denops/hellshake-yano/validation/config.ts";
import type { Config } from "../../denops/hellshake-yano/types.ts";

Deno.test("validateConfig - 正常な設定値", async (t) => {
  await t.step("すべての設定が正常な場合", () => {
    const config: Partial<Config> = {
      motion_count: 2,
      motion_timeout: 1000,
      hint_position: "start",
      markers: ["a", "b", "c"],
      use_numbers: true,
      maxHints: 100,
      debounceDelay: 0,
      highlight_selected: true,
      debug_coordinates: false,
      trigger_on_hjkl: true,
      counted_motions: ["j", "k"],
      enabled: true,
      use_japanese: false
    };

    const result = validateConfig(config);
    assertEquals(result.valid, true);
    assertEquals(result.errors, []);
  });

  await t.step("空の設定オブジェクトの場合", () => {
    const config: Partial<Config> = {};
    const result = validateConfig(config);
    assertEquals(result.valid, true);
    assertEquals(result.errors, []);
  });
});

Deno.test("validateConfig - motion_count バリデーション", async (t) => {
  await t.step("motion_countが文字列の場合", () => {
    const config = { motion_count: "invalid" as any };
    const result = validateConfig(config);
    assertEquals(result.valid, false);
    assertEquals(result.errors, ["motion_count must be a positive integer"]);
  });

  await t.step("motion_countが0の場合", () => {
    const config = { motion_count: 0 };
    const result = validateConfig(config);
    assertEquals(result.valid, false);
    assertEquals(result.errors, ["motion_count must be a positive integer"]);
  });

  await t.step("motion_countが小数の場合", () => {
    const config = { motion_count: 1.5 };
    const result = validateConfig(config);
    assertEquals(result.valid, false);
    assertEquals(result.errors, ["motion_count must be a positive integer"]);
  });

  await t.step("motion_countが正の整数の場合", () => {
    const config = { motion_count: 3 };
    const result = validateConfig(config);
    assertEquals(result.valid, true);
    assertEquals(result.errors, []);
  });
});

Deno.test("validateConfig - motion_timeout バリデーション", async (t) => {
  await t.step("motion_timeoutが100未満の場合", () => {
    const config = { motion_timeout: 50 };
    const result = validateConfig(config);
    assertEquals(result.valid, false);
    assertEquals(result.errors, ["motion_timeout must be at least 100ms"]);
  });

  await t.step("motion_timeoutが文字列の場合", () => {
    const config = { motion_timeout: "invalid" as any };
    const result = validateConfig(config);
    assertEquals(result.valid, false);
    assertEquals(result.errors, ["motion_timeout must be at least 100ms"]);
  });

  await t.step("motion_timeoutが100以上の場合", () => {
    const config = { motion_timeout: 500 };
    const result = validateConfig(config);
    assertEquals(result.valid, true);
    assertEquals(result.errors, []);
  });
});

Deno.test("validateConfig - hint_position バリデーション", async (t) => {
  await t.step("無効なhint_positionの場合", () => {
    const config = { hint_position: "invalid" as any };
    const result = validateConfig(config);
    assertEquals(result.valid, false);
    assertEquals(result.errors, ["hint_position must be one of: start, end, overlay"]);
  });

  await t.step("有効なhint_positionの場合", () => {
    const validPositions = ["start", "end", "overlay"];
    for (const position of validPositions) {
      const config = { hint_position: position as any };
      const result = validateConfig(config);
      assertEquals(result.valid, true, `Failed for position: ${position}`);
      assertEquals(result.errors, []);
    }
  });
});

Deno.test("validateConfig - markers バリデーション", async (t) => {
  await t.step("markersが配列でない場合", () => {
    const config = { markers: "invalid" as any };
    const result = validateConfig(config);
    assertEquals(result.valid, false);
    assertEquals(result.errors, ["markers must be an array"]);
  });

  await t.step("markersが空配列の場合", () => {
    const config = { markers: [] };
    const result = validateConfig(config);
    assertEquals(result.valid, false);
    assertEquals(result.errors, ["markers must not be empty"]);
  });

  await t.step("markersに非文字列要素が含まれる場合", () => {
    const config = { markers: ["a", 123, "c"] as any };
    const result = validateConfig(config);
    assertEquals(result.valid, false);
    assertEquals(result.errors, ["markers must be an array of strings"]);
  });

  await t.step("markersに空文字列が含まれる場合", () => {
    const config = { markers: ["a", "", "c"] };
    const result = validateConfig(config);
    assertEquals(result.valid, false);
    assertEquals(result.errors, ["markers must be an array of strings"]);
  });

  await t.step("markersが有効な文字列配列の場合", () => {
    const config = { markers: ["a", "b", "c"] };
    const result = validateConfig(config);
    assertEquals(result.valid, true);
    assertEquals(result.errors, []);
  });
});

Deno.test("validateConfig - use_numbers バリデーション", async (t) => {
  await t.step("use_numbersがboolean以外の場合", () => {
    const config = { use_numbers: "true" as any };
    const result = validateConfig(config);
    assertEquals(result.valid, false);
    assertEquals(result.errors, ["use_numbers must be a boolean"]);
  });

  await t.step("use_numbersがbooleanの場合", () => {
    for (const value of [true, false]) {
      const config = { use_numbers: value };
      const result = validateConfig(config);
      assertEquals(result.valid, true, `Failed for value: ${value}`);
      assertEquals(result.errors, []);
    }
  });
});

Deno.test("validateConfig - maxHints バリデーション", async (t) => {
  await t.step("maxHintsが0以下の場合", () => {
    const config = { maxHints: 0 };
    const result = validateConfig(config);
    assertEquals(result.valid, false);
    assertEquals(result.errors, ["maxHints must be a positive integer"]);
  });

  await t.step("maxHintsが小数の場合", () => {
    const config = { maxHints: 10.5 };
    const result = validateConfig(config);
    assertEquals(result.valid, false);
    assertEquals(result.errors, ["maxHints must be a positive integer"]);
  });

  await t.step("maxHintsが正の整数の場合", () => {
    const config = { maxHints: 50 };
    const result = validateConfig(config);
    assertEquals(result.valid, true);
    assertEquals(result.errors, []);
  });
});

Deno.test("validateConfig - debounceDelay バリデーション", async (t) => {
  await t.step("debounceDelayが負数の場合", () => {
    const config = { debounceDelay: -1 };
    const result = validateConfig(config);
    assertEquals(result.valid, false);
    assertEquals(result.errors, ["debounceDelay must be a non-negative number"]);
  });

  await t.step("debounceDelayが非負数の場合", () => {
    for (const value of [0, 100, 500]) {
      const config = { debounceDelay: value };
      const result = validateConfig(config);
      assertEquals(result.valid, true, `Failed for value: ${value}`);
      assertEquals(result.errors, []);
    }
  });
});

Deno.test("validateConfig - boolean フィールドのバリデーション", async (t) => {
  const booleanFields = [
    "highlight_selected",
    "debug_coordinates",
    "trigger_on_hjkl",
    "enabled",
    "use_japanese"
  ];

  for (const field of booleanFields) {
    await t.step(`${field}がboolean以外の場合`, () => {
      const config = { [field]: "true" } as any;
      const result = validateConfig(config);
      assertEquals(result.valid, false);
      assertEquals(result.errors, [`${field} must be a boolean`]);
    });

    await t.step(`${field}がbooleanの場合`, () => {
      for (const value of [true, false]) {
        const config = { [field]: value } as any;
        const result = validateConfig(config);
        assertEquals(result.valid, true, `Failed for ${field}: ${value}`);
        assertEquals(result.errors, []);
      }
    });
  }
});

Deno.test("validateConfig - counted_motions バリデーション", async (t) => {
  await t.step("counted_motionsが配列でない場合", () => {
    const config = { counted_motions: "invalid" as any };
    const result = validateConfig(config);
    assertEquals(result.valid, false);
    assertEquals(result.errors, ["counted_motions must be an array"]);
  });

  await t.step("counted_motionsに無効なキーが含まれる場合", () => {
    const config = { counted_motions: ["j", "invalid_key", "k"] };
    const result = validateConfig(config);
    assertEquals(result.valid, false);
    assertEquals(result.errors, ["counted_motions contains invalid key: invalid_key (must be single character strings)"]);
  });

  await t.step("counted_motionsに数値が含まれる場合", () => {
    const config = { counted_motions: ["j", 123, "k"] as any };
    const result = validateConfig(config);
    assertEquals(result.valid, false);
    assertEquals(result.errors, ["counted_motions contains invalid key: 123 (must be single character strings)"]);
  });

  await t.step("counted_motionsが有効な単一文字配列の場合", () => {
    const config = { counted_motions: ["j", "k", "h", "l"] };
    const result = validateConfig(config);
    assertEquals(result.valid, true);
    assertEquals(result.errors, []);
  });

  await t.step("counted_motionsが空配列の場合", () => {
    const config = { counted_motions: [] };
    const result = validateConfig(config);
    assertEquals(result.valid, true);
    assertEquals(result.errors, []);
  });
});

Deno.test("validateConfig - 複数のエラーが発生する場合", () => {
  const config = {
    motion_count: -1,
    motion_timeout: 50,
    hint_position: "invalid" as any,
    markers: [],
    use_numbers: "true" as any,
    maxHints: 0
  };

  const result = validateConfig(config);
  assertEquals(result.valid, false);
  assertEquals(result.errors.length, 6);
  assertEquals(result.errors.includes("motion_count must be a positive integer"), true);
  assertEquals(result.errors.includes("motion_timeout must be at least 100ms"), true);
  assertEquals(result.errors.includes("hint_position must be one of: start, end, overlay"), true);
  assertEquals(result.errors.includes("markers must not be empty"), true);
  assertEquals(result.errors.includes("use_numbers must be a boolean"), true);
  assertEquals(result.errors.includes("maxHints must be a positive integer"), true);
});

Deno.test("getMinLengthForKey - キー別設定とフォールバック", async (t) => {
  await t.step("キー別設定が存在する場合", () => {
    const config: Config = {
      markers: ["A", "B"],
      motion_count: 3,
      motion_timeout: 2000,
      hint_position: "start",
      trigger_on_hjkl: true,
      counted_motions: [],
      enabled: true,
      maxHints: 336,
      debounceDelay: 50,
      use_numbers: false,
      highlight_selected: false,
      debug_coordinates: false,
      highlight_hint_marker: "DiffAdd",
      highlight_hint_marker_current: "DiffText",
      default_motion_count: 3,
      per_key_min_length: { "w": 1, "e": 3 }
    };

    assertEquals(getMinLengthForKey(config, "w"), 1);
    assertEquals(getMinLengthForKey(config, "e"), 3);
  });

  await t.step("default_min_word_lengthが設定されている場合", () => {
    const config: Config = {
      markers: ["A", "B"],
      motion_count: 3,
      motion_timeout: 2000,
      hint_position: "start",
      trigger_on_hjkl: true,
      counted_motions: [],
      enabled: true,
      maxHints: 336,
      debounceDelay: 50,
      use_numbers: false,
      highlight_selected: false,
      debug_coordinates: false,
      highlight_hint_marker: "DiffAdd",
      highlight_hint_marker_current: "DiffText",
      default_motion_count: 3,
      default_min_word_length: 4
    };

    assertEquals(getMinLengthForKey(config, "w"), 4);
    assertEquals(getMinLengthForKey(config, "any_key"), 4);
  });

  await t.step("min_word_lengthフォールバック", () => {
    const config: Config = {
      markers: ["A", "B"],
      motion_count: 3,
      motion_timeout: 2000,
      hint_position: "start",
      trigger_on_hjkl: true,
      counted_motions: [],
      enabled: true,
      maxHints: 336,
      debounceDelay: 50,
      use_numbers: false,
      highlight_selected: false,
      debug_coordinates: false,
      highlight_hint_marker: "DiffAdd",
      highlight_hint_marker_current: "DiffText",
      default_motion_count: 3,
      min_word_length: 5
    };

    assertEquals(getMinLengthForKey(config, "w"), 5);
  });

  await t.step("全設定未指定時のデフォルト値", () => {
    const config: Config = {
      markers: ["A", "B"],
      motion_count: 3,
      motion_timeout: 2000,
      hint_position: "start",
      trigger_on_hjkl: true,
      counted_motions: [],
      enabled: true,
      maxHints: 336,
      debounceDelay: 50,
      use_numbers: false,
      highlight_selected: false,
      debug_coordinates: false,
      highlight_hint_marker: "DiffAdd",
      highlight_hint_marker_current: "DiffText",
      default_motion_count: 3
    };

    assertEquals(getMinLengthForKey(config, "w"), 2);
  });
});

Deno.test("getMotionCountForKey - キー別カウント取得", async (t) => {
  await t.step("キー別設定が存在し有効な値の場合", () => {
    const config: Config = {
      markers: ["A", "B"],
      motion_count: 3,
      motion_timeout: 2000,
      hint_position: "start",
      trigger_on_hjkl: true,
      counted_motions: [],
      enabled: true,
      maxHints: 336,
      debounceDelay: 50,
      use_numbers: false,
      highlight_selected: false,
      debug_coordinates: false,
      highlight_hint_marker: "DiffAdd",
      highlight_hint_marker_current: "DiffText",
      default_motion_count: 3,
      per_key_motion_count: { "w": 2, "e": 5 }
    };

    assertEquals(getMotionCountForKey("w", config), 2);
    assertEquals(getMotionCountForKey("e", config), 5);
  });

  await t.step("キー別設定が無効な値の場合default_motion_countを使用", () => {
    const config: Config = {
      markers: ["A", "B"],
      motion_count: 3,
      motion_timeout: 2000,
      hint_position: "start",
      trigger_on_hjkl: true,
      counted_motions: [],
      enabled: true,
      maxHints: 336,
      debounceDelay: 50,
      use_numbers: false,
      highlight_selected: false,
      debug_coordinates: false,
      highlight_hint_marker: "DiffAdd",
      highlight_hint_marker_current: "DiffText",
      default_motion_count: 4,
      per_key_motion_count: { "w": 0, "e": 1.5 }
    };

    assertEquals(getMotionCountForKey("w", config), 4); // 0は無効なので4
    assertEquals(getMotionCountForKey("e", config), 4); // 1.5は無効なので4
  });

  await t.step("default_motion_countが設定されている場合", () => {
    const config: Config = {
      markers: ["A", "B"],
      motion_count: 3,
      motion_timeout: 2000,
      hint_position: "start",
      trigger_on_hjkl: true,
      counted_motions: [],
      enabled: true,
      maxHints: 336,
      debounceDelay: 50,
      use_numbers: false,
      highlight_selected: false,
      debug_coordinates: false,
      highlight_hint_marker: "DiffAdd",
      highlight_hint_marker_current: "DiffText",
      default_motion_count: 7
    };

    assertEquals(getMotionCountForKey("w", config), 7);
    assertEquals(getMotionCountForKey("any_key", config), 7);
  });

  await t.step("motion_countフォールバック", () => {
    const config: Config = {
      markers: ["A", "B"],
      motion_count: 6,
      motion_timeout: 2000,
      hint_position: "start",
      trigger_on_hjkl: true,
      counted_motions: [],
      enabled: true,
      maxHints: 336,
      debounceDelay: 50,
      use_numbers: false,
      highlight_selected: false,
      debug_coordinates: false,
      highlight_hint_marker: "DiffAdd",
      highlight_hint_marker_current: "DiffText",
      default_motion_count: 3
    };

    // default_motion_countが設定されているので、motion_countより優先される
    assertEquals(getMotionCountForKey("w", config), 3);
  });

  await t.step("motion_countのみ設定されている場合", () => {
    const config: Config = {
      markers: ["A", "B"],
      motion_count: 6,
      motion_timeout: 2000,
      hint_position: "start",
      trigger_on_hjkl: true,
      counted_motions: [],
      enabled: true,
      maxHints: 336,
      debounceDelay: 50,
      use_numbers: false,
      highlight_selected: false,
      debug_coordinates: false,
      highlight_hint_marker: "DiffAdd",
      highlight_hint_marker_current: "DiffText",
      default_motion_count: 3
      // default_motion_countが未設定（undefinedまたは0以下）の場合にのみmotion_countを使用
    };

    // default_motion_countが設定されているため、これが使用される
    assertEquals(getMotionCountForKey("w", config), 3);
  });

  await t.step("pure motion_countフォールバック", () => {
    const config: Config = {
      markers: ["A", "B"],
      motion_count: 6,
      motion_timeout: 2000,
      hint_position: "start",
      trigger_on_hjkl: true,
      counted_motions: [],
      enabled: true,
      maxHints: 336,
      debounceDelay: 50,
      use_numbers: false,
      highlight_selected: false,
      debug_coordinates: false,
      highlight_hint_marker: "DiffAdd",
      highlight_hint_marker_current: "DiffText",
      default_motion_count: 3
      // default_motion_countを未設定にする
    };

    // 型エラーを避けるため、default_motion_countを削除
    delete (config as any).default_motion_count;

    assertEquals(getMotionCountForKey("w", config), 6);
  });

  await t.step("全設定未指定時のデフォルト値", () => {
    const config: Config = {
      markers: ["A", "B"],
      motion_count: 3,
      motion_timeout: 2000,
      hint_position: "start",
      trigger_on_hjkl: true,
      counted_motions: [],
      enabled: true,
      maxHints: 336,
      debounceDelay: 50,
      use_numbers: false,
      highlight_selected: false,
      debug_coordinates: false,
      highlight_hint_marker: "DiffAdd",
      highlight_hint_marker_current: "DiffText",
      default_motion_count: 3
    };

    assertEquals(getMotionCountForKey("w", config), 3);
  });
});

Deno.test("normalizeBackwardCompatibleFlags - 後方互換性対応", async (t) => {
  await t.step("use_improved_detection フラグを削除", () => {
    const config = {
      motion_count: 3,
      use_improved_detection: true, // 削除されるべき
      enabled: true
    };

    const result = normalizeBackwardCompatibleFlags(config);

    assertEquals(result.motion_count, 3);
    assertEquals(result.enabled, true);
    assertEquals("use_improved_detection" in result, false);
  });

  await t.step("use_improved_detection が存在しない場合", () => {
    const config = {
      motion_count: 3,
      enabled: true
    };

    const result = normalizeBackwardCompatibleFlags(config);

    assertEquals(result.motion_count, 3);
    assertEquals(result.enabled, true);
    assertEquals("use_improved_detection" in result, false);
  });

  await t.step("空の設定オブジェクト", () => {
    const config = {};

    const result = normalizeBackwardCompatibleFlags(config);

    assertEquals(Object.keys(result).length, 0);
  });

  await t.step("元の設定が変更されないこと（immutable）", () => {
    const originalConfig = {
      motion_count: 3,
      use_improved_detection: true,
      enabled: true
    };

    const result = normalizeBackwardCompatibleFlags(originalConfig);

    // 元の設定オブジェクトは変更されない
    assertEquals(originalConfig.use_improved_detection, true);
    assertEquals(originalConfig.motion_count, 3);
    assertEquals(originalConfig.enabled, true);

    // 新しいオブジェクトからは削除されている
    assertEquals("use_improved_detection" in result, false);
    assertEquals(result.motion_count, 3);
    assertEquals(result.enabled, true);
  });
});

Deno.test("normalizeColorName - 色名正規化", async (t) => {
  await t.step("16進数色はそのまま返す", () => {
    assertEquals(normalizeColorName("#ff0000"), "#ff0000");
    assertEquals(normalizeColorName("#FF0000"), "#FF0000");
    assertEquals(normalizeColorName("#abc"), "#abc");
  });

  await t.step("色名は最初の文字大文字、残り小文字", () => {
    assertEquals(normalizeColorName("red"), "Red");
    assertEquals(normalizeColorName("RED"), "Red");
    assertEquals(normalizeColorName("darkBlue"), "Darkblue");
    assertEquals(normalizeColorName("DARKBLUE"), "Darkblue");
  });

  await t.step("空文字やnullはそのまま返す", () => {
    assertEquals(normalizeColorName(""), "");
    assertEquals(normalizeColorName(null as any), null);
    assertEquals(normalizeColorName(undefined as any), undefined);
  });
});

Deno.test("generateHighlightCommand - ハイライトコマンド生成", async (t) => {
  await t.step("文字列の場合（従来のハイライトグループ名）", () => {
    const result = generateHighlightCommand("HellshakeHint", "DiffAdd");
    assertEquals(result, "highlight default link HellshakeHint DiffAdd");
  });

  await t.step("オブジェクトの場合（fg色名のみ）", () => {
    const result = generateHighlightCommand("HellshakeHint", { fg: "red" });
    assertEquals(result, "highlight HellshakeHint ctermfg=Red guifg=Red");
  });

  await t.step("オブジェクトの場合（bg色名のみ）", () => {
    const result = generateHighlightCommand("HellshakeHint", { bg: "blue" });
    assertEquals(result, "highlight HellshakeHint ctermbg=Blue guibg=Blue");
  });

  await t.step("オブジェクトの場合（fg/bg両方、色名）", () => {
    const result = generateHighlightCommand("HellshakeHint", { fg: "white", bg: "black" });
    assertEquals(result, "highlight HellshakeHint ctermfg=White guifg=White ctermbg=Black guibg=Black");
  });

  await t.step("オブジェクトの場合（16進数色）", () => {
    const result = generateHighlightCommand("HellshakeHint", { fg: "#ff0000", bg: "#00ff00" });
    assertEquals(result, "highlight HellshakeHint guifg=#ff0000 guibg=#00ff00");
  });

  await t.step("オブジェクトの場合（混合: 色名とHex）", () => {
    const result = generateHighlightCommand("HellshakeHint", { fg: "#ff0000", bg: "blue" });
    assertEquals(result, "highlight HellshakeHint guifg=#ff0000 ctermbg=Blue guibg=Blue");
  });
});

Deno.test("validateHighlightConfig - ハイライト設定検証", async (t) => {
  await t.step("両方とも有効な設定", () => {
    const config = {
      highlight_hint_marker: "DiffAdd",
      highlight_hint_marker_current: { fg: "red", bg: "blue" }
    };
    const result = validateHighlightConfig(config);
    assertEquals(result.valid, true);
    assertEquals(result.errors, []);
  });

  await t.step("highlight_hint_markerが無効", () => {
    const config = {
      highlight_hint_marker: "",
      highlight_hint_marker_current: "DiffText"
    };
    const result = validateHighlightConfig(config);
    assertEquals(result.valid, false);
    assertEquals(result.errors.length > 0, true);
    assertEquals(result.errors[0].includes("highlight_hint_marker"), true);
  });

  await t.step("highlight_hint_marker_currentが無効", () => {
    const config = {
      highlight_hint_marker: "DiffAdd",
      highlight_hint_marker_current: { fg: "invalid_color" }
    };
    const result = validateHighlightConfig(config);
    assertEquals(result.valid, false);
    assertEquals(result.errors.length > 0, true);
    assertEquals(result.errors[0].includes("highlight_hint_marker_current"), true);
  });

  await t.step("両方とも未定義の場合は有効", () => {
    const config = {};
    const result = validateHighlightConfig(config);
    assertEquals(result.valid, true);
    assertEquals(result.errors, []);
  });
});