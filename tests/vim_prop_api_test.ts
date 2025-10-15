/**
 * Process1 Sub1: Vim prop API対応強化のテスト
 *
 * このテストは、Vim 8.2+のprop APIとpopup機能が正しく動作することを検証します。
 * TDD Red-Green-Refactorサイクルの Red フェーズとして作成されています。
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import type { HintMapping, Config } from "../denops/hellshake-yano/types.ts";

// モックDenopsインターフェース
interface MockDenops {
  meta: { host: string };
  call: (fn: string, ...args: unknown[]) => Promise<unknown>;
  cmd: (command: string) => Promise<void>;
}

/**
 * Test Group 1: prop_type_add() の初期化テスト
 */
Deno.test("Vim prop API: prop_type_add should initialize property type correctly", async () => {
  const calls: Array<{ fn: string; args: unknown[] }> = [];

  const mockDenops: MockDenops = {
    meta: { host: "vim" },
    call: async (fn: string, ...args: unknown[]) => {
      calls.push({ fn, args });

      if (fn === "exists") {
        // prop_type_add exists in Vim 8.2+
        return 1;
      }

      if (fn === "prop_type_add") {
        // Success
        return 0;
      }

      return 0;
    },
    cmd: async () => {},
  };

  // displayモジュールから関数をインポート（実装後）
  const { processMatchaddBatched } = await import("../denops/hellshake-yano/display.ts");

  const hints: HintMapping[] = [
    {
      hint: "🔥",
      word: { text: "test", line: 1, col: 5 },
      hintCol: 5,
      hintByteCol: 5,
    },
  ];

  const config: Config = {
    highlightHintMarker: "HellshakeYanoMarker",
  } as Config;

  const fallbackMatchIds: number[] = [];

  // processMatchaddBatched を実行
  await processMatchaddBatched(mockDenops as any, hints, config, fallbackMatchIds);

  // prop_type_add が正しく呼ばれたかチェック
  const propTypeAddCalls = calls.filter(c => c.fn === "prop_type_add");
  assertEquals(propTypeAddCalls.length > 0, true, "prop_type_add should be called");

  // 引数の検証
  const firstCall = propTypeAddCalls[0];
  assertEquals(firstCall.args[0], "HellshakeYanoMarker", "Property type name should match");
  assertExists(firstCall.args[1], "Options object should exist");

  const options = firstCall.args[1] as any;
  assertEquals(options.highlight, "HellshakeYanoMarker", "Highlight group should be set");
});

/**
 * Test Group 2: prop_add() でマーカー位置を設定するテスト
 */
Deno.test("Vim prop API: prop_add should set marker position correctly", async () => {
  const calls: Array<{ fn: string; args: unknown[] }> = [];

  const mockDenops: MockDenops = {
    meta: { host: "vim" },
    call: async (fn: string, ...args: unknown[]) => {
      calls.push({ fn, args });

      if (fn === "exists") {
        return 1;
      }

      return 0;
    },
    cmd: async () => {},
  };

  const { processMatchaddBatched } = await import("../denops/hellshake-yano/display.ts");

  const hints: HintMapping[] = [
    {
      hint: "🔥",
      word: { text: "test", line: 5, col: 10 },
      hintCol: 10,
      hintByteCol: 10,
    },
  ];

  const config: Config = {
    highlightHintMarker: "HellshakeYanoMarker",
  } as Config;

  const fallbackMatchIds: number[] = [];

  await processMatchaddBatched(mockDenops as any, hints, config, fallbackMatchIds);

  // prop_add が正しく呼ばれたかチェック
  const propAddCalls = calls.filter(c => c.fn === "prop_add");
  assertEquals(propAddCalls.length > 0, true, "prop_add should be called");

  const firstCall = propAddCalls[0];
  assertEquals(firstCall.args[0], 5, "Line number should be correct");
  assertEquals(firstCall.args[1], 10, "Column number should be correct");

  const options = firstCall.args[2] as any;
  assertEquals(options.type, "HellshakeYanoMarker", "Property type should match");
  assertEquals(options.length, 4, "Length should match hint length (emoji = 4 bytes)");
  assertEquals(options.text, "🔥", "Text should match hint");
});

