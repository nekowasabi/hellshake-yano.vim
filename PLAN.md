---
title: "dictionary機能によるヒント表示遅延の高速化"
status: planning
created: "2026-04-18"
---

# Commander's Intent

## Purpose
dictionary機能を有効化するとヒント表示 1 回あたり 300〜600ms の遅延が発生する。巨大バッファ（44,949行）実測ログから、主因は showHints 毎に発火する `getline(1,"$")` の全行 RPC 転送 + 全文 `join("\n")` であり、辞書マッチ本体 (`PointC/entry→exit`) はほぼ 0ms であると確定した。改修内容: (1) バッファテキストを changedtick 連動の配列キャッシュでスキップ、(2) join 廃止して行単位走査へ、(3) RegExp 事前コンパイルで内部解析コスト削減。可視領域限定せず全行対象のまま、ヒント表示体感速度を復元する。

## End State
- 辞書 ON 時のヒント表示所要が改修前比 70% 以上短縮（目標: <100ms/回 @ 44949行）
- 既存ヒント表示機能・辞書マッチ結果が回帰しない（既存 `__tests__/` と `tests/` 全通過）
- debugLogFile の wall-clock で before/after を定量比較できる

## Key Tasks
- getline 結果の配列キャッシュ化（changedtick 連動）（Process 1）
- TextChanged autocmd による配列キャッシュ invalidation（Process 2）
- 全パターン行単位走査化（join 廃止）+ RegExp 事前コンパイル（Process 3, 4）

## Constraints
- denops (TypeScript + Deno) / Deno.test ランナー、`deno.jsonc: test.include=["tests/"]`
- 既存 `denops/hellshake-yano/neovim/core/__tests__/` および `tests/` を全通過
- `deno fmt` / `deno check` / lint 通過必須
- denops RPC (`denops.call`) の非同期境界を前提とする

---

# Progress Map

| Process | Title | Status | File |
|---------|-------|--------|------|
| 1 | getline 結果の配列キャッシュ化 | ☐ planning | [→ plan/process-01.md](plan/process-01.md) |
| 2 | TextChanged 連動 invalidation（既存 autocmd 方式踏襲） | ☐ planning | [→ plan/process-02.md](plan/process-02.md) |
| 3 | 全パターン行単位走査（join 廃止） | ☐ planning | [→ plan/process-03.md](plan/process-03.md) |
| 4 | 正規表現の事前コンパイル化 | ☐ planning | [→ plan/process-04.md](plan/process-04.md) |
| 10 | Process 1 ユニットテスト | ☐ planning | [→ plan/process-10.md](plan/process-10.md) |
| 11 | Process 2 キャッシュ invalidation テスト | ☐ planning | [→ plan/process-11.md](plan/process-11.md) |
| 12 | Process 3 行単位走査テスト | ☐ planning | [→ plan/process-12.md](plan/process-12.md) |
| 13 | パフォーマンスベンチマーク | ☐ planning | [→ plan/process-13.md](plan/process-13.md) |
| 50 | Timing ログの整備 | ☐ planning | [→ plan/process-50.md](plan/process-50.md) |
| 100 | deno test / fmt / check 通過確認 | ☐ planning | [→ plan/process-100.md](plan/process-100.md) |
| 101 | debugLogFile による実測検証 | ☐ planning | [→ plan/process-101.md](plan/process-101.md) |
| 200 | README / CHANGELOG 更新 | ☐ planning | [→ plan/process-200.md](plan/process-200.md) |
| 300 | OODA 振り返り | ☐ planning | [→ plan/process-300.md](plan/process-300.md) |

**DAG**: `50 | {1→2, 3, 4} → {10,11,12} → 13 → 100 → 101 → 200 → 300`
**DAG凡例**: `{A,B}` = 並列実行可能、`A→B` = A完了後にB実行、`|` = 独立した依存チェーン
**Overall**: ☐ 0/13 completed

---

# References

| @ref | @target | @test |
|------|---------|-------|
| getline(1,"$") hot path | denops/hellshake-yano/neovim/core/core.ts:1015-1025 | denops/hellshake-yano/neovim/core/__tests__/ |
| loadUserDictionary 呼出 | denops/hellshake-yano/neovim/core/core.ts:1877,1960,2025,2090,2146,2165 | - |
| applyHintPatterns 本体 | denops/hellshake-yano/neovim/core/word.ts:1386-1458 | denops/hellshake-yano/neovim/core/__tests__/ |
| new RegExp 地点 | denops/hellshake-yano/neovim/core/word.ts:1192,1225,1239,1410 | - |
| findWordAtPosition | denops/hellshake-yano/neovim/core/word.ts:1490-1496 | - |
| 既存 autocmd 設計（TextChanged 既存配置の調査対象） | plugin/hellshake-yano.vim, denops/hellshake-yano/main.ts | - |
| 辞書型定義 | denops/hellshake-yano/neovim/dictionary.ts | - |

---

# Risks

| リスク | 対策 |
|--------|------|
| TextChanged autocmd の配置場所が既存設計と競合 | Process 2 で既存 autocmd の拡張点を事前に grep で確認、同じ augroup に統合 |
| RegExp 事前コンパイルで YAML 再読込・設定リロードに影響 | Process 4 で辞書ロード時に `compiled: RegExp` を付与、再読込時に再生成 |
