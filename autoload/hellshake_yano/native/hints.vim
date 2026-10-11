vim9script
# Pure Vim9 counterpart of the checked native Lua hint contract.
# Coordinates are one-based UTF-8 byte columns. No startup side effects.

def Keys(value: any): list<string>
  return type(value) == v:t_string ? split(value, '\zs') : copy(value)
enddef

def Add(result: list<string>, value: string, count: number)
  if len(result) < count
    add(result, value)
  endif
enddef

def Numeric(result: list<string>, count: number)
  for i in range(1, 100)
    Add(result, printf('%02d', i % 100), count)
  endfor
enddef

export def Generate(requested: number, config: dict<any> = {}): list<string>
  var count = max([0, min([requested, get(config, 'maxHints', requested)])])
  var result: list<string> = []
  var numeric = get(config, 'useNumericMultiCharHints', false)
  if numeric && !has_key(config, 'singleCharKeys') && !has_key(config, 'multiCharKeys')
    Numeric(result, count)
    return result
  endif
  var single = Keys(get(config, 'singleCharKeys', []))
  var multi = Keys(get(config, 'multiCharKeys', []))
  if empty(single) && empty(multi)
    single = Keys(get(config, 'markers', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'))
    for key in single
      Add(result, key, count)
    endfor
    for first in single
      for second in single
        Add(result, first .. second, count)
      endfor
    endfor
    return result
  endif
  for i in range(min([len(single), get(config, 'maxSingleCharHints', len(single))]))
    Add(result, single[i], count)
  endfor
  var numeric_only = !empty(multi)
  for key in multi
    numeric_only = numeric_only && key =~# '^\d$'
  endfor
  if numeric_only
    Numeric(result, count)
  else
    for first in multi
      for second in multi
        Add(result, first .. second, count)
      endfor
    endfor
  endif
  if len(result) < count && numeric
    Numeric(result, count)
  endif
  return result
enddef

def Compare(a: dict<any>, b: dict<any>): number
  for field in ['distance', 'sort_line', 'col', 'index']
    if a[field] != b[field]
      return a[field] < b[field] ? -1 : 1
    endif
  endfor
  return 0
enddef

def Target(result: list<dict<any>>, word: dict<any>, labels: list<string>, at_end: bool)
  if len(result) >= len(labels)
    return
  endif
  var target = deepcopy(word)
  target.hint = labels[len(result)]
  target.wordCol = word.col
  if at_end
    target.col = word.col + max([0, byteidx(word.text, strchars(word.text, true) - 1)])
  endif
  add(result, target)
enddef

export def Assign(words: list<dict<any>>, labels: list<string>, cursor: dict<any>,
    config: dict<any> = {}): list<dict<any>>
  var sorted: list<dict<any>> = []
  for i in range(len(words))
    var word = words[i]
    var same_window = !has_key(word, 'winid') || word.winid == cursor.winid
    var inside = same_window && word.line == cursor.line
      && cursor.col >= word.col && cursor.col < word.col + strlen(word.text)
    if !inside
      var sort_line = word.line + (get(config, 'multiWindowMode', false) && !same_window ? 10000 : 0)
      add(sorted, {word: word, index: i, sort_line: sort_line, col: word.col,
        distance: abs(sort_line - cursor.line) * 1000 + abs(word.col - cursor.col)})
    endif
  endfor
  sort(sorted, Compare)
  var result: list<dict<any>> = []
  for entry in sorted
    var word = entry.word
    var position = get(config, 'hintPosition', 'start')
    Target(result, word, labels, position ==# 'end')
    if position ==# 'both' && strchars(word.text) >= get(config, 'bothMinWordLength', 0)
      Target(result, word, labels, true)
    endif
  endfor
  return result
enddef
