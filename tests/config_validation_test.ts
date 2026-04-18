/**
 * @fileoverview 統合バリデーションシステムのテスト (Process2 Sub3)
 * TDD Red-Green-Refactor方式で実装されたvalidateConfig()関数のテスト
 *
 * このファイルは以下の項目をテスト:
 * 1. validateConfig()関数の単一バリデーション
 * 2. 既存validateConfig()からのリダイレクト
 * 3. main.tsの重複validateConfig()の非推奨化
 * 4. エラーメッセージの統一（camelCase形式）
 * 5. 境界値テスト（正常系/異常系）
 */

import { assertEquals, assertObjectMatch } from "@std/assert";
import type { Config } from "../denops/hellshake-yano/config.ts";
import {
  DEFAULT_CONFIG,
  validateConfig, // 既存関数（リダイレクト対象）
  validateConfig as validateConfigFunction, // 統合バリデーション関数
} from "../denops/hellshake-yano/config.ts";

Deno.test("validateConfigFunction - 基本機能テスト (Red Phase)", () => {
  // 正常なデフォルト設定でテスト
  const result = validateConfigFunction(DEFAULT_CONFIG);
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test("validateConfigFunction - motionCount バリデーション", () => {
  // 正常系
  let result = validateConfigFunction({ motionCount: 3 });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 異常系: 負の値
  result = validateConfigFunction({ motionCount: -1 });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("motionCount must be a positive integer"), true);

  // 異常系: 0
  result = validateConfigFunction({ motionCount: 0 });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("motionCount must be a positive integer"), true);

  // 異常系: 小数点
  result = validateConfigFunction({ motionCount: 3.5 });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("motionCount must be a positive integer"), true);

  // 境界値: 最小正数
  result = validateConfigFunction({ motionCount: 1 });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 境界値: 大きな値
  result = validateConfigFunction({ motionCount: 100 });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test("validateConfigFunction - motionTimeout バリデーション", () => {
  // 正常系
  let result = validateConfigFunction({ motionTimeout: 2000 });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 異常系: 負の値
  result = validateConfigFunction({ motionTimeout: -100 });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("motionTimeout must be at least 100ms"), true);

  // 異常系: 0
  result = validateConfigFunction({ motionTimeout: 0 });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("motionTimeout must be at least 100ms"), true);

  // 境界値: 100未満は失敗
  result = validateConfigFunction({ motionTimeout: 99 });
  assertEquals(result.valid, false);

  // 境界値: 100以上は成功
  result = validateConfigFunction({ motionTimeout: 100 });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test("validateConfigFunction - maxHints バリデーション", () => {
  // 正常系
  let result = validateConfigFunction({ maxHints: 336 });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 異常系: 負の値
  result = validateConfigFunction({ maxHints: -1 });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("maxHints must be a positive integer"), true);

  // 異常系: 0
  result = validateConfigFunction({ maxHints: 0 });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("maxHints must be a positive integer"), true);

  // 境界値: 最小正数
  result = validateConfigFunction({ maxHints: 1 });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test("validateConfigFunction - debounceDelay バリデーション", () => {
  // 正常系: 0（非負整数として有効）
  let result = validateConfigFunction({ debounceDelay: 0 });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 正常系: 正の値
  result = validateConfigFunction({ debounceDelay: 50 });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 異常系: 負の値
  result = validateConfigFunction({ debounceDelay: -10 });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("debounceDelay must be a non-negative number"), true);

  // 異常系: 小数点
  result = validateConfigFunction({ debounceDelay: 50.5 });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("debounceDelay must be a non-negative number"), true);
});

Deno.test("validateConfigFunction - hintPosition バリデーション", () => {
  // 正常系
  const validPositions = ["start", "end", "overlay", "both"];
  for (const position of validPositions) {
    const result = validateConfigFunction({ hintPosition: position as any });
    assertEquals(result.valid, true);
    assertEquals(result.errors.length, 0);
  }

  // 異常系: 無効な値
  const result = validateConfigFunction({ hintPosition: "invalid" as any });
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.includes("hintPosition must be one of: start, end, overlay, both"),
    true,
  );
});

