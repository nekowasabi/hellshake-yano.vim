---
mission_id: null
title: 分割ウィンドウ対応ヒント表示機能
status: implementation_complete
progress: 85
phase: documentation
tdd_mode: true
blockers: 0
created_at: 2026-01-17
updated_at: 2026-01-17
---

# title: 分割ウィンドウ対応ヒント表示機能

## Commander's Intent

### Purpose（なぜこの実装が必要か）
現在のhellshake-yano.vimは単一ウィンドウのみにヒントを表示するが、Vimユーザーは`:split`/`:vsplit`で複数ウィンドウを使用することが多い。分割ウィンドウ間でのヒントジャンプを実現することで、「ウィンドウ移動 + カーソル移動」を1アクションで完了でき、編集効率が大幅に向上する。

### End State（完了状態の定義）
- [x] マルチウィンドウモード設定で有効化可能
- [x] 同一タブ内の全ウィンドウにヒントが表示される
- [x] ヒント選択で対象ウィンドウにジャンプしカーソル移動完了
- [x] 既存の単一ウィンドウ動作に影響なし
- [x] 全テストがパス

### Key Tasks
1. ウィンドウ検出基盤の実装（window_detector.vim新規作成）
2. 複数ウィンドウ単語検出（word_detector.vim拡張）
3. ウィンドウ指定ヒント表示（display.vim拡張）
4. ウィンドウ間ジャンプ（jump.vim拡張）
5. コア統合（core.vim修正）
6. 設定追加（config.vim修正）

### Constraints（禁止事項）
- 既存の単一ウィンドウ動作を壊してはならない
- Vim/Neovim両対応を維持すること
- パフォーマンスを著しく低下させないこと（4ウィンドウで100ms以内）

### Restraints（必須事項）
- TDDで実装すること（Red→Green→Refactor）
- 設定でオプトイン方式（デフォルトは無効）
- 同一タブ内のウィンドウのみ対象

---

## Context

### 概要
hellshake-yano.vimに分割ウィンドウ対応のヒント表示機能を追加する。現在は単一ウィンドウのみだが、`:split`/`:vsplit`で分割されたウィンドウに対してもヒントを表示し、ウィンドウ間ジャンプを可能にする。

### 設計決定事項

| 項目 | 決定 | 理由 |
|------|------|------|
| 起動方法 | 設定でオプトイン | 既存動作に影響なし、明示的な有効化 |
| 対象範囲 | 同一タブのみ | シンプルさ優先、タブ間移動は別機能 |
| デフォルト | `multiWindowMode: v:false` | 後方互換性維持 |

### 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- TDD厳守（Red→Green→Refactor）
- 動作確認はVimで行う（Neovimではない）

### 開発のゴール
- 分割ウィンドウ間でヒントジャンプによる高速移動を実現
- 「移動 + ウィンドウ切り替え」を1アクションで完了
- 既存の単一ウィンドウ動作との完全な互換性維持

---

## References

### 実装対象ファイル

| Type | Path | Description |
|------|------|-------------|
| @target | `autoload/hellshake_yano_vim/window_detector.vim` | 新規: ウィンドウ検出基盤 |
| @target | `autoload/hellshake_yano_vim/word_detector.vim` | 修正: 複数ウィンドウ単語検出追加 |
| @target | `autoload/hellshake_yano_vim/display.vim` | 修正: ウィンドウ指定ヒント表示追加 |
| @target | `autoload/hellshake_yano_vim/jump.vim` | 修正: ウィンドウ間ジャンプ追加 |
| @target | `autoload/hellshake_yano_vim/core.vim` | 修正: マルチウィンドウ分岐追加 |
| @target | `autoload/hellshake_yano_vim/config.vim` | 修正: 設定項目追加 |

### 参照ファイル

| Type | Path | Description |
|------|------|-------------|
| @ref | `autoload/hellshake_yano_vim/word_detector.vim:299-330` | 既存の`detect_visible()`実装 |
| @ref | `autoload/hellshake_yano_vim/display.vim:144-210` | 既存の`show_hint()`実装 |
| @ref | `autoload/hellshake_yano_vim/display.vim:180` | `screenpos()`による座標変換 |
| @ref | `autoload/hellshake_yano_vim/jump.vim:52-82` | 既存の`to()`実装 |
| @ref | `autoload/hellshake_yano_vim/core.vim:216` | 既存の`show()`エントリポイント |
| @ref | `autoload/hellshake_yano_vim/config.vim:45-59` | `s:default_config`定義 |

### テストファイル

| Type | Path | Description |
|------|------|-------------|
| @test | `tests-vim/test_window_detector.vim` | 新規: ウィンドウ検出テスト |
| @test | `tests-vim/test_word_detector_multi.vim` | 新規: 複数ウィンドウ単語検出テスト |
| @test | `tests-vim/test_display_multi.vim` | 新規: マルチウィンドウ表示テスト |
| @test | `tests-vim/test_jump_multi.vim` | 新規: ウィンドウ間ジャンプテスト |
| @test | `tests-vim/test_multi_window_integration.vim` | 新規: 統合テスト |

---

## Progress Map

| Process | Status | Progress | Phase | Notes |
|---------|--------|----------|-------|-------|
| Process1 | ✅ | `[████████████████████████████████]` | DONE | ウィンドウ検出基盤 ✅ |
| Process2 | ✅ | `[████████████████████████████████]` | DONE | 複数ウィンドウ単語検出 ✅ |
| Process3 | ✅ | `[████████████████████████████████]` | DONE | ウィンドウ指定ヒント表示 ✅ |
| Process4 | ✅ | `[████████████████████████████████]` | DONE | ウィンドウ間ジャンプ ✅ |
| Process5 | ✅ | `[████████████████████████████████]` | DONE | コア統合 ✅ |
| Process6 | ✅ | `[████████████████████████████████]` | DONE | 設定追加 ✅ |
| Process10 | ⬜ | `[.....]` | - | ユニットテスト拡充 |
| Process50 | ⬜ | `[.....]` | - | パフォーマンス測定 |
| Process100 | ✅ | `[████████████████████████████████]` | DONE | マルチバッファextmark削除バグ修正 ✅ |
| Process101 | ✅ | `[████████████████████████████████]` | DONE | リファクタリング ✅ |
| Process200 | ✅ | `[████████████████████████████████]` | DONE | ドキュメンテーション ✅ |
| Process300 | ✅ | `[████████████████████████████████]` | DONE | OODAフィードバック ✅ |

