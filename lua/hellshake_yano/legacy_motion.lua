-- Dispatcher motion detector: preserve its consecutive-key semantics separately
-- from the newer per-buffer/per-key native mapping counter.
local M={}
function M.new(config,clock)
  local self={state={lastMotion='',lastMotionTime=0,motionCount=0,
    timeoutMs=config.motionTimeout,threshold=config.motionCount},lastKeyTime=0,
    perKey=vim.deepcopy(config.perKeyMotionCount),default=config.defaultMotionCount}
  clock=clock or function() local sec,usec=vim.uv.gettimeofday(); return sec*1000+math.floor(usec/1000) end
  function self.reset()
    self.state.lastMotion,self.state.lastMotionTime,self.state.motionCount='',0,0
  end
  function self.get() return vim.deepcopy(self.state) end
  function self.threshold(value) self.state.threshold=value; self.default=value end
  function self.timeout(value) self.state.timeoutMs=value end
  function self.detect(key,count,repeat_config)
    if type(key)~='string' or type(count)~='number' then
      return {shouldShowHints=false,skipReason='invalid_params',newCount=0}
    end
    local now=clock()
    if count>1 then self.reset(); return {shouldShowHints=false,skipReason='numeric_prefix',newCount=0} end
    repeat_config=type(repeat_config)=='table' and repeat_config or {}
    local enabled=repeat_config.enabled~=false
    local threshold=type(repeat_config.threshold)=='number' and repeat_config.threshold or 50
    local previous=self.lastKeyTime
    self.lastKeyTime=now
    if enabled and previous>0 and now-previous<threshold then
      return {shouldShowHints=false,skipReason='key_repeat',newCount=self.state.motionCount}
    end
    local state=self.state
    if now-state.lastMotionTime>state.timeoutMs then
      state.motionCount,state.lastMotion,state.lastMotionTime=1,key,now
      return {shouldShowHints=false,skipReason='timeout_reset',newCount=1}
    end
    state.motionCount=state.lastMotion==key and state.motionCount+1 or 1
    state.lastMotion,state.lastMotionTime=key,now
    if state.motionCount>=(self.perKey[key] or self.default) then
      state.motionCount=0
      return {shouldShowHints=true,newCount=0}
    end
    return {shouldShowHints=false,skipReason='below_threshold',newCount=state.motionCount}
  end
  return self
end
return M
