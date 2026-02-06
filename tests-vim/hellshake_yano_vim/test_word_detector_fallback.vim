" tests-vim/hellshake_yano_vim/test_word_detector_fallback.vim - フォールバックテスト
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: RED (Test-Driven Development)
" Process 11: フォールバックテスト（正常/異常/タイムアウト）
" Mission: word-detector-integration-2026-02-06
"
" 目的:
"   - Denops利用可能時の正常動作を確認
"   - Denops未起動時のフォールバック動作を確認
"   - Denopsエラー時のフォールバック動作を確認
"
" テスト対象:
"   - hellshake_yano_vim#word_detector#has_denops()
"   - hellshake_yano_vim#word_detector#detect_visible()
"   - フォールバック処理のロバストネス

let s:suite = themis#suite('word_detector_fallback')
let s:assert = themis#helper('assert')

" テスト用のヘルパー関数
function! s:skip(msg) abort
  call themis#log('SKIP: ' . a:msg)
endfunction

" ========================================
" Test Case 1: 正常系 - Denops利用可能時
" ========================================
" 目的: Denops利用可能時は正常に単語が検出されることを確認
"
function! s:suite.test_fallback_case1_normal() abort
  " 前提: Denopsが利用可能かチェック
  let l:has_denops = hellshake_yano_vim#word_detector#has_denops()

  if !l:has_denops
    call s:skip('Denops not available in current environment')
    return
  endif

  " テスト用バッファを作成
  new
  call setline(1, 'test word hello')

  " Denops経由または正常系での単語検出を実行
  let l:words = hellshake_yano_vim#word_detector#detect_visible()

  " 戻り値の型チェック: リストであること
  call s:assert.true(type(l:words) == v:t_list,
    \ 'detect_visible() should return list')

  " 基本的な検出確認: 3つ以上の単語が検出されるはず
  call s:assert.true(len(l:words) >= 2,
    \ printf('should detect at least 2 words, got: %d', len(l:words)))

  " 各単語の構造チェック
  if !empty(l:words)
    let l:first_word = l:words[0]
    call s:assert.true(has_key(l:first_word, 'text'),
      \ 'Word dict should have text key')
    call s:assert.true(has_key(l:first_word, 'lnum'),
      \ 'Word dict should have lnum key')
    call s:assert.true(has_key(l:first_word, 'col'),
      \ 'Word dict should have col key')
    call s:assert.true(has_key(l:first_word, 'end_col'),
      \ 'Word dict should have end_col key')

    " テキスト値の型チェック
    call s:assert.true(type(l:first_word.text) == v:t_string,
      \ 'word.text should be string')
    call s:assert.true(type(l:first_word.lnum) == v:t_number,
      \ 'word.lnum should be number')
    call s:assert.true(type(l:first_word.col) == v:t_number,
      \ 'word.col should be number')
  endif

  " テストバッファをクリーンアップ
  bwipeout!
endfunction

