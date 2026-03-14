/**
 * tests/unit/main-hint-config.test.ts
 *
 * TDD Red-Green-Refactor: hintConfig メモ化の検証
 *
 * RED: createHintConfig が main.ts から export されていないため FAIL
 * GREEN: メモ化実装後 PASS
 */

import { assertEquals, assertNotEquals } from "@std/assert";
// RED: createHintConfig は未 export → コンパイルエラー
import { createHintConfig } from "../../denops/hellshake-yano/main.ts";
import type { Config } from "../../denops/hellshake-yano/types.ts";

/** テスト用の最小 Config */
function makeConfig(overrides?: Partial<Config>): Config {
  return {
    enabled: true,
    markers: ["a", "s", "d", "f"],
    motionCount: 1,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 100,
    debounceDelay: 0,
    useNumbers: false,
    directionalHintFilter: false,
    highlightSelected: false,
    debugCoordinates: false,
    singleCharKeys: ["a", "s", "d", "f"],
    multiCharKeys: ["a", "s"],
    maxSingleCharHints: 26,
    useHintGroups: false,
    continuousHintMode: false,
    recenterCommand: "zz",
    ...overrides,
  } as unknown as Config;
}

Deno.test("createHintConfig: 同じ config 参照に対して同じオブジェクトを返す (===)", () => {
  const config = makeConfig();

  const result1 = createHintConfig(config);
  const result2 = createHintConfig(config);

  // RED: メモ化なしでは毎回新しいオブジェクトが生成される → 参照が異なり FAIL
  assertEquals(
    result1 === result2,
    true,
    "同じ config 参照に対して createHintConfig は同一オブジェクト参照を返す必要があります",
  );
});

Deno.test("createHintConfig: 異なる config 参照に対して異なるオブジェクトを返す", () => {
  const configA = makeConfig({ maxHints: 50 });
  const configB = makeConfig({ maxHints: 100 });

  const resultA = createHintConfig(configA);
  const resultB = createHintConfig(configB);

  // 異なる config → 異なるオブジェクト
  assertNotEquals(
    resultA === resultB,
    true,
    "異なる config 参照に対して createHintConfig は異なるオブジェクトを返す必要があります",
  );
});

Deno.test("createHintConfig: 生成された hintConfig は必要なフィールドを持つ", () => {
  const config = makeConfig();
  const hintConfig = createHintConfig(config);

  assertEquals(Array.isArray(hintConfig.singleCharKeys), true);
  assertEquals(Array.isArray(hintConfig.multiCharKeys), true);
  assertEquals(Array.isArray(hintConfig.markers), true);
});
