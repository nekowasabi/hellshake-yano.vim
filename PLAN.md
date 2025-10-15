# title: Vim/Neovim両対応ヒント表示・ジャンプ機能

## 概要
- hellshake-yano.vimプラグインにVim/Neovim両対応のヒント表示とジャンプ機能を実装し、Denopsに依存しながらもVim 8.2以降でも動作する互換性の高いプラグインを実現する

### goal
- VimとNeovimの両方でヒント表示が正しく動作する
- マーカーをキーボードで選択してジャンプできる
- 連続ジャンプモードで効率的な移動が可能
- 日本語を含む文書でも正しく動作する

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- git add, git commitの実行は、ユーザに実行の許可を得ること
- 既存のDenops実装を活かしながら改良する（Option A採用）

## 開発のゴール
- vim-searchxのようなVim/Neovim互換性を実現する
- 既存のDenops実装を活かしながら、Vimのprop APIとpopup機能を完全サポート
- パフォーマンスを維持しながら互換性を向上させる

## 実装仕様

### Vim/Neovim互換性の実現方法（vim-searchx調査結果）
- **VimScript条件分岐**: `has('nvim')`でVim/Neovim判定
- **Neovim**: `nvim_buf_set_extmark()`でマーカー表示
- **Vim 8.2+**: `prop_add()`と`popup_create()`でオーバーレイ表示
- **Vim旧版**: `matchadd()`でフォールバック

### 現在のhellshake-yano実装状況
- Denops（TypeScript）ベースの実装
- display.ts内にVim/Neovim分岐ロジック実装済み
- Neovim: extmark対応済み
- Vim: matchadd()フォールバック実装済み（prop API未完全）

## 生成AIの学習用コンテキスト

### 参考実装
- `/tmp/vim-searchx/autoload/searchx/highlight.vim`
  - Vim/Neovim両対応のハイライト実装パターン
  - prop_type_add/popup_createの使用例

### 現在の実装
- `denops/hellshake-yano/display.ts`
  - processExtmarksBatched(): Neovim実装
  - processMatchaddBatched(): Vim実装（改良対象）
- `plugin/hellshake-yano.vim`
  - ハイライトグループ定義と設定管理
- `autoload/hellshake_yano/hint.vim`
  - VimScriptヘルパー関数

## Process

### process1 Vim prop API対応強化
#### sub1 prop_type_add/prop_add実装改善
@target: denops/hellshake-yano/display.ts
@ref: /tmp/vim-searchx/autoload/searchx/highlight.vim
- [ ] processMatchaddBatched()関数でprop_type_add正しく初期化
- [ ] prop_add()でマーカー位置を設定
- [ ] popup_create()でオーバーレイ表示を実装
- [ ] 日本語文字幅の考慮（マルチバイト文字対応）

#### sub2 エラーハンドリング改善
@target: denops/hellshake-yano/display.ts
- [ ] Vim版バージョン確認ロジック追加
- [ ] prop API存在チェック強化
- [ ] フォールバック処理の改善

### process2 VimScriptヘルパー関数追加
#### sub1 互換性レイヤーの作成
@target: autoload/hellshake_yano/compat.vim（新規作成）
- [ ] has_prop_support()関数: prop APIサポート確認
- [ ] create_marker_prop()関数: prop作成ラッパー
- [ ] create_marker_popup()関数: popup作成ラッパー
- [ ] clear_all_props()関数: prop削除ラッパー
- deno checkでの型チェック
- deno testでのユニットテスト

#### sub2 既存関数との統合
@target: autoload/hellshake_yano/hint.vim
@ref: autoload/hellshake_yano/compat.vim
- [ ] compat.vimの関数をhint.vimから呼び出し
- [ ] Denops側との連携強化
- deno checkでの型チェック
- deno testでのユニットテスト