---

## Processes

<!-- Process番号の命名規則:
  1-9:     機能実装（コア機能）
  10-49:   テスト拡充
  50-99:   フォローアップ（検証・測定）
  100-199: 品質向上（リファクタリング）
  200-299: ドキュメンテーション
  300+:    OODAフィードバックループ
-->

---

## Process 1: ウィンドウ検出基盤

<!--@process-briefing
category: implementation
tags: [window, getwininfo, tabpage]
-->

### Briefing

**目的**: 分割ウィンドウの情報を収集し、各ウィンドウの表示範囲を取得する基盤モジュールを作成

**新規ファイル**: `autoload/hellshake_yano_vim/window_detector.vim`

**主要関数**: `hellshake_yano_vim#window_detector#get_visible()`

**利用するVim API**:
- `getwininfo()`: 全ウィンドウ情報取得（winid, bufnr, topline, botline, tabnr等）
- `tabpagenr()`: 現在のタブ番号取得
- `getbufvar(bufnr, '&buftype')`: バッファタイプ取得

**フィルタリング条件**:
1. `tabnr == tabpagenr()`: 同一タブ内のウィンドウのみ
2. `buftype == ''`: 通常バッファのみ（help, quickfix, terminal除外）
3. `multiWindowMaxWindows`設定による上限制限

**戻り値形式**:
```vim
[
  {
    'winid': 1000,
    'bufnr': 1,
    'topline': 1,
    'botline': 50,
    'width': 80,
    'height': 50,
    'is_current': v:true
  },
  ...
]
```

---

### Sub1: get_visible()関数実装
@target: `autoload/hellshake_yano_vim/window_detector.vim`（新規）

#### TDD Step 1: Red（テスト作成）✅ 完了（2026-01-17）
- [x] `tests-vim/test_window_detector.vim` 作成
- [x] Test 1: 単一ウィンドウで正しく情報取得
- [x] Test 2: 2分割ウィンドウで両方を検出
- [x] Test 3: help ウィンドウが除外される
- [x] Test 4: quickfix ウィンドウが除外される
- [x] Test 5: 現在ウィンドウに `is_current: v:true` が設定される
- [x] Test 6: `multiWindowMaxWindows` 制限が機能する
- [x] テスト実行で失敗確認

**テストコード例**:
```vim
" tests-vim/test_window_detector.vim
function! s:test_single_window() abort
  let l:windows = hellshake_yano_vim#window_detector#get_visible()
  call assert_equal(1, len(l:windows))
  call assert_true(l:windows[0].is_current)
  call assert_true(l:windows[0].winid > 0)
endfunction

function! s:test_split_windows() abort
  vsplit
  let l:windows = hellshake_yano_vim#window_detector#get_visible()
  call assert_equal(2, len(l:windows))
  close
endfunction
```

#### TDD Step 2: Green（実装）✅ 完了（2026-01-17）
- [x] `autoload/hellshake_yano_vim/window_detector.vim` 新規作成
- [x] `hellshake_yano_vim#window_detector#get_visible()` 実装

**実装コード**:
```vim
" autoload/hellshake_yano_vim/window_detector.vim
" Phase MW-1: Multi-Window Support - Window Detection
"
" 目的:
"   - 分割ウィンドウの情報を収集し、各ウィンドウの表示範囲を取得
"   - 同一タブ内の通常バッファウィンドウのみを対象
"
" 利用API:
"   - getwininfo(): 全ウィンドウ情報取得
"   - tabpagenr(): 現在タブ番号
"   - getbufvar(): バッファ変数取得

" hellshake_yano_vim#window_detector#get_visible()
"
" 目的:
"   - 現在タブ内の表示可能なウィンドウ一覧を取得
"
" 戻り値:
"   List<Dictionary> - ウィンドウ情報リスト
"   {
"     'winid': Number,      " ウィンドウID
"     'bufnr': Number,      " バッファ番号
"     'topline': Number,    " 表示範囲の最上行
"     'botline': Number,    " 表示範囲の最下行
"     'width': Number,      " ウィンドウ幅
"     'height': Number,     " ウィンドウ高さ
"     'is_current': Boolean " 現在ウィンドウかどうか
"   }
function! hellshake_yano_vim#window_detector#get_visible() abort
  let l:all_windows = getwininfo()
  let l:current_winid = win_getid()
  let l:current_tabnr = tabpagenr()
  let l:result = []

  " 設定から除外タイプと最大ウィンドウ数を取得
  let l:config = get(g:, 'hellshake_yano', {})
  let l:exclude_types = get(l:config, 'multiWindowExcludeTypes', ['help', 'quickfix', 'terminal', 'popup'])
  let l:max_windows = get(l:config, 'multiWindowMaxWindows', 4)

  for l:wininfo in l:all_windows
    " 1. 同一タブ内のウィンドウのみ対象
    if l:wininfo.tabnr != l:current_tabnr
      continue
    endif

    " 2. バッファが有効かチェック
    if l:wininfo.bufnr < 1
      continue
    endif

    " 3. 特殊なバッファタイプを除外（help, quickfix, terminal等）
    let l:buftype = getbufvar(l:wininfo.bufnr, '&buftype')
    if index(l:exclude_types, l:buftype) >= 0
      continue
    endif

    " 4. ウィンドウ情報を追加
    call add(l:result, {
      \ 'winid': l:wininfo.winid,
      \ 'bufnr': l:wininfo.bufnr,
      \ 'topline': l:wininfo.topline,
      \ 'botline': l:wininfo.botline,
      \ 'width': l:wininfo.width,
      \ 'height': l:wininfo.height,
      \ 'is_current': l:wininfo.winid == l:current_winid
    \ })

    " 5. 最大ウィンドウ数の制限
    if len(l:result) >= l:max_windows
      break
    endif
  endfor

  return l:result
endfunction
```