/**
 * Test Group 3: popup_create() でオーバーレイ表示を実装するテスト
 */
Deno.test("Vim prop API: popup_create should create overlay popup", async () => {
  const calls: Array<{ fn: string; args: unknown[] }> = [];

  const mockDenops: MockDenops = {
    meta: { host: "vim" },
    call: async (fn: string, ...args: unknown[]) => {
      calls.push({ fn, args });

      if (fn === "exists") {
        return 1;
      }

      if (fn === "popup_create") {
        return 100; // popup ID
      }

      return 0;
    },
    cmd: async () => {},
  };

  const { processMatchaddBatched } = await import("../denops/hellshake-yano/display.ts");

  const hints: HintMapping[] = [
    {
      hint: "AB",
      word: { text: "hello", line: 3, col: 7 },
      hintCol: 7,
      hintByteCol: 7,
    },
  ];

  const config: Config = {
    highlightHintMarker: "HellshakeYanoMarker",
  } as Config;

  const fallbackMatchIds: number[] = [];

  await processMatchaddBatched(mockDenops as any, hints, config, fallbackMatchIds);

  // popup_create が正しく呼ばれたかチェック
  const popupCreateCalls = calls.filter(c => c.fn === "popup_create");
  assertEquals(popupCreateCalls.length > 0, true, "popup_create should be called");

  const firstCall = popupCreateCalls[0];
  assertEquals(firstCall.args[0], "AB", "Popup text should match hint");

  const options = firstCall.args[1] as any;
  assertEquals(options.line, -1, "Line should be -1 for textprop positioning");
  assertEquals(options.col, -1, "Col should be -1 for textprop positioning");
  assertEquals(options.textprop, "HellshakeYanoMarker", "Textprop should match property type");
  assertEquals(options.highlight, "HellshakeYanoMarker", "Highlight should match");
});

/**
 * Test Group 4: 日本語文字幅の考慮テスト
 */
Deno.test("Vim prop API: should handle multibyte characters correctly", async () => {
  const calls: Array<{ fn: string; args: unknown[] }> = [];

  const mockDenops: MockDenops = {
    meta: { host: "vim" },
    call: async (fn: string, ...args: unknown[]) => {
      calls.push({ fn, args });

      if (fn === "exists") {
        return 1;
      }

      if (fn === "strwidth") {
        const text = args[0] as string;
        // 日本語文字は幅2、ASCII文字は幅1
        return text.split("").reduce((sum, char) => {
          return sum + (char.match(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/) ? 2 : 1);
        }, 0);
      }

      return 0;
    },
    cmd: async () => {},
  };

  const { processMatchaddBatched } = await import("../denops/hellshake-yano/display.ts");

  const hints: HintMapping[] = [
    {
      hint: "あ",
      word: { text: "日本語", line: 1, col: 5 },
      hintCol: 5,
      hintByteCol: 5,
    },
  ];

  const config: Config = {
    highlightHintMarker: "HellshakeYanoMarker",
  } as Config;

  const fallbackMatchIds: number[] = [];

  await processMatchaddBatched(mockDenops as any, hints, config, fallbackMatchIds);

  // strwidth が呼ばれたかチェック
  const strwidthCalls = calls.filter(c => c.fn === "strwidth");
  assertEquals(strwidthCalls.length > 0, true, "strwidth should be called for multibyte hints");

  // prop_add の length が正しく設定されているかチェック
  const propAddCalls = calls.filter(c => c.fn === "prop_add");
  const options = propAddCalls[0].args[2] as any;
  assertEquals(options.length >= 1, true, "Length should account for multibyte characters");
});

/**
 * Test Group 5: Vim版バージョン確認テスト（process1-sub2）
 */
