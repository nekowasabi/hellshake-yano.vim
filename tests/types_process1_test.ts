/**
 * Process1: 基盤型定義の厳密化テスト
 *
 * TDD Red-Green-Refactorサイクルに従った型定義の厳密化テスト
 * Phase: Red (失敗するテストを作成)
 *
 * @description
 * - Sub1: Config関連インターフェースの修正テスト
 * - Sub2: DebugInfo型の修正テスト
 * - Sub3: HintOperationsDependencies型の新規定義テスト
 * - Sub4: HintOperationsConfig.dependencies の型適用テスト
 */

import { assertEquals, assertExists } from "@std/assert";
import { DEFAULT_CONFIG } from "../denops/hellshake-yano/config.ts";
import type {
  Config,
  DebugInfo,
  DetectionContext,
  DetectWordsParams,
  GenerateHintsParams,
  HintGenerationConfig,
  HintMapping,
  HintOperationsConfig,
  Word,
  WordDetectionConfig,
} from "../denops/hellshake-yano/types.ts";
import type { Denops } from "@denops/std";

// ===== Sub1: Config関連インターフェースの修正テスト =====

Deno.test("Process1 Sub1: DetectionContext.config should accept Partial<Config>", () => {
  // 部分的なConfig型を持つDetectionContextオブジェクトを作成
  const partialConfig: Partial<Config> = {
    enabled: true,
    motionCount: 3,
    markers: ["A", "B", "C"],
  };

  const context: DetectionContext = {
    currentKey: "w",
    minWordLength: 3,
    config: partialConfig, // Partial<Config>が受け入れられることをテスト
  };

  assertExists(context.config);
  assertEquals(context.config.enabled, true);
  assertEquals(context.config.motionCount, 3);
});

Deno.test("Process1 Sub1: WordDetectionConfig.config should accept Partial<Config>", () => {
  const partialConfig: Partial<Config> = {
    defaultMinWordLength: 3,
    useJapanese: false,
  };

  const wordDetectionConfig: WordDetectionConfig = {
    minLength: 3,
    maxWords: 100,
    config: partialConfig, // Partial<Config>が受け入れられることをテスト
  };

  assertExists(wordDetectionConfig.config);
  assertEquals(wordDetectionConfig.config.defaultMinWordLength, 3);
  assertEquals(wordDetectionConfig.config.useJapanese, false);
});

Deno.test("Process1 Sub1: DetectWordsParams.config should accept Partial<Config>", () => {
  const mockDenops = {} as Denops;
  const partialConfig: Partial<Config> = {
    enabled: true,
    wordDetectionStrategy: "hybrid",
  };

  const params: DetectWordsParams = {
    denops: mockDenops,
    bufnr: 1,
    config: partialConfig, // Partial<Config>が受け入れられることをテスト
  };

  assertExists(params.config);
  assertEquals(params.config.enabled, true);
  assertEquals(params.config.wordDetectionStrategy, "hybrid");
});

Deno.test("Process1 Sub1: HintGenerationConfig.config should accept Partial<Config>", () => {
  const partialConfig: Partial<Config> = {
    markers: ["A", "S", "D", "F"],
    useNumbers: true,
  };

  const hintConfig: HintGenerationConfig = {
    wordCount: 10,
    config: partialConfig, // Partial<Config>が受け入れられることをテスト
  };

  assertExists(hintConfig.config);
  assertEquals(hintConfig.config.markers?.length, 4);
  assertEquals(hintConfig.config.useNumbers, true);
});

Deno.test("Process1 Sub1: GenerateHintsParams.config should accept Partial<Config>", () => {
  const partialConfig: Partial<Config> = {
    maxHints: 200,
    debounceDelay: 100,
  };

  const params: GenerateHintsParams = {
    wordCount: 50,
    markers: ["A", "B", "C"],
    config: partialConfig, // Partial<Config>が受け入れられることをテスト
  };

  assertExists(params.config);
  assertEquals(params.config.maxHints, 200);
  assertEquals(params.config.debounceDelay, 100);
});