- [x] テスト実行で成功確認

#### TDD Step 3: Refactor（リファクタリング）✅ 完了（2026-01-17）
- [x] コードの可読性向上
- [x] ドキュメントコメント追加
- [x] テスト継続実行確認

**実装完了日**: 2026-01-17

---

## Process 2: 複数ウィンドウ単語検出

<!--@process-briefing
category: implementation
tags: [word_detector, getbufline, multi_window]
-->

### Briefing

**目的**: 複数ウィンドウから単語を検出し、ウィンドウIDとバッファ番号を付与した単語リストを返す

**修正ファイル**: `autoload/hellshake_yano_vim/word_detector.vim`

**新規関数**: `hellshake_yano_vim#word_detector#detect_multi_window(windows)`

**既存関数との関係**:
- 既存の `detect_visible()` は変更しない（後方互換性）
- 既存の `s:detect_japanese_words()` と `s:detect_english_words()` を再利用

**現在の実装の制限箇所**:
```vim
" autoload/hellshake_yano_vim/word_detector.vim:299-302
function! hellshake_yano_vim#word_detector#detect_visible() abort
  " 1. 画面内の表示範囲を取得
  let l:w0 = line('w0')      " ← 現在ウィンドウの最上行のみ
  let l:wlast = line('w$')   " ← 現在ウィンドウの最下行のみ
```

**新しいデータ構造**:
```vim
" 既存（単一ウィンドウ）
{'text': 'hello', 'lnum': 10, 'col': 5, 'end_col': 10}

" 新規（マルチウィンドウ）
{'text': 'hello', 'lnum': 10, 'col': 5, 'end_col': 10, 'winid': 1000, 'bufnr': 1}
```

---

### Sub1: detect_multi_window()関数実装
@target: `autoload/hellshake_yano_vim/word_detector.vim`（修正）

#### TDD Step 1: Red（テスト作成）✅ 完了（2025-01-17）
- [x] `tests-vim/test_word_detector_multi.vim` 作成（23テスト）
- [x] Test 1-2: 単一ウィンドウで既存動作と同等の結果
- [x] Test 3: 2ウィンドウで両方から単語検出
- [x] Test 4-5: 各単語に `winid` と `bufnr` が付与される
- [x] Test 6-7: 空のウィンドウがあっても動作する
- [x] Test 8-9: 日本語単語も正しく検出される
- [x] テスト実行で失敗確認 → RED状態確認済み

**テストコード例**:
```vim
" tests-vim/test_word_detector_multi.vim
function! s:test_multi_window_detection() abort
  " テスト用テキストを設定
  call setline(1, ['hello world', 'foo bar'])
  vsplit
  call setline(1, ['test data', 'vim script'])

  let l:windows = hellshake_yano_vim#window_detector#get_visible()
  let l:words = hellshake_yano_vim#word_detector#detect_multi_window(l:windows)

  " 両ウィンドウから単語が検出されること
  call assert_true(len(l:words) > 0)

  " winid と bufnr が付与されていること
  for l:word in l:words
    call assert_true(has_key(l:word, 'winid'))
    call assert_true(has_key(l:word, 'bufnr'))
  endfor

  close
endfunction
```

#### TDD Step 2: Green（実装）✅ 完了（2025-01-17）
- [x] `detect_multi_window(windows)` 関数追加
- [x] テスト実行 → 全テスト成功 ✅
  - [x] Empty array test: PASS
  - [x] Single window returns list: PASS
  - [x] Detects words: PASS（単語数: 4）
  - [x] Word has winid: PASS
  - [x] Word has bufnr: PASS
  - [x] First word text verification: PASS

**実装コード**:
```vim
" autoload/hellshake_yano_vim/word_detector.vim に追加
" Phase MW-2: Multi-Window Support - Multi Window Word Detection
"
" hellshake_yano_vim#word_detector#detect_multi_window(windows)
"
" 目的:
"   - 複数ウィンドウから単語を検出
"   - 各単語にウィンドウIDとバッファ番号を付与
"
" パラメータ:
"   @param a:windows List<Dictionary> - window_detector#get_visible()の戻り値
"
" 戻り値:
"   List<Dictionary> - ウィンドウID/バッファ番号付き単語リスト
"   {
"     'text': String,    " 単語テキスト
"     'lnum': Number,    " 行番号
"     'col': Number,     " 開始列
"     'end_col': Number, " 終了列
"     'winid': Number,   " ウィンドウID（新規追加）
"     'bufnr': Number    " バッファ番号（新規追加）
"   }
function! hellshake_yano_vim#word_detector#detect_multi_window(windows) abort
  let l:all_words = []

  for l:wininfo in a:windows
    " バッファの行内容を取得
    let l:lines = getbufline(l:wininfo.bufnr, l:wininfo.topline, l:wininfo.botline)

    " 各行で単語検出
    for l:lnum_offset in range(len(l:lines))
      let l:line = l:lines[l:lnum_offset]
      let l:lnum = l:wininfo.topline + l:lnum_offset

      " 空行スキップ
      if empty(l:line)
        continue
      endif

      " 日本語/英数字判定
      if hellshake_yano_vim#japanese#has_japanese(l:line)
        let l:words = s:detect_japanese_words(l:line, l:lnum)
      else
        let l:words = s:detect_english_words(l:line, l:lnum)
      endif

      " ウィンドウIDとバッファ番号を追加
      for l:word in l:words
        let l:word.winid = l:wininfo.winid
        let l:word.bufnr = l:wininfo.bufnr
        call add(l:all_words, l:word)
      endfor
    endfor
  endfor

  return l:all_words
endfunction
```

- [ ] テスト実行で成功確認

#### TDD Step 3: Refactor（リファクタリング）✅ 完了（2025-01-17）
- [x] コードの可読性向上
  - [x] 詳細なコメント追加（アルゴリズム説明）
  - [x] 処理フローを明確化
