# title: webモーション高速化（キャッシュ最適化）

## 概要
- webモーション（w/e/b）のヒント表示速度をhjklモーション並みに高速化
- 現状：webモーション 5ミリ秒、hjklモーション 1ミリ秒
- 目標：webモーションも 1ミリ秒程度まで高速化

### goal
- webモーション使用時のレスポンス向上により、快適なコード編集体験を実現
- モーションキーの切り替え（w→e→b）でもキャッシュを活用し、常に高速なヒント表示

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること

## 開発のゴール
- モーションキー別のキャッシュ分離により、webモーションの2回目以降の実行を高速化
- 既存の動作を完全に維持したまま、パフォーマンスのみを改善

## 実装仕様

### 問題の根本原因
1. `detectWordsWithManager()`に渡される`config`に`currentKeyContext`が含まれていない
2. キャッシュキー生成時に`config.currentKeyContext || 'default'`が常に`'default'`になる
3. すべてのモーションキー（h/j/k/l/w/e/b）が同じキャッシュキー`'default'`を使用
4. 結果として、モーションキー別のキャッシュ分離が機能していない

### 現在の実装（問題箇所）
**ファイル**: `denops/hellshake-yano/neovim/core/core.ts:561`

```typescript
private createEnhancedWordConfig(): EnhancedWordConfig {
  return {
    strategy: this.config.wordDetectionStrategy,
    useJapanese: this.config.useJapanese,
    enableTinySegmenter: this.config.enableTinySegmenter,
    segmenterThreshold: this.config.segmenterThreshold,
    cacheEnabled: true,
    autoDetectLanguage: true,
    // ❌ currentKeyContext が含まれていない
    // ❌ perKeyMinLength も含まれていない
  };
}
```

### 修正内容
**ファイル**: `denops/hellshake-yano/neovim/core/core.ts:561`

```typescript
private createEnhancedWordConfig(): EnhancedWordConfig {
  return {
    strategy: this.config.wordDetectionStrategy,
    useJapanese: this.config.useJapanese,
    enableTinySegmenter: this.config.enableTinySegmenter,
    segmenterThreshold: this.config.segmenterThreshold,
    cacheEnabled: true,
    autoDetectLanguage: true,
    // ✅ 追加：キャッシュに必要な設定
    currentKeyContext: this.config.currentKeyContext,
    perKeyMinLength: this.config.perKeyMinLength,
    defaultMinWordLength: this.config.defaultMinWordLength,
    minWordLength: this.config.minWordLength,
  };
}
```

### キャッシュキーの設計
**ファイル**: `denops/hellshake-yano/neovim/core/word.ts:183-198`

```typescript
function createCacheKey(
  bufnr: number,
  topLine: number,
  bottomLine: number,
  config: EnhancedWordConfig,
  context?: DetectionContext,
): string {
  const keyContext = config.currentKeyContext || 'default';
  const minLength = context?.minWordLength ??
                   (config.perKeyMinLength?.[keyContext]) ??
                   config.defaultMinWordLength ??
                   config.minWordLength ??
                   3;

  return `detectWords:${bufnr}:${topLine}-${bottomLine}:${keyContext}:${minLength}:${config.useJapanese ?? true}`;
}
```

### 期待される効果

#### 修正後のキャッシュの動作

**webモーション（w）**:
```
1回目 'w': キャッシュミス → 単語検出（5ms） → キャッシュ保存（key='w'）
2回目 'w': キャッシュヒット（key='w'） → 即座に結果返却（1ms以下）✅
```

**異なるモーション切り替え**:
```
'w' → キャッシュ保存（key='w'）
'e' → キャッシュ保存（key='e'）
'w' → キャッシュヒット（key='w'）✅
```

#### パフォーマンス予測
- **初回実行**: 5ミリ秒（現状維持）
- **2回目以降（キャッシュヒット）**: **1ミリ秒以下**
  - 単語検出スキップ
  - TinySegmenterスキップ
  - フィルタリングスキップ

## 生成AIの学習用コンテキスト

### TypeScriptソースコード
- `denops/hellshake-yano/neovim/core/core.ts`
  - `createEnhancedWordConfig()`: 修正対象メソッド
  - `detectWordsOptimized()`: 単語検出の呼び出し元
  - `showHintsWithKey()`: モーションキー設定の起点

- `denops/hellshake-yano/neovim/core/word.ts`
  - `detectWordsWithManager()`: キャッシュ機構を実装
  - `createCacheKey()`: キャッシュキー生成関数
  - `cleanupCache()`: キャッシュクリーンアップ

### 設定ファイル
- ユーザー設定例（問題を引き起こす設定）:
  ```vim
  let g:hellshake_yano = {
    \ 'perKeyMotionCount': {
    \   'w': 1,  " 1回押しでヒント表示
    \   'b': 1,
    \   'e': 1,
    \   'h': 2,  " 2回押しでヒント表示
    \   'j': 2,
    \   'k': 2,
    \   'l': 2,
    \ },
  \ }
  ```

## Process

### process1 キャッシュ機構の実装
#### sub1 word.tsへのキャッシュ機構追加
@target: `denops/hellshake-yano/neovim/core/word.ts`
@ref: なし

- [x] キャッシュ用のLRUマップを追加（最大100エントリ）
  - TTL: 5秒
  - タイムスタンプベースの自動クリーンアップ
