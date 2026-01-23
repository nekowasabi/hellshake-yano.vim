/**
 * window_test.ts - マルチウィンドウ機能のテスト
 *
 * Phase D-7 Process5: マルチウィンドウサポート
 */
import {
  assertEquals,
  assertArrayIncludes,
} from "jsr:@std/assert@^1.0.0";
import { describe, it } from "jsr:@std/testing@^1.0.0/bdd";
import type { Denops } from "jsr:@denops/std@^7.4.0";
import type { Config, WindowInfo } from "../../types.ts";
import {
  shouldUseMultiWindowMode,
  getVisibleWindows,
  getWindowVisibleLines,
  isValidBuffer,
} from "./window.ts";

// モックDenops作成ヘルパー
function createMockDenops(callResponses: Record<string, unknown>): Denops {
  return {
    name: "test",
    meta: { host: "test", mode: "debug", version: "0.0.0" },
    context: {},
    dispatcher: {},
    call: async (fn: string, ...args: unknown[]) => {
      const key = `${fn}:${JSON.stringify(args)}`;
      if (key in callResponses) {
        return callResponses[key];
      }
      // デフォルトレスポンス
      if (fn === "nvim_list_wins") return [];
      if (fn === "nvim_get_current_win") return 1000;
      if (fn === "getwininfo") return [];
      if (fn === "win_getid") return 1000;
      if (fn === "bufexists") return 0;  // デフォルトは存在しない
      throw new Error(`Unexpected call: ${fn}(${JSON.stringify(args)})`);
    },
    batch: async () => [],
    cmd: async () => {},
    eval: async () => undefined,
    dispatch: async () => undefined,
    redraw: async () => {},
  } as unknown as Denops;
}

// デフォルト設定
const defaultConfig: Config = {
  multiWindowMode: true,
  multiWindowExcludeTypes: ["help", "quickfix", "terminal"],
  multiWindowMaxWindows: 10,
} as Config;

describe("shouldUseMultiWindowMode", () => {
  it("should return false when multiWindowMode is disabled", async () => {
    const denops = createMockDenops({});
    const config = { ...defaultConfig, multiWindowMode: false };

    const result = await shouldUseMultiWindowMode(denops, config as Config);

    assertEquals(result, false);
  });

  it("should return false when only one window exists", async () => {
    const denops = createMockDenops({
      "nvim_list_wins:[]": [1000],
      "nvim_get_current_win:[]": 1000,
      'nvim_win_get_buf:[1000]': 1,
      'nvim_get_option_value:["buftype",{"buf":1}]': "",
      "nvim_win_get_width:[1000]": 80,
      "nvim_win_get_height:[1000]": 24,
      'nvim_win_call:[1000,"line(\'w0\')"]': 1,
      'nvim_win_call:[1000,"line(\'w$\')"]': 24,
    });

    const result = await shouldUseMultiWindowMode(denops, defaultConfig as Config);

    assertEquals(result, false);
  });

  it("should return true when multiple editable windows exist", async () => {
    const denops = createMockDenops({
      "nvim_list_wins:[]": [1000, 1001],
      "nvim_get_current_win:[]": 1000,
      'nvim_win_get_buf:[1000]': 1,
      'nvim_win_get_buf:[1001]': 2,
      'nvim_get_option_value:["buftype",{"buf":1}]': "",
      'nvim_get_option_value:["buftype",{"buf":2}]': "",
      "nvim_win_get_width:[1000]": 80,
      "nvim_win_get_width:[1001]": 80,
      "nvim_win_get_height:[1000]": 24,
      "nvim_win_get_height:[1001]": 24,
      'nvim_win_call:[1000,"line(\'w0\')"]': 1,
      'nvim_win_call:[1000,"line(\'w$\')"]': 24,
      'nvim_win_call:[1001,"line(\'w0\')"]': 1,
      'nvim_win_call:[1001,"line(\'w$\')"]': 24,
    });

    const result = await shouldUseMultiWindowMode(denops, defaultConfig as Config);

    assertEquals(result, true);
  });

  it("should exclude windows with excluded buffer types", async () => {
    const denops = createMockDenops({
      "nvim_list_wins:[]": [1000, 1001],
      "nvim_get_current_win:[]": 1000,
      'nvim_win_get_buf:[1000]': 1,
      'nvim_win_get_buf:[1001]': 2,
      'nvim_get_option_value:["buftype",{"buf":1}]': "",
      'nvim_get_option_value:["buftype",{"buf":2}]': "help", // 除外対象
      "nvim_win_get_width:[1000]": 80,
      "nvim_win_get_height:[1000]": 24,
      'nvim_win_call:[1000,"line(\'w0\')"]': 1,
      'nvim_win_call:[1000,"line(\'w$\')"]': 24,
    });

    const result = await shouldUseMultiWindowMode(denops, defaultConfig as Config);

    assertEquals(result, false); // helpは除外されるので1ウィンドウ扱い
  });
});

