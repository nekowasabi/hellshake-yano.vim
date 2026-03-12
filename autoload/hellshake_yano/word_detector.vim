" License: MIT
" autoload/hellshake_yano/word_detector.vim
" Denopsブリッジ層 - word detection

function! hellshake_yano#word_detector#detect_visible() abort
  if hellshake_yano#utils#is_denops_ready()
    return denops#request('hellshake-yano', 'detectWordsVisible', [])
  endif
  return []
endfunction

function! hellshake_yano#word_detector#detect_multi_window() abort
  if hellshake_yano#utils#is_denops_ready()
    return denops#request('hellshake-yano', 'detectWordsMultiWindow', [])
  endif
  return []
endfunction

function! hellshake_yano#word_detector#get_min_length() abort
  if hellshake_yano#utils#is_denops_ready()
    return denops#request('hellshake-yano', 'getMinWordLength', [])
  endif
  return 2
endfunction

function! hellshake_yano#word_detector#detect_words_visible() abort
  return hellshake_yano#word_detector#detect_visible()
endfunction

function! hellshake_yano#word_detector#clear_cache() abort
  if hellshake_yano#utils#is_denops_ready()
    call denops#request('hellshake-yano', 'clearCache', [])
  endif
endfunction
