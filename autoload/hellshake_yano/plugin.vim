" License: MIT

" プラグインを有効化
function! hellshake_yano#plugin#enable() abort
  let g:hellshake_yano.enabled = v:true

  " マッピングを再設定
  if exists('*hellshake_yano#setup_motion_mappings')
    call hellshake_yano#setup_motion_mappings()
  endif

  echo '[hellshake-yano] Enabled'
endfunction

" プラグインを無効化
function! hellshake_yano#plugin#disable() abort
  let g:hellshake_yano.enabled = v:false

  " マッピングを解除（内部関数を直接呼べないため、公開関数経由で呼ぶ）
  " Note: clear_motion_mappingsは内部関数のため、後で対応が必要
  " 一時的に、グローバル設定を無効化することで対応

  " ヒントを非表示
  if exists('*hellshake_yano#state#is_hints_visible') && hellshake_yano#state#is_hints_visible()
    if exists('*hellshake_yano#hide')
      call hellshake_yano#hide()
    endif
  endif

  " カウントをリセット
  if exists('*hellshake_yano#reset_count')
    call hellshake_yano#reset_count()
  endif

  echo '[hellshake-yano] Disabled'
endfunction

" プラグインの有効/無効を切り替え
function! hellshake_yano#plugin#toggle() abort
  if g:hellshake_yano.enabled
    call hellshake_yano#plugin#disable()
  else
    call hellshake_yano#plugin#enable()
  endif
endfunction

" バッファ進入時の処理
function! hellshake_yano#plugin#on_buf_enter() abort
  let bufnr = hellshake_yano#utils#bufnr()
  if exists('*hellshake_yano#state#init_buffer_state')
    call hellshake_yano#state#init_buffer_state(bufnr)
  endif
endfunction

function! hellshake_yano#plugin#on_buf_leave() abort
  if exists('*hellshake_yano#state#is_hints_visible') && hellshake_yano#state#is_hints_visible()
    if exists('*hellshake_yano#hide')
      call hellshake_yano#hide()
    endif
  endif
endfunction