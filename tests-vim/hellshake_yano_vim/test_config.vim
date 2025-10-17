" tests-vim/hellshake_yano_vim/test_config.vim
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: RED
" Process2: 設定管理のテストケース
"
" このファイルは config.vim のユニットテストを提供します。
" Phase A-4: 設定管理機能のテストケースを含みます。

" スクリプトローカル変数の定義
let s:save_cpo = &cpo
set cpo&vim

" テスト結果のカウンター
let s:test_count = 0
let s:test_passed = 0
let s:test_failed = 0

" アサーション関数
function! s:assert_equal(expected, actual, test_name) abort
  let s:test_count += 1
  if a:expected == a:actual
    let s:test_passed += 1
    echo printf('[PASS] %s', a:test_name)
  else
    let s:test_failed += 1
    echohl ErrorMsg
    echo printf('[FAIL] %s', a:test_name)
    echo printf('  Expected: %s', string(a:expected))
    echo printf('  Actual: %s', string(a:actual))
    echohl None
  endif
endfunction

function! s:assert_true(actual, test_name) abort
  call s:assert_equal(v:true, a:actual, a:test_name)
endfunction

function! s:assert_false(actual, test_name) abort
  call s:assert_equal(v:false, a:actual, a:test_name)
endfunction

" ========================================
" デフォルト設定取得のテスト
" ========================================

function! s:test_config_get_default() abort
  " グローバル変数をクリア（デフォルト値を確認するため）
  if exists('g:hellshake_yano_vim_config')
    unlet g:hellshake_yano_vim_config
  endif

  " デフォルト値を取得
  let l:enabled = hellshake_yano_vim#config#get('enabled')
  let l:hint_chars = hellshake_yano_vim#config#get('hint_chars')
  let l:motion_enabled = hellshake_yano_vim#config#get('motion_enabled')
  let l:motion_threshold = hellshake_yano_vim#config#get('motion_threshold')
  let l:motion_timeout_ms = hellshake_yano_vim#config#get('motion_timeout_ms')
  let l:motion_keys = hellshake_yano_vim#config#get('motion_keys')

  " デフォルト値を確認
  call s:assert_true(l:enabled, 'default enabled should be true')
  call s:assert_equal('ASDFJKL', l:hint_chars, 'default hint_chars should be "ASDFJKL"')
  call s:assert_true(l:motion_enabled, 'default motion_enabled should be true')
  call s:assert_equal(2, l:motion_threshold, 'default motion_threshold should be 2')
  call s:assert_equal(2000, l:motion_timeout_ms, 'default motion_timeout_ms should be 2000')
  call s:assert_equal(['w', 'b', 'e'], l:motion_keys,
    \ 'default motion_keys should be ["w", "b", "e"]')
endfunction

" ========================================
" 設定値の変更と取得のテスト
" ========================================

function! s:test_config_set_and_get() abort
  " グローバル変数をクリア
  if exists('g:hellshake_yano_vim_config')
    unlet g:hellshake_yano_vim_config
  endif

  " 設定値を変更
  call hellshake_yano_vim#config#set('motion_threshold', 3)
  call hellshake_yano_vim#config#set('motion_timeout_ms', 1500)
  call hellshake_yano_vim#config#set('motion_enabled', v:false)

  " 変更された値を取得
  let l:motion_threshold = hellshake_yano_vim#config#get('motion_threshold')
  let l:motion_timeout_ms = hellshake_yano_vim#config#get('motion_timeout_ms')
  let l:motion_enabled = hellshake_yano_vim#config#get('motion_enabled')

  " 変更が反映されていることを確認
  call s:assert_equal(3, l:motion_threshold,
    \ 'set() should update motion_threshold to 3')
  call s:assert_equal(1500, l:motion_timeout_ms,
    \ 'set() should update motion_timeout_ms to 1500')
  call s:assert_false(l:motion_enabled,
    \ 'set() should update motion_enabled to false')

  " クリーンアップ
  unlet g:hellshake_yano_vim_config
endfunction

" ========================================
" グローバル変数でのオーバーライドのテスト
" ========================================

function! s:test_config_user_override() abort
  " ユーザー設定をグローバル変数で定義
  let g:hellshake_yano_vim_config = {
    \ 'motion_threshold': 4,
    \ 'motion_timeout_ms': 3000,
    \ 'motion_keys': ['w', 'b']
  \ }

  " オーバーライドされた値を取得
  let l:motion_threshold = hellshake_yano_vim#config#get('motion_threshold')
  let l:motion_timeout_ms = hellshake_yano_vim#config#get('motion_timeout_ms')
  let l:motion_keys = hellshake_yano_vim#config#get('motion_keys')
  let l:enabled = hellshake_yano_vim#config#get('enabled')

  " オーバーライドが反映されていることを確認
  call s:assert_equal(4, l:motion_threshold,
    \ 'user config should override motion_threshold to 4')
  call s:assert_equal(3000, l:motion_timeout_ms,
    \ 'user config should override motion_timeout_ms to 3000')
  call s:assert_equal(['w', 'b'], l:motion_keys,
    \ 'user config should override motion_keys to ["w", "b"]')

  " デフォルト値が保持されていることを確認（未オーバーライド）
  call s:assert_true(l:enabled,
    \ 'user config should not override enabled (keep default)')

  " クリーンアップ
  unlet g:hellshake_yano_vim_config
endfunction

" ========================================
" 存在しないキーの取得テスト
" ========================================