### process3 ジャンプ機能実装
#### sub1 入力待機処理
@target: denops/hellshake-yano/core.ts
@ref: /tmp/vim-searchx/autoload/searchx.vim
- [x] getchar()を使用した入力待機実装
- [x] timer_start()での非同期処理
- [x] マーカー選択ロジック
- [x] deno checkでの型チェック
- [x] deno testでのユニットテスト (tests/jump_functionality.test.ts)

#### sub2 カーソル移動とスクロール
@target: denops/hellshake-yano/core.ts
@ref: /tmp/vim-searchx/autoload/searchx/cursor.vim
- [x] cursor()関数でのジャンプ実装
- [x] スクロール位置の調整（scrolloff考慮）
- [x] アニメーション対応（オプション）
- [x] deno checkでの型チェック
- [x] deno testでのユニットテスト (tests/jump_functionality.test.ts)

### process4 連続ジャンプモード
#### sub1 連続ヒントモード実装
@target: denops/hellshake-yano/core.ts
@ref: PLAN.mdの連続ヒント機能仕様
- [x] continuousHintMode設定の実装
- [x] ジャンプ後の自動ヒント再表示
- [x] recenterCommand実行（zz等）
- [x] maxContinuousJumps制限
- [x] deno checkでの型チェック
- [x] deno testでのユニットテスト (tests/jump_core_integration.test.ts)

### process10 ユニットテスト
#### sub1 Vim/Neovim両環境テスト
@target: tests/vim_neovim_compat_test.ts（新規作成）
- [ ] Vimでのprop API動作確認テスト
- [ ] Neovimでのextmark動作確認テスト
- [ ] フォールバック動作テスト
- deno checkでの型チェック
- deno testでのユニットテスト

#### sub2 ジャンプ機能テスト
@target: tests/jump_functionality_test.ts（新規作成）
- [ ] マーカー選択テスト
- [ ] カーソル移動精度テスト
- [ ] 連続ジャンプモードテスト
- deno checkでの型チェック
- deno testでのユニットテスト

### process50 フォローアップ
（実装後に発生した問題や改善点を記録）

#### sub1 Vim環境での意図しない動作の修正
@target: denops/hellshake-yano/core.ts, denops/hellshake-yano/display.ts
@issue: perKeyMotionCount設定時の3つの問題
1. キーリピートしないとヒントが表示されない
2. 単語の先頭の色がハイライトされるだけで、ヒント文字が表示されない
3. perKeyMotionCountの回数キーを押すと、Vimのステータスラインにカーソルが移動して処理が止まる

@root-cause:
- core.tsとdisplay.tsの表示処理実装が重複し、間違った方が呼ばれている
- core.ts:displayHintsWithMatchAddBatch()はmatchaddのみ（ヒント文字表示なし）
- display.ts:processMatchaddBatched()はprop API+popup使用（正しい実装）
- showHintsInternal()が無条件にwaitForUserInput()を呼び出し、getchar()でVimをブロック

@solution:
- [x] core.tsの表示処理をdisplay.ts:processMatchaddBatched()を使うように修正
- [x] showHintsInternal()でVim/Neovim分岐を追加（Vimではヒント表示のみ、waitForUserInput()を呼ばない）
- [ ] suppressOnKeyRepeat: v:false時にキーリピート検出を完全無効化
- [x] deno checkでの型チェック
- [x] 実機テスト（Vim 8.2+とNeovim両方）

#### sub2 Vimヒント表示位置ズレとクリーンアップ問題の修正
@target: denops/hellshake-yano/display.ts, plugin/hellshake-yano.vim, autoload/hellshake_yano/hint.vim
@issue: ヒント表示後の2つの問題
1. hjklを押してもヒントが消えない
2. ヒントの表示位置が大きくズレている

@root-cause-detail:
**問題1: ヒントの自動非表示が機能しない**
- plugin/hellshake-yano.vimの調査結果（534行）:
  - 自動コマンドは`augroup HellshakeYano`（478-489行）で定義されている
  - 現在のイベント: ModeChanged, BufEnter, BufLeave, DenopsPluginPost, ColorScheme
  - **CursorMovedイベントが設定されていない** → hjkl等のカーソル移動でヒントが消えない
  - **InsertEnterイベントが設定されていない** → Insert modeに入ってもヒントが残る
