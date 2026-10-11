-- A data-only YAML subset for dictionary files: mappings, sequences, quoted and
-- plain scalars, and flow collections. Unsupported syntax fails explicitly.
-- No tags, aliases, constructors, evaluation, or implicit file/network access.
local M = {}
local function trim(s) return s:match('^%s*(.-)%s*$') end
local function starts_quote(text, index)
  local char = text:sub(index, index)
  return (char == '"' or char == "'")
    and (index == 1 or text:sub(index - 1, index - 1):match('[%s:%[%{,%-]'))
end
local function scan(text, separator)
  local quote, escaped, depth, result, start = nil, false, 0, {}, 1
  for i = 1, #text do
    local char = text:sub(i, i)
    if escaped then escaped = false
    elseif quote == '"' and char == '\\' then escaped = true
    elseif quote then if char == quote then quote = nil end
    elseif starts_quote(text, i) then quote = char
    elseif char == '[' or char == '{' then depth = depth + 1
    elseif char == ']' or char == '}' then depth = depth - 1
    elseif depth == 0 and separator(char, i) then
      result[#result + 1] = text:sub(start, i - 1)
      start = i + 1
    end
  end
  assert(not quote and depth == 0, 'unbalanced YAML quote or flow collection')
  result[#result + 1] = text:sub(start)
  return result
end
local function entry(text)
  local parts = scan(text, function(char, i)
    return char == ':' and (i == #text or text:sub(i + 1, i + 1):match('%s'))
  end)
  if #parts == 1 then return nil end
  assert(#parts == 2, 'quote YAML scalar values containing a colon followed by space')
  return trim(parts[1]), trim(parts[2])
end
local scalar
scalar = function(text)
  text = trim(text)
  assert(not text:match('^[&*!|>%%]'), 'unsupported YAML tag, alias, anchor, or block scalar')
  if text:sub(1, 1) == '"' then return vim.json.decode(text) end
  if text:sub(1, 1) == "'" then
    assert(text:sub(-1) == "'", 'unterminated YAML quote')
    return text:sub(2, -2):gsub("''", "'")
  end
  local opening = text:sub(1, 1)
  if opening == '[' or opening == '{' then
    assert(text:sub(-1) == (opening == '[' and ']' or '}'), 'invalid YAML flow collection')
    local result = {}
    local inner = trim(text:sub(2, -2))
    if inner == '' then return result end
    for _, part in ipairs(scan(inner, function(char) return char == ',' end)) do
      if opening == '[' then result[#result + 1] = scalar(part)
      else
        local key, value = entry(part)
        assert(key, 'invalid YAML flow mapping')
        key = scalar(key)
        assert(result[key] == nil, 'duplicate YAML key')
        result[key] = scalar(value)
      end
    end
    return result
  end
  if text == 'true' then return true end
  if text == 'false' then return false end
  if text == 'null' or text == '~' then return vim.NIL end
  return tonumber(text) or text
end

function M.decode(source)
  local lines = {}
  for number, raw in ipairs(vim.split(source, '\n', {plain = true})) do
    assert(not raw:match('^ *\t'), 'tabs are not supported for YAML indentation')
    local quote, escaped, stop = nil, false, #raw
    for i = 1, #raw do
      local char = raw:sub(i, i)
      if escaped then escaped = false
      elseif quote == '"' and char == '\\' then escaped = true
      elseif quote then if char == quote then quote = nil end
      elseif starts_quote(raw, i) then quote = char
      elseif char == '#' and (i == 1 or raw:sub(i - 1, i - 1):match('%s')) then stop = i - 1; break end
    end
    local content = raw:sub(1, stop):gsub('%s+$', '')
    if trim(content) == '---' then
      assert(#lines == 0, 'multiple YAML documents are not supported')
    elseif trim(content) ~= '' then
      lines[#lines + 1] = {indent = #content:match('^ *'), text = trim(content), number = number}
    end
  end
  if #lines == 0 then return {} end
  local index = 1
  local parse_block
  local function set(result, key, value, indent)
    key = scalar(key)
    assert(type(key) == 'string', 'dictionary YAML keys must be strings')
    assert(result[key] == nil, 'duplicate YAML key: ' .. key)
    if value == '' then
      if lines[index] and lines[index].indent > indent then value = parse_block(lines[index].indent)
      else value = {} end
    else value = scalar(value) end
    result[key] = value
  end
  parse_block = function(indent)
    local result = {}
    local sequence = lines[index].text:match('^%-[%s$]') or lines[index].text == '-'
    while lines[index] and lines[index].indent == indent do
      local line = lines[index]
      index = index + 1
      local is_item = line.text:sub(1, 2) == '- ' or line.text == '-'
      assert(not not sequence == is_item, 'mixed YAML mapping and sequence at line ' .. line.number)
      if sequence then
        local text = trim(line.text:sub(2))
        local key, value = entry(text)
        if key then
          local item = {}
          set(item, key, value, indent + 2)
          while lines[index] and lines[index].indent == indent + 2 do
            local next_line = lines[index]
            local next_key, next_value = entry(next_line.text)
            assert(next_key, 'expected YAML mapping at line ' .. next_line.number)
            index = index + 1
            set(item, next_key, next_value, indent + 2)
          end
          result[#result + 1] = item
        elseif text == '' then
          assert(lines[index] and lines[index].indent > indent, 'empty YAML sequence item')
          result[#result + 1] = parse_block(lines[index].indent)
        else result[#result + 1] = scalar(text) end
      else
        local key, value = entry(line.text)
        assert(key, 'expected YAML mapping at line ' .. line.number)
        set(result, key, value, indent)
      end
    end
    return result
  end
  local result = parse_block(lines[1].indent)
  assert(index > #lines, 'unexpected YAML indentation')
  return result
end
return M
