" autoload/hellshake_yano_vim/config.vim - 設定管理
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: GREEN
" Process2: config.vim の実装
"
" このモジュールは hellshake-yano.vim の設定を管理します。
" Phase A-4: モーション連打検出機能の設定を含みます。
" Phase A-5: ビジュアルモード対応と高度な機能の設定を含みます。
" Vim 8.0+ と Neovim の両方で動作します。

" スクリプトローカル変数の定義
let s:save_cpo = &cpo
set cpo&vim

" デフォルト設定
" PLAN.md の仕様に基づくデータ構造
"
" 設定項目の詳細:
"
" Phase A-1～A-4 の基本設定:
"   enabled              - プラグイン全体の有効/無効（デフォルト: true）
"   hint_chars           - ヒント文字に使用する文字列（デフォルト: 'ASDFJKL'）
"   motion_enabled       - モーション連打検出の有効/無効（デフォルト: true）
"   motion_threshold     - ヒント表示に必要な連打回数（デフォルト: 2回）
"   motion_timeout_ms    - 連打判定のタイムアウト（デフォルト: 2000ms）
"   motion_keys          - 対象となるモーションキー（デフォルト: ['w', 'b', 'e']）
"
" Phase A-5 の高度な設定:
"   use_japanese         - 日本語単語検出の有効化（デフォルト: false）
"                          ※process2未実装のため現在は無効
"   min_word_length      - 検出する最小単語長（デフォルト: 1文字）
"                          短い単語を除外したい場合に変更
"   visual_mode_enabled  - ビジュアルモード対応の有効/無効（デフォルト: true）
"                          無効にするとビジュアルモードマッピングが作成されない
"   max_hints            - [DEPRECATED] 表示する最大ヒント数（デフォルト: 49個）
"                          Phase D-1 Sub2.2: 動的maxTotal計算に移行
"                          hint_generator.vim が g:hellshake_yano.singleCharKeys と
"                          multiCharKeys から動的に計算するため、この設定は非推奨
"   exclude_numbers      - 数字のみの単語を除外（デフォルト: false）
"                          trueにすると"123"などが除外される
"   debug_mode           - デバッグモード（デフォルト: false）
"                          将来の拡張用
"
" Phase MW-6 のマルチウィンドウ設定:
"   multiWindowMode      - マルチウィンドウモードの有効/無効（デフォルト: false）
"                          有効にすると複数ウィンドウにヒントを表示
"   multiWindowExcludeTypes - 除外するバッファタイプ（デフォルト: ['help', 'quickfix', 'terminal', 'popup']）
"                          これらのタイプのウィンドウはヒント表示の対象外
"   multiWindowMaxWindows - 最大ウィンドウ数（デフォルト: 4）
"                          パフォーマンスのため処理対象ウィンドウ数を制限
let s:default_config = {
  \ 'enabled': v:true,
  \ 'hint_chars': 'ASDFJKL',
  \ 'motion_enabled': v:true,
  \ 'motion_threshold': 2,
  \ 'motion_timeout_ms': 2000,
  \ 'motion_keys': ['w', 'b', 'e', 'h', 'j', 'k', 'l'],
  \
  \ 'use_japanese': v:false,
  \ 'min_word_length': 1,
  \ 'visual_mode_enabled': v:true,
  \ 'max_hints': 49,
  \ 'exclude_numbers': v:false,
  \ 'debug_mode': v:false,
  \
  \ 'multiWindowMode': v:false,
  \ 'multiWindowExcludeTypes': ['help', 'quickfix', 'terminal', 'popup'],
  \ 'multiWindowMaxWindows': 4,
  \
  \ 'multiWindowRestoreDelay': 50,
  \ 'multiWindowDetectFocusGained': v:true
\ }

