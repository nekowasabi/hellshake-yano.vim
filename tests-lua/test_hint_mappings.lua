vim.opt.runtimepath:prepend(vim.fn.getcwd())
local runtime = require('hellshake_yano')
local core = require('hellshake_yano.core')
local function eq(expected, actual)
  assert(vim.deep_equal(expected, actual), vim.inspect({expected = expected, actual = actual}))
end

vim.cmd([[
  let g:hint_mapping_calls = []
  function! HintMappingMotion(key) abort
    call add(g:hint_mapping_calls, a:key)
    normal! b
  endfunction
]])
local original = {}
for _, key in ipairs({'B', 'W', 'E'}) do
  for _, mode in ipairs({'n', 'x'}) do
    vim.cmd(mode .. 'noremap <silent> <Plug>HintMapping' .. key
      .. ' :<C-U>call HintMappingMotion("' .. key .. '")<CR>')
    vim.cmd(mode .. 'map ' .. key .. ' <Plug>HintMapping' .. key)
    original[mode .. key] = vim.fn.maparg(key, mode, false, true)
  end
end

local function setup(key, pair, multiwindow)
  runtime.setup({countedMotions = {'j'}, triggerOnHjkl = false,
    perKeyMotionCount = {j = 1}, suppressOnKeyRepeat = false,
    singleCharKeys = pair and 'A' or key, multiCharKeys = pair and key or 'CD',
    motionTimeout = 300, multiWindowMode = multiwindow})
  runtime.activate()
  vim.api.nvim_buf_set_lines(0, 0, -1, false, {'first line', 'alpha beta gamma', 'last line'})
  vim.api.nvim_win_set_cursor(0, {1, 0})
  vim.g.hint_mapping_calls = {}
end

for _, multiwindow in ipairs({false, true}) do
  for _, key in ipairs({'B', 'W', 'E'}) do
    for _, pair in ipairs({false, true}) do
      setup(key, pair, multiwindow)
      vim.api.nvim_feedkeys('j' .. key .. (pair and key or ''), 'xt', false)
      eq({2, pair and 11 or 6}, vim.api.nvim_win_get_cursor(0))
      eq({}, vim.g.hint_mapping_calls)
      eq(false, core.get_state().visible)
      eq('n', vim.api.nvim_get_mode().mode)
    end
  end
end

setup('B', true, false)
vim.api.nvim_feedkeys('vjBB', 'xt', false)
eq('v', vim.api.nvim_get_mode().mode)
eq({2, 11}, vim.api.nvim_win_get_cursor(0))
eq({1, 1}, {vim.fn.line('v'), vim.fn.col('v')})
eq({}, vim.g.hint_mapping_calls)
vim.api.nvim_feedkeys(vim.api.nvim_replace_termcodes('<Esc>', true, false, true), 'xt', false)

setup('B', true, false)
vim.api.nvim_win_set_cursor(0, {2, 0})
local prefix
local function finish_pair()
  local state = core.get_state()
  if state.prefix ~= 'B' then
    if state.visible then vim.defer_fn(finish_pair, 5) end
    return
  end
  prefix = state.prefix
  vim.api.nvim_input('B')
end
vim.defer_fn(function()
  vim.api.nvim_input('B')
  vim.defer_fn(finish_pair, 5)
end, 20)
eq('jumped', runtime.show())
eq('B', prefix)
eq({2, 11}, vim.api.nvim_win_get_cursor(0))
eq({}, vim.g.hint_mapping_calls)

for _, key in ipairs({'B', 'W', 'E'}) do
  for _, mode in ipairs({'n', 'x'}) do
    eq(original[mode .. key], vim.fn.maparg(key, mode, false, true))
  end
end
runtime.deactivate()
for _, key in ipairs({'B', 'W', 'E'}) do
  vim.api.nvim_win_set_cursor(0, {2, 11})
  vim.api.nvim_feedkeys(key, 'xt', false)
  eq({2, 6}, vim.api.nvim_win_get_cursor(0))
  for _, mode in ipairs({'n', 'x'}) do
    eq(original[mode .. key], vim.fn.maparg(key, mode, false, true))
  end
end
eq({'B', 'W', 'E'}, vim.g.hint_mapping_calls)
eq('', vim.v.errmsg)
print('PASS: mapped B/W/E select hints, preserve Visual mode and restore ordinary motion')
vim.cmd('qa!')