describe("getVisibleWindows", () => {
  it("should return empty array when no windows", async () => {
    const denops = createMockDenops({
      "nvim_list_wins:[]": [],
      "nvim_get_current_win:[]": 0,
    });

    const result = await getVisibleWindows(denops, defaultConfig as Config);

    assertEquals(result, []);
  });

  it("should return WindowInfo with correct properties", async () => {
    const denops = createMockDenops({
      "nvim_list_wins:[]": [1000],
      "nvim_get_current_win:[]": 1000,
      'nvim_win_get_buf:[1000]': 1,
      'nvim_get_option_value:["buftype",{"buf":1}]': "",
      "nvim_win_get_width:[1000]": 80,
      "nvim_win_get_height:[1000]": 24,
      'nvim_win_call:[1000,"line(\'w0\')"]': 1,
      'nvim_win_call:[1000,"line(\'w$\')"]': 50,
    });

    const result = await getVisibleWindows(denops, defaultConfig as Config);

    assertEquals(result.length, 1);
    assertEquals(result[0].winid, 1000);
    assertEquals(result[0].bufnr, 1);
    assertEquals(result[0].width, 80);
    assertEquals(result[0].height, 24);
    assertEquals(result[0].topline, 1);
    assertEquals(result[0].botline, 50);
    assertEquals(result[0].isCurrent, true);
  });

  it("should skip windows with excluded buffer types", async () => {
    const denops = createMockDenops({
      "nvim_list_wins:[]": [1000, 1001, 1002],
      "nvim_get_current_win:[]": 1000,
      'nvim_win_get_buf:[1000]': 1,
      'nvim_win_get_buf:[1001]': 2,
      'nvim_win_get_buf:[1002]': 3,
      'nvim_get_option_value:["buftype",{"buf":1}]': "",
      'nvim_get_option_value:["buftype",{"buf":2}]': "quickfix", // 除外
      'nvim_get_option_value:["buftype",{"buf":3}]': "",
      "nvim_win_get_width:[1000]": 80,
      "nvim_win_get_width:[1002]": 80,
      "nvim_win_get_height:[1000]": 24,
      "nvim_win_get_height:[1002]": 24,
      'nvim_win_call:[1000,"line(\'w0\')"]': 1,
      'nvim_win_call:[1000,"line(\'w$\')"]': 24,
      'nvim_win_call:[1002,"line(\'w0\')"]': 1,
      'nvim_win_call:[1002,"line(\'w$\')"]': 24,
    });

    const result = await getVisibleWindows(denops, defaultConfig as Config);

    assertEquals(result.length, 2);
    assertEquals(result[0].winid, 1000);
    assertEquals(result[1].winid, 1002);
  });

  it("should respect maxWindows limit", async () => {
    const denops = createMockDenops({
      "nvim_list_wins:[]": [1000, 1001, 1002],
      "nvim_get_current_win:[]": 1000,
      'nvim_win_get_buf:[1000]': 1,
      'nvim_win_get_buf:[1001]': 2,
      'nvim_win_get_buf:[1002]': 3,
      'nvim_get_option_value:["buftype",{"buf":1}]': "",
      'nvim_get_option_value:["buftype",{"buf":2}]': "",
      'nvim_get_option_value:["buftype",{"buf":3}]': "",
      "nvim_win_get_width:[1000]": 80,
      "nvim_win_get_width:[1001]": 80,
      "nvim_win_get_height:[1000]": 24,
      "nvim_win_get_height:[1001]": 24,
      'nvim_win_call:[1000,"line(\'w0\')"]': 1,
      'nvim_win_call:[1000,"line(\'w$\')"]': 24,
      'nvim_win_call:[1001,"line(\'w0\')"]': 1,
      'nvim_win_call:[1001,"line(\'w$\')"]': 24,
    });
    const config = { ...defaultConfig, multiWindowMaxWindows: 2 };

    const result = await getVisibleWindows(denops, config as Config);

    assertEquals(result.length, 2);
  });

  it("should set isCurrent correctly for non-current windows", async () => {
    const denops = createMockDenops({
      "nvim_list_wins:[]": [1000, 1001],
      "nvim_get_current_win:[]": 1001, // 1001がカレント
      'nvim_win_get_buf:[1000]': 1,
      'nvim_win_get_buf:[1001]': 2,
      'nvim_get_option_value:["buftype",{"buf":1}]': "",
      'nvim_get_option_value:["buftype",{"buf":2}]': "",
      "nvim_win_get_width:[1000]": 80,
      "nvim_win_get_width:[1001]": 80,
      "nvim_win_get_height:[1000]": 24,
      "nvim_win_get_height:[1001]": 24,
      'nvim_win_call:[1000,"line(\'w0\')"]': 1,
      'nvim_win_call:[1000,"line(\'w$\')"]': 24,
      'nvim_win_call:[1001,"line(\'w0\')"]': 1,
      'nvim_win_call:[1001,"line(\'w$\')"]': 24,
    });

    const result = await getVisibleWindows(denops, defaultConfig as Config);

    assertEquals(result[0].isCurrent, false);
    assertEquals(result[1].isCurrent, true);
  });
});

