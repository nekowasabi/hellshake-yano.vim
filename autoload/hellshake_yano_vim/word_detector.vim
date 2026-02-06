" autoload/hellshake_yano_vim/word_detector.vim - 画面内の単語検出機能
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: GREEN
" Process2: word_detector.vim実装
" Phase D-7 Process4 Sub2: Dictionary Integration (辞書統合)
"
" このモジュールは画面内（line('w0') ～ line('w$')）の単語を自動検出します。
" Phase A-2: 固定座標から単語ベースのヒント表示への移行を実現します。
" Phase D-7: dictionary.vimと統合し、辞書単語は最小長チェックをスキップします。

" スクリプトローカル変数の定義
let s:save_cpo = &cpo
set cpo&vim

" ======================================
" 最小単語長キャッシュ（高頻度呼び出し対策）
" ======================================
let s:min_length_cache = {}

" ======================================
" 単語検出キャッシュ（高頻度呼び出し対策）
" ======================================
let s:word_cache = {}
let s:cache_timestamp = 0
let s:cache_ttl = 100  " 100ms TTL
let s:cache_max_size = 10  " キャッシュエントリ上限

" ======================================
" PUBLIC API - 公開インターフェース
" ======================================

" hellshake_yano_vim#word_detector#has_denops() - Denops利用可能チェック
"
" 目的:
"   - Denopsプラグインが利用可能かチェック
"   - hint_generator.vimの統合パターンに準拠
"
" 応用例:
"   if hellshake_yano_vim#word_detector#has_denops()
"     " Denops経由で高速処理
"   else
"     " フォールバック処理
"   endif
"
" @return v:true: Denops利用可能 / v:false: 利用不可
function! hellshake_yano_vim#word_detector#has_denops() abort
  if !exists('*denops#plugin#is_loaded')
    return v:false
  endif
  try
    return denops#plugin#is_loaded('hellshake-yano') ? v:true : v:false
  catch
    return v:false
  endtry
endfunction

" hellshake_yano_vim#word_detector#detect_visible() - 画面内の単語検出
"
" Process2: Denops優先構造 (Green Phase)
" Phase D-6: Process3 Sub2 - 日本語対応拡張
" Phase D-7: Process4 Sub2 - Dictionary Integration (辞書統合)
"
" 目的:
"   - 画面内に表示されている範囲（line('w0') ～ line('w$')）の単語を検出
"   - Denops利用可能な場合はDenops経由で検出
"   - Denops利用不可の場合はローカル実装にフォールバック
"   - 日本語を含む行はTinySegmenterでセグメント化
"   - 英数字のみの行は正規表現パターン \w\+ で検出
"   - 辞書単語は最小長チェックをスキップ
"
" 処理フロー:
"   1. has_denops() で Denops 利用可否をチェック
"   2. 利用可能 → denops#request('detectWordsVisible') を呼び出し
"   3. 利用不可 → s:detect_visible_local() でローカル処理
"
" エラーハンドリング:
"   - Denops呼び出し失敗時は自動的にフォールバック
"   - 空バッファでも安全に動作
"   - 単語が見つからない場合は空配列を返す
"
" @return List<Dictionary> 単語データのリスト
"   各要素は以下の構造:
"   {
"     'text': 'word',      " 単語文字列
"     'lnum': 10,          " 行番号（1-indexed）
"     'col': 5,            " 開始列（1-indexed）
"     'end_col': 10        " 終了列（1-indexed）
"   }
"
" パフォーマンス:
"   - Denops利用時: O(L * W) で高速処理（Denops側で最適化）
"   - ローカル処理: O(L * W * S) - L: 画面内の行数、W: 行あたりの平均単語数、S: セグメント化時間
"   - 通常20-50行の画面内処理で数ミリ秒
function! hellshake_yano_vim#word_detector#detect_visible() abort
  " キャッシュキー生成
  let l:bufnr = bufnr('%')
  let l:topline = line('w0')
  let l:botline = line('w$')
  let l:cache_key = printf('%d:%d:%d', l:bufnr, l:topline, l:botline)

  " キャッシュヒット時は即座に返却（TTLチェック）
  let l:now = reltime()
  if has_key(s:word_cache, l:cache_key)
    let l:cached = s:word_cache[l:cache_key]
    let l:elapsed_ms = reltimefloat(reltime(l:cached.timestamp)) * 1000
    if l:elapsed_ms < s:cache_ttl
      return copy(l:cached.data)
    endif
    " TTL切れ: キャッシュ削除
    unlet s:word_cache[l:cache_key]
  endif

  " Denops優先 + フォールバック（既存ロジック）
  let l:result = []
  if hellshake_yano_vim#word_detector#has_denops()
    try
      let l:result = denops#request('hellshake-yano', 'detectWordsVisible', [])
      if type(l:result) != v:t_list
        let l:result = []
      endif
    catch
      let l:result = []
    endtry
  endif

  if empty(l:result)
    let l:result = s:detect_visible_local()
  endif

  " キャッシュに保存（上限チェック）
  if len(s:word_cache) >= s:cache_max_size
    " 最も古いエントリを削除（簡易LRU）
    let l:keys = keys(s:word_cache)
    if !empty(l:keys)
      unlet s:word_cache[l:keys[0]]
    endif
  endif
  let s:word_cache[l:cache_key] = {'data': l:result, 'timestamp': l:now}

  return copy(l:result)
