# Process 11: checkbox captureGroup + prioritizedCount テスト

## Overview
Process 2 で接続した applyHintPatterns が辞書 `hintPatterns` の captureGroup / hintPosition / priority を正しく反映することを検証する。ユーザーの期待仕様（`- [ ] task` の先頭文字 `t` にヒント）を契約化する。

## Affected Files
- `tests/regression_dictionary_test.ts` — 新規
- `~/.config/hellshake-yano/dictionary.yaml` — ユーザー辞書（参考）
- `denops/hellshake-yano/neovim/core/word.ts:1386` — applyHintPatterns assertion 対象

## Implementation Notes
- テスト辞書を fixture で定義:
  - name: checkbox, pattern: `^\s*-\s*\[\s\]\s+(.)`, hintPosition: "capture:1", priority: 100
  - name: checked_checkbox, pattern: `^\s*-\s*\[x\]\s+(.)`, hintPosition: "capture:1", priority: 90
- assertion:
  - `- [ ] task` 行で生成される word の byteCol が先頭文字 `t` の位置
  - PointD ログで prioritizedCount >= 1
  - `- [x] done` 行で checked_checkbox が優先適用（priority 90）
  - priority 衝突時は priority 大が勝つ安定ソート
- Why コメント必須: `// Why: HintPatternProcessor を dead code から実機能化した契約を永続化`

---

## Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング確認
- [ ] `tests/regression_dictionary_test.ts` に 4 ケース追加
- [ ] Process 2 適用前では prioritizedCount=0 で失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [ ] ブリーフィング確認
- [ ] Process 2 の修正適用状態でテスト実行、全パス
- [ ] prioritizedCount>0 を assertion で固定

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [ ] fixture 辞書を `tests/fixtures/dictionary_checkbox.yaml` に分離し再利用可能化
- [ ] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 3
- Blocks: 100
