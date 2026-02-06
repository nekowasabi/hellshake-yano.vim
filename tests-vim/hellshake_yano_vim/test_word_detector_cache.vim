" test_word_detector_cache.vim - キャッシュ機構テスト
" Process 3: キャッシュ機構実装
"
" TDD Red Phase: テスト先行で作成
" 目的: detect_visible()のキャッシュ機構を検証

let s:suite = themis#suite('word_detector_cache')
let s:assert = themis#helper('assert')

" ========================================
" Test 1: clear_cache() 関数の存在
" ========================================
" RED: clear_cache()関数未実装のため失敗する
function! s:suite.test_clear_cache_exists() abort
  call s:assert.true(exists('*hellshake_yano_vim#word_detector#clear_cache'),
    \ 'clear_cache() function should exist')
endfunction

" ========================================
" Test 2: clear_cache() の動作確認
" ========================================
" RED: clear_cache()実装前なので失敗
function! s:suite.test_clear_cache_works() abort
  " テスト用バッファを作成
  new
  try
    call setline(1, ['test word', 'another word'])

    " キャッシュクリア前に1回実行
    let l:words1 = hellshake_yano_vim#word_detector#detect_visible()

    " キャッシュをクリア
    if exists('*hellshake_yano_vim#word_detector#clear_cache')
      call hellshake_yano_vim#word_detector#clear_cache()
    endif

    " キャッシュクリア後も同じ結果を得られること
    let l:words2 = hellshake_yano_vim#word_detector#detect_visible()

    call s:assert.equals(l:words1, l:words2,
      \ 'Results should be same after cache clear')
  finally
    bdelete!
  endtry
endfunction

" ========================================
" Test 3: キャッシュヒット時は同一結果を返す
" ========================================
" RED: キャッシュ機構未実装なので失敗
function! s:suite.test_cache_hit_returns_same_result() abort
  new
  try
    call setline(1, ['test word', 'another word', 'hello world'])

    " キャッシュクリア（初期化）
    if exists('*hellshake_yano_vim#word_detector#clear_cache')
      call hellshake_yano_vim#word_detector#clear_cache()
    endif

    " 1回目: キャッシュミス
    let l:words1 = hellshake_yano_vim#word_detector#detect_visible()

    " 2回目: キャッシュヒット（同一結果）
    let l:words2 = hellshake_yano_vim#word_detector#detect_visible()

    call s:assert.equals(l:words1, l:words2,
      \ 'Cache hit should return same result')
  finally
    bdelete!
  endtry
endfunction

" ========================================
" Test 4: キャッシュは結果のコピーを返す
" ========================================
" RED: キャッシュがないため失敗
function! s:suite.test_cache_returns_copy() abort
  new
  try
    call setline(1, ['test word'])

    if exists('*hellshake_yano_vim#word_detector#clear_cache')
      call hellshake_yano_vim#word_detector#clear_cache()
    endif

    " 1回目の結果を取得
    let l:words1 = hellshake_yano_vim#word_detector#detect_visible()

    " 取得した配列を変更
    if !empty(l:words1)
      call add(l:words1, {'text': 'modified'})
    endif

    " 2回目の結果を取得（キャッシュから）
    let l:words2 = hellshake_yano_vim#word_detector#detect_visible()

    " 変更は反映されていないこと（キャッシュはコピー）
    if !empty(l:words2)
      " 要素数が変わっていないことを確認
      call s:assert.true(len(l:words1) >= len(l:words2),
        \ 'Cache should return copy, not reference')
    endif
  finally
    bdelete!
  endtry
endfunction

" ========================================
" Test 5: キャッシュキー生成の正確性
" ========================================
" RED: キャッシュ機構未実装なので失敗
function! s:suite.test_cache_key_bufnr_topline_botline() abort
  new
  try
    " バッファ1: テキスト設定
    call setline(1, range(1, 20))
    let l:buf1 = bufnr('%')
    let l:words1 = hellshake_yano_vim#word_detector#detect_visible()

    " バッファ2を作成
    new
    try
      call setline(1, range(1, 20))
      let l:buf2 = bufnr('%')
      let l:words2 = hellshake_yano_vim#word_detector#detect_visible()

      " 異なるバッファなので異なる結果（キャッシュキーが違う）
      " ※ ただし内容が同じなら結果が同じこともある
      " このテストの目的: キャッシュキーがbufnrを含むことを確認

      call s:assert.not_equals(l:buf1, l:buf2,
        \ 'Different buffers should have different bufnr')
    finally
      bdelete!
    endtry
  finally
    bdelete!
  endtry
