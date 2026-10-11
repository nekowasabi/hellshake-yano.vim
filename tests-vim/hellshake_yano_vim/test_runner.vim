" tests-vim/hellshake_yano_vim/test_runner.vim - VimScript テスト実行フレームワーク
" Author: hellshake-yano
" License: MIT
"
" TDD Red-Green-Refactor サイクル対応のシンプルなテストランナー
" Phase: REFACTOR - カラー出力とユーザビリティの向上
"
" 機能:
"   - Assert(condition, message) - 条件アサーション
"   - AssertEqual(expected, actual, message) - 等価性チェック
"   - AssertTrue(value, message) - 真偽値チェック（true）
"   - AssertFalse(value, message) - 真偽値チェック（false）
"   - RunTest(funcname) - 個別テスト実行
"   - RunAllTests() - 全テスト実行（Test_ で始まる関数を自動検出）
"
" 使い方:
"   1. テストファイルでこのファイルをsource
"   2. Test_xxxxx という名前で関数を定義
"   3. RunAllTests() を呼び出し
"
" 例:
"   source tests-vim/hellshake_yano_vim/test_runner.vim
"
"   function! Test_example() abort
"     call AssertEqual(1, 1, 'one equals one')
"     call AssertTrue(v:true, 'true is true')
"   endfunction
"
"   call RunAllTests()

" テスト環境のセットアップ
let s:save_cpo = &cpo
set cpo&vim

" テスト統計
let s:test_stats = {
  \ 'total': 0,
  \ 'passed': 0,
  \ 'failed': 0,
  \ 'errors': []
\ }

" Assert: 条件が true でなければエラーを投げる
" @param condition: 検証する条件（真偽値）
" @param message: エラーメッセージ
function! Assert(condition, message) abort
  let s:test_stats.total += 1

  if a:condition
    let s:test_stats.passed += 1
    echohl MoreMsg
    echo '    ✓ ' . a:message
    echohl None
  else
    let s:test_stats.failed += 1
    call add(s:test_stats.errors, a:message)
    echohl ErrorMsg
    echo '    ✗ ' . a:message
    echohl None
  endif
endfunction

" AssertEqual: 2つの値が等しいことを検証
" @param expected: 期待値
" @param actual: 実際の値
" @param message: エラーメッセージ
function! AssertEqual(expected, actual, message) abort
  let l:is_equal = a:expected ==# a:actual
  call Assert(l:is_equal, a:message . printf(' (expected: %s, actual: %s)', string(a:expected), string(a:actual)))
endfunction

" AssertTrue: 値が true であることを検証
" @param value: 検証する値
" @param message: エラーメッセージ
function! AssertTrue(value, message) abort
  call Assert(a:value ==# v:true, a:message . printf(' (expected: true, actual: %s)', string(a:value)))
endfunction

" AssertFalse: 値が false であることを検証
" @param value: 検証する値
" @param message: エラーメッセージ
function! AssertFalse(value, message) abort
  call Assert(a:value ==# v:false, a:message . printf(' (expected: false, actual: %s)', string(a:value)))
endfunction

" RunTest: 個別のテスト関数を実行
" @param funcname: テスト関数名（文字列）
function! RunTest(funcname) abort
  echohl Title
  echo '  ' . a:funcname
  echohl None

  let l:failed_before = s:test_stats.failed
  try
    execute 'call ' . a:funcname . '()'
  catch
    let s:test_stats.failed += 1
    call add(s:test_stats.errors, 'Test ' . a:funcname . ' threw exception: ' . v:exception)
    echohl ErrorMsg
    echo '    EXCEPTION: ' . v:exception
    echohl None
  endtry
  let l:status = s:test_stats.failed > l:failed_before ? 'FAIL' : 'PASS'
  echom 'HY_TEST_' . l:status . ' ' . a:funcname
endfunction

" RunAllTests: 全テストを実行
" 現在ロードされている全テスト関数（Test_ で始まる関数）を実行
function! RunAllTests() abort
  " 統計をリセット
  let s:test_stats = {
    \ 'total': 0,
    \ 'passed': 0,
    \ 'failed': 0,
    \ 'errors': []
  \ }

  echo '=== Running All Tests ==='
  echo ''

  " Test_ で始まる関数を検出して実行
  let l:test_functions = s:discover_test_functions()

  if empty(l:test_functions)
    echo 'No tests found'
    echo ''
  else
    for l:funcname in l:test_functions
      call RunTest(l:funcname)
    endfor
    echo ''
  endif

  " 結果表示
  call s:show_test_results()
  if s:test_stats.failed > 0
    cquit 1
  endif
endfunction

" テスト関数の検出（内部関数）
" @return Test_ で始まる関数名のリスト
function! s:discover_test_functions() abort
  redir => l:functions_output
  silent! function
  redir END

  let l:test_functions = []
  for l:line in split(l:functions_output, "\n")
    " 関数定義行をマッチング: "function Test_xxxxx("
    let l:match = matchstr(l:line, 'Test_\w\+')
    if !empty(l:match)
      call add(l:test_functions, l:match)
    endif
  endfor

  return l:test_functions
endfunction

" テスト結果表示（内部関数）
function! s:show_test_results() abort
  echohl Title
  echo '=== Test Results ==='
  echohl None

  echo 'Total:  ' . s:test_stats.total

  " 成功数を緑で表示
  if s:test_stats.passed > 0
    echohl MoreMsg
    echo 'Passed: ' . s:test_stats.passed . ' ✓'
    echohl None
  else
    echo 'Passed: 0'
  endif

  " 失敗数を赤で表示
  if s:test_stats.failed > 0
    echohl ErrorMsg
    echo 'Failed: ' . s:test_stats.failed . ' ✗'
    echohl None
  else
    echohl MoreMsg
    echo 'Failed: 0'
    echohl None
  endif

  echo ''

  " 最終結果のサマリー
  if s:test_stats.failed == 0 && s:test_stats.total > 0
    echohl MoreMsg
    echo 'All tests passed! ✓'
    echohl None
  elseif s:test_stats.failed > 0
    echohl WarningMsg
    echo 'Some tests failed.'
    echohl None
  endif
endfunction

let &cpo = s:save_cpo
unlet s:save_cpo

" テストランナー自体のセルフテスト（GREEN フェーズ）
" 成功するテスト
function! Test_AssertEqual_success() abort
  call AssertEqual(1, 1, 'AssertEqual should pass for equal values')
  call AssertEqual('hello', 'hello', 'AssertEqual should pass for equal strings')
endfunction

function! Test_AssertTrue_success() abort
  call AssertTrue(v:true, 'AssertTrue should pass for true value')
endfunction

function! Test_AssertFalse_success() abort
  call AssertFalse(v:false, 'AssertFalse should pass for false value')
endfunction

" 失敗するテスト（動作確認用）
function! Test_AssertEqual_failure() abort
  call AssertEqual(1, 2, 'AssertEqual should detect inequality')
endfunction

function! Test_AssertTrue_failure() abort
  call AssertTrue(v:false, 'AssertTrue should detect false value')
endfunction

function! Test_AssertFalse_failure() abort
  call AssertFalse(v:true, 'AssertFalse should detect true value')
endfunction

" 自動実行（このファイルをsourceした時）
" セルフテストを実行してテストランナーの動作を確認
if expand('%:t') == 'test_runner.vim'
  echo 'Test runner loaded (REFACTOR phase complete)'
  echo ''
  call RunAllTests()
  echo ''
  echo 'Expected: 3 passed, 3 failed'
  echo 'If you see colored output (green ✓ for success, red ✗ for failure), REFACTOR phase is complete!'
endif
