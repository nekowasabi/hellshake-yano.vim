" tests-vim/test_word_detector_multi_simple.vim
" Process2: 複数ウィンドウ単語検出テスト - シンプル版
"
" TDD Phase: GREEN
" 目的: detect_multi_window()関数の基本動作確認

let s:plugin_root = expand('<sfile>:p:h:h')
execute 'set runtimepath+=' . s:plugin_root

echo '=== Process2: Multi-Window Word Detector Tests (Simple) ==='
echo ''

" テスト成功カウント
let s:pass = 0
let s:total = 0

function! s:test(name, condition) abort
  let s:total += 1
  if a:condition
    let s:pass += 1
    echo 'PASS: ' . a:name
  else
    echo 'FAIL: ' . a:name
  endif
endfunction

" ============================================
" Test 1: 関数が存在するか
" ============================================
echo 'Test 1: Function Existence'
let l:func_exists = exists('*hellshake_yano_vim#word_detector#detect_multi_window')
call s:test('detect_multi_window() exists', l:func_exists)
echo ''

if !l:func_exists
  echo 'ERROR: Function does not exist, stopping tests'
  qall!
endif

" ============================================
" Test 2: 単一ウィンドウで動作するか
" ============================================
echo 'Test 2: Single Window Mode'

new
setlocal buftype=nofile
let l:buf1 = bufnr('%')
let l:win1 = win_getid()

call setline(1, ['hello world', 'test function', 'example code'])

let l:windows = [{
  \ 'winid': l:win1,
  \ 'bufnr': l:buf1,
  \ 'topline': 1,
  \ 'botline': 3
  \ }]

let l:words = hellshake_yano_vim#word_detector#detect_multi_window(l:windows)
call s:test('Returns list', type(l:words) == v:t_list)
call s:test('Detects words', len(l:words) > 0)

if len(l:words) > 0
  let l:word = l:words[0]
  call s:test('Word has text', has_key(l:word, 'text'))
  call s:test('Word has lnum', has_key(l:word, 'lnum'))
  call s:test('Word has col', has_key(l:word, 'col'))
  call s:test('Word has winid', has_key(l:word, 'winid'))
  call s:test('Word has bufnr', has_key(l:word, 'bufnr'))
  call s:test('winid is correct', l:word.winid == l:win1)
  call s:test('bufnr is correct', l:word.bufnr == l:buf1)
endif

close!
echo ''

" ============================================
" Test 3: 2ウィンドウで動作するか
" ============================================
echo 'Test 3: Two-Window Mode'

new
setlocal buftype=nofile
let l:buf1 = bufnr('%')
let l:win1 = win_getid()
call setline(1, ['window one text'])

vsplit
let l:buf2 = bufnr('%')
let l:win2 = win_getid()
call setline(1, ['window two text'])

let l:windows2 = [
  \ {
  \   'winid': l:win1,
  \   'bufnr': l:buf1,
  \   'topline': 1,
  \   'botline': 1
  \ },
  \ {
  \   'winid': l:win2,
  \   'bufnr': l:buf2,
  \   'topline': 1,
  \   'botline': 1
  \ }
  \ ]

let l:words2 = hellshake_yano_vim#word_detector#detect_multi_window(l:windows2)
call s:test('Two windows returns list', type(l:words2) == v:t_list)
call s:test('Two windows detects words', len(l:words2) >= 2)

let l:has_win1 = 0
let l:has_win2 = 0
for l:word in l:words2
  if has_key(l:word, 'winid')
    if l:word.winid == l:win1
      let l:has_win1 = 1
    elseif l:word.winid == l:win2
      let l:has_win2 = 1
    endif
  endif
endfor
call s:test('Words from both windows', l:has_win1 && l:has_win2)

close!
close!
echo ''

" ============================================
" Test 4: 空ウィンドウ処理
" ============================================
echo 'Test 4: Empty Window Handling'

new
setlocal buftype=nofile
let l:buf_empty = bufnr('%')
let l:win_empty = win_getid()

new
setlocal buftype=nofile
let l:buf_content = bufnr('%')
let l:win_content = win_getid()
call setline(1, ['content here'])

let l:windows3 = [
  \ {
  \   'winid': l:win_empty,
  \   'bufnr': l:buf_empty,
  \   'topline': 1,
  \   'botline': 1
  \ },
  \ {
  \   'winid': l:win_content,
  \   'bufnr': l:buf_content,
  \   'topline': 1,
  \   'botline': 1
  \ }
  \ ]

let l:words3 = hellshake_yano_vim#word_detector#detect_multi_window(l:windows3)
call s:test('Empty window safe', type(l:words3) == v:t_list)
call s:test('Detects from non-empty', len(l:words3) > 0)

close!
close!
echo ''

" ============================================
" Test 5: 日本語対応
" ============================================
echo 'Test 5: Japanese Text Handling'

new
setlocal buftype=nofile
let l:buf_ja = bufnr('%')
let l:win_ja = win_getid()
call setline(1, ['これはテストです', '日本語の単語検出'])

let l:windows4 = [{
  \ 'winid': l:win_ja,
  \ 'bufnr': l:buf_ja,
  \ 'topline': 1,
  \ 'botline': 2
  \ }]

let l:words4 = hellshake_yano_vim#word_detector#detect_multi_window(l:windows4)
call s:test('Japanese text processed', type(l:words4) == v:t_list)

close!
echo ''

" ============================================
" Summary
" ============================================
echo '=== Test Summary ==='
echo 'Passed: ' . s:pass . '/' . s:total
echo ''

if s:pass == s:total
  echo 'RESULT: SUCCESS - All tests passed!'
  qall!
else
  echo 'RESULT: FAILURE - Some tests failed'
endif
