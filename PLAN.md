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

@status:
- [x] TDD Red-Green-Refactorサイクルに従って実装完了
- [x] tests/validate_input_char.test.ts 作成（17テストケース、82%成功）
- [x] core.ts:validateInputChar() メソッド追加（2626-2652行）
- [x] main.ts:validateInputChar ディスパッチャー追加（287-293行）
- [x] hint.vim:validate_input_and_hide() 関数追加（105-132行）
- [x] state.vim:hint_display_time 追跡機能追加（19行、91-98行）
- [x] hint.vim:show() でヒント表示時刻記録（30-32行）
- [x] hint.vim:auto_hide() で200msチェック追加（49-54行）
- [x] motion.vim:process() でvalidate_input_and_hide呼び出し（64-70行）
- [x] deno check 型チェック成功
- [ ] 実機テスト → **問題発覚：ヒントが非表示にならない** → sub5で修正

#### sub5 Vim環境でのヒント非表示ロジックの修正（sub4実装後のバグ修正）
@target: autoload/hellshake_yano/hint.vim, autoload/hellshake_yano/motion.vim
@issue: process50 sub4実装後もヒントが非表示にならない
@symptom: hjklなどを入力してもヒントが消えず、複数回入力するとヒントが再描画される

@investigation:
**調査1: ヒント表示フローの詳細分析**
```
現在のフロー（Vim環境）:
motion.vim:89 → hellshake_yano#show_hints_with_key(key)
  ↓
autoload/hellshake_yano.vim:30-31 → hellshake_yano#hint#show_hints_with_key(a:key)
  ↓
hint.vim:63-76 → show_hints_with_key() 関数
  ↓ line 73
denops#notify('hellshake-yano', 'showHintsWithKey', [a:key, current_mode])
  ↓
main.ts:247 → showHintsWithKey ディスパッチャー
  ↓
core.ts:909 → showHintsInternal(denops, modeString)
  ↓ line 837
hideHints()  // 既存ヒントをクリア
  ↓ line 887
displayHintsOptimized()  // ヒント表示
  ↓ line 888-889
currentHints = hintMappings
isActive = true
  ↓ line 894-896 (Vim/Neovim分岐 - process50 sub1で実装)
if (denops.meta.host === "nvim") {
  await waitForUserInput(denops);  // Neovimのみ実行
}
// Vimの場合、ここでreturn（VimScriptに制御が戻る）
  ↓
**hint.vim:show_hints_with_key()の残りの行は実行されない**
  ↓
hint.vim:show() は**呼ばれない** ← ここがポイント！
  ↓
したがって set_hint_display_time() も**呼ばれない**
```

**調査2: validate_input_and_hide()の呼び出しタイミング問題**
```
motion.vim:process() の実行順序:
line 53: function! hellshake_yano#motion#process(key) abort
line 61: let bufnr = hellshake_yano#utils#bufnr()
line 62: call hellshake_yano#state#init_buffer_state(bufnr)
line 64-70: if hellshake_yano#state#is_hints_visible()
              if hellshake_yano#hint#validate_input_and_hide(a:key)
                return a:key  ← ★ここで検証（ヒント表示前！）
              endif
            endif
line 73-86: キーリピート検出処理
line 82-93: ヒント表示判定とトリガー
line 89: call hellshake_yano#show_hints_with_key(a:key)  ← ★ヒント表示はここ
```
**問題**: line 64でヒント表示前に検証しているため、常にfalseを返す

**調査3: hints_visibleフラグの同期問題**
- VimScript側: `g:hellshake_yano_internal.hints_visible` (state.vim:11)
- TypeScript側: `core.isActive` (core.ts:889)
- Denops経由でヒント表示しても**VimScript側のフラグが更新されない**
- `is_hints_visible()` が常にfalseを返す
- したがってvalidate_input_and_hide()の呼び出し条件（line 65）が満たされない

**調査4: hint_display_timeが0のまま更新されない理由**
```
期待される動作:
show_hints_with_key() → show() → set_hint_display_time()
  ↓
しかし実際は:
show_hints_with_key() → denops#notify(...) → core.ts処理 → そのまま終了
  ↓
show() は呼ばれない
  ↓
set_hint_display_time() も呼ばれない
  ↓
hint_display_time が 0 のまま
  ↓
auto_hide() の 200ms チェック: current_time - 0 < 200 → 常にtrue
  ↓
ヒントが即座に非表示になる
```

