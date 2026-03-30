# Process 4: motion補助関数群 追加

## Overview
Neovim層 dispatcher に motionResetState, motionSetThreshold, motionSetTimeout, motionGetState の4関数を追加する。
いずれも Process 3 で初期化する VimMotionDetector インスタンスにデリゲートする。

## Affected Files
- `denops/hellshake-yano/main.ts` (Neovim層 dispatcher に追加)
- Vim層参照:
  - `main.ts:481-483` (motionResetState)
  - `main.ts:487-491` (motionSetThreshold)
  - `main.ts:495-499` (motionSetTimeout)
  - `main.ts:503-511` (motionGetState)

## Implementation Notes
- VimScript側呼び出し元:
  - motionGetState: `autoload/hellshake_yano/motion.vim:134` (denops#request)
  - motionResetState, motionSetThreshold, motionSetTimeout: VimScript側呼び出し未確認（テスト/設定用）
- 全て VimMotionDetector の対応メソッドにデリゲートするだけのシンプルな実装
  - motionResetState → motionDetector.resetState()
  - motionSetThreshold → motionDetector.setThreshold(threshold)
  - motionSetTimeout → motionDetector.setTimeout(timeoutMs)
  - motionGetState → motionDetector.getState()
- motionGetState 戻り値: { lastMotion, lastMotionTime, motionCount, timeoutMs, threshold }
- Process 3 の VimMotionDetector インスタンスが前提

---

## Red Phase: テスト作成と失敗確認

- [x] ブリーフィング確認
- [x] テストケースを作成（実装前に失敗確認）
  - 4関数が dispatcher に登録されていることを確認
  - motionGetState の戻り値の型を確認
- [x] テストを実行して失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [x] ブリーフィング確認
- [x] dispatcher に motionResetState を追加
- [x] dispatcher に motionSetThreshold を追加
- [x] dispatcher に motionSetTimeout を追加
- [x] dispatcher に motionGetState を追加
- [x] Whyコメントを付与
- [x] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [x] コードの品質を改善
- [x] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: Process 3 (motionDetect — VimMotionDetector インスタンス)
- Blocks: Process 10 (統合テスト)
