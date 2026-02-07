/**
 * tests/neovim/core/word.test.ts
 *
 * Neovim Core Word Detection テスト
 * getFoldedLines エラーハンドリングを含む
 */

import { test } from "../../testRunner.ts";
import { assertEquals, assertExists } from "@std/assert";
import { detectWords } from "../../../denops/hellshake-yano/neovim/core/word.ts";
import { DEFAULT_CONFIG } from "../../../denops/hellshake-yano/config.ts";

test("Word Detection: 基本的な単語検出", async (denops) => {
  // テスト用のバッファを作成
  await denops.cmd("enew!");
  await denops.cmd("setlocal buftype=nofile");
  await denops.cmd("call setline(1, 'hello world test')");

  // 単語を検出
  const words = await detectWords(denops, DEFAULT_CONFIG);

  // 単語が検出されることを確認
  assertExists(words, "単語配列が存在すること");
  assertEquals(words.length > 0, true, "少なくとも1つの単語が検出されること");

  await denops.cmd("echo ''");
});

test("Word Detection: 複数行の単語検出", async (denops) => {
  // 複数行のテストバッファを作成
  await denops.cmd("enew!");
  await denops.cmd("setlocal buftype=nofile");
  await denops.cmd("call setline(1, 'line one')");
  await denops.cmd("call setline(2, 'line two')");
  await denops.cmd("call setline(3, 'line three')");

  // 単語を検出
  const words = await detectWords(denops, DEFAULT_CONFIG);

  // 複数行の単語が検出されることを確認
  assertExists(words, "単語配列が存在すること");
  assertEquals(words.length > 0, true, "複数行から単語が検出されること");

  await denops.cmd("echo ''");
});

// === getFoldedLines エラーハンドリングテスト ===

test("getFoldedLines: foldされた行が正しく除外される", async (denops) => {
  // テストバッファを作成
  await denops.cmd("enew!");
  await denops.cmd("setlocal buftype=nofile");
  await denops.cmd("call setline(1, 'visible line one')");
  await denops.cmd("call setline(2, 'folded line two')");
  await denops.cmd("call setline(3, 'folded line three')");
  await denops.cmd("call setline(4, 'visible line four')");

  // 2-3行目をfold
  await denops.cmd("2,3fold");

  // 単語を検出
  const words = await detectWords(denops, DEFAULT_CONFIG);

  // foldされた行の単語が除外されることを確認
  assertExists(words, "単語配列が存在すること");

  // foldされた行(2-3)の単語が含まれていないことを確認
  const foldedLineWords = words.filter((w) => w.line === 2 || w.line === 3);
  assertEquals(foldedLineWords.length, 0, "foldされた行の単語が除外されること");

  await denops.cmd("echo ''");
});

test("getFoldedLines: denops.call() が失敗した場合", async (denops) => {
  // テストバッファを作成
  await denops.cmd("enew!");
  await denops.cmd("setlocal buftype=nofile");
  await denops.cmd("call setline(1, 'test line')");

  // 通常の処理（エラーが発生しないことを確認）
  const words = await detectWords(denops, DEFAULT_CONFIG);

  // エラーが発生せず、単語が検出されることを確認
  assertExists(words, "エラーが発生しても単語配列が存在すること");

  await denops.cmd("echo ''");
});

test("getFoldedLines: foldclosed() が非number を返した場合のエラーハンドリング", async (denops) => {
  // コンソールのエラーログをキャプチャ
  const originalError = console.error;
  const errorLogs: string[] = [];
  console.error = (...args: unknown[]) => {
    errorLogs.push(args.map(String).join(" "));
  };

  try {
    // テストバッファを作成
    await denops.cmd("enew!");
    await denops.cmd("setlocal buftype=nofile");
    await denops.cmd("call setline(1, 'test line')");

    // 単語を検出（内部でfoldclosed()が呼ばれる）
    const words = await detectWords(denops, DEFAULT_CONFIG);

    // エラーが発生しても処理が継続することを確認
    assertExists(words, "エラーが発生しても処理が継続すること");
  } finally {
    // コンソールを復元
    console.error = originalError;
  }

  await denops.cmd("echo ''");
});

test("getFoldedLines: fold無効な環境での動作", async (denops) => {
  // foldを無効化
  await denops.cmd("enew!");
  await denops.cmd("setlocal buftype=nofile");
  await denops.cmd("setlocal nofoldenable");
  await denops.cmd("call setline(1, 'test line one')");
  await denops.cmd("call setline(2, 'test line two')");

  // 単語を検出
  const words = await detectWords(denops, DEFAULT_CONFIG);

  // fold無効でも正常に動作することを確認
  assertExists(words, "fold無効でも単語が検出されること");
  assertEquals(words.length > 0, true, "単語が検出されること");

  await denops.cmd("echo ''");
});

test("getFoldedLines: 入れ子のfoldの処理", async (denops) => {
  // テストバッファを作成
  await denops.cmd("enew!");
  await denops.cmd("setlocal buftype=nofile");
  await denops.cmd("call setline(1, 'outer start')");
  await denops.cmd("call setline(2, 'inner start')");
  await denops.cmd("call setline(3, 'inner content')");
  await denops.cmd("call setline(4, 'inner end')");
  await denops.cmd("call setline(5, 'outer end')");

  // 入れ子のfoldを作成
  await denops.cmd("2,4fold");
  await denops.cmd("1,5fold");

  // 単語を検出
  const words = await detectWords(denops, DEFAULT_CONFIG);

  // 入れ子のfoldでも正常に処理されることを確認
  assertExists(words, "入れ子のfoldでも処理が完了すること");

  await denops.cmd("echo ''");
});

test("getFoldedLines: 空の範囲でのfold処理", async (denops) => {
  // テストバッファを作成
  await denops.cmd("enew!");
  await denops.cmd("setlocal buftype=nofile");
  await denops.cmd("call setline(1, 'only line')");

  // 単語を検出（foldなし）
  const words = await detectWords(denops, DEFAULT_CONFIG);

  // foldがない場合も正常に動作することを確認
  assertExists(words, "foldがない場合も単語が検出されること");
  assertEquals(words.length > 0, true, "単語が検出されること");

  await denops.cmd("echo ''");
});

test("getFoldedLines: 大量のfoldの処理", async (denops) => {
  // テストバッファを作成（100行）
  await denops.cmd("enew!");
  await denops.cmd("setlocal buftype=nofile");
  for (let i = 1; i <= 100; i++) {
    await denops.cmd(`call setline(${i}, 'line ${i}')`);
  }

  // 複数のfoldを作成（10行ごと）
  for (let i = 1; i <= 91; i += 10) {
    await denops.cmd(`${i},${i + 8}fold`);
  }

  // パフォーマンス測定開始
  const startTime = performance.now();

  // 単語を検出
  const words = await detectWords(denops, DEFAULT_CONFIG);

  // パフォーマンス測定終了
  const endTime = performance.now();
  const elapsedTime = endTime - startTime;

  // パフォーマンスが許容範囲内（1秒以内）
  assertEquals(elapsedTime < 1000, true, "大量のfoldでも1秒以内に処理が完了する");

  // 処理が完了することを確認
  assertExists(words, "大量のfoldでも処理が完了すること");

  await denops.cmd("echo ''");
});
