" hellshake-yano.vim - denops-based hit-a-hint plugin
" Author: hellshake-yano
" License: MIT

" ロードガード
if exists('g:loaded_hellshake_yano')
  finish
endif
let g:loaded_hellshake_yano = 1

" 保存と復元
let s:save_cpo = &cpo
set cpo&vim

"=============================================================================
" 設定管理関数群
" 設定検証、ハイライト適用を担当
"=============================================================================

" グローバル設定変数の初期化
if !exists('g:hellshake_yano')
  let g:hellshake_yano = {}
endif

" グローバル内部状態変数の早期初期化
" Note: autoloadファイルは遅延読み込みのため、ModeChangedイベントなどで
"       早期にアクセスされる場合に備えて、plugin読み込み時に初期化する
if !exists('g:hellshake_yano_internal')
  let g:hellshake_yano_internal = {
        \ 'motion_count': {},
        \ 'last_motion_time': {},
        \ 'timer_id': {},
        \ 'hints_visible': v:false,
        \ 'last_key_time': {},
        \ 'is_key_repeating': {},
        \ 'repeat_end_timer': {}
        \ }
endif

" ユーザー設定が未定義の場合は空の辞書で初期化
"
" 設定管理の責任分担:
" - VimScript側: ユーザー設定の収集と基本検証、TypeScript側への受け渡し
" - TypeScript側: 全デフォルト値の管理と詳細な設定処理、実際の機能実装
"
" テストで期待される最小限のデフォルト値を設定
" （実際のデフォルト値はTypeScript側で管理されるが、テスト互換性のため）
if !has_key(g:hellshake_yano, 'key_repeat_threshold')
  let g:hellshake_yano.key_repeat_threshold = 50
endif
if !has_key(g:hellshake_yano, 'key_repeat_reset_delay')
  let g:hellshake_yano.key_repeat_reset_delay = 300
endif
if !has_key(g:hellshake_yano, 'suppress_on_key_repeat')
  let g:hellshake_yano.suppress_on_key_repeat = v:true
endif
if !has_key(g:hellshake_yano, 'motion_count')
  let g:hellshake_yano.motion_count = 3
endif
if !has_key(g:hellshake_yano, 'motion_timeout')
  let g:hellshake_yano.motion_timeout = 2000
endif

" キー別最小文字数設定（process1追加）
if !has_key(g:hellshake_yano, 'per_key_min_length')
  " デフォルト設定例：近距離精密移動は1文字から、頻繁なキーは2文字から
  let g:hellshake_yano.per_key_min_length = {
        \ 'w': 1,
        \ 'b': 1,
        \ }
endif
if !has_key(g:hellshake_yano, 'default_min_word_length')
  let g:hellshake_yano.default_min_word_length = 2
endif

" キー別motion_count設定（process1追加）
if !has_key(g:hellshake_yano, 'per_key_motion_count')
  " デフォルト設定例：精密操作は即座に、頻繁なキーは3回で表示
  let g:hellshake_yano.per_key_motion_count = {
        \ 'w': 1,
        \ 'b': 1,
        \ 'h': 3,
        \ 'j': 3,
        \ 'k': 3,
        \ 'l': 3,
        \ }
endif
if !has_key(g:hellshake_yano, 'default_motion_count')
  let g:hellshake_yano.default_motion_count = 3
endif

" bothMinWordLength 設定（camelCase / snake_case 両対応）
if !has_key(g:hellshake_yano, 'bothMinWordLength') && has_key(g:hellshake_yano, 'both_min_word_length')
  let g:hellshake_yano.bothMinWordLength = g:hellshake_yano.both_min_word_length
endif
if !has_key(g:hellshake_yano, 'bothMinWordLength')
  let g:hellshake_yano.bothMinWordLength = 5
endif
let g:hellshake_yano.both_min_word_length = g:hellshake_yano.bothMinWordLength

