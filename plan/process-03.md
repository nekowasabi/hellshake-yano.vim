# Process 3: motionDetect 追加

## Overview
Neovim層 dispatcher に motionDetect を追加する。wキー連打時のモーション検出コア機能。
Vim層では VimMotionDetector.detectMotion() にデリゲートしている。Neovim層でも同等のインスタンスを初期化して使用する。

## Affected Files
- `denops/hellshake-yano/main.ts` (Neovim層 dispatcher に追加 + VimMotionDetector 初期化)
- Vim層参照: `main.ts:446-477` (motionDetect 実装)
- `denops/hellshake-yano/vim/motion.ts` (VimMotionDetector クラス)

## Implementation Notes
- VimScript側呼び出し元:
  - `autoload/hellshake_yano_vim/motion.vim:350` — denops#request (try-catch フォールバックあり)
- Vim層実装: VimMotionDetector.detectMotion(motionKey, count, keyRepeatConfig)
  - 返り値: `{ shouldShowHints: boolean, skipReason?: string, newCount: number }`
  - ロジック: 数字プレフィックス判定 → キーリピート検出 → タイムアウト判定 → 閾値判定
- **重要**: initializeNeovimLayer 内で VimMotionDetector をインスタンス化する必要あり
  - Vim層では main.ts:204-207 で初期化: `const motionDetector = new VimMotionDetector(config)`
  - Neovim層でも同様に初期化が必要
- 引数の型: motionKey: string, count: number, keyRepeatConfig: KeyRepeatConfig
- wキー連打で毎回呼ばれるため、パフォーマンスに注意

---

## Red Phase: テスト作成と失敗確認

- [x] ブリーフィング確認
- [x] テストケースを作成（実装前に失敗確認）
  - motionDetect が dispatcher に登録されていることを確認
  - 戻り値の型 { shouldShowHints, skipReason?, newCount } を確認
  - 閾値到達時に shouldShowHints=true を返すことを確認
- [x] テストを実行して失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [x] ブリーフィング確認
- [x] initializeNeovimLayer 内で VimMotionDetector をインスタンス化
- [x] dispatcher に motionDetect を追加（VimMotionDetector.detectMotion にデリゲート）
- [x] Whyコメントを付与
- [x] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [x] VimMotionDetector のインスタンスを適切なスコープで管理
- [x] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: -
- Blocks: Process 4 (motion補助関数), Process 10 (統合テスト)
