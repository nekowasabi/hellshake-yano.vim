vim9script
# TinySegmenter 0.2, Copyright (c) 2008 Taku Kudo. BSD-3-Clause.
# Port of @birchill/tiny-segmenter 1.0.0; see licenses/TinySegmenter.txt.
const weights = json_decode(join(readfile(expand('<sfile>:p:h') .. '/segmenter-weights.json'), "\n"))

def CharType(char: string): string
  if stridx('一二三四五六七八九十百千万億兆', char) >= 0
    return 'M'
  endif
  var n = char2nr(char)
  if (n >= 0x4e00 && n <= 0x9fa0) || index([0x3005, 0x3006, 0x30f5, 0x30f6], n) >= 0
    return 'H'
  elseif n >= 0x3041 && n <= 0x3093
    return 'I'
  elseif (n >= 0x30a1 && n <= 0x30f4) || n == 0x30fc || (n >= 0xff71 && n <= 0xff9e) || n == 0xff70
    return 'K'
  elseif char =~# '^[a-zA-Z]$' || (n >= 0xff41 && n <= 0xff5a) || (n >= 0xff21 && n <= 0xff3a)
    return 'A'
  elseif char =~# '^[0-9]$' || (n >= 0xff10 && n <= 0xff19)
    return 'N'
  endif
  return 'O'
enddef

def Weight(name: string, key: string): number
  return get(weights[name], key, 0)
enddef

export def Segment(input: string): list<string>
  if empty(input)
    return []
  endif
  var text = ['B3', 'B2', 'B1']
  var types = ['O', 'O', 'O']
  for char in split(input, '\zs')
    add(text, char)
    add(types, CharType(char))
  endfor
  extend(text, ['E1', 'E2', 'E3'])
  extend(types, ['O', 'O', 'O'])
  var result: list<string> = []
  var word = text[3]
  var p1 = 'U'
  var p2 = 'U'
  var p3 = 'U'
  for i in range(4, len(text) - 4)
    var [w1, w2, w3, w4, w5, w6] = text[i - 3 : i + 2]
    var [c1, c2, c3, c4, c5, c6] = types[i - 3 : i + 2]
    var score = weights.BIAS
      + Weight('UP1', p1) + Weight('UP2', p2) + Weight('UP3', p3)
      + Weight('BP1', p1 .. p2) + Weight('BP2', p2 .. p3)
      + Weight('UW1', w1) + Weight('UW2', w2) + Weight('UW3', w3)
      + Weight('UW4', w4) + Weight('UW5', w5) + Weight('UW6', w6)
      + Weight('BW1', w2 .. w3) + Weight('BW2', w3 .. w4) + Weight('BW3', w4 .. w5)
      + Weight('TW1', w1 .. w2 .. w3) + Weight('TW2', w2 .. w3 .. w4)
      + Weight('TW3', w3 .. w4 .. w5) + Weight('TW4', w4 .. w5 .. w6)
      + Weight('UC1', c1) + Weight('UC2', c2) + Weight('UC3', c3)
      + Weight('UC4', c4) + Weight('UC5', c5) + Weight('UC6', c6)
      + Weight('BC1', c2 .. c3) + Weight('BC2', c3 .. c4) + Weight('BC3', c4 .. c5)
      + Weight('TC1', c1 .. c2 .. c3) + Weight('TC2', c2 .. c3 .. c4)
      + Weight('TC3', c3 .. c4 .. c5) + Weight('TC4', c4 .. c5 .. c6)
      + Weight('UQ1', p1 .. c1) + Weight('UQ2', p2 .. c2) + Weight('UQ3', p3 .. c3)
      + Weight('BQ1', p2 .. c2 .. c3) + Weight('BQ2', p2 .. c3 .. c4)
      + Weight('BQ3', p3 .. c2 .. c3) + Weight('BQ4', p3 .. c3 .. c4)
      + Weight('TQ1', p2 .. c1 .. c2 .. c3) + Weight('TQ2', p2 .. c2 .. c3 .. c4)
      + Weight('TQ3', p3 .. c1 .. c2 .. c3) + Weight('TQ4', p3 .. c2 .. c3 .. c4)
    var boundary = 'O'
    if score > 0
      add(result, word)
      word = ''
      boundary = 'B'
    endif
    p1 = p2
    p2 = p3
    p3 = boundary
    word ..= w4
  endfor
  add(result, word)
  return result
enddef

def Blank(text: string): bool
  for char in split(text, '\zs')
    var n = char2nr(char)
    if !(n == 32 || (n >= 9 && n <= 13) || n == 0xa0 || n == 0x1680
      || (n >= 0x2000 && n <= 0x200a) || index([0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff], n) >= 0)
      return false
    endif
  endfor
  return true
enddef

export def Process(text: string, merge: bool): list<string>
  if Blank(text)
    return []
  endif
  var segments = Segment(text)
  if !merge
    return segments
  endif
  var particles = ['の', 'は', 'が', 'を', 'に', 'へ', 'と', 'や', 'で', 'も', 'か', 'な', 'よ', 'ね', 'ぞ', 'さ', 'わ', 'ば',
    'から', 'まで', 'です', 'ます', 'だ', 'である']
  var units = ['%', '％', '年', '月', '日', '時', '分', '秒']
  var result: list<string> = []
  var i = 0
  while i < len(segments)
    var token = segments[i]
    var next = i + 1
    if token =~# '^\d\+$'
      while next < len(segments) && segments[next] =~# '^\d\+$'
        token ..= segments[next]
        next += 1
      endwhile
      if next < len(segments) && index(units, segments[next]) >= 0
        token ..= segments[next]
        next += 1
      endif
    elseif token ==# '（' || token ==# '('
      while next < len(segments) && index(['）', ')'], segments[next]) < 0
        token ..= segments[next]
        next += 1
      endwhile
      if next < len(segments)
        token ..= segments[next]
        next += 1
      else
        token = segments[i]
        next = i + 1
        while next < len(segments) && index(particles, segments[next]) >= 0
          token ..= segments[next]
          next += 1
        endwhile
      endif
    elseif !Blank(token)
      while next < len(segments) && index(particles, segments[next]) >= 0
        token ..= segments[next]
        next += 1
      endwhile
    endif
    if !Blank(token)
      add(result, token)
    endif
    i = next
  endwhile
  return result
enddef
