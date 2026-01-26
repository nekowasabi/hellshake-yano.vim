" tests-vim/hellshake_yano_vim/test_focus_restore.vim
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: RED
" Focus Restore Feature: 画面ちらつき問題の修正テスト
"
" このファイルは multiWindowMode=true 時の画面ちらつき問題を
" 修正するための機能をテストします。
"
" テスト対象:
"   - T1: config設定追加 (multiWindowRestoreDelay, multiWindowDetectFocusGained)
"   - T2: FocusGained検出 (s:focus_just_restored フラグ)
"   - T3: show_delayed関数
"   - T4: redraw最適化

" テストランナーをロード
if !exists('*RunTest')
  source <sfile>:h/test_runner.vim
endif

" ========================================
" T1: config設定追加のテスト
" ========================================

" Test_config_focus_restore_delay_default: 遅延設定のデフォルト値テスト
" 目的: multiWindowRestoreDelay のデフォルト値が 50 であることを検証
function! Test_config_focus_restore_delay_default() abort
  " グローバル変数をクリア
  if exists('g:hellshake_yano_vim_config')
    unlet g:hellshake_yano_vim_config
  endif

  " デフォルト値を取得
  let l:delay = hellshake_yano_vim#config#get('multiWindowRestoreDelay')

  " デフォルト値が 50 であることを検証
  call AssertEqual(50, l:delay,
    \ 'default multiWindowRestoreDelay should be 50')
endfunction

" Test_config_focus_restore_detect_default: FocusGained検出設定のデフォルト値テスト
" 目的: multiWindowDetectFocusGained のデフォルト値が true であることを検証
function! Test_config_focus_restore_detect_default() abort
  " グローバル変数をクリア
  if exists('g:hellshake_yano_vim_config')
    unlet g:hellshake_yano_vim_config
  endif

  " デフォルト値を取得
  let l:detect = hellshake_yano_vim#config#get('multiWindowDetectFocusGained')

  " デフォルト値が true であることを検証
  call AssertTrue(l:detect,
    \ 'default multiWindowDetectFocusGained should be true')
endfunction

" Test_config_focus_restore_delay_custom: 遅延設定のカスタム値テスト
" 目的: multiWindowRestoreDelay をカスタム値で設定できることを検証
function! Test_config_focus_restore_delay_custom() abort
  " カスタム値を設定
  let g:hellshake_yano_vim_config = {
    \ 'multiWindowRestoreDelay': 100
  \ }

  " カスタム値を取得
  let l:delay = hellshake_yano_vim#config#get('multiWindowRestoreDelay')

  " カスタム値が反映されていることを検証
  call AssertEqual(100, l:delay,
    \ 'custom multiWindowRestoreDelay should be 100')

  " クリーンアップ
  unlet g:hellshake_yano_vim_config
endfunction

" Test_config_focus_restore_detect_custom: FocusGained検出設定のカスタム値テスト
" 目的: multiWindowDetectFocusGained を無効化できることを検証
function! Test_config_focus_restore_detect_custom() abort
  " カスタム値を設定
  let g:hellshake_yano_vim_config = {
    \ 'multiWindowDetectFocusGained': v:false
  \ }

  " カスタム値を取得
  let l:detect = hellshake_yano_vim#config#get('multiWindowDetectFocusGained')

  " カスタム値が反映されていることを検証
  call AssertFalse(l:detect,
    \ 'custom multiWindowDetectFocusGained should be false')

  " クリーンアップ
  unlet g:hellshake_yano_vim_config
endfunction

" ========================================
" T2: FocusGained検出のテスト
" ========================================

" Test_focus_just_restored_flag_exists: フラグの存在テスト
" 目的: is_focus_just_restored() 関数が存在することを検証
function! Test_focus_just_restored_flag_exists() abort
  " 関数が存在することを検証
  let l:has_func = exists('*hellshake_yano_vim#core#is_focus_just_restored')
  call AssertTrue(l:has_func,
    \ 'hellshake_yano_vim#core#is_focus_just_restored() function should exist')
endfunction

" Test_focus_just_restored_initial_value: フラグの初期値テスト
" 目的: フォーカス復帰フラグの初期値が false であることを検証
function! Test_focus_just_restored_initial_value() abort
  " 初期化
  call hellshake_yano_vim#core#init()

  " フラグの値を取得
  let l:is_restored = hellshake_yano_vim#core#is_focus_just_restored()

  " 初期値が false であることを検証
  call AssertFalse(l:is_restored,
    \ 'focus_just_restored should be false initially')
endfunction

" Test_focus_gained_sets_flag: FocusGained時のフラグ設定テスト
" 目的: on_focus_gained() を呼び出すとフラグが true になることを検証
function! Test_focus_gained_sets_flag() abort
  " 初期化
  call hellshake_yano_vim#core#init()

  " FocusGained をシミュレート
  call hellshake_yano_vim#core#on_focus_gained()

  " フラグが true になっていることを検証
  let l:is_restored = hellshake_yano_vim#core#is_focus_just_restored()
  call AssertTrue(l:is_restored,
    \ 'focus_just_restored should be true after on_focus_gained()')
endfunction

