-- Legacy method names and return shapes, only selected by the explicit bridge.
local M = {}
local core = require('hellshake_yano.core')
local words = require('hellshake_yano.words')
local config_module = require('hellshake_yano.config')
local methods = {}
local epoch = 0
local measurements = {}
local measured_methods={generateHints='hintGeneration',detectWordsVisible='wordDetection',
  detectWordsMultiWindow='wordDetection',showHints='showHints',showHintsWithKey='showHints',
  showHintsInternal='showHints',hideHints='hideHints',displayHideAll='hideHints'}
local function runtime() return require('hellshake_yano') end
local function config() return core.get_config() end
local function detected(multi)
  local options=config()
  options.multiWindowMode=multi
  local result=words.detect(options,'',runtime().get_dictionary())
  for _,word in ipairs(result) do
    word.lnum,word.end_col=word.line,word.col+#word.text
    word.line=nil
    word.hintPriority=nil
  end
  return result
end
methods.enable=function() runtime().enable() end
methods.disable=function() runtime().disable() end
methods.toggle=function() runtime().toggle() end
methods.getConfig=config
methods.updateConfig=function(options) runtime().update_config(options) end
methods.validateConfig=function(options)
  local ok,err=pcall(config_module.resolve,options)
  return {valid=ok,errors=ok and {} or {tostring(err)}}
end
methods.setCount=function(count)
  if type(count)=='number' then runtime().update_config({motionCount=count,defaultMotionCount=count}) end
end
methods.setTimeout=function(timeout)
  if type(timeout)=='number' then runtime().update_config({motionTimeout=timeout}) end
end
methods.generateHints=function(count)
  return require('hellshake_yano.hints').generate(type(count)=='number' and count or 0,config())
end
methods.detectWordsVisible=function() return detected(false) end
methods.detectWordsMultiWindow=function() return detected(true) end
local function legacy_word(word)
  local byte_col=word.wordCol or word.col
  local line=vim.api.nvim_buf_get_lines(word.bufnr,word.line-1,word.line,false)[1] or ''
  local display=vim.api.nvim_win_call(word.winid,function() return vim.fn.strdisplaywidth(line:sub(1,byte_col-1)) end)
  return {text=word.text,line=word.line,col=display+1,byteCol=byte_col,winid=word.winid,bufnr=word.bufnr}
