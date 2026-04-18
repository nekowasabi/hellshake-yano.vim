/**
 * TDD Red-Green-Refactor: word/manager.ts Config使用のテスト
 *
 * This test verifies that word/manager.ts properly uses Config
 * instead of the legacy Config interface for consistent configuration management.
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { type Config, DEFAULT_CONFIG } from "../denops/hellshake-yano/config.ts";
import {
  getWordDetectionManager,
  WordDetectionManager,
  type WordDetectionManagerConfig,
} from "../denops/hellshake-yano/neovim/core/word.ts";
import type { Word } from "../denops/hellshake-yano/types.ts";

// Mock Config for testing (flat structure as per actual Config interface)
const mockConfig: Config = {
  ...DEFAULT_CONFIG,
  // Core settings
  markers: ["A", "S", "D", "F"],
  countedMotions: ["j", "k"],

  // Hint settings
  highlightSelected: true,
  debugCoordinates: false,
  singleCharKeys: ["A", "S"],
  useHintGroups: false,
  maxHints: 100,
  debounceDelay: 50,

  // Extended hint settings
  multiCharKeys: ["D", "F"],
  highlightHintMarker: { fg: "#FF0000", bg: "#FFFFFF" },

  // Word detection settings
  highlightHintMarkerCurrent: { fg: "#FFFF00", bg: "#FF0000" },
  suppressOnKeyRepeat: true,
  keyRepeatThreshold: 50,
  useJapanese: true,
  wordDetectionStrategy: "hybrid",
  enableTinySegmenter: true,
  segmenterThreshold: 4,

  // Japanese word settings
  japaneseMinWordLength: 2,
  japaneseMergeParticles: true,
  japaneseMergeThreshold: 2,
  perKeyMinLength: {
    "f": 2,
    "t": 1,
    "F": 3,
  },
  defaultMinWordLength: 3,
  defaultMotionCount: 3,

  // Debug settings
  debugMode: false,
  performanceLog: false,

  // Motion counter settings
  motionCounterEnabled: true,
  motionCounterThreshold: 3,
  motionCounterTimeout: 2000,
  showHintOnMotionThreshold: true,
};

Deno.test("Red Phase: WordDetectionManager should use Config instead of Config", async () => {
  // This test should initially fail because WordDetectionManager still uses Config
  const config: WordDetectionManagerConfig = {
    // These should map to Config properties (currently uses snake_case)
    useJapanese: mockConfig.useJapanese,
    defaultStrategy: mockConfig.wordDetectionStrategy,
    cacheEnabled: true,
    cacheMaxSize: 500,
  };

  const manager = new WordDetectionManager(config, mockConfig);
  await manager.initialize();

  // Test that manager can access Config properties
  const result = await manager.detectWords("test word", 1, undefined, {
    currentKey: "f",
    minWordLength: mockConfig.perKeyMinLength?.["f"],
  });

  // Should be able to detect words with proper min length from Config
  assertExists(result);
  assertExists(result.words);

  // This assertion will fail until manager.ts is updated to use Config
  const effectiveMinLength = mockConfig.perKeyMinLength?.["f"] || mockConfig.defaultMinWordLength;
  const validWords = result.words.filter((word: Word) => word.text.length >= effectiveMinLength);
  assertEquals(
    result.words.length,
    validWords.length,
    "All detected words should respect Config min length",
  );
});

Deno.test("Red Phase: getWordDetectionManager should use Config instead of Config", async () => {
  const config: WordDetectionManagerConfig = {
    useJapanese: mockConfig.useJapanese,
    defaultStrategy: mockConfig.wordDetectionStrategy,
    enableTinySegmenter: mockConfig.enableTinySegmenter,
  };

  // This should work with Config
  const manager = getWordDetectionManager(config, mockConfig);
  await manager.initialize();

  // Test Japanese text detection with Config settings
  const result = await manager.detectWords("これはテストです", 1, undefined, {
    currentKey: "t",
    minWordLength: mockConfig.perKeyMinLength?.["t"],
  });

  assertExists(result);
  assertExists(result.words);

  // This will fail until manager.ts uses Config properly
  const effectiveMinLength = mockConfig.perKeyMinLength?.["t"] || mockConfig.japaneseMinWordLength;
  const validWords = result.words.filter((word: Word) => word.text.length >= effectiveMinLength);
  assertEquals(
    result.words.length,
    validWords.length,
    "Japanese words should respect Config min length",
  );
});

Deno.test("Red Phase: WordDetectionManager should handle hybrid detection with Config", async () => {
  const config: WordDetectionManagerConfig = {
    useJapanese: mockConfig.useJapanese,
    defaultStrategy: "hybrid", // Force hybrid strategy
    enableTinySegmenter: mockConfig.enableTinySegmenter,
  };

  const manager = new WordDetectionManager(config, mockConfig);
  await manager.initialize();

  // Test hybrid detection with mixed content
  const result = await manager.detectWords("Hello こんにちは world", 1, undefined, {
    currentKey: "F",
    minWordLength: mockConfig.perKeyMinLength?.["F"],
  });

  assertExists(result);
  assertExists(result.words);

  // This will fail until manager.ts uses Config properly
  const effectiveMinLength = mockConfig.perKeyMinLength?.["F"] || mockConfig.defaultMinWordLength;
  const validWords = result.words.filter((word: Word) => word.text.length >= effectiveMinLength);
  assertEquals(
    result.words.length,
    validWords.length,
    "Hybrid detection should respect Config min length",
  );
});
