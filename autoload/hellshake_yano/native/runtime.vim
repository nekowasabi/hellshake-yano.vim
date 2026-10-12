vim9script
import autoload './config.vim' as Settings
import autoload './core.vim' as Core
import autoload './words.vim' as Words
import autoload './motion.vim' as Motion
import autoload './dictionary.vim' as Dictionary

var config: dict<any> = {}
var dictionary: dict<any> = {}
var active = false
var owned_maps: list<dict<any>> = []
var owned_commands: dict<string> = {}

export def Setup(options: dict<any> = {})
  var resolved = Settings.Resolve(options)
  var path = get(resolved, 'dictionaryPath', '')
  var loaded = empty(path) ? {} : Dictionary.Load(path)
  var reactivate = active
  Core.Setup(resolved)
  Deactivate()
  config = resolved
  dictionary = loaded
  if get(g:, 'hellshake_yano_vim_native_bridge', false)
    SyncBridge()
  endif
  if reactivate
    Activate()
  endif
enddef

export def Config(): dict<any>
  if empty(config)
    Setup()
  endif
  return deepcopy(config)
enddef

export def Hide()
  Core.Hide()
  hellshake_yano#native#dispatcher#ClearDisplay()
enddef

export def Enable(enabled: bool)
  if empty(config)
    Setup()
  endif
  config.enabled = enabled
  if get(g:, 'hellshake_yano_vim_native_bridge', false)
    g:hellshake_yano = Config()
  endif
  Motion.Reset()
  if !enabled
    Hide()
  endif
enddef

def ReadInput(): string
  var generation = Core.State().generation
  var started = reltime()
  while Core.State().generation == generation
    if reltimefloat(reltime(started)) * 1000 >= config.motionTimeout
      Hide()
      return 'timeout'
    endif
    var input = getchar(0)
    if type(input) == v:t_string || input != 0
      var key = type(input) == v:t_number ? nr2char(input) : input
      var result = Core.Input(key)
      if result.status !=# 'partial'
        if result.status ==# 'replay'
          feedkeys(result.key, 'm')
        endif
        return result.status
      endif
      redraw
    else
      sleep 10m
    endif
  endwhile
  return 'cancelled'
enddef

export def Show(key: string = ''): string
  if empty(config)
    Setup()
  endif
  if !config.enabled
    return 'disabled'
  endif
  var jumps = 0
  var last_buffer = -1
  while true
    redraw
    var targets = Core.Show(Words.Detect(config, key, dictionary))
    if empty(targets)
      return 'empty'
    endif
    redraw
    var status: string
    try
      status = ReadInput()
    catch
      Hide()
      throw 'hellshake-yano: ' .. v:exception
    endtry
    if status !=# 'jump' || !config.continuousHintMode
      return status
    endif
    jumps += 1
    var buffer = bufnr()
    if (last_buffer != -1 && buffer != last_buffer) || jumps >= config.maxContinuousJumps
      return status
    endif
    last_buffer = buffer
    try
      execute empty(trim(config.recenterCommand)) ? 'normal! zz' : config.recenterCommand
    catch
      Hide()
      return 'recenter-failed'
    endtry
    if !config.enabled
      return 'disabled'
    endif
  endwhile
  return 'cancelled'
enddef