end
local function legacy_hints(targets)
  local result={}
  for _,target in ipairs(targets) do
    result[#result+1]={word=legacy_word(target),hint=target.hint,hintCol=target.col,hintByteCol=target.col}
  end
  return result
end
methods.detectWords=function()
  -- The legacy optimized dispatcher ignored bufnr and used visible default detection.
  return vim.tbl_map(legacy_word,words.detect(config_module.resolve(),''))
end
methods.showHintsMultiWindow=function()
  local options=config(); options.multiWindowMode=true
  local targets=core.show(words.detect(options,'',runtime().get_dictionary()),{multiWindowMode=true})
  return legacy_hints(targets)
end
methods.getMinWordLength=function(key)
  -- Preserve the legacy missing-key result, which is not the configured default.
  return type(key)=='string' and config_module.min_length(config(),key) or 3
end
methods.getVisibleWindows=function()
  local options=config(); options.multiWindowMode=true
  local current=vim.api.nvim_get_current_win()
  local result={}
  for _,win in ipairs(words.windows(options)) do
    local bounds=vim.api.nvim_win_call(win,function() return {vim.fn.line('w0'),vim.fn.line('w$')} end)
    result[#result+1]={winid=win,bufnr=vim.api.nvim_win_get_buf(win),topline=bounds[1],botline=bounds[2],
      width=vim.api.nvim_win_get_width(win),height=vim.api.nvim_win_get_height(win),isCurrent=win==current}
  end
  return result
end
methods.isMultiWindowModeEnabled=function() return config().multiWindowMode end
methods.isMultiWindowModeActive=function() return config().multiWindowMode and #methods.getVisibleWindows()>1 end
methods.enableMultiWindowMode=function() runtime().update_config({multiWindowMode=true}) end
methods.disableMultiWindowMode=function() runtime().update_config({multiWindowMode=false}) end
methods.toggleMultiWindowMode=function()
  local enabled=not config().multiWindowMode
  runtime().update_config({multiWindowMode=enabled}); return enabled
end
methods.updateMultiWindowConfig=function(options)
  local updates={}
  if type(options.multiWindowMode)=='boolean' then updates.multiWindowMode=options.multiWindowMode end
  if type(options.multiWindowExcludeTypes)=='table' then
    updates.multiWindowExcludeTypes=vim.tbl_filter(function(value) return type(value)=='string' end,options.multiWindowExcludeTypes)
  end
  if type(options.multiWindowMaxWindows)=='number' then updates.multiWindowMaxWindows=options.multiWindowMaxWindows end
  runtime().update_config(updates)
end
methods.showHintsWithKey=function(key) runtime().show(type(key)=='string' and key or '') end
methods.showHintsInternal=function() runtime().show() end
-- The old showHints dispatcher only redraws existing mappings; it does not detect/input.
methods.showHints=function() core.refresh() end
methods.hideHints=function() runtime().hide() end
methods.displayHideAll=methods.hideHints
methods.hideHintsMultiWindow=methods.hideHints
methods.displayShowHint=function(line,col,hint) return core.display_hint(vim.api.nvim_get_current_win(),line,col,hint) end
methods.displayShowHintWithWindow=function(win,line,col,hint) return core.display_hint(win,line,col,hint) end
methods.displayGetPopupCount=function() return #core.get_state().targets end
methods.highlightCandidateHints=function(prefix) core.highlight_prefix(prefix) end
methods.displayHighlightPartialMatches=function(matches)
  if type(matches)=='table' then
    local input=table.concat(vim.tbl_filter(function(value) return type(value)=='string' end,matches))
    if input~='' then core.highlight_prefix(input) end
  end
end
methods.getHighlightGroup=function() return 'HellshakeYanoMarker' end
methods.getFixedPositions=function() return {} end -- Legacy Neovim fallback.
methods.getPartialMatches=function() return {} end -- Legacy Neovim stub.
methods.getVisualRange=function() return {mode='none',start_line=0,start_col=0,end_line=0,end_col=0} end
methods.detectWordsInVisualRange=function() return {} end
methods.visualInit=function() end
methods.visualGetState=function() return {mode='none',active=false} end
methods.shouldRedraw=function() return vim.fn['hellshake_yano#core#should_redraw']()~=0 end
methods.reloadDictionary=function() runtime().reload_dictionary() end
methods.isInDictionary=function(word)
  local dictionary=runtime().get_dictionary()
  return type(word)=='string' and dictionary~=nil and vim.list_contains(dictionary.customWords,word)
end
methods.showDictionary=function() print(vim.inspect(runtime().get_dictionary())) end
methods.validateDictionary=function() runtime().reload_dictionary() end
-- Native detection has no stale-result cache to invalidate.
methods.clearCache=function() end
methods.invalidateBufferCache=function() end
methods.segmentJapaneseText=function(text,options)
  local segmenter=require('hellshake_yano.segmenter')
  return {segments=segmenter.process(tostring(text or ''),not options or options.mergeParticles~=false),
    success=true,source='tinysegmenter'}
end
local detector
local function motion_detector()
  if not detector then detector=require('hellshake_yano.legacy_motion').new(config()) end
  return detector
end
methods.motionDetect=function(...) return motion_detector().detect(...) end
methods.motionGetState=function() return motion_detector().get() end
methods.motionResetState=function() motion_detector().reset() end
methods.motionSetThreshold=function(value)
  if type(value)=='number' and value>0 then motion_detector().threshold(value) end
end
methods.motionSetTimeout=function(value)
  if type(value)=='number' and value>0 then motion_detector().timeout(value) end
end
methods.getStatistics=function()
  local state=core.get_state()
  local cache={size=0,maxSize=0,hitRate=0,hits=0,misses=0}
  local metrics={}
  for _,name in ipairs({'showHints','hideHints','wordDetection','hintGeneration'}) do
    local values=measurements[name] or {}
    local total,maximum,minimum=0,0,math.huge
    for _,value in ipairs(values) do total=total+value; maximum=math.max(maximum,value); minimum=math.min(minimum,value) end
    metrics[name]={count=#values,average=#values>0 and total/#values or 0,max=maximum,min=#values>0 and minimum or 0}
  end
  return {cacheStats={words=vim.deepcopy(cache),hints=cache},performanceStats=metrics,
    currentState={initialized=true,hintsVisible=state.visible,currentHintsCount=#state.targets}}
end
methods.getDebugInfo=function()
  local state=core.get_state()
  local hints=legacy_hints(state.targets)
  local metrics={}
  for _,name in ipairs({'showHints','hideHints','wordDetection','hintGeneration'}) do
    metrics[name]=vim.deepcopy(measurements[name] or {})
  end
  local sec,usec=vim.uv.gettimeofday()
  return {config=config(),hintsVisible=state.visible,currentHints=hints,metrics=metrics,timestamp=sec*1000+math.floor(usec/1000)}
end
methods.debug=methods.getDebugInfo
methods.clearDebugInfo=function() measurements={} end
methods.clearPerformanceLog=methods.clearDebugInfo
methods.healthCheck=function() assert(vim.fn.has('nvim-0.10')==1,'Neovim 0.10+ is required') end
methods.showDelayed=function(delay)
  local token=epoch
  local milliseconds=type(delay)=='number' and math.max(0,delay) or 0
  vim.defer_fn(function()
    if token==epoch and vim.g.hellshake_yano_native_bridge then runtime().show() end
  end,milliseconds)
end
function M.supports(method) return methods[method]~=nil end
function M.request(method,args)
  assert(M.supports(method),'native dispatcher method is not implemented: '..tostring(method))
  assert(type(args)=='table' and vim.islist(args),'dispatcher arguments must be a list')
  local measured=measured_methods[method]
  local start=vim.uv.hrtime()
  local result=methods[method](unpack(args))
  if measured then
    measurements[measured]=measurements[measured] or {}
    local values=measurements[measured]
    values[#values+1]=(vim.uv.hrtime()-start)/1e6
    if #values>100 then table.remove(values,1) end
  end
  return result
end
function M.cancel_pending() epoch=epoch+1 end
function M.notify(method,args)
  assert(M.supports(method),'native dispatcher method is not implemented: '..tostring(method))
  local token=epoch
  local copied=vim.deepcopy(args)
  vim.schedule(function()
    if token~=epoch or not vim.g.hellshake_yano_native_bridge then return end
    local ok,err=pcall(M.request,method,copied)
    if not ok then vim.notify(tostring(err),vim.log.levels.ERROR) end
  end)
end
return M
