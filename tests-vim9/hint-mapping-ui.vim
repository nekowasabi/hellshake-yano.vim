let g:hellshake_yano_native = v:true
let g:hellshake_yano = {'singleCharKeys': ['A'], 'multiCharKeys': ['B'],
      \ 'motionTimeout': 100, 'multiWindowRestoreDelay': 20,
      \ 'countedMotions': ['j'], 'perKeyMotionCount': {'j': 1},
      \ 'suppressOnKeyRepeat': v:false}
runtime plugin/hellshake-yano-native.vim
let g:foreign_B_calls = 0
nnoremap <silent> <Plug>ForeignB :let g:foreign_B_calls += 1<CR>
xnoremap <silent> <Plug>ForeignB :<C-U>let g:foreign_B_calls += 1<CR>
nmap B <Plug>ForeignB
xmap B <Plug>ForeignB
nnoremap <F5> <Cmd>call hellshake_yano#show_hints_with_key('j')<CR>
xnoremap <F5> <Cmd>call hellshake_yano#show_hints_with_key('j')<CR>
let s:normal = maparg('B', 'n', 0, 1)
let s:visual = maparg('B', 'x', 0, 1)

function! s:Run(timer) abort
  try
    call setline(1, ['first line', 'alpha beta gamma'])
    call cursor(1, 1)
    call feedkeys('jBB', 'xt')
    call assert_equal([2, 12], [line('.'), col('.')], 'native mapped motion')
    call assert_equal(0, g:foreign_B_calls)
    for focused in [0, 1]
      for visual in [0, 1]
        call cursor(2, 1)
        if focused
          call hellshake_yano#core#on_focus_gained()
        endif
        call feedkeys((visual ? 'v' : '') . "\<F5>BB", 'xt')
        call assert_equal([2, 12], [line('.'), col('.')], 'public hint API')
        call assert_equal(0, g:foreign_B_calls)
        call assert_equal([], popup_list())
        if visual
          call assert_equal('v', mode())
          call assert_equal([2, 1], getpos('v')[1:2])
          call feedkeys("\<Esc>", 'xt')
        endif
      endfor
    endfor
    call hellshake_yano#core#clear_focus_flag()
    call cursor(2, 1)
    call feedkeys("\<F5>\<Esc>", 'xt')
    call assert_equal([2, 1], [line('.'), col('.')])
    call assert_equal([], popup_list())
    call feedkeys("\<F5>", 'xt')
    call assert_equal([], popup_list())
    call feedkeys('B', 'xt')
    call assert_equal(1, g:foreign_B_calls)
    call assert_equal(s:normal, maparg('B', 'n', 0, 1))
    call assert_equal(s:visual, maparg('B', 'x', 0, 1))
  catch
    call add(v:errors, v:exception . ' at ' . v:throwpoint)
  finally
    call hellshake_yano#native#runtime#Deactivate()
  endtry
  call writefile(empty(v:errors)
        \ ? ['PASS Vim9 mapped hints: native and public API input, focus restore, Visual, cancel and timeout']
        \ : v:errors, $HY_VIM9_UI_RESULT)
  if !empty(v:errors)
    cquit
  endif
  qa!
endfunction
call timer_start(100, function('s:Run'))
