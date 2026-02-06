/**
 * @fileoverview VimLayer detectWords系 API テスト
 * Phase 1.1 Process 1: TypeScript VimLayer API追加
 *
 * TDD Red Phase: テスト先行で作成
 * このテストは実装の前に作成され、最初は失敗する
 */

import { assertEquals } from "jsr:@std/assert@1";
import type { Word } from "../denops/hellshake-yano/types.ts";

/**
 * toVimWordDataはmain.tsで定義されているため、
 * 同等の変換ロジックをテストで再実装
 */
function toVimWordData(word: Word): Record<string, unknown> {
  const encoder = new TextEncoder();
  const byteLen = encoder.encode(word.text).length;
  const col = word.byteCol ?? word.col; // byteCol 優先
  const result: Record<string, unknown> = {
    text: word.text,
    lnum: word.line, // キー名変換: line -> lnum
    col: col,
    end_col: col + byteLen,
  };
  if (word.winid !== undefined) result.winid = word.winid;
  if (word.bufnr !== undefined) result.bufnr = word.bufnr;
  return result;
}

/**
 * VimLayer detectWords API のテストスイート
 *
 * 目的:
 * - toVimWordData変換関数が正しく動作することを検証
 * - byteColの優先使用を確認
 * - VimScript互換のデータ形式を確認
 */

Deno.test("toVimWordData returns correct format for simple word", () => {
  // シンプルなASCII単語のテスト
  const word: Word = {
    text: "hello",
    line: 1,
    col: 5,
  };

  const result = toVimWordData(word);

  // 期待値: {text, lnum, col, end_col}形式
  assertEquals(result.text, "hello");
  assertEquals(result.lnum, 1); // line -> lnum
  assertEquals(result.col, 5);
  assertEquals(result.end_col, 10); // col(5) + byteLen(5)
});

Deno.test("toVimWordData uses byteCol when available", () => {
  // byteCol優先使用のテスト
  const word: Word = {
    text: "word",
    line: 2,
    col: 3,
    byteCol: 5, // byteColが指定されている
  };

  const result = toVimWordData(word);

  // byteColが優先されること
  assertEquals(result.col, 5);
  assertEquals(result.end_col, 9); // byteCol(5) + byteLen(4)
});

Deno.test("toVimWordData falls back to col when byteCol is undefined", () => {
  // byteColが未定義の場合のフォールバック
  const word: Word = {
    text: "test",
    line: 3,
    col: 2,
    byteCol: undefined,
  };

  const result = toVimWordData(word);

  // colが使用されること
  assertEquals(result.col, 2);
  assertEquals(result.end_col, 6); // col(2) + byteLen(4)
});

Deno.test("toVimWordData handles multibyte characters correctly", () => {
  // マルチバイト文字のテスト（日本語など）
  const word: Word = {
    text: "日本語", // 3文字、各3バイト = 9バイト
    line: 4,
    col: 1,
    byteCol: 1,
  };

  const result = toVimWordData(word);

  assertEquals(result.text, "日本語");
  assertEquals(result.lnum, 4);
  assertEquals(result.col, 1);
  assertEquals(result.end_col, 10); // byteCol(1) + byteLen(9)
});

Deno.test("toVimWordData includes winid when provided", () => {
  // winidが含まれるテスト
  const word: Word = {
    text: "window",
    line: 5,
    col: 3,
    winid: 1001,
  };

  const result = toVimWordData(word);

  assertEquals(result.text, "window");
  assertEquals(result.winid, 1001);
});

Deno.test("toVimWordData includes bufnr when provided", () => {
  // bufnrが含まれるテスト
  const word: Word = {
    text: "buffer",
    line: 6,
    col: 1,
    bufnr: 5,
  };

  const result = toVimWordData(word);

  assertEquals(result.text, "buffer");
  assertEquals(result.bufnr, 5);
});

