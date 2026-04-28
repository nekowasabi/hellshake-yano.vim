# hints表示繰り返しによる描画低下の調査報告

## 症状

- nvimを開いたまま、あるいは大きいファイルでヒントを何度も表示させると描画が遅くなる
- nvim再起動で一時的に解消される
- メモリは十分に確保されている

## 調査内容

### 観測された蓄積箇所

| # | 変数/状態                        | ファイル:行             | 上限           | クリーンアップ                       | 影響                |
| - | -------------------------------- | ----------------------- | -------------- | ------------------------------------ | ------------------- |
| 1 | `pluginState.performanceMetrics` | `core.ts:260-265`       | **なし**       | **未実施** (cleanupPluginに含まれず) | 中                  |
| 2 | `Core.performanceMetrics`        | `core.ts:370-375`       | 50 (slice -50) | `clearDebugInfo()`                   | 低                  |
| 3 | `performance.ts` 配列            | `performance.ts:43-51`  | 50 (shift)     | `resetPerformanceMetrics()`          | 低                  |
| 4 | GlobalCache LRU (全種)           | `unified-cache.ts`      | 50-2000        | 各clear()                            | **なし**            |
| 5 | `adjacencyCache`                 | `hint.ts:649`           | 200 (LRU)      | 自動evict                            | **なし**            |
| 6 | `CHAR_WIDTH_CACHE`               | `hint.ts:32`            | 500 (LRU)      | 自動evict                            | **なし**            |
| 7 | Neovim extmark 内部状態          | Neovim C実装 (MarkTree) | 可変           | clear_namespaceで削除                | **未確定 (要実測)** |

### 観測点1: pluginState.performanceMetrics の潜在的リーク (debug 経路)

**ファイル**: `core.ts:260-265`, `core.ts:4001-4006` **問題**:
`pluginState.performanceMetrics`の配列(`showHints`, `hideHints`, `wordDetection`,
`hintGeneration`)に上限がなく、`cleanupPlugin()` (core.ts:285-292) でもクリアされない。 ただし
`Core.recordPerformance()` (core.ts:1221) は別配列に **50件上限** で記録するため、肥大化しない。
無制限に push される経路は `recordPerformanceMetric` 系 (core.ts:498, core.ts:4001) のみで、Grep
の限り通常経路 (`showHintsInternal`) からは呼ばれていない。
よって本観測点は「描画低下の主要因」ではなく、「未使用または debug
経路でのみ発生し得る潜在的リーク」と位置づける。

```typescript
// core.ts:285 — cleanupPlugin、performanceMetricsをクリアしていない
function cleanupPlugin(denops: Denops): Promise<void> {
  pluginState.status = "cleaned";
  pluginState.initialized = false;
  pluginState.hintsVisible = false;
  pluginState.caches.words.clear();
  pluginState.caches.hints.clear();
  // ← performanceMetrics.clear() が欠落
  return Promise.resolve();
}
```

### 仮説: Neovim extmark まわりの劣化 (要実測)

大ファイルでヒント表示を繰り返すと:

1. `hideHintsOptimized` (core.ts:574) → `nvim_buf_clear_namespace`
2. `displayHintsWithExtmarksBatch` (core.ts:839) → `callAtomic` で 200 件単位のバッチ呼び出し
   (core.ts:846, 928)
3. これを毎回繰り返す

Neovim の extmark は MarkTree (tree 系データ構造) で管理されるため、当初想定した「flat array +
free-list
断片化」モデルは成立しない。再起動で解消する現象の説明としては、以下を並列に計測候補として挙げる:

- バッファ内 extmark 総数の累積
- `nvim__redraw` / 描画コスト
- word detection のキャッシュヒット率
- callAtomic バッチサイズ超過時のフォールバック

加えて、`hideHintsOptimized` の catch ブロックが空 (core.ts:593)
でエラーを握り潰しているため、実際の失敗が観測できていない可能性がある。

```typescript
} catch (error) {
  // ← 空！エラーログすらない
}
```

### 安全な箇所 (蓄積しない設計)

- `Core.recordPerformance()` (core.ts:1221-1231) → `performanceLog` guard + slice(-50) cap
- `performance.ts` の `performanceMetrics` → shift() で50上限
- GlobalCache の LRU 全種 → maxSize で保護
- `ExtmarkDisplayAdapter` (extmark-display-adapter.ts) → hideAll() で hints/extmarkIds をクリア
- `PopupDisplayAdapter` (popup-display.ts) → hideAll() で popupIds をクリア
- `MULTI_BUFFER_EXTMARK_STATE` (extmark-display.ts:338) → clearHintsMultiBuffer でクリア
- `MotionManager.counters` (core.ts:104) → reset/resetCounter でクリア

