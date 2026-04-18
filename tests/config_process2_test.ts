/**
 * Process2: バリデーション層の改善テスト
 * TDD Red-Green-Refactorサイクルで実装
 *
 * 目的:
 * - ValidationRules インターフェースの型厳密化
 * - validateConfig, validateConfigValue, validateConfigObject の型安全性向上
 * - any型から unknown/Record<string, unknown> への移行
 */

import { assertEquals, assertExists } from "jsr:@std/assert@1";
import {
  validateConfig,
  validateConfigObject,
  validateConfigValue,
  type ValidationResult,
  type ValidationRules,
} from "../denops/hellshake-yano/config.ts";

/**
 * Sub1: ValidationRules インターフェースの厳密化テスト
 */
Deno.test("Process2 Sub1: ValidationRules enum プロパティはプリミティブ型のみ許可", () => {
  // enumがプリミティブ型の配列として定義されていることを確認
  const rules: ValidationRules = {
    enum: ["start", "end", "overlay"] as const,
  };

  // コンパイルエラーが出ないことを確認（型が正しく定義されている）
  assertExists(rules.enum);
  assertEquals(rules.enum.length, 3);
});

Deno.test("Process2 Sub1: ValidationRules custom プロパティは unknown を受け取る", () => {
  // customバリデーション関数がunknownを受け取ることを確認
  const rules: ValidationRules = {
    custom: (value: unknown): boolean => {
      // unknown型なので、型ガードが必要
      if (typeof value === "string") {
        return value.length > 0;
      }
      return false;
    },
  };

  // コンパイルエラーが出ないことを確認
  assertExists(rules.custom);

  // 実際にバリデーションが動作することを確認
  assertEquals(rules.custom("test"), true);
  assertEquals(rules.custom(""), false);
  assertEquals(rules.custom(123), false);
});

/**
 * Sub2: validateConfig 関数の改善テスト
 */
Deno.test("Process2 Sub2: validateConfig は Record<string, unknown> を使用", () => {
  // 型アサーションが Record<string, unknown> に変更されていることを確認
  const config = {
    motionCount: 3,
    hintPosition: "start" as const,
    highlightHintMarker: "DiffAdd",
  };

  const result = validateConfig(config);

  // バリデーションが正常に動作することを確認
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test("Process2 Sub2: validateConfig は null 値を適切に処理", () => {
  // null値が適切にエラーとして検出されることを確認
  // unknown型でキャストして無効な値をテスト
  const config = {
    motionCount: null as unknown as number,
  };

  const result = validateConfig(config);

  assertEquals(result.valid, false);
  assertEquals(result.errors.some((e) => e.includes("motionCount")), true);
});

Deno.test("Process2 Sub2: validateConfig は型ガードを使用して検証", () => {
  // 型ガードが正しく動作することを確認
  // unknown型でキャストして無効な値をテスト
  const config = {
    markers: "not an array" as unknown as string[],
  };

  const result = validateConfig(config);

  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes("markers must be an array")),
    true,
  );
});

/**
 * Sub3: validateConfigValue 関数の改善テスト
 */
Deno.test("Process2 Sub3: validateConfigValue は unknown 型を受け取る", () => {
  // unknownパラメータを受け取ることを確認
  const unknownValue: unknown = "test value";

  const result = validateConfigValue("testKey", unknownValue, {
    type: "string",
    required: true,
  });

  assertEquals(result.valid, true);
});

Deno.test("Process2 Sub3: validateConfigValue は型ガードで型を絞り込む", () => {
  // 型ガードによる型チェックが正しく動作することを確認
  const numberValue: unknown = 123;

  const result = validateConfigValue("port", numberValue, {
    type: "number",
    min: 1,
    max: 1000,
  });

  assertEquals(result.valid, true);
});

Deno.test("Process2 Sub3: validateConfigValue は不正な型を検出", () => {
  // 型が一致しない場合、エラーを返すことを確認
  const stringValue: unknown = "not a number";

  const result = validateConfigValue("count", stringValue, {
    type: "number",
  });

  assertEquals(result.valid, false);
  assertExists(result.error);
  assertEquals(result.error?.includes("must be of type number"), true);
});

/**
 * Sub4: validateConfigObject 関数の改善テスト
 */
Deno.test("Process2 Sub4: validateConfigObject は Record<string, unknown> を受け取る", () => {
  // Record<string, unknown>として型安全に扱うことを確認
  const config: Record<string, unknown> = {
    enabled: true,
    motionCount: 3,
    markers: ["A", "B", "C"],
  };

  const rules = {
    enabled: { type: "boolean" as const, required: true },
    motionCount: { type: "number" as const, min: 1 },
    markers: { type: "array" as const, minLength: 1 },
  };

  const result = validateConfigObject(config, rules);

  assertEquals(result.valid, true);
});