endfunction

" hellshake_yano_vim#word_detector#clear_cache() - キャッシュクリア
"
" 目的:
"   - 単語検出キャッシュと最小単語長キャッシュをクリア
"   - 設定変更時やテスト時に呼び出す
"
" 使用例:
"   call hellshake_yano_vim#word_detector#clear_cache()
"
" @return void
function! hellshake_yano_vim#word_detector#clear_cache() abort
  let s:word_cache = {}
  let s:cache_timestamp = 0
  let s:min_length_cache = {}
endfunction

" hellshake_yano_vim#word_detector#get_min_length(key) - キー別最小単語長の取得
"
" Process2: Denops優先構造 + キャッシュ (Green Phase)
" Phase D-2 Sub2: Per-Key最小単語長機能
"
" 目的:
"   - モーションキー（'w', 'b', 'e' など）に対応した最小単語長を取得
"   - Denops利用可能な場合はDenops経由で取得
"   - キャッシュ機能で高頻度呼び出しに対応
"   - Denops利用不可の場合はローカル実装にフォールバック
"
" キャッシュ戦略:
"   - s:min_length_cache に キー → 最小単語長 をマッピング
"   - キャッシュヒット時は即座に返す（O(1)）
"   - キャッシュミス時は Denops/ローカルで取得後にキャッシュ
"
" @param key String モーションキー（例: 'w', 'b', 'e', 'h', 'j', 'k', 'l'）
" @return Number 最小単語長（デフォルト: 3）
"
" 使用例:
"   let min_len = hellshake_yano_vim#word_detector#get_min_length('w')
"   " => perKeyMinLength.w が設定されていれば その値
"   " => なければ defaultMinWordLength
"   " => それも未設定なら 3
function! hellshake_yano_vim#word_detector#get_min_length(key) abort
  " キャッシュチェック
  if has_key(s:min_length_cache, a:key)
    return s:min_length_cache[a:key]
  endif

  " Denops優先
  if hellshake_yano_vim#word_detector#has_denops()
    try
      let l:result = denops#request('hellshake-yano', 'getMinWordLength', [a:key])
      if type(l:result) == v:t_number && l:result > 0
        let s:min_length_cache[a:key] = l:result
        return l:result
      endif
    catch
      " Denops呼び出し失敗時はフォールバック
    endtry
  endif

  " フォールバック: ローカル実装
  let l:result = s:get_min_length_local(a:key)
  let s:min_length_cache[a:key] = l:result
  return l:result
endfunction

