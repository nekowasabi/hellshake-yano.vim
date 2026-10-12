" ========================================
" hellshake-yano.vim ハイライト設定例
" ========================================

" 基本的な使用例
" ==============

" 例1: 新形式 - オブジェクトで fg/bg を個別指定
let g:hellshake_yano = {
  \ 'highlight_hint_marker': {'fg': '#00ff00', 'bg': '#000000'},
  \ 'highlight_hint_marker_current': {'fg': 'Yellow', 'bg': 'Blue'},
  \ }

" 例2: 既存形式 - ハイライトグループ名（後方互換性）
let g:hellshake_yano = {
  \ 'highlight_hint_marker': 'Search',
  \ 'highlight_hint_marker_current': 'IncSearch'
  \ }

" 例3: 混在形式 - 一方はオブジェクト、もう一方は文字列
let g:hellshake_yano = {
  \ 'highlight_hint_marker': {'fg': 'Green', 'bg': 'NONE'},
  \ 'highlight_hint_marker_current': 'IncSearch',
  \ }

" テーマ別設定例
" ==============

" 暗いテーマ用設定
let g:hellshake_yano_dark = {
  \ 'highlight_hint_marker': {'fg': '#ffffff', 'bg': '#333333'},
  \ 'highlight_hint_marker_current': {'fg': '#000000', 'bg': '#ffff00'}
  \ }

" 明るいテーマ用設定
let g:hellshake_yano_light = {
  \ 'highlight_hint_marker': {'fg': '#000000', 'bg': '#ffffff'},
  \ 'highlight_hint_marker_current': {'fg': '#ffffff', 'bg': '#0000ff'}
  \ }

" 高コントラスト設定（アクセシビリティ対応）
let g:hellshake_yano_high_contrast = {
  \ 'highlight_hint_marker': {'fg': 'White', 'bg': 'Black'},
  \ 'highlight_hint_marker_current': {'fg': 'Black', 'bg': 'White'}
  \ }

" 部分指定例
" ===========

" 前景色のみ指定
let g:hellshake_yano = {
  \ 'highlight_hint_marker': {'fg': 'Red'},
  \ }

" 背景色のみ指定
let g:hellshake_yano = {
  \ 'highlight_hint_marker': {'bg': 'Blue'},
  \ }

" 透明背景の設定
let g:hellshake_yano = {
  \ 'highlight_hint_marker': {'fg': 'Green', 'bg': 'NONE'},
  \ }

" 色指定の形式
" ============

" 標準色名（大文字小文字は区別しない）
" - Red, Green, Blue, Yellow, Cyan, Magenta, White, Black, Gray
" - DarkRed, DarkGreen, DarkBlue, DarkYellow, DarkCyan, DarkMagenta
" - LightRed, LightGreen, LightBlue, LightYellow, LightCyan, LightMagenta
" - NONE（透明）

" 16進数色（#で始まる3桁または6桁）
" - #fff, #000, #f00, #0f0, #00f
" - #ffffff, #000000, #ff0000, #00ff00, #0000ff

" 動的設定例
" ==========

" カラースキームに応じた自動設定
function! SetHellshakeYanoColors()
  if &background ==# 'dark'
    let g:hellshake_yano = g:hellshake_yano_dark
  else
    let g:hellshake_yano = g:hellshake_yano_light
  endif

  " 設定を再適用
  if hellshake_yano#backend#is_native()
    call hellshake_yano#backend#notify('hellshake-yano', 'updateConfig', [g:hellshake_yano])
  endif
endfunction

" カラースキーム変更時に自動で設定を変更
augroup HellshakeYanoColorScheme
  autocmd!
  autocmd ColorScheme * call SetHellshakeYanoColors()
augroup END

" エラー処理例
" ============

" 無効な設定の例（これらは警告メッセージが表示される）
" let g:hellshake_yano = {
"   \ 'highlight_hint_marker': {'fg': 'InvalidColor', 'bg': 'Blue'},
"   \ }
"
" let g:hellshake_yano = {
"   \ 'highlight_hint_marker': {'fg': '#gggggg'},
"   \ }
"
" let g:hellshake_yano = {
"   \ 'highlight_hint_marker': {'fg': ''},
"   \ }

" 設定の確認方法
" ==============

" デバッグ情報を表示
" :call hellshake_yano#backend#notify('hellshake-yano', 'debug', [])

" 現在の設定を表示
" :echo g:hellshake_yano

" 実際のハイライト設定を確認
" :highlight HellshakeYanoMarker
" :highlight HellshakeYanoMarkerCurrent
