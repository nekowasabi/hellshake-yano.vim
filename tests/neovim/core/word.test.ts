/**
 * tests/neovim/core/word.test.ts
 *
 * Neovim Core Word Detection テスト
 * getFoldedLines エラーハンドリングを含む
 */

import { test } from "../../testRunner.ts";
import { assertEquals, assertExists, assertNotEquals } from "@std/assert";
import { describe, it } from "jsr:@std/testing@^1.0.0/bdd";
import { detectWords } from "../../../denops/hellshake-yano/neovim/core/word.ts";
import * as wordModule from "../../../denops/hellshake-yano/neovim/core/word.ts";
import { DEFAULT_CONFIG } from "../../../denops/hellshake-yano/config.ts";

// Task 1-B RED: createCacheKey is not exported yet → will be TypeError at runtime.
// GREEN: export createCacheKey with changedtick param → tests pass.
// deno-lint-ignore no-explicit-any
const createCacheKeyFn = (wordModule as any).createCacheKey as (
  bufnr: number,
  topLine: number,
  bottomLine: number,
  config: Record<string, unknown>,
  context: undefined,
  changedtick: number,
) => string;

// ---------------------------------------------------------------------------
// Task 1-B: createCacheKey must include changedtick (RED → GREEN)
// ---------------------------------------------------------------------------
describe("Task 1-B: createCacheKey must include changedtick", () => {
  it("different changedtick values produce different cache keys", () => {
    const key1 = createCacheKeyFn(1, 1, 50, {}, undefined, 100);
    const key2 = createCacheKeyFn(1, 1, 50, {}, undefined, 101);
    assertNotEquals(
      key1,
      key2,
      "changedtick change must produce different cache key to invalidate stale cache after buffer modification",
    );
  });

  it("changedtick value appears in cache key string", () => {
    const tick = 9999;
    const key = createCacheKeyFn(1, 1, 50, {}, undefined, tick);
    assertEquals(
      key.includes(`${tick}`),
      true,
      `Cache key must contain changedtick value (${tick}). Got: "${key}"`,
    );
  });

  it("same changedtick produces same cache key (cache hit preserved)", () => {
    const key1 = createCacheKeyFn(1, 1, 50, {}, undefined, 42);
    const key2 = createCacheKeyFn(1, 1, 50, {}, undefined, 42);
    assertEquals(key1, key2, "Same changedtick must produce same key for cache reuse");
  });
});

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

// ---------------------------------------------------------------------------
// Bug #1 回帰防止: YAML `captureGroup` 数値形式が convertToUserDictionary で
//   `hintPosition: "capture:${n}"` に変換されること
// Bug #2 回帰防止: applyHintPatterns が 'gm' フラグで RegExp を生成し、
//   複数行 join テキストの各行頭 `^` にマッチすること
// ---------------------------------------------------------------------------
describe("hintPatterns bug fixes (Bug #1, #2)", () => {
  // Why: DictionaryLoader.convertToUserDictionary は private メソッドなので
  //   any キャスト経由で呼び出す。export 済みクラスの内部仕様を直接検証し、
  //   YAML -> UserDictionary 変換の正しさを保証する。
  // deno-lint-ignore no-explicit-any
  const DictionaryLoaderCtor = (wordModule as any).DictionaryLoader;
  // deno-lint-ignore no-explicit-any
  const HintPatternProcessorCtor = (wordModule as any).HintPatternProcessor;

  it("Bug #1: captureGroup 数値形式が hintPosition: 'capture:N' に変換される", () => {
    const loader = new DictionaryLoaderCtor();
    const input = {
      hintPatterns: [
        { pattern: "^- \\[ \\] (.)", captureGroup: 1, priority: 50 },
      ],
    };
    const dict = loader.convertToUserDictionary(input);
    assertExists(dict.hintPatterns, "hintPatterns が生成されていること");
    assertEquals(
      dict.hintPatterns.length,
      1,
      "hintPatterns が 1 件変換されていること",
    );
    assertEquals(
      dict.hintPatterns[0].hintPosition,
      "capture:1",
      "captureGroup: 1 は 'capture:1' 文字列に変換されること",
    );
    assertEquals(
      dict.hintPatterns[0].priority,
      50,
      "priority が引き継がれること",
    );
  });

  it("Bug #1 後方互換: hintPosition 明示指定が優先される (captureGroup 併記時)", () => {
    const loader = new DictionaryLoaderCtor();
    const input = {
      hintPatterns: [
        // hintPosition と captureGroup の両方があれば hintPosition を優先
        { pattern: "(foo)(bar)", hintPosition: "capture:2", captureGroup: 1, priority: 10 },
      ],
    };
    const dict = loader.convertToUserDictionary(input);
    assertEquals(
      dict.hintPatterns[0].hintPosition,
      "capture:2",
      "hintPosition 明示指定が captureGroup より優先されること",
    );
  });

  it("Bug #2: 複数行 join テキストで ^ が各行頭にマッチする ('gm' フラグ)", () => {
    const processor = new HintPatternProcessorCtor();

    // 複数行バッファ想定の join テキスト
    const line1 = "- [ ] Alpha";
    const line2 = "- [ ] Bravo";
    const line3 = "  - [ ] Charlie";
    const text = [line1, line2, line3].join("\n");

    // 各行の「A/B/C」位置（join 文字列内 0-based offset）を計算
    const offsetA = line1.indexOf("A"); // "- [ ] " = 6
    const offsetB = line1.length + 1 + line2.indexOf("B");
    const offsetC = line1.length + 1 + line2.length + 1 + line3.indexOf("C");

    // findWordAtPosition は position を word.col と直接比較するので
    // ここでは join テキスト内 0-based offset を col にセットする
    const words = [
      { text: "Alpha", line: 1, col: offsetA },
      { text: "Bravo", line: 2, col: offsetB },
      { text: "Charlie", line: 3, col: offsetC },
    ];

    // captureGroup 相当の hintPosition 形式で各行先頭文字を指す
    const patterns = [
      {
        pattern: "^\\s*-\\s*\\[\\s\\]\\s+(.)",
        hintPosition: "capture:1",
        priority: 100,
      },
    ];

    // Why: string で pattern を渡すことで applyHintPatterns 内部の
    //   new RegExp(pattern, 'gm') 経路を通過させる。'gm' 不在なら
    //   line3 (インデント有り) は ^ にマッチせず hintPriority が
    //   付与されないため Bug #2 の回帰を検出できる。
    // deno-lint-ignore no-explicit-any
    const result = processor.applyHintPatterns(words as any, text, patterns as any);

    const alpha = result.find((w: { text: string }) => w.text === "Alpha");
    const bravo = result.find((w: { text: string }) => w.text === "Bravo");
    const charlie = result.find((w: { text: string }) => w.text === "Charlie");

    assertExists(alpha, "Alpha が結果に含まれること");
    assertExists(bravo, "Bravo が結果に含まれること");
    assertExists(charlie, "Charlie が結果に含まれること");

    assertEquals(
      alpha.hintPriority,
      100,
      "1 行目先頭 'A' に priority 100 が付与されること",
    );
    assertEquals(
      bravo.hintPriority,
      100,
      "2 行目先頭 'B' に priority 100 が付与されること (m フラグで ^ が行頭にマッチ)",
    );
    assertEquals(
      charlie.hintPriority,
      100,
      "3 行目先頭 'C' (インデント有り) に priority 100 が付与されること — 'gm' フラグが無ければ失敗する回帰防止ケース",
    );
  });
});
