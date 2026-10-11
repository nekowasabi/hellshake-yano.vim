" autoload/hellshake_yano_vim/dictionary.vim
" Phase D-7 Process4 Sub1: Denops Dictionary Wrapper
"
" Denops辞書システムへのVimScriptラッパー
" Denops側の完全な辞書実装（core.ts:1529-1745, word.ts:936-1142）を活用
"
" 【設計】
" - Denops APIへの軽量なラッパー層として実装
" - キャッシュによるパフォーマンス最適化（LRU相当）
" - エラーハンドリング統一（全関数でDenops利用可否をチェック）
" - 後方互換性維持（Denops未起動時も正常動作）

" ==============================================================================
" Internal Variables
" ==============================================================================

" 簡易キャッシュ（辞書単語の高速ルックアップ用）
let s:cache = {
  \ 'words': {},
  \ 'loaded': v:false,
  \ 'last_reload': 0
  \ }

" 警告メッセージ表示済みフラグ
let s:warn_shown = 0

" ==============================================================================
" Private Functions
" ==============================================================================

" Denopsエラーメッセージを表示（内部用）
" @param operation: 操作名（'reload', 'add'等）
" @param exception: 例外メッセージ
function! s:show_denops_error(operation, exception) abort
  echoerr '[Dictionary] ' . a:operation . ' failed: ' . a:exception
endfunction

" ==============================================================================
" Public API
" ==============================================================================

" Denops利用可能チェック
" @return v:true: Denops利用可能 / v:false: 利用不可
function! hellshake_yano_vim#dictionary#has_denops() abort
  if hellshake_yano_vim#backend#is_native()
    return v:true
  endif
  if !exists('*denops#plugin#is_loaded')
    return v:false
  endif
  try
    return denops#plugin#is_loaded('hellshake-yano') ? v:true : v:false
  catch
    return v:false
  endtry
endfunction

" 辞書再読み込み
" @return v:true: 成功 / v:false: 失敗
function! hellshake_yano_vim#dictionary#reload() abort
  if !hellshake_yano_vim#dictionary#has_denops()
    call s:show_denops_error('reload', 'Denops not available')
    return v:false
  endif

  try
    call hellshake_yano_vim#backend#request('hellshake-yano', 'reloadDictionary', [])
    let s:cache.loaded = v:true
    let s:cache.last_reload = localtime()
    echo '[Dictionary] Reloaded successfully'
    return v:true
  catch
    call s:show_denops_error('reload', v:exception)
    return v:false
  endtry
endfunction

" 辞書に単語追加
" @param word: 追加する単語
" @param meaning: 意味（省略可、デフォルト: ''）
" @param type: タイプ（省略可、デフォルト: 'custom'）
" @return v:true: 成功 / v:false: 失敗
function! hellshake_yano_vim#dictionary#add(word, ...) abort
  if !hellshake_yano_vim#dictionary#has_denops()
    call s:show_denops_error('add', 'Denops not available')
    return v:false
  endif

  let l:meaning = a:0 >= 1 ? a:1 : ''
  let l:type = a:0 >= 2 ? a:2 : 'custom'

  try
    call hellshake_yano_vim#backend#request('hellshake-yano', 'addToDictionary', [a:word, l:meaning, l:type])
    " キャッシュに追加（即時反映）
    let s:cache.words[a:word] = {'meaning': l:meaning, 'type': l:type}
    echo '[Dictionary] Added: ' . a:word
    return v:true
  catch
    call s:show_denops_error('add', v:exception)
    return v:false
  endtry
endfunction

" 辞書表示
" @return v:true: 成功 / v:false: 失敗
function! hellshake_yano_vim#dictionary#show() abort
  if !hellshake_yano_vim#dictionary#has_denops()
    call s:show_denops_error('show', 'Denops not available')
    return v:false
  endif

  try
    let l:result = hellshake_yano_vim#backend#request('hellshake-yano', 'showDictionary', [])
    " 結果をエコー表示（Denops側で整形済み）
    echo l:result
    return v:true
  catch
    call s:show_denops_error('show', v:exception)
    return v:false
  endtry
endfunction

" 辞書検証
" @return v:true: 検証成功 / v:false: 検証失敗またはエラー
function! hellshake_yano_vim#dictionary#validate() abort
  if !hellshake_yano_vim#dictionary#has_denops()
    call s:show_denops_error('validate', 'Denops not available')
    return v:false
  endif

  try
    let l:result = hellshake_yano_vim#backend#request('hellshake-yano', 'validateDictionary', [])
    echo '[Dictionary] Validation: ' . (l:result ? 'OK' : 'FAILED')
    return l:result
  catch
    call s:show_denops_error('validate', v:exception)
    return v:false
  endtry
endfunction

" 単語が辞書に含まれるかチェック（高速キャッシュ活用）
"
" word_detector.vimから高頻度で呼ばれるため、パフォーマンス最適化を実施：
" - キャッシュヒット時: O(1)の辞書ルックアップ
" - キャッシュミス時: Denops呼び出し → 結果をキャッシュ
" - エラー時: 警告を1回のみ表示してv:falseを返す（パフォーマンス重視）
"
" @param word: チェックする単語
" @return v:true: 辞書に含まれる / v:false: 含まれないまたはエラー
function! hellshake_yano_vim#dictionary#is_in_dictionary(word) abort
  if !hellshake_yano_vim#dictionary#has_denops()
    return v:false
  endif

  " キャッシュチェック（高速パス）
  if has_key(s:cache.words, a:word)
    return v:true
  endif

  " Denops経由でチェック（遅いパス）
  try
    let l:result = hellshake_yano_vim#backend#request('hellshake-yano', 'isInDictionary', [a:word])
    if l:result
      " キャッシュに追加（次回からO(1)）
      let s:cache.words[a:word] = {'cached': 1}
    endif
    return l:result ? v:true : v:false
  catch
    " Denops呼び出しが失敗した場合は静かにv:falseを返す
    " 初回失敗時（起動直後のコマンド未登録状態）のみフラグを設定
    if !s:warn_shown
      let s:warn_shown = 1
    endif
    " エラーメッセージを出さずにv:falseを返す（辞書にない単語として扱う）
    return v:false
  endtry
endfunction

" キャッシュクリア（デバッグ・テスト用）
" 辞書再読み込み後や、テスト環境で明示的にキャッシュをクリアする場合に使用
function! hellshake_yano_vim#dictionary#clear_cache() abort
  let s:cache = {
    \ 'words': {},
    \ 'loaded': v:false,
    \ 'last_reload': 0
    \ }
  let s:warn_shown = 0
  echo '[Dictionary] Cache cleared'
endfunction
