# Process 100: 全体回帰 + lint + typecheck

## Overview
Process 1/2/3/10/11/12 の変更が既存テスト（62+ ファイル）を破壊しないことを確認し、Phase 1 全体の品質ゲートを通過させる。deno check / deno test / deno lint を一括実行する。

## Affected Files
- `tests/**/*.ts` — 全テストファイル
- `deno.json` — タスク定義確認
- `denops/hellshake-yano/**/*.ts` — 全本体

## Implementation Notes
- 実行順序:
  1. `deno lint denops/ tests/`
  2. `deno check denops/hellshake-yano/**/*.ts tests/**/*.ts`
  3. `deno test --allow-all tests/` （並列度デフォルト）
- 失敗時は該当 Process に戻って修正（P1/P2/P3 のいずれか）
- 既存回帰テスト（下記）が全て緑であること:
  - `tests/both_min_word_length_test.ts`
  - `tests/regression_*_test.ts`
  - `tests/hint_overlap_test.ts`
  - `tests/cursor_position_test.ts`
- 新規テスト（Process 10/11/12 で追加）も全て緑
- Why コメント不要（検証フェーズのため）

---

## Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング確認
- [ ] 現状（Process 1/2/3 適用状態）で `deno test` を実行し、失敗箇所があれば一覧化

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [ ] ブリーフィング確認
- [ ] lint 修正（該当 Process に戻す）
- [ ] typecheck 修正（主に Process 3 の cast 漏れ）
- [ ] 失敗テスト修正（該当 Process に戻す）
- [ ] 3 コマンド全て成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [ ] deno.json に `task phase1-verify` を追加して再実行容易化
- [ ] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 10, 11, 12
- Blocks: 50, 200
