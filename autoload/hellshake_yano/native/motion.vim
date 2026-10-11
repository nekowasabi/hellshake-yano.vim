vim9script
var buffers: dict<dict<any>> = {}

export def Reset(buffer: number = -1)
  if buffer == -1
    buffers = {}
  elseif has_key(buffers, buffer)
    remove(buffers, buffer)
  endif
enddef

# Millisecond clock can be injected for deterministic tests.
export def Record(buffer: number, key: string, count: number, config: dict<any>,
    now: float = reltimefloat(reltime()) * 1000): bool
  if !config.enabled || !config.motionCounterEnabled || count > 1
    Reset(buffer)
    return false
  endif
  if !has_key(buffers, buffer)
    buffers[buffer] = {keys: {}}
  endif
  var state = buffers[buffer]
  var repeated = config.suppressOnKeyRepeat && has_key(state, 'last')
    && now - state.last < config.keyRepeatThreshold
  state.last = now
  if repeated
    state.repeat_until = now + config.keyRepeatResetDelay
  endif
  if has_key(state, 'repeat_until') && now < state.repeat_until
    return false
  endif
  var entry = get(state.keys, key, {count: 0, last: now})
  if now - entry.last > config.motionTimeout
    entry.count = 0
  endif
  entry.last = now
  entry.count += 1
  state.keys[key] = entry
  if entry.count >= get(config.perKeyMotionCount, key, config.defaultMotionCount)
    entry.count = 0
    return config.showHintOnMotionThreshold
  endif
  return false
enddef
