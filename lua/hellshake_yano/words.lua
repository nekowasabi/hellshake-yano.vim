local config_module = require('hellshake_yano.config')
local M = {}
local function japanese(char)
  local code = vim.fn.char2nr(char)
  if code >= 0x3040 and code <= 0x309f then return 'hiragana' end
  if code >= 0x30a0 and code <= 0x30ff then return 'katakana' end
  if (code >= 0x4e00 and code <= 0x9faf) or (code >= 0x3400 and code <= 0x4dbf) then return 'kanji' end
end

local function regex_extract(line, number, config, key)
  -- Match the old improved regex detector before its final min/max filter.
  local raw, token, start, col = {}, '', 1, 1
  local function flush()
    if token~='' then raw[#raw+1]={text=token,col=start} end
    token=''
  end
  for _,char in ipairs(vim.fn.split(line,'\\zs')) do
    local accepted=char:match('^[A-Za-z0-9]$') or (config.useJapanese and (char=='_' or japanese(char)))
    if accepted then
      if token=='' then start=col end
      token=token..char
    else flush() end
    col=col+#char
  end
  flush()
  local split={}
  local function add(text,position) split[#split+1]={text=text,line=number,col=position} end
  for _,word in ipairs(raw) do
    local text=word.text
    local snake=text:find('_',1,true) and text:match('^[A-Za-z0-9_]+$')
      and text:sub(1,1)~='_' and text:sub(-1)~='_' and not text:find('__',1,true)
    if snake then
      local offset=word.col
      for part in text:gmatch('[^_]+') do
        -- extractWords receives no minimum from RegexWordDetector, hence 3 here.
        if #part>=3 then add(part,offset) end
        offset=offset+#part+1
      end
    elseif text:match('^0[xX][0-9a-fA-F]+$') or text:match('^0[bB][01]+$') then
      add(text:sub(2),word.col+1)
    else
      local has_japanese=false
      for _,char in ipairs(vim.fn.split(text,'\\zs')) do
        local code=vim.fn.char2nr(char)
        if (code>=0x3040 and code<=0x30ff) or (code>=0x4e00 and code<=0x9faf) then has_japanese=true; break end
      end
      if has_japanese and vim.fn.strchars(text)>2 then
        local part,kind,offset,position='',nil,word.col,word.col
        local function emit() if part~='' then add(part,position) end; part=''; kind=nil end
        for _,char in ipairs(vim.fn.split(text,'\\zs')) do
          local current=char:match('^[A-Za-z0-9]$') and 'latin' or japanese(char)
          if not current then emit()
          else
            if current~=kind or (current=='kanji' and vim.fn.strchars(part)>=4) then emit() end
            if part=='' then position=offset end
            part=part..char; kind=current
          end
          offset=offset+#char
        end
        emit()
      else add(text,word.col) end
    end
  end
  local result={}
  local minimum=config_module.min_length(config,key or '')
  for index,word in ipairs(split) do
    if index>100 then break end
    local length=vim.fn.strchars(word.text)
    if length>=minimum and length<=(config.maxWordLength or 50) then result[#result+1]=word end
  end
  return result
end

local particles = {}
for _, word in ipairs({'の', 'が', 'を', 'に', 'へ', 'と', 'から', 'まで', 'より', 'は', 'も',
  'こそ', 'さえ', 'でも', 'しか', 'だけ', 'ばかり', 'ほど', 'くらい', 'など', 'なり',
  'やら', 'か', 'のみ', 'ば', 'ても', 'のに', 'ので', 'けど', 'けれど', 'けれども',
  'し', 'て', 'で', 'ながら', 'つつ', 'たり', 'な', 'よ', 'ね', 'ぞ', 'ぜ', 'さ',
  'わ', 'です', 'ます', 'だ', 'である', 'や', 'とか', 'だの'}) do particles[word] = true end

function M.extract(line, number, config, key)
  local regex = regex_extract(line, number, config, key)
  local has_japanese = false
  for _, char in ipairs(vim.fn.split(line, '\\zs')) do
    if japanese(char) then has_japanese = true; break end
  end
  if not config.useJapanese or not config.enableTinySegmenter or not has_japanese
    or config.wordDetectionStrategy == 'regex'
    or vim.fn.strchars(line) < config.segmenterThreshold then return regex end
  local segments = require('hellshake_yano.segmenter').segment(line)
  local segmented, offset, index = {}, 1, 1
  while index <= #segments do
    local text = segments[index]
    local start = offset
    offset, index = offset + #text, index + 1
    if config.japaneseMergeParticles and not text:match('^%s*$') then
      while index <= #segments and particles[segments[index]] do
        text, offset = text .. segments[index], offset + #segments[index]
        index = index + 1
      end
    end
    if not text:match('^%s*$') and not (config.japaneseMergeParticles and particles[text])
      and vim.fn.strchars(text) >= config.japaneseMinWordLength then
      segmented[#segmented + 1] = {text = text, line = number, col = start}
    end
  end
  if config.wordDetectionStrategy == 'tinysegmenter' then return segmented end
  -- Match the legacy hybrid strategy: longer word wins at the same position;
  -- TinySegmenter wins ties. Keep byte columns consistent across both paths.
  local by_col = {}
  for _, word in ipairs(regex) do by_col[word.col] = word end
  for _, word in ipairs(segmented) do
    local previous = by_col[word.col]
    if not previous or vim.fn.strchars(word.text) >= vim.fn.strchars(previous.text) then
      by_col[word.col] = word
    end
  end
  local result = vim.tbl_values(by_col)
  table.sort(result, function(a, b) return a.col < b.col end)
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

function M.detect(config, key, dictionary)
  local result = {}
  local current = vim.api.nvim_get_current_win()
  local cursor = vim.api.nvim_win_get_cursor(current)
  for _, win in ipairs(M.windows(config)) do
    local buffer = vim.api.nvim_win_get_buf(win)
    -- nvim_win_call restores focus and allows window-local fold/view queries.
    local found = vim.api.nvim_win_call(win, function()
      local words = {}
      local first, last = vim.fn.line('w0'), vim.fn.line('w$')
      -- A headless Neovim has no rendered bottom row after cursor invalidation.
      -- This fallback is only for clients without a UI, never a visible window.
      if last < first and #vim.api.nvim_list_uis() == 0 then
        last = math.min(vim.api.nvim_buf_line_count(buffer), first + vim.api.nvim_win_get_height(win) - 1)
      end
      local lines = vim.api.nvim_buf_get_lines(buffer, first - 1, last, false)
      for offset, line in ipairs(lines) do
        local number = first + offset - 1
        if vim.fn.foldclosed(number) == -1 then
          local detected = M.extract(line, number, config, key)
          if dictionary then detected = require('hellshake_yano.dictionary').apply(detected, {line}, number, dictionary) end
          for _, word in ipairs(detected) do
            word.winid, word.bufnr = win, buffer
            local directional = config.directionalHintFilter and win == current
            local after = number > cursor[1] or (number == cursor[1] and word.col > cursor[2] + 1)
            local before = number < cursor[1] or (number == cursor[1] and word.col < cursor[2] + 1)
            if not directional or (key ~= 'j' and key ~= 'k') or (key == 'j' and after) or (key == 'k' and before) then
              local screen = #vim.api.nvim_list_uis() > 0 and vim.fn.screenpos(win, number, word.col) or nil
              if not screen or (screen.row > 0 and screen.col > 0) then words[#words + 1] = word end
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
