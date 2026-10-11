-- TinySegmenter 0.2, Copyright (c) 2008 Taku Kudo.
-- Lua port of @birchill/tiny-segmenter 1.0.0. BSD-3-Clause;
-- see licenses/TinySegmenter.txt and docs/native-lua-progress.md.
local weights = require('hellshake_yano.segmenter_weights')
local M = {}
local function char_type(char)
  if ('一二三四五六七八九十百千万億兆'):find(char, 1, true) then return 'M' end
  local n = vim.fn.char2nr(char)
  if (n >= 0x4e00 and n <= 0x9fa0) or n == 0x3005 or n == 0x3006 or n == 0x30f5 or n == 0x30f6 then return 'H' end
  if n >= 0x3041 and n <= 0x3093 then return 'I' end
  if (n >= 0x30a1 and n <= 0x30f4) or n == 0x30fc or (n >= 0xff71 and n <= 0xff9e) or n == 0xff70 then return 'K' end
  if char:match('^[a-zA-Z]$') or (n >= 0xff41 and n <= 0xff5a) or (n >= 0xff21 and n <= 0xff3a) then return 'A' end
  if char:match('^[0-9]$') or (n >= 0xff10 and n <= 0xff19) then return 'N' end
  return 'O'
end
local function weight(name, key) return weights[name][key] or 0 end
function M.segment(input)
  if input == '' then return {} end
  local text, types = {'B3', 'B2', 'B1'}, {'O', 'O', 'O'}
  for _, char in ipairs(vim.fn.split(input, '\\zs')) do
    text[#text + 1], types[#types + 1] = char, char_type(char)
  end
  vim.list_extend(text, {'E1', 'E2', 'E3'})
  vim.list_extend(types, {'O', 'O', 'O'})
  local result, word = {}, text[4]
  local p1, p2, p3 = 'U', 'U', 'U'
  for i = 5, #text - 3 do
    local w1, w2, w3, w4, w5, w6 = text[i-3], text[i-2], text[i-1], text[i], text[i+1], text[i+2]
    local c1, c2, c3, c4, c5, c6 = types[i-3], types[i-2], types[i-1], types[i], types[i+1], types[i+2]
    local score = weights.BIAS
      + weight('UP1', p1) + weight('UP2', p2) + weight('UP3', p3)
      + weight('BP1', p1..p2) + weight('BP2', p2..p3)
      + weight('UW1', w1) + weight('UW2', w2) + weight('UW3', w3)
      + weight('UW4', w4) + weight('UW5', w5) + weight('UW6', w6)
      + weight('BW1', w2..w3) + weight('BW2', w3..w4) + weight('BW3', w4..w5)
      + weight('TW1', w1..w2..w3) + weight('TW2', w2..w3..w4)
      + weight('TW3', w3..w4..w5) + weight('TW4', w4..w5..w6)
      + weight('UC1', c1) + weight('UC2', c2) + weight('UC3', c3)
      + weight('UC4', c4) + weight('UC5', c5) + weight('UC6', c6)
      + weight('BC1', c2..c3) + weight('BC2', c3..c4) + weight('BC3', c4..c5)
      + weight('TC1', c1..c2..c3) + weight('TC2', c2..c3..c4)
      + weight('TC3', c3..c4..c5) + weight('TC4', c4..c5..c6)
      + weight('UQ1', p1..c1) + weight('UQ2', p2..c2) + weight('UQ3', p3..c3)
      + weight('BQ1', p2..c2..c3) + weight('BQ2', p2..c3..c4)
      + weight('BQ3', p3..c2..c3) + weight('BQ4', p3..c3..c4)
      + weight('TQ1', p2..c1..c2..c3) + weight('TQ2', p2..c2..c3..c4)
      + weight('TQ3', p3..c1..c2..c3) + weight('TQ4', p3..c2..c3..c4)
    local boundary = 'O'
    if score > 0 then result[#result + 1], word, boundary = word, '', 'B' end
    p1, p2, p3 = p2, p3, boundary
    word = word .. w4
  end
  result[#result + 1] = word
  return result
end
-- Public dispatcher postprocessing from the former TinySegmenter wrapper.
local function blank(text)
  for _,char in ipairs(vim.fn.split(text,'\\zs')) do
    local code=vim.fn.char2nr(char)
    if not (code==32 or (code>=9 and code<=13) or code==0xa0 or code==0x1680
      or (code>=0x2000 and code<=0x200a) or code==0x2028 or code==0x2029
      or code==0x202f or code==0x205f or code==0x3000 or code==0xfeff) then return false end
  end
  return true
end
function M.process(text, merge)
  if blank(text) then return {} end
  local segments=M.segment(text)
  if not merge then return segments end
  local particles={}
  for _,value in ipairs({'の','は','が','を','に','へ','と','や','で','も','か','な','よ','ね','ぞ','さ','わ','ば',
    'から','まで','です','ます','だ','である'}) do particles[value]=true end
  local units={['%']=true,['％']=true,['年']=true,['月']=true,['日']=true,['時']=true,['分']=true,['秒']=true}
  local result,index={},1
  while index<=#segments do
    local text=segments[index]
    local next_index=index+1
    if text:match('^%d+$') then
      while next_index<=#segments and segments[next_index]:match('^%d+$') do
        text=text..segments[next_index]; next_index=next_index+1
      end
      if units[segments[next_index]] then text=text..segments[next_index]; next_index=next_index+1 end
    elseif text=='（' or text=='(' then
      while next_index<=#segments and segments[next_index]~='）' and segments[next_index]~=')' do
        text=text..segments[next_index]; next_index=next_index+1
      end
      if next_index<=#segments then text=text..segments[next_index]; next_index=next_index+1
      else
        text=segments[index]; next_index=index+1
        while particles[segments[next_index]] do text=text..segments[next_index]; next_index=next_index+1 end
      end
    elseif not blank(text) then
      while particles[segments[next_index]] do text=text..segments[next_index]; next_index=next_index+1 end
    end
    if not blank(text) then result[#result+1]=text end
    index=next_index
  end
  return result
end
return M
