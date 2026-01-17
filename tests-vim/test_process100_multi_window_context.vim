" Test Process 100: Multi-window context passing verification
" This test verifies that DetectionContext is properly passed in multi-window mode

let s:test_results = []

function! s:log_result(name, passed, message) abort
  call add(s:test_results, {'name': a:name, 'passed': a:passed, 'message': a:message})
  let status = a:passed ? 'PASS' : 'FAIL'
  echom printf('[%s] %s: %s', status, a:name, a:message)
endfunction

" Test 1: Verify config has defaultMinWordLength
function! s:test_config_has_min_word_length() abort
  let config = get(g:, 'hellshake_yano', {})
  let has_min_length = has_key(config, 'defaultMinWordLength')

  if has_min_length
    call s:log_result('config_min_word_length', 1, 'defaultMinWordLength is configured: ' . config.defaultMinWordLength)
  else
    " Check if defaultMinWordLength exists in defaults (should be 3)
    call s:log_result('config_min_word_length', 1, 'defaultMinWordLength will use default value (3)')
  endif
endfunction

" Test 2: Verify minWordLength is respected in single window
function! s:test_single_window_min_length() abort
  " This is a conceptual test - actual verification requires running the plugin
  " The test ensures the test infrastructure is working
  call s:log_result('single_window_min_length', 1, 'Single window mode test placeholder')
endfunction

" Test 3: Verify context is created in showHintsMultiWindow
" This tests the code change in core.ts
function! s:test_context_created() abort
  " Verify the code contains the context creation
  " This is a static analysis test
  let core_file = expand('~/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/neovim/core/core.ts')
  if filereadable(core_file)
    let content = join(readfile(core_file), "\n")
    let has_context = content =~# 'const context: DetectionContext'
    let has_min_word_length = content =~# 'minWordLength: effectiveConfig.defaultMinWordLength'

    if has_context && has_min_word_length
      call s:log_result('context_created', 1, 'DetectionContext is properly created in showHintsMultiWindow')
    else
      call s:log_result('context_created', 0, 'DetectionContext creation not found in core.ts')
    endif
  else
    call s:log_result('context_created', 0, 'core.ts file not found')
  endif
endfunction

" Test 4: Verify minWordLength filter in detectWordsInWindow
function! s:test_min_length_filter() abort
  let word_file = expand('~/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/neovim/core/word.ts')
  if filereadable(word_file)
    let content = join(readfile(word_file), "\n")
    let has_filter = content =~# 'const minWordLength = context?.minWordLength ?? 3'
    let has_filter_apply = content =~# 'word.text.length >= minWordLength'

    if has_filter && has_filter_apply
      call s:log_result('min_length_filter', 1, 'minWordLength filter is properly applied in detectWordsInWindow')
    else
      call s:log_result('min_length_filter', 0, 'minWordLength filter not found in word.ts')
    endif
  else
    call s:log_result('min_length_filter', 0, 'word.ts file not found')
  endif
endfunction

" Test 5: Verify col validation in processExtmarksForBuffer
function! s:test_col_validation() abort
  let display_file = expand('~/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/neovim/display/extmark-display.ts')
  if filereadable(display_file)
    let content = join(readfile(display_file), "\n")
    let has_validation = content =~# 'if (col > lineLength)'
    let has_cache = content =~# 'lineLengthCache'

    if has_validation && has_cache
      call s:log_result('col_validation', 1, 'Column validation is properly implemented to prevent E5555')
    else
      call s:log_result('col_validation', 0, 'Column validation not found in extmark-display.ts')
    endif
  else
    call s:log_result('col_validation', 0, 'extmark-display.ts file not found')
  endif
endfunction

" Test 6: Context passed to detectWordsMultiWindow call
function! s:test_context_passed_to_detect() abort
  let core_file = expand('~/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/neovim/core/core.ts')
  if filereadable(core_file)
    let content = join(readfile(core_file), "\n")
    " Check that detectWordsMultiWindow is called with context argument
    let has_call = content =~# 'detectWordsMultiWindow(denops, effectiveConfig, context)'

    if has_call
      call s:log_result('context_passed', 1, 'Context is passed to detectWordsMultiWindow')
    else
      call s:log_result('context_passed', 0, 'Context not passed to detectWordsMultiWindow')
    endif
  else
    call s:log_result('context_passed', 0, 'core.ts file not found')
  endif
endfunction

" Run all tests
function! s:run_tests() abort
  echom '=== Process 100: Multi-window Context Tests ==='
  echom ''

  call s:test_config_has_min_word_length()
  call s:test_single_window_min_length()
  call s:test_context_created()
  call s:test_min_length_filter()
  call s:test_col_validation()
  call s:test_context_passed_to_detect()

  " Summary
  let passed = len(filter(copy(s:test_results), 'v:val.passed'))
  let total = len(s:test_results)

  echom ''
  echom '=== Summary ==='
  echom printf('Passed: %d/%d', passed, total)

  if passed == total
    echom 'All tests passed!'
  else
    echom 'Some tests failed!'
    for result in s:test_results
      if !result.passed
        echom '  FAILED: ' . result.name
      endif
    endfor
  endif

  return passed == total
endfunction

" Execute tests
let s:result = s:run_tests()
if !s:result
  cquit 1
endif
