local config_module = require('hellshake_yano.config')
local M = {}
local function japanese(char)
  local code = vim.fn.char2nr(char)
  if code >= 0x3040 and code <= 0x309f then return 'hiragana' end
  if code >= 0x30a0 and code <= 0x30ff then return 'katakana' end
  if (code >= 0x4e00 and code <= 0x9faf) or (code >= 0x3400 and code <= 0x4dbf) then return 'kanji' end
end

function M.extract(line, number, config, key)
  local result = {}
  local minimum = config_module.min_length(config, key or '')
  local function add(text, col)
    if vim.fn.strchars(text) >= minimum then result[#result + 1] = {text = text, line = number, col = col} end
  end
  local text, start, kind = '', 1, nil
  local function flush()
    if text ~= '' then add(text, start) end
    text, kind = '', nil
  end
  local col = 1
  for _, char in ipairs(vim.fn.split(line, '\\zs')) do
    local current = char:match('^[A-Za-z0-9]$') and 'latin' or (config.useJapanese and japanese(char))
    if not current then
      flush()
    else
      if current ~= kind or (current == 'kanji' and vim.fn.strchars(text) >= 4) then flush() end
      if text == '' then start = col end
      text, kind = text .. char, current
    end
    col = col + #char
  end
  flush()
  return result
end

function M.windows(config)
  local current = vim.api.nvim_get_current_win()
  if not config.multiWindowMode then return {current} end
  local windows = {current}
  for _, win in ipairs(vim.api.nvim_tabpage_list_wins(0)) do
    if win ~= current then windows[#windows + 1] = win end
  end
  local result = {}
  for _, win in ipairs(windows) do
    local buffer = vim.api.nvim_win_get_buf(win)
    if vim.api.nvim_win_get_config(win).relative == ''
      and not vim.list_contains(config.multiWindowExcludeTypes, vim.bo[buffer].buftype) then
      result[#result + 1] = win
      if #result >= config.multiWindowMaxWindows then break end
    end
  end
  return result
end

function M.detect(config, key)
  local result = {}
  local current = vim.api.nvim_get_current_win()
  local cursor = vim.api.nvim_win_get_cursor(current)
  for _, win in ipairs(M.windows(config)) do
    local buffer = vim.api.nvim_win_get_buf(win)
    -- nvim_win_call restores focus and allows window-local fold/view queries.
    local found = vim.api.nvim_win_call(win, function()
      local words = {}
      local first, last = vim.fn.line('w0'), vim.fn.line('w$')
      local lines = vim.api.nvim_buf_get_lines(buffer, first - 1, last, false)
      for offset, line in ipairs(lines) do
        local number = first + offset - 1
        if vim.fn.foldclosed(number) == -1 then
          for _, word in ipairs(M.extract(line, number, config, key)) do
            word.winid, word.bufnr = win, buffer
            local directional = config.directionalHintFilter and win == current
            local after = number > cursor[1] or (number == cursor[1] and word.col > cursor[2] + 1)
            local before = number < cursor[1] or (number == cursor[1] and word.col < cursor[2] + 1)
            if not directional or (key ~= 'j' and key ~= 'k') or (key == 'j' and after) or (key == 'k' and before) then
              words[#words + 1] = word
            end
          end
        end
      end
      return words
    end)
    vim.list_extend(result, found)
  end
  return result
end
return M
