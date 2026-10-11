" Why: Check at VimLeavePre instead of after source because legacy tests call qall.
function! s:check_exit() abort
  let l:lines = filereadable(&verbosefile) ? readfile(&verbosefile) : []
  let l:failure = '\v^\s*✗|^\s*FAIL:|\[FAIL\]|FAIL \[Test|^\s*FAILED:|RESULT: FAILURE|Some tests failed|SOME TESTS FAILED|EXCEPTION:|AssertionError:|Assertion failed|^E\d+:|HY_TEST_FAIL'
  if !empty(v:errors) || !empty(filter(l:lines, 'v:val =~# l:failure'))
    for l:error in v:errors
      echom 'HY_ASSERT_FAIL' . ' ' . l:error
    endfor
    cquit 1
  endif
endfunction

augroup hellshake_yano_test_exit
  autocmd!
  autocmd VimLeavePre * call s:check_exit()
augroup END
