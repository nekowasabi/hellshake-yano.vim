" License: MIT
" autoload/hellshake_yano/hint_generator.vim
" Denopsブリッジ層 - hint generator操作

function! hellshake_yano#hint_generator#generate(count) abort
  if hellshake_yano#utils#is_denops_ready()
    return denops#request('hellshake-yano', 'generateHints', [a:count])
  endif
  return []
endfunction

function! hellshake_yano#hint_generator#clear_cache() abort
  if hellshake_yano#utils#is_denops_ready()
    call denops#request('hellshake-yano', 'clearCache', [])
  endif
endfunction

function! hellshake_yano#hint_generator#get_min_word_length() abort
  if hellshake_yano#utils#is_denops_ready()
    return denops#request('hellshake-yano', 'getMinWordLength', [])
  endif
  return 2
endfunction
