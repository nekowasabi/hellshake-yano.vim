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
- ユニットテストは --no-checkを使わず、常に型チェックを通す

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
- [x] **Cycle 3**: getMinLengthForKey関数の移動（174-194行）
  - Red: キー別設定とフォールバックテスト → 失敗確認
  - Green: 関数を移動 → 成功確認
  - Refactor: 最適化完了
- [x] **Cycle 4**: getMotionCountForKey関数の移動（196-223行）
  - Red: キー別カウント取得テスト → 失敗確認
  - Green: 関数を移動 → 成功確認
  - Refactor: 最適化完了
- [x] **Cycle 5**: normalizeBackwardCompatibleFlags関数の移動（258-272行）
  - Red: 後方互換性テスト → 失敗確認
  - Green: 関数を移動 → 成功確認
  - Refactor: 最適化完了

#### sub3 highlight検証機能の移動（TDDサイクル） ✅
@target: denops/hellshake-yano/validation/config.ts（highlight.tsではなくconfig.tsに統合）
- [x] **統合実装**: highlight検証機能をconfig.tsに含めて実装済み
  - validateHighlightGroupName関数の実装
  - isValidColorName関数の実装
  - isValidHexColor関数の実装
  - validateHighlightColor関数の実装
  - 全機能がconfig.test.tsでテスト済み
- [x] **Cycle 9**: normalizeColorName関数の移動（2950-2967行）
- [x] **Cycle 10**: validateHighlightColor関数の移動（2969-3059行）
- [x] **Cycle 11**: generateHighlightCommand関数の移動（3061-3104行）
- [x] **Cycle 12**: validateHighlightConfig関数の移動（3106-3138行）

#### sub4 統合とクリーンアップ ✅
@target: denops/hellshake-yano/
- [x] validation/index.tsで再エクスポート設定
- [x] main.tsから移行済み関数を削除（実装済み）
- [x] main.tsのimportをvalidationモジュールに変更
- [x] 既存テストの動作確認（20テスト、77ステップ成功）
- [x] 循環依存チェック（問題なし）

### process3 performance モジュールの分離 - TDD Red-Green-Refactorアプローチ ✅
#### sub1 TDDテストファイルの作成 ✅
@target: tests/performance/
- [x] `metrics.test.ts`を作成（パフォーマンス測定機能のテスト）
- [x] `debug.test.ts`を作成（デバッグ機能のテスト）
- [x] `integration.test.ts`を作成（統合テスト）
- [x] Red: テストを先に書いて失敗させる
- [x] Green: 最小実装でテストを通す
- [x] Refactor: コード品質向上

#### sub2 パフォーマンス測定機能の移行（TDDサイクル） ✅
@target: denops/hellshake-yano/performance/metrics.ts
- [x] **Cycle 1**: PerformanceMetricsインターフェース定義
  - Red: 型存在テスト作成 → 失敗確認
  - Green: インターフェース定義 → 成功確認（9テスト通過）
  - Refactor: JSDocコメント追加
- [x] **Cycle 2**: performanceMetricsオブジェクトの移動（113-118行から移行）
  - Red: メトリクス格納テスト作成 → 失敗確認
  - Green: グローバル変数と初期化 → 成功確認
  - Refactor: 型安全性の強化
- [x] **Cycle 3**: recordPerformance関数の移動（157-176行から移行）
  - Red: パフォーマンス記録テスト（50件制限含む） → 失敗確認
  - Green: 関数実装（設定注入型） → 成功確認
  - Refactor: エラーハンドリング追加
- [x] **Cycle 4**: getPerformanceMetrics関数の追加
  - Red: メトリクス取得テスト → 失敗確認
  - Green: コピー返却実装 → 成功確認
  - Refactor: ディープコピー最適化
- [x] **Cycle 5**: clearPerformanceMetrics関数の追加
  - Red: クリアテスト → 失敗確認
  - Green: リセット実装 → 成功確認
  - Refactor: 効率的なクリア実装

#### sub3 デバッグ機能の移行（TDDサイクル） ✅
@target: denops/hellshake-yano/performance/debug.ts
- [x] **Cycle 6**: DebugInfoインターフェース定義
  - Red: 型存在テスト → 失敗確認
  - Green: インターフェース定義 → 成功確認（4テスト通過）
  - Refactor: HintMapping、DebugConfig型の整理
- [x] **Cycle 7**: collectDebugInfo関数の移動（185-198行から移行）
  - Red: デバッグ情報収集テスト → 失敗確認
  - Green: 関数実装（引数注入型） → 成功確認
  - Refactor: 依存性の最小化
- [x] **Cycle 8**: clearDebugInfo関数の移動（203-210行から移行）
  - Red: クリアテスト → 失敗確認
  - Green: metrics連携実装 → 成功確認
  - Refactor: メトリクスとの連携最適化

#### sub4 統合とクリーンアップ ✅
@target: denops/hellshake-yano/
- [x] performance/index.tsで再エクスポート設定（完全実装）
- [x] main.tsから移行済み関数を削除（約150行削減）
- [x] main.tsのimportをperformanceモジュールに変更
- [x] 既存テストの動作確認（15テスト全て成功）
- [x] 循環依存チェック（問題なし、一方向依存確立）

#### sub5 技術仕様と品質保証
##### 依存関係の解決策
- **設定注入**: グローバルconfigへの依存を引数として注入
- **純粋関数化**: hintsVisible、currentHintsを外部から渡す
- **一方向依存**: main.ts → performance（逆方向なし）

