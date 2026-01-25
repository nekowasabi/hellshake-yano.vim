" test_hint_generator_latency.vim - レイテンシテスト
" Phase 1.3 Process 12: レイテンシテスト [Council MEDIUM]
"
" 目的: Denops呼び出しのレイテンシが100ms以下であることを保証

let s:suite = themis#suite('hint_generator_latency')
let s:assert = themis#helper('assert')

" レイテンシ閾値（ミリ秒）
let s:LATENCY_THRESHOLD_MS = 100.0

" キャッシュヒット時の閾値（ミリ秒）
let s:CACHE_HIT_THRESHOLD_MS = 1.0

" ========================================
" Test: Denops経由のレイテンシ（キャッシュミス時）
" ========================================
function! s:suite.test_latency_denops_cache_miss() abort
  if !hellshake_yano_vim#hint_generator#has_denops()
    call themis#log('SKIP: Denops not available')
    return
  endif

  " キャッシュクリア
  if exists('*hellshake_yano_vim#hint_generator#clear_cache')
    call hellshake_yano_vim#hint_generator#clear_cache()
  endif

  " 計測（キャッシュミス時）
  let l:start = reltime()
  let l:hints = hellshake_yano_vim#hint_generator#generate(100)
  let l:elapsed_ms = reltimefloat(reltime(l:start)) * 1000.0

  call s:assert.true(l:elapsed_ms < s:LATENCY_THRESHOLD_MS,
    \ 'Latency ' . printf('%.2f', l:elapsed_ms) . 'ms exceeds threshold ' . s:LATENCY_THRESHOLD_MS . 'ms')

  call themis#log('[Latency] generate(100) cache miss: ' . printf('%.2f', l:elapsed_ms) . 'ms')
endfunction

" ========================================
" Test: キャッシュヒット時のレイテンシ
" ========================================
function! s:suite.test_latency_cache_hit() abort
  " 1回目: キャッシュミス
  let l:hints1 = hellshake_yano_vim#hint_generator#generate(50)

  " 2回目: キャッシュヒット（高速）
  let l:start = reltime()
  let l:hints2 = hellshake_yano_vim#hint_generator#generate(50)
  let l:elapsed_ms = reltimefloat(reltime(l:start)) * 1000.0

  call s:assert.true(l:elapsed_ms < s:CACHE_HIT_THRESHOLD_MS,
    \ 'Cache hit latency ' . printf('%.3f', l:elapsed_ms) . 'ms exceeds ' . s:CACHE_HIT_THRESHOLD_MS . 'ms')

  call themis#log('[Latency] cache hit: ' . printf('%.3f', l:elapsed_ms) . 'ms')
endfunction

" ========================================
" Test: フォールバック時のレイテンシ
" ========================================
function! s:suite.test_latency_fallback() abort
  " Denops未起動時のフォールバックレイテンシ

  " キャッシュクリア
  if exists('*hellshake_yano_vim#hint_generator#clear_cache')
    call hellshake_yano_vim#hint_generator#clear_cache()
  endif

  " 計測（フォールバック時）
  let l:start = reltime()
  let l:hints = hellshake_yano_vim#hint_generator#generate(100)
  let l:elapsed_ms = reltimefloat(reltime(l:start)) * 1000.0

  " フォールバックは非常に高速なはず
  call s:assert.true(l:elapsed_ms < s:LATENCY_THRESHOLD_MS,
    \ 'Fallback latency ' . printf('%.2f', l:elapsed_ms) . 'ms exceeds threshold')

  call themis#log('[Latency] fallback generate(100): ' . printf('%.2f', l:elapsed_ms) . 'ms')
endfunction

" ========================================
" Test: 大量ヒント生成のレイテンシ
" ========================================
function! s:suite.test_latency_large_count() abort
  " キャッシュクリア
  if exists('*hellshake_yano_vim#hint_generator#clear_cache')
    call hellshake_yano_vim#hint_generator#clear_cache()
  endif

  " 200個のヒント生成
  let l:start = reltime()
  let l:hints = hellshake_yano_vim#hint_generator#generate(200)
  let l:elapsed_ms = reltimefloat(reltime(l:start)) * 1000.0

  call s:assert.equals(len(l:hints), 200, 'Should generate 200 hints')
  call s:assert.true(l:elapsed_ms < s:LATENCY_THRESHOLD_MS * 2,
    \ 'Large count latency ' . printf('%.2f', l:elapsed_ms) . 'ms exceeds threshold')

  call themis#log('[Latency] generate(200): ' . printf('%.2f', l:elapsed_ms) . 'ms')
endfunction

" ========================================
" Test: 連続呼び出しのレイテンシ平均
" ========================================
function! s:suite.test_latency_average() abort
  " キャッシュクリア
  if exists('*hellshake_yano_vim#hint_generator#clear_cache')
    call hellshake_yano_vim#hint_generator#clear_cache()
  endif

  let l:total_ms = 0.0
  let l:iterations = 10

  for l:i in range(l:iterations)
    " 毎回異なるcountでキャッシュミスを発生させる
    let l:count = 10 + l:i

    let l:start = reltime()
    let l:hints = hellshake_yano_vim#hint_generator#generate(l:count)
    let l:elapsed_ms = reltimefloat(reltime(l:start)) * 1000.0

    let l:total_ms += l:elapsed_ms
  endfor

  let l:avg_ms = l:total_ms / l:iterations

  call s:assert.true(l:avg_ms < s:LATENCY_THRESHOLD_MS,
    \ 'Average latency ' . printf('%.2f', l:avg_ms) . 'ms exceeds threshold')

  call themis#log('[Latency] average over ' . l:iterations . ' calls: ' . printf('%.2f', l:avg_ms) . 'ms')
endfunction
