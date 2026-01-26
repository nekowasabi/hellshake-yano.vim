" tests-vim/hellshake_yano_vim/test_window_detector.vim - ウィンドウ検出機能のユニットテスト
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: RED
" Process: floating window 除外テスト作成
"
" 目的:
"   - マルチウィンドウ検出機能のテスト
"   - Neovim の floating window が除外されることを検証
"   - 通常ウィンドウは正しくカウントされることを検証
"
" テスト対象関数:
"   - hellshake_yano_vim#window_detector#get_visible()

" テストランナーをロード
if !exists('*RunTest')
  source <sfile>:h/test_runner.vim
endif

" Test_get_visible_basic: 基本的なウィンドウ検出
" 目的: 単一ウィンドウの場合、1つのウィンドウが検出されることを検証
function! Test_get_visible_basic() abort
  " 現在のウィンドウ数を取得
  let l:windows = hellshake_yano_vim#window_detector#get_visible()

  " 少なくとも1つのウィンドウが検出されるか検証
  call Assert(len(l:windows) >= 1, 'should detect at least 1 window')

  " 現在のウィンドウがis_currentとしてマークされているか検証
  let l:current_windows = filter(copy(l:windows), 'v:val.is_current')
  call AssertEqual(1, len(l:current_windows), 'should have exactly 1 current window')
endfunction

" Test_get_visible_multi_window: 複数ウィンドウの検出
" 目的: vsplitで分割した場合、2つのウィンドウが検出されることを検証
function! Test_get_visible_multi_window() abort
  " テスト用バッファを作成
  new

  " vsplitでウィンドウを分割
  vsplit

  " ウィンドウ検出を実行
  let l:windows = hellshake_yano_vim#window_detector#get_visible()

  " 2つ以上のウィンドウが検出されるか検証（テスト前のウィンドウも含む可能性）
  call Assert(len(l:windows) >= 2, 'should detect at least 2 windows after vsplit')

  " 各ウィンドウがwinid、bufnr、topline等を持っているか検証
  for l:win in l:windows
    call Assert(has_key(l:win, 'winid'), 'window should have winid')
    call Assert(has_key(l:win, 'bufnr'), 'window should have bufnr')
    call Assert(has_key(l:win, 'topline'), 'window should have topline')
    call Assert(has_key(l:win, 'botline'), 'window should have botline')
    call Assert(has_key(l:win, 'width'), 'window should have width')
    call Assert(has_key(l:win, 'height'), 'window should have height')
    call Assert(has_key(l:win, 'is_current'), 'window should have is_current')
  endfor

  " クリーンアップ
  close
  bwipeout!
endfunction

" Test_get_visible_excludes_floating_window: Neovim floating window の除外
" 目的: Neovimのfloating windowがウィンドウ検出から除外されることを検証
" 条件: Neovimでのみ実行
function! Test_get_visible_excludes_floating_window() abort
  " Neovim以外ではスキップ
  if !has('nvim')
    echo '    (skipped: Neovim only test)'
    return
  endif

  " テスト前のウィンドウ数を取得
  let l:windows_before = hellshake_yano_vim#window_detector#get_visible()
  let l:count_before = len(l:windows_before)

  " floating windowを作成（lazygit風の設定）
  let l:buf = nvim_create_buf(v:false, v:true)
  let l:opts = {
        \ 'relative': 'editor',
        \ 'width': 80,
        \ 'height': 20,
        \ 'col': 10,
        \ 'row': 5,
        \ 'style': 'minimal',
        \ 'border': 'rounded'
        \ }
  let l:float_win = nvim_open_win(l:buf, v:true, l:opts)

  " floating window作成後のウィンドウ数を取得
  let l:windows_after = hellshake_yano_vim#window_detector#get_visible()
  let l:count_after = len(l:windows_after)

  " floating windowは検出されないはず（カウントが増えていない）
  call AssertEqual(l:count_before, l:count_after,
        \ 'floating window should NOT be counted in get_visible()')

  " floating windowのwinidが結果に含まれていないことを確認
  let l:found_floating = v:false
  for l:win in l:windows_after
    if l:win.winid == l:float_win
      let l:found_floating = v:true
      break
    endif
  endfor
  call AssertFalse(l:found_floating, 'floating window winid should not be in results')

  " クリーンアップ: floating windowを閉じる
  call nvim_win_close(l:float_win, v:true)
  call nvim_buf_delete(l:buf, {'force': v:true})
endfunction

