vim9script
var dir = tempname()
g:hy_denops_calls = []
mkdir(dir .. '/autoload', 'p')
try
  writefile([
    'function! denops#request(plugin, method, args) abort',
    '  call add(g:hy_denops_calls, [a:plugin, a:method, a:args])',
    '  return [a:plugin, a:method, a:args]',
    'endfunction',
    'function! denops#notify(plugin, method, args) abort',
    '  call add(g:hy_denops_calls, [a:plugin, a:method, a:args])',
    '  let g:hy_notified = [a:plugin, a:method, a:args]',
    'endfunction',
  ], dir .. '/autoload/denops.vim')
  execute 'set rtp+=' .. fnameescape(dir)
  g:hellshake_yano_native = true
  g:hellshake_yano = {motionTimeout: 175}
  runtime! plugin/hellshake-yano*.vim
  assert_equal(175, hellshake_yano_vim#backend#request('hellshake-yano', 'getConfig', []).motionTimeout)
  hellshake_yano_vim#backend#notify('hellshake-yano', 'updateConfig', [{motionTimeout: 200}])
  sleep 20m
  assert_equal(200, hellshake_yano_vim#backend#request('hellshake-yano', 'getConfig', []).motionTimeout)
  for operation in ['request', 'notify']
    var failed = false
    try
      call('hellshake_yano_vim#backend#' .. operation, ['other-plugin', 'method', []])
    catch
      failed = true
      assert_match('unsupported plugin: other-plugin', v:exception)
    endtry
    assert_true(failed, operation .. ' must reject other plugins')
  endfor
  assert_equal([], g:hy_denops_calls)
finally
  hellshake_yano#native#runtime#DisableBridge()
  hellshake_yano#native#runtime#Deactivate()
  delete(dir, 'rf')
endtry
if !empty(v:errors)
  writefile(v:errors, '/dev/stderr', 'a')
  cquit
endif
qa!
