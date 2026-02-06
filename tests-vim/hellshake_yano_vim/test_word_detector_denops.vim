" test_word_detector_denops.vim - Denops統合テスト
" Phase 2.1 Process 2: VimScript Denopsラッパー (word_detector)
"
" TDD Red Phase: テスト先行で作成
" Mission: word-detector-integration-2026-02-06

let s:suite = themis#suite('word_detector_denops')
let s:assert = themis#helper('assert')

" テスト用のヘルパー関数
function! s:skip(msg) abort
  call themis#log('SKIP: ' . a:msg)
endfunction

" ========================================
" Test: has_denops() 関数の存在と動作
" ========================================
function! s:suite.test_has_denops_exists() abort
  " RED PHASE: has_denops() 関数が存在すること (WILL FAIL)
  call s:assert.true(exists('*hellshake_yano_vim#word_detector#has_denops'),
    \ 'has_denops() function should exist')
endfunction

function! s:suite.test_has_denops_returns_boolean() abort
  " RED PHASE: has_denops() はブール値を返すこと (WILL FAIL if function doesn't exist)
  if !exists('*hellshake_yano_vim#word_detector#has_denops')
    call s:skip('has_denops() not implemented yet')
    return
  endif

  let l:result = hellshake_yano_vim#word_detector#has_denops()
  call s:assert.true(type(l:result) == v:t_bool,
    \ 'has_denops() should return boolean, got: ' . type(l:result))
endfunction

" ========================================
" Test: detect_visible() の基本動作（フォールバック）
" ========================================
function! s:suite.test_detect_visible_fallback_basic() abort
  " 既存実装のフォールバックテスト (SHOULD PASS)
  " テスト用バッファを作成
  new
  call setline(1, ['hello world test', 'another line with words', 'short'])

  let l:words = hellshake_yano_vim#word_detector#detect_visible()
  call s:assert.true(type(l:words) == v:t_list,
    \ 'detect_visible() should return list')

  " 基本的な構造チェック
  if !empty(l:words)
    call s:assert.true(has_key(l:words[0], 'text'),
      \ 'Word dict should have text key')
    call s:assert.true(has_key(l:words[0], 'lnum'),
      \ 'Word dict should have lnum key')
    call s:assert.true(has_key(l:words[0], 'col'),
      \ 'Word dict should have col key')
  endif

  bdelete!
endfunction

function! s:suite.test_detect_visible_fallback_empty_buffer() abort
  " 空バッファのフォールバックテスト (SHOULD PASS)
  new
  let l:words = hellshake_yano_vim#word_detector#detect_visible()
  call s:assert.equals(l:words, [],
    \ 'detect_visible() should return empty list for empty buffer')
  bdelete!
endfunction

" ========================================
" Test: detect_visible() via Denops
" ========================================
function! s:suite.test_detect_visible_via_denops() abort
  " RED PHASE: Denops経由の検出テスト (WILL FAIL - wrapper not implemented)
  if !exists('*hellshake_yano_vim#word_detector#has_denops')
    call s:skip('has_denops() not implemented yet')
    return
  endif

  if !hellshake_yano_vim#word_detector#has_denops()
    call s:skip('Denops not available')
    return
  endif

  new
  call setline(1, ['test denops integration', 'multiple words here'])

  let l:words = hellshake_yano_vim#word_detector#detect_visible()
  call s:assert.true(type(l:words) == v:t_list,
    \ 'detect_visible() via Denops should return list')

  if !empty(l:words)
    call s:assert.true(has_key(l:words[0], 'text'),
      \ 'Word dict via Denops should have text key')
  endif

  bdelete!
endfunction

" ========================================
" Test: detect_multi_window() の基本動作（フォールバック）
" ========================================
function! s:suite.test_detect_multi_window_fallback_basic() abort
  " 既存実装のフォールバックテスト (SHOULD PASS)
  new
  call setline(1, ['window one content', 'more words'])
  let l:winid = win_getid()
  let l:bufnr = bufnr('%')
  let l:topline = line('w0')
  let l:botline = line('w$')

  let l:windows = [{
    \ 'winid': l:winid,
    \ 'bufnr': l:bufnr,
    \ 'topline': l:topline,
    \ 'botline': l:botline
  \ }]

  let l:words = hellshake_yano_vim#word_detector#detect_multi_window(l:windows)
  call s:assert.true(type(l:words) == v:t_list,
    \ 'detect_multi_window() should return list')

  if !empty(l:words)
    call s:assert.true(has_key(l:words[0], 'text'),
      \ 'Word dict should have text key')
    call s:assert.true(has_key(l:words[0], 'winid'),
      \ 'Word dict should have winid key')
    call s:assert.true(has_key(l:words[0], 'bufnr'),
      \ 'Word dict should have bufnr key')
  endif

  bdelete!