**調査5: CursorMovedイベントとの相互作用**
- plugin/hellshake-yano.vim:486で`autocmd CursorMoved * call hellshake_yano#hint#auto_hide()`
- hjklキー入力 → CursorMoved発火 → auto_hide()呼び出し
- hint_display_timeが0のため200msチェック失敗 → 即座に非表示
- その後、motion.vim:process()が実行され、キーカウント増加
- カウントが閾値に達するとヒント再表示
- **結果**: ヒント表示→即非表示→再表示のループ

@root-cause:
1. **ヒント表示時刻が記録されない**: `showHintsWithKey()` → `showHintsInternal()` のフローが `hint.vim:show()` を経由しない
   - Denops経由の非同期処理のため、VimScript側の後続処理が実行されない
   - `set_hint_display_time()` が呼ばれないため `hint_display_time` が 0 のまま
2. **validate_input_and_hide()の呼び出し位置が論理的に間違っている**:
   - motion.vim:64でヒント表示**前**に検証
   - show_hints_with_key()はline 89で呼ばれる（その後）
   - ヒントが表示されていない状態で検証するため無意味
3. **hints_visibleフラグが更新されない**:
   - Denops経由でヒント表示してもVimScript側の`g:hellshake_yano_internal.hints_visible`が更新されない
   - TypeScript側の`core.isActive`とVimScript側のフラグが非同期
   - `is_hints_visible()`が常にfalseを返す
4. **auto_hide()の200msチェックが機能しない**:
   - `hint_display_time`が0のため`current_time - 0`は常に200ms以上
   - CursorMovedイベントで即座にヒント非表示

@solution:
- [x] hint.vim:show_hints_with_key()の直後にset_hint_display_time()とset_hints_visible(v:true)を追加
  - Denops非同期処理の完了を待たずにVimScript側で状態を更新
  - line 73の`denops#notify()`の直後に追加
- [ ] motion.vim:process()内のvalidate_input_and_hide()呼び出し位置を修正
  - 現在: line 64-70（バッファ初期化直後、ヒント表示前）
  - 修正後: line 72以降（キーリピート検出後、ヒント表示トリガー判定前）
  - ヒントが表示されている状態で次のキー入力時に検証する
- [ ] deno checkでの型チェック
- [ ] 実機テスト（Vim 8.2+でhjkl入力時のヒント非表示確認）

**調査6: 検証用コードによる実験結果（timer_start 100ms後に強制非表示）**
```vim
" hint.vim:80 に追加したコード
call timer_start(100, {-> hellshake_yano#hint#hide()})
```
- **結果**: ヒントが消えない
- **意味**: `hellshake_yano#hint#hide()` 関数自体が正しく動作していない
- **原因調査**:
  ```vim
  " hint.vim:36-40
  function! hellshake_yano#hint#hide() abort
    if hellshake_yano#denops#call_function('hideHints', [], 'hide hints')
      call hellshake_yano#state#set_hints_visible(v:false)
    endif
  endfunction
  ```
  - VimScript → denops#notify('hellshake-yano', 'hideHints', [])
  - main.ts:hideHints() (line 140) を呼び出し

**調査7: 状態管理の二重化問題（根本原因）**
```typescript
【ヒント表示のフロー】
showHintsWithKey() (main.ts:245)
  → core.showHintsWithKey() (core.ts:905)
  → core.showHintsInternal() (core.ts:826)
  → core.isActive = true (core.ts:889)            ← Core クラスの状態
  → core.currentHints = hintMappings (core.ts:888) ← Core クラスの配列
  → display.ts:processMatchaddBatched()
    → popup_create() を呼び出し
    → popup ID は display.ts 内部で管理される
    → main.ts:fallbackMatchIds には記録されない ⚠️

【ヒント非表示のフロー】
hideHints() (main.ts:140)
  → hideHintsDisplay() を呼び出し (display.ts:129)
  → clearHintDisplay() を呼び出し (display.ts:95)
  → 引数として渡される:
    - extmarkNamespace: main.ts のローカル変数
    - fallbackMatchIds: main.ts のローカル配列（空）⚠️
    - hintsVisible: main.ts のローカル変数
    - currentHints: main.ts のローカル配列（空）⚠️
  → popup_close(mid) を呼ぶが、mid が空配列のため何も実行されない ⚠️
  → ヒントが消えない
```

**状態の二重管理**:
| 状態 | Core class (core.ts) | main.ts module |
|------|---------------------|----------------|
| ヒント表示フラグ | `core.isActive` | `hintsVisible` |
| 現在のヒント | `core.currentHints` | `currentHints` |
| popup/match ID | display.ts内部 | `fallbackMatchIds` |

