# Process 1: 二重経路 skipOverlapDetection 統一

## Overview
`extmark-display.ts` 内の 2 つの `assignHintsToWords` 呼び出し経路（Path A: displayHintsOptimized 内部、Path B: multi-buffer 経路）が `skipOverlapDetection` を伝播していないため、初回表示・方向切替時に dropped=123/133 が発生する。両経路にフラグを伝播させ、main path (core.ts:1004-1016) で既に適用済みの `{skipOverlapDetection: true}` と挙動を統一する。

## Affected Files
- `denops/hellshake-yano/neovim/display/extmark-display.ts:77-80` — Path A: displayHintsOptimized 内部の assignHintsToWords 呼び出し
- `denops/hellshake-yano/neovim/display/extmark-display.ts:722-725` — Path B: multi-buffer 経路の assignHintsToWords 呼び出し
- `denops/hellshake-yano/neovim/core/hint.ts:237` — assignHintsToWords シグネチャ（既に 7 番目引数でオプション受理可能）

## Implementation Notes
- 両呼び出し点に 7 番目引数として `{ skipOverlapDetection: true }` を追加
- displayHintsOptimized の呼び出し元が他にあるか `Grep` で確認し、必要なら関数シグネチャにオプショナル引数を追加（デフォルト false）して後方互換を維持
- Why コメント必須: `// Why: overlap filter を常時スキップ。日本語連続語で priorityRules(symbolsPriority:1, wordsPriority:2) が誤削除する既知バグを回避（core.ts:1004-1016 と対称）`

---

## Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング確認
- [ ] `tests/hint_overlap_test.ts` に Path A/B を経由するケースを追加
  - 日本語チェックボックス行 × 10 行入力時、dropped=0 であること
  - 方向切替時（下→上）も dropped=0 であること
- [ ] テストを実行して失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [ ] ブリーフィング確認
- [ ] `extmark-display.ts:77-80` に `{ skipOverlapDetection: true }` を追加
- [ ] `extmark-display.ts:722-725` に `{ skipOverlapDetection: true }` を追加
- [ ] Why コメントを両箇所に追加
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [ ] 3 箇所（core.ts:1004-1016 / extmark-display.ts:77-80 / :722-725）で同じオプション辞書を渡しているため、共通定数 `OVERLAP_SKIP_OPTS` に抽出
- [ ] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: -
- Blocks: 3
