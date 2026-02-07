" autoload/hellshake_yano_vim/motion.vim - モーション連打検出
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: GREEN
" Process1: motion.vim の実装
" Phase D-6 Process50 Sub2: キーリピート検出ロジックの追加
" Phase D-7 Process2: 数値プレフィックス付きモーション対応（<expr>マッピング方式）
"
" このモジュールは w/b/e モーションの連打を検出し、
" 自動的にヒント表示をトリガーする機能を提供します。
" Phase A-4: モーション連打検出機能の実装。
" Phase D-6: キーリピート抑制機能の追加。
" Phase D-7: 数値プレフィックス（5j, 3wなど）の正しい処理を実装。
" Vim 8.0+ と Neovim の両方で動作します。

" スクリプトローカル変数の定義
let s:save_cpo = &cpo
set cpo&vim

" ============================================================================
" Phase D-6 Process50 Sub2: キーリピート検出ロジック
" ============================================================================

" s:get_key_repeat_config() - キーリピート設定の取得
"
" 目的:
"   - g:hellshake_yano からキーリピート抑制機能の設定を取得
"   - デフォルト値を提供
"
" @return Dictionary キーリピート設定
"   - enabled: 機能の有効/無効 (デフォルト: v:true)
"   - threshold: リピート判定の閾値（ミリ秒）(デフォルト: 50)
"   - reset_delay: リセット遅延時間（ミリ秒）(デフォルト: 300)
"
" 使用例:
"   let l:config = s:get_key_repeat_config()
"   if l:config.enabled
"     " キーリピート抑制が有効
"   endif
function! s:get_key_repeat_config() abort
  return {
        \ 'enabled': get(get(g:, 'hellshake_yano', {}), 'suppressOnKeyRepeat', v:true),
        \ 'threshold': get(get(g:, 'hellshake_yano', {}), 'keyRepeatThreshold', 50),
        \ 'reset_delay': get(get(g:, 'hellshake_yano', {}), 'keyRepeatResetDelay', 300)
        \ }
endfunction

" s:handle_key_repeat_detection(bufnr, current_time, config) - キーリピート検出処理
"
" 目的:
"   - 高速なキーリピートを検出し、ヒント表示をスキップ
"   - Neovim側の実装（autoload/hellshake_yano/motion.vim:23-50）を参考
"
" アルゴリズム:
"   1. 機能が無効の場合は通常処理（キー時刻のみ更新）
"   2. 前回のキー入力時刻との差を計算
"   3. 閾値未満 && 初回でない → リピート状態に設定
"   4. リセットタイマーを設定
"   5. キー時刻を更新
"   6. リピート検出の結果を返す
"
" パラメータ:
"   @param a:bufnr Number バッファ番号
"   @param a:current_time Number 現在時刻（ミリ秒）
"   @param a:config Dictionary キーリピート設定
"
" @return Boolean リピート検出された場合はv:true、通常処理の場合はv:false
"
" 使用例:
"   let l:bufnr = bufnr('%')
"   let l:current_time = float2nr(reltimefloat(reltime()) * 1000.0)
"   let l:config = s:get_key_repeat_config()
"   if s:handle_key_repeat_detection(l:bufnr, l:current_time, l:config)
"     " キーリピート検出 - ヒント表示をスキップ
"     return
"   endif
function! s:handle_key_repeat_detection(bufnr, current_time, config) abort
  " 機能が無効の場合は通常処理
  if !a:config.enabled
    call hellshake_yano_vim#key_repeat#set_last_key_time(a:bufnr, a:current_time)
    return v:false
  endif

  " 前回のキー入力時刻との差を計算
  let l:last_key_time = hellshake_yano_vim#key_repeat#get_last_key_time(a:bufnr)
  let l:time_diff = a:current_time - l:last_key_time

  " キーリピート判定（初回キー入力は除外、2回目以降で判定）
  if l:time_diff < a:config.threshold && l:last_key_time > 0
    " リピート状態に設定
    call hellshake_yano_vim#key_repeat#set_repeating(a:bufnr, v:true)

    " 既存のリピート終了タイマーをクリアして新しく設定
    call hellshake_yano_vim#key_repeat#set_reset_timer(a:bufnr, a:config.reset_delay)

    " キー時刻更新してヒント表示をスキップ
    call hellshake_yano_vim#key_repeat#set_last_key_time(a:bufnr, a:current_time)
    return v:true
  endif

  " 通常処理: キー時刻を更新
  call hellshake_yano_vim#key_repeat#set_last_key_time(a:bufnr, a:current_time)
  return v:false
