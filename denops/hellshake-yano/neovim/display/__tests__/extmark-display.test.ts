/**
 * extmark-display.test.ts - Extmark Display Tests
 *
 * TDD: LazyGit バッファ切り替え時の画面乱れ問題修正
 *
 * 根本原因:
 * - clearHintDisplay() が 0（カレントバッファ）のみをクリア
 * - LazyGit terminal → 通常バッファ切り替え中にクリア対象が不一致
 *
 * 解決策:
 * - 単一バッファでも extmark 作成時にバッファ番号を追跡
 * - clearHintDisplay を修正して追跡されたバッファ全てをクリア
 * - バッファ有効性チェックを追加
 */

import { assertEquals, assertExists } from "jsr:@std/assert@^1.0.0";
import { beforeEach, describe, it } from "jsr:@std/testing@^1.0.0/bdd";
import {
  clearHintDisplayTracked,
  clearSingleBufferExtmarkState,
  getMultiBufferExtmarkState,
  getSingleBufferExtmarkState,
} from "../extmark-display.ts";

/**
 * Test Group 1: Single Buffer Extmark Tracking Functions Exist
 */
describe("Single Buffer Extmark Tracking - Function Existence", () => {
  it("should export getSingleBufferExtmarkState function", () => {
    assertExists(getSingleBufferExtmarkState, "getSingleBufferExtmarkState should be exported");
    assertEquals(typeof getSingleBufferExtmarkState, "function");
  });

  it("should export clearSingleBufferExtmarkState function", () => {
    assertExists(clearSingleBufferExtmarkState, "clearSingleBufferExtmarkState should be exported");
    assertEquals(typeof clearSingleBufferExtmarkState, "function");
  });

  it("should export clearHintDisplayTracked function", () => {
    assertExists(clearHintDisplayTracked, "clearHintDisplayTracked should be exported");
    assertEquals(typeof clearHintDisplayTracked, "function");
  });

  it("should export getMultiBufferExtmarkState function", () => {
    assertExists(getMultiBufferExtmarkState, "getMultiBufferExtmarkState should be exported");
    assertEquals(typeof getMultiBufferExtmarkState, "function");
  });
});

/**
 * Test Group 2: Single Buffer Tracking State Management
 */
describe("Single Buffer Tracking State Management", () => {
  beforeEach(() => {
    // Reset state before each test
    clearSingleBufferExtmarkState();
  });

  it("should return null when no buffer is tracked", () => {
    const state = getSingleBufferExtmarkState();
    assertEquals(state, null, "Initial state should be null");
  });

  it("should clear tracking state when clearSingleBufferExtmarkState is called", () => {
    // Note: We can't directly set the tracking state from tests,
    // but we can verify the clear function works
    clearSingleBufferExtmarkState();
    const state = getSingleBufferExtmarkState();
    assertEquals(state, null, "State should be null after clearing");
  });
});

/**
 * Test Group 3: Multi-Buffer Tracking State
 */
describe("Multi-Buffer Tracking State", () => {
  it("should return a Set from getMultiBufferExtmarkState", () => {
    const state = getMultiBufferExtmarkState();
    assertExists(state, "State should exist");
    assertEquals(state instanceof Set, true, "State should be a Set");
  });
});

/**
 * Test Group 4: Integration Verification
 *
 * These tests verify the structure is correct for the LazyGit fix.
 * Full integration tests require actual Neovim instance.
 */
describe("Integration Structure Verification", () => {
  it("should have consistent API between single and multi-buffer modes", () => {
    // Both functions should exist and return appropriate types
    const singleState = getSingleBufferExtmarkState();
    const multiState = getMultiBufferExtmarkState();

    // Single buffer state is a number or null
    assertEquals(
      singleState === null || typeof singleState === "number",
      true,
      "Single buffer state should be number or null",
    );

    // Multi buffer state is a Set (tracks buffer numbers only)
    assertEquals(multiState instanceof Set, true, "Multi buffer state should be a Set");
  });

  it("should allow clearing state without errors", () => {
    // This verifies the cleanup functions don't throw
    let error: Error | null = null;
    try {
      clearSingleBufferExtmarkState();
    } catch (e) {
      error = e as Error;
    }
    assertEquals(error, null, "clearSingleBufferExtmarkState should not throw");
  });
});
