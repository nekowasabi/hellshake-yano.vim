# Process 10: dispatcher 統合テスト

## Overview
Process 1-4 で追加した全関数が正しく dispatcher に登録され、VimScript側から呼び出し可能であることを統合テストで検証する。

## Affected Files
- テスト対象: `denops/hellshake-yano/main.ts` (Neovim層 dispatcher)
- 新規テスト: `tests/dispatcher_integration_test.ts` (新規作成)
- 既存テスト: `tests/hint_manager_test.ts`, `tests/motion_test.ts`

## Implementation Notes
- Vim層 dispatcher とNeovim層 dispatcher の関数名一覧を比較し、差分がないことを検証
- 各関数の引数型と戻り値型がVim層と一致することを確認
- deno test で実行可能な形式
- テスト対象関数:
  - displayShowHint, displayShowHintWithWindow (Process 1)
  - displayHighlightPartialMatches, displayGetPopupCount (Process 2)
  - displayHideAll (既に修正済み)
  - motionDetect (Process 3)
  - motionResetState, motionSetThreshold, motionSetTimeout, motionGetState (Process 4)

---

## Red Phase: テスト作成と失敗確認

- [x] ブリーフィング確認
- [x] dispatcher_integration_test.ts を作成
  - Vim層とNeovim層の関数名一覧比較テスト
  - 各関数が typeof "function" であることの確認
- [x] Process 1-4 が未実装の状態でテストが失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [x] ブリーフィング確認
- [x] Process 1-4 の実装完了後、全テストが通ることを確認
- [x] deno check でエラーがないことを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [x] テストケースの網羅性を確認
- [x] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: Process 1, Process 2, Process 3, Process 4
- Blocks: -
