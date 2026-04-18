/**
 * 回帰テスト: applyHintPatterns パイプライン接続
 *
 * @description Process 2: applyHintPatterns が showHintsInternal から呼ばれ、
 *   辞書ルールによる hint 優先度付けが実機能として動作することを検証する。
 * @author TDD Red-Green-Refactor サイクルで実装
 * @version 1.0.0
 *
 * 検証項目:
 * - 辞書ルール (hintPatterns) 指定時に prioritizedCount > 0 になること
 * - 辞書未指定時は no-op (既存挙動不変) であること
 * - checkbox パターンで先頭文字に hintPriority が付与されること
 * - hintPriority 付き words が sortByHintPriority で先頭に来ること
 */
import { assertEquals, assertExists } from "@std/assert";

// ---------------------------------------------------------------------------
// Helper: テスト用の最小 words / patterns を構築
// ---------------------------------------------------------------------------

/**
 * checkbox 行 ("- [ ] task") を想定したテストデータを構築する。
 * applyHintPatterns は join テキスト内の 0-based offset を word.col と比較するため、
 * col には join 後の文字位置を設定する。
 */
function buildCheckboxTestData() {
  const lines = [
    "- [ ] Alpha",
    "- [ ] Bravo",
    "Some other text",
  ];
  const text = lines.join("\n");

  // 各行の先頭文字位置 (0-based offset in joined text)
  const offsetA = lines[0].indexOf("A"); // 6
  const offsetB = lines[0].length + 1 + lines[1].indexOf("B"); // 6+1+6 = 13
  const offsetOther = lines[0].length + 1 + lines[1].length + 1 + lines[2].indexOf("S"); // 6+1+6+1+0 = 14... actually "Some" starts at col 0 in line 3

  const words = [
    { text: "Alpha", line: 1, col: offsetA, byteCol: offsetA },
    { text: "Bravo", line: 2, col: offsetB, byteCol: offsetB },
    { text: "Some", line: 3, col: offsetOther, byteCol: offsetOther },
  ];

  const patterns = [
    {
      pattern: "^-\\s*\\[\\s*\\]\\s+(.)",
      hintPosition: "capture:1",
      priority: 100,
    },
  ];

  return { text, words, patterns, lines };
}

// ---------------------------------------------------------------------------
// Test 1: 辞書ルール指定時に prioritizedCount > 0 になること
// ---------------------------------------------------------------------------
Deno.test({
  name: "[REGRESSION] applyHintPatterns: 辞書ルール指定時に hintPriority > 0 の words が生成される",
  async fn() {
    const wordModule = await import(
      "../denops/hellshake-yano/neovim/core/word.ts"
    );
    // deno-lint-ignore no-explicit-any
    const HintPatternProcessorCtor = (wordModule as any).HintPatternProcessor;
    const processor = new HintPatternProcessorCtor();

    const { text, words, patterns } = buildCheckboxTestData();

    // deno-lint-ignore no-explicit-any
    const result = processor.applyHintPatterns(words, text, patterns) as any[];

    // prioritizedCount: hintPriority > 0 の words を数える
    const prioritizedCount = result.filter(
      (w: { hintPriority?: number }) => (w.hintPriority ?? 0) > 0,
    ).length;

    assertEquals(
      prioritizedCount,
      2,
      `hintPriority > 0 の words が 2 件 (Alpha, Bravo) であること。actual=${prioritizedCount}`,
    );
  },
});

// ---------------------------------------------------------------------------
// Test 2: 辞書未指定時は no-op (既存挙動不変)
// ---------------------------------------------------------------------------
Deno.test({
  name: "[REGRESSION] applyHintPatterns: 辞書ルール未指定時は no-op で words が変わらない",
  async fn() {
    const wordModule = await import(
      "../denops/hellshake-yano/neovim/core/word.ts"
    );
    // deno-lint-ignore no-explicit-any
    const HintPatternProcessorCtor = (wordModule as any).HintPatternProcessor;
    const processor = new HintPatternProcessorCtor();

    const { text, words } = buildCheckboxTestData();

    // patterns 空配列 = 辞書未指定
    const result = processor.applyHintPatterns(words, text, []) as any[];

    // 全て hintPriority が undefined (no-op)
    const prioritizedCount = result.filter(
      (w: { hintPriority?: number }) => (w.hintPriority ?? 0) > 0,
    ).length;

    assertEquals(
      prioritizedCount,
      0,
      "辞書未指定時は hintPriority > 0 の words が 0 件であること",
    );

    // words の要素数は変わらない
    assertEquals(result.length, words.length, "words の要素数は変わらないこと");
  },
});

