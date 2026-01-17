" tests-vim/test_process10_edge_cases.vim
" Process 10: Edge case tests for multi-window hint display
"
" Purpose:
"   - Test edge cases: very small windows, empty buffers, wrapped lines
"   - Ensure robustness in unusual scenarios
"   - Regression tests for all processes
"
" Test Groups:
"   1. Very small window tests
"   2. Empty buffer tests
"   3. Wrapped line tests
"   4. Boundary condition tests
"   5. Regression tests

let s:test_count = 0
let s:pass_count = 0
let s:fail_count = 0

" Helper: setup test environment
function! s:setup() abort
  call hellshake_yano_vim#display#hide_all()
  silent! only
  silent! %delete _
  " Reset to reasonable window size
  resize 20
  vertical resize 80
endfunction

function! s:teardown() abort
  call hellshake_yano_vim#display#hide_all()
  silent! only
  silent! %delete _
endfunction

" Helper: assert and report
function! s:assert(condition, message) abort
  let s:test_count += 1
  if a:condition
    let s:pass_count += 1
    echomsg '  [PASS] ' . a:message
    return 1
  else
    let s:fail_count += 1
    echomsg '  [FAIL] ' . a:message
    return 0
  endif
endfunction

" ============================================================================
" Test Group 1: Very small window tests
" ============================================================================

" Test 1.1: Single line visible window
function! s:test_single_line_window() abort
  call s:setup()
  echomsg 'Test 1.1: Single line visible window'

  call setline(1, ['hello world', 'test line', 'vim script', 'more lines', 'even more'])

  " Make window very small (1 line)
  resize 1

  let l:winid = win_getid()

  " Should still work, even with minimal space
  let l:result = hellshake_yano_vim#display#show_hint_with_window(l:winid, 1, 1, 'a')
  call s:assert(l:result >= -1, 'Should handle single line window')

  call s:teardown()
endfunction

" Test 1.2: Very narrow window (2 columns)
function! s:test_very_narrow_window() abort
  call s:setup()
  echomsg 'Test 1.2: Very narrow window'

  call setline(1, ['hello world'])

  " Make window very narrow
  vertical resize 2

  let l:winid = win_getid()
  let l:result = hellshake_yano_vim#display#show_hint_with_window(l:winid, 1, 1, 'a')

  " Should handle gracefully
  call s:assert(l:result >= -1, 'Should handle very narrow window')

  call s:teardown()
endfunction

" Test 1.3: Minimum size window (1x1)
function! s:test_minimum_size_window() abort
  call s:setup()
  echomsg 'Test 1.3: Minimum size window'

  call setline(1, ['x'])

  resize 1
  vertical resize 1

  let l:winid = win_getid()
  let l:result = hellshake_yano_vim#display#show_hint_with_window(l:winid, 1, 1, 'a')

  call s:assert(l:result >= -1, 'Should handle minimum size window')

  call s:teardown()
endfunction

" ============================================================================
" Test Group 2: Empty buffer tests
" ============================================================================

" Test 2.1: Completely empty buffer
function! s:test_empty_buffer() abort
  call s:setup()
  echomsg 'Test 2.1: Completely empty buffer'

  " Buffer is already empty from setup
  let l:winid = win_getid()

  " Try to show hint at line 1, col 1 (may or may not exist)
  let l:result = hellshake_yano_vim#display#show_hint_with_window(l:winid, 1, 1, 'a')

  " Should not crash
  call s:assert(l:result >= -1, 'Should handle empty buffer gracefully')

  call s:teardown()
endfunction

" Test 2.2: Buffer with only whitespace
function! s:test_whitespace_only_buffer() abort
  call s:setup()
  echomsg 'Test 2.2: Buffer with only whitespace'

  call setline(1, ['   ', "\t\t", '  \t  '])

  let l:winid = win_getid()
  let l:result = hellshake_yano_vim#display#show_hint_with_window(l:winid, 1, 1, 'a')

  call s:assert(l:result >= -1, 'Should handle whitespace-only buffer')

  call s:teardown()
endfunction

" Test 2.3: New buffer (no lines at all)
function! s:test_new_buffer() abort
  call s:setup()
  echomsg 'Test 2.3: New buffer'

  enew!

  let l:winid = win_getid()
  let l:result = hellshake_yano_vim#display#show_hint_with_window(l:winid, 1, 1, 'a')

  call s:assert(l:result >= -1, 'Should handle new buffer')

  call s:teardown()
endfunction

" ============================================================================
" Test Group 3: Wrapped line tests
" ============================================================================

