// TDD Red-Phase: core/operations モジュールの仕様テスト

import { assertEquals } from "@std/assert";
import { spy } from "@std/testing/mock";
import { FakeTime } from "@std/testing/time";
import type { Denops } from "@denops/std";
import { MockDenops } from "../helpers/mock.ts";
import { createTestConfig } from "./test_config.ts";

Deno.test("core/operations: showHints はデバウンス後にヒントを表示する", async () => {
  const { createHintOperations } = await import("../../denops/hellshake-yano/core/operations.ts");

  const time = new FakeTime();
  try {
    const denops = new MockDenops() as unknown as Denops;
    const config = createTestConfig({ debounceDelay: 50 });

    const detectWordsOptimized = spy(async () => [
      { text: "alpha", line: 1, col: 1, byteCol: 1 },
    ]);
    const generateHintsOptimized = spy(() => ["A"]);
    const assignHintsToWords = spy(() => [
      {
        word: { text: "alpha", line: 1, col: 1, byteCol: 1 },
        hint: "A",
        hintCol: 1,
        hintByteCol: 1,
      },
    ]);
    const displayHintsAsync = spy(() => {});
    const hideHints = spy(async () => {});
    const recordPerformance = spy(() => {});
    const clearHintCache = spy(() => {});

    const operations = createHintOperations({
      denops,
      config,
      dependencies: {
        detectWordsOptimized,
        generateHintsOptimized,
        assignHintsToWords,
        displayHintsAsync,
        hideHints,
        recordPerformance,
        clearHintCache,
      },
    });

    await operations.showHints();
    assertEquals(detectWordsOptimized.calls.length, 1);

    await operations.showHints();

    // デバウンス中は追加の呼び出しが行われない
    assertEquals(detectWordsOptimized.calls.length, 1);

    time.tick(60);
    await Promise.resolve();

    assertEquals(detectWordsOptimized.calls.length, 1);
    assertEquals(generateHintsOptimized.calls.length, 1);
    assertEquals(assignHintsToWords.calls.length, 1);
    assertEquals(displayHintsAsync.calls.length, 1);
    assertEquals(operations.isHintsVisible(), true);
  } finally {
    time.restore();
  }
});

Deno.test("core/operations: hideHints は状態をリセットする", async () => {
  const { createHintOperations } = await import("../../denops/hellshake-yano/core/operations.ts");

  const denops = new MockDenops() as unknown as Denops;
  const config = createTestConfig();

  const detectWordsOptimized = spy(async () => [
    { text: "beta", line: 1, col: 1, byteCol: 1 },
  ]);
  const generateHintsOptimized = spy(() => ["B"]);
  const assignedHints = [
    {
      word: { text: "beta", line: 1, col: 1, byteCol: 1 },
      hint: "B",
      hintCol: 1,
      hintByteCol: 1,
    },
  ];
  const assignHintsToWords = spy(() => assignedHints);
  const displayHintsAsync = spy(() => {});
  const hideHints = spy(async () => {});
  const recordPerformance = spy(() => {});
  const clearHintCache = spy(() => {});

  const operations = createHintOperations({
    denops,
    config,
    dependencies: {
      detectWordsOptimized,
      generateHintsOptimized,
      assignHintsToWords,
      displayHintsAsync,
      hideHints,
      recordPerformance,
      clearHintCache,
    },
  });

  await operations.showHintsImmediately();
  assertEquals(operations.isHintsVisible(), true);
  assertEquals(operations.getCurrentHints(), assignedHints);

  await operations.hideHints();

  assertEquals(hideHints.calls.length, 1);
  assertEquals(operations.isHintsVisible(), false);
  assertEquals(operations.getCurrentHints().length, 0);
});