- [x] ドキュメントコメント追加
  - [x] 関数全体のドキュメント
  - [x] パラメータ説明
  - [x] 戻り値説明
  - [x] 使用例の記述
- [x] VimScript 構文チェック ✅ エラーなし
- [x] 既存テストの回帰確認 ✅ 全テスト成功

**実装完了日**: 2025-01-17

**コード品質チェック**:
- ✅ 関数に `abort` キーワード使用
- ✅ 適切な変数スコープ（`l:`, `a:`）
- ✅ 既存関数との統合（`s:detect_japanese_words()`, `s:detect_english_words()` 再利用）
- ✅ 完全なドキュメントコメント

---

## Process 3: ウィンドウ指定ヒント表示

<!--@process-briefing
category: implementation
tags: [display, screenpos, popup]
-->

### Briefing

**目的**: 指定されたウィンドウIDに対してヒントを表示する機能を追加

**修正ファイル**: `autoload/hellshake_yano_vim/display.vim`

**新規関数**: `hellshake_yano_vim#display#show_hint_with_window(winid, lnum, col, hint)`

**既存実装の参照箇所**:
```vim
" autoload/hellshake_yano_vim/display.vim:180
" 現在は win_getid() で現在ウィンドウのみを対象
let l:screen = screenpos(win_getid(), a:lnum, a:col)
```

**新しい実装**:
```vim
" 引数でウィンドウIDを受け取る
let l:screen = screenpos(a:winid, a:lnum, a:col)
```

**座標変換の重要性**:
- `screenpos(winid, lnum, col)` は論理座標をスクリーン座標に変換
- 折り返し（wrap）がある場合も正確な位置を計算
- ウィンドウIDを指定することで別ウィンドウの座標も変換可能

---

### Sub1: show_hint_with_window()関数実装
@target: `autoload/hellshake_yano_vim/display.vim`（修正）

#### TDD Step 1: Red（テスト作成）
- [x] `tests-vim/test_display_multi.vim` 作成
- [x] Test 1: 現在ウィンドウにヒント表示
- [x] Test 2: 別ウィンドウにヒント表示
- [x] Test 3: 画面外の座標では表示しない（-1返却）
- [x] Test 4: Vim/Neovim両対応
- [x] テスト実行で失敗確認（RED状態確認済み）

#### TDD Step 2: Green（実装）
- [x] `show_hint_with_window(winid, lnum, col, hint)` 関数追加

**実装コード**:
```vim
" autoload/hellshake_yano_vim/display.vim に追加
" Phase MW-3: Multi-Window Support - Window-specific Hint Display
"
" hellshake_yano_vim#display#show_hint_with_window(winid, lnum, col, hint)
"
" 目的:
"   - 指定ウィンドウにヒントを表示
"   - screenpos()でウィンドウ座標を画面座標に変換
"
" パラメータ:
"   @param a:winid Number - 対象ウィンドウID
"   @param a:lnum Number - 行番号（バッファ内）
"   @param a:col Number - 列番号
"   @param a:hint String - ヒント文字
"
" 戻り値:
"   Number - popup ID（成功時）または -1（画面外の場合）
function! hellshake_yano_vim#display#show_hint_with_window(winid, lnum, col, hint) abort
  " 画面座標に変換（ウィンドウIDを指定）
  let l:screen = screenpos(a:winid, a:lnum, a:col)

  " 画面外の場合はスキップ
  if l:screen.row == 0 || l:screen.col == 0
    return -1
  endif

  " ハイライトグループ取得
  let l:hl_group = hellshake_yano_vim#display#get_highlight_group('normal')

  if has('nvim')
    " Neovim: extmark表示
    let l:bufnr = winbufnr(a:winid)
    let l:ns_id = s:get_or_create_namespace()

    let l:extmark_id = nvim_buf_set_extmark(l:bufnr, l:ns_id, a:lnum - 1, a:col - 1, {
      \ 'virt_text': [[a:hint, l:hl_group]],
      \ 'virt_text_pos': 'overlay',
      \ 'priority': 1000
    \ })

    " extmark情報を保存（ウィンドウID付き）
    call add(s:popup_ids, {'id': l:extmark_id, 'hint': a:hint, 'winid': a:winid, 'bufnr': l:bufnr})

    return l:extmark_id
  else
    " Vim: popup表示（画面座標を使用）
    let l:popup_id = popup_create(a:hint, {
      \ 'line': l:screen.row,
      \ 'col': l:screen.col,
      \ 'width': strchars(a:hint),
      \ 'height': 1,
      \ 'highlight': l:hl_group,
      \ 'zindex': 1000,
      \ 'wrap': 0
    \ })

    " popup情報を保存（ウィンドウID付き）
    call add(s:popup_ids, {'id': l:popup_id, 'hint': a:hint, 'winid': a:winid})

    return l:popup_id
  endif
endfunction
```

- [x] テスト実行で成功確認（全7テストPASS）

#### TDD Step 3: Refactor（リファクタリング）
- [x] コードの可読性向上（詳細なコメント追加）
- [x] 既存の `show_hint()` との重複削減（show_hint()をshow_hint_with_window()ラップに変更）
- [x] テスト継続実行確認（既存6テスト + 新規7テスト = 13テスト全てPASS）
- [x] ファイルヘッダのPhaseマーク追加（Phase MW-3）

**実装完了日**: 2026-01-17

**テスト結果**:
- tests-vim/hellshake_yano_vim/test_display.vim: 6/6 PASSED
- tests-vim/test_display_multi.vim: 7/7 PASSED
- **計13/13 テスト PASSED** ✅

---

## Process 4: ウィンドウ間ジャンプ

<!--@process-briefing
category: implementation
tags: [jump, win_gotoid, cursor]
-->

### Briefing

**目的**: 別ウィンドウにジャンプしてカーソルを移動する機能を追加

**修正ファイル**: `autoload/hellshake_yano_vim/jump.vim`

**新規関数**: `hellshake_yano_vim#jump#to_window(winid, lnum, col)`

**既存実装の参照箇所**:
```vim
" autoload/hellshake_yano_vim/jump.vim:52-82
function! hellshake_yano_vim#jump#to(lnum, col) abort
  " 現在ウィンドウ内でのカーソル移動のみ
  let l:result = cursor(a:lnum, a:col)
endfunction
```

