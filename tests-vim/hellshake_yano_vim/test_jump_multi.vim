" tests-vim/hellshake_yano_vim/test_jump_multi.vim - マルチウィンドウジャンプテスト
" Process 4: ウィンドウ間ジャンプ - Sub1: to_window()関数実装
"
" 目的:
"   - to_window(winid, lnum, col) 関数の動作確認
"   - ウィンドウ間ジャンプの正確性検証
"   - エラーハンドリングの確認

let s:plugin_root = expand('<sfile>:p:h:h:h')
execute 'set runtimepath+=' . s:plugin_root

echo '=== Test Jump Multi Window ==='
echo ''

let s:pass = 0
let s:total = 0

function! s:test(name, condition) abort
  let s:total += 1
  " 条件を明示的にブール値として評価
  if a:condition ? v:true : v:false
    let s:pass += 1
    echo 'PASS: ' . a:name
  else
    echo 'FAIL: ' . a:name
  endif
endfunction

" テスト1: 現在ウィンドウへのジャンプ
function! s:test_jump_to_current_window() abort
  call setline(1, ['line 1', 'line 2', 'line 3'])
  let l:current_winid = win_getid()

  " 現在ウィンドウにジャンプ
  call hellshake_yano_vim#jump#to_window(l:current_winid, 2, 3)

  " カーソル位置確認
  call assert_equal([2, 3], [line('.'), col('.')])
endfunction

" テスト2: 別ウィンドウへのジャンプ
function! s:test_jump_to_other_window() abort
  call setline(1, ['window1 line1', 'window1 line2'])
  let l:winid1 = win_getid()

  " 新規ウィンドウ作成
  vnew
  call setline(1, ['window2 line1', 'window2 line2', 'window2 line3'])
  let l:winid2 = win_getid()

  " ウィンドウ1にジャンプ
  call hellshake_yano_vim#jump#to_window(l:winid1, 1, 5)

  " ウィンドウ1にいるか確認
  call assert_equal(l:winid1, win_getid())
  call assert_equal([1, 5], [line('.'), col('.')])

  " クリーンアップ
  call win_gotoid(l:winid2)
  close!
endfunction

" テスト3: 存在しないウィンドウIDでエラー
function! s:test_jump_to_nonexistent_window() abort
  call setline(1, ['line 1'])
  let l:invalid_winid = 99999

  " エラーが発生することを確認
  try
    call hellshake_yano_vim#jump#to_window(l:invalid_winid, 1, 1)
    call assert_false(v:true, 'Should have thrown an error')
  catch /no longer exists/
    " 期待されたエラー
    call assert_true(v:true)
  endtry
endfunction

" テスト4: ジャンプ後のカーソル位置確認（複数行）
function! s:test_jump_cursor_position() abort
  call setline(1, ['line 1', 'line 2', 'line 3', 'line 4', 'line 5'])
  let l:winid = win_getid()

  " 異なる行・列にジャンプ
  call hellshake_yano_vim#jump#to_window(l:winid, 4, 7)

  call assert_equal([4, 7], [line('.'), col('.')])
endfunction

" テスト5: 型チェック - 無効な引数
function! s:test_jump_invalid_types() abort
  let l:winid = win_getid()

  " 文字列をwinidに渡す
  try
    call hellshake_yano_vim#jump#to_window('invalid', 1, 1)
    call assert_false(v:true, 'Should have thrown an error')
  catch /must be numbers\|all arguments must be numbers/
    call assert_true(v:true)
  endtry

  " 文字列をlnumに渡す
  try
    call hellshake_yano_vim#jump#to_window(l:winid, 'invalid', 1)
    call assert_false(v:true, 'Should have thrown an error')
  catch /must be numbers\|all arguments must be numbers/
    call assert_true(v:true)
  endtry

  " 文字列をcolに渡す
  try
    call hellshake_yano_vim#jump#to_window(l:winid, 1, 'invalid')
    call assert_false(v:true, 'Should have thrown an error')
  catch /must be numbers\|all arguments must be numbers/
    call assert_true(v:true)
  endtry
endfunction

" テスト6: エラー時に元のウィンドウに戻る
function! s:test_jump_rollback_on_error() abort
  call setline(1, ['line 1', 'line 2'])
  let l:winid1 = win_getid()

  " ウィンドウ2作成
  vnew
  call setline(1, ['window 2'])
  let l:winid2 = win_getid()

  " ウィンドウ1の存在しない行にジャンプしようとする
  try
    call hellshake_yano_vim#jump#to_window(l:winid1, 999, 1)
    call assert_false(v:true, 'Should have thrown an error')
  catch /invalid line number/
    " エラーが発生したが、ウィンドウ2に戻っているはず
    call assert_equal(l:winid2, win_getid())
  endtry

  " クリーンアップ
  close!