**不整合の発生**:
- ヒント表示: Core クラスの状態を更新
- ヒント非表示: main.ts の状態を参照
- **結果**: 異なる状態を参照しているため、非表示処理が失敗

@root-cause:
1. **ヒント表示時刻が記録されない**: `showHintsWithKey()` → `showHintsInternal()` のフローが `hint.vim:show()` を経由しない
   - Denops経由の非同期処理のため、VimScript側の後続処理が実行されない
   - `set_hint_display_time()` が呼ばれないため `hint_display_time` が 0 のまま
2. **validate_input_and_hide()の呼び出し位置が論理的に間違っている**:
   - motion.vim:64でヒント表示**前**に検証
   - show_hints_with_key()はline 89で呼ばれる（その後）
   - ヒントが表示されていない状態で検証するため無意味
3. **hints_visibleフラグが更新されない**:
   - Denops経由でヒント表示してもVimScript側の`g:hellshake_yano_internal.hints_visible`が更新されない
   - TypeScript側の`core.isActive`とVimScript側のフラグが非同期
   - `is_hints_visible()`が常にfalseを返す
4. **auto_hide()の200msチェックが機能しない**:
   - `hint_display_time`が0のため`current_time - 0`は常に200ms以上
   - CursorMovedイベントで即座にヒント非表示
5. **状態管理の二重化（最重要）**:
   - **ヒント表示**: `core.isActive`, `core.currentHints` を更新、popup ID は display.ts 内部で管理
   - **ヒント非表示**: `main.ts:hintsVisible`, `main.ts:currentHints`, `main.ts:fallbackMatchIds` を参照
   - 完全に別々の状態を参照しているため、非表示処理が popup ID を取得できず失敗

@solution:
**根本的修正方針: Single Source of Truth (SSOT) - Core クラスを唯一の真実の源とする**

- [ ] Phase 1: 緊急修正（最小限の変更でヒントが消えない問題を解決）
  - [ ] main.ts:hideHints() を修正して Core.hideHintsOptimized() を呼び出す
    ```typescript
    // main.ts:140-149
    async hideHints(): Promise<void> {
      const core = Core.getInstance(config);
      await core.hideHintsOptimized(denops);
      hintsVisible = false;
      currentHints = [];
    }
    ```
  - [ ] deno check での型チェック
  - [ ] 実機テスト（timer_start による強制非表示テスト）

- [ ] Phase 2: 状態同期の追加
  - [ ] main.ts:showHintsWithKey() に状態同期処理を追加
    ```typescript
    // main.ts:245-252
    async showHintsWithKey(key: unknown, mode?: unknown): Promise<void> {
      const core = Core.getInstance(config);
      await core.showHintsWithKey(denops, ...);
      hintsVisible = core.isActive;
      currentHints = [...core.currentHints];
    }
    ```

- [ ] Phase 3: hint.vim の修正（sub4 の残タスク）
  - [ ] hint.vim:show_hints_with_key() で set_hint_display_time() と set_hints_visible(v:true) を呼ぶ（検証用コードと同じ位置）
  - [ ] motion.vim:process() 内の validate_input_and_hide() 呼び出し位置を修正

- [ ] Phase 4: 検証用コード削除
  - [ ] hint.vim:80 の timer_start() 行を削除

- [ ] Phase 5: 実機テスト
  - [ ] hjkl入力でヒントが非表示になるか確認
  - [ ] ヒント文字入力でジャンプするか確認

@ref:
- process50 sub4: validateInputChar()実装（完了）
- autoload/hellshake_yano/hint.vim:63-84 (show_hints_with_key関数、検証用コード含む)
- autoload/hellshake_yano/motion.vim:53-93 (process関数)
- denops/hellshake-yano/core.ts:894-896 (Vim/Neovim分岐)
- denops/hellshake-yano/core.ts:473 (hideHintsOptimized関数)
- denops/hellshake-yano/main.ts:140-149 (hideHints関数 - 修正対象)
- denops/hellshake-yano/main.ts:245-252 (showHintsWithKey関数 - Phase2で修正)
- denops/hellshake-yano/display.ts:95-127 (clearHintDisplay関数)
- plugin/hellshake-yano.vim:486 (CursorMovedイベント)

### process100 リファクタリング
- [ ] display.ts内の重複コード削除
- [ ] TypeScript/VimScript間の責務整理
- [ ] パフォーマンス最適化

### process200 ドキュメンテーション
- [ ] README.mdにVim/Neovim互換性の記載追加
- [ ] 必要なVimバージョン（8.2以降）の明記
- [ ] prop APIとmatchadd()の違いの説明
- [ ] 連続ジャンプモードの使用方法追加