function! s:test_config_get_nonexistent_key() abort
  " グローバル変数をクリア
  if exists('g:hellshake_yano_vim_config')
    unlet g:hellshake_yano_vim_config
  endif

  " 存在しないキーを取得（デフォルトではv:noneを返す）
  let l:result = hellshake_yano_vim#config#get('nonexistent_key')

  " v:none が返されることを確認
  call s:assert_equal(v:none, l:result,
    \ 'get() should return v:none for nonexistent key')
endfunction

" ========================================
" 設定値の部分的なオーバーライドのテスト
" ========================================

function! s:test_config_partial_override() abort
  " 一部のみをオーバーライド
  let g:hellshake_yano_vim_config = {
    \ 'motion_threshold': 5
  \ }

  " オーバーライドされた値と、されていない値を取得
  let l:motion_threshold = hellshake_yano_vim#config#get('motion_threshold')
  let l:motion_timeout_ms = hellshake_yano_vim#config#get('motion_timeout_ms')

  " オーバーライドが反映され、他はデフォルトが保持されることを確認
  call s:assert_equal(5, l:motion_threshold,
    \ 'partial override should set motion_threshold to 5')
  call s:assert_equal(2000, l:motion_timeout_ms,
    \ 'partial override should keep default motion_timeout_ms at 2000')

  " クリーンアップ
  unlet g:hellshake_yano_vim_config
endfunction

" ========================================
" Phase A-5: 新規設定項目のテスト
" ========================================

function! s:test_config_phase_a5_defaults() abort
  " グローバル変数をクリア
  if exists('g:hellshake_yano_vim_config')
    unlet g:hellshake_yano_vim_config
  endif

  " Phase A-5の新規設定項目のデフォルト値を取得
  let l:use_japanese = hellshake_yano_vim#config#get('use_japanese')
  let l:min_word_length = hellshake_yano_vim#config#get('min_word_length')
  let l:visual_mode_enabled = hellshake_yano_vim#config#get('visual_mode_enabled')
  let l:max_hints = hellshake_yano_vim#config#get('max_hints')
  let l:exclude_numbers = hellshake_yano_vim#config#get('exclude_numbers')
  let l:debug_mode = hellshake_yano_vim#config#get('debug_mode')

  " デフォルト値を確認
  call s:assert_false(l:use_japanese, 'default use_japanese should be false')
  call s:assert_equal(1, l:min_word_length, 'default min_word_length should be 1')
  call s:assert_true(l:visual_mode_enabled, 'default visual_mode_enabled should be true')
  call s:assert_equal(49, l:max_hints, 'default max_hints should be 49')
  call s:assert_false(l:exclude_numbers, 'default exclude_numbers should be false')
  call s:assert_false(l:debug_mode, 'default debug_mode should be false')
endfunction

function! s:test_config_phase_a5_custom() abort
  " Phase A-5の新規設定をカスタマイズ
  let g:hellshake_yano_vim_config = {
    \ 'use_japanese': v:true,
    \ 'min_word_length': 2,
    \ 'visual_mode_enabled': v:false,
    \ 'max_hints': 30,
    \ 'exclude_numbers': v:true,
    \ 'debug_mode': v:true
  \ }

  " カスタム値を取得
  let l:use_japanese = hellshake_yano_vim#config#get('use_japanese')
  let l:min_word_length = hellshake_yano_vim#config#get('min_word_length')
  let l:visual_mode_enabled = hellshake_yano_vim#config#get('visual_mode_enabled')
  let l:max_hints = hellshake_yano_vim#config#get('max_hints')
  let l:exclude_numbers = hellshake_yano_vim#config#get('exclude_numbers')
  let l:debug_mode = hellshake_yano_vim#config#get('debug_mode')

  " カスタム値が反映されていることを確認
  call s:assert_true(l:use_japanese, 'custom use_japanese should be true')
  call s:assert_equal(2, l:min_word_length, 'custom min_word_length should be 2')
  call s:assert_false(l:visual_mode_enabled, 'custom visual_mode_enabled should be false')
  call s:assert_equal(30, l:max_hints, 'custom max_hints should be 30')
  call s:assert_true(l:exclude_numbers, 'custom exclude_numbers should be true')
  call s:assert_true(l:debug_mode, 'custom debug_mode should be true')

  " クリーンアップ
  unlet g:hellshake_yano_vim_config
endfunction

" ========================================
" テストスイート実行
" ========================================

function! s:run_all_tests() abort
  echo '=========================================='
  echo 'hellshake_yano_vim#config Test Suite'
  echo '=========================================='
  echo ''

  " デフォルト設定のテスト
  echo '--- Default Configuration ---'
  call s:test_config_get_default()
  echo ''

  " 設定変更のテスト
  echo '--- Set and Get Configuration ---'
  call s:test_config_set_and_get()
  echo ''

  " グローバル変数によるオーバーライドのテスト
  echo '--- User Override ---'
  call s:test_config_user_override()
  echo ''

  " エッジケース
  echo '--- Edge Cases ---'
  call s:test_config_get_nonexistent_key()
  call s:test_config_partial_override()
  echo ''

  " Phase A-5: 新規設定項目のテスト
  echo '--- Phase A-5: New Configuration Items ---'
  call s:test_config_phase_a5_defaults()
  call s:test_config_phase_a5_custom()
  echo ''

  " 結果サマリー
  echo '=========================================='
  echo printf('Test Results: %d passed, %d failed, %d total',
    \ s:test_passed, s:test_failed, s:test_count)
  echo '=========================================='

  if s:test_failed > 0
    echohl ErrorMsg
    echo 'SOME TESTS FAILED!'
    echohl None
  else
    echohl MoreMsg
    echo 'ALL TESTS PASSED!'
    echohl None
  endif
endfunction

" テスト実行
call s:run_all_tests()

let &cpo = s:save_cpo
unlet s:save_cpo
