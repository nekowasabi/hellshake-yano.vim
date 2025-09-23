import { assertEquals, assertExists } from "https://deno.land/std@0.200.0/assert/mod.ts";
import { getDefaultConfig } from "../../denops/hellshake-yano/validation/config.ts";
import type { Config } from "../../denops/hellshake-yano/types.ts";

Deno.test("getDefaultConfig - デフォルト設定の確認", async (t) => {
  await t.step("関数が存在することを確認", () => {
    assertExists(getDefaultConfig);
  });

  await t.step("デフォルト設定が正しい値を返すことを確認", () => {
    const config = getDefaultConfig();

    // 基本設定項目の確認
    assertEquals(config.markers, "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""));
    assertEquals(config.motion_count, 3);
    assertEquals(config.motion_timeout, 2000);
    assertEquals(config.hint_position, "start");
    assertEquals(config.trigger_on_hjkl, true);
    assertEquals(config.counted_motions, []);
    assertEquals(config.enabled, true);
    assertEquals(config.maxHints, 336);
    assertEquals(config.debounceDelay, 50);
    assertEquals(config.use_numbers, false);
    assertEquals(config.highlight_selected, false);
    assertEquals(config.debug_coordinates, false);
    assertEquals(config.highlight_hint_marker, "DiffAdd");
    assertEquals(config.highlight_hint_marker_current, "DiffText");
    assertEquals(config.default_motion_count, 3);
  });

  await t.step("返される設定がConfig型に適合することを確認", () => {
    const config = getDefaultConfig();

    // Config型の必須フィールドがすべて含まれていることを確認
    assertExists(config.markers);
    assertExists(config.motion_count);
    assertExists(config.motion_timeout);
    assertExists(config.hint_position);
    assertExists(config.trigger_on_hjkl);
    assertExists(config.counted_motions);
    assertExists(config.enabled);
    assertExists(config.maxHints);
    assertExists(config.debounceDelay);
    assertExists(config.use_numbers);
    assertExists(config.highlight_selected);
    assertExists(config.debug_coordinates);
  });

  await t.step("markersが適切な文字列配列であることを確認", () => {
    const config = getDefaultConfig();

    assertEquals(Array.isArray(config.markers), true);
    assertEquals(config.markers.length, 26); // A-Z
    assertEquals(config.markers[0], "A");
    assertEquals(config.markers[25], "Z");

    // すべての要素が単一文字の文字列であることを確認
    for (const marker of config.markers) {
      assertEquals(typeof marker, "string");
      assertEquals(marker.length, 1);
    }
  });

  await t.step("数値型フィールドが適切な値であることを確認", () => {
    const config = getDefaultConfig();

    // 正の整数フィールド
    assertEquals(typeof config.motion_count, "number");
    assertEquals(config.motion_count > 0, true);
    assertEquals(Number.isInteger(config.motion_count), true);

    assertEquals(typeof config.motion_timeout, "number");
    assertEquals(config.motion_timeout >= 100, true); // 最小値制限

    assertEquals(typeof config.maxHints, "number");
    assertEquals(config.maxHints > 0, true);
    assertEquals(Number.isInteger(config.maxHints), true);

    // 非負数フィールド
    assertEquals(typeof config.debounceDelay, "number");
    assertEquals(config.debounceDelay >= 0, true);
  });

  await t.step("boolean型フィールドが適切な値であることを確認", () => {
    const config = getDefaultConfig();

    assertEquals(typeof config.trigger_on_hjkl, "boolean");
    assertEquals(typeof config.enabled, "boolean");
    assertEquals(typeof config.use_numbers, "boolean");
    assertEquals(typeof config.highlight_selected, "boolean");
    assertEquals(typeof config.debug_coordinates, "boolean");
  });

  await t.step("文字列型フィールドが適切な値であることを確認", () => {
    const config = getDefaultConfig();

    assertEquals(typeof config.hint_position, "string");
    assertEquals(["start", "end", "overlay"].includes(config.hint_position), true);

    // highlight_hint_markerは文字列またはHighlightColorオブジェクト
    assertExists(config.highlight_hint_marker);
    if (typeof config.highlight_hint_marker === "string") {
      assertEquals(config.highlight_hint_marker.length > 0, true);
    }

    // highlight_hint_marker_currentは文字列またはHighlightColorオブジェクト
    assertExists(config.highlight_hint_marker_current);
    if (typeof config.highlight_hint_marker_current === "string") {
      assertEquals(config.highlight_hint_marker_current.length > 0, true);
    }
  });

  await t.step("配列型フィールドが適切な値であることを確認", () => {
    const config = getDefaultConfig();

    assertEquals(Array.isArray(config.counted_motions), true);
    // デフォルトでは空配列
    assertEquals(config.counted_motions.length, 0);
  });
});

Deno.test("getDefaultConfig - 一貫性の確認", async (t) => {
  await t.step("複数回呼び出しても同じ値を返すことを確認", () => {
    const config1 = getDefaultConfig();
    const config2 = getDefaultConfig();

    assertEquals(config1.markers, config2.markers);
    assertEquals(config1.motion_count, config2.motion_count);
    assertEquals(config1.motion_timeout, config2.motion_timeout);
    assertEquals(config1.hint_position, config2.hint_position);
    assertEquals(config1.trigger_on_hjkl, config2.trigger_on_hjkl);
    assertEquals(config1.enabled, config2.enabled);
  });

  await t.step("返されるオブジェクトが独立していることを確認", () => {
    const config1 = getDefaultConfig();
    const config2 = getDefaultConfig();

    // 配列を変更しても他に影響しないことを確認
    config1.markers.push("TEST");
    assertEquals(config2.markers.includes("TEST"), false);

    // オブジェクトが異なる参照であることを確認
    assertEquals(config1 === config2, false);
    assertEquals(config1.markers === config2.markers, false);
  });
});

Deno.test("getDefaultConfig - デフォルト値の妥当性", async (t) => {
  await t.step("デフォルト設定がvalidateConfigを通過することを確認", async () => {
    // validateConfigが存在する場合のみテスト
    try {
      const { validateConfig } = await import("../../denops/hellshake-yano/validation/config.ts");
      const config = getDefaultConfig();
      const result = validateConfig(config);

      assertEquals(result.valid, true, `Default config validation failed: ${result.errors.join(", ")}`);
      assertEquals(result.errors.length, 0);
    } catch (error) {
      // validateConfigがまだ利用できない場合はスキップ
      if ((error as Error).message.includes("Cannot resolve module")) {
        console.log("validateConfig not available yet, skipping validation test");
      } else {
        throw error;
      }
    }
  });
});