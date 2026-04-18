# Threshold Validation Testing Guide

## 概要

このディレクトリには、hellshake-yano.vimプラグインの日本語分かち書き機能における閾値設定（`japaneseMergeThreshold`と`segmenterThreshold`）の検証用ファイルが含まれています。

TDD（Test-Driven Development）Red-Green-Refactorアプローチに従って作成されています。

## ディレクトリ構造

```
threshold-validation/
├── README.md                           # このファイル
├── test-schema.json                    # テストケースのJSONスキーマ定義
├── test-cases-aggressive.json          # アグレッシブ設定のテストケース
├── test-cases-balanced.json            # バランス設定のテストケース（デフォルト）
├── test-cases-precise.json             # 精密設定のテストケース
├── test-cases-matrix.json              # 全組み合わせのマトリックステスト
├── validation-results.md               # 検証結果記録用テンプレート
├── test-samples.txt                    # テスト用日本語サンプルテキスト
└── configs/                            # Vim設定ファイル
    ├── aggressive.vim                  # (5, 2) アグレッシブマージング設定
    ├── balanced.vim                    # (2, 4) バランス設定（推奨デフォルト）
    ├── precise.vim                     # (1, 6) 精密境界設定
    └── matrix-test.vim                 # 全組み合わせテスト用スクリプト
```

## 閾値パラメータの説明

### japaneseMergeThreshold（日本語マージ閾値）

**範囲**: 1～5 **デフォルト**: 2

助詞や助動詞を前の単語と結合する際の最大文字数。

- **1**: 最小マージ（ほぼ形態素単位）
- **2**: 適度なマージ（推奨デフォルト）
- **3-4**: 積極的なマージ
- **5**: 最大マージ（最もスムーズなナビゲーション）

**例**: 「私は学校に行きます」

- `threshold=1`: 私｜は｜学校｜に｜行｜き｜ます
- `threshold=2`: 私｜は｜学校｜に｜行きます
- `threshold=5`: 私は｜学校に｜行きます

### segmenterThreshold（セグメンター閾値）

**範囲**: 2～6 **デフォルト**: 4

TinySegmenter（日本語形態素解析）を有効にする最小文字数。

- **2**: 常に使用（2文字以上の単語で有効）
- **4**: バランス（推奨デフォルト）
- **6**: まれに使用（長い単語のみ）

**例**:

- `threshold=2`: 「私は」でもセグメンター起動
- `threshold=4`: 「プログラミング」で起動
- `threshold=6`: 「データベース」で起動

## 推奨設定プロファイル

### 1. アグレッシブ（Aggressive）- 読書向け

```vim
let g:hellshake_yano_japanese_merge_threshold = 5
let g:hellshake_yano_segmenter_threshold = 2
```

**特徴**:

- 最大限のマージ
- 常にセグメンター使用
- 最もスムーズなナビゲーション

**適用場面**:

- 小説や記事の読書
- 長文の閲覧
- 自然な読み流し

### 2. バランス（Balanced）- 汎用デフォルト ⭐推奨

```vim
let g:hellshake_yano_japanese_merge_threshold = 2
let g:hellshake_yano_segmenter_threshold = 4
```

**特徴**:

- 適度なマージ
- 選択的なセグメンター使用
- 精度とスムーズさのバランス

**適用場面**:

- 一般的な日本語編集
- 技術文書
- コードコメント
- ほとんどのユーザーに推奨

### 3. 精密（Precise）- 編集向け

```vim
let g:hellshake_yano_japanese_merge_threshold = 1
let g:hellshake_yano_segmenter_threshold = 6
```

**特徴**:

- 最小マージ
- セグメンターを控えめに使用
- 最も精密な単語境界

**適用場面**:

- 形態素レベルの編集
- 言語学的分析
- 文法学習
- 細かいテキスト操作

## テスト実行手順

### クイックテスト

1. **設定ファイルを読み込む**
   ```vim
   :source tests/threshold-validation/configs/balanced.vim
   ```

2. **テストサンプルを開く**
   ```vim
   :e tests/threshold-validation/test-samples.txt
   ```

3. **単語移動を試す**
   - `w`: 次の単語へ
   - `b`: 前の単語へ
   - `e`: 単語の終わりへ

4. **結果を記録**
   - どの位置で止まったかを確認
   - `validation-results.md`に記録

