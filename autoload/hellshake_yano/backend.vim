" Native transport. Legacy callers retain the same plugin/method/args signature.
function! hellshake_yano#backend#is_native() abort
  return has('nvim') ? get(g:, 'hellshake_yano_native_bridge', v:false)
        \ : hellshake_yano_vim#backend#is_native()
endfunction

function! hellshake_yano#backend#request(plugin, method, args) abort
  if a:plugin ==# 'hellshake-yano' && hellshake_yano#backend#is_native()
    if !has('nvim')
      return hellshake_yano_vim#backend#request(a:plugin, a:method, a:args)
    endif
    return luaeval("require('hellshake_yano.dispatcher').request(_A[1], _A[2])", [a:method, a:args])
  endif
  throw '[hellshake-yano] Native backend unavailable or unsupported plugin: ' . a:plugin
endfunction

function! hellshake_yano#backend#notify(plugin, method, args) abort
  if a:plugin ==# 'hellshake-yano' && hellshake_yano#backend#is_native()
    if !has('nvim')
      call hellshake_yano_vim#backend#notify(a:plugin, a:method, a:args)
      return
    endif
    call luaeval("require('hellshake_yano.dispatcher').notify(_A[1], _A[2])", [a:method, a:args])
    return
  endif
  throw '[hellshake-yano] Native backend unavailable or unsupported plugin: ' . a:plugin
endfunction

function! hellshake_yano#backend#call_function(function_name, args, context) abort
  if !hellshake_yano#utils#is_denops_ready()
    return v:false
  endif
  try
    call hellshake_yano#backend#notify('hellshake-yano', a:function_name, a:args)
    return v:true
  catch
    call hellshake_yano#utils#show_error(printf('[hellshake-yano] Error: %s failed: %s',
          \ a:context, v:exception))
    return v:false
  endtry
endfunction
