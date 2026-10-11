vim9script
# Legacy dispatcher consecutive-key state, separate from native per-buffer maps.
var state: dict<any> = {}
var last_key_time = 0
var per_key: dict<number> = {}
var default_count = 3

export def Setup(config: dict<any>)
  state = {lastMotion: '', lastMotionTime: 0, motionCount: 0,
    timeoutMs: config.motionTimeout, threshold: config.motionCount}
  last_key_time = 0
  per_key = deepcopy(config.perKeyMotionCount)
  default_count = config.defaultMotionCount
enddef

export def Reset()
  state.lastMotion = ''
  state.lastMotionTime = 0
  state.motionCount = 0
enddef

export def State(): dict<any>
  return deepcopy(state)
enddef

export def Threshold(value: number)
  state.threshold = value
  default_count = value
enddef

export def Timeout(value: number)
  state.timeoutMs = value
enddef

export def Detect(key: any, count: any, repeat_config: any = {}, now: number = float2nr(reltimefloat(reltime()) * 1000)): dict<any>
  if type(key) != v:t_string || type(count) != v:t_number
    return {shouldShowHints: false, skipReason: 'invalid_params', newCount: 0}
  endif
  if count > 1
    Reset()
    return {shouldShowHints: false, skipReason: 'numeric_prefix', newCount: 0}
  endif
  var options = type(repeat_config) == v:t_dict ? repeat_config : {}
  var enabled = get(options, 'enabled', true) != false
  var threshold = type(get(options, 'threshold', 0)) == v:t_number ? get(options, 'threshold', 50) : 50
  var previous = last_key_time
  last_key_time = now
  if enabled && previous > 0 && now - previous < threshold
    return {shouldShowHints: false, skipReason: 'key_repeat', newCount: state.motionCount}
  endif
  if now - state.lastMotionTime > state.timeoutMs
    state.motionCount = 1
    state.lastMotion = key
    state.lastMotionTime = now
    return {shouldShowHints: false, skipReason: 'timeout_reset', newCount: 1}
  endif
  state.motionCount = state.lastMotion ==# key ? state.motionCount + 1 : 1
  state.lastMotion = key
  state.lastMotionTime = now
  if state.motionCount >= get(per_key, key, default_count)
    state.motionCount = 0
    return {shouldShowHints: true, newCount: 0}
  endif
  return {shouldShowHints: false, skipReason: 'below_threshold', newCount: state.motionCount}
enddef
