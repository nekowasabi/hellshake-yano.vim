vim9script
import autoload '../autoload/hellshake_yano/native/runtime.vim' as Runtime
nnoremap j gj
command HellshakeYanoShow echo 'user command'
Runtime.Setup({suppressOnKeyRepeat: false, defaultMotionCount: 2})
Runtime.Activate()
assert_equal('gj', maparg('j', 'n'))
assert_match('runtime#Expression', maparg('k', 'n'))
assert_match('user command', execute('command HellshakeYanoShow'))
assert_equal(2, exists(':HellshakeYanoHide'))
nnoremap k gk
command! HellshakeYanoHide echo 'replacement'
Runtime.Deactivate()
assert_equal('gj', maparg('j', 'n'))
assert_equal('gk', maparg('k', 'n'))
assert_equal('', maparg('h', 'n'))
assert_equal('', maparg('j', 'x'))
assert_match('replacement', execute('command HellshakeYanoHide'))
assert_equal(0, exists(':HellshakeYanoEnable'))
Runtime.Setup({countedMotions: ['<Down>', '|'], triggerOnHjkl: false})
Runtime.Activate()
assert_match('Expression', maparg('<Down>', 'n'))
assert_equal("\<Down>", Runtime.Expression('<Down>'))
assert_match('Expression', maparg('|', 'n'))
Runtime.Deactivate()
assert_equal('', maparg('<Down>', 'n'))
assert_equal('', maparg('|', 'n'))
if !empty(v:errors)
  writefile(v:errors, '/dev/stderr', 'a')
  cquit
endif
writefile(['PASS Vim9 activation: ownership-aware maps and commands'], '/dev/stdout', 'a')
qa!
