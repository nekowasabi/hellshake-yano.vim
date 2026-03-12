" tests-vim/test_window_detector_floating.vim
" Neovim floating window フィルタリングのテスト
"
" Phase: MW-1 Multi-Window Support
" TDD: RED -> GREEN -> REFACTOR

let s:test_count = 0
let s:pass_count = 0
let s:fail_count = 0
let s:skip_count = 0

function! s:assert_true(condition, message) abort
  let s:test_count += 1
  if a:condition
    let s:pass_count += 1
    echom 'PASS: ' . a:message
  else
    let s:fail_count += 1
    echom 'FAIL: ' . a:message
  endif
endfunction

function! s:assert_false(condition, message) abort
  call s:assert_true(!a:condition, a:message)
endfunction

function! s:skip(message) abort
  let s:test_count += 1
  let s:skip_count += 1
  echom 'SKIP: ' . a:message
endfunction

" =============================================================================
" Test Group 1: Floating Window Exclusion (Neovim only)
" =============================================================================

function! s:test_excludes_floating_windows() abort
  " Neovim 専用テスト
  if !has('nvim')
    call s:skip('Neovim only test - floating window exclusion')
    return
  endif

  " floating window を作成
  let l:buf = nvim_create_buf(v:false, v:true)
  let l:float_win = nvim_open_win(l:buf, v:false, {
        \ 'relative': 'editor',
        \ 'width': 10,
        \ 'height': 10,
        \ 'row': 1,
        \ 'col': 1,
        \ })

  try
    let l:visible = hellshake_yano_vim#window_detector#get_visible()
    " floating window の winid は含まれないはず
    let l:winids = map(copy(l:visible), {_, v -> v.winid})
    call s:assert_false(index(l:winids, l:float_win) >= 0,
          \ 'Floating window should be excluded from get_visible()')
  finally
    " クリーンアップ
    if nvim_win_is_valid(l:float_win)
      call nvim_win_close(l:float_win, v:true)
    endif
    execute 'bwipeout!' l:buf
  endtry
endfunction

function! s:test_includes_normal_windows() abort
  " 通常ウィンドウは含まれることを確認
  let l:current_winid = win_getid()
  let l:visible = hellshake_yano_vim#window_detector#get_visible()
  let l:winids = map(copy(l:visible), {_, v -> v.winid})

  call s:assert_true(index(l:winids, l:current_winid) >= 0,
        \ 'Normal window should be included in get_visible()')
endfunction

function! s:test_excludes_relative_cursor_window() abort
  " Neovim 専用テスト - relative='cursor' のウィンドウ
  if !has('nvim')
    call s:skip('Neovim only test - relative cursor window')
    return
  endif

  let l:buf = nvim_create_buf(v:false, v:true)
  let l:float_win = nvim_open_win(l:buf, v:false, {
        \ 'relative': 'cursor',
        \ 'width': 5,
        \ 'height': 3,
        \ 'row': 0,
        \ 'col': 0,
        \ })

  try
    let l:visible = hellshake_yano_vim#window_detector#get_visible()
    let l:winids = map(copy(l:visible), {_, v -> v.winid})
    call s:assert_false(index(l:winids, l:float_win) >= 0,
          \ 'Relative cursor window should be excluded')
  finally
    if nvim_win_is_valid(l:float_win)
      call nvim_win_close(l:float_win, v:true)
    endif
    execute 'bwipeout!' l:buf
  endtry
endfunction

function! s:test_excludes_relative_win_window() abort
  " Neovim 専用テスト - relative='win' のウィンドウ
  if !has('nvim')
    call s:skip('Neovim only test - relative win window')
    return
  endif

  let l:buf = nvim_create_buf(v:false, v:true)
  let l:float_win = nvim_open_win(l:buf, v:false, {
        \ 'relative': 'win',
        \ 'win': win_getid(),
        \ 'width': 5,
        \ 'height': 3,
        \ 'row': 0,
        \ 'col': 0,
        \ })

  try
    let l:visible = hellshake_yano_vim#window_detector#get_visible()
    let l:winids = map(copy(l:visible), {_, v -> v.winid})
    call s:assert_false(index(l:winids, l:float_win) >= 0,
          \ 'Relative win window should be excluded')
  finally
    if nvim_win_is_valid(l:float_win)
      call nvim_win_close(l:float_win, v:true)
    endif
    execute 'bwipeout!' l:buf
  endtry