" Test_focus_flag_resets_after_clear: フラグのクリアテスト
" 目的: clear_focus_flag() を呼び出すとフラグが false になることを検証
function! Test_focus_flag_resets_after_clear() abort
  " 初期化
  call hellshake_yano_vim#core#init()

  " FocusGained をシミュレート
  call hellshake_yano_vim#core#on_focus_gained()

  " フラグをクリア
  call hellshake_yano_vim#core#clear_focus_flag()

  " フラグが false になっていることを検証
  let l:is_restored = hellshake_yano_vim#core#is_focus_just_restored()
  call AssertFalse(l:is_restored,
    \ 'focus_just_restored should be false after clear_focus_flag()')
endfunction

" ========================================
" T3: show_delayed関数のテスト
" ========================================

" Test_show_delayed_function_exists: show_delayed関数の存在テスト
" 目的: show_delayed() 関数が存在することを検証
function! Test_show_delayed_function_exists() abort
  " 関数が存在することを検証
  let l:has_func = exists('*hellshake_yano_vim#core#show_delayed')
  call AssertTrue(l:has_func,
    \ 'hellshake_yano_vim#core#show_delayed() function should exist')
endfunction

" Test_show_delayed_immediate_when_not_restored: 通常時は即時実行
" 目的: フォーカス復帰直後でない場合は即時実行されることを検証
" Note: 実際のshow()呼び出しはモック化が困難なため、フラグ状態のみテスト
function! Test_show_delayed_immediate_when_not_restored() abort
  " 初期化
  call hellshake_yano_vim#core#init()

  " フラグが false であることを確認
  let l:is_restored = hellshake_yano_vim#core#is_focus_just_restored()
  call AssertFalse(l:is_restored,
    \ 'focus_just_restored should be false for immediate execution')
endfunction

" Test_show_delayed_deferred_when_restored: 復帰直後は遅延実行
" 目的: フォーカス復帰直後の場合は遅延実行されることを検証
function! Test_show_delayed_deferred_when_restored() abort
  " 初期化
  call hellshake_yano_vim#core#init()

  " FocusGained をシミュレート
  call hellshake_yano_vim#core#on_focus_gained()

  " フラグが true であることを確認
  let l:is_restored = hellshake_yano_vim#core#is_focus_just_restored()
  call AssertTrue(l:is_restored,
    \ 'focus_just_restored should be true for deferred execution')
endfunction

" ========================================
" T4: redraw最適化のテスト
" ========================================

" Test_should_redraw_function_exists: should_redraw関数の存在テスト
" 目的: should_redraw() 関数が存在することを検証
function! Test_should_redraw_function_exists() abort
  " 関数が存在することを検証
  let l:has_func = exists('*hellshake_yano_vim#core#should_redraw')
  call AssertTrue(l:has_func,
    \ 'hellshake_yano_vim#core#should_redraw() function should exist')
endfunction

" Test_should_redraw_true_normally: 通常時はredrawする
" 目的: フォーカス復帰直後でない場合は redraw すべきことを検証
function! Test_should_redraw_true_normally() abort
  " 初期化
  call hellshake_yano_vim#core#init()

  " redraw すべきかを取得
  let l:should_redraw = hellshake_yano_vim#core#should_redraw()

  " 通常時は true であることを検証
  call AssertTrue(l:should_redraw,
    \ 'should_redraw() should return true when not focus restored')
endfunction

" Test_should_redraw_false_when_restored: 復帰直後はredrawしない
" 目的: フォーカス復帰直後は redraw をスキップすべきことを検証
function! Test_should_redraw_false_when_restored() abort
  " 初期化
  call hellshake_yano_vim#core#init()

  " FocusGained をシミュレート
  call hellshake_yano_vim#core#on_focus_gained()

  " redraw すべきかを取得
  let l:should_redraw = hellshake_yano_vim#core#should_redraw()

  " 復帰直後は false であることを検証
  call AssertFalse(l:should_redraw,
    \ 'should_redraw() should return false when focus just restored')
endfunction

" ========================================
" 統合テスト
" ========================================

" Test_focus_restore_config_integration: 設定と機能の統合テスト
" 目的: 設定で無効化した場合、フラグが常に false であることを検証
function! Test_focus_restore_config_integration() abort
  " FocusGained検出を無効化
  let g:hellshake_yano_vim_config = {
    \ 'multiWindowDetectFocusGained': v:false
  \ }

  " 初期化
  call hellshake_yano_vim#core#init()

  " FocusGained をシミュレート（無効化されているので無視されるべき）
  call hellshake_yano_vim#core#on_focus_gained()

  " フラグは false のまま（設定で無効化されているため）
  let l:is_restored = hellshake_yano_vim#core#is_focus_just_restored()
  call AssertFalse(l:is_restored,
    \ 'focus_just_restored should remain false when detection disabled')

  " クリーンアップ
  unlet g:hellshake_yano_vim_config
endfunction

" このファイルを直接sourceした場合はテストを実行
if expand('<sfile>:p') ==# expand('%:p')
  echo 'Running test_focus_restore.vim (TDD)...'
  echo ''
  call RunAllTests()
endif
