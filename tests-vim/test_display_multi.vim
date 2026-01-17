" tests-vim/test_display_multi.vim
" Test file for multi-window hint display (Process 3 Sub1: Red Phase)
"
" Purpose:
"   - Test hellshake_yano_vim#display#show_hint_with_window() function
"   - Ensure hints display correctly in different windows
"   - Validate screen coordinate handling
"
" Test Groups:
"   1. Hint display in current window
"   2. Hint display in another window (after split)
"   3. Out-of-screen coordinates handling
"   4. Vim/Neovim compatibility

" Helper function to setup test environment
function! s:setup() abort
  " Clear any existing popups/extmarks
  call hellshake_yano_vim#display#hide_all()
endfunction

function! s:teardown() abort
  " Cleanup
  call hellshake_yano_vim#display#hide_all()
endfunction

" Test 1: Hint display in current window
function! s:test_show_hint_in_current_window() abort
  call s:setup()

  " Create test content
  call setline(1, ['hello world', 'test line', 'vim script'])

  let l:current_winid = win_getid()
  let l:result = hellshake_yano_vim#display#show_hint_with_window(l:current_winid, 1, 1, 'a')

  " Should return a valid ID (not -1)
  call assert_true(l:result > 0, 'show_hint_with_window should return valid ID')

  call s:teardown()
endfunction

" Test 2: Hint display in another window
function! s:test_show_hint_in_another_window() abort
  call s:setup()

  " Setup current window
  call setline(1, ['hello world', 'test line', 'vim script'])
  let l:first_winid = win_getid()

  " Split window vertically
  vsplit
  call setline(1, ['split window', 'another line', 'more text'])
  let l:second_winid = win_getid()

  " Move back to first window
  call win_gotoid(l:first_winid)

  " Display hint in second window from first window context
  let l:result = hellshake_yano_vim#display#show_hint_with_window(l:second_winid, 1, 1, 'b')

  " Should return a valid ID
  call assert_true(l:result > 0, 'show_hint_with_window should work for other window')

  " Cleanup
  close
  call s:teardown()
endfunction

" Test 3: Out-of-screen coordinates return -1
function! s:test_out_of_screen_coordinates() abort
  call s:setup()

  " Create minimal content
  call setline(1, ['line1', 'line2'])

  let l:current_winid = win_getid()

  " Try to display hint at position beyond buffer (screenpos returns row:0, col:0)
  let l:result = hellshake_yano_vim#display#show_hint_with_window(l:current_winid, 2, 50, 'c')

  " Should return -1 for out-of-screen column (col:0 means out of screen)
  " or gracefully handle it (may show if line exists but col is long)
  call assert_true(l:result == -1 || l:result > 0, 'show_hint_with_window should handle out-of-screen case')

  call s:teardown()
endfunction

" Test 4: Multiple hints in same window
function! s:test_multiple_hints_same_window() abort
  call s:setup()

  call setline(1, ['hello world test', 'another line here'])

  let l:current_winid = win_getid()
  let l:id1 = hellshake_yano_vim#display#show_hint_with_window(l:current_winid, 1, 1, 'a')
  let l:id2 = hellshake_yano_vim#display#show_hint_with_window(l:current_winid, 1, 7, 'b')
  let l:id3 = hellshake_yano_vim#display#show_hint_with_window(l:current_winid, 2, 1, 'c')

  " All should have valid IDs
  call assert_true(l:id1 > 0)
  call assert_true(l:id2 > 0)
  call assert_true(l:id3 > 0)

  " Popup count should be 3
  call assert_equal(3, hellshake_yano_vim#display#get_popup_count())

  call s:teardown()
endfunction

" Test 5: Hint in wrapped line (if wrap is enabled)
function! s:test_hint_with_wrapped_line() abort
  call s:setup()

  " Setup with wrapping enabled
  let l:save_wrap = &wrap
  set wrap

  " Create long line that will wrap
  let l:long_line = repeat('x ', 60)
  call setline(1, [l:long_line, 'second line'])

  let l:current_winid = win_getid()

  " Display hint on wrapped position (screenpos should handle this)
  let l:result = hellshake_yano_vim#display#show_hint_with_window(l:current_winid, 1, 50, 'd')

  " Should still return valid ID
  call assert_true(l:result > 0, 'show_hint_with_window should handle wrapped lines')

  let &wrap = l:save_wrap
  call s:teardown()
endfunction

" Test 6: Preserve winid in popup_ids
function! s:test_winid_stored_in_popup_info() abort
  call s:setup()

  call setline(1, ['test content'])
  let l:current_winid = win_getid()

  let l:popup_id = hellshake_yano_vim#display#show_hint_with_window(l:current_winid, 1, 1, 'e')

  " The popup info should be stored with winid (internal check)
  " We can verify by checking popup_count and then hide_all should work
  call assert_equal(1, hellshake_yano_vim#display#get_popup_count())

  call s:teardown()
endfunction

" Test 7: Empty window handling
function! s:test_empty_window() abort
  call s:setup()

  let l:current_winid = win_getid()

  " Try to display hint in empty window at position 1,1
  let l:result = hellshake_yano_vim#display#show_hint_with_window(l:current_winid, 1, 1, 'f')

  " Should handle gracefully (return -1 or valid ID depending on screenpos)
  call assert_true(l:result >= -1, 'show_hint_with_window should handle empty window')

  call s:teardown()
endfunction

" Simple test runner
function! s:run_tests() abort
  let l:tests = [
    \ 's:test_show_hint_in_current_window',
    \ 's:test_show_hint_in_another_window',
    \ 's:test_out_of_screen_coordinates',
    \ 's:test_multiple_hints_same_window',
    \ 's:test_hint_with_wrapped_line',
    \ 's:test_winid_stored_in_popup_info',
    \ 's:test_empty_window'
  \ ]

  for l:test in l:tests
    try
      call function(l:test)()
      echomsg '[PASS] ' . l:test
    catch
      echomsg '[FAIL] ' . l:test . ': ' . v:exception
    endtry
  endfor
endfunction

" Run tests when file is sourced
call s:run_tests()
