" autoload/hellshake_yano_vim/hint_generator.vim - ヒント生成モジュール
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: GREEN
" Process3: ヒント生成の実装
" Phase D-1 Sub2.1: 数字ヒント・設定統合・動的maxTotal実装
"
" このモジュールはヒント文字の生成を担当します。
" Phase D-1 Sub2.1 で以下の機能を追加:
" - g:hellshake_yano.* からの設定読み込み（Neovim設定との統合）
" - useNumericMultiCharHints: 2桁数字ヒント（01-99, 00）のサポート
" - 動的maxTotal計算（カスタムキー数に応じた最大ヒント数の自動計算）

" スクリプトローカル変数の定義
let s:save_cpo = &cpo
set cpo&vim

" ========================================
" Phase 1.3 Process 2: Denops統合
" ========================================

" hellshake_yano_vim#hint_generator#has_denops() - Denops利用可能チェック
"
" 目的:
"   - Denopsプラグインが利用可能かチェック
"   - dictionary.vimの統合パターンに準拠
"
" @return v:true: Denops利用可能 / v:false: 利用不可
function! hellshake_yano_vim#hint_generator#has_denops() abort
  if !exists('*denops#plugin#is_loaded')
    return v:false
  endif
  try
    return denops#plugin#is_loaded('hellshake-yano') ? v:true : v:false
  catch
    return v:false
  endtry
endfunction

" ========================================
" Phase 1.3 Process 3: キャッシュ機構
" ========================================

" ヒントキャッシュ（高頻度呼び出し対策）
let s:hint_cache = {}
let s:cache_max_size = 100  " キャッシュエントリ上限

" hellshake_yano_vim#hint_generator#clear_cache() - キャッシュクリア
"
" 目的:
"   - ヒントキャッシュをクリア
"   - 設定変更時やテスト時に呼び出す
"
" @return void
function! hellshake_yano_vim#hint_generator#clear_cache() abort
  let s:hint_cache = {}
endfunction

" s:get_config() - 設定の取得
"
" 目的:
"   - g:hellshake_yano.* から設定を読み込む（Neovim版との統合）
"   - 設定が存在しない場合はデフォルト値を使用
"
" @param key String 設定キー名（'singleCharKeys', 'multiCharKeys', 'useNumericMultiCharHints'）
" @param default Any デフォルト値
" @return Any 設定値
function! s:get_config(key, default) abort
  " g:hellshake_yano.* から設定を読み込む
  if exists('g:hellshake_yano') && has_key(g:hellshake_yano, a:key)
    let l:value = g:hellshake_yano[a:key]
    " 文字列キーの場合は1文字ずつ分割
    if a:key ==# 'singleCharKeys' || a:key ==# 'multiCharKeys'
      return split(l:value, '\zs')
    else
      return l:value
    endif
  endif

  " デフォルト値を返す
  return a:default
endfunction

" デフォルトヒント文字の定義（Phase D-1: 設定統合）
" 単一文字ヒント用のキー（7文字、ホームポジション優先）
let s:default_single_char_keys = split('asdfgnm', '\zs')

" 複数文字ヒント用のキー（15文字）
let s:default_multi_char_keys = split('bceiopqrtuvwxyz', '\zs')

" 2桁数字ヒントを使用するか（デフォルト: false）
let s:default_use_numeric = v:false

" s:generate_multi_char_hints(count, base_chars) - 複数文字ヒントの生成
"
" 目的:
"   - 2文字のヒント文字列を生成する（Phase A-3）
"   - bb, bc, be, bi, bo, bp, bq, ... の順序で生成
"   - base_chars を使用（カスタマイズ可能）
"   - Phase D-1: 動的maxTotal計算に対応
"
" アルゴリズム:
"   1. base_chars の組み合わせで2文字ヒントを生成
"   2. インデックス i に基づいて first_char と second_char を決定
"   3. first_idx = i / len(base_chars), second_idx = i % len(base_chars)
"   4. 例（base_chars='bce...'の場合）: i=0 → 'bb', i=1 → 'bc', i=15 → 'cb'
"
" @param count Number 生成する2文字ヒントの数
" @param base_chars List<String> ベース文字配列
" @return List<String> 2文字ヒントの配列
"
" 使用例:
"   let hints = s:generate_multi_char_hints(8, ['b', 'c', 'e'])
"   " => ['bb', 'bc', 'be', 'cb', 'cc', 'ce', 'eb', 'ec']
"
" 注意事項:
"   - 最大 len(base_chars) x len(base_chars) 個まで生成可能
function! s:generate_multi_char_hints(count, base_chars) abort
  let l:hints = []
  let l:max_hints = len(a:base_chars) * len(a:base_chars)

  let l:actual_count = a:count > l:max_hints ? l:max_hints : a:count

  for l:i in range(l:actual_count)
    let l:first_idx = l:i / len(a:base_chars)
    let l:second_idx = l:i % len(a:base_chars)
    let l:hint = a:base_chars[l:first_idx] . a:base_chars[l:second_idx]
    call add(l:hints, l:hint)
  endfor

  return l:hints