- autoload/hellshake_yano/hint.vimの調査結果（88行）:
  - 現在の関数: initialize(), should_trigger_hints_for_key(), trigger_hints(), show(), hide(), show_hints_with_key(), detect_current_mode(), detect_current_mode_from_string(), handle_debug_display()
  - **auto_hide()関数が存在しない** → 自動非表示処理を呼び出す関数がない

**問題2: ヒント表示位置の大幅なズレ**
- denops/hellshake-yano/display.ts:processMatchaddBatched()の調査結果（227-303行）:
  - 258行: `const p = calculateHintPosition(h.word, "offset");`
  - **coordinateSystemオプションを指定していない** → デフォルト動作で座標が返される
  - 274-285行: popup_create()の座標指定
    ```typescript
    const popupId = await denops.call("popup_create", h.hint, {
      line: p.line,  // ← これがvim_lineではなく汎用lineを使用
      col: p.col,    // ← これがvim_colではなく汎用colを使用
      textprop: "HellshakeYanoMarker",
      ...
    }) as number;
    ```
- denops/hellshake-yano/hint.ts:calculateHintPosition()の調査結果:
  - この関数は`coordinateSystem`オプションをサポート済み
  - 戻り値の型:
    - オプションなし: `{ line, col, display_mode }`
    - `coordinateSystem: 'vim'`指定時: `{ line, col, display_mode, vim_col, vim_line, nvim_col, nvim_line }`
  - **vim_col/vim_lineはVimのdisplay column座標（1-indexed）**
  - **nvim_col/nvim_lineはNeovimのbyte offset座標（0-indexed）**
- word.ts（Word型定義）の調査結果:
  - **extractWords()関数**（498-635行）でWord型を生成
  - 529-531行および630-632行:
    ```typescript
    col: displayCol + 1, // Vimの列番号は1から始まる（タブ展開後の表示位置）
    byteCol: byteIndex + 1, // Vimのバイト列番号は1から始まる
    ```
  - **word.col**: display column（表示上の列位置、全角文字は2カウント、タブ展開後）
  - **word.byteCol**: byte offset（バイト位置、全角文字は3バイト）
  - **getDisplayColumn()**（344-356行）: タブと全角文字を考慮して表示列を計算
  - **charIndexToByteIndex()**（741-747行）: 文字インデックスからバイトインデックスに変換
  - 日本語テキストでは`col`と`byteCol`が異なる値になり、座標ズレの原因となる
  - Vimのpopup_create()には**display column**（word.col）を渡すべきだが、現在は計算されたp.colを使用している

@root-cause:
- VimScriptの自動コマンド（CursorMoved, InsertEnter等）が設定されていない
- autoload/hellshake_yano/hint.vimにauto_hide()関数が存在しない
- Vim座標系（1-indexed, display column）を正しく使用していない
- calculateHintPosition()で`coordinateSystem: 'vim'`オプションが使われていない
- popup_createでvim_col/vim_lineではなく汎用のline/colを使用している
- word.colとword.byteColの混同によりマルチバイト文字で座標ズレ

@solution:
- [x] plugin/hellshake-yano.vimに自動クリーンアップイベント追加（CursorMoved, CursorMovedI, InsertEnter）
- [x] autoload/hellshake_yano/hint.vimにauto_hide()関数追加
- [x] display.ts:processMatchaddBatched()でcalculateHintPosition()に`coordinateSystem: 'vim'`指定
- [x] popup_createでvim_col/vim_lineを使用（display column対応）
- [x] word.tsでのcol/byteCol設定確認（調査完了）
- [x] deno checkでの型チェック
- [ ] 実機テスト（Vim 8.2+で日本語テキスト）

