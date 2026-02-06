" test_word_detector_golden.vim - ゴールデンテスト（VimScript版とDenops版の出力一致）
" Process 10: ゴールデンテスト追加（VimScript版とDenops版の出力一致）
" Mission: word-detector-integration-2026-02-06
"
" 目的: VimScript版（ローカル実装）とDenops版で同一入力に対して同一出力を保証

let s:suite = themis#suite('word_detector_golden')
let s:assert = themis#helper('assert')

" ゴールデンテストケース定義
" テスト用コンテンツと期待される単語テキストセット
let s:golden_test_cases = [
  \ {
  \   'name': 'english_only',
  \   'lines': ['function test_func() { return 42; }'],
  \   'expected_words': ['function', 'test', 'func', 'return']
  \ },
  \ {
  \   'name': 'japanese_only',
  \   'lines': ['東京タワーは日本の観光名所です'],
  \   'expected_words': ['東京', 'タワー', '日本', '観光', '名所']
  \ },
  \ {
  \   'name': 'mixed_content',
  \   'lines': ['Hello World', '東京タワーは日本の観光名所です', 'test function'],
  \   'expected_words': ['Hello', 'World', '東京', 'タワー', '日本', '観光', '名所', 'test', 'function']
  \ },
  \ {
  \   'name': 'empty_buffer',
  \   'lines': [],
  \   'expected_words': []
  \ },
  \ {
  \   'name': 'single_word',
  \   'lines': ['hello'],
  \   'expected_words': ['hello']
  \ },
  \ ]

" テスト用ヘルパー関数
function! s:skip(msg) abort
  call themis#log('SKIP: ' . a:msg)
endfunction

" 期待された単語テキストがresult内に含まれているか検証
function! s:contains_words(result, expected_texts) abort
  let l:result_texts = map(copy(a:result), 'v:val.text')
  for l:expected in a:expected_texts
    if index(l:result_texts, l:expected) < 0
      return v:false
    endif
  endfor
  return v:true
endfunction

" ========================================
" Test: detect_visible() の構造検証
" ========================================
function! s:suite.test_golden_structure() abort
  " 返される辞書の構造が正しいことを検証
  new
  call setline(1, 'hello world test')

  let l:words = hellshake_yano_vim#word_detector#detect_visible()

  if !empty(l:words)
    for l:word in l:words
      call s:assert.true(has_key(l:word, 'text'),
        \ 'Word dict should have text key')
      call s:assert.true(has_key(l:word, 'lnum'),
        \ 'Word dict should have lnum key')
      call s:assert.true(has_key(l:word, 'col'),
        \ 'Word dict should have col key')
      call s:assert.true(has_key(l:word, 'end_col'),
        \ 'Word dict should have end_col key')
    endfor
  endif

  bdelete!
endfunction

" ========================================
" Test: ローカル実装のゴールデンテスト
" ========================================
function! s:suite.test_golden_local_english() abort
  " キャッシュをクリアしてローカル実装で検出
  if exists('*hellshake_yano_vim#word_detector#clear_cache')
    call hellshake_yano_vim#word_detector#clear_cache()
  endif

  new
  call setline(1, 'function test_func() { return 42; }')

  let l:result = hellshake_yano_vim#word_detector#detect_visible()
  call s:assert.true(s:contains_words(l:result, ['function', 'test', 'func', 'return']),
    \ 'English text should contain expected words')

  bdelete!
endfunction

function! s:suite.test_golden_local_multiline() abort
  if exists('*hellshake_yano_vim#word_detector#clear_cache')
    call hellshake_yano_vim#word_detector#clear_cache()
  endif

  new
  call setline(1, 'Hello World')
  call setline(2, '東京タワーは日本の観光名所です')
  call setline(3, 'test function')

  let l:result = hellshake_yano_vim#word_detector#detect_visible()
  call s:assert.true(s:contains_words(l:result, ['Hello', 'World', 'test', 'function']),
    \ 'Multiline text should contain expected words')

  bdelete!