### 網羅的テスト

全ての組み合わせを系統的にテストする場合:

```vim
:source tests/threshold-validation/configs/matrix-test.vim
:call TestQuickConfigurations()
```

または全組み合わせ（5×5=25通り）:

```vim
:call TestAllThresholdCombinations()
```

## 評価基準

### 1. ナビゲーションスムーズさ（Navigation Smoothness）

**スケール**: 1（ぎこちない） ～ 5（滑らか）

単語間の移動が自然で、意図した場所にジャンプできるか。

### 2. 単語境界精度（Word Boundary Accuracy）

**スケール**: 1（不正確） ～ 5（完璧）

期待される単語の区切り位置と実際の区切りが一致するか。

### 3. 期待との一致性（Consistency with Expectations）

**スケール**: 1（予想外） ～ 5（直感的）

ユーザーの期待通りの動作をするか。

## よくある組み合わせ

### 推奨される設定マトリックス

| Use Case         | japaneseMergeThreshold | segmenterThreshold | 特徴         |
| ---------------- | :--------------------: | :----------------: | ------------ |
| **読書**         |           5            |         2          | 最大スムーズ |
| **汎用（推奨）** |           2            |         4          | バランス ⭐  |
| **技術文書**     |           3            |         3          | 中程度       |
| **精密編集**     |           1            |         6          | 最高精度     |
| **コード編集**   |           2            |         5          | やや精密     |

### テスト推奨の組み合わせ

以下の組み合わせを優先的にテストすることを推奨:

1. **(2, 4)** - デフォルト
2. **(5, 2)** - 最大スムーズ
3. **(1, 6)** - 最大精度
4. **(3, 3)** - 中間値
5. **(4, 3)** - やや積極的

## カスタマイズガイドライン

### 単語ジャンプが大きすぎる場合

```vim
" japaneseMergeThreshold を下げる
let g:hellshake_yano_japanese_merge_threshold = 1  " または 2
```

### 単語ジャンプが細かすぎる場合

```vim
" japaneseMergeThreshold を上げる
let g:hellshake_yano_japanese_merge_threshold = 4  " または 5
```

### 短い単語の認識精度を上げたい場合

```vim
" segmenterThreshold を下げる
let g:hellshake_yano_segmenter_threshold = 2  " または 3
```

### パフォーマンスを優先したい場合

```vim
" segmenterThreshold を上げる（セグメンターの使用頻度を下げる）
let g:hellshake_yano_segmenter_threshold = 5  " または 6
```

## テスト結果の記録

`validation-results.md`テンプレートを使用して、以下の情報を記録してください:

1. **環境情報**
   - 実行日時
   - Vimバージョン
   - プラグインバージョン

2. **各設定の結果**
   - テストケースごとの期待値と実測値
   - 一致/不一致の判定
   - 気付いた点

3. **主観評価**
   - ナビゲーションスムーズさ
   - 単語境界精度
   - 期待との一致性
   - 推奨ユースケース

4. **総合推奨**
   - 用途別の最適設定
   - 発見した問題点
   - 改善提案

## トラブルシューティング

### 設定が反映されない

```vim
" プラグインの再読み込み
:call denops#notify('hellshake-yano', 'reload', [])
```

### 期待通りに動作しない

1. 他の設定との競合を確認
2. `g:hellshake_yano_use_japanese = 1`が設定されているか確認
3. `g:hellshake_yano_enable_tiny_segmenter = 1`が設定されているか確認

### デバッグモード

```vim
let g:hellshake_yano_debug_mode = 1
```

## 次のステップ

テスト完了後:

1. **結果を共有**: `validation-results.md`をプロジェクトに報告
2. **ドキュメント更新**: 最適設定をREADMEに反映
3. **プリセット追加**: 推奨設定をプラグインに組み込む
4. **設定ウィザード検討**: ユーザーフレンドリーな設定支援ツールの開発

## 参考リンク

- [PLAN.md](../../PLAN.md) - プロジェクト全体の計画
- [config.ts](../../denops/hellshake-yano/config.ts) - 設定の型定義
- [word.ts](../../denops/hellshake-yano/word.ts) - 単語検出ロジック

## ライセンス

このテストスイートはhellshake-yano.vimプラグインと同じライセンスの下で提供されます。
