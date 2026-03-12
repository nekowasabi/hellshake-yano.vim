" tests-vim/phase1_integration_test.vim
" Process 18: Phase 1 統合テスト
"
" 目的: Process 10-17 で集約した21関数のブリッジ実装を統合検証
" フレームワーク: themis

let s:suite = themis#suite('phase1_integration')
let s:assert = themis#helper('assert')

" ========================================
" ヘルパー: Denops準備確認
" ========================================
function! s:skip_if_no_denops() abort
  if !hellshake_yano#utils#is_denops_ready()
    call themis#log('SKIP: Denops not available')
    return 1
  endif
  return 0
endfunction

" ========================================
" Process 10: config ブリッジ
" ========================================
function! s:suite.test_config_get_function_exists() abort
  call s:assert.equals(
    \ exists('*hellshake_yano#config#get'), 1,
    \ 'hellshake_yano#config#get should exist')
endfunction

function! s:suite.test_config_get_reads_global() abort
  let g:hellshake_yano = get(g:, 'hellshake_yano', {})
  let g:hellshake_yano['_test_key'] = 'test_value'
  let l:val = hellshake_yano#config#get('_test_key')
  call s:assert.equals(l:val, 'test_value', 'config#get should read from g:hellshake_yano')
  unlet g:hellshake_yano['_test_key']
endfunction

function! s:suite.test_config_set_function_exists() abort
  call s:assert.equals(
    \ exists('*hellshake_yano#config#set'), 1,
    \ 'hellshake_yano#config#set should exist')
endfunction

function! s:suite.test_config_set_no_crash_without_denops() abort
  " Denops未起動でもクラッシュしない
  if hellshake_yano#utils#is_denops_ready()
    call themis#log('SKIP: Denops is ready, skipping no-Denops test')
    return
  endif
  call hellshake_yano#config#set('debugMode', v:false)
  call s:assert.equals(1, 1, 'config#set should not crash without Denops')
endfunction

function! s:suite.test_config_reload_function_exists() abort
  call s:assert.equals(
    \ exists('*hellshake_yano#config#reload'), 1,
    \ 'hellshake_yano#config#reload should exist')
endfunction

function! s:suite.test_config_reload_no_crash_without_denops() abort
  if hellshake_yano#utils#is_denops_ready()
    call themis#log('SKIP: Denops is ready, skipping no-Denops test')
    return
  endif
  call hellshake_yano#config#reload()
  call s:assert.equals(1, 1, 'config#reload should not crash without Denops')
endfunction

" ========================================
" Process 11: dictionary ブリッジ
" ========================================
function! s:suite.test_dictionary_functions_exist() abort
  call s:assert.equals(exists('*hellshake_yano#dictionary#add'), 1,
    \ 'dictionary#add should exist')
  call s:assert.equals(exists('*hellshake_yano#dictionary#clear_cache'), 1,
    \ 'dictionary#clear_cache should exist')
  call s:assert.equals(exists('*hellshake_yano#dictionary#is_in_dictionary'), 1,
    \ 'dictionary#is_in_dictionary should exist')
  call s:assert.equals(exists('*hellshake_yano#dictionary#reload'), 1,
    \ 'dictionary#reload should exist')
  call s:assert.equals(exists('*hellshake_yano#dictionary#show'), 1,
    \ 'dictionary#show should exist')
  call s:assert.equals(exists('*hellshake_yano#dictionary#validate'), 1,
    \ 'dictionary#validate should exist')
endfunction

function! s:suite.test_dictionary_no_crash_without_denops() abort
  if hellshake_yano#utils#is_denops_ready()
    call themis#log('SKIP: Denops is ready')
    return
  endif
  call hellshake_yano#dictionary#clear_cache()
  call hellshake_yano#dictionary#reload()
  let l:r1 = hellshake_yano#dictionary#add('test')
  let l:r2 = hellshake_yano#dictionary#is_in_dictionary('test')
  let l:r3 = hellshake_yano#dictionary#validate()
  call s:assert.equals(1, 1, 'dictionary functions should not crash without Denops')
endfunction

" ========================================
" Process 12: hint_generator ブリッジ
" ========================================
function! s:suite.test_hint_generator_functions_exist() abort
  call s:assert.equals(exists('*hellshake_yano#hint_generator#generate'), 1,
    \ 'hint_generator#generate should exist')
  call s:assert.equals(exists('*hellshake_yano#hint_generator#clear_cache'), 1,
    \ 'hint_generator#clear_cache should exist')
  call s:assert.equals(exists('*hellshake_yano#hint_generator#get_min_word_length'), 1,
    \ 'hint_generator#get_min_word_length should exist')