" 設定値の基本検証（TypeScript側でより詳細な検証を実施）
function! s:validate_config() abort
  " key_repeat_threshold が設定されている場合のみ検証
  if has_key(g:hellshake_yano, 'key_repeat_threshold') && g:hellshake_yano.key_repeat_threshold <= 0
    echohl WarningMsg
    echom '[hellshake-yano] Warning: key_repeat_threshold must be positive'
    echohl None
    unlet g:hellshake_yano.key_repeat_threshold
  endif

  if has_key(g:hellshake_yano, 'recenterCommand')
    if type(g:hellshake_yano.recenterCommand) != v:t_string || trim(g:hellshake_yano.recenterCommand) ==# ''
      echohl WarningMsg
      echom '[hellshake-yano] Warning: recenterCommand must be a non-empty string'
      echohl None
      let g:hellshake_yano.recenterCommand = 'normal! zz'
    endif
  endif

  if has_key(g:hellshake_yano, 'maxContinuousJumps')
    if type(g:hellshake_yano.maxContinuousJumps) != v:t_number || g:hellshake_yano.maxContinuousJumps <= 0
      echohl WarningMsg
      echom '[hellshake-yano] Warning: maxContinuousJumps must be a positive number'
      echohl None
      unlet g:hellshake_yano.maxContinuousJumps
      let g:hellshake_yano.maxContinuousJumps = 50
    endif
  endif

  " key_repeat_reset_delay が設定されている場合のみ検証
  if has_key(g:hellshake_yano, 'key_repeat_reset_delay') && g:hellshake_yano.key_repeat_reset_delay <= 0
    echohl WarningMsg
    echom '[hellshake-yano] Warning: key_repeat_reset_delay must be positive'
    echohl None
    unlet g:hellshake_yano.key_repeat_reset_delay
  endif

  " per_key_min_length の検証（process1追加）
  if has_key(g:hellshake_yano, 'per_key_min_length')
    if type(g:hellshake_yano.per_key_min_length) != v:t_dict
      echohl WarningMsg
      echom '[hellshake-yano] Warning: per_key_min_length must be a dictionary'
      echohl None
      unlet g:hellshake_yano.per_key_min_length
    else
      " 各エントリの値が正の数値であることを確認
      for [key, value] in items(g:hellshake_yano.per_key_min_length)
        if type(value) != v:t_number || value <= 0
          echohl WarningMsg
          echom '[hellshake-yano] Warning: per_key_min_length values must be positive numbers'
          echohl None
          unlet g:hellshake_yano.per_key_min_length[key]
        endif
      endfor
    endif
  endif

  " default_min_word_length の検証（process1追加）
  if has_key(g:hellshake_yano, 'default_min_word_length')
    if type(g:hellshake_yano.default_min_word_length) != v:t_number || g:hellshake_yano.default_min_word_length <= 0
      echohl WarningMsg
      echom '[hellshake-yano] Warning: default_min_word_length must be a positive number'
      echohl None
      unlet g:hellshake_yano.default_min_word_length
    endif
  endif

  " per_key_motion_count の検証（process1追加）
  if has_key(g:hellshake_yano, 'per_key_motion_count')
    if type(g:hellshake_yano.per_key_motion_count) != v:t_dict
      echohl WarningMsg
      echom '[hellshake-yano] Warning: per_key_motion_count must be a dictionary'
      echohl None
      unlet g:hellshake_yano.per_key_motion_count
    else
      " 各エントリの値が非負の数値であることを確認（0は即座表示として有効）
      for [key, value] in items(g:hellshake_yano.per_key_motion_count)
        if type(value) != v:t_number || value < 0
          echohl WarningMsg
          echom '[hellshake-yano] Warning: per_key_motion_count values must be non-negative numbers'
          echohl None
          unlet g:hellshake_yano.per_key_motion_count[key]
        endif
      endfor
    endif
  endif

  " default_motion_count の検証（process1追加）
  if has_key(g:hellshake_yano, 'default_motion_count')
    if type(g:hellshake_yano.default_motion_count) != v:t_number || g:hellshake_yano.default_motion_count < 0
      echohl WarningMsg
      echom '[hellshake-yano] Warning: default_motion_count must be a non-negative number'
      echohl None
      unlet g:hellshake_yano.default_motion_count
    endif
  endif

  " both_min_word_length / bothMinWordLength の検証
  if has_key(g:hellshake_yano, 'both_min_word_length') && !has_key(g:hellshake_yano, 'bothMinWordLength')
    if type(g:hellshake_yano.both_min_word_length) == v:t_number && g:hellshake_yano.both_min_word_length > 0
      let g:hellshake_yano.bothMinWordLength = g:hellshake_yano.both_min_word_length
    else
      echohl WarningMsg
      echom '[hellshake-yano] Warning: both_min_word_length must be a positive number'
      echohl None
      unlet g:hellshake_yano.both_min_word_length
    endif
  endif

  if has_key(g:hellshake_yano, 'bothMinWordLength')
    if type(g:hellshake_yano.bothMinWordLength) != v:t_number || g:hellshake_yano.bothMinWordLength < 1
      echohl WarningMsg
      echom '[hellshake-yano] Warning: bothMinWordLength must be a positive number'
      echohl None
      unlet g:hellshake_yano.bothMinWordLength
      if has_key(g:hellshake_yano, 'both_min_word_length')
        unlet g:hellshake_yano.both_min_word_length
      endif
    else
      let g:hellshake_yano.both_min_word_length = g:hellshake_yano.bothMinWordLength
    endif
  endif

