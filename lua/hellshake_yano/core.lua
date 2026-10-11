-- Explicitly initialized native core. Plugin entry routing will be switched in S3.
local hints = require('hellshake_yano.hints')
local M = {namespace = vim.api.nvim_create_namespace('hellshake_yano_native')}
local config_module = require('hellshake_yano.config')
local config = config_module.resolve()
local state = {visible = false, targets = {}, prefix = ''}
local buffers = {}
local floats = {}
local generation = 0

local function clear_display()
  local old_floats = floats
  floats = {}
  for _, float in ipairs(old_floats) do
    if vim.api.nvim_win_is_valid(float.win) then vim.api.nvim_win_close(float.win, true) end
    if vim.api.nvim_buf_is_valid(float.buf) then vim.api.nvim_buf_delete(float.buf, {force = true}) end
  end
  floats = {}
  for buffer in pairs(buffers) do
    if vim.api.nvim_buf_is_valid(buffer) then
      vim.api.nvim_buf_clear_namespace(buffer, M.namespace, 0, -1)
    end
  end
  buffers = {}
end

function M.hide()
  generation = generation + 1
  state = {visible = false, targets = {}, prefix = ''}
  clear_display()
end

local function highlight(name, value)
  if type(value) == 'string' then
    vim.api.nvim_set_hl(0, name, {link = value})
  else
    local opts = {}
    for _, key in ipairs({'fg', 'bg', 'ctermfg', 'ctermbg'}) do
      opts[key] = key:match('^cterm') and tonumber(value[key]) or value[key]
    end
    vim.api.nvim_set_hl(0, name, opts)
  end
end

function M.setup(options)
  local resolved = config_module.resolve(options or vim.g.hellshake_yano)
  M.hide()
  config = resolved
  highlight('HellshakeYanoNativeHint', config.highlightHintMarker)
  highlight('HellshakeYanoNativeCurrent', config.highlightHintMarkerCurrent)
  return M.get_config()
end

function M.get_config() return vim.deepcopy(config) end
function M.get_generation() return generation end
function M.get_state() return vim.deepcopy(state) end
function M.enable() config.enabled = true end
function M.disable() config.enabled = false; M.hide() end
function M.toggle()
  if config.enabled then M.disable() else M.enable() end
  return config.enabled
end

local function valid(word)
  if not vim.api.nvim_win_is_valid(word.winid) or not vim.api.nvim_buf_is_valid(word.bufnr)
    or vim.api.nvim_win_get_buf(word.winid) ~= word.bufnr then return false end
  if word.line < 1 or word.line > vim.api.nvim_buf_line_count(word.bufnr) then return false end
  local line = vim.api.nvim_buf_get_lines(word.bufnr, word.line - 1, word.line, false)[1]
  if word.col < 1 or word.col > #line then return false end
  local byte = line:byte(word.col)
  return byte and (byte < 128 or byte >= 192)
end

local function render()
  clear_display()
  local ok, err = pcall(function()
    for _, target in ipairs(state.targets) do
      if valid(target) then
        local match = state.prefix ~= '' and target.hint:sub(1, #state.prefix) == state.prefix
        local group = match and 'HellshakeYanoNativeCurrent' or 'HellshakeYanoNativeHint'
        if config.multiWindowMode then
          -- Extmarks belong to buffers, so they cannot distinguish two views of
          -- one buffer. Window-relative floats keep each target's label unique.
          local buf = vim.api.nvim_create_buf(false, true)
          local item = {buf = buf, win = -1}
          floats[#floats + 1] = item
          vim.api.nvim_buf_set_lines(buf, 0, -1, false, {target.hint})
          item.win = vim.api.nvim_open_win(buf, false, {
            relative = 'win', win = target.winid, bufpos = {target.line - 1, target.col - 1},
            row = 0, col = 0, width = math.max(1, vim.fn.strdisplaywidth(target.hint)), height = 1,
            style = 'minimal', focusable = false, noautocmd = true, zindex = 200,
          })
          vim.wo[item.win].winhighlight = 'Normal:' .. group
        else
          vim.api.nvim_buf_set_extmark(target.bufnr, M.namespace, target.line - 1, target.col - 1, {
            virt_text = {{target.hint, group}}, virt_text_pos = 'overlay',
            hl_mode = 'combine', priority = 200,
          })
          buffers[target.bufnr] = true
        end
      end
    end
  end)
  if not ok then M.hide(); error(err) end
end

-- words: {text, line, col, bufnr?, winid?}; all positions are 1-based bytes.
-- Detection is a separate module so callers may supply already filtered words.
function M.show(words)
  M.hide()
  if not config.enabled then return {} end
  local current_window = vim.api.nvim_get_current_win()
  local current_buffer = vim.api.nvim_get_current_buf()
  local cursor = vim.api.nvim_win_get_cursor(current_window)
  local candidates = {}
  for _, word in ipairs(words) do
    local copy = vim.deepcopy(word)
    copy.winid = copy.winid or current_window
    copy.bufnr = copy.bufnr or (vim.api.nvim_win_is_valid(copy.winid)
      and vim.api.nvim_win_get_buf(copy.winid)) or current_buffer
    if valid(copy) then
      copy.changedtick = vim.api.nvim_buf_get_changedtick(copy.bufnr)
      candidates[#candidates + 1] = copy
    end
  end
  local count = #candidates * (config.hintPosition == 'both' and 2 or 1)
  state.targets = hints.assign(candidates, hints.generate(count, config),
    {line = cursor[1], col = cursor[2] + 1, winid = current_window}, config)
  state.visible = #state.targets > 0
  render()
  return vim.deepcopy(state.targets)
end

-- No global key interception: the caller owns input and replays returned keys.
function M.input(key)
  if not state.visible then return 'inactive', key end
  if key == '\27' or key == '\3' or key == '' then M.hide(); return 'cancelled' end
  -- Preserve the legacy single-window contract: lowercase remains normal motion.
  if not config.multiWindowMode and key:match('^[a-z]$') then M.hide(); return 'cancelled', key end
  local normalized = key == '\r' and '<CR>' or key:upper()
  local is_cancel = false
  for _, cancel in ipairs(config.cancelKeys) do
    is_cancel = is_cancel or normalized == (cancel == '\r' and '<CR>' or cancel:upper())
  end
  if config.multiWindowMode and is_cancel then M.hide(); return 'cancelled', key end
  local prefix = state.prefix .. key
  local matches = {}
  for _, target in ipairs(state.targets) do
    if target.hint:sub(1, #prefix) == prefix then matches[#matches + 1] = target end
  end
  -- Legacy single-window input gives valid hints precedence over cancelKeys.
  if #matches == 0 then
    M.hide()
    return is_cancel and 'cancelled' or 'unmatched', key
  end
  local prefer_numeric_pair = not config.multiWindowMode and config.useHintGroups
    and config.useNumericMultiCharHints and prefix:match('^%d$') and #matches > 1
  for _, target in ipairs(matches) do
    if target.hint == prefix and not prefer_numeric_pair then
      if not valid(target) or vim.api.nvim_buf_get_changedtick(target.bufnr) ~= target.changedtick then
        M.hide(); return 'stale'
      end
      M.hide()
      vim.api.nvim_set_current_win(target.winid)
      vim.api.nvim_win_set_cursor(target.winid, {target.line, target.col - 1})
      return 'jumped'
    end
  end
  state.prefix = prefix
  render()
  return 'pending'
end

return M
