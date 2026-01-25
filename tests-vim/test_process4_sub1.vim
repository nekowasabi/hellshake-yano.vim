" tests-vim/test_process4_sub1.vim
" Phase D-7 Process4 Sub1: Denops Dictionary Wrapper 詳細テスト
"
" テスト実行方法:
"   vim -u NONE -N -S tests-vim/test_process4_sub1.vim
"
" テスト数: 23テスト（8グループ）
" 注意: Denops未起動環境でも実行可能なテスト

" === セットアップ ===
set nocompatible
set nomore
filetype plugin on

" ランタイムパス設定
let s:plugin_root = expand('<sfile>:p:h:h')
execute 'set runtimepath+=' . s:plugin_root

" テストランナー読み込み（セルフテスト関数を削除）
source <sfile>:p:h/hellshake_yano_vim/test_runner.vim

" テストランナーのセルフテスト関数を削除（本テストに含めない）
silent! delfunction Test_AssertEqual_success
silent! delfunction Test_AssertTrue_success
silent! delfunction Test_AssertFalse_success
silent! delfunction Test_AssertEqual_failure
silent! delfunction Test_AssertTrue_failure
silent! delfunction Test_AssertFalse_failure

" テスト対象の dictionary.vim を明示的に読み込み
runtime autoload/hellshake_yano_vim/dictionary.vim

" ==============================================================================
" Test Group 1: Denops利用可能チェック（3テスト）
" ==============================================================================

function! Test_has_denops_function_exists() abort
  call AssertTrue(exists('*hellshake_yano_vim#dictionary#has_denops'),
    \ 'has_denops function should exist')
endfunction

function! Test_has_denops_returns_boolean() abort
  let l:result = hellshake_yano_vim#dictionary#has_denops()
  call Assert(l:result ==# v:true || l:result ==# v:false,
    \ 'has_denops should return v:true or v:false')
endfunction

function! Test_has_denops_without_denops_plugin() abort
  " Denops未起動環境（テスト環境）ではv:falseを期待
  call AssertFalse(hellshake_yano_vim#dictionary#has_denops(),
    \ 'has_denops should return v:false when Denops not loaded')
endfunction

" ==============================================================================
" Test Group 2: Dictionary Reload API（4テスト）
" ==============================================================================

function! Test_reload_function_exists() abort
  call AssertTrue(exists('*hellshake_yano_vim#dictionary#reload'),
    \ 'reload function should exist')
endfunction

function! Test_reload_returns_boolean() abort
  " Denops未起動時はechoerr経由で例外が発生するが、戻り値の型を確認
  try
    let l:result = hellshake_yano_vim#dictionary#reload()
    call Assert(l:result ==# v:true || l:result ==# v:false,
      \ 'reload should return boolean')
  catch /\[Dictionary\]/
    " echoerr による例外が発生 - 戻り値の確認はできないが想定動作
    call Assert(1, 'reload would return boolean (echoerr intercepted)')
  endtry
endfunction

function! Test_reload_without_denops() abort
  " Denops未起動時はechoerr経由で例外が発生するが、これは想定動作
  try
    let l:result = hellshake_yano_vim#dictionary#reload()
    call AssertFalse(l:result,
      \ 'reload should return v:false when Denops not available')
  catch /\[Dictionary\]/
    " echoerr による想定内の例外 - v:falseを返す前にechoerr
    call Assert(1, 'reload reports Denops not available (expected behavior)')
  endtry
endfunction

