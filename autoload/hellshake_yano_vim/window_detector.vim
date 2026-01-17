" autoload/hellshake_yano_vim/window_detector.vim - マルチウィンドウ検出モジュール
" Author: hellshake-yano
" License: MIT
"
" Phase: MW-1 Multi-Window Support
"
" このモジュールはマルチウィンドウ環境での可視ウィンドウ情報を検出します。
" 現在のタブページ内の編集可能なウィンドウのみを対象とし、
" help、quickfix、terminal、popup などの特殊ウィンドウは除外します。

let s:save_cpo = &cpo
set cpo&vim

" hellshake_yano_vim#window_detector#get_visible() - 可視ウィンドウ情報を取得
"
" 目的:
"   - 現在のタブページ内の編集可能なウィンドウ情報を取得
"   - ヒント表示の対象となるウィンドウを特定
"
" アルゴリズム:
"   1. 現在のウィンドウIDとタブページ番号を取得
"   2. getwininfo() で全ウィンドウ情報を取得
"   3. 同じタブページのウィンドウのみをフィルタ
"   4. 除外タイプ（help, quickfix, terminal, popup）を除外
"   5. quickfix/loclist ウィンドウを除外
"   6. 最大ウィンドウ数に達したら終了
"
" パラメータ:
"   なし
"
" 戻り値:
"   @return List<WindowInfo> - ウィンドウ情報のリスト
"   WindowInfo: {
"     winid: Number    - ウィンドウID
"     bufnr: Number    - バッファ番号
"     topline: Number  - 表示開始行
"     botline: Number  - 表示終了行
"     width: Number    - ウィンドウ幅
"     height: Number   - ウィンドウ高さ
"     is_current: Bool - カレントウィンドウかどうか
"   }
"
" 使用例:
"   let l:windows = hellshake_yano_vim#window_detector#get_visible()
"   for l:win in l:windows
"     echo 'Window ID: ' . l:win.winid . ' Buffer: ' . l:win.bufnr
"   endfor
"
" 注意事項:
"   - 現在のタブページのウィンドウのみを対象とする
"   - 除外タイプは config.vim の multiWindowExcludeTypes で設定可能
"   - 最大ウィンドウ数は config.vim の multiWindowMaxWindows で設定可能
function! hellshake_yano_vim#window_detector#get_visible() abort
  let l:current_winid = win_getid()
  let l:current_tabpage = tabpagenr()
  let l:exclude_types = hellshake_yano_vim#config#get('multiWindowExcludeTypes')
  let l:max_windows = hellshake_yano_vim#config#get('multiWindowMaxWindows')

  let l:windows = []

  for l:wininfo in getwininfo()
    " 同じタブのウィンドウのみ
    if l:wininfo.tabnr != l:current_tabpage
      continue
    endif

    " 除外タイプのチェック
    let l:buftype = getbufvar(l:wininfo.bufnr, '&buftype')
    if index(l:exclude_types, l:buftype) >= 0
      continue
    endif

    " quickfixチェック
    if l:wininfo.quickfix || l:wininfo.loclist
      continue
    endif

    " ウィンドウ情報を構築
    call add(l:windows, {
          \ 'winid': l:wininfo.winid,
          \ 'bufnr': l:wininfo.bufnr,
          \ 'topline': l:wininfo.topline,
          \ 'botline': l:wininfo.botline,
          \ 'width': l:wininfo.width,
          \ 'height': l:wininfo.height,
          \ 'is_current': l:wininfo.winid == l:current_winid
          \ })

    " 最大数チェック
    if len(l:windows) >= l:max_windows
      break
    endif
  endfor

  return l:windows
endfunction

let &cpo = s:save_cpo
unlet s:save_cpo