endfunction

" ============================================================================
" Phase 3.1: Denops統合
" ============================================================================

" hellshake_yano_vim#motion#has_denops() - Denops利用可能性チェック
"
" @return Boolean Denopsが利用可能な場合v:true
function! hellshake_yano_vim#motion#has_denops() abort
  if !exists('*denops#plugin#is_loaded')
    return v:false
  endif
  try
    return denops#plugin#is_loaded('hellshake-yano') ? v:true : v:false
  catch
    return v:false
  endtry
endfunction

" ============================================================================
" 既存のモーション連打検出機能
" ============================================================================

" モーション状態管理
" PLAN.md の仕様に基づくデータ構造
let s:motion_state = {
  \ 'last_motion': '',
  \ 'last_motion_time': [],
  \ 'motion_count': 0,
  \ 'timeout_ms': 2000,
  \ 'threshold': 2
\ }

" hellshake_yano_vim#motion#init() - 状態変数の初期化
"
" 目的:
"   - s:motion_state を初期値にリセット
"   - プラグインの起動時や再初期化時に呼び出される
"
" @return なし
"
" 使用例:
"   call hellshake_yano_vim#motion#init()
function! hellshake_yano_vim#motion#init() abort
  let s:motion_state = {
    \ 'last_motion': '',
    \ 'last_motion_time': [],
    \ 'motion_count': 0,
    \ 'timeout_ms': 2000,
    \ 'threshold': 2
  \ }
endfunction

" hellshake_yano_vim#motion#get_state() - 状態変数の取得（テスト用）
"
" 目的:
"   - スクリプトローカル変数 s:motion_state への読み取り専用アクセスを提供
"   - 主にユニットテストで状態を検証するために使用
"
" @return Dictionary s:motion_state のコピー
"
" 使用例:
"   let l:state = hellshake_yano_vim#motion#get_state()
"   echo l:state.motion_count
function! hellshake_yano_vim#motion#get_state() abort
  return deepcopy(s:motion_state)
endfunction

" hellshake_yano_vim#motion#set_threshold(count) - 閾値の設定
"
" 目的:
"   - ヒント表示トリガーの閾値を設定
"   - デフォルトは2回（2回連打でヒント表示）
"
" パラメータ:
"   @param a:count Number 閾値（1以上の整数）
"
" @return なし
"
" 使用例:
"   call hellshake_yano_vim#motion#set_threshold(3)
"   " 3回連打でヒント表示されるようになる
function! hellshake_yano_vim#motion#set_threshold(count) abort
  let s:motion_state.threshold = a:count
endfunction

" hellshake_yano_vim#motion#set_timeout(ms) - タイムアウトの設定
"
" 目的:
"   - モーション連打のタイムアウト時間を設定
"   - デフォルトは2000ms（2秒）
"
" パラメータ:
"   @param a:ms Number タイムアウト時間（ミリ秒）
"
" @return なし
"
" 使用例:
"   call hellshake_yano_vim#motion#set_timeout(1500)
"   " 1.5秒以内に連打する必要がある
function! hellshake_yano_vim#motion#set_timeout(ms) abort
  let s:motion_state.timeout_ms = a:ms
endfunction

" hellshake_yano_vim#motion#get_motion_count(key) - キー別モーションカウントの取得
"
" 目的:
"   - Phase D-2 Sub1: Per-Keyモーションカウント機能
"   - g:hellshake_yano.perKeyMotionCount からキー別のカウントを取得
"   - 設定がない場合は defaultMotionCount にフォールバック
"
" @param key String モーションキー ('w', 'b', 'e', 'h', 'j', 'k', 'l' など)
" @return Number モーションカウント（閾値）
"
" Phase D-2 Sub1.1: h/j/k/l モーション対応
"
" 使用例:
"   let l:count = hellshake_yano_vim#motion#get_motion_count('w')
"   " => 2 (perKeyMotionCount.w の値) or 3 (defaultMotionCount)
function! hellshake_yano_vim#motion#get_motion_count(key) abort
  " デフォルト値
  let l:default_count = 3

  " g:hellshake_yano から設定を読み込む
  if !exists('g:hellshake_yano')
    return l:default_count
  endif

  " defaultMotionCount の取得
  if has_key(g:hellshake_yano, 'defaultMotionCount')
    let l:default_count = g:hellshake_yano.defaultMotionCount
  endif

  " perKeyMotionCount の取得
  if has_key(g:hellshake_yano, 'perKeyMotionCount')
    let l:per_key = g:hellshake_yano.perKeyMotionCount
    if type(l:per_key) == v:t_dict && has_key(l:per_key, a:key)
      return l:per_key[a:key]
    endif
  endif

  " デフォルトを返す
  return l:default_count
