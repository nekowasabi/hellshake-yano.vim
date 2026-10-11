" Explicit Vim9 transport; default and other-plugin calls retain real Denops.
let s:epoch = 0
let s:timers = []
function! hellshake_yano_vim#backend#is_native() abort
  return !has('nvim') && has('vim9script') && get(g:, 'hellshake_yano_vim_native_bridge', v:false)
endfunction
function! hellshake_yano_vim#backend#request(plugin, method, args) abort
  if a:plugin ==# 'hellshake-yano' && hellshake_yano_vim#backend#is_native()
    return hellshake_yano#native#dispatcher#Request(a:method, a:args)
  endif
  return denops#request(a:plugin, a:method, a:args)
endfunction
function! s:notify(epoch, method, args, timer) abort
  call filter(s:timers, 'v:val != a:timer')
  if a:epoch == s:epoch && hellshake_yano_vim#backend#is_native()
    call hellshake_yano#native#dispatcher#Request(a:method, a:args)
  endif
endfunction
function! hellshake_yano_vim#backend#notify(plugin, method, args) abort
  if a:plugin ==# 'hellshake-yano' && hellshake_yano_vim#backend#is_native()
    call add(s:timers, timer_start(0, function('s:notify', [s:epoch, a:method, deepcopy(a:args)])))
    return
  endif
  call denops#notify(a:plugin, a:method, a:args)
endfunction
function! hellshake_yano_vim#backend#cancel_pending() abort
  let s:epoch += 1
  for timer in s:timers
    call timer_stop(timer)
  endfor
  let s:timers = []
endfunction