endfunction

call s:validate_config()

" ハイライトグループの定義（デフォルト値）
highlight default link HellshakeYanoMarker DiffAdd
highlight default link HellshakeYanoMarkerCurrent DiffText

" HEXカラーを256色に変換する関数
function! s:hex_to_256(hex) abort
  " #記号を除去
  let l:hex_value = substitute(a:hex, '^#', '', '')

  " RGBに変換
  let l:r = str2nr(l:hex_value[0:1], 16)
  let l:g = str2nr(l:hex_value[2:3], 16)
  let l:b = str2nr(l:hex_value[4:5], 16)

  " 256色パレットの最も近い色を見つける
  " 簡易的な実装：16-231の色キューブから選択
  if l:r == l:g && l:g == l:b
    " グレースケール
    if l:r < 8
      return 16
    elseif l:r < 18
      return 232
    elseif l:r < 28
      return 233
    elseif l:r < 38
      return 234
    elseif l:r < 48
      return 235
    elseif l:r < 58
      return 236
    elseif l:r < 68
      return 237
    elseif l:r < 78
      return 238
    elseif l:r < 88
      return 239
    elseif l:r < 98
      return 240
    elseif l:r < 108
      return 241
    elseif l:r < 118
      return 242
    elseif l:r < 128
      return 243
    elseif l:r < 138
      return 244
    elseif l:r < 148
      return 245
    elseif l:r < 158
      return 246
    elseif l:r < 168
      return 247
    elseif l:r < 178
      return 248
    elseif l:r < 188
      return 249
    elseif l:r < 198
      return 250
    elseif l:r < 208
      return 251
    elseif l:r < 218
      return 252
    elseif l:r < 228
      return 253
    elseif l:r < 238
      return 254
    else
      return 255
    endif
  endif

  " 色キューブから最も近い色を選択
  let l:r_index = l:r < 48 ? 0 : l:r < 115 ? 1 : l:r < 155 ? 2 : l:r < 195 ? 3 : l:r < 235 ? 4 : 5
  let l:g_index = l:g < 48 ? 0 : l:g < 115 ? 1 : l:g < 155 ? 2 : l:g < 195 ? 3 : l:g < 235 ? 4 : 5
  let l:b_index = l:b < 48 ? 0 : l:b < 115 ? 1 : l:b < 155 ? 2 : l:b < 195 ? 3 : l:b < 235 ? 4 : 5

  return 16 + (36 * l:r_index) + (6 * l:g_index) + l:b_index
endfunction

" カスタムハイライト色を適用する関数（fg/bg対応）
function! s:apply_custom_highlights() abort
  " highlight_hint_marker の設定適用（snake_case優先、camelCaseフォールバック）
  let l:marker_config = get(g:hellshake_yano, 'highlight_hint_marker',
        \ get(g:hellshake_yano, 'highlightHintMarker', ''))
  if !empty(l:marker_config)
    try
      call s:apply_highlight('HellshakeYanoMarker', l:marker_config)
    catch
      call hellshake_yano#utils#show_error('[hellshake-yano] Error: Invalid highlight_hint_marker: ' . string(l:marker_config))
    endtry
  endif

  " highlight_hint_marker_current の設定適用（snake_case優先、camelCaseフォールバック）
  let l:current_config = get(g:hellshake_yano, 'highlight_hint_marker_current',
        \ get(g:hellshake_yano, 'highlightHintMarkerCurrent', ''))
  if !empty(l:current_config)
    try
      call s:apply_highlight('HellshakeYanoMarkerCurrent', l:current_config)
    catch
      call hellshake_yano#utils#show_error('[hellshake-yano] Error: Invalid highlight_hint_marker_current: ' . string(l:current_config))
    endtry
  endif
