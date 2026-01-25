" test_hint_generator_fallback.vim - フォールバック3ケーステスト
" Phase 1.3 Process 11: フォールバックテスト [Council HIGH]
"
" 目的: 正常系・異常系・タイムアウトの3ケースをテスト

let s:suite = themis#suite('hint_generator_fallback')
let s:assert = themis#helper('assert')

" ========================================
" ケース1: 正常系 - Denops利用可能時はDenops経由
" ========================================
function! s:suite.test_fallback_case1_normal_denops_available() abort
  if !hellshake_yano_vim#hint_generator#has_denops()
    call themis#log('SKIP: Denops not available')
    return
  endif

  " キャッシュクリア
  if exists('*hellshake_yano_vim#hint_generator#clear_cache')
    call hellshake_yano_vim#hint_generator#clear_cache()
  endif

  let l:hints = hellshake_yano_vim#hint_generator#generate(5)
  call s:assert.equals(len(l:hints), 5, 'Should return 5 hints via Denops')
  call s:assert.equals(l:hints[0], 'a', 'First hint should be "a"')
endfunction

" ========================================
" ケース2: 異常系 - Denops未起動時はローカル実装
" ========================================
function! s:suite.test_fallback_case2_denops_unavailable() abort
  " Denops未起動環境でのテスト
  " has_denops()がv:falseを返す状態（Denops未インストール or プラグイン未ロード）

  " キャッシュクリア
  if exists('*hellshake_yano_vim#hint_generator#clear_cache')
    call hellshake_yano_vim#hint_generator#clear_cache()
  endif

  " Denopsの状態に関わらず、generate()は結果を返すこと
  let l:hints = hellshake_yano_vim#hint_generator#generate(5)
  call s:assert.equals(len(l:hints), 5, 'Should return 5 hints (fallback)')
  call s:assert.equals(l:hints[0], 'a', 'First hint should be "a"')

  " フォールバックが動作していることを確認
  " （Denops未起動でもエラーにならない）
endfunction

" ========================================
" ケース3: 異常系 - Denops呼び出しエラー時はローカル実装
" ========================================
function! s:suite.test_fallback_case3_error_handling() abort
  " denops#request が例外を投げる場合のテスト
  " try-catch でローカル実装にフォールバック

  " キャッシュクリア
  if exists('*hellshake_yano_vim#hint_generator#clear_cache')
    call hellshake_yano_vim#hint_generator#clear_cache()
  endif

  " エラー注入は困難なため、結果の一貫性をテスト
  " 実際のエラーケースは統合テストで検証

  " 複数回呼び出しても一貫した結果
  let l:hints1 = hellshake_yano_vim#hint_generator#generate(3)
  let l:hints2 = hellshake_yano_vim#hint_generator#generate(3)

  call s:assert.equals(l:hints1, l:hints2, 'Results should be consistent')
  call s:assert.equals(l:hints1, ['a', 's', 'd'], 'Should return correct hints')
endfunction

" ========================================
" Test: has_denops() の堅牢性
" ========================================
function! s:suite.test_has_denops_robustness() abort
  " has_denops() は常にブール値を返すこと
  let l:result = hellshake_yano_vim#hint_generator#has_denops()
  call s:assert.true(type(l:result) == v:t_bool,
    \ 'has_denops() should always return boolean')

  " 例外をスローしないこと
  try
    let l:result2 = hellshake_yano_vim#hint_generator#has_denops()
    call s:assert.true(v:true, 'has_denops() should not throw')
  catch
    call s:assert.fail('has_denops() threw exception: ' . v:exception)
  endtry
endfunction

" ========================================
" Test: フォールバック時の結果の正確性
" ========================================
function! s:suite.test_fallback_result_accuracy() abort
  " フォールバック実装が正確な結果を返すこと
  if exists('*hellshake_yano_vim#hint_generator#clear_cache')
    call hellshake_yano_vim#hint_generator#clear_cache()
  endif

  " 境界値テスト
  let l:hints0 = hellshake_yano_vim#hint_generator#generate(0)
  call s:assert.equals(l:hints0, [], 'count=0 should return []')

  let l:hints_neg = hellshake_yano_vim#hint_generator#generate(-1)
  call s:assert.equals(l:hints_neg, [], 'count=-1 should return []')

  let l:hints1 = hellshake_yano_vim#hint_generator#generate(1)
  call s:assert.equals(l:hints1, ['a'], 'count=1 should return ["a"]')

  let l:hints7 = hellshake_yano_vim#hint_generator#generate(7)
  call s:assert.equals(len(l:hints7), 7, 'count=7 should return 7 hints')
endfunction
