/**
 * tests/unit/neovim/display/extmark-display.test.ts
 *
 * TDD Red-Green-Refactor: バッチ間人工遅延の除去
 *
 * RED: setTimeout(r, 1) が使用されているため FAIL
 * GREEN: Promise.resolve() に置換後 PASS
 */

import { assertEquals } from "@std/assert";
import { MockDenops } from "../../../helpers/mock.ts";
import {
  displayHintsAsync,
  HIGHLIGHT_BATCH_SIZE,
} from "../../../../denops/hellshake-yano/neovim/display/extmark-display.ts";
import type { Config } from "../../../../denops/hellshake-yano/types.ts";
import type { HintMapping } from "../../../../denops/hellshake-yano/types.ts";

/** テスト用の最小 Config */
const MOCK_CONFIG = {
  enabled: true,
  markers: ["a", "s", "d", "f"],
  motionCount: 1,
  motionTimeout: 500,
  hintPosition: "start",
  triggerOnHjkl: false,
  countedMotions: [],
  maxHints: 100,
  debounceDelay: 0,
  useNumbers: false,
  directionalHintFilter: false,
  highlightSelected: false,
  debugCoordinates: false,
  singleCharKeys: ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  multiCharKeys: ["a", "s", "d"],
  maxSingleCharHints: 26,
  useHintGroups: false,
  continuousHintMode: false,
  recenterCommand: "zz",
} as unknown as Config;

/** HIGHLIGHT_BATCH_SIZE より多い hint を作成して複数バッチを強制する */
function makeHints(count: number): HintMapping[] {
  return Array.from({ length: count }, (_, i) => ({
    word: { text: `word${i}`, line: i, col: 0 },
    hint: String.fromCharCode(97 + (i % 26)),
    hintCol: 1,
    hintByteCol: 1,
  })) as HintMapping[];
}

Deno.test(
  "displayHintsAsync: バッチ間で setTimeout(fn, 1) を呼ばない (Promise.resolve() を使用する)",
  async () => {
    const denops = new MockDenops();
    // nvim_buf_set_extmark を即座に解決するモック
    denops.onCall("nvim_buf_set_extmark", () => 0);

    // setTimeout 呼び出しを監視するスパイ
    const capturedDelays: number[] = [];
    const originalSetTimeout = globalThis.setTimeout;
    // Why: 型アサーションで元シグネチャを維持しながらスパイを注入
    (globalThis as unknown as { setTimeout: unknown }).setTimeout = (
      fn: (...args: unknown[]) => void,
      delay?: number,
    ) => {
      if (typeof delay === "number") {
        capturedDelays.push(delay);
      }
      return originalSetTimeout(fn, delay);
    };

    try {
      // HIGHLIGHT_BATCH_SIZE + 5 件 = 2バッチが走り、バッチ間遅延コードに到達する
      const hints = makeHints(HIGHLIGHT_BATCH_SIZE + 5);
      await displayHintsAsync(denops, MOCK_CONFIG, hints, /* extmarkNamespace */ 1);
    } finally {
      globalThis.setTimeout = originalSetTimeout;
    }

    // RED: 現在は setTimeout(r, 1) が呼ばれるため、delay=1 が capturedDelays に残る
    // GREEN: Promise.resolve() 置換後は delay<=1 のエントリが存在しない
    const batchDelays = capturedDelays.filter((d) => d <= 1);
    assertEquals(
      batchDelays.length,
      0,
      `バッチ間遅延として setTimeout が ${batchDelays.length} 回呼ばれました (delays: [${batchDelays.join(", ")}])。Promise.resolve() を使用してください。`,
    );
  },
);
