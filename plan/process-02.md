# Process 2: TextChanged 連動 invalidation（既存 autocmd 方式踏襲）

## Overview
Process 1 の配列キャッシュを `TextChanged` / `TextChangedI` / `BufLeave` で明示的に無効化する。autocmd の配置は**既存のプラグインの autocmd 設計**を踏襲し、新規 augroup を作らずに既存 augroup に合流させる。changedtick だけでは編集直後の同一 tick 内キャッシュが残る懸念があるため、明示無効化を併用する。

## Affected Files
- `plugin/hellshake-yano.vim` または `denops/hellshake-yano/main.ts` — 既存の autocmd 定義箇所を grep で特定
- `denops/hellshake-yano/neovim/core/core.ts` — `invalidateBufferCache(bufnr?: number)` メソッド追加
- `denops/hellshake-yano/main.ts` dispatcher — autocmd から呼び出すエンドポイント登録

## Implementation Notes
1. 事前調査: プラグイン内の既存 autocmd (`CursorMoved`, `BufEnter` 等) の配置場所を grep で特定 → 同じファイルの同じ augroup に TextChanged を追記
2. autocmd 定義例:
   ```vim
   augroup hellshake_yano_cache
     autocmd!
     autocmd TextChanged,TextChangedI * call denops#notify('hellshake-yano', 'invalidateBufferCache', [bufnr('%')])
     autocmd BufLeave * call denops#notify('hellshake-yano', 'invalidateBufferCache', [bufnr('%')])
   augroup END
   ```
3. Core.invalidateBufferCache(bufnr): `if (this.cachedBuffer?.bufnr === bufnr) this.cachedBuffer = null;`
4. debounce (50ms — 暫定値、Process 300 で別途実測調整): 連続編集での notify 氾濫を抑制。高速タイピング時の挙動は Process 101 の実測ログで確認（setTimeout + clearTimeout）
5. `denops#notify` は非同期なので Neovim 側は即時復帰

## Red Phase
- [ ] Process 11 のテストで TextChanged 通知→invalidate 連動を検証
- [ ] debounce 動作検証（fake timer）

✅ **Phase Complete**

## Green Phase
- [ ] 既存 augroup の特定 + 追記
- [ ] dispatcher 登録
- [ ] Core.invalidateBufferCache 実装
- [ ] debounce 実装

✅ **Phase Complete**

## Refactor Phase
- [ ] invalidate ログ（debug のみ）
- [ ] autocmd 重複定義の検出
- [ ] debounce 時間の実測チューニング（暫定 50ms → 適正値決定）

✅ **Phase Complete**

## Dependencies
- Requires: Process 1
- Blocks: Process 11, Process 13
