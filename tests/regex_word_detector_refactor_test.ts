/**
 * RegexWordDetectorリファクタリング用テストファイル
 * TDD Red-Green-Refactorアプローチに従って、RegexWordDetectorが正規表現ベースの処理のみを行うことを確認
 */

import {
  assertEquals,
  assertExists,
  assertRejects,
} from "https://deno.land/std@0.220.0/assert/mod.ts";
import {
  RegexWordDetector,
  type WordDetectionConfig,
} from "../denops/hellshake-yano/neovim/core/word.ts";
import type { DetectionContext, Word } from "../denops/hellshake-yano/types.ts";

Deno.test("RegexWordDetector Refactoring Tests", async (t) => {
  const detectorConfig: WordDetectionConfig = {
    strategy: "regex",
    useJapanese: true,
    enableTinySegmenter: true,
    minWordLength: 1,
  };

  await t.step("英数字のみの単語検出", async () => {
    const detector = new RegexWordDetector(detectorConfig);
    const text = "hello world test123 foo-bar";
    const words = await detector.detectWords(text, 1);

    // 英数字の単語が正しく検出されることを確認
    const wordTexts = words.map((w) => w.text);
    console.log("Detected words:", wordTexts);

    // 基本的な英数字が含まれることを確認
    assertExists(wordTexts.find((w) => w.includes("hello")));
    assertExists(wordTexts.find((w) => w.includes("world")));
  });

  await t.step("日本語テキストでも正規表現ベースの処理のみ実行", async () => {
    const detector = new RegexWordDetector(detectorConfig);
    const text = "こんにちは世界 hello world";
    const words = await detector.detectWords(text, 1);

    console.log("Japanese text detection words:", words.map((w) => w.text));

    // 現在の実装では、TinySegmenter処理が呼ばれる可能性がある
    // リファクタリング後は、正規表現ベースの処理のみになるべき
    // このテストは現在の動作を記録し、リファクタリング後の変化を確認する
  });

  await t.step("複数行の処理", async () => {
    const detector = new RegexWordDetector(detectorConfig);
    const text = "line1 word1\nline2 word2\nline3 word3";
    const words = await detector.detectWords(text, 1);

    // 複数行の単語が正しく検出されることを確認
    const wordsByLine = words.reduce((acc, word) => {
      acc[word.line] = acc[word.line] || [];
      acc[word.line].push(word.text);
      return acc;
    }, {} as Record<number, string[]>);

    console.log("Multi-line words by line:", wordsByLine);

    // 各行から単語が検出されることを確認
    assertExists(wordsByLine[1]);
    assertExists(wordsByLine[2]);
    assertExists(wordsByLine[3]);
  });

  await t.step("最小文字数フィルタリング", async () => {
    const detector = new RegexWordDetector({ ...detectorConfig, minWordLength: 3 });
    const text = "a bb ccc dddd";
    const words = await detector.detectWords(text, 1);

    const wordTexts = words.map((w) => w.text);
    console.log("Filtered words (min 3 chars):", wordTexts);

    // 3文字以上の単語のみが残ることを確認
    words.forEach((word) => {
      assertEquals(
        word.text.length >= 3,
        true,
        `Word "${word.text}" should be at least 3 characters`,
      );
    });
  });

  await t.step("canHandleメソッドの動作確認", async () => {
    const detector = new RegexWordDetector(detectorConfig);

    // RegexWordDetectorは任意のテキストを処理できるべき
    assertEquals(detector.canHandle("english text"), true);
    assertEquals(detector.canHandle("日本語テキスト"), true);
    assertEquals(detector.canHandle("mixed 混合 text"), true);
    assertEquals(detector.canHandle(""), true);
  });

  await t.step("isAvailableメソッドの動作確認", async () => {
    const detector = new RegexWordDetector(detectorConfig);

    // RegexWordDetectorは常に利用可能であるべき
    const isAvailable = await detector.isAvailable();
    assertEquals(isAvailable, true);
  });

  await t.step("DetectionContextの適用確認", async () => {
    const detector = new RegexWordDetector(detectorConfig);
    const context: DetectionContext = {
      minWordLength: 5,
      currentKey: "f",
    };

    const text = "a bb ccc dddd eeeee";
    const words = await detector.detectWords(text, 1, context);

    const wordTexts = words.map((w) => w.text);
    console.log("Context filtered words (min 5 chars):", wordTexts);

    // コンテキストで指定した最小文字数が適用されることを確認
    words.forEach((word) => {
      assertEquals(
        word.text.length >= 5,
        true,
        `Word "${word.text}" should be at least 5 characters`,
      );
    });
  });
});

Deno.test("RegexWordDetector Internal Method Tests", async (t) => {
  // 内部メソッドの動作を確認するテスト
  // リファクタリング前の状態を記録し、リファクタリング後の変化を確認

  await t.step("extractWordsImproved method behavior", async () => {
    const detector = new RegexWordDetector({
      strategy: "regex",
      useJapanese: true,
      enableTinySegmenter: true,
      minWordLength: 1,
    });

    // リファクタリング前: TinySegmenter処理が含まれている可能性
    // リファクタリング後: 正規表現ベースの処理のみ

    const japaneseText = "これは日本語のテストです";
    const englishText = "this is english test";

    const japaneseWords = await detector.detectWords(japaneseText, 1);
    const englishWords = await detector.detectWords(englishText, 1);

    console.log("Japanese text result:", japaneseWords.map((w) => w.text));
    console.log("English text result:", englishWords.map((w) => w.text));

    // 現在の動作を記録（リファクタリング後の比較のため）
    assertExists(japaneseWords);
    assertExists(englishWords);
  });
});
