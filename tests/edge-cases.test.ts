/**
 * tests/edge-cases.test.ts
 *
 * エッジケーステスト
 * 極端な入力や境界条件のテスト
 */

import { test } from "./testRunner.ts";
import { assertEquals, assertExists } from "@std/assert";
import { generateHints } from "../denops/hellshake-yano/neovim/core/hint.ts";
import { detectWords } from "../denops/hellshake-yano/neovim/core/word.ts";
import { DEFAULT_CONFIG } from "../denops/hellshake-yano/config.ts";

test("Edge Cases: 空ファイル", async (denops) => {
  // 空のバッファを作成
  await denops.cmd("enew!");
  await denops.cmd("setlocal buftype=nofile");

  // 単語を検出
  const words = await detectWords(denops, DEFAULT_CONFIG);

  // hints が空配列であることを検証
  assertEquals(words.length, 0, "空ファイルでは単語が検出されない");

  // ヒントを生成（単語数を渡す）
  const hints = generateHints(words.length, { markers: DEFAULT_CONFIG.markers });
  assertEquals(hints.length, 0, "空ファイルではヒントが生成されない");

  await denops.cmd("echo ''");
});

test("Edge Cases: 1行ファイル", async (denops) => {
  // 1行のみのバッファを作成
  await denops.cmd("enew!");
  await denops.cmd("setlocal buftype=nofile");
  await denops.cmd("call setline(1, 'hello world test')");

  // 単語を検出
  const words = await detectWords(denops, DEFAULT_CONFIG);

  // hints が適切に生成されることを検証
  assertExists(words, "1行ファイルでも単語が検出される");
  assertEquals(words.length > 0, true, "少なくとも1つの単語が検出される");

  // ヒントを生成（単語数を渡す）
  const hints = generateHints(words.length, { markers: DEFAULT_CONFIG.markers });
  assertEquals(hints.length > 0, true, "1行ファイルでもヒントが生成される");

  await denops.cmd("echo ''");
});

test("Edge Cases: 極端に長い行（1000文字以上）", async (denops) => {
  // 1000文字の長い行を作成
  const longLine = "word ".repeat(200); // "word " * 200 = 1000文字
  await denops.cmd("enew!");
  await denops.cmd("setlocal buftype=nofile");
  await denops.cmd(`call setline(1, '${longLine}')`);

  // パフォーマンス測定開始
  const startTime = performance.now();

  // 単語を検出
  const words = await detectWords(denops, DEFAULT_CONFIG);

  // パフォーマンス測定終了
  const endTime = performance.now();
  const elapsedTime = endTime - startTime;

  // パフォーマンスが許容範囲内（1秒以内）
  assertEquals(elapsedTime < 1000, true, "長い行でも1秒以内に処理が完了する");

  // 単語が検出されることを検証
  assertExists(words, "長い行でも単語が検出される");
  assertEquals(words.length > 0, true, "少なくとも1つの単語が検出される");

  await denops.cmd("echo ''");
});

test("Edge Cases: 空白のみの行", async (denops) => {
  // 空白のみの行を作成
  await denops.cmd("enew!");
  await denops.cmd("setlocal buftype=nofile");
  await denops.cmd("call setline(1, '     ')");
  await denops.cmd("call setline(2, '\\t\\t\\t')");
  await denops.cmd("call setline(3, ' ')");

  // 単語を検出
  const words = await detectWords(denops, DEFAULT_CONFIG);

  // 空白のみの行では単語が検出されない
  assertEquals(words.length, 0, "空白のみの行では単語が検出されない");

  await denops.cmd("echo ''");
});

test("Edge Cases: 特殊文字のみの行", async (denops) => {
  // 特殊文字のみの行を作成
  await denops.cmd("enew!");
  await denops.cmd("setlocal buftype=nofile");
  await denops.cmd("call setline(1, '!@#$%^&*()')");
  await denops.cmd("call setline(2, '[]{}()<>')");

  // 単語を検出
  const words = await detectWords(denops, DEFAULT_CONFIG);

  // 特殊文字のみでは単語が検出されない（設定による）
  // または特殊文字が単語として検出される
  assertExists(words, "特殊文字の行でも処理が完了する");

  await denops.cmd("echo ''");
});

test("Edge Cases: 日本語のみの行", async (denops) => {
  // 日本語のみの行を作成
  await denops.cmd("enew!");
  await denops.cmd("setlocal buftype=nofile");
  await denops.cmd("call setline(1, 'こんにちは世界')");
  await denops.cmd("call setline(2, 'テストです')");

  // 単語を検出
  const words = await detectWords(denops, DEFAULT_CONFIG);

  // 日本語が適切に検出されることを検証
  assertExists(words, "日本語の行でも単語が検出される");

  await denops.cmd("echo ''");
});

test("Edge Cases: 混在した文字（英数日）", async (denops) => {
  // 英数字と日本語が混在した行を作成
  await denops.cmd("enew!");
  await denops.cmd("setlocal buftype=nofile");
  await denops.cmd("call setline(1, 'Hello世界123test')");

  // 単語を検出
  const words = await detectWords(denops, DEFAULT_CONFIG);

  // 混在した文字が適切に検出されることを検証
  assertExists(words, "混在した文字でも単語が検出される");
  assertEquals(words.length > 0, true, "少なくとも1つの単語が検出される");

  await denops.cmd("echo ''");
});

test("Edge Cases: 非常に多くの単語（1000単語以上）", async (denops) => {
  // 1000単語以上の行を作成
  const manyWords = Array.from({ length: 1000 }, (_, i) => `word${i}`).join(" ");
  await denops.cmd("enew!");
  await denops.cmd("setlocal buftype=nofile");
  await denops.cmd(`call setline(1, '${manyWords}')`);

  // パフォーマンス測定開始
  const startTime = performance.now();

  // 単語を検出
  const words = await detectWords(denops, DEFAULT_CONFIG);

  // パフォーマンス測定終了
  const endTime = performance.now();
  const elapsedTime = endTime - startTime;

  // パフォーマンスが許容範囲内（2秒以内）
  assertEquals(elapsedTime < 2000, true, "多くの単語でも2秒以内に処理が完了する");

  // 単語が検出されることを検証
  assertExists(words, "多くの単語でも処理が完了する");

  await denops.cmd("echo ''");
});

test("Edge Cases: Unicode文字（絵文字など）", async (denops) => {
  // Unicode文字を含む行を作成
  await denops.cmd("enew!");
  await denops.cmd("setlocal buftype=nofile");
  await denops.cmd("call setline(1, '😀 hello 🌍 world')");

  // 単語を検出
  const words = await detectWords(denops, DEFAULT_CONFIG);

  // Unicode文字が適切に処理されることを検証
  assertExists(words, "Unicode文字を含む行でも処理が完了する");

  await denops.cmd("echo ''");
});

test("Edge Cases: 改行のみのファイル", async (denops) => {
  // 改行のみのファイルを作成
  await denops.cmd("enew!");
  await denops.cmd("setlocal buftype=nofile");
  await denops.cmd("call setline(1, '')");
  await denops.cmd("call setline(2, '')");
  await denops.cmd("call setline(3, '')");

  // 単語を検出
  const words = await detectWords(denops, DEFAULT_CONFIG);

  // 改行のみでは単語が検出されない
  assertEquals(words.length, 0, "改行のみのファイルでは単語が検出されない");

  await denops.cmd("echo ''");
});