## 修正提案

> **進捗**: 修正提案 1 / 2 / 3 はすべて 2026-04-28 の OODA サイクルで実装済み。 詳細は `PLAN.md`
> (Progress Map 13/13 completed) と `plan/process-*.md` を参照。 後段「## Instrumentation 使用手順
> (Process 200 追記)」に debug 出力の読み方を記載。

### 1. cleanupPluginにperformanceMetricsクリアを追加 (debug 経路の念のため対策)

**core.ts:285-292**

> ✅ 実装済み (Process 01)
>
> - 適用箇所: `denops/hellshake-yano/neovim/core/core.ts` `cleanupPlugin()` 内
> - 4 配列 (showHints/hideHints/wordDetection/hintGeneration) を空配列に再代入
> - 連続失敗カウンタ `extmarkClearErrorCount` のリセットも同関数内で実施 (Process 03 と整合)
> - テスト: `tests/cleanup_plugin_test.ts` `[REGRESSION] cleanupPlugin clears performanceMetrics`

```typescript
function cleanupPlugin(denops: Denops): Promise<void> {
  pluginState.status = "cleaned";
  pluginState.initialized = false;
  pluginState.hintsVisible = false;
  pluginState.caches.words.clear();
  pluginState.caches.hints.clear();
  pluginState.performanceMetrics = {
    showHints: [],
    hideHints: [],
    wordDetection: [],
    hintGeneration: [],
  };
  return Promise.resolve();
}
```

### 2. hideHintsOptimizedの空catchにログ出力追加

**core.ts:592-593**

`hideHintsOptimized` は hot path のため、`console.warn`
直接呼び出しは連続失敗時にログが氾濫する恐れがある。core.ts:7 で import 済みの `logMessage`
(logger.ts:92) を使うこと。`logMessage` のシグネチャは
`(level: LogLevel, context: string, message: string)` のため引数順に注意する。

```typescript
} catch (error) {
  logMessage("ERROR", "hellshake-yano", `Failed to clear extmarks: ${String(error)}`);
}
```

ERROR レベルは debug flag に依存せず常時出力されるため、hot path
で連続失敗が起きるとログが氾濫する。連続失敗カウンタで間引くか、初回のみ出して以降は抑制する設計が望ましい。

> ✅ 実装済み (Process 02 + 03)
>
> - Process 02: nvim path の空 catch を `logMessage("ERROR", "hellshake-yano", ...)` に置換
> - Process 03: モジュールスコープに `let extmarkClearErrorCount = 0` と
>   `const EXTMARK_ERROR_LOG_INTERVAL = 100` を導入
> - ロジック: `count === 1 || count % 100 === 0` のときのみ logMessage を発火
> - cleanupPlugin で counter を 0 リセット (再 initialize 後の初回失敗を確実に観測)
> - テスト: `tests/hide_hints_error_logging_test.ts`
>   (初回出力検証)、`tests/error_throttling_test.ts` (200 回連続失敗で 3 回のみ + cleanup リセット)

### 3. 描画劣化の実測手順を先行実施

namespace 定期再作成案は、`nvim_create_namespace(name)` が同名で既存 id を返す idempotent API
である以上、別名化しなければ効果がなく、別名化すると namespace 自体が増加するリスクがある
(core.ts:64 で `EXTMARK_NAMESPACE = "hellshake_yano_hints"`
固定)。先に修正に着手するのではなく、以下を計測する:

- show/hide サイクル数とバッファ内 extmark 総数の推移
- `displayHintsWithExtmarksBatch` の所要時間 (callAtomic 呼び出し回数 × バッチ実行時間)
- `nvim_buf_clear_namespace` のタイミングと所要時間
- Neovim バージョン (extmark 実装はバージョン依存)

> ✅ 実装済み (Process 04 / 05 / 06)
>
> - Process 04: `displayHintsWithExtmarksBatch` 全体所要時間を `performance.now()` で計測
> - Process 05: callAtomic 呼び出し回数 (`batchCount`) と総 extmark 数 (`totalMarks`)
>   を呼び出し側でラップ計測
> - Process 06: `nvim_buf_clear_namespace` 前後の所要時間を計測
> - 共通設計: `getDebugMode()` を関数冒頭で 1 回だけ評価。debugMode=false 時は `performance.now()`
>   呼び出し含めゼロコスト (early evaluate)
> - 出力先: `logMessage("DEBUG", "hellshake-yano:perf", ...)`
> - テスト: `tests/display_hints_timing_test.ts`、`tests/clear_namespace_timing_test.ts`

## Instrumentation 使用手順 (Process 200 追記)

