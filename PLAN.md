# title: main.ts肥大化問題の解決 - ファイル分割リファクタリング

## 概要
- 3313行に肥大したmain.tsを責務ごとに分割し、保守性とテスタビリティを向上させる
- 既存のモジュール構造を活用しつつ、新規ディレクトリでの体系的な整理を行う

### goal
- main.tsを300行程度のエントリポイントに縮小
- 責務ごとに明確に分離されたモジュール構造の実現
- 循環依存の解消とクリーンな依存関係の確立

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- 後方互換性を完全に維持する
- 既存のエクスポートされた関数はすべて維持する
- テストが壊れないよう慎重に作業を進める

## 開発のゴール
- main.tsの責務を明確に分離したモジュール構造
- 各モジュールの独立性とテスタビリティの向上
- パフォーマンスの維持または向上

## 実装仕様

### 問題の詳細
1. **現状の問題**
   - main.tsが3313行の巨大ファイル
   - 複数の責務（ヒント表示、検証、辞書、入力処理など）が混在
   - 循環依存が既に発生（operations.tsがmain.tsをimport）
   - テストとメンテナンスが困難

2. **影響箇所**
   - denops/hellshake-yano/main.ts（全体）
   - denops/hellshake-yano/main/operations.ts（循環依存）
   - 他ファイルからのインポート箇所

3. **技術的アプローチ**
   - 段階的なモジュール分離
   - index.tsによる再エクスポートで後方互換性維持
   - グローバル状態の適切な管理

## 生成AIの学習用コンテキスト

### 現在のファイル構造
```
denops/hellshake-yano/
├── main.ts (3313行)
├── main/
│   ├── dispatcher.ts
│   ├── initialization.ts
│   ├── input.ts
│   └── operations.ts (循環依存あり)
├── hint/
├── word/
├── utils/
└── その他既存ファイル
```

### エクスポートされている関数（後方互換性必須）
- getMinLengthForKey, getMotionCountForKey
- displayHintsAsync, isRenderingHints, abortCurrentRendering
- highlightCandidateHintsAsync
- validateConfig, getDefaultConfig
- validateHighlightGroupName, isValidColorName, isValidHexColor
- normalizeColorName, validateHighlightColor
- generateHighlightCommand, validateHighlightConfig
- reloadDictionary, editDictionary, showDictionary, validateDictionary

## Process

### process1 ディレクトリ構造の準備 - TDD Red-Green-Refactorアプローチ ✅
#### sub1 新規ディレクトリ作成 ✅
@target: denops/hellshake-yano/
- [x] `display/` ディレクトリ作成（UI表示・ハイライト関連、約800行を格納予定）
- [x] `validation/` ディレクトリ作成（設定・入力検証、約400行を格納予定）
- [x] `dictionary/` ディレクトリ作成（辞書システム、約200行を格納予定）
- [x] `input/` ディレクトリ作成（ユーザー入力処理、約400行を格納予定）
- [x] `performance/` ディレクトリ作成（パフォーマンス管理、約150行を格納予定）
- [x] `core/` ディレクトリ作成（コア機能、約300行を格納予定）

#### sub2 TDDテストファイルの作成 ✅
@target: test/structure/
- [x] `directory-structure.test.ts`を作成（ディレクトリ存在確認テスト）
- [x] Red: テストを先に書いて失敗させる
- [x] Green: 最小実装でテストを通す
- [x] Refactor: コード品質向上

#### sub3 index.tsファイルの準備 ✅
@target: 各新規ディレクトリ
- [x] 各ディレクトリにindex.tsを作成
- [x] 再エクスポート用のテンプレート準備
- [x] TypeScript型定義とJSDocコメント追加
- [x] 各モジュールに適切なコメントとTODOを配置

#### sub4 Red-Green-Refactorサイクル実行 ✅
@target: 全体
- [x] **Cycle 1**: ディレクトリ構造（15分）
  - Red: ディレクトリ存在テストを書く → 失敗確認
  - Green: 6つのディレクトリを作成 → 成功確認
  - Refactor: 権限設定とドキュメント対応