endfunction

function! s:suite.test_hint_generator_no_crash_without_denops() abort
  if hellshake_yano#utils#is_denops_ready()
    call themis#log('SKIP: Denops is ready')
    return
  endif
  call hellshake_yano#hint_generator#clear_cache()
  let l:hints = hellshake_yano#hint_generator#generate(5)
  let l:len = hellshake_yano#hint_generator#get_min_word_length()
  call s:assert.equals(type(l:hints), v:t_list, 'generate should return list')
endfunction

" ========================================
" Process 13: japanese ブリッジ
" ========================================
function! s:suite.test_japanese_segment_exists() abort
  call s:assert.equals(exists('*hellshake_yano#japanese#segment'), 1,
    \ 'japanese#segment should exist')
endfunction

function! s:suite.test_japanese_segment_no_crash_without_denops() abort
  if hellshake_yano#utils#is_denops_ready()
    call themis#log('SKIP: Denops is ready')
    return
  endif
  let l:result = hellshake_yano#japanese#segment('テスト')
  call s:assert.equals(type(l:result), v:t_list, 'segment should return list')
endfunction

" ========================================
" Process 14: word_detector ブリッジ
" ========================================
function! s:suite.test_word_detector_functions_exist() abort
  call s:assert.equals(exists('*hellshake_yano#word_detector#detect_visible'), 1,
    \ 'word_detector#detect_visible should exist')
  call s:assert.equals(exists('*hellshake_yano#word_detector#detect_multi_window'), 1,
    \ 'word_detector#detect_multi_window should exist')
  call s:assert.equals(exists('*hellshake_yano#word_detector#get_min_length'), 1,
    \ 'word_detector#get_min_length should exist')
  call s:assert.equals(exists('*hellshake_yano#word_detector#detect_words_visible'), 1,
    \ 'word_detector#detect_words_visible should exist')
endfunction

function! s:suite.test_word_detector_no_crash_without_denops() abort
  if hellshake_yano#utils#is_denops_ready()
    call themis#log('SKIP: Denops is ready')
    return
  endif
  let l:words = hellshake_yano#word_detector#detect_visible()
  let l:len = hellshake_yano#word_detector#get_min_length()
  call s:assert.equals(type(l:words), v:t_list, 'detect_visible should return list')
endfunction

" ========================================
" Process 15: window_detector ブリッジ
" ========================================
function! s:suite.test_window_detector_get_visible_exists() abort
  call s:assert.equals(exists('*hellshake_yano#window_detector#get_visible'), 1,
    \ 'window_detector#get_visible should exist')
endfunction

function! s:suite.test_window_detector_no_crash_without_denops() abort
  if hellshake_yano#utils#is_denops_ready()
    call themis#log('SKIP: Denops is ready')
    return
  endif
  let l:wins = hellshake_yano#window_detector#get_visible()
  call s:assert.equals(type(l:wins), v:t_list, 'get_visible should return list')
endfunction

" ========================================
" Process 16: core ブリッジ
" ========================================
function! s:suite.test_core_bridge_functions_exist() abort
  call s:assert.equals(exists('*hellshake_yano#core#show'), 1,
    \ 'core#show should exist')
  call s:assert.equals(exists('*hellshake_yano#core#hide'), 1,
    \ 'core#hide should exist')
  call s:assert.equals(exists('*hellshake_yano#core#init'), 1,
    \ 'core#init should exist')
endfunction

" ========================================
" Process 17: motion ブリッジ同期
" ========================================
function! s:suite.test_motion_vim_functions_exist() abort
  call s:assert.equals(exists('*hellshake_yano_vim#motion#set_threshold'), 1,
    \ 'motion#set_threshold should exist')
  call s:assert.equals(exists('*hellshake_yano_vim#motion#set_timeout'), 1,
    \ 'motion#set_timeout should exist')
endfunction

function! s:suite.test_motion_set_threshold_no_crash_without_denops() abort
  if hellshake_yano#utils#is_denops_ready()
    call themis#log('SKIP: Denops is ready')
    return
  endif
  call hellshake_yano_vim#motion#set_threshold(3)
  call s:assert.equals(1, 1, 'set_threshold should not crash without Denops')
endfunction

function! s:suite.test_motion_set_timeout_no_crash_without_denops() abort
  if hellshake_yano#utils#is_denops_ready()
    call themis#log('SKIP: Denops is ready')
    return
  endif
  call hellshake_yano_vim#motion#set_timeout(300)
  call s:assert.equals(1, 1, 'set_timeout should not crash without Denops')
endfunction
