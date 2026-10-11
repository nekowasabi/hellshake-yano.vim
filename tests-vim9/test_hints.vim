vim9script
import autoload '../autoload/hellshake_yano/native/hints.vim' as Hints

for fixture in json_decode(join(readfile('tests-vim9/fixtures/hints.json'), "\n"))
  assert_equal(fixture.expected, Hints.Generate(fixture.count, fixture.config))
endfor
assert_equal(['/', 'BB', 'BC', 'CB', 'CC', '01', '02'], Hints.Generate(7,
  {singleCharKeys: '/', multiCharKeys: 'BC', useNumericMultiCharHints: true}))
assert_equal([], Hints.Generate(0, {}))
assert_equal(['A'], Hints.Generate(20, {markers: 'AB', maxHints: 1}))
var words = [{line: 1, col: 1, text: '日本語', winid: 1}]
var targets = Hints.Assign(words, ['A', 'B'], {line: 2, col: 1, winid: 1},
  {hintPosition: 'both', bothMinWordLength: 3})
assert_equal([1, 7], map(copy(targets), (_, t) => t.col))
assert_equal(1, words[0].col)
assert_false(has_key(words[0], 'hint'))
assert_equal(4, Hints.Assign([{line: 1, col: 1, text: "cafe\u0301"}], ['A'],
  {line: 2, col: 1, winid: 1}, {hintPosition: 'end'})[0].col)
words = [{line: 1, col: 1, text: 'alpha', winid: 1},
  {line: 1, col: 1, text: 'alpha', winid: 2},
  {line: 2, col: 1, text: 'beta', winid: 1}]
targets = Hints.Assign(words, ['A', 'B'], {line: 1, col: 2, winid: 1}, {multiWindowMode: true})
assert_equal([1, 2], map(copy(targets), (_, t) => t.winid))
assert_equal(['beta', 'alpha'], map(copy(targets), (_, t) => t.text))
if !empty(v:errors)
  writefile(v:errors, '/dev/stderr', 'a')
  cquit
endif
writefile(['PASS Vim9 hints: 64 reference fixtures and byte-coordinate assignment'], '/dev/stdout', 'a')
qa!
