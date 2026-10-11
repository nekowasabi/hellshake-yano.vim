vim9script
# Snapshot of the same defaults as Lua/common/types/config.ts.
const defaults = json_decode(join(readfile(expand('<sfile>:p:h') .. '/defaults.json'), "\n"))
const aliases = {
  motion_count: 'motionCount', motion_timeout: 'motionTimeout',
  per_key_min_length: 'perKeyMinLength', default_min_word_length: 'defaultMinWordLength', min_word_length: 'defaultMinWordLength',
  per_key_motion_count: 'perKeyMotionCount', default_motion_count: 'defaultMotionCount',
  directional_hint_filter: 'directionalHintFilter', both_min_word_length: 'bothMinWordLength',
  suppress_on_key_repeat: 'suppressOnKeyRepeat', key_repeat_threshold: 'keyRepeatThreshold',
  key_repeat_reset_delay: 'keyRepeatResetDelay', trigger_on_hjkl: 'triggerOnHjkl',
  counted_motions: 'countedMotions', highlight_hint_marker: 'highlightHintMarker',
  highlight_hint_marker_current: 'highlightHintMarkerCurrent',
}

export def Normalize(options: dict<any>): dict<any>
  var result = deepcopy(options)
  if !has_key(result, 'directionalHintFilter') && has_key(result, 'directional_hint_filter')
    var value = result.directional_hint_filter
    if type(value) == v:t_number
      value = value != 0
    elseif type(value) == v:t_string
      value = tolower(value) ==# 'true'
    endif
    result.directionalHintFilter = value
  endif
  if type(get(result, 'continuousHintMode', false)) == v:t_number
    result.continuousHintMode = result.continuousHintMode != 0
  endif
  for [old, new] in items(aliases)
    if !has_key(result, new) && has_key(result, old)
      result[new] = result[old]
    endif
  endfor
  if !has_key(result, 'defaultMotionCount') && has_key(result, 'motionCount')
    result.defaultMotionCount = result.motionCount
  endif
  return result
enddef

def Check(valid: bool, message: string)
  if !valid
    throw 'hellshake-yano: ' .. message
  endif
enddef

export def Resolve(options: dict<any> = {}): dict<any>
  var result = extend(deepcopy(defaults), Normalize(options), 'force')
  for [key, default] in items(defaults)
    var value = result[key]
    if type(default) == v:t_bool
      Check(type(value) == v:t_bool, key .. ' must be boolean')
    elseif type(default) == v:t_number
      var minimum = index(['debounceDelay', 'keyRepeatThreshold', 'keyRepeatResetDelay'], key) >= 0 ? 0 : 1
      if key ==# 'motionTimeout'
        minimum = 100
      endif
      Check(type(value) == v:t_number && value >= minimum, key .. ' must be an integer >= ' .. minimum)
    endif
  endfor
  for key in ['perKeyMinLength', 'perKeyMotionCount']
    Check(type(result[key]) == v:t_dict, key .. ' must be a mapping')
    for value in values(result[key])
      Check(type(value) == v:t_number && value >= 1, key .. ' entries must be positive integers')
    endfor
  endfor
  for key in ['singleCharKeys', 'multiCharKeys', 'markers', 'cancelKeys', 'countedMotions', 'multiWindowExcludeTypes']
    var value = result[key]
    var char_keys = index(['singleCharKeys', 'multiCharKeys', 'markers'], key) >= 0
    if char_keys && type(value) == v:t_string
      Check(!empty(value), key .. ' must not be an empty string')
      value = split(value, '\zs')
    endif
    Check(type(value) == v:t_list, key .. ' must be a list or character string')
    if key ==# 'markers'
      Check(!empty(value), 'markers must not be empty')
    endif
    var seen: dict<bool> = {}
    for item in value
      Check(type(item) == v:t_string && !empty(item), key .. ' entries must be nonempty strings')
      if char_keys
        Check(strchars(item) == 1 && item !~# '[[:space:][:cntrl:]]', key .. ' entries must be printable characters')
        Check(!has_key(seen, item), key .. ' must contain unique values')
        if key ==# 'multiCharKeys'
          Check(item =~# '^[A-Za-z0-9]$', key .. ' must be alphanumeric')
        endif
        seen[item] = true
      endif
    endfor
  endfor
  Check(index(['start', 'end', 'overlay', 'both'], result.hintPosition) >= 0, 'invalid hintPosition')
  Check(index(['regex', 'tinysegmenter', 'hybrid'], result.wordDetectionStrategy) >= 0, 'invalid wordDetectionStrategy')
  for key in ['recenterCommand', 'dictionaryPath', 'debugLogFile']
    if has_key(result, key)
      Check(type(result[key]) == v:t_string, key .. ' must be a string')
    endif
  endfor
  for key in ['highlightHintMarker', 'highlightHintMarkerCurrent']
    var value = result[key]
    Check(type(value) == v:t_string || type(value) == v:t_dict, key .. ' must name a group or contain colors')
    if type(value) == v:t_string
      Check(strlen(value) <= 100 && value =~# '^[A-Za-z_][A-Za-z0-9_]*$', 'invalid highlight group')
    else
      for field in ['fg', 'bg', 'ctermfg', 'ctermbg']
        if has_key(value, field)
          var color = value[field]
          Check(type(color) == v:t_string || type(color) == v:t_number, 'invalid highlight color')
          Check(string(color) !~# '[\r\n|]', 'invalid highlight color')
        endif
      endfor
    endif
  endfor
  return result
enddef