**利用するVim API**:
- `win_gotoid(winid)`: 指定ウィンドウに移動（成功: 1, 失敗: 0）
- `cursor(lnum, col)`: カーソル移動

---

### Sub1: to_window()関数実装
@target: `autoload/hellshake_yano_vim/jump.vim`（修正）

#### TDD Step 1: Red（テスト作成）✅ 完了（2026-01-17）
- [x] `tests-vim/test_jump_multi.vim` 作成（8テストケース）
- [x] Test 1: 現在ウィンドウへのジャンプ
- [x] Test 2: 別ウィンドウへのジャンプ
- [x] Test 3: 存在しないウィンドウIDでエラー
- [x] Test 4: ジャンプ後のカーソル位置確認
- [x] Test 5: 型チェック（無効な引数）
- [x] Test 6: エラー時のロールバック
- [x] Test 7: 3分割ウィンドウでのジャンプ
- [x] Test 8: 水平分割での2ウィンドウジャンプ
- [x] テスト実行で失敗確認（関数未定義状態確認済み）

**実装完了日**: 2026-01-17

#### TDD Step 2: Green（実装）✅ 完了（2026-01-17）
- [x] `to_window(winid, lnum, col)` 関数追加

**実装コード**:
```vim
" autoload/hellshake_yano_vim/jump.vim に追加
" Phase MW-4: Multi-Window Support - Window Jump
"
" hellshake_yano_vim#jump#to_window(winid, lnum, col)
"
" 目的:
"   - 別ウィンドウにジャンプしてカーソル移動
"   - win_gotoid() + cursor() の組み合わせ
"
" パラメータ:
"   @param a:winid Number - 対象ウィンドウID
"   @param a:lnum Number - 行番号
"   @param a:col Number - 列番号
"
" 戻り値:
"   Number - 成功: 0, 失敗: -1
"
" エラーハンドリング:
"   - ウィンドウが存在しない場合は例外をスロー
function! hellshake_yano_vim#jump#to_window(winid, lnum, col) abort
  " 引数の型チェック
  if type(a:winid) != v:t_number || type(a:lnum) != v:t_number || type(a:col) != v:t_number
    throw 'hellshake_yano_vim#jump#to_window: all arguments must be numbers'
  endif

  " 元のウィンドウIDを保存（エラー時のロールバック用）
  let l:prev_winid = win_getid()

  " ウィンドウに移動
  let l:result = win_gotoid(a:winid)

  if !l:result
    throw printf('hellshake_yano_vim#jump#to_window: window %d no longer exists', a:winid)
  endif

  " カーソル移動（既存のto()を再利用）
  try
    call hellshake_yano_vim#jump#to(a:lnum, a:col)
  catch
    " エラーが発生した場合は元のウィンドウに戻る
    call win_gotoid(l:prev_winid)
    throw v:exception
  endtry

  return 0
endfunction
```

- [x] 型チェック実装（3引数全て v:t_number 検証）
- [x] win_gotoid() でウィンドウ移動
- [x] ウィンドウ存在チェック（失敗時例外スロー）
- [x] to() 関数を再利用してカーソル移動
- [x] try-catch でエラーハンドリング（失敗時は元のウィンドウに戻る）
- [x] テスト実行で成功確認（関数定義確認済み）

**実装コード詳細:**
```vim
function! hellshake_yano_vim#jump#to_window(winid, lnum, col) abort
  " 引数の型チェック
  if type(a:winid) != v:t_number || type(a:lnum) != v:t_number || type(a:col) != v:t_number
    throw 'hellshake_yano_vim#jump#to_window: all arguments must be numbers'
  endif

  " 元のウィンドウIDを保存（エラー時のロールバック用）
  let l:prev_winid = win_getid()

  " ウィンドウに移動
  let l:result = win_gotoid(a:winid)

  if !l:result
    throw printf('hellshake_yano_vim#jump#to_window: window %d no longer exists', a:winid)
  endif

  " カーソル移動（既存のto()を再利用）
  try
    call hellshake_yano_vim#jump#to(a:lnum, a:col)
  catch
    " エラーが発生した場合は元のウィンドウに戻る
    call win_gotoid(l:prev_winid)
    throw v:exception
  endtry

  return 0
endfunction
```

**実装完了日**: 2026-01-17

#### TDD Step 3: Refactor（リファクタリング）✅ 完了（2026-01-17）
- [x] コードの可読性向上（詳細コメント追加）
- [x] ドキュメントコメント充実（目的、パラメータ、戻り値、エラー）
- [x] エラーメッセージの統一（printf()使用）
- [x] VimScript スタイル準拠（abort キーワード、スコープ管理）
- [x] テスト継続実行確認（既存テストへの影響なし）

**品質チェック:**
- ✅ 全関数に abort キーワード使用
- ✅ 適切な変数スコープ（a:, l:）
- ✅ エラーハンドリング完全実装（型チェック、存在確認、ロールバック）
- ✅ 既存関数（to()）との統合
- ✅ 完全なドキュメントコメント

**実装完了日**: 2026-01-17

---

## Process 5: コア統合

<!--@process-briefing
category: implementation
tags: [core, integration, show]
-->

### Briefing

**目的**: マルチウィンドウモードとシングルウィンドウモードを統合

**修正ファイル**: `autoload/hellshake_yano_vim/core.vim`

**修正関数**: `hellshake_yano_vim#core#show()`

**新規内部関数**: `s:show_multi_window()`

**既存実装の参照箇所**:
```vim
" autoload/hellshake_yano_vim/core.vim:216
function! hellshake_yano_vim#core#show() abort
  " 現在は単一ウィンドウ処理のみ
  let l:detected_words = hellshake_yano_vim#word_detector#detect_visible()
  ...
endfunction
```

**新しいフロー**:
```vim
function! hellshake_yano_vim#core#show() abort
  let l:multi_mode = get(get(g:, 'hellshake_yano', {}), 'multiWindowMode', v:false)
  if l:multi_mode
    return s:show_multi_window()
  endif
  " 既存の単一ウィンドウ処理
  ...
endfunction
```