" Test_get_visible_normal_window_after_floating: floating window閉じた後の通常ウィンドウ
" 目的: floating windowを閉じた後、通常ウィンドウが正しくカウントされることを検証
" 条件: Neovimでのみ実行
function! Test_get_visible_normal_window_after_floating() abort
  " Neovim以外ではスキップ
  if !has('nvim')
    echo '    (skipped: Neovim only test)'
    return
  endif

  " 初期状態のウィンドウ数を取得
  let l:windows_initial = hellshake_yano_vim#window_detector#get_visible()
  let l:count_initial = len(l:windows_initial)

  " floating windowを作成
  let l:buf = nvim_create_buf(v:false, v:true)
  let l:opts = {
        \ 'relative': 'editor',
        \ 'width': 40,
        \ 'height': 10,
        \ 'col': 5,
        \ 'row': 2,
        \ 'style': 'minimal'
        \ }
  let l:float_win = nvim_open_win(l:buf, v:false, l:opts)

  " 通常ウィンドウをvsplitで追加
  vsplit
  enew

  " ウィンドウ検出
  let l:windows_with_split = hellshake_yano_vim#window_detector#get_visible()
  let l:count_with_split = len(l:windows_with_split)

  " floating windowは除外されつつ、vsplitウィンドウはカウントされる
  call AssertEqual(l:count_initial + 1, l:count_with_split,
        \ 'vsplit window should be counted, floating window should not')

  " クリーンアップ
  call nvim_win_close(l:float_win, v:true)
  call nvim_buf_delete(l:buf, {'force': v:true})
  close
  bwipeout!
endfunction

" Test_get_visible_multiple_floating_windows: 複数のfloating windowの除外
" 目的: 複数のfloating windowがすべて除外されることを検証
" 条件: Neovimでのみ実行
function! Test_get_visible_multiple_floating_windows() abort
  " Neovim以外ではスキップ
  if !has('nvim')
    echo '    (skipped: Neovim only test)'
    return
  endif

  " 初期状態のウィンドウ数を取得
  let l:windows_initial = hellshake_yano_vim#window_detector#get_visible()
  let l:count_initial = len(l:windows_initial)

  " 3つのfloating windowを作成
  let l:float_wins = []
  let l:float_bufs = []
  for l:i in range(3)
    let l:buf = nvim_create_buf(v:false, v:true)
    call add(l:float_bufs, l:buf)
    let l:opts = {
          \ 'relative': 'editor',
          \ 'width': 30,
          \ 'height': 8,
          \ 'col': 5 + (l:i * 35),
          \ 'row': 2,
          \ 'style': 'minimal'
          \ }
    let l:win = nvim_open_win(l:buf, v:false, l:opts)
    call add(l:float_wins, l:win)
  endfor

  " ウィンドウ検出
  let l:windows_after = hellshake_yano_vim#window_detector#get_visible()
  let l:count_after = len(l:windows_after)

  " すべてのfloating windowは除外される（カウントが変わらない）
  call AssertEqual(l:count_initial, l:count_after,
        \ 'all 3 floating windows should be excluded from count')

  " どのfloating windowも結果に含まれていないことを確認
  for l:float_win in l:float_wins
    let l:found = v:false
    for l:win in l:windows_after
      if l:win.winid == l:float_win
        let l:found = v:true
        break
      endif
    endfor
    call AssertFalse(l:found, printf('floating window %d should not be in results', l:float_win))
  endfor

  " クリーンアップ
  for l:i in range(len(l:float_wins))
    call nvim_win_close(l:float_wins[l:i], v:true)
    call nvim_buf_delete(l:float_bufs[l:i], {'force': v:true})
  endfor
endfunction

" Test_get_visible_vim_compatible: Vimでの互換性
" 目的: Vimでも正常に動作することを検証（has('nvim')ガード）
function! Test_get_visible_vim_compatible() abort
  " 単純にエラーなく実行できることを確認
  let l:windows = hellshake_yano_vim#window_detector#get_visible()

  " リストが返されること
  call Assert(type(l:windows) == type([]), 'should return a list')

  " 各エントリが正しい構造を持つこと
  if len(l:windows) > 0
    let l:win = l:windows[0]
    call Assert(type(l:win.winid) == type(0), 'winid should be a number')
    call Assert(type(l:win.bufnr) == type(0), 'bufnr should be a number')
  endif
endfunction

" このファイルを直接sourceした場合はテストを実行
if expand('<sfile>:p') ==# expand('%:p')
  echo 'Running test_window_detector.vim (RED phase)...'
  echo ''
  call RunAllTests()
endif
