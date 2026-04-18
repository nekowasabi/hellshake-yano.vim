import { assertEquals, assertNotEquals } from "@std/assert";

/**
 * 回帰テスト: 既存機能が最適化後も正しく動作することを確認
 *
 * @description process7 sub2の一部として実装された回帰テスト
 * @author TDD Red-Green-Refactorサイクルで実装
 * @version 1.0.0
 *
 * 検証項目:
 * - ヒント生成の基本機能
 * - 日本語文字のヒント位置計算
 * - 複数文字ヒントの生成
 * - キャッシュ機能
 * - 単語検出機能
 */

Deno.test({
  name: "[REGRESSION] ヒント生成の基本機能が動作する",
  async fn() {
    const { assignHintsToWords } = await import("../denops/hellshake-yano/neovim/core/hint.ts");

    // 基本的な英語単語のテスト
    const words = [
      { text: "hello", line: 1, col: 1, byteCol: 1 },
      { text: "world", line: 1, col: 7, byteCol: 7 },
    ];
    const hints = ["a", "b"];

    const mappings = assignHintsToWords(words, hints, 0, 0, "normal", { hintPosition: "start" });

    assertEquals(mappings.length, 2);
    assertEquals(mappings[0].hint, "a");
    assertEquals(mappings[0].word.text, "hello");
    assertEquals(mappings[1].hint, "b");
    assertEquals(mappings[1].word.text, "world");
  },
});

Deno.test({
  name: "[REGRESSION] 日本語文字のヒント位置計算が正しく動作する",
  async fn() {
    const { assignHintsToWords } = await import("../denops/hellshake-yano/neovim/core/hint.ts");

    const words = [
      { text: "開始", line: 1, col: 1, byteCol: 1 },
      { text: "終了", line: 1, col: 5, byteCol: 7 },
    ];
    const hints = ["A", "B"];

    // 日本語の終端位置のテスト（隣接検出をスキップして両方の単語にヒントを割り当てる）
    const mappings = assignHintsToWords(words, hints, 0, 0, "normal", { hintPosition: "end" }, {
      skipOverlapDetection: true,
    });

    assertEquals(mappings.length, 2);

    // 日本語2文字 "開始" の終端はbyte位置6（1 + 6バイト - 1）
    assertEquals(mappings[0].hintByteCol, 6);

    // 日本語2文字 "終了" の終端はbyte位置12（7 + 6バイト - 1）
    assertEquals(mappings[1].hintByteCol, 12);
  },
});

Deno.test({
  name: "[REGRESSION] 複数文字ヒントが正しく生成される",
  async fn() {
    const { generateHints } = await import("../denops/hellshake-yano/neovim/core/hint.ts");

    // 多くの単語でフォールバック機能をテスト
    const wordCount = 30; // 単文字（26）+ 2文字（4） = 30
    const config = {
      singleCharKeys: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
      multiCharKeys: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
    };
    const hints = generateHints(wordCount, { groups: true, ...config });

    assertEquals(hints.length, wordCount);

    // 最初の26個は単文字ヒント
    for (let i = 0; i < 26; i++) {
      assertEquals(hints[i].length, 1);
    }

    // 27番目以降は2文字ヒント
    for (let i = 26; i < 30; i++) {
      assertEquals(hints[i].length, 2);
    }
  },
});

Deno.test({
  name: "[REGRESSION] キャッシュ機能が正しく動作する",
  async fn() {
    const { assignHintsToWords } = await import("../denops/hellshake-yano/neovim/core/hint.ts");

    let textAccessCount = 0;
    const baseWord: any = { line: 1, col: 1, byteCol: 1 };

    // プロパティアクセスを監視
    Object.defineProperty(baseWord, "text", {
      configurable: true,
      get() {
        textAccessCount++;
        return "テスト";
      },
    });

    const hints = ["A"];

    // 1回目の呼び出し
    const result1 = assignHintsToWords([baseWord], hints, 0, 0, "normal", { hintPosition: "end" });

    // 2回目の呼び出し（同じ条件）
    textAccessCount = 0;
    const result2 = assignHintsToWords([baseWord], hints, 0, 0, "normal", { hintPosition: "end" });

    // キャッシュが効いていることを確認
    assertEquals(textAccessCount, 0, "キャッシュにより2回目のアクセスは発生しない");
    assertEquals(result1[0].hintByteCol, result2[0].hintByteCol);
  },
});

Deno.test({
  name: "[REGRESSION] 単語検出機能が正しく動作する",
  async fn() {
    const { detectWordsWithManager } = await import("../denops/hellshake-yano/neovim/core/word.ts");

    // Mock Denops
    // Why: batchGet (collect) が denops.batch を使用するため、batch モックが必要。
    // getFoldedLines も denops.eval を使用するため eval モックも必要。
    const callHandler = async (func: string, ...args: any[]): Promise<any> => {
      switch (func) {
        case "line":
          return args[0] === "w0" ? 1 : 5;
        case "getbufline":
          return ["hello world test"];
        case "bufnr":
          return 1;
        case "bufexists":
          return 1;
        case "foldclosed":
          return -1; // fold されていない行は -1 を返す
        case "foldclosedend":
          return -1; // fold されていない行は -1 を返す
        default:
          return null;
      }
    };
    const mockDenops = {
      call: callHandler,
      // Why: collect は denops.batch(...calls) を内部的に呼ぶ。
      batch: async (...calls: [string, ...any[]][]): Promise<any[]> => {
        const results: any[] = [];
        for (const [fn, ...args] of calls) {
          results.push(await callHandler(fn, ...args));
        }
        return results;
      },
      eval: async (expr: string): Promise<any> => {
        // getFoldedLines が filter(range(...)) を eval する — fold 無しを想定
        if (typeof expr === "string" && expr.includes("foldclosed")) return [];
        return [];
      },
      meta: { host: "nvim" },
    } as any;

    const config = {
      strategy: "hybrid" as const,
      useJapanese: false,
      enableTinySegmenter: false,
      cacheEnabled: true,
    };

    const result = await detectWordsWithManager(mockDenops, config);

    assertEquals(result.success, true);
    assertEquals(result.words.length >= 3, true); // "hello", "world", "test"
    assertEquals(typeof result.performance.duration, "number");
  },
});