" hellshake_yano_vim#config#get(key) - 設定値の取得
"
" 目的:
"   - 設定値を取得するゲッター関数
"   - グローバル変数 g:hellshake_yano_vim_config を優先し、
"     存在しない場合はデフォルト値を返す
"
" アルゴリズム:
"   1. グローバル変数が存在し、指定されたキーが含まれる場合はその値を返す
"   2. それ以外の場合、デフォルト設定から値を返す
"   3. デフォルト設定にもキーが存在しない場合は v:none を返す
"
" パラメータ:
"   @param a:key String 取得する設定のキー名
"
" 戻り値:
"   @return Any 設定値（存在しない場合は v:none）
"
" 使用例:
"   let l:threshold = hellshake_yano_vim#config#get('motion_threshold')
"   " => 2 (デフォルト値)
"
"   let g:hellshake_yano_vim_config = {'motion_threshold': 3}
"   let l:threshold = hellshake_yano_vim#config#get('motion_threshold')
"   " => 3 (ユーザー設定値)
"
" 注意事項:
"   - この関数は高頻度で呼び出される可能性があるため、パフォーマンスを考慮
"   - グローバル変数の存在チェックは exists() を使用
function! hellshake_yano_vim#config#get(key) abort
  " グローバル変数 g:hellshake_yano_vim_config が存在し、キーが含まれる場合はその値を返す
  if exists('g:hellshake_yano_vim_config') && has_key(g:hellshake_yano_vim_config, a:key)
    return g:hellshake_yano_vim_config[a:key]
  endif

  " フォールバック: g:hellshake_yano も参照（後方互換性のため）
  if exists('g:hellshake_yano') && has_key(g:hellshake_yano, a:key)
    return g:hellshake_yano[a:key]
  endif

  " デフォルト設定から値を返す
  if has_key(s:default_config, a:key)
    return s:default_config[a:key]
  endif

  " キーが存在しない場合は v:null を返す（Vim/Neovim互換）
  return v:null
endfunction

" hellshake_yano_vim#config#set(key, value) - 設定値の変更
"
" 目的:
"   - 設定値を変更するセッター関数
"   - グローバル変数 g:hellshake_yano_vim_config を動的に更新
"
" アルゴリズム:
"   1. グローバル変数が存在しない場合は初期化
"   2. 指定されたキーと値をグローバル変数に設定
"
" パラメータ:
"   @param a:key String 設定するキー名
"   @param a:value Any 設定する値
"
" 戻り値:
"   @return なし
"
" 使用例:
"   call hellshake_yano_vim#config#set('motion_threshold', 3)
"   " motion_threshold が 3 に設定される
"
"   call hellshake_yano_vim#config#set('motion_enabled', v:false)
"   " motion_enabled が false に設定される
"
" 注意事項:
"   - この関数は実行時に設定を変更するため、.vimrc での初期設定には
"     let g:hellshake_yano_vim_config = {...} を直接使用することを推奨
"   - set() は動的な設定変更（コマンドやスクリプトからの変更）に使用
function! hellshake_yano_vim#config#set(key, value) abort
  " グローバル変数が存在しない場合は初期化
  if !exists('g:hellshake_yano_vim_config')
    let g:hellshake_yano_vim_config = {}
  endif

  " キーと値を設定（ローカルキャッシュ）
  let g:hellshake_yano_vim_config[a:key] = a:value

  " Phase 1.2: Denopsが準備できていれば TypeScript側（SoT）にも同期
  if hellshake_yano_vim#core#is_denops_ready()
    try
      let l:ts_key = s:map_key_to_ts(a:key)
      let l:ts_value = a:value

      " hint_chars の特殊変換: 文字列 → 配列
      if a:key ==# 'hint_chars' && type(a:value) == v:t_string
        let l:ts_value = split(a:value, '\zs')
      endif

      call denops#request('hellshake-yano', 'updateConfig', [{l:ts_key: l:ts_value}])
    catch
      " エラーは無視（ローカル設定は更新済み）
      " デバッグモード時のみログ出力
      if hellshake_yano_vim#config#get('debug_mode')
        echohl WarningMsg
        echo '[hellshake-yano] Failed to sync config: ' . v:exception
        echohl None
      endif
    endtry
  endif
endfunction

