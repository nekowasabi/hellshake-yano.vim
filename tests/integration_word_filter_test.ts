/**
 * Process 50 Sub3: 統合テスト
 * 日本語除外機能とヒント表示位置改善の統合テスト
 */

import { assert, assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import type { Word } from "../denops/hellshake-yano/types.ts";
import {
  type EnhancedWordConfig,
  extractWords,
} from "../denops/hellshake-yano/neovim/core/word.ts";
import {
  assignHintsToWords,
  calculateHintPosition,
  generateHints,
} from "../denops/hellshake-yano/neovim/core/hint.ts";

describe("Integration Test - Word Filtering & Hint Positioning", () => {
  describe("End-to-end word detection and hint assignment", () => {
    it("should extract English words and calculate correct hint positions", () => {
      const lineText = "これはtest実装example コードです";
      const config: EnhancedWordConfig = { useJapanese: false };

      // Phase 1: 英数字のみ抽出
      const words = extractWords(lineText, 1, config);
      assertEquals(words.length, 2);
      assertEquals(words[0].text, "test");
      assertEquals(words[1].text, "example");

      // Phase 2: ヒント位置計算
      const hints = generateHints(words.length, ["A", "B", "C"]);
      const hintMappings = assignHintsToWords(words, hints, 1, 1);

      // ヒント位置の確認
      const position1 = calculateHintPosition(words[0], "start");
      const position2 = calculateHintPosition(words[1], "start");

      assertEquals(position1.line, 1);
      assertEquals(position1.col, words[0].col); // "test"の開始位置
      assertEquals(position1.display_mode, "before");

      assertEquals(position2.line, 1);
      assertEquals(position2.col, words[1].col); // "example"の開始位置
      assertEquals(position2.display_mode, "before");
    });

    it("should handle mixed content with different hint positions", () => {
      const lineText = "関数function変数variable定数constant";
      const config: EnhancedWordConfig = { useJapanese: false };

      const words = extractWords(lineText, 2, config);
      assertEquals(words.length, 3);
      assertEquals(words[0].text, "function");
      assertEquals(words[1].text, "variable");
      assertEquals(words[2].text, "constant");

      // 異なるヒント位置での動作確認
      const startPos = calculateHintPosition(words[0], "start");
      const endPos = calculateHintPosition(words[1], "end");
      const overlayPos = calculateHintPosition(words[2], "overlay");

      assertEquals(startPos.display_mode, "before");
      assertEquals(endPos.display_mode, "after");
      assertEquals(overlayPos.display_mode, "overlay");

      // 終端位置の計算確認
      assertEquals(endPos.col, words[1].col + words[1].text.length - 1);
    });
  });

  describe("Japanese inclusive mode integration", () => {
    it("should work with Japanese mode and positioning", () => {
      const lineText = "コードcode実装implement";
      const config: EnhancedWordConfig = { useJapanese: true };

      const words = extractWords(lineText, 1, config);
      // 混在テキストは全体が1つの単語として抽出される
      assert(words.length === 1);

      // 全体が1つの単語として抽出される
      assertEquals(words[0].text, "コードcode実装implement");

      // 日本語文字が含まれることを確認
      const japaneseChars = words.filter((w) => /[\u30A0-\u30FF\u4E00-\u9FAF]/.test(w.text));
      assert(japaneseChars.length > 0);

      // ヒント位置計算
      words.forEach((word, index) => {
        const position = calculateHintPosition(word, "start");
        assertEquals(position.line, 1);
        assertEquals(position.col, word.col);
        assertEquals(position.display_mode, "before");
      });
    });
  });

  describe("Multiple lines integration", () => {
    it("should handle multi-line content correctly", () => {
      const lines = [
        "第一行first line",
        "  indented second行",
        "最後のlast line",
      ];
      const config: EnhancedWordConfig = { useJapanese: false };

      const allWords: Word[] = [];
      lines.forEach((lineText, index) => {
        const lineWords = extractWords(lineText, index + 1, config);
        allWords.push(...lineWords);
      });

      // 英数字のみが抽出されること
      assertEquals(allWords.length, 6);
      assertEquals(allWords[0].text, "first");
      assertEquals(allWords[1].text, "line");
      assertEquals(allWords[2].text, "indented");
      assertEquals(allWords[3].text, "second");
      assertEquals(allWords[4].text, "last");
      assertEquals(allWords[5].text, "line");

      // 行番号が正しく設定されること
      assertEquals(allWords[0].line, 1);
      assertEquals(allWords[2].line, 2); // インデントされた行
      assertEquals(allWords[4].line, 3);
      assertEquals(allWords[5].line, 3);

      // ヒント位置が正しく計算されること
      allWords.forEach((word) => {
        const position = calculateHintPosition(word, "start");
        assertEquals(position.line, word.line);
        assertEquals(position.col, word.col);
      });
    });
  });

  describe("Performance integration test", () => {
    it("should handle large mixed content efficiently", () => {
      // 大量の混在コンテンツを生成
      const englishWords = Array(100).fill(0).map((_, i) => `word${i}`);
      const japaneseWords = Array(100).fill(0).map((_, i) => `単語${i}`);
      const mixed = [];
      for (let i = 0; i < 100; i++) {
        mixed.push(englishWords[i], japaneseWords[i]);
      }
      const lineText = mixed.join(" ");
      const config: EnhancedWordConfig = { useJapanese: false };

      const startTime = Date.now();

      // Phase 1: 単語抽出
      const words = extractWords(lineText, 1, config);

      // Phase 2: ヒント生成と位置計算
      const hints = generateHints(words.length, "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""));
      // NOTE: カーソル位置(0,0)を使用してカーソル位置の単語除外を回避
      const hintMappings = assignHintsToWords(words, hints, 0, 0);

      // Phase 3: 位置計算
      const positions = words.map((word) => calculateHintPosition(word, "start"));

      const endTime = Date.now();

      // 結果検証（改善版では1文字の単語も検出されるため、より多くの単語が検出される）
      assertEquals(words.length, 100); // 1行あたりの上限は100に統一
      // NOTE: カーソル位置を(0,0)に変更したため、100個すべてが検出される
      assertEquals(hintMappings.length, 100);
      assertEquals(positions.length, 100);

      // パフォーマンス確認（実行時間をログ出力し、3000ms以内で検証）
      const executionTime = endTime - startTime;
      console.log(`Performance test execution time: ${executionTime}ms`);
      assertEquals(executionTime < 3000, true);

      // 全ての位置が正しく計算されていること
      positions.forEach((pos, index) => {
        assertEquals(pos.line, 1);
        assertEquals(pos.col, words[index].col);
        assertEquals(pos.display_mode, "before");
      });
    });
  });

  describe("Configuration integration", () => {
    it("should work with different configurations consistently", () => {
      const lineText = "設定config変更change適用apply";

      // 設定1: 日本語除外
      const config1: EnhancedWordConfig = { useJapanese: false };
      const words1 = extractWords(lineText, 1, config1);
      assertEquals(words1.length, 3);
      assertEquals(words1.map((w) => w.text), ["config", "change", "apply"]);

      // 設定2: 日本語包含（混在テキストは全体が1つの単語として抽出される）
      const config2: EnhancedWordConfig = { useJapanese: true };
      const words2 = extractWords(lineText, 1, config2);
      // 混在テキストは全体が1つの単語として抽出される
      assert(words2.length === 1);

      // 全体が1つの単語として抽出される
      assertEquals(words2[0].text, "設定config変更change適用apply");

      // 日本語文字が含まれることを確認
      const hasJapanese = words2.some((w) => /[\u4E00-\u9FAF]/.test(w.text));
      assert(hasJapanese);

      // 両方の設定でヒント位置計算が正常に動作すること
      [words1, words2].forEach((words) => {
        words.forEach((word) => {
          const startPos = calculateHintPosition(word, "start");
          const endPos = calculateHintPosition(word, "end");
          const overlayPos = calculateHintPosition(word, "overlay");

          assertEquals(startPos.display_mode, "before");
          assertEquals(endPos.display_mode, "after");
          assertEquals(overlayPos.display_mode, "overlay");

          assertEquals(startPos.col, word.col);
          // endPos.colは表示幅を考慮した計算になる
          // 日本語文字は幅2、英数字は幅1として計算される
          const displayWidth = word.text.split("").reduce((width, char) => {
            // 簡易的な判定：日本語文字かどうか
            if (/[\u4E00-\u9FAF\u3040-\u309F\u30A0-\u30FF]/.test(char)) {
              return width + 2;
            }
            return width + 1;
          }, 0);
          assertEquals(endPos.col, word.col + displayWidth - 1);
          assertEquals(overlayPos.col, word.col);
        });
      });
    });
  });

  describe("Edge cases integration", () => {
    it("should handle edge cases gracefully", () => {
      const edgeCases = [
        "",
        "   ",
        "日本語のみです",
        "english only",
        "a",
        "123",
        "mixed123数字456text",
      ];

      const config: EnhancedWordConfig = { useJapanese: false };

      edgeCases.forEach((lineText, index) => {
        const words = extractWords(lineText, index + 1, config);

        // エラーが発生しないこと
        assertExists(words);

        // 抽出された単語の位置計算が正常に動作すること
        words.forEach((word) => {
          const position = calculateHintPosition(word, "start");
          assertEquals(position.line, index + 1);
          assertEquals(position.col, word.col);
          assertEquals(position.display_mode, "before");
        });
      });
    });
  });
});
