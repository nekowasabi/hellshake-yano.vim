vim.opt.runtimepath:prepend(vim.fn.getcwd())
vim.g.hellshake_yano = {singleCharKeys = 'A', multiCharKeys = 'B', motionTimeout = 100}
vim.cmd('runtime plugin/hellshake-yano-native.vim')
local runtime = require('hellshake_yano')
local core = require('hellshake_yano.core')
local function eq(expected, actual)
  assert(vim.deep_equal(expected, actual), vim.inspect({expected = expected, actual = actual}))
end
local function keys(value)
  vim.api.nvim_feedkeys(vim.api.nvim_replace_termcodes(value, true, false, true), 'xt', false)
end
vim.cmd([[
  let g:foreign_B_calls = 0
  nnoremap <silent> <Plug>ForeignB :let g:foreign_B_calls += 1<CR>
  xnoremap <silent> <Plug>ForeignB :<C-U>let g:foreign_B_calls += 1<CR>
  nmap B <Plug>ForeignB
  xmap B <Plug>ForeignB
  nnoremap <F5> <Cmd>call hellshake_yano#show_hints_with_key('j')<CR>
  xnoremap <F5> <Cmd>call hellshake_yano#show_hints_with_key('j')<CR>
]])
local normal = vim.fn.maparg('B', 'n', false, true)
local visual = vim.fn.maparg('B', 'x', false, true)
vim.api.nvim_buf_set_lines(0, 0, -1, false, {'alpha beta gamma'})

for _, focused in ipairs({false, true}) do
  for _, mode in ipairs({'', 'v'}) do
    vim.api.nvim_win_set_cursor(0, {1, 0})
    if focused then vim.fn['hellshake_yano#core#on_focus_gained']() end
    keys(mode .. '<F5>BB')
    eq({1, 11}, vim.api.nvim_win_get_cursor(0))
    eq(0, vim.g.foreign_B_calls)
    eq(false, core.get_state().visible)
    if mode == 'v' then
      eq('v', vim.api.nvim_get_mode().mode)
      eq({1, 1}, {vim.fn.line('v'), vim.fn.col('v')})
      keys('<Esc>')
    end
  end
end
vim.fn['hellshake_yano#core#clear_focus_flag']()
vim.api.nvim_win_set_cursor(0, {1, 0})
keys('<F5><Esc>')
eq({1, 0}, vim.api.nvim_win_get_cursor(0))
eq(false, core.get_state().visible)
keys('<F5>')
eq(false, core.get_state().visible)
keys('B')
eq(1, vim.g.foreign_B_calls)
eq(normal, vim.fn.maparg('B', 'n', false, true))
eq(visual, vim.fn.maparg('B', 'x', false, true))
runtime.deactivate()
eq('', vim.v.errmsg)
print('PASS: public hint API captures mapped keys through jump, focus restore, cancel and timeout')
vim.cmd('qa!')
