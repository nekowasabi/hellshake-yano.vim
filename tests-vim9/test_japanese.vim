vim9script
import autoload '../autoload/hellshake_yano/native/segmenter.vim' as Segmenter
for fixture in json_decode(join(readfile('tests-lua/fixtures/tinysegmenter.json'), "\n"))
  assert_equal(fixture.segments, Segmenter.Segment(fixture.text), fixture.text)
endfor
assert_equal('😀日本語😀', join(Segmenter.Segment('😀日本語😀'), ''))
assert_equal([], Segmenter.Process('　', true))
assert_equal(['(の'], Segmenter.Process('(の', true))
assert_equal(['2026年', '10月', '11日'], Segmenter.Process('2026年10月11日', true))
if !empty(v:errors)
  writefile(v:errors, '/dev/stderr')
  cquit
endif
writefile(['PASS Vim9 TinySegmenter: 27 upstream fixtures and postprocessing'], '/dev/stdout')
qa!
