# 閾値設定クイックリファレンス

## 🚀 3つの推奨プロファイル

### 📖 読書モード（Aggressive）

最もスムーズな読み体験

```vim
let g:hellshake_yano_japanese_merge_threshold = 5
let g:hellshake_yano_segmenter_threshold = 2
```

**こんな人におすすめ:**

- 長文を読むことが多い
- 小説や記事をVimで読む
- 単語単位より文節単位で移動したい

---

### ⚖️ バランスモード（Balanced）⭐ デフォルト推奨

汎用的でバランスの取れた設定

```vim
let g:hellshake_yano_japanese_merge_threshold = 2
let g:hellshake_yano_segmenter_threshold = 4
```

**こんな人におすすめ:**

- 一般的な日本語編集
- 技術文書やドキュメント作成
- 迷ったらこれ！

---

### 🎯 精密モード（Precise）

最も正確な単語境界

```vim
let g:hellshake_yano_japanese_merge_threshold = 1
let g:hellshake_yano_segmenter_threshold = 6
```

**こんな人におすすめ:**

- 形態素レベルで編集したい
- 文法や言語学習
- 細かいテキスト操作

---

## 📊 設定値の意味

### japaneseMergeThreshold（1～5）

助詞や助動詞をどれだけ結合するか

```
1 ─────────────────────> 5
細かく分割              大きく結合
私｜は｜学校｜に        私は｜学校に
```

### segmenterThreshold（2～6）

TinySegmenterをどれだけ使うか

```
2 ─────────────────────> 6
常に使用                まれに使用
短い単語も解析          長い単語のみ解析
```

---

## 🎨 用途別推奨設定

| 用途            | Merge | Segment | 特徴        |
| --------------- | :---: | :-----: | ----------- |
| 📖 **読書**     |   5   |    2    | スムーズ    |
| 📝 **一般編集** |   2   |    4    | バランス ⭐ |
| 💻 **コード**   |   2   |    5    | やや精密    |
| 📄 **技術文書** |   3   |    3    | 中間        |
| 🔬 **精密編集** |   1   |    6    | 最高精度    |

---

## ⚙️ 完全な設定例

### 基本設定セット

すべてのモードで共通の推奨設定:

```vim
" 日本語サポートを有効化
let g:hellshake_yano_use_japanese = 1
let g:hellshake_yano_enable_tiny_segmenter = 1
let g:hellshake_yano_word_detection_strategy = 'hybrid'
let g:hellshake_yano_japanese_merge_particles = 1

" ここに好みのプロファイルを追加
" 例: バランスモード（デフォルト）
let g:hellshake_yano_japanese_merge_threshold = 2
let g:hellshake_yano_segmenter_threshold = 4
```

---

## 🔧 カスタマイズヒント

### 問題: ジャンプが大きすぎる

```vim
" → Merge閾値を下げる
let g:hellshake_yano_japanese_merge_threshold = 1
```

### 問題: ジャンプが細かすぎる

```vim
" → Merge閾値を上げる
let g:hellshake_yano_japanese_merge_threshold = 4
```

### 問題: 短い単語の認識が悪い

```vim
" → Segment閾値を下げる
let g:hellshake_yano_segmenter_threshold = 2
```

### 問題: 動作が重い

```vim
" → Segment閾値を上げる（セグメンター使用を減らす）
let g:hellshake_yano_segmenter_threshold = 6
```

---

## 🧪 テスト方法

### 1. 設定を読み込む

```vim
:source tests/threshold-validation/configs/balanced.vim
```

### 2. サンプルテキストを開く

```vim
:e tests/threshold-validation/test-samples.txt
```

### 3. 単語移動を試す

- `w` - 次の単語へ
- `b` - 前の単語へ
- `e` - 単語の終わりへ

### 4. 自分に合った設定を見つける

気に入った設定を`.vimrc`または`init.vim`に追加！

---

## 📝 実際の動作例

### テキスト: 「私は学校に行きます」

| 設定     | Merge | Segment | 結果                           |
| -------- | :---: | :-----: | ------------------------------ |
| 精密     |   1   |    6    | 私｜は｜学校｜に｜行｜き｜ます |
| バランス |   2   |    4    | 私｜は｜学校｜に｜行きます     |
| 読書     |   5   |    2    | 私は｜学校に｜行きます         |

### テキスト: 「これはテストです」

| 設定     | Merge | Segment | 結果                   |
| -------- | :---: | :-----: | ---------------------- |
| 精密     |   1   |    6    | これ｜は｜テスト｜です |
| バランス |   2   |    4    | これ｜は｜テスト｜です |
| 読書     |   5   |    2    | これは｜テストです     |

---

## 🎓 理解を深める

### Merge閾値の仕組み

助詞や助動詞の文字数が閾値以下なら前の単語に結合:

- `は` (1文字): 閾値1以上で結合
- `です` (2文字): 閾値2以上で結合
- `ました` (3文字): 閾値3以上で結合

### Segment閾値の仕組み

単語の文字数が閾値以上ならTinySegmenterを使用:

- `私` (1文字): 閾値1以下なら使用
- `プログラミング` (7文字): すべての閾値で使用
- `本を` (2文字): 閾値2以下なら使用

---

## 🌟 まとめ

**迷ったら**: バランスモード (2, 4) を使おう ⭐

**細かく編集**: 精密モード (1, 6) を試そう 🎯

**スムーズに読む**: 読書モード (5, 2) を試そう 📖

---

## 📚 詳細情報

より詳しい情報は以下を参照:

- [README.md](./README.md) - 完全なテストガイド
- [validation-results.md](./validation-results.md) - テスト結果テンプレート
- [PLAN.md](../../PLAN.md) - プロジェクト全体の計画