Deno.test("Process2 Sub4: validateConfigObject は複数のエラーを収集", () => {
  // 複数のバリデーションエラーが正しく収集されることを確認
  const config: Record<string, unknown> = {
    motionCount: -1, // 範囲外
    markers: [], // 空配列
  };

  const rules = {
    motionCount: { type: "number" as const, min: 1 },
    markers: { type: "array" as const, minLength: 1 },
  };

  const result = validateConfigObject(config, rules);

  assertEquals(result.valid, false);
  assertExists(result.errors);
  assertEquals(Object.keys(result.errors!).length >= 2, true);
});

/**
 * Sub5: その他のバリデーション関数テスト
 */
Deno.test("Process2 Sub5: isValidType は unknown から型を判定", () => {
  // isValidType関数が直接エクスポートされていない場合はスキップ
  // validateConfigValue経由でテストする

  const stringResult = validateConfigValue("key", "value" as unknown, {
    type: "string",
  });
  assertEquals(stringResult.valid, true);

  const numberResult = validateConfigValue("key", 123 as unknown, {
    type: "number",
  });
  assertEquals(numberResult.valid, true);

  const booleanResult = validateConfigValue("key", true as unknown, {
    type: "boolean",
  });
  assertEquals(booleanResult.valid, true);

  const arrayResult = validateConfigValue("key", [] as unknown, {
    type: "array",
  });
  assertEquals(arrayResult.valid, true);

  const objectResult = validateConfigValue("key", {} as unknown, {
    type: "object",
  });
  assertEquals(objectResult.valid, true);
});

Deno.test("Process2 Sub5: isInRange は number 型で動作", () => {
  // isInRange経由でテスト
  const validResult = validateConfigValue("count", 50 as unknown, {
    type: "number",
    min: 1,
    max: 100,
  });
  assertEquals(validResult.valid, true);

  const tooSmallResult = validateConfigValue("count", 0 as unknown, {
    type: "number",
    min: 1,
  });
  assertEquals(tooSmallResult.valid, false);

  const tooLargeResult = validateConfigValue("count", 101 as unknown, {
    type: "number",
    max: 100,
  });
  assertEquals(tooLargeResult.valid, false);
});

Deno.test("Process2 Sub5: isValidLength は string 型で動作", () => {
  // isValidLength経由でテスト
  const validResult = validateConfigValue("name", "test" as unknown, {
    type: "string",
    minLength: 1,
    maxLength: 10,
  });
  assertEquals(validResult.valid, true);

  const tooShortResult = validateConfigValue("name", "" as unknown, {
    type: "string",
    minLength: 1,
  });
  assertEquals(tooShortResult.valid, false);

  const tooLongResult = validateConfigValue("name", "12345678901" as unknown, {
    type: "string",
    maxLength: 10,
  });
  assertEquals(tooLongResult.valid, false);
});

/**
 * 統合テスト: 型安全性の向上を確認
 */
Deno.test("Process2 統合: unknown型により型ガードが強制される", () => {
  // unknown型を使用することで、型ガードの使用が強制されることを確認
  const mixedValue: unknown = { nested: { value: 123 } };

  // 型ガードなしではアクセスできないことを想定
  // バリデーション関数内で適切に型チェックされることを確認

  const result = validateConfigValue("config", mixedValue, {
    type: "object",
  });

  assertEquals(result.valid, true);
});

Deno.test("Process2 統合: Record<string, unknown>はanyより型安全", () => {
  // Record<string, unknown>の使用により、
  // プロパティアクセスは可能だが値の型は不明なので型チェックが必要

  const config: Record<string, unknown> = {
    enabled: true,
    count: 3,
  };

  // プロパティへのアクセスは可能
  assertExists(config.enabled);
  assertExists(config.count);

  // しかし値の型は不明なので、バリデーションが必要
  const result = validateConfigObject(config, {
    enabled: { type: "boolean" as const },
    count: { type: "number" as const },
  });

  assertEquals(result.valid, true);
});

/**
 * リグレッションテスト: 既存の機能が壊れていないことを確認
 */
Deno.test("Process2 リグレッション: 既存のvalidateConfigが動作", () => {
  const config = {
    enabled: true,
    markers: ["A", "B", "C"],
    motionCount: 3,
    motionTimeout: 2000,
    hintPosition: "start" as const,
  };

  const result = validateConfig(config);

  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test("Process2 リグレッション: エラーメッセージが正しく生成される", () => {
  const config = {
    motionCount: -1,
    hintPosition: "invalid" as unknown as "start",
  };

  const result = validateConfig(config);

  assertEquals(result.valid, false);
  assertEquals(result.errors.length >= 2, true);
  assertEquals(
    result.errors.some((e) => e.includes("motionCount")),
    true,
  );
  assertEquals(
    result.errors.some((e) => e.includes("hintPosition")),
    true,
  );
});
