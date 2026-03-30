/**
 * tests/dispatcher_neovim_motion_test.ts
 *
 * Neovim dispatcher motion functions TDD tests
 * Process 3: motionDetect
 * Process 4: motionResetState, motionSetThreshold, motionSetTimeout, motionGetState
 *
 * Tests VimMotionDetector directly (same instance the dispatcher delegates to).
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  VimMotionDetector,
  type KeyRepeatConfig,
} from "../denops/hellshake-yano/vim/features/motion.ts";

// ---------------------------------------------------------------------------
// Process 3: motionDetect
// ---------------------------------------------------------------------------
Deno.test("P3: motionDetect - returns shouldShowHints:false below threshold", () => {
  // Why: Same constructor pattern as Vim layer (line 204-207 of main.ts)
  const detector = new VimMotionDetector(2000, 3);
  const keyRepeatConfig: KeyRepeatConfig = {
    enabled: false,
    threshold: 50,
    resetDelay: 300,
  };

  const result = detector.detectMotion("j", 1, keyRepeatConfig);
  assertEquals(result.shouldShowHints, false, "should not show hints on first press");
  assertEquals(result.newCount, 1, "count should be 1 after first press");
});

Deno.test("P3: motionDetect - returns shouldShowHints:true at threshold", () => {
  const detector = new VimMotionDetector(2000, 2);
  const keyRepeatConfig: KeyRepeatConfig = {
    enabled: false,
    threshold: 50,
    resetDelay: 300,
  };

  // First press
  detector.detectMotion("j", 1, keyRepeatConfig);
  // Second press - should hit threshold of 2
  const result = detector.detectMotion("j", 1, keyRepeatConfig);
  assertEquals(result.shouldShowHints, true, "should show hints at threshold");
  // Why: newCount is 0 (not 2) because motionCount resets after threshold
  // — matches VimScript fallback path (motion.vim:459-460)
  assertEquals(result.newCount, 0);
});

Deno.test("P3: motionDetect - numeric prefix (count > 1) resets and skips", () => {
  const detector = new VimMotionDetector(2000, 3);
  const keyRepeatConfig: KeyRepeatConfig = {
    enabled: false,
    threshold: 50,
    resetDelay: 300,
  };

  const result = detector.detectMotion("w", 5, keyRepeatConfig);
  assertEquals(result.shouldShowHints, false, "numeric prefix should not trigger");
  assertEquals(result.skipReason, "numeric_prefix");
  assertEquals(result.newCount, 0, "count should be reset");
});

Deno.test("P3: motionDetect - different motion keys reset count", () => {
  const detector = new VimMotionDetector(2000, 3);
  const keyRepeatConfig: KeyRepeatConfig = {
    enabled: false,
    threshold: 50,
    resetDelay: 300,
  };

  detector.detectMotion("j", 1, keyRepeatConfig);
  detector.detectMotion("j", 1, keyRepeatConfig);
  // Switch to different key - should reset
  const result = detector.detectMotion("k", 1, keyRepeatConfig);
  assertEquals(result.newCount, 1, "switching keys should reset count to 1");
  assertEquals(result.shouldShowHints, false);
});

Deno.test("P3: motionDetect - result shape matches dispatcher contract", () => {
  const detector = new VimMotionDetector(2000, 3);
  const keyRepeatConfig: KeyRepeatConfig = {
    enabled: false,
    threshold: 50,
    resetDelay: 300,
  };

  const result = detector.detectMotion("w", 1, keyRepeatConfig);

  // Verify the result shape matches what dispatcher returns
  assertExists(result, "result should exist");
  assertEquals(typeof result.shouldShowHints, "boolean");
  assertEquals(typeof result.newCount, "number");
  // skipReason is optional
  if (result.skipReason !== undefined) {
    assertEquals(typeof result.skipReason, "string");
  }
});

// ---------------------------------------------------------------------------
// Process 4: motionResetState
// ---------------------------------------------------------------------------
Deno.test("P4: motionResetState - resets count and lastMotion", () => {
  const detector = new VimMotionDetector(2000, 3);
  const keyRepeatConfig: KeyRepeatConfig = {
    enabled: false,
    threshold: 50,
    resetDelay: 300,
  };

  // Build up some state
  detector.detectMotion("j", 1, keyRepeatConfig);
  detector.detectMotion("j", 1, keyRepeatConfig);

  // Reset
  detector.resetState();
  const state = detector.getState();

  assertEquals(state.motionCount, 0, "motionCount should be 0 after reset");
  assertEquals(state.lastMotion, "", "lastMotion should be empty after reset");
  assertEquals(state.lastMotionTime, 0, "lastMotionTime should be 0 after reset");
});

// ---------------------------------------------------------------------------
// Process 4: motionSetThreshold
// ---------------------------------------------------------------------------
Deno.test("P4: motionSetThreshold - updates threshold", () => {
  const detector = new VimMotionDetector(2000, 3);

  detector.setThreshold(5);
  const state = detector.getState();
  assertEquals(state.threshold, 5, "threshold should be updated to 5");
});

Deno.test("P4: motionSetThreshold - affects detection behavior", () => {
  const detector = new VimMotionDetector(2000, 2);
  const keyRepeatConfig: KeyRepeatConfig = {
    enabled: false,
    threshold: 50,
    resetDelay: 300,
  };

  // Change threshold from 2 to 4
  detector.setThreshold(4);

  // Press 3 times - should NOT trigger (threshold is now 4)
  detector.detectMotion("j", 1, keyRepeatConfig);
  detector.detectMotion("j", 1, keyRepeatConfig);
  const result3 = detector.detectMotion("j", 1, keyRepeatConfig);
  assertEquals(result3.shouldShowHints, false, "should not trigger at 3 with threshold 4");

  // 4th press should trigger
  const result4 = detector.detectMotion("j", 1, keyRepeatConfig);
  assertEquals(result4.shouldShowHints, true, "should trigger at 4 with threshold 4");
});

// ---------------------------------------------------------------------------
// Process 4: motionSetTimeout
// ---------------------------------------------------------------------------
Deno.test("P4: motionSetTimeout - updates timeoutMs", () => {
  const detector = new VimMotionDetector(2000, 3);

  detector.setTimeout(5000);
  const state = detector.getState();
  assertEquals(state.timeoutMs, 5000, "timeoutMs should be updated to 5000");
});

// ---------------------------------------------------------------------------
// Process 4: motionGetState
// ---------------------------------------------------------------------------
Deno.test("P4: motionGetState - returns correct initial state shape", () => {
  const detector = new VimMotionDetector(2000, 3);
  const state = detector.getState();

  assertExists(state, "state should exist");
  assertEquals(typeof state.lastMotion, "string");
  assertEquals(typeof state.lastMotionTime, "number");
  assertEquals(typeof state.motionCount, "number");
  assertEquals(typeof state.timeoutMs, "number");
  assertEquals(typeof state.threshold, "number");

  // Initial values
  assertEquals(state.lastMotion, "");
  assertEquals(state.lastMotionTime, 0);
  assertEquals(state.motionCount, 0);
  assertEquals(state.timeoutMs, 2000);
  assertEquals(state.threshold, 3);
});

Deno.test("P4: motionGetState - returns copy (not reference)", () => {
  const detector = new VimMotionDetector(2000, 3);
  const state1 = detector.getState();
  const state2 = detector.getState();

  // Mutating state1 should not affect state2
  state1.motionCount = 999;
  assertEquals(state2.motionCount, 0, "getState should return a copy");
});
