local config_module = require('hellshake_yano.config')
local M = {}
local buffers = {}
function M.reset(buffer)
  if buffer then buffers[buffer] = nil else buffers = {} end
end
-- Clock is injectable, avoiding sleeps and nondeterministic repeat tests.
function M.record(buffer, key, count, config, now)
  now = now or vim.uv.hrtime() / 1e6
  if not config.enabled or not config.motionCounterEnabled or count > 1 then
    M.reset(buffer)
    return false
  end
  local state = buffers[buffer] or {keys = {}}
  buffers[buffer] = state
  local repeat_key = config.suppressOnKeyRepeat and state.last
    and now - state.last < config.keyRepeatThreshold
  state.last = now
  if repeat_key then state.repeat_until = now + config.keyRepeatResetDelay end
  if state.repeat_until and now < state.repeat_until then return false end
  local entry = state.keys[key] or {count = 0, last = now}
  if now - entry.last > config.motionTimeout then entry.count = 0 end
  entry.last = now
  entry.count = entry.count + 1
  state.keys[key] = entry
  if entry.count >= config_module.motion_count(config, key) then
    entry.count = 0
    return config.showHintOnMotionThreshold
  end
  return false
end
return M
