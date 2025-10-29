" hellshake-yano-unified.vim - 統合エントリーポイント
" Author: hellshake-yano
" License: MIT
"
" Phase 5: メインエントリーポイント統合
" 統合版とVimScript版を環境に応じて自動選択するエントリーポイント
"
" integration/initializer.ts と連携して、
" Vim/Neovim環境を自動判定し、最適な実装を選択して初期化します。

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

" s:select_implementation() - 実装の自動選択
"
" 環境に応じて最適な実装を選択:
" 1. Denopsが利用可能な場合は統合版を使用
" 2. Denopsが無い場合はPure VimScript版にフォールバック
"
" @return String 選択された実装 ('denops-unified' または 'vimscript-pure')
function! s:select_implementation() abort
  " 1. Denopsが利用可能な場合は統合版を使用
  if exists('g:loaded_denops') && denops#server#status() !=# 'stopped'
    " Vim環境でもDenops実装を使用
    return 'denops-unified'
  endif

  " 2. Denopsが無い場合はPure VimScript版にフォールバック
  if has('nvim')
    " NeovimでDenopsが無い場合は警告
    echohl WarningMsg
    echo '[hellshake-yano] Denops is not available. Some features may be limited.'
    echohl None
  endif

  return 'vimscript-pure'
endfunction

"=============================================================================
" 初期化関数
"=============================================================================

" s:initialize() - プラグインの初期化
"
" 選択された実装に基づいてプラグインを初期化
function! s:initialize() abort
  let l:impl = s:select_implementation()

  if l:impl ==# 'denops-unified'
    " 統合版の初期化
    call s:initialize_unified()
  else
    " Pure VimScript版の初期化
    call hellshake_yano_vim#core#init()
    call s:setup_vimscript_mappings()
  endif

  " 設定マイグレーション
  call s:migrate_config()
endfunction

" s:initialize_unified() - 統合版の初期化
"
" Denopsを使用した統合版の初期化処理
" 非同期型待機でDenopsサーバーの準備完了後に初期化を実行
function! s:initialize_unified() abort
  " denops#plugin#wait_async()で非同期待機
  " Denopsの準備完了後、コールバックで実際の初期化を実行
  " 第1引数: プラグイン名（文字列）
  " 第2引数: 準備完了時のコールバック関数
  try
    call denops#plugin#wait_async('hellshake-yano', function('s:initialize_unified_callback'))
  catch
    " wait_async が失敗した場合はフォールバック
    call s:initialize_fallback()
  endtry
endfunction

" s:initialize_unified_callback() - Denops準備完了後のコールバック
"
" Denops準備完了後に実行される初期化処理
function! s:initialize_unified_callback() abort
  try
    " 設定の統一
    " 新形式の設定を優先、旧形式があればマージ
    let l:config = extend(
      \ get(g:, 'hellshake_yano_vim_config', {}),
      \ get(g:, 'hellshake_yano', {})
    \ )
    call denops#notify('hellshake-yano', 'updateConfig', [l:config])

    " コマンド定義
    command! -nargs=0 HellshakeYanoShow
      \ call denops#notify('hellshake-yano', 'showHints', [])
    command! -nargs=0 HellshakeYanoHide
      \ call denops#notify('hellshake-yano', 'hideHints', [])
    command! -nargs=0 HellshakeYanoToggle
      \ call denops#notify('hellshake-yano', 'toggle', [])

    " キーマッピング
    call s:setup_unified_mappings()
  catch
    " エラーが発生した場合はフォールバック
    echohl ErrorMsg
    echo '[hellshake-yano] Initialization error: ' . v:exception
    echohl None
    call s:initialize_fallback()
  endtry
endfunction

" s:initialize_fallback() - フォールバック初期化
"
" Denops準備失敗時の初期化処理
function! s:initialize_fallback() abort
  try
    " Pure VimScript版へのフォールバック
    if exists('*hellshake_yano_vim#core#init')
      call hellshake_yano_vim#core#init()
    endif
    call s:setup_vimscript_mappings()

    " ユーザーに警告
    if !get(g:, 'hellshake_yano_suppress_fallback_warning', 0)
      echohl WarningMsg
      echo '[hellshake-yano] Denops initialization failed. Using VimScript fallback.'
      echohl None
    endif
  catch
    " フォールバック自体が失敗した場合
    echohl ErrorMsg
    echo '[hellshake-yano] Critical error during initialization: ' . v:exception
    echohl None
  endtry
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

" s:setup_unified_mappings() - 統合版のマッピング設定
"
" モーション検出マッピングとビジュアルモードマッピングを設定
function! s:setup_unified_mappings() abort
  " モーション検出マッピング（Normal mode）
  " Phase D-2: VimScript実装を使用（Denops依存を削減）
  " Phase D-7 Process3 Sub1: <expr>マッピングでv:count1を取得（autoload遅延読み込み問題対策）
  if get(g:hellshake_yano, 'motionCounterEnabled', v:true)
    for key in get(g:hellshake_yano, 'countedMotions', ['w', 'b', 'e'])
      execute printf('nnoremap <silent> <expr> %s printf(":\<C-u>call hellshake_yano_vim#motion#handle_with_count(%s, %%d)\<CR>", v:count1)',
        \ key, string(key))
    endfor
  endif

  " Visual mode用のモーション検出マッピング（Phase D-2 Sub1.3）
  " <expr>マッピングを使用してVisual modeを維持
  " visual_schedule()を経由してモーション検出処理を実行
  " v:count1はVim側が自動的にモーションに適用するため明示不要
  if get(g:hellshake_yano, 'motionCounterEnabled', v:true)
    for key in get(g:hellshake_yano, 'countedMotions', ['w', 'b', 'e'])
      " Visual modeでもモーション検出を有効化
      execute printf('xnoremap <silent> <expr> %s hellshake_yano_vim#motion#visual_schedule(%s)',
        \ key, string(key))
    endfor
  endif

  " ビジュアルモード対応（<Leader>h）
  if get(g:hellshake_yano, 'visualModeEnabled', v:true)
    xnoremap <silent> <Leader>h :<C-u>call <SID>show_hints_visual()<CR>
  endif
endfunction

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

" s:show_hints_visual() - ビジュアルモード用ヒント表示
"
" ビジュアルモードでヒント表示を呼び出し
function! s:show_hints_visual() abort
  " Denopsチャネル状態を確認
  if denops#server#status() ==# 'running'
    call denops#notify('hellshake-yano', 'showHints', [])
  else
    echohl ErrorMsg
    echo '[hellshake-yano] Denops is not available. Hints cannot be shown.'
    echohl None
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