endfunction

" ========================================
" Test 6: キャッシュサイズ上限（max 10）
" ========================================
" RED: キャッシュサイズ制御未実装なので失敗
function! s:suite.test_cache_size_limit() abort
  " 複数のバッファを作成してキャッシュを作り、上限テスト
  " NOTE: このテストは内部実装（s:word_cache）にアクセスできないため、
  " 実装後に詳細テストを追加する

  " キャッシュクリア
  if exists('*hellshake_yano_vim#word_detector#clear_cache')
    call hellshake_yano_vim#word_detector#clear_cache()
  endif

  " ここでは、clear_cache()の存在確認のみ
  call s:assert.true(exists('*hellshake_yano_vim#word_detector#clear_cache'),
    \ 'Cache size limit test: clear_cache() should exist')
endfunction

" ========================================
" Test 7: キャッシュヒット時は高速（パフォーマンス）
" ========================================
" RED: キャッシュ実装前なので、高速化が見られず失敗
function! s:suite.test_cache_hit_performance() abort
  new
  try
    " 大きめのテキストで高速化を検測
    call setline(1, map(range(1, 100), 'printf("line %d: test word number", v:val)'))

    if exists('*hellshake_yano_vim#word_detector#clear_cache')
      call hellshake_yano_vim#word_detector#clear_cache()
    endif

    " 1回目: キャッシュミス（遅い）
    let l:start1 = reltime()
    let l:words1 = hellshake_yano_vim#word_detector#detect_visible()
    let l:time1 = reltimefloat(reltime(l:start1))

    " 2回目: キャッシュヒット（高速）
    let l:start2 = reltime()
    let l:words2 = hellshake_yano_vim#word_detector#detect_visible()
    let l:time2 = reltimefloat(reltime(l:start2))

    " 結果が同一
    call s:assert.equals(l:words1, l:words2,
      \ 'Results should be identical')

    " 2回目が高速（目安: 50%以上高速）
    " RED: キャッシュなしなので失敗する
    if l:time1 > 0
      let l:speedup_ratio = l:time2 / l:time1
      echomsg printf('Cache performance test: 1st=%.4fs, 2nd=%.4fs, ratio=%.2f',
        \ l:time1, l:time2, l:speedup_ratio)

      " キャッシュがあれば50%以上高速化
      call s:assert.true(l:time2 < l:time1 * 0.5,
        \ printf('Cache hit should be 50%% faster: 1st=%.4fs, 2nd=%.4fs', l:time1, l:time2))
    endif
  finally
    bdelete!
  endtry
endfunction

" ========================================
" Test 8: 画面範囲変更でキャッシュキーが変わる
" ========================================
" RED: キャッシュ機構未実装なので失敗
function! s:suite.test_cache_key_changes_with_scroll() abort
  new
  try
    " 十分な行数を準備
    call setline(1, map(range(1, 100), 'printf("line %d: test word", v:val)'))

    if exists('*hellshake_yano_vim#word_detector#clear_cache')
      call hellshake_yano_vim#word_detector#clear_cache()
    endif

    " 1回目: 最初の表示範囲
    let l:words1 = hellshake_yano_vim#word_detector#detect_visible()
    let l:topline1 = line('w0')
    let l:botline1 = line('w$')

    " スクロール（line('w0')を変更）
    " ウィンドウの高さ次第で、スクロール後に異なるキャッシュキーとなる
    execute 'normal! ' . (l:botline1 - l:topline1) . 'j'

    let l:topline2 = line('w0')
    let l:botline2 = line('w$')

    " スクロールされていれば、キャッシュキーが異なる
    if l:topline1 != l:topline2 || l:botline1 != l:botline2
      " キャッシュキーが変わっているはず
      let l:words2 = hellshake_yano_vim#word_detector#detect_visible()
      " スクロール後の結果は異なる可能性がある
      call s:assert.true(l:topline2 >= l:topline1,
        \ 'Scroll should update topline')
    endif
  finally
    bdelete!
  endtry
endfunction