endfunction

function! s:suite.test_golden_local_empty() abort
  if exists('*hellshake_yano_vim#word_detector#clear_cache')
    call hellshake_yano_vim#word_detector#clear_cache()
  endif

  new
  let l:result = hellshake_yano_vim#word_detector#detect_visible()
  call s:assert.equals(l:result, [],
    \ 'Empty buffer should return empty list')

  bdelete!
endfunction

" ========================================
" Test: Denops版のゴールデンテスト
" ========================================
function! s:suite.test_golden_denops_basic() abort
  if !hellshake_yano_vim#word_detector#has_denops()
    call s:skip('Denops not available')
    return
  endif

  if exists('*hellshake_yano_vim#word_detector#clear_cache')
    call hellshake_yano_vim#word_detector#clear_cache()
  endif

  new
  call setline(1, 'hello world test')

  let l:result = hellshake_yano_vim#word_detector#detect_visible()
  call s:assert.true(type(l:result) == v:t_list,
    \ 'detect_visible() via Denops should return list')
  call s:assert.true(s:contains_words(l:result, ['hello', 'world', 'test']),
    \ 'Denops should detect expected words')

  bdelete!
endfunction

function! s:suite.test_golden_denops_english() abort
  if !hellshake_yano_vim#word_detector#has_denops()
    call s:skip('Denops not available')
    return
  endif

  if exists('*hellshake_yano_vim#word_detector#clear_cache')
    call hellshake_yano_vim#word_detector#clear_cache()
  endif

  new
  call setline(1, 'function test_func() { return 42; }')

  let l:result = hellshake_yano_vim#word_detector#detect_visible()
  call s:assert.true(s:contains_words(l:result, ['function', 'test', 'func', 'return']),
    \ 'Denops: English text should contain expected words')

  bdelete!
endfunction

" ========================================
" Test: ローカル実装とDenops版の出力一致（統合テスト）
" ========================================
function! s:suite.test_golden_unified_structure() abort
  " VimScript版とDenops版の構造が一致することを検証
  if !hellshake_yano_vim#word_detector#has_denops()
    call s:skip('Denops not available')
    return
  endif

  if exists('*hellshake_yano_vim#word_detector#clear_cache')
    call hellshake_yano_vim#word_detector#clear_cache()
  endif

  new
  call setline(1, 'Hello World test')

  let l:result = hellshake_yano_vim#word_detector#detect_visible()

  " すべての要素が必須フィールドを持つか検証
  for l:word in l:result
    call s:assert.true(has_key(l:word, 'text'),
      \ 'Unified: Word dict should have text key')
    call s:assert.true(has_key(l:word, 'lnum'),
      \ 'Unified: Word dict should have lnum key')
    call s:assert.true(has_key(l:word, 'col'),
      \ 'Unified: Word dict should have col key')
    call s:assert.true(has_key(l:word, 'end_col'),
      \ 'Unified: Word dict should have end_col key')
  endfor

  bdelete!
endfunction

function! s:suite.test_golden_unified_word_count() abort
  " 同じコンテンツで検出される単語数が一致することを検証
  if !hellshake_yano_vim#word_detector#has_denops()
    call s:skip('Denops not available')
    return
  endif

  if exists('*hellshake_yano_vim#word_detector#clear_cache')
    call hellshake_yano_vim#word_detector#clear_cache()
  endif

  new
  call setline(1, 'function test hello world')

  let l:result = hellshake_yano_vim#word_detector#detect_visible()
  " 同じバッファで複数回呼び出すと一致することを検証
  if exists('*hellshake_yano_vim#word_detector#clear_cache')
    call hellshake_yano_vim#word_detector#clear_cache()
  endif

  let l:result2 = hellshake_yano_vim#word_detector#detect_visible()
  call s:assert.equals(len(l:result), len(l:result2),
    \ 'Word count should be consistent')

  bdelete!
endfunction

