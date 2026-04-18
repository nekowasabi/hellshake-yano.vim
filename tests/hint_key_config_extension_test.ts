/**
 * HintKeyConfig インターフェース拡張のテスト (TDD Red Phase)
 *
 * process1 sub1: HintKeyConfigインターフェースの拡張
 * - allowSymbolsInSingleChar: 1文字ヒントで記号使用を許可
 * - numericOnlyMultiChar: 複数文字ヒントで数字専用モード
 */

import { assertEquals, assertExists } from "@std/assert";
import type { HintKeyConfig } from "../denops/hellshake-yano/types.ts";

Deno.test("HintKeyConfig - allowSymbolsInSingleChar property should be optional boolean", () => {
  // 新しいプロパティが定義されていることを確認
  const config: HintKeyConfig = {
    singleCharKeys: ["A", "B", "C"],
    allowSymbolsInSingleChar: true,
  };

  assertEquals(typeof config.allowSymbolsInSingleChar, "boolean");
  assertEquals(config.allowSymbolsInSingleChar, true);
});

Deno.test("HintKeyConfig - allowSymbolsInSingleChar should be optional (can be undefined)", () => {
  // プロパティがオプショナルであることを確認
  const config: HintKeyConfig = {
    singleCharKeys: ["A", "B", "C"],
  };

  // TypeScriptの型チェックが通ることを確認（undefinedでもOK）
  assertEquals(config.allowSymbolsInSingleChar, undefined);
});

Deno.test("HintKeyConfig - numericOnlyMultiChar property should be optional boolean", () => {
  // 新しいプロパティが定義されていることを確認
  const config: HintKeyConfig = {
    multiCharKeys: ["1", "2", "3"],
    numericOnlyMultiChar: true,
  };

  assertEquals(typeof config.numericOnlyMultiChar, "boolean");
  assertEquals(config.numericOnlyMultiChar, true);
});

Deno.test("HintKeyConfig - numericOnlyMultiChar should be optional (can be undefined)", () => {
  // プロパティがオプショナルであることを確認
  const config: HintKeyConfig = {
    multiCharKeys: ["1", "2", "3"],
  };

  // TypeScriptの型チェックが通ることを確認（undefinedでもOK）
  assertEquals(config.numericOnlyMultiChar, undefined);
});

Deno.test("HintKeyConfig - both new properties can be set together", () => {
  // 両方のプロパティを同時に設定できることを確認
  const config: HintKeyConfig = {
    singleCharKeys: ["A", "B", "!", "@"],
    multiCharKeys: ["1", "2", "3"],
    allowSymbolsInSingleChar: true,
    numericOnlyMultiChar: true,
  };

  assertEquals(config.allowSymbolsInSingleChar, true);
  assertEquals(config.numericOnlyMultiChar, true);
});

Deno.test("HintKeyConfig - allowSymbolsInSingleChar can be set to false", () => {
  // falseを明示的に設定できることを確認
  const config: HintKeyConfig = {
    singleCharKeys: ["A", "B", "C"],
    allowSymbolsInSingleChar: false,
  };

  assertEquals(config.allowSymbolsInSingleChar, false);
});

Deno.test("HintKeyConfig - numericOnlyMultiChar can be set to false", () => {
  // falseを明示的に設定できることを確認
  const config: HintKeyConfig = {
    multiCharKeys: ["A", "B", "C"],
    numericOnlyMultiChar: false,
  };

  assertEquals(config.numericOnlyMultiChar, false);
});

Deno.test("HintKeyConfig - backward compatibility with existing properties", () => {
  // 既存のプロパティとの互換性を確認
  const config: HintKeyConfig = {
    singleCharKeys: ["A", "B", "C"],
    multiCharKeys: ["1", "2", "3"],
    markers: ["D", "E", "F"],
    maxSingleCharHints: 10,
    useDistancePriority: true,
    allowSymbolsInSingleChar: true,
    numericOnlyMultiChar: true,
  };

  // 既存のプロパティが正しく設定されていることを確認
  assertExists(config.singleCharKeys);
  assertExists(config.multiCharKeys);
  assertExists(config.markers);
  assertEquals(config.maxSingleCharHints, 10);
  assertEquals(config.useDistancePriority, true);

  // 新しいプロパティも正しく設定されていることを確認
  assertEquals(config.allowSymbolsInSingleChar, true);
  assertEquals(config.numericOnlyMultiChar, true);
});

Deno.test("HintKeyConfig - JSDoc documentation exists for new properties", () => {
  // このテストは型定義にJSDocコメントが存在することを確認する
  // 実際のコードレビューで手動確認が必要
  // ここではプロパティが存在することのみ確認
  const config: HintKeyConfig = {
    allowSymbolsInSingleChar: true,
    numericOnlyMultiChar: false,
  };

  assertExists(config);
});