##### ファイル構造
```
performance/
├── index.ts    # 再エクスポート（エントリポイント）
├── metrics.ts  # パフォーマンス測定（~80行）
└── debug.ts    # デバッグ機能（~40行）
```

##### 品質基準
- 型チェック: `deno test`（--no-check不使用）で全テスト通過
- 後方互換性: 既存の関数シグネチャ完全維持
- パフォーマンス: モジュール分離のオーバーヘッド < 1ms
- テストカバレッジ: 100%達成

##### 予想所要時間
- Cycle 1-5（metrics.ts）: 48分
- Cycle 6-8（debug.ts）: 23分
- 統合とクリーンアップ: 23分
- 既存テスト検証: 15分
- **合計: 約109分**

### process4 dictionary モジュールの分離 - TDD Red-Green-Refactorアプローチ
#### sub1 TDDテストファイルの作成
@target: tests/dictionary/
- [ ] `operations.test.ts`を作成（辞書操作機能のテスト）
- [ ] `commands.test.ts`を作成（コマンド登録のテスト）
- [ ] `integration.test.ts`を作成（統合テスト）
- [ ] Red: テストを先に書いて失敗させる
- [ ] Green: 最小実装でテストを通す
- [ ] Refactor: コード品質向上

#### sub2 辞書システムの初期化機能（TDDサイクル）
@target: denops/hellshake-yano/dictionary/operations.ts
- [ ] **Cycle 1**: グローバル変数の移行
  - Red: dictionaryLoader, vimConfigBridge存在テスト → 失敗確認
  - Green: グローバル変数定義 → 成功確認
  - Refactor: 型定義の整理
- [ ] **Cycle 2**: initializeDictionarySystem関数の移動（2547-2565行）
  - Red: 初期化テスト作成 → 失敗確認
  - Green: 関数実装 → 成功確認（内部関数、非export）
  - Refactor: エラーハンドリング強化
- [ ] **Cycle 3**: registerDictionaryCommands関数の移動（2570-2590行）
  - Red: コマンド登録テスト → 失敗確認
  - Green: 関数実装 → 成功確認（内部関数、非export）
  - Refactor: コマンド名の定数化

#### sub3 辞書操作機能の移行（TDDサイクル）
@target: denops/hellshake-yano/dictionary/operations.ts
- [ ] **Cycle 4**: reloadDictionary関数の移動（2595-2615行）
  - Red: リロードテスト → 失敗確認
  - Green: 関数実装（export） → 成功確認
  - Refactor: 依存性注入の最適化
- [ ] **Cycle 5**: editDictionary関数の移動（2620-2659行）
  - Red: 編集テスト → 失敗確認
  - Green: 関数実装（export） → 成功確認
  - Refactor: テンプレート管理の改善
- [ ] **Cycle 6**: showDictionary関数の移動（2664-2689行）
  - Red: 表示テスト → 失敗確認
  - Green: 関数実装（export） → 成功確認
  - Refactor: バッファ操作の最適化
- [ ] **Cycle 7**: validateDictionary関数の移動（2694-2720行）
  - Red: 検証テスト → 失敗確認
  - Green: 関数実装（export） → 成功確認
  - Refactor: 検証ロジックの拡充

#### sub4 統合とクリーンアップ
@target: denops/hellshake-yano/
- [ ] dictionary/index.tsで再エクスポート設定
- [ ] main.tsから移行済み関数を削除（約180行削減）
- [ ] main.tsのimportを更新
- [ ] 既存テストの動作確認
- [ ] 循環依存チェック

#### sub5 index.ts復旧対策の実装
@target: denops/hellshake-yano/dictionary/
- [ ] index.ts.backupファイルの作成
- [ ] 自動復旧スクリプトの実装
- [ ] テスト時の自動チェック機能
- [ ] validation/とperformance/にも同様の対策適用

#### sub6 技術仕様と品質保証
##### 依存関係
- **DictionaryLoader**: word/dictionary-loader.tsからインポート
- **VimConfigBridge**: word/dictionary-loader.tsからインポート
- **Denops**: 全関数で必須パラメータとして維持

##### ファイル構造
```
dictionary/
├── index.ts        # 再エクスポート（エントリポイント）
├── operations.ts   # 辞書操作関数（約120行）
└── commands.ts     # コマンド登録（約60行）
```

##### 品質基準
- 型チェック: `deno test`（--no-check不使用）で全テスト通過
- 後方互換性: エクスポート関数のシグネチャ完全維持
- テストカバレッジ: 100%達成
- エラーハンドリング: 全関数で適切な例外処理

##### 予想所要時間
- Cycle 1-3（基盤構築）: 40分
- Cycle 4-7（関数移行）: 60分
- 統合とクリーンアップ: 20分
- index.ts復旧対策: 15分
- **合計: 約135分**

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

## 重要な注意事項

### テスト実行に関する注意
- **統合テストの行番号**: main.tsへの変更により、統合テストで参照している行番号の修正が必要になることがある
  - 例: `integration_call_site_test.ts` では実際のコード位置に合わせて行番号範囲の調整が必要
  - validation/index.tsなどのモジュールファイルが外部から変更された場合も影響を受ける可能性がある

- **型チェックの扱い**:
  - リファクタリング中は一時的に `--no-check` オプションを使用してテストを実行することも検討
  - ただし、最終的には型チェックを通すことが必須（CLAUDEルールに従う）
  - 開発中: `deno test --no-check` で素早いフィードバック
  - 最終確認: `deno test` で型安全性を保証
