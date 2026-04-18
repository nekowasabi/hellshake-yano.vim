# Process 101: debugLogFile による実測検証（before/after 定量比較）

## Overview
改修前後の debugLogFile を採取して、`PointE2/beforeAssign → PointC/entry` の wall-clock 差分が目標（<100ms/回）に収まっているかを実ユーザー環境で検証する。ベンチ（Process 13）は純 Deno 環境、こちらは実 Neovim + denops RPC 込みの確認。

## Affected Files
- `tmp/hellshake-debug-before.log` — 改修前ログ（既採取済み: 300-600ms）
- `tmp/hellshake-debug-after.log` — 改修後ログ（新規採取）
- ドキュメント: `docs/performance/dict-perf-report.md`（新規）に比較表

## Implementation Notes
1. 手順:
   a. 改修後の denops をビルド/リロード（`:DenopsRestart` 相当）
   b. 同一の大規模バッファ（44949 行 worklog 等）を開く
   c. `j/k` を 3 回連続してヒント発火、5 回繰り返し
   d. `tail -f /tmp/hellshake-debug-after.log` で記録
2. 解析: `PointE2/beforeAssign` と `PointC/entry` の ISO timestamp 差分を抽出（既存 awk スクリプト再利用）
3. 判定:
   - 平均 <100ms、最大 <200ms
   - 新 `[Timing/getline]` `[Timing/join]` `[Timing/applyHintPatterns]` の各値を記録
4. 失敗時: Process 1〜4 に差し戻し、追加最適化を検討

---

## Red Phase
- [ ] 改修前ログの再確認（baseline 値: avg ~450ms）

✅ **Phase Complete**

---

## Green Phase
- [ ] 改修後ログ採取
- [ ] 差分抽出 + レポート作成
- [ ] 目標達成確認

✅ **Phase Complete**

---

## Refactor Phase
- [ ] 抽出スクリプトを `scripts/analyze-dict-perf.sh` として保存
- [ ] 定期的に回帰検出できる仕組みを CI に組み込む（将来課題）

✅ **Phase Complete**

---

## Dependencies
- Requires: Process 100
- Blocks: Process 200