" hellshake_yano_vim#word_detector#detect_multi_window(windows) - 複数ウィンドウから単語検出
"
" Process2: Denops優先構造 (Green Phase)
"
" 目的:
"   - 複数ウィンドウから同時に単語を検出
"   - 各単語にウィンドウID(winid) とバッファ番号(bufnr) を付与
"   - ウィンドウ特定と複数バッファの処理が可能
"   - Denops利用可能な場合はDenops経由で検出
"   - Denops利用不可の場合はローカル実装にフォールバック
"
" アルゴリズム:
"   1. Denops経由で denops#request('detectWordsMultiWindow', [windows]) を呼び出し
"   2. または s:detect_multi_window_local() でローカル処理
"   3. 各ウィンドウの topline ～ botline の行を走査
"   4. 日本語/英数字判定して単語を検出
"   5. 各単語に winid と bufnr を付与して返す
"
" @param windows List ウィンドウ情報のリスト
"   各要素は辞書形式: {winid, bufnr, topline, botline, ...}
" @return List 単語リスト（各単語は {text, lnum, col, end_col, winid, bufnr} を含む）
"
" 使用例:
"   let windows = getwininfo()  " 全ウィンドウ情報を取得
"   let words = hellshake_yano_vim#word_detector#detect_multi_window(windows)
"   for word in words
"     echo word.text . ' in window ' . word.winid . ' at line ' . word.lnum
"   endfor
function! hellshake_yano_vim#word_detector#detect_multi_window(windows) abort
  " Denops優先
  if hellshake_yano_vim#word_detector#has_denops()
    try
      let l:result = denops#request('hellshake-yano', 'detectWordsMultiWindow', [a:windows])
      if type(l:result) == v:t_list
        return l:result
      endif
    catch
      " Denops呼び出し失敗時はフォールバック
    endtry
  endif

  " フォールバック: ローカル実装
  return s:detect_multi_window_local(a:windows)
endfunction

" ======================================
" INTERNAL FUNCTIONS - 内部実装
" ======================================

" s:is_in_dictionary(word) - 辞書に単語が含まれるかチェック
"
" 目的:
"   - dictionary.vimのis_in_dictionary() APIをラップ
"   - キャッシュ機能を活用した高速チェック
"   - Denops未起動時もエラーを出さずにv:falseを返す
"
" 責務:
"   - dictionary#has_denops()でDenops利用可否をチェック
"   - Denops利用可能ならdictionary#is_in_dictionary()を呼び出し
"   - Denops利用不可ならv:falseを返す（辞書にないものとして扱う）
"
" パフォーマンス（dictionary.vimの内部キャッシュを活用）:
"   - キャッシュヒット時: O(1)
"   - キャッシュミス時: Denops経由でチェック → キャッシュに保存
"
" @param word String チェックする単語
" @return Boolean v:true: 辞書に含まれる / v:false: 含まれないまたはDenops未起動
function! s:is_in_dictionary(word) abort
  " dictionary.vimが利用可能かチェック
  if !exists('*hellshake_yano_vim#dictionary#has_denops')
    return v:false
  endif

  if !hellshake_yano_vim#dictionary#has_denops()
    return v:false
  endif

  " dictionary.vimのAPIを呼び出し
  try
    return hellshake_yano_vim#dictionary#is_in_dictionary(a:word)
  catch
    " エラーが発生した場合は辞書にないものとして扱う
    return v:false
  endtry
endfunction

