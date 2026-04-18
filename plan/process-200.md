# Process 200: README / CHANGELOG 更新

## Overview
辞書機能の高速化改修を README と CHANGELOG（なければ doc/CHANGES.md）に記録する。バッファキャッシュ + join 廃止による高速化、パフォーマンス改善率を明記。**挙動変更なし**（全行対象のまま）。

## Affected Files
- `README.md` — 「Dictionary」「Configuration」「Performance」セクション
- `CHANGELOG.md` or `doc/CHANGES.md` — 新エントリ追記
- `docs/performance/dict-perf-report.md`（Process 101 で作成済みへのリンク）

## Implementation Notes
1. README 追記項目:
   - **Performance**: 44949 行バッファでのヒント表示所要 ~450ms → ~60ms（改修前比 86% 短縮、実測値を Process 101 から転記）
   - **Mechanism**: changedtick 連動のバッファキャッシュ + join 廃止による行単位走査で透過的高速化
   - **Behavior change**: なし（全行対象のまま可視領域外にもヒント振る）
2. CHANGELOG: セマンティックバージョニング準拠で performance improvement として記載
3. Breaking change はなし と明記

---

## Red Phase
- [ ] 現状の README セクション構成を確認

✅ **Phase Complete**

---

## Green Phase
- [ ] README の Dictionary セクションに contextLines 説明追加
- [ ] Performance セクションに改善率とベンチリンク
- [ ] CHANGELOG エントリ追加

✅ **Phase Complete**

---

## Refactor Phase
- [ ] 他の言語版 README（あれば）の同期
- [ ] TOC 更新

✅ **Phase Complete**

---

## Dependencies
- Requires: Process 101
- Blocks: Process 300
