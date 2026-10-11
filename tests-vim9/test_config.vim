vim9script
import autoload '../autoload/hellshake_yano/native/config.vim' as Config
var config = Config.Resolve({motion_count: 5, directional_hint_filter: 1, singleCharKeys: '/'})
assert_equal(5, config.defaultMotionCount)
assert_equal(5, config.motionCount)
assert_equal(true, config.directionalHintFilter)
assert_equal('/', config.singleCharKeys)
assert_equal(['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'N', 'M', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], Config.Resolve().singleCharKeys)
assert_equal(2, Config.Resolve({motion_count: 9, motionCount: 2}).motionCount)
for bad in [{motionTimeout: 0}, {singleCharKeys: ['AA']}, {multiCharKeys: ['!']},
    {enabled: 1}, {perKeyMinLength: {j: 0}}, {markers: []}, {hintPosition: 'bad'}]
  var failed = false
  try
    Config.Resolve(bad)
  catch /^hellshake-yano:/
    failed = true
  endtry
  assert_true(failed, string(bad))
endfor
if !empty(v:errors)
  writefile(v:errors, '/dev/stderr', 'a')
  cquit
endif
qa!
