" autoload/hellshake_yano_vim/core.vim - コア機能（状態管理・統合処理）
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: GREEN
" Process3: core.vim統合 - word_detector との統合完了
"
" このモジュールは hellshake-yano.vim の中核となる状態管理と単語検出統合を担当します。
" Phase A-3: 複数文字ヒント（aa, as, ad...）への対応が完了しました。
" Vim 8.0+ と Neovim の両方で動作します。

" スクリプトローカル変数の定義
let s:save_cpo = &cpo
set cpo&vim

" 状態変数（スクリプトローカル）
" PLAN.md の仕様に基づくデータ構造
let s:state = {
  \ 'enabled': v:true,
  \ 'hints_visible': v:false,
  \ 'words': [],
  \ 'hints': [],
  \ 'hint_map': {},
  \ 'popup_ids': [],
  \ 'input_timer': 0
\ }

" Focus Restore Feature: 画面ちらつき問題の修正
" FocusGained 直後かどうかを示すフラグ
let s:focus_just_restored = v:false

" hellshake_yano_vim#core#init() - 状態変数の初期化
"
" 目的:
"   - s:state を初期値にリセット
"   - プラグインの起動時や再初期化時に呼び出される
"   - Phase A-4: motion#init() を呼び出してモーション状態を初期化
"   - Phase A-5: visual#init() を呼び出してビジュアルモード状態を初期化
"   - Phase A-4: config#get() で設定値を取得してmotion設定を適用
"
" @return なし
function! hellshake_yano_vim#core#init() abort
  let s:state = {
    \ 'enabled': v:true,
    \ 'hints_visible': v:false,
    \ 'words': [],
    \ 'hints': [],
    \ 'hint_map': {},
    \ 'popup_ids': [],
    \ 'input_timer': 0
  \ }

  " Focus Restore Feature: フラグを初期化
  let s:focus_just_restored = v:false

  " Phase A-4: モーション連打検出の初期化
  call hellshake_yano_vim#motion#init()

  " Phase A-5: ビジュアルモード対応の初期化
  call hellshake_yano_vim#visual#init()

  " Phase A-4: 設定値を取得してmotion設定を適用
  let l:motion_threshold = hellshake_yano_vim#config#get('motion_threshold')
  let l:motion_timeout_ms = hellshake_yano_vim#config#get('motion_timeout_ms')

  call hellshake_yano_vim#motion#set_threshold(l:motion_threshold)
  call hellshake_yano_vim#motion#set_timeout(l:motion_timeout_ms)

  " Focus Restore Feature: FocusGained autocmd の設定
  call s:setup_focus_gained_autocmd()
endfunction

" hellshake_yano_vim#core#get_state() - 状態変数の取得（テスト用）
"
" 目的:
"   - スクリプトローカル変数 s:state への読み取り専用アクセスを提供
"   - 主にユニットテストで状態を検証するために使用
"
" @return Dictionary s:state のコピー
function! hellshake_yano_vim#core#get_state() abort
  return deepcopy(s:state)
endfunction

" ========================================
" Focus Restore Feature: 画面ちらつき問題の修正
" ========================================

" s:setup_focus_gained_autocmd() - FocusGained/TermLeave autocmd の設定
"
" 目的:
"   - FocusGained イベントで on_focus_gained() を呼び出す autocmd を設定
"   - TermLeave/TermClose イベントも監視（lazygit等のターミナル復帰対応）
"   - multiWindowDetectFocusGained が有効な場合のみ設定
"
" 背景:
"   - FocusGained は OS レベルのフォーカス変更時にのみ発火
"   - lazygit 等の Neovim 内ターミナルからの復帰では FocusGained は発火しない
"   - TermLeave（ターミナルモード離脱）と TermClose（ターミナル終了）を監視
"
" @return なし
function! s:setup_focus_gained_autocmd() abort
  " 既存の autocmd をクリア
  augroup HellshakeYanoFocusRestore
    autocmd!
  augroup END

  " 設定で有効化されている場合のみ autocmd を設定
  if hellshake_yano_vim#config#get('multiWindowDetectFocusGained')
    augroup HellshakeYanoFocusRestore
      autocmd!
      " OS レベルのフォーカス変更
      autocmd FocusGained * call hellshake_yano_vim#core#on_focus_gained()
      " Neovim 内ターミナルからの復帰（lazygit, terminal等）
      if has('nvim')
        autocmd TermLeave * call hellshake_yano_vim#core#on_terminal_leave()
        autocmd TermClose * call hellshake_yano_vim#core#on_terminal_leave()
      endif
    augroup END
  endif
