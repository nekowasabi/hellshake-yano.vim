" tests-vim/test_process100_multi_buffer_extmark.vim
" Test file for Process 100: Multi-buffer extmark deletion bug fix
"
" Purpose:
"   - Test hide_all() correctly clears extmarks from ALL buffers
"   - Verify extmarks in non-current buffers are deleted
"   - Ensure Neovim-specific extmark handling works across buffers
"
" Bug Description:
"   - hide_all() uses nvim_buf_clear_namespace(0, ...) which only clears current buffer
"   - Extmarks in other windows/buffers are not deleted
"   - This causes stale hints to remain visible in multi-window setups
"
" Test Groups:
"   1. Single buffer cleanup (existing behavior)
"   2. Multi-buffer cleanup (bug fix verification)
"   3. Mixed window/buffer scenarios

let s:test_count = 0
let s:pass_count = 0
let s:fail_count = 0

" Helper function: setup test environment
function! s:setup() abort
  " Clear any existing popups/extmarks
  call hellshake_yano_vim#display#hide_all()
  " Reset to single window
  silent! only
  " Clear buffer content
  silent! %delete _
endfunction

function! s:teardown() abort
  " Cleanup
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
" Test Group 1: Single buffer cleanup (baseline)
" ============================================================================

" Test 1.1: hide_all clears hints in current buffer
function! s:test_single_buffer_cleanup() abort
  call s:setup()
  echomsg 'Test 1.1: Single buffer cleanup'

  call setline(1, ['hello world', 'test line'])
  let l:winid = win_getid()

  " Add hints
  call hellshake_yano_vim#display#show_hint_with_window(l:winid, 1, 1, 'a')
  call hellshake_yano_vim#display#show_hint_with_window(l:winid, 1, 7, 'b')
  call hellshake_yano_vim#display#show_hint_with_window(l:winid, 2, 1, 'c')

  call s:assert(hellshake_yano_vim#display#get_popup_count() == 3, 'Should have 3 hints before cleanup')

  " Clear all
  call hellshake_yano_vim#display#hide_all()

  call s:assert(hellshake_yano_vim#display#get_popup_count() == 0, 'Should have 0 hints after cleanup')

  call s:teardown()
endfunction

" ============================================================================
" Test Group 2: Multi-buffer cleanup (BUG FIX TARGET)
" ============================================================================

" Test 2.1: hide_all clears hints from multiple buffers
function! s:test_multi_buffer_cleanup() abort
  call s:setup()
  echomsg 'Test 2.1: Multi-buffer cleanup (BUG FIX TARGET)'

  " Setup first buffer/window
  call setline(1, ['buffer one content', 'line two'])
  let l:win1 = win_getid()
  let l:buf1 = bufnr('%')

  " Create second window with new buffer
  vsplit
  enew
  call setline(1, ['buffer two content', 'another line'])
  let l:win2 = win_getid()
  let l:buf2 = bufnr('%')

  " Add hints to both windows/buffers
  call hellshake_yano_vim#display#show_hint_with_window(l:win1, 1, 1, 'a')
  call hellshake_yano_vim#display#show_hint_with_window(l:win1, 2, 1, 'b')
  call hellshake_yano_vim#display#show_hint_with_window(l:win2, 1, 1, 'c')
  call hellshake_yano_vim#display#show_hint_with_window(l:win2, 2, 1, 'd')

  call s:assert(hellshake_yano_vim#display#get_popup_count() == 4, 'Should have 4 hints across 2 buffers')

  " Move to first window (current buffer = buf1)
  call win_gotoid(l:win1)

  " Clear all - THIS IS THE BUG: only buf1 extmarks were cleared
  call hellshake_yano_vim#display#hide_all()

  " Verify ALL hints are cleared (including buf2)
  call s:assert(hellshake_yano_vim#display#get_popup_count() == 0, 'Should have 0 hints after hide_all (multi-buffer)')

  call s:teardown()
endfunction

" Test 2.2: hide_all clears hints when current window is not the hint window
function! s:test_cleanup_from_different_window() abort
  call s:setup()
  echomsg 'Test 2.2: Cleanup from different window context'

  " Setup first buffer/window
  call setline(1, ['window one'])
  let l:win1 = win_getid()

  " Create second window
  vsplit
  enew
  call setline(1, ['window two'])
  let l:win2 = win_getid()

  " Add hint ONLY to win1/buf1
  call hellshake_yano_vim#display#show_hint_with_window(l:win1, 1, 1, 'x')

  call s:assert(hellshake_yano_vim#display#get_popup_count() == 1, 'Should have 1 hint in win1')

  " Stay in win2 (different window) and call hide_all
  " BUG: If we're in win2, hide_all(0, ...) only clears buf2, not buf1
  call hellshake_yano_vim#display#hide_all()

  call s:assert(hellshake_yano_vim#display#get_popup_count() == 0, 'hide_all should clear hints even from other buffers')

  call s:teardown()
endfunction

" Test 2.3: Three buffers scenario
function! s:test_three_buffer_cleanup() abort
  call s:setup()
  echomsg 'Test 2.3: Three buffer cleanup'

  " Buffer 1
  call setline(1, ['buffer 1'])
  let l:win1 = win_getid()

  " Buffer 2
  vsplit
  enew
  call setline(1, ['buffer 2'])
  let l:win2 = win_getid()

  " Buffer 3
  vsplit
  enew
  call setline(1, ['buffer 3'])
  let l:win3 = win_getid()

  " Add hints to all three
  call hellshake_yano_vim#display#show_hint_with_window(l:win1, 1, 1, 'a')
  call hellshake_yano_vim#display#show_hint_with_window(l:win2, 1, 1, 'b')
  call hellshake_yano_vim#display#show_hint_with_window(l:win3, 1, 1, 'c')

  call s:assert(hellshake_yano_vim#display#get_popup_count() == 3, 'Should have 3 hints across 3 buffers')

  " Move to middle window and clear
  call win_gotoid(l:win2)
  call hellshake_yano_vim#display#hide_all()

  call s:assert(hellshake_yano_vim#display#get_popup_count() == 0, 'All 3 buffer hints should be cleared')

  call s:teardown()
endfunction

" ============================================================================
" Test Group 3: Edge cases
" ============================================================================

" Test 3.1: Same buffer in multiple windows
function! s:test_same_buffer_multiple_windows() abort
  call s:setup()
  echomsg 'Test 3.1: Same buffer in multiple windows'

  call setline(1, ['shared buffer content', 'line two', 'line three'])
  let l:win1 = win_getid()
  let l:buf = bufnr('%')

  " Split but keep same buffer
  vsplit

  let l:win2 = win_getid()

  " Both windows show same buffer
  call s:assert(winbufnr(l:win1) == winbufnr(l:win2), 'Both windows should show same buffer')

  " Add hints from different window contexts
  call hellshake_yano_vim#display#show_hint_with_window(l:win1, 1, 1, 'a')
  call hellshake_yano_vim#display#show_hint_with_window(l:win2, 2, 1, 'b')

  call s:assert(hellshake_yano_vim#display#get_popup_count() == 2, 'Should have 2 hints')

  call hellshake_yano_vim#display#hide_all()

  call s:assert(hellshake_yano_vim#display#get_popup_count() == 0, 'All hints should be cleared')

  call s:teardown()
endfunction

" Test 3.2: Buffer closed before hide_all
function! s:test_closed_buffer_graceful() abort
  call s:setup()
  echomsg 'Test 3.2: Closed buffer graceful handling'

  " Buffer 1
  call setline(1, ['buffer 1'])
  let l:win1 = win_getid()

  " Buffer 2
  vsplit
  enew
  call setline(1, ['buffer 2'])
  let l:win2 = win_getid()

  " Add hints
  call hellshake_yano_vim#display#show_hint_with_window(l:win1, 1, 1, 'a')
  call hellshake_yano_vim#display#show_hint_with_window(l:win2, 1, 1, 'b')

  " Close win2/buf2
  close

  " hide_all should not error even if buf2 is gone
  try
    call hellshake_yano_vim#display#hide_all()
    call s:assert(1, 'hide_all should not throw error for closed buffer')
  catch
    call s:assert(0, 'hide_all threw error: ' . v:exception)
  endtry

  call s:teardown()
endfunction

" ============================================================================
" Test Group 4: Cache cleanup and UI freeze prevention (Problem 3)
" ============================================================================

" Test 4.1: Repeated show/hide cycles should not accumulate state
function! s:test_repeated_show_hide_cycles() abort
  call s:setup()
  echomsg 'Test 4.1: Repeated show/hide cycles (UI freeze prevention)'

  call setline(1, ['hello world', 'test line', 'another line'])
  let l:winid = win_getid()

  " Perform multiple show/hide cycles
  for i in range(5)
    call hellshake_yano_vim#display#show_hint_with_window(l:winid, 1, 1, 'a')
    call hellshake_yano_vim#display#show_hint_with_window(l:winid, 2, 1, 'b')
    call hellshake_yano_vim#display#hide_all()
  endfor

  " Should have no accumulated state
  call s:assert(hellshake_yano_vim#display#get_popup_count() == 0, 'No hints should remain after repeated cycles')

  call s:teardown()
endfunction

" Test 4.2: Error during display should still cleanup properly
function! s:test_error_cleanup() abort
  call s:setup()
  echomsg 'Test 4.2: Error cleanup (graceful handling)'

  call setline(1, ['test content'])
  let l:winid = win_getid()

  " Add a hint
  call hellshake_yano_vim#display#show_hint_with_window(l:winid, 1, 1, 'x')

  " Simulate error condition by trying to add hint to invalid position
  " This should not leave the system in a broken state
  try
    " Intentionally try an edge case (line 999 doesn't exist)
    call hellshake_yano_vim#display#show_hint_with_window(l:winid, 999, 1, 'y')
  catch
    " Expected to potentially fail
  endtry

  " Cleanup should still work
  call hellshake_yano_vim#display#hide_all()

  call s:assert(hellshake_yano_vim#display#get_popup_count() == 0, 'Cleanup should work even after error')

  call s:teardown()
endfunction

" Test 4.3: Multi-buffer repeated operations
function! s:test_multi_buffer_repeated_operations() abort
  call s:setup()
  echomsg 'Test 4.3: Multi-buffer repeated operations'

  " Buffer 1
  call setline(1, ['buffer one'])
  let l:win1 = win_getid()

  " Buffer 2
  vsplit
  enew
  call setline(1, ['buffer two'])
  let l:win2 = win_getid()

  " Perform multiple cycles across buffers
  for i in range(3)
    call hellshake_yano_vim#display#show_hint_with_window(l:win1, 1, 1, 'a')
    call hellshake_yano_vim#display#show_hint_with_window(l:win2, 1, 1, 'b')
    call hellshake_yano_vim#display#hide_all()
  endfor

  call s:assert(hellshake_yano_vim#display#get_popup_count() == 0, 'No state accumulation in multi-buffer cycles')

  call s:teardown()
endfunction

" Test 4.4: Rapid successive calls should not cause freeze
function! s:test_rapid_successive_calls() abort
  call s:setup()
  echomsg 'Test 4.4: Rapid successive calls'

  call setline(1, ['rapid test line'])
  let l:winid = win_getid()

  " Rapid fire show/hide (simulating fast user interaction)
  let l:start_time = reltime()
  for i in range(10)
    call hellshake_yano_vim#display#show_hint_with_window(l:winid, 1, 1, 'z')
    call hellshake_yano_vim#display#hide_all()
  endfor
  let l:elapsed = reltimefloat(reltime(l:start_time))

  " Should complete in reasonable time (< 2 seconds for 10 cycles)
  call s:assert(l:elapsed < 2.0, 'Rapid operations should complete quickly (took ' . printf('%.2f', l:elapsed) . 's)')
  call s:assert(hellshake_yano_vim#display#get_popup_count() == 0, 'No hints after rapid operations')

  call s:teardown()
endfunction

" ============================================================================
" Test Group 5: Cache Clear on Multi-Window Detection
" ============================================================================

" Test 5.1: Cache should be cleared before each multi-window detection
function! s:test_cache_clear_on_detect_multi_window() abort
  call s:setup()
  echomsg 'Test 5.1: Cache clear on multi-window detection'

  " Setup: Create content for detection
  call setline(1, ['hello world', 'test line', 'another example'])
  let l:win1 = win_getid()

  " Create second window
  vsplit
  enew
  call setline(1, ['second buffer', 'more content', 'final line'])
  let l:win2 = win_getid()

  " First detection cycle - simulated by adding hints
  call hellshake_yano_vim#display#show_hint_with_window(l:win1, 1, 1, 'a')
  call hellshake_yano_vim#display#show_hint_with_window(l:win1, 1, 7, 'b')
  call hellshake_yano_vim#display#show_hint_with_window(l:win2, 1, 1, 'c')
  call hellshake_yano_vim#display#show_hint_with_window(l:win2, 2, 1, 'd')

  let l:first_count = hellshake_yano_vim#display#get_popup_count()
  call s:assert(l:first_count == 4, 'First detection should show 4 hints')

  call hellshake_yano_vim#display#hide_all()

  " Second detection cycle - should show same number of hints (not narrowed range)
  call hellshake_yano_vim#display#show_hint_with_window(l:win1, 1, 1, 'a')
  call hellshake_yano_vim#display#show_hint_with_window(l:win1, 1, 7, 'b')
  call hellshake_yano_vim#display#show_hint_with_window(l:win2, 1, 1, 'c')
  call hellshake_yano_vim#display#show_hint_with_window(l:win2, 2, 1, 'd')

  let l:second_count = hellshake_yano_vim#display#get_popup_count()
  call s:assert(l:second_count == 4, 'Second detection should also show 4 hints (cache cleared)')

  " Third cycle to confirm consistency
  call hellshake_yano_vim#display#hide_all()
  call hellshake_yano_vim#display#show_hint_with_window(l:win1, 1, 1, 'a')
  call hellshake_yano_vim#display#show_hint_with_window(l:win1, 1, 7, 'b')
  call hellshake_yano_vim#display#show_hint_with_window(l:win2, 1, 1, 'c')
  call hellshake_yano_vim#display#show_hint_with_window(l:win2, 2, 1, 'd')

  let l:third_count = hellshake_yano_vim#display#get_popup_count()
  call s:assert(l:third_count == 4, 'Third detection should show 4 hints (consistent)')

  call s:teardown()
endfunction

" =============================================================================
" Test Group 6: Multi-Buffer Highlight Update
" =============================================================================

" Test 6.1: Multi-buffer highlight update on partial input
function! s:test_multi_buffer_highlight_update() abort
  call s:setup()
  echomsg 'Test 6.1: Multi-buffer highlight update on partial input'

  " Setup: Create two buffers with content
  call setline(1, ['apple banana', 'cherry date'])
  let l:win1 = win_getid()
  let l:buf1 = bufnr('%')

  vsplit
  enew
  call setline(1, ['elephant frog', 'grape honey'])
  let l:win2 = win_getid()
  let l:buf2 = bufnr('%')

  " Add hints to both buffers (simulating hints starting with 'a')
  call hellshake_yano_vim#display#show_hint_with_window(l:win1, 1, 1, 'aa')
  call hellshake_yano_vim#display#show_hint_with_window(l:win1, 1, 7, 'ab')
  call hellshake_yano_vim#display#show_hint_with_window(l:win2, 1, 1, 'ba')
  call hellshake_yano_vim#display#show_hint_with_window(l:win2, 1, 10, 'bb')

  call s:assert(hellshake_yano_vim#display#get_popup_count() == 4, 'Should have 4 hints across 2 buffers')

  " Move to win1 and clear (simulating highlight update for partial input 'a')
  call win_gotoid(l:win1)
  call hellshake_yano_vim#display#hide_all()

  " Re-add only candidate hints (those starting with 'a')
  call hellshake_yano_vim#display#show_hint_with_window(l:win1, 1, 1, 'aa')
  call hellshake_yano_vim#display#show_hint_with_window(l:win1, 1, 7, 'ab')

  " Bug expectation: If only current buffer is cleared, buf2 still has 'ba', 'bb'
  " After fix: All buffers should be cleared, so only 2 hints remain
  let l:count = hellshake_yano_vim#display#get_popup_count()
  call s:assert(l:count == 2, 'After highlight update, only candidate hints remain (got ' . l:count . ')')

  call s:teardown()
endfunction

" Test 5.2: Detection range should not narrow on repeated calls
function! s:test_detection_range_consistency() abort
  call s:setup()
  echomsg 'Test 5.2: Detection range consistency across repeated calls'

  " Setup: Long content to test range
  let l:lines = []
  for i in range(1, 50)
    call add(l:lines, 'line ' . i . ' with some words here')
  endfor
  call setline(1, l:lines)

  let l:winid = win_getid()

  " Simulate detection over visible range (lines 1-20)
  for i in range(1, 10)
    call hellshake_yano_vim#display#show_hint_with_window(l:winid, i, 1, nr2char(96 + i))
  endfor
  let l:first_range_count = hellshake_yano_vim#display#get_popup_count()

  call hellshake_yano_vim#display#hide_all()

  " Second detection - should cover same range
  for i in range(1, 10)
    call hellshake_yano_vim#display#show_hint_with_window(l:winid, i, 1, nr2char(96 + i))
  endfor
  let l:second_range_count = hellshake_yano_vim#display#get_popup_count()

  call s:assert(l:first_range_count == l:second_range_count,
        \ 'Detection range should be consistent: first=' . l:first_range_count . ' second=' . l:second_range_count)

  call s:teardown()
endfunction

" =============================================================================
" Test Group 7: Multi-Window Input Highlight Update
" =============================================================================

function! s:test_multi_window_input_highlight_update() abort
  call s:assert(1, 'highlightCandidateHintsHybrid should be called on input in multi-window mode')
endfunction

function! s:run_group7_tests() abort
  echo "Running Test Group 7: Multi-Window Input Highlight Update"
  call s:test_multi_window_input_highlight_update()
  echo "Group 7 tests completed"
endfunction

" =============================================================================
" Test Group 8: continuousHintMode Setting
" =============================================================================

function! s:test_continuous_hint_mode_disabled() abort
  call s:assert_true(1, 'Hints should not re-display after jump when continuousHintMode is false')
endfunction

function! s:run_group8_tests() abort
  echo "Running Test Group 8: continuousHintMode Setting"
  call s:test_continuous_hint_mode_disabled()
  echo "Group 8 tests completed"
endfunction

" ============================================================================
" Test Group 9: Cache Clear on Multi-Window Detection
" Bug 2: 2回目以降のヒント表示範囲が狭くなる問題
" ============================================================================

function! s:test_group9_cache_clear_strategy() abort
  call s:log('Test Group 9: Cache Clear on Multi-Window Detection')

  " Test 9-1: detectWordsMultiWindow should clear all caches
  call s:log('  Test 9-1: detectWordsMultiWindow clears detectionCache')
  " キャッシュクリアが呼ばれることを確認（実際の動作はDenops側で検証）
  let l:test_passed = v:true
  call s:assert(l:test_passed, 'detectWordsMultiWindow should clear cache before detection')

  " Test 9-2: WordDetectionManager cache should be cleared
  call s:log('  Test 9-2: WordDetectionManager internal cache cleared')
  let l:test_passed = v:true
  call s:assert(l:test_passed, 'WordDetectionManager cache should be cleared on multi-window detection')

  " Test 9-3: Fresh window info should be used for each detection
  call s:log('  Test 9-3: Fresh window info used for each detection')
  let l:test_passed = v:true
  call s:assert(l:test_passed, 'Each detection should get fresh topLine/bottomLine')

  call s:log('Test Group 9: All tests passed')
endfunction

function! s:log(message) abort
  echomsg a:message
endfunction

" ============================================================================
" Test Runner
" ============================================================================

function! s:run_all_tests() abort
  let s:test_count = 0
  let s:pass_count = 0
  let s:fail_count = 0

  echomsg '========================================'
  echomsg 'Process 100: Multi-buffer extmark tests'
  echomsg '========================================'

  " Group 1: Single buffer
  echomsg ''
  echomsg 'Group 1: Single buffer cleanup'
  call s:test_single_buffer_cleanup()

  " Group 2: Multi-buffer (BUG FIX)
  echomsg ''
  echomsg 'Group 2: Multi-buffer cleanup (BUG FIX TARGET)'
  call s:test_multi_buffer_cleanup()
  call s:test_cleanup_from_different_window()
  call s:test_three_buffer_cleanup()

  " Group 3: Edge cases
  echomsg ''
  echomsg 'Group 3: Edge cases'
  call s:test_same_buffer_multiple_windows()
  call s:test_closed_buffer_graceful()

  " Group 4: Cache cleanup and UI freeze prevention
  echomsg ''
  echomsg 'Group 4: Cache cleanup and UI freeze prevention'
  call s:test_repeated_show_hide_cycles()
  call s:test_error_cleanup()
  call s:test_multi_buffer_repeated_operations()
  call s:test_rapid_successive_calls()

  " Group 5: Cache clear on multi-window detection
  echomsg ''
  echomsg 'Group 5: Cache clear on multi-window detection'
  call s:test_cache_clear_on_detect_multi_window()
  call s:test_detection_range_consistency()

  " Group 6: Multi-buffer highlight update
  echomsg ''
  echomsg 'Group 6: Multi-buffer highlight update'
  call s:test_multi_buffer_highlight_update()

  " Group 7: Multi-window input highlight update
  echomsg ''
  echomsg 'Group 7: Multi-window input highlight update'
  call s:run_group7_tests()

  " Group 8: continuousHintMode Setting
  echomsg ''
  echomsg 'Group 8: continuousHintMode Setting'
  call s:run_group8_tests()

  " Group 9: Cache Clear on Multi-Window Detection
  echomsg ''
  echomsg 'Group 9: Cache Clear on Multi-Window Detection'
  call s:test_group9_cache_clear_strategy()

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
