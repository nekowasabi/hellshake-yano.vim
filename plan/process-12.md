# Process 12: Process 3 行単位走査テスト + Process 4 事前コンパイル検証

## Overview
全パターン行単位走査 (`isMultilinePattern`) による分岐動作と、事前コンパイル済み RegExp の再利用を検証する統合テスト。

## Affected Files
- テスト新規: `denops/hellshake-yano/neovim/core/__tests__/pattern-scan_test.ts`
- 影響コード: `denops/hellshake-yano/neovim/core/word.ts:1386-1458`, `:1490-1496`

## Implementation Notes
1. **行単位走査 (Process 3)**:
   - **Case A**: `/^\s*-\s*\[\s\]\s+(.)/` パターンで行単位走査分岐
   - **Case B**: `/\bclass\b/` パターンでも行単位走査（default）
   - **Case C**: 複数行パターン `/foo[\s\S]*?bar/` は join ルート（フォールバック）
   - **Case D, E**: 全ルートで同じマッチ結果（等価性保証）
2. **事前コンパイル (Process 4)**:
   - **Case F**: applyHintPatterns を 10 回呼んで `new RegExp` 呼び出し回数が 0（`DictionaryEntry.compiled` を参照）
   - **Case G**: 辞書再読込後に compiled が再生成されること
   - **Case H**: 不正パターンは compiled=undefined でスキップ
3. `isMultilinePattern` のユニットテスト: `source.includes("\\n")`, `flags.includes("s")` など複数行判定パターン

---

## Red Phase
- [ ] 8 ケース + isMultilinePattern 複数パターンで失敗確認
- [ ] `deno test denops/hellshake-yano/neovim/core/__tests__/pattern-scan_test.ts`

✅ **Phase Complete**

---

## Green Phase
- [ ] Process 3 + 4 実装完了後に成功確認

✅ **Phase Complete**

---

## Refactor Phase
- [ ] 複数行判定ヘルパを共通化
- [ ] 走査ロジック関数分割

✅ **Phase Complete**

---

## Dependencies
- Requires: Process 3, Process 4
- Blocks: -