def KeyCodes(key: string): string
  return eval('"' .. substitute(escape(key, '"\'), '<', '\\<', 'g') .. '"')
enddef

# rhs: the user's own noremap rhs for key (e.g. j -> gj), kept as the motion.
export def Expression(key: string, rhs: string = ''): string
  var motion = KeyCodes(empty(rhs) ? key : rhs)
  if Motion.Record(bufnr(), key, v:count1, Config())
    return motion .. "\<Cmd>call hellshake_yano#native#runtime#Show(" .. string(key) .. ")\<CR>"
  endif
  return motion
enddef

# Only plain global noremap motions (j -> gj) are wrapped; command maps stay the user's.
# ponytail: rhs heuristic, not a parser; widen if users need other wrapped forms.
def Wrappable(existing: dict<any>): bool
  if get(existing, 'noremap', 0) != 1 || get(existing, 'expr', 1) != 0
      || get(existing, 'buffer', 1) != 0 || empty(get(existing, 'rhs', ''))
    return false
  endif
  var rhs = tolower(existing.rhs)
  return rhs !~# '^:' && rhs !~# '<\%(cr\|cmd\|sid\|snr\|plug\)>\?'
enddef

export def Toggle()
  Enable(!Config().enabled)
enddef

export def Wipe(buffer: number)
  Motion.Reset(buffer)
  for target in Core.State().targets
    if target.bufnr == buffer
      Hide()
      break
    endif
  endfor
enddef

def Command(name: string, action: string, arguments: string = '')
  if exists(':' .. name) == 2
    return
  endif
  execute 'command ' .. arguments .. ' ' .. name .. ' call hellshake_yano#native#runtime#' .. action
  owned_commands[name] = execute('silent command ' .. name)
enddef

export def Activate()
  if active
    return
  endif
  var settings = Config()
  active = true
  try
  Command('HellshakeYano', 'Show()')
  Command('HellshakeYanoShow', 'Show()')
  Command('HellshakeYanoHide', 'Hide()')
  Command('HellshakeYanoEnable', 'Enable(v:true)')
  Command('HellshakeYanoDisable', 'Enable(v:false)')
  Command('HellshakeYanoToggle', 'Toggle()')
  Command('HellshakeYanoSetCount', "SetNumber('count', <q-args>)", '-nargs=1')
  Command('HellshakeYanoSetTimeout', "SetNumber('timeout', <q-args>)", '-nargs=1')
  Command('HellshakeYanoSetHighlight', 'SetHighlight(<f-args>)', '-nargs=+')
  Command('HellshakeYanoSetCountedMotions', 'SetMotions([<f-args>])', '-nargs=+')
  Command('HellshakeYanoDebug', 'Debug(v:false)')
  Command('HellshakeYanoDebugConfig', 'Debug(v:true)')
  Command('HellshakeYanoReloadDict', 'ReloadDictionary()')
  Command('HellshakeYanoValidateDict', 'ReloadDictionary()')
  Command('HellshakeYanoEditDict', 'EditDictionary()')
  Command('HellshakeYanoShowDict', 'ShowDictionary()')
  if exists(':HellshakeYanoAddWord') != 2
    command -nargs=+ HellshakeYanoAddWord call hellshake_yano#native#runtime#AddWord(<f-args>)
    owned_commands.HellshakeYanoAddWord = execute('silent command HellshakeYanoAddWord')
  endif
  var motions = copy(settings.countedMotions)
  if empty(motions) && settings.triggerOnHjkl
    motions = ['h', 'j', 'k', 'l']
  endif
  for key in keys(settings.perKeyMinLength) + keys(settings.perKeyMotionCount)
    if index(motions, key) < 0
      add(motions, key)
    endif
  endfor
  if settings.motionCounterEnabled
    for key in motions
      for mode in ['n', 'x']
        var existing = maparg(key, mode, false, true)
        var original = !empty(existing) && Wrappable(existing) ? existing : {}
        if empty(existing) || !empty(original)
          var rhs = 'hellshake_yano#native#runtime#Expression(' .. string(key)
            .. (empty(original) ? '' : ', ' .. string(original.rhs)) .. ')'
          mapset(mode, false, {lhs: key, lhsraw: KeyCodes(key), rhs: rhs, noremap: 1, silent: 1, expr: 1,
            buffer: 0, nowait: 0, sid: 0, lnum: 0, script: 0})
          add(owned_maps, {key: key, mode: mode, mapping: maparg(key, mode, false, true), original: original})
        endif
      endfor
    endfor
  endif
  augroup HellshakeYanoNativeVim9
    autocmd!
    autocmd BufWipeout * call hellshake_yano#native#runtime#Wipe(str2nr(expand('<abuf>')))
  augroup END
  catch
    Deactivate()
    throw 'hellshake-yano: ' .. v:exception
  endtry
enddef

export def Deactivate()
  Hide()
  Motion.Reset()
  active = false
  for item in owned_maps
    if maparg(item.key, item.mode, false, true) == item.mapping
      # mapset has no remove operation. Escape separators in the Ex LHS.
      execute item.mode .. 'unmap ' .. escape(keytrans(item.mapping.lhsraw), ' |')
      if !empty(item.original)
        mapset(item.mode, false, item.original)
      endif
    endif
  endfor
  for [name, definition] in items(owned_commands)
    if exists(':' .. name) == 2 && execute('silent command ' .. name) ==# definition
      execute 'delcommand ' .. name
    endif
  endfor
  owned_maps = []
  owned_commands = {}
  augroup HellshakeYanoNativeVim9
    autocmd!
  augroup END
enddef

export def GetDictionary(): dict<any>
  return deepcopy(dictionary)
enddef

export def ReloadDictionary(): dict<any>
  var path = get(Config(), 'dictionaryPath', '')
  var loaded = empty(path) ? {} : Dictionary.Load(path)
  dictionary = loaded
  Hide()
  return GetDictionary()
enddef

def SyncBridge()
  g:hellshake_yano = Config()
  hellshake_yano#config#clear_motion_count_cache()
  hellshake_yano_vim#hint_generator#clear_cache()
  hellshake_yano_vim#word_detector#clear_cache()
  silent call hellshake_yano_vim#dictionary#clear_cache()
enddef

export def Update(options: dict<any>)
  Setup(extend(Config(), Settings.Normalize(options), 'force'))
enddef

export def EnableBridge()
  SyncBridge()
  g:hellshake_yano_vim_native_bridge = true
enddef

export def DisableBridge()
  Hide()
  g:hellshake_yano_vim_native_bridge = false
  hellshake_yano_vim#backend#cancel_pending()
  hellshake_yano#native#dispatcher#ClearDisplay()
enddef

export def AddWord(word: string, meaning: string = '', kind: string = '')
  var path = get(Config(), 'dictionaryPath', '.hellshake-yano/dictionary.json')
  var loaded = Dictionary.Add(path, word, meaning, kind)
  if !has_key(config, 'dictionaryPath')
    Update({dictionaryPath: path})
  endif
  dictionary = loaded
  Hide()
  if get(g:, 'hellshake_yano_vim_native_bridge', false)
    SyncBridge()
  endif
enddef

export def EditDictionary()
  var path = expand(get(Config(), 'dictionaryPath', '.hellshake-yano/dictionary.json'))
  execute 'edit ' .. fnameescape(path)
enddef

export def ShowDictionary()
  var data = GetDictionary()
  for pattern in get(data, 'hintPatterns', [])
    if has_key(pattern, 'vimPattern')
      remove(pattern, 'vimPattern')
    endif
  endfor
  new
  setlocal buftype=nofile bufhidden=wipe noswapfile nobuflisted
  execute 'file [HellshakeYano Dictionary ' .. bufnr() .. ']'
  setline(1, json_encode(data))
  setlocal filetype=json nomodifiable
enddef

# Command arguments remain data; settings validation is shared with Setup().
export def SetNumber(kind: string, value: string)
  if value !~# '^\d\+$'
    throw 'hellshake-yano: expected a positive integer'
  endif
  var number = str2nr(value)
  if kind ==# 'count'
    Update({motionCount: number, defaultMotionCount: number})
  elseif kind ==# 'timeout'
    Update({motionTimeout: number})
  else
    throw 'hellshake-yano: unknown numeric setting'
  endif
enddef

export def SetHighlight(marker: string, current: string)
  Update({highlightHintMarker: marker, highlightHintMarkerCurrent: current})
enddef

export def SetMotions(motions: list<string>)
  Update({countedMotions: motions})
enddef

export def Debug(configuration: bool)
  echo configuration ? Config() : Core.State()
enddef
