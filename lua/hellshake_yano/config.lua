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
  per_key_min_length = 'perKeyMinLength', min_word_length = 'defaultMinWordLength',
  per_key_motion_count = 'perKeyMotionCount', default_motion_count = 'defaultMotionCount',
  directional_hint_filter = 'directionalHintFilter', both_min_word_length = 'bothMinWordLength',
  suppress_on_key_repeat = 'suppressOnKeyRepeat', key_repeat_threshold = 'keyRepeatThreshold',
  key_repeat_reset_delay = 'keyRepeatResetDelay', trigger_on_hjkl = 'triggerOnHjkl',
  counted_motions = 'countedMotions',
}
function M.resolve(options)
  options = vim.deepcopy(options or {})
  for old, new in pairs(aliases) do
    if options[new] == nil and options[old] ~= nil then options[new] = options[old] end
  end
  if options.defaultMotionCount == nil and options.motionCount ~= nil then
    options.defaultMotionCount = options.motionCount
  end
  return vim.tbl_extend('force', vim.deepcopy(M.defaults), options)
end
function M.min_length(config, key)
  return config.perKeyMinLength[key] or config.defaultMinWordLength
end
function M.motion_count(config, key)
  local count = config.perKeyMotionCount[key] or config.defaultMotionCount
  return type(count) == 'number' and count >= 1 and count or 3
end
return M
