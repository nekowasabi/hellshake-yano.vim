/**
 * TDD Red-Green-Refactor: word/detector.ts Config使用のテスト
 *
 * This test verifies that word/detector.ts properly uses Config
 * instead of the legacy Config interface for consistent configuration management.
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { type Config, DEFAULT_CONFIG } from "../denops/hellshake-yano/config.ts";
import {
  RegexWordDetector,
  type WordDetectionConfig,
} from "../denops/hellshake-yano/neovim/core/word.ts";
import type { Word } from "../denops/hellshake-yano/types.ts";

// Mock Config for testing (flat structure as per actual Config interface)
const mockConfig: Config = {
  ...DEFAULT_CONFIG,
  // Core settings
  markers: ["A", "S", "D", "F"],

  // Hint settings
  highlightSelected: true,
  debugCoordinates: false,
  singleCharKeys: ["A", "S"],

  // Extended hint settings
  multiCharKeys: ["D", "F"],
  useHintGroups: false,
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

Deno.test("Red Phase: RegexWordDetector should use Config instead of Config", async () => {
  // This test should initially fail because RegexWordDetector still uses Config
  const config: WordDetectionConfig = {
    // These should map to Config properties (currently uses snake_case)
    useJapanese: mockConfig.useJapanese,
    defaultMinWordLength: mockConfig.defaultMinWordLength,
  };

  const detector = new RegexWordDetector(config, mockConfig);

  // Test that detector can access Config properties
  const words = await detector.detectWords("test word", 1, {
    currentKey: "f",
  });

  // Should be able to detect words with proper min length from Config
  assertExists(words);

  // This assertion will fail until detector.ts is updated to use Config
  const effectiveMinLength = mockConfig.perKeyMinLength?.["f"] || mockConfig.defaultMinWordLength;
  const validWords = words.filter((word: Word) => word.text.length >= effectiveMinLength);
  assertEquals(
    words.length,
    validWords.length,
    "All detected words should respect Config min length",
  );
});

Deno.test("Red Phase: TinySegmenterWordDetector should use Config instead of Config", async () => {
  const config: WordDetectionConfig = {
    useJapanese: mockConfig.useJapanese,
    enableTinySegmenter: mockConfig.enableTinySegmenter,
    segmenterThreshold: mockConfig.segmenterThreshold,
  };

  // TinySegmenterWordDetector was removed in v2 consolidation, using RegexWordDetector instead
  const detector = new RegexWordDetector(config, mockConfig);

  // Test Japanese text detection with Config settings
  const words = await detector.detectWords("これはテストです", 1, {
    currentKey: "t",
    minWordLength: mockConfig.perKeyMinLength?.["t"],
  });

  assertExists(words);

  // This will fail until TinySegmenterWordDetector uses Config properly
  const effectiveMinLength = mockConfig.perKeyMinLength?.["t"] || mockConfig.japaneseMinWordLength;
  const validWords = words.filter((word: Word) => word.text.length >= effectiveMinLength);
  assertEquals(words.length, validWords.length, "Japanese words should respect Config min length");
});

Deno.test("Red Phase: HybridWordDetector should use Config instead of Config", async () => {
  const config: WordDetectionConfig = {
    useJapanese: mockConfig.useJapanese,
    strategy: mockConfig.wordDetectionStrategy,
  };

  // HybridWordDetector was removed in v2 consolidation, using RegexWordDetector instead
  const detector = new RegexWordDetector(config, mockConfig);

  // Test hybrid detection with mixed content
  const words = await detector.detectWords("Hello こんにちは world", 1, {
    currentKey: "F",
    minWordLength: mockConfig.perKeyMinLength?.["F"],
  });

  assertExists(words);

  // This will fail until HybridWordDetector uses Config properly
  const effectiveMinLength = mockConfig.perKeyMinLength?.["F"] || mockConfig.defaultMinWordLength;
  const validWords = words.filter((word: Word) => word.text.length >= effectiveMinLength);
  assertEquals(
    words.length,
    validWords.length,
    "Hybrid detection should respect Config min length",
  );
});
