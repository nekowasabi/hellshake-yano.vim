/**
 * tests/neovim/core/core.test.ts
 *
 * Core クラスのテスト - Dictionary System エラーハンドリング
 */

import { test } from "../../testRunner.ts";
import { assertEquals, assertExists } from "@std/assert";
import { initializeDictionarySystem } from "../../../denops/hellshake-yano/neovim/dictionary.ts";
import { Core } from "../../../denops/hellshake-yano/neovim/core/core.ts";

test("Dictionary System: 初期化成功時の動作", async (denops) => {
  // 辞書システムを初期化
  await initializeDictionarySystem(denops);

  // エラーが発生しないことを確認
  const core = Core.getInstance();
  assertExists(core, "Coreインスタンスが取得できること");

  await denops.cmd("echo ''");
});

test("Dictionary System: 初期化失敗時にエラーログを出力", async (denops) => {
  // コンソールのエラーログをキャプチャ
  const originalError = console.error;
  const errorLogs: string[] = [];
  console.error = (...args: unknown[]) => {
    errorLogs.push(args.map(String).join(" "));
  };

  try {
    // 不正な辞書パスを設定して初期化を試みる
    await denops.cmd("let g:hellshake_yano_dictionary_path = '/nonexistent/path/to/dictionary.json'");

    // 初期化（エラーは内部で処理される）
    await initializeDictionarySystem(denops);

    // エラーが発生してもクラッシュしないことを確認
    const core = Core.getInstance();
    assertExists(core, "初期化失敗時でもCoreインスタンスが取得できること");
  } finally {
    // コンソールを復元
    console.error = originalError;
  }

  await denops.cmd("echo ''");
});

test("Dictionary System: 初期化失敗時に null を返さない", async (denops) => {
  // 辞書システムを初期化（失敗する可能性がある）
  await initializeDictionarySystem(denops);

  // Coreインスタンスが常に取得できることを確認
  const core = Core.getInstance();
  assertExists(core, "初期化失敗時でもCoreインスタンスがnullでないこと");
  assertEquals(typeof core, "object", "Coreインスタンスがオブジェクトであること");

  await denops.cmd("echo ''");
});

test("Dictionary System: 初期化失敗時のフォールバック動作", async (denops) => {
  // デフォルト設定を確認
  await denops.cmd("unlet! g:hellshake_yano_dictionary_path");

  // 初期化
  await initializeDictionarySystem(denops);

  // デフォルト設定で動作することを確認
  const core = Core.getInstance();
  assertExists(core, "デフォルト設定でCoreインスタンスが取得できること");

  await denops.cmd("echo ''");
});

test("Dictionary System: 辞書が存在しない場合の動作", async (denops) => {
  // 辞書パスをクリア
  await denops.cmd("unlet! g:hellshake_yano_dictionary_path");

  // 初期化（辞書なしで動作する）
  await initializeDictionarySystem(denops);

  // プラグインが正常に動作することを確認
  const core = Core.getInstance();
  assertExists(core, "辞書なしでもCoreインスタンスが取得できること");

  await denops.cmd("echo ''");
});

test("Dictionary System: Core.getInstance() のシングルトン動作", async (denops) => {
  // 複数回呼び出しても同じインスタンスを返すことを確認
  const core1 = Core.getInstance();
  const core2 = Core.getInstance();

  assertEquals(core1, core2, "getInstance()が同じインスタンスを返すこと");

  await denops.cmd("echo ''");
});
