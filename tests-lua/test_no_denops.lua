vim.opt.runtimepath:prepend(vim.fn.getcwd())
for _,dir in ipairs({'autoload','plugin','lua','samples','scripts'}) do
  for _,path in ipairs(vim.fn.globpath(dir,'**/*',false,true)) do
    if vim.fn.filereadable(path)==1 and not path:match('%.md$') then
      for _,line in ipairs(vim.fn.readfile(path)) do
        assert(not line:match('denops#request') and not line:match('denops#notify')
          and not line:match('denops#plugin#load') and not line:match('denops#plugin#wait'),path..': '..line)
      end
    end
  end
end
local tracked=vim.fn.systemlist({'git','ls-files','denops/**','*.ts'})
assert(vim.v.shell_error==0)
-- Why: Check file existence instead of staging shared deletions; integration owns the index.
for _,path in ipairs(tracked) do
  assert(vim.fn.filereadable(path)==0,'remaining runtime or TypeScript file: '..path)
end
assert(vim.fn.isdirectory('denops')==0)
print('PASS: no Denops calls, runtime files or TypeScript sources remain in the working tree')
vim.cmd('qa!')
