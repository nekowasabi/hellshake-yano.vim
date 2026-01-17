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
  \ 'multiWindowMaxWindows': 4
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

  " キーが存在しない場合は v:none を返す
  return v:none
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

  " キーと値を設定
  let g:hellshake_yano_vim_config[a:key] = a:value
endfunction

let &cpo = s:save_cpo
unlet s:save_cpo
