-- Run with: nvim --headless -u NONE -l tests-lua/test_core.lua
vim.opt.runtimepath:prepend(vim.fn.getcwd())
local core = require('hellshake_yano.core')
local hints = require('hellshake_yano.hints')
local passed = 0
local function eq(expected, actual)
  assert(vim.deep_equal(expected, actual), vim.inspect({ expected = expected, actual = actual }))
end
local function test(name, fn)
  local ok, err = pcall(fn)
  core.hide()
  if not ok then error(name .. ': ' .. tostring(err)) end
  passed = passed + 1
end

test('hybrid hints retain configured order and numeric overflow', function()
  eq({'/', 'BB', 'BC', 'CB', 'CC', '01', '02'}, hints.generate(7, {
    singleCharKeys = '/', multiCharKeys = 'BC', useNumericMultiCharHints = true,
  }))
  eq({'BB', 'BC'}, hints.generate(2, {singleCharKeys = '/', multiCharKeys = 'BC', maxSingleCharHints = 0}))
  eq({'Q', 'W', 'QQ', 'QW', 'WQ', 'WW'}, hints.generate(200, {markers={'Q','W'}, multiCharKeys={}, maxSingleCharHints=1, useNumericMultiCharHints=true}))
  eq({'A', 'B', 'AA', 'AB', 'BA', 'BB'}, hints.generate(9, {markers = {'A', 'B'}}))
end)

test('numeric hints cap at 100 and end in 00', function()
  local result = hints.generate(101, {useNumericMultiCharHints = true})
  eq(100, #result)
  eq('01', result[1])
  eq('99', result[99])
  eq('00', result[100])
  eq({}, hints.generate(0, {}))
end)

test('hints respect capacity and maxHints', function()
  eq({'/', 'BB'}, hints.generate(20, {singleCharKeys = '/', multiCharKeys = 'B'}))
  eq({'/'}, hints.generate(20, {singleCharKeys = '/', multiCharKeys = 'BC', maxHints = 1}))
end)

test('byte coordinates remain correct for Japanese word endings', function()
  local result = hints.assign({{line = 1, col = 1, text = '日本語', bufnr = 1, winid = 1}},
    {'A', 'BB'}, {line = 2, col = 1, winid = 1}, {hintPosition = 'both', bothMinWordLength = 3})
  eq(1, result[1].col)
  eq(7, result[2].col)
end)

test('end hints use the base character before combining marks', function()
  local result=hints.assign({{line=1,col=1,text='café',winid=1}}, {'A'},
    {line=2,col=1,winid=1}, {hintPosition='end'})
  eq(4,result[1].col)
end)

test('assignment excludes cursor word only in current window', function()
  local words = {
    {line = 1, col = 1, text = 'alpha', winid = 1},
    {line = 1, col = 1, text = 'alpha', winid = 2},
    {line = 2, col = 1, text = 'beta', winid = 1},
  }
  local result = hints.assign(words, {'A', 'B'}, {line = 1, col = 2, winid = 1}, {})
  eq(2, #result)
  eq(2, result[1].winid)
  eq(1, result[2].winid)
  eq('alpha', words[1].text)
end)

test('show replaces marks and hide is idempotent', function()
  vim.api.nvim_buf_set_lines(0, 0, -1, false, {'alpha beta gamma'})
  core.setup({singleCharKeys = 'AS', multiCharKeys = 'BC'})
  local words = {{line = 1, col = 7, text = 'beta'}, {line = 1, col = 12, text = 'gamma'}}
  eq(2, #core.show(words))
  eq(2, #vim.api.nvim_buf_get_extmarks(0, core.namespace, 0, -1, {}))
  core.show({words[1]})
  eq(1, #vim.api.nvim_buf_get_extmarks(0, core.namespace, 0, -1, {}))
  core.hide()
  core.hide()
  eq(0, #vim.api.nvim_buf_get_extmarks(0, core.namespace, 0, -1, {}))
  eq(false, core.get_state().visible)
end)

test('uppercase prefix selection jumps to byte column', function()
  vim.api.nvim_buf_set_lines(0, 0, -1, false, {'日本語 alpha beta'})
  vim.api.nvim_win_set_cursor(0, {1, 0})
  core.setup({singleCharKeys = '/', multiCharKeys = 'BC'})
  core.show({{line = 1, col = 11, text = 'alpha'}, {line = 1, col = 17, text = 'beta'}})
  eq('pending', core.input('B'))
  eq(true, core.get_state().visible)
  eq('jumped', core.input('B'))
  eq({1, 16}, vim.api.nvim_win_get_cursor(0))
  eq(false, core.get_state().visible)
end)

test('lowercase keys cancel hints and are returned for replay', function()
  vim.api.nvim_buf_set_lines(0, 0, -1, false, {'alpha beta'})
  vim.api.nvim_win_set_cursor(0, {1, 0})
  core.setup({singleCharKeys = 'B', cancelKeys = {'b'}})
  core.show({{line = 1, col = 7, text = 'beta'}})
  local status, replay = core.input('b')
  eq('cancelled', status)
  eq('b', replay)
  eq({1, 0}, vim.api.nvim_win_get_cursor(0))
end)

test('disable hides marks, enable and toggle preserve config', function()
  core.setup({singleCharKeys = '/'})
  core.show({{line = 1, col = 7, text = 'beta'}})
  core.disable()
  eq(false, core.get_state().visible)
  eq({}, core.show({{line = 1, col = 7, text = 'beta'}}))
  eq(true, core.toggle())
  eq('/', core.get_config().singleCharKeys)
  local config = core.get_config()
  config.enabled = false
  eq(true, core.get_config().enabled)
end)

test('stale or invalid targets never jump or leak marks', function()
  core.setup({singleCharKeys = 'A'})
  vim.api.nvim_buf_set_lines(0, 0, -1, false, {'alpha beta'})
  vim.api.nvim_win_set_cursor(0, {1, 0})
  core.show({{line = 1, col = 7, text = 'beta'}})
  vim.api.nvim_buf_set_lines(0, 0, -1, false, {'changed'})
  eq('stale', core.input('A'))
  eq(false, core.get_state().visible)
  eq({}, core.show({{line = 99, col = 1, text = 'bad'}, {line = 1, col = 99, text = 'bad'}}))
end)

test('numeric groups prefer an available two-digit target', function()
  vim.api.nvim_buf_set_lines(0,0,-1,false,{'first second third fourth'})
  vim.api.nvim_win_set_cursor(0,{1,0})
  core.setup({singleCharKeys='0',multiCharKeys={},useNumericMultiCharHints=true,useHintGroups=true})
  core.show({{line=1,col=7,text='second'},{line=1,col=14,text='third'},{line=1,col=20,text='fourth'}})
  eq('pending',core.input('0'))
  eq('jumped',core.input('1'))
  eq({1,13},vim.api.nvim_win_get_cursor(0))
end)

print(('PASS: %d Lua core tests'):format(passed))
assert(vim.v.errmsg == '', vim.v.errmsg)
vim.cmd('qa!')