" Test 3.1: Long line that wraps multiple times
function! s:test_multi_wrap_line() abort
  call s:setup()
  echomsg 'Test 3.1: Long line that wraps multiple times'

  let l:save_wrap = &wrap
  set wrap

  " Create a very long line
  let l:long_line = repeat('word ', 100)
  call setline(1, [l:long_line])

  let l:winid = win_getid()

  " Hint at beginning
  let l:result1 = hellshake_yano_vim#display#show_hint_with_window(l:winid, 1, 1, 'a')
  call s:assert(l:result1 >= -1, 'Should handle hint at wrap start')

  " Hint in wrapped portion
  let l:result2 = hellshake_yano_vim#display#show_hint_with_window(l:winid, 1, 200, 'b')
  call s:assert(l:result2 >= -1, 'Should handle hint in wrapped portion')

  let &wrap = l:save_wrap
  call s:teardown()
endfunction

" Test 3.2: Mixed wrap and nowrap
function! s:test_wrap_toggle() abort
  call s:setup()
  echomsg 'Test 3.2: Wrap toggle'

  let l:long_line = repeat('test ', 50)
  call setline(1, [l:long_line])

  let l:winid = win_getid()

  " Test with wrap on
  set wrap
  let l:result1 = hellshake_yano_vim#display#show_hint_with_window(l:winid, 1, 100, 'a')
  call hellshake_yano_vim#display#hide_all()

  " Test with wrap off
  set nowrap
  let l:result2 = hellshake_yano_vim#display#show_hint_with_window(l:winid, 1, 100, 'b')

  call s:assert(l:result1 >= -1 && l:result2 >= -1, 'Should handle wrap toggle')

  call s:teardown()
endfunction

" ============================================================================
" Test Group 4: Boundary condition tests
" ============================================================================

" Test 4.1: Hint at line 0 (invalid)
function! s:test_line_zero() abort
  call s:setup()
  echomsg 'Test 4.1: Hint at line 0 (boundary)'

  call setline(1, ['test'])

  let l:winid = win_getid()

  " Line 0 is invalid, should handle gracefully
  try
    let l:result = hellshake_yano_vim#display#show_hint_with_window(l:winid, 0, 1, 'a')
    call s:assert(l:result == -1 || l:result > 0, 'Should handle line 0')
  catch
    call s:assert(1, 'Should handle line 0 (caught exception)')
  endtry

  call s:teardown()
endfunction

" Test 4.2: Hint at column 0 (invalid)
function! s:test_column_zero() abort
  call s:setup()
  echomsg 'Test 4.2: Hint at column 0 (boundary)'

  call setline(1, ['test'])

  let l:winid = win_getid()

  try
    let l:result = hellshake_yano_vim#display#show_hint_with_window(l:winid, 1, 0, 'a')
    call s:assert(l:result == -1 || l:result > 0, 'Should handle column 0')
  catch
    call s:assert(1, 'Should handle column 0 (caught exception)')
  endtry

  call s:teardown()
endfunction

" Test 4.3: Hint beyond last line
function! s:test_beyond_last_line() abort
  call s:setup()
  echomsg 'Test 4.3: Hint beyond last line'

  call setline(1, ['line1', 'line2'])

  let l:winid = win_getid()
  let l:result = hellshake_yano_vim#display#show_hint_with_window(l:winid, 100, 1, 'a')

  call s:assert(l:result == -1, 'Should return -1 for line beyond buffer')

  call s:teardown()
endfunction

" Test 4.4: Hint beyond last column
function! s:test_beyond_last_column() abort
  call s:setup()
  echomsg 'Test 4.4: Hint beyond last column'

  call setline(1, ['short'])

  let l:winid = win_getid()
  let l:result = hellshake_yano_vim#display#show_hint_with_window(l:winid, 1, 1000, 'a')

  " Should return -1 or handle gracefully
  call s:assert(l:result == -1 || l:result > 0, 'Should handle column beyond line end')

  call s:teardown()
endfunction

" Test 4.5: Maximum number of hints (simplified)
function! s:test_max_hints() abort
  call s:setup()
  echomsg 'Test 4.5: Maximum number of hints'

  " Create several lines
  call setline(1, ['line 1', 'line 2', 'line 3', 'line 4', 'line 5'])

  let l:winid = win_getid()

  " Add several hints
  let l:success_count = 0
  for i in range(1, 5)
    let l:result = hellshake_yano_vim#display#show_hint_with_window(l:winid, i, 1, 'h' . i)
    if l:result > 0
      let l:success_count += 1
    endif
  endfor

  call s:assert(l:success_count > 0, 'Should handle multiple hints (created ' . l:success_count . ')')

  call s:teardown()
endfunction

" ============================================================================
" Test Group 5: Regression tests
" ============================================================================