" s:detect_japanese_words(line, lnum) - 日本語単語の検出
"
" 目的:
"   - TinySegmenterを使って日本語テキストをセグメント化
"   - 各セグメントの位置情報を計算して返す
"   - 辞書に含まれる単語は最小長チェックをスキップ
"
" アルゴリズム:
"   1. hellshake_yano_vim#japanese#segment()でセグメント化
"   2. 各セグメントに対して:
"      a. stridx()でセグメントの位置を検索（UTF-8対応）
"      b. col: match_start + 1（1-indexed変換）
"      c. end_col: match_start + len(segment) + 1
"      d. offset更新でセグメントの重複検出を防ぐ
"   3. 空白のみのセグメントを除外
"   4. 辞書単語は最小長チェックをスキップ
"
" エラーハンドリング:
"   - segment()失敗時は空配列を返す
"   - stridx()が-1を返す場合はスキップ
"   - dictionary呼び出し失敗時は最小長フィルタを適用
"
" @param line String 行の内容
" @param lnum Number 行番号（1-indexed）
" @return List<Dictionary> 日本語単語データのリスト
function! s:detect_japanese_words(line, lnum) abort
  " TinySegmenterでセグメント化
  let l:segment_result = hellshake_yano_vim#japanese#segment(a:line)

  " セグメント化失敗時は空配列を返す
  if !l:segment_result.success || empty(l:segment_result.segments)
    return []
  endif

  let l:words = []
  let l:processed_positions = {}

  " 最小単語長を取得（g:hellshake_yano.japaneseMinWordLengthから、デフォルト: 3）
  let l:min_length = exists('g:hellshake_yano') && has_key(g:hellshake_yano, 'japaneseMinWordLength')
    \ ? g:hellshake_yano.japaneseMinWordLength
    \ : 3

  " 各セグメントの位置を計算
  " Phase D-6 Sub2 Fix: オフセット管理を見直し、重複を避けつつ全セグメントを正しく検出
  for l:segment in l:segment_result.segments
    " 空白のみのセグメントをスキップ
    if l:segment =~# '^\s\+$'
      continue
    endif

    " Phase D-7 Process4 Sub2: 辞書単語チェック
    " 辞書に含まれる単語は最小長チェックをスキップ
    let l:is_dict_word = s:is_in_dictionary(l:segment)

    " 最小単語長フィルタリング（Phase D-6 Process3 Sub2 閾値）
    " ただし、辞書単語はスキップ
    if !l:is_dict_word && strchars(l:segment) < l:min_length
      continue
    endif

    " セグメントの全出現位置を検索（UTF-8対応）
    " すでに処理済みの位置は避ける
    let l:search_offset = 0
    while 1
      let l:match_start = stridx(a:line, l:segment, l:search_offset)

      " 見つからない場合は次のセグメントへ
      if l:match_start == -1
        break
      endif

      " この位置がすでに処理済みかチェック
      if !has_key(l:processed_positions, l:match_start)
        " 単語データを作成（col と end_col はバイト位置で保持）
        " Phase D-6 Sub2 Fix: popup_create()はバイト位置（col()値）を期待
        let l:word_data = {
          \ 'text': l:segment,
          \ 'lnum': a:lnum,
          \ 'col': l:match_start + 1,
          \ 'end_col': l:match_start + len(l:segment) + 1
        \ }

        call add(l:words, l:word_data)

        " この位置を処理済みとしてマーク
        let l:processed_positions[l:match_start] = 1

        " 次のセグメントへ（同じセグメントの重複出現は検出しない）
        break
      endif

      " 次の出現位置を探す
      let l:search_offset = l:match_start + 1
    endwhile
  endfor

  return l:words
endfunction

" s:detect_english_words(line, lnum) - 英数字単語の検出
"
" 目的:
"   - matchstrpos()で英数字単語を検出
"   - 既存のロジックとの後方互換性を維持
"   - 辞書単語は最小長チェックをスキップ
"
" アルゴリズム:
"   1. matchstrpos()で英数字単語（\w\+）を順次検出
"   2. 座標計算（0-indexed → 1-indexed変換）
"   3. 辞書単語チェック
"   4. 最小長フィルタリング（辞書単語は除外）
"   5. 無限ループ防止チェック
"
" パフォーマンス:
"   - matchstrpos()は最適化された組み込み関数
"   - O(行の長さ) の線形時間処理
"
" @param line String 行の内容
" @param lnum Number 行番号（1-indexed）
" @return List<Dictionary> 英数字単語データのリスト
function! s:detect_english_words(line, lnum) abort
  " 最小単語長を取得（defaultMinWordLengthから、デフォルト: 3）
  " 注: 英数字は perKeyMinLength を使わず、defaultMinWordLength のみ使用
  let l:min_length = exists('g:hellshake_yano') && has_key(g:hellshake_yano, 'defaultMinWordLength')
    \ ? g:hellshake_yano.defaultMinWordLength
    \ : 3
  " 単語パターン: 英数字とアンダースコア
  let l:word_pattern = '\w\+'

  let l:words = []
  let l:start_pos = 0

  " 行内の全ての単語を検出
  while 1
    " matchstrpos() で単語を検出
    let l:match_result = matchstrpos(a:line, l:word_pattern, l:start_pos)
    let l:match_text = l:match_result[0]
    let l:match_start = l:match_result[1]
    let l:match_end = l:match_result[2]

    " マッチが見つからない場合はループ終了
    if l:match_start == -1
      break
    endif

    " Phase D-7 Process4 Sub2: 辞書単語チェック
    " 辞書に含まれる単語は最小長チェックをスキップ
    let l:is_dict_word = s:is_in_dictionary(l:match_text)

    " 最小単語長フィルタリング（辞書単語はスキップ）
    " 注: strchars()で文字数をカウント（マルチバイト文字対応）
    if !l:is_dict_word && strchars(l:match_text) < l:min_length
      " 次の検索開始位置を更新
      let l:start_pos = l:match_end
      continue
    endif

    " 単語データを作成（col と end_col はバイト位置で保持）
    " Phase D-6 Sub2 Fix: col()はバイト位置を返すため、1-indexedに変換するだけ
    let l:word_data = {
      \ 'text': l:match_text,
      \ 'lnum': a:lnum,
      \ 'col': l:match_start + 1,
      \ 'end_col': l:match_end + 1
    \ }

    " 配列に追加
    call add(l:words, l:word_data)

    " 次の検索開始位置を更新
    let l:start_pos = l:match_end

    " 安全のため、無限ループ防止チェック
    if l:start_pos >= len(a:line)
      break
    endif
  endwhile

  return l:words
