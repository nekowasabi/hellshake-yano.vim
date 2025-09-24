// TDD Red-Phase: core/detection モジュールの仕様テスト

import { assertEquals } from "@std/assert";
import { spy } from "@std/testing/mock";
import type { Denops } from "@denops/std";
import { MockDenops } from "../helpers/mock.ts";
import { createTestConfig } from "./test_config.ts";
import type { Word, WordDetectionResult } from "../../denops/hellshake-yano/types.ts";

Deno.test("core/detection: detectWordsOptimized がマネージャー結果を返す", async () => {
  const { createDetectWordsOptimized } = await import(
    "../../denops/hellshake-yano/core/detection.ts"
  );

  const denops = new MockDenops() as unknown as Denops;
  const config = createTestConfig();
  const expectedWords: Word[] = [
    { text: "hello", line: 1, col: 1 },
    { text: "world", line: 1, col: 7 },
  ];

  const detectWordsWithManager = spy(async () => ({
    success: true,
    words: expectedWords,
    detector: "hybrid",
    performance: {
      duration: 0,
      wordCount: expectedWords.length,
      linesProcessed: expectedWords.length,
    },
  } as WordDetectionResult));
  const detectWordsWithConfig = spy(async () => expectedWords);
  const getMinLengthForKey = spy(() => 2);

  const detectWordsOptimized = createDetectWordsOptimized({
    detectWordsWithManager,
    detectWordsWithConfig,
    getMinLengthForKey,
  });

  const words = await detectWordsOptimized({
    denops,
    bufnr: 1,
    config,
  });

  assertEquals(words, expectedWords);
  assertEquals(detectWordsWithManager.calls.length, 1);
  assertEquals(detectWordsWithConfig.calls.length, 0);
});

Deno.test("core/detection: マネージャー失敗時はフォールバックする", async () => {
  const { createDetectWordsOptimized } = await import(
    "../../denops/hellshake-yano/core/detection.ts"
  );

  const denops = new MockDenops() as unknown as Denops;
  const config = createTestConfig();
  const fallbackWords: Word[] = [{ text: "fallback", line: 1, col: 1 }];

  const detectWordsWithManager = spy(async () => ({
    success: false,
    words: [],
    detector: "hybrid",
    performance: { duration: 0, wordCount: 0, linesProcessed: 0 },
  } as WordDetectionResult));
  const detectWordsWithConfig = spy(async () => fallbackWords);
  const getMinLengthForKey = spy(() => 1);

  const detectWordsOptimized = createDetectWordsOptimized({
    detectWordsWithManager,
    detectWordsWithConfig,
    getMinLengthForKey,
  });

  const words = await detectWordsOptimized({
    denops,
    bufnr: 2,
    config,
  });

  assertEquals(words, fallbackWords);
  assertEquals(detectWordsWithManager.calls.length, 1);
  assertEquals(detectWordsWithConfig.calls.length, 1);
});

Deno.test("core/detection: 例外時もフォールバック処理を行う", async () => {
  const { createDetectWordsOptimized } = await import(
    "../../denops/hellshake-yano/core/detection.ts"
  );

  const denops = new MockDenops() as unknown as Denops;
  const config = createTestConfig();
  const fallbackWords: Word[] = [{ text: "error", line: 1, col: 1 }];

  const detectWordsWithManager = spy(async () => {
    throw new Error("manager failure");
  });
  const detectWordsWithConfig = spy(async () => fallbackWords);
  const getMinLengthForKey = spy(() => 3);

  const detectWordsOptimized = createDetectWordsOptimized({
    detectWordsWithManager,
    detectWordsWithConfig,
    getMinLengthForKey,
  });

  const words = await detectWordsOptimized({
    denops,
    bufnr: 3,
    config,
  });

  assertEquals(words, fallbackWords);
  assertEquals(detectWordsWithManager.calls.length, 1);
  assertEquals(detectWordsWithConfig.calls.length, 1);
});
