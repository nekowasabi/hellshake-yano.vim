vim9script
import autoload '../autoload/hellshake_yano/native/runtime.vim' as Runtime
import autoload '../autoload/hellshake_yano/native/core.vim' as Core

def Run()
  try
    setline(1, ['alpha beta gamma', 'delta epsilon'])
    Runtime.Setup({singleCharKeys: ['A', 'S'], multiCharKeys: ['B', 'C'], motionTimeout: 100})
    feedkeys('A', 'nt')
    assert_equal('jump', Runtime.Show())
    assert_equal([1, 7], [line('.'), col('.')])
    assert_equal([], popup_list())
    cursor(1, 1)
    assert_equal('timeout', Runtime.Show())
    assert_equal([], popup_list())
    timer_start(10, (_) => Runtime.Hide())
    assert_equal('cancelled', Runtime.Show())
    assert_equal([], popup_list())
    Runtime.Enable(false)
    assert_equal('disabled', Runtime.Show())
    Runtime.Enable(true)
    Runtime.Setup({singleCharKeys: ['A', 'S'], multiCharKeys: ['B'], continuousHintMode: true,
      maxContinuousJumps: 2, motionTimeout: 100})
    feedkeys('AA', 'nt')
    assert_equal('jump', Runtime.Show())
    assert_equal([], popup_list())
    Runtime.Setup({singleCharKeys: ['A', 'S'], multiCharKeys: ['B'],
      defaultMotionCount: 2, suppressOnKeyRepeat: false, motionTimeout: 100})
    Runtime.Activate()
    setline(1, ['alpha beta gamma', 'delta epsilon', 'theta iota'])
    cursor(1, 1)
    feedkeys('jjA', 'xt')
    assert_equal([3, 7], [line('.'), col('.')])
    assert_equal([], popup_list())
    cursor(1, 1)
    feedkeys('vjjA', 'xt')
    assert_equal('v', mode())
    assert_equal([1, 1], getpos('v')[1 : 2])
    assert_equal([3, 7], [line('.'), col('.')])
    feedkeys("\<Esc>", 'xt')
    Runtime.Deactivate()
    var prior = Runtime.Config()
    try
      Runtime.Setup({motionTimeout: 0})
    catch /^hellshake-yano:/
    endtry
    assert_equal(prior, Runtime.Config())
  catch
    add(v:errors, v:exception .. ' at ' .. v:throwpoint)
  finally
    Runtime.Hide()
  endtry
  writefile(empty(v:errors) ? ['PASS Vim9 runtime UI: queued input, timeout, timer cancellation and bounded jumps'] : v:errors, $HY_VIM9_UI_RESULT)
  if !empty(v:errors)
    cquit
  endif
  qa!
enddef
timer_start(100, (_) => Run())