endfunction

" ========================================
" Test: detect_multi_window() via Denops
" ========================================
function! s:suite.test_detect_multi_window_via_denops() abort
  " RED PHASE: Denops経由の検出テスト (WILL FAIL - wrapper not implemented)
  if !exists('*hellshake_yano_vim#word_detector#has_denops')
    call s:skip('has_denops() not implemented yet')
    return
  endif

  if !hellshake_yano_vim#word_detector#has_denops()
    call s:skip('Denops not available')
    return
  endif

  new
  call setline(1, ['denops multi window test'])
  let l:winid = win_getid()
  let l:bufnr = bufnr('%')

  let l:windows = [{
    \ 'winid': l:winid,
    \ 'bufnr': l:bufnr,
    \ 'topline': 1,
    \ 'botline': 1
  \ }]

  let l:words = hellshake_yano_vim#word_detector#detect_multi_window(l:windows)
  call s:assert.true(type(l:words) == v:t_list,
    \ 'detect_multi_window() via Denops should return list')

  bdelete!
endfunction

" ========================================
" Test: get_min_length() の基本動作（フォールバック）
" ========================================
function! s:suite.test_get_min_length_fallback_default() abort
  " 既存実装のフォールバックテスト (SHOULD PASS)
  let l:min_length = hellshake_yano_vim#word_detector#get_min_length('w')
  call s:assert.true(type(l:min_length) == v:t_number,
    \ 'get_min_length() should return number')
  call s:assert.true(l:min_length > 0,
    \ 'get_min_length() should return positive number, got: ' . l:min_length)
endfunction

function! s:suite.test_get_min_length_fallback_different_keys() abort
  " 異なるキーでのフォールバックテスト (SHOULD PASS)
  let l:keys = ['w', 'b', 'e', 'h', 'j', 'k', 'l']

  for l:key in l:keys
    let l:min_length = hellshake_yano_vim#word_detector#get_min_length(l:key)
    call s:assert.true(type(l:min_length) == v:t_number,
      \ 'get_min_length(' . l:key . ') should return number')
    call s:assert.true(l:min_length > 0,
      \ 'get_min_length(' . l:key . ') should return positive number')
  endfor
endfunction

" ========================================
" Test: get_min_length() via Denops
" ========================================
function! s:suite.test_get_min_length_via_denops() abort
  " RED PHASE: Denops経由の取得テスト (WILL FAIL - wrapper not implemented)
  if !exists('*hellshake_yano_vim#word_detector#has_denops')
    call s:skip('has_denops() not implemented yet')
    return
  endif

  if !hellshake_yano_vim#word_detector#has_denops()
    call s:skip('Denops not available')
    return
  endif

  let l:min_length = hellshake_yano_vim#word_detector#get_min_length('w')
  call s:assert.true(type(l:min_length) == v:t_number,
    \ 'get_min_length() via Denops should return number')
  call s:assert.true(l:min_length > 0,
    \ 'get_min_length() via Denops should return positive number')
endfunction

" ========================================
" Test: エッジケース
" ========================================
function! s:suite.test_detect_visible_with_special_chars() abort
  " 特殊文字を含む行のテスト (SHOULD PASS)
  new
  call setline(1, ['test-word', 'under_score', 'dot.separated'])

  let l:words = hellshake_yano_vim#word_detector#detect_visible()
  call s:assert.true(type(l:words) == v:t_list,
    \ 'detect_visible() should handle special chars')

  bdelete!
endfunction

function! s:suite.test_detect_visible_with_long_lines() abort
  " 長い行のテスト (SHOULD PASS)
  new
  let l:long_line = repeat('word ', 100)
  call setline(1, [l:long_line])

  let l:words = hellshake_yano_vim#word_detector#detect_visible()
  call s:assert.true(type(l:words) == v:t_list,
    \ 'detect_visible() should handle long lines')

  bdelete!
endfunction
