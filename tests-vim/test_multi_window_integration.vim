" tests-vim/test_multi_window_integration.vim
" Process 10: マルチウィンドウ機能の統合テスト
"
" TDD Phase: RED -> GREEN
" 目的: マルチウィンドウ機能全体の統合テスト
"
" テスト対象:
"   - multiWindowMode 有効化
"   - 複数ウィンドウでの単語検出
"   - ウィンドウ間ジャンプ
"   - 除外タイプ (help, quickfix, terminal)
"   - 最大ウィンドウ数制限 (multiWindowMaxWindows)

let s:plugin_root = expand('<sfile>:p:h:h')
execute 'set runtimepath+=' . s:plugin_root

" autoload関数を明示的に読み込み
execute 'source ' . s:plugin_root . '/autoload/hellshake_yano_vim/config.vim'
execute 'source ' . s:plugin_root . '/autoload/hellshake_yano_vim/window_detector.vim'
execute 'source ' . s:plugin_root . '/autoload/hellshake_yano_vim/word_detector.vim'
execute 'source ' . s:plugin_root . '/autoload/hellshake_yano_vim/japanese.vim'

echo '=== Process 10: Multi-Window Integration Tests ==='
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

function! s:cleanup_windows() abort
  " すべてのウィンドウを閉じてクリーンな状態に
  only!
  " グローバル設定をクリア
  if exists('g:hellshake_yano_vim_config')
    unlet g:hellshake_yano_vim_config
  endif
endfunction

" ============================================
" Test 1: マルチウィンドウモード有効化テスト
" ============================================
echo 'Test 1: Multi-Window Mode Enabled'

" デフォルト設定の確認
let s:default_mode = hellshake_yano_vim#config#get('multiWindowMode')
call s:test('Default multiWindowMode is false', s:default_mode == v:false)

" multiWindowMode を有効化
let g:hellshake_yano_vim_config = { 'multiWindowMode': v:true }
let s:enabled_mode = hellshake_yano_vim#config#get('multiWindowMode')
call s:test('multiWindowMode can be enabled', s:enabled_mode == v:true)

call s:cleanup_windows()
echo ''

" ============================================
" Test 2: 複数ウィンドウでの単語検出テスト
" ============================================
echo 'Test 2: Multi-Window Word Detection'

" ウィンドウ1を作成
new
setlocal buftype=nofile
let s:buf1 = bufnr('%')
let s:win1 = win_getid()
call setline(1, ['hello world from window one'])

" ウィンドウ2を作成（垂直分割）
vsplit
enew
setlocal buftype=nofile
let s:buf2 = bufnr('%')
let s:win2 = win_getid()
call setline(1, ['goodbye universe from window two'])

" 2つのウィンドウ情報を準備
let s:windows = [
  \ {
  \   'winid': s:win1,
  \   'bufnr': s:buf1,
  \   'topline': 1,
  \   'botline': 1
  \ },
  \ {
  \   'winid': s:win2,
  \   'bufnr': s:buf2,
  \   'topline': 1,
  \   'botline': 1
  \ }
  \ ]

" 複数ウィンドウから単語検出
let s:words = hellshake_yano_vim#word_detector#detect_multi_window(s:windows)
call s:test('detect_multi_window returns list', type(s:words) == v:t_list)
call s:test('Detects words from both windows', len(s:words) >= 4)

" 各ウィンドウの単語が含まれているか確認
let s:has_window1_word = 0
let s:has_window2_word = 0
for s:word in s:words
  if s:word.winid == s:win1
    let s:has_window1_word = 1
  elseif s:word.winid == s:win2
    let s:has_window2_word = 1
  endif
endfor
call s:test('Words from window 1 detected', s:has_window1_word)
call s:test('Words from window 2 detected', s:has_window2_word)

" 単語に必要なプロパティがあるか確認
if len(s:words) > 0
  let s:sample_word = s:words[0]
  call s:test('Word has text property', has_key(s:sample_word, 'text'))
  call s:test('Word has lnum property', has_key(s:sample_word, 'lnum'))
  call s:test('Word has col property', has_key(s:sample_word, 'col'))
  call s:test('Word has winid property', has_key(s:sample_word, 'winid'))
  call s:test('Word has bufnr property', has_key(s:sample_word, 'bufnr'))
endif

call s:cleanup_windows()
echo ''

" ============================================
" Test 3: window_detector#get_visible() テスト
" ============================================
echo 'Test 3: Window Detector get_visible()'

" 関数が存在するか確認
call s:test('get_visible() function exists', exists('*hellshake_yano_vim#window_detector#get_visible'))

" シングルウィンドウで動作確認
new
setlocal buftype=nofile
call setline(1, ['test content'])
let s:single_win = win_getid()

let s:visible_windows = hellshake_yano_vim#window_detector#get_visible()
call s:test('get_visible() returns list', type(s:visible_windows) == v:t_list)
call s:test('At least one window detected', len(s:visible_windows) >= 1)

