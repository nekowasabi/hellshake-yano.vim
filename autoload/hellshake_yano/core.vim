" autoload/hellshake_yano/core.vim - コア機能（FocusGained/TermLeave対応）
" Author: hellshake-yano
" License: MIT
"
" このモジュールは Denops版 hellshake-yano の FocusGained / TermLeave 対応を担当します。
" Pure VimScript版 (hellshake_yano_vim#core) と同様の機能を提供します。

" スクリプトローカル変数の定義
let s:save_cpo = &cpo
set cpo&vim

" Focus Restore Feature: 画面ちらつき問題の修正
" FocusGained 直後かどうかを示すフラグ
let s:focus_just_restored = v:false

" BufLeave時に記録する前のバッファタイプ
let s:prev_buftype = ''

" タイマーID管理：2回連続発火防止用
let s:focus_timer_id = -1

" hellshake_yano#core#init() - 状態変数の初期化
"
" 目的:
"   - FocusGained autocmd の設定
"   - プラグインの起動時や再初期化時に呼び出される
"
" @return なし
function! hellshake_yano#core#init() abort
  " Focus Restore Feature: フラグを初期化
  let s:focus_just_restored = v:false

  " Focus Restore Feature: FocusGained autocmd の設定
  call s:setup_focus_gained_autocmd()
endfunction

" s:setup_focus_gained_autocmd() - FocusGained/TermLeave autocmd の設定
"
" 目的:
"   - FocusGained イベントで on_focus_gained() を呼び出す autocmd を設定
"   - TermLeave/TermClose イベントも監視（lazygit等のターミナル復帰対応）
"   - multiWindowDetectFocusGained が有効な場合のみ設定
"
" @return なし
function! s:setup_focus_gained_autocmd() abort
  " 既存の autocmd をクリア
  augroup HellshakeYanoDenopsFocusRestore
    autocmd!
  augroup END

  " 設定で有効化されている場合のみ autocmd を設定
  if hellshake_yano#config#get('multiWindowDetectFocusGained', v:true)
    augroup HellshakeYanoDenopsFocusRestore
      autocmd!
      " OS レベルのフォーカス変更
      autocmd FocusGained * call hellshake_yano#core#on_focus_gained()
      " Neovim 内ターミナルからの復帰（lazygit, terminal等）
      autocmd TermLeave * call hellshake_yano#core#on_terminal_leave()
      autocmd TermClose * call hellshake_yano#core#on_terminal_leave()
    augroup END
  endif
endfunction

" hellshake_yano#core#on_focus_gained() - FocusGained イベントハンドラ
"
" 目的:
"   - FocusGained イベント時にフラグを設定
"   - 一定時間後にフラグを自動リセット
"
" @return なし
function! hellshake_yano#core#on_focus_gained() abort
  " 設定で無効化されている場合は何もしない
  if !hellshake_yano#config#get('multiWindowDetectFocusGained', v:true)
    return
  endif

  " フラグを設定
  let s:focus_just_restored = v:true

  " 一定時間後にフラグをリセット（100ms）
  call timer_start(100, {-> s:reset_focus_flag('timer reset 100ms')})
endfunction

" hellshake_yano#core#on_terminal_leave() - TermLeave/TermClose イベントハンドラ
"
" 目的:
"   - ターミナルバッファから離れた時にフラグを設定
"   - lazygit 等の Neovim 内ターミナルからの復帰時のちらつき防止
"   - 2回連続発火によるちらつき防止
"
" @return なし
function! hellshake_yano#core#on_terminal_leave() abort
  " 設定で無効化されている場合は何もしない
  if !hellshake_yano#config#get('multiWindowDetectFocusGained', v:true)
    return
  endif

  " 既にフラグがtrueの場合は重複呼び出しをスキップ
  if s:focus_just_restored == v:true
    return
  endif

  " フラグを設定
  let s:focus_just_restored = v:true

  " 前のタイマーをキャンセル（存在する場合）
  if s:focus_timer_id != -1
    call timer_stop(s:focus_timer_id)
  endif

  " win_execute() 方式に変更したため、短めの遅延を設定（100ms）
  let s:focus_timer_id = timer_start(100, {-> s:reset_focus_flag('timer reset 100ms')})
endfunction

" hellshake_yano#core#on_buf_leave() - BufLeave イベントハンドラ
"
" 目的:
"   - バッファを離れる時に現在のバッファタイプを記録
"   - lazygit等で e キーを押してファイルを開く際の対応
"
" @return なし
function! hellshake_yano#core#on_buf_leave() abort
  let s:prev_buftype = &buftype
endfunction

" hellshake_yano#core#on_buf_enter_from_terminal() - BufEnter イベントハンドラ
"
" 目的:
"   - 前のバッファがターミナルだった場合にフラグを設定
"   - lazygit等で e キーを押してファイルを開く際のちらつき防止
"   - 2回連続発火によるちらつき防止
"
" @return なし
function! hellshake_yano#core#on_buf_enter_from_terminal() abort
  " 設定で無効化されている場合は何もしない
  if !hellshake_yano#config#get('multiWindowDetectFocusGained', v:true)
    return
  endif

  " 既にフラグがtrueの場合は重複呼び出しをスキップ
  if s:focus_just_restored == v:true
    return
  endif

  " 前のバッファがターミナルだった場合、フラグを設定
  if s:prev_buftype ==# 'terminal'
    let s:focus_just_restored = v:true

    " 前のタイマーをキャンセル（存在する場合）
    if s:focus_timer_id != -1
      call timer_stop(s:focus_timer_id)
    endif

    " win_execute() 方式に変更したため、短めの遅延を設定（100ms）
    let s:focus_timer_id = timer_start(100, {-> s:reset_focus_flag('timer reset 100ms from buf enter')})
  endif
endfunction

" s:reset_focus_flag() - フォーカス復帰フラグのリセット（内部関数）
"
" @param reason String リセット理由（デバッグログ用）
" @return なし
function! s:reset_focus_flag(reason) abort
  let s:focus_just_restored = v:false
  let s:focus_timer_id = -1
endfunction

" hellshake_yano#core#is_focus_just_restored() - フォーカス復帰フラグの取得
"
" 目的:
"   - FocusGained 直後かどうかを返す
"   - 他のモジュールからフラグの状態を確認するために使用
"
" @return Boolean フォーカス復帰直後なら true、そうでなければ false
function! hellshake_yano#core#is_focus_just_restored() abort
  return s:focus_just_restored
endfunction

" hellshake_yano#core#clear_focus_flag() - フォーカス復帰フラグのクリア
"
" 目的:
"   - フォーカス復帰フラグを手動でクリア
"   - テストやデバッグ用
"
" @return なし
function! hellshake_yano#core#clear_focus_flag() abort
  let s:focus_just_restored = v:false
endfunction

" hellshake_yano#core#should_redraw() - redraw すべきかどうかの判定
"
" 目的:
"   - フォーカス復帰直後は redraw をスキップすべきかを判定
"   - 画面ちらつき防止のため
"
" @return Boolean redraw すべきなら true、スキップすべきなら false
function! hellshake_yano#core#should_redraw() abort
  return !s:focus_just_restored
endfunction

let &cpo = s:save_cpo
unlet s:save_cpo