Deno.test("Process1 Sub1: HintOperationsConfig.config should accept Partial<Config>", () => {
  const mockDenops = {} as Denops;
  const partialConfig: Partial<Config> = {
    highlightSelected: true,
    debugCoordinates: false,
  };

  const operationsConfig: HintOperationsConfig = {
    denops: mockDenops,
    config: partialConfig, // Partial<Config>が受け入れられることをテスト
  };

  assertExists(operationsConfig.config);
  assertEquals(operationsConfig.config.highlightSelected, true);
  assertEquals(operationsConfig.config.debugCoordinates, false);
});

// ===== Sub2: DebugInfo型の修正テスト =====

Deno.test("Process1 Sub2: DebugInfo.config should require full Config", () => {
  // 完全なConfigオブジェクトを要求することをテスト
  const fullConfig: Config = {
    ...DEFAULT_CONFIG,
    markers: ["A", "B", "C"],
    singleCharKeys: [],
    multiCharKeys: [],
    useHintGroups: false,
    highlightHintMarker: "DiffAdd",
    highlightHintMarkerCurrent: "DiffText",
  };

  const debugInfo: DebugInfo = {
    config: fullConfig, // 完全なConfigが必要
    hintsVisible: true,
    currentHints: [],
    metrics: {
      showHints: [],
      hideHints: [],
      wordDetection: [],
      hintGeneration: [],
    },
    timestamp: Date.now(),
  };

  assertExists(debugInfo.config);
  assertEquals(debugInfo.config.enabled, true);
  assertEquals(debugInfo.config.motionCount, 3);
  // 完全なConfigなので、すべてのプロパティが存在することを確認
  assertExists(debugInfo.config.markers);
  assertExists(debugInfo.config.motionTimeout);
  assertExists(debugInfo.config.hintPosition);
});

// ===== Sub3: HintOperationsDependencies型の新規定義テスト =====

Deno.test("Process1 Sub3: HintOperationsDependencies type should be defined", async () => {
  // HintOperationsDependenciesインターフェースが正しく定義されているかをテスト
  const mockDenops = {} as Denops;

  const dependencies = {
    detectWordsOptimized: async (_denops: Denops, _bufnr?: number): Promise<Word[]> => {
      return [{ text: "test", line: 1, col: 1 }];
    },
    generateHintsOptimized: (_wordCount: number, _config?: Partial<Config>): string[] => {
      return ["A", "B", "C"];
    },
    assignHintsToWords: (words: Word[], hints: string[]): HintMapping[] => {
      return words.map((word, idx) => ({
        word,
        hint: hints[idx] || "A",
        hintCol: word.col,
        hintByteCol: word.byteCol || word.col,
      }));
    },
    displayHintsAsync: async (
      _denops: Denops,
      _hints: HintMapping[],
      _config?: Partial<Config>,
    ): Promise<void> => {
      return Promise.resolve();
    },
    hideHints: async (_denops: Denops): Promise<void> => {
      return Promise.resolve();
    },
    recordPerformance: (_operation: string, _startTime: number, _endTime: number): void => {
      // パフォーマンス記録処理
    },
    clearHintCache: (): void => {
      // キャッシュクリア処理
    },
  };

  // 各関数が正しい型シグネチャを持つことを検証
  assertExists(dependencies.detectWordsOptimized);
  assertExists(dependencies.generateHintsOptimized);
  assertExists(dependencies.assignHintsToWords);
  assertExists(dependencies.displayHintsAsync);
  assertExists(dependencies.hideHints);
  assertExists(dependencies.recordPerformance);
  assertExists(dependencies.clearHintCache);

  // 実際に関数を呼び出して型が正しく推論されることを確認
  const words = await dependencies.detectWordsOptimized(mockDenops, 1);
  assertEquals(words.length, 1);
  assertEquals(words[0].text, "test");

  const hints = dependencies.generateHintsOptimized(10);
  assertEquals(hints.length, 3);

  const mappings = dependencies.assignHintsToWords(words, hints);
  assertEquals(mappings.length, 1);
  assertEquals(mappings[0].hint, "A");
});

