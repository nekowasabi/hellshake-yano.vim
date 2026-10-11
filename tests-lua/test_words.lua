vim.opt.runtimepath:prepend(vim.fn.getcwd())
local words = require('hellshake_yano.words')
local config = require('hellshake_yano.config')
local function eq(a, b) assert(vim.deep_equal(a, b), vim.inspect({expected=a, actual=b})) end
local cfg = config.resolve({defaultMinWordLength=3})
local found = words.extract('\talpha snake_case 12 beta', 4, cfg, 'w')
eq({'alpha', 'snake', 'case', 'beta'}, vim.tbl_map(function(w) return w.text end, found))
eq({2, 8, 14, 22}, vim.tbl_map(function(w) return w.col end, found))
eq(4, found[1].line)
eq({}, words.extract('', 1, cfg, 'w'))
cfg = config.resolve({defaultMinWordLength=5, perKeyMinLength={w=2}})
eq(2, #words.extract('hi hello', 1, cfg, 'w'))
eq(1, #words.extract('hi hello', 1, cfg, 'b'))
cfg = config.resolve({useJapanese=true, enableTinySegmenter=false, wordDetectionStrategy='regex', defaultMinWordLength=1})
found = words.extract('日本語 alpha', 1, cfg, '')
eq('日本語', found[1].text)
eq(11, found[2].col)
eq(1, #words.extract('日本語 alpha', 1, config.resolve({useJapanese=false}), ''))

vim.api.nvim_buf_set_lines(0, 0, -1, false, {'alpha beta', 'hidden words', 'third line', 'visible again'})
vim.cmd('setlocal foldmethod=manual')
vim.cmd('2,3fold')
cfg = config.resolve({defaultMinWordLength=3})
found = words.detect(cfg, '')
for _, w in ipairs(found) do assert(w.line ~= 2 and w.line ~= 3, 'closed folds must be excluded') end
assert(#found > 0)

-- A float is excluded even when its buffer has no special buftype.
local buf = vim.api.nvim_create_buf(false, true)
vim.api.nvim_buf_set_lines(buf, 0, -1, false, {'floating words'})
local float = vim.api.nvim_open_win(buf, false, {relative='editor', row=0, col=0, width=20, height=2})
cfg = config.resolve({multiWindowMode=true, multiWindowExcludeTypes={}})
for _, win in ipairs(words.windows(cfg)) do assert(win ~= float) end
vim.api.nvim_win_close(float, true)
vim.cmd('vnew')
vim.api.nvim_buf_set_lines(0, 0, -1, false, {'another window'})
local before = vim.api.nvim_get_current_win()
found = words.detect(cfg, '')
eq(before, vim.api.nvim_get_current_win())
local seen = {}
for _, w in ipairs(found) do seen[w.winid] = true end
eq(2, vim.tbl_count(seen))
eq(1, #words.windows(config.resolve({multiWindowMode=true, multiWindowMaxWindows=1})))

-- Direction filtering affects the active window; other windows stay available.
cfg = config.resolve({multiWindowMode=true, directionalHintFilter=true})
vim.api.nvim_win_set_cursor(0, {1, 8})
found = words.detect(cfg, 'j')
for _, w in ipairs(found) do
  assert(w.winid ~= before or w.line > 1 or w.col > 9, 'direction filter')
end
print('PASS: native word detection, coordinates, folds, windows, per-key config')
assert(vim.v.errmsg == '', vim.v.errmsg)
vim.cmd('qa!')
