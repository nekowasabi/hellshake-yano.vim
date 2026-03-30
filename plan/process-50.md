# Process 50: VimScript denops#notify 安全化

## Overview
VimScript側で denops#notify（fire-and-forget）で dispatcher 関数を呼んでいる箇所を特定し、エラーが表面化しないよう安全化する。displayHideAll のエラーが表面化した根本原因への対策。

## Affected Files
- `autoload/hellshake_yano_vim/core.vim:631` — denops#notify → try-catch 付き denops#request に変更検討
- その他 denops#notify で dispatcher 関数を呼んでいる箇所の洗い出し

## Implementation Notes
- **問題の本質**: denops#notify はエラーハンドリングなしの fire-and-forget
  - dispatcher に関数がない場合、エラーがユーザーに表示される
  - denops#request + try-catch ならフォールバック可能
- core.vim:631 の `denops#notify('hellshake-yano', 'displayHideAll', [])`:
  - 選択肢A: denops#request + try-catch に変更（安全だが同期呼び出しになる）
  - 選択肢B: denops#notify のまま維持し、dispatcher 側で全関数登録を保証（Process 1-4 で実現）
  - 推奨: 選択肢B（Process 1-4 完了で解決）+ 防御的に try-catch 追加
- hide() は UI 操作完了通知なので非同期 (notify) でも問題ないが、エラー表面化防止のため silent 化を検討
- VimScript側の denops#notify 呼び出し箇所を全検索して一覧化する

---

## Red Phase: テスト作成と失敗確認

- [x] ブリーフィング確認
- [x] VimScript テストで denops#notify のエラーハンドリングを確認
  - dispatcher に存在しない関数を denops#notify で呼んだ場合の挙動テスト
- [x] テストを実行して失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [x] ブリーフィング確認
- [x] core.vim:631 の denops#notify を silent 化（try-catch または silent! 付与）
- [x] 他の denops#notify 呼び出し箇所を確認し、必要に応じて同様の対策
- [x] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [x] denops#notify vs denops#request の使い分けガイドラインをコメントで記録
- [x] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: Process 1, Process 2, Process 3, Process 4 (dispatcher 側の関数登録が前提)
- Blocks: -
