vim9script
import autoload '../autoload/hellshake_yano/native/words.vim' as Words
for f in json_decode(join(readfile('tests-lua/fixtures/regex-words.json'), "\n"))
  assert_equal(f.expected, Words.Extract(f.text, 1, {useJapanese: f.useJapanese,
    defaultMinWordLength: f.minimum, wordDetectionStrategy: 'regex'}), f.text)
endfor
var config = {useJapanese: true, wordDetectionStrategy: 'tinysegmenter',
  japaneseMergeParticles: false, japaneseMinWordLength: 2}
var found = Words.Extract('私の名前は中野です', 1, config)
assert_equal(['名前', '中野', 'です'], map(copy(found), (_, w) => w.text))
assert_equal([7, 16, 22], map(copy(found), (_, w) => w.col))
config.japaneseMergeParticles = true
found = Words.Extract('私の名前は中野です', 1, config)
assert_equal(['私の', '名前は', '中野です'], map(copy(found), (_, w) => w.text))
assert_equal([], Words.Extract('tiny', 1, {perKeyMinLength: {j: 5}}, 'j'))
setline(1, ['alpha beta', 'hidden word', 'visible delta'])
set foldmethod=manual foldminlines=0 foldlevel=0
:2fold
var win = win_getid()
found = Words.Detect({defaultMinWordLength: 3})
assert_equal(['alpha', 'beta', 'visible', 'delta'], map(copy(found), (_, w) => w.text))
assert_equal([win], Words.Windows({}))
vsplit
var other = win_getid()
assert_equal([other, win], Words.Windows({multiWindowMode: true}))
assert_equal([other], Words.Windows({multiWindowMode: true, multiWindowMaxWindows: 1}))
if !empty(v:errors)
  writefile(v:errors, '/dev/stderr', 'a')
  cquit
endif
qa!