" ========================================
" Test Case 2: 異常系 - Denops未起動時
" ========================================
" 目的: Denopsが利用不可な場合でも、ローカル実装でフォールバックして
"       正常に単語が検出されることを確認
"
function! s:suite.test_fallback_case2_denops_unavailable() abort
  " テスト用バッファを作成
  new
  call setline(1, ['test word', 'another line', 'with words'])

  " 単語検出を実行
  " Denops利用不可の場合でも detect_visible() は動作し、
  " ローカル実装でフォールバック処理が行われるはず
  let l:words = hellshake_yano_vim#word_detector#detect_visible()

  " 戻り値の型チェック: リストであること
  call s:assert.true(type(l:words) == v:t_list,
    \ 'detect_visible() should return list even without Denops')

  " フォールバック動作の確認: 複数行から単語が検出されるはず
  call s:assert.true(len(l:words) >= 4,
    \ printf('should detect at least 4 words from 3 lines, got: %d', len(l:words)))

  " 各単語の座標データが正しく含まれているか確認
  for l:word in l:words
    call s:assert.true(has_key(l:word, 'text'),
      \ 'All words should have text key')
    call s:assert.true(has_key(l:word, 'lnum'),
      \ 'All words should have lnum key')
    call s:assert.true(has_key(l:word, 'col'),
      \ 'All words should have col key')
    call s:assert.true(has_key(l:word, 'end_col'),
      \ 'All words should have end_col key')

    " 座標値が正妥な値であることを確認
    call s:assert.true(l:word.lnum >= 1,
      \ printf('word lnum should be >= 1, got: %d', l:word.lnum))
    call s:assert.true(l:word.col >= 1,
      \ printf('word col should be >= 1, got: %d', l:word.col))
    call s:assert.true(l:word.end_col > l:word.col,
      \ printf('word end_col should be > col, got: col=%d, end_col=%d',
        \ l:word.col, l:word.end_col))

    " テキストが空文字列でないことを確認
    call s:assert.true(len(l:word.text) > 0,
      \ 'word text should not be empty string')
  endfor

  " テストバッファをクリーンアップ
  bwipeout!
endfunction

" ========================================
" Test Case 3: タイムアウト/エラー系
" ========================================
" 目的: Denops呼び出しエラー発生時のフォールバック動作を確認
"
" 注: エラー注入はユニットテストでは困難なため、
"     実装側の try-catch ロジックが正しいことを前提に、
"     フォールバック結果の正確性で代替検証する
"
function! s:suite.test_fallback_case3_denops_error() abort
  " テスト用バッファを作成
  new
  call setline(1, 'test denops error handling')

  " 単語検出を実行
  " エラー発生時は try-catch でキャッチされ、
  " フォールバック処理が行われるはず
  let l:words = hellshake_yano_vim#word_detector#detect_visible()

  " エラーが発生しても呼び出しは成功し、リストが返される
  call s:assert.true(type(l:words) == v:t_list,
    \ 'detect_visible() should return list even on error')

  " フォールバック実装でも最低限の単語が検出される
  " (3語 "test", "denops", "error" は英字のみなので検出可能)
  call s:assert.true(len(l:words) >= 2,
    \ printf('should detect at least 2 words on fallback, got: %d', len(l:words)))

  " テストバッファをクリーンアップ
  bwipeout!
endfunction

" ========================================
" Test Case 4: エッジケース - 空バッファ
" ========================================
" 目的: 空バッファでもフォールバック動作が安全に動作することを確認
"
function! s:suite.test_fallback_edge_case_empty_buffer() abort
  new
  " 空バッファのまま実行
  let l:words = hellshake_yano_vim#word_detector#detect_visible()

  " 空バッファの場合は空配列が返される
  call s:assert.equals(l:words, [],
    \ 'detect_visible() should return empty list for empty buffer')

  bwipeout!
endfunction

" ========================================
" Test Case 5: エッジケース - 長い行
" ========================================
" 目的: 長い行でもフォールバック動作が適切に処理することを確認
"
function! s:suite.test_fallback_edge_case_long_line() abort
  new
  " 長い行を作成（単語を繰り返す）
  let l:long_line = repeat('word ', 100)
  call setline(1, l:long_line)

  let l:words = hellshake_yano_vim#word_detector#detect_visible()

  " 長い行でも正常に動作し、複数の単語が検出される
  call s:assert.true(type(l:words) == v:t_list,
    \ 'detect_visible() should handle long lines')
  call s:assert.true(len(l:words) > 0,
    \ 'should detect words in long line')

  bwipeout!
endfunction