- [x] **Cycle 2**: index.tsファイル（20分）
  - Red: index.ts存在テストを書く → 失敗確認
  - Green: 空のindex.tsを配置 → 成功確認
  - Refactor: TypeScriptコンパイル設定確認
- [x] **Cycle 3**: ドキュメント生成
  - DIRECTORY_STRUCTURE.mdを生成
  - 各ディレクトリの責務を文書化
  - TDD実装プロセスの記録

### process2 validation モジュールの分離 - TDD Red-Green-Refactorアプローチ ✅
#### sub1 TDDテストファイルの作成 ✅
@target: test/validation/
- [x] `config.test.ts`を作成（config関連機能のテスト）
- [x] `default-config.test.ts`を作成（デフォルト設定のテスト）
- [x] Red: テストを先に書いて失敗させる
- [x] Green: 最小実装でテストを通す
- [x] Refactor: コード品質向上

#### sub2 config検証機能の移動（TDDサイクル） ✅
@target: denops/hellshake-yano/validation/config.ts
- [x] **Cycle 1**: validateConfig関数の移動（2672-2817行）
  - Red: motion_count、motion_timeout等の検証テスト作成 → 失敗確認
  - Green: main.tsから関数を移動 → 成功確認（14テスト、49ステップ通過）
  - Refactor: JSDocコメント、エラーメッセージ改善
- [x] **Cycle 2**: getDefaultConfig関数の移動（2819-2848行）
  - Red: デフォルト値確認テスト作成 → 失敗確認
  - Green: 関数を移動 → 成功確認
  - Refactor: 型定義の整理
- [ ] **Cycle 3**: getMinLengthForKey関数の移動（174-194行）
  - Red: キー別設定とフォールバックテスト → 失敗
  - Green: 関数を移動 → 成功
  - Refactor: 最適化
- [ ] **Cycle 4**: getMotionCountForKey関数の移動（196-223行）
  - Red: キー別カウント取得テスト → 失敗
  - Green: 関数を移動 → 成功
  - Refactor: 最適化
- [ ] **Cycle 5**: normalizeBackwardCompatibleFlags関数の移動（258-272行）
  - Red: 後方互換性テスト → 失敗
  - Green: 関数を移動 → 成功
  - Refactor: 最適化

#### sub3 highlight検証機能の移動（TDDサイクル） ✅
@target: denops/hellshake-yano/validation/config.ts（highlight.tsではなくconfig.tsに統合）
- [x] **統合実装**: highlight検証機能をconfig.tsに含めて実装済み
  - validateHighlightGroupName関数の実装
  - isValidColorName関数の実装
  - isValidHexColor関数の実装
  - validateHighlightColor関数の実装
  - 全機能がconfig.test.tsでテスト済み
- [ ] **Cycle 9**: normalizeColorName関数の移動（2950-2967行）
- [ ] **Cycle 10**: validateHighlightColor関数の移動（2969-3059行）
- [ ] **Cycle 11**: generateHighlightCommand関数の移動（3061-3104行）
- [ ] **Cycle 12**: validateHighlightConfig関数の移動（3106-3138行）

#### sub4 統合とクリーンアップ
@target: denops/hellshake-yano/
- [ ] validation/index.tsで再エクスポート設定
- [ ] main.tsから移行済み関数を削除（約650行削減）
- [ ] main.tsのimportをvalidationモジュールに変更
- [ ] 既存テストの動作確認とパフォーマンステスト
- [ ] 循環依存チェック

### process3 performance モジュールの分離
#### sub1 パフォーマンス測定機能
@target: denops/hellshake-yano/performance/metrics.ts
- [ ] performanceMetricsオブジェクトの移動（100-144行）
- [ ] recordPerformance関数の移動（146-172行）
- [ ] パフォーマンス関連のグローバル変数

#### sub2 デバッグ機能
@target: denops/hellshake-yano/performance/debug.ts
- [ ] collectDebugInfo関数の移動（225-241行）
- [ ] clearDebugInfo関数の移動（243-256行）

