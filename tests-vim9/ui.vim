vim9script
import autoload '../autoload/hellshake_yano/native/core.vim' as Core
import autoload '../autoload/hellshake_yano/native/words.vim' as Words

def Run()
  try
    set noswapfile nowrap laststatus=0 noruler noshowcmd
    setline(1, ['alpha 日本語 beta gamma', repeat('outside ', 20)])
    var original = win_getid()
    var buf = bufnr()
    Core.Setup({singleCharKeys: 'AS', multiCharKeys: 'BC', hintPosition: 'end'})
    Core.Show([{line: 1, col: 7, text: '日本語', winid: original, bufnr: buf}])
    redraw!
    var pos = screenpos(original, 1, 13)
    var popup = popup_getpos(Core.State().popup_ids[0])
    assert_equal([pos.row, pos.col], [popup.line, popup.col])
    assert_equal('A', screenstring(pos.row, pos.col))
    Core.Hide()
    redraw!
    assert_equal('語', screenstring(pos.row, pos.col))

    vsplit
    var current = win_getid()
    var count_windows = winnr('$')
    Core.Setup({singleCharKeys: 'AS', multiCharKeys: 'BC', multiWindowMode: true})
    var words = [{line: 1, col: 7, text: '日本語', winid: original, bufnr: buf},
      {line: 1, col: 7, text: '日本語', winid: current, bufnr: buf}]
    for i in range(10)
      var targets = Core.Show(words)
      redraw!
      assert_equal([current, original], map(copy(targets), (_, t) => t.winid))
      assert_equal('A', screenstring(screenpos(current, 1, 7).row, screenpos(current, 1, 7).col))
      assert_equal('S', screenstring(screenpos(original, 1, 7).row, screenpos(original, 1, 7).col))
      assert_equal('cancelled', Core.Input("\<Esc>").status)
      redraw!
      assert_equal([], popup_list())
      assert_equal(count_windows, winnr('$'))
    endfor
    Core.Show(words)
    assert_equal('jump', Core.Input('S').status)
    assert_equal(original, win_getid())
    assert_equal(7, col('.'))

    # Window-local detection must not enter windows or change cursor/view.
    var before = winsaveview()
    g:hy_test_enter = 0
    augroup HyVim9UiTest
      autocmd!
      autocmd WinEnter * g:hy_test_enter += 1
    augroup END
    var found = Words.Detect({useJapanese: true, multiWindowMode: true})
    assert_true(len(found) > 2)
    assert_equal(0, g:hy_test_enter)
    assert_equal(before, winsaveview())
    augroup HyVim9UiTest
      autocmd!
    augroup END
    unlet g:hy_test_enter

    # A closed target window invalidates the target, without moving elsewhere.
    cursor(1, 1)
    Core.Show([{line: 1, col: 7, text: '日本語', winid: current, bufnr: buf}])
    win_execute(current, 'close')
    assert_equal('stale', Core.Input('A').status)
    assert_equal([], popup_list())
  catch
    add(v:errors, v:exception .. ' at ' .. v:throwpoint)
  finally
    Core.Hide()
  endtry
  writefile(empty(v:errors) ? ['PASS Vim9 real terminal UI: Japanese, same-buffer windows, cleanup and stale targets'] : v:errors, $HY_VIM9_UI_RESULT)
  if !empty(v:errors)
    cquit
  endif
  qa!
enddef

timer_start(100, (_) => Run())
