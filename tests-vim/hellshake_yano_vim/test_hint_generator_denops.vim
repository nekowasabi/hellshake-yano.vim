" test_hint_generator_denops.vim - Denops統合テスト
" Phase 1.3 Process 2: VimScript Denopsラッパー
"
" TDD Red Phase: テスト先行で作成

let s:suite = themis#suite('hint_generator_denops')
let s:assert = themis#helper('assert')

" テスト用のヘルパー関数
function! s:skip(msg) abort
  call themis#log('SKIP: ' . a:msg)
endfunction

" ========================================
" Test: has_denops() 関数の存在と動作
" ========================================
function! s:suite.test_has_denops_exists() abort
  " has_denops() 関数が存在すること
  call s:assert.true(exists('*hellshake_yano_vim#hint_generator#has_denops'),
    \ 'has_denops() function should exist')
endfunction

function! s:suite.test_has_denops_returns_boolean() abort
  " has_denops() はブール値を返すこと
  let l:result = hellshake_yano_vim#hint_generator#has_denops()
  call s:assert.true(type(l:result) == v:t_bool,
    \ 'has_denops() should return boolean, got: ' . type(l:result))
endfunction

" ========================================
" Test: generate() の基本動作（フォールバック）
" ========================================
function! s:suite.test_generate_basic_count_5() abort
  " Denops未起動時はローカル実装にフォールバック
  let l:hints = hellshake_yano_vim#hint_generator#generate(5)
  call s:assert.equals(len(l:hints), 5, 'generate(5) should return 5 hints')
  call s:assert.equals(l:hints[0], 'a', 'First hint should be "a"')
endfunction

function! s:suite.test_generate_basic_count_7() abort
  " 単一文字ヒントのみ（7文字）
  let l:hints = hellshake_yano_vim#hint_generator#generate(7)
  call s:assert.equals(len(l:hints), 7, 'generate(7) should return 7 hints')
  call s:assert.equals(l:hints, ['a', 's', 'd', 'f', 'g', 'n', 'm'],
    \ 'Should return all single char keys')
endfunction

function! s:suite.test_generate_with_multi_char() abort
  " 単一文字 + 複数文字ヒント
  let l:hints = hellshake_yano_vim#hint_generator#generate(10)
  call s:assert.equals(len(l:hints), 10, 'generate(10) should return 10 hints')
  " 8番目以降は複数文字ヒント
  call s:assert.equals(l:hints[7], 'bb', 'Hint 8 should be "bb"')
  call s:assert.equals(l:hints[8], 'bc', 'Hint 9 should be "bc"')
  call s:assert.equals(l:hints[9], 'be', 'Hint 10 should be "be"')
endfunction

" ========================================
" Test: Denops経由の生成（Denops起動時のみ）
" ========================================
function! s:suite.test_generate_via_denops() abort
  " Denopsが利用可能な場合のテスト
  if !hellshake_yano_vim#hint_generator#has_denops()
    call s:skip('Denops not available')
    return
  endif

  let l:hints = hellshake_yano_vim#hint_generator#generate(5)
  call s:assert.equals(len(l:hints), 5, 'generate(5) via Denops should return 5 hints')
  call s:assert.equals(l:hints[0], 'a', 'First hint should be "a"')
endfunction

" ========================================
" Test: エッジケース
" ========================================
function! s:suite.test_generate_count_0() abort
  let l:hints = hellshake_yano_vim#hint_generator#generate(0)
  call s:assert.equals(l:hints, [], 'generate(0) should return empty array')
endfunction

function! s:suite.test_generate_count_negative() abort
  let l:hints = hellshake_yano_vim#hint_generator#generate(-5)
  call s:assert.equals(l:hints, [], 'generate(-5) should return empty array')
endfunction

function! s:suite.test_generate_count_1() abort
  let l:hints = hellshake_yano_vim#hint_generator#generate(1)
  call s:assert.equals(len(l:hints), 1, 'generate(1) should return 1 hint')
  call s:assert.equals(l:hints, ['a'], 'Should return ["a"]')
endfunction
