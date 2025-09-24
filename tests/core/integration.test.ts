// TDD Red-Phase: core/index と index-recovery スクリプトの統合テスト

import { assertEquals, assertExists } from "@std/assert";

Deno.test("core/index は検出・生成・操作のエントリを再エクスポートする", async () => {
  const core = await import("../../denops/hellshake-yano/core/index.ts");
  const exports = core as Record<string, unknown>;

  assertExists(exports.createDetectWordsOptimized);
  assertExists(exports.createGenerateHintsOptimized);
  assertExists(exports.createHintOperations);
});

Deno.test("scripts/index-recovery はモジュールインデックスの復旧APIを提供する", async () => {
  const recovery = await import("../../scripts/index-recovery.ts");

  assertEquals(typeof recovery.ensureIndex, "function");
  assertEquals(typeof recovery.backupIndex, "function");
  assertEquals(typeof recovery.recoverIndex, "function");
});
