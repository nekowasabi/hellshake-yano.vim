# Process 1: getline 結果の配列キャッシュ化

## Overview
`showHints()` 毎に発火する `denops.call("getline", 1, "$")` の結果を `{bufnr, changedtick, lines: string[]}` としてキャッシュし、changedtick 一致時は RPC をスキップする。挙動変更なし（依然として全行対象）。配列のまま保持し `join("\n")` は Process 3 で廃止するため、キャッシュも配列形式とする。

## Affected Files
- `denops/hellshake-yano/neovim/core/core.ts:1015-1025` — getline 前にキャッシュ参照、キャッシュ保存
- `denops/hellshake-yano/neovim/core/core.ts` — Core クラスに `cachedBuffer: { bufnr: number, changedtick: number, lines: string[] } | null = null` を追加
- 参考: 既存の Core プロパティ初期化パターン（`denops/hellshake-yano/neovim/core/core.ts` の constructor 周辺）

## Implementation Notes
1. キャッシュ判定フロー:
   ```
   const bufnr = await denops.call("bufnr", "%") as number;
   const changedtick = await denops.call("getbufvar", bufnr, "changedtick") as number;
   if (this.cachedBuffer && this.cachedBuffer.bufnr === bufnr && this.cachedBuffer.changedtick === changedtick) {
     bufferLines = this.cachedBuffer.lines;  // cache hit
   } else {
     bufferLines = await denops.call("getline", 1, "$") as string[];
     this.cachedBuffer = { bufnr, changedtick, lines: bufferLines };
   }
   ```
2. `Promise.all` で bufnr と changedtick の取得を並列化
3. 配列をそのまま参照渡し（copy しない）— applyHintPatterns 内でも mutate しない前提
4. invalidate は Process 2 で実装（本 Process では時間ベース無効化なし、changedtick 変化のみで自然無効化）
5. Neovim の `changedtick` は編集のたびに増加する組み込みバッファ変数

## Red Phase
- [ ] Process 10 のテストで以下を検証
  - 同一 bufnr + changedtick で 2 回呼んで getline は 1 回のみ発火
  - changedtick 増加で cache miss
  - bufnr 切替で cache miss
- [ ] テスト失敗確認

✅ **Phase Complete**

## Green Phase
- [ ] Core.cachedBuffer プロパティ追加
- [ ] getline 前のキャッシュ参照ロジック
- [ ] 並列化 (Promise.all)
- [ ] テスト成功確認

✅ **Phase Complete**

## Refactor Phase
- [ ] キャッシュ操作をヘルパメソッド `getBufferLinesCached()` に抽出
- [ ] メモリ使用量ログ（debugMode のみ）

✅ **Phase Complete**

## Dependencies
- Requires: -
- Blocks: Process 2, Process 10, Process 13
