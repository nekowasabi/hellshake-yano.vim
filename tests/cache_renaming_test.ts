/**
 * Cache Renaming Test - TDD Red-Green-Refactor
 * GlobalCacheへの変更に対するテストスイート
 *
 * 実装前にテストを作成し、全てのテストが失敗することを確認した後、
 * 実装を進めて全てのテストが通るようにします。
 */

import {
  assertEquals,
  assertExists,
  assertThrows,
} from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { CacheType } from "../denops/hellshake-yano/common/cache/unified-cache.ts";

// Phase 1 Red: これらのインポートは現在失敗するはずです
// GlobalCacheクラスはまだ存在しないため、エラーが発生します
try {
  // @ts-ignore - 現在は存在しないクラスをインポート
  const { GlobalCache } = await import("../denops/hellshake-yano/cache.ts");
} catch {
  // 現在は期待される失敗です
}

// GlobalCacheを直接インポート
import { GlobalCache } from "../denops/hellshake-yano/common/cache/unified-cache.ts";

Deno.test("TDD Red Phase: GlobalCache class should exist (現在は失敗するはず)", async () => {
  // 現在はGlobalCacheクラスが存在しないため、このテストは失敗します
  try {
    const cacheModule = await import("../denops/hellshake-yano/cache.ts");

    // @ts-ignore - 存在しないプロパティにアクセス
    const GlobalCache = cacheModule.GlobalCache;

    assertExists(GlobalCache, "GlobalCache class should be exported");
    assertEquals(typeof GlobalCache, "function", "GlobalCache should be a constructor function");
  } catch (error) {
    // 現在は期待される失敗
    console.log("Expected failure: GlobalCache class not found:", (error as Error).message);
    throw error; // テストを失敗させる
  }
});

Deno.test("TDD Red Phase: GlobalCache.getInstance() should work (現在は失敗するはず)", async () => {
  try {
    const cacheModule = await import("../denops/hellshake-yano/cache.ts");

    // @ts-ignore - 存在しないプロパティにアクセス
    const GlobalCache = cacheModule.GlobalCache;
    const instance = GlobalCache.getInstance();

    assertExists(instance, "getInstance() should return an instance");
    assertEquals(typeof instance.getCache, "function", "Instance should have getCache method");
  } catch (error) {
    // 現在は期待される失敗
    console.log(
      "Expected failure: GlobalCache.getInstance() not available:",
      (error as Error).message,
    );
    throw error;
  }
});

Deno.test("TDD Red Phase: GlobalCache singleton pattern should be maintained (現在は失敗するはず)", async () => {
  try {
    const cacheModule = await import("../denops/hellshake-yano/cache.ts");

    // @ts-ignore - 存在しないプロパティにアクセス
    const GlobalCache = cacheModule.GlobalCache;
    const instance1 = GlobalCache.getInstance();
    const instance2 = GlobalCache.getInstance();

    assertEquals(instance1, instance2, "getInstance() should return the same instance (singleton)");
  } catch (error) {
    // 現在は期待される失敗
    console.log("Expected failure: GlobalCache singleton test failed:", (error as Error).message);
    throw error;
  }
});

Deno.test("TDD Red Phase: GlobalCache functionality (should now work)", async () => {
  try {
    const cacheModule = await import("../denops/hellshake-yano/cache.ts");

    // @ts-ignore - 存在しないプロパティにアクセス
    const UnifiedCache = cacheModule.UnifiedCache;
    // @ts-ignore - 存在しないプロパティにアクセス
    const GlobalCache = cacheModule.GlobalCache;

    // 後方互換性：UnifiedCacheエイリアスがGlobalCacheを指すことを確認
    assertEquals(UnifiedCache, GlobalCache, "UnifiedCache should be an alias for GlobalCache");

    const instanceViaUnified = UnifiedCache.getInstance();
    const instanceViaGlobal = GlobalCache.getInstance();

    assertEquals(
      instanceViaUnified,
      instanceViaGlobal,
      "Both aliases should return the same instance",
    );
  } catch (error) {
    // 現在は期待される失敗
    console.log("Expected failure: UnifiedCache alias not available:", (error as Error).message);
    throw error;
  }
});

Deno.test("TDD Red Phase: CacheType and other features should work unchanged (現在は失敗するはず)", async () => {
  try {
    const cacheModule = await import("../denops/hellshake-yano/cache.ts");

    // @ts-ignore - 存在しないプロパティにアクセス
    const GlobalCache = cacheModule.GlobalCache;
    const instance = GlobalCache.getInstance();

    // 基本的なキャッシュ機能が変わらず動作することを確認
    const wordsCache = instance.getCache(CacheType.WORDS);
    assertExists(wordsCache, "Should be able to get WORDS cache");

    wordsCache.set("test-key", ["word1", "word2"]);
    const result = wordsCache.get("test-key");
    assertEquals(result, ["word1", "word2"], "Cache should work correctly");

    // 統計情報の取得
    const stats = instance.getAllStats();
    assertExists(stats.WORDS, "Statistics should include WORDS cache");
    assertEquals(stats.WORDS.hits, 1, "Hit count should be 1");

    // キャッシュクリア
    instance.clearAll();
    const afterClear = wordsCache.get("test-key");
    assertEquals(afterClear, undefined, "Cache should be cleared");
  } catch (error) {
    // 現在は期待される失敗
    console.log("Expected failure: Cache functionality test failed:", (error as Error).message);
    throw error;
  }
});

// 現在のGlobalCacheが正常に動作することを確認（基準として）
Deno.test("Current GlobalCache functionality (should pass)", () => {
  const instance = GlobalCache.getInstance();

  // 基本的な機能が動作することを確認
  const wordsCache = instance.getCache(CacheType.WORDS);
  assertExists(wordsCache, "Current GlobalCache should work");

  wordsCache.set("current-test", ["works"]);
  const result = wordsCache.get("current-test");
  assertEquals(result, ["works"], "Current cache functionality should work");

  // クリーンアップ
  instance.clearAll();
});

Deno.test("Validate CacheType enum still works", () => {
  // CacheTypeの列挙型が正常に動作することを確認
  assertEquals(CacheType.WORDS, "WORDS");
  assertEquals(CacheType.HINTS, "HINTS");
  assertEquals(CacheType.DISPLAY, "DISPLAY");

  // 全てのCacheTypeが定義されていることを確認（unified-cache.tsで定義されているもののみ）
  const expectedTypes = [
    "WORDS",
    "HINTS",
    "DISPLAY",
    "ANALYSIS",
    "TEMP",
    "HINT_ASSIGNMENT_NORMAL",
    "HINT_ASSIGNMENT_VISUAL",
    "HINT_ASSIGNMENT_OTHER",
    "WORD_DETECTION",
  ];

  for (const type of expectedTypes) {
    assertExists(CacheType[type as keyof typeof CacheType], `CacheType.${type} should exist`);
  }
});
