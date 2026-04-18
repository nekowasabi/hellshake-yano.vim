# Process 10: Process 1 ユニットテスト — getline 結果の配列キャッシュ化

## Overview
Process 1（getline 結果を changedtick 連動で配列キャッシュ）に対するユニットテスト。denops mock を使ってキャッシュ判定ロジックを検証し、cache hit/miss を確認する。

## Affected Files
- テスト新規: `denops/hellshake-yano/neovim/core/__tests__/buffer-cache_test.ts`
- 影響コード: `denops/hellshake-yano/neovim/core/core.ts:1015-1025` （cachedBuffer プロパティ・キャッシュ参照ロジック）
- 参考 mock: 既存 `__tests__/` 内の denops mock 実装を踏襲

## Implementation Notes
1. テストケース
   - **Case A**: 同一 bufnr + changedtick で 2 回 showHints → getline は 1 回のみ発火（2 回目は cache hit）
   - **Case B**: changedtick が 1→2 に変化 → cache miss で getline 再発行
   - **Case C**: bufnr が切り替わる → cache miss
   - **Case D**: hintPatterns=[] のとき getline 呼び出し自体が発生しない（既存挙動）
   - **Case E**: cached.lines が配列参照同値であること（copy 不要）
2. denops.call の getline 呼び出し回数をカウント、期待値と一致することを検証
3. Spy で denops.call（bufnr, getbufvar）の呼び出し履歴を記録して引数アサート

---

## Red Phase
- [ ] テストケース 5 件作成（上記 A〜E）
- [ ] `deno test denops/hellshake-yano/neovim/core/__tests__/buffer-cache_test.ts` で全失敗確認

✅ **Phase Complete**

---

## Green Phase
- [ ] Process 1 の実装完了後、テストが成功することを確認

✅ **Phase Complete**

---

## Refactor Phase
- [ ] mock 共通化 / テストフィクスチャ整理
- [ ] カバレッジ確認

✅ **Phase Complete**

---

## Dependencies
- Requires: Process 1
- Blocks: -