" ウィンドウ情報のプロパティ確認
if len(s:visible_windows) > 0
  let s:win_info = s:visible_windows[0]
  call s:test('Window info has winid', has_key(s:win_info, 'winid'))
  call s:test('Window info has bufnr', has_key(s:win_info, 'bufnr'))
  call s:test('Window info has topline', has_key(s:win_info, 'topline'))
  call s:test('Window info has botline', has_key(s:win_info, 'botline'))
  call s:test('Window info has width', has_key(s:win_info, 'width'))
  call s:test('Window info has height', has_key(s:win_info, 'height'))
  call s:test('Window info has is_current', has_key(s:win_info, 'is_current'))
endif

call s:cleanup_windows()
echo ''

" ============================================
" Test 4: 除外タイプテスト (help, quickfix, terminal)
" ============================================
echo 'Test 4: Exclude Types Test'

" デフォルト除外タイプを確認
let s:exclude_types = hellshake_yano_vim#config#get('multiWindowExcludeTypes')
call s:test('Exclude types is list', type(s:exclude_types) == v:t_list)
call s:test('help is excluded', index(s:exclude_types, 'help') >= 0)
call s:test('quickfix is excluded', index(s:exclude_types, 'quickfix') >= 0)
call s:test('terminal is excluded', index(s:exclude_types, 'terminal') >= 0)
call s:test('popup is excluded', index(s:exclude_types, 'popup') >= 0)

" 通常ウィンドウと quickfix ウィンドウを作成
new
setlocal buftype=nofile
call setline(1, ['normal window content'])
let s:normal_win = win_getid()

" quickfix ウィンドウを開く
copen
let s:qf_win = win_getid()

" get_visible() で quickfix が除外されることを確認
let s:visible_after_qf = hellshake_yano_vim#window_detector#get_visible()
let s:qf_found = 0
for s:win in s:visible_after_qf
  if s:win.winid == s:qf_win
    let s:qf_found = 1
    break
  endif
endfor
call s:test('Quickfix window is excluded', s:qf_found == 0)

" quickfix を閉じてクリーンアップ
cclose
call s:cleanup_windows()
echo ''

" ============================================
" Test 5: 最大ウィンドウ数制限テスト
" ============================================
echo 'Test 5: Max Windows Limit Test'

" デフォルト最大ウィンドウ数を確認
let s:default_max = hellshake_yano_vim#config#get('multiWindowMaxWindows')
call s:test('Default max windows is 4', s:default_max == 4)

" カスタム最大ウィンドウ数を設定
let g:hellshake_yano_vim_config = { 'multiWindowMaxWindows': 2 }
let s:custom_max = hellshake_yano_vim#config#get('multiWindowMaxWindows')
call s:test('Custom max windows can be set', s:custom_max == 2)

" 5つのウィンドウを作成
new
setlocal buftype=nofile
call setline(1, ['window 1'])
vsplit
enew
setlocal buftype=nofile
call setline(1, ['window 2'])
vsplit
enew
setlocal buftype=nofile
call setline(1, ['window 3'])
vsplit
enew
setlocal buftype=nofile
call setline(1, ['window 4'])
vsplit
enew
setlocal buftype=nofile
call setline(1, ['window 5'])

" get_visible() で最大2つまでに制限されることを確認
let s:limited_windows = hellshake_yano_vim#window_detector#get_visible()
call s:test('Windows limited to max setting', len(s:limited_windows) <= 2)

call s:cleanup_windows()
echo ''

" ============================================
" Test 6: 設定変更の動的反映テスト
" ============================================
echo 'Test 6: Dynamic Config Change Test'

" 初期状態の確認
let g:hellshake_yano_vim_config = {}
let s:initial_mode = hellshake_yano_vim#config#get('multiWindowMode')
call s:test('Initial mode is false', s:initial_mode == v:false)

" config#set() で動的に変更
call hellshake_yano_vim#config#set('multiWindowMode', v:true)
let s:updated_mode = hellshake_yano_vim#config#get('multiWindowMode')
call s:test('Mode updated via set()', s:updated_mode == v:true)

" 再度変更
call hellshake_yano_vim#config#set('multiWindowMode', v:false)
let s:reverted_mode = hellshake_yano_vim#config#get('multiWindowMode')
call s:test('Mode reverted via set()', s:reverted_mode == v:false)

call s:cleanup_windows()
echo ''

" ============================================
" Test 7: 空ウィンドウ処理テスト
" ============================================
echo 'Test 7: Empty Window Handling'

" 空のウィンドウを作成
new
setlocal buftype=nofile
let s:empty_buf = bufnr('%')
let s:empty_win = win_getid()
" 何も書き込まない

" コンテンツのあるウィンドウを作成
vsplit
enew
setlocal buftype=nofile
let s:content_buf = bufnr('%')
let s:content_win = win_getid()
call setline(1, ['content here'])

