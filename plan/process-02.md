# Process 2: displayHighlightPartialMatches + displayGetPopupCount 追加

## Overview
Neovim層 dispatcher に displayHighlightPartialMatches と displayGetPopupCount を追加する。
displayHighlightPartialMatches は入力中のヒント絞り込み表示、displayGetPopupCount は現在表示中のヒント数を返す。

## Affected Files
- `denops/hellshake-yano/main.ts` (Neovim層 dispatcher: Process 1 追加分の後に追加)
- Vim層参照: `main.ts:430-437` (displayHighlightPartialMatches), `main.ts:438-445` (displayGetPopupCount)

## Implementation Notes
- VimScript側呼び出し元:
  - `autoload/hellshake_yano_vim/display.vim:474` — displayHighlightPartialMatches (denops#request)
  - displayGetPopupCount — VimScript側からの直接呼び出し未確認（テスト/デバッグ用）
- displayHighlightPartialMatches: Neovim層では highlightCandidateHintsHybrid または highlightCandidateHintsAsyncInternal を使用
  - Vim層: VimPopupDisplay.highlightPartialMatches(matches) — matchesに含まれないヒントを非表示
  - Neovim層: extmark の virt_text を更新して一致するヒントのみ強調
- displayGetPopupCount: currentHints.length で代替可能
- 優先度: displayHighlightPartialMatches=中、displayGetPopupCount=低

---

## Red Phase: テスト作成と失敗確認

- [x] ブリーフィング確認
- [x] テストケースを作成（実装前に失敗確認）
  - displayHighlightPartialMatches が dispatcher に登録されていることを確認
  - displayGetPopupCount が正しいカウントを返すことを確認
- [x] テストを実行して失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [x] ブリーフィング確認
- [x] main.ts の initializeNeovimLayer 内 dispatcher に displayHighlightPartialMatches を追加
- [x] main.ts の initializeNeovimLayer 内 dispatcher に displayGetPopupCount を追加
- [x] Whyコメントを付与
- [x] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [x] コードの品質を改善
- [x] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: -
- Blocks: Process 10 (統合テスト)