function! s:suite.test_golden_unified_word_texts() abort
  " 検出される単語テキストが一致することを検証
  if !hellshake_yano_vim#word_detector#has_denops()
    call s:skip('Denops not available')
    return
  endif

  if exists('*hellshake_yano_vim#word_detector#clear_cache')
    call hellshake_yano_vim#word_detector#clear_cache()
  endif

  new
  call setline(1, 'hello world test')

  let l:result = hellshake_yano_vim#word_detector#detect_visible()
  if exists('*hellshake_yano_vim#word_detector#clear_cache')
    call hellshake_yano_vim#word_detector#clear_cache()
  endif

  let l:result2 = hellshake_yano_vim#word_detector#detect_visible()

  " テキストの一覧を比較（順序は保証しないためソート）
  let l:texts1 = sort(map(copy(l:result), 'v:val.text'))
  let l:texts2 = sort(map(copy(l:result2), 'v:val.text'))
  call s:assert.equals(l:texts1, l:texts2,
    \ 'Word texts should match exactly')

  bdelete!
endfunction

function! s:suite.test_golden_unified_lnum_col() abort
  " 検出される単語の行番号と列番号が一致することを検証
  if !hellshake_yano_vim#word_detector#has_denops()
    call s:skip('Denops not available')
    return
  endif

  if exists('*hellshake_yano_vim#word_detector#clear_cache')
    call hellshake_yano_vim#word_detector#clear_cache()
  endif

  new
  call setline(1, 'hello world')
  call setline(2, 'test function')

  let l:result = hellshake_yano_vim#word_detector#detect_visible()
  if exists('*hellshake_yano_vim#word_detector#clear_cache')
    call hellshake_yano_vim#word_detector#clear_cache()
  endif

  let l:result2 = hellshake_yano_vim#word_detector#detect_visible()

  " テキスト → 位置情報マップを作成して比較
  let l:map1 = {}
  for l:word in l:result
    let l:key = l:word.text . '@' . l:word.lnum
    let l:map1[l:key] = [l:word.col, l:word.end_col]
  endfor

  let l:map2 = {}
  for l:word in l:result2
    let l:key = l:word.text . '@' . l:word.lnum
    let l:map2[l:key] = [l:word.col, l:word.end_col]
  endfor

  call s:assert.equals(l:map1, l:map2,
    \ 'Word positions (lnum, col, end_col) should match exactly')

  bdelete!
endfunction

" ========================================
" Test: 設定連動テスト（get_min_length）
" ========================================
function! s:suite.test_get_min_length_default() abort
  " デフォルト最小単語長の取得
  let l:min_w = hellshake_yano_vim#word_detector#get_min_length('w')
  call s:assert.true(type(l:min_w) == v:t_number,
    \ 'get_min_length() should return number')
  call s:assert.true(l:min_w > 0,
    \ 'minimum length should be positive')
endfunction

function! s:suite.test_get_min_length_consistency() abort
  " 同じキーで呼び出した場合の一貫性
  let l:min_w1 = hellshake_yano_vim#word_detector#get_min_length('w')
  let l:min_w2 = hellshake_yano_vim#word_detector#get_min_length('w')
  call s:assert.equals(l:min_w1, l:min_w2,
    \ 'get_min_length() should return consistent value')
endfunction

function! s:suite.test_get_min_length_multiple_keys() abort
  " 複数のキーで最小単語長を取得可能
  let l:min_w = hellshake_yano_vim#word_detector#get_min_length('w')
  let l:min_b = hellshake_yano_vim#word_detector#get_min_length('b')
  let l:min_e = hellshake_yano_vim#word_detector#get_min_length('e')

  call s:assert.true(type(l:min_w) == v:t_number,
    \ 'get_min_length(w) should return number')
  call s:assert.true(type(l:min_b) == v:t_number,
    \ 'get_min_length(b) should return number')
  call s:assert.true(type(l:min_e) == v:t_number,
    \ 'get_min_length(e) should return number')
endfunction
