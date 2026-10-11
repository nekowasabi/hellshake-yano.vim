" License: MIT

function! hellshake_yano#utils#show_error(...) abort
  if a:0 == 1
    let message = a:1
  elseif a:0 == 2
    let message = printf('[hellshake-yano] Error: %s: %s', a:1, a:2)
  else
    let message = '[hellshake-yano] Error: Invalid error arguments'
  endif

  echohl ErrorMsg
  echomsg message
  echohl None
endfunction

function! hellshake_yano#utils#bufnr() abort
  return bufnr('%')
endfunction

function! hellshake_yano#utils#get_elapsed_time() abort
  let time_str = reltimestr(reltime())
  return float2nr(str2float(time_str) * 1000.0)
endfunction

function! hellshake_yano#utils#log_performance(operation, time_ms, ...) abort
  if !get(g:hellshake_yano, 'performance_log', v:false)
    return
  endif
  let bufnr = hellshake_yano#utils#bufnr()
  let extra_info = a:0 > 0 ? a:1 : {}
  let log_entry = printf('[hellshake-yano:PERF] %s buf:%d time:%dms',
        \ a:operation, bufnr, a:time_ms)
  if !empty(extra_info) && type(extra_info) == v:t_dict
    let log_entry .= ' ' . string(extra_info)
  endif
  echomsg log_entry
endfunction

function! hellshake_yano#utils#is_denops_ready() abort
  return hellshake_yano#backend#is_native() || exists('g:hellshake_yano_ready') && g:hellshake_yano_ready
endfunction