#### sub3 popup_createの座標指定方法の修正
@target: denops/hellshake-yano/display.ts:284-295行
@issue: sub2の修正後もヒントの行と列がズレる
@investigation:
- vim-searchxの実装調査（/tmp/vim-searchx/autoload/searchx/highlight.vim:65-77）
  - searchxは`popup_create()`で`line: -1, col: -1`を使用
  - `textprop`と`textpropid`を指定した場合、popupが**自動的にprop位置に追従する**
  - hellshake-yanoは`line`と`col`に明示的な座標を指定していた

@root-cause:
- `textprop`と`textpropid`を指定しながら、`line`と`col`に明示的な座標を指定していた
- Vimのpopup APIでは、`textprop`を使う場合は`line: -1, col: -1`にするべき
- これによりpopupがpropの位置に正確に追従する

@solution:
- [x] popup_createの`line`パラメータを`-1`に変更
- [x] popup_createの`col`パラメータを`-1`に変更
- [x] deno checkでの型チェック
- [ ] 実機テスト（Vim 8.2+で日本語テキスト）

#### sub4 Vim環境での無効キー入力時のヒント自動非表示
@target: denops/hellshake-yano/core.ts, autoload/hellshake_yano/hint.vim, plugin/hellshake-yano.vim
@issue: Vimでヒント表示後、ヒント文字以外を入力してもヒントが消えない
@goal: Neovimと同様に、無効なキー入力時に自動的にヒントを非表示にする

@investigation:
- Neovimの動作フロー（既に実装済み）:
  1. motion.vim:81 → hellshake_yano#show_hints_with_key(key)
  2. → hint.vim:63 → denops#notify('hellshake-yano', 'showHintsWithKey', [key, mode])
  3. → core.ts:905 → showHintsWithKey() → showHintsInternal()
  4. → core.ts:894-896 → **waitForUserInput()を呼び出し** ← Neovimのみ
  5. → core.ts:1123-1130 → 無効なキー入力時にヒントを非表示

- Vimの動作フロー（現在の問題）:
  1. motion.vim:81 → hellshake_yano#show_hints_with_key(key)
  2. → hint.vim:63 → denops#notify('hellshake-yano', 'showHintsWithKey', [key, mode])
  3. → core.ts:905 → showHintsWithKey() → showHintsInternal()
  4. → core.ts:894-896 → **waitForUserInput()をスキップ** ← getchar()ブロッキング回避
  5. → **VimScriptに制御が戻る** → その後の入力を検証する仕組みがない ⚠️

@root-cause:
- Vimでは`waitForUserInput()`をスキップしたため、core.ts:1123-1130の入力検証ロジックが実行されない
- VimScript側で入力キーを検証する仕組みが存在しない
- Neovimの`waitForUserInput()`にある有効キーセット検証（core.ts:1117-1130）をVimでも実現する必要がある

@solution:
- [ ] core.tsに`validateInputChar(inputChar: string): boolean`メソッドを追加
  - core.ts:1117-1122と同様のロジックで有効キーセットを生成
  - 入力キーが有効な場合true、無効な場合falseを返す
- [ ] main.tsにvalidateInputCharをエクスポート（VimScriptから呼び出し可能にする）
- [ ] hint.vimに`validate_input_and_hide()`関数を追加
  - Denops経由で`validateInputChar()`を呼び出し
  - 無効なキーの場合、`hideHints()`を呼び出し
- [ ] plugin/hellshake-yano.vimに新規autocmdを追加（検討中）
  - CursorMovedイベントで入力キーを検証する仕組み（実装方法要検討）
- [ ] deno checkでの型チェック
- [ ] 実機テスト（Vim 8.2+で無効キー入力）

@ref: core.ts:1117-1130 (Neovimの入力検証ロジック)

### process100 リファクタリング
- [ ] display.ts内の重複コード削除
- [ ] TypeScript/VimScript間の責務整理
- [ ] パフォーマンス最適化

### process200 ドキュメンテーション
- [ ] README.mdにVim/Neovim互換性の記載追加
- [ ] 必要なVimバージョン（8.2以降）の明記
- [ ] prop APIとmatchadd()の違いの説明
- [ ] 連続ジャンプモードの使用方法追加

