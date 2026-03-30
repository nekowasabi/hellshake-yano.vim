" License: MIT

function! hellshake_yano#denops#call_function(function_name, args, context) abort
  if !hellshake_yano#utils#is_denops_ready()
    return v:false
  endif

  try
    " Why: silent! as belt-and-suspenders with try-catch — denops#notify is fire-and-forget
    silent! call denops#notify('hellshake-yano', a:function_name, a:args)
    return v:true
  catch
    call hellshake_yano#utils#show_error(printf('[hellshake-yano] Error: %s failed: %s',
          \ a:context, v:exception))
    return v:false
  endtry
endfunction