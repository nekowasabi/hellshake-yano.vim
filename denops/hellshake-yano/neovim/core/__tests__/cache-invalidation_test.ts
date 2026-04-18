/**
 * cache-invalidation_test.ts
 *
 * Core.invalidateBufferCache() の単体テスト。
 * TextChanged/TextChangedI/BufLeave autocmd 経由で呼ばれる
 * キャッシュ invalidation ロジックを検証する。
 */

import { assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { Core } from "../core.ts";

/**
 * テストヘルパー: private cachedBuffer へのアクセス
 * テストコードからのみ使用する型アサーション
 */
interface CachedBuffer {
  bufnr: number;
  changedtick: number;
  lines: string[];
}

function getCachedBuffer(core: Core): CachedBuffer | null {
  return (core as unknown as { cachedBuffer: CachedBuffer | null }).cachedBuffer;
}

function setCachedBuffer(
  core: Core,
  value: CachedBuffer | null,
): void {
  (core as unknown as { cachedBuffer: CachedBuffer | null }).cachedBuffer = value;
}

// 各テスト前に cachedBuffer をリセットするためのヘルパー
function resetCache(core: Core): void {
  core.invalidateBufferCache();
}

// -----------------------------------------------------------------------------

Deno.test("invalidateBufferCache(): 引数なしで cachedBuffer が null になる", () => {
  const core = Core.getInstance();
  resetCache(core);

  // キャッシュをセット
  setCachedBuffer(core, { bufnr: 1, changedtick: 0, lines: ["hello"] });
  assertEquals(getCachedBuffer(core) !== null, true, "前提: キャッシュがセットされている");

  // 引数なしで invalidate
  core.invalidateBufferCache();

  assertEquals(getCachedBuffer(core), null, "cachedBuffer が null になること");
});

Deno.test("invalidateBufferCache(bufnr): 一致する bufnr のキャッシュが null になる", () => {
  const core = Core.getInstance();
  resetCache(core);

  // bufnr=5 のキャッシュをセット
  setCachedBuffer(core, { bufnr: 5, changedtick: 3, lines: ["line1", "line2"] });
  assertEquals(getCachedBuffer(core)?.bufnr, 5, "前提: bufnr=5 のキャッシュ");

  // bufnr=5 で invalidate
  core.invalidateBufferCache(5);

  assertEquals(getCachedBuffer(core), null, "一致する bufnr のキャッシュが null になること");
});

Deno.test("invalidateBufferCache(bufnr): 異なる bufnr ではキャッシュが保持される", () => {
  const core = Core.getInstance();
  resetCache(core);

  // bufnr=3 のキャッシュをセット
  setCachedBuffer(core, { bufnr: 3, changedtick: 1, lines: ["foo"] });

  // 異なる bufnr=99 で invalidate
  core.invalidateBufferCache(99);

  const cached = getCachedBuffer(core);
  assertEquals(cached !== null, true, "異なる bufnr ではキャッシュが保持されること");
  assertEquals(cached!.bufnr, 3, "キャッシュの bufnr が変わっていないこと");
});

Deno.test("invalidateBufferCache(): キャッシュが既に null の場合でもエラーにならない", () => {
  const core = Core.getInstance();
  resetCache(core);

  assertEquals(getCachedBuffer(core), null, "前提: キャッシュは null");

  // 既に null の状態で invalidate しても例外が出ないこと
  let threw = false;
  try {
    core.invalidateBufferCache();
  } catch {
    threw = true;
  }
  assertEquals(threw, false, "エラーが発生しないこと");
  assertEquals(getCachedBuffer(core), null, "キャッシュは null のまま");
});

Deno.test("invalidateBufferCache(bufnr): 連続 invalidate 後の状態が正しい", () => {
  const core = Core.getInstance();
  resetCache(core);

  // bufnr=10 をセット
  setCachedBuffer(core, { bufnr: 10, changedtick: 0, lines: ["a"] });

  // 異なる bufnr で複数回 invalidate
  core.invalidateBufferCache(1);
  core.invalidateBufferCache(2);
  core.invalidateBufferCache(3);

  let cached = getCachedBuffer(core);
  assertEquals(cached !== null, true, "異なる bufnr ではキャッシュが保持される");
  assertEquals(cached!.bufnr, 10, "bufnr が 10 のまま");

  // 同じ bufnr で invalidate
  core.invalidateBufferCache(10);
  cached = getCachedBuffer(core);
  assertEquals(cached, null, "一致する bufnr で invalidate すると null になる");

  // 再度セットして、引数なしで完全クリア
  setCachedBuffer(core, { bufnr: 20, changedtick: 0, lines: ["b"] });
  core.invalidateBufferCache();
  assertEquals(getCachedBuffer(core), null, "引数なしで完全クリアされる");
});

Deno.test("invalidateBufferCache(bufnr): undefined を明示的に渡すと全クリアされる", () => {
  const core = Core.getInstance();
  resetCache(core);

  setCachedBuffer(core, { bufnr: 7, changedtick: 2, lines: ["x", "y"] });

  // undefined を明示的に渡す → 引数なしと同じ挙動
  core.invalidateBufferCache(undefined);

  assertEquals(getCachedBuffer(core), null, "undefined 渡しで全クリアされること");
});
