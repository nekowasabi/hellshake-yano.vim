/**
 * @fileoverview validateHintKeyConfig関数のバリデーションテスト (Process4 Sub1)
 * TDD Red-Green-Refactor方式で実装
 *
 * このファイルは以下の項目をテスト:
 * 1. 記号文字のバリデーション（singleCharKeys）
 * 2. 数字専用モード時の検証（numericOnlyMultiChar）
 * 3. エラーメッセージの詳細化
 * 4. 境界値テスト（正常系/異常系）
 */

import { assertEquals } from "@std/assert";
import { validateHintKeyConfig } from "../denops/hellshake-yano/neovim/core/hint.ts";
import type { HintKeyConfig } from "../denops/hellshake-yano/types.ts";

// ===== RED PHASE: 記号文字バリデーションテスト =====

Deno.test("validateHintKeyConfig - singleCharKeys 記号文字の正常系", () => {
  // 有効な記号: ; : [ ] ' " , . / \ - = `
  const validSymbols = [";", ":", "[", "]", "'", '"', ",", ".", "/", "\\", "-", "=", "`"];

  // アルファベットと記号の混在
  let result = validateHintKeyConfig({
    singleCharKeys: ["A", "S", "D", ";", ":", "["],
    multiCharKeys: ["Q", "W", "E"],
  });
  assertEquals(result.valid, true, "Valid symbols with letters should be accepted");
  assertEquals(result.errors.length, 0);

  // 記号のみ
  result = validateHintKeyConfig({
    singleCharKeys: [";", ":", "[", "]"],
    multiCharKeys: ["Q"],
  });
  assertEquals(result.valid, true, "Only symbols should be accepted");
  assertEquals(result.errors.length, 0);

  // すべての有効な記号
  result = validateHintKeyConfig({
    singleCharKeys: validSymbols,
    multiCharKeys: ["Q"],
  });
  assertEquals(result.valid, true, "All valid symbols should be accepted");
  assertEquals(result.errors.length, 0);
});

Deno.test("validateHintKeyConfig - singleCharKeys 無効な記号の異常系", () => {
  // スペース
  let result = validateHintKeyConfig({
    singleCharKeys: ["A", "B", " "],
    multiCharKeys: ["Q"],
  });
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes("whitespace") || e.includes("スペース")),
    true,
    "Space should be rejected with specific error message",
  );

  // タブ文字
  result = validateHintKeyConfig({
    singleCharKeys: ["A", "\t"],
    multiCharKeys: ["Q"],
  });
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes("whitespace") || e.includes("ホワイトスペース")),
    true,
    "Tab should be rejected",
  );

  // 改行文字
  result = validateHintKeyConfig({
    singleCharKeys: ["A", "\n"],
    multiCharKeys: ["Q"],
  });
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes("whitespace") || e.includes("ホワイトスペース")),
    true,
    "Newline should be rejected",
  );

  // 制御文字
  result = validateHintKeyConfig({
    singleCharKeys: ["A", "\x00"],
    multiCharKeys: ["Q"],
  });
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes("control") || e.includes("制御文字")),
    true,
    "Control character should be rejected",
  );
});

Deno.test("validateHintKeyConfig - singleCharKeys 無効な記号の具体的なエラーメッセージ", () => {
  // エラーメッセージに無効な文字が含まれることを確認
  // Why: @ は VALID_SYMBOL_SET に含まれるため有効。# のみが無効文字。
  const result = validateHintKeyConfig({
    singleCharKeys: ["A", "B", "@", "#"],
    multiCharKeys: ["Q"],
  });
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes("#")),
    true,
    "Error message should list invalid character #",
  );
  assertEquals(
    result.errors.some((e) => e.includes("@")),
    false,
    "@ is now a valid symbol and should NOT appear in errors",
  );
});