endfunction

" hellshake_yano_vim#core#on_focus_gained() - FocusGained イベントハンドラ
"
" 目的:
"   - FocusGained イベント時にフラグを設定
"   - 一定時間後にフラグを自動リセット
"
" @return なし
function! hellshake_yano_vim#core#on_focus_gained() abort
  echom '[HY-DEBUG] on_focus_gained triggered at ' . strftime('%H:%M:%S')

  " 設定で無効化されている場合は何もしない
  if !hellshake_yano_vim#config#get('multiWindowDetectFocusGained')
    echom '[HY-DEBUG] multiWindowDetectFocusGained is disabled, returning'
    return
  endif

  " フラグを設定
  let s:focus_just_restored = v:true
  echom '[HY-DEBUG] focus_just_restored = true'

  " 一定時間後にフラグをリセット（100ms）
  call timer_start(100, {-> execute("let s:focus_just_restored = v:false | echom '[HY-DEBUG] focus_just_restored = false (timer reset 100ms)'")})
endfunction

" hellshake_yano_vim#core#on_terminal_leave() - TermLeave/TermClose イベントハンドラ
"
" 目的:
"   - ターミナルバッファから離れた時にフラグを設定
"   - lazygit 等の Neovim 内ターミナルからの復帰時のちらつき防止
"   - FocusGained とは異なり、ターミナル専用の処理
"
" 背景:
"   - TermLeave: ターミナルモードから離れた時（:terminal で開いたバッファ）
"   - TermClose: ターミナルバッファが閉じられた時（lazygit終了等）
"   - これらのイベントは FocusGained とは別に発火する
"
" @return なし
function! hellshake_yano_vim#core#on_terminal_leave() abort
  echom '[HY-DEBUG] on_terminal_leave triggered at ' . strftime('%H:%M:%S')

  " 設定で無効化されている場合は何もしない
  if !hellshake_yano_vim#config#get('multiWindowDetectFocusGained')
    echom '[HY-DEBUG] multiWindowDetectFocusGained is disabled, returning'
    return
  endif

  " フラグを設定
  let s:focus_just_restored = v:true
  echom '[HY-DEBUG] focus_just_restored = true (terminal leave)'

  " ターミナル復帰は画面の再描画に時間がかかるため、長めの遅延を設定（150ms）
  " FocusGained の 100ms より長くすることで、より確実にちらつきを防止
  call timer_start(150, {-> execute("let s:focus_just_restored = v:false | echom '[HY-DEBUG] focus_just_restored = false (timer reset 150ms)'")})
endfunction

" hellshake_yano_vim#core#is_focus_just_restored() - フォーカス復帰フラグの取得
"
" 目的:
"   - FocusGained 直後かどうかを返す
"   - 他のモジュールからフラグの状態を確認するために使用
"
" @return Boolean フォーカス復帰直後なら true、そうでなければ false
function! hellshake_yano_vim#core#is_focus_just_restored() abort
  return s:focus_just_restored
endfunction

" hellshake_yano_vim#core#clear_focus_flag() - フォーカス復帰フラグのクリア
"
" 目的:
"   - フォーカス復帰フラグを手動でクリア
"   - テストやデバッグ用
"
" @return なし
function! hellshake_yano_vim#core#clear_focus_flag() abort
  let s:focus_just_restored = v:false
endfunction

" hellshake_yano_vim#core#should_redraw() - redraw すべきかどうかの判定
"
" 目的:
"   - フォーカス復帰直後は redraw をスキップすべきかを判定
"   - 画面ちらつき防止のため
"
" @return Boolean redraw すべきなら true、スキップすべきなら false
function! hellshake_yano_vim#core#should_redraw() abort
  return !s:focus_just_restored
endfunction

