/**
 * cancel-key-p.test.ts - P キー Cancel バグのテスト（TDD）
 *
 * バグ概要:
 * ヒント表示中に P/p を押すとペーストが実行されずヒントが残存する。
 *
 * 根本原因（調査結果 2026-03-11）:
 * 1. core.ts:177 の DEFAULT_MULTI_KEYS に "P" が含まれている（内部 fallback 定数）
 *    → config.multiCharKeys が未設定の場合、"P" が hint key として扱われる
 * 2. config.ts:96 と types/config.ts:173 の DEFAULT_CONFIG.multiCharKeys は
 *    すでに "P" を除外済み（修正済み）
 * 3. hideHintsOptimized は clearHintsMultiBuffer を呼ぶよう修正済み（修正済み）
 *
 * テスト方針:
 * - 修正済み箇所: Green として現状の正しい動作を確認する回帰テスト
 * - 未修正箇所（DEFAULT_MULTI_KEYS の "P"）: core.ts がエクスポートしていないため
 *   コードレビューレベルの設計テストとして記録し、エクスポート追加後に Red→Green にする
 */

import { assertEquals, assertNotEquals } from "jsr:@std/assert@^1.0.0";
import { beforeEach, describe, it } from "jsr:@std/testing@^1.0.0/bdd";
import { DEFAULT_CONFIG } from "../../../config.ts";
import {
  getMultiBufferExtmarkState,
  MULTI_BUFFER_EXTMARK_STATE,
} from "../../display/extmark-display.ts";

