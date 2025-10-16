" autoload/hellshake_yano_vim/jump.vim - ジャンプ機能
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: GREEN
" Process5: ジャンプ機能の実装
"
" 責務:
"   - カーソルを指定座標に移動
"   - 座標の妥当性検証（範囲チェック）
"   - エラーハンドリング

" スクリプトスコープのガード
let s:save_cpo = &cpo
set cpo&vim

" hellshake_yano_vim#jump#to: カーソルを指定座標にジャンプ
"
" 目的:
"   - ユーザーがヒントを選択した際に、対応する位置へカーソルを移動
"   - 座標の妥当性を厳密に検証し、範囲外へのジャンプを防ぐ
"
" @param a:lnum (Number): ジャンプ先の行番号（1-indexed）
" @param a:col (Number): ジャンプ先の列番号（1-indexed）
" @return void
" @throws エラーメッセージ（無効な座標の場合）
"
" 機能:
"   - カーソルを指定された行・列に移動（cursor() 関数を使用）
"   - 行番号と列番号の妥当性を検証
"   - 範囲外の座標が指定された場合は詳細なエラーメッセージと共に例外を投げる
"   - 型チェック（lnum, col が数値型であることを確認）
"
" 範囲チェック:
"   - 行番号: 1 <= lnum <= line('$')（バッファの最終行まで）
"   - 列番号: 1 <= col（列番号の上限チェックは cursor() に任せる）
"
" 使用例:
"   call hellshake_yano_vim#jump#to(10, 5)  " 10行5列にジャンプ
"   call hellshake_yano_vim#jump#to(1, 1)   " バッファの先頭にジャンプ
"
" エラーハンドリング:
"   - 型が不正: 'lnum and col must be numbers'
"   - 行番号が1未満: 'invalid line number %d (must be >= 1)'
"   - 行番号が最終行を超える: 'invalid line number %d (must be <= %d)'
"   - 列番号が1未満: 'invalid column number %d (must be >= 1)'
"   - cursor() 失敗: 'failed to move cursor to (%d, %d)'
"
" 注意事項:
"   - Vim/Neovim 共通で動作（cursor() 関数は両方で利用可能）
"   - カーソル移動後の画面スクロールは自動的に行われる
function! hellshake_yano_vim#jump#to(lnum, col) abort
  " 引数の型チェック（念のため）
  if type(a:lnum) != v:t_number || type(a:col) != v:t_number
    throw 'hellshake_yano_vim#jump#to: lnum and col must be numbers'
  endif

  " 行番号の範囲チェック
  let l:max_line = line('$')

  if a:lnum < 1
    throw printf('hellshake_yano_vim#jump#to: invalid line number %d (must be >= 1)', a:lnum)
  endif

  if a:lnum > l:max_line
    throw printf('hellshake_yano_vim#jump#to: invalid line number %d (must be <= %d)', a:lnum, l:max_line)
  endif

  " 列番号の範囲チェック
  if a:col < 1
    throw printf('hellshake_yano_vim#jump#to: invalid column number %d (must be >= 1)', a:col)
  endif

  " カーソルを移動
  " cursor() 関数は (lnum, col) の形式で座標を受け取る
  " 戻り値: 0 = 成功、-1 = 失敗（ただし範囲チェック済みなので通常は成功）
  let l:result = cursor(a:lnum, a:col)

  if l:result == -1
    " cursor() が失敗した場合（通常は発生しないはず）
    throw printf('hellshake_yano_vim#jump#to: failed to move cursor to (%d, %d)', a:lnum, a:col)
  endif
endfunction

" スクリプトスコープのリストア
let &cpo = s:save_cpo
unlet s:save_cpo
