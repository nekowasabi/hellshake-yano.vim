vim9script
import autoload '../autoload/hellshake_yano/native/core.vim' as Core
set lines=30 columns=100
setline(1, ['alpha beta gamma', '日本語 delta'])
var win = win_getid()
var buf = bufnr()
var words = [{line: 1, col: 7, text: 'beta', winid: win, bufnr: buf},
  {line: 1, col: 12, text: 'gamma', winid: win, bufnr: buf}]
Core.Setup({singleCharKeys: 'AS', multiCharKeys: 'BC'})
var targets = Core.Show(words)
assert_equal(2, len(targets))
assert_equal(2, len(popup_list()))
assert_true(Core.State().visible)
assert_equal({status: 'replay', key: 'j'}, Core.Input('j'))
assert_equal([], popup_list())
Core.Show(words)
assert_equal('jump', Core.Input('A').status)
assert_equal([1, 7], [line('.'), col('.')])
assert_equal([], popup_list())

# A changed buffer is stale; never jump using old coordinates.
cursor(1, 1)
Core.Show(words)
setline(1, 'changed buffer')
assert_equal('stale', Core.Input('A').status)
assert_equal([1, 1], [line('.'), col('.')])
assert_equal([], popup_list())
setline(1, 'alpha beta gamma')
Core.Setup({singleCharKeys: '', multiCharKeys: 'BC'})
Core.Show(words)
assert_equal('partial', Core.Input('B').status)
assert_equal('B', Core.State().prefix)
assert_equal('cancelled', Core.Input("\<Esc>").status)
assert_equal([], popup_list())
for i in range(10)
  Core.Show(words)
  Core.Show(words)
  Core.Hide()
endfor
assert_equal([], popup_list())
Core.Hide()

# Valid single-window labels beat cancel keys, lowercase still replays.
Core.Setup({singleCharKeys: 'AS', multiCharKeys: '', cancelKeys: ['a']})
Core.Show(words)
assert_equal('jump', Core.Input('A').status)
cursor(1, 1)
Core.Show(words)
assert_equal({status: 'replay', key: 'a'}, Core.Input('a'))
Core.Setup({singleCharKeys: 'AS', multiCharKeys: '', multiWindowMode: true, cancelKeys: ['a']})
Core.Show(words)
assert_equal({status: 'replay', key: 'A'}, Core.Input('A'))
Core.Show(words)
assert_equal('cancelled', Core.Input('z').status)
Core.Setup({singleCharKeys: '0', multiCharKeys: '', useNumericMultiCharHints: true})
Core.Show(words)
assert_equal('partial', Core.Input('0').status)
assert_equal('jump', Core.Input('1').status)
cursor(1, 1)
Core.Setup({singleCharKeys: '0', multiCharKeys: '', useNumericMultiCharHints: true, useHintGroups: false})
Core.Show(words)
assert_equal('jump', Core.Input('0').status)

if !empty(v:errors)
  writefile(v:errors, '/dev/stderr')
  cquit
endif
writefile(['PASS Vim9 core: popup lifecycle, input and stale targets'], '/dev/stdout')
qa!
