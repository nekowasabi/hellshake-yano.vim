# Process 4: 正規表現の事前コンパイル化

## Overview
`word.ts:1192, 1225, 1239, 1410` にある `new RegExp()` のうち、特に L1410（`applyHintPatterns` の hot path）で毎回生成されているものを辞書ロード時に 1 回だけコンパイルして保持する。`DictionaryEntry.compiled: RegExp` を追加し、hot path では参照するだけに変更する。

## Affected Files
- `denops/hellshake-yano/neovim/core/word.ts:1192, 1225, 1239, 1410` — new RegExp 地点
- `denops/hellshake-yano/neovim/dictionary.ts` — DictionaryEntry 型定義に `compiled?: RegExp` 追加
- `denops/hellshake-yano/neovim/core/core.ts:1877,1960,2025,2090,2146,2165` — loadUserDictionary 呼出点。ロード直後に `entries.forEach(e => e.compiled = new RegExp(e.pattern, e.flags))` を実行
- `denops/hellshake-yano/neovim/core/word.ts:1410` — `new RegExp(...)` を `entry.compiled ?? fallback` に置換

## Implementation Notes
1. `convertToUserDictionary()` or `parseYamlDictionary()` の出口でコンパイル済み RegExp を注入
2. YAML 再読込時（設定変更イベント）は `compiled` を再生成
3. コンパイル失敗時は該当エントリをスキップしてログ出力（既存の fallback 挙動と整合）
4. `compiled` は非シリアライズ対象: `JSON.stringify` 時に除外（カスタムレプレーサ不要のため Object.defineProperty で enumerable:false）
5. L1192, 1225, 1239 は頻度が低ければ据え置き可（hot path のみ最適化で十分効く）

---

## Red Phase
- [ ] Process 12 のテストに追加検証: `new RegExp` 呼び出し回数カウント
  - applyHintPatterns を 10 回連続呼んでも `new RegExp` が 0 回（ロード後）であること
  - 辞書再読込後に再コンパイルされること
- [ ] テスト失敗確認

✅ **Phase Complete**

---

## Green Phase
- [ ] DictionaryEntry 型に `compiled?: RegExp` 追加
- [ ] loadUserDictionary 直後でコンパイル
- [ ] applyHintPatterns で `entry.compiled` を参照
- [ ] テスト成功確認

✅ **Phase Complete**

---

## Refactor Phase
- [ ] コンパイルエラー時のログ整備
- [ ] 既存テスト全通過確認

✅ **Phase Complete**

---

## Dependencies
- Requires: -
- Blocks: Process 13
