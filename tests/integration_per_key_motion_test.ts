import { assertEquals, assertExists } from "@std/assert";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import type { Config } from "../denops/hellshake-yano/types.ts";
import { DEFAULT_CONFIG as DEFAULT_UNIFIED_CONFIG } from "../denops/hellshake-yano/config.ts";
import { Core } from "../denops/hellshake-yano/neovim/core/core.ts";

/**
 * Integration tests for per-key motion count feature
 *
 * These tests verify the complete workflow of the perKeyMotionCount feature
 * in realistic editing scenarios.
 */

// Helper to create a full config object
function createFullConfig(overrides: Partial<Config> = {}): Config {
  return {
    ...DEFAULT_UNIFIED_CONFIG,
    markers: ["A", "B", "C", "D", "E", "F", "G", "H"],
    motionCount: 3,
    motionTimeout: 2000,
    hintPosition: "end",
    triggerOnHjkl: true,
    countedMotions: ["w", "b", "e", "ge"],
    enabled: true,
    maxHints: 100,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
    perKeyMotionCount: {
      "v": 1, // Visual mode - immediate hints
      "V": 1, // Visual line mode - immediate hints
      "w": 1, // Word forward - immediate hints
      "b": 1, // Word backward - immediate hints
      "e": 1, // End of word - immediate hints
      "h": 3, // Left - 3 presses
      "j": 3, // Down - 3 presses
      "k": 3, // Up - 3 presses
      "l": 3, // Right - 3 presses
    },
    defaultMotionCount: 2,
    perKeyMinLength: {
      "v": 1,
      "w": 1,
      "b": 1,
    },
    defaultMinWordLength: 2,
    ...overrides,
  };
}

// Simulate motion count tracking
class MotionCountTracker {
  private counts: Map<string, number> = new Map();
  private timers: Map<string, number> = new Map();
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  processKey(key: string): boolean {
    const currentCount = this.counts.get(key) || 0;
    const newCount = currentCount + 1;
    this.counts.set(key, newCount);

    // Clear existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    const requiredCount = Core.getMotionCountForKey(key, this.config);

    // Set timeout to reset count
    const timer = setTimeout(() => {
      this.resetKey(key);
    }, this.config.motionTimeout);
    this.timers.set(key, timer as unknown as number);

    return newCount >= requiredCount;
  }

  resetKey(key: string) {
    this.counts.delete(key);
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
  }

  resetAll() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.counts.clear();
    this.timers.clear();
  }

  getCount(key: string): number {
    return this.counts.get(key) || 0;
  }
}

describe("Integration: 実際の編集シナリオでの動作確認", () => {
  let tracker: MotionCountTracker;

  afterEach(() => {
    if (tracker) {
      tracker.resetAll();
    }
  });
  it("ビジュアルモード選択で即座にヒントが表示される", () => {
    const config = createFullConfig();
    tracker = new MotionCountTracker(config);

    // 'v'キーを1回押す
    const shouldTrigger = tracker.processKey("v");

    // motionCountが1なので、1回で即座にトリガー
    assertEquals(shouldTrigger, true);
    assertEquals(tracker.getCount("v"), 1);
  });

  it("通常のナビゲーションキーは3回押してからヒント表示", () => {
    const config = createFullConfig();
    tracker = new MotionCountTracker(config);

    // 'h'キーを押す
    assertEquals(tracker.processKey("h"), false); // 1回目
    assertEquals(tracker.getCount("h"), 1);

    assertEquals(tracker.processKey("h"), false); // 2回目
    assertEquals(tracker.getCount("h"), 2);

    assertEquals(tracker.processKey("h"), true); // 3回目でトリガー
    assertEquals(tracker.getCount("h"), 3);
  });

  it("単語移動系は即座にヒントが表示される", () => {
    const config = createFullConfig();
    tracker = new MotionCountTracker(config);

    // 'w', 'b', 'e' は全て即座にトリガー
    assertEquals(tracker.processKey("w"), true);
    tracker.resetKey("w");

    assertEquals(tracker.processKey("b"), true);
    tracker.resetKey("b");

    assertEquals(tracker.processKey("e"), true);
  });
});

