---
title: "Neovim層 dispatcher 未登録関数の統合修正"
status: completed
created: "2026-03-30"
---

# Commander's Intent

## Purpose
Vim層 dispatcher に登録済みだがNeovim層に未登録の関数群により、Neovim環境でdenops呼び出し時にエラーまたはサイレント劣化が発生している。両層のAPI完全一致を実現する。

## End State
Neovim環境で全dispatcher関数が登録済みで、VimScript側からの呼び出しがエラーなく処理される状態。

## Key Tasks
- Display系関数4個をNeovim層 dispatcher に追加（displayHideAll は修正済み）
- Motion系関数5個をNeovim層 dispatcher に追加
- VimScript側の denops#notify 呼び出しの安全化

## Constraints
- displayHideAll は既に修正済み（本計画のスコープ外）
- getVisualRange は既に両層に実装済み（対象外）
- initializeNeovimLayer スコープ内の既存変数のみ使用
- Vim層との戻り値互換性を維持

---

# Progress Map

| Process | Title | Status | File |
|---------|-------|--------|------|
| 1 | displayShowHint + displayShowHintWithWindow 追加 | ✅ done | [→ plan/process-01.md](plan/process-01.md) |
| 2 | displayHighlightPartialMatches + displayGetPopupCount 追加 | ✅ done | [→ plan/process-02.md](plan/process-02.md) |
| 3 | motionDetect 追加 | ✅ done | [→ plan/process-03.md](plan/process-03.md) |
| 4 | motion補助関数群 追加 | ✅ done | [→ plan/process-04.md](plan/process-04.md) |
| 10 | dispatcher 統合テスト | ✅ done | [→ plan/process-10.md](plan/process-10.md) |
| 50 | VimScript denops#notify 安全化 | ✅ done | [→ plan/process-50.md](plan/process-50.md) |

**Overall**: ✅ 6/6 completed

---

# References

| @ref | @target | @test |
|------|---------|-------|
| denops/hellshake-yano/main.ts | Vim層:210-608, Neovim層:614-1141 | tests/hint_manager_test.ts |
| autoload/hellshake_yano_vim/display.vim | 175, 300, 396, 474 | tests-vim/hellshake_yano_vim/test_display.vim |
| autoload/hellshake_yano_vim/motion.vim | 350 | tests-vim/hellshake_yano_vim/test_motion.vim |
| autoload/hellshake_yano_vim/core.vim | 631 | tests/motion_test.ts |
| neovim/display/extmark-display.ts | displayHintsAsync, hideHintsDisplay | - |

---

# Risks

| リスク | 対策 |
|--------|------|
| Neovim層にVimPopupDisplay相当がなく、display系関数の実装が困難 | extmark-display.ts の既存関数にデリゲートする |
| motionDetect のNeovim層実装でVimMotionDetector未初期化 | initializeNeovimLayer内で VimMotionDetector をインスタンス化 |
| 戻り値の型不一致でVimScript側が壊れる | Vim層と同一の戻り値構造を維持、テストで検証 |
