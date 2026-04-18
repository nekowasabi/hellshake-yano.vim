/**
 * Tests for Japanese Word Granularity Optimization (PLAN.md process50)
 *
 * This test suite follows TDD Red-Green-Refactor approach to implement:
 * 1. japaneseMinWordLength application
 * 2. Particle filtering
 * 3. Morpheme merging
 * 4. Context propagation
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import { TinySegmenterWordDetector } from "../denops/hellshake-yano/neovim/core/word.ts";
import type { DetectionContext } from "../denops/hellshake-yano/types.ts";

Deno.test("Japanese Word Granularity - Phase 1 RED Tests", async (t) => {
  // Test 1: japaneseMinWordLength application
  await t.step(
    "should filter out single-character particles when japaneseMinWordLength=2",
    async () => {
      const detector = new TinySegmenterWordDetector();
      const text = "私の名前は田中です";
      const context: DetectionContext = {
        minWordLength: 2,
        config: {
          japaneseMinWordLength: 2,
          japaneseMergeParticles: true, // デフォルトはtrue
        },
      };

      const words = await detector.detectWords(text, 1, context);

      // 1文字の助詞（「の」「は」）が除外されているはず（統合されているはず）
      const wordTexts = words.map((w) => w.text);
      assertEquals(wordTexts.includes("の"), false, "助詞「の」は単独で存在しないべき");
      assertEquals(wordTexts.includes("は"), false, "助詞「は」は単独で存在しないべき");

      // 形態素統合により「名詞+助詞」の形で含まれるべき
      assertEquals(wordTexts.includes("私の"), true, "「私の」として統合されるべき");
      assertEquals(wordTexts.includes("名前は"), true, "「名前は」として統合されるべき");
      assertEquals(wordTexts.includes("田中です"), true, "「田中です」として統合されるべき");
    },
  );

  await t.step("should use japaneseMinWordLength from context.config when available", async () => {
    const detector = new TinySegmenterWordDetector();
    const text = "これはテストです";

    // context.config.japaneseMinWordLengthを設定
    const context: DetectionContext = {
      config: {
        japaneseMinWordLength: 3, // 3文字以上のみ
        japaneseMergeParticles: true,
      },
    };

    const words = await detector.detectWords(text, 1, context);
    const wordTexts = words.map((w) => w.text);

    // 3文字以上の単語が含まれるべき
    // 形態素統合により「これは」(3文字)、「テストです」(6文字)となる
    assertEquals(wordTexts.includes("これは"), true, "「これは」(3文字)は含まれるべき");
    assertEquals(wordTexts.includes("テストです"), true, "「テストです」(6文字)は含まれるべき");

    // 単独の助詞は存在しないべき
    assertEquals(wordTexts.includes("は"), false, "「は」は単独で存在しないべき");
  });

  // Test 2: Particle filtering
  await t.step("should filter common Japanese particles regardless of length", async () => {
    const detector = new TinySegmenterWordDetector();
    const text = "私の本を彼に渡した";
    const context: DetectionContext = {
      minWordLength: 1, // 最小長は1だが、助詞は統合されるべき
      config: {
        japaneseMinWordLength: 1,
        japaneseMergeParticles: true,
      },
    };

    const words = await detector.detectWords(text, 1, context);
    const wordTexts = words.map((w) => w.text);

    // 一般的な助詞は単独で存在しないべき（統合されているはず）
    const particles = ["の", "を", "に", "は", "が", "へ", "と", "や", "で", "も"];
    for (const particle of particles) {
      if (wordTexts.includes(particle)) {
        assertEquals(false, true, `助詞「${particle}」は単独で存在しないべき`);
      }
    }

    // 実質的な単語は統合された形で含まれるべき
    assertEquals(wordTexts.includes("私の"), true, "「私の」は含まれるべき");
    assertEquals(wordTexts.includes("本を"), true, "「本を」は含まれるべき");
    assertEquals(wordTexts.includes("彼に"), true, "「彼に」は含まれるべき");
    assertEquals(
      wordTexts.includes("渡し") || wordTexts.includes("渡した"),
      true,
      "「渡し」または「渡した」は含まれるべき",
    );
  });

  await t.step("should filter two-character particles like 「から」「まで」", async () => {
    const detector = new TinySegmenterWordDetector();
    const text = "東京から大阪まで行く";
    const context: DetectionContext = {
      minWordLength: 1,
      config: {
        japaneseMinWordLength: 2,
        japaneseMergeParticles: true,
      },
    };

    const words = await detector.detectWords(text, 1, context);
    const wordTexts = words.map((w) => w.text);

    // 2文字の助詞も単独で存在しないべき（統合されているはず）
    assertEquals(wordTexts.includes("から"), false, "助詞「から」は単独で存在しないべき");
    assertEquals(wordTexts.includes("まで"), false, "助詞「まで」は単独で存在しないべき");

    // 場所名は助詞と統合された形で含まれるべき
    assertEquals(wordTexts.includes("東京から"), true, "「東京から」は含まれるべき");
    assertEquals(wordTexts.includes("大阪まで"), true, "「大阪まで」は含まれるべき");
  });

  // Test 3: Morpheme merging
  await t.step("should merge noun + particle combinations", async () => {
    const detector = new TinySegmenterWordDetector();
    const text = "私の名前は";
    const context: DetectionContext = {
      minWordLength: 1,
      config: {
        japaneseMinWordLength: 1,
        japaneseMergeParticles: true, // 統合を有効化
      },
    };

    const words = await detector.detectWords(text, 1, context);
    const wordTexts = words.map((w) => w.text);

    // 名詞+助詞が統合されているべき
    assertEquals(wordTexts.includes("私の"), true, "「私の」として統合されるべき");
    assertEquals(wordTexts.includes("名前は"), true, "「名前は」として統合されるべき");

    // バラバラの助詞は含まれないべき
    assertEquals(wordTexts.includes("の"), false, "単独の「の」は含まれないべき");
    assertEquals(wordTexts.includes("は"), false, "単独の「は」は含まれないべき");
  });

  await t.step("should merge multiple morphemes into meaningful units", async () => {
    const detector = new TinySegmenterWordDetector();
    const text = "これはペンです";
    const context: DetectionContext = {
      config: {
        japaneseMergeParticles: true,
      },
    };

    const words = await detector.detectWords(text, 1, context);
    const wordTexts = words.map((w) => w.text);

    // 「これは」や「ペンです」のように統合されるべき
    assertEquals(wordTexts.includes("これは"), true, "「これは」として統合されるべき");
    assertEquals(wordTexts.includes("ペンです"), true, "「ペンです」として統合されるべき");
  });

  // Test 4: Context propagation
  await t.step("should propagate japaneseMinWordLength through DetectionContext", async () => {
    const detector = new TinySegmenterWordDetector();
    const text = "私の本";

    // DetectionContextにjapaneseMinWordLengthが正しく含まれることを確認
    const context: DetectionContext = {
      config: {
        japaneseMinWordLength: 2,
        enableTinySegmenter: true,
      },
    };

    assertExists(context.config, "context.configが存在するべき");
    assertEquals(
      context.config.japaneseMinWordLength,
      2,
      "japaneseMinWordLengthが正しく設定されるべき",
    );

    const words = await detector.detectWords(text, 1, context);
    const wordTexts = words.map((w) => w.text);

    // japaneseMinWordLengthが適用され、1文字の助詞が除外されるべき
    assertEquals(
      wordTexts.includes("の"),
      false,
      "japaneseMinWordLengthにより「の」は除外されるべき",
    );
  });

  await t.step(
    "should prioritize japaneseMinWordLength over minWordLength for Japanese text",
    async () => {
      const detector = new TinySegmenterWordDetector();
      const text = "私の本";

      // minWordLength=1だがjapaneseMinWordLength=2の場合
      const context: DetectionContext = {
        minWordLength: 1,
        config: {
          japaneseMinWordLength: 2,
          japaneseMergeParticles: true,
        },
      };

      const words = await detector.detectWords(text, 1, context);
      const wordTexts = words.map((w) => w.text);

      // japaneseMinWordLengthが優先され、2文字以上のみ含まれる
      assertEquals(
        wordTexts.includes("の"),
        false,
        "japaneseMinWordLengthが優先され「の」は単独で存在しないべき",
      );
      assertEquals(wordTexts.includes("私の"), true, "「私の」(2文字)として統合されるべき");
      // 「本」は1文字なのでjapaneseMinWordLength=2により除外される
      assertEquals(
        wordTexts.includes("本"),
        false,
        "「本」は1文字なのでjapaneseMinWordLength=2により除外されるべき",
      );
    },
  );
});
