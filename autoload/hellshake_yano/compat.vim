" License: MIT
" Vim/Neovim互換性レイヤー
" このファイルはVim 8.2+のprop APIとNeovimのextmarkの両方をサポートします

" グローバル変数の初期化
if !exists('s:prop_namespace_initialized')
  let s:prop_namespace_initialized = 0
endif

if !exists('s:neovim_namespace')
  let s:neovim_namespace = -1
endif

" prop APIサポート確認
function! hellshake_yano#compat#has_prop_support() abort
  " Vim 8.2以降のprop API
  return has('vim') && exists('*prop_type_add') && exists('*prop_add') && exists('*popup_create')
endfunction

" Neovim extmarkサポート確認
function! hellshake_yano#compat#has_extmark_support() abort
  return has('nvim') && exists('*nvim_create_namespace') && exists('*nvim_buf_set_extmark')
endfunction

" 初期化: Neovimのnamespace作成
function! hellshake_yano#compat#initialize() abort
  if has('nvim')
    if s:neovim_namespace == -1
      let s:neovim_namespace = nvim_create_namespace('hellshake-yano:marker')
    endif
    return s:neovim_namespace
  endif

  if hellshake_yano#compat#has_prop_support()
    " Vim prop type の初期化
    try
      " 既存の prop type をクリーンアップ
      call prop_type_delete('hellshake_yano_marker', {})
    catch
      " prop type が存在しない場合は無視
    endtry

    try
      " prop type を追加
      call prop_type_add('hellshake_yano_marker', {})
      let s:prop_namespace_initialized = 1
    catch
      " エラーは無視
    endtry
  endif

  return 0
endfunction

" マーカープロパティ作成（Vim prop API）
" @param line 行番号（1-indexed）
" @param col 列番号（1-indexed）
" @param hint_text ヒント文字列
" @param highlight_group ハイライトグループ名
" @return popup ID または 0（失敗時）
function! hellshake_yano#compat#create_marker_prop(line, col, hint_text, highlight_group) abort
  if !hellshake_yano#compat#has_prop_support()
    return 0
  endif

  try
    " テキストプロパティのユニークID
    let l:prop_id = a:line * 10000 + a:col

    " ヒントの表示幅を取得
    let l:hint_width = strwidth(a:hint_text)
    let l:hint_byte_length = strlen(a:hint_text)

    " prop_add でテキストプロパティを追加
    call prop_add(a:line, a:col, {
          \ 'type': 'hellshake_yano_marker',
          \ 'id': l:prop_id,
          \ 'length': l:hint_byte_length,
          \ 'text': a:hint_text,
          \ })

    " popup_create でオーバーレイ表示
    let l:popup_id = popup_create(a:hint_text, {
          \ 'line': -1,
          \ 'col': -1,
          \ 'textprop': 'hellshake_yano_marker',
          \ 'textpropid': l:prop_id,
          \ 'width': l:hint_width,
          \ 'height': 1,
          \ 'highlight': a:highlight_group,
          \ 'zindex': 1000,
          \ })

    return l:popup_id
  catch
    " エラー時は0を返す
    return 0
  endtry
endfunction

" マーカーextmark作成（Neovim）
" @param bufnr バッファ番号（0 = current buffer）
" @param line 行番号（0-indexed for Neovim）
" @param col 列番号（0-indexed for Neovim）
" @param hint_text ヒント文字列
" @param highlight_group ハイライトグループ名
" @return extmark ID または 0（失敗時）
function! hellshake_yano#compat#create_marker_extmark(bufnr, line, col, hint_text, highlight_group) abort
  if !hellshake_yano#compat#has_extmark_support()
    return 0
  endif

  try
    if s:neovim_namespace == -1
      call hellshake_yano#compat#initialize()
    endif

    " extmark を設置（virt_text でオーバーレイ表示）
    let l:extmark_id = nvim_buf_set_extmark(a:bufnr, s:neovim_namespace, a:line, a:col, {
          \ 'virt_text': [[a:hint_text, a:highlight_group]],
          \ 'virt_text_pos': 'overlay',
          \ 'priority': 1000,
          \ })

    return l:extmark_id
  catch
    " エラー時は0を返す
    return 0
  endtry
endfunction

" マーカーpopup作成（汎用ラッパー）
" @param line 行番号（1-indexed）
" @param col 列番号（1-indexed）
" @param hint_text ヒント文字列
" @param highlight_group ハイライトグループ名
" @return marker ID または 0（失敗時）
function! hellshake_yano#compat#create_marker_popup(line, col, hint_text, highlight_group) abort
  if has('nvim')
    " Neovim: 1-indexed から 0-indexed に変換
    return hellshake_yano#compat#create_marker_extmark(0, a:line - 1, a:col - 1, a:hint_text, a:highlight_group)
  elseif hellshake_yano#compat#has_prop_support()
    " Vim: prop API を使用
    return hellshake_yano#compat#create_marker_prop(a:line, a:col, a:hint_text, a:highlight_group)
  else
    " フォールバック: 何もしない
    return 0
  endif
endfunction

" 全てのpropsをクリア（Vim）
function! hellshake_yano#compat#clear_all_props() abort
  if has('nvim')
    " Neovim: namespace をクリア
    if s:neovim_namespace != -1
      call nvim_buf_clear_namespace(0, s:neovim_namespace, 0, -1)
    endif
  elseif hellshake_yano#compat#has_prop_support()
    " Vim: prop をクリア
    try
      call prop_clear(1, line('$'), { 'type': 'hellshake_yano_marker' })
    catch
      " エラーは無視
    endtry

    " popup もクリア
    try
      call popup_clear()
    catch
      " エラーは無視
    endtry
  endif
endfunction

" 特定のpopupをクローズ（Vim）
" @param popup_id popup ID
function! hellshake_yano#compat#close_popup(popup_id) abort
  if has('nvim')
    " Neovim では何もしない（namespace でまとめてクリアするため）
    return
  endif

  if hellshake_yano#compat#has_prop_support() && exists('*popup_close')
    try
      call popup_close(a:popup_id)
    catch
      " エラーは無視
    endtry
  endif
endfunction

" デバッグ情報取得
function! hellshake_yano#compat#get_debug_info() abort
  let l:info = {}
  let l:info.has_nvim = has('nvim')
  let l:info.has_vim = has('vim')
  let l:info.has_prop_support = hellshake_yano#compat#has_prop_support()
  let l:info.has_extmark_support = hellshake_yano#compat#has_extmark_support()

  if has('nvim')
    let l:info.namespace_id = s:neovim_namespace
  else
    let l:info.prop_initialized = s:prop_namespace_initialized
  endif

  return l:info
endfunction
