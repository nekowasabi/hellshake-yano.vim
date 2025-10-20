" autoload/hellshake_yano_vim/display.vim - Popup/Extmark 表示モジュール
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: GREEN
" Process4: Popup表示の実装
"
" このモジュールはヒントの画面表示を担当します。
" Vim 8.0+ では popup_create() を使用し、Neovim では nvim_buf_set_extmark() を使用します。

" スクリプトローカル変数の定義
let s:save_cpo = &cpo
set cpo&vim

" popup/extmark ID の配列（クリーンアップ用）
" Phase A-3: ヒント文字も保存する拡張版
" 形式: [{'id': popup_id, 'hint': 'a'}, {'id': popup_id, 'hint': 'aa'}, ...]
let s:popup_ids = []

" Neovim の namespace ID（Neovim の場合のみ使用）
let s:ns_id = -1

" Phase D-1 Sub3: カスタムハイライト設定の初期化フラグ
let s:highlight_initialized = v:false

" hellshake_yano_vim#display#get_highlight_group(type) - ハイライトグループ名の取得
"
" 目的:
"   - g:hellshake_yano.highlightHintMarker / highlightHintMarkerCurrent から
"     適切なハイライトグループ名を取得する
"   - 文字列の場合: そのままハイライトグループ名として使用
"   - オブジェクトの場合: 動的にハイライトグループを作成
"
" @param type String 'normal' または 'current'
" @return String ハイライトグループ名
"
" 使用例:
"   let hl_group = hellshake_yano_vim#display#get_highlight_group('normal')
"   " => 'DiffAdd' or 'HellshakeYanoHintMarker'
function! hellshake_yano_vim#display#get_highlight_group(type) abort
  " デフォルト値
  let l:default_normal = 'HintMarker'
  let l:default_current = 'HintMarkerCurrent'

  " 設定を取得
  let l:config_key = a:type ==# 'current' ? 'highlightHintMarkerCurrent' : 'highlightHintMarker'
  let l:default_value = a:type ==# 'current' ? l:default_current : l:default_normal

  " g:hellshake_yano から設定を読み込む
  if !exists('g:hellshake_yano') || !has_key(g:hellshake_yano, l:config_key)
    return l:default_value
  endif

  let l:config_value = g:hellshake_yano[l:config_key]

  " 文字列の場合: ハイライトグループ名として使用
  if type(l:config_value) == v:t_string
    return l:config_value
  endif

  " オブジェクト（辞書）の場合: 動的ハイライトグループを作成
  if type(l:config_value) == v:t_dict
    let l:hl_group_name = a:type ==# 'current' ? 'HellshakeYanoHintMarkerCurrent' : 'HellshakeYanoHintMarker'

    " ハイライトグループを定義（初回のみ、または設定変更時）
    call s:define_highlight_group(l:hl_group_name, l:config_value)

    return l:hl_group_name
  endif

  " その他の場合: デフォルトを返す
  return l:default_value
endfunction

" s:define_highlight_group(name, color_obj) - ハイライトグループの動的定義
"
" 目的:
"   - fg/bg を持つカラーオブジェクトから :highlight コマンドを生成
"
" @param name String ハイライトグループ名
" @param color_obj Dict fg/bg を持つ辞書
"
" 例:
"   call s:define_highlight_group('HellshakeYanoHintMarker', {'fg': '#FFFFFF', 'bg': '#000000'})
"   " => :highlight HellshakeYanoHintMarker guifg=#FFFFFF guibg=#000000 ctermfg=White ctermbg=Black
function! s:define_highlight_group(name, color_obj) abort
  let l:hl_cmd = 'highlight ' . a:name

  " fg (foreground) の設定
  if has_key(a:color_obj, 'fg') && !empty(a:color_obj.fg)
    let l:fg = a:color_obj.fg
    let l:hl_cmd .= ' guifg=' . l:fg

    " cterm色も設定（#RRGGBB形式の場合は近似色を使用）
    if l:fg =~# '^#'
      " GUI色の場合、ctermには名前色を使用（簡易実装）
      let l:hl_cmd .= ' ctermfg=White'
    else
      let l:hl_cmd .= ' ctermfg=' . l:fg
    endif
  endif

  " bg (background) の設定
  if has_key(a:color_obj, 'bg') && !empty(a:color_obj.bg)
    let l:bg = a:color_obj.bg
    let l:hl_cmd .= ' guibg=' . l:bg

    " cterm色も設定
    if l:bg =~# '^#'
      let l:hl_cmd .= ' ctermbg=Black'
    else
      let l:hl_cmd .= ' ctermbg=' . l:bg
    endif
  endif

  " ハイライトグループを定義
  execute l:hl_cmd
endfunction

