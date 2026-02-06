" tests-vim/hellshake_yano_vim/test_word_detector_latency.vim - レイテンシテスト
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: RED -> GREEN -> REFACTOR
" Process 12: レイテンシテスト（< 50ms）
"
" 目的:
"   - word_detector の複数操作のレイテンシを計測
"   - Denops呼び出しのレイテンシが50ms以下であることを保証
"   - キャッシュ機構により高速化を確認
"
" テスト対象:
"   - hellshake_yano_vim#word_detector#detect_visible() - 大規模ファイル対応
"   - hellshake_yano_vim#word_detector#get_min_length() - 辞書関連処理
"

let s:suite = themis#suite('word_detector_latency')
let s:assert = themis#helper('assert')

" ========================================
" テスト定数
" ========================================
let s:LATENCY_THRESHOLD_MS = 50.0        " 検出処理のしきい値（50ms）
let s:CACHE_HIT_THRESHOLD_MS = 1.0       " キャッシュヒット時のしきい値（1ms）
let s:MIN_LEN_THRESHOLD_MS = 10.0        " get_min_length のしきい値（10ms）

" ========================================
" Test 1: detect_visible() のレイテンシ（キャッシュミス時）
" ========================================
" 大規模バッファ（50行）での処理時間を計測
" 目標: 50ms以下
"
" 背景:
"   - Denopsプラグインが利用可能な場合、高速な検出が期待される
"   - ローカルフォールバックでも50msが目安
"
function! s:suite.test_latency_detect_visible_50_lines() abort
  if !hellshake_yano_vim#word_detector#has_denops()
    call s:assert.skip('Denops not available')
    return
  endif

  " テスト用バッファを作成（50行）
  new
  try
    for l:i in range(1, 50)
      call setline(l:i, 'function test_func_' . l:i . '() { return 42; }')
    endfor

    " キャッシュクリア（キャッシュミス状態を確認）
    if exists('*hellshake_yano_vim#word_detector#clear_cache')
      call hellshake_yano_vim#word_detector#clear_cache()
    endif

    " 計測開始
    let l:start = reltime()
    let l:words = hellshake_yano_vim#word_detector#detect_visible()
    let l:elapsed_ms = reltimefloat(reltime(l:start)) * 1000.0

    " 検証: レイテンシが閾値以下
    call s:assert.true(l:elapsed_ms < s:LATENCY_THRESHOLD_MS,
      \ printf('Latency %.2f ms exceeds threshold %.0f ms', l:elapsed_ms, s:LATENCY_THRESHOLD_MS))

    " 検出された単語数が妥当（50行x複数単語の期待）
    call s:assert.true(len(l:words) > 100,
      \ printf('Expected >100 words, got %d', len(l:words)))

    " レポート出力
    echo printf('[Latency] detect_visible(50 lines): %.2f ms', l:elapsed_ms)
  finally
    bwipeout!
  endtry
endfunction

" ========================================
" Test 2: キャッシュヒット時のレイテンシ
" ========================================
" 同じバッファ内で2回目の呼び出しはキャッシュから返却
" 目標: 1ms以下
"
" 背景:
"   - キャッシュ機構により、同じバッファの連続呼び出しは1ms以下を期待
"   - これにより、ハイライト更新時の遅延を最小化
"
function! s:suite.test_latency_cache_hit() abort
  new
  try
    " 単純なバッファを作成
    call setline(1, 'test word example vim editor')
    call cursor(1, 1)

    " 1回目: キャッシュミス（キャッシュに登録される）
    let l:words1 = hellshake_yano_vim#word_detector#detect_visible()
    call s:assert.true(len(l:words1) > 0, 'First call should return words')

    " 2回目: キャッシュヒット（同じバッファ・同じウィンドウ範囲）
    let l:start = reltime()
    let l:words2 = hellshake_yano_vim#word_detector#detect_visible()
    let l:elapsed_ms = reltimefloat(reltime(l:start)) * 1000.0

    " 検証: レイテンシが1ms以下
    call s:assert.true(l:elapsed_ms < s:CACHE_HIT_THRESHOLD_MS,
      \ printf('Cache hit latency %.3f ms exceeds threshold %.1f ms', l:elapsed_ms, s:CACHE_HIT_THRESHOLD_MS))

    " キャッシュ結果が同一
    call s:assert.equals(l:words1, l:words2,
      \ 'Cache hit should return identical results')

    " レポート出力
    echo printf('[Latency] cache hit: %.3f ms', l:elapsed_ms)
  finally
    bwipeout!
  endtry
endfunction

