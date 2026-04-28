/**
 * tests/multi_buffer_extmark_clamp_test.ts
 *
 * RC-2 (PLAN-followup-cycle3 Process 01): multi-buffer 座標オーバーフロー対策の
 * 投入前バリデーション ロジックを検証する regression テスト群。
 *
 * 対象: denops/hellshake-yano/neovim/display/extmark-display.ts
 *   - clampMarkPosition (新規 export 関数)
 *
 * Why: processExtmarksForBuffer を直接呼ぶには Denops モックの広範な拡張が必要なため、
 *      投入判定ロジックを純関数 clampMarkPosition に切り出し、ピンポイントで検証する。
 *      multi-buffer scenario で実際に発生する Invalid 'col'/'line' を投入前に
 *      防げることを保証する。
 */

import { assertEquals } from "jsr:@std/assert@1.0.6";
import {
  clampMarkPosition,
  displayHintsMultiBuffer,
  resetExtmarkClampWarnCounter,
  resetExtmarkSetFailCounter,
} from "../denops/hellshake-yano/neovim/display/extmark-display.ts";
import { setDebugMode } from "../denops/hellshake-yano/common/utils/logger.ts";
import { DEFAULT_CONFIG } from "../denops/hellshake-yano/config.ts";
import { MockDenops } from "./helpers/mock.ts";

/** Capture console.warn / console.log output for assertion */
function captureConsole(): {
  warns: string[];
  logs: string[];
  restore: () => void;
} {
  const warns: string[] = [];
  const logs: string[] = [];
  const origWarn = console.warn;
  const origLog = console.log;
  console.warn = (...args: unknown[]) => {
    warns.push(args.map(String).join(" "));
  };
  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };
  return {
    warns,
    logs,
    restore: () => {
      console.warn = origWarn;
      console.log = origLog;
    },
  };
}

class ThrowingSetExtmarkDenops extends MockDenops {
  override batch(...calls: Array<[string, ...unknown[]]>): Promise<unknown[]> {
    if (calls[0]?.[0] === "nvim_buf_get_lines") {
      return Promise.resolve(calls.map(() => ["alpha"]));
    }
    if (calls[0]?.[0] === "nvim_buf_set_extmark") {
      return Promise.reject(new Error("simulated_set_extmark_failure"));
    }
    return Promise.resolve([]);
  }
}

Deno.test("[REGRESSION] processExtmarksForBuffer skips marks with line >= bufLineCount", () => {
  // Arrange: bufLineCount=100, lineLengthCache 任意（先に line 判定で弾かれる）
  const bufLineCount = 100;
  const lineLengthCache = new Map<number, number>([
    [0, 5],
    [99, 10],
  ]);
  resetExtmarkClampWarnCounter();
  setDebugMode(false); // WARN は debugMode 非依存で出る

  const cap = captureConsole();
  try {
    // Act
    const r1 = clampMarkPosition(99, 5, bufLineCount, lineLengthCache); // OK
    const r2 = clampMarkPosition(100, 0, bufLineCount, lineLengthCache); // NG: == bufLineCount
    const r3 = clampMarkPosition(150, 0, bufLineCount, lineLengthCache); // NG: 超過

    // Assert
    assertEquals(r1.action, "ok", "line=99 should pass through");
    assertEquals(r1.line, 99);
    assertEquals(r1.col, 5);

    assertEquals(r2.action, "skip", "line == bufLineCount should be skipped");
    assertEquals(r2.reason, "line-overflow");

    assertEquals(r3.action, "skip", "line > bufLineCount should be skipped");
    assertEquals(r3.reason, "line-overflow");

    // 初回 WARN は出力される (throttle: first + every 100)
    const warnFound = cap.warns.some((m) =>
      m.includes("[WARN]") && m.includes("ExtmarkClamp") &&
      m.includes("line overflow")
    );
    assertEquals(warnFound, true, `expected WARN log; got: ${cap.warns.join("\n")}`);
  } finally {
    cap.restore();
    resetExtmarkClampWarnCounter();
  }
});

Deno.test("[REGRESSION] processExtmarksForBuffer clamps col to line length", () => {
  // Arrange: line=0 の長さ=5, col=10 を投入
  const bufLineCount = 100;
  const lineLengthCache = new Map<number, number>([[0, 5]]);
  resetExtmarkClampWarnCounter();
  setDebugMode(true); // DEBUG ログを有効化

  const cap = captureConsole();
  try {
    // Act
    const r = clampMarkPosition(0, 10, bufLineCount, lineLengthCache);

    // Assert: clamp された結果が返る
    assertEquals(r.action, "clamp", "col overflow should be clamped, not skipped");
    assertEquals(r.line, 0);
    assertEquals(r.col, 5, "col should be clamped to line length (5)");

    // DEBUG ログ確認
    const debugFound = cap.logs.some((m) =>
      m.includes("[DEBUG]") && m.includes("ExtmarkClamp") &&
      m.includes("clamped col")
    );
    assertEquals(debugFound, true, `expected DEBUG log; got: ${cap.logs.join("\n")}`);
  } finally {
    cap.restore();
    setDebugMode(false);
    resetExtmarkClampWarnCounter();
  }
});

Deno.test("[REGRESSION] processExtmarksForBuffer passes valid line/col unchanged", () => {
  // Arrange
  const bufLineCount = 100;
  const lineLengthCache = new Map<number, number>([[0, 5]]);
  resetExtmarkClampWarnCounter();
  setDebugMode(false);

  const cap = captureConsole();
  try {
    // Act
    const r = clampMarkPosition(0, 2, bufLineCount, lineLengthCache);

    // Assert
    assertEquals(r.action, "ok");
    assertEquals(r.line, 0);
    assertEquals(r.col, 2);
    assertEquals(cap.warns.length, 0, "no WARN expected on valid input");
  } finally {
    cap.restore();
    resetExtmarkClampWarnCounter();
  }
});

Deno.test("[REGRESSION] processExtmarksForBuffer throttles set_extmark batch errors", async () => {
  resetExtmarkSetFailCounter();
  const denops = new ThrowingSetExtmarkDenops();
  denops.onCall("nvim_buf_line_count", () => 1);
  const hints = [{
    word: { text: "alpha", line: 1, col: 1, byteCol: 1, bufnr: 1 },
    hint: "A",
    hintCol: 1,
    hintByteCol: 1,
  }];

  const errors: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(" "));
  };

  try {
    for (let i = 0; i < 200; i++) {
      await displayHintsMultiBuffer(denops, hints, DEFAULT_CONFIG, 42);
    }
    const matching = errors.filter((m) =>
      m.includes("[ERROR]") &&
      m.includes("ExtmarkSetFail") &&
      m.includes("callAtomic failed for nvim_buf_set_extmark")
    );
    assertEquals(matching.length, 3);
  } finally {
    console.error = originalError;
    resetExtmarkSetFailCounter();
  }
});