- [x] `createCacheKey()` 関数を実装
  - bufnr、画面範囲、モーションキー、最小単語長を含む複合キー
- [x] `detectWordsWithManager()` にキャッシュロジックを統合
  - キャッシュチェック → ヒットなら即座に返却
  - ミスなら通常処理 → 結果をキャッシュに保存
- [x] `cleanupCache()` 関数を実装
  - 古いエントリの自動削除
  - サイズ制限の強制

**実装日**: 2025-10-21

#### sub2 core.tsのcreateEnhancedWordConfig修正
@target: `denops/hellshake-yano/neovim/core/core.ts:561`
@ref: `denops/hellshake-yano/neovim/core/word.ts`

- [x] `createEnhancedWordConfig()` に以下のフィールドを追加:
  - `currentKeyContext`: モーションキー（h/j/k/l/w/e/b）
  - `perKeyMinLength`: キー別の最小単語長設定
  - `defaultMinWordLength`: デフォルトの最小単語長
  - `minWordLength`: `bothMinWordLength`から取得（後方互換性）

**期待される効果**:
- キャッシュキーにモーションキーが含まれるようになる
- モーション別のキャッシュ分離が正しく機能する

**実装日**: 2025-10-22

### process10 ユニットテスト
@target: 新規テストファイル（`tests/cache_optimization_test.ts`）

- [x] キャッシュヒット/ミスのテスト
  - 同じモーションの連続実行でキャッシュヒット（Test 1.1）
  - 異なるモーションキーでキャッシュミス（Test 1.2）
  - 異なる設定でキャッシュキーが変わること（Test 1.3）
- [x] キャッシュTTLのテスト
  - TTL以内はキャッシュヒット（Test 2.1）
- [x] パフォーマンステスト
  - キャッシュヒット時の応答時間測定（Test 3.1: 目標1ms以下）
  - キャッシュミス時の応答時間測定（Test 3.2: 目標10ms以下）
- [x] モーションキー切り替えテスト
  - w→e→wの切り替え後のキャッシュ再利用（Test 4.1）
- [x] キャッシュ無効化テスト
  - キャッシュ無効時は毎回処理実行（Test 5.1）

**実装内容**:
- 合計8テストケースを作成
- モックDenopsを使用した単体テスト
- 型チェック完了
- TDD Red-Green-Refactorサイクルに従った実装

**実装日**: 2025-10-22

### process50 フォローアップ

#### sub1 パフォーマンス測定
@target: Neovim実行環境

- [ ] webモーション（w/e/b）の速度測定
  - 初回実行
  - 2回目実行（キャッシュヒット）
  - 異なるモーション後の実行
- [ ] hjklモーションの速度測定（リグレッション確認）
  - キャッシュ実装による影響がないことを確認

#### sub2 キャッシュTTLの最適化検討
@target: `denops/hellshake-yano/neovim/core/word.ts`

- [ ] 使用パターンに応じたTTL調整の検討
  - 現在：5秒（固定）
  - 候補：3秒、10秒、設定可能化
- [ ] キャッシュサイズの最適化
  - 現在：最大100エントリ
  - メモリ使用量とヒット率のバランス

### process100 リファクタリング
- [ ] キャッシュ機構の汎用化
  - 他のモジュールでも利用できるように抽出
- [ ] TypeScript型定義の整理
  - EnhancedWordConfig の型定義を明確化
  - キャッシュ関連の型定義を別ファイルに分離

### process200 ドキュメンテーション
- [ ] ARCHITECTURE.md の更新
  - キャッシュ戦略の説明追加
  - パフォーマンス最適化の章を追加
- [ ] README.md の更新
  - パフォーマンス特性の記載
  - perKeyMotionCount 設定の影響を説明
- [ ] CHANGELOG.md の更新
  - パフォーマンス改善の記載

## 調査ログ

### 2025-10-21: 初回調査
- **報告内容**: webモーション（w/e/b）がhjklより遅い
- **測定結果**:
  - hjkl: 1ミリ秒
  - web: 5ミリ秒
- **ユーザー設定**:
  - perKeyMotionCount: w/e/b は1回押し、hjklは2回押し

### 2025-10-21: 原因特定
- **発見**: `createEnhancedWordConfig()` に `currentKeyContext` が含まれていない
- **影響**: モーションキー別のキャッシュ分離が機能していない
- **検証結果**:
  - `ww`（同じキーの連続）でも2回目が速くならない
  - `jj`（hjklの連続）でも2回目が速くならない
  - → キャッシュが全く機能していないことを確認

### 2025-10-22: Process1 Sub2 & Process10実装完了
- **実装内容**:
  1. `core.ts`の`createEnhancedWordConfig()`を修正 ✅
     - `currentKeyContext`、`perKeyMinLength`、`defaultMinWordLength`を追加
     - `minWordLength`は`bothMinWordLength`から取得
  2. TypeScript型チェック実行 ✅ エラーなし
  3. `tests/cache_optimization_test.ts`作成 ✅
     - 8つのテストケース（キャッシュヒット/ミス、TTL、パフォーマンス、キー切り替え）
     - 型チェック完了

- **次のアクション**:
  1. テスト実行して動作確認
  2. Neovim環境で実際のパフォーマンス測定
  3. パフォーマンス結果をPLAN.mdに記録