endfunction

" 個別のハイライト設定を適用する関数
function! s:apply_highlight(hlgroup_name, color_config) abort
  " ハイライトグループ名の検証
  try
    call s:validate_highlight_group_name(a:hlgroup_name)
  catch
    call hellshake_yano#show_error(v:exception)
    return
  endtry

  " 文字列の場合（従来のハイライトグループ名）
  if type(a:color_config) == v:t_string
    try
      call s:validate_highlight_group_name(a:color_config)
      execute 'highlight default link ' . a:hlgroup_name . ' ' . a:color_config
    catch
      call hellshake_yano#utils#show_error(v:exception)
    endtry
    return
  endif

  " 辞書の場合（fg/bg個別指定）
  if type(a:color_config) == v:t_dict
    let l:cmd_parts = ['highlight', a:hlgroup_name]

    " fg（前景色）の処理
    if has_key(a:color_config, 'fg') && !empty(a:color_config.fg)
      try
        call s:validate_color_value(a:color_config.fg)
        let l:fg_color = hellshake_yano#validation#normalize_color_name(a:color_config.fg)
        if a:color_config.fg =~# '^#'
          " 16進数色の場合はguifgとctermfgの両方を設定
          call add(l:cmd_parts, 'guifg=' . a:color_config.fg)
          call add(l:cmd_parts, 'ctermfg=' . s:hex_to_256(a:color_config.fg))
        else
          " 色名の場合はctermfgとguifgの両方
          call add(l:cmd_parts, 'ctermfg=' . l:fg_color)
          call add(l:cmd_parts, 'guifg=' . l:fg_color)
        endif
      catch
        call hellshake_yano#utils#show_error(v:exception)
        return
      endtry
    endif

    " bg（背景色）の処理
    if has_key(a:color_config, 'bg') && !empty(a:color_config.bg)
      try
        call s:validate_color_value(a:color_config.bg)
        let l:bg_color = hellshake_yano#validation#normalize_color_name(a:color_config.bg)
        if a:color_config.bg =~# '^#'
          " 16進数色の場合はguibgとctermbgの両方を設定
          call add(l:cmd_parts, 'guibg=' . a:color_config.bg)
          call add(l:cmd_parts, 'ctermbg=' . s:hex_to_256(a:color_config.bg))
        else
          " 色名の場合はctermbgとguibgの両方
          call add(l:cmd_parts, 'ctermbg=' . l:bg_color)
          call add(l:cmd_parts, 'guibg=' . l:bg_color)
        endif
      catch
        call hellshake_yano#utils#show_error(v:exception)
        return
      endtry
    endif

    " ハイライトコマンドを実行
    let l:highlight_cmd = join(l:cmd_parts, ' ')
    execute l:highlight_cmd
    return
  endif

  " その他の型の場合はエラー
  call hellshake_yano#utils#show_error('[hellshake-yano] Error: Invalid color configuration type')
endfunction


" ハイライトグループ名の検証関数（autoload関数のラッパー）
function! s:validate_highlight_group_name(name) abort
  return hellshake_yano#validation#highlight_group_name(a:name)
endfunction

" 色値の検証関数（autoload関数のラッパー）
function! s:validate_color_value(color) abort
  return hellshake_yano#validation#color_value(a:color)
endfunction

"=============================================================================
" 初期化関数群
" denops初期化、プラグイン読み込みを担当
"=============================================================================

" denopsの初期化確認
function! s:check_denops() abort
  if !exists('g:loaded_denops')
    call hellshake_yano#utils#show_error('[hellshake-yano] Error: denops.vim is not loaded. Please install denops.vim first.')
    return 0
  endif
  return 1
endfunction

" プラグインの初期化
function! s:initialize() abort
  if !s:check_denops()
    return
  endif

  " denopsプラグインの読み込み
  " denopsは自動的にdenops/*/main.tsを検出するため、
  " 明示的なロードが必要な場合のみdenops#plugin#load()を使用
  try
    let l:script_path = expand('<sfile>:p:h:h') . '/denops/hellshake-yano/main.ts'
    if filereadable(l:script_path)
      call denops#plugin#load('hellshake-yano', l:script_path)
    else
      " ファイルが見つからない場合はdenopsの自動ディスカバリーに任せる
      " 通常、denopsは起動時に自動的にdenops/*/main.tsを検出する
    endif
  catch
    " エラーが発生しても続行（denopsの自動ディスカバリーに任せる）
  endtry