// =============================================================================
// isValidBuffer テスト - Phase D-7: Race Condition 対策
// =============================================================================
describe("isValidBuffer", () => {
  it("should return true for existing buffer", async () => {
    const denops = createMockDenops({
      "bufexists:[1]": 1,  // バッファ1は存在
    });

    const result = await isValidBuffer(denops, 1);

    assertEquals(result, true);
  });

  it("should return false for non-existing buffer", async () => {
    const denops = createMockDenops({
      "bufexists:[999]": 0,  // バッファ999は存在しない
    });

    const result = await isValidBuffer(denops, 999);

    assertEquals(result, false);
  });

  it("should return false when bufexists throws an error", async () => {
    const denops = {
      ...createMockDenops({}),
      call: async (fn: string, ..._args: unknown[]) => {
        if (fn === "bufexists") {
          throw new Error("Invalid buffer id");
        }
        throw new Error(`Unexpected call: ${fn}`);
      },
    } as unknown as Denops;

    const result = await isValidBuffer(denops, 1);

    assertEquals(result, false);  // エラー時はfalseを返す
  });
});

// =============================================================================
// getWindowVisibleLines テスト - Phase D-7: Race Condition 対策
// =============================================================================
describe("getWindowVisibleLines", () => {
  it("should return lines for valid buffer", async () => {
    const mockLines = ["line 1", "line 2", "line 3"];
    const denops = createMockDenops({
      "bufexists:[1]": 1,  // バッファは有効
      "nvim_buf_get_lines:[1,0,3,false]": mockLines,
    });
    const windowInfo: WindowInfo = {
      winid: 1000,
      bufnr: 1,
      topline: 1,
      botline: 3,
      width: 80,
      height: 24,
      isCurrent: true,
    };

    const result = await getWindowVisibleLines(denops, windowInfo);

    assertEquals(result, mockLines);
  });

  it("should return empty array for invalid buffer (race condition)", async () => {
    const denops = createMockDenops({
      "bufexists:[999]": 0,  // バッファは無効（削除済み）
    });
    const windowInfo: WindowInfo = {
      winid: 1000,
      bufnr: 999,  // 無効なバッファ
      topline: 1,
      botline: 10,
      width: 80,
      height: 24,
      isCurrent: true,
    };

    const result = await getWindowVisibleLines(denops, windowInfo);

    assertEquals(result, []);  // 空配列を返す（エラーを投げない）
  });

  it("should return empty array when nvim_buf_get_lines throws 'Invalid buffer id'", async () => {
    const denops = {
      ...createMockDenops({}),
      call: async (fn: string, ...args: unknown[]) => {
        if (fn === "bufexists") {
          return 1;  // バッファ存在チェックは通過
        }
        if (fn === "nvim_buf_get_lines") {
          // チェック後にバッファが削除された（Race Condition）
          throw new Error("Invalid buffer id: 1");
        }
        throw new Error(`Unexpected call: ${fn}(${JSON.stringify(args)})`);
      },
    } as unknown as Denops;
    const windowInfo: WindowInfo = {
      winid: 1000,
      bufnr: 1,
      topline: 1,
      botline: 10,
      width: 80,
      height: 24,
      isCurrent: true,
    };

    const result = await getWindowVisibleLines(denops, windowInfo);

    assertEquals(result, []);  // エラーを投げずに空配列を返す
  });

  it("should handle other errors gracefully", async () => {
    const denops = {
      ...createMockDenops({}),
      call: async (fn: string, ...args: unknown[]) => {
        if (fn === "bufexists") {
          return 1;
        }
        if (fn === "nvim_buf_get_lines") {
          throw new Error("Some other error");
        }
        throw new Error(`Unexpected call: ${fn}(${JSON.stringify(args)})`);
      },
    } as unknown as Denops;
    const windowInfo: WindowInfo = {
      winid: 1000,
      bufnr: 1,
      topline: 1,
      botline: 10,
      width: 80,
      height: 24,
      isCurrent: true,
    };

    const result = await getWindowVisibleLines(denops, windowInfo);

    assertEquals(result, []);  // どのエラーでも空配列を返す
  });
});
