/**
 * Process 101: Timing Logger / Debug Mode 検証テスト
 *
 * P50 で追加された [Timing/getline], [Timing/applyHintPatterns] タイマーの
 * 出力フォーマットと debugMode トグル動作を純粋 Deno.test で検証する。
 *
 * Why: core.ts の Timing 計測は Neovim RPC 依存のため直接テストできない。
 *      代わりに logger モジュール (getDebugMode/setDebugMode/logMessage) の
 *      挙動を検証し、debugMode=false 時の no-op 保証とログフォーマットを確認する。
 */

import { assertEquals, assertMatch, assertNotMatch } from "@std/assert";
import { describe, it, beforeEach, afterEach } from "@std/testing/bdd";
import {
  getDebugMode,
  setDebugMode,
  logMessage,
} from "../denops/hellshake-yano/common/utils/logger.ts";

/**
 * console.log を一時キャプチャするヘルパー
 * Why: logMessage は console.log/error/warn に出力するため、
 *      出力内容をアサートするには console をフックする必要がある。
 */
function captureConsole(): {
  logs: string[];
  errors: string[];
  warns: string[];
  restore: () => void;
} {
  const logs: string[] = [];
  const errors: string[] = [];
  const warns: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  // Why: Function.prototype.bind で context を維持しつつラップ
  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };
  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(" "));
  };
  console.warn = (...args: unknown[]) => {
    warns.push(args.map(String).join(" "));
  };

  return {
    logs,
    errors,
    warns,
    restore: () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    },
  };
}

