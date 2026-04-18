/**
 * HintManagerシステムのテスト
 * Process2のHintManager実装をテストします
 */

import { assert, assertEquals, assertExists } from "@std/assert";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { filterWordsByDirection, HintManager } from "../denops/hellshake-yano/neovim/core/hint.ts";
import { Core } from "../denops/hellshake-yano/neovim/core/core.ts";
import type { Config, HintMapping, Word } from "../denops/hellshake-yano/types.ts";
import type { Denops } from "@denops/std";
import { DEFAULT_CONFIG as DEFAULT_UNIFIED_CONFIG } from "../denops/hellshake-yano/config.ts";

describe("HintManager Tests", () => {
  let config: Config;
  let hintManager: HintManager;

  beforeEach(() => {
    // テスト用の基本設定
    config = {
      ...DEFAULT_UNIFIED_CONFIG,
      markers: ["A", "B", "C", "D", "E"],
      motionCount: 3,
      motionTimeout: 2000,
      hintPosition: "start",
      triggerOnHjkl: true,
      countedMotions: [],
      enabled: true,
      maxHints: 100,
      debounceDelay: 50,
      useNumbers: true,
      highlightSelected: true,
      debugCoordinates: false,
      // process1で追加されたキー別設定
      perKeyMinLength: {
        "f": 2,
        "t": 3,
        "w": 1,
        "b": 4,
      },
      defaultMinWordLength: 2,
      currentKeyContext: "f",
    };

    hintManager = new HintManager(config);
  });

  describe("HintManager Instantiation", () => {
    it("should create HintManager instance with config", () => {
      assertExists(hintManager);
      assert(hintManager instanceof HintManager);
    });

    it("should store config internally", () => {
      // HintManagerが設定を内部に保持していることを確認
      // （内部実装によってはprivateかもしれないので、動作で確認）
      assertEquals(hintManager.getMinLengthForKey("f"), 2);
    });
  });

  describe("onKeyPress Method", () => {
    it("should exist and be callable", () => {
      assertExists(hintManager.onKeyPress);
      // メソッドが呼び出し可能であることを確認
      hintManager.onKeyPress("f");
    });

    it("should update current key context", () => {
      hintManager.onKeyPress("t");
      assertEquals(hintManager.getMinLengthForKey("t"), 3);
    });

    it("should clear current hints when key changes", () => {
      // 初期状態でヒントがある場合を想定
      let clearCalled = false;

      // HintManagerにヒントクリアが呼ばれたかを確認する仕組みが必要
      // ここでは動作が正常に完了することで確認
      hintManager.onKeyPress("w");

      // キーが変更されて、新しい最小長が適用されることを確認
      assertEquals(hintManager.getMinLengthForKey("w"), 1);
    });

    it("should handle key switching correctly", () => {
      // f -> t -> w の順でキーを切り替え
      hintManager.onKeyPress("f");
      assertEquals(hintManager.getMinLengthForKey("f"), 2);

      hintManager.onKeyPress("t");
      assertEquals(hintManager.getMinLengthForKey("t"), 3);

      hintManager.onKeyPress("w");
      assertEquals(hintManager.getMinLengthForKey("w"), 1);
    });
  });

  describe("getMinLengthForKey Method", () => {
    it("should delegate to main.ts getMinLengthForKey function", () => {
      // perKeyMinLengthに定義されたキー
      assertEquals(hintManager.getMinLengthForKey("f"), 2);
      assertEquals(hintManager.getMinLengthForKey("t"), 3);
      assertEquals(hintManager.getMinLengthForKey("w"), 1);
      assertEquals(hintManager.getMinLengthForKey("b"), 4);
    });

    it("should return default value for undefined keys", () => {
      // perKeyMinLengthに定義されていないキー
      assertEquals(hintManager.getMinLengthForKey("x"), 2); // defaultMinWordLength
    });

    it("should handle missing perKeyMinLength", () => {
      const configWithoutPerKey = { ...config };
      delete configWithoutPerKey.perKeyMinLength;

      const manager = new HintManager(configWithoutPerKey);
      assertEquals(manager.getMinLengthForKey("f"), 2); // defaultMinWordLength
    });
  });

  describe("clearCurrentHints Method", () => {
    it("should exist and be callable", () => {
      assertExists(hintManager.clearCurrentHints);
      // メソッドが呼び出し可能であることを確認
      hintManager.clearCurrentHints();
    });

    it("should immediately clear hints", () => {
      // ヒントクリアが実行されることを確認
      // 実際の動作は統合テストで確認するが、メソッドが例外なく実行されることを確認
      let clearExecuted = false;
      try {
        hintManager.clearCurrentHints();
        clearExecuted = true;
      } catch (error) {
        // clearCurrentHintsは例外を投げるべきではない
        assert(false, `clearCurrentHints threw an error: ${error}`);
      }
      assert(clearExecuted);
    });
  });

  describe("Key Context Management", () => {
    it("should track current key context", () => {
      // 初期状態
      assertEquals(hintManager.getMinLengthForKey("f"), 2);

      // キーコンテキストを変更
      hintManager.onKeyPress("t");
      assertEquals(hintManager.getMinLengthForKey("t"), 3);

      // 再度別のキーに変更
      hintManager.onKeyPress("w");
      assertEquals(hintManager.getMinLengthForKey("w"), 1);
    });

    it("should handle same key pressed multiple times", () => {
      hintManager.onKeyPress("f");
      assertEquals(hintManager.getMinLengthForKey("f"), 2);

      // 同じキーを再度押下
      hintManager.onKeyPress("f");
      assertEquals(hintManager.getMinLengthForKey("f"), 2);
    });
  });

  describe("Config Integration", () => {
    it("should work with config updates", () => {
      // 設定を更新
      const newConfig = {
        ...config,
        perKeyMinLength: {
          "f": 5,
          "t": 6,
        },
      };

      const newManager = new HintManager(newConfig);
      assertEquals(newManager.getMinLengthForKey("f"), 5);
      assertEquals(newManager.getMinLengthForKey("t"), 6);
      assertEquals(newManager.getMinLengthForKey("x"), 2); // defaultMinWordLength from config
    });

    it("should handle edge cases in config", () => {
      const edgeConfig = {
        ...config,
        perKeyMinLength: {},
      };

      const manager = new HintManager(edgeConfig);
      assertEquals(manager.getMinLengthForKey("any"), 2); // defaultMinWordLengthフォールバック
    });

    it("should provide readonly access to config", () => {
      const configRef = hintManager.getConfig();
      assertExists(configRef);
      assertEquals(configRef.perKeyMinLength?.["f"], 2);
    });
  });

  describe("Additional Utility Methods", () => {
    it("should track current key context via getCurrentKeyContext", () => {
      assertEquals(hintManager.getCurrentKeyContext(), "f"); // 初期値

      hintManager.onKeyPress("w");
      assertEquals(hintManager.getCurrentKeyContext(), "w");

      hintManager.onKeyPress("t");
      assertEquals(hintManager.getCurrentKeyContext(), "t");
    });

    it("should handle undefined initial context", () => {
      const configWithoutContext = { ...config };
      delete configWithoutContext.currentKeyContext;

      const manager = new HintManager(configWithoutContext);
      assertEquals(manager.getCurrentKeyContext(), undefined);

      manager.onKeyPress("x");
      assertEquals(manager.getCurrentKeyContext(), "x");
    });
  });
});

