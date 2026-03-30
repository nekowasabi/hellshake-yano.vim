" autoload/hellshake_yano/visual.vim
" Denopsブリッジ層 - visual操作
" Process 63: visual#show, Process 64: visual#init / visual#get_state

" hellshake_yano#visual#init() - ビジュアルモード初期化 (Process 64)
function! hellshake_yano#visual#init() abort
  if hellshake_yano#utils#is_denops_ready()
    " Why: silent! instead of try-catch — denops#notify is fire-and-forget, silent! suppresses errors when denops is unavailable or function not yet registered
    silent! call denops#notify('hellshake-yano', 'visualInit', [])
  endif
endfunction

" hellshake_yano#visual#get_state() - ビジュアル状態取得 (Process 64)
" @return Dictionary ビジュアル状態
function! hellshake_yano#visual#get_state() abort
  if hellshake_yano#utils#is_denops_ready()
    return denops#request('hellshake-yano', 'visualGetState', [])
  endif
  return {'mode': 'none', 'active': v:false}
endfunction

" hellshake_yano#visual#show() - ビジュアル範囲内のヒント表示 (Process 63)
" @return List 検出された単語リスト
function! hellshake_yano#visual#show() abort
  if hellshake_yano#utils#is_denops_ready()
    return denops#request('hellshake-yano', 'detectWordsInVisualRange', [])
  endif
  return []
endfunction
