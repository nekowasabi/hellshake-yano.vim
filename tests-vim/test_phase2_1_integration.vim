" test_phase2_1_integration.vim - Phase 2.1 E2E統合テスト
" Vim/Neovim両環境での単語検出統合を検証
"
" Mission: word-detector-integration-2026-02-06
" Process 50: E2E統合テスト

" テスト用のヘルパー関数
function! s:assert_true(condition, ...) abort
  if !a:condition
    let l:msg = a:0 > 0 ? a:1 : 'Assertion failed'
    throw 'AssertionError: ' . l:msg
  endif
endfunction

function! s:skip(msg) abort
  echohl WarningMsg
  echo 'SKIP: ' . a:msg
  echohl None
endfunction

" ========================================
" Test 1: 基本的な単語検出（E2E）
" ========================================
function! s:test_e2e_word_detection() abort
  echo 'Running: test_e2e_word_detection'

  " テストバッファ作成
  new
  call setline(1, 'function test_func() { return 42; }')
  call setline(2, '東京タワーは日本の観光名所です')
  call setline(3, 'Hello World')

  " 単語検出（内部API）
  let l:words = hellshake_yano_vim#word_detector#detect_visible()

  " 検証
  call s:assert_true(type(l:words) == v:t_list, 'detect_visible() should return list')
  call s:assert_true(len(l:words) > 0, 'Should detect at least some words')

  " 英語単語が含まれるか
  let l:found_function = 0
  for l:word in l:words
    if l:word.text ==# 'function'
      let l:found_function = 1
      break
    endif
  endfor
  call s:assert_true(l:found_function, 'Expected "function" in detected words')

  " クリーンアップ
  bwipeout!

  echo '  PASS: test_e2e_word_detection'
endfunction

" ========================================
" Test 2: Denops統合確認（E2E）
" ========================================
function! s:test_e2e_denops_integration() abort
  echo 'Running: test_e2e_denops_integration'

  if !exists('*hellshake_yano_vim#word_detector#has_denops')
    call s:skip('has_denops() not available')
    return
  endif

  if !hellshake_yano_vim#word_detector#has_denops()
    call s:skip('Denops not available')
    return
  endif

  " Denops経由で単語検出が行われることを確認
  new
  call setline(1, 'test word detection denops')
  call hellshake_yano_vim#word_detector#clear_cache()
  let l:words = hellshake_yano_vim#word_detector#detect_visible()

  " TypeScript版の出力形式を確認
  call s:assert_true(type(l:words) == v:t_list, 'detect_visible() should return list')

  if !empty(l:words)
    call s:assert_true(has_key(l:words[0], 'text'), 'Word dict should have text key')
    call s:assert_true(has_key(l:words[0], 'lnum'), 'Word dict should have lnum key')
    call s:assert_true(has_key(l:words[0], 'col'), 'Word dict should have col key')
  endif

  bwipeout!

  echo '  PASS: test_e2e_denops_integration'
endfunction

" ========================================
" Test 3: マルチウィンドウ統合（E2E）
" ========================================
function! s:test_e2e_multi_window() abort
  echo 'Running: test_e2e_multi_window'

  " マルチウィンドウモードでの統合テスト
  new
  call setline(1, 'window1 test content')
  let l:winid1 = win_getid()
  let l:bufnr1 = bufnr('%')

  vsplit
  call setline(1, 'window2 test content')
  let l:winid2 = win_getid()
  let l:bufnr2 = bufnr('%')

  " マルチウィンドウ単語検出
  let l:windows = [
    \ {'winid': l:winid1, 'bufnr': l:bufnr1, 'topline': 1, 'botline': 1},
    \ {'winid': l:winid2, 'bufnr': l:bufnr2, 'topline': 1, 'botline': 1}
    \ ]
  let l:words = hellshake_yano_vim#word_detector#detect_multi_window(l:windows)

  call s:assert_true(type(l:words) == v:t_list, 'detect_multi_window() should return list')
  call s:assert_true(len(l:words) >= 4, 'Expected at least 4 words from 2 windows')

  " クリーンアップ
  only
  bwipeout!

  echo '  PASS: test_e2e_multi_window'
endfunction

