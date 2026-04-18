# Process 50: Timing ログの整備（wall-clock 計測点追加）

## Overview
既存の PointA〜D ログに加え、`PointE2/beforeAssign → PointC/entry` 間で発生していた 300-600ms 遅延を直接観測するため、`[Timing/getline]` `[Timing/join]` `[Timing/applyHintPatterns]` の 3 タイマーを追加する。改修の効果測定とリグレッション検出に使う。

## Affected Files
- `denops/hellshake-yano/neovim/core/core.ts:1015-1025` — getline と join の前後に `performance.now()`
- `denops/hellshake-yano/neovim/core/word.ts:1386-1390` — applyHintPatterns の entry/exit 前後
- ロガー: 既存の debug log ヘルパを踏襲（`[HINT-DEBUG]` プレフィクス）

## Implementation Notes
1. `const t0 = performance.now(); const lines = await denops.call(...); debug("[Timing/getline]", { elapsedMs: performance.now() - t0, startLine, endLine, lineCount });`
2. join 計測も同様
3. applyHintPatterns は関数全体の実所要を計測（`PointC/exit` ログに elapsedMs を追加してもよい）
4. debugMode=false 時は performance.now 呼び出し自体を避けて no-op（ホットループのオーバーヘッド回避）
5. ログフォーマットは既存と揃える（tail -f で読みやすく）

---

## Red Phase
- [ ] ログ出力の期待値テスト（debug=true で 3 行以上出力）

✅ **Phase Complete**

---

## Green Phase
- [ ] 3 タイマー追加
- [ ] debug=false で no-op 確認（benchmark で差がないこと）

✅ **Phase Complete**

---

## Refactor Phase
- [ ] Timing ヘルパ関数抽出（`measureAsync(label, fn)`）

✅ **Phase Complete**

---

## Dependencies
- Requires: -
- Blocks: -（独立・並列可能）
