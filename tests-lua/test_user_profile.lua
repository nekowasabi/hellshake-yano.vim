-- Synthetic profile transcribed from docs/denops-parity.md, not the user's live init.vim.
vim.opt.runtimepath:prepend(vim.fn.getcwd())
local runtime = require('hellshake_yano')
local core = require('hellshake_yano.core')
local dict = vim.fn.tempname() .. '.yaml'
vim.fn.writefile({'customWords: [非同期処理]', 'hintPatterns:',
  "  - pattern: '^#+\\s+(.)'", '    captureGroup: 1', '    priority: 110'}, dict)
vim.g.hellshake_yano = {
  useJapanese=true, enableTinySegmenter=true, wordDetectionStrategy='hybrid',
  segmenterThreshold=3, japaneseMinWordLength=5, japaneseMergeThreshold=3,
  useHintGroups=true, highlightSelected=true, useNumericMultiCharHints=true,
  singleCharKeys='/', multiCharKeys='BCDEGHJKLMNOQRSUWZ',
  perKeyMotionCount={w=2,b=2,e=2,h=2,j=2,k=2,l=2}, defaultMotionCount=3,
  perKeyMinLength={w=3,b=3,e=3}, defaultMinWordLength=3,
  cancelKeys={'y','p','x','v','a','i','f','F','t','T','<CR>','0','1','2','3','4','5','6','7','8','9'},
  directionalHintFilter=true, multiWindowMode=true,
  multiWindowExcludeTypes={'help','quickfix','terminal','popup'}, multiWindowMaxWindows=4,
  continuousHintMode=false, recenterCommand='normal! zz', maxContinuousJumps=25,
  highlightHintMarker={bg='black',fg='#57FD14'}, highlightHintMarkerCurrent={bg='Red',fg='White'},
  debugMode=false, dictionaryPath=dict,
}
runtime.setup()
runtime.activate()
for _, key in ipairs({'h','j','k','l','w','b','e'}) do
  assert(vim.fn.maparg(key,'n')~='',key..' mapping missing')
end
vim.api.nvim_buf_set_lines(0,0,-1,false,{'alpha beta','## important heading','非同期処理を実行します'})
vim.api.nvim_win_set_cursor(0,{1,0})
vim.cmd('vnew')
vim.api.nvim_buf_set_lines(0,0,-1,false,{'another target','日本語の文章を表示します'})
local detected=require('hellshake_yano.words').detect(core.get_config(),'',runtime.get_dictionary())
local targets=core.show(detected)
assert(#targets>1 and targets[1].hint=='/')
assert(vim.iter(targets):any(function(target) return target.hintPriority==110 end),
  'dictionary priority metadata not carried to assignment')
local selected=targets[1]
core.hide()
vim.api.nvim_feedkeys('/','t',false)
assert(runtime.show()=='jumped')
assert(vim.api.nvim_get_current_win()==selected.winid)
assert(vim.deep_equal(vim.api.nvim_win_get_cursor(0),{selected.line,selected.col-1}))
assert(vim.api.nvim_get_hl(0,{name='HellshakeYanoNativeHint'}).fg==0x57fd14)
vim.cmd('HellshakeYanoToggle')
assert(runtime.show()=='disabled')
vim.cmd('HellshakeYanoToggle')
assert(runtime.get_config().enabled)
assert(vim.fn.exists('*denops#request')==0,'denops must not be loaded')
assert(not vim.o.runtimepath:find('/plugged/',1,true),'live plugged runtime leaked into test')
local evidence=vim.env.HY_EVIDENCE_DIR
if evidence then
  vim.fn.mkdir(evidence,'p')
  vim.fn.writefile({vim.o.runtimepath},evidence..'/native-runtimepath.txt')
  vim.fn.writefile(vim.split(vim.fn.execute('scriptnames'),'\n'),evidence..'/native-scriptnames.txt')
end
runtime.deactivate()
vim.fn.delete(dict)
assert(vim.v.errmsg=='',vim.v.errmsg)
print('PASS: synthetic user profile, native-only two-window Japanese/dictionary jump, colors, toggle and mappings')
vim.cmd('qa!')
