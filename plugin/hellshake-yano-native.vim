" Neovim starts natively by default; Vim9 remains opt-in.
if exists('g:loaded_hellshake_yano_native') || (!has('nvim') && !get(g:, 'hellshake_yano_native', v:false))
  finish
endif
let s:save_cpo = &cpo
set cpo&vim
let s:initialized = 0
try
  if has('nvim-0.10')
    lua require('hellshake_yano').setup(vim.g.hellshake_yano or {})
    let s:initialized = 1
    lua require('hellshake_yano').enable_bridge()
    lua require('hellshake_yano').activate()
  elseif !has('nvim') && has('vim9script') && has('popupwin')
    call hellshake_yano#native#runtime#Setup(get(g:, 'hellshake_yano', {}))
    let s:initialized = 1
    call hellshake_yano#native#runtime#EnableBridge()
    call hellshake_yano#native#runtime#Activate()
  else
    throw 'Neovim 0.10+ or Vim9 with popup support is required'
  endif
  let g:loaded_hellshake_yano_native = 1
  unlet! g:hellshake_yano_native_error
catch
  let g:hellshake_yano_native_error = v:exception
  if s:initialized
    if has('nvim')
      lua require('hellshake_yano').disable_bridge(); require('hellshake_yano').deactivate()
    else
      call hellshake_yano#native#runtime#DisableBridge()
      call hellshake_yano#native#runtime#Deactivate()
    endif
  endif
  throw 'hellshake-yano native startup: ' . g:hellshake_yano_native_error
finally
  let &cpo = s:save_cpo
  unlet s:save_cpo s:initialized
endtry
