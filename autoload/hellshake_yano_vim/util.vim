" autoload/hellshake_yano_vim/util.vim - 共通ユーティリティ関数
" Author: hellshake-yano
" License: MIT
"
" Process 101: リファクタリング - 重複コード抽出・共通化
"
" このモジュールはプラグイン全体で使用される共通ユーティリティ関数を提供します。
" エラーハンドリング、ログ出力、共通ヘルパー関数などを集約し、
" コードの重複を排除し保守性を向上させます。
"
" 主要関数:
"   - hellshake_yano_vim#util#show_error(module, message) - エラーメッセージ表示
"   - hellshake_yano_vim#util#show_warning(module, message) - 警告メッセージ表示
"   - hellshake_yano_vim#util#show_info(module, message) - 情報メッセージ表示
"   - hellshake_yano_vim#util#debug_log(module, message) - デバッグログ出力
"   - hellshake_yano_vim#util#clamp(value, min, max) - 値を範囲内に制限

let s:save_cpo = &cpo
set cpo&vim

" ============================================================================
" メッセージ表示関数
" ============================================================================

" hellshake_yano_vim#util#show_error(module, message) - エラーメッセージ表示
"
" 目的:
"   - エラーメッセージを統一されたフォーマットで表示
"   - プラグイン名とモジュール名をプレフィックスとして付与
"
" @param module String モジュール名（例: 'display', 'input'）
" @param message String エラーメッセージ
"
" 使用例:
"   call hellshake_yano_vim#util#show_error('display', 'popup_create() is not available')
"   " => 'hellshake_yano_vim#display: popup_create() is not available'
function! hellshake_yano_vim#util#show_error(module, message) abort
  echohl ErrorMsg
  echomsg 'hellshake_yano_vim#' . a:module . ': ' . a:message
  echohl None
endfunction

" hellshake_yano_vim#util#show_warning(module, message) - 警告メッセージ表示
"
" 目的:
"   - 警告メッセージを統一されたフォーマットで表示
"
" @param module String モジュール名
" @param message String 警告メッセージ
function! hellshake_yano_vim#util#show_warning(module, message) abort
  echohl WarningMsg
  echomsg 'hellshake_yano_vim#' . a:module . ': ' . a:message
  echohl None
endfunction

" hellshake_yano_vim#util#show_info(module, message) - 情報メッセージ表示
"
" 目的:
"   - 情報メッセージを統一されたフォーマットで表示
"
" @param module String モジュール名
" @param message String 情報メッセージ
function! hellshake_yano_vim#util#show_info(module, message) abort
  echomsg 'hellshake_yano_vim#' . a:module . ': ' . a:message
endfunction

" hellshake_yano_vim#util#debug_log(module, message) - デバッグログ出力
"
" 目的:
"   - デバッグモード時のみログを出力
"   - g:hellshake_yano_debug が真の場合にのみ表示
"
" @param module String モジュール名
" @param message String デバッグメッセージ
function! hellshake_yano_vim#util#debug_log(module, message) abort
  if get(g:, 'hellshake_yano_debug', 0)
    echomsg '[DEBUG] hellshake_yano_vim#' . a:module . ': ' . a:message
  endif
endfunction

" ============================================================================
" 数値ユーティリティ関数
" ============================================================================

" hellshake_yano_vim#util#clamp(value, min, max) - 値を範囲内に制限
"
" 目的:
"   - 数値を指定された範囲内に制限（クランプ）
"   - 行番号や列番号のバリデーションに使用
"
" @param value Number 制限する値
" @param min Number 最小値
" @param max Number 最大値
" @return Number 範囲内に制限された値
"
" 使用例:
"   let lnum = hellshake_yano_vim#util#clamp(target_line, 1, line('$'))
function! hellshake_yano_vim#util#clamp(value, min, max) abort
  if a:value < a:min
    return a:min
  elseif a:value > a:max
    return a:max
  endif
  return a:value
endfunction

" ============================================================================
" バッファ・ウィンドウユーティリティ
" ============================================================================

" hellshake_yano_vim#util#is_valid_buffer(bufnr) - バッファの有効性チェック
"
" 目的:
"   - バッファ番号が有効かどうかを確認
"   - 削除されたバッファや不正なバッファ番号を検出
"
" @param bufnr Number バッファ番号
" @return Boolean 有効なら v:true、無効なら v:false
function! hellshake_yano_vim#util#is_valid_buffer(bufnr) abort
  return a:bufnr > 0 && bufexists(a:bufnr)
endfunction

" hellshake_yano_vim#util#is_valid_window(winid) - ウィンドウの有効性チェック
"
" 目的:
"   - ウィンドウIDが有効かどうかを確認
"   - 閉じられたウィンドウを検出
"
" @param winid Number ウィンドウID
" @return Boolean 有効なら v:true、無効なら v:false
function! hellshake_yano_vim#util#is_valid_window(winid) abort
  return a:winid > 0 && win_id2win(a:winid) > 0
endfunction

" ============================================================================
" 文字列ユーティリティ
" ============================================================================

" hellshake_yano_vim#util#safe_strchars(str) - 安全な文字数取得
"
" 目的:
"   - 文字列の文字数を安全に取得（マルチバイト対応）
"   - 空文字列や nil を適切に処理
"
" @param str String 対象文字列
" @return Number 文字数（空の場合は0）
function! hellshake_yano_vim#util#safe_strchars(str) abort
  if empty(a:str)
    return 0
  endif
  return strchars(a:str)
endfunction

let &cpo = s:save_cpo
unlet s:save_cpo
