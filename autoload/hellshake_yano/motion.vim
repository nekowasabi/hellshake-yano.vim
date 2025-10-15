" License: MIT

function! s:get_key_repeat_config() abort
  return {
        \ 'enabled': get(g:hellshake_yano, 'suppressOnKeyRepeat', v:true),
        \ 'threshold': get(g:hellshake_yano, 'keyRepeatThreshold', 50),
        \ 'reset_delay': get(g:hellshake_yano, 'keyRepeatResetDelay', 300)
        \ }
endfunction

" キー別ヒント表示の必要性を判定
function! s:should_trigger_hints_for_key(bufnr, key) abort
  if hellshake_yano#state#is_key_repeating(a:bufnr)
    return v:false
  endif

  let key_count = hellshake_yano#count#get_key_count(a:bufnr, a:key)
  let threshold = hellshake_yano#config#get_motion_count_for_key(a:key)
  return key_count >= threshold
endfunction

" キーリピート検出処理
function! s:handle_key_repeat_detection(bufnr, current_time, config) abort
  " 機能が無効の場合は通常処理
  if !a:config.enabled
    call hellshake_yano#state#set_last_key_time(a:bufnr, a:current_time)
    return v:false
  endif

  " 前回のキー入力時刻との差を計算
  let last_key_time = hellshake_yano#state#get_last_key_time(a:bufnr)
  let time_diff = a:current_time - last_key_time

  " キーリピート判定（初回キー入力は除外、2回目以降で判定）
  if time_diff < a:config.threshold && last_key_time > 0
    " リピート状態に設定
    call hellshake_yano#state#set_key_repeating(a:bufnr, v:true)

    " 既存のリピート終了タイマーをクリアして新しく設定
    call hellshake_yano#timer#set_repeat_end_timer(a:bufnr, a:config.reset_delay)

    " キー時刻更新してヒント表示をスキップ
    call hellshake_yano#state#set_last_key_time(a:bufnr, a:current_time)
    return v:true
  endif

  " 通常処理: キー時刻を更新
  call hellshake_yano#state#set_last_key_time(a:bufnr, a:current_time)
  return v:false
endfunction

" モーション処理の統合関数
function! hellshake_yano#motion#process(key) abort
  let start_time = hellshake_yano#utils#get_elapsed_time()

  " プラグインが無効な場合は通常の動作
  if !get(g:hellshake_yano, 'enabled', v:true)
    return a:key
  endif

  let bufnr = hellshake_yano#utils#bufnr()
  call hellshake_yano#state#init_buffer_state(bufnr)

  " process50 sub4: ヒントが表示されている場合、無効なキー入力でヒントを非表示
  if hellshake_yano#state#is_hints_visible()
    if hellshake_yano#hint#validate_input_and_hide(a:key)
      " 無効キーでヒントを非表示にした場合、そのままキーを返す
      return a:key
    endif
  endif

  " キーリピート検出処理
  let current_time = hellshake_yano#utils#get_elapsed_time()
  let config = s:get_key_repeat_config()

  if s:handle_key_repeat_detection(bufnr, current_time, config)
    call hellshake_yano#hint#handle_debug_display()
    return a:key
  endif

  " キー別モーションカウントを処理
  call hellshake_yano#count#process_motion_count_for_key(bufnr, a:key)

  " キー別ヒント表示かタイムアウト設定を判定・実行
  if s:should_trigger_hints_for_key(bufnr, a:key)
    call hellshake_yano#count#reset_key_count(bufnr, a:key)

    " キー情報付きヒント表示
    call hellshake_yano#show_hints_with_key(a:key)

    call hellshake_yano#utils#log_performance('motion_with_hints', hellshake_yano#utils#get_elapsed_time() - start_time, {
          \ 'key': a:key, 'count': hellshake_yano#config#get_motion_count_for_key(a:key) })
  else
    call hellshake_yano#timer#set_motion_timeout(bufnr, a:key)
    call hellshake_yano#utils#log_performance('motion_normal', hellshake_yano#utils#get_elapsed_time() - start_time, {
          \ 'key': a:key, 'count': hellshake_yano#count#get_key_count(bufnr, a:key) })
  endif

  call hellshake_yano#hint#handle_debug_display()
  return a:key
endfunction

function! hellshake_yano#motion#visual(key) abort
  return hellshake_yano#motion#process(a:key)
endfunction

function! hellshake_yano#motion#with_key_context(key) abort
  return hellshake_yano#motion#process(a:key)
endfunction

function! hellshake_yano#motion#clear_motion_count_cache() abort
  call hellshake_yano#config#clear_motion_count_cache()
endfunction

function! hellshake_yano#motion#should_trigger_hints_for_key(bufnr, key) abort
  return s:should_trigger_hints_for_key(a:bufnr, a:key)
endfunction