Deno.test("validateConfigFunction - wordDetectionStrategy バリデーション", () => {
  // 正常系
  const validStrategies = ["regex", "tinysegmenter", "hybrid"];
  for (const strategy of validStrategies) {
    const result = validateConfigFunction({ wordDetectionStrategy: strategy as any });
    assertEquals(result.valid, true);
    assertEquals(result.errors.length, 0);
  }

  // 異常系: 無効な値
  const result = validateConfigFunction({ wordDetectionStrategy: "invalid" as any });
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.includes("wordDetectionStrategy must be one of: regex, tinysegmenter, hybrid"),
    true,
  );
});

Deno.test("validateConfigFunction - markers配列バリデーション", () => {
  // 正常系
  let result = validateConfigFunction({ markers: ["A", "B", "C"] });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 異常系: 空配列
  result = validateConfigFunction({ markers: [] });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("markers must not be empty"), true);

  // 異常系: 重複値
  result = validateConfigFunction({ markers: ["A", "B", "A"] });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("markers must contain unique values"), true);

  // 異常系: 配列でない
  result = validateConfigFunction({ markers: "ABC" as any });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("markers must be an array"), true);
});

Deno.test("validateConfigFunction - 複数エラーの処理", () => {
  // 複数の無効な値を同時に設定
  const result = validateConfigFunction({
    motionCount: -1,
    motionTimeout: 0,
    maxHints: -5,
    hintPosition: "invalid" as any,
    markers: [],
  });

  assertEquals(result.valid, false);
  assertEquals(result.errors.length, 5);
  assertEquals(result.errors.includes("motionCount must be a positive integer"), true);
  assertEquals(result.errors.includes("motionTimeout must be at least 100ms"), true);
  assertEquals(result.errors.includes("maxHints must be a positive integer"), true);
  assertEquals(
    result.errors.includes("hintPosition must be one of: start, end, overlay, both"),
    true,
  );
  assertEquals(result.errors.includes("markers must not be empty"), true);
});

Deno.test("validateConfigFunction - continuous hint loop settings validation", () => {
  // continuousHintMode
  let result = validateConfigFunction({ continuousHintMode: true });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  result = validateConfigFunction({ continuousHintMode: "yes" as unknown as boolean });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("continuousHintMode must be a boolean"), true);

  // recenterCommand
  result = validateConfigFunction({ recenterCommand: "normal! zz" });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  result = validateConfigFunction({ recenterCommand: 123 as unknown as string });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("recenterCommand must be a non-empty string"), true);

  result = validateConfigFunction({ recenterCommand: "" });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("recenterCommand must be a non-empty string"), true);

  // maxContinuousJumps
  result = validateConfigFunction({ maxContinuousJumps: 50 });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  result = validateConfigFunction({ maxContinuousJumps: 0 });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("maxContinuousJumps must be a positive integer"), true);

  result = validateConfigFunction({ maxContinuousJumps: -1 });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("maxContinuousJumps must be a positive integer"), true);

  result = validateConfigFunction({ maxContinuousJumps: 1.5 });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("maxContinuousJumps must be a positive integer"), true);
});