" hellshake_yano_vim#core#show_delayed() - 遅延付きヒント表示
"
" 目的:
"   - フォーカス復帰直後は遅延を入れてヒントを表示
"   - 通常時は即時実行
"
" @param delay_ms Number 遅延時間（ミリ秒）。省略時は設定値を使用
" @return なし
function! hellshake_yano_vim#core#show_delayed(...) abort
  " 遅延時間を取得（引数があれば使用、なければ設定値）
  let l:delay_ms = a:0 > 0 ? a:1 : hellshake_yano_vim#config#get('multiWindowRestoreDelay')

  if s:focus_just_restored
    " フォーカス復帰直後は遅延実行
    call timer_start(l:delay_ms, {-> hellshake_yano_vim#core#show()})
  else
    " 通常時は即時実行
    call hellshake_yano_vim#core#show()
  endif
endfunction

" hellshake_yano_vim#core#is_denops_ready() - Denops初期化状態の確認
"
" Phase 1.2: VimScript→TypeScript統合
"
" 目的:
"   - Denopsプラグインが初期化済みかどうかを確認
"   - config.vim がDenops APIを呼び出せるかの判定に使用
"
" アルゴリズム:
"   1. denops#plugin#is_loaded() が存在するか確認
"   2. 存在する場合、'hellshake-yano' プラグインがロード済みか確認
"   3. 存在しない場合は v:false を返す
"
" @return Boolean Denopsが利用可能な場合 v:true、そうでなければ v:false
function! hellshake_yano_vim#core#is_denops_ready() abort
  " denops#plugin#is_loaded() が存在しない場合は未初期化
  if !exists('*denops#plugin#is_loaded')
    return v:false
  endif

  " hellshake-yano プラグインがロードされているか確認
  try
    return denops#plugin#is_loaded('hellshake-yano')
  catch
    return v:false
  endtry
endfunction

" hellshake_yano_vim#core#get_fixed_positions() - 固定座標の取得
"
" 目的:
"   - カーソル行を中心に前後3行の固定座標を返す
"   - MVP版では3つの固定位置にヒント（a, s, d）を表示するための座標を提供
"
" アルゴリズム:
"   1. カーソルの現在行を取得
"   2. 前後3行の座標を計算（cursor_line - 3, cursor_line, cursor_line + 3）
"   3. 各座標の行番号をバッファの範囲内にクランプ（1 <= lnum <= line('$')）
"   4. 座標の配列を返す
"
" エラーハンドリング:
"   - 空のバッファの場合でも安全に動作（line('$') は最小で1を返す）
"   - カーソル位置が異常な場合でも範囲内にクランプされる
"
" @return List<Dictionary> 座標のリスト
"   形式: [{'lnum': N, 'col': 1}, ...]
"   - lnum: 行番号（1-indexed）
"   - col: 列番号（常に1 = 行頭）
"
" 注意事項:
"   - Phase A-2 で word_detector#detect_visible() に置き換え済み
"   - この関数は Phase A-1 との互換性維持のために残されています
"   - 現在は固定オフセット [-3, 0, 3] を使用
function! hellshake_yano_vim#core#get_fixed_positions() abort
  " カーソルの現在行を取得
  let l:cursor_line = line('.')
  let l:max_line = line('$')

  " 空のバッファチェック（念のため）
  if l:max_line < 1
    return []
  endif

  " 固定座標の計算（カーソル行 - 3, カーソル行, カーソル行 + 3）
  let l:offsets = [-3, 0, 3]
  let l:positions = []

  for l:offset in l:offsets
    let l:target_line = l:cursor_line + l:offset

    " バッファの範囲内にクランプ
    " 最小値: 1, 最大値: line('$')
    if l:target_line < 1
      let l:target_line = 1
    elseif l:target_line > l:max_line
      let l:target_line = l:max_line
    endif

    " 座標を追加（col は常に 1 = 行頭）
    call add(l:positions, {'lnum': l:target_line, 'col': 1})
  endfor

  return l:positions
endfunction

" hellshake_yano_vim#core#show() - 統合実行関数（ヒント表示）
"
" 目的:
"   - 画面内単語検出、ヒント生成、ヒント表示、ヒントマップ作成、入力処理開始の
"     一連の流れを統合実行
"   - Process7 統合テストで検証される全体フロー
"
" 処理フロー:
"   1. 画面内単語検出（word_detector#detect_visible）
"   2. Phase A-3制限: 最大49個まで
"   3. ヒント生成（hint_generator#generate）
"   4. ヒント表示（display#show_hint）
"   5. ヒントマップ作成（ヒントと位置の対応付け）
"   6. 状態の更新（hints_visible = true）
"   7. 入力処理開始（input#start - タイマー方式、複数文字対応）
"
" パフォーマンス最適化:
"   - 単語検出は画面内のみ（line('w0') ～ line('w$')）に限定
"   - Phase A-3制限により最大49個の単語のみ処理（配列スライスで高速）
"   - 座標データ変換は単純なループで実装（オーバーヘッド最小化）
"   - 状態更新は一括で実行（複数回の代入を避ける）
"
" エラーハンドリング:
"   - 単語が検出できない場合は処理を中断
"   - ヒント生成に失敗した場合は処理を中断
"
" @return なし
"
" 使用例:
"   :call hellshake_yano_vim#core#show()
"
" 注意事項:
"   - Phase A-3: 画面内の単語を自動検出してヒントを表示
"   - 最大49個の単語にヒント（a-l, aa-ll）を表示
if !exists('g:hellshake_yano_debug_directional')
  let g:hellshake_yano_debug_directional = 0
endif

function s:directional_log(msg) abort
  if get(g:, 'hellshake_yano_debug_directional', 0)
    echom '[hellshake directional] ' . a:msg
  endif
endfunction

function s:ensure_internal_state() abort
  if !exists('g:hellshake_yano_internal') || type(g:hellshake_yano_internal) != v:t_dict
    let g:hellshake_yano_internal = {}
  endif
endfunction

function s:consume_directional_context() abort
  call s:ensure_internal_state()
  let l:config = get(g:, 'hellshake_yano', {})
  let l:flag = get(l:config, 'directionalHintFilter', get(l:config, 'directional_hint_filter', 0))
  if !l:flag
    let g:hellshake_yano_internal.directional_last_motion_key = ''
    return 'none'
  endif
  let l:key = get(g:hellshake_yano_internal, 'directional_last_motion_key', '')
  let g:hellshake_yano_internal.directional_last_motion_key = ''
  if empty(l:key)
    return 'none'
  endif
  let l:lower = tolower(l:key)
  if l:lower ==# 'j'
    return 'down'
  endif
  if l:lower ==# 'k'
    return 'up'
  endif
  return 'none'
endfunction

function! hellshake_yano_vim#core#show_with_motion(motion_key) abort
  call s:ensure_internal_state()
  let g:hellshake_yano_internal.directional_last_motion_key = a:motion_key
  call s:directional_log('show_with_motion queued key=' . a:motion_key)
  return hellshake_yano_vim#core#show()
endfunction

function! hellshake_yano_vim#core#show_with_motion_timer(timer) abort
  call s:directional_log('timer fired (key already queued)')
  return hellshake_yano_vim#core#show()
endfunction

function! hellshake_yano_vim#core#show() abort
  echom '[HY-DEBUG] show() called at ' . strftime('%H:%M:%S') . ', focus_just_restored = ' . s:focus_just_restored

  " Focus Restore Feature: フォーカス復帰直後は遅延実行
  " lazygit等の外部ツールから復帰直後は画面が不安定なため、遅延してから表示
  if s:focus_just_restored
    let l:delay_ms = hellshake_yano_vim#config#get('multiWindowRestoreDelay')
    echom '[HY-DEBUG] Delaying show() by ' . l:delay_ms . 'ms due to focus_just_restored'
    " フラグをクリアして無限ループを防止
    let s:focus_just_restored = v:false
    echom '[HY-DEBUG] focus_just_restored = false (cleared before delay)'
    call timer_start(l:delay_ms, {-> hellshake_yano_vim#core#show()})
    return
  endif

  " Process 5: マルチウィンドウモード対応
  " multiWindowMode が true の場合は複数ウィンドウにヒントを表示
  let l:multi_window_mode = hellshake_yano_vim#config#get('multiWindowMode')

  " 1. 画面内の単語を検出
  " マルチウィンドウモードの場合は window_detector と detect_multi_window を使用
  " Process 200: シングルウィンドウ最適化 - ウィンドウ1つの場合は detect_visible() に切り替え
  if l:multi_window_mode
    let l:windows = hellshake_yano_vim#window_detector#get_visible()
    if empty(l:windows)
      call s:show_warning('no visible windows found')
      return
    endif
    " 最適化: ウィンドウが1つの場合はシングルウィンドウ処理に切り替え
    " これにより不要な winid 付与と screenpos(winid, ...) 呼び出しを回避
    if len(l:windows) == 1
      let l:detected_words = hellshake_yano_vim#word_detector#detect_visible()
      let l:multi_window_mode = v:false  " 後続処理でシングルモードとして扱う
    else
      let l:detected_words = hellshake_yano_vim#word_detector#detect_multi_window(l:windows)
    endif
  else
    let l:detected_words = hellshake_yano_vim#word_detector#detect_visible()
  endif

  " Phase D-1 Sub2.2: 動的maxTotal対応
  " 49個の固定制限を削除し、hint_generator の動的計算に委ねる
  " hint_generator.generate() が適切な数のヒントを返すため、
  " ここでは制限を設けない
  " （以前の実装: if len(l:detected_words) > 49 で49個に制限）

  " Phase D-2 Sub0.1: フィルタリング層の堅牢性向上（準備）
  " Phase D-2 Sub2: Per-Key最小単語長でのフィルタリング
  " - word_filter#apply() を使用して最小単語長でフィルタリング
  " - デフォルト最小単語長を使用（モーションキー別はmotion.vimで適用）
  " - original_index保持でヒント位置のずれを防ぐ

  if empty(l:detected_words)
    call s:show_warning('no words detected')
    return
  endif

  " 最小単語長を取得（デフォルト値）
  " Note: core#show() は <Leader>h 経由で呼ばれるため、
  " モーションキーのコンテキストがない。デフォルト値を使用する。
  let l:min_word_length = hellshake_yano_vim#word_detector#get_min_length('')

  " word_detector の戻り値形式を word_filter#apply() に合わせる
  " detect_visible() は {'text': ..., 'lnum': ..., 'col': ..., 'end_col': ...}
  " detect_multi_window() は {'text': ..., 'lnum': ..., 'col': ..., 'winid': ...}
  " word_filter#apply() は {'word': ..., 'lnum': ..., 'col': ...} を期待
  let l:words_for_filter = []
  for l:word in l:detected_words
    let l:filter_word = {
      \ 'word': l:word.text,
      \ 'lnum': l:word.lnum,
      \ 'col': l:word.col
      \ }
    " マルチウィンドウモードの場合は winid を保持
    if l:multi_window_mode && has_key(l:word, 'winid')
      let l:filter_word.winid = l:word.winid
    endif
    call add(l:words_for_filter, l:filter_word)
  endfor

  " フィルタリング適用
  let l:filtered_words = hellshake_yano_vim#word_filter#apply(l:words_for_filter, l:min_word_length)

  " フィルタリング後の空配列チェック
  if empty(l:filtered_words)
    call s:show_warning('no words match minimum length criteria')
    return
  endif

  " 単語データから座標データに変換（winidも保持）
  let l:positions = []
  for l:word in l:filtered_words
    let l:pos = {'lnum': l:word.lnum, 'col': l:word.col}
    if l:multi_window_mode && has_key(l:word, 'winid')
      let l:pos.winid = l:word.winid
    endif
    call add(l:positions, l:pos)
  endfor

  " エラーチェック: 座標が取得できない場合は中断
  if empty(l:positions)
    call s:show_warning('no positions found')
    return
  endif

  let l:direction = s:consume_directional_context()
  call s:directional_log('consume_direction=' . l:direction . ' total_words=' . len(l:positions))
  if l:direction !=# 'none'
    let l:cursor = {'lnum': line('.'), 'col': col('.')}
    let l:positions = hellshake_yano_vim#filter#by_direction(l:positions, l:cursor, l:direction)
    call s:directional_log('filtered_words=' . len(l:positions) . ' cursor=' . l:cursor.lnum . ':' . l:cursor.col)
    if empty(l:positions)
      call s:directional_log('filtered result empty -> abort')
      return
    endif
  endif

  " 2. ヒント生成
  let l:count = len(l:positions)
  let l:hints = hellshake_yano_vim#hint_generator#generate(l:count)

  " エラーチェック: ヒント生成に失敗した場合は中断
  if empty(l:hints)
    call s:show_warning('failed to generate hints')
    return
  endif

  " 安全性チェック: positions数がhints数を超える場合は制限
  " hint_generatorには最大ヒント数の制限があるため、
  " 大量の単語が検出された場合にインデックスエラーを防ぐ
  if len(l:hints) < len(l:positions)
    " positionsをヒント数に制限（警告メッセージなし）
    let l:positions = l:positions[0 : len(l:hints) - 1]
  endif

  " 3. ヒント表示とヒントマップ作成
  let l:hint_map = {}
  let l:popup_ids = []
  let l:words = []

  for l:i in range(len(l:positions))
    let l:pos = l:positions[l:i]
    let l:hint = l:hints[l:i]

    " ヒント表示（マルチウィンドウモード対応）
    if l:multi_window_mode && has_key(l:pos, 'winid')
      let l:popup_id = hellshake_yano_vim#display#show_hint_with_window(
            \ l:pos.winid, l:pos.lnum, l:pos.col, l:hint)
    else
      let l:popup_id = hellshake_yano_vim#display#show_hint(l:pos.lnum, l:pos.col, l:hint)
    endif
    call add(l:popup_ids, l:popup_id)

    " ヒントマップに追加（ヒント文字 → 座標、マルチウィンドウモードではwinidも含む）
    let l:hint_entry = {'lnum': l:pos.lnum, 'col': l:pos.col}
    if l:multi_window_mode && has_key(l:pos, 'winid')
      let l:hint_entry.winid = l:pos.winid
    endif
    let l:hint_map[l:hint] = l:hint_entry

    " words に追加（テスト用に座標とヒントをまとめたデータ）
    let l:word_entry = {
      \ 'lnum': l:pos.lnum,
      \ 'col': l:pos.col,
      \ 'hint': l:hint,
      \ 'popup_id': l:popup_id
    \ }
    if l:multi_window_mode && has_key(l:pos, 'winid')
      let l:word_entry.winid = l:pos.winid
    endif
    call add(l:words, l:word_entry)
  endfor

  " 4. 状態の更新
  let s:state.words = l:words
  let s:state.hints = l:hints
  let s:state.hint_map = l:hint_map
  let s:state.popup_ids = l:popup_ids
  let s:state.hints_visible = v:true

  " 画面を再描画してヒントが確実に表示されるようにする
  " Focus Restore Feature: フォーカス復帰直後は redraw をスキップ（ちらつき防止）
  if hellshake_yano_vim#core#should_redraw()
    redraw
  endif

  " 5. 入力処理開始（ブロッキング方式、複数文字対応）
  " wait_for_input() を使用することで、Vimの通常キーバインドより先に入力をキャプチャ
  call hellshake_yano_vim#input#wait_for_input(l:hint_map)
endfunction

" hellshake_yano_vim#core#hide() - クリーンアップ関数（ヒント非表示）
"
" 目的:
"   - 表示中のヒントを全て削除し、状態をリセット
"   - 入力処理を停止
"
" 処理フロー:
"   1. 入力処理停止（input#stop）
"   2. 全 popup 削除（display#hide_all）
"   3. 状態リセット（words, hints, hint_map, popup_ids をクリア）
"   4. 状態の更新（hints_visible = false）
"
" @return なし
"
" 使用例:
"   :call hellshake_yano_vim#core#hide()
"
" 注意事項:
"   - ヒントが表示されていない状態で呼び出しても安全
"   - 複数回呼び出しても問題ない（冪等性）
function! hellshake_yano_vim#core#hide() abort
  " 1. 入力処理停止
  call hellshake_yano_vim#input#stop()

  " 2. 全 popup 削除
  call hellshake_yano_vim#display#hide_all()

  " 3. 状態リセット
  let s:state.words = []
  let s:state.hints = []
  let s:state.hint_map = {}
  let s:state.popup_ids = []
  let s:state.input_timer = 0

  " 4. 状態の更新
  let s:state.hints_visible = v:false
endfunction

" ===========================
" 内部ヘルパー関数
" ===========================

" s:show_warning(message) - 警告メッセージを表示
"
" Process 101 Refactor: util.vim の共通関数を使用
"
" @param message String 警告メッセージ
function! s:show_warning(message) abort
  call hellshake_yano_vim#util#show_warning('core', a:message)
endfunction

let &cpo = s:save_cpo
unlet s:save_cpo
