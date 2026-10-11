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
    assert_equal(true, Dispatcher.Request('validateConfig', [{}]).valid)
    assert_equal(false, Dispatcher.Request('validateConfig', [{motionTimeout: 0}]).valid)
    assert_equal('invalid_params', Dispatcher.Request('motionDetect', [0, 1]).skipReason)
    Dispatcher.Request('motionSetThreshold', [4])
    Dispatcher.Request('motionSetTimeout', [400])
    assert_equal(4, Dispatcher.Request('motionGetState', []).threshold)
    assert_equal(400, Dispatcher.Request('motionGetState', []).timeoutMs)
    Dispatcher.Request('motionResetState', [])
    assert_equal(0, Dispatcher.Request('motionGetState', []).motionCount)
    assert_equal('none', Dispatcher.Request('getVisualRange', []).mode)
    assert_equal(3, len(Dispatcher.Request('detectWordsInVisualRange', [])))
    assert_equal('HintMarker', Dispatcher.Request('getHighlightGroup', ['normal']))
    Dispatcher.Request('healthCheck', [])
    var rejected = false
    try
      Dispatcher.Request('notARealMethod', [])
    catch /^hellshake-yano:/
      rejected = true
    endtry
    assert_true(rejected)

    var stats = Dispatcher.Request('getStatistics', [])
    assert_true(stats.performanceStats.wordDetection.count > 0)
    assert_equal(0, stats.cacheStats.words.size)
    var debug = Dispatcher.Request('debug', [])
    assert_equal(Runtime.Config(), debug.config)
    assert_true(debug.timestamp > 0)
    hellshake_yano_vim#display#highlight_partial_matches(['AB'])
    assert_equal(1, Dispatcher.Request('displayGetPopupCount', []))
    assert_equal({}, popup_getpos(second))
    hellshake_yano_vim#display#hide_all()
    assert_equal([], popup_list())
    var foreign = popup_create('foreign', {line: 5, col: 1})
    var owned = Dispatcher.Request('displayShowHint', [1, 7, 'A'])
    Runtime.Hide()
    assert_equal({}, popup_getpos(owned))
    assert_false(empty(popup_getpos(foreign)))
    popup_close(foreign)

    hellshake_yano_vim#backend#request('hellshake-yano', 'updateConfig', [{singleCharKeys: ['Q']}])
    assert_equal(['Q', 'BB'], hellshake_yano_vim#hint_generator#generate(2))
    hellshake_yano_vim#backend#notify('hellshake-yano', 'disable', [])
    Runtime.DisableBridge()
    sleep 20m
    assert_true(Runtime.Config().enabled)
    assert_false(hellshake_yano_vim#backend#is_native())
    var dir = tempname()
    mkdir(dir, 'p')
    try
      var path = dir .. '/dictionary % # | safe.json'
      writefile(['{"customWords":["old"]}'], path)
      Runtime.Setup({dictionaryPath: path})
      Runtime.EnableBridge()
      assert_true(hellshake_yano_vim#dictionary#add('newword', 'meaning', 'noun'))
      assert_true(hellshake_yano_vim#dictionary#is_in_dictionary('newword'))
      assert_equal(['old', 'newword'], Runtime.GetDictionary().customWords)
      # The UI commands do not interpret %, # or | from the file path.
      set nomodified
      Runtime.EditDictionary()
      assert_equal(fnamemodify(path, ':p'), expand('%:p'))
      Runtime.ShowDictionary()
      assert_equal('nofile', &buftype)
      assert_false(&modifiable)
      assert_equal(['old', 'newword'], json_decode(getline(1)).customWords)
      close
    finally
      Runtime.DisableBridge()
      delete(dir, 'rf')
    endtry

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
