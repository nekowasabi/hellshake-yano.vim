vim.opt.runtimepath:prepend(vim.fn.getcwd())
local segmenter = require('hellshake_yano.segmenter')
local fixtures = vim.json.decode(table.concat(vim.fn.readfile('tests-lua/fixtures/tinysegmenter.json'), '\n'))
for _, fixture in ipairs(fixtures) do
  local actual = segmenter.segment(fixture.text)
  assert(vim.deep_equal(fixture.segments, actual), vim.inspect({text=fixture.text, expected=fixture.segments,actual=actual}))
end
local result = segmenter.segment('😀日本語😀')
assert(table.concat(result) == '😀日本語😀', 'must preserve whole UTF-8 characters')
local words = require('hellshake_yano.words')
local config = require('hellshake_yano.config')
local cfg = config.resolve({useJapanese=true, wordDetectionStrategy='tinysegmenter',
  japaneseMergeParticles=false, japaneseMinWordLength=2})
local found = words.extract('私の名前は中野です', 1, cfg, '')
assert(vim.deep_equal({'名前', '中野', 'です'}, vim.tbl_map(function(w) return w.text end, found)))
assert(vim.deep_equal({7, 16, 22}, vim.tbl_map(function(w) return w.col end, found)))
cfg.japaneseMergeParticles = true
found = words.extract('私の名前は中野です', 1, cfg, '')
assert(vim.deep_equal({'私の', '名前は', '中野です'}, vim.tbl_map(function(w) return w.text end, found)))
cfg.wordDetectionStrategy = 'hybrid'
found = words.extract('私の名前は中野です', 1, cfg, '')
assert(#found >= 3)
print(('PASS: %d TinySegmenter upstream fixtures and UTF-8 preservation'):format(#fixtures))
assert(vim.v.errmsg == '', vim.v.errmsg)
vim.cmd('qa!')