" ========================================
" Test 4: キャッシュ統合（E2E）
" ========================================
function! s:test_e2e_cache_integration() abort
  echo 'Running: test_e2e_cache_integration'

  new
  call setline(1, 'cache test content')

  " キャッシュクリア
  call hellshake_yano_vim#word_detector#clear_cache()

  " 1回目: キャッシュなし
  let l:words1 = hellshake_yano_vim#word_detector#detect_visible()
  call s:assert_true(type(l:words1) == v:t_list, 'First call should return list')

  " 2回目: キャッシュヒット（同じバッファ・ウィンドウ範囲）
  let l:words2 = hellshake_yano_vim#word_detector#detect_visible()
  call s:assert_true(type(l:words2) == v:t_list, 'Second call should return list')

  " 結果の長さが同じであることを確認
  call s:assert_true(len(l:words1) == len(l:words2),
    \ 'Cached result should have same length as original')

  bwipeout!

  echo '  PASS: test_e2e_cache_integration'
endfunction

" ========================================
" Test 5: 設定連携（E2E）
" ========================================
function! s:test_e2e_config_integration() abort
  echo 'Running: test_e2e_config_integration'

  " get_min_length() のキャッシュ動作確認
  let l:min_length_w1 = hellshake_yano_vim#word_detector#get_min_length('w')
  call s:assert_true(type(l:min_length_w1) == v:t_number,
    \ 'get_min_length() should return number')
  call s:assert_true(l:min_length_w1 > 0,
    \ 'get_min_length() should return positive number')

  " 2回目呼び出し（キャッシュヒット）
  let l:min_length_w2 = hellshake_yano_vim#word_detector#get_min_length('w')
  call s:assert_true(l:min_length_w1 == l:min_length_w2,
    \ 'Cached min_length should be same')

  " キャッシュクリア後
  call hellshake_yano_vim#word_detector#clear_cache()
  let l:min_length_w3 = hellshake_yano_vim#word_detector#get_min_length('w')
  call s:assert_true(l:min_length_w1 == l:min_length_w3,
    \ 'min_length should be same after cache clear')

  echo '  PASS: test_e2e_config_integration'
endfunction

" ========================================
" Test 6: フォールバック動作（E2E）
" ========================================
function! s:test_e2e_fallback() abort
  echo 'Running: test_e2e_fallback'

  new
  call setline(1, 'fallback test content')

  " has_denops() の結果に関わらず、detect_visible() は動作すること
  let l:words = hellshake_yano_vim#word_detector#detect_visible()
  call s:assert_true(type(l:words) == v:t_list, 'Fallback should return list')
  call s:assert_true(len(l:words) > 0, 'Fallback should detect words')

  bwipeout!

  echo '  PASS: test_e2e_fallback'
endfunction

" ========================================
" テスト実行
" ========================================
function! TestPhase21Integration() abort
  let l:test_count = 0
  let l:pass_count = 0
  let l:fail_count = 0
  let l:skip_count = 0

  let l:tests = [
    \ 's:test_e2e_word_detection',
    \ 's:test_e2e_denops_integration',
    \ 's:test_e2e_multi_window',
    \ 's:test_e2e_cache_integration',
    \ 's:test_e2e_config_integration',
    \ 's:test_e2e_fallback'
    \ ]

  echo '========================================='
  echo 'Phase 2.1 E2E Integration Tests'
  echo '========================================='
  echo ''

  for l:test in l:tests
    let l:test_count += 1
    try
      execute 'call ' . l:test . '()'
      let l:pass_count += 1
    catch /^SKIP:/
      let l:skip_count += 1
      echo '  SKIP: ' . l:test
    catch
      let l:fail_count += 1
      echohl ErrorMsg
      echo '  FAIL: ' . l:test
      echo '    ' . v:exception
      echohl None
    endtry
  endfor

  echo ''
  echo '========================================='
  echo 'Test Results:'
  echo '  Total:  ' . l:test_count
  echo '  Passed: ' . l:pass_count
  echo '  Failed: ' . l:fail_count
  echo '  Skipped: ' . l:skip_count
  echo '========================================='

  if l:fail_count > 0
    cquit!
  endif
endfunction

" 自動実行（vim -S で実行時）
if !exists('g:hellshake_yano_test_no_auto_run')
  call TestPhase21Integration()
  quit
endif
