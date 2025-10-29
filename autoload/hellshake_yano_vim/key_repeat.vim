" key_repeat.vim - Vim専用キーリピート状態管理
" Phase D-6 Process50 Sub1: Neovimキーリピート抑制機能のVim移植
"
" このファイルは、Vim環境でキーリピート状態を管理します。
" Neovim側の実装（autoload/hellshake_yano/motion.vim）を参考にしていますが、
" Vim専用のスクリプト変数とタイマーAPIを使用します。
"
" 主な機能:
" - バッファ単位での最後のキー入力時刻の管理
" - バッファ単位でのキーリピート状態の管理
" - タイマーによる自動リセット処理
" - 複数バッファでの独立した状態管理
"
" ライセンス: MIT License
" 作成日: 2025-10-20

" スクリプト変数: バッファ単位の状態管理
" キー: bufnr, 値: タイムスタンプ（ミリ秒）
let s:last_key_time = {}

" スクリプト変数: バッファ単位のキーリピート状態
" キー: bufnr, 値: boolean (v:true/v:false)
let s:is_repeating = {}

" スクリプト変数: バッファ単位のリセットタイマーID
" キー: bufnr, 値: timer_id
let s:reset_timers = {}

" スクリプト変数: タイマーコールバック用のバッファ番号保持
" キー: timer_id, 値: bufnr
let s:timer_bufnr_map = {}

" 最後のキー入力時刻を取得
"
" @param bufnr バッファ番号
" @return 最後のキー入力時刻（ミリ秒）、未初期化の場合は0
function! hellshake_yano_vim#key_repeat#get_last_key_time(bufnr) abort
  return get(s:last_key_time, a:bufnr, 0)
endfunction

" 最後のキー入力時刻を設定
"
" @param bufnr バッファ番号
" @param time タイムスタンプ（ミリ秒単位）
function! hellshake_yano_vim#key_repeat#set_last_key_time(bufnr, time) abort
  let s:last_key_time[a:bufnr] = a:time
endfunction

" キーリピート状態を取得
"
" @param bufnr バッファ番号
" @return キーリピート状態（v:true/v:false）、未初期化の場合はv:false
function! hellshake_yano_vim#key_repeat#is_repeating(bufnr) abort
  return get(s:is_repeating, a:bufnr, v:false)
endfunction

" キーリピート状態を設定
"
" @param bufnr バッファ番号
" @param repeating キーリピート状態（v:true/v:false）
function! hellshake_yano_vim#key_repeat#set_repeating(bufnr, repeating) abort
  let s:is_repeating[a:bufnr] = a:repeating
endfunction

" 内部関数: タイマーコールバック
"
" timer_start()から呼び出されるコールバック関数。
" Vimのtimer_start()は常に第1引数としてタイマーIDを渡すため、
" この関数でタイマーIDを受け取り、s:timer_bufnr_mapからbufnrを取得して
" reset_state()を呼び出します。
"
" Note: ラムダ式はVimの+lambda非対応ビルドでE110エラーになるため、
"       このラッパー関数を使用します（motion.vim:644の修正パターンを参照）
"
" @param timer タイマーID（Vimが自動的に渡す）
function! s:reset_state_timer_callback(timer) abort
  if has_key(s:timer_bufnr_map, a:timer)
    let l:bufnr = s:timer_bufnr_map[a:timer]
    unlet s:timer_bufnr_map[a:timer]
    call hellshake_yano_vim#key_repeat#reset_state(l:bufnr)
  endif
endfunction

" 内部関数: タイマーを停止
"
" 既存のリセットタイマーを安全に停止して削除します。
" タイマーが存在しない場合やタイマーが既に停止している場合はエラーを無視します。
"
" @param bufnr バッファ番号
function! s:stop_timer(bufnr) abort
  if has_key(s:reset_timers, a:bufnr)
    let l:timer_id = s:reset_timers[a:bufnr]
    try
      call timer_stop(l:timer_id)
    catch
      " タイマーが既に停止している場合は無視
    endtry
    " timer_bufnr_mapからも削除
    if has_key(s:timer_bufnr_map, l:timer_id)
      unlet s:timer_bufnr_map[l:timer_id]
    endif
    unlet s:reset_timers[a:bufnr]
  endif
endfunction

" キーリピート状態をリセット
"
" この関数は以下の処理を行います:
" 1. リピート状態をv:falseに設定
" 2. 既存のリセットタイマーを停止して削除
"
" @param bufnr バッファ番号
function! hellshake_yano_vim#key_repeat#reset_state(bufnr) abort
  " リピート状態をリセット
  let s:is_repeating[a:bufnr] = v:false

  " 既存タイマーを停止
  call s:stop_timer(a:bufnr)
endfunction

" リセットタイマーを設定
"
" この関数は以下の処理を行います:
" 1. 既存のリセットタイマーを停止
" 2. 新規タイマーを設定（delay後にreset_state()を呼び出し）
"
" @param bufnr バッファ番号
" @param delay 遅延時間（ミリ秒）
function! hellshake_yano_vim#key_repeat#set_reset_timer(bufnr, delay) abort
  " 既存タイマーを停止
  call s:stop_timer(a:bufnr)

  " 新規タイマーを設定
  " タイマーコールバックでreset_state()を呼び出す
  " Note: ラムダ式はVimの+lambda非対応ビルドでE110エラーになるため、
  "       ラッパー関数（s:reset_state_timer_callback）を使用します。
  "       timer_start()は第1引数にタイマーIDを自動的に渡すため、
  "       bufnrはs:timer_bufnr_mapで管理します。
  let l:timer_id = timer_start(a:delay, function('s:reset_state_timer_callback'))
  let s:reset_timers[a:bufnr] = l:timer_id
  let s:timer_bufnr_map[l:timer_id] = a:bufnr
endfunction
