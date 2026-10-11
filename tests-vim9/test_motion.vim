vim9script
import autoload '../autoload/hellshake_yano/native/motion.vim' as Motion
import autoload '../autoload/hellshake_yano/native/config.vim' as Config
var cfg = Config.Resolve({suppressOnKeyRepeat: false, perKeyMotionCount: {j: 2}, motionTimeout: 100})
assert_false(Motion.Record(1, 'j', 1, cfg, 0.0))
assert_false(Motion.Record(2, 'j', 1, cfg, 0.0))
assert_true(Motion.Record(1, 'j', 1, cfg, 60.0))
assert_false(Motion.Record(1, 'j', 3, cfg, 70.0))
assert_false(Motion.Record(1, 'j', 1, cfg, 80.0))
assert_false(Motion.Record(1, 'j', 1, cfg, 200.0))
assert_true(Motion.Record(1, 'j', 1, cfg, 210.0))
Motion.Reset()
cfg.suppressOnKeyRepeat = true
assert_false(Motion.Record(1, 'j', 1, cfg, 0.0))
assert_false(Motion.Record(1, 'j', 1, cfg, 10.0))
assert_false(Motion.Record(1, 'j', 1, cfg, 200.0))
assert_false(Motion.Record(1, 'j', 1, cfg, 400.0))
assert_true(Motion.Record(1, 'j', 1, cfg, 480.0))
if !empty(v:errors)
  writefile(v:errors, '/dev/stderr')
  cquit
endif
writefile(['PASS Vim9 motion: buffer/key counts, count-prefix bypass, timeout and repeat suppression'], '/dev/stdout')
qa!
