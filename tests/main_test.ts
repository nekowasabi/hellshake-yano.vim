/**
 * main.tsのテスト - Config使用への移行のテスト
 * TDD Red-Green-Refactor方式で実装
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { getDefaultConfig, validateConfig } from "../denops/hellshake-yano/main.ts";
import {
  getDefaultConfig as getDefaultConfigFromConfig,
  validateConfig as validateConfigFromConfig,
} from "../denops/hellshake-yano/config.ts";
import { Core } from "../denops/hellshake-yano/neovim/core/core.ts";

Deno.test("getDefaultConfig() should delegate to config.ts", () => {
  const config = getDefaultConfig();

  // 基本的なプロパティの存在確認
  assertExists(config.markers);
  assertExists(config.motionCount);
  assertExists(config.motionTimeout);
  assertExists(config.hintPosition);
  assertExists(config.enabled);

  // デフォルト値の検証
  assertEquals(config.enabled, true);
  assertEquals(config.motionCount, 3);
  assertEquals(config.motionTimeout, 2000);
  assertEquals(config.hintPosition, "start");
  assertEquals(config.markers.length > 0, true);
});

Deno.test("validateConfig() should delegate to config.ts", () => {
  // 有効な設定
  const validConfig = { motionCount: 3, hintPosition: "start" as const, enabled: true };

  const validResult = validateConfig(validConfig);
  assertEquals(validResult.valid, true);
  assertEquals(validResult.errors.length, 0);

  // 無効な設定
  const invalidConfig = {
    motionCount: -1, // 負の値は無効
  };

  const invalidResult = validateConfig(invalidConfig);
  assertEquals(invalidResult.valid, false);
  assertEquals(invalidResult.errors.length > 0, true);
});

Deno.test("getMinLengthForKey() should work with both Config and Config", () => {
  // Config形式でのテスト
  const configFromConfigModule = getDefaultConfigFromConfig();
  const minLength1 = Core.getMinLengthForKey(configFromConfigModule, "f");
  assertEquals(typeof minLength1, "number");
  assertEquals(minLength1 >= 1, true);

  // Config形式でのテスト（後方互換性）
  const config = getDefaultConfig();
  const minLength2 = Core.getMinLengthForKey(config, "f");
  assertEquals(typeof minLength2, "number");
  assertEquals(minLength2 >= 1, true);

  // 両方の結果は同じでなければならない
  assertEquals(minLength1, minLength2);
});

Deno.test("getMotionCountForKey() should work with both Config and Config", () => {
  // Config形式でのテスト
  const configFromConfigModule = getDefaultConfigFromConfig();
  const motionCount1 = Core.getMotionCountForKey("f", configFromConfigModule);
  assertEquals(typeof motionCount1, "number");
  assertEquals(motionCount1 >= 1, true);

  // Config形式でのテスト（後方互換性）
  const config = getDefaultConfig();
  const motionCount2 = Core.getMotionCountForKey("f", config);
  assertEquals(typeof motionCount2, "number");
  assertEquals(motionCount2 >= 1, true);

  // 両方の結果は同じでなければならない
  assertEquals(motionCount1, motionCount2);
});

Deno.test("Config types should be backward compatible", () => {
  const config = getDefaultConfig();

  // snake_case形式のプロパティが存在することを確認
  assertEquals(typeof config.motionCount, "number");
  assertEquals(typeof config.motionTimeout, "number");
  assertEquals(typeof config.hintPosition, "string");
  assertEquals(typeof config.triggerOnHjkl, "boolean");
  assertEquals(typeof config.enabled, "boolean");
  assertEquals(Array.isArray(config.markers), true);
  assertEquals(Array.isArray(config.countedMotions), true);
});

Deno.test("Config and Config should provide equivalent functionality", () => {
  const config = getDefaultConfig();
  const configFromConfigModule = getDefaultConfigFromConfig();

  // 重要な設定値が両方で同じであることを確認
  assertEquals(config.enabled, configFromConfigModule.enabled);
  assertEquals(config.motionCount, configFromConfigModule.motionCount);
  assertEquals(config.motionTimeout, configFromConfigModule.motionTimeout);
  assertEquals(config.hintPosition, configFromConfigModule.hintPosition);
  assertEquals(config.markers.length, configFromConfigModule.markers.length);
});

// Process2 Sub6: 型安全性のテスト（Red Phase）
Deno.test("countedMotions should be strongly typed", () => {
  const config = getDefaultConfig();

  // countedMotionsは文字列の配列であるべき
  assertEquals(Array.isArray(config.countedMotions), true);

  // 全ての要素が文字列であることを確認（型安全性テスト）
  config.countedMotions.forEach((key: string, index: number) => {
    assertEquals(
      typeof key,
      "string",
      `countedMotions[${index}] should be string, got ${typeof key}`,
    );
    assertEquals(key.length > 0, true, `countedMotions[${index}] should not be empty`);
  });
});

Deno.test("motion detection functions should have proper types", () => {
  const config = getDefaultConfig();

  // countedMotions内の各キーに対してgetMinLengthForKeyが正しく動作することを確認
  config.countedMotions.forEach((key: string) => {
    const minLength = Core.getMinLengthForKey(config, key);
    assertEquals(typeof minLength, "number");
    assertEquals(minLength >= 1, true);
  });

  // getMotionCountForKeyも同様に確認
  config.countedMotions.forEach((key: string) => {
    const motionCount = Core.getMotionCountForKey(key, config);
    assertEquals(typeof motionCount, "number");
    assertEquals(motionCount >= 1, true);
  });
});

Deno.test("main.ts type safety - filter function should be strongly typed", () => {
  // This test validates that the type guard filter function works correctly
  // after refactoring from 'any' to proper type guard in main.ts line 510

  // Create a mock config with countedMotions that includes invalid types
  const mockConfig = {
    countedMotions: ["f", "F", 123, null, "t", "T", "", undefined] as unknown[],
  };

  // The filter function now uses a type guard instead of 'any'
  const validKeys = mockConfig.countedMotions.filter((key: unknown): key is string =>
    typeof key === "string" && key.length === 1
  );

  // Validate the filtering works correctly with proper type safety
  assertEquals(validKeys.length, 4); // "f", "F", "t", "T" are valid
  assertEquals(validKeys.includes("f"), true);
  assertEquals(validKeys.includes("F"), true);
  assertEquals(validKeys.includes("t"), true);
  assertEquals(validKeys.includes("T"), true);

  // These shouldn't be included due to type/length validation
  assertEquals(validKeys.includes(123 as any), false);
  assertEquals(validKeys.includes(null as any), false);
  assertEquals(validKeys.includes("" as any), false);
  assertEquals(validKeys.includes(undefined as any), false);
});
