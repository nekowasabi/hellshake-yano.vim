-- Native Neovim hint generation. Coordinates are 1-based UTF-8 byte columns.
local M = {}

local function keys(value)
  if type(value) == 'string' then return vim.fn.split(value, '\\zs') end
  return value or {}
end

function M.generate(count, config)
  config = config or {}
  count = math.max(0, math.floor(math.min(count, config.maxHints or count)))
  local result = {}
  local function add(value)
    if #result < count then result[#result + 1] = value end
  end
  local function numeric()
    for i = 1, 100 do add(('%02d'):format(i % 100)) end
  end
  if config.useNumericMultiCharHints and not config.singleCharKeys and not config.multiCharKeys then
    numeric()
    return result
  end
  local single, multi = keys(config.singleCharKeys), keys(config.multiCharKeys)
  if #single == 0 and #multi == 0 then
    single = keys(config.markers or 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    multi = single
  end
  for i = 1, math.min(#single, config.maxSingleCharHints or #single) do add(single[i]) end
  local numeric_only = #multi > 0
  for _, key in ipairs(multi) do numeric_only = numeric_only and key:match('^%d$') ~= nil end
  if numeric_only then
    numeric()
  else
    for _, first in ipairs(multi) do
      for _, second in ipairs(multi) do add(first .. second) end
    end
  end
  if #result < count and config.useNumericMultiCharHints then numeric() end
  return result
end

function M.assign(words, labels, cursor, config)
  config = config or {}
  local sorted = {}
  for i, word in ipairs(words) do
    local same_window = not word.winid or word.winid == cursor.winid
    local inside = same_window and word.line == cursor.line
      and cursor.col >= word.col and cursor.col < word.col + #word.text
    if not inside then
      sorted[#sorted + 1] = {word = word, index = i,
        distance = math.abs(word.line - cursor.line) * 1000 + math.abs(word.col - cursor.col)}
    end
  end
  table.sort(sorted, function(a, b)
    if a.distance ~= b.distance then return a.distance < b.distance end
    if a.word.line ~= b.word.line then return a.word.line < b.word.line end
    if a.word.col ~= b.word.col then return a.word.col < b.word.col end
    return a.index < b.index
  end)
  local result = {}
  local function add(word, at_end)
    local label = labels[#result + 1]
    if not label then return end
    local target = vim.deepcopy(word)
    target.hint = label
    -- The final UTF-8 character's first byte, never a continuation byte.
    if at_end then
      local last = vim.fn.strcharpart(word.text, vim.fn.strchars(word.text) - 1, 1)
      target.col = word.col + #word.text - #last
    end
    result[#result + 1] = target
  end
  for _, entry in ipairs(sorted) do
    local word = entry.word
    local both = config.hintPosition == 'both'
      and vim.fn.strchars(word.text) >= (config.bothMinWordLength or 0)
    add(word, config.hintPosition == 'end')
    if both then add(word, true) end
  end
  return result
end

return M
