/**
 * HybridWordDetector テストファイル
 *
 * TDD Red-Green-Refactorアプローチに従ったテストケース
 * RegexWordDetectorとTinySegmenterWordDetectorを組み合わせた統合型単語検出器のテスト
 *
 * テストケース:
 * 1. 英数字のみのテキスト（RegexWordDetectorの結果のみ）
 * 2. 日本語のみのテキスト（TinySegmenterWordDetectorの結果のみ）
 * 3. 日本語と英数字の混在テキスト（両方の結果をマージ）
 * 4. 重複単語の除去（同じ位置の単語は1つだけ保持）
 * 5. 空文字列の処理
 * 6. 複数行の処理
 * 7. canHandleメソッドの動作確認（常にtrue）
 * 8. プロパティの確認（name, priority, supportedLanguages）
 */

import {
  assertEquals,
  assertExists,
  assertInstanceOf,
} from "https://deno.land/std@0.212.0/assert/mod.ts";
import { HybridWordDetector } from "../denops/hellshake-yano/neovim/core/word.ts";
import type { DetectionContext, Word } from "../denops/hellshake-yano/types.ts";

Deno.test("HybridWordDetector - プロパティの確認", () => {
  const detector = new HybridWordDetector();

  // 必須プロパティの確認
  assertEquals(detector.name, "HybridWordDetector");
  assertEquals(detector.priority, 15); // 最も高い優先度
  assertEquals(detector.supportedLanguages, ["ja", "en", "any"]);
});

Deno.test("HybridWordDetector - canHandleメソッド - 常にtrue", () => {
  const detector = new HybridWordDetector();

  // あらゆるテキストを処理できる
  assertEquals(detector.canHandle("hello world"), true);
  assertEquals(detector.canHandle("こんにちは世界"), true);
  assertEquals(detector.canHandle("hello こんにちは world 世界"), true);
  assertEquals(detector.canHandle(""), true);
  assertEquals(detector.canHandle("123 456"), true);
  assertEquals(detector.canHandle("!@#$%^&*()"), true);
});

Deno.test("HybridWordDetector - 英数字のみのテキスト", async () => {
  const detector = new HybridWordDetector();
  const text = "hello world test 123";
  const words = await detector.detectWords(text, 1);

  // 英数字の単語が検出される（RegexWordDetectorの結果のみ）
  const expectedWords = ["hello", "world", "test", "123"];
  assertEquals(words.length, 4);

  words.forEach((word: Word, index: number) => {
    assertEquals(word.text, expectedWords[index]);
    assertEquals(word.line, 1);
    assertExists(word.col);
  });

  // 位置の確認
  assertEquals(words[0].col, 1); // "hello"
  assertEquals(words[1].col, 7); // "world"
  assertEquals(words[2].col, 13); // "test"
  assertEquals(words[3].col, 18); // "123"
});

Deno.test("HybridWordDetector - 日本語のみのテキスト", async () => {
  const detector = new HybridWordDetector();
  const text = "こんにちは世界です";
  const words = await detector.detectWords(text, 1);

  // 日本語の単語が検出される（TinySegmenterWordDetectorの結果のみ）
  assertExists(words);
  assertEquals(words.length > 0, true);
  assertEquals(words[0].line, 1);

  // 少なくとも1つの単語が検出されること
  words.forEach((word: Word) => {
    assertEquals(typeof word.text, "string");
    assertEquals(word.text.length > 0, true);
    assertEquals(word.line, 1);
    assertExists(word.col);
  });
});

