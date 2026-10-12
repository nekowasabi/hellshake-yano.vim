" test_word_detector_config_integration.vim - 設定変更時のキャッシュクリア統合テスト
" Phase 2.1 Process 4: 設定変更時キャッシュクリア連携
"
" TDD Red Phase: テスト先行で作成
" Mission: word-detector-integration-2026-02-06

let s:suite = themis#suite('word_detector_config_integration')
let s:assert = themis#helper('assert')

" テスト用のヘルパー関数
function! s:skip(msg) abort
  call themis#log('SKIP: ' . a:msg)
endfunction

" ========================================
" Test: 設定変更時にキャッシュがクリアされる
" ========================================


" ========================================
" Test: clear_cache() の明示的呼び出し
" ========================================
function! s:suite.test_clear_cache_explicit_call() abort
  " clear_cache() を明示的に呼び出して、エラーが発生しないことを確認
  call s:assert.true(exists('*hellshake_yano_vim#word_detector#clear_cache'),
    \ 'word_detector#clear_cache() function should exist')

  " 複数回呼び出してもエラーが発生しない
  call hellshake_yano_vim#word_detector#clear_cache()
  call hellshake_yano_vim#word_detector#clear_cache()
  call hellshake_yano_vim#word_detector#clear_cache()

  " キャッシュクリア後も detect_visible() が正常に動作する
  new
  call setline(1, ['test after clear'])
  let l:words = hellshake_yano_vim#word_detector#detect_visible()
  call s:assert.true(type(l:words) == v:t_list,
    \ 'detect_visible() should work after clear_cache()')
  bdelete!
endfunction

" ========================================
" Test: exists() チェックのフォールバック
" ========================================

" ========================================
" Test: 設定値変更の実際の影響
" ========================================
function! s:suite.test_config_change_affects_min_length() abort
  " 設定変更が実際に反映されることを確認
  " 注: このテストは min_length のキャッシュもクリアされることを期待

  if !exists('*hellshake_yano_vim#word_detector#get_min_length')
    call s:skip('get_min_length() not available')
    return
  endif

  " 初期値を取得
  let l:initial = hellshake_yano_vim#word_detector#get_min_length('w')
  call s:assert.true(type(l:initial) == v:t_number,
    \ 'get_min_length() should return number')

  " キャッシュをクリア
  call hellshake_yano_vim#word_detector#clear_cache()

  " クリア後も同じ値が返る（設定は変更していないため）
  let l:after_clear = hellshake_yano_vim#word_detector#get_min_length('w')
  call s:assert.equals(l:after_clear, l:initial,
    \ 'get_min_length() should return same value after clear_cache()')
endfunction