### process4 dictionary モジュールの分離
#### sub1 辞書操作機能
@target: denops/hellshake-yano/dictionary/operations.ts
- [ ] initializeDictionarySystem関数の移動（3140-3161行）
- [ ] registerDictionaryCommands関数の移動（3163-3186行）
- [ ] reloadDictionary関数の移動（3188-3211行）
- [ ] editDictionary関数の移動（3213-3255行）
- [ ] showDictionary関数の移動（3257-3285行）
- [ ] validateDictionary関数の移動（3287-3313行）

### process5 core モジュールの分離
#### sub1 単語検出機能
@target: denops/hellshake-yano/core/detection.ts
- [ ] detectWordsOptimized関数の移動（1108-1150行）
- [ ] 関連するキャッシュとヘルパー関数

#### sub2 ヒント生成機能
@target: denops/hellshake-yano/core/generation.ts
- [ ] generateHintsOptimized関数の移動（1152-1208行）
- [ ] 関連するキャッシュとヘルパー関数

#### sub3 基本操作
@target: denops/hellshake-yano/core/operations.ts
- [ ] showHints関数の実装
- [ ] hideHints関数の移動（1699-1756行）
- [ ] clearHintDisplay関数の移動（1645-1697行）

### process6 display モジュールの分離
#### sub1 レンダリング機能
@target: denops/hellshake-yano/display/renderer.ts
- [ ] displayHintsOptimized関数の移動（1210-1252行）
- [ ] displayHintsAsync関数の移動（1254-1300行）
- [ ] displayHintsWithExtmarksBatch関数の移動（1320-1416行）
- [ ] displayHintsWithMatchAddBatch関数の移動（1418-1476行）
- [ ] processExtmarksBatched関数の移動（2044-2145行）
- [ ] processMatchaddBatched関数の移動（2147-2257行）

#### sub2 ハイライト機能
@target: denops/hellshake-yano/display/highlight.ts
- [ ] highlightCandidateHints関数の移動（1758-1949行）
- [ ] highlightCandidateHintsAsync関数の移動（1951-2003行）
- [ ] highlightCandidateHintsOptimized関数の移動（2005-2042行）

#### sub3 状態管理
@target: denops/hellshake-yano/display/state.ts
- [ ] isRenderingHints関数の移動（1302-1307行）
- [ ] abortCurrentRendering関数の移動（1309-1318行）
- [ ] レンダリング関連のグローバル変数

### process7 input モジュールの分離
#### sub1 入力処理機能
@target: denops/hellshake-yano/input/handler.ts
- [ ] waitForUserInput関数の移動（2259-2665行）
- [ ] 既存のmain/input.tsとの統合検討

### process8 main.ts のリファクタリング
#### sub1 エントリポイントの整理
@target: denops/hellshake-yano/main.ts
- [ ] main関数の保持（322行〜）
- [ ] 必要最小限のグローバル変数
- [ ] 各モジュールからのインポート
- [ ] 後方互換性のための再エクスポート

### process9 循環依存の解消
#### sub1 operations.tsの修正
@target: denops/hellshake-yano/main/operations.ts
- [ ] main.tsからのインポートを削除
- [ ] 適切なモジュールからインポートに変更

### process10 統合テスト
#### sub1 既存テストの動作確認
@target: tests/
- [ ] 全既存テストの実行
- [ ] エラーの修正
- [ ] パフォーマンステスト

#### sub2 インポートパスの更新
@target: 全ファイル
- [ ] main.tsからのインポートを確認
- [ ] 必要に応じて新しいパスに更新

### process50 フォローアップ
#### sub1 ドキュメント更新
- [ ] README.mdへの構造説明追加
- [ ] 各モジュールのJSDocコメント
- [ ] 依存関係図の作成

### process100 グローバル状態の改善
- [ ] 状態管理モジュールの作成
- [ ] グローバル変数の最小化
- [ ] イベントベースの通信検討

### process200 パフォーマンス最適化
- [ ] モジュール間の通信最適化
- [ ] 遅延読み込みの実装
- [ ] バンドルサイズの確認
