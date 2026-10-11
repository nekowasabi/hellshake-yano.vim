vim9script
# The same data-only YAML subset as the Lua reader. No tags, constructors,
# evaluation or file access. Unsupported YAML is rejected, never rewritten.

def Check(valid: bool, message: string)
  if !valid
    throw 'hellshake-yano: ' .. message
  endif
enddef

def StartsQuote(text: string, i: number): bool
  var char = strpart(text, i, 1)
  return (char ==# '"' || char ==# "'")
    && (i == 0 || strpart(text, i - 1, 1) =~# '[[:space:]:[{,-]')
enddef

def Scan(text: string, separator: string): list<string>
  var quote = ''
  var escaped = false
  var depth = 0
  var result: list<string> = []
  var start = 0
  for i in range(strlen(text))
    var char = strpart(text, i, 1)
    if escaped
      escaped = false
    elseif quote ==# '"' && char ==# '\'
      escaped = true
    elseif quote ==# "'" && char ==# "'" && strpart(text, i + 1, 1) ==# "'"
      escaped = true
    elseif !empty(quote)
      if char ==# quote
        quote = ''
      endif
    elseif StartsQuote(text, i)
      quote = char
    elseif char ==# '[' || char ==# '{'
      depth += 1
    elseif char ==# ']' || char ==# '}'
      depth -= 1
    elseif depth == 0 && char ==# separator
      if separator !=# ':' || i == strlen(text) - 1 || strpart(text, i + 1, 1) =~# '\s'
        add(result, strpart(text, start, i - start))
        start = i + 1
      endif
    endif
  endfor
  Check(empty(quote) && depth == 0, 'unbalanced YAML quote or flow collection')
  add(result, strpart(text, start))
  return result
enddef

def Entry(text: string): list<string>
  var parts = Scan(text, ':')
  if len(parts) == 1
    return []
  endif
  Check(len(parts) == 2, 'quote YAML scalar values containing colon followed by space')
  return map(parts, (_, part) => trim(part))
enddef

def Scalar(source: string): any
  var text = trim(source)
  Check(text !~# '^[&*!|>%]', 'unsupported YAML tag, alias, anchor or block scalar')
  if strpart(text, 0, 1) ==# '"'
    return json_decode(text)
  elseif strpart(text, 0, 1) ==# "'"
    Check(strpart(text, strlen(text) - 1) ==# "'", 'unterminated YAML quote')
    return substitute(strpart(text, 1, strlen(text) - 2), "''", "'", 'g')
  endif
  var opening = strpart(text, 0, 1)
  if opening ==# '[' || opening ==# '{'
    Check(strpart(text, strlen(text) - 1) ==# (opening ==# '[' ? ']' : '}'), 'invalid YAML flow collection')
    var result: any = opening ==# '[' ? [] : {}
    var inner = trim(strpart(text, 1, strlen(text) - 2))
    if empty(inner)
      return result
    endif
    for part in Scan(inner, ',')
      if opening ==# '['
        add(result, Scalar(part))
      else
        var pair = Entry(part)
        Check(!empty(pair), 'invalid YAML flow mapping')
        var key = Scalar(pair[0])
        Check(type(key) == v:t_string, 'dictionary YAML keys must be strings')
        Check(!has_key(result, key), 'duplicate YAML key')
        result[key] = Scalar(pair[1])
      endif
    endfor
    return result
  endif
  if text ==# 'true'
    return true
  elseif text ==# 'false'
    return false
  elseif text ==# 'null' || text ==# '~'
    return v:null
  elseif text =~# '^[+-]\?\d\+$'
    return str2nr(text)
  elseif text =~# '^[-+]\?\%(\d\+\.\d*\|\.\d\+\|\d\+\)\%([eE][-+]\?\d\+\)\?$'
    return str2float(text)
  elseif text =~# '^0[xX][0-9a-fA-F]\+$'
    return str2nr(text, 16)
  endif
  return text
enddef

def Set(state: dict<any>, result: dict<any>, pair: list<string>, indent: number)
  var key = Scalar(pair[0])
  Check(type(key) == v:t_string, 'dictionary YAML keys must be strings')
  Check(!has_key(result, key), 'duplicate YAML key: ' .. key)
  var value: any = pair[1]
  if empty(value)
    value = state.index < len(state.lines) && state.lines[state.index].indent > indent
      ? ParseBlock(state, state.lines[state.index].indent) : {}
  else
    value = Scalar(value)
  endif
  result[key] = value
enddef

def ParseBlock(state: dict<any>, indent: number): any
  var sequence = state.lines[state.index].text =~# '^-\%(\s\|$\)'
  var result: any = sequence ? [] : {}
  while state.index < len(state.lines) && state.lines[state.index].indent == indent
    var line = state.lines[state.index]
    state.index += 1
    var is_item = strpart(line.text, 0, 2) ==# '- ' || line.text ==# '-'
    Check(sequence == is_item, 'mixed YAML mapping and sequence')
    if sequence
      var text = trim(strpart(line.text, 1))
      var pair = Entry(text)
      if !empty(pair)
        var item: dict<any> = {}
        Set(state, item, pair, indent + 2)
        while state.index < len(state.lines) && state.lines[state.index].indent == indent + 2
          var next_pair = Entry(state.lines[state.index].text)
          Check(!empty(next_pair), 'expected YAML mapping')
          state.index += 1
          Set(state, item, next_pair, indent + 2)
        endwhile
        add(result, item)
      elseif empty(text)
        Check(state.index < len(state.lines) && state.lines[state.index].indent > indent, 'empty YAML sequence item')
        add(result, ParseBlock(state, state.lines[state.index].indent))
      else
        add(result, Scalar(text))
      endif
    else
      var pair = Entry(line.text)
      Check(!empty(pair), 'expected YAML mapping')
      Set(state, result, pair, indent)
    endif
  endwhile
  return result
enddef

export def Decode(source: string): any
  var lines: list<dict<any>> = []
  for raw in split(source, "\n", true)
    Check(raw !~# '^ *\t', 'tabs are unsupported for YAML indentation')
    var quote = ''
    var escaped = false
    var stop = strlen(raw)
    for i in range(strlen(raw))
      var char = strpart(raw, i, 1)
      if escaped
        escaped = false
      elseif quote ==# '"' && char ==# '\'
        escaped = true
      elseif quote ==# "'" && char ==# "'" && strpart(raw, i + 1, 1) ==# "'"
        escaped = true
      elseif !empty(quote)
        if char ==# quote
          quote = ''
        endif
      elseif StartsQuote(raw, i)
        quote = char
      elseif char ==# '#' && (i == 0 || strpart(raw, i - 1, 1) =~# '\s')
        stop = i
        break
      endif
    endfor
    var content = substitute(strpart(raw, 0, stop), '\s\+$', '', '')
    if trim(content) ==# '---'
      Check(empty(lines), 'multiple YAML documents are unsupported')
    elseif !empty(trim(content))
      add(lines, {indent: strlen(matchstr(content, '^ *')), text: trim(content)})
    endif
  endfor
  if empty(lines)
    return {}
  endif
  var state = {lines: lines, index: 0}
  var result = ParseBlock(state, lines[0].indent)
  Check(state.index == len(lines), 'unexpected YAML indentation')
  return result
enddef
