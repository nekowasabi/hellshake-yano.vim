" Phase D-6: Process3 Sub1 - Denops TinySegmenter連携
" 日本語テキストのセグメント化機能を提供する

" Denops初回失敗フラグ（起動直後のコマンド未登録状態を検出）
let s:denops_failed_once = v:false

" Denopsが利用可能かチェック
function! s:is_denops_available() abort
  return hellshake_yano_vim#backend#is_native() ? v:true : v:false
endfunction

" 日本語文字かどうかを文字コードで判定（Vim/Neovim互換）
" E945エラー回避のため、char2nr()とnr2char()を使用
function! s:is_japanese_char(char) abort
  if empty(a:char)
    return v:false
  endif

  let l:code = char2nr(a:char)

  " ひらがな: U+3040-U+309F (12352-12447)
  if l:code >= 12352 && l:code <= 12447
    return v:true
  endif

  " カタカナ: U+30A0-U+30FF (12448-12543)
  if l:code >= 12448 && l:code <= 12543
    return v:true
  endif

  " 漢字: U+4E00-U+9FAF (19968-40879)
  if l:code >= 19968 && l:code <= 40879
    return v:true
  endif

  return v:false
endfunction

" フォールバック用の簡易セグメント化
" 文字種別の変化でセグメントを分割する
function! s:fallback_segment(text) abort
  if empty(a:text)
    return []
  endif

  let l:segments = []
  let l:current = ''
  let l:last_type = ''

  for l:char in split(a:text, '\zs')
    let l:char_type = s:get_character_type(l:char)

    if l:char_type !=# l:last_type && !empty(l:current)
      call add(l:segments, l:current)
      let l:current = l:char
    else
      let l:current .= l:char
    endif

    let l:last_type = l:char_type
  endfor

  if !empty(l:current)
    call add(l:segments, l:current)
  endif

  " 空白のみのセグメントを除外
  return filter(l:segments, 'v:val !~# "^\\s\\+$"')
endfunction

" 文字種別を判定 (Vim/Neovim互換)
" E945エラー回避のため、char2nr()で文字コード判定
function! s:get_character_type(char) abort
  let l:code = char2nr(a:char)

  " 漢字: U+4E00-U+9FAF (19968-40879)
  if l:code >= 19968 && l:code <= 40879
    return 'kanji'
  " ひらがな: U+3040-U+309F (12352-12447)
  elseif l:code >= 12352 && l:code <= 12447
    return 'hiragana'
  " カタカナ: U+30A0-U+30FF (12448-12543)
  elseif l:code >= 12448 && l:code <= 12543
    return 'katakana'
  elseif a:char =~# '[a-zA-Z]'
    return 'latin'
  elseif a:char =~# '[0-9]'
    return 'digit'
  elseif a:char =~# '\s'
    return 'space'
  else
    return 'other'
  endif
endfunction

" 日本語テキストをセグメント化する
" @param text セグメント化するテキスト
" @param options オプション辞書（mergeParticles: v:true/v:false）
" @return {segments: [], success: v:true/v:false, source: 'tinysegmenter'/'fallback', error: '...'}
function! hellshake_yano_vim#japanese#segment(text, ...) abort
  let l:text = type(a:text) == v:t_string ? a:text : string(a:text)
  let l:options = a:0 > 0 ? a:1 : {}

  " 空文字列の場合
  if empty(l:text)
    return {
      \ 'segments': [],
      \ 'success': v:true,
      \ 'source': 'fallback',
      \ }
  endif

  " Denopsが利用可能な場合はDenopsを使用
  if s:is_denops_available()
    try
      let l:result = hellshake_yano_vim#backend#request('hellshake-yano', 'segmentJapaneseText', [l:text, l:options])
      " 成功時は失敗フラグをリセット（次回から正常動作）
      let s:denops_failed_once = v:false
      return l:result
    catch
      " Denops呼び出しが失敗した場合は静かにフォールバック
      " 初回失敗時のみフラグを設定（2回目以降は警告なし）
      if !s:denops_failed_once
        let s:denops_failed_once = v:true
      endif
      " エラーメッセージを出さずにフォールバックを返す
      return {
        \ 'segments': s:fallback_segment(l:text),
        \ 'success': v:true,
        \ 'source': 'fallback',
        \ }
    endtry
  else
    " Denopsが利用できない場合はフォールバック
    return {
      \ 'segments': s:fallback_segment(l:text),
      \ 'success': v:true,
      \ 'source': 'fallback',
      \ }
  endif
endfunction

" 日本語文字を含むかチェック
" @param text チェックするテキスト
" @return v:true/v:false
" E945エラー回避のため、文字コードで判定
function! hellshake_yano_vim#japanese#has_japanese(text) abort
  let l:text = type(a:text) == v:t_string ? a:text : string(a:text)

  " テキストを1文字ずつチェック
  for l:char in split(l:text, '\zs')
    if s:is_japanese_char(l:char)
      return v:true
    endif
  endfor

  return v:false
endfunction

" セグメント化が必要かどうか判定
" @param text チェックするテキスト
" @param threshold 最小文字数閾値（デフォルト: 4）
" @return v:true/v:false
function! hellshake_yano_vim#japanese#should_segment(text, ...) abort
  let l:text = type(a:text) == v:t_string ? a:text : string(a:text)
  let l:threshold = a:0 > 0 ? a:1 : 4

  " 日本語を含み、閾値以上の長さがあるか
  return hellshake_yano_vim#japanese#has_japanese(l:text) && len(l:text) >= l:threshold
endfunction
