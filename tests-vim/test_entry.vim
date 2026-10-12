if has('nvim')
  echo 'PASS: Neovim startup is covered by tests-lua/test_entry.lua'
  finish
endif
let g:hellshake_yano_vim_config = {'motion_keys': ['j'], 'motion_threshold': 3}
runtime! plugin/hellshake-yano*.vim
doautocmd VimEnter
call assert_false(exists('g:hellshake_yano_native'))
call assert_false(exists('g:loaded_hellshake_yano_native'))
call assert_true(exists('g:loaded_hellshake_yano_vim'))
call assert_true(exists('g:loaded_hellshake_yano_unified'))
call assert_equal(0, exists('*denops#request'))
call assert_equal('', v:errmsg)
call assert_equal(3, g:hellshake_yano.motionCount)
call assert_equal(['j'], g:hellshake_yano.countedMotions)
call assert_match('hellshake_yano_vim#motion#handle_with_count', maparg('j', 'n'))
if !empty(v:errors)
  call writefile(v:errors, '/dev/stderr', 'a')
  cquit
endif
echo 'PASS: default pure VimScript startup and legacy configuration migration'
