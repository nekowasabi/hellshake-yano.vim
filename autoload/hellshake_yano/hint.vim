" autoload/hellshake_yano/hint.vim - ヒント制御関数
" Author: hellshake-yano
" License: MIT

" 保存と復元
let s:save_cpo = &cpo
set cpo&vim

"=============================================================================
" ヒント表示制御関数群
"=============================================================================

" キー別ヒント表示の必要性を判定
function! hellshake_yano#hint#should_trigger_hints_for_key(bufnr, key) abort
  if hellshake_yano#state#is_key_repeating(a:bufnr)
    return v:false
  endif

  let key_count = hellshake_yano#count#get_key_count(a:bufnr, a:key)
  let threshold = hellshake_yano#config#get_motion_count_for_key(a:key)
  return key_count >= threshold
endfunction

" ヒントをトリガー
function! hellshake_yano#hint#trigger_hints() abort
  if hellshake_yano#denops#call_function('showHints', [], 'show hints')
    call hellshake_yano#state#set_hints_visible(v:true)
  endif
endfunction

" ヒントを表示（公開API）
function! hellshake_yano#hint#show() abort
  call hellshake_yano#hint#trigger_hints()
endfunction

" ヒントを非表示（公開API）
function! hellshake_yano#hint#hide() abort
  if hellshake_yano#denops#call_function('hideHints', [], 'hide hints')
    call hellshake_yano#state#set_hints_visible(v:false)
  endif
endfunction

" キー情報付きヒント表示関数
function! hellshake_yano#hint#show_hints_with_key(key) abort
  try
    if !hellshake_yano#utils#is_denops_ready()
      return
    endif

    " 現在のモードを検出
    let current_mode = hellshake_yano#hint#detect_current_mode()
    " Denops側のshowHintsWithKeyメソッドを呼び出し（モード情報付き）
    call denops#notify('hellshake-yano', 'showHintsWithKey', [a:key, current_mode])
  catch
    call hellshake_yano#utils#show_error('show_hints_with_key', v:exception)
  endtry
endfunction

" 現在のモードを検出する関数
function! hellshake_yano#hint#detect_current_mode() abort
  let vim_mode = mode()
  return hellshake_yano#hint#detect_current_mode_from_string(vim_mode)
endfunction

" mode()文字列からモード種別を判定する関数
function! hellshake_yano#hint#detect_current_mode_from_string(mode_string) abort
  " Visual modes: v (character-wise), V (line-wise), ^V (block-wise)
  if a:mode_string =~# '^[vV\<C-V>]'
    return 'visual'
  endif
  " Insert modes
  if a:mode_string =~# '^[iI]'
    return 'insert'
  endif
  " Command-line modes
  if a:mode_string =~# '^[c:]'
    return 'command'
  endif
  " Replace modes
  if a:mode_string =~# '^[rR]'
    return 'replace'
  endif
  " Default: normal mode
  return 'normal'
endfunction

" デバッグ表示を処理
function! hellshake_yano#hint#handle_debug_display() abort
  if get(g:hellshake_yano, 'debug_mode', v:false)
    call hellshake_yano#debug#show()
  endif
endfunction

" キーリピート検出処理
function! hellshake_yano#hint#handle_key_repeat_detection(bufnr, current_time, config) abort
  " 機能が無効の場合は通常処理
  if !a:config.enabled
    call hellshake_yano#state#set_last_key_time(a:bufnr, a:current_time)
    return v:false
  endif

  " 前回のキー入力時刻との差を計算
  let last_time = hellshake_yano#state#get_last_key_time(a:bufnr)
  let time_diff = a:current_time - last_time

  " キーリピート判定
  if time_diff < a:config.threshold && last_time > 0
    " リピート状態に設定
    call hellshake_yano#state#set_key_repeating(a:bufnr, v:true)

    " 既存のリピート終了タイマーをクリアして新しく設定
    call hellshake_yano#timer#set_repeat_end_timer(a:bufnr, a:config.reset_delay)

    " キー時刻更新してヒント表示をスキップ
    call hellshake_yano#state#set_last_key_time(a:bufnr, a:current_time)
    return v:true
  endif

  " 通常処理: キー時刻を更新
  call hellshake_yano#state#set_last_key_time(a:bufnr, a:current_time)
  return v:false
endfunction

" 保存と復元
let &cpo = s:save_cpo
unlet s:save_cpo