endfunction

" s:generate_numeric_hints(count) - 2桁数字ヒントの生成（Phase D-1 Sub2.1）
"
" 目的:
"   - 2桁数字ヒント（01-99, 00）を生成
"   - Neovim実装に準拠: 01-09, 10-99, 00の順序
"   - useNumericMultiCharHints: true の場合に使用
"
" アルゴリズム:
"   1. 01-09: 1桁の数字を0埋め
"   2. 10-99: 2桁の数字をそのまま
"   3. 00: 最後に追加
"
" @param count Number 生成する数字ヒントの数（最大100個）
" @return List<String> 数字ヒントの配列 ['01', '02', ..., '09', '10', ..., '99', '00']
"
" 使用例:
"   let hints = s:generate_numeric_hints(11)
"   " => ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11']
"
"   let hints = s:generate_numeric_hints(100)
"   " => ['01', '02', ..., '09', '10', ..., '99', '00']
function! s:generate_numeric_hints(count) abort
  let l:hints = []
  let l:actual_count = a:count > 100 ? 100 : a:count

  " 01-09
  for l:i in range(1, 9)
    if len(l:hints) >= l:actual_count
      break
    endif
    call add(l:hints, printf('%02d', l:i))
  endfor

  " 10-99
  for l:i in range(10, 99)
    if len(l:hints) >= l:actual_count
      break
    endif
    call add(l:hints, printf('%02d', l:i))
  endfor

  " 00 (最後)
  if len(l:hints) < l:actual_count
    call add(l:hints, '00')
  endif

  return l:hints
endfunction

" hellshake_yano_vim#hint_generator#generate(count) - ヒント文字列の生成
"
" 目的:
"   - 指定された count 個のヒント文字を生成
"   - Phase D-1 Sub2.1: 設定統合・数字ヒント・動的maxTotal対応
"   - g:hellshake_yano.* からの設定読み込み（Neovim版との統合）
"   - useNumericMultiCharHints: 2桁数字ヒント（01-99, 00）のサポート
"   - 動的maxTotal計算（カスタムキー数に応じた最大ヒント数の自動計算）
"
" アルゴリズム:
"   1. count が 0 以下の場合、空の配列を返す
"   2. 設定を読み込む（フォールバック付き）
"   3. 動的maxTotal計算: len(singleCharKeys) + len(multiCharKeys)^2
"   4. 単一文字ヒント生成
"   5. 複数文字ヒント生成（必要な場合）
"   6. 数字ヒント生成（useNumericMultiCharHints: true の場合）
"
" @param count Number 生成するヒント文字の数（1以上の整数を想定）
" @return List<String> ヒント文字の配列
"
" 使用例:
"   " デフォルト設定
"   let hints = hellshake_yano_vim#hint_generator#generate(3)
"   " => ['a', 's', 'd']
"
"   " カスタム設定（g:hellshake_yano.singleCharKeys = 'abc'）
"   let hints = hellshake_yano_vim#hint_generator#generate(3)
"   " => ['a', 'b', 'c']
"
"   " 数字ヒント（g:hellshake_yano.useNumericMultiCharHints = v:true）
"   let hints = hellshake_yano_vim#hint_generator#generate(60)
"   " => ['a', 's', ..., 'm', 'bb', ..., (49個), '01', ..., '11']
"
" エラーハンドリング:
"   - count <= 0: 空配列を返す
"
" カスタマイズ:
"   - g:hellshake_yano.singleCharKeys: 単一文字キー
"   - g:hellshake_yano.multiCharKeys: 複数文字キー
"   - g:hellshake_yano.useNumericMultiCharHints: 数字ヒント使用フラグ
"   - 後方互換性: g:hellshake_yano_vim_* も使用可能
function! hellshake_yano_vim#hint_generator#generate(count) abort
  " 引数チェック: count が 0 以下の場合は空配列を返す
  if a:count <= 0
    return []
  endif

  " Phase 1.3 Process 3: キャッシュチェック
  let l:cache_key = string(a:count)
  if has_key(s:hint_cache, l:cache_key)
    return copy(s:hint_cache[l:cache_key])
  endif

  " Phase 1.3 Process 2: Denops優先 - 利用可能な場合はDenops経由で生成
  let l:result = []
  if hellshake_yano_vim#hint_generator#has_denops()
    try
      let l:result = denops#request('hellshake-yano', 'generateHints', [a:count])
      if type(l:result) != v:t_list
        let l:result = []
      endif
    catch
      " Denops呼び出し失敗時はフォールバック
      let l:result = []
    endtry
  endif

  " フォールバック: ローカル実装
  if empty(l:result)
    let l:result = s:generate_local(a:count)
  endif

  " Phase 1.3 Process 3: キャッシュに保存（上限チェック）
  if len(s:hint_cache) >= s:cache_max_size
    " 最も古いエントリを削除（簡易LRU）
    let l:keys = keys(s:hint_cache)
    if !empty(l:keys)
      unlet s:hint_cache[l:keys[0]]
    endif
  endif
  let s:hint_cache[l:cache_key] = l:result

  return copy(l:result)
