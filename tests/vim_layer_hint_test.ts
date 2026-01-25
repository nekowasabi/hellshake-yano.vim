/**
 * @fileoverview VimLayer generateHints API テスト
 * Phase 1.3 Process 1: TypeScript VimLayer API追加
 *
 * TDD Red Phase: テスト先行で作成
 */

import { assertEquals } from "jsr:@std/assert@1";
import { generateHints } from "../denops/hellshake-yano/neovim/core/hint.ts";
import type { GenerateHintsOptions } from "../denops/hellshake-yano/neovim/core/hint.ts";

/**
 * VimLayer generateHints API のテストスイート
 *
 * 目的:
 * - VimLayer dispatcher経由でgenerateHintsが正しく動作することを検証
 * - デフォルト設定とカスタム設定の両方をテスト
 */

Deno.test("generateHints returns correct hints for count=5 with default config", () => {
  // デフォルト設定: singleCharKeys = 'asdfgnm' (7文字)
  const defaultConfig: GenerateHintsOptions = {
    singleCharKeys: ["a", "s", "d", "f", "g", "n", "m"],
    multiCharKeys: ["b", "c", "e", "i", "o", "p", "q", "r", "t", "u", "v", "w", "x", "y", "z"],
    maxSingleCharHints: 7,
    useNumericMultiCharHints: false,
  };

  const hints = generateHints(5, defaultConfig);

  assertEquals(hints.length, 5);
  assertEquals(hints, ["a", "s", "d", "f", "g"]);
});

Deno.test("generateHints returns correct hints for count=7 (all single chars)", () => {
  const config: GenerateHintsOptions = {
    singleCharKeys: ["a", "s", "d", "f", "g", "n", "m"],
    multiCharKeys: ["b", "c", "e", "i", "o", "p", "q", "r", "t", "u", "v", "w", "x", "y", "z"],
    maxSingleCharHints: 7,
    useNumericMultiCharHints: false,
  };

  const hints = generateHints(7, config);

  assertEquals(hints.length, 7);
  assertEquals(hints, ["a", "s", "d", "f", "g", "n", "m"]);
});

Deno.test("generateHints returns correct hints for count=10 (single + multi chars)", () => {
  const config: GenerateHintsOptions = {
    singleCharKeys: ["a", "s", "d", "f", "g", "n", "m"],
    multiCharKeys: ["b", "c", "e", "i", "o", "p", "q", "r", "t", "u", "v", "w", "x", "y", "z"],
    maxSingleCharHints: 7,
    useNumericMultiCharHints: false,
  };

  const hints = generateHints(10, config);

  assertEquals(hints.length, 10);
  // 最初の7文字は単一文字ヒント
  assertEquals(hints.slice(0, 7), ["a", "s", "d", "f", "g", "n", "m"]);
  // 8番目以降は複数文字ヒント（bb, bc, be）
  assertEquals(hints[7], "bb");
  assertEquals(hints[8], "bc");
  assertEquals(hints[9], "be");
});

Deno.test("generateHints returns empty array for count=0", () => {
  const config: GenerateHintsOptions = {
    singleCharKeys: ["a", "s", "d", "f", "g", "n", "m"],
    multiCharKeys: ["b", "c", "e", "i", "o", "p", "q", "r", "t", "u", "v", "w", "x", "y", "z"],
  };

  const hints = generateHints(0, config);

  assertEquals(hints.length, 0);
  assertEquals(hints, []);
});

Deno.test("generateHints returns empty array for negative count", () => {
  const config: GenerateHintsOptions = {
    singleCharKeys: ["a", "s", "d", "f", "g", "n", "m"],
    multiCharKeys: ["b", "c", "e", "i", "o", "p", "q", "r", "t", "u", "v", "w", "x", "y", "z"],
  };

  const hints = generateHints(-5, config);

  assertEquals(hints.length, 0);
  assertEquals(hints, []);
});

Deno.test("generateHints respects custom singleCharKeys", () => {
  // カスタム設定: singleCharKeys = 'xyz'
  const customConfig: GenerateHintsOptions = {
    singleCharKeys: ["x", "y", "z"],
    multiCharKeys: ["a", "b", "c"],
    maxSingleCharHints: 3,
    useNumericMultiCharHints: false,
  };

  const hints = generateHints(3, customConfig);

  assertEquals(hints.length, 3);
  assertEquals(hints, ["x", "y", "z"]);
});

Deno.test("generateHints with useNumericMultiCharHints generates numeric hints", () => {
  // 数字ヒントテスト
  const config: GenerateHintsOptions = {
    singleCharKeys: ["a", "s"],
    multiCharKeys: ["b", "c"],
    maxSingleCharHints: 2,
    useNumericMultiCharHints: true,
  };

  // 2(single) + 4(multi: bb,bc,cb,cc) + 1(numeric: 01) = 7
  const hints = generateHints(7, config);

  assertEquals(hints.length, 7);
  assertEquals(hints[0], "a");
  assertEquals(hints[1], "s");
  // multi char hints
  assertEquals(hints[2], "bb");
  assertEquals(hints[3], "bc");
  assertEquals(hints[4], "cb");
  assertEquals(hints[5], "cc");
  // numeric hints start
  assertEquals(hints[6], "01");
});

Deno.test("generateHints returns count=1 correctly", () => {
  const config: GenerateHintsOptions = {
    singleCharKeys: ["a", "s", "d", "f", "g", "n", "m"],
    multiCharKeys: ["b", "c", "e", "i", "o", "p", "q", "r", "t", "u", "v", "w", "x", "y", "z"],
  };

  const hints = generateHints(1, config);

  assertEquals(hints.length, 1);
  assertEquals(hints, ["a"]);
});
