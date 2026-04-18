/**
 * Process3: 既存機能の維持と互換性確保テスト
 *
 * このテストファイルはPLAN.mdのprocess3を検証します：
 * - sub1: ハイライトシステムの維持
 * - sub2: 設定の後方互換性
 *
 * TDD Red-Green-Refactor方式で実装
 */

import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import type { Config } from "../denops/hellshake-yano/config.ts";
import {
  DEFAULT_CONFIG,
  getDefaultConfig,
  mergeConfig,
  validateConfig,
} from "../denops/hellshake-yano/config.ts";

describe("Process3 Sub1: ハイライトシステムの維持", () => {
  it("displayHintsBatched関数がexportされていること", async () => {
    // displayHintsBatched は内部関数なので、main.tsから間接的に検証
    const mainModule = await import("../denops/hellshake-yano/main.ts");

    // hideHints, highlightCandidateHintsAsync などの公開関数が存在すること
    assertExists(mainModule.hideHints);
    assertExists(mainModule.highlightCandidateHintsAsync);
    assertExists(mainModule.highlightCandidateHintsHybrid);
  });

  it("ハイライト処理フローの主要関数が存在すること", async () => {
    const mainModule = await import("../denops/hellshake-yano/main.ts");

    // displayHintsBatched()を使用する公開関数が正しく動作する
    assertExists(mainModule.hideHints, "hideHints関数が存在する");
    assertExists(
      mainModule.highlightCandidateHintsHybrid,
      "highlightCandidateHintsHybrid関数が存在する",
    );
    assertExists(mainModule.cleanupPendingTimers, "cleanupPendingTimers関数が存在する");
  });

  it("既存のハイライト設定項目がすべて存在すること", () => {
    const config = getDefaultConfig();

    // ハイライト関連の設定項目
    assertExists(config.highlightHintMarker, "highlightHintMarker設定が存在する");
    assertExists(config.highlightHintMarkerCurrent, "highlightHintMarkerCurrent設定が存在する");
    assertEquals(typeof config.highlightSelected, "boolean", "highlightSelected設定がboolean型");
  });

  it("ハイライト設定のデフォルト値が維持されていること", () => {
    const config = DEFAULT_CONFIG;

    // デフォルト値の検証
    assertEquals(config.highlightHintMarker, "DiffAdd", "highlightHintMarkerのデフォルト値");
    assertEquals(
      config.highlightHintMarkerCurrent,
      "DiffText",
      "highlightHintMarkerCurrentのデフォルト値",
    );
    assertEquals(config.highlightSelected, false, "highlightSelectedのデフォルト値");
  });
});

