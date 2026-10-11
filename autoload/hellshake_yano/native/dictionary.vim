vim9script
import autoload './yaml.vim' as Yaml
# Data-only dictionary reader. No writes, external runtime or file evaluation.
var whitespace = " \t\r\v\f" .. nr2char(0xa0) .. nr2char(0x1680)
for code in range(0x2000, 0x200a) + [0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff]
  whitespace ..= nr2char(code)
endfor
const classes = {d: '0-9', w: 'A-Za-z0-9_', s: whitespace}

def Check(valid: bool, message: string)
  if !valid
    throw 'hellshake-yano: ' .. message
  endif
enddef

# Same deliberately bounded ECMAScript subset as the checked Lua reader.
export def Regex(pattern: string): string
  Check(stridx(pattern, '\n') < 0 && stridx(pattern, "\n") < 0, 'multiline dictionary regex is unsupported')
  var result = ''
  var i = 0
  var in_class = false
  var in_repeat = false
  while i < strlen(pattern)
    var char = strpart(pattern, i, 1)
    var next = strpart(pattern, i + 1, 1)
    if char ==# '\'
      Check(!empty(next) && (next !~# '[A-Za-z]' || next =~# '[dDwWsStfrvb]'), 'unsupported ECMAScript regex escape')
      var class = get(classes, tolower(next), '')
      if !empty(class)
        var negative = next !=# tolower(next)
        Check(!(in_class && negative), 'complement escapes in character classes are unsupported')
        result ..= in_class ? class : '[' .. (negative ? '^' : '') .. class .. ']'
      elseif next ==# '_'
        result ..= '_'
      elseif next ==# 'b' && !in_class
        result ..= '%([A-Za-z0-9_]@<![A-Za-z0-9_]@=|[A-Za-z0-9_]@<=[A-Za-z0-9_]@!)'
      elseif next ==# 'b'
        result ..= nr2char(8)
      elseif next ==# 'f'
        result ..= nr2char(12)
      elseif next ==# 'v'
        result ..= nr2char(11)
      else
        result ..= char .. next
      endif
      i += 2
    elseif char ==# '(' && next ==# '?'
      Check(strpart(pattern, i + 2, 1) ==# ':', 'unsupported ECMAScript lookaround or group modifier')
      result ..= '%('
      i += 3
    else
      if char ==# '['
        in_class = true
      elseif char ==# ']'
        in_class = false
      endif
      Check(in_class || !(index(['*', '+', '?'], char) >= 0 && next ==# '?'), 'unsupported lazy ECMAScript quantifier')
      if !in_class && char ==# '{'
        in_repeat = true
      endif
      if !in_class && !in_repeat && stridx('%@&~=<>:#/`!,;-', char) >= 0
        result ..= '\' .. char
      else
        result ..= char
      endif
      if char ==# '}'
        in_repeat = false
      endif
      i += 1
    endif
  endwhile
  var translated = '\C\v' .. result
  match('', translated) # Compile at load time, outside the display/input path.
  return translated
enddef

export def Parse(source: string, format: string): dict<any>
  var data: any
  if format ==# 'json'
    data = json_decode(source)
  elseif format ==# 'yaml' || format ==# 'yml'
    data = Yaml.Decode(source)
  elseif format ==# 'txt'
    data = {customWords: [], preserveWords: [], mergeRules: {}, hintPatterns: []}
    for raw in split(source, "[\r\n]")
      var line = trim(raw)
      if empty(line) || line[0] ==# '#'
        continue
      elseif line[0] ==# '!'
        add(data.preserveWords, strpart(line, 1))
      elseif line[0] ==# '@'
        var parts = matchlist(line, '^@\(-\?\d\+\):\(.*\):\(capture:\d\+\|[A-Za-z]\+\)$')
        Check(!empty(parts), 'invalid text dictionary hint pattern')
        add(data.hintPatterns, {priority: str2nr(parts[1]), pattern: parts[2], hintPosition: parts[3]})
      elseif stridx(line, '=') >= 0
        var at = stridx(line, '=')
        data.mergeRules[trim(strpart(line, 0, at))] = trim(strpart(line, at + 1))
      else
        add(data.customWords, line)
      endif
    endfor
  else
    throw 'hellshake-yano: unsupported Vim9 dictionary format: ' .. format
  endif
  Check(type(data) == v:t_dict, 'dictionary must be a mapping')
  for field in ['customWords', 'preserveWords']
    data[field] = get(data, field, [])
    Check(type(data[field]) == v:t_list, field .. ' must be a list')
    for item in data[field]
      Check(type(item) == v:t_string, field .. ' entries must be strings')
    endfor
  endfor
  data.hintPatterns = get(data, 'hintPatterns', [])
  Check(type(data.hintPatterns) == v:t_list, 'hintPatterns must be a list')
  for item in data.hintPatterns
    Check(type(item) == v:t_dict, 'hintPatterns entries must be mappings')
    item.hintPosition = get(item, 'hintPosition', has_key(item, 'captureGroup') ? 'capture:' .. item.captureGroup : 'start')
    Check(type(item.hintPosition) == v:t_string, 'hintPosition must be a string')
    Check(index(['start', 'end'], item.hintPosition) >= 0 || item.hintPosition =~# '^capture:[0-9]$', 'unsupported dictionary hintPosition')
    item.priority = get(item, 'priority', 0)
    Check(type(item.priority) == v:t_number || type(item.priority) == v:t_float, 'hint priority must be a number')
    Check(type(get(item, 'pattern', 0)) == v:t_string, 'dictionary pattern must be a string')
    item.vimPattern = Regex(item.pattern)
  endfor
  return data
enddef

export def Load(path: string): dict<any>
  var expanded = expand(path)
  Check(filereadable(expanded) == 1, 'dictionary not readable: ' .. expanded)
  Check(getfsize(expanded) <= 1024 * 1024, 'dictionary exceeds 1 MiB')
  return Parse(join(readfile(expanded), "\n"), fnamemodify(expanded, ':e'))
enddef

export def Apply(words: list<dict<any>>, lines: list<string>, first: number, dictionary: dict<any>): list<dict<any>>
  var result = deepcopy(words)
  var literals = sort(copy(dictionary.customWords) + dictionary.preserveWords, (a, b) => strlen(b) - strlen(a))
  var inserted: list<dict<any>> = []
  for offset in range(len(lines))
    var line = lines[offset]
    var number = first + offset
    for literal in literals
      if empty(literal)
        continue
      endif
      var from = 0
      while from < strlen(line)
        var start = stridx(line, literal, from)
        if start < 0
          break
        endif
        var finish = start + strlen(literal) - 1
        var overlaps = false
        for prior in inserted
          if prior.line == number && start <= prior.finish && finish >= prior.start
            overlaps = true
            break
          endif
        endfor
        if !overlaps
          filter(result, (_, word) => word.line != number || word.col - 1 > finish || word.col + strlen(word.text) - 2 < start)
          add(result, {text: literal, line: number, col: start + 1})
          add(inserted, {line: number, start: start, finish: finish})
        endif
        from = finish + 1
      endwhile
    endfor
  endfor
  for pattern in dictionary.hintPatterns
    for offset in range(len(lines))
      var line = lines[offset]
      var start = 0
      while start <= strlen(line)
        var matched = matchstrpos(line, pattern.vimPattern, start)
        if matched[1] < 0
          break
        endif
        var target = matched[1]
        if pattern.hintPosition =~# '^capture:'
          var groups = matchlist(line, pattern.vimPattern, start)
          var text = groups[str2nr(strpart(pattern.hintPosition, 8))]
          var position = empty(text) ? -1 : stridx(matched[0], text)
          target = position >= 0 ? target + position : -1
        elseif pattern.hintPosition ==# 'end'
          var last = strcharpart(matched[0], strchars(matched[0]) - 1, 1)
          target = matched[2] - strlen(last)
        endif
        if target >= 0
          for word in result
            if word.line == first + offset && target + 1 >= word.col && target + 1 < word.col + strlen(word.text)
              word.hintPriority = has_key(word, 'hintPriority') && word.hintPriority > pattern.priority ? word.hintPriority : pattern.priority
              break
            endif
          endfor
        endif
        start = matched[2] > start ? matched[2] : start + max([1, strlen(strcharpart(strpart(line, start), 0, 1))])
      endwhile
    endfor
  endfor
  return result
enddef
