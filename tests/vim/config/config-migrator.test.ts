/**
 * tests/vim/config/config-migrator.test.ts
 *
 * ConfigMigratorのテスト（phase-b1 + phase-b4 統合版）
 *
 * 目的:
 *   - 既存設定の自動検出
 *   - 設定の自動変換
 *   - マイグレーション結果の検証
 *   - エラーハンドリング
 *
 * Process: phase-2, process12
 */

import { test } from "../../testRunner.ts";
import { assertEquals, assertExists } from "@std/assert";
import {
  ConfigMigrator,
  type MigrationStatus,
  type MigrationResult,
} from "../../../denops/hellshake-yano/vim/config/config-migrator.ts";

// Phase-B1 テストケース
test("ConfigMigrator: VimScript設定の検出", async (denops) => {
  const migrator = new ConfigMigrator(denops);

  // VimScript設定を作成
  await denops.cmd("let g:hellshake_yano_vim_config = {}");
  await denops.cmd("let g:hellshake_yano_vim_config.hint_chars = 'ASDF'");

  // 設定が検出されることを確認
  const detected = await migrator.detectVimScriptConfig();
  assertEquals(detected, true, "VimScript設定が検出されること");

  await denops.cmd("echo ''");
});

test("ConfigMigrator: 設定が存在しない場合", async (denops) => {
  const migrator = new ConfigMigrator(denops);

  // 設定を削除
  await denops.cmd("unlet! g:hellshake_yano_vim_config");

  // 設定が検出されないことを確認
  const detected = await migrator.detectVimScriptConfig();
  assertEquals(
    detected,
    false,
    "VimScript設定が存在しない場合はfalseが返されること",
  );

  await denops.cmd("echo ''");
});

test("ConfigMigrator: マイグレーションの必要性チェック", async (denops) => {
  const migrator = new ConfigMigrator(denops);

  // VimScript設定のみ存在
  await denops.cmd("let g:hellshake_yano_vim_config = {}");
  await denops.cmd("unlet! g:hellshake_yano");

  const needed = await migrator.needsMigration();
  assertEquals(
    needed,
    true,
    "VimScript設定のみ存在する場合はマイグレーションが必要",
  );

  await denops.cmd("echo ''");
});

test("ConfigMigrator: マイグレーション不要の場合", async (denops) => {
  const migrator = new ConfigMigrator(denops);

  // 両方の設定を削除
  await denops.cmd("unlet! g:hellshake_yano_vim_config");
  await denops.cmd("unlet! g:hellshake_yano");

  const needed = await migrator.needsMigration();
  assertEquals(needed, false, "設定が存在しない場合はマイグレーション不要");

  await denops.cmd("echo ''");
});

test("ConfigMigrator: 設定の取得", async (denops) => {
  const migrator = new ConfigMigrator(denops);

  // VimScript設定を作成
  await denops.cmd("let g:hellshake_yano_vim_config = {}");
  await denops.cmd("let g:hellshake_yano_vim_config.hint_chars = 'XYZ'");
  await denops.cmd("let g:hellshake_yano_vim_config.enabled = v:true");

  const config = await migrator.getVimScriptConfig();

  assertExists(config, "設定オブジェクトが取得できること");
  assertEquals(config.hint_chars, "XYZ", "hint_charsが取得できること");
  assertEquals(config.enabled, true, "enabledが取得できること");

  await denops.cmd("echo ''");
});

// Phase-B4 テストケース（統合版用に適応）
test("ConfigMigrator: migrate() - 旧設定のみ存在時のマイグレーション", async (
  denops,
) => {
  const migrator = new ConfigMigrator(denops);

  // 旧設定を作成
  await denops.cmd("let g:hellshake_yano_vim_config = {}");
  await denops.cmd("let g:hellshake_yano_vim_config.hint_chars = 'ASD'");
  await denops.cmd("let g:hellshake_yano_vim_config.motion_threshold = 3");

  // 新設定が存在しない
  await denops.cmd("unlet! g:hellshake_yano");

  const result = await migrator.migrate();

  assertExists(result, "マイグレーション結果が存在");
  assertEquals(
    result.status as MigrationStatus,
    "migrated",
    "マイグレーション状態がmigratedであること",
  );
  assertEquals(result.oldConfigExists, true, "旧設定が存在");
  assertEquals(result.newConfigExists, false, "新設定が存在しない");

  await denops.cmd("echo ''");
});

test("ConfigMigrator: migrate() - 両方の設定が存在する場合", async (
  denops,
) => {
  const migrator = new ConfigMigrator(denops);

  // 両方の設定を作成
  await denops.cmd("let g:hellshake_yano_vim_config = {}");
  await denops.cmd("let g:hellshake_yano = {}");

  const result = await migrator.migrate();

  assertEquals(
    result.status as MigrationStatus,
    "both_exist",
    "マイグレーション状態がboth_existであること",
  );
  assertEquals(result.oldConfigExists, true, "旧設定が存在");
  assertEquals(result.newConfigExists, true, "新設定が存在");

  await denops.cmd("echo ''");
});

test("ConfigMigrator: migrate() - 新設定のみ存在する場合", async (denops) => {
  const migrator = new ConfigMigrator(denops);

  // 新設定のみ作成
  await denops.cmd("unlet! g:hellshake_yano_vim_config");
  await denops.cmd("let g:hellshake_yano = {}");

  const result = await migrator.migrate();

  assertEquals(
    result.status as MigrationStatus,
    "new_only",
    "マイグレーション状態がnew_onlyであること",
  );
  assertEquals(result.oldConfigExists, false, "旧設定が存在しない");
  assertEquals(result.newConfigExists, true, "新設定が存在");

  await denops.cmd("echo ''");
});

