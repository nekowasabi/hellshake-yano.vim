/**
 * tests/types_branded_test.ts
 * Process 3: Branded types (ByteCol/CharCol/ZeroLine/OneLine) のテスト
 *
 * Red-Green-Refactor の Red フェーズ:
 * branded types 導入前に作成し、Green フェーズで通るようにする。
 *
 * テストケース:
 * - asByteCol / asCharCol キャスト
 * - CharCol を ByteCol 変数に代入すると型エラー（型チェックで検証）
 * - oneLineToZeroLine / zeroLineToOneLine 変換
 * - Word 型の byteCol プロパティが ByteCol 型
 */

import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";

// Branded types とヘルパーを types.ts からインポート（Green フェーズで実装）
import type {
  ByteCol,
  CharCol,
  ZeroLine,
  OneLine,
  Word,
} from "../denops/hellshake-yano/types.ts";
import {
  asByteCol,
  asCharCol,
  asZeroLine,
  asOneLine,
  oneLineToZeroLine,
  zeroLineToOneLine,
} from "../denops/hellshake-yano/types.ts";

describe("Branded Types: as* キャストヘルパー", () => {
  it("asByteCol が number を ByteCol にキャストする", () => {
    const col: ByteCol = asByteCol(5);
    assertEquals(col, 5);
    assertEquals(typeof col, "number");
  });

  it("asCharCol が number を CharCol にキャストする", () => {
    const col: CharCol = asCharCol(3);
    assertEquals(col, 3);
    assertEquals(typeof col, "number");
  });

  it("asZeroLine が number を ZeroLine にキャストする", () => {
    const line: ZeroLine = asZeroLine(0);
    assertEquals(line, 0);
    assertEquals(typeof line, "number");
  });

  it("asOneLine が number を OneLine にキャストする", () => {
    const line: OneLine = asOneLine(1);
    assertEquals(line, 1);
    assertEquals(typeof line, "number");
  });
});

describe("Branded Types: 行インデックス変換", () => {
  it("oneLineToZeroLine が 1-indexed を 0-indexed に変換する", () => {
    const one = asOneLine(5);
    const zero: ZeroLine = oneLineToZeroLine(one);
    assertEquals(zero, 4);
  });

  it("zeroLineToOneLine が 0-indexed を 1-indexed に変換する", () => {
    const zero = asZeroLine(3);
    const one: OneLine = zeroLineToOneLine(zero);
    assertEquals(one, 4);
  });

  it("oneLineToZeroLine(1) => 0 であること", () => {
    const one = asOneLine(1);
    assertEquals(oneLineToZeroLine(one), 0);
  });

  it("zeroLineToOneLine(0) => 1 であること", () => {
    const zero = asZeroLine(0);
    assertEquals(zeroLineToOneLine(zero), 1);
  });
});

describe("Branded Types: Word インターフェース統合", () => {
  it("Word.byteCol は ByteCol 型を受け入れる", () => {
    const word: Word = {
      text: "hello",
      line: 1,
      col: 1,
      byteCol: asByteCol(5),
    };
    assertExists(word.byteCol);
    assertEquals(word.byteCol, 5);
  });

  it("Word.line に OneLine 値を設定できる", () => {
    const word: Word = {
      text: "hello",
      line: asOneLine(10),
      col: 1,
    };
    assertEquals(word.line, 10);
  });
});

describe("Branded Types: 型の区別（ランタイム検証）", () => {
  it("ByteCol と CharCol はランタイムでは number として等価", () => {
    const byteCol: ByteCol = asByteCol(5);
    const charCol: CharCol = asCharCol(5);
    // ランタイムでは両方とも number なので等しい
    assertEquals(byteCol === charCol, true);
    assertEquals(byteCol, charCol);
  });

  it("branded type は number と同じように算術演算可能", () => {
    const col: ByteCol = asByteCol(10);
    // 減算で 0-indexed にするパターン
    const zeroIndexed = col - 1;
    assertEquals(zeroIndexed, 9);
    assertEquals(typeof zeroIndexed, "number");
  });
});
