#!/usr/bin/env -S deno test --allow-all

/**
 * 日本語フィルタリングのテスト
 * useJapanese設定が正しく動作することを確認
 */

import { assertEquals } from "@std/assert";
import { beforeEach, describe, it } from "@std/testing/bdd";
import {
  detectWordsWithConfig,
  extractWords,
  resetWordDetectionManager,
} from "../denops/hellshake-yano/neovim/core/word.ts";

describe("Japanese Filtering Tests", () => {
  describe("extractWords with Japanese exclusion", () => {
    it("should exclude Japanese when excludeJapanese is true", () => {
      const line = "hello こんにちは world 世界 test テスト 123";

      // 日本語を除外
      const wordsExcluded = extractWords(line, 1, { useJapanese: true, excludeJapanese: true });
      const textsExcluded = wordsExcluded.map((w) => w.text);

      // 英数字のみが抽出されるべき（数字は除外される）
      assertEquals(textsExcluded, ["hello", "world", "test"]);

      // 日本語を含む
      const wordsIncluded = extractWords(line, 1, { useJapanese: true, excludeJapanese: false });
      const textsIncluded = wordsIncluded.map((w) => w.text);

      // 日本語も含まれるべき
      assertEquals(textsIncluded.includes("こんにちは"), true);
      assertEquals(textsIncluded.includes("世界"), true);
      assertEquals(textsIncluded.includes("テスト"), true);
    });

    it("should handle single character words with Japanese exclusion", () => {
      const line = "A あ B い C う D え E お";

      // 日本語を除外
      const wordsExcluded = extractWords(line, 1, { useJapanese: true, excludeJapanese: true });
      const textsExcluded = wordsExcluded.map((w) => w.text);

      // 1文字の英字は除外される（デフォルトの最小文字数フィルタ）
      assertEquals(textsExcluded, []);

      // 日本語を含む
      const wordsIncluded = extractWords(line, 1, { useJapanese: true, excludeJapanese: false });
      const textsIncluded = wordsIncluded.map((w) => w.text);

      // 新しいAPIでは単一文字はフィルタされるため検出されない
      assertEquals(textsIncluded.includes("あ"), false);
      assertEquals(textsIncluded.includes("い"), false);
    });

    it("should handle mixed content with Japanese exclusion", () => {
      const line = "function関数 variable変数 constant定数";

      // 日本語を除外
      const wordsExcluded = extractWords(line, 1, { useJapanese: true, excludeJapanese: true });
      const textsExcluded = wordsExcluded.map((w) => w.text);

      // 英字部分のみが抽出されるべき
      assertEquals(textsExcluded.includes("function"), true);
      assertEquals(textsExcluded.includes("variable"), true);
      assertEquals(textsExcluded.includes("constant"), true);
      assertEquals(textsExcluded.includes("関数"), false);
      assertEquals(textsExcluded.includes("変数"), false);
      assertEquals(textsExcluded.includes("定数"), false);
    });
  });

  // 簡易テスト: extractWords関数で直接テスト（detectWordsWithConfigはDenops依存が強く、モックが複雑になるため省略）
  describe("extractWords with Japanese setting (simplified)", () => {
    it("should respect useJapanese=false setting", () => {
      const line = "hello こんにちは world テスト test 試験";

      const words = extractWords(line, 1, { useJapanese: false });
      const texts = words.map((w) => w.text);

      // 英数字のみが含まれるべき
      assertEquals(texts.includes("hello"), true);
      assertEquals(texts.includes("world"), true);
      assertEquals(texts.includes("test"), true);

      // 日本語は含まれないべき
      assertEquals(texts.includes("こんにちは"), false);
      assertEquals(texts.includes("テスト"), false);
      assertEquals(texts.includes("試験"), false);
    });

    it("should include Japanese when useJapanese=true", () => {
      const line = "hello こんにちは world テスト test 試験";

      const words = extractWords(line, 1, { useJapanese: true });
      const texts = words.map((w) => w.text);

      // 英数字と日本語の両方が含まれるべき
      assertEquals(texts.includes("hello"), true);
      assertEquals(texts.includes("world"), true);
      assertEquals(texts.includes("test"), true);
      // 日本語も含まれる（TinySegmenterによる分割結果）
      // 注: 分割結果は実装依存のため、少なくとも日本語文字が検出されることを確認
      const hasJapanese = texts.some((t) => /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(t));
      assertEquals(hasJapanese, true);
    });

    it("should default to including Japanese when useJapanese is undefined", () => {
      const line = "hello こんにちは world テスト";

      const words = extractWords(line, 1, {
        // useJapanese is undefined
      });
      const texts = words.map((w) => w.text);

      // デフォルトでは日本語を含めるべき
      assertEquals(texts.includes("hello"), true);
      assertEquals(texts.includes("world"), true);
      assertEquals(texts.includes("こんにちは"), true);
      assertEquals(texts.includes("テスト"), true);
    });
  });

  describe("Backward compatibility", () => {
    it("should maintain backward compatibility with useImprovedDetection=false", () => {
      const line = "hello world test";

      // Process4 Analysis: この行は後方互換性テストのため意図的に従来動作を使用
      // 改善版無効の場合（従来の動作）
      const wordsOld = extractWords(line, 1, { useJapanese: false });

      // 2文字以上の単語のみが抽出されるべき（従来の動作）
      const textsOld = wordsOld.map((w) => w.text);
      assertEquals(textsOld, ["hello", "world", "test"]);
    });

    it("should handle single chars only with improved detection", () => {
      const line = "A B C D E";

      // Process4 Analysis: この行は従来動作との差分確認のため意図的に従来動作を使用
      // 改善版無効（従来）
      const wordsOld = extractWords(line, 1, { useJapanese: false });
      assertEquals(wordsOld.length, 0); // 1文字は検出されない

      // 改善版有効（ただし1文字はデフォルトで除外される）
      const wordsNew = extractWords(line, 1, { useJapanese: true, excludeJapanese: true });
      assertEquals(wordsNew.length, 0); // 1文字は検出されない
    });
  });
});