// ---------------------------------------------------------------------------
// Test 3: hintPriority 付き words がソートで先頭に来ること
// ---------------------------------------------------------------------------
Deno.test({
  name: "[REGRESSION] applyHintPatterns: hintPriority 付き words がソート結果の先頭に来る",
  async fn() {
    const wordModule = await import(
      "../denops/hellshake-yano/neovim/core/word.ts"
    );
    // deno-lint-ignore no-explicit-any
    const HintPatternProcessorCtor = (wordModule as any).HintPatternProcessor;
    const processor = new HintPatternProcessorCtor();

    const { text, words, patterns } = buildCheckboxTestData();

    // deno-lint-ignore no-explicit-any
    const result = processor.applyHintPatterns(words, text, patterns) as any[];

    // sortByHintPriority により hintPriority=100 の Alpha/Bravo が先頭に来る
    assertExists(result[0].hintPriority, "先頭要素に hintPriority が付与されていること");
    assertEquals(
      result[0].hintPriority,
      100,
      "先頭要素の hintPriority が 100 であること",
    );
    assertExists(result[1].hintPriority, "2番目要素に hintPriority が付与されていること");
    assertEquals(
      result[1].hintPriority,
      100,
      "2番目要素の hintPriority が 100 であること",
    );
  },
});

// ---------------------------------------------------------------------------
// Test 4: checkbox パターンで先頭文字に正しい hintPriority が付与されること
// ---------------------------------------------------------------------------
Deno.test({
  name: "[REGRESSION] applyHintPatterns: checkbox パターンで先頭文字に hintPriority が付与される",
  async fn() {
    const wordModule = await import(
      "../denops/hellshake-yano/neovim/core/word.ts"
    );
    // deno-lint-ignore no-explicit-any
    const HintPatternProcessorCtor = (wordModule as any).HintPatternProcessor;
    const processor = new HintPatternProcessorCtor();

    const { text, words, patterns } = buildCheckboxTestData();

    // deno-lint-ignore no-explicit-any
    const result = processor.applyHintPatterns(words, text, patterns) as any[];

    const alpha = result.find(
      (w: { text: string }) => w.text === "Alpha",
    );
    const bravo = result.find(
      (w: { text: string }) => w.text === "Bravo",
    );
    const some = result.find(
      (w: { text: string }) => w.text === "Some",
    );

    assertExists(alpha, "Alpha が結果に含まれること");
    assertExists(bravo, "Bravo が結果に含まれること");
    assertExists(some, "Some が結果に含まれること");

    assertEquals(
      alpha.hintPriority,
      100,
      "Alpha (checkbox 行) に priority 100 が付与されること",
    );
    assertEquals(
      bravo.hintPriority,
      100,
      "Bravo (checkbox 行) に priority 100 が付与されること",
    );
    assertEquals(
      some.hintPriority ?? 0,
      0,
      "Some (非 checkbox 行) に priority が付与されないこと",
    );
  },
});

// ---------------------------------------------------------------------------
// Test 5: applyHintPatterns を showHintsInternal パイプラインから呼び出せる形で検証
// ---------------------------------------------------------------------------
Deno.test({
  name: "[REGRESSION] applyHintPatterns: 戻り値が assignHintsToWords に渡せる形式であること",
  async fn() {
    const wordModule = await import(
      "../denops/hellshake-yano/neovim/core/word.ts"
    );
    const hintModule = await import(
      "../denops/hellshake-yano/neovim/core/hint.ts"
    );
    // deno-lint-ignore no-explicit-any
    const HintPatternProcessorCtor = (wordModule as any).HintPatternProcessor;
    const processor = new HintPatternProcessorCtor();

    const { text, words, patterns } = buildCheckboxTestData();

    // applyHintPatterns → 戻り値を assignHintsToWords に渡す
    // deno-lint-ignore no-explicit-any
    const enhancedWords = processor.applyHintPatterns(words, text, patterns) as any[];

    const hints = ["a", "b", "c"];
    const mappings = hintModule.assignHintsToWords(
      enhancedWords,
      hints,
      0,
      0,
      "normal",
      { hintPosition: "start" },
      { skipOverlapDetection: true },
    );

    // ヒントマッピングが正常に生成されること
    assertEquals(mappings.length, 3, "3 つのヒントマッピングが生成されること");

    // prioritized な Alpha/Bravo がソートにより先頭に来るため
    // マッピング順序が hintPriority を反映していること
    const mappedTexts = mappings.map((m: { word: { text: string } }) => m.word.text);
    assertEquals(
      mappedTexts[0],
      "Alpha",
      "hintPriority 最上位の Alpha が先頭マッピングになること",
    );
    assertEquals(
      mappedTexts[1],
      "Bravo",
      "hintPriority 次位の Bravo が2番目マッピングになること",
    );
    assertEquals(
      mappedTexts[2],
      "Some",
      "hintPriority なしの Some が最後になること",
    );
  },
});
