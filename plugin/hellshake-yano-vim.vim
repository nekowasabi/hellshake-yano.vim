" hellshake-yano-vim.vim - Pure VimScript implementation of hit-a-hint plugin
" Phase A-1: MVP implementation with TDD approach
" Author: hellshake-yano
" License: MIT
"
" This plugin provides a minimal viable implementation of hint-based jumping
" using pure VimScript, compatible with Vim 8.0+.
" Unlike the denops version (hellshake-yano), this implementation does not
" require external dependencies and uses the hellshake_yano_vim namespace.
"
" Note: For Neovim, use the denops implementation (hellshake-yano.vim) instead.

"=============================================================================
" Editor Guard - Vim 8.0+ only (Neovim uses denops implementation)
"=============================================================================

if has('nvim')
  " Neovimの場合はdenops実装を使用
  finish
endif

"=============================================================================
" Load Guard
"=============================================================================

if exists('g:loaded_hellshake_yano_vim')
  finish
endif
let g:loaded_hellshake_yano_vim = 1

" Save and restore cpoptions
let s:save_cpo = &cpo
set cpo&vim

"=============================================================================
" Version Check
"=============================================================================

" Require Vim 8.0 or later
if !has('patch-8.0.0') && !has('nvim')
  echohl ErrorMsg
  echomsg 'hellshake-yano-vim requires Vim 8.0 or later, or Neovim'
  echohl None
  finish
endif

"=============================================================================
" Initialization Flag
"=============================================================================

" Track whether core#init() has been called
let s:initialized = 0

"=============================================================================
" Command Definitions
"=============================================================================

" Test command: Run all VimScript tests
command! -nargs=0 HellshakeYanoVimTest call s:run_all_tests()

" Show hints command: Display hints at fixed positions
command! -nargs=0 HellshakeYanoVimShow call s:show_hints()

" Hide hints command: Remove all displayed hints
command! -nargs=0 HellshakeYanoVimHide call s:hide_hints()

" Dictionary commands (Phase D-7 Process4 Sub3)
" Pure Vim版専用の辞書操作コマンド（Denops連携）
command! -nargs=0 HYVimDictReload call s:dict_reload()
command! -nargs=+ HYVimDictAdd call s:dict_add(<f-args>)
command! -nargs=0 HYVimDictEdit call s:dict_edit()
command! -nargs=0 HYVimDictShow call s:dict_show()
command! -nargs=0 HYVimDictValidate call s:dict_validate()

"=============================================================================
" Command Implementation Functions
"=============================================================================

" Run all tests
function! s:run_all_tests() abort
  try
    " Source the test runner framework
    let l:plugin_root = expand('<sfile>:p:h:h')
    let l:test_runner_path = l:plugin_root . '/tests-vim/hellshake_yano_vim/test_runner.vim'
    if !filereadable(l:test_runner_path)
      echohl ErrorMsg
      echomsg '[hellshake-yano-vim] Error: Test runner not found at ' . l:test_runner_path
      echohl None
      return
    endif
    execute 'source ' . l:test_runner_path

    " Source all test files
    let l:test_dir = l:plugin_root . '/tests-vim/hellshake_yano_vim'
    let l:test_files = [
          \ 'test_core.vim',
          \ 'test_hint_generator.vim',
          \ 'test_display.vim',
          \ 'test_jump.vim',
          \ 'test_input.vim',
          \ 'test_word_detector.vim',
          \ 'test_config.vim',
          \ 'test_visual.vim',
          \ 'test_integration.vim'
          \ ]

    for l:test_file in l:test_files
      let l:test_path = l:test_dir . '/' . l:test_file
      if filereadable(l:test_path)
        execute 'source ' . l:test_path
      else
        echohl WarningMsg
        echomsg '[hellshake-yano-vim] Warning: Test file not found: ' . l:test_file
        echohl None
      endif
    endfor

    " Run all tests
    call RunAllTests()
  catch
    echohl ErrorMsg
    echomsg '[hellshake-yano-vim] Error running tests: ' . v:exception
    echohl None
  endtry
endfunction

" Show hints at fixed positions
function! s:show_hints() abort
  try
    " Initialize on first call
    if !s:initialized
      call hellshake_yano_vim#core#init()
      let s:initialized = 1
    endif

    " Show hints
    call hellshake_yano_vim#core#show()
  catch
    echohl ErrorMsg
    echomsg '[hellshake-yano-vim] Error showing hints: ' . v:exception
    echohl None
  endtry
endfunction

" Hide all hints
function! s:hide_hints() abort
  try
    call hellshake_yano_vim#core#hide()
  catch
    echohl ErrorMsg
    echomsg '[hellshake-yano-vim] Error hiding hints: ' . v:exception
    echohl None
  endtry
endfunction

