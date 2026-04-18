# Process 200: docs/dictionary.md 更新

## Overview
Process 2 で applyHintPatterns が本番接続され、辞書 `hintPatterns` の captureGroup / hintPosition / priority が実機能化された。ユーザー向けドキュメントを更新し、効果が保証される構文・実例・優先度ルールを明記する。

## Affected Files
- `doc/dictionary.md` — ユーザー向けドキュメント（既存）
- `README.md:374-474` — Dictionary セクション（同期更新）
- `samples/dictionaries/dictionary.yaml` — サンプルの注釈強化
- `~/.config/hellshake-yano/dictionary.yaml` — ユーザー設定例として参考掲載（コピー不要）

## Implementation Notes
- 追記項目:
  1. hintPatterns は showHintsInternal で呼び出される旨（Phase 1 で接続）
  2. captureGroup: N は正規表現の N 番目キャプチャの先頭バイト位置にヒント配置
  3. priority 数値が大きいほど優先。同値時は定義順
  4. Phase 1 既知制約: skipOverlapDetection が常時 true のため、辞書非対象語の重複ヒントも抑制されない
- checkbox の実例:
  ```yaml
  - name: checkbox
    pattern: "^\\s*-\\s*\\[\\s\\]\\s+(.)"
    hintPosition: "capture:1"
    priority: 100
  ```
- Why コメント不要（docs のため）。ただし変更理由を doc 本文に明記
- README.md との整合性: 両ファイルの Dictionary セクションを diff -u で比較

---

## Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング確認
- [ ] `tests/docs_link_check_test.ts`（存在すれば）で doc/dictionary.md のリンク整合を確認
- [ ] 既存 docs ビルドが壊れないことを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [ ] ブリーフィング確認
- [ ] doc/dictionary.md に applyHintPatterns 接続の記述追加
- [ ] README.md:374-474 を同期更新
- [ ] samples/dictionaries/dictionary.yaml にコメント強化
- [ ] 表記ゆれ / リンク切れがないことを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [ ] doc 構造を「辞書スキーマ / 実行時処理 / 制約」の 3 セクションに再編
- [ ] 既存 sample との相互参照を追加

✅ **Phase Complete**

---

## Dependencies
- Requires: 100
- Blocks: 300
