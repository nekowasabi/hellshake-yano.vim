" Opt-in transport. Legacy callers retain the same plugin/method/args signature.
function! hellshake_yano#backend#is_native() abort
  return has('nvim') && get(g:, 'hellshake_yano_native_bridge', v:false)
endfunction

function! hellshake_yano#backend#request(plugin, method, args) abort
  if a:plugin ==# 'hellshake-yano' && hellshake_yano#backend#is_native()
    return luaeval("require('hellshake_yano.dispatcher').request(_A[1], _A[2])", [a:method, a:args])
  endif
  return denops#request(a:plugin, a:method, a:args)
endfunction

function! hellshake_yano#backend#notify(plugin, method, args) abort
  if a:plugin ==# 'hellshake-yano' && hellshake_yano#backend#is_native()
    call luaeval("require('hellshake_yano.dispatcher').notify(_A[1], _A[2])", [a:method, a:args])
    return
  endif
  call denops#notify(a:plugin, a:method, a:args)
endfunction
