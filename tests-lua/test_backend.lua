vim.opt.runtimepath:prepend(vim.fn.getcwd())
local function eq(a,b) assert(vim.deep_equal(a,b),vim.inspect({expected=a,actual=b})) end
local dir=vim.fn.tempname()
vim.g.hy_denops_calls={}
vim.fn.mkdir(dir..'/autoload','p')
vim.fn.writefile({
  'function! denops#request(plugin, method, args) abort',
  '  call add(g:hy_denops_calls, [a:plugin, a:method, a:args])',
  '  return [a:plugin, a:method, a:args]',
  'endfunction',
  'function! denops#notify(plugin, method, args) abort',
  '  call add(g:hy_denops_calls, [a:plugin, a:method, a:args])',
  '  let g:hy_notified = [a:plugin, a:method, a:args]',
  'endfunction',
},dir..'/autoload/denops.vim')
vim.opt.runtimepath:append(dir)
vim.g.hellshake_yano={motionTimeout=175}
vim.cmd('runtime! plugin/hellshake-yano*.vim')
local request=vim.fn['hellshake_yano#backend#request']
local notify=vim.fn['hellshake_yano#backend#notify']
eq(175,request('hellshake-yano','getConfig',{}).motionTimeout)
assert(package.loaded['hellshake_yano.dispatcher']~=nil)
notify('hellshake-yano','updateConfig',{{motionTimeout=200}})
assert(vim.wait(100,function() return request('hellshake-yano','getConfig',{}).motionTimeout==200 end))
assert(not pcall(request,'other-plugin','method',{1}))
assert(not pcall(notify,'other-plugin','method',{2}))
eq({},vim.g.hy_denops_calls)
require('hellshake_yano').disable_bridge()
require('hellshake_yano').deactivate()
assert(not pcall(request,'hellshake-yano','getConfig',{}))
vim.fn.delete(dir,'rf')
assert(vim.v.errmsg=='',vim.v.errmsg)
print('PASS: native transport avoids Denops and rejects unavailable backends and other plugins')
vim.cmd('qa!')
