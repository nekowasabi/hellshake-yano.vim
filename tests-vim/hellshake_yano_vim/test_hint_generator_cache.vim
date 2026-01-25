" test_hint_generator_cache.vim - キャッシュ機構テスト
" Phase 1.3 Process 3: キャッシュ機構実装
"
" TDD Red Phase: テスト先行で作成

let s:suite = themis#suite('hint_generator_cache')
let s:assert = themis#helper('assert')

" ========================================
" Test: clear_cache() 関数の存在と動作
" ========================================
function! s:suite.test_clear_cache_exists() abort
  " clear_cache() 関数が存在すること
  call s:assert.true(exists('*hellshake_yano_vim#hint_generator#clear_cache'),
    \ 'clear_cache() function should exist')
endfunction

function! s:suite.test_clear_cache_works() abort
  " キャッシュクリア後も正常に動作すること
  let l:hints1 = hellshake_yano_vim#hint_generator#generate(5)
  call hellshake_yano_vim#hint_generator#clear_cache()
  let l:hints2 = hellshake_yano_vim#hint_generator#generate(5)
  call s:assert.equals(l:hints1, l:hints2,
    \ 'Results should be same after cache clear')
endfunction

" ========================================
" Test: キャッシュヒット時の動作
" ========================================
function! s:suite.test_cache_hit_returns_same_result() abort
  " キャッシュクリアして初期状態に
  if exists('*hellshake_yano_vim#hint_generator#clear_cache')
    call hellshake_yano_vim#hint_generator#clear_cache()
  endif

  " 1回目: キャッシュミス
  let l:hints1 = hellshake_yano_vim#hint_generator#generate(10)

  " 2回目: キャッシュヒット（同一結果）
  let l:hints2 = hellshake_yano_vim#hint_generator#generate(10)

  call s:assert.equals(l:hints1, l:hints2,
    \ 'Cache hit should return same result')
endfunction

function! s:suite.test_different_count_different_cache() abort
  " 異なるcountは異なるキャッシュエントリ
  if exists('*hellshake_yano_vim#hint_generator#clear_cache')
    call hellshake_yano_vim#hint_generator#clear_cache()
  endif

  let l:hints5 = hellshake_yano_vim#hint_generator#generate(5)
  let l:hints7 = hellshake_yano_vim#hint_generator#generate(7)

  call s:assert.equals(len(l:hints5), 5)
  call s:assert.equals(len(l:hints7), 7)
  call s:assert.not_equals(l:hints5, l:hints7,
    \ 'Different counts should have different results')
endfunction

" ========================================
" Test: キャッシュは結果のコピーを返す
" ========================================
function! s:suite.test_cache_returns_copy() abort
  " キャッシュは結果のコピーを返すこと（元配列の変更を防ぐ）
  if exists('*hellshake_yano_vim#hint_generator#clear_cache')
    call hellshake_yano_vim#hint_generator#clear_cache()
  endif

  let l:hints1 = hellshake_yano_vim#hint_generator#generate(3)
  " 取得した配列を変更
  call add(l:hints1, 'modified')

  let l:hints2 = hellshake_yano_vim#hint_generator#generate(3)

  " 変更は反映されていないこと
  call s:assert.equals(len(l:hints2), 3,
    \ 'Cache should return copy, not reference')
endfunction
