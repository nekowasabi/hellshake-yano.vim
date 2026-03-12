" autoload/hellshake_yano/input.vim
" Denopsブリッジ層 - input操作
" Process 66: input#get_partial_matches

" hellshake_yano#input#get_partial_matches() - 部分マッチ取得 (Process 66)
"
" highlightCandidateHints の戻り値から partialMatches を取得する。
" @return List 部分マッチするヒント文字リスト
function! hellshake_yano#input#get_partial_matches() abort
  if hellshake_yano#utils#is_denops_ready()
    let result = denops#request('hellshake-yano', 'getPartialMatches', [])
    if type(result) == v:t_list
      return result
    endif
  endif
  return []
endfunction
