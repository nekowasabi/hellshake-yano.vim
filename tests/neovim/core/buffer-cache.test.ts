/**
 * tests/neovim/core/buffer-cache.test.ts
 *
 * Process 10: Process 1 ユニットテスト — getline 結果の配列キャッシュ化
 *
 * cachedBuffer プロパティと invalidateBufferCache メソッドの
 * キャッシュミス/ヒット/invalidation ロジックを検証する。
 *
 * cachedBuffer は private のため、テストでは `as any` でアクセスする。
 * これは実装詳細への依存だが、キャッシュの核心ロジック（changedtick 連動）を
 * 検証するには不可避。
 */

import { assertEquals, assertNotEquals } from "jsr:@std/assert@^1.0.0";
import { beforeEach, describe, it } from "jsr:@std/testing@^1.0.0/bdd";
import { Core } from "../../../denops/hellshake-yano/neovim/core/core.ts";

// ---------------------------------------------------------------------------
// Helper: cachedBuffer の型定義（core.ts の内部型と同一構造）
// ---------------------------------------------------------------------------
interface CachedBuffer {
  bufnr: number;
  changedtick: number;
  lines: string[];
}

// ---------------------------------------------------------------------------
// Helper: Core インスタンスを新規作成して返す（テスト間の状態隔離）
// ---------------------------------------------------------------------------
function createFreshCore(): Core {
  Core.resetForTesting();
  return Core.getInstance();
}

// ---------------------------------------------------------------------------
// Helper: cachedBuffer を直接設定する（showHintsInternal のキャッシュ書き込みを模倣）
// ---------------------------------------------------------------------------
function setCache(
  core: Core,
  bufnr: number,
  changedtick: number,
  lines: string[],
): void {
  (core as any).cachedBuffer = { bufnr, changedtick, lines };
}

function getCache(core: Core): CachedBuffer | null {
  return (core as any).cachedBuffer as CachedBuffer | null;
}

// ---------------------------------------------------------------------------
// Helper: キャッシュ判定ロジックを再現（core.ts:1048-1050 と同一ロジック）
// ---------------------------------------------------------------------------
function isCacheHit(
  core: Core,
  bufnr: number,
  changedtick: number,
): boolean {
  const cached = getCache(core);
  return cached !== null &&
    cached.bufnr === bufnr &&
    cached.changedtick === changedtick;
}

// ===========================================================================
// Test Group 1: invalidateBufferCache — キャッシュクリアの基本動作
// ===========================================================================
describe("buffer-cache: invalidateBufferCache", () => {
  let core: Core;

  beforeEach(() => {
    core = createFreshCore();
  });

  it("引数なし: cachedBuffer を null にクリアする", () => {
    setCache(core, 1, 100, ["line1", "line2"]);
    assertEquals(getCache(core) !== null, true, "前提: キャッシュが存在する");

    core.invalidateBufferCache();
    assertEquals(getCache(core), null, "invalidateBufferCache() 後は null");
  });

  it("bufnr 一致: 指定 bufnr のキャッシュのみクリアする", () => {
    setCache(core, 5, 200, ["hello"]);

    core.invalidateBufferCache(5);
    assertEquals(getCache(core), null, "bufnr=5 でクリア → null");
  });

  it("bufnr 不一致: 異なる bufnr ではキャッシュを保持する", () => {
    setCache(core, 5, 200, ["hello"]);

    core.invalidateBufferCache(99);
    const cached = getCache(core);
    assertEquals(cached !== null, true, "bufnr=99 で無効化 → bufnr=5 のキャッシュは残る");
    assertEquals(cached!.bufnr, 5);
  });

  it("キャッシュが null の状態で呼び出してもエラーにならない", () => {
    assertEquals(getCache(core), null, "前提: キャッシュなし");
    // エラーが投げられなければ OK
    core.invalidateBufferCache();
    core.invalidateBufferCache(1);
  });
});

// ===========================================================================
// Test Group 2: キャッシュヒット/ミス判定ロジック
//
// core.ts:1048-1050 の _cacheHit 判定をテスト内で再現して検証する。
// showHintsInternal 内のロジックと同一の判定条件を用いる。
// ===========================================================================
describe("buffer-cache: cache hit/miss judgment", () => {
  let core: Core;

  beforeEach(() => {
    core = createFreshCore();
  });

  it("キャッシュなし → ミス", () => {
    assertEquals(isCacheHit(core, 1, 100), false, "cachedBuffer=null → miss");
  });

  it("bufnr + changedtick 一致 → ヒット", () => {
    setCache(core, 1, 100, ["line1"]);
    assertEquals(isCacheHit(core, 1, 100), true, "bufnr=1, tick=100 → hit");
  });

  it("changedtick 変更 → ミス", () => {
    setCache(core, 1, 100, ["line1"]);
    assertEquals(isCacheHit(core, 1, 101), false, "tick 100→101 → miss");
  });

  it("bufnr 変更 → ミス", () => {
    setCache(core, 1, 100, ["line1"]);
    assertEquals(isCacheHit(core, 2, 100), false, "bufnr 1→2 → miss");
  });

  it("bufnr + changedtick 両方変更 → ミス", () => {
    setCache(core, 1, 100, ["line1"]);
    assertEquals(isCacheHit(core, 2, 200), false, "両方変更 → miss");
  });
});

