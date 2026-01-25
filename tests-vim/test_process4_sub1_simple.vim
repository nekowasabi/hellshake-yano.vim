" tests-vim/test_process4_sub1_simple.vim
" Phase D-7 Process4 Sub1: Denops Dictionary Wrapper 簡易テスト
"
" テスト実行方法:
"   vim -u NONE -N -S tests-vim/test_process4_sub1_simple.vim
"
" 注意: Denops未起動環境でも実行可能なテストのみ

" === セットアップ ===
set nocompatible
set nomore
filetype plugin on

" ランタイムパス設定
let s:plugin_root = expand('<sfile>:p:h:h')
execute 'set runtimepath+=' . s:plugin_root

" テストランナー読み込み（セルフテスト関数を削除するためdelfunction）
source <sfile>:p:h/hellshake_yano_vim/test_runner.vim

" テストランナーのセルフテスト関数を削除（本テストに含めない）
silent! delfunction Test_AssertEqual_success
silent! delfunction Test_AssertTrue_success
silent! delfunction Test_AssertFalse_success
silent! delfunction Test_AssertEqual_failure
silent! delfunction Test_AssertTrue_failure
silent! delfunction Test_AssertFalse_failure

" テスト対象の dictionary.vim を明示的に読み込み
" autoload関数はVimのコマンドラインからは自動読み込みされないため
runtime autoload/hellshake_yano_vim/dictionary.vim

" === Test Group 1: 関数存在チェック ===

function! Test_has_denops_function_exists() abort
  call AssertTrue(exists('*hellshake_yano_vim#dictionary#has_denops'),
    \ 'has_denops function should exist')
endfunction

function! Test_reload_function_exists() abort
  call AssertTrue(exists('*hellshake_yano_vim#dictionary#reload'),
    \ 'reload function should exist')
endfunction

function! Test_add_function_exists() abort
  call AssertTrue(exists('*hellshake_yano_vim#dictionary#add'),
    \ 'add function should exist')
endfunction

function! Test_show_function_exists() abort
  call AssertTrue(exists('*hellshake_yano_vim#dictionary#show'),
    \ 'show function should exist')
endfunction

function! Test_validate_function_exists() abort
  call AssertTrue(exists('*hellshake_yano_vim#dictionary#validate'),
    \ 'validate function should exist')
endfunction

function! Test_is_in_dictionary_function_exists() abort
  call AssertTrue(exists('*hellshake_yano_vim#dictionary#is_in_dictionary'),
    \ 'is_in_dictionary function should exist')
endfunction

" === テスト実行 ===
call RunAllTests()

" 終了
qall!
