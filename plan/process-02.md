# Process 2: applyHintPatterns パイプライン接続

## Overview
`HintPatternProcessor.applyHintPatterns` は `word.ts:1386` に実装されているが、本番コードからの呼び出しが 0 件（PointD prioritizedCount=0 が証拠）。辞書 `hintPatterns` の captureGroup / hintPosition が実行時に反映されない構造的欠陥。`showHintsInternal` (core.ts:925-1017) のヒント決定前段階に接続し、辞書ルールを実機能として成立させる。

## Affected Files
- `denops/hellshake-yano/neovim/core/core.ts:925-1017` — showHintsInternal 本体、assignHintsToWords 呼び出し前にパイプ追加
- `denops/hellshake-yano/neovim/core/word.ts:1386` — HintPatternProcessor.applyHintPatterns シグネチャ確認
- `denops/hellshake-yano/neovim/core/hint.ts:237` — assignHintsToWords の dictionary 引数追加検討（または事前変換）

## Implementation Notes
- 設計選択: 「assignHintsToWords にパターン処理を内包」ではなく「呼び出し側で pre-process」を採用。Why: 既存 assignHintsToWords のシグネチャ変更を避け、62+ 呼び出し元への影響を遮断
- core.ts:999-1003 の PointE2 ログ直前で `HintPatternProcessor.applyHintPatterns(words, bufferText, config.dictionary.hintPatterns)` を呼び出し、戻り値で words を置換
- 辞書未指定 / hintPatterns 空の場合は no-op で通過（早期リターン）
- PointD ログを `prioritizedCount=${prioritized.length}` として出力し効果を観測可能にする
- Why コメント必須: `// Why: HintPatternProcessor は従来 dead code だった。captureGroup / hintPosition を実機能化するため showHintsInternal から直接呼び出す`

---

## Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング確認
- [ ] `tests/regression_dictionary_test.ts` を新規作成（または既存追記）
  - `- [ ] task1` 行に checkbox パターン (priority 100, captureGroup 1) 適用時、先頭文字 `t` の位置にヒント
  - PointD ログで prioritizedCount>0 となること
- [ ] テストを実行して失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [ ] ブリーフィング確認
- [ ] core.ts:999 付近で `HintPatternProcessor.applyHintPatterns(words, bufferText, config.dictionary?.hintPatterns ?? [])` を呼び出し
- [ ] 戻り値を後続 assignHintsToWords に引き渡す
- [ ] PointD ログを prioritizedCount で更新
- [ ] Why コメント追加
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [ ] 辞書未指定時の短絡ロジックを `applyHintPatterns` 側の責務に寄せ、呼び出し側を無条件化
- [ ] priority 併用時の安定ソートを word.ts:1386 周辺で明示
- [ ] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: -
- Blocks: 3
