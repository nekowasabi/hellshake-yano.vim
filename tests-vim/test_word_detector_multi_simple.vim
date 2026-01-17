" tests-vim/test_word_detector_multi_simple.vim
" Process2: 複数ウィンドウ単語検出テスト - シンプル版
"
" TDD Phase: GREEN
" 目的: detect_multi_window()関数の基本動作確認

let s:plugin_root = expand('<sfile>:p:h:h')
execute 'set runtimepath+=' . s:plugin_root

" autoload関数を明示的に読み込み
execute 'source ' . s:plugin_root . '/autoload/hellshake_yano_vim/word_detector.vim'
execute 'source ' . s:plugin_root . '/autoload/hellshake_yano_vim/japanese.vim'

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
let s:func_exists = exists('*hellshake_yano_vim#word_detector#detect_multi_window')
call s:test('detect_multi_window() exists', s:func_exists)
echo ''

if !s:func_exists
  echo 'ERROR: Function does not exist, stopping tests'
  qall!
endif

" ============================================
" Test 2: 単一ウィンドウで動作するか
" ============================================
echo 'Test 2: Single Window Mode'

new
setlocal buftype=nofile
let s:buf1 = bufnr('%')
let s:win1 = win_getid()

call setline(1, ['hello world', 'test function', 'example code'])

let s:windows = [{
  \ 'winid': s:win1,
  \ 'bufnr': s:buf1,
  \ 'topline': 1,
  \ 'botline': 3
  \ }]

let s:words = hellshake_yano_vim#word_detector#detect_multi_window(s:windows)
call s:test('Returns list', type(s:words) == v:t_list)
call s:test('Detects words', len(s:words) > 0)

if len(s:words) > 0
  let s:word = s:words[0]
  call s:test('Word has text', has_key(s:word, 'text'))
  call s:test('Word has lnum', has_key(s:word, 'lnum'))
  call s:test('Word has col', has_key(s:word, 'col'))
  call s:test('Word has winid', has_key(s:word, 'winid'))
  call s:test('Word has bufnr', has_key(s:word, 'bufnr'))
  call s:test('winid is correct', s:word.winid == s:win1)
  call s:test('bufnr is correct', s:word.bufnr == s:buf1)
endif

close!
echo ''

" ============================================
" Test 3: 2ウィンドウで動作するか
" ============================================
echo 'Test 3: Two-Window Mode'

new
setlocal buftype=nofile
let s:buf1_t3 = bufnr('%')
let s:win1_t3 = win_getid()
call setline(1, ['window one text'])

vsplit
let s:buf2_t3 = bufnr('%')
let s:win2_t3 = win_getid()
call setline(1, ['window two text'])

let s:windows2 = [
  \ {
  \   'winid': s:win1_t3,
  \   'bufnr': s:buf1_t3,
  \   'topline': 1,
  \   'botline': 1
  \ },
  \ {
  \   'winid': s:win2_t3,
  \   'bufnr': s:buf2_t3,
  \   'topline': 1,
  \   'botline': 1
  \ }
  \ ]

let s:words2 = hellshake_yano_vim#word_detector#detect_multi_window(s:windows2)
call s:test('Two windows returns list', type(s:words2) == v:t_list)
call s:test('Two windows detects words', len(s:words2) >= 2)

let s:has_win1 = 0
let s:has_win2 = 0
for s:word_t3 in s:words2
  if has_key(s:word_t3, 'winid')
    if s:word_t3.winid == s:win1_t3
      let s:has_win1 = 1
    elseif s:word_t3.winid == s:win2_t3
      let s:has_win2 = 1
    endif
  endif
endfor
call s:test('Words from both windows', s:has_win1 && s:has_win2)

close!
close!
echo ''

" ============================================
" Test 4: 空ウィンドウ処理
" ============================================
echo 'Test 4: Empty Window Handling'

new
setlocal buftype=nofile
let s:buf_empty = bufnr('%')
let s:win_empty = win_getid()

new
setlocal buftype=nofile
let s:buf_content = bufnr('%')
let s:win_content = win_getid()
call setline(1, ['content here'])

let s:windows3 = [
  \ {
  \   'winid': s:win_empty,
  \   'bufnr': s:buf_empty,
  \   'topline': 1,
  \   'botline': 1
  \ },
  \ {
  \   'winid': s:win_content,
  \   'bufnr': s:buf_content,
  \   'topline': 1,
  \   'botline': 1
  \ }
  \ ]

let s:words3 = hellshake_yano_vim#word_detector#detect_multi_window(s:windows3)
call s:test('Empty window safe', type(s:words3) == v:t_list)
call s:test('Detects from non-empty', len(s:words3) > 0)

close!
close!
echo ''

" ============================================
" Test 5: 日本語対応
" ============================================
echo 'Test 5: Japanese Text Handling'

new
setlocal buftype=nofile
let s:buf_ja = bufnr('%')
let s:win_ja = win_getid()
call setline(1, ['これはテストです', '日本語の単語検出'])

let s:windows4 = [{
  \ 'winid': s:win_ja,
  \ 'bufnr': s:buf_ja,
  \ 'topline': 1,
  \ 'botline': 2
  \ }]

let s:words4 = hellshake_yano_vim#word_detector#detect_multi_window(s:windows4)
call s:test('Japanese text processed', type(s:words4) == v:t_list)

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