endfunction

" =============================================================================
" Test Group 2: Split Window Handling (Vim/Neovim common)
" =============================================================================

function! s:test_includes_split_windows() abort
  " 分割ウィンドウは含まれることを確認
  let l:original_winid = win_getid()

  " 垂直分割
  vsplit
  let l:split_winid = win_getid()

  try
    let l:visible = hellshake_yano_vim#window_detector#get_visible()
    let l:winids = map(copy(l:visible), {_, v -> v.winid})

    call s:assert_true(index(l:winids, l:original_winid) >= 0,
          \ 'Original window should be included after split')
    call s:assert_true(index(l:winids, l:split_winid) >= 0,
          \ 'Split window should be included')
  finally
    " 元に戻す
    close
  endtry
endfunction

function! s:test_multiple_splits_with_floating() abort
  " Neovim 専用: 複数分割 + floating の混在
  if !has('nvim')
    call s:skip('Neovim only test - multiple splits with floating')
    return
  endif

  let l:original_winid = win_getid()

  " 垂直分割
  vsplit
  let l:split1_winid = win_getid()

  " 水平分割
  split
  let l:split2_winid = win_getid()

  " floating window を作成
  let l:buf = nvim_create_buf(v:false, v:true)
  let l:float_win = nvim_open_win(l:buf, v:false, {
        \ 'relative': 'editor',
        \ 'width': 10,
        \ 'height': 5,
        \ 'row': 5,
        \ 'col': 5,
        \ })

  try
    let l:visible = hellshake_yano_vim#window_detector#get_visible()
    let l:winids = map(copy(l:visible), {_, v -> v.winid})

    " 通常ウィンドウは全て含まれる
    call s:assert_true(index(l:winids, l:original_winid) >= 0,
          \ 'Original window should be included')
    call s:assert_true(index(l:winids, l:split1_winid) >= 0,
          \ 'Split1 window should be included')
    call s:assert_true(index(l:winids, l:split2_winid) >= 0,
          \ 'Split2 window should be included')

    " floating は除外
    call s:assert_false(index(l:winids, l:float_win) >= 0,
          \ 'Floating window should be excluded')
  finally
    if nvim_win_is_valid(l:float_win)
      call nvim_win_close(l:float_win, v:true)
    endif
    execute 'bwipeout!' l:buf
    " 分割を閉じる
    only
  endtry
endfunction

" =============================================================================
" Test Group 3: Edge Cases
" =============================================================================

function! s:test_vim_compatibility() abort
  " Vim でもエラーなく動作することを確認
  if has('nvim')
    call s:skip('Vim only test - compatibility check')
    return
  endif

  " get_visible() がエラーなく実行できる
  try
    let l:visible = hellshake_yano_vim#window_detector#get_visible()
    call s:assert_true(type(l:visible) == v:t_list,
          \ 'get_visible() should return a list in Vim')
  catch
    call s:assert_true(v:false, 'get_visible() should not throw error in Vim: ' . v:exception)
  endtry
endfunction

" =============================================================================
" Run All Tests
" =============================================================================

function! RunFloatingWindowTests() abort
  let s:test_count = 0
  let s:pass_count = 0
  let s:fail_count = 0
  let s:skip_count = 0

  echom '========================================'
  echom 'Floating Window Detector Tests'
  echom '========================================'
  echom ''

  " Test Group 1: Floating Window Exclusion
  echom '--- Group 1: Floating Window Exclusion ---'
  call s:test_excludes_floating_windows()
  call s:test_includes_normal_windows()
  call s:test_excludes_relative_cursor_window()
  call s:test_excludes_relative_win_window()
  echom ''

  " Test Group 2: Split Window Handling
  echom '--- Group 2: Split Window Handling ---'
  call s:test_includes_split_windows()
  call s:test_multiple_splits_with_floating()
  echom ''

  " Test Group 3: Edge Cases
  echom '--- Group 3: Edge Cases ---'
  call s:test_vim_compatibility()
  echom ''

  echom '========================================'
  echom 'Results: ' . s:pass_count . '/' . s:test_count . ' PASSED'
  if s:skip_count > 0
    echom 'Skipped: ' . s:skip_count
  endif
  if s:fail_count > 0
    echom 'FAILED: ' . s:fail_count
  endif
  echom '========================================'

  return s:fail_count == 0
endfunction

" テスト実行
call RunFloatingWindowTests()