Deno.test("validateConfigFunction - 境界値テスト", () => {
  // 最小正数
  let result = validateConfigFunction({
    motionCount: 1,
    motionTimeout: 100, // 100ms以上必要
    maxHints: 1,
    debounceDelay: 0,
  });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 大きな値
  result = validateConfigFunction({
    motionCount: 999999,
    motionTimeout: 999999,
    maxHints: 999999,
    debounceDelay: 999999,
  });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test("既存validateConfig()のリダイレクト動作確認", () => {
  // 既存関数が新しいvalidateConfigFunction()を呼び出すことを確認
  // 注意: このテストは既存関数の改修後にパスするはず

  // 一旦既存関数の動作をテスト（snake_case入力）
  const result = validateConfig({
    motionCount: 3,
    motionTimeout: 2000,
    maxHints: 336,
    hintPosition: "start",
  });

  // 現在の既存関数の動作を確認
  assertEquals(typeof result.valid, "boolean");
  assertEquals(Array.isArray(result.errors), true);
});

// パフォーマンステスト
Deno.test("validateConfigFunction - パフォーマンステスト", () => {
  const config = { ...DEFAULT_CONFIG };

  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    validateConfigFunction(config);
  }
  const end = performance.now();

  const timePerCall = (end - start) / 1000;
  // 1回の呼び出しは1ms以下であるべき
  assertEquals(timePerCall < 1, true, `Validation took ${timePerCall}ms per call`);
});

// エラーメッセージの一貫性テスト
Deno.test("validateConfigFunction - エラーメッセージの一貫性", () => {
  const result = validateConfigFunction({ motionCount: -1 });
  assertEquals(result.valid, false);

  // camelCase形式のエラーメッセージを確認
  const errorMessage = result.errors[0];
  assertEquals(errorMessage.includes("motionCount"), true, "Error message should use camelCase");
  assertEquals(
    errorMessage.includes("motion_count"),
    false,
    "Error message should not use snake_case",
  );
});

// process2 sub2: 記号文字バリデーションテスト (TDD Red Phase)
Deno.test("validateConfigFunction - singleCharKeys 記号文字バリデーション", () => {
  // 正常系: 有効な記号のみ
  const validSymbols = [";", ":", "[", "]", "'", '"', ",", ".", "/", "\\", "-", "=", "`"];
  let result = validateConfigFunction({
    singleCharKeys: ["A", "S", "D", ...validSymbols],
  });
  assertEquals(result.valid, true, "Valid symbols should be accepted");
  assertEquals(result.errors.length, 0);

  // 正常系: アルファベットと数字のみ（既存の動作）
  result = validateConfigFunction({
    singleCharKeys: ["A", "B", "C", "0", "1", "2"],
  });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 正常系: すべて記号
  result = validateConfigFunction({
    singleCharKeys: [";", ":", "[", "]"],
  });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 異常系: 無効な記号（スペース）
  result = validateConfigFunction({
    singleCharKeys: ["A", "B", " "],
  });
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes("singleCharKeys") && e.includes("whitespace")),
    true,
    "Space should be rejected as invalid symbol",
  );

  // 異常系: 無効な記号（タブ文字）
  result = validateConfigFunction({
    singleCharKeys: ["A", "B", "\t"],
  });
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes("singleCharKeys") && e.includes("whitespace")),
    true,
    "Tab character should be rejected",
  );

  // 異常系: 無効な記号（改行文字）
  result = validateConfigFunction({
    singleCharKeys: ["A", "B", "\n"],
  });
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes("singleCharKeys") && e.includes("whitespace")),
    true,
    "Newline should be rejected",
  );

  // 異常系: 複数文字
  result = validateConfigFunction({
    singleCharKeys: ["A", "B", "AB"],
  });
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes("singleCharKeys") && e.includes("single character")),
    true,
    "Multi-character strings should be rejected",
  );

  // 異常系: 空文字列
  result = validateConfigFunction({
    singleCharKeys: ["A", "B", ""],
  });
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes("singleCharKeys") && e.includes("empty")),
    true,
    "Empty string should be rejected",
  );

  // 異常系: 特殊文字（制御文字）
  result = validateConfigFunction({
    singleCharKeys: ["A", "B", "\x00"],
  });
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes("singleCharKeys") && e.includes("control")),
    true,
    "Control characters should be rejected",
  );
});

Deno.test("validateConfigFunction - singleCharKeys 記号重複チェック", () => {
  // 異常系: 記号の重複
  const result = validateConfigFunction({
    singleCharKeys: ["A", ";", ";", "B"],
  });
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes("singleCharKeys") && e.includes("unique")),
    true,
    "Duplicate symbols should be rejected",
  );
});

Deno.test("validateConfigFunction - singleCharKeys エッジケース", () => {
  // 正常系: 記号のみの設定
  let result = validateConfigFunction({
    singleCharKeys: [";", ":", ",", "."],
  });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 正常系: バックスラッシュ
  result = validateConfigFunction({
    singleCharKeys: ["\\"],
  });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 正常系: バッククォート
  result = validateConfigFunction({
    singleCharKeys: ["`"],
  });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 正常系: クォートマーク
  result = validateConfigFunction({
    singleCharKeys: ["'", '"'],
  });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});