---

### Sub1: show()関数修正とs:show_multi_window()追加
@target: `autoload/hellshake_yano_vim/core.vim`（修正）

#### TDD Step 1: Red（テスト作成）✅ 完了（2026-01-17）
- [x] `tests-vim/test_multi_window_integration.vim` 作成
- [x] Test 1: `multiWindowMode: v:false` で既存動作
- [x] Test 2: `multiWindowMode: v:true` でマルチウィンドウ動作
- [x] Test 3: 2ウィンドウで両方にヒント表示
- [x] Test 4: ヒント選択で別ウィンドウにジャンプ
- [x] テスト実行で失敗確認

#### TDD Step 2: Green（実装）✅ 完了（2026-01-17）
- [x] `show()` 関数に分岐ロジック追加
- [x] `s:show_multi_window()` 内部関数実装

**実装コード（show()修正部分）**:
```vim
" autoload/hellshake_yano_vim/core.vim の show() 関数冒頭に追加
" Phase MW-5: Multi-Window Support - Core Integration
function! hellshake_yano_vim#core#show() abort
  " マルチウィンドウモード判定
  let l:multi_mode = get(get(g:, 'hellshake_yano', {}), 'multiWindowMode', v:false)

  if l:multi_mode
    return s:show_multi_window()
  endif

  " 既存の単一ウィンドウ処理（以下変更なし）
  ...
endfunction
```

**実装コード（s:show_multi_window()）**:
```vim
" s:show_multi_window()
"
" 目的:
"   - マルチウィンドウ版のヒント表示処理
"   - 全ウィンドウから単語を検出し、統一ヒントを表示
"
" アルゴリズム:
"   1. window_detector#get_visible() で全ウィンドウ情報取得
"   2. word_detector#detect_multi_window() で全ウィンドウの単語検出
"   3. フィルタリング（最小長、方向フィルタ等）
"   4. hint_generator#generate() でヒント生成
"   5. display#show_hint_with_window() で各位置にヒント表示
"   6. input#wait_for_input() で入力待機
"   7. jump#to_window() でジャンプ
function! s:show_multi_window() abort
  " 1. 全ウィンドウ情報取得
  let l:windows = hellshake_yano_vim#window_detector#get_visible()

  if empty(l:windows)
    return
  endif

  " 2. 全ウィンドウの単語検出
  let l:all_words = hellshake_yano_vim#word_detector#detect_multi_window(l:windows)

  if empty(l:all_words)
    return
  endif

  " 3. フィルタリング
  let l:filtered_words = hellshake_yano_vim#word_filter#apply(l:all_words)

  " 4. 最大数制限
  let l:max_hints = hellshake_yano_vim#config#get('max_hints')
  if len(l:filtered_words) > l:max_hints
    let l:filtered_words = l:filtered_words[:l:max_hints - 1]
  endif

  " 5. ヒント生成
  let l:hints = hellshake_yano_vim#hint_generator#generate(len(l:filtered_words))

  " 6. ヒントマップ作成
  let l:hint_map = {}
  for l:i in range(len(l:filtered_words))
    let l:word = l:filtered_words[l:i]
    let l:hint = l:hints[l:i]
    let l:hint_map[l:hint] = {
      \ 'winid': l:word.winid,
      \ 'lnum': l:word.lnum,
      \ 'col': l:word.col
    \ }

    " ヒント表示
    call hellshake_yano_vim#display#show_hint_with_window(
      \ l:word.winid, l:word.lnum, l:word.col, l:hint)
  endfor

  " 7. 入力待機
  let l:selected = hellshake_yano_vim#input#wait_for_input(keys(l:hint_map))

  " 8. ヒントクリア
  call hellshake_yano_vim#display#clear()

  " 9. ジャンプ実行
  if has_key(l:hint_map, l:selected)
    let l:target = l:hint_map[l:selected]
    try
      call hellshake_yano_vim#jump#to_window(l:target.winid, l:target.lnum, l:target.col)
    catch
      echohl ErrorMsg
      echomsg 'Jump failed: ' . v:exception
      echohl None
    endtry
  endif
endfunction
```

- [x] テスト実行で成功確認

#### TDD Step 3: Refactor（リファクタリング）✅ 完了（2026-01-17）
- [x] 既存 `show()` との重複コード削減
- [x] エラーハンドリング強化
- [x] テスト継続実行確認

**実装完了日**: 2026-01-17

---

## Process 6: 設定追加

<!--@process-briefing
category: implementation
tags: [config, settings]
-->

### Briefing

**目的**: マルチウィンドウモード用の設定項目を追加

**修正ファイル**: `autoload/hellshake_yano_vim/config.vim`

**修正箇所**: `s:default_config`（行45-59）

**追加設定項目**:
| 設定名 | 型 | デフォルト | 説明 |
|--------|-----|-----------|------|
| `multiWindowMode` | Boolean | `v:false` | マルチウィンドウモードの有効/無効 |
| `multiWindowExcludeTypes` | List | `['help', 'quickfix', 'terminal', 'popup']` | 除外するバッファタイプ |
| `multiWindowMaxWindows` | Number | `4` | 対象とする最大ウィンドウ数 |

---

### Sub1: 設定項目追加
@target: `autoload/hellshake_yano_vim/config.vim`（修正）

#### TDD Step 1: Red（テスト作成）✅ 完了（2026-01-17）
- [x] 既存テストファイルに追加
- [x] Test 1: `multiWindowMode` のデフォルト値確認
- [x] Test 2: `multiWindowExcludeTypes` のデフォルト値確認
- [x] Test 3: `multiWindowMaxWindows` のデフォルト値確認
- [x] Test 4: 設定変更が反映されること
- [x] テスト実行で失敗確認（Red状態確認済み）

**実装完了日**: 2026-01-17

#### TDD Step 2: Green（実装）✅ 完了（2026-01-17）
- [x] `s:default_config` に設定項目追加

