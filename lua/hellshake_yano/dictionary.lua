local M = {}
local function strings(value, field)
  assert(type(value) == 'table' and vim.islist(value), field .. ' must be a list')
  for _, item in ipairs(value) do assert(type(item) == 'string', field .. ' entries must be strings') end
  return value
end

-- Support the common ECMAScript subset used by dictionary hint patterns.
-- Do not silently reinterpret lookarounds, Unicode property escapes or flags.
local function regex(pattern)
  assert(type(pattern) == 'string', 'dictionary pattern must be a string')
  assert(not pattern:find('\\n', 1, true) and not pattern:find('\n', 1, true), 'multiline dictionary regex is not supported')
  local result, index, in_class, in_repeat = {}, 1, false, false
  while index <= #pattern do
    local char = pattern:sub(index, index)
    if char == '\\' then
      local next_char = pattern:sub(index + 1, index + 1)
      assert(next_char ~= '' and (not next_char:match('[A-Za-z]') or next_char:match('[dDwWsStfrvb]')),
        'unsupported ECMAScript regex escape')
      if next_char == 'b' and not in_class then result[#result + 1] = '%(<|>)'
      elseif next_char == 'b' then result[#result + 1] = string.char(8)
      elseif next_char == 'f' then result[#result + 1] = string.char(12)
      elseif next_char == 'v' then result[#result + 1] = string.char(11)
      else result[#result + 1] = char .. next_char end
      index = index + 2
    elseif char == '(' and pattern:sub(index + 1, index + 1) == '?' then
      assert(pattern:sub(index + 2, index + 2) == ':', 'unsupported ECMAScript lookaround or group modifier')
      result[#result + 1] = '%('
      index = index + 3
    else
      if char == '[' then in_class = true elseif char == ']' then in_class = false end
      assert(in_class or not ((char == '*' or char == '+' or char == '?') and pattern:sub(index + 1, index + 1) == '?'),
        'unsupported lazy ECMAScript quantifier')
      if not in_class and char == '{' then in_repeat = true end
      if not in_class and not in_repeat and char:match('^[%%@&~=<>:#/`!,;%-]$') then
        result[#result + 1] = '\\' .. char
      else result[#result + 1] = char end
      if char == '}' then in_repeat = false end
      index = index + 1
    end
  end
  local translated = '\\v' .. table.concat(result)
  vim.regex(translated) -- Compile during load, not the input/display hot path.
  return translated
end

function M.parse(source, format)
  local data
  if format == 'json' then data = vim.json.decode(source)
  elseif format == 'yaml' or format == 'yml' then data = require('hellshake_yano.yaml').decode(source)
  elseif format == 'txt' then
    data = {customWords = {}, preserveWords = {}, mergeRules = {}, hintPatterns = {}}
    for line in source:gmatch('[^\r\n]+') do
      line = vim.trim(line)
      if line ~= '' and line:sub(1, 1) ~= '#' then
        if line:sub(1, 1) == '!' then data.preserveWords[#data.preserveWords + 1] = line:sub(2)
        elseif line:sub(1, 1) == '@' then
          local priority, pattern, position = line:match('^@([%-]?%d+):(.-):(capture:%d+)$')
          if not priority then priority, pattern, position = line:match('^@([%-]?%d+):(.*):(%a+)$') end
          assert(priority, 'invalid text dictionary hint pattern')
          data.hintPatterns[#data.hintPatterns + 1] = {priority = tonumber(priority), pattern = pattern, hintPosition = position}
        elseif line:find('=', 1, true) then
          local key, value = line:match('^(.-)=(.*)$')
          data.mergeRules[vim.trim(key)] = vim.trim(value)
        else data.customWords[#data.customWords + 1] = line end
      end
    end
  else error('unsupported dictionary format: ' .. tostring(format)) end
  assert(type(data) == 'table', 'dictionary must be a mapping')
  data.customWords = strings(data.customWords or {}, 'customWords')
  data.preserveWords = strings(data.preserveWords or {}, 'preserveWords')
  data.hintPatterns = data.hintPatterns or {}
  assert(vim.islist(data.hintPatterns), 'hintPatterns must be a list')
  for _, item in ipairs(data.hintPatterns) do
    assert(type(item) == 'table', 'hintPatterns entries must be mappings')
    item.hintPosition = item.hintPosition or (item.captureGroup and ('capture:' .. item.captureGroup)) or 'start'
    assert(item.hintPosition == 'start' or item.hintPosition == 'end'
      or item.hintPosition:match('^capture:[0-9]$'), 'unsupported dictionary hintPosition')
    item.priority = item.priority or 0
    assert(type(item.priority) == 'number', 'hint priority must be a number')
    item.vimPattern = regex(item.pattern)
  end
  return data
end

function M.load(path)
  path = vim.fn.expand(path)
  assert(vim.fn.filereadable(path) == 1, 'dictionary not readable: ' .. path)
  assert(vim.fn.getfsize(path) <= 1024 * 1024, 'dictionary exceeds 1 MiB')
  return M.parse(table.concat(vim.fn.readfile(path), '\n'), path:match('%.([^.]+)$'))
end

function M.apply(words, lines, first, dictionary)
  local result = vim.deepcopy(words)
  local literals = vim.list_extend(vim.deepcopy(dictionary.customWords), dictionary.preserveWords)
  table.sort(literals, function(a, b) return #a > #b end)
  local inserted = {}
  for offset, line in ipairs(lines) do
    local number = first + offset - 1
    for _, literal in ipairs(literals) do
      if literal ~= '' then
        local from = 1
        while from <= #line do
          local start, finish = line:find(literal, from, true)
          if not start then break end
          local overlaps = false
          for _, prior in ipairs(inserted) do
            if prior.line == number and start <= prior.finish and finish >= prior.start then overlaps = true; break end
          end
          if not overlaps then
            result = vim.tbl_filter(function(word)
              return word.line ~= number or word.col > finish or word.col + #word.text - 1 < start
            end, result)
            result[#result + 1] = {text = literal, line = number, col = start}
            inserted[#inserted + 1] = {line = number, start = start, finish = finish}
          end
          from = finish + 1
        end
      end
    end
  end
  for _, pattern in ipairs(dictionary.hintPatterns) do
    for offset, line in ipairs(lines) do
      local start = 0
      while start <= #line do
        local match = vim.fn.matchstrpos(line, pattern.vimPattern, start)
        if match[2] < 0 then break end
        local target = match[2]
        local capture = pattern.hintPosition:match('^capture:(%d)$')
        if capture then
          local groups = vim.fn.matchlist(line, pattern.vimPattern, start)
          local text = groups[tonumber(capture) + 1]
          local position = text and text ~= '' and match[1]:find(text, 1, true)
          target = position and (target + position - 1) or nil
        elseif pattern.hintPosition == 'end' then
          local last = vim.fn.strcharpart(match[1], vim.fn.strchars(match[1]) - 1, 1)
          target = match[3] - #last
        end
        if target then
          for _, word in ipairs(result) do
            if word.line == first + offset - 1 and target + 1 >= word.col and target + 1 < word.col + #word.text then
              word.hintPriority = math.max(word.hintPriority or -math.huge, pattern.priority)
              break
            end
          end
        end
        if match[3] > start then start = match[3]
        else
          local char = vim.fn.strcharpart(line:sub(start + 1), 0, 1)
          start = start + math.max(1, #char)
        end
      end
    end
  end
  return result
end
return M
