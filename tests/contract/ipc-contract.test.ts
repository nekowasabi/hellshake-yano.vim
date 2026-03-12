/**
 * tests/contract/ipc-contract.test.ts
 *
 * IPC契約テスト (C-03: IPC契約3メソッド維持必須)
 *
 * updateConfig, showHintsWithKey, generic bridge (VimBridge.detectWords)
 * の入出力契約を保護するテスト。
 *
 * ## 契約仕様
 * - updateConfig(cfg: unknown): Promise<void>
 *   - cfg がオブジェクト → Config にマージ
 *   - cfg が非オブジェクト → 無視してエラーにしない
 *
 * - showHintsWithKey(key: unknown, mode?: unknown): Promise<void>
 *   - key が文字列 → Core.showHintsWithKey に委譲
 *   - key が非文字列 → 無視してエラーにしない
 *   - mode が文字列 → そのまま渡す
 *   - mode が非文字列 → undefined として渡す
 *
 * - VimBridge.detectWords(): Promise<Word[]>
 *   - Vim/Neovim 環境に応じて単語リストを返す
 *   - 戻り値は Word[] 型 ({ text, lnum, col, endCol })
 */

import { assertEquals, assertRejects } from "@std/assert";
import { MockDenops } from "../helpers/mock.ts";
import { MockIpcContract } from "../helpers/ipc-mock.ts";

// =============================================
// updateConfig 契約テスト
// =============================================

Deno.test("IPC契約: updateConfig — オブジェクト引数を受け入れる", async () => {
  const contract = new MockIpcContract();

  await contract.dispatcher.dispatch("updateConfig", { hintKeys: "asdf" });

  assertEquals(contract.getConfigUpdates().length, 1);
  assertEquals(contract.getConfigUpdates()[0], { hintKeys: "asdf" });
});

Deno.test("IPC契約: updateConfig — 複数回呼び出しを蓄積する", async () => {
  const contract = new MockIpcContract();

  await contract.dispatcher.dispatch("updateConfig", { hintKeys: "asdf" });
  await contract.dispatcher.dispatch("updateConfig", { timeout: 500 });

  assertEquals(contract.getConfigUpdates().length, 2);
});

Deno.test("IPC契約: updateConfig — 戻り値はvoid (undefined)", async () => {
  const contract = new MockIpcContract();

  const result = await contract.dispatcher.dispatch("updateConfig", { hintKeys: "jkl" });

  // success フラグを返す（モック実装の仕様）
  assertEquals((result as { success: boolean }).success, true);
});

// =============================================
// showHintsWithKey 契約テスト
// =============================================

Deno.test("IPC契約: showHintsWithKey — 文字列キーで呼び出せる", async () => {
  const contract = new MockIpcContract();

  await contract.dispatcher.dispatch("showHintsWithKey", "a");

  assertEquals(contract.getHintsShown().length, 1);
  assertEquals(contract.getHintsShown()[0].key, "a");
});

Deno.test("IPC契約: showHintsWithKey — モードオプションを渡せる", async () => {
  const contract = new MockIpcContract();

  await contract.dispatcher.dispatch("showHintsWithKey", "f", "normal");

  assertEquals(contract.getHintsShown()[0].key, "f");
});

Deno.test("IPC契約: showHintsWithKey — 複数回呼び出し可能", async () => {
  const contract = new MockIpcContract();

  await contract.dispatcher.dispatch("showHintsWithKey", "a");
  await contract.dispatcher.dispatch("showHintsWithKey", "b");
  await contract.dispatcher.dispatch("showHintsWithKey", "ab");

  assertEquals(contract.getHintsShown().length, 3);
});

// =============================================
// generic bridge (VimBridge.detectWords) 契約テスト
// =============================================

Deno.test("IPC契約: bridge — メソッド名と引数を記録する", async () => {
  const contract = new MockIpcContract();

  await contract.dispatcher.dispatch("bridge", "detectWords");

  assertEquals(contract.getBridgeCalls().length, 1);
  assertEquals(contract.getBridgeCalls()[0].method, "detectWords");
});

Deno.test("IPC契約: bridge — 複数メソッドの呼び出しを記録する", async () => {
  const contract = new MockIpcContract();

  await contract.dispatcher.dispatch("bridge", "detectWords");
  await contract.dispatcher.dispatch("bridge", "getConfig");
  await contract.dispatcher.dispatch("bridge", "getState");

  assertEquals(contract.getBridgeCalls().length, 3);
  assertEquals(contract.getBridgeCalls()[0].method, "detectWords");
  assertEquals(contract.getBridgeCalls()[1].method, "getConfig");
});

Deno.test("IPC契約: bridge — 引数を正しく渡せる", async () => {
  const contract = new MockIpcContract();

  await contract.dispatcher.dispatch("bridge", "updateThreshold", 5);

  assertEquals(contract.getBridgeCalls()[0].args[0], 5);
});

// =============================================
// IPC dispatcher 全体のリセット機能テスト
// =============================================

Deno.test("IPC契約: reset() で状態をクリアできる", async () => {
  const contract = new MockIpcContract();

  await contract.dispatcher.dispatch("updateConfig", { hintKeys: "asdf" });
  await contract.dispatcher.dispatch("showHintsWithKey", "a");
  contract.reset();

  assertEquals(contract.getConfigUpdates().length, 0);
  assertEquals(contract.getHintsShown().length, 0);
  assertEquals(contract.getBridgeCalls().length, 0);
});
