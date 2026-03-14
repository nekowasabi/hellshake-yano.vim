# hellshake-yano.vim 描画パフォーマンス最適化 実装計画

**作成日**: 2026-03-14
**ステータス**: Phase 1 完了 ✅ / Phase 2 未着手

## 全体方針

- `denops.batch` / `nvim_call_atomic` をコードベースに初導入（現在未使用）
- 段階的に安全導入: Phase 1（低リスク）→ Phase 2（中リスク）→ Phase 3（高リスク）
- 各フェーズは独立してロールバック可能

## Phase 1: 安全基盤（低リスク・即効）

### Task 1-A: setTimeout(1ms) バッチ間遅延の除去
- **ファイル**: `denops/hellshake-yano/neovim/display/extmark-display.ts`
- **修正**: Line 116 の `setTimeout(r, 1)` を `Promise.resolve()` に置換
- **効果**: 150ヒント時の10ms+人工遅延を除去

### Task 1-B: changedtick キャッシュキー追加
- **ファイル**: `denops/hellshake-yano/neovim/core/word.ts`
- **修正**: `generateDetectionCacheKey()` (Line 208-222) に `changedtick` を追加
- **効果**: バッファ変更検出の正確化、古いキャッシュヒットの排除

### Task 1-C: hintConfig メモ化
- **ファイル**: `denops/hellshake-yano/main.ts`
- **修正**: Line 380, 742 の hintConfig 生成を参照同一性チェック付きキャッシュに変更
- **効果**: 呼び出し毎のオブジェクト生成コスト削減

## Phase 2: RPC 並列化（中リスク・高効果）

### Task 2-A: denops.batch ラッパー関数の導入
- **ファイル**: `denops/hellshake-yano/common/utils/batch.ts`（新規）
- **内容**: 型安全な `batchGet<T>()` ラッパー
- **制約**: C1 - コールバック内でawait不可

### Task 2-B: detectWordsWithManager の直列 RPC 並列化
- **ファイル**: `denops/hellshake-yano/neovim/core/word.ts`
- **修正**: Line 224-233 の `bufnr`, `line("w0")`, `line("w$")` を `denops.batch` で1往復に
- **効果**: 3 IPC → 1 IPC
- **依存**: Task 2-A

### Task 2-C: changedtick 統合取得
- **ファイル**: `denops/hellshake-yano/neovim/core/word.ts`
- **修正**: Task 2-B の batch に `changedtick` を追加（4値同時取得）
- **依存**: Task 2-B, Task 1-B

### Task 2-D: displayHintsAutoMultiBuffer の直列チェック並列化
- **ファイル**: `denops/hellshake-yano/neovim/display/extmark-display.ts`
- **修正**: `getpos(".")` + `win_getid()` を `denops.batch` で1往復に
- **効果**: 2 IPC → 1 IPC
- **依存**: Task 2-A

## Phase 3: バルク RPC（高効果・要慎重）

### Task 3-A: nvim_call_atomic ラッパーの導入
- **ファイル**: `denops/hellshake-yano/common/utils/batch.ts`
- **内容**: `callAtomic()` ラッパー（エラーハンドリング付き）
- **制約**: C2 - エラー時途中停止のため事前バリデーション必須

### Task 3-B: 行長バルク取得 ★最大IPC削減
- **ファイル**: `denops/hellshake-yano/neovim/display/extmark-display.ts`
- **修正**: `processExtmarksForBuffer` (Line 417-500) で行毎の `nvim_buf_get_lines` を事前一括取得に
- **効果**: O(N) IPC → O(1) IPC
- **依存**: Task 3-A

### Task 3-C: extmark 設定バルク化 ★★最大インパクト
- **ファイル**: `denops/hellshake-yano/neovim/display/extmark-display.ts`
- **修正**: ヒント毎の `nvim_buf_set_extmark` を `nvim_call_atomic` で一括送信
- **効果**: ヒント50個で50 IPC → 1 IPC（-98%削減）
- **依存**: Task 3-A, Task 3-B（事前バリデーション完了必須）

### Task 3-D: clearHintsMultiBuffer のバルク化
- **ファイル**: `denops/hellshake-yano/neovim/display/extmark-display.ts`
- **修正**: バッファ毎の `bufexists` + `clear_namespace` を batch + atomic に
- **効果**: バッファ数×2 IPC → 2 IPC
- **依存**: Task 3-A, Task 2-A

## 実装順序 DAG

```
Phase 1（並列実行可能）
├── Task 1-A: setTimeout除去
├── Task 1-B: changedtick キャッシュキー
└── Task 1-C: hintConfig メモ化

Phase 2（Task 1 完了後）
├── Task 2-A: denops.batch ラッパー ← 先行
├── Task 2-B: detectWords 並列化 (2-A後)
├── Task 2-C: changedtick 統合 (2-B, 1-B後)
└── Task 2-D: displayHints 並列化 (2-A後)

Phase 3（Task 2-A 完了後）
├── Task 3-A: callAtomic ラッパー ← 先行
├── Task 3-B: 行長バルク取得 (3-A後)
├── Task 3-C: extmark バルク設定 (3-A, 3-B後) ★最優先効果
└── Task 3-D: clearHints バルク化 (3-A, 2-A後)
```

## 実装制約

- **C1**: `denops.batch` コールバック内で await 不可 → スカラー値取得専用
- **C2**: `nvim_call_atomic` エラー時途中停止 → 事前バリデーション必須
- **C3**: `denops#request` → `denops#notify` は fire-and-forget のみ
- **C4**: `denops.batch` / `nvim_call_atomic` はコードベース初導入
- **C5**: 既存 VimScript LRUキャッシュ(TTL:100ms)で50-100倍高速化実績あり

## スコープ外

- `processExtmarksBatched`（シングルバッファ通常パス）の atomic 化: Phase 3完了後に評価
- VimScript 側の追加キャッシュ（L2戦訓パターン）
- Lua ブリッジの導入（過剰設計として却下）
- motion.vim の修正（BN7は誤認: ファイル137行で該当行なし、hint.vim:93は既にdenops#notify使用済み）
- should_redraw IPC除去（意図的設計: redrawタイミング制御のため維持）
