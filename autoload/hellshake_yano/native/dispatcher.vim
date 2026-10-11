vim9script
# Opt-in adapters for the Vim (not Neovim) dispatcher's public result shapes.
import autoload './runtime.vim' as Runtime
import autoload './core.vim' as Core
import autoload './config.vim' as Settings
import autoload './words.vim' as Words
import autoload './hints.vim' as Hints
import autoload './segmenter.vim' as Segmenter
import autoload './legacy_motion.vim' as Motion
var displays: list<dict<any>> = []
var measurements: dict<list<float>> = {}
const measured = {generateHints: 'hintGeneration', detectWordsVisible: 'wordDetection',
  detectWordsMultiWindow: 'wordDetection', detectWordsInVisualRange: 'wordDetection'}

def Detect(multi: bool): list<dict<any>>
  var options = Runtime.Config()
  options.multiWindowMode = multi
  var found = Words.Detect(options, '', Runtime.GetDictionary())
  for word in found
    word.lnum = word.line
    remove(word, 'line')
    word.end_col = word.col + strlen(word.text)
    if has_key(word, 'hintPriority')
      remove(word, 'hintPriority')
    endif
  endfor
  return found
enddef

export def ClearDisplay()
  var previous = displays
  displays = []
  for item in previous
    popup_close(item.id)
  endfor
enddef

def Display(win: any, line: any, col: any, hint: any): number
  if type(win) != v:t_number || type(line) != v:t_number || type(col) != v:t_number || type(hint) != v:t_string
    return -1
  endif
  var screen = screenpos(win, line, col)
  if screen.row == 0 || screen.col == 0
    return -1
  endif
  highlight default link HintMarker HellshakeYanoNativeHint
  var id = popup_create(hint, {line: screen.row, col: screen.col, pos: 'topleft',
    highlight: 'HintMarker', zindex: 1000, wrap: false, mapping: false})
  add(displays, {id: id, hint: hint})
  return id
enddef

def VisualRange(): dict<any>
  # Preserve legacy marks-based behavior. Block-mode bug is not silently changed.
  var current = mode()
  var kind = current ==# 'v' ? 'char' : current ==# 'V' ? 'line' : current ==# '' ? 'block' : 'none'
  return kind ==# 'none' ? {mode: 'none', start_line: 0, start_col: 0, end_line: 0, end_col: 0}
    : {mode: kind, start_line: line("'<"), start_col: col("'<"), end_line: line("'>"), end_col: col("'>")}
enddef