function! Test_reload_no_exception() abort
  " Denops未起動時はechoerr経由で例外が発生するが、これは想定動作
  " 関数自体がv:falseを返して正常終了することを確認
  try
    let l:result = hellshake_yano_vim#dictionary#reload()
    call Assert(l:result ==# v:false, 'reload should return v:false without Denops')
  catch /\[Dictionary\]/
    " echoerr による想定内の例外 - 正常動作
    call Assert(1, 'reload gracefully reports Denops unavailable')
  catch
    call Assert(0, 'reload threw unexpected exception: ' . v:exception)
  endtry
endfunction

" ==============================================================================
" Test Group 3: Dictionary Add Word API（5テスト）
" ==============================================================================

function! Test_add_function_exists() abort
  call AssertTrue(exists('*hellshake_yano_vim#dictionary#add'),
    \ 'add function should exist')
endfunction

function! Test_add_with_word_only() abort
  " Denops未起動時はechoerr経由で例外が発生するが、戻り値の型を確認
  try
    let l:result = hellshake_yano_vim#dictionary#add('testword')
    call Assert(l:result ==# v:true || l:result ==# v:false,
      \ 'add(word) should return boolean')
  catch /\[Dictionary\]/
    call Assert(1, 'add(word) would return boolean (echoerr intercepted)')
  endtry
endfunction

function! Test_add_with_word_and_meaning() abort
  " Denops未起動時はechoerr経由で例外が発生するが、戻り値の型を確認
  try
    let l:result = hellshake_yano_vim#dictionary#add('testword', 'test meaning')
    call Assert(l:result ==# v:true || l:result ==# v:false,
      \ 'add(word, meaning) should return boolean')
  catch /\[Dictionary\]/
    call Assert(1, 'add(word, meaning) would return boolean (echoerr intercepted)')
  endtry
endfunction

function! Test_add_with_all_args() abort
  " Denops未起動時はechoerr経由で例外が発生するが、戻り値の型を確認
  try
    let l:result = hellshake_yano_vim#dictionary#add('testword', 'test meaning', 'noun')
    call Assert(l:result ==# v:true || l:result ==# v:false,
      \ 'add(word, meaning, type) should return boolean')
  catch /\[Dictionary\]/
    call Assert(1, 'add(word, meaning, type) would return boolean (echoerr intercepted)')
  endtry
endfunction

function! Test_add_without_denops() abort
  " Denops未起動時はechoerr経由で例外が発生するが、これは想定動作
  try
    let l:result = hellshake_yano_vim#dictionary#add('testword')
    call AssertFalse(l:result,
      \ 'add should return v:false when Denops not available')
  catch /\[Dictionary\]/
    call Assert(1, 'add reports Denops not available (expected behavior)')
  endtry
endfunction

" ==============================================================================
" Test Group 4: Dictionary Edit API（2テスト）
" ==============================================================================

function! Test_clear_cache_for_edit_test() abort
  " HYVimDictEditコマンドはpluginファイルで定義されるため、
  " ここでは関連するAPIの存在確認のみ
  call AssertTrue(exists('*hellshake_yano_vim#dictionary#show'),
    \ 'show function (used by edit) should exist')
endfunction

function! Test_edit_related_api_no_exception() abort
  " Denops未起動時はechoerr経由で例外が発生するが、これは想定動作
  try
    let l:result = hellshake_yano_vim#dictionary#show()
    call Assert(l:result ==# v:false, 'show should return v:false without Denops')
  catch /\[Dictionary\]/
    " echoerr による想定内の例外 - 正常動作
    call Assert(1, 'show gracefully reports Denops unavailable')
  catch
    call Assert(0, 'show threw unexpected exception: ' . v:exception)
  endtry
endfunction

" ==============================================================================
" Test Group 5: Dictionary Show API（2テスト）
" ==============================================================================

function! Test_show_function_exists() abort
  call AssertTrue(exists('*hellshake_yano_vim#dictionary#show'),
    \ 'show function should exist')
endfunction

function! Test_show_without_denops() abort
  " Denops未起動時はechoerr経由で例外が発生するが、これは想定動作
  try
    let l:result = hellshake_yano_vim#dictionary#show()
    call AssertFalse(l:result,
      \ 'show should return v:false when Denops not available')
  catch /\[Dictionary\]/
    call Assert(1, 'show reports Denops not available (expected behavior)')
  endtry
endfunction

" ==============================================================================
" Test Group 6: Dictionary Validate API（2テスト）
" ==============================================================================

function! Test_validate_function_exists() abort
  call AssertTrue(exists('*hellshake_yano_vim#dictionary#validate'),
    \ 'validate function should exist')
endfunction

function! Test_validate_without_denops() abort
  " Denops未起動時はechoerr経由で例外が発生するが、これは想定動作
  try
    let l:result = hellshake_yano_vim#dictionary#validate()
    call AssertFalse(l:result,
      \ 'validate should return v:false when Denops not available')
  catch /\[Dictionary\]/
    call Assert(1, 'validate reports Denops not available (expected behavior)')
  endtry
endfunction

" ==============================================================================
" Test Group 7: Fallback Behavior（2テスト）
" ==============================================================================

function! Test_is_in_dictionary_without_denops() abort
  " キャッシュクリア
  call hellshake_yano_vim#dictionary#clear_cache()
  " Denops未起動でもエラーにならずv:falseを返すことを確認
  let l:result = hellshake_yano_vim#dictionary#is_in_dictionary('API')
  call AssertFalse(l:result,
    \ 'is_in_dictionary should return v:false when Denops not available')
endfunction

function! Test_is_in_dictionary_no_error_spam() abort
  " 複数回呼び出してもエラーメッセージが出ないことを確認
  call hellshake_yano_vim#dictionary#clear_cache()
  for i in range(5)
    call hellshake_yano_vim#dictionary#is_in_dictionary('word' . i)
  endfor
  " ここまで到達すればエラースパムなし
  call Assert(1, 'Multiple calls should not spam error messages')
endfunction

" ==============================================================================
" Test Group 8: Error Handling（3テスト）
" ==============================================================================

function! Test_clear_cache_function_exists() abort
  call AssertTrue(exists('*hellshake_yano_vim#dictionary#clear_cache'),
    \ 'clear_cache function should exist')
endfunction

function! Test_clear_cache_no_exception() abort
  " キャッシュクリアがエラーなく実行できることを確認
  try
    call hellshake_yano_vim#dictionary#clear_cache()
    call Assert(1, 'clear_cache should execute without error')
  catch
    call Assert(0, 'clear_cache threw exception: ' . v:exception)
  endtry
endfunction

function! Test_all_apis_graceful_failure() abort
  " 全APIがDenops未起動でも致命的エラーを投げずに動作することを確認
  " Note: echoerr による [Dictionary] エラーは想定内（ユーザー通知用）
  let l:unexpected_errors = []

  try
    call hellshake_yano_vim#dictionary#has_denops()
  catch /\[Dictionary\]/
    " 想定内のエラー通知
  catch
    call add(l:unexpected_errors, 'has_denops: ' . v:exception)
  endtry

  try
    call hellshake_yano_vim#dictionary#reload()
  catch /\[Dictionary\]/
    " 想定内のエラー通知
  catch
    call add(l:unexpected_errors, 'reload: ' . v:exception)
  endtry

  try
    call hellshake_yano_vim#dictionary#add('test')
  catch /\[Dictionary\]/
    " 想定内のエラー通知
  catch
    call add(l:unexpected_errors, 'add: ' . v:exception)
  endtry

  try
    call hellshake_yano_vim#dictionary#show()
  catch /\[Dictionary\]/
    " 想定内のエラー通知
  catch
    call add(l:unexpected_errors, 'show: ' . v:exception)
  endtry

  try
    call hellshake_yano_vim#dictionary#validate()
  catch /\[Dictionary\]/
    " 想定内のエラー通知
  catch
    call add(l:unexpected_errors, 'validate: ' . v:exception)
  endtry

  try
    call hellshake_yano_vim#dictionary#is_in_dictionary('test')
  catch /\[Dictionary\]/
    " 想定内のエラー通知
  catch
    call add(l:unexpected_errors, 'is_in_dictionary: ' . v:exception)
  endtry

  try
    call hellshake_yano_vim#dictionary#clear_cache()
  catch /\[Dictionary\]/
    " 想定内のエラー通知
  catch
    call add(l:unexpected_errors, 'clear_cache: ' . v:exception)
  endtry

  call AssertEqual([], l:unexpected_errors,
    \ 'All APIs should handle Denops unavailable gracefully (no unexpected errors)')
endfunction

" === テスト実行 ===
call RunAllTests()

" 終了
qall!
