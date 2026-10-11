vim9script
import autoload '../autoload/hellshake_yano/native/legacy_motion.vim' as Motion
Motion.Setup({motionTimeout: 2000, motionCount: 3, defaultMotionCount: 3, perKeyMotionCount: {w: 2, j: 4}})
for f in json_decode(join(readfile('tests-vim9/fixtures/legacy-motion.json'), "\n"))
  assert_equal(f.expected, Motion.Detect(f.key, f.count, f.repeat, f.now))
  assert_equal(f.state, Motion.State())
endfor
Motion.Threshold(5)
Motion.Timeout(500)
assert_equal(5, Motion.State().threshold)
assert_equal(500, Motion.State().timeoutMs)
Motion.Reset()
assert_equal('', Motion.State().lastMotion)
assert_equal(0, Motion.State().motionCount)
if !empty(v:errors)
  writefile(v:errors, '/dev/stderr', 'a')
  cquit
endif
qa!
