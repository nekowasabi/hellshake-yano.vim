/**
 * tests/cleanup_plugin_test.ts
 *
 * Process 10: cleanupPlugin の performanceMetrics クリアテスト
 *
 * Why: pluginState.performanceMetrics に蓄積された配列が cleanupPlugin で
 *      クリアされないと、debug 経路で長時間セッションを回した際にリークする。
 *      Process 01 の実装に対する Red-Green-Refactor の Red Phase。
 */

import { assertEquals } from "@std/assert";
import { MockDenops } from "./helpers/mock.ts";
import { cleanupPlugin, getPluginState } from "../denops/hellshake-yano/neovim/core/core.ts";

Deno.test({
  name: "[REGRESSION] cleanupPlugin clears performanceMetrics",
  async fn() {
    const denops = new MockDenops();

    // セットアップ: performanceMetrics の 4 配列に値を push
    const state = getPluginState();
    state.performanceMetrics.showHints.push(1.5);
    state.performanceMetrics.hideHints.push(2.0);
    state.performanceMetrics.wordDetection.push(3.5);
    state.performanceMetrics.hintGeneration.push(0.8);

    // 事前確認: 4 配列すべてに 1 件ずつ存在
    assertEquals(state.performanceMetrics.showHints.length, 1);
    assertEquals(state.performanceMetrics.hideHints.length, 1);
    assertEquals(state.performanceMetrics.wordDetection.length, 1);
    assertEquals(state.performanceMetrics.hintGeneration.length, 1);

    // 実行: cleanupPlugin
    await cleanupPlugin(denops);

    // 検証: 4 配列すべての length が 0
    const after = getPluginState();
    assertEquals(after.performanceMetrics.showHints.length, 0);
    assertEquals(after.performanceMetrics.hideHints.length, 0);
    assertEquals(after.performanceMetrics.wordDetection.length, 0);
    assertEquals(after.performanceMetrics.hintGeneration.length, 0);
  },
});
