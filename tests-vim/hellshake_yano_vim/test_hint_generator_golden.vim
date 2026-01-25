" test_hint_generator_golden.vim - ゴールデンテスト
" Phase 1.3 Process 10: ゴールデンテスト [Council HIGH]
"
" 目的: VimScript版とDenops版で同一入力に対して同一出力を保証

let s:suite = themis#suite('hint_generator_golden')
let s:assert = themis#helper('assert')

" ゴールデンテストケース
" デフォルト設定: singleCharKeys='asdfgnm', multiCharKeys='bceiopqrtuvwxyz'
let s:golden_test_cases = [
  \ {'count': 0, 'expected': []},
  \ {'count': 1, 'expected': ['a']},
  \ {'count': 3, 'expected': ['a', 's', 'd']},
  \ {'count': 7, 'expected': ['a', 's', 'd', 'f', 'g', 'n', 'm']},
  \ {'count': 10, 'expected': ['a', 's', 'd', 'f', 'g', 'n', 'm', 'bb', 'bc', 'be']},
  \ ]

" ========================================
" Test: ローカル実装のゴールデンテスト
" ========================================
function! s:suite.test_golden_local_count_0() abort
  " キャッシュクリアして純粋なローカル実装をテスト
  if exists('*hellshake_yano_vim#hint_generator#clear_cache')
    call hellshake_yano_vim#hint_generator#clear_cache()
  endif

  let l:result = hellshake_yano_vim#hint_generator#generate(0)
  call s:assert.equals(l:result, [], 'count=0 should return []')
endfunction

function! s:suite.test_golden_local_count_1() abort
  if exists('*hellshake_yano_vim#hint_generator#clear_cache')
    call hellshake_yano_vim#hint_generator#clear_cache()
  endif

  let l:result = hellshake_yano_vim#hint_generator#generate(1)
  call s:assert.equals(l:result, ['a'], 'count=1 should return ["a"]')
endfunction

function! s:suite.test_golden_local_count_3() abort
  if exists('*hellshake_yano_vim#hint_generator#clear_cache')
    call hellshake_yano_vim#hint_generator#clear_cache()
  endif

  let l:result = hellshake_yano_vim#hint_generator#generate(3)
  call s:assert.equals(l:result, ['a', 's', 'd'], 'count=3 should return ["a", "s", "d"]')
endfunction

function! s:suite.test_golden_local_count_7() abort
  if exists('*hellshake_yano_vim#hint_generator#clear_cache')
    call hellshake_yano_vim#hint_generator#clear_cache()
  endif

  let l:result = hellshake_yano_vim#hint_generator#generate(7)
  call s:assert.equals(l:result, ['a', 's', 'd', 'f', 'g', 'n', 'm'],
    \ 'count=7 should return all single char keys')
endfunction

function! s:suite.test_golden_local_count_10() abort
  if exists('*hellshake_yano_vim#hint_generator#clear_cache')
    call hellshake_yano_vim#hint_generator#clear_cache()
  endif

  let l:result = hellshake_yano_vim#hint_generator#generate(10)
  let l:expected = ['a', 's', 'd', 'f', 'g', 'n', 'm', 'bb', 'bc', 'be']
  call s:assert.equals(l:result, l:expected,
    \ 'count=10 should return single + multi char hints')
endfunction

" ========================================
" Test: Denops版のゴールデンテスト（Denops起動時のみ）
" ========================================
function! s:suite.test_golden_denops() abort
  if !hellshake_yano_vim#hint_generator#has_denops()
    call themis#log('SKIP: Denops not available')
    return
  endif

  for l:case in s:golden_test_cases
    if exists('*hellshake_yano_vim#hint_generator#clear_cache')
      call hellshake_yano_vim#hint_generator#clear_cache()
    endif

    let l:result = hellshake_yano_vim#hint_generator#generate(l:case.count)
    call s:assert.equals(l:result, l:case.expected,
      \ 'Denops: count=' . l:case.count . ' mismatch')
  endfor
endfunction

" ========================================
" Test: ローカル実装とDenops版の出力一致（Denops起動時のみ）
" ========================================
function! s:suite.test_golden_unified() abort
  if !hellshake_yano_vim#hint_generator#has_denops()
    call themis#log('SKIP: Denops not available')
    return
  endif

  " 複数のcountでテスト
  for l:count in [1, 5, 7, 10, 20]
    " キャッシュクリアしてDenops経由で取得
    if exists('*hellshake_yano_vim#hint_generator#clear_cache')
      call hellshake_yano_vim#hint_generator#clear_cache()
    endif
    let l:denops_result = hellshake_yano_vim#hint_generator#generate(l:count)

    " ゴールデンテストケースと比較
    for l:case in s:golden_test_cases
      if l:case.count == l:count
        call s:assert.equals(l:denops_result, l:case.expected,
          \ 'Unified: count=' . l:count . ' should match expected')
        break
      endif
    endfor
  endfor
endfunction
