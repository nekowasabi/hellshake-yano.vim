vim9script
import autoload './hints.vim' as Hints

# Explicit opt-in primitive. Existing plugin startup does not load this module.
var config: dict<any> = {}
var targets: list<dict<any>> = []
var popups: list<number> = []
var prefix = ''
var visible = false
var generation = 0

export def Hide()
  var previous = popups
  popups = []
  targets = []
  prefix = ''
  visible = false
  generation += 1
  for id in previous
    popup_close(id)
  endfor
enddef

def Highlight(name: string, value: any)
  var attributes: dict<any> = {name: name}
  if type(value) == v:t_string
    attributes.linksto = value
    attributes.force = true
  else
    for [key, field] in items({fg: 'guifg', bg: 'guibg', ctermfg: 'ctermfg', ctermbg: 'ctermbg'})
      if has_key(value, key)
        attributes[field] = type(value[key]) == v:t_number ? string(value[key]) : value[key]
      endif
    endfor
  endif
  hlset([{name: name, cleared: true, linksto: 'NONE'}])
  if hlset([attributes]) != 0
    throw 'hellshake-yano: invalid highlight attributes'
  endif
enddef

export def Setup(options: dict<any> = {})
  var names = ['HellshakeYanoNativeHint', 'HellshakeYanoNativeCurrent']
  var saved = map(copy(names), (_, name) => hlget(name))
  try
    Highlight(names[0], get(options, 'highlightHintMarker', 'DiffAdd'))
    Highlight(names[1], get(options, 'highlightHintMarkerCurrent', 'DiffText'))
  catch
    for i in range(len(names))
      hlset([{name: names[i], cleared: true, linksto: 'NONE'}])
      if !empty(saved[i])
        hlset(saved[i])
      endif
    endfor
    throw 'hellshake-yano: ' .. v:exception
  endtry
  Hide()
  config = deepcopy(options)
  highlight default link HellshakeYanoMarker HellshakeYanoNativeHint
  highlight default link HellshakeYanoHint HellshakeYanoNativeHint
enddef

export def State(): dict<any>
  return {visible: visible, prefix: prefix, targets: deepcopy(targets),
    popup_ids: copy(popups), generation: generation}
enddef

def Valid(target: dict<any>): bool
  if empty(getwininfo(target.winid)) || winbufnr(target.winid) != target.bufnr
    || getbufvar(target.bufnr, 'changedtick') != target.changedtick
    return false
  endif
  var lines = getbufline(target.bufnr, target.line)
  if empty(lines) || target.col < 1 || target.col > strlen(lines[0])
    return false
  endif
  var byte = char2nr(strpart(lines[0], target.col - 1, 1), true)
  return byte < 128 || byte >= 192
enddef

def Render()
  var previous = popups
  popups = []
  for id in previous
    popup_close(id)
  endfor
  try
    for target in targets
      if !Valid(target)
        continue
      endif
      var position = screenpos(target.winid, target.line, target.col)
      if position.row == 0 || position.col == 0
        continue
      endif
      var label = target.hint
      var group = !empty(prefix) && stridx(label, prefix) == 0 ? 'HellshakeYanoNativeCurrent' : 'HellshakeYanoNativeHint'
      var id = popup_create(label, {line: position.row, col: position.col,
        pos: 'topleft', fixed: true, wrap: false, padding: [0, 0, 0, 0],
        mapping: false, highlight: group, zindex: 200,
        scrollbar: false})
      add(popups, id)
    endfor
  catch
    Hide()
    throw 'hellshake-yano: ' .. v:exception
  endtry
enddef

export def Show(words: list<dict<any>>): list<dict<any>>
  Hide()
  var source = deepcopy(words)
  for word in source
    word.winid = get(word, 'winid', win_getid())
    word.bufnr = get(word, 'bufnr', winbufnr(word.winid))
    word.changedtick = getbufvar(word.bufnr, 'changedtick', -1)
  endfor
  var labels = Hints.Generate(len(source) * (get(config, 'hintPosition', 'start') ==# 'both' ? 2 : 1), config)
  targets = Hints.Assign(source, labels, {line: line('.'), col: col('.'), winid: win_getid()}, config)
  visible = !empty(targets)
  Render()
  return deepcopy(targets)
enddef

export def Refresh()
  if visible
    Render()
  endif
enddef

export def Input(key: string): dict<any>
  if !visible
    return {status: 'idle'}
  endif
  var multi = get(config, 'multiWindowMode', false)
  if key ==# "\<Esc>" || key ==# "\<C-C>" || empty(key)
    Hide()
    return {status: 'cancelled'}
  endif
  if !multi && key =~# '^[a-z]$'
    Hide()
    return {status: 'replay', key: key}
  endif
  var cancel = get(config, 'cancelKeys', [])
  var normalized = key ==# "\r" ? '<CR>' : toupper(key)
  var is_cancel = false
  for item in cancel
    is_cancel = is_cancel || normalized ==# (item ==# "\r" ? '<CR>' : toupper(item))
  endfor
  if multi && is_cancel
    Hide()
    return {status: 'replay', key: key}
  endif
  var candidate = prefix .. key
  var matches = filter(copy(targets), (_, target) => stridx(target.hint, candidate) == 0)
  if empty(matches)
    Hide()
    return multi ? {status: 'cancelled'} : {status: 'replay', key: key}
  endif
  var exact = filter(copy(matches), (_, target) => target.hint ==# candidate)
  var prefer_pair = !multi && get(config, 'useHintGroups', true)
    && get(config, 'useNumericMultiCharHints', false) && candidate =~# '^\d$' && len(matches) > 1
  if !empty(exact) && !prefer_pair
    var target = deepcopy(exact[0])
    var valid = Valid(target)
    Hide()
    if !valid
      return {status: 'stale'}
    endif
    if !win_gotoid(target.winid)
      return {status: 'stale'}
    endif
    cursor(target.line, target.col)
    return {status: 'jump', target: target}
  endif
  prefix = candidate
  Render()
  return {status: 'partial'}
enddef
