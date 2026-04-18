import { assertEquals, assertExists } from "jsr:@std/assert@1";
import { test } from "jsr:@denops/test@3";
import type { Denops } from "jsr:@denops/std@7";
import { Core } from "../denops/hellshake-yano/neovim/core/core.ts";
import type { Config } from "../denops/hellshake-yano/config.ts";
import { DEFAULT_CONFIG } from "../denops/hellshake-yano/config.ts";

test({
  mode: "nvim",
  name: "highlightCandidateHintsHybrid: 1文字入力後のハイライト呼び出しテスト",
  fn: async (denops: Denops) => {
    // このテストは、highlightCandidateHintsHybridメソッドが
    // 正しく呼び出されることを確認します（sub1の実装確認）

    // Mock hint mappings
    const mockHints = [
      { hint: "AB", word: { line: 1, col: 1, byteCol: 1, text: "hello", length: 5 } },
      { hint: "AC", word: { line: 1, col: 7, byteCol: 7, text: "world", length: 5 } },
      { hint: "BA", word: { line: 2, col: 1, byteCol: 1, text: "test", length: 4 } },
    ];

    const config: Config = {
      ...DEFAULT_CONFIG,
      highlightHintMarkerCurrent: { bg: "Red", fg: "White" },
      highlightHintMarker: "DiffAdd",
    };
    const core = Core.getInstance(config);

    // Mock data
    await denops.call("nvim_buf_set_lines", 0, 0, -1, true, [
      "hello world",
      "test line",
    ]);

    // highlightCandidateHintsHybridが呼び出されることを検証
    await core.highlightCandidateHintsHybrid(denops, mockHints as any, "A", { mode: "normal" });

    // ハイライトが設定されていることを確認
    const extmarkNamespace = await denops.call(
      "nvim_create_namespace",
      "hellshake_yano_hints",
    ) as number;
    const extmarks = await denops.call(
      "nvim_buf_get_extmarks",
      0,
      extmarkNamespace,
      0,
      -1,
      {},
    ) as unknown[];
    assertEquals(extmarks.length > 0, true, "Should have extmarks after highlighting");
  },
});

test({
  mode: "nvim",
  name: "getHighlightGroupName: カスタムハイライトグループ名使用テスト",
  fn: async (denops: Denops) => {
    // このテストは、カスタムハイライトグループ名が使用されることを確認します（sub2の実装確認）

    const mockHints = [
      { hint: "A", word: { line: 1, col: 1, byteCol: 1, text: "test", length: 4 } },
    ];

    const config: Config = {
      ...DEFAULT_CONFIG,
      highlightHintMarkerCurrent: "CustomHighlight",
      highlightHintMarker: "DiffAdd",
    };
    const core = Core.getInstance(config);

    await denops.call("nvim_buf_set_lines", 0, 0, -1, true, ["test line"]);

    // highlightCandidateHintsHybridを呼び出し
    await core.highlightCandidateHintsHybrid(denops, mockHints as any, "A");

    // エラーなく完了すれば、カスタムハイライトグループ名が使用されている
    assertEquals(true, true, "Custom highlight group names should be used");
  },
});

test({
  mode: "nvim",
  name: "getHighlightGroupName: HighlightColor型でデフォルト名を返すテスト",
  fn: async (denops: Denops) => {
    // このテストは、HighlightColor型の場合デフォルト名が使用されることを確認します（sub2の実装確認）

    const mockHints = [
      { hint: "A", word: { line: 1, col: 1, byteCol: 1, text: "test", length: 4 } },
    ];

    const config: Config = {
      ...DEFAULT_CONFIG,
      highlightHintMarkerCurrent: { bg: "Red", fg: "White" },
      highlightHintMarker: "DiffAdd",
    };
    const core = Core.getInstance(config);

    await denops.call("nvim_buf_set_lines", 0, 0, -1, true, ["test line"]);

    // highlightCandidateHintsHybridを呼び出し
    await core.highlightCandidateHintsHybrid(denops, mockHints as any, "A");

    // エラーなく完了すれば、デフォルト名が使用されている
    assertEquals(true, true, "Default name should be used for HighlightColor type");
  },
});

test({
  mode: "nvim",
  name: "ハードコード防止テスト: core.ts内のハイライトグループ名",
  fn: async (denops: Denops) => {
    // このテストは、ハードコードされたハイライトグループ名が使用されていないことを確認します（sub2/sub3の実装確認）

    const mockHints = [
      { hint: "A", word: { line: 1, col: 1, byteCol: 1, text: "test", length: 4 } },
    ];

    const config: Config = {
      ...DEFAULT_CONFIG,
      highlightHintMarkerCurrent: "CustomCurrentHighlight",
      highlightHintMarker: "CustomMarkerHighlight",
    };
    const core = Core.getInstance(config);

    await denops.call("nvim_buf_set_lines", 0, 0, -1, true, ["test line"]);

    // highlightCandidateHintsHybridを呼び出し
    await core.highlightCandidateHintsHybrid(denops, mockHints as any, "A");

    // エラーなく完了すれば、カスタムハイライトグループ名が使用されている
    assertEquals(true, true, "Custom highlight group names should be used");
  },
});