Deno.test("HybridWordDetector - 日本語と英数字の混在テキスト", async () => {
  const detector = new HybridWordDetector();
  const text = "hello こんにちは world 世界 test";
  const words = await detector.detectWords(text, 1);

  // 両方のDetectorの結果がマージされる
  assertExists(words);
  assertEquals(words.length > 0, true);

  // 英数字の単語が含まれること
  const englishWords = words.filter((w: Word) => /^[a-zA-Z0-9]+$/.test(w.text));
  assertEquals(englishWords.length >= 3, true); // hello, world, test

  // 日本語の単語が含まれること（TinySegmenterによる分割）
  const hasJapanese = words.some((w: Word) =>
    /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(w.text)
  );
  assertEquals(hasJapanese, true);

  // すべて同じ行
  words.forEach((word: Word) => {
    assertEquals(word.line, 1);
    assertExists(word.col);
  });
});

Deno.test("HybridWordDetector - 重複単語の除去", async () => {
  const detector = new HybridWordDetector();
  // 同じ位置に異なる長さの単語がある場合のテスト
  const text = "JavaScript";
  const words = await detector.detectWords(text, 1);

  // 重複除去により、より長い単語が優先される
  assertExists(words);
  assertEquals(words.length >= 1, true);

  // 同じ位置の単語は1つだけ
  const positionMap = new Map<string, Word>();
  words.forEach((word: Word) => {
    const key = `${word.line}-${word.col}`;
    if (positionMap.has(key)) {
      // 同じ位置に複数の単語があってはならない
      throw new Error(`Duplicate position found: ${key}`);
    }
    positionMap.set(key, word);
  });
});

Deno.test("HybridWordDetector - 空文字列の処理", async () => {
  const detector = new HybridWordDetector();
  const words = await detector.detectWords("", 1);

  // 空の配列が返される
  assertEquals(words, []);
});

Deno.test("HybridWordDetector - 複数行の処理", async () => {
  const detector = new HybridWordDetector();
  const text = "hello world\nこんにちは世界\ntest テスト";
  const words = await detector.detectWords(text, 1);

  assertExists(words);
  assertEquals(words.length > 0, true);

  // 行番号の確認
  const line1Words = words.filter((w: Word) => w.line === 1);
  const line2Words = words.filter((w: Word) => w.line === 2);
  const line3Words = words.filter((w: Word) => w.line === 3);

  assertEquals(line1Words.length > 0, true); // hello world
  assertEquals(line2Words.length > 0, true); // こんにちは世界
  assertEquals(line3Words.length > 0, true); // test テスト

  // 位置順にソートされていることを確認
  for (let i = 1; i < words.length; i++) {
    const prev = words[i - 1];
    const curr = words[i];

    // 行番号が小さいか、同じ行なら列番号が小さい
    assertEquals(
      prev.line < curr.line || (prev.line === curr.line && prev.col <= curr.col),
      true,
      `Words should be sorted by position. Previous: ${prev.line}:${prev.col}, Current: ${curr.line}:${curr.col}`,
    );
  }
});

Deno.test("HybridWordDetector - 位置順ソート", async () => {
  const detector = new HybridWordDetector();
  const text = "world hello\ntest";
  const words = await detector.detectWords(text, 5); // startLine = 5

  assertExists(words);
  assertEquals(words.length >= 3, true);

  // startLineが正しく適用されているか
  words.forEach((word: Word) => {
    assertEquals(word.line >= 5, true);
  });

  // 位置順ソートの確認
  for (let i = 1; i < words.length; i++) {
    const prev = words[i - 1];
    const curr = words[i];

    assertEquals(
      prev.line < curr.line || (prev.line === curr.line && prev.col <= curr.col),
      true,
    );
  }
});

Deno.test("HybridWordDetector - DetectionContextの使用", async () => {
  const detector = new HybridWordDetector();
  const context: DetectionContext = {
    currentKey: "f",
    minWordLength: 2,
    metadata: { source: "test" },
    bufnr: 1,
  };

  const text = "hello こんにちは";
  const words = await detector.detectWords(text, 1, context);

  assertExists(words);
  assertEquals(words.length > 0, true);

  // contextがあっても正常に動作する
  words.forEach((word: Word) => {
    assertEquals(typeof word.text, "string");
    assertEquals(word.line, 1);
    assertExists(word.col);
  });
});
