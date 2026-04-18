---
title: "ヒント表示パイプライン Phase 1 再設計"
status: planning
created: "2026-04-18"
---

# Commander's Intent

## Purpose
6 サイクル要した dropped=123/133 と PointD prioritizedCount=0 の根本原因（二重経路の設定漏れ・applyHintPatterns 未接続・col/line 単位混在）を一括解消し、辞書ルールを実機能として成立させる。

## End State
辞書ルールが有効に作用し、extmark エラー 0 / overlap 削除 0 / 型レベルで col/line 単位混在不可能な状態。

## Key Tasks
- 二重経路統一: `extmark-display.ts:77-80` と `:722-725` に `skipOverlapDetection:true` を伝播
- `applyHintPatterns` を `showHintsInternal` パイプラインに接続（PointD prioritizedCount>0 を実現）
- `ByteCol`/`CharCol`/`ZeroLine`/`OneLine` branded types で col/line 単位を型安全化

## Constraints
- Deno/TypeScript strict モード維持
- 既存テスト非破壊: `tests/both_min_word_length_test.ts`, `tests/regression_*_test.ts`, `tests/hint_overlap_test.ts`, `tests/cursor_position_test.ts`
- Process 50 までは PointA-E デバッグログを保持（観測継続のため）
- 分岐判断箇所には必ず Why コメントを追加

---

# Progress Map

| Process | Title | Status | File |
|---------|-------|--------|------|
| 1 | 二重経路 skipOverlapDetection 統一 | ☐ planning | [→ plan/process-01.md](plan/process-01.md) |
| 2 | applyHintPatterns パイプライン接続 | ☐ planning | [→ plan/process-02.md](plan/process-02.md) |
| 3 | ByteCol/CharCol/ZeroLine branded types | ☐ planning | [→ plan/process-03.md](plan/process-03.md) |
| 10 | overlap 回帰テスト | ☐ planning | [→ plan/process-10.md](plan/process-10.md) |
| 11 | checkbox captureGroup + prioritizedCount テスト | ☐ planning | [→ plan/process-11.md](plan/process-11.md) |
| 12 | branded types 型エラー検証 | ☐ planning | [→ plan/process-12.md](plan/process-12.md) |
| 50 | デバッグログ整理 | ☐ planning | [→ plan/process-50.md](plan/process-50.md) |
| 100 | 全体回帰 + lint + typecheck | ☐ planning | [→ plan/process-100.md](plan/process-100.md) |
| 200 | docs/dictionary.md 更新 | ☐ planning | [→ plan/process-200.md](plan/process-200.md) |
| 300 | OODA ポストモーテム | ☐ planning | [→ plan/process-300.md](plan/process-300.md) |

**DAG**: `{1,2}→3→{10,11,12}→100→{50,200}→300`
**DAG凡例**: `{A,B}` = 並列実行可能、`A→B` = A完了後にB実行、`|` = 独立した依存チェーン
**Overall**: ☐ 0/10 completed

---

# References

| @ref | @target | @test |
|------|---------|-------|
| denops/hellshake-yano/neovim/display/extmark-display.ts:77-80 | Path A: displayHintsOptimized → assignHintsToWords | tests/hint_overlap_test.ts |
| denops/hellshake-yano/neovim/display/extmark-display.ts:722-725 | Path B: multi-buffer path → assignHintsToWords | tests/hint_overlap_test.ts |
| denops/hellshake-yano/neovim/core/core.ts:925-1017 | showHintsInternal（applyHintPatterns 接続点） | tests/both_min_word_length_test.ts |
| denops/hellshake-yano/neovim/core/word.ts:1386 | HintPatternProcessor.applyHintPatterns | tests/regression_dictionary_test.ts |
| denops/hellshake-yano/neovim/core/hint.ts:237,314-328 | assignHintsToWords + priorityRules | tests/hint_overlap_test.ts |
| denops/hellshake-yano/neovim/core/word.ts:656 | byteCol 1-indexed 計算 | tests/cursor_position_test.ts |
| denops/hellshake-yano/types.ts:~284 | branded types 定義追加点 | tests/types_branded_test.ts (新規) |
| ~/.config/hellshake-yano/dictionary.yaml | ユーザー辞書（checkbox/checked_checkbox） | - |

---

# Risks

| リスク | 対策 |
|--------|------|
| displayHintsOptimized の他呼び出し元が skipOverlapDetection=true で意図せず副作用を受ける | Process 1 で呼び出し元を grep 洗い出し。オプショナル引数＋デフォルト false で後方互換維持 |
| applyHintPatterns を常時接続するとユーザー体験（ヒント数・位置）が変わる | Process 2 で辞書未指定時は no-op、Process 11 で prioritizedCount と既存挙動を両立する回帰テストを先行 |
| branded types 導入が 62+ 呼び出し元に波及しビルド破綻 | Process 3 で段階的 cast helper (`asByteCol`) + Process 12 で型エラー検証、Process 100 で全体ビルド確認 |