"=============================================================================
" Dictionary Command Implementation Functions (Phase D-7 Process4 Sub3)
"=============================================================================
"
" Pure Vim版専用の辞書操作コマンド実装
"
" 【概要】
" Denops辞書システム（dictionary.vim）へのコマンドラッパー
" Denops未起動時は適切なエラーメッセージを表示
"
" 【コマンド一覧】
" :HYVimDictReload    - 辞書を再読み込み
" :HYVimDictAdd       - 辞書に単語を追加
" :HYVimDictEdit      - 辞書ファイルを編集（案内メッセージ表示）
" :HYVimDictShow      - 辞書の内容を表示
" :HYVimDictValidate  - 辞書の整合性を検証
"

" Helper function: エラーメッセージの統一表示
" @param operation: 操作名（'Reload', 'Add'等）
" @param exception: 例外メッセージ
function! s:show_dict_error(operation, exception) abort
  echohl ErrorMsg
  echomsg '[Dictionary] ' . a:operation . ' error: ' . a:exception
  echohl None
endfunction

" Reload dictionary
" Denops辞書システムの辞書を再読み込みする
function! s:dict_reload() abort
  try
    call hellshake_yano#dictionary#reload()
  catch
    call s:show_dict_error('Reload', v:exception)
  endtry
endfunction

" Add word to dictionary
" Denops辞書システムに単語を追加する
" @param word: Word to add (required)
" @param meaning: Meaning (optional, default: '')
" @param type: Type (optional, default: 'custom')
function! s:dict_add(...) abort
  if a:0 < 1
    echohl ErrorMsg
    echomsg '[Dictionary] Usage: HYVimDictAdd <word> [meaning] [type]'
    echohl None
    return
  endif

  let l:word = a:1
  let l:meaning = a:0 >= 2 ? a:2 : ''
  let l:type = a:0 >= 3 ? a:3 : 'custom'

  try
    call hellshake_yano#dictionary#add(l:word)
  catch
    call s:show_dict_error('Add', v:exception)
  endtry
endfunction

" Edit dictionary
" 辞書ファイルの編集方法を案内する
" 注: 実際の編集はユーザーがエディタで直接行う必要がある
function! s:dict_edit() abort
  try
    " Show dictionary first
    call hellshake_yano#dictionary#show()
    echo ''
    echohl WarningMsg
    echo '[Dictionary] Please edit the dictionary file directly using your editor.'
    echo 'Dictionary location: Check g:hellshake_yano.userDictionaryPath or use :HYVimDictShow'
    echohl None
  catch
    call s:show_dict_error('Edit', v:exception)
  endtry
endfunction

" Show dictionary
" Denops辞書システムの辞書内容を表示する
function! s:dict_show() abort
  try
    call hellshake_yano#dictionary#show()
  catch
    call s:show_dict_error('Show', v:exception)
  endtry
endfunction

" Validate dictionary
" Denops辞書システムの辞書整合性を検証する
function! s:dict_validate() abort
  try
    call hellshake_yano#dictionary#validate()
  catch
    call s:show_dict_error('Validate', v:exception)
  endtry
endfunction

"=============================================================================
" Motion Key Mappings (Phase A-4)
"=============================================================================
"
" モーション連打検出機能のキーマッピング
" w/b/e キーを連続で押下（連打）したときにヒント表示を自動的にトリガーします。
"
" カスタマイズ方法:
"   以下の例のように、<Plug>マッピングを使用して独自のキーにマッピングできます。
"
"   例: デフォルトのマッピングを無効化して、独自のキーにマッピング
"     let g:hellshake_yano_vim_config = {'motion_enabled': v:false}
"     nmap <Leader>w <Plug>(hellshake-yano-vim-w)
"     nmap <Leader>b <Plug>(hellshake-yano-vim-b)
"     nmap <Leader>e <Plug>(hellshake-yano-vim-e)
"
"   例: 対象キーを変更（デフォルト: ['w', 'b', 'e']）
"     let g:hellshake_yano_vim_config = {'motion_keys': ['w', 'b']}
"

" <Plug>マッピングの定義（常に定義）
nnoremap <silent> <Plug>(hellshake-yano-vim-w)
      \ :<C-u>call hellshake_yano_vim#motion#handle('w')<CR>
nnoremap <silent> <Plug>(hellshake-yano-vim-b)
      \ :<C-u>call hellshake_yano_vim#motion#handle('b')<CR>
nnoremap <silent> <Plug>(hellshake-yano-vim-e)
      \ :<C-u>call hellshake_yano_vim#motion#handle('e')<CR>

" デフォルトマッピングの設定（motion_enabled が true の場合のみ）
" 設定変数の統一: g:hellshake_yano を優先、g:hellshake_yano_vim_config をフォールバック
" Phase D-2 Sub1.2 追加修正: 設定変数名の不整合を解消
if !exists('g:hellshake_yano') && !exists('g:hellshake_yano_vim_config')
  let g:hellshake_yano = {}
endif

" motion_enabled の取得（g:hellshake_yano を優先）
let s:motion_enabled = v:true
if exists('g:hellshake_yano') && has_key(g:hellshake_yano, 'motionCounterEnabled')
  let s:motion_enabled = g:hellshake_yano.motionCounterEnabled
elseif exists('g:hellshake_yano_vim_config') && has_key(g:hellshake_yano_vim_config, 'motion_enabled')
  let s:motion_enabled = g:hellshake_yano_vim_config.motion_enabled
