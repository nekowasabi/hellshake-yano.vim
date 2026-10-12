" Startup with no denops.vim: the plugin must start natively in Vim and Neovim.
" Sourced by verification/{nvim,vim}/verify.sh after `runtime! plugin/*.vim`.
" Writes the observed state to $HY_OUT; exits non-zero (cquit) on any failure.
let s:errors = []
if !empty(globpath(&runtimepath, 'autoload/denops.vim'))
  call add(s:errors, 'denops.vim is on runtimepath; the check would not prove anything')
endif
if !get(g:, 'loaded_hellshake_yano_native', 0)
  call add(s:errors, 'native not loaded: ' . get(g:, 'hellshake_yano_native_error', '(no error recorded)'))
endif
let s:map = maparg('w', 'n', 0, 1)
if string(s:map) !~? 'hellshake'
  call add(s:errors, 'w is not the hellshake-yano mapping: ' . string(s:map))
endif
let s:denops_scripts = filter(split(execute('scriptnames'), "\n"), 'v:val =~? "denops"')
if !empty(s:denops_scripts)
  call add(s:errors, 'denops scripts were sourced: ' . join(s:denops_scripts, ', '))
endif
if !empty(v:errmsg)
  call add(s:errors, 'v:errmsg: ' . v:errmsg)
endif
call writefile([
      \ 'editor: ' . (has('nvim') ? 'nvim' : 'vim') . ' ' . v:version,
      \ 'w mapping: ' . string(s:map),
      \ 'scriptnames:'] + split(execute('scriptnames'), "\n")
      \ + ['errors: ' . len(s:errors)] + s:errors, $HY_OUT)
if empty(s:errors)
  qall!
endif
cquit!
