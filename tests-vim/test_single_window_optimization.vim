" Test: シングルウィンドウ最適化テスト
" Phase D-7 Process 200: multiWindowMode シングルウィンドウ最適化
"
" テスト実行方法:
"   vim -u NONE -N -c 'source %' -c 'call RunTests()' -c 'qa!'

" テスト用の最小限のランタイムパスを設定
let &runtimepath = expand('<sfile>:p:h:h') . ',' . &runtimepath

let s:results = []

function! s:assert(condition, message) abort
  if a:condition
    call add(s:results, 'PASS: ' . a:message)
    return 1
  else
    call add(s:results, 'FAIL: ' . a:message)
    return 0
  endif
endfunction

" Test 1: シングルウィンドウで get_visible() が 1 要素を返す
function! s:test_single_window_count() abort
  only
  let l:windows = hellshake_yano_vim#window_detector#get_visible()
  return s:assert(len(l:windows) == 1, 'Single window returns 1 element (got ' . len(l:windows) . ')')
endfunction

" Test 2: 2ウィンドウで get_visible() が 2 要素以上を返す
function! s:test_dual_window_count() abort
  only
  vsplit
  let l:windows = hellshake_yano_vim#window_detector#get_visible()
  let l:result = s:assert(len(l:windows) >= 2, 'Dual windows returns 2+ elements (got ' . len(l:windows) . ')')
  only
  return l:result
endfunction

" Test 3: multiWindowMode 設定が取得できる
function! s:test_config_exists() abort
  let l:value = hellshake_yano_vim#config#get('multiWindowMode')
  return s:assert(type(l:value) == v:t_bool || type(l:value) == v:t_number, 'multiWindowMode config exists')
endfunction

" テスト実行関数
function! RunTests() abort
  let s:results = []

  call s:test_single_window_count()
  call s:test_dual_window_count()
  call s:test_config_exists()

  " 結果出力
  for l:line in s:results
    echo l:line
  endfor

  let l:pass = len(filter(copy(s:results), 'v:val =~# "^PASS"'))
  let l:total = len(s:results)
  echo ''
  echo 'Results: ' . l:pass . '/' . l:total . ' passed'
endfunction
