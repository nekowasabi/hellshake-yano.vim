-- Explicitly initialized native core. Plugin entry routing will be switched in S3.
local hints = require('hellshake_yano.hints')
local M = {namespace = vim.api.nvim_create_namespace('hellshake_yano_native')}
local config_module = require('hellshake_yano.config')
local config = config_module.resolve()
local session_config = config
local state = {visible = false, targets = {}, prefix = ''}
local buffers = {}
local floats = {}
-- Hint floats are hidden and reused, never closed per render: Neovim's redraw
-- cost grows with every float window ever opened, so open/close per hint made
-- each repeated display slower until the editor froze.
local pool = {}
local generation = 0

local function close_float(float)
  if vim.api.nvim_win_is_valid(float.win) then vim.api.nvim_win_close(float.win, true) end
  if vim.api.nvim_buf_is_valid(float.buf) then vim.api.nvim_buf_delete(float.buf, {force = true}) end
end

local function pooled_float(index)
  local float = pool[index]
  if float and vim.api.nvim_win_is_valid(float.win) and vim.api.nvim_buf_is_valid(float.buf) then return float end
  if float then close_float(float) end
  local buf = vim.api.nvim_create_buf(false, true)
  float = {buf = buf, win = -1}
  pool[index] = float
  float.win = vim.api.nvim_open_win(buf, false, {
    relative = 'editor', row = 0, col = 0, width = 1, height = 1, hide = true,
    style = 'minimal', focusable = false, noautocmd = true, zindex = 200,
  })
  return float
end

local function clear_display()
  local old_floats = floats
  floats = {}
  for _, float in ipairs(old_floats) do
    if vim.api.nvim_win_is_valid(float.win) then vim.api.nvim_win_set_config(float.win, {hide = true}) end
  end
  for buffer in pairs(buffers) do
    if vim.api.nvim_buf_is_valid(buffer) then
      vim.api.nvim_buf_clear_namespace(buffer, M.namespace, 0, -1)
    end
  end
  buffers = {}
end

function M.hide()
  session_config = config
  generation = generation + 1
  state = {visible = false, targets = {}, prefix = ''}
  clear_display()
end

-- Closes the hidden float pool; for deactivate and tests, not per display.
function M.release()
  M.hide()
  for _, float in pairs(pool) do close_float(float) end
  pool = {}
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
  vim.api.nvim_set_hl(0,'HellshakeYanoMarker',{default=true,link='HellshakeYanoNativeHint'})
  vim.api.nvim_set_hl(0,'HellshakeYanoHint',{default=true,link='HellshakeYanoNativeHint'})
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
        if session_config.multiWindowMode then
          -- Extmarks belong to buffers, so they cannot distinguish two views of
          -- one buffer. Window-relative floats keep each target's label unique.
          local index = #floats + 1
          local item = pooled_float(index)
          floats[index] = item
          vim.api.nvim_buf_set_lines(item.buf, 0, -1, false, {target.hint})
          local placement = {
            relative = 'win', win = target.winid, bufpos = {target.line - 1, target.col - 1},
            row = 0, col = 0, width = math.max(1, vim.fn.strdisplaywidth(target.hint)), height = 1, hide = false,
          }
          -- A pooled float left in another tabpage cannot always be moved; replace it.
          if not pcall(vim.api.nvim_win_set_config, item.win, placement) then
            close_float(item)
            pool[index] = nil
            item = pooled_float(index)
            floats[index] = item
            vim.api.nvim_buf_set_lines(item.buf, 0, -1, false, {target.hint})
            vim.api.nvim_win_set_config(item.win, placement)
          end
          if item.group ~= group then
            vim.wo[item.win].winhighlight = 'Normal:' .. group
            item.group = group
          end
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
function M.refresh()
  if state.visible then render() end
end

function M.highlight_prefix(prefix)
  if state.visible and type(prefix)=='string' then state.prefix=prefix; render() end
end

function M.display_hint(win,line,col,hint)
  if type(win)~='number' or not vim.api.nvim_win_is_valid(win)
    or type(line)~='number' or type(col)~='number' or type(hint)~='string' then return -1 end
  local buffer=vim.api.nvim_win_get_buf(win)
  local ok,id=pcall(vim.api.nvim_buf_set_extmark,buffer,M.namespace,line-1,col-1,
    {virt_text={{hint,'HellshakeYanoHint'}},virt_text_pos='overlay'})
  if not ok then return -1 end
  buffers[buffer]=true
  return id
end

function M.show(words, options)
  M.hide()
  session_config = options and vim.tbl_extend('force', config, options) or config
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
  local count = #candidates * (session_config.hintPosition == 'both' and 2 or 1)
  state.targets = hints.assign(candidates, hints.generate(count, session_config),
    {line = cursor[1], col = cursor[2] + 1, winid = current_window}, session_config)
  state.visible = #state.targets > 0
  render()
  return vim.deepcopy(state.targets)
end

-- No global key interception: the caller owns input and replays returned keys.
function M.input(key)
  local input_config = session_config
  if not state.visible then return 'inactive', key end
  if key == '\27' or key == '\3' or key == '' then M.hide(); return 'cancelled' end
  -- Preserve the legacy single-window contract: lowercase remains normal motion.
  if not input_config.multiWindowMode and key:match('^[a-z]$') then M.hide(); return 'cancelled', key end
  local normalized = key == '\r' and '<CR>' or key:upper()
  local is_cancel = false
  for _, cancel in ipairs(input_config.cancelKeys) do
    is_cancel = is_cancel or normalized == (cancel == '\r' and '<CR>' or cancel:upper())
  end
  if input_config.multiWindowMode and is_cancel then M.hide(); return 'cancelled', key end
  local prefix = state.prefix .. key
  local matches = {}
  for _, target in ipairs(state.targets) do
    if target.hint:sub(1, #prefix) == prefix then matches[#matches + 1] = target end
  end
  -- Legacy single-window input gives valid hints precedence over cancelKeys.
  if #matches == 0 then
    M.hide()
    return is_cancel and 'cancelled' or 'unmatched', not input_config.multiWindowMode and key or nil
  end
  local prefer_numeric_pair = not input_config.multiWindowMode and input_config.useHintGroups
    and input_config.useNumericMultiCharHints and prefix:match('^%d$') and #matches > 1
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