test("ConfigMigrator: migrate() - 設定が存在しない場合", async (denops) => {
  const migrator = new ConfigMigrator(denops);

  // 両方の設定を削除
  await denops.cmd("unlet! g:hellshake_yano_vim_config");
  await denops.cmd("unlet! g:hellshake_yano");

  const result = await migrator.migrate();

  assertEquals(
    result.status as MigrationStatus,
    "none",
    "マイグレーション状態がnoneであること",
  );
  assertEquals(result.oldConfigExists, false, "旧設定が存在しない");
  assertEquals(result.newConfigExists, false, "新設定が存在しない");

  await denops.cmd("echo ''");
});

test("ConfigMigrator: migrate() - warnings配列が存在", async (denops) => {
  const migrator = new ConfigMigrator(denops);

  // 旧設定のみ作成
  await denops.cmd("let g:hellshake_yano_vim_config = {}");
  await denops.cmd("unlet! g:hellshake_yano");

  const result = await migrator.migrate();

  assertExists(result.warnings, "警告配列が存在");
  assertEquals(
    Array.isArray(result.warnings),
    true,
    "警告が配列形式であること",
  );

  await denops.cmd("echo ''");
});

// === Config Migration 型変換テスト ===

test("ConfigMigrator: g:hellshake_yano_config が存在しない場合", async (denops) => {
  const migrator = new ConfigMigrator(denops);

  // 設定変数を削除
  await denops.cmd("unlet! g:hellshake_yano_config");
  await denops.cmd("unlet! g:hellshake_yano_vim_config");
  await denops.cmd("unlet! g:hellshake_yano");

  const result = await migrator.migrate();

  assertEquals(
    result.status as MigrationStatus,
    "none",
    "設定が存在しない場合はnoneステータス",
  );
  assertEquals(result.oldConfigExists, false, "旧設定が存在しない");
  assertEquals(result.newConfigExists, false, "新設定が存在しない");

  await denops.cmd("echo ''");
});

test("ConfigMigrator: g:hellshake_yano_config が null の場合", async (denops) => {
  const migrator = new ConfigMigrator(denops);

  // nullを設定（VimScriptではv:null）
  await denops.cmd("let g:hellshake_yano_config = v:null");
  await denops.cmd("unlet! g:hellshake_yano");

  const result = await migrator.migrate();

  // nullの場合は設定が存在しないものとして扱う
  assertEquals(
    result.status as MigrationStatus,
    "none",
    "null設定の場合はnoneステータス",
  );

  await denops.cmd("echo ''");
});

test("ConfigMigrator: g:hellshake_yano_config が不正な型の場合 (数値)", async (denops) => {
  const migrator = new ConfigMigrator(denops);

  // 数値を設定（不正な型）
  await denops.cmd("let g:hellshake_yano_config = 123");
  await denops.cmd("unlet! g:hellshake_yano");

  const result = await migrator.migrate();

  // 不正な型の場合はエラーログを出力し、デフォルト設定を使用
  assertEquals(
    result.status as MigrationStatus,
    "none",
    "不正な型の場合はnoneステータス",
  );

  await denops.cmd("echo ''");
});

test("ConfigMigrator: g:hellshake_yano_config が不正な型の場合 (文字列)", async (denops) => {
  const migrator = new ConfigMigrator(denops);

  // 文字列を設定（不正な型）
  await denops.cmd("let g:hellshake_yano_config = 'invalid'");
  await denops.cmd("unlet! g:hellshake_yano");

  const result = await migrator.migrate();

  // 不正な型の場合はエラーログを出力し、デフォルト設定を使用
  assertEquals(
    result.status as MigrationStatus,
    "none",
    "不正な型の場合はnoneステータス",
  );

  await denops.cmd("echo ''");
});

test("ConfigMigrator: g:hellshake_yano_config が空のオブジェクトの場合", async (denops) => {
  const migrator = new ConfigMigrator(denops);

  // 空のオブジェクトを設定
  await denops.cmd("let g:hellshake_yano_config = {}");
  await denops.cmd("unlet! g:hellshake_yano");

  const result = await migrator.migrate();

  // 空のオブジェクトは有効な設定として扱う
  assertEquals(
    result.oldConfigExists,
    false,
    "g:hellshake_yano_config は旧設定ではない",
  );

  await denops.cmd("echo ''");
});

test("ConfigMigrator: 部分的に不正なフィールドを含む設定", async (denops) => {
  const migrator = new ConfigMigrator(denops);

  // 一部のフィールドが不正な設定
  await denops.cmd("let g:hellshake_yano_vim_config = {}");
  await denops.cmd("let g:hellshake_yano_vim_config.hint_chars = 'ABC'");
  await denops.cmd("let g:hellshake_yano_vim_config.invalid_field = 'should_be_ignored'");
  await denops.cmd("let g:hellshake_yano_vim_config.motion_threshold = 'not_a_number'");

  const config = await migrator.getVimScriptConfig();

  // 有効なフィールドは取得できる
  assertEquals(config.hint_chars, "ABC", "有効なフィールドは取得できること");
  // 不正なフィールドは無視される
  assertEquals(typeof config.invalid_field, "undefined", "不正なフィールドは無視されること");

  await denops.cmd("echo ''");
});