endfunction

" s:detect_visible_local() - ローカル実装（フォールバック用）
"
" Phase D-6: Process3 Sub2 - 日本語対応拡張
" Phase D-7: Process4 Sub2 - Dictionary Integration (辞書統合)
"
" 目的:
"   - 画面内に表示されている範囲（line('w0') ～ line('w$')）の単語を検出
"   - 日本語を含む行はTinySegmenterでセグメント化
"   - 英数字のみの行は正規表現パターン \w\+ で検出
"   - 各単語の位置情報（text, lnum, col, end_col）を返す
"   - Phase D-7: 辞書に含まれる単語は最小長チェックをスキップ
"
" アルゴリズム:
"   1. 画面内の表示範囲（line('w0') ～ line('w$')）を取得
"   2. 各行に対して以下を実行:
"      a. getline() で行の内容を取得
"      b. has_japanese() で日本語を含むか判定
"      c-1. 日本語を含む場合: s:detect_japanese_words() でセグメント化
"      c-2. 英数字のみの場合: s:detect_english_words() で matchstrpos() 検出
"      d. 検出した単語の情報（text, lnum, col, end_col）を配列に追加
"   3. 全ての単語データを配列で返す
"
" データ構造:
"   返り値は以下の形式の Dictionary のリスト:
"   {
"     'text': 'hello',      " 単語文字列
"     'lnum': 10,           " 行番号（1-indexed）
"     'col': 5,             " 開始列（1-indexed）
"     'end_col': 10         " 終了列（matchstrposの戻り値、1-indexed）
"   }
"
" エラーハンドリング:
"   - 空のバッファでも安全に動作（line('w0') と line('w$') が同じになる）
"   - 単語が見つからない場合は空配列を返す
"   - 空行は自動的にスキップされる
"
" パフォーマンス特性:
"   - 時間計算量: O(L * W) - L: 画面内の行数、W: 行あたりの平均単語数
"   - matchstrpos() は最適化された組み込み関数を使用
"   - 画面内に限定することで大きなバッファでも高速動作（通常20-50行で数ミリ秒）
"
" @return List<Dictionary> 単語データのリスト
function! s:detect_visible_local() abort
  " 1. 画面内の表示範囲を取得
  let l:w0 = line('w0')
  let l:wlast = line('w$')

  " 空のバッファチェック
  if l:w0 < 1 || l:wlast < 1
    return []
  endif

  " 検出結果を格納する配列
  let l:words = []

  " 2. 各行を走査して単語を検出
  " Phase D-6: Process3 Sub2 - 日本語判定ロジック追加
  for l:lnum in range(l:w0, l:wlast)
    " 行の内容を取得
    let l:line = getline(l:lnum)

    " 空行スキップ
    if empty(l:line)
      continue
    endif

    " 日本語を含む行は TinySegmenter で処理
    if hellshake_yano_vim#japanese#has_japanese(l:line)
      " 日本語単語検出
      let l:japanese_words = s:detect_japanese_words(l:line, l:lnum)
      let l:words += l:japanese_words
    else
      " 英数字のみの行は既存ロジックで処理
      let l:english_words = s:detect_english_words(l:line, l:lnum)
      let l:words += l:english_words
    endif
  endfor

  " 3. 検出結果を返す
  return l:words
endfunction