endfunction

" テスト7: 3分割ウィンドウでのジャンプ
function! s:test_jump_three_windows() abort
  call setline(1, ['win1-1', 'win1-2'])
  let l:winid1 = win_getid()

  vnew
  call setline(1, ['win2-1', 'win2-2', 'win2-3'])
  let l:winid2 = win_getid()

  vnew
  call setline(1, ['win3-1', 'win3-2', 'win3-3', 'win3-4'])
  let l:winid3 = win_getid()

  " ウィンドウ1にジャンプ
  call hellshake_yano_vim#jump#to_window(l:winid1, 2, 4)
  call assert_equal(l:winid1, win_getid())
  call assert_equal([2, 4], [line('.'), col('.')])

  " ウィンドウ3にジャンプ
  call hellshake_yano_vim#jump#to_window(l:winid3, 3, 2)
  call assert_equal(l:winid3, win_getid())
  call assert_equal([3, 2], [line('.'), col('.')])

  " ウィンドウ2にジャンプ
  call hellshake_yano_vim#jump#to_window(l:winid2, 1, 1)
  call assert_equal(l:winid2, win_getid())
  call assert_equal([1, 1], [line('.'), col('.')])

  " クリーンアップ
  close!
  close!
endfunction

" テスト8: 水平分割での2ウィンドウジャンプ
function! s:test_jump_horizontal_split() abort
  call setline(1, ['window1-line1', 'window1-line2', 'window1-line3'])
  let l:winid1 = win_getid()

  split
  call setline(1, ['window2-line1', 'window2-line2'])
  let l:winid2 = win_getid()

  " ウィンドウ1にジャンプ
  call hellshake_yano_vim#jump#to_window(l:winid1, 3, 10)
  call assert_equal(l:winid1, win_getid())
  call assert_equal([3, 10], [line('.'), col('.')])

  " ウィンドウ2にジャンプ
  call hellshake_yano_vim#jump#to_window(l:winid2, 2, 5)
  call assert_equal(l:winid2, win_getid())
  call assert_equal([2, 5], [line('.'), col('.')])

  " クリーンアップ
  close!
endfunction

" テスト1: 関数存在確認（autoload関数は呼び出し後にexistsが有効になる）
echo 'Test 1: Function exists'
call setline(1, ['test line'])
let s:test1_winid = win_getid()
try
  " autoload関数を一度呼び出してロードさせる
  call hellshake_yano_vim#jump#to_window(s:test1_winid, 1, 1)
catch
  " エラーが発生しても続行（関数はロードされる）
endtry
" 関数がロードされたか確認
call s:test('to_window function exists', exists('*hellshake_yano_vim#jump#to_window'))

" テスト実行
try
  call s:test_jump_to_current_window()
  call s:test('jump to current window', v:true)
catch
  call s:test('jump to current window', v:false)
endtry

try
  call s:test_jump_to_other_window()
  call s:test('jump to other window', v:true)
catch
  call s:test('jump to other window', v:false)
endtry

try
  call s:test_jump_to_nonexistent_window()
  call s:test('error on nonexistent window', v:true)
catch
  call s:test('error on nonexistent window', v:false)
endtry

try
  call s:test_jump_cursor_position()
  call s:test('jump cursor position', v:true)
catch
  call s:test('jump cursor position', v:false)
endtry

try
  call s:test_jump_invalid_types()
  call s:test('invalid types error', v:true)
catch
  call s:test('invalid types error', v:false)
endtry

try
  call s:test_jump_rollback_on_error()
  call s:test('rollback on error', v:true)
catch
  call s:test('rollback on error', v:false)
endtry

try
  call s:test_jump_three_windows()
  call s:test('three windows jump', v:true)
catch
  call s:test('three windows jump', v:false)
endtry

try
  call s:test_jump_horizontal_split()
  call s:test('horizontal split jump', v:true)
catch
  call s:test('horizontal split jump', v:false)
endtry

" 結果表示
echo ''
echo 'Test Results: ' . s:pass . '/' . s:total . ' passed'
if s:pass == s:total
  echo 'All tests passed!'
else
  echo 'Some tests failed!'
endif