describe("Integration: 複数キーの混在使用テスト", () => {
  let tracker: MotionCountTracker;

  afterEach(() => {
    if (tracker) {
      tracker.resetAll();
    }
  });
  it("異なるキーが独立してカウントされる", () => {
    const config = createFullConfig();
    tracker = new MotionCountTracker(config);

    // 'h'を2回
    tracker.processKey("h");
    tracker.processKey("h");
    assertEquals(tracker.getCount("h"), 2);

    // 'v'を1回（即座にトリガー）
    assertEquals(tracker.processKey("v"), true);
    assertEquals(tracker.getCount("v"), 1);

    // 'h'のカウントは影響を受けない
    assertEquals(tracker.getCount("h"), 2);

    // 'h'をもう1回押してトリガー
    assertEquals(tracker.processKey("h"), true);
    assertEquals(tracker.getCount("h"), 3);
  });

  it("高速な切り替えでも正しく動作する", () => {
    const config = createFullConfig();
    tracker = new MotionCountTracker(config);

    // 素早く異なるキーを押す
    tracker.processKey("h"); // h: 1
    tracker.processKey("j"); // j: 1
    tracker.processKey("v"); // v: 1 (triggers)
    tracker.processKey("h"); // h: 2
    tracker.processKey("k"); // k: 1

    assertEquals(tracker.getCount("h"), 2);
    assertEquals(tracker.getCount("j"), 1);
    assertEquals(tracker.getCount("v"), 1);
    assertEquals(tracker.getCount("k"), 1);
  });

  it("同時に複数のキーがトリガー条件を満たす", () => {
    const config = createFullConfig();
    tracker = new MotionCountTracker(config);

    // 'h'と'j'を2回ずつ
    tracker.processKey("h");
    tracker.processKey("h");
    tracker.processKey("j");
    tracker.processKey("j");

    // 両方とも3回目でトリガー
    const hTrigger = tracker.processKey("h");
    const jTrigger = tracker.processKey("j");

    assertEquals(hTrigger, true);
    assertEquals(jTrigger, true);
  });
});

describe("Integration: リセット処理の確認", () => {
  let tracker: MotionCountTracker;

  afterEach(() => {
    if (tracker) {
      tracker.resetAll();
    }
  });
  it("トリガー後にカウントがリセットされる", () => {
    const config = createFullConfig();
    tracker = new MotionCountTracker(config);

    // 'v'でトリガー
    assertEquals(tracker.processKey("v"), true);

    // リセット
    tracker.resetKey("v");
    assertEquals(tracker.getCount("v"), 0);

    // 再度押すと新規カウント
    assertEquals(tracker.processKey("v"), true);
    assertEquals(tracker.getCount("v"), 1);
  });

  it("タイムアウトで自動リセットされる（シミュレーション）", async () => {
    const config = createFullConfig({
      motionTimeout: 100, // 100msに短縮
    });
    tracker = new MotionCountTracker(config);

    // 'h'を2回押す（3回必要）
    tracker.processKey("h");
    tracker.processKey("h");
    assertEquals(tracker.getCount("h"), 2);

    // タイムアウトを待つ
    await new Promise((resolve) => setTimeout(resolve, 150));

    // タイムアウト後はリセットされている
    assertEquals(tracker.getCount("h"), 0);
  });

  it("全キーのリセットが正しく動作する", () => {
    const config = createFullConfig();
    tracker = new MotionCountTracker(config);

    // 複数のキーをカウント
    tracker.processKey("h");
    tracker.processKey("j");
    tracker.processKey("v");
    tracker.processKey("w");

    // 全リセット
    tracker.resetAll();

    assertEquals(tracker.getCount("h"), 0);
    assertEquals(tracker.getCount("j"), 0);
    assertEquals(tracker.getCount("v"), 0);
    assertEquals(tracker.getCount("w"), 0);
  });
});

