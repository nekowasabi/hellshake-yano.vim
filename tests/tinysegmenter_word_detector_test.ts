/**
 * TinySegmenterWordDetector テストファイル
 *
 * TDD Red-Green-Refactorアプローチに従ったテストケース
 *
 * テストケース:
 * 1. 日本語文章の単語検出
 * 2. 日本語と英数字の混在テキスト
 * 3. 空文字列の処理
 * 4. 複数行の処理
 * 5. canHandleメソッドの動作確認
 * 6. プロパティの確認
 */

import {
  assertEquals,
  assertExists,
  assertInstanceOf,
} from "https://deno.land/std@0.212.0/assert/mod.ts";
import { TinySegmenterWordDetector } from "../denops/hellshake-yano/neovim/core/word.ts";
import type { DetectionContext, Word } from "../denops/hellshake-yano/types.ts";

Deno.test("TinySegmenterWordDetector - プロパティの確認", () => {
  const detector = new TinySegmenterWordDetector();

  // 必須プロパティの確認
  assertEquals(detector.name, "TinySegmenterWordDetector");
  assertEquals(detector.priority, 10); // RegexWordDetectorより高い優先度
  assertEquals(detector.supportedLanguages, ["ja"]);
});

Deno.test("TinySegmenterWordDetector - canHandleメソッド - 日本語判定", () => {
  const detector = new TinySegmenterWordDetector();

  // 日本語を含むテキスト
  assertEquals(detector.canHandle("これはテストです"), true);
  assertEquals(detector.canHandle("私はJavaScriptを学習中"), true);
  assertEquals(detector.canHandle("漢字ひらがなカタカナ"), true);

  // 日本語を含まないテキスト
  assertEquals(detector.canHandle("Hello World"), false);
  assertEquals(detector.canHandle("123456"), false);
  assertEquals(detector.canHandle("test@example.com"), false);

  // 空文字列
  assertEquals(detector.canHandle(""), false);
});

Deno.test("TinySegmenterWordDetector - detectWords - 日本語文章の単語検出", async () => {
  const detector = new TinySegmenterWordDetector();
  const text = "これはテストです";
  const startLine = 1;
  const context = {
    config: {
      japaneseMergeParticles: false, // Don't merge particles for this test
    },
  };

  const words = await detector.detectWords(text, startLine, context);

  // 期待される結果: ["これ", "は", "テスト", "です"]
  assertExists(words);
  assertEquals(words.length, 4);

  assertEquals(words[0].text, "これ");
  assertEquals(words[0].line, 1);
  assertEquals(words[0].col, 1);

  assertEquals(words[1].text, "は");
  assertEquals(words[1].line, 1);
  assertEquals(words[1].col, 3); // "これ"の後

  assertEquals(words[2].text, "テスト");
  assertEquals(words[2].line, 1);
  assertEquals(words[2].col, 4); // "これは"の後

  assertEquals(words[3].text, "です");
  assertEquals(words[3].line, 1);
  assertEquals(words[3].col, 7); // "これはテスト"の後
});

Deno.test("TinySegmenterWordDetector - detectWords - 日本語と英数字の混在", async () => {
  const detector = new TinySegmenterWordDetector();
  const text = "私はJavaScriptを学習中";
  const startLine = 1;
  const context = {
    config: {
      japaneseMergeParticles: false, // Don't merge particles for this test
    },
  };

  const words = await detector.detectWords(text, startLine, context);

  assertExists(words);
  assertEquals(words.length > 0, true);

  // 少なくとも「私」、「は」、「JavaScript」、「を」、「学習」、「中」が含まれることを確認
  const wordTexts = words.map((w) => w.text);
  assertEquals(wordTexts.includes("私"), true);
  assertEquals(wordTexts.includes("は"), true);
  assertEquals(wordTexts.includes("JavaScript"), true);
  assertEquals(wordTexts.includes("を"), true);
});

Deno.test("TinySegmenterWordDetector - detectWords - 空文字列の処理", async () => {
  const detector = new TinySegmenterWordDetector();
  const text = "";
  const startLine = 1;

  const words = await detector.detectWords(text, startLine);

  assertExists(words);
  assertEquals(words.length, 0);
});

Deno.test("TinySegmenterWordDetector - detectWords - 複数行の処理（行番号の正確な計算）", async () => {
  const detector = new TinySegmenterWordDetector();
  const text = "こんにちは\n世界";
  const startLine = 5; // 開始行を5に設定

  const words = await detector.detectWords(text, startLine);

  assertExists(words);
  assertEquals(words.length > 0, true);

  // 最初の行の単語
  const firstLineWords = words.filter((w) => w.line === 5);
  assertEquals(firstLineWords.length > 0, true);

  // 2行目の単語
  const secondLineWords = words.filter((w) => w.line === 6);
  assertEquals(secondLineWords.length > 0, true);

  // 「世界」という単語が2行目に含まれることを確認
  const sekai = secondLineWords.find((w) => w.text === "世界");
  assertExists(sekai);
  assertEquals(sekai.line, 6);
  assertEquals(sekai.col, 1); // 2行目の最初
});

Deno.test("TinySegmenterWordDetector - detectWords - コンテキストパラメータの処理", async () => {
  const detector = new TinySegmenterWordDetector();
  const text = "これはテストです";
  const startLine = 1;
  const context: DetectionContext = {
    currentKey: "f",
    minWordLength: 2,
    metadata: { test: true },
  };

  const words = await detector.detectWords(text, startLine, context);

  assertExists(words);
  // コンテキストに関係なく、基本的な分割が行われることを確認
  assertEquals(words.length > 0, true);

  // 最小文字数フィルタリングが適用されることを確認（長さ1の文字は除外）
  const shortWords = words.filter((w) => w.text.length < 2);
  assertEquals(shortWords.length, 0);
});

Deno.test("TinySegmenterWordDetector - isAvailable メソッド", async () => {
  const detector = new TinySegmenterWordDetector();

  const available = await detector.isAvailable();
  assertEquals(available, true);
});

Deno.test("TinySegmenterWordDetector - 位置計算の正確性", async () => {
  const detector = new TinySegmenterWordDetector();
  const text = "あいうえお";
  const startLine = 1;

  const words = await detector.detectWords(text, startLine);

  assertExists(words);
  assertEquals(words.length > 0, true);

  // 位置が昇順で並んでいることを確認
  for (let i = 1; i < words.length; i++) {
    const prev = words[i - 1];
    const curr = words[i];

    // 同じ行の場合、列位置が昇順
    if (prev.line === curr.line) {
      assertEquals(curr.col >= prev.col + prev.text.length, true);
    }
  }
});
