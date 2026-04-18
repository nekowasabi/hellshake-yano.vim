# Process 300: OODA ポストモーテム

## Overview
Phase 1 完了後に振り返りを実施。6 サイクル要した原因分析・成功した観測駆動転換・Phase 2 以降への移行判断材料を stigmergy/lessons に記録し、将来の類似問題で再発しないように組織知化する。

## Affected Files
- `~/.claude/stigmergy/doctrine-learning/lessons.jsonl` — 教訓追加
- `~/.claude/stigmergy/doctrine-learning/patterns.json` — パターン追加（観測駆動デバッグ）
- `docs/postmortems/2026-04-18-hint-pipeline-phase1.md` — 新規ポストモーテム

## Implementation Notes
- 教訓の主要項目:
  1. 6 サイクル連続失敗の共通パターン: デバッグログ無しで推測修正を繰り返した
  2. 転換点: ユーザーから「デバッグ文を埋め込んで事実を確認すべき」の介入
  3. Phase 1 で導入した構造的ガード（branded types / skipOverlapDetection 統一 / applyHintPatterns 接続）
  4. 残課題（Phase 2 候補）: priorityRules ハードコード、キャッシュパスでの skipOverlap 未適用
- 推奨パターン化: 「観測 → 診断 → 修正」の観測ファースト手法を patterns.json に登録
- Why コメント必須: 教訓エントリ自体に「なぜこの教訓を残すか」を記述

---

## Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング確認
- [ ] ポストモーテム形式（Root Cause / Timeline / Lessons / Action Items）の雛形を確認
- [ ] lessons.jsonl のスキーマ確認（既存エントリ参照）

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [ ] ブリーフィング確認
- [ ] `docs/postmortems/2026-04-18-hint-pipeline-phase1.md` を作成
  - Root Cause: 二重経路未伝播 / applyHintPatterns dead code / 単位混在
  - Timeline: 6 サイクル失敗→観測介入→P1 成功
  - Lessons: 観測駆動デバッグ / 契約テストの重要性
  - Action Items: Phase 2 候補（priorityRules 設定化・キャッシュパス見直し）
- [ ] lessons.jsonl に 3 件教訓を追加
- [ ] patterns.json に「観測ファーストデバッグ」パターンを追加

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [ ] ポストモーテムのサマリーを /x コマンドの学習ゲートから参照可能に
- [ ] 類似問題の検索タグ（`hint-pipeline`, `observation-first`）付与

✅ **Phase Complete**

---

## Dependencies
- Requires: 50, 200
- Blocks: -