endfunction

" hellshake_yano_vim#motion#handle(motion_key) - モーション処理のメインロジック
"
" 目的:
"   - モーションキー（w/b/e/h/j/k/l）の連打を検出
"   - 閾値に達した場合はヒント表示をトリガー
"   - Phase D-6 Process50 Sub3: キーリピート抑制機能の統合
"   - 通常のモーション実行も行う
"
" アルゴリズム:
"   0. Phase D-6: キーリピート検出（高速連打時はヒント表示をスキップ）
"   1. 現在時刻を取得（reltime()）
"   2. 前回のモーションとの時間差をチェック
"   3. タイムアウト内 && 同じモーション → カウント++
"   4. タイムアウト外 || 異なるモーション → カウント=1にリセット
"   5. カウントが閾値以上 → ヒント表示トリガー & カウントリセット
"   6. 通常モーション実行（ヒント表示しない場合）
"   7. 現在時刻と現在モーションを記録
"
" パラメータ:
"   @param a:motion_key String モーションキー ('w', 'b', 'e', 'h', 'j', 'k', 'l')
"
" @return なし
"
" 使用例:
"   nnoremap <silent> w :<C-u>call hellshake_yano_vim#motion#handle('w')<CR>
"
" エラーハンドリング:
"   - 不正なモーションキーの場合はエラーメッセージを表示
"   - reltime() のエラーは try-catch で処理
"
" パフォーマンス特性:
"   - reltime() と reltimefloat() を使用（高精度な時間計測）
"   - 状態更新は最小限の操作で実行
"
" 注意事項:
"   - ヒント表示はブロッキング方式（Phase A-3で確立）
"   - ヒント表示後はカウントをリセット（連続表示を防ぐ）
"   - Phase D-6: 高速キーリピート時はヒント表示をスキップ
" hellshake_yano_vim#motion#handle_with_count(motion_key, count)
"
" 目的:
"   - 数値プレフィックス付きモーション（例: 5j, 3w）を正しく処理
"   - カウント値を受け取ってモーション実行時に使用
"   - Phase D-7 Process2 Sub2: <expr>マッピング方式への対応
"
" 背景:
"   - 従来の:<C-u>call handle()方式では、<C-u>がカウントプレフィックスをクリア
"   - 5jを入力しても1jと同じ動作になる問題があった
"   - <expr>マッピングでv:count1を取得し、この関数に渡すことで解決
"
" パラメータ:
"   @param a:motion_key String モーションキー ('w', 'b', 'e', 'h', 'j', 'k', 'l')
"   @param a:count Number カウント値（v:count1から取得、1以上）
"
" @return なし
"
" 使用例:
"   nnoremap <silent> <expr> j hellshake_yano_vim#motion#handle_expr('j')
"   " ユーザーが5jを入力:
"   "   → handle_expr()でv:count1=5を取得
"   "   → handle_with_count('j', 5)が呼ばれる
"   "   → 'normal! 5j'を実行（5行下に移動）
"
" 処理フロー:
"   0. Phase D-6: キーリピート検出（高速連打時はヒント表示をスキップ）
"   1. 現在時刻を取得（reltime()）
"   2. 前回のモーションとの時間差をチェック
"   3. タイムアウト内 && 同じモーション → カウント++
"   4. タイムアウト外 || 異なるモーション → カウント=1にリセット
"   5. カウントが閾値以上 → ヒント表示トリガー & カウントリセット
"   6. カウント付きモーション実行（例: 'normal! 5j'）
"   7. 現在時刻と現在モーションを記録
"
" エラーハンドリング:
"   - 不正なモーションキーの場合はエラーメッセージを表示
"   - reltime() のエラーは try-catch で処理
"   - エラー時は状態をリセット（init()呼び出し）
"
" 注意事項:
"   - ヒント表示はブロッキング方式（Phase A-3で確立）
"   - ヒント表示後はカウントをリセット（連続表示を防ぐ）
"   - Phase D-7 Process2: カウント値を'normal!'コマンドに含める
"
function! hellshake_yano_vim#motion#handle_with_count(motion_key, count) abort
  " Phase 3.1: Denops優先パス
  if hellshake_yano_vim#motion#has_denops()
    try
      " キーリピート設定を取得
      let l:key_repeat_config = s:get_key_repeat_config()

      " Denops APIで検出処理
      let l:result = denops#request('hellshake-yano', 'motionDetect',
        \ [a:motion_key, a:count, l:key_repeat_config])

      " 型チェック（Denopsからの戻り値検証）
      if type(l:result) == v:t_dict && has_key(l:result, 'shouldShowHints')
        " モーション実行
        execute 'normal! ' . a:count . a:motion_key

        " ヒント表示判定
        if l:result.shouldShowHints
          " redraw でカーソル位置を画面に反映
          redraw

          " ヒント表示
          if exists('*hellshake_yano_vim#core#show')
            call hellshake_yano_vim#core#show()
          endif
        endif

        return
      endif
    catch
      " Denopsエラー時はフォールバック
    endtry
  endif

  " フォールバック: ローカル実装（既存コードそのまま）
  " 不正なモーションキーのチェック
  " Phase D-2 Sub1.1: h/j/k/l モーション対応
  " Process 101 Refactor: util.vim の共通関数を使用
  if index(['w', 'b', 'e', 'h', 'j', 'k', 'l'], a:motion_key) == -1
    call hellshake_yano_vim#util#show_error('motion', 'handle_with_count: invalid motion key: ' . a:motion_key)
    return
  endif

  try
    " Phase D-7 Process3+: 数字プレフィックス付きモーションの場合
    " 意図的な移動（例: 5j, 3w）なのでヒント表示をスキップし、状態をリセット
    if a:count > 1
      " モーション実行のみ（ヒント表示なし）
      execute 'normal! ' . a:count . a:motion_key
      " 状態をリセット（次のjjjから再度カウント開始）
      let s:motion_state.motion_count = 0
      let s:motion_state.last_motion = ''
      let s:motion_state.last_motion_time = 0
      return
    endif

    " Phase D-6 Process50 Sub3: キーリピート検出
    " 0. 現在時刻を取得（ミリ秒単位）
    let l:current_time_ms = float2nr(reltimefloat(reltime()) * 1000.0)
    let l:bufnr = bufnr('%')

    " キーリピート設定を取得
    let l:key_repeat_config = s:get_key_repeat_config()

    " キーリピート検出処理
    let l:is_key_repeat = s:handle_key_repeat_detection(l:bufnr, l:current_time_ms, l:key_repeat_config)
    if l:is_key_repeat
      " リピート中の場合は通常のモーション実行のみ（ヒント表示をスキップ）
      " Phase D-7 Process2: カウント付きモーション実行
      execute 'normal! ' . a:count . a:motion_key
      " Phase D-7 Process2 Sub2: キーリピート中も状態を更新（後方互換性維持のため）
      let s:motion_state.last_motion = a:motion_key
      let s:motion_state.last_motion_time = reltime()
      return
    endif

    " 1. 現在時刻を取得（既存のモーション検出用）
    let l:current_time = reltime()

    " 2. 前回のモーションとの時間差をチェック
    let l:should_reset = v:false
    let l:time_diff_ms = 0

    " last_motion_time が初期化されているかチェック（0 ではなくリストかどうか）
    if type(s:motion_state.last_motion_time) == type([])
      " 時間差を計算（ミリ秒）
      let l:time_diff = reltimefloat(reltime(s:motion_state.last_motion_time, l:current_time))
      let l:time_diff_ms = float2nr(l:time_diff * 1000.0)

      " タイムアウトチェック
      if l:time_diff_ms > s:motion_state.timeout_ms
        let l:should_reset = v:true
      endif
    endif

    " 3. 異なるモーションの場合もリセット
    if s:motion_state.last_motion != '' && s:motion_state.last_motion != a:motion_key
      let l:should_reset = v:true
    endif

    " 4. カウントの更新
    if l:should_reset || s:motion_state.motion_count == 0
      " リセット
      let s:motion_state.motion_count = 1
    else
      " 同じモーションをタイムアウト内に実行 → カウント++
      let s:motion_state.motion_count += 1
    endif

    " 5. 閾値チェックとヒント表示トリガー
    " Phase D-2 Sub1: キー別のモーションカウントを使用
    let l:threshold = hellshake_yano_vim#motion#get_motion_count(a:motion_key)
    let l:should_trigger_hint = v:false
    if s:motion_state.motion_count >= l:threshold
      let l:should_trigger_hint = v:true
      " カウントをリセット（連続表示を防ぐ）
      let s:motion_state.motion_count = 0
    endif

    " 6. 通常モーション実行（ヒント表示の前に実行）
    " Phase D-7 Process2: カウント付きモーション実行
    execute 'normal! ' . a:count . a:motion_key

    " Phase D-2 Sub1.1: カーソル位置を画面に反映してからヒント表示
    " ヒント表示前に画面を更新し、カーソルの移動を視覚的に確認できるようにする
    if hellshake_yano_vim#core#should_redraw()
      redraw
    endif

    " 7. ヒント表示トリガー（閾値に達した場合）
    if l:should_trigger_hint
      " core#show() を呼び出してヒント表示
      " ブロッキング方式なので、ヒント入力が完了するまで制御は戻らない
      call hellshake_yano_vim#core#show_with_motion(a:motion_key)
    endif

    " 8. 現在時刻と現在モーションを記録
    let s:motion_state.last_motion = a:motion_key
    let s:motion_state.last_motion_time = l:current_time

  catch
    " エラーハンドリング（Process 101 Refactor: util.vim使用）
    call hellshake_yano_vim#util#show_error('motion', 'handle_with_count: error occurred: ' . v:exception)

    " エラー時は状態をリセット
    call hellshake_yano_vim#motion#init()
  endtry
