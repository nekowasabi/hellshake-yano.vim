" test_phase1_3_integration.vim - Phase 1.3 E2E統合テスト
" Phase 1.3 Process 50: E2E統合テスト
"
" 目的: Vim/Neovim両環境でのヒント生成統合を検証

let s:suite = themis#suite('phase1_3_integration')
let s:assert = themis#helper('assert')

" ========================================
" Test: 基本的なヒント生成
" ========================================
function! s:suite.test_e2e_hint_generation_basic() abort
  " ヒント生成（内部API）
  let l:hints = hellshake_yano_vim#hint_generator#generate(10)

  " 検証
  call s:assert.equals(len(l:hints), 10, 'Should generate 10 hints')
  call s:assert.equals(l:hints[0], 'a', 'First hint should be "a"')
  call s:assert.equals(l:hints[6], 'm', 'Seventh hint should be "m"')
  call s:assert.equals(l:hints[7], 'bb', 'Eighth hint should be "bb"')
endfunction

" ========================================
" Test: Denops統合（Denops起動時のみ）
" ========================================
function! s:suite.test_e2e_denops_integration() abort
  if !hellshake_yano_vim#hint_generator#has_denops()
    call themis#log('SKIP: Denops not available')
    return
  endif

  " キャッシュクリア
  call hellshake_yano_vim#hint_generator#clear_cache()

  " Denops経由でヒント生成
  let l:hints = hellshake_yano_vim#hint_generator#generate(5)

  " TypeScript版の出力形式を確認
  call s:assert.equals(l:hints, ['a', 's', 'd', 'f', 'g'],
    \ 'Should return hints from TypeScript implementation')
endfunction

" ========================================
" Test: キャッシュ機構の動作
" ========================================
function! s:suite.test_e2e_cache_mechanism() abort
  " キャッシュクリア
  call hellshake_yano_vim#hint_generator#clear_cache()

  " 1回目
  let l:hints1 = hellshake_yano_vim#hint_generator#generate(7)

  " 2回目（キャッシュヒット）
  let l:hints2 = hellshake_yano_vim#hint_generator#generate(7)

  " 結果が同一
  call s:assert.equals(l:hints1, l:hints2, 'Cached results should be identical')

  " キャッシュクリア後も正常動作
  call hellshake_yano_vim#hint_generator#clear_cache()
  let l:hints3 = hellshake_yano_vim#hint_generator#generate(7)
  call s:assert.equals(l:hints1, l:hints3, 'Results after cache clear should be same')
endfunction

" ========================================
" Test: 設定変更の反映
" ========================================
function! s:suite.test_e2e_config_change() abort
  " デフォルト設定でテスト
  call hellshake_yano_vim#hint_generator#clear_cache()
  let l:default_hints = hellshake_yano_vim#hint_generator#generate(3)
  call s:assert.equals(l:default_hints, ['a', 's', 'd'],
    \ 'Default config should produce default hints')

  " 設定変更（カスタムキー）
  let g:hellshake_yano = {'singleCharKeys': 'xyz'}
  call hellshake_yano_vim#hint_generator#clear_cache()
  let l:custom_hints = hellshake_yano_vim#hint_generator#generate(3)

  " カスタム設定が反映されていること（Denops未起動時）
  if !hellshake_yano_vim#hint_generator#has_denops()
    call s:assert.equals(l:custom_hints, ['x', 'y', 'z'],
      \ 'Custom config should produce custom hints')
  endif

  " 設定をリセット
  unlet g:hellshake_yano
  call hellshake_yano_vim#hint_generator#clear_cache()
endfunction

" ========================================
" Test: 境界値テスト
" ========================================
function! s:suite.test_e2e_boundary_values() abort
  call hellshake_yano_vim#hint_generator#clear_cache()

  " count = 0
  let l:hints0 = hellshake_yano_vim#hint_generator#generate(0)
  call s:assert.equals(l:hints0, [], 'count=0 should return empty array')

  " count = -1
  let l:hints_neg = hellshake_yano_vim#hint_generator#generate(-1)
  call s:assert.equals(l:hints_neg, [], 'count=-1 should return empty array')

  " count = 1
  let l:hints1 = hellshake_yano_vim#hint_generator#generate(1)
  call s:assert.equals(l:hints1, ['a'], 'count=1 should return ["a"]')

  " count = 7（単一文字の境界）
  let l:hints7 = hellshake_yano_vim#hint_generator#generate(7)
  call s:assert.equals(len(l:hints7), 7, 'count=7 should return 7 hints')
  call s:assert.equals(l:hints7[6], 'm', 'Last single char should be "m"')

  " count = 8（複数文字の開始）
  let l:hints8 = hellshake_yano_vim#hint_generator#generate(8)
  call s:assert.equals(len(l:hints8), 8, 'count=8 should return 8 hints')
  call s:assert.equals(l:hints8[7], 'bb', 'First multi char should be "bb"')
endfunction

" ========================================
" Test: has_denops() 関数
" ========================================
function! s:suite.test_e2e_has_denops() abort
  " has_denops() が存在すること
  call s:assert.true(exists('*hellshake_yano_vim#hint_generator#has_denops'),
    \ 'has_denops() should exist')

  " ブール値を返すこと
  let l:result = hellshake_yano_vim#hint_generator#has_denops()
  call s:assert.true(type(l:result) == v:t_bool,
    \ 'has_denops() should return boolean')
endfunction

" ========================================
" Test: clear_cache() 関数
" ========================================
function! s:suite.test_e2e_clear_cache() abort
  " clear_cache() が存在すること
  call s:assert.true(exists('*hellshake_yano_vim#hint_generator#clear_cache'),
    \ 'clear_cache() should exist')

  " エラーなく呼び出せること
  try
    call hellshake_yano_vim#hint_generator#clear_cache()
    call s:assert.true(v:true, 'clear_cache() should not throw')
  catch
    call s:assert.fail('clear_cache() threw exception: ' . v:exception)
  endtry
endfunction

" ========================================
" Test: 大量ヒント生成
" ========================================
function! s:suite.test_e2e_large_hint_count() abort
  call hellshake_yano_vim#hint_generator#clear_cache()

  " 100個のヒント生成
  let l:hints100 = hellshake_yano_vim#hint_generator#generate(100)
  call s:assert.equals(len(l:hints100), 100, 'Should generate 100 hints')

  " 200個のヒント生成
  let l:hints200 = hellshake_yano_vim#hint_generator#generate(200)
  call s:assert.equals(len(l:hints200), 200, 'Should generate 200 hints')
endfunction