" hellshake_yano_vim#display#show_hint(lnum, col, hint) - ヒント表示
"
" 目的:
"   - 指定された位置にヒント文字を表示
"   - Vim では popup_create() を使用
"   - Neovim では nvim_buf_set_extmark() を使用
"
" アルゴリズム:
"   1. Vim/Neovim の判定
"   2. 該当するAPIを使用してヒントを表示
"   3. popup/extmark ID を s:popup_ids に保存
"   4. ID を返す
"
" @param lnum Number 行番号（1-indexed）
" @param col Number 列番号（1-indexed）
" @param hint String 表示するヒント文字（例: 'a', 's', 'd'）
" @return Number popup ID (Vim) または extmark ID (Neovim)
"
" 使用例:
"   let popup_id = hellshake_yano_vim#display#show_hint(10, 5, 'a')
"
" 注意事項:
"   - Vim では popup_create() が必要（Vim 8.2+）
"   - Neovim では nvim_buf_set_extmark() が必要（Neovim 0.5+）
function! hellshake_yano_vim#display#show_hint(lnum, col, hint) abort
  if has('nvim')
    " Neovim の場合: nvim_buf_set_extmark() を使用
    return s:show_hint_neovim(a:lnum, a:col, a:hint)
  else
    " Vim の場合: popup_create() を使用
    return s:show_hint_vim(a:lnum, a:col, a:hint)
  endif
endfunction

" s:show_hint_vim(lnum, col, hint) - Vim での popup 表示（内部関数）
"
" 目的:
"   - Vim 8.2+ の popup_create() を使用してヒントを表示
"   - popup ID を s:popup_ids に保存して後でクリーンアップできるようにする
"
" @param lnum Number 行番号（1-indexed）
" @param col Number 列番号（1-indexed）
" @param hint String 表示するヒント文字
" @return Number popup ID（失敗時は -1）
"
" エラーハンドリング:
"   - popup_create() が存在しない場合（Vim 8.1以前）は警告を表示して -1 を返す
function! s:show_hint_vim(lnum, col, hint) abort
  " popup_create() が利用可能かチェック
  if !exists('*popup_create')
    call s:show_error('popup_create() is not available. Please use Vim 8.2 or later.')
    return -1
  endif

  " Phase D-1 Sub3: カスタムハイライトグループを取得
  let l:hl_group = hellshake_yano_vim#display#get_highlight_group('normal')

  " Phase D-6 Sub2 Fix: 論理座標→画面座標に変換（折り返し対応）
  " popup_create() は画面行番号（screen line）を期待するため、
  " screenpos() で論理座標を画面座標に変換する必要がある
  let l:screen = screenpos(win_getid(), a:lnum, a:col)

  " popup を作成（画面座標を使用）
  let l:popup_id = popup_create(a:hint, {
    \ 'line': l:screen.row,
    \ 'col': l:screen.col,
    \ 'width': strlen(a:hint),
    \ 'height': 1,
    \ 'highlight': l:hl_group,
    \ 'zindex': 1000,
    \ 'wrap': 0
  \ })

  " popup ID とヒント文字を保存（クリーンアップ用、Phase A-3拡張）
  call add(s:popup_ids, {'id': l:popup_id, 'hint': a:hint})

  return l:popup_id
endfunction

" s:show_hint_neovim(lnum, col, hint) - Neovim での extmark 表示（内部関数）
"
" 目的:
"   - Neovim の nvim_buf_set_extmark() を使用してヒントを表示
"   - Virtual text を overlay モードで表示し、既存テキストに重ねる
"   - extmark ID を s:popup_ids に保存して後でクリーンアップできるようにする
"
" @param lnum Number 行番号（1-indexed）
" @param col Number 列番号（1-indexed）
" @param hint String 表示するヒント文字
" @return Number extmark ID
"
" 注意事項:
"   - Neovim の API は 0-indexed なので、lnum と col から 1 を引く必要がある
"   - namespace は初回呼び出し時に作成され、以降は再利用される
function! s:show_hint_neovim(lnum, col, hint) abort
  " namespace が未初期化の場合は作成
  if s:ns_id == -1
    let s:ns_id = nvim_create_namespace('hellshake_yano_vim_hint')
  endif

  " Phase D-1 Sub3: カスタムハイライトグループを取得
  let l:hl_group = hellshake_yano_vim#display#get_highlight_group('normal')

  " extmark を作成（行・列は 0-indexed に変換）
  let l:extmark_id = nvim_buf_set_extmark(0, s:ns_id, a:lnum - 1, a:col - 1, {
    \ 'virt_text': [[a:hint, l:hl_group]],
    \ 'virt_text_pos': 'overlay',
    \ 'priority': 1000
  \ })

  " extmark ID とヒント文字を保存（クリーンアップ用、Phase A-3拡張）
  call add(s:popup_ids, {'id': l:extmark_id, 'hint': a:hint})

  return l:extmark_id
