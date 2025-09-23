import { assertEquals } from "https://deno.land/std@0.200.0/assert/mod.ts";
import { validateConfig } from "../../denops/hellshake-yano/validation/config.ts";
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