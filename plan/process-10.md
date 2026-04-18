# Process 10: overlap 回帰テスト

## Overview
Process 1 で修正した二重経路統一が将来再度デグレードしないよう、日本語連続語・方向切替・初回表示の 3 シナリオを網羅する回帰テストを追加する。

## Affected Files
- `tests/hint_overlap_test.ts` — 既存テスト追記
- `tests/regression_initial_display_test.ts` — 新規（初回表示シナリオ）
- `denops/hellshake-yano/neovim/display/extmark-display.ts:77-80,722-725` — assertion 対象

## Implementation Notes
- PointE1 のログを capture し dropped=0 を assertion に組み込む
- 日本語連続語サンプル: `あいうえおかきくけこ` (priorityRules で誤削除しやすい)
- 方向切替: 下方向ヒント表示 → 上方向ヒント表示 を連続実行し、2 回目の dropped=0 を保証
- 初回表示: キャッシュ未構築状態から assignHintsToWords を呼ぶパスを経由
- Why コメント必須: `// Why: dropped=123/133 の再発防止。二重経路統一の契約をテストで固定`

---

## Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング確認
- [ ] `tests/hint_overlap_test.ts` に 3 シナリオを追加
- [ ] Process 1 適用前のコードでは失敗することを確認（参考: git stash で検証）

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [ ] ブリーフィング確認
- [ ] Process 1 の修正適用状態でテストを実行し全パス
- [ ] dropped=0 を assertion で固定

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [ ] PointE1 ログ capture 用ヘルパー `captureDebugLog(level, tag)` を共通化
- [ ] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 3
- Blocks: 100