endfunction

" s:generate_local(count) - ローカル実装（フォールバック用）
"
" 目的:
"   - Denops未起動時のフォールバック実装
"   - 既存のヒント生成ロジックを維持
"
" @param count Number 生成するヒント数
" @return List<String> ヒント文字の配列
function! s:generate_local(count) abort
  " Phase D-1 Sub2.1: 設定の読み込み（フォールバック付き）
  let l:single_char_keys = s:get_config('singleCharKeys', s:default_single_char_keys)
  let l:multi_char_keys = s:get_config('multiCharKeys', s:default_multi_char_keys)
  let l:use_numeric = s:get_config('useNumericMultiCharHints', s:default_use_numeric)

  " Phase D-1 Sub2.1: 動的maxTotal計算
  " 通常ヒントの最大数 = len(singleCharKeys) + len(multiCharKeys)^2
  let l:max_total = len(l:single_char_keys) + (len(l:multi_char_keys) * len(l:multi_char_keys))

  " 数字ヒントを使用する場合の最大数
  let l:max_with_numeric = l:use_numeric ? l:max_total + 100 : l:max_total
  let l:actual_count = a:count > l:max_with_numeric ? l:max_with_numeric : a:count

  " 単一文字ヒント（最大 len(single_char_keys) 個）
  let l:single_char_count = min([l:actual_count, len(l:single_char_keys)])
  let l:hints = l:single_char_keys[0 : l:single_char_count - 1]

  " 複数文字ヒント（len(single_char_keys) + 1 個目以降）
  if l:actual_count > len(l:single_char_keys)
    let l:remaining_count = l:actual_count - len(l:single_char_keys)
    let l:max_multi_char = l:max_total - len(l:single_char_keys)
    let l:multi_char_count = min([l:remaining_count, l:max_multi_char])

    if l:multi_char_count > 0
      let l:multi_char_hints = s:generate_multi_char_hints(l:multi_char_count, l:multi_char_keys)
      call extend(l:hints, l:multi_char_hints)
    endif
  endif

  " Phase D-1 Sub2.1: 2桁数字ヒント（useNumericMultiCharHints: true の場合のみ）
  if l:use_numeric && l:actual_count > l:max_total
    let l:numeric_count = l:actual_count - l:max_total
    let l:numeric_hints = s:generate_numeric_hints(l:numeric_count)
    call extend(l:hints, l:numeric_hints)
  endif

  return l:hints
endfunction

let &cpo = s:save_cpo
unlet s:save_cpo
