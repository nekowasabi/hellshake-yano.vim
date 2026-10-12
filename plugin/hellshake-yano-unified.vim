" Explicit native startup owns initialization only when opted in.
if has('nvim') || get(g:, 'hellshake_yano_native', v:false)
  finish
endif

" hellshake-yano-unified.vim - 統合エントリーポイント
" Author: hellshake-yano
" License: MIT
"
" Phase 5: メインエントリーポイント統合
" 統合版とVimScript版を環境に応じて自動選択するエントリーポイント
"
" Vim の設定を統合し、Pure VimScript 実装を初期化します。

" ロードガード
if exists('g:loaded_hellshake_yano_unified')
  finish
endif
let g:loaded_hellshake_yano_unified = 1

" 保存と復元
let s:save_cpo = &cpo
set cpo&vim

"=============================================================================
" 実装選択ロジック
"=============================================================================

function! s:initialize() abort
  call s:migrate_config()
  call hellshake_yano_vim#core#init()
  call s:setup_vimscript_mappings()
endfunction

"=============================================================================
" 設定マイグレーション
"=============================================================================

" s:migrate_config() - 設定のマイグレーション
"
" 旧設定（g:hellshake_yano_vim_config）を新設定（g:hellshake_yano）に自動変換
function! s:migrate_config() abort
  " g:hellshake_yano_vim_config が存在し、g:hellshake_yano が存在しない場合
  if exists('g:hellshake_yano_vim_config') && !exists('g:hellshake_yano')
    let g:hellshake_yano = {}

    " 設定の変換
    for [old_key, new_key] in [
      \ ['hint_chars', 'markers'],
      \ ['motion_threshold', 'motionCount'],
      \ ['motion_timeout_ms', 'motionTimeout'],
      \ ['motion_keys', 'countedMotions'],
      \ ['motion_enabled', 'motionCounterEnabled'],
      \ ['visual_mode_enabled', 'visualModeEnabled'],
      \ ['max_hints', 'maxHints'],
      \ ['min_word_length', 'defaultMinWordLength'],
      \ ['use_japanese', 'useJapanese'],
      \ ['debug_mode', 'debugMode'],
    \ ]
      if has_key(g:hellshake_yano_vim_config, old_key)
        let g:hellshake_yano[new_key] = g:hellshake_yano_vim_config[old_key]
      endif
    endfor

    " 廃止予定警告
    echohl WarningMsg
    echo '[hellshake-yano] Note: g:hellshake_yano_vim_config is deprecated.'
    echo 'Your settings have been migrated to g:hellshake_yano.'
    echo 'Please update your configuration to use g:hellshake_yano directly.'
    echohl None
  endif
endfunction

"=============================================================================
" マッピング設定関数
"=============================================================================

" s:setup_vimscript_mappings() - VimScript版のマッピング設定
"
" Pure VimScript版のマッピング設定（フォールバック）
" Phase D-2 Sub1.2 追加修正: 設定変数名の統一
function! s:setup_vimscript_mappings() abort
  " motion_enabled の取得（g:hellshake_yano を優先）
  let l:motion_enabled = v:true
  if exists('g:hellshake_yano') && has_key(g:hellshake_yano, 'motionCounterEnabled')
    let l:motion_enabled = g:hellshake_yano.motionCounterEnabled
  elseif exists('g:hellshake_yano_vim_config') && has_key(g:hellshake_yano_vim_config, 'motion_enabled')
    let l:motion_enabled = g:hellshake_yano_vim_config.motion_enabled
  endif

  " motion_keys の取得（g:hellshake_yano を優先）
  let l:motion_keys = ['w', 'b', 'e', 'h', 'j', 'k', 'l']
  if exists('g:hellshake_yano') && has_key(g:hellshake_yano, 'countedMotions')
    if !empty(g:hellshake_yano.countedMotions)
      let l:motion_keys = g:hellshake_yano.countedMotions
    endif
  elseif exists('g:hellshake_yano_vim_config') && has_key(g:hellshake_yano_vim_config, 'motion_keys')
    if !empty(g:hellshake_yano_vim_config.motion_keys)
      let l:motion_keys = g:hellshake_yano_vim_config.motion_keys
    endif
  endif

  " モーション検出マッピング
  " Phase D-7 Process3 Sub1: <expr>マッピングでv:count1を取得（autoload遅延読み込み問題対策）
  if l:motion_enabled
    for key in l:motion_keys
      execute printf('nnoremap <silent> <expr> %s printf(":\<C-u>call hellshake_yano_vim#motion#handle_with_count(%s, %%d)\<CR>", v:count1)',
        \ key, string(key))
    endfor
  endif

  " visual_mode_enabled の取得（g:hellshake_yano を優先）
  let l:visual_mode_enabled = v:true
  if exists('g:hellshake_yano') && has_key(g:hellshake_yano, 'visualModeEnabled')
    let l:visual_mode_enabled = g:hellshake_yano.visualModeEnabled
  elseif exists('g:hellshake_yano_vim_config') && has_key(g:hellshake_yano_vim_config, 'visual_mode_enabled')
    let l:visual_mode_enabled = g:hellshake_yano_vim_config.visual_mode_enabled
  endif

  " ビジュアルモード対応
  if l:visual_mode_enabled
    xnoremap <silent> <Leader>h :<C-u>call hellshake_yano_vim#visual#show()<CR>
  endif
endfunction

"=============================================================================
" 自動ロード設定
"=============================================================================

augroup HellshakeYanoUnified
  autocmd!
  " VimEnter時の自動初期化
  autocmd VimEnter * ++once call s:initialize()
augroup END

" 保存と復元
let &cpo = s:save_cpo
unlet s:save_cpo
