local M = {}
-- Keep these defaults aligned with common/types/config.ts until S3 removes it.
M.defaults = {
  enabled = true, markers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', motionCount = 3,
  motionTimeout = 2000, hintPosition = 'start', triggerOnHjkl = true,
  countedMotions = {}, maxHints = 336, debounceDelay = 50, useNumbers = false,
  directionalHintFilter = false, highlightSelected = false, debugCoordinates = false,
  singleCharKeys = 'ASDFGHJKLNM0123456789', multiCharKeys = 'BCEIOQRTUVWXYZ',
  maxSingleCharHints = 21, cancelKeys = {}, useHintGroups = true,
  continuousHintMode = false, recenterCommand = 'normal! zz', maxContinuousJumps = 50,
  highlightHintMarker = 'DiffAdd', highlightHintMarkerCurrent = 'DiffText',
  suppressOnKeyRepeat = true, keyRepeatThreshold = 50, keyRepeatResetDelay = 300,
  useJapanese = false, wordDetectionStrategy = 'hybrid', enableTinySegmenter = true,
  segmenterThreshold = 4, japaneseMinWordLength = 2, japaneseMergeParticles = true,
  japaneseMergeThreshold = 2, perKeyMinLength = {}, defaultMinWordLength = 3,
  perKeyMotionCount = {}, defaultMotionCount = 3, motionCounterEnabled = true,
  motionCounterThreshold = 3, motionCounterTimeout = 2000, showHintOnMotionThreshold = true,
  debugMode = false, performanceLog = false, debug = false,
  useNumericMultiCharHints = false, bothMinWordLength = 5, multiWindowMode = false,
  multiWindowExcludeTypes = {'help', 'quickfix', 'terminal', 'popup', 'nofile'},
  multiWindowMaxWindows = 4,
}
local aliases = {
  motion_count = 'motionCount', motion_timeout = 'motionTimeout',
  per_key_min_length = 'perKeyMinLength', default_min_word_length = 'defaultMinWordLength', min_word_length = 'defaultMinWordLength',
  per_key_motion_count = 'perKeyMotionCount', default_motion_count = 'defaultMotionCount',
  directional_hint_filter = 'directionalHintFilter', both_min_word_length = 'bothMinWordLength',
  suppress_on_key_repeat = 'suppressOnKeyRepeat', key_repeat_threshold = 'keyRepeatThreshold',
  key_repeat_reset_delay = 'keyRepeatResetDelay', trigger_on_hjkl = 'triggerOnHjkl',
  counted_motions = 'countedMotions',
}
function M.resolve(options)
  assert(options == nil or type(options) == 'table', 'configuration must be a table')
  options = vim.deepcopy(options or {})
  if options.directionalHintFilter == nil and options.directional_hint_filter ~= nil then
    local value = options.directional_hint_filter
    if type(value) == 'number' then value = value ~= 0
    elseif type(value) == 'string' then value = value:lower() == 'true' end
    options.directionalHintFilter = value
  end
  if type(options.continuousHintMode) == 'number' then options.continuousHintMode = options.continuousHintMode ~= 0 end
  for old, new in pairs(aliases) do
    if options[new] == nil and options[old] ~= nil then options[new] = options[old] end
  end
  if options.defaultMotionCount == nil and options.motionCount ~= nil then
    options.defaultMotionCount = options.motionCount
  end
  local resolved = vim.tbl_extend('force', vim.deepcopy(M.defaults), options)
  local validation = M.validate(resolved)
  assert(validation.valid, table.concat(validation.errors, '; '))
  return resolved
end
function M.validate(config)
  local errors = {}
  local function check(ok, message) if not ok then errors[#errors + 1] = message end end
  if type(config) ~= 'table' then return {valid = false, errors = {'configuration must be a table'}} end
  for key, default in pairs(M.defaults) do
    local value = config[key]
    if value ~= nil then
      if type(default) == 'boolean' then check(type(value) == 'boolean', key .. ' must be boolean')
      elseif type(default) == 'number' then
        local minimum = (key == 'debounceDelay' or key == 'keyRepeatThreshold' or key == 'keyRepeatResetDelay') and 0 or 1
        if key == 'motionTimeout' then minimum = 100 end
        check(type(value) == 'number' and value < math.huge and value >= minimum and value == math.floor(value),
          key .. ' must be an integer >= ' .. minimum)
      end
    end
  end
  for _, key in ipairs({'perKeyMinLength', 'perKeyMotionCount'}) do
    if config[key] ~= nil then
      check(type(config[key]) == 'table', key .. ' must be a mapping')
      if type(config[key]) == 'table' then
        for motion, value in pairs(config[key]) do
          check(type(motion) == 'string' and type(value) == 'number' and value >= 1
            and value < math.huge and value == math.floor(value), key .. ' entries must be positive integers')
        end
      end
    end
  end
  for _, key in ipairs({'singleCharKeys', 'multiCharKeys', 'markers', 'cancelKeys', 'countedMotions', 'multiWindowExcludeTypes'}) do
    local value = config[key]
    if value ~= nil then
      local list = value
      local char_keys = key == 'singleCharKeys' or key == 'multiCharKeys' or key == 'markers'
      if char_keys and type(value) == 'string' then list = vim.fn.split(value, '\\zs') end
      local is_list = type(list) == 'table' and vim.islist(list)
      check(is_list, key .. ' must be a list' .. (char_keys and ' or string' or ''))
      if is_list then
        local seen = {}
        for _, item in ipairs(list) do
          local valid = type(item) == 'string' and #item > 0
          check(valid, key .. ' entries must be nonempty strings')
          if valid and char_keys then
            check(vim.fn.strchars(item) == 1 and not item:match('[%s%c]'), key .. ' entries must be single printable characters')
            if key == 'multiCharKeys' then check(item:match('^[A-Za-z0-9]$'), key .. ' must be alphanumeric') end
            check(not seen[item], key .. ' must contain unique values')
            seen[item] = true
          end
        end
      end
    end
  end
  if config.hintPosition ~= nil then
    check(vim.list_contains({'start', 'end', 'overlay', 'both'}, config.hintPosition), 'invalid hintPosition')
  end
  if config.wordDetectionStrategy ~= nil then
    check(vim.list_contains({'regex', 'tinysegmenter', 'hybrid'}, config.wordDetectionStrategy), 'invalid wordDetectionStrategy')
  end
  for _, key in ipairs({'recenterCommand', 'dictionaryPath', 'debugLogFile'}) do
    if config[key] ~= nil then check(type(config[key]) == 'string', key .. ' must be a string') end
  end
  for _, key in ipairs({'highlightHintMarker', 'highlightHintMarkerCurrent'}) do
    local value = config[key]
    if value ~= nil then
      if type(value) == 'string' then
        check(#value <= 100 and value:match('^[A-Za-z_][A-Za-z0-9_]*$'), key .. ' must name a highlight group')
      elseif type(value) == 'table' then
        for _, color in ipairs({'fg', 'bg'}) do
          local name = value[color]
          if name ~= nil then
            check(type(name) == 'string' and (name:upper() == 'NONE' or vim.api.nvim_get_color_by_name(name) >= 0),
              key .. '.' .. color .. ' is not a recognized color')
          end
        end
      else check(false, key .. ' must be a highlight group or color table') end
    end
  end
  return {valid = #errors == 0, errors = errors}
end

function M.min_length(config, key)
  return config.perKeyMinLength[key] or config.defaultMinWordLength
end
function M.motion_count(config, key)
  local count = config.perKeyMotionCount[key] or config.defaultMotionCount
  return type(count) == 'number' and count >= 1 and count or 3
end
return M
