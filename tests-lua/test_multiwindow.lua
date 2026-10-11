vim.opt.runtimepath:prepend(vim.fn.getcwd())
local core = require('hellshake_yano.core')
local function eq(a,b) assert(vim.deep_equal(a,b),vim.inspect({expected=a,actual=b})) end
vim.api.nvim_buf_set_lines(0,0,-1,false,{'alpha beta gamma'})
local first = vim.api.nvim_get_current_win()
local buf = vim.api.nvim_get_current_buf()
vim.cmd('vsplit')
local second = vim.api.nvim_get_current_win()
core.setup({multiWindowMode=true,singleCharKeys='AB',multiCharKeys='CD'})
local targets = core.show({
  {line=1,col=7,text='beta',winid=first,bufnr=buf},
  {line=1,col=7,text='beta',winid=second,bufnr=buf},
})
eq(2,#targets)
local floats = {}
for _, win in ipairs(vim.api.nvim_list_wins()) do
  local cfg = vim.api.nvim_win_get_config(win)
  if cfg.relative ~= '' then floats[cfg.win] = win end
end
assert(floats[first] and floats[second], 'each window must have its own label')
eq(0,#vim.api.nvim_buf_get_extmarks(buf,core.namespace,0,-1,{}))
eq('jumped',core.input('A'))
eq(first,vim.api.nvim_get_current_win())
eq({1,6},vim.api.nvim_win_get_cursor(first))
for _, win in pairs(floats) do assert(not vim.api.nvim_win_is_valid(win), 'hint float leaked') end

-- Closed windows are stale, not reassigned to a different window.
vim.api.nvim_win_set_cursor(first,{1,0})
core.show({{line=1,col=7,text='beta',winid=second,bufnr=buf}})
vim.api.nvim_win_close(second,true)
eq('stale',core.input('A'))
eq(first,vim.api.nvim_get_current_win())

-- Existing multi-window input gives cancelKeys priority over matching labels.
core.setup({multiWindowMode=true,singleCharKeys='A',cancelKeys={'a'}})
core.show({{line=1,col=7,text='beta'}})
local status,replay=core.input('A')
eq('cancelled',status)
eq('A',replay)
eq({1,0},vim.api.nvim_win_get_cursor(first))
print('PASS: same-buffer multi-window rendering, jumping, cleanup, stale windows, cancel precedence')
assert(vim.v.errmsg == '', vim.v.errmsg)
vim.cmd('qa!')