endfunction

"=============================================================================
" コマンド定義関数群
" Vimコマンド、自動コマンド、イベント処理を担当
"=============================================================================

" モーションキーマッピング（初期設定で有効な場合、デフォルト有効）
if get(g:hellshake_yano, 'enabled', v:true)
  call hellshake_yano#mapping#setup_motion_mappings()
endif

" コマンド定義
command! -nargs=0 HellshakeYanoEnable call hellshake_yano#plugin#enable()
command! -nargs=0 HellshakeYanoDisable call hellshake_yano#plugin#disable()
command! -nargs=0 HellshakeYanoToggle call hellshake_yano#plugin#toggle()
command! -nargs=0 HellshakeYanoShow call hellshake_yano#hint#show()
command! -nargs=0 HellshakeYanoHide call hellshake_yano#hint#hide()
command! -nargs=1 HellshakeYanoSetCount call hellshake_yano#config#set_count(<args>)
command! -nargs=1 HellshakeYanoSetTimeout call hellshake_yano#config#set_timeout(<args>)
command! -nargs=+ HellshakeYanoSetHighlight call hellshake_yano#highlight#update(<f-args>)
command! -nargs=+ HellshakeYanoSetCountedMotions call hellshake_yano#mapping#set_counted_motions([<f-args>])
command! -nargs=0 HellshakeYanoDebug call hellshake_yano#debug#display()
command! -nargs=0 HellshakeYanoDebugConfig echo denops#request('hellshake-yano', 'getConfig', [])

" 自動コマンド
augroup HellshakeYano
  autocmd!
  " モード変更時にカウントをリセット
  autocmd ModeChanged * call hellshake_yano#count#reset_all_buffers()
  " バッファ変更時の処理
  autocmd BufEnter * call hellshake_yano#plugin#on_buf_enter()
  autocmd BufLeave * call hellshake_yano#plugin#on_buf_leave()
  " ヒントの自動非表示（カーソル移動時）
  autocmd CursorMoved * call hellshake_yano#hint#auto_hide()
  autocmd CursorMovedI * call hellshake_yano#hint#auto_hide()
  " ヒントの自動非表示（Insert mode 開始時）
  autocmd InsertEnter * call hellshake_yano#hint#auto_hide()
  " denopsプラグインの遅延読み込み
  autocmd User DenopsPluginPost:hellshake-yano call s:on_denops_ready()
  " カラースキーム変更時にハイライトを再適用
  autocmd ColorScheme * call s:apply_custom_highlights()
augroup END

" denopsプラグインの準備完了時の処理
function! s:on_denops_ready() abort
  " 初期化完了のフラグ
  let g:hellshake_yano_ready = v:true

  " カスタムハイライト色の適用
  call s:apply_custom_highlights()

  " ユーザー設定をdenops側に送信（TypeScript側でデフォルト値とマージ）
  call denops#notify('hellshake-yano', 'updateConfig', [g:hellshake_yano])
endfunction

" プラグインの初期化を遅延実行
" 初回起動時にハイライトを適用
call s:apply_custom_highlights()

" プラグインの初期化を遅延実行
" denopsが起動してから初期化する
if exists('g:loaded_denops')
  " denops#server#status()が存在する場合のみチェック
  if exists('*denops#server#status') && denops#server#status() !=# 'stopped'
    call s:initialize()
  else
    " denopsの起動を待ってから初期化
    augroup HellshakeYanoInit
      autocmd!
      autocmd User DenopsPluginPost:* ++once call s:initialize()
      autocmd User DenopsReady ++once call s:initialize()
    augroup END
  endif
else
  " denops自体がまだロードされていない
  augroup HellshakeYanoInit
    autocmd!
    autocmd User DenopsPluginPost:* ++once call s:initialize()
    autocmd User DenopsReady ++once call s:initialize()
  augroup END
endif


" 保存と復元
let &cpo = s:save_cpo
unlet s:save_cpo