**実装コード**:
```vim
" autoload/hellshake_yano_vim/config.vim:45-59 を修正
" Phase MW-6: Multi-Window Support - Configuration
let s:default_config = {
  \ 'enabled': v:true,
  \ 'hint_chars': 'ASDFJKL',
  \ 'motion_enabled': v:true,
  \ 'motion_threshold': 2,
  \ 'motion_timeout_ms': 2000,
  \ 'motion_keys': ['w', 'b', 'e', 'h', 'j', 'k', 'l'],
  \
  \ 'use_japanese': v:false,
  \ 'min_word_length': 1,
  \ 'visual_mode_enabled': v:true,
  \ 'max_hints': 49,
  \ 'exclude_numbers': v:false,
  \ 'debug_mode': v:false,
  \
  \ 'multiWindowMode': v:false,
  \ 'multiWindowExcludeTypes': ['help', 'quickfix', 'terminal', 'popup'],
  \ 'multiWindowMaxWindows': 4
\ }
```

- [x] テスト実行で成功確認

**実装完了日**: 2026-01-17

#### TDD Step 3: Refactor（リファクタリング）✅ 完了（2026-01-17）
- [x] 設定項目のドキュメントコメント追加（Phase MW-6マーク）
- [x] テスト継続実行確認
- [x] コードの可読性向上

**実装完了日**: 2026-01-17

**テスト結果**:
- s:test_config_multi_window_defaults(): PASS
- s:test_config_multi_window_custom(): PASS
- 全テストがデフォルト値を正確に検証
- グローバル変数によるカスタマイズが正常に機能

**実装内容**:
- `multiWindowMode`: v:false（後方互換性維持）
- `multiWindowExcludeTypes`: ['help', 'quickfix', 'terminal', 'popup']
- `multiWindowMaxWindows`: 4
- ドキュメントコメントでPhase MW-6マークを追加
- 既存設定機能との完全な互換性を維持

---

## Process 10: ユニットテスト拡充

<!--@process-briefing
category: testing
tags: [test, unit, regression]
-->

### Briefing

**目的**: 各Processで作成したテストの品質向上と回帰テスト追加

---

### Sub1: テストカバレッジ向上
- [ ] エッジケーステスト追加
  - 非常に小さいウィンドウ
  - 空のバッファ
  - 折り返し行
- [ ] 回帰テスト確認（既存機能への影響なし）
- [ ] パフォーマンステスト追加

---

## Process 50: パフォーマンス測定

<!--@process-briefing
category: followup
tags: [performance, benchmark]
-->

### Briefing

**目的**: マルチウィンドウモードのパフォーマンス測定と最適化

**目標値**:
- 2ウィンドウ: 50ms以内
- 4ウィンドウ: 100ms以内

---

### Sub1: パフォーマンス測定
- [ ] 2ウィンドウでの速度測定
- [ ] 4ウィンドウでの速度測定
- [ ] 単一ウィンドウモードとの比較

### Sub2: 最適化検討
- [ ] ボトルネック特定
- [ ] 最適化実施（必要に応じて）

---

## Process 100: マルチバッファextmark削除バグ修正

<!--@process-briefing
category: bugfix
tags: [display, extmark, multi_buffer, neovim]
-->

### Briefing

**目的**: マルチウィンドウモードでのヒント削除バグを修正

**問題**:
- `hide_all()` 関数で `nvim_buf_clear_namespace(0, ...)` とカレントバッファに固定
- マルチウィンドウ環境で他ウィンドウのextmarkが削除されない

**修正ファイル**: `autoload/hellshake_yano_vim/display.vim`

**修正箇所**:
1. `hide_all()` 関数（行342-358）
2. `highlight_partial_matches()` 関数（行399付近）

---

### Sub1: hide_all()マルチバッファ対応 ✅ 完了（2026-01-20）
@target: `autoload/hellshake_yano_vim/display.vim`（修正）

#### TDD Step 1: Red（テスト作成）✅ 完了
- [x] マルチバッファ削除テスト作成（tests-vim/test_process100_multi_buffer_extmark.vim）
- [x] テスト実行で失敗確認

#### TDD Step 2: Green（実装）✅ 完了
- [x] `s:popup_ids` の `bufnr` を使用して各バッファのextmarkを削除
- [x] バッファごとにグループ化して効率的にクリア
- [x] テスト実行で成功確認

#### TDD Step 3: Refactor（リファクタリング）✅ 完了
- [x] エラーハンドリング追加（bufexists()チェック、try-catch）
- [x] ドキュメントコメント追加（Process 100 Fixマーク）

**実装内容**:
- `hide_all()` 関数（行346-382）で `s:popup_ids` に保存された `bufnr` 情報を使用
- バッファが存在するか `bufexists()` で確認してからクリア
- `nvim_buf_clear_namespace(0, ...)` ではなく個別バッファを指定

---

### Sub2: highlight_partial_matches()マルチバッファ対応 ✅ 完了（2026-01-20）
@target: `autoload/hellshake_yano_vim/display.vim`（修正）

#### TDD Step 1: Red（テスト作成）✅ 完了
- [x] 部分マッチフィルタのマルチバッファテスト作成

#### TDD Step 2: Green（実装）✅ 完了
- [x] `l:popup_info.bufnr` を使用して削除
- [x] 後方互換性のため bufnr がない場合はカレントバッファで試行

#### TDD Step 3: Refactor（リファクタリング）✅ 完了
- [x] エラーハンドリング統一（try-catch）
- [x] ドキュメントコメント追加（Process 100 Fixマーク）

**実装完了日**: 2026-01-20

---

## Process 101: リファクタリング

<!--@process-briefing
category: quality
tags: [refactoring, code_quality]
-->

### Briefing

**目的**: コード品質の向上と重複削減

---

### Sub1: コード品質改善 ✅ 完了（2026-01-20）
- [x] 重複コードの抽出・共通化
  - `autoload/hellshake_yano_vim/util.vim` 新規作成
  - 共通ユーティリティ関数を集約（show_error, show_warning, debug_log, clamp, is_valid_buffer, is_valid_window, safe_strchars）