" s:get_min_length_local() - ローカル実装（フォールバック用）
"
" Phase D-2 Sub2: Per-Key最小単語長機能
"
" 目的:
"   - perKeyMinLength設定から指定されたキーの最小単語長を取得
"   - perKeyMinLengthに設定がない場合はdefaultMinWordLengthにフォールバック
"   - どちらも未設定の場合はハードコードされたデフォルト値（3）を返す
"
" 設定の優先順位:
"   1. g:hellshake_yano.perKeyMinLength[key] （キー別設定）
"   2. g:hellshake_yano.defaultMinWordLength （デフォルト最小長）
"   3. 3 （ハードコード値）
"
" エラーハンドリング:
"   - perKeyMinLengthが辞書でない場合 → defaultMinWordLength を使用
"   - 0以下の値 → 次の優先度の設定を使用
"   - すべて未設定 → デフォルト値3を返す
"
" @param key String モーションキー（例: 'w', 'b', 'e', 'h', 'j', 'k', 'l'）
" @return Number 最小単語長
"
" 使用例:
"   let l:min_length = s:get_min_length_local('w')
"   " => 3 (perKeyMinLength.w が 3 の場合)
"
"   let l:min_length = s:get_min_length_local('h')
"   " => 2 (perKeyMinLengthに'h'がなく、defaultMinWordLengthが2の場合)
function! s:get_min_length_local(key) abort
  " Phase D-2 Sub2: Per-Key最小単語長設定の取得

  " デフォルト値（すべて未設定の場合）
  let l:default_value = 3

  " 設定を取得（存在しない場合は空の辞書）
  let l:config = get(g:, 'hellshake_yano', {})

  " 1. perKeyMinLengthからキー別設定を取得
  let l:per_key_min_length = get(l:config, 'perKeyMinLength', {})

  " perKeyMinLengthが辞書でない場合は使用しない
  if type(l:per_key_min_length) != type({})
    let l:per_key_min_length = {}
  endif

  " キー別設定が存在し、有効な値（1以上）であれば使用
  if has_key(l:per_key_min_length, a:key)
    let l:key_value = l:per_key_min_length[a:key]
    if type(l:key_value) == type(0) && l:key_value > 0
      return l:key_value
    endif
  endif

  " 2. defaultMinWordLengthにフォールバック
  let l:default_min_word_length = get(l:config, 'defaultMinWordLength', l:default_value)

  " defaultMinWordLengthが有効な値であればそれを返す
  if type(l:default_min_word_length) == type(0) && l:default_min_word_length > 0
    return l:default_min_word_length
  endif

  " 3. すべて未設定の場合はデフォルト値を返す
  return l:default_value
endfunction

" s:detect_multi_window_local(windows) - ローカル実装（フォールバック用）
"
" 目的:
"   - PLAN.md Process2 に基づき、複数ウィンドウから同時に単語を検出
"   - 各単語に winid と bufnr を付与して、ウィンドウ特定を可能にする
"   - 既存の detect_visible() 動作との完全な互換性を維持
"
" アルゴリズム:
"   1. windows 引数の各ウィンドウ情報を反復処理
"   2. 各ウィンドウの topline ～ botline の行を取得
"   3. getbufline() を使って指定バッファの行内容を取得
"   4. 日本語判定して s:detect_japanese_words() または s:detect_english_words() を呼び出し
"   5. 検出された各単語に winid と bufnr を付与
"   6. すべてのウィンドウの単語を集約して返す
"
" エラーハンドリング:
"   - 無効なウィンドウ情報は自動的にスキップ
"   - 空行は自動的にスキップ
"
" @param windows List ウィンドウ情報のリスト
"   各要素は辞書形式: {winid, bufnr, topline, botline, ...}
" @return List 単語リスト（各単語は {text, lnum, col, end_col, winid, bufnr} を含む）
function! s:detect_multi_window_local(windows) abort
  let l:all_words = []

  for l:wininfo in a:windows
    " バッファの行内容を取得
    let l:lines = getbufline(l:wininfo.bufnr, l:wininfo.topline, l:wininfo.botline)

    " 各行で単語検出
    for l:lnum_offset in range(len(l:lines))
      let l:line = l:lines[l:lnum_offset]
      let l:lnum = l:wininfo.topline + l:lnum_offset

      " 空行スキップ
      if empty(l:line)
        continue
      endif

      " 日本語/英数字判定
      if hellshake_yano_vim#japanese#has_japanese(l:line)
        let l:words = s:detect_japanese_words(l:line, l:lnum)
      else
        let l:words = s:detect_english_words(l:line, l:lnum)
      endif

      " ウィンドウIDとバッファ番号を追加
      for l:word in l:words
        let l:word.winid = l:wininfo.winid
        let l:word.bufnr = l:wininfo.bufnr
        call add(l:all_words, l:word)
      endfor
    endfor
  endfor

  return l:all_words
endfunction

let &cpo = s:save_cpo
unlet s:save_cpo