let s:test_windows = [
  \ {
  \   'winid': s:empty_win,
  \   'bufnr': s:empty_buf,
  \   'topline': 1,
  \   'botline': 1
  \ },
  \ {
  \   'winid': s:content_win,
  \   'bufnr': s:content_buf,
  \   'topline': 1,
  \   'botline': 1
  \ }
  \ ]

" 空ウィンドウがあってもエラーにならないことを確認
let s:words_with_empty = hellshake_yano_vim#word_detector#detect_multi_window(s:test_windows)
call s:test('Empty window does not cause error', type(s:words_with_empty) == v:t_list)
call s:test('Words detected from non-empty window', len(s:words_with_empty) > 0)

" コンテンツウィンドウからのみ単語が検出されることを確認
let s:all_from_content = 1
for s:word in s:words_with_empty
  if s:word.winid != s:content_win
    let s:all_from_content = 0
    break
  endif
endfor
call s:test('All words from content window', s:all_from_content)

call s:cleanup_windows()
echo ''

" ============================================
" Test 8: 日本語テキスト対応テスト
" ============================================
echo 'Test 8: Japanese Text in Multi-Window'

" 日本語テキストのウィンドウを作成
new
setlocal buftype=nofile
let s:ja_buf = bufnr('%')
let s:ja_win = win_getid()
call setline(1, ['これはテストです'])

" 英語テキストのウィンドウを作成
vsplit
enew
setlocal buftype=nofile
let s:en_buf = bufnr('%')
let s:en_win = win_getid()
call setline(1, ['This is a test'])

let s:mixed_windows = [
  \ {
  \   'winid': s:ja_win,
  \   'bufnr': s:ja_buf,
  \   'topline': 1,
  \   'botline': 1
  \ },
  \ {
  \   'winid': s:en_win,
  \   'bufnr': s:en_buf,
  \   'topline': 1,
  \   'botline': 1
  \ }
  \ ]

let s:mixed_words = hellshake_yano_vim#word_detector#detect_multi_window(s:mixed_windows)
call s:test('Mixed language detection works', type(s:mixed_words) == v:t_list)
call s:test('Detects words from mixed content', len(s:mixed_words) > 0)

call s:cleanup_windows()
echo ''

" ============================================
" Test 9: タブページ分離テスト
" ============================================
echo 'Test 9: Tab Page Isolation'

" タブ1にウィンドウを作成
new
setlocal buftype=nofile
call setline(1, ['tab one content'])
let s:tab1_win = win_getid()
let s:tab1 = tabpagenr()

" タブ2を作成してウィンドウを追加
tabnew
setlocal buftype=nofile
call setline(1, ['tab two content'])
let s:tab2_win = win_getid()
let s:tab2 = tabpagenr()

" タブ2で get_visible() を呼び出し
let s:tab2_visible = hellshake_yano_vim#window_detector#get_visible()

" タブ1のウィンドウが含まれていないことを確認
let s:tab1_found = 0
for s:win in s:tab2_visible
  if s:win.winid == s:tab1_win
    let s:tab1_found = 1
    break
  endif
endfor
call s:test('Tab 1 window not visible from Tab 2', s:tab1_found == 0)

" タブ2のウィンドウが含まれていることを確認
let s:tab2_found = 0
for s:win in s:tab2_visible
  if s:win.winid == s:tab2_win
    let s:tab2_found = 1
    break
  endif
endfor
call s:test('Tab 2 window visible from Tab 2', s:tab2_found == 1)

" タブを閉じてクリーンアップ
tabclose!
call s:cleanup_windows()
echo ''

" ============================================
" Test 10: is_current フラグテスト
" ============================================
echo 'Test 10: is_current Flag Test'

" 2つのウィンドウを作成
new
setlocal buftype=nofile
call setline(1, ['window A'])
let s:win_a = win_getid()

vsplit
enew
setlocal buftype=nofile
call setline(1, ['window B'])
let s:win_b = win_getid()

" カレントウィンドウは win_b
let s:current_win = win_getid()
call s:test('Current window is win_b', s:current_win == s:win_b)

" get_visible() で is_current を確認
let s:visible_with_current = hellshake_yano_vim#window_detector#get_visible()
let s:current_marked = 0
let s:non_current_marked = 0

for s:win in s:visible_with_current
  if s:win.winid == s:win_b && s:win.is_current
    let s:current_marked = 1
  elseif s:win.winid == s:win_a && !s:win.is_current
    let s:non_current_marked = 1
  endif
endfor

call s:test('Current window marked as is_current', s:current_marked)
call s:test('Non-current window marked correctly', s:non_current_marked)

call s:cleanup_windows()
echo ''

" ============================================
" Summary
" ============================================
echo '=== Test Summary ==='
echo 'Passed: ' . s:pass . '/' . s:total
echo ''

if s:pass == s:total
  echo 'RESULT: SUCCESS - All integration tests passed!'
  qall!
else
  echo 'RESULT: FAILURE - Some tests failed'
  echo 'Failed tests: ' . (s:total - s:pass)
endif
