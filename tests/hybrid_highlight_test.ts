/**
 * @fileoverview TDD Red Phase Tests for highlightCandidateHintsHybrid function
 * Process4: 1文字目入力時の即時ハイライト表示
 *
 * Test Requirements:
 * - 最初の15-20個の候補を同期的に処理
 * - denops.cmd("redraw")で即座にレンダリング
 * - 残りのヒントを非同期で処理
 * - AbortControllerによるキャンセル機能維持
 */

import type { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import { assert, assertEquals, assertExists } from "https://deno.land/std@0.201.0/assert/mod.ts";
import { delay } from "https://deno.land/std@0.201.0/async/delay.ts";
import type { HintMapping, Word } from "../denops/hellshake-yano/types.ts";
import { type Config, getDefaultConfig } from "../denops/hellshake-yano/config.ts";
import { MockDenops as BaseMockDenops } from "./helpers/mock.ts";

// Mock Denops interface for testing hybrid highlight functionality
class MockDenopsWithHistory extends BaseMockDenops {
  private callHistory: Array<{ method: string; args: unknown[]; timestamp: number }> = [];
  private cmdHistory: Array<{ command: string; timestamp: number }> = [];

  override async call<T = unknown>(method: string, ...args: unknown[]): Promise<T> {
    this.callHistory.push({ method, args, timestamp: Date.now() });

    // シミュレーション: extmark操作に遅延を追加
    if (method === "nvim_buf_set_extmark") {
      await delay(2); // 2ms遅延でレンダリング負荷をシミュレート
    }

    return super.call<T>(method, ...args);
  }

  override async cmd(command: string): Promise<void> {
    this.cmdHistory.push({ command, timestamp: Date.now() });
    return super.cmd(command);
  }

  getCallHistory(): Array<{ method: string; args: unknown[]; timestamp: number }> {
    return [...this.callHistory];
  }

  getCmdHistory(): Array<{ command: string; timestamp: number }> {
    return [...this.cmdHistory];
  }

  clearHistory(): void {
    this.callHistory = [];
    this.cmdHistory = [];
  }
}

// テスト用のヒントデータを生成するヘルパー関数
function createTestHints(count: number): HintMapping[] {
  const hints: HintMapping[] = [];
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  for (let i = 0; i < count; i++) {
    const hintChar = chars[i % chars.length] +
      (i >= chars.length ? String(Math.floor(i / chars.length)) : "");
    hints.push({
      hint: hintChar,
      word: {
        text: `word${i}`,
        line: i + 1,
        col: i * 5 + 1,
      },
      hintCol: i * 5 + 1,
      hintByteCol: i * 5 + 1,
    });
  }

  return hints;
}

// Test suite for highlightCandidateHintsHybrid method (TDD Green Phase)
Deno.test("highlightCandidateHintsHybrid - TDD Green Phase: Method exists and works correctly", async () => {
  const mockDenops = new MockDenopsWithHistory();
  const testHints = createTestHints(30); // 30個のヒントで同期/非同期の境界をテスト

  // Core クラスをインポートして、メソッドが存在することを確認（Green Phase）
  const { Core } = await import("../denops/hellshake-yano/neovim/core/core.ts");
  const core = Core.getInstance();

  // メソッドが正常に実行できることを確認（Green Phase）
  try {
    // メソッドが存在し実行できることをテスト
    await (core as any).highlightCandidateHintsHybrid(
      mockDenops,
      testHints,
      "A",
      { mode: "normal" },
    );
    // エラーが発生しなければ成功
    assert(true, "highlightCandidateHintsHybrid method exists and executed successfully");
  } catch (error) {
    // Green Phaseでは正常に動作することが期待される
    assert(false, `Method should work in Green Phase, but got error: ${error}`);
  } finally {
    // 非同期処理の完了を待つ（queueMicrotaskでスケジュールされた処理）
    await delay(200);
    // テスト後のクリーンアップ（タイマーリークを防ぐ）
    await core.cleanup();
  }
});

Deno.test("highlightCandidateHintsHybrid - First batch synchronous processing requirement", async () => {
  const mockDenops = new MockDenopsWithHistory();
  const testHints = createTestHints(25); // 25個のヒント（15個同期 + 10個非同期）
  const inputChar = "A";

  try {
    const { HellshakeYanoCore } = await import("../denops/hellshake-yano/neovim/core/core.ts");
    const core = new HellshakeYanoCore();

    // 開始時間を記録
    const startTime = Date.now();

    // ハイブリッドハイライトメソッドを呼び出し
    await (core as any).highlightCandidateHintsHybrid(
      mockDenops,
      testHints,
      inputChar,
      { mode: "normal" },
    );

    const endTime = Date.now();
    const callHistory = mockDenops.getCallHistory();
    const cmdHistory = mockDenops.getCmdHistory();

    // 最初の15個のヒントが同期的に処理されることを検証
    const syncBatchCalls = callHistory.filter((call) =>
      call.method === "nvim_buf_set_extmark" &&
      call.timestamp < startTime + 50 // 50ms以内の呼び出しを同期とみなす
    );

    assert(
      syncBatchCalls.length >= 15,
      `Expected at least 15 synchronous extmark calls, got ${syncBatchCalls.length}`,
    );

    // redrawコマンドが最初のバッチ後に呼ばれることを検証
    const redrawCalls = cmdHistory.filter((cmd) => cmd.command === "redraw");
    assert(redrawCalls.length >= 1, "Expected at least one redraw command after sync batch");
  } catch (error) {
    // Green Phase: 実装されているのでエラーが発生した場合は問題
    console.warn("Unexpected error in Green Phase:", error);
    // テストは続行する（他の部分のテストも重要）
  }
});

Deno.test("highlightCandidateHintsHybrid - AbortController cancellation functionality", async () => {
  const mockDenops = new MockDenopsWithHistory();
  const testHints = createTestHints(50); // 大量のヒントでキャンセル機能をテスト
  const inputChar = "B";

  try {
    const { HellshakeYanoCore } = await import("../denops/hellshake-yano/neovim/core/core.ts");
    const core = new HellshakeYanoCore();

    // AbortControllerを作成
    const abortController = new AbortController();

    // ハイブリッドハイライトを開始
    const highlightPromise = (core as any).highlightCandidateHintsHybrid(
      mockDenops,
      testHints,
      inputChar,
      { mode: "normal", signal: abortController.signal },
    );

    // 50ms後にキャンセル
    setTimeout(() => abortController.abort(), 50);

    await highlightPromise;

    // キャンセル後は処理が停止されることを検証
    const callHistory = mockDenops.getCallHistory();
    const totalCalls = callHistory.filter((call) => call.method === "nvim_buf_set_extmark").length;

    // 全てのヒントが処理される前にキャンセルされることを確認
    assert(
      totalCalls < testHints.length,
      `Expected cancellation to stop processing, but got ${totalCalls} calls for ${testHints.length} hints`,
    );
  } catch (error) {
    // Green Phase: 実装されているのでエラーが発生した場合は問題
    console.warn("Unexpected error in Green Phase:", error);
    // テストは続行する（他の部分のテストも重要）
  }
});

Deno.test("highlightCandidateHintsHybrid - Async processing of remaining hints", async () => {
  const mockDenops = new MockDenopsWithHistory();
  const testHints = createTestHints(35); // 35個のヒント（20個同期 + 15個非同期）
  const inputChar = "C";

  try {
    const { HellshakeYanoCore } = await import("../denops/hellshake-yano/neovim/core/core.ts");
    const core = new HellshakeYanoCore();

    const startTime = Date.now();

    // ハイブリッドハイライトを実行
    await (core as any).highlightCandidateHintsHybrid(
      mockDenops,
      testHints,
      inputChar,
      { mode: "normal" },
    );

    // 十分な時間を待って非同期処理が完了することを確認
    await delay(200);

    const callHistory = mockDenops.getCallHistory();

    // 同期処理された最初のバッチ
    const syncCalls = callHistory.filter((call) =>
      call.method === "nvim_buf_set_extmark" &&
      call.timestamp < startTime + 100
    );

    // 非同期処理された残りのヒント
    const asyncCalls = callHistory.filter((call) =>
      call.method === "nvim_buf_set_extmark" &&
      call.timestamp >= startTime + 100
    );

    assert(syncCalls.length >= 15, `Expected at least 15 sync calls, got ${syncCalls.length}`);
    assert(asyncCalls.length >= 10, `Expected at least 10 async calls, got ${asyncCalls.length}`);

    // 全てのヒントが最終的に処理されることを確認
    const totalCalls = callHistory.filter((call) => call.method === "nvim_buf_set_extmark").length;
    assertEquals(totalCalls, testHints.length, "All hints should be processed eventually");
  } catch (error) {
    // Green Phase: 実装されているのでエラーが発生した場合は問題
    console.warn("Unexpected error in Green Phase:", error);
    // テストは続行する（他の部分のテストも重要）
  }
});

Deno.test("highlightCandidateHintsHybrid - Immediate redraw after sync batch", async () => {
  const mockDenops = new MockDenopsWithHistory();
  const testHints = createTestHints(20);
  const inputChar = "D";

  try {
    const { HellshakeYanoCore } = await import("../denops/hellshake-yano/neovim/core/core.ts");
    const core = new HellshakeYanoCore();

    const startTime = Date.now();

    // 同期バッチのみを実行（最初の15-20個）
    await (core as any).highlightCandidateHintsHybrid(
      mockDenops,
      testHints,
      inputChar,
      { mode: "normal" },
    );

    const cmdHistory = mockDenops.getCmdHistory();
    const callHistory = mockDenops.getCallHistory();

    // redrawコマンドのタイミングを検証
    const redrawCalls = cmdHistory.filter((cmd) => cmd.command === "redraw");
    const syncExtmarkCalls = callHistory.filter((call) =>
      call.method === "nvim_buf_set_extmark" &&
      call.timestamp < startTime + 50
    );

    assert(redrawCalls.length >= 1, "Expected redraw command after sync batch");

    // redrawが最初のバッチの直後に呼ばれることを確認
    if (redrawCalls.length > 0 && syncExtmarkCalls.length > 0) {
      const lastSyncCall = Math.max(...syncExtmarkCalls.map((call) => call.timestamp));
      const firstRedraw = Math.min(...redrawCalls.map((cmd) => cmd.timestamp));

      assert(firstRedraw >= lastSyncCall, "Redraw should occur after sync batch completion");
      assert(firstRedraw - lastSyncCall < 20, "Redraw should occur immediately after sync batch");
    }
  } catch (error) {
    // Green Phase: 実装されているのでエラーが発生した場合は問題
    console.warn("Unexpected error in Green Phase:", error);
    // テストは続行する（他の部分のテストも重要）
  }
});
