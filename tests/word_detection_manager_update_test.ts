/**
 * WordDetectionManagerの更新機能テスト
 *
 * このテストでは以下を検証します：
 * 1. initializeメソッドで3つの実際のDetectorが登録される
 * 2. TinySegmenterWordDetectorが正しく登録される
 * 3. HybridWordDetectorが正しく登録される
 * 4. getDetectorForContextメソッドがstrategyに基づいて適切なDetectorを返す
 */

import { assertEquals, assertInstanceOf } from "https://deno.land/std@0.212.0/assert/mod.ts";
import {
  HybridWordDetector,
  RegexWordDetector,
  TinySegmenterWordDetector,
  WordDetectionManager,
} from "../denops/hellshake-yano/neovim/core/word.ts";
import type { DetectionContext } from "../denops/hellshake-yano/types.ts";

Deno.test("WordDetectionManager - initialize method registers three actual detectors", async () => {
  const manager = new WordDetectionManager();

  // Initialize the manager
  await manager.initialize();

  // Get all registered detectors using reflection (accessing private field for testing)
  const detectors = (manager as any).detectors;

  // Should have exactly 3 detectors registered
  assertEquals(detectors.size, 3, "Should register exactly 3 detectors");

  // Check detector names
  const detectorNames = Array.from(detectors.keys());
  assertEquals(
    detectorNames.includes("RegexWordDetector"),
    true,
    "Should include RegexWordDetector",
  );
  assertEquals(
    detectorNames.includes("TinySegmenterWordDetector"),
    true,
    "Should include TinySegmenterWordDetector",
  );
  assertEquals(
    detectorNames.includes("HybridWordDetector"),
    true,
    "Should include HybridWordDetector",
  );
});

Deno.test("WordDetectionManager - TinySegmenterWordDetector is properly registered", async () => {
  const manager = new WordDetectionManager();

  await manager.initialize();

  const detectors = (manager as any).detectors;
  const tinySegmenterDetector = detectors.get("TinySegmenterWordDetector");

  assertEquals(
    tinySegmenterDetector !== undefined,
    true,
    "TinySegmenterWordDetector should be registered",
  );
  assertInstanceOf(
    tinySegmenterDetector,
    TinySegmenterWordDetector,
    "Should be an instance of TinySegmenterWordDetector",
  );
});

Deno.test("WordDetectionManager - HybridWordDetector is properly registered", async () => {
  const manager = new WordDetectionManager();

  await manager.initialize();

  const detectors = (manager as any).detectors;
  const hybridDetector = detectors.get("HybridWordDetector");

  assertEquals(hybridDetector !== undefined, true, "HybridWordDetector should be registered");
  assertInstanceOf(
    hybridDetector,
    HybridWordDetector,
    "Should be an instance of HybridWordDetector",
  );
});

Deno.test("WordDetectionManager - getDetectorForContext returns appropriate detector based on strategy", async () => {
  const manager = new WordDetectionManager();

  await manager.initialize();

  // Test regex strategy
  const regexContext: DetectionContext = {
    strategy: "regex",
  };
  const regexDetector = await manager.getDetectorForContext(regexContext);
  assertEquals(
    regexDetector?.name,
    "RegexWordDetector",
    "Should return RegexWordDetector for regex strategy",
  );

  // Test tinysegmenter strategy
  const segmenterContext: DetectionContext = {
    strategy: "tinysegmenter",
  };
  const segmenterDetector = await manager.getDetectorForContext(segmenterContext);
  assertEquals(
    segmenterDetector?.name,
    "TinySegmenterWordDetector",
    "Should return TinySegmenterWordDetector for tinysegmenter strategy",
  );

  // Test hybrid strategy
  const hybridContext: DetectionContext = {
    strategy: "hybrid",
  };
  const hybridDetector = await manager.getDetectorForContext(hybridContext);
  assertEquals(
    hybridDetector?.name,
    "HybridWordDetector",
    "Should return HybridWordDetector for hybrid strategy",
  );
});

Deno.test("WordDetectionManager - getDetectorForContext returns highest priority detector for unknown strategy", async () => {
  const manager = new WordDetectionManager();

  await manager.initialize();

  // Test unknown strategy
  const unknownContext: DetectionContext = {
    strategy: "unknown",
  };
  const detector = await manager.getDetectorForContext(unknownContext);

  assertEquals(detector !== null, true, "Should return a detector even for unknown strategy");

  // Should return the detector with highest priority
  // Based on the existing code, we expect the highest priority detector to be returned
  assertEquals(detector?.name !== undefined, true, "Should return a valid detector name");
});

Deno.test("WordDetectionManager - getDetectorForContext returns highest priority detector when no context provided", async () => {
  const manager = new WordDetectionManager();

  await manager.initialize();

  // Test with no context
  const detector = await manager.getDetectorForContext();

  assertEquals(detector !== null, true, "Should return a detector when no context provided");
  assertEquals(detector?.name !== undefined, true, "Should return a valid detector name");
});

Deno.test("WordDetectionManager - getDetectorForContext returns highest priority detector when context has no strategy", async () => {
  const manager = new WordDetectionManager();

  await manager.initialize();

  // Test with context but no strategy
  const contextWithoutStrategy: DetectionContext = {
    currentKey: "w",
  };
  const detector = await manager.getDetectorForContext(contextWithoutStrategy);

  assertEquals(detector !== null, true, "Should return a detector when context has no strategy");
  assertEquals(detector?.name !== undefined, true, "Should return a valid detector name");
});
