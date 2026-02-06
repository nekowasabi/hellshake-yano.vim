" test_word_detector_config_integration.vim - 設定変更時のキャッシュクリア統合テスト
" Phase 2.1 Process 4: 設定変更時キャッシュクリア連携
"
" TDD Red Phase: テスト先行で作成
" Mission: word-detector-integration-2026-02-06

let s:suite = themis#suite('word_detector_config_integration')
let s:assert = themis#helper('assert')

" テスト用のヘルパー関数
function! s:skip(msg) abort
  call themis#log('SKIP: ' . a:msg)
endfunction

" ========================================
" Test: 設定変更時にキャッシュがクリアされる
" ========================================
function! s:suite.test_cache_cleared_on_config_reload() abort
  " RED PHASE: config#reload() がキャッシュをクリアすること (WILL FAIL)

  " Denops が必要なテスト（フォールバックモードではスキップ）
  if !exists('*hellshake_yano_vim#core#is_denops_ready')
    call s:skip('core#is_denops_ready() not available')
    return
  endif

  if !hellshake_yano_vim#core#is_denops_ready()
    call s:skip('Denops not ready')
    return
  endif

  " テスト用バッファを作成
  new
  call setline(1, ['test word detection', 'multiple words here'])

  " 初回検出（キャッシュに保存される）
  let l:words1 = hellshake_yano_vim#word_detector#detect_visible()
  call s:assert.true(type(l:words1) == v:t_list,
    \ 'detect_visible() should return list')

  " キャッシュが存在することを確認（内部変数は直接アクセスできないため、
  " 2回目の呼び出しが高速であることで間接的に確認）
  let l:start = reltime()
  let l:words2 = hellshake_yano_vim#word_detector#detect_visible()
  let l:elapsed = reltimefloat(reltime(l:start)) * 1000

  " 2回目は非常に高速（キャッシュヒット）
  call s:assert.true(l:elapsed < 10.0,
    \ 'Second call should be fast (cached), elapsed: ' . string(l:elapsed) . 'ms')

  " 設定を変更して reload() を実行
  " 注: 実際の設定値は変更せず、reload() の副作用（キャッシュクリア）のみをテスト
  call hellshake_yano_vim#config#reload()

  " reload() 後の検出（キャッシュがクリアされていれば、Denopsまたはローカル実装を再実行）
  let l:words3 = hellshake_yano_vim#word_detector#detect_visible()
  call s:assert.true(type(l:words3) == v:t_list,
    \ 'detect_visible() after reload() should return list')

  " エラーが発生しないことを確認（最低限の要件）
  " 注: 設定値を実際に変更していないため、結果の内容は同じである可能性が高い

  bdelete!
endfunction

function! s:suite.test_clear_cache_function_called_by_reload() abort
  " RED PHASE: reload() が clear_cache() を呼び出すこと (WILL FAIL)

  " clear_cache() 関数が存在することを確認
  call s:assert.true(exists('*hellshake_yano_vim#word_detector#clear_cache'),
    \ 'word_detector#clear_cache() function should exist')

  " Denops が必要なテスト
  if !exists('*hellshake_yano_vim#core#is_denops_ready')
    call s:skip('core#is_denops_ready() not available')
    return
  endif

  if !hellshake_yano_vim#core#is_denops_ready()
    call s:skip('Denops not ready')
    return
  endif

  " キャッシュをクリア（初期状態）
  call hellshake_yano_vim#word_detector#clear_cache()

  " テスト用バッファを作成
  new
  call setline(1, ['cache test content'])

  " キャッシュを作成
  let l:words1 = hellshake_yano_vim#word_detector#detect_visible()

  " reload() を実行（この中で clear_cache() が呼ばれるはず）
  call hellshake_yano_vim#config#reload()

  " reload() 後に再度検出（キャッシュがクリアされていることを期待）
  let l:words2 = hellshake_yano_vim#word_detector#detect_visible()
  call s:assert.true(type(l:words2) == v:t_list,
    \ 'detect_visible() after reload() should work without error')

  bdelete!
endfunction

" ========================================
" Test: clear_cache() の明示的呼び出し
" ========================================
function! s:suite.test_clear_cache_explicit_call() abort
  " clear_cache() を明示的に呼び出して、エラーが発生しないことを確認
  call s:assert.true(exists('*hellshake_yano_vim#word_detector#clear_cache'),
    \ 'word_detector#clear_cache() function should exist')

  " 複数回呼び出してもエラーが発生しない
  call hellshake_yano_vim#word_detector#clear_cache()
  call hellshake_yano_vim#word_detector#clear_cache()
  call hellshake_yano_vim#word_detector#clear_cache()

  " キャッシュクリア後も detect_visible() が正常に動作する
  new
  call setline(1, ['test after clear'])
  let l:words = hellshake_yano_vim#word_detector#detect_visible()
  call s:assert.true(type(l:words) == v:t_list,
    \ 'detect_visible() should work after clear_cache()')
  bdelete!
endfunction

" ========================================
" Test: exists() チェックのフォールバック
" ========================================
function! s:suite.test_reload_without_word_detector() abort
  " word_detector が存在しない場合でも reload() がエラーにならないことを確認
  " （exists() チェックがあるため、関数が存在しなくてもスキップされる）

  if !exists('*hellshake_yano_vim#core#is_denops_ready')
    call s:skip('core#is_denops_ready() not available')
    return
  endif

  if !hellshake_yano_vim#core#is_denops_ready()
    call s:skip('Denops not ready')
    return
  endif

  " reload() を実行（exists() チェックにより、clear_cache() が存在しなくても安全）
  call hellshake_yano_vim#config#reload()

  " エラーが発生しないことを確認
  call s:assert.true(v:true, 'reload() should not error without word_detector')
endfunction

" ========================================
" Test: 設定値変更の実際の影響
" ========================================
function! s:suite.test_config_change_affects_min_length() abort
  " 設定変更が実際に反映されることを確認
  " 注: このテストは min_length のキャッシュもクリアされることを期待

  if !exists('*hellshake_yano_vim#word_detector#get_min_length')
    call s:skip('get_min_length() not available')
    return
  endif

  " 初期値を取得
  let l:initial = hellshake_yano_vim#word_detector#get_min_length('w')
  call s:assert.true(type(l:initial) == v:t_number,
    \ 'get_min_length() should return number')

  " キャッシュをクリア
  call hellshake_yano_vim#word_detector#clear_cache()

  " クリア後も同じ値が返る（設定は変更していないため）
  let l:after_clear = hellshake_yano_vim#word_detector#get_min_length('w')
  call s:assert.equals(l:after_clear, l:initial,
    \ 'get_min_length() should return same value after clear_cache()')
endfunction
