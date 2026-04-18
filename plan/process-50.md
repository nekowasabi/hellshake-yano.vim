# Process 50: デバッグログ整理

## Overview
Phase 1 で追加した観測用ログ PointA0/A/B/D/E1/E2 は原因特定のために不可欠だったが、本番環境では冗長。Process 100 で回帰テスト合格を確認した後、ログを以下 3 分類に整理する:
1. 削除: 一時的に必要だったもの（PointA0, PointE2 など）
2. info→debug 降格: 継続観測は有益だが本番ノイズとなるもの（PointE1 dropped）
3. 継続保持: 失敗時の診断価値が高いもの（extmark range エラー周辺）

## Affected Files
- `denops/hellshake-yano/neovim/core/core.ts:999-1003` — PointE2 デバッグログ
- `denops/hellshake-yano/neovim/core/hint.ts:328-332` — PointE1 デバッグログ
- `denops/hellshake-yano/neovim/core/word.ts` — PointA/A0/B/D ログ
- `denops/hellshake-yano/neovim/display/extmark-display.ts` — PointD など

## Implementation Notes
- 削除方針: git blame で本 Phase 追加分を識別
- 降格方針: `if (getDebugMode())` の条件ガードは維持、level を INFO→DEBUG に変更
- 継続保持: extmark out-of-range 等のエラー経路は維持（再発時の診断用）
- Why コメント必須（残す分）: `// Why: 本番稼働時も再発時診断用に保持。level=DEBUG でノイズ抑制`
- 削除分はコミットメッセージで「Phase 1 debug instrumentation removal」と明示

---

## Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング確認
- [ ] ログ出力カウントを検証する smoke test を `tests/debug_log_smoke_test.ts` に追加
  - DEBUG off 時: PointE1 / PointE2 が出力されない
  - DEBUG on 時: PointE1 が DEBUG level で出力される

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [ ] ブリーフィング確認
- [ ] PointA0, PointE2 を削除
- [ ] PointE1 を INFO→DEBUG 降格
- [ ] extmark エラー経路のログは継続保持（ノータッチ）
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [ ] logMessage 呼び出しを `debugLog()` / `infoLog()` ヘルパーに集約し、level 間違いを型で防止
- [ ] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 100
- Blocks: 300