endfunction

" hellshake_yano_vim#motion#handle(motion_key) - 後方互換ラッパー
"
" 目的:
"   - 既存のコードとの後方互換性を維持
"   - handle_with_count()にカウント1を渡して呼び出す
"   - Phase D-7 Process2 Sub3: 後方互換維持
"
" パラメータ:
"   @param a:motion_key String モーションキー ('w', 'b', 'e', 'h', 'j', 'k', 'l')
"
function! hellshake_yano_vim#motion#handle(motion_key) abort
  call hellshake_yano_vim#motion#handle_with_count(a:motion_key, 1)
endfunction

" hellshake_yano_vim#motion#handle_expr(motion_key) - Normal Mode用<expr>マッピング
"
" 【非推奨】autoload遅延読み込みによるv:count消失問題のため、この関数は使用されなくなりました。
" 現在はplugin/hellshake-yano-vim.vimで直接<expr>マッピングを実装しています。
" 後方互換性のために残されていますが、新しいコードでは使用しないでください。
"
" 目的:
"   - 数値プレフィックス付きモーション（例: 5j, 3w）を正しく処理
"   - v:count1でカウント値を取得し、handle_with_count()に渡す
"   - Phase D-7 Process2 Sub1: <expr>マッピング方式への対応
"   - Phase D-7 Process3 Sub1: Normal modeマッピングの<expr>化
"   - Phase D-7 Process3 Sub1 (修正): autoload遅延読み込み問題により非推奨化
"
" パラメータ:
"   @param a:motion_key String モーションキー ('w', 'b', 'e', 'h', 'j', 'k', 'l')
"
" @return String コマンド文字列（:call handle_with_count()を実行）
"
" 使用例:
"   nnoremap <silent> <expr> j hellshake_yano_vim#motion#handle_expr('j')
"   " ユーザーが5jを入力 → v:count1が5 → handle_with_count('j', 5)が呼ばれる
"
" 動作フロー:
"   1. v:count1でカウント値取得（未指定時は1）
"   2. <C-u>でコマンドラインのカウントプレフィックスをクリア
"   3. handle_with_count(motion_key, count)を呼び出すコマンド文字列を返す
"
" 問題点:
"   - 最初の呼び出し時にautoloadファイルが読み込まれる
"   - その際にv:countが失われ、常に1になる
"   - 結果として5jが1jとして実行される
"   - plugin/で直接マッピングを実装することで解決
"
function! hellshake_yano_vim#motion#handle_expr(motion_key) abort
  " v:count1を取得（ユーザーが入力した数値プレフィックス、なければ1）
  let l:count = v:count1
  " <C-u>でカウントプレフィックスをクリアしてから、handle_with_count()を呼び出す
  return printf(":\<C-u>call hellshake_yano_vim#motion#handle_with_count(%s, %d)\<CR>",
        \ string(a:motion_key), l:count)