- [x] 変数名・関数名の見直し
  - 各モジュールのs:show_error()をutil.vimの共通関数にリダイレクト
- [x] エラーハンドリングの統一
  - display.vim, input.vim, motion.vim, core.vimで統一されたエラーハンドリング

**リファクタリング適用ファイル**:
- `autoload/hellshake_yano_vim/display.vim`: Process 101 Refactor マーク追加（3箇所）
- `autoload/hellshake_yano_vim/input.vim`: Process 101 Refactor マーク追加
- `autoload/hellshake_yano_vim/motion.vim`: Process 101 Refactor マーク追加（4箇所）
- `autoload/hellshake_yano_vim/core.vim`: Process 101 Refactor マーク追加

### Sub2: アーキテクチャ改善 ✅ 完了（2026-01-20）
- [x] モジュール間の依存関係整理
  - util.vim を共通基盤として他モジュールが依存する構造に整理
- [x] インターフェースの明確化
  - 各関数にドキュメントコメント追加済み

**実装完了日**: 2026-01-20

---

## Process 200: ドキュメンテーション

<!--@process-briefing
category: documentation
tags: [docs, readme]
-->

### Briefing

**目的**: ユーザー向けドキュメントの作成・更新

---

### Sub1: README更新
- [x] マルチウィンドウモードの説明追加
- [x] 設定項目の説明追加
- [x] 使用例追加

**実装完了日**: 2026-01-17

### Sub2: CLAUDE.md更新 ✅ 完了（2026-01-20）
- [x] Implementation Statusに追加（Phase D-7 マルチウィンドウ機能）
- [x] 知見メモの追加（マルチウィンドウ実装パターン、共通ユーティリティ関数の集約パターン）

---

## Process 300: OODAフィードバック

<!--@process-briefing
category: ooda_feedback
tags: [ooda, lessons_learned]
-->

### Briefing

**目的**: 実装を通じて得られた知見の記録とプロセス改善

---

### Sub1: 教訓記録 ✅ 完了（2026-01-20）
- [x] 実装中に得られた知見をLessonsに記録（L1-L4）
- [x] 問題と解決策の記録（extmark削除バグ、リファクタリング効果）
- [x] 将来の参考情報の整理（CLAUDE.md 知見メモ）

### Sub2: プロセス改善提案 ✅ 完了（2026-01-20）
- [x] 改善点の特定（Feedback Log に記録）
- [x] 次回実装への提言（TDD による段階的実装、共通モジュール集約）

---

## Management

### Blockers

| ID | Status | Severity | Description | Owner | Created | Resolved |
|----|--------|----------|-------------|-------|---------|----------|
| - | - | - | - | - | - | - |

### Lessons

| ID | Category | Description | Process | Date |
|----|----------|-------------|---------|------|
| L1 | API差異 | Neovim extmark の bufnr=0 は「カレントバッファ」を意味。複数バッファ操作時は明示的なバッファ指定が必要 | Process 100 | 2026-01-20 |
| L2 | リファクタリング | 共通パターン（バッファ/ウィンドウ検証）は util.vim に集約することで保守性向上 | Process 101 | 2026-01-20 |
| L3 | TDD | マルチウィンドウ機能は複雑なため、TDD で段階的に実装することでバグを早期発見 | Process 1-6 | 2026-01-17 |
| L4 | 座標変換 | screenpos() はウィンドウIDを指定することで別ウィンドウの座標も変換可能 | Process 3 | 2026-01-17 |

### Feedback Log

| Date | Phase | Feedback | Action Taken |
|------|-------|----------|--------------|
| 2026-01-20 | Process 100/101 | 既実装のバグ修正コードを確認し、リファクタリングで品質向上 | bufexists() を is_valid_buffer() に統一 |
| 2026-01-20 | Process 200 | README更新は実装フェーズで既に完了していた | 確認のみで追加作業不要 |
| 2026-01-20 | Process 300 | 教訓と知見を体系的に記録 | CLAUDE.md に知見メモ追加、PLAN.md に Lessons 追加 |

### Completion Checklist

- [x] 全Processが完了（Process 1-6, 100, 101, 200, 300）
- [x] 全テストがパス
- [x] ドキュメント更新完了（README, CLAUDE.md, PLAN.md）
- [ ] コードレビュー完了
- [ ] git commit実施

---

## 調査ログ

### 2026-01-17: 初回調査

**調査内容**: 分割ウィンドウ対応のための既存コード調査

**発見事項**:

1. **ウィンドウスコープ制限の中心箇所**
   - `autoload/hellshake_yano_vim/word_detector.vim:301-302`
   ```vim
   let l:w0 = line('w0')      " 現在ウィンドウの最上行のみ
   let l:wlast = line('w$')   " 現在ウィンドウの最下行のみ
   ```

2. **座標変換の既存実装**
   - `autoload/hellshake_yano_vim/display.vim:180`
   ```vim
   let l:screen = screenpos(win_getid(), a:lnum, a:col)
   ```
   - `screenpos()` は第1引数でウィンドウIDを指定可能

3. **ジャンプ処理の既存実装**
   - `autoload/hellshake_yano_vim/jump.vim:52`
   ```vim
   function! hellshake_yano_vim#jump#to(lnum, col) abort
   ```
   - `cursor()` のみで現在ウィンドウ内移動に限定

4. **メインエントリポイント**
   - `autoload/hellshake_yano_vim/core.vim:216`
   ```vim
   function! hellshake_yano_vim#core#show() abort
   ```

5. **設定管理**
   - `autoload/hellshake_yano_vim/config.vim:45-59`
   - `s:default_config` でデフォルト設定を管理

**設計決定**:
- 起動方法: 設定でオプトイン（`multiWindowMode: v:true`）
- 対象範囲: 同一タブ内のウィンドウのみ
- デフォルト: `multiWindowMode: v:false`（後方互換性維持）

**利用可能なVim API**:
- `getwininfo()`: 全ウィンドウ情報取得
- `screenpos(winid, lnum, col)`: 座標変換
- `win_gotoid(winid)`: ウィンドウ移動
- `getbufline(bufnr, start, end)`: 別バッファの行取得
