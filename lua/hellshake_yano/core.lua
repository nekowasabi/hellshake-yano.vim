-- Explicitly initialized native core. Plugin entry routing is switched in S3.
local hints = require('hellshake_yano.hints')
local M = {namespace = vim.api.nvim_create_namespace('hellshake_yano_native')}
local config_module = require('hellshake_yano.config')
local config = config_module.resolve()
local state = {visible = false, targets = {}, prefix = ''}
local buffers = {}

function M.hide()
  for buffer in pairs(buffers) do
    if vim.api.nvim_buf_is_valid(buffer) then
      vim.api.nvim_buf_clear_namespace(buffer, M.namespace, 0, -1)
    end
  end
  buffers = {}
  state = {visible = false, targets = {}, prefix = ''}
end

local function highlight(name, value)
  if type(value) == 'string' then
    vim.api.nvim_set_hl(0, name, {link = value})
  else
    local opts = {}
    for _, key in ipairs({'fg', 'bg', 'ctermfg', 'ctermbg'}) do opts[key] = value[key] end
    vim.api.nvim_set_hl(0, name, opts)
  end
end

function M.setup(options)
  M.hide()
  config = config_module.resolve(options or vim.g.hellshake_yano)
  highlight('HellshakeYanoNativeHint', config.highlightHintMarker)
  highlight('HellshakeYanoNativeCurrent', config.highlightHintMarkerCurrent)
  return M.get_config()
end

function M.get_config() return vim.deepcopy(config) end
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
  for buffer in pairs(buffers) do
    if vim.api.nvim_buf_is_valid(buffer) then vim.api.nvim_buf_clear_namespace(buffer, M.namespace, 0, -1) end
  end
  for _, target in ipairs(state.targets) do
    if valid(target) then
      local match = state.prefix ~= '' and target.hint:sub(1, #state.prefix) == state.prefix
      local group = match and 'HellshakeYanoNativeCurrent' or 'HellshakeYanoNativeHint'
      vim.api.nvim_buf_set_extmark(target.bufnr, M.namespace, target.line - 1, target.col - 1, {
        virt_text = {{target.hint, group}}, virt_text_pos = 'overlay',
        hl_mode = 'combine', priority = 200,
      })
      buffers[target.bufnr] = true
    end
  end
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
  if key == '\27' or key == '' then M.hide(); return 'cancelled' end
  -- Preserve the legacy single-window contract: lowercase remains normal motion.
  if key:match('^[a-z]$') then M.hide(); return 'cancelled', key end
  local normalized = key == '\r' and '<CR>' or key:upper()
  local is_cancel = false
  for _, cancel in ipairs(config.cancelKeys) do
    is_cancel = is_cancel or normalized == (cancel == '\r' and '<CR>' or cancel:upper())
  end
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
  for _, target in ipairs(matches) do
    if target.hint == prefix then
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