endfunction

" hellshake_yano_vim#motion#handle_visual_expr(motion_key) - Visual Mode用<expr>マッピング
"
" 【非推奨】autoload遅延読み込みによるv:count消失問題のため、この関数は使用されなくなりました。
" 現在はplugin/hellshake-yano-vim.vimでtimer_start()を使った直接実装に変更されています。
" 後方互換性のために残されていますが、新しいコードでは使用しないでください。
"
" 目的:
"   - Visual modeを維持したままモーション検出を実行
"   - 数値プレフィックス付きモーション（例: v5j）を正しく処理
"   - <expr>マッピング用のラッパー関数
"   - カウント付きモーションキーを返すことでVisual modeの選択範囲が拡張
"
" Phase D-2 Sub1.2: Visual Modeモーション検出（修正版）
" Phase D-7 Process3 Sub2: Visual modeカウント対応
" Phase D-7 Process3 Sub2 (修正): autoload遅延読み込み問題により非推奨化
"
" パラメータ:
"   @param a:motion_key String モーションキー ('w', 'b', 'e', 'h', 'j', 'k', 'l')
"
" @return String カウント付きモーションキー（Visual mode維持と範囲拡張）
"
" 使用例:
"   xnoremap <silent> <expr> w hellshake_yano_vim#motion#handle_visual_expr('w')
"   " ユーザーがv5jを入力 → v:count1が5 → '5j'を返す → 5行選択範囲拡張
"
" 動作フロー:
"   1. v:count1でカウント値取得（未指定時は1）
"   2. handle_visual_internal()でモーション検出処理を実行
"   3. カウント > 1の場合は"5j"形式、カウント = 1の場合は"j"のみを返す
"   4. 返されたモーションキーがVisual modeで実行され、選択範囲が拡張される
"
" 問題点:
"   - 最初の呼び出し時にautoloadファイルが読み込まれる
"   - その際にv:countが失われる可能性がある
"   - plugin/でtimer_start()を使った直接実装により解決
"
function! hellshake_yano_vim#motion#handle_visual_expr(motion_key) abort
  " モーション検出処理を実行（非同期的に）
  call hellshake_yano_vim#motion#handle_visual_internal(a:motion_key)

  " v:count1 はユーザー入力時点で既に適用されるためキーのみ返す
  return a:motion_key
