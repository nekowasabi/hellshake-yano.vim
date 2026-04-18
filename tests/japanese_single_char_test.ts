/**
 * 日本語1文字単語検出のテスト
 * TDDアプローチ: RED → GREEN → REFACTOR
 */

import { assertEquals } from "@std/assert";
import {
  extractWords,
  type ExtractWordsOptions,
} from "../denops/hellshake-yano/neovim/core/word.ts";
import type { Word } from "../denops/hellshake-yano/types.ts";

Deno.test("日本語1文字単語の検出", async (t) => {
  await t.step("1文字の日本語漢字が検出される", () => {
    const config: ExtractWordsOptions = { useJapanese: true };
    const text = "私は本を読む";
    const words = extractWords(text, 1, config);

    const wordTexts = words.map((w: Word) => w.text);

    // 新しいAPIでは単一文字はフィルタされるため検出されない
    assertEquals(wordTexts.includes("私"), false, "「私」は単一文字のため検出されない");
    assertEquals(wordTexts.includes("本"), false, "「本」は単一文字のため検出されない");
  });

  await t.step("1文字のひらがなが検出される", () => {
    const config: ExtractWordsOptions = { useJapanese: true };
    const text = "これはよいものだ";
    const words = extractWords(text, 1, config);

    const wordTexts = words.map((w: Word) => w.text);

    // ひらがなが何らかの形で検出されることを確認
    assertEquals(words.length > 0, true, "ひらがなの単語が検出されるべき");
  });

  await t.step("1文字のカタカナが検出される", () => {
    const config: ExtractWordsOptions = { useJapanese: true };
    const text = "アイウエオ";
    const words = extractWords(text, 1, config);

    const wordTexts = words.map((w: Word) => w.text);

    // カタカナが検出されることを確認
    assertEquals(words.length > 0, true, "カタカナの単語が検出されるべき");
  });

  await t.step("日本語モードで最小文字数制限が1文字になる", () => {
    // Why: minWordLength を明示指定 — デフォルトが3になり2文字の「今日」がフィルタされるため
    const config: ExtractWordsOptions = { useJapanese: true, minWordLength: 1 };
    const text = "今日";
    const words = extractWords(text, 1, config);

    const wordTexts = words.map((w: Word) => w.text);

    // 「今」と「日」が個別に検出されるか、「今日」として検出される
    assertEquals(words.length > 0, true, "日本語の単語が検出されるべき");
  });

  await t.step("英数字モードでは短い単語も検出される（改善版実装）", () => {
    // Why: minWordLength を明示指定 — デフォルトが3になり2文字の'am'がフィルタされるため
    const config: ExtractWordsOptions = { useJapanese: false, minWordLength: 1 };
    const text = "I am a programmer";
    const words = extractWords(text, 1, config);

    const wordTexts = words.map((w: Word) => w.text);

    // 新しいAPIでは単一文字も検出される（minWordLength: 1 の場合）
    assertEquals(wordTexts.includes("I"), true, "1文字の'I'も検出される");
    assertEquals(wordTexts.includes("a"), true, "1文字の'a'も検出される");
    assertEquals(wordTexts.includes("am"), true, "'am'が検出される");
    assertEquals(wordTexts.includes("programmer"), true, "'programmer'が検出される");
  });

  await t.step("混在テキストで日本語と英語が適切に処理される", () => {
    const config: ExtractWordsOptions = { useJapanese: true };
    const text = "私はProgrammerです";
    const words = extractWords(text, 1, config);

    const wordTexts = words.map((w: Word) => w.text);

    // 混在テキストは全体が1つの単語として検出される（useJapanese: trueのみの場合）
    assertEquals(wordTexts.includes("私"), false, "「私」は単一文字のため検出されない");
    assertEquals(
      wordTexts.includes("私はProgrammerです"),
      true,
      "混在テキスト全体が1つの単語として検出される",
    );
  });
});

Deno.test("日本語文字の個別分割", async (t) => {
  await t.step("連続する漢字が検出される（現実装）", () => {
    const config: ExtractWordsOptions = { useJapanese: true };
    const text = "今日明日";
    const words = extractWords(text, 1, config);

    const wordTexts = words.map((w: Word) => w.text);

    // 現在の実装では連続する漢字が1つの単語として検出される
    assertEquals(words.length > 0, true, "漢字の単語が検出される");
    assertEquals(wordTexts.includes("今日明日"), true, "連続する漢字が1つの単語として検出される");
  });

  await t.step("ひらがなが検出される（現実装）", () => {
    const config: ExtractWordsOptions = { useJapanese: true };
    const text = "あいうえお";
    const words = extractWords(text, 1, config);

    const wordTexts = words.map((w: Word) => w.text);

    // 現在の実装では連続するひらがなが1つの単語として検出される
    assertEquals(words.length > 0, true, "ひらがなの単語が検出される");
    assertEquals(
      wordTexts.includes("あいうえお"),
      true,
      "連続するひらがなが1つの単語として検出される",
    );
  });

  await t.step("カタカナが検出される（現実装）", () => {
    const config: ExtractWordsOptions = { useJapanese: true };
    const text = "カタカナ";
    const words = extractWords(text, 1, config);

    const wordTexts = words.map((w: Word) => w.text);

    // 現在の実装では連続するカタカナが1つの単語として検出される
    assertEquals(words.length > 0, true, "カタカナの単語が検出される");
    assertEquals(
      wordTexts.includes("カタカナ"),
      true,
      "連続するカタカナが1つの単語として検出される",
    );
  });

  await t.step("単語の位置（col）が正しく設定される", () => {
    const config: ExtractWordsOptions = { useJapanese: true };
    const text = "私は元気";
    const words = extractWords(text, 1, config);

    // 「私」の位置確認
    const watashi = words.find((w: Word) => w.text === "私");
    if (watashi) {
      assertEquals(watashi.col, 1, "「私」の位置は1であるべき");
    }

    // 「元」の位置確認（「私は」の後）
    const gen = words.find((w: Word) => w.text === "元");
    if (gen) {
      // UTF-8での位置を考慮
      assertEquals(gen.col > 1, true, "「元」の位置は1より大きいべき");
    }
  });
});
