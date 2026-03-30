# Process 1: displayShowHint + displayShowHintWithWindow 追加

## Overview
Neovim層 dispatcher に displayShowHint と displayShowHintWithWindow を追加する。
Vim層では VimPopupDisplay.showHint() にデリゲートしているが、Neovim層では extmark-display.ts の displayHintsAsync を使用する。

## Affected Files
- `denops/hellshake-yano/main.ts` (Neovim層 dispatcher: 714行付近に追加)
- Vim層参照: `main.ts:391-427` (displayShowHint), `main.ts:408-427` (displayShowHintWithWindow)

## Implementation Notes
- VimScript側呼び出し元:
  - `autoload/hellshake_yano_vim/display.vim:175` — displayShowHint (denops#request)
  - `autoload/hellshake_yano_vim/display.vim:300` — displayShowHintWithWindow (denops#request)
- Neovim層では VimPopupDisplay が利用不可。代わりに extmark-display.ts の関数を使用
- displayShowHint: 単一ヒントを extmark で表示（lnum, col, hint テキストを受け取る）
- displayShowHintWithWindow: winid を追加パラメータとして受け取る
- initializeNeovimLayer スコープ内の利用可能変数: denops, extmarkNamespace, fallbackMatchIds, currentHints, hintsVisible
- Vim層との戻り値互換性を維持すること

---

## Red Phase: テスト作成と失敗確認

- [x] ブリーフィング確認
- [x] テストケースを作成（実装前に失敗確認）
  - displayShowHint が dispatcher に登録されていることを確認
  - displayShowHintWithWindow が dispatcher に登録されていることを確認
  - 引数の型が Vim層と一致することを確認
- [x] テストを実行して失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [x] ブリーフィング確認
- [x] main.ts の initializeNeovimLayer 内 dispatcher に displayShowHint を追加
- [x] main.ts の initializeNeovimLayer 内 dispatcher に displayShowHintWithWindow を追加
- [x] Whyコメントを付与
- [x] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [x] 共通ロジックの抽出を検討
- [x] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: -
- Blocks: Process 10 (統合テスト)