endfunction

function! hellshake_yano_vim#motion#visual_schedule(motion_key) abort
  call hellshake_yano_vim#motion#handle_visual_internal(a:motion_key)
  " カウントはVim側が再利用するので追加入力を返さない
  return a:motion_key
endfunction

" hellshake_yano_vim#motion#handle_visual_internal(motion_key) - Visual Modeモーション処理（内部実装）
"
" 目的:
"   - Visual mode（v/V/Ctrl-v）でのモーションキー連打を検出
"   - 閾値に達した場合はvisual#show()を呼び出してヒント表示
"   - 選択範囲を維持しながらモーション処理を実行
"
" Phase D-2 Sub1.2: Visual Modeモーション検出
"
" アルゴリズム:
"   1. 現在時刻を取得（reltime()）
"   2. 前回のモーションとの時間差をチェック
"   3. タイムアウト内 && 同じモーション → カウント++
"   4. タイムアウト外 || 異なるモーション → カウント=1にリセット
"   5. カウントが閾値以上 → ヒント表示トリガー & カウントリセット
"   6. redrawでカーソル反映
"   7. 閾値到達時にvisual#show()呼び出し
"   8. 現在時刻と現在モーションを記録
"
" パラメータ:
"   @param a:motion_key String モーションキー ('w', 'b', 'e', 'h', 'j', 'k', 'l')
"
" @return なし
"
" 使用例:
"   call hellshake_yano_vim#motion#handle_visual_internal('w')
"
" エラーハンドリング:
"   - 不正なモーションキーの場合はエラーメッセージを表示
"   - reltime() のエラーは try-catch で処理
"
" パフォーマンス特性:
"   - reltime() と reltimefloat() を使用（高精度な時間計測）
"   - 状態更新は最小限の操作で実行
"
" 注意事項:
"   - ヒント表示はブロッキング方式（Phase A-3で確立）
"   - ヒント表示後はカウントをリセット（連続表示を防ぐ）
"   - Visual modeの選択範囲は自動的に維持される（<expr>マッピング経由）
function! hellshake_yano_vim#motion#handle_visual_internal(motion_key) abort
  " 不正なモーションキーのチェック
  " Phase D-2 Sub1.2: Visual Modeモーション対応
  " Process 101 Refactor: util.vim の共通関数を使用
  if index(['w', 'b', 'e', 'h', 'j', 'k', 'l'], a:motion_key) == -1
    call hellshake_yano_vim#util#show_error('motion', 'handle_visual: invalid motion key: ' . a:motion_key)
    return
  endif

  try
    " 1. 現在時刻を取得
    let l:current_time = reltime()

    " 2. 前回のモーションとの時間差をチェック
    let l:should_reset = v:false
    let l:time_diff_ms = 0

    " last_motion_time が初期化されているかチェック（0 ではなくリストかどうか）
    if type(s:motion_state.last_motion_time) == type([])
      " 時間差を計算（ミリ秒）
      let l:time_diff = reltimefloat(reltime(s:motion_state.last_motion_time, l:current_time))
      let l:time_diff_ms = float2nr(l:time_diff * 1000.0)

      " タイムアウトチェック
      if l:time_diff_ms > s:motion_state.timeout_ms
        let l:should_reset = v:true
      endif
    endif

    " 3. 異なるモーションの場合もリセット
    if s:motion_state.last_motion != '' && s:motion_state.last_motion != a:motion_key
      let l:should_reset = v:true
    endif

    " 4. カウントの更新
    if l:should_reset || s:motion_state.motion_count == 0
      " リセット
      let s:motion_state.motion_count = 1
    else
      " 同じモーションをタイムアウト内に実行 → カウント++
      let s:motion_state.motion_count += 1
    endif

    " 5. 閾値チェックとヒント表示トリガー
    " Phase D-2 Sub1: キー別のモーションカウントを使用
    let l:threshold = hellshake_yano_vim#motion#get_motion_count(a:motion_key)
    let l:should_trigger_hint = v:false
    if s:motion_state.motion_count >= l:threshold
      let l:should_trigger_hint = v:true
      " カウントをリセット（連続表示を防ぐ）
      let s:motion_state.motion_count = 0
    endif

    " 6. 通常モーション実行は<expr>マッピングで自動実行される
    " （handle_visual_expr()がモーションキーを返すことで実行）

    " Phase D-2 Sub1.1: カーソル位置を画面に反映
    if hellshake_yano_vim#core#should_redraw()
      redraw
    endif

    " 7. ヒント表示トリガー（閾値に達した場合）
    if l:should_trigger_hint
      " Visual mode用のヒント表示
      " <expr>マッピング内では同期的に呼び出す必要がある
      " timer_start()を使うとモーション実行後(normal mode)に実行されてしまう
      "
      " 注意: visual#show()は現時点で選択範囲のフィルタリングを行っていないため、
      "       core#show()を直接呼び出す。これにより gv コマンドとマークの問題を回避。
      call timer_start(0, function('hellshake_yano_vim#core#show_with_motion_timer'))
    endif

    " 8. 現在時刻と現在モーションを記録
    let s:motion_state.last_motion = a:motion_key
    let s:motion_state.last_motion_time = l:current_time

  catch
    " エラーハンドリング（Process 101 Refactor: util.vim使用）
    call hellshake_yano_vim#util#show_error('motion', 'handle_visual: error occurred: ' . v:exception)

    " エラー時は状態をリセット
    call hellshake_yano_vim#motion#init()
  endtry
endfunction

let &cpo = s:save_cpo
unlet s:save_cpo