describe("P101: Timing Logger / Debug Mode", () => {
  let originalDebugMode: boolean;

  beforeEach(() => {
    originalDebugMode = getDebugMode();
  });

  afterEach(() => {
    // テスト終了後に元の debugMode を復元
    setDebugMode(originalDebugMode);
  });

  describe("debugMode トグル動作", () => {
    it("setDebugMode(true) の後 getDebugMode() が true を返す", () => {
      setDebugMode(true);
      assertEquals(getDebugMode(), true);
    });

    it("setDebugMode(false) の後 getDebugMode() が false を返す", () => {
      setDebugMode(false);
      assertEquals(getDebugMode(), false);
    });

    it("トグルを繰り返しても値が正しく反映される", () => {
      setDebugMode(true);
      assertEquals(getDebugMode(), true);
      setDebugMode(false);
      assertEquals(getDebugMode(), false);
      setDebugMode(true);
      assertEquals(getDebugMode(), true);
    });
  });

  describe("logMessage の debugMode ON/OFF 挙動", () => {
    it("debugMode=false のとき DEBUG レベルは出力されない", () => {
      setDebugMode(false);
      const capture = captureConsole();
      try {
        logMessage("DEBUG", "HINT-DEBUG", "[Timing/getline] elapsed=5.23ms lineCount=100 cacheHit=true");
        assertEquals(capture.logs.length, 0, "DEBUG ログは出力されないべき");
        assertEquals(capture.errors.length, 0);
        assertEquals(capture.warns.length, 0);
      } finally {
        capture.restore();
      }
    });

    it("debugMode=false のとき INFO レベルは出力されない", () => {
      setDebugMode(false);
      const capture = captureConsole();
      try {
        logMessage("INFO", "TestContext", "some info message");
        assertEquals(capture.logs.length, 0, "INFO ログは出力されないべき");
      } finally {
        capture.restore();
      }
    });

    it("debugMode=false のときでも WARN は出力される", () => {
      setDebugMode(false);
      const capture = captureConsole();
      try {
        logMessage("WARN", "TestContext", "warning message");
        assertEquals(capture.warns.length, 1);
        assertMatch(capture.warns[0], /\[WARN\]/);
      } finally {
        capture.restore();
      }
    });

    it("debugMode=false のときでも ERROR は出力される", () => {
      setDebugMode(false);
      const capture = captureConsole();
      try {
        logMessage("ERROR", "TestContext", "error message");
        assertEquals(capture.errors.length, 1);
        assertMatch(capture.errors[0], /\[ERROR\]/);
      } finally {
        capture.restore();
      }
    });

    it("debugMode=true のとき DEBUG レベルは出力される", () => {
      setDebugMode(true);
      const capture = captureConsole();
      try {
        logMessage("DEBUG", "HINT-DEBUG", "[Timing/getline] elapsed=5.23ms lineCount=100 cacheHit=true");
        assertEquals(capture.logs.length, 1);
        assertMatch(capture.logs[0], /\[DEBUG\]/);
      } finally {
        capture.restore();
      }
    });
  });

  describe("Timing ログフォーマット検証", () => {
    beforeEach(() => {
      setDebugMode(true);
    });

    it("[Timing/getline] ログが期待フォーマットに従う", () => {
      const capture = captureConsole();
      try {
        // Why: core.ts 1072-1075 行の実際のフォーマットに合わせる
        const elapsed = "5.23";
        const lineCount = 44949;
        const cacheHit = true;
        logMessage(
          "DEBUG",
          "HINT-DEBUG",
          `[Timing/getline] elapsed=${elapsed}ms lineCount=${lineCount} cacheHit=${cacheHit}`,
        );

        assertEquals(capture.logs.length, 1);
        const output = capture.logs[0];

        // タイムスタンプ + レベル + コンテキスト + メッセージ の構造
        assertMatch(output, /^\[.*\] \[DEBUG\] \[HINT-DEBUG\]/);
        assertMatch(output, /\[Timing\/getline\]/);
        assertMatch(output, /elapsed=\d+\.\d+ms/);
        assertMatch(output, /lineCount=\d+/);
        assertMatch(output, /cacheHit=(true|false)/);
      } finally {
        capture.restore();
      }
    });

    it("[Timing/applyHintPatterns] ログが期待フォーマットに従う", () => {
      const capture = captureConsole();
      try {
        // Why: core.ts 1087-1094 行の実際のフォーマットに合わせる
        const elapsed = "12.45";
        const wordCount = 42;
        const patternCount = 3;
        logMessage(
          "DEBUG",
          "HINT-DEBUG",
          `[Timing/applyHintPatterns] elapsed=${elapsed}ms wordCount=${wordCount} patternCount=${patternCount}`,
        );

        assertEquals(capture.logs.length, 1);
        const output = capture.logs[0];

        assertMatch(output, /^\[.*\] \[DEBUG\] \[HINT-DEBUG\]/);
        assertMatch(output, /\[Timing\/applyHintPatterns\]/);
        assertMatch(output, /elapsed=\d+\.\d+ms/);
        assertMatch(output, /wordCount=\d+/);
        assertMatch(output, /patternCount=\d+/);
      } finally {
        capture.restore();
      }
    });

    it("[PointD/applyHintPatterns] メトリクスログが期待フォーマットに従う", () => {
      const capture = captureConsole();
      try {
        // Why: core.ts 1097-1106 行のフォーマット
        logMessage(
          "DEBUG",
          "HINT-DEBUG",
          `[PointD/applyHintPatterns] prioritizedCount=5 totalWords=42 patternsApplied=3`,
        );

        assertEquals(capture.logs.length, 1);
        const output = capture.logs[0];

        assertMatch(output, /\[PointD\/applyHintPatterns\]/);
        assertMatch(output, /prioritizedCount=\d+/);
        assertMatch(output, /totalWords=\d+/);
        assertMatch(output, /patternsApplied=\d+/);
      } finally {
        capture.restore();
      }
    });

    it("cacheHit=false の場合もフォーマットが正しい", () => {
      const capture = captureConsole();
      try {
        logMessage(
          "DEBUG",
          "HINT-DEBUG",
          `[Timing/getline] elapsed=350.12ms lineCount=44949 cacheHit=false`,
        );

        assertEquals(capture.logs.length, 1);
        const output = capture.logs[0];
        assertMatch(output, /cacheHit=false/);
      } finally {
        capture.restore();
      }
    });
  });

  describe("debugMode=false 時の no-op 保証", () => {
    it("debugMode=false のとき Timing メッセージは一切出力されない", () => {
      setDebugMode(false);
      const capture = captureConsole();
      try {
        logMessage("DEBUG", "HINT-DEBUG", "[Timing/getline] elapsed=5.23ms lineCount=100 cacheHit=true");
        logMessage("DEBUG", "HINT-DEBUG", "[Timing/applyHintPatterns] elapsed=12.45ms wordCount=42 patternCount=3");
        logMessage("DEBUG", "HINT-DEBUG", "[PointD/applyHintPatterns] prioritizedCount=5 totalWords=42 patternsApplied=3");
        logMessage("DEBUG", "HINT-DEBUG", "[PointE2/beforeAssign] wordsCount=42 hintsCount=42 directionalEnabled=true mode=normal");

        assertEquals(capture.logs.length, 0, "debugMode=false のときは全 DEBUG ログが抑制されるべき");
        assertEquals(capture.errors.length, 0);
        assertEquals(capture.warns.length, 0);
      } finally {
        capture.restore();
      }
    });

    it("debugMode ON -> OFF -> ON の切り替えでログ出力が正しく復元される", () => {
      setDebugMode(true);
      const capture1 = captureConsole();
      logMessage("DEBUG", "TEST", "visible");
      assertEquals(capture1.logs.length, 1, "debugMode=true でログが出力される");
      capture1.restore();

      setDebugMode(false);
      const capture2 = captureConsole();
      logMessage("DEBUG", "TEST", "hidden");
      assertEquals(capture2.logs.length, 0, "debugMode=false でログが抑制される");
      capture2.restore();

      setDebugMode(true);
      const capture3 = captureConsole();
      logMessage("DEBUG", "TEST", "visible again");
      assertEquals(capture3.logs.length, 1, "debugMode=true に戻すとログが再出力される");
      capture3.restore();
    });
  });
});