endfunction

" hellshake_yano_vim#display#hide_all() - 全 popup/extmark を削除
"
" 目的:
"   - 表示中の全ての popup/extmark を削除
"   - s:popup_ids 配列をクリア
"
" アルゴリズム:
"   1. Vim/Neovim の判定
"   2. 該当するAPIを使用して全 popup/extmark を削除
"   3. s:popup_ids をクリア
"
" 使用例:
"   call hellshake_yano_vim#display#hide_all()
"
" 注意事項:
"   - Vim では popup_close() を使用
"   - Neovim では nvim_buf_clear_namespace() を使用
function! hellshake_yano_vim#display#hide_all() abort
  if has('nvim')
    " Neovim の場合: namespace 全体をクリア
    if s:ns_id != -1
      call nvim_buf_clear_namespace(0, s:ns_id, 0, -1)
    endif
  else
    " Vim の場合: 各 popup を個別に閉じる
    for l:popup_info in s:popup_ids
      if exists('*popup_close')
        call popup_close(l:popup_info.id)
      endif
    endfor
  endif

  " popup_ids 配列をクリア
  let s:popup_ids = []
endfunction

" hellshake_yano_vim#display#highlight_partial_matches(matches) - 部分マッチハイライトの更新
"
" 目的:
"   - 部分マッチしたヒントのみを表示し、マッチしないヒントを非表示にする
"   - Phase A-3: 複数文字ヒント入力時の視覚的フィードバック機能
"
" @param a:matches (List<String>): 部分マッチするヒントのリスト
" @return void
"
" アルゴリズム:
"   1. s:popup_ids に格納された全ポップアップをループ
"   2. matches に含まれないヒントのポップアップを非表示
"   3. matches に含まれるヒントはそのまま表示を維持
"
" 使用例:
"   " 'a', 'aa', 'as' のみ表示し、's', 'sa' を非表示にする
"   call hellshake_yano_vim#display#highlight_partial_matches(['a', 'aa', 'as'])
"
" 注意事項:
"   - Vim では popup_close() を使用
"   - Neovim では nvim_buf_del_extmark() を使用
"   - 非表示にしたポップアップは s:popup_ids から削除される
function! hellshake_yano_vim#display#highlight_partial_matches(matches) abort
  " 新しい popup_ids リスト（マッチしたヒントのみ保持）
  let l:new_popup_ids = []

  for l:popup_info in s:popup_ids
    let l:hint = l:popup_info.hint
    let l:popup_id = l:popup_info.id

    if index(a:matches, l:hint) >= 0
      " 部分マッチ: ポップアップを維持
      call add(l:new_popup_ids, l:popup_info)
    else
      " マッチしない: ポップアップを非表示
      if has('nvim')
        " Neovim: extmark を削除
        if s:ns_id != -1
          try
            call nvim_buf_del_extmark(0, s:ns_id, l:popup_id)
          catch
            " extmark が既に削除されている場合はスキップ
          endtry
        endif
      else
        " Vim: popup を閉じる
        if exists('*popup_close')
          try
            call popup_close(l:popup_id)
          catch
            " popup が既に閉じられている場合はスキップ
          endtry
        endif
      endif
    endif
  endfor

  " popup_ids を更新（マッチしたヒントのみ）
  let s:popup_ids = l:new_popup_ids
endfunction

" hellshake_yano_vim#display#get_popup_count() - 表示中の popup/extmark 数を取得（テスト用）
"
" 目的:
"   - ユニットテストで表示中のヒント数を検証するために使用
"   - 本番環境では使用しない
"
" @return Number 表示中の popup/extmark 数
function! hellshake_yano_vim#display#get_popup_count() abort
  return len(s:popup_ids)
endfunction

" ===========================
" 内部ヘルパー関数
" ===========================

" s:show_error(message) - エラーメッセージを表示（統一されたフォーマット）
"
" 目的:
"   - エラーメッセージを統一されたフォーマットで表示
"   - プラグイン名をプレフィックスとして付与
"
" @param message String エラーメッセージ
function! s:show_error(message) abort
  echohl ErrorMsg
  echomsg 'hellshake_yano_vim#display: ' . a:message
  echohl None
endfunction

" ===========================
" ハイライトグループの定義
" ===========================

" HintMarker ハイライトグループが未定義の場合は定義
" 白文字・赤背景・太字でヒントを目立たせる
if !hlexists('HintMarker')
  highlight default HintMarker ctermfg=White guifg=White ctermbg=Red guibg=Red cterm=bold gui=bold
endif

let &cpo = s:save_cpo
unlet s:save_cpo
