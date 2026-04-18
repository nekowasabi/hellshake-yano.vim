# Process 100: deno test / fmt / check 通過確認

## Overview
Process 1〜4 および 10〜13, 50 の全改修後に、プロジェクト規約の静的解析・テストスイート全通過を確認する。CI パス相当のローカル検証。

## Affected Files
- `deno.jsonc` — tasks 定義確認
- 全改修コード (core.ts, word.ts, dictionary.ts, main.ts 周辺)
- 全テスト `denops/hellshake-yano/neovim/core/__tests__/`, `tests/`

## Implementation Notes
1. 実行コマンド（順次）:
   - `deno fmt --check denops/ tests/` — フォーマット検査
   - `deno check denops/hellshake-yano/main.ts` — 型検査（起点ファイル指定）
   - `deno lint denops/ tests/` — lint（deno.jsonc の設定に従う）
   - `deno task test` or `deno test --allow-read --allow-write --allow-env denops/ tests/` — 全テスト
2. 失敗したら該当 Process に差し戻し（fmt/check は自動修正、test は実装修正）
3. カバレッジ: `deno test --coverage=coverage/` → `deno coverage coverage/` で改修領域の行カバレッジが 80% 以上

---

## Red Phase
- [ ] 改修直後の状態で必ず一度実行して現状把握

✅ **Phase Complete**

---

## Green Phase
- [ ] fmt, check, lint, test を全て PASS させる
- [ ] カバレッジ閾値を達成

✅ **Phase Complete**

---

## Refactor Phase
- [ ] `deno.jsonc` tasks に `task verify` を追加（fmt+check+lint+test のまとめ）

✅ **Phase Complete**

---

## Dependencies
- Requires: Process 13
- Blocks: Process 101