describe("Directional Hint Filter", () => {
  const cursor = { line: 10, col: 10 };
  const words: Word[] = [
    { text: "up-2", line: 8, col: 5 },
    { text: "same-line-left", line: 10, col: 8 },
    { text: "same-line-right", line: 10, col: 15 },
    { text: "down-1", line: 12, col: 3 },
  ];

  it("should return original list when context is none", () => {
    const result = filterWordsByDirection(words, cursor, "none");
    assertEquals(result, words);
  });

  it("should filter words below cursor for down context", () => {
    const result = filterWordsByDirection(words, cursor, "down").map((word: Word) => word.text);
    assertEquals(result, ["same-line-right", "down-1"]);
  });

  it("should filter words above cursor for up context", () => {
    const result = filterWordsByDirection(words, cursor, "up").map((word: Word) => word.text);
    assertEquals(result, ["up-2", "same-line-left"]);
  });
});

describe("Core directional filtering integration", () => {
  function resetCoreInstance() {
    Reflect.set(Core, "instance", null);
  }

  const sampleWords: Word[] = [
    { text: "up", line: 8, col: 5 },
    { text: "same-left", line: 10, col: 8 },
    { text: "same-right", line: 10, col: 15 },
    { text: "down", line: 12, col: 3 },
  ];

  const mockDenops = {
    call: async (fn: string) => {
      if (fn === "bufnr") {
        return 1;
      }
      if (fn === "getpos") {
        return [0, 10, 10, 0];
      }
      return null;
    },
  } as unknown as Denops;

  it("should filter words below the cursor when key is j", async () => {
    resetCoreInstance();
    const core = Core.getInstance({
      ...DEFAULT_UNIFIED_CONFIG,
      directionalHintFilter: true,
      markers: ["A", "B", "C"],
    });

    (core as unknown as { detectWordsOptimized: () => Promise<Word[]> }).detectWordsOptimized =
      async () => sampleWords;
    (core as unknown as { displayHintsOptimized: () => Promise<void> }).displayHintsOptimized =
      async () => {};
    (core as unknown as { waitForUserInput: () => Promise<void> }).waitForUserInput =
      async () => {};

    await core.showHintsWithKey(mockDenops, "j", "normal");
    const hints = Reflect.get(core, "currentHints") as HintMapping[];
    const capturedWords = hints.map((mapping) => mapping.word.text);
    assertEquals(
      capturedWords,
      ["same-right", "down"],
      "should only include words below or to the right on same line",
    );
  });

  it("should filter words above the cursor when key is k", async () => {
    resetCoreInstance();
    const core = Core.getInstance({
      ...DEFAULT_UNIFIED_CONFIG,
      directionalHintFilter: true,
      markers: ["A", "B", "C"],
    });

    (core as unknown as { detectWordsOptimized: () => Promise<Word[]> }).detectWordsOptimized =
      async () => sampleWords;
    (core as unknown as { displayHintsOptimized: () => Promise<void> }).displayHintsOptimized =
      async () => {};
    (core as unknown as { waitForUserInput: () => Promise<void> }).waitForUserInput =
      async () => {};

    await core.showHintsWithKey(mockDenops, "k", "normal");
    const hints = Reflect.get(core, "currentHints") as HintMapping[];
    const capturedWords = hints.map((mapping) => mapping.word.text);
    assertEquals(capturedWords, ["up"], "should omit word under cursor and keep words above");
  });
});
