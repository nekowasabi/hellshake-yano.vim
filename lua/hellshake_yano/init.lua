-- Opt-in Neovim runtime. No global commands or mappings until activate().
local core = require('hellshake_yano.core')
local words = require('hellshake_yano.words')
local motion = require('hellshake_yano.motion')
local M = {}
local active = false
local owned_maps, owned_commands = {}, {}
local group
local dictionary

function M.setup(options)
  local resolved = require('hellshake_yano.config').resolve(options or vim.g.hellshake_yano)
  local loaded = resolved.dictionaryPath and require('hellshake_yano.dictionary').load(resolved.dictionaryPath) or nil
  local reactivate = active
  if reactivate then M.deactivate() end
  motion.reset()
  local result = core.setup(resolved)
  dictionary = loaded
  if vim.g.hellshake_yano_native_bridge then vim.g.hellshake_yano = result end
  if reactivate then M.activate() end
  return result
end
function M.enable_bridge()
  vim.g.hellshake_yano = core.get_config()
  vim.g.hellshake_yano_native_bridge = true
end
function M.disable_bridge()
  vim.g.hellshake_yano_native_bridge = false
  require('hellshake_yano.dispatcher').cancel_pending()
end

function M.hide() core.hide() end
function M.enable()
  core.enable()
  if vim.g.hellshake_yano_native_bridge then vim.g.hellshake_yano = core.get_config() end
end
function M.disable()
  motion.reset(); core.disable()
  if vim.g.hellshake_yano_native_bridge then vim.g.hellshake_yano = core.get_config() end
end
function M.toggle()
  motion.reset()
  local enabled = core.toggle()
  if vim.g.hellshake_yano_native_bridge then vim.g.hellshake_yano = core.get_config() end
  return enabled
end
function M.get_config() return core.get_config() end
function M.update_config(options)
  return M.setup(vim.tbl_extend('force', core.get_config(), options))
end

function M.reload_dictionary()
  local path = core.get_config().dictionaryPath
  local loaded = path and require('hellshake_yano.dictionary').load(path) or nil
  dictionary = loaded
  core.hide()
  return vim.deepcopy(dictionary)
end
function M.get_dictionary() return vim.deepcopy(dictionary) end

local function read_input(config)
  local generation = core.get_generation()
  local deadline = vim.uv.hrtime() / 1e6 + config.motionTimeout
  while core.get_generation() == generation do
    if vim.uv.hrtime() / 1e6 >= deadline then core.hide(); return 'timeout' end
    local input = vim.fn.getchar(0)
    if input ~= 0 then
      local key = type(input) == 'number' and vim.fn.nr2char(input) or input
      local status, replay = core.input(key)
      if status ~= 'pending' then
        if replay then vim.api.nvim_feedkeys(replay, 'm', false) end
        return status
      end
      vim.cmd('redraw')
    else
      vim.wait(10)
    end
  end
  return 'cancelled'
end

function M.show(key)
  local config = core.get_config()
  if not config.enabled then return 'disabled' end
  local jumps, last_buffer = 0, nil
  while true do
    local targets = core.show(words.detect(config, key or '', dictionary))
    if #targets == 0 then return 'empty' end
    vim.cmd('redraw')
    local ok, status = pcall(read_input, config)
    if not ok then core.hide(); error(status) end
    if status ~= 'jumped' or not config.continuousHintMode then return status end
    jumps = jumps + 1
    local buffer = vim.api.nvim_get_current_buf()
    if (last_buffer and buffer ~= last_buffer) or jumps >= config.maxContinuousJumps then return 'jumped' end
    last_buffer = buffer
    local recenter = config.recenterCommand
    if not recenter or recenter:match('^%s*$') then recenter = 'normal! zz' end
    local centered = pcall(vim.cmd, recenter)
    if not centered then core.hide(); return 'recenter-failed' end
    config = core.get_config()
    if not config.enabled then return 'disabled' end
  end
end

local function mapping(key)
  return function()
    if motion.record(vim.api.nvim_get_current_buf(), key, vim.v.count1, core.get_config()) then
      -- A scheduled callback can lose a queued hint key to normal mode. A <Cmd>
      -- suffix runs after this motion but before the next queued key, outside
      -- expr-map textlock, and preserves Visual mode.
      return key .. '<Cmd>lua require("hellshake_yano").show(' .. vim.inspect(key) .. ')<CR>'
    end
    return key
  end