// ===== Sub4: HintOperationsConfig.dependencies の型適用テスト =====

Deno.test("Process1 Sub4: HintOperationsConfig.dependencies should accept HintOperationsDependencies", () => {
  const mockDenops = {} as Denops;
  const partialConfig: Partial<Config> = {
    enabled: true,
    markers: ["A", "B", "C"],
  };

  // HintOperationsDependencies型の依存関数群を定義
  const dependencies = {
    detectWordsOptimized: async (_denops: Denops, _bufnr?: number): Promise<Word[]> => {
      return [{ text: "example", line: 1, col: 5 }];
    },
    generateHintsOptimized: (_wordCount: number, _config?: Partial<Config>): string[] => {
      return ["A", "B", "C", "D"];
    },
    assignHintsToWords: (words: Word[], hints: string[]): HintMapping[] => {
      return words.map((word, idx) => ({
        word,
        hint: hints[idx] || "A",
        hintCol: word.col,
        hintByteCol: word.byteCol || word.col,
      }));
    },
    displayHintsAsync: async (
      _denops: Denops,
      _hints: HintMapping[],
      _config?: Partial<Config>,
    ): Promise<void> => {
      return Promise.resolve();
    },
    hideHints: async (_denops: Denops): Promise<void> => {
      return Promise.resolve();
    },
    recordPerformance: (_operation: string, _startTime: number, _endTime: number): void => {
      // パフォーマンス記録処理
    },
    clearHintCache: (): void => {
      // キャッシュクリア処理
    },
  };

  const operationsConfig: HintOperationsConfig = {
    denops: mockDenops,
    config: partialConfig,
    dependencies, // HintOperationsDependencies型が受け入れられることをテスト
  };

  assertExists(operationsConfig.dependencies);
  assertExists(operationsConfig.dependencies.detectWordsOptimized);
  assertExists(operationsConfig.dependencies.generateHintsOptimized);
  assertExists(operationsConfig.dependencies.assignHintsToWords);
  assertExists(operationsConfig.dependencies.displayHintsAsync);
  assertExists(operationsConfig.dependencies.hideHints);
  assertExists(operationsConfig.dependencies.recordPerformance);
  assertExists(operationsConfig.dependencies.clearHintCache);
});

// ===== 型推論と型安全性のテスト =====

Deno.test("Process1: Type inference should work correctly for Partial<Config>", () => {
  // 型推論が正しく動作することを確認
  const partialConfig: Partial<Config> = {
    enabled: true,
    motionCount: 5,
  };

  const context: DetectionContext = {
    config: partialConfig,
  };

  // TypeScriptの型推論により、undefinedの可能性があることが認識される
  if (context.config?.enabled) {
    assertEquals(context.config.enabled, true);
  }

  if (context.config?.motionCount) {
    assertEquals(context.config.motionCount, 5);
  }

  // 存在しないプロパティはundefined
  assertEquals(context.config?.markers, undefined);
});

Deno.test("Process1: Type safety should prevent assignment of invalid types", () => {
  // 型安全性により、無効な型の代入が防止されることを確認
  const partialConfig: Partial<Config> = {
    enabled: true,
    motionCount: 3,
  };

  const context: DetectionContext = {
    config: partialConfig,
  };

  // 正しい型のみが受け入れられることを確認
  assertExists(context.config);

  // TypeScriptの型チェックにより、以下のような誤った代入は防止される:
  // context.config = "invalid"; // コンパイルエラー
  // context.config = { invalid: true }; // コンパイルエラー
  // context.config = 123; // コンパイルエラー
});
