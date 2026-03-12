" License: MIT
" autoload/hellshake_yano/dictionary.vim
" Denopsブリッジ層 - dictionary操作

function! hellshake_yano#dictionary#add(word) abort
  if hellshake_yano#utils#is_denops_ready()
    return denops#request('hellshake-yano', 'addToDictionary', [a:word])
  endif
  return 0
endfunction

function! hellshake_yano#dictionary#clear_cache() abort
  if hellshake_yano#utils#is_denops_ready()
    call denops#request('hellshake-yano', 'clearCache', [])
  endif
endfunction

function! hellshake_yano#dictionary#is_in_dictionary(word) abort
  if hellshake_yano#utils#is_denops_ready()
    return denops#request('hellshake-yano', 'isInDictionary', [a:word])
  endif
  return 0
endfunction

function! hellshake_yano#dictionary#reload() abort
  if hellshake_yano#utils#is_denops_ready()
    call denops#request('hellshake-yano', 'reloadDictionary', [])
  endif
endfunction

function! hellshake_yano#dictionary#show() abort
  if hellshake_yano#utils#is_denops_ready()
    call denops#request('hellshake-yano', 'showDictionary', [])
  endif
endfunction

function! hellshake_yano#dictionary#validate() abort
  if hellshake_yano#utils#is_denops_ready()
    return denops#request('hellshake-yano', 'validateDictionary', [])
  endif
  return 0
endfunction
