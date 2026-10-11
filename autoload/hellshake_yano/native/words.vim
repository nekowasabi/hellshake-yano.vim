vim9script
import autoload './segmenter.vim' as Segmenter

# Keep extraction behavior aligned with Lua and the pinned TypeScript fixtures.
def Japanese(char: string): string
  var n = char2nr(char)
  if n >= 0x3040 && n <= 0x309f
    return 'hiragana'
  elseif n >= 0x30a0 && n <= 0x30ff
    return 'katakana'
  elseif (n >= 0x4e00 && n <= 0x9faf) || (n >= 0x3400 && n <= 0x4dbf)
    return 'kanji'
  endif
  return ''
enddef

def RegexExtract(line: string, number: number, config: dict<any>, key: string): list<dict<any>>
  var raw: list<dict<any>> = []
  var token = ''
  var start = 1
  var col = 1
  for char in split(line, '\zs')
    var accepted = char =~# '^[A-Za-z0-9]$' || (get(config, 'useJapanese', false) && (char ==# '_' || !empty(Japanese(char))))
    if accepted
      if empty(token)
        start = col
      endif
      token ..= char
    else
      if !empty(token)
        add(raw, {text: token, col: start})
      endif
      token = ''
    endif
    col += strlen(char)
  endfor
  if !empty(token)
    add(raw, {text: token, col: start})
  endif
  var separated: list<dict<any>> = []
  for word in raw
    var text = word.text
    var snake = stridx(text, '_') >= 0 && text =~# '^[A-Za-z0-9_]\+$'
      && text[0] !=# '_' && text[-1 : ] !=# '_' && stridx(text, '__') < 0
    if snake
      var offset = word.col
      for part in split(text, '_')
        if strlen(part) >= 3
          add(separated, {text: part, line: number, col: offset})
        endif
        offset += strlen(part) + 1
      endfor
    elseif text =~# '^0[xX][0-9a-fA-F]\+$' || text =~# '^0[bB][01]\+$'
      add(separated, {text: strpart(text, 1), line: number, col: word.col + 1})
    else
      var has_japanese = text =~# '[\u3040-\u30ff\u4e00-\u9faf]'
      if has_japanese && strchars(text) > 2
        var part = ''
        var kind = ''
        var offset = word.col
        var position = offset
        for char in split(text, '\zs')
          var current = char =~# '^[A-Za-z0-9]$' ? 'latin' : Japanese(char)
          if empty(current) || current !=# kind || (current ==# 'kanji' && strchars(part) >= 4)
            if !empty(part)
              add(separated, {text: part, line: number, col: position})
            endif
            part = ''
            kind = ''
          endif
          if !empty(current)
            if empty(part)
              position = offset
            endif
            part ..= char
            kind = current
          endif
          offset += strlen(char)
        endfor
        if !empty(part)
          add(separated, {text: part, line: number, col: position})
        endif
      else
        add(separated, {text: text, line: number, col: word.col})
      endif
    endif
  endfor
  var result: list<dict<any>> = []
  var minimum = get(get(config, 'perKeyMinLength', {}), key, get(config, 'defaultMinWordLength', 3))
  for word in separated[ : 99]
    var length = strchars(word.text)
    if length >= minimum && length <= get(config, 'maxWordLength', 50)
      add(result, word)
    endif
  endfor
  return result
enddef

const particles = ['の', 'が', 'を', 'に', 'へ', 'と', 'から', 'まで', 'より', 'は', 'も',
  'こそ', 'さえ', 'でも', 'しか', 'だけ', 'ばかり', 'ほど', 'くらい', 'など', 'なり',
  'やら', 'か', 'のみ', 'ば', 'ても', 'のに', 'ので', 'けど', 'けれど', 'けれども',
  'し', 'て', 'で', 'ながら', 'つつ', 'たり', 'な', 'よ', 'ね', 'ぞ', 'ぜ', 'さ',
  'わ', 'です', 'ます', 'だ', 'である', 'や', 'とか', 'だの']

