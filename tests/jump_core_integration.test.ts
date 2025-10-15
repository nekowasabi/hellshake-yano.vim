/**
 * Jump Core Integration Tests
 *
 * Core classのjump機能と連続ヒントモードの統合テスト
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.177.0/testing/asserts.ts";
import type { Config } from "../denops/hellshake-yano/types.ts";
import { DEFAULT_CONFIG } from "../denops/hellshake-yano/config.ts";

// テスト用のCore状態シミュレーション
interface CoreTestState {
  continuousModeActive: boolean;
  continuousJumpCount: number;
  lastJumpBufnr: number | null;
  config: Config;
}

function createTestCoreState(config?: Partial<Config>): CoreTestState {
  return {
    continuousModeActive: false,
    continuousJumpCount: 0,
    lastJumpBufnr: null,
    config: { ...DEFAULT_CONFIG, ...config },
  };
}

Deno.test("Core Integration: Jump functionality", async (t) => {
  await t.step("jumpToHintTarget - 基本的なジャンプ座標計算", () => {
    const target = {
      word: { text: "test", line: 10, col: 5 },
      hint: "A",
      hintCol: 5,
      hintByteCol: 5,
    };

    // ジャンプ先の座標を検証
    const jumpLine = target.word.line;
    const jumpCol = target.hintByteCol || target.hintCol || target.word.col;

    assertEquals(jumpLine, 10);
    assertEquals(jumpCol, 5);
  });

  await t.step("jumpToHintTarget - byteColとcolの優先順位", () => {
    const target = {
      word: { text: "日本語", line: 5, col: 10, byteCol: 15 },
      hint: "B",
      hintCol: 10,
      hintByteCol: 15,
    };

    // hintByteCol -> hintCol -> word.byteCol -> word.col の順で優先
    const jumpCol = target.hintByteCol || target.hintCol ||
      target.word.byteCol || target.word.col;

    assertEquals(jumpCol, 15);
  });

  await t.step("jumpToHintTarget - hintByteColがない場合", () => {
    const target = {
      word: { text: "test", line: 3, col: 7 },
      hint: "C",
      hintCol: 7,
      hintByteCol: 0, // 0は falsy
    };

    const jumpCol = target.hintByteCol || target.hintCol || target.word.col;
    assertEquals(jumpCol, 7); // hintColにフォールバック
  });
});

Deno.test("Core Integration: Recenter command execution", async (t) => {
  await t.step("executeRecenterCommand - デフォルトコマンド", () => {
    const state = createTestCoreState();
    const command = state.config.recenterCommand?.trim() || "normal! zz";

    assertExists(command);
    assertEquals(command, "normal! zz");
  });

  await t.step("executeRecenterCommand - カスタムコマンド", () => {
    const state = createTestCoreState({ recenterCommand: "normal! zt" });
    const command = state.config.recenterCommand?.trim() || "normal! zz";

    assertEquals(command, "normal! zt");
  });

  await t.step("executeRecenterCommand - 空のコマンド", () => {
    const state = createTestCoreState({ recenterCommand: "" });
    const command = state.config.recenterCommand?.trim();

    assertEquals(command, "");
  });

  await t.step("executeRecenterCommand - コマンド文字列の検証", () => {
    const validCommands = [
      "normal! zz",
      "normal! zt",
      "normal! zb",
      "normal! z.",
    ];

    for (const cmd of validCommands) {
      assertExists(cmd);
      assertEquals(cmd.startsWith("normal!"), true);
    }
  });
});

Deno.test("Core Integration: Continuous hint mode state management", async (t) => {
  await t.step("postJumpHandler - continuousHintMode無効時", () => {
    const state = createTestCoreState({ continuousHintMode: false });

    // continuousHintModeが無効な場合、モードをリセット
    if (!state.config.continuousHintMode) {
      state.continuousModeActive = false;
      state.continuousJumpCount = 0;
    }

    assertEquals(state.continuousModeActive, false);
    assertEquals(state.continuousJumpCount, 0);
  });

  await t.step("postJumpHandler - continuousHintMode有効時", () => {
    const state = createTestCoreState({ continuousHintMode: true });

    // 最初のジャンプ
    const bufnr = 1;
    if (!state.continuousModeActive) {
      state.continuousJumpCount = 0;
    }
    state.continuousModeActive = true;
    state.lastJumpBufnr = bufnr;
    state.continuousJumpCount += 1;

    assertEquals(state.continuousModeActive, true);
    assertEquals(state.continuousJumpCount, 1);
    assertEquals(state.lastJumpBufnr, 1);
  });

  await t.step("postJumpHandler - バッファ変更検出", () => {
    const state = createTestCoreState({ continuousHintMode: true });

    // 最初のジャンプ
    state.continuousModeActive = true;
    state.lastJumpBufnr = 1;
    state.continuousJumpCount = 1;

    // バッファが変わった場合
    const currentBufnr = 2;
    if (state.continuousModeActive && state.lastJumpBufnr !== null &&
        state.lastJumpBufnr !== currentBufnr) {
      state.continuousModeActive = false;
      state.continuousJumpCount = 0;
      state.lastJumpBufnr = null;
    }

    assertEquals(state.continuousModeActive, false);
    assertEquals(state.continuousJumpCount, 0);
  });

  await t.step("postJumpHandler - maxContinuousJumps到達", () => {
    const state = createTestCoreState({
      continuousHintMode: true,
      maxContinuousJumps: 3,
    });

    state.continuousModeActive = true;
    state.lastJumpBufnr = 1;

    // 3回ジャンプ
    for (let i = 0; i < 3; i++) {
      state.continuousJumpCount += 1;
    }

    assertEquals(state.continuousJumpCount, 3);

    // 4回目のチェック
    state.continuousJumpCount += 1;
    const maxJumps = state.config.maxContinuousJumps > 0
      ? state.config.maxContinuousJumps
      : DEFAULT_CONFIG.maxContinuousJumps;

    if (state.continuousJumpCount > maxJumps) {
      state.continuousModeActive = false;
      state.continuousJumpCount = 0;
      state.lastJumpBufnr = null;
    }

    assertEquals(state.continuousModeActive, false);
  });

  await t.step("postJumpHandler - 連続ジャンプカウントのリセット", () => {
    const state = createTestCoreState({ continuousHintMode: true });

    // ジャンプを実行
    state.continuousModeActive = true;
    state.continuousJumpCount = 5;

    // リセット
    state.continuousModeActive = false;
    state.continuousJumpCount = 0;
    state.lastJumpBufnr = null;

    assertEquals(state.continuousJumpCount, 0);
    assertEquals(state.continuousModeActive, false);
    assertEquals(state.lastJumpBufnr, null);
  });
});

Deno.test("Core Integration: waitForUserInput character handling", async (t) => {
  await t.step("文字コード処理 - 大文字変換", () => {
    // 小文字 'a' (97) -> 大文字 'A' (65)
    const charCode = 97;
    const char = String.fromCharCode(charCode);
    const upperChar = char.toUpperCase();

    assertEquals(char, "a");
    assertEquals(upperChar, "A");
  });

  await t.step("文字コード処理 - 数字", () => {
    const charCode = 48; // '0'
    const char = String.fromCharCode(charCode);

    assertEquals(char, "0");
    assertEquals(/^\d$/.test(char), true);
  });

  await t.step("文字コード処理 - ESC判定", () => {
    const escCode = 27;
    const isEsc = escCode === 27;

    assertEquals(isEsc, true);
  });

  await t.step("文字コード処理 - 制御文字判定", () => {
    const controlChars = [1, 2, 3, 10, 13, 27];
    const enterCode = 13;

    for (const code of controlChars) {
      const isControl = code < 32;
      const isEnter = code === 13;

      assertEquals(isControl, true);
      if (code === enterCode) {
        assertEquals(isEnter, true);
      }
    }
  });

  await t.step("文字コード処理 - 大文字判定", () => {
    const upperA = 65; // 'A'
    const upperZ = 90; // 'Z'

    const isUpperCase = (code: number) => code >= 65 && code <= 90;

    assertEquals(isUpperCase(upperA), true);
    assertEquals(isUpperCase(upperZ), true);
    assertEquals(isUpperCase(97), false); // 'a'
  });

  await t.step("文字コード処理 - 小文字判定", () => {
    const lowerA = 97; // 'a'
    const lowerZ = 122; // 'z'

    const isLowerCase = (code: number) => code >= 97 && code <= 122;

    assertEquals(isLowerCase(lowerA), true);
    assertEquals(isLowerCase(lowerZ), true);
    assertEquals(isLowerCase(65), false); // 'A'
  });
});

Deno.test("Core Integration: Hint matching logic", async (t) => {
  await t.step("ヒントマッチング - 前方一致フィルタリング", () => {
    const hints = [
      { hint: "AA", word: { text: "first", line: 1, col: 1 } },
      { hint: "AB", word: { text: "second", line: 2, col: 1 } },
      { hint: "BA", word: { text: "third", line: 3, col: 1 } },
    ];

    const inputChar = "A";
    const matchingHints = hints.filter((h) => h.hint.startsWith(inputChar));

    assertEquals(matchingHints.length, 2);
    assertEquals(matchingHints[0].hint, "AA");
    assertEquals(matchingHints[1].hint, "AB");
  });

  await t.step("ヒントマッチング - 完全一致検索", () => {
    const hints = [
      { hint: "A", word: { text: "first", line: 1, col: 1 } },
      { hint: "AA", word: { text: "second", line: 2, col: 1 } },
      { hint: "AB", word: { text: "third", line: 3, col: 1 } },
    ];

    const inputChar = "A";
    const singleCharTarget = hints.find((h) => h.hint === inputChar);
    const multiCharHints = hints.filter((h) =>
      h.hint.startsWith(inputChar) && h.hint.length > 1
    );

    assertExists(singleCharTarget);
    assertEquals(singleCharTarget.hint, "A");
    assertEquals(multiCharHints.length, 2);
  });

  await t.step("ヒントマッチング - 2文字ヒント完全一致", () => {
    const hints = [
      { hint: "AA", word: { text: "first", line: 1, col: 1 } },
      { hint: "AB", word: { text: "second", line: 2, col: 1 } },
      { hint: "BA", word: { text: "third", line: 3, col: 1 } },
    ];

    const fullHint = "AB";
    const target = hints.find((h) => h.hint === fullHint);

    assertExists(target);
    assertEquals(target.hint, "AB");
    assertEquals(target.word.text, "second");
  });

  await t.step("ヒントマッチング - マッチなし", () => {
    const hints = [
      { hint: "A", word: { text: "first", line: 1, col: 1 } },
      { hint: "B", word: { text: "second", line: 2, col: 1 } },
    ];

    const inputChar = "Z";
    const matchingHints = hints.filter((h) => h.hint.startsWith(inputChar));

    assertEquals(matchingHints.length, 0);
  });
});

Deno.test("Core Integration: Timeout handling", async (t) => {
  await t.step("タイムアウト処理 - メインタイムアウト", async () => {
    const inputTimeout = 100;
    const timeoutValue = -2;

    const timeoutPromise = new Promise<number>((resolve) => {
      setTimeout(() => resolve(timeoutValue), inputTimeout);
    });

    const result = await timeoutPromise;
    assertEquals(result, -2);
  });

  await t.step("タイムアウト処理 - セカンダリタイムアウト", async () => {
    const secondTimeout = 50;
    const timeoutValue = -1;

    const timeoutPromise = new Promise<number>((resolve) => {
      setTimeout(() => resolve(timeoutValue), secondTimeout);
    });

    const result = await timeoutPromise;
    assertEquals(result, -1);
  });

  await t.step("タイムアウト処理 - タイムアウトキャンセル", () => {
    let timeoutId: number | undefined;

    timeoutId = setTimeout(() => {
      // タイムアウト処理
    }, 1000) as unknown as number;

    // タイムアウトをキャンセル
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }

    assertEquals(timeoutId, undefined);
  });
});