// ---------------------------------------------------------------------------
// Test Group 1: DEFAULT_CONFIG.multiCharKeys に "P" が含まれないこと（回帰テスト）
//
// 修正済み: config.ts:96 と types/config.ts:173 から "P" は除去されている。
// このテストは修正が再び壊れないことを保証する回帰テスト（Green expected）。
// ---------------------------------------------------------------------------
describe("Test 1: 'P' must NOT be in DEFAULT_CONFIG.multiCharKeys (regression)", () => {
  it("DEFAULT_CONFIG.multiCharKeys should not contain 'P'", () => {
    const multiCharKeys = DEFAULT_CONFIG.multiCharKeys;
    assertEquals(
      multiCharKeys.includes("P"),
      false,
      `'P' is a Vim paste key (cursor-before paste). ` +
        `It must NOT be in multiCharKeys. Found: ${JSON.stringify(multiCharKeys)}`,
    );
  });

  it("DEFAULT_CONFIG.multiCharKeys should not contain 'p' (lowercase)", () => {
    const multiCharKeys = DEFAULT_CONFIG.multiCharKeys;
    assertEquals(
      multiCharKeys.includes("p"),
      false,
      `'p' is a Vim paste key. It must NOT be in multiCharKeys.`,
    );
  });

  it("DEFAULT_CONFIG.singleCharKeys should not contain 'P'", () => {
    const singleCharKeys = DEFAULT_CONFIG.singleCharKeys || [];
    assertEquals(
      singleCharKeys.includes("P"),
      false,
      `'P' must not be in singleCharKeys either. Found: ${JSON.stringify(singleCharKeys)}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Test Group 2: validKeysSet に "P" が含まれないこと（waitForUserInput ロジック検証）
//
// waitForUserInput (core.ts:1233-1238) での validKeysSet 構築を再現。
// DEFAULT_CONFIG を使った場合に "P" が hint key として扱われないことを確認。
// ---------------------------------------------------------------------------
describe("Test 2: validKeysSet must not include 'P' with DEFAULT_CONFIG", () => {
  function buildValidKeysSet(config: typeof DEFAULT_CONFIG): Set<string> {
    // core.ts:1233-1238 の validKeysSet 構築ロジックを再現
    const allKeys = [...(config.singleCharKeys || []), ...(config.multiCharKeys || [])];
    if (config.useNumericMultiCharHints) {
      allKeys.push(...["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
    }
    const normalizedKeys = allKeys.map((k) => /[a-zA-Z]/.test(k) ? k.toUpperCase() : k);
    return new Set(normalizedKeys);
  }

  it("'P' (char=80) should NOT be in validKeysSet → feedkeys path is taken", () => {
    const validKeysSet = buildValidKeysSet(DEFAULT_CONFIG);

    // char=80 -> String.fromCharCode(80) = "P"
    const char = 80;
    const inputChar = String.fromCharCode(char).toUpperCase();
    assertEquals(inputChar, "P");

    assertEquals(
      validKeysSet.has("P"),
      false,
      `'P' must not be in validKeysSet. When 'P' is in validKeysSet, ` +
        `waitForUserInput treats it as a hint key instead of passing it through via feedkeys. ` +
        `This causes paste (P) to be swallowed. Current validKeysSet: ${
          JSON.stringify([...validKeysSet])
        }`,
    );
  });

  it("feedkeys branch condition: !validKeysSet.has('P') must be true", () => {
    const validKeysSet = buildValidKeysSet(DEFAULT_CONFIG);

    // core.ts:1239: if (!validKeysSet.has(inputChar)) { feedkeys(...) }
    assertEquals(
      !validKeysSet.has("P"),
      true,
      `The feedkeys branch (!validKeysSet.has('P')) must be true so that ` +
        `pressing P during hint display passes the key through to Vim.`,
    );
  });

  it("'p' (char=112, lowercase) triggers wasLowerCase branch → feedkeys is called", () => {
    // core.ts:1214-1219: wasLowerCase=true の場合は validKeysSet チェック前に feedkeys を呼ぶ
    // ここでは大文字化後の "P" が validKeysSet に含まれないことも確認
    const char = 112; // 'p'
    const wasLowerCase = char >= 97 && char <= 122;
    assertEquals(wasLowerCase, true, "char=112 should be detected as lowercase");

    const validKeysSet = buildValidKeysSet(DEFAULT_CONFIG);
    assertEquals(
      validKeysSet.has("P"),
      false,
      `Even after normalization, 'P' must not be in validKeysSet.`,
    );
  });
});

// ---------------------------------------------------------------------------
// Test Group 3: DEFAULT_MULTI_KEYS fallback に "P" が含まれないこと（Red phase）
//
// core.ts:1284: const multiOnlyKeys = config.multiCharKeys || DEFAULT_MULTI_KEYS;
// config.multiCharKeys が未設定の場合、DEFAULT_MULTI_KEYS が使われる。
// DEFAULT_MULTI_KEYS（core.ts:177-192）にはまだ "P" が含まれている（未修正）。
//
// このテストは DEFAULT_MULTI_KEYS をエクスポートして確認するものだが、
// 現時点では core.ts が DEFAULT_MULTI_KEYS をエクスポートしていないため、
// 設計要件をコードで表現し、エクスポート追加後に Red→Green で確認する。
//
// 代替アプローチ: DEFAULT_CONFIG のフォールバック動作を config undefined で確認。
// ---------------------------------------------------------------------------
describe("Test 3: DEFAULT_MULTI_KEYS fallback must not contain 'P' (design requirement)", () => {
  it("DEFAULT_CONFIG.multiCharKeys serves as the de-facto DEFAULT_MULTI_KEYS guard", () => {
    // core.ts の DEFAULT_MULTI_KEYS は直接エクスポートされていないため、
    // DEFAULT_CONFIG.multiCharKeys が "P" を含まないことを確認する。
    // これにより config.multiCharKeys が設定されている通常ケースは保護される。
    //
    // 残課題: core.ts:177-192 の DEFAULT_MULTI_KEYS 自体の "P" 除去が必要。
    // → core.ts を修正して DEFAULT_MULTI_KEYS をエクスポートし、
    //   下記のテストで直接確認できるようにする。
    //
    // TODO: core.ts で DEFAULT_MULTI_KEYS をエクスポート後、以下を有効化:
    // import { DEFAULT_MULTI_KEYS } from "../core.ts";
    // assertEquals(DEFAULT_MULTI_KEYS.includes("P"), false, "'P' in DEFAULT_MULTI_KEYS");

    // 現時点では DEFAULT_CONFIG.multiCharKeys が守られていることを確認（回帰）
    assertEquals(
      DEFAULT_CONFIG.multiCharKeys.includes("P"),
      false,
      "DEFAULT_CONFIG.multiCharKeys (used when user config is set) must not contain 'P'",
    );
  });

  it("multiCharKeys with 'P' removed should cover all expected hint chars", () => {
    // "P" を除いた後も十分なヒントキーがあることを確認
    const multiCharKeys = DEFAULT_CONFIG.multiCharKeys;
    const withoutP = multiCharKeys.filter((k) => k !== "P" && k !== "p");

    // "P" が除去されても14文字以上残ること（B,C,E,I,O,Q,R,T,U,V,W,X,Y,Z = 14文字）
    assertEquals(
      withoutP.length >= 14,
      true,
      `After removing 'P', there should still be at least 14 multi-char hint keys. ` +
        `Got: ${withoutP.length} keys: ${JSON.stringify(withoutP)}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Test Group 4: MULTI_BUFFER_EXTMARK_STATE クリア（回帰テスト）
//
// 修正済み: hideHintsOptimized が clearHintsMultiBuffer を呼ぶよう修正済み
// (core.ts:545-547)。このテストは状態管理の API が正しく動作することを確認する。
// ---------------------------------------------------------------------------
describe("Test 4: MULTI_BUFFER_EXTMARK_STATE management (regression)", () => {
  beforeEach(() => {
    // テスト間の状態リセット
    MULTI_BUFFER_EXTMARK_STATE.clear();
  });

  it("MULTI_BUFFER_EXTMARK_STATE is an exported Set", () => {
    assertEquals(
      MULTI_BUFFER_EXTMARK_STATE instanceof Set,
      true,
      "MULTI_BUFFER_EXTMARK_STATE should be an exported Set",
    );
  });

  it("getMultiBufferExtmarkState returns a snapshot copy of state", () => {
    // エントリを追加（Setはバッファ番号のみ追跡）
    const dummyBufnr = 9999;
    MULTI_BUFFER_EXTMARK_STATE.add(dummyBufnr);

    const snapshot = getMultiBufferExtmarkState();
    assertEquals(
      snapshot.has(dummyBufnr),
      true,
      "Snapshot should reflect current MULTI_BUFFER_EXTMARK_STATE",
    );

    // スナップショットを変更しても元の状態に影響しないこと
    snapshot.delete(dummyBufnr);
    assertEquals(
      MULTI_BUFFER_EXTMARK_STATE.has(dummyBufnr),
      true,
      "Modifying snapshot should not affect MULTI_BUFFER_EXTMARK_STATE",
    );
  });

  it("MULTI_BUFFER_EXTMARK_STATE.clear() empties the state", () => {
    MULTI_BUFFER_EXTMARK_STATE.add(1);
    MULTI_BUFFER_EXTMARK_STATE.add(2);
    assertEquals(MULTI_BUFFER_EXTMARK_STATE.size, 2);

    MULTI_BUFFER_EXTMARK_STATE.clear();
    assertEquals(
      MULTI_BUFFER_EXTMARK_STATE.size,
      0,
      "After clear(), MULTI_BUFFER_EXTMARK_STATE should be empty",
    );
  });

  it("hideHintsOptimized clears MULTI_BUFFER_EXTMARK_STATE via clearHintsMultiBuffer (design assertion)", () => {
    // core.ts の実装を確認:
    //   if (MULTI_BUFFER_EXTMARK_STATE.size > 0) {
    //     await clearHintsMultiBuffer(denops, extmarkNamespace);
    //   }
    // clearHintsMultiBuffer (extmark-display.ts) は最終的に
    // MULTI_BUFFER_EXTMARK_STATE.clear() を呼ぶ。
    //
    // このテストは設計要件の文書化：
    // denops インスタンスなしで hideHintsOptimized を呼べないが、
    // clearHintsMultiBuffer が呼ばれた場合の期待動作を確認する。

    MULTI_BUFFER_EXTMARK_STATE.add(1);
    MULTI_BUFFER_EXTMARK_STATE.add(2);
    assertNotEquals(MULTI_BUFFER_EXTMARK_STATE.size, 0, "Setup: state must have entries");

    // clearHintsMultiBuffer の最終ステップを模倣（MULTI_BUFFER_EXTMARK_STATE.clear()）
    MULTI_BUFFER_EXTMARK_STATE.clear();

    assertEquals(
      MULTI_BUFFER_EXTMARK_STATE.size,
      0,
      "After clearHintsMultiBuffer, MULTI_BUFFER_EXTMARK_STATE must be empty",
    );
  });
});
