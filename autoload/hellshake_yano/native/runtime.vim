vim9script
import autoload './config.vim' as Settings
import autoload './core.vim' as Core
import autoload './words.vim' as Words
import autoload './motion.vim' as Motion

var config: dict<any> = {}
var active = false
var owned_maps: list<dict<any>> = []
var owned_commands: dict<string> = {}

export def Setup(options: dict<any> = {})
  var resolved = Settings.Resolve(options)
  if !empty(get(resolved, 'dictionaryPath', ''))
    throw 'hellshake-yano: Vim9 dictionary integration is not implemented yet'
  endif
  var reactivate = active
  Deactivate()
  Core.Setup(resolved)
  config = resolved
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
enddef

export def Enable(enabled: bool)
  if empty(config)
    Setup()
  endif
  config.enabled = enabled
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
    if input != 0
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
    var targets = Core.Show(Words.Detect(config, key))
    if empty(targets)
      return 'empty'
    endif
    redraw
    var status: string
    try
      status = ReadInput()
    catch
      Hide()
      throw v:exception
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

export def Expression(key: string): string
  if Motion.Record(bufnr(), key, v:count1, Config())
    return KeyCodes(key) .. "\<Cmd>call hellshake_yano#native#runtime#Show(" .. string(key) .. ")\<CR>"
  endif
  return KeyCodes(key)
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

def Command(name: string, action: string)
  if exists(':' .. name) == 2
    return
  endif
  execute 'command ' .. name .. ' call hellshake_yano#native#runtime#' .. action
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
        if empty(maparg(key, mode))
          var rhs = 'hellshake_yano#native#runtime#Expression(' .. string(key) .. ')'
          mapset(mode, false, {lhs: key, lhsraw: KeyCodes(key), rhs: rhs, noremap: 1, silent: 1, expr: 1,
            buffer: 0, nowait: 0, sid: 0, lnum: 0, script: 0})
          add(owned_maps, {key: key, mode: mode, mapping: maparg(key, mode, false, true)})
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
    throw v:exception
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