Deno.test("validateHintKeyConfig - singleCharKeys 特殊な記号のエッジケース", () => {
  // バックスラッシュ
  let result = validateHintKeyConfig({
    singleCharKeys: ["\\"],
    multiCharKeys: ["Q"],
  });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // バッククォート
  result = validateHintKeyConfig({
    singleCharKeys: ["`"],
    multiCharKeys: ["Q"],
  });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // シングルクォートとダブルクォート
  result = validateHintKeyConfig({
    singleCharKeys: ["'", '"'],
    multiCharKeys: ["Q"],
  });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

// ===== RED PHASE: 数字専用モードバリデーションテスト =====

Deno.test("validateHintKeyConfig - numericOnlyMultiChar 正常系", () => {
  // numericOnlyMultiCharがtrueで、multiCharKeysが数字のみ
  let result = validateHintKeyConfig({
    singleCharKeys: ["A", "S", "D"],
    multiCharKeys: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    numericOnlyMultiChar: true,
  });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // numericOnlyMultiCharがfalseで、multiCharKeysが数字以外
  result = validateHintKeyConfig({
    singleCharKeys: ["A", "S", "D"],
    multiCharKeys: ["Q", "W", "E"],
    numericOnlyMultiChar: false,
  });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // numericOnlyMultiCharが未定義で、multiCharKeysが数字のみ（警告のみ）
  result = validateHintKeyConfig({
    singleCharKeys: ["A", "S", "D"],
    multiCharKeys: ["0", "1", "2"],
  });
  // 警告はあっても良いが、validはtrue
  assertEquals(result.valid, true);
});

Deno.test("validateHintKeyConfig - numericOnlyMultiChar 異常系: フラグと実際の不一致", () => {
  // numericOnlyMultiCharがtrueだが、multiCharKeysに数字以外が含まれる
  let result = validateHintKeyConfig({
    singleCharKeys: ["A", "S", "D"],
    multiCharKeys: ["0", "1", "Q"],
    numericOnlyMultiChar: true,
  });
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) =>
      (e.includes("numericOnlyMultiChar") && e.includes("digit")) ||
      (e.includes("数字専用") && e.includes("数字以外"))
    ),
    true,
    "Should error when numericOnlyMultiChar is true but non-digits exist",
  );

  // numericOnlyMultiCharがfalseだが、multiCharKeysがすべて数字（警告レベル）
  result = validateHintKeyConfig({
    singleCharKeys: ["A", "S", "D"],
    multiCharKeys: ["0", "1", "2", "3"],
    numericOnlyMultiChar: false,
  });
  // これは警告として扱うが、valid自体はtrue
  assertEquals(result.valid, true);
  // もし警告フィールドがあれば確認
  // assertEquals(result.warnings?.length > 0, true);
});

Deno.test("validateHintKeyConfig - numericOnlyMultiChar 数字判定の境界値", () => {
  // すべての数字（0-9）
  let result = validateHintKeyConfig({
    singleCharKeys: ["A"],
    multiCharKeys: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    numericOnlyMultiChar: true,
  });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 数字とアルファベットの混在
  result = validateHintKeyConfig({
    singleCharKeys: ["A"],
    multiCharKeys: ["0", "1", "Q"],
    numericOnlyMultiChar: true,
  });
  assertEquals(result.valid, false);

  // 数字と記号の混在
  result = validateHintKeyConfig({
    singleCharKeys: ["A"],
    multiCharKeys: ["0", "1", ";"],
    numericOnlyMultiChar: true,
  });
  assertEquals(result.valid, false);
});

Deno.test("validateHintKeyConfig - numericOnlyMultiChar エラーメッセージの詳細化", () => {
  // 非数字の文字をエラーメッセージに含める
  const result = validateHintKeyConfig({
    singleCharKeys: ["A"],
    multiCharKeys: ["0", "1", "Q", "W"],
    numericOnlyMultiChar: true,
  });
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes("Q") && e.includes("W")),
    true,
    "Error message should list non-digit characters",
  );
});

// ===== 統合テスト: 複数のバリデーションエラー =====

Deno.test("validateHintKeyConfig - 複数のバリデーションエラー", () => {
  const result = validateHintKeyConfig({
    singleCharKeys: ["A", "B", " ", "@"], // スペースと無効な記号
    multiCharKeys: ["0", "1", "Q"], // numericOnlyMultiCharと矛盾
    numericOnlyMultiChar: true,
  });

  assertEquals(result.valid, false);
  assertEquals(result.errors.length >= 2, true, "Should have multiple errors");

  // 記号のエラー
  assertEquals(
    result.errors.some((e) => e.includes("singleCharKeys") || e.includes("無効")),
    true,
  );

  // 数字専用モードのエラー
  assertEquals(
    result.errors.some((e) => e.includes("numericOnlyMultiChar") || e.includes("数字専用")),
    true,
  );
});

// ===== 既存のバリデーション動作の確認 =====

Deno.test("validateHintKeyConfig - 既存のバリデーションが正常に動作", () => {
  // 2文字以上のsingleCharKeys
  let result = validateHintKeyConfig({
    singleCharKeys: ["A", "BB"],
    multiCharKeys: ["Q"],
  });
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes("Invalid single char keys")),
    true,
  );

  // 重複チェック
  result = validateHintKeyConfig({
    singleCharKeys: ["A", "Q"],
    multiCharKeys: ["Q"],
  });
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes("Keys cannot be in both groups")),
    true,
  );

  // maxSingleCharHints 負の値
  result = validateHintKeyConfig({
    singleCharKeys: ["A"],
    multiCharKeys: ["Q"],
    maxSingleCharHints: -1,
  });
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes("max_single_char_hints must be non-negative")),
    true,
  );
});

// ===== パフォーマンステスト =====

Deno.test("validateHintKeyConfig - パフォーマンステスト", () => {
  const config: HintKeyConfig = {
    singleCharKeys: ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";"],
    multiCharKeys: ["Q", "W", "E", "R"],
    maxSingleCharHints: 10,
  };

  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    validateHintKeyConfig(config);
  }
  const end = performance.now();

  const timePerCall = (end - start) / 1000;
  assertEquals(timePerCall < 1, true, `Validation took ${timePerCall}ms per call`);
});