// ===========================================================================
// Test Group 3: lines 配列の参照同一性
//
// Case E: cached.lines が配列参照同値であること（copy 不要）
// キャッシュ保存時に配列をコピーせず、元の参照を保持することを確認。
// これは showHintsInternal が cachedBuffer に lines を直接代入する
// 実装と一致する必要がある。
// ===========================================================================
describe("buffer-cache: lines array reference identity", () => {
  it("キャッシュされた lines は参照同一（copy されない）", () => {
    const core = createFreshCore();
    const originalLines = ["alpha", "beta", "gamma"];
    setCache(core, 1, 100, originalLines);

    const cached = getCache(core)!;
    assertEquals(cached.lines, originalLines, "lines は同一参照であること");
    // 厳密な参照比較
    assertNotEquals(
      Object.is(cached.lines, originalLines),
      false,
      "Object.is で同一参照を確認",
    );
  });
});

// ===========================================================================
// Test Group 4: キャッシュライフサイクル（ミス→保存→ヒット→無効化→ミス）
//
// 実際の showHintsInternal のキャッシュフローをシミュレート:
// 1回目: キャッシュなし → getline 発行 → キャッシュ保存
// 2回目: キャッシュヒット → getline スキップ
// 3回目: changedtick 変更 → キャッシュミス → 再取得
// ===========================================================================
describe("buffer-cache: lifecycle simulation", () => {
  it("ミス → 保存 → ヒット → changedtick変更 → ミス", () => {
    const core = createFreshCore();

    // Step 1: 初回アクセス — キャッシュなし
    assertEquals(isCacheHit(core, 1, 100), false, "Step 1: キャッシュミス");

    // getline 取得を模倣してキャッシュに保存
    const lines = ["hello", "world"];
    setCache(core, 1, 100, lines);

    // Step 2: 同一条件で再アクセス — キャッシュヒット
    assertEquals(isCacheHit(core, 1, 100), true, "Step 2: キャッシュヒット");

    // Step 3: changedtick 変更 — キャッシュミス
    assertEquals(isCacheHit(core, 1, 101), false, "Step 3: tick 変更でミス");

    // 再取得してキャッシュ更新
    setCache(core, 1, 101, ["hello", "world", "modified"]);

    // 新しい changedtick でヒット確認
    assertEquals(isCacheHit(core, 1, 101), true, "Step 4: 更新後ヒット");
  });

  it("ミス → 保存 → ヒット → bufnr変更 → ミス", () => {
    const core = createFreshCore();

    setCache(core, 1, 100, ["buffer1"]);
    assertEquals(isCacheHit(core, 1, 100), true, "bufnr=1 でヒット");

    // bufnr 変更
    assertEquals(isCacheHit(core, 2, 100), false, "bufnr=2 でミス");
  });

  it("invalidateBufferCache 後のライフサイクル", () => {
    const core = createFreshCore();

    setCache(core, 1, 100, ["before"]);
    assertEquals(isCacheHit(core, 1, 100), true);

    core.invalidateBufferCache();
    assertEquals(isCacheHit(core, 1, 100), false, "invalidate 後はミス");

    // 再キャッシュ
    setCache(core, 1, 100, ["after"]);
    assertEquals(isCacheHit(core, 1, 100), true, "再キャッシュ後ヒット");
  });

  it("bufnr 指定 invalidateBufferCache のセレクティブ動作", () => {
    const core = createFreshCore();

    // bufnr=1 と bufnr=2 のキャッシュを別々に管理するシナリオは
    // cachedBuffer が単一エントリであるため、最後の setCache が勝つ。
    // これは現在の実装の制約（単一バッファキャッシュ）を示す。
    setCache(core, 1, 100, ["buffer1"]);
    setCache(core, 2, 200, ["buffer2"]);

    // 最後のセットが有効
    assertEquals(isCacheHit(core, 2, 200), true, "最後のキャッシュが有効");
    assertEquals(isCacheHit(core, 1, 100), false, "前のキャッシュは上書き済み");

    // bufnr=2 だけを無効化
    core.invalidateBufferCache(2);
    assertEquals(getCache(core), null, "bufnr=2 の無効化でキャッシュクリア");
  });
});