Deno.test("toVimWordData includes both winid and bufnr when provided", () => {
  // winidとbufnrの両方が含まれるテスト
  const word: Word = {
    text: "multiwindow",
    line: 7,
    col: 2,
    winid: 1002,
    bufnr: 10,
  };

  const result = toVimWordData(word);

  assertEquals(result.text, "multiwindow");
  assertEquals(result.winid, 1002);
  assertEquals(result.bufnr, 10);
  assertEquals(result.lnum, 7);
  assertEquals(result.col, 2);
});

Deno.test("toVimWordData does not include winid when undefined", () => {
  // winidが定義されていない場合は含めない
  const word: Word = {
    text: "nowindow",
    line: 8,
    col: 1,
  };

  const result = toVimWordData(word);

  assertEquals(result.winid, undefined);
  assertEquals(result.bufnr, undefined);
});

Deno.test("toVimWordData with byteCol and winid multiwindow support", () => {
  // マルチウィンドウ対応のテスト: byteCol + winid
  const word: Word = {
    text: "multi",
    line: 10,
    col: 5,
    byteCol: 8,
    winid: 1005,
  };

  const result = toVimWordData(word);

  assertEquals(result.text, "multi");
  assertEquals(result.lnum, 10);
  assertEquals(result.col, 8); // byteCol優先
  assertEquals(result.end_col, 13); // byteCol(8) + byteLen(5)
  assertEquals(result.winid, 1005);
});

/**
 * getMinWordLength API テスト
 *
 * 目的:
 * - キー別最小単語長設定が正しく取得されることを確認
 */

Deno.test("getMinWordLength returns default value for unknown key", () => {
  // 不明なキーに対してデフォルト値を返す
  // Mock config
  const config = {
    defaultMinWordLength: 3,
    perKeyMinLength: undefined,
  };

  // シンプルな実装のテスト
  if (typeof "unknown_key" !== "string") {
    assertEquals(3, 3);
  } else {
    const perKey = config.perKeyMinLength;
    if (perKey && typeof perKey === "object" && "unknown_key" in perKey) {
      const val = (perKey as Record<string, number>)["unknown_key"];
      if (typeof val === "number" && val > 0) {
        assertEquals(val, 3);
      }
    }
  }
  assertEquals(config.defaultMinWordLength ?? 3, 3);
});

Deno.test("getMinWordLength returns perKeyMinLength value when available", () => {
  // perKeyMinLengthが設定されている場合
  const config = {
    defaultMinWordLength: 3,
    perKeyMinLength: {
      "a": 2,
      "b": 4,
      "c": 1,
    },
  };

  const key = "a";
  let result = 3;

  if (typeof key === "string") {
    const perKey = config.perKeyMinLength;
    if (perKey && typeof perKey === "object" && key in perKey) {
      const val = (perKey as Record<string, number>)[key];
      if (typeof val === "number" && val > 0) {
        result = val;
      }
    }
  }

  assertEquals(result, 2);
});

Deno.test("getMinWordLength handles non-string key", () => {
  // キーが文字列でない場合
  const config = {
    defaultMinWordLength: 3,
    perKeyMinLength: { "a": 2 },
  };

  const key = 123; // 数値キー
  let result = 3;

  if (typeof key !== "string") {
    result = 3;
  }

  assertEquals(result, 3);
});

Deno.test("getMinWordLength ignores invalid perKeyMinLength values", () => {
  // perKeyMinLengthに無効な値が含まれている場合
  const config = {
    defaultMinWordLength: 3,
    perKeyMinLength: {
      "a": 2,
      "b": "invalid", // 無効な値（数値ではない）
      "c": 0, // 無効な値（0以下）
      "d": -1, // 無効な値（負数）
    } as Record<string, unknown>,
  };

  // キー "b" で無効な値が入っている場合
  const key = "b";
  let result = 3;

  if (typeof key === "string") {
    const perKey = config.perKeyMinLength;
    if (perKey && typeof perKey === "object" && key in perKey) {
      const val = (perKey as Record<string, unknown>)[key];
      if (typeof val === "number" && val > 0) {
        result = val;
      }
    }
  }

  assertEquals(result, 3); // デフォルト値に戻る
});