export def Extract(line: string, number: number, config: dict<any>, key: string = ''): list<dict<any>>
  var regex = RegexExtract(line, number, config, key)
  var has_japanese = false
  for char in split(line, '\zs')
    has_japanese = has_japanese || !empty(Japanese(char))
  endfor
  var strategy = get(config, 'wordDetectionStrategy', 'hybrid')
  if !get(config, 'useJapanese', false) || !get(config, 'enableTinySegmenter', true) || !has_japanese
    || strategy ==# 'regex' || strchars(line) < get(config, 'segmenterThreshold', 4)
    return regex
  endif
  var segments = Segmenter.Segment(line)
  var segmented: list<dict<any>> = []
  var offset = 1
  var i = 0
  var merge = get(config, 'japaneseMergeParticles', true)
  while i < len(segments)
    var text = segments[i]
    var start = offset
    offset += strlen(text)
    i += 1
    if merge && text !~# '^\s*$'
      while i < len(segments) && index(particles, segments[i]) >= 0
        text ..= segments[i]
        offset += strlen(segments[i])
        i += 1
      endwhile
    endif
    if text !~# '^\s*$' && !(merge && index(particles, text) >= 0)
      && strchars(text) >= get(config, 'japaneseMinWordLength', 2)
      add(segmented, {text: text, line: number, col: start})
    endif
  endwhile
  if strategy ==# 'tinysegmenter'
    return segmented
  endif
  var by_col: dict<dict<any>> = {}
  for word in regex
    by_col[word.col] = word
  endfor
  for word in segmented
    if !has_key(by_col, word.col) || strchars(word.text) >= strchars(by_col[word.col].text)
      by_col[word.col] = word
    endif
  endfor
  return sort(values(by_col), (a, b) => a.col - b.col)
enddef

export def Windows(config: dict<any>): list<number>
  var current = win_getid()
  if !get(config, 'multiWindowMode', false)
    return [current]
  endif
  var windows = [current]
  for info in getwininfo()
    if info.tabnr == tabpagenr() && info.winid != current && index(popup_list(), info.winid) < 0
      add(windows, info.winid)
    endif
  endfor
  var result: list<number> = []
  var excluded = get(config, 'multiWindowExcludeTypes', ['help', 'quickfix', 'terminal', 'popup', 'nofile'])
  for win in windows
    if index(excluded, getbufvar(winbufnr(win), '&buftype')) < 0
      add(result, win)
      if len(result) >= get(config, 'multiWindowMaxWindows', 4)
        break
      endif
    endif
  endfor
  return result
enddef

# Called through win_execute so folds/view are window-local without WinEnter.
export def InWindow(config: dict<any>, key: string, origin: number, cursor: list<number>): list<dict<any>>
  var result: list<dict<any>> = []
  var win = win_getid()
  for number in range(line('w0'), line('w$'))
    if foldclosed(number) != -1
      continue
    endif
    for word in Extract(getline(number), number, config, key)
      var directional = get(config, 'directionalHintFilter', false) && win == origin
      var after = number > cursor[0] || (number == cursor[0] && word.col > cursor[1])
      var before = number < cursor[0] || (number == cursor[0] && word.col < cursor[1])
      if directional && ((key ==# 'j' && !after) || (key ==# 'k' && !before))
        continue
      endif
      var screen = screenpos(win, number, word.col)
      if screen.row > 0 && screen.col > 0
        word.winid = win
        word.bufnr = bufnr()
        add(result, word)
      endif
    endfor
  endfor
  return result
enddef

export def Detect(config: dict<any>, key: string = ''): list<dict<any>>
  var result: list<dict<any>> = []
  var args = string(config) .. ', ' .. string(key) .. ', ' .. win_getid() .. ', ' .. string([line('.'), col('.')])
  for win in Windows(config)
    var output = win_execute(win, 'echo json_encode(hellshake_yano#native#words#InWindow(' .. args .. '))', 'silent')
    extend(result, json_decode(output))
  endfor
  return result
enddef
