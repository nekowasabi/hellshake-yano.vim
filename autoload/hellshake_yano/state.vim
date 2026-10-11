" License: MIT

" 状態管理用グローバル変数
if !exists('g:hellshake_yano_internal')
  let g:hellshake_yano_internal = {}
endif

let g:hellshake_yano_internal.motion_count = get(g:hellshake_yano_internal, 'motion_count', {})
let g:hellshake_yano_internal.last_motion_time = get(g:hellshake_yano_internal, 'last_motion_time', {})
let g:hellshake_yano_internal.timer_id = get(g:hellshake_yano_internal, 'timer_id', {})
let g:hellshake_yano_internal.hints_visible = get(g:hellshake_yano_internal, 'hints_visible', v:false)

" キーリピート検出用変数
let g:hellshake_yano_internal.last_key_time = get(g:hellshake_yano_internal, 'last_key_time', {})
let g:hellshake_yano_internal.is_key_repeating = get(g:hellshake_yano_internal, 'is_key_repeating', {})
let g:hellshake_yano_internal.repeat_end_timer = get(g:hellshake_yano_internal, 'repeat_end_timer', {})
function! hellshake_yano#state#init_buffer_state(bufnr) abort
  call hellshake_yano#state#init_motion_tracking(a:bufnr)
  call hellshake_yano#state#init_key_repeat_detection(a:bufnr)
endfunction

" モーション追跡の初期化
function! hellshake_yano#state#init_motion_tracking(bufnr) abort
  if !has_key(g:hellshake_yano_internal.motion_count, a:bufnr)
    let g:hellshake_yano_internal.motion_count[a:bufnr] = {}
    let g:hellshake_yano_internal.last_motion_time[a:bufnr] = 0
  endif
  if !has_key(g:hellshake_yano_internal.timer_id, a:bufnr)
    let g:hellshake_yano_internal.timer_id[a:bufnr] = {}
  endif
endfunction

function! hellshake_yano#state#init_key_repeat_detection(bufnr) abort
  if !has_key(g:hellshake_yano_internal.last_key_time, a:bufnr)
    let g:hellshake_yano_internal.last_key_time[a:bufnr] = 0
    let g:hellshake_yano_internal.is_key_repeating[a:bufnr] = v:false
  endif
endfunction

" ヒント表示状態の取得
function! hellshake_yano#state#is_hints_visible() abort
  if hellshake_yano#backend#is_native()
    if !has('nvim')
      return hellshake_yano#native#core#State().visible
    endif
    return luaeval("require('hellshake_yano.core').get_state().visible")
  endif
  return g:hellshake_yano_internal.hints_visible
endfunction

" ヒント表示状態の設定
function! hellshake_yano#state#set_hints_visible(visible) abort
  let g:hellshake_yano_internal.hints_visible = a:visible
endfunction

" 最後のモーション時刻を取得
function! hellshake_yano#state#get_last_motion_time(bufnr) abort
  return get(g:hellshake_yano_internal.last_motion_time, a:bufnr, 0)
endfunction

" 最後のモーション時刻を設定
function! hellshake_yano#state#set_last_motion_time(bufnr, time) abort
  let g:hellshake_yano_internal.last_motion_time[a:bufnr] = a:time
endfunction

" キーリピート状態を取得
function! hellshake_yano#state#is_key_repeating(bufnr) abort
  return get(g:hellshake_yano_internal.is_key_repeating, a:bufnr, v:false)
endfunction

" キーリピート状態を設定
function! hellshake_yano#state#set_key_repeating(bufnr, repeating) abort
  let g:hellshake_yano_internal.is_key_repeating[a:bufnr] = a:repeating
endfunction

" 最後のキー時刻を取得
function! hellshake_yano#state#get_last_key_time(bufnr) abort
  return get(g:hellshake_yano_internal.last_key_time, a:bufnr, 0)
endfunction

" 最後のキー時刻を設定
function! hellshake_yano#state#set_last_key_time(bufnr, time) abort
  let g:hellshake_yano_internal.last_key_time[a:bufnr] = a:time
endfunction

function! hellshake_yano#state#reset_repeat_state(bufnr) abort
  if has_key(g:hellshake_yano_internal.is_key_repeating, a:bufnr)
    let g:hellshake_yano_internal.is_key_repeating[a:bufnr] = v:false
  endif
  call hellshake_yano#timer#stop_and_clear_timer(g:hellshake_yano_internal.repeat_end_timer, a:bufnr)
endfunction