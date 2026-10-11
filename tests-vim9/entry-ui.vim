vim9script
import autoload '../autoload/hellshake_yano/native/runtime.vim' as Runtime

def Run()
  try
    runtime plugin/hellshake-yano-native.vim
    assert_false(exists('g:loaded_hellshake_yano_native'))
    assert_equal(0, exists(':HellshakeYanoShow'))
    g:hellshake_yano_native = true
    g:hellshake_yano = {motionTimeout: 0}
    var failed = false
    try
      runtime plugin/hellshake-yano-native.vim
    catch
      failed = true
    endtry
    assert_true(failed, 'invalid setup must fail visibly')
    assert_false(exists('g:loaded_hellshake_yano_native'))
    assert_equal(0, exists(':HellshakeYanoShow'))
    g:hellshake_yano = {singleCharKeys: ['A', 'S'], multiCharKeys: ['B'], suppressOnKeyRepeat: false}
    nnoremap h gh
    runtime! plugin/hellshake-yano*.vim
    assert_equal(1, g:loaded_hellshake_yano_native)
    assert_true(g:hellshake_yano_vim_native_bridge)
    assert_false(exists('g:loaded_hellshake_yano_unified'))
    assert_false(exists('g:loaded_hellshake_yano_vim'))
    assert_equal(0, exists('*denops#request'))
    assert_equal('gh', maparg('h', 'n'))
    assert_match('native#runtime#Expression', maparg('j', 'n'))
    runtime! plugin/hellshake-yano*.vim
    execute 'HellshakeYanoSetCount 4'
    assert_equal(4, Runtime.Config().defaultMotionCount)
    execute 'HellshakeYanoSetTimeout 100'
    assert_equal(100, Runtime.Config().motionTimeout)
    failed = false
    try
      execute 'HellshakeYanoSetCount invalid'
    catch
      failed = true
    endtry
    assert_true(failed)
    assert_equal(4, Runtime.Config().defaultMotionCount)
    assert_match('native#runtime#Expression', maparg('j', 'n'))
    execute 'HellshakeYanoSetHighlight Error Search'
    assert_equal('Error', Runtime.Config().highlightHintMarker)
    execute 'HellshakeYanoSetCountedMotions j k'
    assert_equal(['j', 'k'], Runtime.Config().countedMotions)
    execute 'HellshakeYanoDebug'
    execute 'HellshakeYanoDebugConfig'
    execute 'HellshakeYanoDisable'
    assert_equal('disabled', Runtime.Show())
    execute 'HellshakeYanoEnable'
    setline(1, 'alpha beta')
    redraw!
    feedkeys('A', 'nt')
    execute 'HellshakeYanoShow'
    assert_equal(7, col('.'))
    assert_false(exists('g:hellshake_yano_native_error'))
    assert_equal([], popup_list())
  catch
    add(v:errors, v:exception .. ' at ' .. v:throwpoint)
  finally
    Runtime.DisableBridge()
    Runtime.Deactivate()
  endtry
  writefile(empty(v:errors) ? ['PASS Vim9 explicit native plugin startup, failure retry, guarded legacy entries and commands'] : v:errors, $HY_VIM9_UI_RESULT)
  if !empty(v:errors)
    cquit
  endif
  qa!
enddef
timer_start(100, (_) => Run())