describe("Integration: パフォーマンステスト", () => {
  let tracker: MotionCountTracker;

  afterEach(() => {
    if (tracker) {
      tracker.resetAll();
    }
  });
  it("大量のキー入力でも高速に処理される", () => {
    const config = createFullConfig();
    tracker = new MotionCountTracker(config);

    const startTime = performance.now();
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      const key = ["h", "j", "k", "l", "v", "w", "b"][i % 7];
      tracker.processKey(key);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;

    // 1回あたり1ms未満であることを確認
    assertEquals(avgTime < 1, true);

    // デバッグ情報
    console.log(`Performance: ${iterations} iterations in ${totalTime.toFixed(2)}ms`);
    console.log(`Average: ${avgTime.toFixed(4)}ms per iteration`);
  });

  it("設定値の取得が高速にキャッシュされる", () => {
    const config = createFullConfig();

    const startTime = performance.now();
    const iterations = 10000;

    for (let i = 0; i < iterations; i++) {
      const key = ["h", "j", "k", "l", "v", "w", "b"][i % 7];
      Core.getMotionCountForKey(key, config);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;

    // 1回あたり0.01ms未満であることを確認
    assertEquals(avgTime < 0.01, true);

    console.log(`Config lookup: ${iterations} lookups in ${totalTime.toFixed(2)}ms`);
    console.log(`Average: ${(avgTime * 1000).toFixed(2)}µs per lookup`);
  });

  it("メモリリークが発生しない", () => {
    const config = createFullConfig();
    tracker = new MotionCountTracker(config);

    // 大量のキー入力とリセットを繰り返す
    for (let i = 0; i < 100; i++) {
      // 各キーを複数回押す
      for (const key of ["h", "j", "k", "l", "v", "w", "b"]) {
        for (let j = 0; j < 5; j++) {
          tracker.processKey(key);
        }
      }

      // 全リセット
      tracker.resetAll();
    }

    // トラッカーの内部マップが空であることを確認
    assertEquals(tracker.getCount("h"), 0);
    assertEquals(tracker.getCount("v"), 0);
  });
});

describe("Integration: エッジケースと実際の使用パターン", () => {
  let tracker: MotionCountTracker;
  let newTracker: MotionCountTracker;

  afterEach(() => {
    if (tracker) {
      tracker.resetAll();
    }
    if (newTracker) {
      newTracker.resetAll();
    }
  });
  it("設定変更後も正しく動作する", () => {
    let config = createFullConfig();
    tracker = new MotionCountTracker(config);

    // 初期設定で'v'は1回でトリガー
    assertEquals(tracker.processKey("v"), true);
    tracker.resetKey("v");

    // 設定を変更（実際にはconfigオブジェクトを作り直す）
    config = createFullConfig({
      perKeyMotionCount: {
        "v": 3, // 3回に変更
      },
      defaultMotionCount: 2,
    });
    newTracker = new MotionCountTracker(config);

    // 新しい設定では3回必要
    assertEquals(newTracker.processKey("v"), false);
    assertEquals(newTracker.processKey("v"), false);
    assertEquals(newTracker.processKey("v"), true);
  });

  it("未定義のキーはデフォルト値を使用", () => {
    const config = createFullConfig();
    tracker = new MotionCountTracker(config);

    // 'x'は未定義なのでdefaultMotionCount (2)を使用
    assertEquals(tracker.processKey("x"), false);
    assertEquals(tracker.processKey("x"), true);
  });

  it("実際の編集フロー：ビジュアル選択からの移動", () => {
    const config = createFullConfig();
    tracker = new MotionCountTracker(config);

    // ビジュアルモードに入る
    assertEquals(tracker.processKey("v"), true);
    console.log("Visual mode hints shown immediately");
    tracker.resetKey("v");

    // 単語単位で移動
    assertEquals(tracker.processKey("w"), true);
    console.log("Word forward hints shown immediately");
    tracker.resetKey("w");

    assertEquals(tracker.processKey("b"), true);
    console.log("Word backward hints shown immediately");
    tracker.resetKey("b");

    // 通常の移動は3回必要
    assertEquals(tracker.processKey("j"), false);
    assertEquals(tracker.processKey("j"), false);
    assertEquals(tracker.processKey("j"), true);
    console.log("Down movement hints shown after 3 presses");
  });
});
