" License: MIT
" autoload/hellshake_yano/window_detector.vim
" Denopsブリッジ層 - window detection

function! hellshake_yano#window_detector#get_visible() abort
  if has('nvim') && hellshake_yano#utils#is_denops_ready()
    return denops#request('hellshake-yano', 'getVisibleWindows', [])
  endif
  " Vim8 fallback: getVisibleWindows is Neovim-only (C-02 constraint)
  return getwininfo()
endfunction