" hellshake_yano_vim#config#reload() - 設定の再読み込み
"
" Phase 1.2: VimScript→TypeScript統合
"
" 目的:
"   - TypeScript側（SoT）から設定を取得し、VimScript側に反映
"   - ユーザーが設定を変更した後に即時反映するために使用
"
" アルゴリズム:
"   1. Denops が初期化されていない場合は警告を表示して終了
"   2. denops#request() で TypeScript側の getConfig API を呼び出し
"   3. 取得した設定を s:map_config_from_ts() で VimScript形式に変換
"   4. g:hellshake_yano_vim_config を更新
"
" Council条件3: 即時反映
"   - reload() 実行時点で動作中の設定に即座に適用
"   - UIへの反映は次回ヒント表示時
"
" @return なし
function! hellshake_yano_vim#config#reload() abort
  " Denops が初期化されていない場合は警告
  if !hellshake_yano_vim#core#is_denops_ready()
    echohl WarningMsg
    echo '[hellshake-yano] Denops not ready'
    echohl None
    return
  endif

  try
    " TypeScript側から設定を取得
    let l:config = denops#request('hellshake-yano', 'getConfig', [])

    " VimScript形式に変換して反映
    let g:hellshake_yano_vim_config = s:map_config_from_ts(l:config)

    " Phase 1.3 Process 4: ヒントキャッシュをクリア（設定変更反映のため）
    if exists('*hellshake_yano_vim#hint_generator#clear_cache')
      call hellshake_yano_vim#hint_generator#clear_cache()
    endif

    echohl MoreMsg
    echo '[hellshake-yano] Config reloaded'
    echohl None
  catch
    echohl ErrorMsg
    echo '[hellshake-yano] Failed: ' . v:exception
    echohl None
  endtry
endfunction

" ========================================
" 内部ヘルパー関数（Phase 1.2）
" ========================================

" s:map_key_to_ts(key) - VimScript形式のキーをTypeScript形式に変換
"
" @param key String VimScript形式のキー（snake_case）
" @return String TypeScript形式のキー（camelCase）
function! s:map_key_to_ts(key) abort
  let l:mapping = {
    \ 'hint_chars': 'markers',
    \ 'motion_threshold': 'motionCount',
    \ 'motion_timeout_ms': 'motionTimeout',
    \ 'motion_keys': 'countedMotions',
    \ 'motion_enabled': 'motionCounterEnabled',
    \ 'visual_mode_enabled': 'visualModeEnabled',
    \ 'max_hints': 'maxHints',
    \ 'min_word_length': 'defaultMinWordLength',
    \ 'use_japanese': 'useJapanese',
    \ 'debug_mode': 'debugMode',
    \ 'exclude_numbers': 'excludeNumbers'
    \ }

  return get(l:mapping, a:key, a:key)
endfunction

" s:map_config_from_ts(config) - TypeScript形式の設定をVimScript形式に変換
"
" @param config Dictionary TypeScript形式の設定
" @return Dictionary VimScript形式の設定
function! s:map_config_from_ts(config) abort
  let l:reverse_mapping = {
    \ 'markers': 'hint_chars',
    \ 'motionCount': 'motion_threshold',
    \ 'motionTimeout': 'motion_timeout_ms',
    \ 'countedMotions': 'motion_keys',
    \ 'motionCounterEnabled': 'motion_enabled',
    \ 'visualModeEnabled': 'visual_mode_enabled',
    \ 'maxHints': 'max_hints',
    \ 'defaultMinWordLength': 'min_word_length',
    \ 'useJapanese': 'use_japanese',
    \ 'debugMode': 'debug_mode',
    \ 'excludeNumbers': 'exclude_numbers'
    \ }

  let l:result = {}
  for [l:ts_key, l:value] in items(a:config)
    let l:vim_key = get(l:reverse_mapping, l:ts_key, l:ts_key)

    " hint_chars の特殊変換: 配列 → 文字列
    if l:ts_key ==# 'markers' && type(l:value) == v:t_list
      let l:result[l:vim_key] = join(l:value, '')
    else
      let l:result[l:vim_key] = l:value
    endif
  endfor

  return l:result
endfunction

let &cpo = s:save_cpo
unlet s:save_cpo
