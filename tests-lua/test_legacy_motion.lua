vim.opt.runtimepath:prepend(vim.fn.getcwd())
local function eq(a,b) assert(vim.deep_equal(a,b),vim.inspect({expected=a,actual=b})) end
local now=10000
local detector=require('hellshake_yano.legacy_motion').new(
  {motionTimeout=2000,motionCount=3,defaultMotionCount=3,perKeyMotionCount={w=2}},function() return now end)
local repeat_config={enabled=false}
eq({shouldShowHints=false,skipReason='timeout_reset',newCount=1},detector.detect('w',1,repeat_config))
now=now+100
eq({shouldShowHints=true,newCount=0},detector.detect('w',1,repeat_config))
now=now+100
eq({shouldShowHints=false,skipReason='below_threshold',newCount=1},detector.detect('j',1,repeat_config))
now=now+100
eq({shouldShowHints=false,skipReason='below_threshold',newCount=1},detector.detect('k',1,repeat_config))
now=now+1
eq('key_repeat',detector.detect('k',1,{enabled=true}).skipReason)
eq('numeric_prefix',detector.detect('k',2,repeat_config).skipReason)
eq(0,detector.get().motionCount)
detector.threshold(4); detector.timeout(500)
eq(4,detector.get().threshold)
eq(500,detector.get().timeoutMs)
eq('invalid_params',detector.detect(nil,1,repeat_config).skipReason)
print('PASS: dispatcher consecutive-motion semantics, per-key thresholds, reset and repeat result shapes')
assert(vim.v.errmsg=='',vim.v.errmsg)
vim.cmd('qa!')
