# Process 11: Process 2 TextChanged invalidation テスト

## Overview
Process 2（TextChanged/TextChangedI/BufLeave autocmd による配列キャッシュ invalidation）の動作検証。dispatcher 登録と debounce 動作を確認する。

## Affected Files
- テスト新規: `denops/hellshake-yano/neovim/core/__tests__/cache-invalidation_test.ts`
- 影響コード: `denops/hellshake-yano/neovim/core/core.ts` の Core.invalidateBufferCache メソッド
- 参考: `plugin/hellshake-yano.vim` / `denops/hellshake-yano/main.ts` の既存 autocmd 配置

## Implementation Notes
1. テストケース
   - **Case A**: TextChanged 通知（denops#notify）→ Core.invalidateBufferCache 呼び出し → キャッシュ削除
   - **Case B**: 別 bufnr からの invalidate 通知 → 現在キャッシュの bufnr が異なれば無視
   - **Case C**: debounce 動作（連続 5 回 TextChanged 発火でも invalidate callback は ~1 回）
   - **Case D**: BufLeave で invalidate 呼び出し確認
   - **Case E**: dispatcher エンドポイント登録確認（invalidateBufferCache が callable）
2. fake timer を使用した debounce テスト
3. denops.notify mock で autocmd → dispatcher フロー検証

---

## Red Phase
- [ ] 上記 5 ケースでテスト失敗確認
- [ ] `deno test denops/hellshake-yano/neovim/core/__tests__/cache-invalidation_test.ts`

✅ **Phase Complete**

---

## Green Phase
- [ ] Process 2 実装完了後に成功確認

✅ **Phase Complete**

---

## Refactor Phase
- [ ] debounce タイマーのテスト安定化（fake timer 使用）

✅ **Phase Complete**

---

## Dependencies
- Requires: Process 2
- Blocks: -
