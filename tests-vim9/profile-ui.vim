vim9script
# Synthetic configuration transcribed from the migration parity document.
# This is not the user's actual init.vim.
import autoload '../autoload/hellshake_yano/native/runtime.vim' as Runtime
import autoload '../autoload/hellshake_yano/native/core.vim' as Core
import autoload '../autoload/hellshake_yano/native/words.vim' as Words

def Run()
  var dictfile = tempname() .. '.yaml'
  try
    writefile(['customWords: [非同期処理]', 'hintPatterns:',
      "  - pattern: '^#+\\s+(.)'", '    captureGroup: 1', '    priority: 110'], dictfile)
    Runtime.Setup({
      useJapanese: true, enableTinySegmenter: true, wordDetectionStrategy: 'hybrid',
      segmenterThreshold: 3, japaneseMinWordLength: 5, japaneseMergeThreshold: 3,
      useHintGroups: true, highlightSelected: true, useNumericMultiCharHints: true,
      singleCharKeys: '/', multiCharKeys: 'BCDEGHJKLMNOQRSUWZ',
      perKeyMotionCount: {w: 2, b: 2, e: 2, h: 2, j: 2, k: 2, l: 2}, defaultMotionCount: 3,
      perKeyMinLength: {w: 3, b: 3, e: 3}, defaultMinWordLength: 3,
      cancelKeys: ['y', 'p', 'x', 'v', 'a', 'i', 'f', 'F', 't', 'T', '<CR>', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
      directionalHintFilter: true, multiWindowMode: true,
      multiWindowExcludeTypes: ['help', 'quickfix', 'terminal', 'popup'], multiWindowMaxWindows: 4,
      continuousHintMode: false, recenterCommand: 'normal! zz', maxContinuousJumps: 25,
      highlightHintMarker: {bg: 'black', fg: '#57FD14'}, highlightHintMarkerCurrent: {bg: 'Red', fg: 'White'},
      debugMode: false, dictionaryPath: dictfile,
    })
    Runtime.Activate()
    Runtime.EnableBridge()
    for key in ['h', 'j', 'k', 'l', 'w', 'b', 'e']
      assert_false(empty(maparg(key, 'n')), key .. ' missing mapping')
    endfor
    setline(1, ['alpha beta', '## important heading', '非同期処理を実行します'])
    var first = win_getid()
    vnew
    setline(1, ['another target', '日本語の文章を表示します'])
    redraw!
    var found = Words.Detect(Runtime.Config(), '', Runtime.GetDictionary())
    var targets = Core.Show(found)
    assert_true(len(targets) > 1)
    assert_equal('/', targets[0].hint)
    assert_true(len(filter(copy(targets), (_, t) => get(t, 'hintPriority', 0) == 110)) > 0)
    assert_true(len(filter(copy(targets), (_, t) => t.text ==# '非同期処理')) > 0)
    var selected = targets[0]
    Core.Hide()
    feedkeys('/', 'nt')
    assert_equal('jump', Runtime.Show())
    assert_equal([selected.winid, selected.line, selected.col], [win_getid(), line('.'), col('.')])
    cursor(1, 1)
    targets = Core.Show(Words.Detect(Runtime.Config(), '', Runtime.GetDictionary()))
    var others = filter(copy(targets), (_, t) => t.winid == first)
    assert_true(len(others) > 0)
    selected = others[0]
    Core.Hide()
    feedkeys(selected.hint, 'nt')
    assert_equal('jump', Runtime.Show())
    assert_equal([selected.winid, selected.line, selected.col], [win_getid(), line('.'), col('.')])
    assert_equal('#57FD14', hlget('HellshakeYanoNativeHint')[0].guifg)
    Runtime.Toggle()
    assert_equal('disabled', Runtime.Show())
    Runtime.Toggle()
    assert_true(Runtime.Config().enabled)
    assert_equal([], popup_list())
    assert_equal(-1, stridx(&runtimepath, '/plugged/'))
    assert_equal([], filter(getscriptinfo(), (_, item) => item.name =~# '/denops/'))
    if !empty($HY_EVIDENCE_DIR)
      mkdir($HY_EVIDENCE_DIR, 'p')
      writefile([&runtimepath], $HY_EVIDENCE_DIR .. '/vim-runtimepath.txt')
      writefile(split(execute('scriptnames'), "\n"), $HY_EVIDENCE_DIR .. '/vim-scriptnames.txt')
    endif
  catch
    add(v:errors, v:exception .. ' at ' .. v:throwpoint)
  finally
    Runtime.DisableBridge()
    Runtime.Deactivate()
    delete(dictfile)
  endtry
  writefile(empty(v:errors) ? ['PASS Vim9 synthetic profile: Japanese YAML dictionary, two windows, colors, mappings and native-only scripts'] : v:errors, $HY_VIM9_UI_RESULT)
  if !empty(v:errors)
    cquit
  endif
  qa!
enddef
timer_start(100, (_) => Run())
