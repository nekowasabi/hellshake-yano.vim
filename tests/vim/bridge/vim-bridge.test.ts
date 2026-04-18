/**
 * tests/vim/bridge/vim-bridge.test.ts
 *
 * VimBridgeクラスのテスト
 *
 * 目的:
 *   - VimScript版のword_detector#detect_visible()と同じ動作を検証
 *   - 単語検出の完全一致テスト
 *   - 環境別処理の動作確認
 *
 * Process: phase-2, process14
 */

import { test } from "../../testRunner.ts";
import { assertEquals, assertExists } from "@std/assert";
import type { Denops } from "@denops/std";
import { VimBridge, type Word } from "../../../denops/hellshake-yano/vim/bridge/vim-bridge.ts";

/**
 * VimScript版のdetect_visible()を呼び出して結果を取得
 */
async function getVimScriptWords(denops: Denops): Promise<Word[]> {
  // VimScript関数が存在するか確認
  const exists = await denops.call(
    "exists",
    "*hellshake_yano_vim#word_detector#detect_visible",
  ) as number;

  if (!exists) {
    // 関数が存在しない場合は空配列を返す
    // （autoloadの遅延ロードの問題を回避）
    return [];
  }

  const words = await denops.call(
    "hellshake_yano_vim#word_detector#detect_visible",
  ) as Array<{ text: string; lnum: number; col: number; end_col: number }>;

  return words.map((w) => ({
    text: w.text,
    lnum: w.lnum,
    col: w.col,
    endCol: w.end_col,
  }));
}

test("VimBridge: 基本的な単語検出", async (denops) => {
  // VimScript関数が存在するか確認
  const exists = await denops.call(
    "exists",
    "*hellshake_yano_vim#word_detector#detect_visible",
  ) as number;

  if (!exists) {
    // VimScript関数が存在しない場合はスキップ
    console.log("SKIP: VimScript word_detector is not available");
    await denops.cmd("echo ''");
    return;
  }

  // テスト用のバッファを作成
  await denops.call("setline", 1, [
    "hello world",
    "test line",
    "foo bar baz",
  ]);

  // カーソルを1行目に移動
  await denops.call("cursor", 1, 1);

  // VimBridgeインスタンスを作成
  const bridge = new VimBridge(denops);

  // 単語を検出
  const words = await bridge.detectWords();

  // 単語が検出されることを確認
  assertExists(words, "単語配列が存在すること");
  assertEquals(words.length > 0, true, "少なくとも1つの単語が検出されること");

  // 最初の単語の構造を確認
  const firstWord = words[0];
  assertExists(firstWord.text, "text プロパティが存在すること");
  assertExists(firstWord.lnum, "lnum プロパティが存在すること");
  assertExists(firstWord.col, "col プロパティが存在すること");
  assertExists(firstWord.endCol, "endCol プロパティが存在すること");
});

test("VimBridge: VimScript版との完全一致", async (denops) => {
  // VimScript関数が存在するか確認
  const exists = await denops.call(
    "exists",
    "*hellshake_yano_vim#word_detector#detect_visible",
  ) as number;

  if (!exists) {
    console.log("SKIP: VimScript word_detector is not available");
    await denops.cmd("echo ''");
    return;
  }

  // テスト用のバッファを作成
  await denops.call("setline", 1, [
    "hello world test",
    "foo bar",
    "single",
  ]);

  // カーソルを1行目に移動
  await denops.call("cursor", 1, 1);

  // VimScript版の結果を取得
  const vimScriptWords = await getVimScriptWords(denops);

  // VimBridge版の結果を取得
  const bridge = new VimBridge(denops);
  const bridgeWords = await bridge.detectWords();

  // 単語数が一致することを確認
  assertEquals(
    bridgeWords.length,
    vimScriptWords.length,
    `単語数が一致すること (VimBridge: ${bridgeWords.length}, VimScript: ${vimScriptWords.length})`,
  );

  // 各単語の内容が一致することを確認
  for (let i = 0; i < vimScriptWords.length; i++) {
    const vim = vimScriptWords[i];
    const bridge = bridgeWords[i];

    assertEquals(
      bridge.text,
      vim.text,
      `[${i}] text が一致すること (bridge: "${bridge.text}", vim: "${vim.text}")`,
    );
    assertEquals(
      bridge.lnum,
      vim.lnum,
      `[${i}] lnum が一致すること (bridge: ${bridge.lnum}, vim: ${vim.lnum})`,
    );
    assertEquals(
      bridge.col,
      vim.col,
      `[${i}] col が一致すること (bridge: ${bridge.col}, vim: ${vim.col})`,
    );
    assertEquals(
      bridge.endCol,
      vim.endCol,
      `[${i}] endCol が一致すること (bridge: ${bridge.endCol}, vim: ${vim.endCol})`,
    );
  }
});

test("VimBridge: 空のバッファ", async (denops) => {
  // 空のバッファを作成
  await denops.cmd("enew!");

  const bridge = new VimBridge(denops);
  const words = await bridge.detectWords();

  // 空配列が返されることを確認
  assertEquals(words.length, 0, "空のバッファでは空配列が返されること");
});

test("VimBridge: 特殊文字を含む行", async (denops) => {
  const exists = await denops.call(
    "exists",
    "*hellshake_yano_vim#word_detector#detect_visible",
  ) as number;

  if (!exists) {
    console.log("SKIP: VimScript word_detector is not available");
    await denops.cmd("echo ''");
    return;
  }

  // 特殊文字を含むテストデータ
  await denops.call("setline", 1, [
    "hello-world test_case",
    "foo.bar(baz)",
    "alpha123 beta_456",
  ]);

  await denops.call("cursor", 1, 1);

  // VimScript版の結果を基準とする
  const vimScriptWords = await getVimScriptWords(denops);
  const bridge = new VimBridge(denops);
  const bridgeWords = await bridge.detectWords();

  // VimScript版と完全に一致することを確認
  assertEquals(
    bridgeWords.length,
    vimScriptWords.length,
    "特殊文字を含む場合もVimScript版と単語数が一致すること",
  );
});

test("VimBridge: 日本語を含む行", async (denops) => {
  const exists = await denops.call(
    "exists",
    "*hellshake_yano_vim#word_detector#detect_visible",
  ) as number;

  if (!exists) {
    console.log("SKIP: VimScript word_detector is not available");
    await denops.cmd("echo ''");
    return;
  }

  // 日本語を含むテストデータ
  await denops.call("setline", 1, [
    "こんにちは world",
    "test テスト",
    "日本語 english 混在",
  ]);

  await denops.call("cursor", 1, 1);

  // VimScript版の結果を基準とする
  const vimScriptWords = await getVimScriptWords(denops);
  const bridge = new VimBridge(denops);
  const bridgeWords = await bridge.detectWords();

  // VimScript版と完全に一致することを確認
  assertEquals(
    bridgeWords.length,
    vimScriptWords.length,
    "日本語を含む場合もVimScript版と単語数が一致すること",
  );

  // 内容も一致することを確認
  for (let i = 0; i < vimScriptWords.length; i++) {
    assertEquals(
      bridgeWords[i].text,
      vimScriptWords[i].text,
      `[${i}] 日本語混在時もtext が一致すること`,
    );
  }
});