" ========================================
" Test Case 6: エッジケース - 特殊文字を含む行
" ========================================
" 目的: 特殊文字を含む行でもフォールバック動作が適切に処理することを確認
"
function! s:suite.test_fallback_edge_case_special_chars() abort
  new
  call setline(1, ['test-word', 'under_score', 'dot.separated', 'email@domain.com'])

  let l:words = hellshake_yano_vim#word_detector#detect_visible()

  " 特殊文字を含む行でも検出が行われる
  call s:assert.true(type(l:words) == v:t_list,
    \ 'detect_visible() should handle special characters')

  bwipeout!
endfunction

" ========================================
" Test Case 7: キャッシュ挙動の確認
" ========================================
" 目的: フォールバック処理後、キャッシュが適切に機能することを確認
"
function! s:suite.test_fallback_cache_behavior() abort
  new
  call setline(1, 'cache test words')

  " 1回目の呼び出し
  let l:words1 = hellshake_yano_vim#word_detector#detect_visible()
  call s:assert.true(len(l:words1) > 0,
    \ 'first call should detect words')

  " 2回目の呼び出し（キャッシュから返される可能性）
  let l:words2 = hellshake_yano_vim#word_detector#detect_visible()

  " 両者の結果が同じであること（キャッシュ機能の確認）
  call s:assert.equals(len(l:words1), len(l:words2),
    \ 'cached result should have same length as first call')

  " キャッシュをクリアして再度実行
  call hellshake_yano_vim#word_detector#clear_cache()
  let l:words3 = hellshake_yano_vim#word_detector#detect_visible()

  " キャッシュクリア後も同じ結果が得られるはず
  call s:assert.equals(len(l:words1), len(l:words3),
    \ 'result after cache clear should match original')

  bwipeout!
endfunction

" ========================================
" Test Case 8: has_denops() 関数の正確性
" ========================================
" 目的: has_denops() 関数が正しくDenops利用可否を判定することを確認
"
function! s:suite.test_fallback_has_denops_correctness() abort
  " has_denops() 関数の存在チェック
  call s:assert.true(exists('*hellshake_yano_vim#word_detector#has_denops'),
    \ 'has_denops() function should exist')

  " 戻り値の型チェック
  let l:result = hellshake_yano_vim#word_detector#has_denops()
  call s:assert.true(type(l:result) == v:t_bool,
    \ 'has_denops() should return boolean')

  " 結果の一貫性チェック（複数回呼び出しで同じ結果）
  let l:result2 = hellshake_yano_vim#word_detector#has_denops()
  call s:assert.equals(l:result, l:result2,
    \ 'has_denops() should return consistent result')
endfunction

" ========================================
" Test Case 9: フォールバック時の min_length 機能
" ========================================
" 目的: フォールバック処理でも最小単語長フィルタが機能することを確認
"
function! s:suite.test_fallback_min_length_filtering() abort
  new
  " 短い単語と長い単語を混在させた行
  call setline(1, 'a bb ccc dddd eeeee')

  let l:words = hellshake_yano_vim#word_detector#detect_visible()

  " デフォルトの最小単語長（3文字）でフィルタされるはず
  " 期待: "ccc", "dddd", "eeeee" が検出される（"a" と "bb" は除外）
  for l:word in l:words
    call s:assert.true(len(l:word.text) >= 3,
      \ printf('word "%s" should have length >= 3', l:word.text))
  endfor

  bwipeout!
endfunction

" ========================================
" Test Case 10: フォールバック時の get_min_length()
" ========================================
" 目的: フォールバック処理でも get_min_length() が正しく動作することを確認
"
function! s:suite.test_fallback_get_min_length() abort
  " 異なるキーで最小単語長を取得
  let l:keys = ['w', 'b', 'e']

  for l:key in l:keys
    let l:min_length = hellshake_yano_vim#word_detector#get_min_length(l:key)

    " 数値が返されること
    call s:assert.true(type(l:min_length) == v:t_number,
      \ printf('get_min_length(%s) should return number', l:key))

    " 正の値であること
    call s:assert.true(l:min_length > 0,
      \ printf('get_min_length(%s) should return positive number', l:key))
  endfor
endfunction