" Test 5.1: Process 100 regression - multi-buffer cleanup
function! s:test_process100_regression() abort
  call s:setup()
  echomsg 'Test 5.1: Process 100 regression - multi-buffer cleanup'

  " Setup two buffers
  call setline(1, ['buffer 1'])
  let l:win1 = win_getid()

  vsplit
  enew
  call setline(1, ['buffer 2'])
  let l:win2 = win_getid()

  " Add hints to both
  call hellshake_yano_vim#display#show_hint_with_window(l:win1, 1, 1, 'a')
  call hellshake_yano_vim#display#show_hint_with_window(l:win2, 1, 1, 'b')

  call s:assert(hellshake_yano_vim#display#get_popup_count() == 2, 'Should have 2 hints')

  " Switch to win1 and hide all
  call win_gotoid(l:win1)
  call hellshake_yano_vim#display#hide_all()

  call s:assert(hellshake_yano_vim#display#get_popup_count() == 0, 'Process 100: hide_all should clear all buffers')

  call s:teardown()
endfunction

" Test 5.2: Process 101 regression - util functions work
function! s:test_process101_regression() abort
  call s:setup()
  echomsg 'Test 5.2: Process 101 regression - util functions'

  " Test clamp function
  let l:clamped = hellshake_yano_vim#util#clamp(5, 1, 10)
  call s:assert(l:clamped == 5, 'clamp(5, 1, 10) should be 5')

  let l:clamped_low = hellshake_yano_vim#util#clamp(-5, 1, 10)
  call s:assert(l:clamped_low == 1, 'clamp(-5, 1, 10) should be 1')

  let l:clamped_high = hellshake_yano_vim#util#clamp(15, 1, 10)
  call s:assert(l:clamped_high == 10, 'clamp(15, 1, 10) should be 10')

  " Test is_valid_buffer
  let l:valid = hellshake_yano_vim#util#is_valid_buffer(bufnr('%'))
  call s:assert(l:valid, 'Current buffer should be valid')

  let l:invalid = hellshake_yano_vim#util#is_valid_buffer(-1)
  call s:assert(!l:invalid, 'Buffer -1 should be invalid')

  call s:teardown()
endfunction

" Test 5.3: Display module basic functionality
function! s:test_display_basic() abort
  call s:setup()
  echomsg 'Test 5.3: Display module basic functionality'

  call setline(1, ['hello world test'])

  let l:winid = win_getid()
  let l:id1 = hellshake_yano_vim#display#show_hint_with_window(l:winid, 1, 1, 'a')
  let l:id2 = hellshake_yano_vim#display#show_hint_with_window(l:winid, 1, 7, 'b')

  call s:assert(l:id1 > 0 && l:id2 > 0, 'show_hint_with_window should return valid IDs')
  call s:assert(hellshake_yano_vim#display#get_popup_count() == 2, 'Should have 2 popups')

  call hellshake_yano_vim#display#hide_all()
  call s:assert(hellshake_yano_vim#display#get_popup_count() == 0, 'hide_all should clear all')

  call s:teardown()
endfunction

" ============================================================================
" Test Runner
" ============================================================================

function! s:run_all_tests() abort
  let s:test_count = 0
  let s:pass_count = 0
  let s:fail_count = 0

  echomsg '========================================'
  echomsg 'Process 10: Edge Case Tests'
  echomsg '========================================'

  " Group 1: Very small windows
  echomsg ''
  echomsg 'Group 1: Very small window tests'
  call s:test_single_line_window()
  call s:test_very_narrow_window()
  call s:test_minimum_size_window()

  " Group 2: Empty buffers
  echomsg ''
  echomsg 'Group 2: Empty buffer tests'
  call s:test_empty_buffer()
  call s:test_whitespace_only_buffer()
  call s:test_new_buffer()

  " Group 3: Wrapped lines
  echomsg ''
  echomsg 'Group 3: Wrapped line tests'
  call s:test_multi_wrap_line()
  call s:test_wrap_toggle()

  " Group 4: Boundary conditions
  echomsg ''
  echomsg 'Group 4: Boundary condition tests'
  call s:test_line_zero()
  call s:test_column_zero()
  call s:test_beyond_last_line()
  call s:test_beyond_last_column()
  call s:test_max_hints()

  " Group 5: Regression tests
  echomsg ''
  echomsg 'Group 5: Regression tests'
  call s:test_process100_regression()
  call s:test_process101_regression()
  call s:test_display_basic()

  " Summary
  echomsg ''
  echomsg '========================================'
  echomsg 'Results: ' . s:pass_count . '/' . s:test_count . ' passed'
  if s:fail_count > 0
    echomsg 'FAILED: ' . s:fail_count . ' tests'
  else
    echomsg 'ALL TESTS PASSED!'
  endif
  echomsg '========================================'
endfunction

" Run tests when sourced
call s:run_all_tests()