end

function M.motion_expression(key) return mapping(key)() end

local function command(name, callback, options)
  if vim.fn.exists(':' .. name) == 2 then return end
  vim.api.nvim_create_user_command(name, callback, options or {})
  owned_commands[name] = vim.api.nvim_get_commands({})[name].definition
end

function M.activate()
  if active then return end
  active = true
  command('HellshakeYano', function() M.show() end)
  command('HellshakeYanoShow', function() M.show() end)
  command('HellshakeYanoHide', M.hide)
  command('HellshakeYanoEnable', M.enable)
  command('HellshakeYanoDisable', M.disable)
  command('HellshakeYanoToggle', M.toggle)
  command('HellshakeYanoReloadDict', M.reload_dictionary)
  command('HellshakeYanoShowDict', function() print(vim.inspect(dictionary)) end)
  command('HellshakeYanoValidateDict', function() M.reload_dictionary(); print('Dictionary valid') end)
  command('HellshakeYanoDebug', function() print(vim.inspect(core.get_state())) end)
  command('HellshakeYanoSetHighlight', function(args)
    assert(#args.fargs == 2, 'expected marker and current highlight groups')
    M.update_config({highlightHintMarker = args.fargs[1], highlightHintMarkerCurrent = args.fargs[2]})
  end, {nargs = '+'})
  command('HellshakeYanoSetCountedMotions', function(args)
    M.update_config({countedMotions = args.fargs})
  end, {nargs = '+'})
  command('HellshakeYanoDebugConfig', function() print(vim.inspect(core.get_config())) end)
  command('HellshakeYanoSetCount', function(args)
    local count = tonumber(args.args)
    assert(count and count >= 1, 'count must be positive')
    M.update_config({motionCount = count, defaultMotionCount = count})
  end, {nargs = 1})
  command('HellshakeYanoSetTimeout', function(args)
    local timeout = tonumber(args.args)
    assert(timeout and timeout > 0, 'timeout must be positive')
    M.update_config({motionTimeout = timeout})
  end, {nargs = 1})
  local config = core.get_config()
  local keys = vim.deepcopy(config.countedMotions)
  if #keys == 0 and config.triggerOnHjkl then keys = {'h', 'j', 'k', 'l'} end
  for key in pairs(config.perKeyMinLength) do if not vim.list_contains(keys, key) then keys[#keys + 1] = key end end
  for key in pairs(config.perKeyMotionCount) do if not vim.list_contains(keys, key) then keys[#keys + 1] = key end end
  if config.motionCounterEnabled then
    for _, key in ipairs(keys) do
      for _, mode in ipairs({'n', 'x'}) do
        if vim.fn.maparg(key, mode) == '' then
          local callback = mapping(key)
          vim.keymap.set(mode, key, callback, {expr = true, silent = true, desc = 'hellshake-yano native motion'})
          owned_maps[#owned_maps + 1] = {mode = mode, key = key, callback = callback}
        end
      end
    end
  end
  group = vim.api.nvim_create_augroup('HellshakeYanoNative', {clear = true})
  vim.api.nvim_create_autocmd({'BufWipeout'}, {group = group, callback = function(event)
    motion.reset(event.buf)
    for _, target in ipairs(core.get_state().targets) do
      if target.bufnr == event.buf then core.hide(); break end
    end
  end})
end

function M.deactivate()
  core.hide()
  motion.reset()
  active = false
  for _, map in ipairs(owned_maps) do
    local current = vim.fn.maparg(map.key, map.mode, false, true)
    if current.callback == map.callback then vim.keymap.del(map.mode, map.key) end
  end
  local commands = vim.api.nvim_get_commands({})
  for name, definition in pairs(owned_commands) do
    if commands[name] and commands[name].definition == definition then vim.api.nvim_del_user_command(name) end
  end
  owned_maps, owned_commands = {}, {}
  if group then vim.api.nvim_del_augroup_by_id(group); group = nil end
end
return M
