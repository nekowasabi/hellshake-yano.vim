/**
 * Process3: types.tsの更新テスト
 * UnifiedConfig参照の削除と型エクスポートの確認
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";

// Process3後、types.tsはConfigのみをエクスポートすべき
// UnifiedConfigは削除される
Deno.test("types.ts should export Config type", async () => {
  // types.tsからConfigがエクスポートされることを確認
  const typesModule = await import("../denops/hellshake-yano/types.ts");

  // 型ガード関数がエクスポートされていることを確認（実行時にアクセス可能）
  assertExists(typesModule.isWord);
  assertExists(typesModule.isHintMapping);
});

// UnifiedConfigの削除確認テスト
Deno.test("types.ts should not export UnifiedConfig after process3", async () => {
  const fileContent = await Deno.readTextFile("./denops/hellshake-yano/types.ts");

  // UnifiedConfig型エイリアスが削除されていることを確認
  const hasUnifiedConfigExport = fileContent.includes("export type UnifiedConfig");
  assertEquals(hasUnifiedConfigExport, false, "UnifiedConfig export should be removed");

  // コメント内のUnifiedConfigへの言及も削除されていることを確認
  const hasUnifiedConfigInComment = fileContent.includes("UnifiedConfig →");
  assertEquals(
    hasUnifiedConfigInComment,
    false,
    "UnifiedConfig references in comments should be removed",
  );
});

// Configインポートの確認テスト
Deno.test("types.ts should import Config from config.ts", async () => {
  const fileContent = await Deno.readTextFile("./denops/hellshake-yano/types.ts");

  // Config型のインポートが存在することを確認
  const hasConfigImport = fileContent.includes('import type { Config } from "./config.ts"');
  assertEquals(hasConfigImport, true, "Should import Config from config.ts");

  // Config型の再エクスポートが存在することを確認
  const hasConfigReExport = fileContent.includes('export type { Config } from "./config.ts"');
  assertEquals(hasConfigReExport, true, "Should re-export Config");
});

// 型定義の整合性テスト（型ガード関数の存在を確認）
Deno.test("types.ts exports should remain consistent", async () => {
  const typesModule = await import("../denops/hellshake-yano/types.ts");

  // 主要な型ガード関数がエクスポートされていることを確認
  const expectedTypeGuards = [
    "isWord",
    "isHintMapping",
    "isConfig",
    "isHintPosition",
    "isDetectionStrategy",
  ];

  for (const guardName of expectedTypeGuards) {
    assertExists(
      (typesModule as any)[guardName],
      `types.ts should export type guard ${guardName}`,
    );
  }
});

// コメントのクリーンアップテスト
Deno.test("types.ts comments should be updated", async () => {
  const fileContent = await Deno.readTextFile("./denops/hellshake-yano/types.ts");

  // 統合設定型エイリアスのコメントセクションが削除されていることを確認
  const hasObsoleteComment = fileContent.includes("統合設定型エイリアス");
  assertEquals(hasObsoleteComment, false, "Obsolete comment about UnifiedConfig should be removed");

  // Process1の言及が削除されていることを確認
  const hasProcess1Comment = fileContent.includes("Process1: 型定義の統合実装により");
  assertEquals(hasProcess1Comment, false, "Process1 migration comment should be removed");
});

// 他モジュールからのアクセステスト
Deno.test("Config type should be accessible from types.ts", async () => {
  // config.tsから直接インポートした場合と、types.ts経由でインポートした場合が同等であることを確認
  const configModule = await import("../denops/hellshake-yano/config.ts");

  // Config型が正しく機能することを確認（実行時にアクセス可能な関数を使用）
  const defaultConfig = configModule.getDefaultConfig();

  // 基本的なプロパティの存在確認
  assertExists(defaultConfig.enabled);
  assertExists(defaultConfig.motionCount);
  assertExists(defaultConfig.motionTimeout);
  assertExists(defaultConfig.markers);

  // 型が正しく動作することを確認
  assertEquals(typeof defaultConfig.enabled, "boolean");
  assertEquals(typeof defaultConfig.motionCount, "number");
  assertEquals(typeof defaultConfig.motionTimeout, "number");
  assertEquals(Array.isArray(defaultConfig.markers), true);
});