endif

" motion_keys の取得（g:hellshake_yano を優先）
let s:motion_keys = ['w', 'b', 'e', 'h', 'j', 'k', 'l']
if exists('g:hellshake_yano') && has_key(g:hellshake_yano, 'countedMotions')
  if !empty(g:hellshake_yano.countedMotions)
    let s:motion_keys = g:hellshake_yano.countedMotions
  endif
elseif exists('g:hellshake_yano_vim_config') && has_key(g:hellshake_yano_vim_config, 'motion_keys')
  if !empty(g:hellshake_yano_vim_config.motion_keys)
    let s:motion_keys = g:hellshake_yano_vim_config.motion_keys
  endif
endif

" 単一文字かつ安全な文字集合のキーのみをマッピング対象として許可する。
" execute printf('... %s ...', key, ...) で key をマッピングLHSへ未エスケープで
" 展開しているため、ここで弾かないと '|' 等を含む値でコマンドインジェクションが成立する。
function! s:is_safe_motion_key(key) abort
  return type(a:key) == v:t_string
        \ && match(a:key, '^[a-zA-Z0-9!@#$%^&*()_+=\[\]{}|;:,.<>?/~`-]$') != -1
endfunction

if s:motion_enabled
  " 対象キーをループしてマッピング（Normal mode）
  " Phase D-7 Process3 Sub1 (修正版): <expr>マッピングで直接v:count1を取得
  " autoload関数の遅延読み込みによるv:count消失問題を回避するため、
  " plugin/でマッピングを直接実装（autoload関数を経由しない）
  for s:key in s:motion_keys
    if !s:is_safe_motion_key(s:key)
      echom '[hellshake-yano] Warning: skipping invalid motion key: ' . string(s:key)
      continue
    endif
    " <expr>マッピングを使用して数値プレフィックス（カウント）を取得
    " v:count1を直接printfに渡し、handle_with_count()を呼び出す
    " この方法により、autoload関数読み込み前にカウントが保存される
    execute printf('nnoremap <silent> <expr> %s printf(":\<C-u>call hellshake_yano_vim#motion#handle_with_count(%s, %%d)\<CR>", v:count1)',
          \ s:key, string(s:key))
  endfor

  " Visual mode用のモーション検出マッピング (Phase D-2 Sub1.2, Phase D-7 Process3 Sub2)
  " Phase D-7 Process3 Sub2 (修正版): timer_start()で非同期的にモーション検出処理を実行
  " autoload関数の遅延読み込み問題を回避するため、v:count1を先に取得してからモーションキーを返す
  for s:key in s:motion_keys
    if !s:is_safe_motion_key(s:key)
      continue
    endif
    " Visual modeでもモーション検出を有効化
    " timer_start()で非同期的にhandle_visual_internal()を呼び出し、
    " v:count1を取得してカウント付きモーションキー（例: "5j"）を返す
    execute printf('xnoremap <silent> <expr> %s hellshake_yano_vim#motion#visual_schedule(%s)',
          \ s:key, string(s:key))
  endfor
endif

" 一時変数のクリーンアップ
unlet s:motion_enabled
unlet s:motion_keys
if exists('s:key')
  unlet s:key
endif

"=============================================================================
" Visual Mode Mappings (Phase A-5)
"=============================================================================
"
" ビジュアルモード対応のキーマッピング
" ビジュアルモードで選択範囲内の単語にヒント表示を行います。
"
" カスタマイズ方法:
"   以下の例のように、<Plug>マッピングを使用して独自のキーにマッピングできます。
"
"   例: デフォルトのマッピングを無効化して、独自のキーにマッピング
"     let g:hellshake_yano_vim_config = {'visual_mode_enabled': v:false}
"     xmap <Leader>j <Plug>(hellshake-yano-vim-visual)
"
"   例: ビジュアルモード対応を無効化
"     let g:hellshake_yano_vim_config = {'visual_mode_enabled': v:false}
"

" <Plug>マッピングの定義（常に定義）
xnoremap <silent> <Plug>(hellshake-yano-vim-visual)
      \ :<C-u>call hellshake_yano_vim#visual#show()<CR>

" デフォルトマッピングの設定（visual_mode_enabled が true の場合のみ）
" Phase D-2 Sub1.2 追加修正: 設定変数名の統一
let s:visual_mode_enabled = v:true
if exists('g:hellshake_yano') && has_key(g:hellshake_yano, 'visualModeEnabled')
  let s:visual_mode_enabled = g:hellshake_yano.visualModeEnabled
elseif exists('g:hellshake_yano_vim_config') && has_key(g:hellshake_yano_vim_config, 'visual_mode_enabled')
  let s:visual_mode_enabled = g:hellshake_yano_vim_config.visual_mode_enabled
endif

if s:visual_mode_enabled
  xnoremap <silent> <Leader>h :<C-u>call hellshake_yano_vim#visual#show()<CR>
endif

" 一時変数のクリーンアップ
unlet s:visual_mode_enabled

"=============================================================================
" Restore cpoptions
"=============================================================================

let &cpo = s:save_cpo
unlet s:save_cpo
