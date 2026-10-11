vim9script
import autoload '../autoload/hellshake_yano/native/runtime.vim' as Runtime
import autoload '../autoload/hellshake_yano/native/dispatcher.vim' as Dispatcher

def Run()
  try
    Runtime.Setup({singleCharKeys: ['A', 'S'], multiCharKeys: ['B', 'C'], useJapanese: true})
    Runtime.EnableBridge()
    assert_true(hellshake_yano_vim#backend#is_native())
    assert_equal(['A', 'S', 'BB'], hellshake_yano_vim#hint_generator#generate(3))
    assert_equal(['私の', '名前は', '中野です'], hellshake_yano_vim#japanese#segment('私の名前は中野です').segments)
    setline(1, 'alpha beta gamma')
    var words = hellshake_yano_vim#word_detector#detect_visible()
    assert_equal(3, len(words))
    assert_equal({lnum: 1, col: 7, end_col: 11, text: 'beta', bufnr: bufnr(), winid: win_getid()}, words[1])
    var first = hellshake_yano_vim#display#show_hint(1, 7, 'AB')
    var second = hellshake_yano_vim#display#show_hint(1, 12, 'CD')
    assert_true(first > 0)
    assert_true(second > 0)
    assert_equal(2, Dispatcher.Request('displayGetPopupCount', []))
    hellshake_yano_vim#display#highlight_partial_matches(['AB'])
    assert_equal(1, Dispatcher.Request('displayGetPopupCount', []))
    assert_equal({}, popup_getpos(second))
    hellshake_yano_vim#display#hide_all()
    assert_equal([], popup_list())
    hellshake_yano_vim#backend#request('hellshake-yano', 'updateConfig', [{singleCharKeys: ['Q']}])
    assert_equal(['Q', 'BB'], hellshake_yano_vim#hint_generator#generate(2))
    hellshake_yano_vim#backend#notify('hellshake-yano', 'disable', [])
    Runtime.DisableBridge()
    sleep 20m
    assert_true(Runtime.Config().enabled)
    assert_false(hellshake_yano_vim#backend#is_native())
  catch
    add(v:errors, v:exception .. ' at ' .. v:throwpoint)
  finally
    Runtime.DisableBridge()
  endtry
  writefile(empty(v:errors) ? ['PASS Vim9 bridge UI: public word/Japanese/hint/display routes and opt-out cancellation'] : v:errors, $HY_VIM9_UI_RESULT)
  if !empty(v:errors)
    cquit
  endif
  qa!
enddef
timer_start(100, (_) => Run())