### debugMode の有効化

`init.vim` または `init.lua` に以下を追加:

```vim
let g:hellshake_yano = {'debugMode': v:true}
" 任意: ファイル追跡用
let g:hellshake_yano = extend(g:hellshake_yano, {'debugLogFile': expand('~/hellshake-yano-debug.log')})
```

### 観測される DEBUG ログ形式

| ログ行                                                                                                   | 意味                                                                      | 出所            |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------- |
| `[DEBUG] [hellshake-yano:perf] displayHintsWithExtmarksBatch: 12.34ms, batches=3, marks=512`             | 全体描画 1 サイクルの所要時間とバッチ統計                                 | Process 04 / 05 |
| `[DEBUG] [hellshake-yano:perf] displayHintsWithExtmarksBatch: 0.05ms, batches=0, marks=0 (early-return)` | hints 0 件 / signal abort で早期終了                                      | Process 04      |
| `[DEBUG] [hellshake-yano:perf] displayHintsWithExtmarksBatch: 8.90ms, batches=1, marks=200 (aborted)`    | バッチ途中で signal abort                                                 | Process 04 / 05 |
| `[DEBUG] [hellshake-yano:perf] displayHintsWithExtmarksBatch: 14.50ms, batches=2, marks=300 (fallback)`  | callAtomic 失敗 → sequential fallback 経路                                | Process 04 / 05 |
| `[DEBUG] [hellshake-yano:perf] clearNamespace: 0.12ms`                                                   | hideHints 時の `nvim_buf_clear_namespace` 所要時間                        | Process 06      |
| `[ERROR] [hellshake-yano] Failed to clear extmarks: <error>`                                             | nvim_buf_clear_namespace 失敗 (debug 無効でも常時出力 / 100 回ごと間引き) | Process 02 / 03 |

### show/hide 100 サイクル後の所要時間増加チェック手順

1. Neovim を起動して `:HellshakeYano` 等で初回ヒント表示
2. 上記 debugMode 設定で `g:hellshake_yano.debugLogFile` を有効化
3. 同一バッファで show / hide を 100 回繰り返す（`hjkl` 系 motion で自動的に show 発火）
4. ログから `displayHintsWithExtmarksBatch: Xms` の `X` 値の時系列変化を抽出
   (`grep -oE "displayHintsWithExtmarksBatch: [0-9.]+ms"`)
5. `clearNamespace: Xms` も同様に抽出
6. 線形劣化 / 急激劣化 / 横ばいのいずれかを判定し、Process 300 振り返りに反映

## 今後の確認事項

- `performanceLog`が有効になっているか（core.ts:1226の`this.config.performanceLog`）
- 実際のextmark数とサイクル数
- Neovimバージョン（extmark実装はバージョンによって異なる）

---

# Cycle 3 観測結果 (2026-04-28 15:52)

## 仮説検証結果

| 仮説                            | 結果        | 実測根拠                                                       |
| ------------------------------- | ----------- | -------------------------------------------------------------- |
| extmark 描画劣化                | ❌ **反証** | `displayHintsWithExtmarksBatch` 0.78-26.67ms (線形、想定内)    |
| `nvim_buf_clear_namespace` 劣化 | ❌ **反証** | `clearNamespace` 0.12-4.27ms (想定内)                          |
| 真因は別箇所 (getline/RPC)      | ✅ **支持** | `Timing/getline` elapsed=890ms / 901ms / 819ms (lineCount≈45k) |

## 新発見

### Finding 1: getline ボトルネック (最高優先)

- 45k+ 行バッファで `nvim_buf_get_lines` (RPC + serialize) が ~900ms
- show 1 サイクルあたり 1 回 (cacheHit=false) のため、subjective slowdown の主因
- 対策候補: viewport 限定 / キャッシュ invalidation 戦略の見直し

### Finding 2: multi-buffer extmark 座標オーバーフロー (中優先)

- `processExtmarksForBuffer` (extmark-display.ts:513) で `Invalid 'col'/'line': out of range`
- multi-buffer (buffer 4, 5) で 3 回観測、single-buffer では未発生
- 対策候補: 投入前 line/col クランプ + set_extmark 失敗用 throttling

### Finding 3: dictionary pattern wordFoundCount=0 (低優先)

- `matchCount=32 wordFoundCount=0` (2 patterns)
- col base (0/1) または bytes/chars 不一致が候補
- 別 PLAN として分離推奨

## Next Cycle

詳細は `PLAN-followup-cycle3.md` を参照。優先度順:

1. RC-1 (getline) → Process 03/04
2. RC-2 (multi-buffer) → Process 01/02
3. RC-3 (dictionary) → 別 PLAN 起票検討
