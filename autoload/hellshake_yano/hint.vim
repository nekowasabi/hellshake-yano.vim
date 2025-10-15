" License: MIT
" compat.vim との統合により、Vim/Neovim 両対応を実現

" 初期化処理
function! hellshake_yano#hint#initialize() abort
  " 互換性レイヤーの初期化
  call hellshake_yano#compat#initialize()
endfunction

" キー別ヒント表示の必要性を判定
function! hellshake_yano#hint#should_trigger_hints_for_key(bufnr, key) abort
  if hellshake_yano#state#is_key_repeating(a:bufnr)
    return v:false
  endif

  let key_count = hellshake_yano#count#get_key_count(a:bufnr, a:key)
  let threshold = hellshake_yano#config#get_motion_count_for_key(a:key)
  return key_count >= threshold
endfunction

" ヒントをトリガー
function! hellshake_yano#hint#trigger_hints() abort
  if hellshake_yano#denops#call_function('showHints', [], 'show hints')
    call hellshake_yano#state#set_hints_visible(v:true)
  endif
endfunction

" ヒントを表示（公開API）
function! hellshake_yano#hint#show() abort
  call hellshake_yano#hint#trigger_hints()
endfunction

" ヒントを非表示（公開API）
function! hellshake_yano#hint#hide() abort
  if hellshake_yano#denops#call_function('hideHints', [], 'hide hints')
    call hellshake_yano#state#set_hints_visible(v:false)
  endif
endfunction

" ヒントを自動非表示（カーソル移動、モード変更時）
function! hellshake_yano#hint#auto_hide() abort
  " ヒントが表示されていない場合は何もしない
  if !hellshake_yano#state#is_hints_visible()
    return
  endif

  " Denops経由でヒントを非表示
  if hellshake_yano#denops#call_function('hideHints', [], 'auto hide hints')
    call hellshake_yano#state#set_hints_visible(v:false)
  endif
endfunction

" キー情報付きヒント表示関数
function! hellshake_yano#hint#show_hints_with_key(key) abort
  try
    if !hellshake_yano#utils#is_denops_ready()
      return
    endif

    " 現在のモードを検出
    let current_mode = hellshake_yano#hint#detect_current_mode()
    " Denops側のshowHintsWithKeyメソッドを呼び出し（モード情報付き）
    call denops#notify('hellshake-yano', 'showHintsWithKey', [a:key, current_mode])
  catch
    call hellshake_yano#utils#show_error('show_hints_with_key', v:exception)
  endtry
endfunction

" 現在のモードを検出する関数
function! hellshake_yano#hint#detect_current_mode() abort
  let vim_mode = mode()
  return hellshake_yano#hint#detect_current_mode_from_string(vim_mode)
endfunction

" mode()文字列からモード種別を判定する関数
function! hellshake_yano#hint#detect_current_mode_from_string(mode_string) abort
  " Visual modes: v (character-wise), V (line-wise), ^V (block-wise)
  if a:mode_string =~# '^[vV\<C-V>]'
    return 'visual'
  endif
  " Insert modes
  if a:mode_string =~# '^[iI]'
    return 'insert'
  endif
  " Command-line modes
  if a:mode_string =~# '^[c:]'
    return 'command'
  endif
  " Replace modes
  if a:mode_string =~# '^[rR]'
    return 'replace'
  endif
  " Default: normal mode
  return 'normal'
endfunction

function! hellshake_yano#hint#handle_debug_display() abort
  if get(g:hellshake_yano, 'debug_mode', v:false)
    call hellshake_yano#debug#show()
  endif
endfunction