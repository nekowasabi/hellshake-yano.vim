// TDD Red-Phase: core/generation モジュールの仕様テスト

import { assertEquals } from "@std/assert";
import { spy } from "@std/testing/mock";
import { createTestConfig } from "./test_config.ts";

Deno.test("core/generation: ヒントグループが有効な場合はグループ生成を使用する", async () => {
  const { createGenerateHintsOptimized } = await import(
    "../../denops/hellshake-yano/core/generation.ts"
  );

  const config = createTestConfig({
    use_hint_groups: true,
    single_char_keys: ["A", "S"],
    multi_char_keys: ["J", "K"],
    markers: ["A", "S", "D"],
  });

  const generated = ["A", "S", "JJ", "JK"];

  const generateHintsWithGroups = spy(() => generated);
  const generateHints = spy(() => ["X", "Y", "Z"]);
  const validateHintKeyConfig = spy(() => ({ valid: true, errors: [] }));

  const generateHintsOptimized = createGenerateHintsOptimized({
    generateHints,
    generateHintsWithGroups,
    validateHintKeyConfig,
  });

  const hints = generateHintsOptimized({
    wordCount: 4,
    markers: config.markers,
    config,
  });

  assertEquals(hints, generated);
  assertEquals(generateHintsWithGroups.calls.length, 1);
  assertEquals(generateHints.calls.length, 0);
});

Deno.test("core/generation: 無効な設定時は従来の生成にフォールバックする", async () => {
  const { createGenerateHintsOptimized } = await import(
    "../../denops/hellshake-yano/core/generation.ts"
  );

  const config = createTestConfig({
    use_hint_groups: true,
    single_char_keys: ["A", "S"],
    multi_char_keys: ["A", "K"],
  });

  const generateHintsWithGroups = spy(() => ["A", "B"]);
  const generateHints = spy(() => ["H1", "H2", "H3"]);
  const validateHintKeyConfig = spy(() => ({ valid: false, errors: ["duplicate"] }));

  const generateHintsOptimized = createGenerateHintsOptimized({
    generateHints,
    generateHintsWithGroups,
    validateHintKeyConfig,
  });

  const hints = generateHintsOptimized({
    wordCount: 3,
    markers: ["H", "I", "J"],
    config,
  });

  assertEquals(hints, ["H1", "H2", "H3"]);
  assertEquals(generateHints.calls.length, 1);
});

Deno.test("core/generation: 同一条件ではキャッシュを使用して再計算を避ける", async () => {
  const { createGenerateHintsOptimized } = await import(
    "../../denops/hellshake-yano/core/generation.ts"
  );

  const config = createTestConfig({ use_hint_groups: false });
  const generateHints = spy(() => ["A", "B", "C", "D"]);
  const generateHintsWithGroups = spy(() => []);
  const validateHintKeyConfig = spy(() => ({ valid: true, errors: [] }));

  const generateHintsOptimized = createGenerateHintsOptimized({
    generateHints,
    generateHintsWithGroups,
    validateHintKeyConfig,
  });

  const first = generateHintsOptimized({
    wordCount: 3,
    markers: ["A", "B"],
    config,
  });
  const second = generateHintsOptimized({
    wordCount: 2,
    markers: ["A", "B"],
    config,
  });

  assertEquals(first, ["A", "B", "C"]);
  assertEquals(second, ["A", "B"]);
  assertEquals(generateHints.calls.length, 1);
});