def Dispatch(method: string, args: list<any>): any
  var cfg = Runtime.Config()
  if method ==# 'getConfig'
    return cfg
  elseif method ==# 'updateConfig'
    Runtime.Update(args[0])
  elseif method ==# 'validateConfig'
    try
      Settings.Resolve(args[0])
      return {valid: true, errors: []}
    catch
      return {valid: false, errors: [v:exception]}
    endtry
  elseif method ==# 'enable' || method ==# 'disable'
    Runtime.Enable(method ==# 'enable')
  elseif method ==# 'toggle'
    Runtime.Toggle()
  elseif method ==# 'setCount'
    if type(get(args, 0, v:null)) == v:t_number
      Runtime.Update({motionCount: args[0], defaultMotionCount: args[0]})
    endif
  elseif method ==# 'setTimeout'
    if type(get(args, 0, v:null)) == v:t_number
      Runtime.Update({motionTimeout: args[0]})
    endif
  elseif method ==# 'showHints'
    # The legacy common API redraws existing labels; it does not detect/input.
    Core.Refresh()
  elseif method ==# 'showHintsWithKey' || method ==# 'showHintsInternal'
    var key = get(args, 0, '')
    Runtime.Show(type(key) == v:t_string ? key : '')
  elseif method ==# 'hideHints' || method ==# 'hideHintsMultiWindow'
    Runtime.Hide()
  elseif method ==# 'generateHints'
    return Hints.Generate(type(get(args, 0, 0)) == v:t_number ? get(args, 0, 0) : 0, cfg)
  elseif method ==# 'detectWordsVisible' || method ==# 'detectWordsMultiWindow'
    return Detect(method ==# 'detectWordsMultiWindow')
  elseif method ==# 'getMinWordLength'
    var key = get(args, 0, v:null)
    return type(key) == v:t_string ? get(cfg.perKeyMinLength, key, cfg.defaultMinWordLength) : 3
  elseif method ==# 'segmentJapaneseText'
    var value = get(args, 0, '')
    var text = type(value) == v:t_string ? value : string(value)
    var options = get(args, 1, {})
    return {segments: Segmenter.Process(text, get(options, 'mergeParticles', true)), success: true, source: 'tinysegmenter'}
  elseif method ==# 'displayShowHint'
    return Display(win_getid(), get(args, 0, v:null), get(args, 1, v:null), get(args, 2, v:null))
  elseif method ==# 'displayShowHintWithWindow'
    return Display(get(args, 0, v:null), get(args, 1, v:null), get(args, 2, v:null), get(args, 3, v:null))
  elseif method ==# 'displayGetPopupCount'
    return len(displays)
  elseif method ==# 'displayHideAll'
    ClearDisplay()
  elseif method ==# 'displayHighlightPartialMatches'
    var matches = get(args, 0, [])
    if type(matches) == v:t_list
      var kept: list<dict<any>> = []
      for item in displays
        if index(matches, item.hint) >= 0
          add(kept, item)
        else
          popup_close(item.id)
        endif
      endfor
      displays = kept
    endif
  elseif method =~# '^motion'
    if empty(Motion.State())
      Motion.Setup(cfg)
    endif
    if method ==# 'motionDetect'
      return Motion.Detect(get(args, 0, v:null), get(args, 1, v:null), get(args, 2, {}))
    elseif method ==# 'motionGetState'
      return Motion.State()
    elseif method ==# 'motionResetState'
      Motion.Reset()
    elseif method ==# 'motionSetThreshold'
      if type(get(args, 0, 0)) == v:t_number && get(args, 0, 0) > 0
        Motion.Threshold(args[0])
      endif
    elseif method ==# 'motionSetTimeout'
      if type(get(args, 0, 0)) == v:t_number && get(args, 0, 0) > 0
        Motion.Timeout(args[0])
      endif
    else
      throw 'hellshake-yano: unsupported Vim9 dispatcher method: ' .. method
    endif
  elseif method ==# 'reloadDictionary' || method ==# 'validateDictionary'
    Runtime.ReloadDictionary()
  elseif method ==# 'addToDictionary'
    if type(get(args, 0, v:null)) == v:t_string
      Runtime.AddWord(args[0], type(get(args, 1, '')) == v:t_string ? get(args, 1, '') : '',
        type(get(args, 2, '')) == v:t_string ? get(args, 2, '') : '')
    endif
  elseif method ==# 'editDictionary'
    Runtime.EditDictionary()
  elseif method ==# 'showDictionary'
    Runtime.ShowDictionary()
  elseif method ==# 'isInDictionary'
    var dictionary = Runtime.GetDictionary()
    return index(get(dictionary, 'customWords', []) + get(dictionary, 'preserveWords', []), get(args, 0, v:null)) >= 0
  elseif method ==# 'getStatistics'
    return Statistics()
  elseif method ==# 'clearDebugInfo' || method ==# 'clearPerformanceLog'
    measurements = {}
  elseif method ==# 'debug' || method ==# 'getDebugInfo'
    return Debug()
  elseif method ==# 'getVisualRange'
    return VisualRange()
  elseif method ==# 'detectWordsInVisualRange'
    var range = VisualRange()
    var found = Detect(false)
    return range.mode ==# 'none' ? found : filter(found, (_, word) => word.lnum >= range.start_line && word.lnum <= range.end_line)
  elseif method ==# 'getHighlightGroup'
    return 'HintMarker'
  elseif method ==# 'getFixedPositions' || method ==# 'getPartialMatches'
    return []
  elseif method ==# 'visualGetState'
    return {mode: 'none', active: false}
  elseif method ==# 'shouldRedraw'
    return true
  elseif index(['showDelayed', 'visualInit', 'clearCache', 'invalidateBufferCache'], method) >= 0
    # Legacy Vim stubs, or no-op because native extraction has no stale cache.
  elseif method ==# 'healthCheck'
    if !has('vim9script') || !has('popupwin')
      throw 'hellshake-yano: Vim9 +popupwin is required'
    endif
  else
    throw 'hellshake-yano: unsupported Vim9 dispatcher method: ' .. method
  endif
  return v:null
enddef

def Statistics(): dict<any>
  var metrics: dict<any> = {}
  for name in ['showHints', 'hideHints', 'wordDetection', 'hintGeneration']
    var values = get(measurements, name, [])
    var total = 0.0
    var maximum = 0.0
    var minimum = empty(values) ? 0.0 : values[0]
    for value in values
      total += value
      maximum = value > maximum ? value : maximum
      minimum = value < minimum ? value : minimum
    endfor
    metrics[name] = {count: len(values), average: empty(values) ? 0.0 : total / len(values), max: maximum, min: minimum}
  endfor
  var state = Core.State()
  var cache = {size: 0, maxSize: 0, hitRate: 0, hits: 0, misses: 0}
  return {cacheStats: {words: deepcopy(cache), hints: cache}, performanceStats: metrics,
    currentState: {initialized: true, hintsVisible: state.visible, currentHintsCount: len(state.targets)}}
enddef

def Debug(): dict<any>
  var state = Core.State()
  var hints: list<dict<any>> = []
  for target in state.targets
    var byte_col = get(target, 'wordCol', target.col)
    var lines = getbufline(target.bufnr, target.line)
    var prefix = empty(lines) ? '' : strpart(lines[0], 0, byte_col - 1)
    var column = str2nr(win_execute(target.winid, 'echo strdisplaywidth(' .. string(prefix) .. ')', 'silent')) + 1
    add(hints, {hint: target.hint, hintCol: target.col, hintByteCol: target.col,
      word: {text: target.text, line: target.line, col: column, byteCol: byte_col, winid: target.winid, bufnr: target.bufnr}})
  endfor
  var metrics: dict<any> = {}
  for name in ['showHints', 'hideHints', 'wordDetection', 'hintGeneration']
    metrics[name] = copy(get(measurements, name, []))
  endfor
  return {config: Runtime.Config(), hintsVisible: state.visible, currentHints: hints,
    metrics: metrics, timestamp: localtime() * 1000}
enddef

export def Request(method: string, args: list<any>): any
  var started = reltime()
  try
    return Dispatch(method, args)
  finally
    var name = get(measured, method, '')
    if !empty(name)
      if !has_key(measurements, name)
        measurements[name] = []
      endif
      add(measurements[name], reltimefloat(reltime(started)) * 1000)
      if len(measurements[name]) > 100
        remove(measurements[name], 0)
      endif
    endif
  endtry
  return v:null
enddef
