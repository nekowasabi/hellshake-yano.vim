vim.opt.runtimepath:prepend(vim.fn.getcwd())
local function eq(a,b) assert(vim.deep_equal(a,b),vim.inspect({expected=a,actual=b})) end
local dir=vim.fn.tempname()
vim.fn.mkdir(dir..'/autoload','p')
vim.fn.writefile({
  'function! denops#request(plugin, method, args) abort',
  '  return [a:plugin, a:method, a:args]',
  'endfunction',
  'function! denops#notify(plugin, method, args) abort',
  '  let g:hy_notified = [a:plugin, a:method, a:args]',
  'endfunction',
},dir..'/autoload/denops.vim')
vim.opt.runtimepath:append(dir)
vim.g.hellshake_yano_ready=true
local request=vim.fn['hellshake_yano#backend#request']
local notify=vim.fn['hellshake_yano#backend#notify']
eq({'hellshake-yano','getConfig',{}},request('hellshake-yano','getConfig',{}))
notify('hellshake-yano','updateConfig',{{enabled=false}})
eq({'hellshake-yano','updateConfig',{{enabled=false}}},vim.g.hy_notified)
assert(package.loaded['hellshake_yano.dispatcher']==nil,'default transport loaded the native dispatcher')
require('hellshake_yano').enable_bridge()
eq({'other-plugin','method',{1}},request('other-plugin','method',{1}))
notify('other-plugin','method',{2})
eq({'other-plugin','method',{2}},vim.g.hy_notified)
require('hellshake_yano').disable_bridge()
vim.fn.delete(dir,'rf')
assert(vim.v.errmsg=='',vim.v.errmsg)
print('PASS: default transport and other-plugin calls retain legacy denops delegation')
vim.cmd('qa!')
