" License: MIT
" autoload/hellshake_yano/japanese.vim
" Denopsブリッジ層 - japanese segmentation

function! hellshake_yano#japanese#segment(text) abort
  if hellshake_yano#utils#is_denops_ready()
    return denops#request('hellshake-yano', 'segmentJapaneseText', [a:text])
  endif
  return [a:text]
endfunction
