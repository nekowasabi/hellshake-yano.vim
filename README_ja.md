# hellshake-yano.vim

シームレスな単語ベースのカーソル移動を実現する Neovim/Vim プラグイン

## 概要

hellshake-yano.vim は、単語間のカーソル移動を滑らかにする Neovim/Vim プラグインです。UTF-8 を完全にサポートし、日本語テキストでも英語と同じ感覚で単語単位の移動ができます。

### 実装

現在は以下の実装を提供しています:

- **Denops 版** (Neovim + Denops): TypeScript で実装されたフル機能版

### デモ

**カーソル移動**

![move-hint](https://github.com/nekowasabi/gif/blob/master/hellshake-yano/move-hint.gif?raw=true)

**ビジュアル選択**

![visual-hint](https://github.com/nekowasabi/gif/blob/master/hellshake-yano/visual-hint.gif?raw=true)

## 特徴

- **シームレスなカーソル移動**: h, j, k, l, w, b, e といった標準モーションで単語間ジャンプ
- **混在テキスト対応**: 日本語と英語が混ざったテキストでも正しく動作
- **精度のカスタマイズ**: ユースケースに応じて単語検出アルゴリズムを調整可能
- **ビジュアルモード最適化**: 自然な単語選択を実現するヒント配置
- **辞書システム**: 日本語分かち書きを改善する組み込み・ユーザー辞書をサポート
- **連続ヒントループ**: ジャンプ後に自動で再センタリングと再描画を行うオプション

## インストール

### vim-plug を使用

```vim
Plug 'nekowasabi/hellshake-yano.vim'
```

### lazy.nvim を使用

```lua
{
  'nekowasabi/hellshake-yano.vim',
  config = function()
    -- 設定をここに追加
  end
}
```

## Denops 版 (フル機能実装)

### 必須要件

- Neovim もしくは Vim 8.2+
- Deno ランタイム
- Denops runtime: https://github.com/vim-denops/denops.vim

**denops.vim のインストール例:**

vim-plug を使用:
```vim
Plug 'vim-denops/denops.vim'
Plug 'nekowasabi/hellshake-yano.vim'
```

lazy.nvim を使用:
```lua
{
  'vim-denops/denops.vim',
  lazy = false,
},
{
  'nekowasabi/hellshake-yano.vim',
  dependencies = { 'vim-denops/denops.vim' },
  config = function()
    -- 設定をここに追加
  end
}
```

## 設定

プラグインは `g:hellshake_yano` 辞書で設定します。主なオプションは以下の通りです。

### 設定オプション

| オプション | 型 | 既定値 | 説明 |
| ----------- | --- | ------- | ---- |
| `markers` | array | A-Z split | ヒントとして使用する文字の配列 |
| `motionCount` | number | 3 | ヒント表示までのモーション回数 (レガシ設定) |
| `defaultMotionCount` | number | undefined | 個別指定がないキーの既定モーション回数 |
| `perKeyMotionCount` | dict | {} | キー別モーション回数設定 |
| `motionTimeout` | number | 2000 | モーションカウントのタイムアウト (ミリ秒) |
| `hintPosition` | string | 'start' | ヒントを表示する位置 ('start'/'end'/'both') |
| `triggerOnHjkl` | boolean | v:true | hjkl 移動でもモーションをカウントするか |
| `countedMotions` | array | [] | 追跡するカスタムモーションキー (triggerOnHjkl を上書き) |
| `enabled` | boolean | v:true | プラグインの有効/無効 |
| `singleCharKeys` | array | ASDFGHJKLNM0-9 | 単一文字ヒントに使うキー (記号対応) |
| `multiCharKeys` | array | BCEIOPQRTUVWXYZ | 複数文字ヒントに使うキー |
| `cancelKeys` | array | [] | ヒント表示中に通常のキー入力へ戻すキャンセルキー (文字は大文字に正規化され、Enter は `"\r"` で指定)。単語ヒントと重複すると警告が出るので避けてください。 |
| `useHintGroups` | boolean | v:true | ヒントグループ機能を有効化 |
| `useNumbers` | boolean | v:true | ヒントに数字キーを含めるか |
| `directionalHintFilter` | boolean | v:false | j/k 操作時に進行方向のヒントのみを表示 |
| `useNumericMultiCharHints` | boolean | v:false | 2 桁数値ヒント (01-99, 00) を有効化 |
| `maxSingleCharHints` | number | - | 単一文字ヒント数の上限 (任意) |
| `useJapanese` | boolean | v:true | 日本語の単語検出を有効化 |
| `highlightHintMarker` | string/dict | 'DiffAdd' | ヒントのハイライト設定 |
| `highlightHintMarkerCurrent` | string/dict | 'DiffText' | 現在選択中ヒントのハイライト |
| `suppressOnKeyRepeat` | boolean | v:true | キーリピート中はヒントを抑制 |
| `keyRepeatThreshold` | number | 50 | キーリピート判定のしきい値 (ms) |
| `keyRepeatResetDelay` | number | 300 | キーリピートリセットまでの遅延 (ms) |
| `perKeyMinLength` | dict | {} | キー別の最小単語長設定 |
| `defaultMinWordLength` | number | 2 | 既定の最小単語長 |
| `bothMinWordLength` | number | 5 | `hintPosition='both'` 時に両端ヒントを出す最小単語長 |
| `segmenterThreshold` | number | 4 | TinySegmenter を使う最小文字数 (camelCase) |
| `japaneseMergeThreshold` | number | 2 | 助詞を結合する最大文字数 (camelCase) |
| `debugMode` | boolean | v:false | デバッグモードを有効化 |
| `performanceLog` | boolean | v:false | パフォーマンスログを有効化 |
| `continuousHintMode` | boolean | v:false | ヒントの連続ループモードを有効化 |
| `recenterCommand` | string | "normal! zz" | 連続モード中に再センターするコマンド |
| `maxContinuousJumps` | number | 50 | 連続ジャンプの安全上限回数 |

### cancelKeys

`cancelKeys` で指定したキーをヒント表示中に押すと、ヒントを閉じて同じキーを `feedkeys()` で送り返し、通常入力として処理できます。たとえば Enter (`"\r"`) と `i` をキャンセルキーにすると、以下のように設定できます:

```vim
let g:hellshake_yano.cancelKeys = ["\r", "i"]
```

この設定なら挿入モードへ移る `i` や Enter がヒントレイヤーを抜けてそのまま動作します。`cancelKeys` の文字キーは大文字に正規化され、`singleCharKeys`/`multiCharKeys` と重複すると警告が出るので、衝突するキーは避けてください。

### 設定例

標準的な設定:
```vim
let g:hellshake_yano = {
      \ 'useJapanese': v:false,
      \ 'useHintGroups': v:true,
      \ 'highlightSelected': v:true,
      \ 'useNumericMultiCharHints': v:true,
      \ 'enableTinySegmenter': v:false,
      \ 'singleCharKeys': 'ASDFGNM@;,.',
      \ 'multiCharKeys': 'BCEIOPQRTUVWXYZ',
      \ 'highlightHintMarker': {'bg': 'black', 'fg': '#57FD14'},
      \ 'highlightHintMarkerCurrent': {'bg': 'Red', 'fg': 'White'},
      \ 'perKeyMinLength': {
      \   'w': 3,
      \   'b': 3,
      \   'e': 3,
      \ },
      \ 'defaultMinWordLength': 3,
      \ 'perKeyMotionCount': {
      \   'w': 1,
      \   'b': 1,
      \   'e': 1,
      \   'h': 2,
      \   'j': 2,
      \   'k': 2,
      \   'l': 2,
      \ },
      \ 'motionCount': 3,
      \ 'japaneseMinWordLength': 3,
      \ 'segmenterThreshold': 4,
      \ 'japaneseMergeThreshold': 4,
      \ }
```

`j` / `k` で方向フィルターを使う例:
```vim
let g:hellshake_yano.directional_hint_filter = v:true
" CamelCase 版:
let g:hellshake_yano.directionalHintFilter = v:true
```

日本語開発向け推奨設定:
```vim
let g:hellshake_yano = #{
\   useJapanese: v:true,
\   useTinySegmenter: v:true,
\   minWordLength: 2,
\   perKeyMinLength: #{
\     'v': 1,
\     'f': 1,
\     'w': 3,
\     'e': 2
\   },
\   enableHighlight: v:true,
\   cacheSize: 2000
\ }
```

パフォーマンス重視:
```vim
let g:hellshake_yano = #{
\   maxHints: 50,
\   cacheSize: 3000,
\   debounceDelay: 30,
\   suppressOnKeyRepeat: v:true,
\   keyRepeatThreshold: 80,
\   enableDebug: v:false
\ }
```

連続ヒントループ:
```vim
let g:hellshake_yano = #{
\   continuousHintMode: v:true,
\   recenterCommand: 'normal! zz',
\   maxContinuousJumps: 25
\ }
" 集中作業向けに短めへ調整することも可能
```

### キー別最小単語長設定

`perKeyMinLength` を用いると、モーション種別ごとにヒント表示の最小文字数を変えられます。登録したキーは自動的にマッピングされ、`countedMotions` を別途設定する必要はありません。

- ビジュアルモードでは 1 文字ヒントで精密に移動
- hjkl ナビゲーションでは 2 文字以上に制限しノイズを低減
- モーション種別ごとに柔軟に閾値を変更

#### 基本設定

```vim
let g:hellshake_yano = #{
\   perKeyMinLength: #{
\     'v': 1,
\     'V': 1,
\     'w': 1,
\     'b': 1,
\     'h': 2,
\     'j': 2,
\     'k': 2,
\     'l': 2,
\     'f': 3,
\     'F': 3,
\   },
\   defaultMinWordLength: 2,
\   motionCount: 3
\ }
" perKeyMinLength に含まれるキーは自動でマッピングされます。
```

### ヒント位置設定

`hintPosition` オプションでヒントの表示位置を制御できます。

#### 選択肢

- `'start'` (既定): 単語の先頭にヒントを表示
- `'end'`: 単語の末尾にヒントを表示
- `'both'`: 単語の先頭と末尾の両方にヒントを表示

#### `both` 使用時の閾値

`hintPosition: 'both'` の場合、`bothMinWordLength` で短い単語へのヒント重複を防ぎます。

- `bothMinWordLength` 以上の長さなら両端にヒント
- 未満なら自動的に片側表示にフォールバック（既定は先頭）
- 既定値は 5 文字

**基本設定:**
```vim
let g:hellshake_yano = #{
\   hintPosition: 'both',
\   bothMinWordLength: 5,
\   defaultMinWordLength: 2
\ }
```

**Neovim (Lua) 例:**
```lua
vim.g.hellshake_yano = {
  hintPosition = "both",
  bothMinWordLength = 5,
  defaultMinWordLength = 2
}
```

**動作例:**
- "Hello" (5 文字) → 両端にヒント
- "vim" (3 文字) → 先頭のみ
- "JavaScript" (10 文字) → 両端にヒント
- "a" (1 文字) → 先頭のみ

**高度なコード向け設定:**
```vim
let g:hellshake_yano = #{
\   hintPosition: 'both',
\   bothMinWordLength: 6,
\   defaultMinWordLength: 3,
\   perKeyMinLength: #{
\     'w': 4,
\     'v': 2,
\   },
\   perKeyMotionCount: #{
\     'w': 1,
\     'v': 1,
\   }
\ }
```

**Lua 例:**
```lua
vim.g.hellshake_yano = {
  hintPosition = "both",
  bothMinWordLength = 6,
  defaultMinWordLength = 3,
  perKeyMinLength = {
    w = 4,
    v = 2,
  },
  perKeyMotionCount = {
    w = 1,
    v = 1,
  }
}
```

**関連オプション:**

| 設定 | 役割 | `bothMinWordLength` との関係 |
| ---- | ---- | ----------------------------- |
| `defaultMinWordLength` | ヒント表示の最小長 | `bothMinWordLength` の前に評価 |
| `perKeyMinLength` | キー別最小長 | `defaultMinWordLength` より優先 |
| `bothMinWordLength` | 両端ヒントの閾値 | `hintPosition: 'both'` のときのみ有効 |

**ユースケース:**
1. **長い変数名が多い** (既定: 5) — 長い識別子の両端にヒントを出しやすい
2. **短い関数名中心** (推奨: 3) — 短い識別子にも両端ヒントを付与
3. **文書とコードが混在** (推奨: 6-8) — テキストノイズを抑制

### 辞書システム

組み込み辞書とユーザー辞書を組み合わせ、単語分割とヒント配置を最適化できます。

#### 組み込み辞書

- 80 以上の日本語プログラミング用語
- よく使われる複合語を自動保持
- 助詞 ("no"、"wo"、"ni" など) の結合ルール

#### ユーザー辞書

辞書は以下の優先順位で探索されます:
1. `.hellshake-yano/dictionary.json` (プロジェクト固有)
2. `hellshake-yano.dict.json` (プロジェクトルート)
3. `~/.config/hellshake-yano/dictionary.json` (グローバル)

**作成例:**
```bash
cp samples/dictionaries/dictionary.json .hellshake-yano/dictionary.json
```

> `.hellshake-yano/dictionary.json` は `.gitignore` 済みです。サンプルは `samples/dictionaries/` にあります。

#### 辞書フォーマット

**JSON 形式 (推奨):**
```json
{
  "customWords": ["machine learning", "deep learning"],
  "preserveWords": ["HelloWorld", "getElementById"],
  "mergeRules": {
    "no": "always",
    "wo": "always"
  },
  "hintPatterns": [
    {
      "pattern": "^-\s*\[\s*\]\s*(.)",
      "hintPosition": "capture:1",
      "priority": 100,
      "description": "First character of checkbox"
    }
  ]
}
```

**YAML 形式:**
```yaml
customWords:
  - machine learning
  - deep learning
hintPatterns:
  - pattern: "^-\s*\[\s*\]\s*(.)"
    hintPosition: "capture:1"
    priority: 100
```

**テキスト形式:**
```
# Custom words
machine learning
deep learning

# Preserve words (! prefix)
!HelloWorld
!getElementById

# Hint patterns (@ prefix: priority:pattern:position)
@100:^-\s*\[\s*\]\s*(.):capture:1
```

#### ヒントパターンの例

- チェックボックス: `- [ ] Task`
- 番号付きリスト: `1. Item`
- Markdown 見出し: `## Title`
- 二重山括弧: `<<Content>>`

#### 辞書コマンド

```vim
:HellshakeYanoReloadDict    " 辞書を再読み込み
:HellshakeYanoEditDict      " 辞書ファイルを編集
:HellshakeYanoShowDict      " 現在の辞書内容を表示
:HellshakeYanoValidateDict  " 辞書形式を検証
```

#### 辞書関連設定

```vim
let g:hellshake_yano = {
  \ 'dictionaryPath': '~/.config/my-dict.json',
  \ 'useBuiltinDict': v:true,
  \ 'dictionaryMerge': 'merge'
  \ }
```

### 日本語分かち書き設定

TinySegmenter と助詞結合を利用して、日本語の単語境界を詳細に制御できます。

| 機能 | 設定キー | 既定値 | 説明 |
| ---- | -------- | ------ | ---- |
| TinySegmenter 閾値 | `segmenterThreshold` | 4 | TinySegmenter を使う最小文字数 |
| 助詞結合閾値 | `japaneseMergeThreshold` | 2 | 助詞を前の単語に結合する最大文字数 |

#### 基本設定 (camelCase)

```vim
let g:hellshake_yano = #{
\   useJapanese: v:true,
\   segmenterThreshold: 4,
\   japaneseMergeThreshold: 2,
\   japaneseMergeParticles: v:true
\ }
```

#### segmenterThreshold の調整

- 既定設定: 4 文字以上で TinySegmenter を使用
- 低い値にすると短い語でも精度優先 (若干低速化)
- 高い値にすると速度優先 (長語のみ解析)

```vim
" 既定値
let g:hellshake_yano = #{
\   segmenterThreshold: 4,
\ }

" 精度重視
let g:hellshake_yano = #{
\   segmenterThreshold: 2,
\ }
```

推奨値:
- 2-3: 複合語が多い技術文書
- 4: バランスのよい既定値
- 5-6: 一般的な文章で速度優先

#### japaneseMergeThreshold の調整

- 助詞 ("no"、"wo"、"ni"、"ga" など) を前の語に結合する閾値
- 2 文字以下の語の後に助詞が続く場合に結合 (既定)
- 値を上げると結合が増え、長い単語単位に
- 値を下げると結合が減り、粒度が細かく

```vim
" 助詞をほぼ結合しない
let g:hellshake_yano = #{
\   japaneseMergeThreshold: 1,
\ }
" 例: "watashi" "no" "hon"

" 既定の自然な結合
let g:hellshake_yano = #{
\   japaneseMergeThreshold: 2,
\ }
" 例: "watashi no" "hon"

" コンテキスト重視で積極的に結合
let g:hellshake_yano = #{
\   japaneseMergeThreshold: 3,
\ }
" 例: "watashi no hon"
```

推奨値:
- 1: 文字単位での正確なナビゲーション
- 2: 自然な読み単位 (既定)
- 3: コメントなどで語句をまとめたい場合

### キー別モーション回数設定

`perKeyMotionCount` を使うと、モーションキーごとにヒントを表示するまでの回数を変えられます。

```vim
let g:hellshake_yano = #{
\   perKeyMotionCount: #{
\     'v': 1,
\     'V': 1,
\     'w': 1,
\     'b': 1,
\     'h': 3,
\     'j': 3,
\     'k': 3,
\     'l': 3,
\   },
\   defaultMotionCount: 2,
\   motionCount: 3,
\ }
```

#### 最小単語長との組み合わせ

```vim
let g:hellshake_yano = #{
\   perKeyMotionCount: #{
\     'v': 1,
\     'h': 3,
\   },
\   perKeyMinLength: #{
\     'v': 1,
\     'h': 2,
\   },
\   defaultMotionCount: 2,
\   defaultMinWordLength: 2,
\ }
```

上記の意味:
- `v`: 1 回でヒント表示、1 文字語も対象
- `h`: 3 回でヒント表示、2 文字以上に制限
- その他: 2 回で表示、2 文字以上

### キーリピート抑制

hjkl を高速で連打した際にヒント表示を抑え、スクロールの滑らかさを維持します。

- 有効/無効: `g:hellshake_yano.suppressOnKeyRepeat` (既定: `v:true`)
- しきい値: `g:hellshake_yano.keyRepeatThreshold` (ms, 既定 50)
- リセット遅延: `g:hellshake_yano.keyRepeatResetDelay` (ms, 既定 300)

### 数値 2 文字ヒント

多くの単語を扱う場合に 01-99, 00 の 2 桁数値ヒントを有効化できます。

```vim
let g:hellshake_yano = #{
\   useNumericMultiCharHints: v:true,
\   singleCharKeys: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
\   multiCharKeys: ['B', 'C', 'E', 'I', 'O', 'P', 'Q', 'R', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
\ }
```

仕組み:
1. 単一文字ヒント (A〜L)
2. アルファベット 2 文字ヒント (multiCharKeys の組み合わせ)
3. 数値 2 文字ヒント (01〜99, 00)

### 高度なハイライト設定

ハイライトグループ名またはカラー辞書でヒント表現をカスタマイズできます。

```vim
" 既存ハイライトグループを利用
let g:hellshake_yano = #{
\   highlightHintMarker: 'Search',
\   highlightHintMarkerCurrent: 'IncSearch'
\ }

" 色指定でカスタム
let g:hellshake_yano = #{
\   highlightHintMarker: {'fg': '#00ff00', 'bg': '#1a1a1a'},
\   highlightHintMarkerCurrent: {'fg': '#ffffff', 'bg': '#ff0000'}
\ }

" 混合設定の例
let g:hellshake_yano = #{
\   markers: split('ASDFGHJKL', '\zs'),
\   motionCount: 5,
\   motionTimeout: 3000,
\   useJapanese: v:true,
\   highlightHintMarker: {'bg': '#3c3c3c'}
\ }

" 単一/複数文字ヒントのキーセット変更
let g:hellshake_yano = #{
\   singleCharKeys: split('asdfghjkl', '\zs'),
\   multiCharKeys: split('qwertyuiop', '\zs'),
\   useHintGroups: v:true
\ }

" 数字優先
let g:hellshake_yano = #{
\   singleCharKeys: split('1234567890ASDFGHJKL', '\zs'),
\   multiCharKeys: split('QWERTYUIOPZXCVBNM', '\zs')
\ }

" 数字を除外
let g:hellshake_yano = #{
\   singleCharKeys: split('ASDFGHJKL', '\zs'),
\   multiCharKeys: split('QWERTYUIOPZXCVBNM', '\zs')
\ }

" キーリピート検出設定
let g:hellshake_yano = #{
\   suppressOnKeyRepeat: v:true,
\   keyRepeatThreshold: 50,
\   keyRepeatResetDelay: 300,
\ }

" キーリピート抑制を無効化
let g:hellshake_yano = #{
\   suppressOnKeyRepeat: v:false
\ }

" キーリピート判定の調整
let g:hellshake_yano = #{
\   keyRepeatThreshold: 100,
\   keyRepeatResetDelay: 500,
\ }
```

## パフォーマンス

辞書ベースのヒントパイプラインが大規模ファイル向けに最適化されました。設定変更は不要で、透過的に改善が適用されます。

### 辞書ヒントパイプライン最適化

| 指標 | 改修前 | 改修後 | 改善率 |
|------|--------|--------|--------|
| ヒント表示所要時間 (44,949行バッファ) | 1636 ms | 253 ms | **84.5% 削減 / 6.46倍高速化** |

主な最適化内容:
- **getline 配列キャッシュ化** — `changedtick` 連動でバッファ行取得の RPC 呼び出しをスキップ
- **TextChanged 自動コマンドによるキャッシュ無効化** — バッファ状態との整合性を常に保証
- **行単位の正規表現走査** — `join("\n")` による一括結合を廃止し、行ごとの `regex.exec(line)` に変更して文字列割り当てのオーバーヘッドを削減
- **RegExp 事前コンパイル** — 辞書パターンをロード時に `compiled` フィールドに事前生成し、実行時の正規表現構築を排除

すべて内部実装の変更であり、ユーザー側の動作、設定オプション、ヒント配置に変更はありません。

## 使い方

インストール後は、Vim 標準の単語モーションが日本語にも対応します。

### 単語モーション

- `w`: 次の単語の先頭へ移動
- `b`: 前の単語の先頭へ移動
- `e`: 現在/次の単語の末尾へ移動

これらのモーションは日本語の単語境界を正しく認識し、英語と同様にスムーズにジャンプできます。

### コマンド

- `:HellshakeEnable` — プラグインを有効化
- `:HellshakeDisable` — プラグインを無効化
- `:HellshakeToggle` — 有効/無効を切り替え
- `:HellshakeShow` — 即座にヒントを表示
- `:HellshakeHide` — 表示中のヒントを非表示

## コントリビュート

Pull Request や Issue を歓迎します。バグ報告、改善案、ドキュメント更新などお気軽にどうぞ。

## インスピレーション

- vim-jp Slack コミュニティ
- [POP TEAM EPIC](https://mangalifewin.takeshobo.co.jp/rensai/popute/)

## 作者

nekowasabi
