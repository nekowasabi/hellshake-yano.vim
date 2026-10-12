vim.opt.runtimepath:prepend(vim.fn.getcwd())
local function eq(a,b) assert(vim.deep_equal(a,b),vim.inspect({expected=a,actual=b})) end
local runtime=require('hellshake_yano')
local call=function(name,...) return vim.fn[name](...) end
vim.g.hellshake_yano={singleCharKeys='AB',defaultMinWordLength=3,motionTimeout=100,useJapanese=false}
eq(0,call('hellshake_yano#utils#is_denops_ready'))
runtime.setup()
runtime.enable_bridge()
eq(1,call('hellshake_yano#utils#is_denops_ready'))
eq({'A','B'},call('hellshake_yano#hint_generator#generate',2))
vim.api.nvim_buf_set_lines(0,0,-1,false,{'日本語 alpha beta'})
local found=call('hellshake_yano#word_detector#detect_visible')
eq({text='alpha',lnum=1,col=11,end_col=16,winid=vim.api.nvim_get_current_win(),bufnr=vim.api.nvim_get_current_buf()},found[1])
call('hellshake_yano#config#set','defaultMinWordLength',4)
call('hellshake_yano#config#reload')
eq(4,vim.g.hellshake_yano.defaultMinWordLength)
local windows=call('hellshake_yano#window_detector#get_visible')
eq(vim.api.nvim_get_current_win(),windows[1].winid)
assert(windows[1].isCurrent)
local segmented=call('hellshake_yano#japanese#segment','日本語の文章です。')
assert(segmented.success and #segmented.segments>0)
assert(not pcall(call,'hellshake_yano#backend#request','hellshake-yano','missingMethod',{}))
assert(not pcall(call,'hellshake_yano#dictionary#add','   '),'invalid dictionary writes must fail explicitly')
-- Synchronous request keeps queued hint input in the native input loop.
vim.api.nvim_win_set_cursor(0,{1,0})
vim.api.nvim_feedkeys('A','t',false)
call('hellshake_yano#backend#request','hellshake-yano','showHintsWithKey',{'w','normal'})
eq({1,10},vim.api.nvim_win_get_cursor(0))
call('hellshake_yano#core#hide')
assert(not require('hellshake_yano.core').get_state().visible)
call('hellshake_yano#disable')
assert(not runtime.get_config().enabled and not vim.g.hellshake_yano.enabled)
call('hellshake_yano#toggle')
assert(runtime.get_config().enabled and vim.g.hellshake_yano.enabled)
call('hellshake_yano#config#set_count',2)
eq(2,runtime.get_config().defaultMotionCount)
call('hellshake_yano#config#set_timeout',150)
eq(150,runtime.get_config().motionTimeout)
runtime.update_config({suppressOnKeyRepeat=false})
vim.api.nvim_buf_set_lines(0,0,-1,false,{'alpha beta','gamma delta','epsilon zeta'})
vim.api.nvim_win_set_cursor(0,{1,0})
vim.keymap.set('n','j',function() return call('hellshake_yano#motion','j') end,{expr=true})
vim.api.nvim_feedkeys('jjA','xt',false)
eq({3,8},vim.api.nvim_win_get_cursor(0))
assert(not call('hellshake_yano#state#is_hints_visible'))
vim.keymap.del('n','j')
local statistics=call('hellshake_yano#core#get_state')
assert(statistics.currentState.initialized and not statistics.currentState.hintsVisible)
local state=call('hellshake_yano#motion#get_state')
eq(150,state.timeoutMs)
eq('',state.lastMotion)
local dispatcher=require('hellshake_yano.dispatcher')
local methods={
  'enable','disable','toggle','setCount','setTimeout','showHints','hideHints',
  'displayHideAll','highlightCandidateHints','detectWords','generateHints',
  'getDebugInfo','clearDebugInfo','getConfig','validateConfig','healthCheck',
  'getStatistics','getHighlightGroup','showDelayed','getFixedPositions','shouldRedraw',
  'reloadDictionary','addToDictionary','editDictionary','showDictionary',
  'validateDictionary','isInDictionary','getPartialMatches','getVisualRange',
  'detectWordsInVisualRange','visualInit','visualGetState','showHintsWithKey',
  'showHintsInternal','updateConfig','clearCache','invalidateBufferCache','debug',
  'clearPerformanceLog','segmentJapaneseText','showHintsMultiWindow',
  'hideHintsMultiWindow','toggleMultiWindowMode','getVisibleWindows',
  'isMultiWindowModeActive','updateMultiWindowConfig','enableMultiWindowMode',
  'disableMultiWindowMode','isMultiWindowModeEnabled','detectWordsVisible',
  'detectWordsMultiWindow','getMinWordLength','displayShowHint','displayShowHintWithWindow',
  'displayHighlightPartialMatches','displayGetPopupCount','motionDetect',
  'motionResetState','motionSetThreshold','motionSetTimeout','motionGetState',
}
for _,name in ipairs(methods) do
  assert(dispatcher.supports(name),'missing legacy dispatcher method: '..name)
end
eq(61,#methods)
assert(statistics.performanceStats.hintGeneration.count>=1)
assert(dispatcher.request('getDebugInfo',{}).timestamp>0)
dispatcher.request('clearDebugInfo',{})
eq(0,dispatcher.request('getStatistics',{}).performanceStats.hintGeneration.count)
local original_show=runtime.show
local delayed_calls=0
runtime.show=function() delayed_calls=delayed_calls+1 end
dispatcher.request('showDelayed',{1})
assert(vim.wait(100,function() return delayed_calls==1 end))
dispatcher.request('showDelayed',{5})
runtime.disable_bridge()
vim.wait(20)
eq(1,delayed_calls)
runtime.enable_bridge()
runtime.show=original_show
dispatcher.notify('updateConfig',{{defaultMinWordLength=9}})
runtime.disable_bridge()
vim.wait(20)
eq(4,runtime.get_config().defaultMinWordLength)
runtime.enable_bridge()
dispatcher.notify('updateConfig',{{defaultMinWordLength=7}})
assert(vim.wait(100,function() return runtime.get_config().defaultMinWordLength==7 end))
runtime.disable_bridge()
eq(0,call('hellshake_yano#utils#is_denops_ready'))
runtime.setup({singleCharKeys='A',motionTimeout=100})
runtime.enable_bridge()
vim.api.nvim_buf_set_lines(0,0,-1,false,{'alpha beta'})
vim.api.nvim_win_set_cursor(0,{1,0})
vim.defer_fn(runtime.disable_bridge,10)
eq('cancelled',runtime.show())
assert(not require('hellshake_yano.core').get_state().visible)
assert(vim.fn.exists('*denops#request')==0)
assert(vim.v.errmsg=='',vim.v.errmsg)
print('PASS: opt-in public Vimscript bridge, result shapes, settings, native input and explicit unsupported APIs')
vim.cmd('qa!')