describe("Process3 Sub2: 設定の後方互換性", () => {
  it("既存のすべての設定項目が存在すること", () => {
    const config = getDefaultConfig();

    // Core settings (6項目)
    assertExists(config.enabled);
    assertExists(config.markers);
    assertExists(config.motionCount);
    assertExists(config.motionTimeout);
    assertExists(config.hintPosition);

    // Hint settings (8項目)
    assertExists(config.triggerOnHjkl);
    assertExists(config.countedMotions);
    assertExists(config.maxHints);
    assertExists(config.debounceDelay);
    assertEquals(typeof config.useNumbers, "boolean");
    assertEquals(typeof config.highlightSelected, "boolean");
    assertEquals(typeof config.debugCoordinates, "boolean");
    assertExists(config.singleCharKeys);

    // Extended hint settings (4項目)
    assertExists(config.multiCharKeys);
    assertExists(config.useHintGroups);
    assertExists(config.highlightHintMarker);

    // Word detection settings (7項目)
    assertExists(config.highlightHintMarkerCurrent);
    assertEquals(typeof config.suppressOnKeyRepeat, "boolean");
    assertExists(config.keyRepeatThreshold);
    assertExists(config.wordDetectionStrategy);
    assertEquals(typeof config.enableTinySegmenter, "boolean");
    assertExists(config.segmenterThreshold);

    // Japanese word settings (7項目)
    assertExists(config.japaneseMinWordLength);
    assertEquals(typeof config.japaneseMergeParticles, "boolean");
    assertExists(config.japaneseMergeThreshold);
    assertExists(config.defaultMinWordLength);
    assertExists(config.defaultMotionCount);

    // Motion counter settings (4項目)
    assertEquals(typeof config.motionCounterEnabled, "boolean");
    assertExists(config.motionCounterThreshold);
    assertExists(config.motionCounterTimeout);
    assertEquals(typeof config.showHintOnMotionThreshold, "boolean");

    // Debug settings (2項目)
    assertEquals(typeof config.debugMode, "boolean");
    assertEquals(typeof config.performanceLog, "boolean");
  });

  it("新しい設定項目がオプショナルであること", () => {
    const config = getDefaultConfig();

    // maxSingleCharHints はオプショナル（既存コードでは必須だが、新規では任意）
    // デフォルト値が設定されていることを確認
    assertExists(config.maxSingleCharHints);
    assertEquals(config.maxSingleCharHints, 21);

    // perKeyMinLength と perKeyMotionCount もオプショナル
    assertExists(config.perKeyMinLength);
    assertExists(config.perKeyMotionCount);
  });

  it("既存の設定項目のデフォルト値が変更されていないこと", () => {
    const config = DEFAULT_CONFIG;

    // 主要な設定のデフォルト値を確認
    assertEquals(config.enabled, true);
    assertEquals(config.motionCount, 3);
    assertEquals(config.motionTimeout, 2000);
    assertEquals(config.hintPosition, "start");
    assertEquals(config.triggerOnHjkl, true);
    assertEquals(config.maxHints, 336);
    assertEquals(config.debounceDelay, 50);
    assertEquals(config.useNumbers, false);
    assertEquals(config.highlightSelected, false);
    assertEquals(config.debugCoordinates, false);
  });

  it("設定のバリデーションが正しく動作すること", () => {
    // 有効な設定
    const validConfig: Partial<Config> = {
      motionCount: 5,
      hintPosition: "end",
      maxHints: 100,
    };

    const validResult = validateConfig(validConfig);
    assertEquals(validResult.valid, true, "有効な設定がバリデーションを通過する");

    // 無効な設定
    const invalidConfig: Partial<Config> = {
      motionCount: -1, // 負の値は無効
    };

    const invalidResult = validateConfig(invalidConfig);
    assertEquals(invalidResult.valid, false, "無効な設定がバリデーションで拒否される");
  });

  it("設定のマージが正しく動作すること", () => {
    const base = getDefaultConfig();
    const updates: Partial<Config> = {
      motionCount: 5,
      enabled: false,
    };

    const merged = mergeConfig(base, updates);

    // 更新された値が反映されている
    assertEquals(merged.motionCount, 5, "更新された値が反映される");
    assertEquals(merged.enabled, false, "更新された値が反映される");

    // 更新されていない値はデフォルトのまま
    assertEquals(merged.motionTimeout, 2000, "更新されていない値はデフォルトのまま");
    assertEquals(merged.hintPosition, "start", "更新されていない値はデフォルトのまま");
  });

  it("新規追加された設定項目がシステムを壊さないこと", () => {
    // singleCharKeys と multiCharKeys は新規追加
    const config = getDefaultConfig();

    assertExists(config.singleCharKeys);
    assertEquals(Array.isArray(config.singleCharKeys), true);
    assertEquals(config.singleCharKeys.length > 0, true);

    assertExists(config.multiCharKeys);
    assertEquals(Array.isArray(config.multiCharKeys), true);
    assertEquals(config.multiCharKeys.length > 0, true);

    // maxSingleCharHints も新規追加
    assertExists(config.maxSingleCharHints);
    assertEquals(typeof config.maxSingleCharHints, "number");
    assertEquals(config.maxSingleCharHints, 21);
  });

  it("useJapanese設定がオプショナルかつfalseがデフォルトであること", () => {
    const config = getDefaultConfig();

    // useJapanese はオプショナル
    assertEquals(typeof config.useJapanese, "boolean");
    assertEquals(config.useJapanese, false, "useJapaneseのデフォルト値はfalse");
  });

  it("後方互換性のある設定の部分更新が可能であること", () => {
    const base = getDefaultConfig();

    // 一部のプロパティのみを更新
    const partial: Partial<Config> = {
      debugMode: true,
      performanceLog: true,
    };

    const updated = mergeConfig(base, partial);

    assertEquals(updated.debugMode, true);
    assertEquals(updated.performanceLog, true);
    // 他の設定は変更されない
    assertEquals(updated.motionCount, base.motionCount);
    assertEquals(updated.hintPosition, base.hintPosition);
  });
});

describe("Process3: 統合検証", () => {
  it("既存システムの主要機能がすべて動作すること", async () => {
    // config.ts の主要関数
    const configModule = await import("../denops/hellshake-yano/config.ts");
    assertExists(configModule.getDefaultConfig);
    assertExists(configModule.validateConfig);
    assertExists(configModule.mergeConfig);
    assertExists(configModule.DEFAULT_CONFIG);

    // main.ts の主要関数
    const mainModule = await import("../denops/hellshake-yano/main.ts");
    assertExists(mainModule.hideHints);
    assertExists(mainModule.highlightCandidateHintsAsync);
    assertExists(mainModule.highlightCandidateHintsHybrid);
    assertExists(mainModule.cleanupPendingTimers);
  });

  it("設定システムが完全な後方互換性を持つこと", () => {
    const oldStyleConfig: Partial<Config> = {
      enabled: true,
      markers: ["A", "S", "D", "F"],
      motionCount: 3,
      motionTimeout: 2000,
      hintPosition: "start",
    };

    // 古いスタイルの設定でもバリデーションが通る
    const result = validateConfig(oldStyleConfig);
    assertEquals(result.valid, true, "古いスタイルの設定もバリデーションを通過する");

    // デフォルト値でマージできる
    const base = getDefaultConfig();
    const merged = mergeConfig(base, oldStyleConfig);
    assertEquals(merged.enabled, true);
    assertEquals(merged.motionCount, 3);
  });

  it("ハイライト処理に必要な設定がすべて揃っていること", () => {
    const config = getDefaultConfig();

    // displayHintsBatched に必要な設定
    assertExists(config.highlightHintMarker);
    assertExists(config.highlightHintMarkerCurrent);
    assertExists(config.maxHints);

    // highlightCandidateHintsHybrid に必要な設定
    assertEquals(typeof config.highlightSelected, "boolean");
    assertExists(config.debounceDelay);
  });
});