Deno.test("Vim prop API: should check Vim version before using prop API", async () => {
  const calls: Array<{ fn: string; args: unknown[] }> = [];

  const mockDenops: MockDenops = {
    meta: { host: "vim" },
    call: async (fn: string, ...args: unknown[]) => {
      calls.push({ fn, args });

      if (fn === "exists") {
        // prop APIが存在しない古いVim
        return 0;
      }

      if (fn === "matchadd") {
        return 123; // match ID
      }

      return 0;
    },
    cmd: async () => {},
  };

  const { processMatchaddBatched } = await import("../denops/hellshake-yano/display.ts");

  const hints: HintMapping[] = [
    {
      hint: "A",
      word: { text: "test", line: 1, col: 5 },
      hintCol: 5,
      hintByteCol: 5,
    },
  ];

  const config: Config = {
    highlightHintMarker: "HellshakeYanoMarker",
  } as Config;

  const fallbackMatchIds: number[] = [];

  await processMatchaddBatched(mockDenops as any, hints, config, fallbackMatchIds);

  // exists() が呼ばれたかチェック
  const existsCalls = calls.filter(c => c.fn === "exists");
  assertEquals(existsCalls.length > 0, true, "exists() should be called to check API availability");

  // prop API が使えない場合、matchadd にフォールバック
  const matchaddCalls = calls.filter(c => c.fn === "matchadd");
  assertEquals(matchaddCalls.length > 0, true, "Should fallback to matchadd when prop API is not available");

  // fallbackMatchIds に ID が追加されているかチェック
  assertEquals(fallbackMatchIds.length > 0, true, "Match IDs should be stored for cleanup");
});

/**
 * Test Group 6: エラーハンドリング改善テスト
 */
Deno.test("Vim prop API: should handle errors gracefully", async () => {
  const mockDenops: MockDenops = {
    meta: { host: "vim" },
    call: async (fn: string, ...args: unknown[]) => {
      if (fn === "exists") {
        return 1;
      }

      if (fn === "prop_add") {
        // prop_add がエラーをスロー
        throw new Error("E275: Cannot add text property to unloaded buffer");
      }

      if (fn === "matchadd") {
        return 456;
      }

      return 0;
    },
    cmd: async () => {},
  };

  const { processMatchaddBatched } = await import("../denops/hellshake-yano/display.ts");

  const hints: HintMapping[] = [
    {
      hint: "A",
      word: { text: "test", line: 1, col: 5 },
      hintCol: 5,
      hintByteCol: 5,
    },
  ];

  const config: Config = {
    highlightHintMarker: "HellshakeYanoMarker",
  } as Config;

  const fallbackMatchIds: number[] = [];

  // エラーが発生してもスローされずに matchadd にフォールバック
  await processMatchaddBatched(mockDenops as any, hints, config, fallbackMatchIds);

  // matchadd にフォールバックされたかチェック
  assertEquals(fallbackMatchIds.length > 0, true, "Should fallback to matchadd on error");
});

/**
 * Test Group 7: 複数ヒントのバッチ処理テスト
 */
Deno.test("Vim prop API: should handle multiple hints in batch", async () => {
  const propAddCalls: unknown[] = [];

  const mockDenops: MockDenops = {
    meta: { host: "vim" },
    call: async (fn: string, ...args: unknown[]) => {
      if (fn === "exists") {
        return 1;
      }

      if (fn === "prop_add") {
        propAddCalls.push(args);
      }

      return 0;
    },
    cmd: async () => {},
  };

  const { processMatchaddBatched } = await import("../denops/hellshake-yano/display.ts");

  const hints: HintMapping[] = [
    { hint: "A", word: { text: "word1", line: 1, col: 5 }, hintCol: 5, hintByteCol: 5 },
    { hint: "B", word: { text: "word2", line: 2, col: 10 }, hintCol: 10, hintByteCol: 10 },
    { hint: "C", word: { text: "word3", line: 3, col: 15 }, hintCol: 15, hintByteCol: 15 },
  ];

  const config: Config = {
    highlightHintMarker: "HellshakeYanoMarker",
  } as Config;

  const fallbackMatchIds: number[] = [];

  await processMatchaddBatched(mockDenops as any, hints, config, fallbackMatchIds);

  // すべてのヒントに対して prop_add が呼ばれたかチェック
  assertEquals(propAddCalls.length, 3, "prop_add should be called for each hint");
});
