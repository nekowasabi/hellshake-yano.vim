" License: MIT

let s:motion_count_cache = {}
let s:cache_version = 0

function! hellshake_yano#config#get_motion_count_for_key(key) abort
  if has_key(s:motion_count_cache, a:key)
    return s:motion_count_cache[a:key]
  endif
  let result = 3
  if has_key(g:hellshake_yano, 'perKeyMotionCount')
        \ && type(g:hellshake_yano.perKeyMotionCount) == v:t_dict
    let per_key = get(g:hellshake_yano.perKeyMotionCount, a:key, 0)
    if type(per_key) == v:t_number && per_key >= 1
      let result = per_key
      let s:motion_count_cache[a:key] = result
      return result
    endif
  endif
  let default_val = get(g:hellshake_yano, 'defaultMotionCount',
        \ get(g:hellshake_yano, 'motionCount', 3))
  if type(default_val) == v:t_number && default_val >= 1
    let result = default_val
  endif
  let s:motion_count_cache[a:key] = result
  return result
endfunction

function! hellshake_yano#config#clear_motion_count_cache() abort
  let s:motion_count_cache = {}
  let s:cache_version += 1
endfunction

function! hellshake_yano#config#get_key_repeat_config() abort
  return {
        \ 'enabled': get(g:hellshake_yano, 'suppressOnKeyRepeat', v:true),
        \ 'threshold': get(g:hellshake_yano, 'keyRepeatThreshold', 50),
        \ 'reset_delay': get(g:hellshake_yano, 'keyRepeatResetDelay', 300)
        \ }
endfunction
function! hellshake_yano#config#get_motion_keys() abort
  let keys = []

  " counted_motionsから取得
  if has_key(g:hellshake_yano, 'counted_motions') && !empty(g:hellshake_yano.counted_motions)
    let keys = copy(g:hellshake_yano.counted_motions)
  elseif get(g:hellshake_yano, 'trigger_on_hjkl', v:true)
    let keys = ['h', 'j', 'k', 'l']
  endif

  " per_key_min_lengthで定義されたキーを自動的に追加
  if has_key(g:hellshake_yano, 'per_key_min_length') &&
        \ type(g:hellshake_yano.per_key_min_length) == v:t_dict
    for key in keys(g:hellshake_yano.per_key_min_length)
      if index(keys, key) == -1
        call add(keys, key)
      endif
    endfor
  endif

  " perKeyMotionCountで定義されたキーを自動的に追加
  if has_key(g:hellshake_yano, 'perKeyMotionCount') &&
        \ type(g:hellshake_yano.perKeyMotionCount) == v:t_dict
    for key in keys(g:hellshake_yano.perKeyMotionCount)
      if index(keys, key) == -1
        call add(keys, key)
      endif
    endfor
  endif

  return keys
endfunction

" denops設定更新を通知
function! hellshake_yano#config#notify_denops_config() abort
  if hellshake_yano#utils#is_denops_ready()
    try
      call denops#notify('hellshake-yano', 'updateConfig', [g:hellshake_yano])
    catch
      call hellshake_yano#utils#show_error('[hellshake-yano] Error: Failed to update denops config: ' . v:exception)
    endtry
  endif
endfunction

" 移動カウント数を設定
function! hellshake_yano#config#set_count(count) abort
  if a:count > 0
    let g:hellshake_yano.motion_count = a:count

    " カウントをリセット
    if exists('*hellshake_yano#count#reset_all_buffers')
      call hellshake_yano#count#reset_all_buffers()
    endif

    " キャッシュをクリア
    call hellshake_yano#config#clear_motion_count_cache()

    " denops側に設定を通知
    call hellshake_yano#config#notify_denops_config()

    echo printf('[hellshake-yano] Motion count set to %d', a:count)
  else
    call hellshake_yano#utils#show_error('[hellshake-yano] Error: Count must be greater than 0')
  endif
endfunction

" タイムアウト時間を設定
function! hellshake_yano#config#set_timeout(timeout) abort
  if a:timeout > 0
    let g:hellshake_yano.motion_timeout = a:timeout

    " カウントをリセット
    if exists('*hellshake_yano#count#reset_all_buffers')
      call hellshake_yano#count#reset_all_buffers()
    endif

    " denops側に設定を通知
    call hellshake_yano#config#notify_denops_config()

    echo printf('[hellshake-yano] Timeout set to %dms', a:timeout)
  else
    call hellshake_yano#utils#show_error('[hellshake-yano] Error: Timeout must be greater than 0')
  endif
endfunction

" 汎用設定取得関数
" @param key String 設定キー
" @param default any デフォルト値（省略時は v:null）
" @return any 設定値
function! hellshake_yano#config#get(key, ...) abort
  let l:default = a:0 > 0 ? a:1 : v:null
  return get(g:hellshake_yano, a:key, l:default)
endfunction