" ========================================
" Test 3: get_min_length() のレイテンシ
" ========================================
" 辞書の最小単語長を取得する処理のレイテンシ
" 目標: 10ms以下
"
" 背景:
"   - Dictionary Integration (Process4 Sub2) で実装
"   - 辞書ファイルの読み込みはキャッシュされるべき
"
function! s:suite.test_latency_get_min_length() abort
  if !hellshake_yano_vim#word_detector#has_denops()
    call s:assert.skip('Denops not available')
    return
  endif

  " キャッシュクリア
  if exists('*hellshake_yano_vim#word_detector#clear_cache')
    call hellshake_yano_vim#word_detector#clear_cache()
  endif

  " 計測開始（get_min_length 呼び出し）
  let l:start = reltime()
  let l:min_len = hellshake_yano_vim#word_detector#get_min_length('w')
  let l:elapsed_ms = reltimefloat(reltime(l:start)) * 1000.0

  " 検証: レイテンシが10ms以下
  call s:assert.true(l:elapsed_ms < s:MIN_LEN_THRESHOLD_MS,
    \ printf('get_min_length latency %.2f ms exceeds threshold %.0f ms', l:elapsed_ms, s:MIN_LEN_THRESHOLD_MS))

  " 返り値が妥当な整数
  call s:assert.true(type(l:min_len) == v:t_number && l:min_len > 0,
    \ printf('Expected positive integer, got %s (%s)', l:min_len, type(l:min_len)))

  " レポート出力
  echo printf('[Latency] get_min_length: %.2f ms', l:elapsed_ms)
endfunction

" ========================================
" Test 4: キャッシュクリア後の再計測
" ========================================
" キャッシュクリア → 再度大規模バッファで計測
" 目標: 50ms以下（再度キャッシュミス状態）
"
" 背景:
"   - clear_cache() が正しく機能し、キャッシュが無効化される
"   - 無効化後も処理時間が安定している
"
function! s:suite.test_latency_after_clear_cache() abort
  if !hellshake_yano_vim#word_detector#has_denops()
    call s:assert.skip('Denops not available')
    return
  endif

  new
  try
    " 大規模バッファを作成
    for l:i in range(1, 50)
      call setline(l:i, 'line ' . l:i . ' contains multiple words here')
    endfor

    " 1回目: キャッシュミス
    let l:words1 = hellshake_yano_vim#word_detector#detect_visible()

    " キャッシュクリア
    if exists('*hellshake_yano_vim#word_detector#clear_cache')
      call hellshake_yano_vim#word_detector#clear_cache()
    endif

    " 2回目: キャッシュクリア後のキャッシュミス
    let l:start = reltime()
    let l:words2 = hellshake_yano_vim#word_detector#detect_visible()
    let l:elapsed_ms = reltimefloat(reltime(l:start)) * 1000.0

    " 検証: レイテンシが50ms以下
    call s:assert.true(l:elapsed_ms < s:LATENCY_THRESHOLD_MS,
      \ printf('Latency after clear_cache %.2f ms exceeds threshold %.0f ms', l:elapsed_ms, s:LATENCY_THRESHOLD_MS))

    " 結果が同一（バッファ内容は変更なし）
    call s:assert.equals(l:words1, l:words2,
      \ 'Results should be identical after cache clear')

    " レポート出力
    echo printf('[Latency] after clear_cache: %.2f ms', l:elapsed_ms)
  finally
    bwipeout!
  endtry
endfunction

" ========================================
" Test 5: 複数ウィンドウでの多重呼び出しレイテンシ
" ========================================
" 複数ウィンドウでの処理時間合計を計測
" 目標: 100ms以下（複数ウィンドウ環境）
"
" 背景:
"   - Multi-window Support (Process 5) との統合確認
"   -複数ウィンドウの合計レイテンシが許容範囲内
"
function! s:suite.test_latency_multi_window() abort
  " 複数ウィンドウを作成
  new
  try
    " ウィンドウ1のバッファ
    call setline(1, ['window1 test function1',
                    \ 'window1 test function2',
                    \ 'window1 test function3'])

    " ウィンドウ2を分割作成
    split
    call setline(1, ['window2 sample function1',
                    \ 'window2 sample function2'])

    " 計測開始：複数ウィンドウの処理
    let l:start = reltime()

    " ウィンドウ1での処理
    execute 'wincmd j'
    let l:words1 = hellshake_yano_vim#word_detector#detect_visible()

    " ウィンドウ2での処理
    execute 'wincmd k'
    let l:words2 = hellshake_yano_vim#word_detector#detect_visible()

    let l:elapsed_ms = reltimefloat(reltime(l:start)) * 1000.0

    " 検証: 複数ウィンドウの合計処理時間が100ms以下
    call s:assert.true(l:elapsed_ms < 100.0,
      \ printf('Multi-window latency %.2f ms exceeds threshold 100 ms', l:elapsed_ms))

    " 各ウィンドウで単語が検出されている
    call s:assert.true(len(l:words1) > 0, 'Window 1 should detect words')
    call s:assert.true(len(l:words2) > 0, 'Window 2 should detect words')

    " レポート出力
    echo printf('[Latency] multi-window: %.2f ms (total for 2 windows)', l:elapsed_ms)
  finally
    bwipeout!
  endtry
endfunction
