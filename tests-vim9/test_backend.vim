vim9script
var dir = tempname()
mkdir(dir .. '/autoload', 'p')
try
  writefile([
    'function! denops#request(plugin, method, args) abort',
    '  return [a:plugin, a:method, a:args]',
    'endfunction',
    'function! denops#notify(plugin, method, args) abort',
    '  let g:hy_notified = [a:plugin, a:method, a:args]',
    'endfunction',
  ], dir .. '/autoload/denops.vim')
  execute 'set rtp+=' .. fnameescape(dir)
  assert_equal(['hellshake-yano', 'getConfig', []], hellshake_yano_vim#backend#request('hellshake-yano', 'getConfig', []))
  hellshake_yano_vim#backend#notify('hellshake-yano', 'updateConfig', [{enabled: false}])
  assert_equal(['hellshake-yano', 'updateConfig', [{enabled: false}]], g:hy_notified)
  assert_false(exists('*hellshake_yano#native#dispatcher#Request'))
  g:hellshake_yano_vim_native_bridge = true
  assert_equal(['other-plugin', 'method', [1]], hellshake_yano_vim#backend#request('other-plugin', 'method', [1]))
  hellshake_yano_vim#backend#notify('other-plugin', 'method', [2])
  assert_equal(['other-plugin', 'method', [2]], g:hy_notified)
finally
  g:hellshake_yano_vim_native_bridge = false
  delete(dir, 'rf')
endtry
if !empty(v:errors)
  writefile(v:errors, '/dev/stderr', 'a')
  cquit
endif
qa!
