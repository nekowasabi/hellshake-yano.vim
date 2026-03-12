---
mission_id: "mission-20260312-002"
title: "Vim→Denops実装集約"
status: planning
progress: 0
phase: planning
tdd_mode: true
tdd_phase: null
execution_mode: sequential
dag_config:
  enabled: false
created_at: "2026-03-12T04:40:00Z"
updated_at: "2026-03-12T04:40:00Z"
blockers: 0
---

# Mission: Vim→Denops実装集約

## Commander's Intent

- **Purpose**: Vim用の実装とNeovim用の実装を別々に持つ現状を、Neovim側のDenops実装に集約する
- **End State**: Pure VimScript層（autoload/hellshake_yano_vim/）の廃止、Denopsブリッジ層への責務移動完了
- **Key Tasks**:
  1. Phase 1: 即時集約可能な21関数をDenops dispatcherへ移行
  2. Phase 2: 新規TS実装が必要な18-20関数を実装・移行
  3. Phase 3: unified.vimマッピング書き換えとカテゴリ3関数のブリッジ層移動
  4. Phase 4: Pure VimScript層（autoload/hellshake_yano_vim/）の廃止
- **Constraints**:
  - C-01: popup/extmark非互換 → display層はAdapter必要
  - C-02: Vim8でDeno必須 → Pure VimScript完全廃止は環境制約あり
  - C-03: IPC契約3メソッド維持（updateConfig, showHintsWithKey, generic bridge）
  - C-04: core.ts 3660行モノリス → 大規模リファクタは別ミッション
  - C-05: popup-display.ts 維持必須（Vim popup APIのアダプタとして存続）

## References

| ファイル | 役割 | 備考 |
|---|---|---|
| plugin/hellshake-yano.vim | Neovim用エントリポイント | |
| plugin/hellshake-yano-vim.vim | Vim用エントリポイント | Phase 4廃止候補 |
| plugin/hellshake-yano-unified.vim | 統合エントリポイント | |
| autoload/hellshake_yano_vim/ | Pure VimScript層 (16ファイル, 68関数) | 廃止対象 |
| autoload/hellshake_yano/ | Denopsブリッジ層 (15ファイル) | 責務移動先 |
| denops/hellshake-yano/main.ts | Denops dispatcher本体 | Vim:198-554, Neovim:595-1023 |
| denops/hellshake-yano/neovim/core/core.ts | Neovimコア (3660行) | C-04制約 |
| denops/hellshake-yano/neovim/display/extmark-display.ts | Extmark表示実装 | |
| denops/hellshake-yano/vim/display/popup-display.ts | Popup表示実装 | C-05維持必須 |
| denops/hellshake-yano/vim/bridge/vim-bridge.ts | Vimブリッジ | |
| autoload/hellshake_yano_vim/core.vim:42 | core#init | Phase 1集約対象 |
| autoload/hellshake_yano_vim/core.vim:80 | core#get_state | Phase 2新規実装対象 |
| autoload/hellshake_yano_vim/core.vim:129 | core#on_focus_gained | カテゴリ3維持 |
| autoload/hellshake_yano_vim/core.vim:155 | core#on_terminal_leave | カテゴリ3維持 |
| autoload/hellshake_yano_vim/core.vim:198 | core#should_redraw | Phase 2対象 |
| autoload/hellshake_yano_vim/core.vim:210 | core#show_delayed | Phase 2対象 |
| autoload/hellshake_yano_vim/core.vim:237 | core#is_denops_ready | カテゴリ4削除対象 |
| autoload/hellshake_yano_vim/core.vim:276 | core#get_fixed_positions | Phase 2対象 |
| autoload/hellshake_yano_vim/core.vim:381 | core#show_with_motion | Phase 2対象 |
| autoload/hellshake_yano_vim/core.vim:388 | core#show_with_motion_timer | Phase 2対象 |
| autoload/hellshake_yano_vim/core.vim:393 | core#show | Phase 1集約対象 |
| autoload/hellshake_yano_vim/core.vim:607 | core#hide | Phase 1集約対象 |
| autoload/hellshake_yano_vim/display.vim:65 | display#get_highlight_group | Phase 2対象 |
| autoload/hellshake_yano_vim/display.vim:171 | display#show_hint | Phase 2対象 |
| autoload/hellshake_yano_vim/display.vim:296 | display#show_hint_with_window | Phase 2 HIGH対象 |
| autoload/hellshake_yano_vim/display.vim:392 | display#hide_all | Phase 2対象 |
| autoload/hellshake_yano_vim/display.vim:470 | display#highlight_partial_matches | Phase 2対象 |
| autoload/hellshake_yano_vim/display.vim:545 | display#get_popup_count | カテゴリ4削除対象 |
| autoload/hellshake_yano_vim/input.vim:43 | input#start | カテゴリ3維持 |
| autoload/hellshake_yano_vim/input.vim:74 | input#stop | カテゴリ3維持 |
| autoload/hellshake_yano_vim/input.vim:217 | input#wait_for_input | カテゴリ3維持 |
| autoload/hellshake_yano_vim/input.vim:292 | input#get_state | カテゴリ3維持 |
| autoload/hellshake_yano_vim/input.vim:309 | input#get_partial_matches | Phase 2対象 |
| autoload/hellshake_yano_vim/motion.vim:114 | motion#has_denops | カテゴリ4削除対象 |
| autoload/hellshake_yano_vim/motion.vim:170 | motion#get_state | Phase 2対象 |
| autoload/hellshake_yano_vim/motion.vim:188 | motion#set_threshold | Phase 1集約対象 |
| autoload/hellshake_yano_vim/motion.vim:206 | motion#set_timeout | Phase 1集約対象 |
| autoload/hellshake_yano_vim/motion.vim:334 | motion#handle_with_count | カテゴリ3維持 |
| autoload/hellshake_yano_vim/motion.vim:493 | motion#handle | Phase 2対象 |
| autoload/hellshake_yano_vim/motion.vim:530 | motion#handle_expr | カテゴリ3維持 |
| autoload/hellshake_yano_vim/motion.vim:574 | motion#handle_visual_expr | カテゴリ3維持 |
| autoload/hellshake_yano_vim/motion.vim:582 | motion#visual_schedule | カテゴリ3維持 |
| autoload/hellshake_yano_vim/motion.vim:627 | motion#handle_visual_internal | カテゴリ3維持 |
| autoload/hellshake_yano_vim/visual.vim:60 | visual#init | Phase 2対象 |
| autoload/hellshake_yano_vim/visual.vim:71 | visual#get_state | Phase 2対象 |
| autoload/hellshake_yano_vim/visual.vim:102 | visual#show | Phase 2対象 |
| plugin/hellshake-yano-unified.vim:193 | setup_unified_mappings() | Phase 3対象 |
| plugin/hellshake-yano-unified.vim:199 | motion#handle_with_count呼出 | Phase 3対象 |
| plugin/hellshake-yano-unified.vim:211 | motion#visual_schedule呼出 | Phase 3対象 |
| plugin/hellshake-yano-unified.vim:226 | setup_vimscript_mappings() | Phase 3対象 |
| plugin/hellshake-yano-unified.vim:266 | visual#show呼出 | Phase 3対象 |
| denops/hellshake-yano/main.ts:198 | initializeVimLayer | dispatcher定義 |
| denops/hellshake-yano/main.ts:201 | enable dispatcher | |
| denops/hellshake-yano/main.ts:220 | updateConfig dispatcher | |
| denops/hellshake-yano/main.ts:230 | getConfig dispatcher | |
| denops/hellshake-yano/main.ts:240 | segmentJapaneseText dispatcher | |
| denops/hellshake-yano/main.ts:282 | clearCache dispatcher | |
| denops/hellshake-yano/main.ts:289 | reloadDictionary dispatcher | |
| denops/hellshake-yano/main.ts:293 | addToDictionary dispatcher | |
| denops/hellshake-yano/main.ts:308 | showDictionary dispatcher | |
| denops/hellshake-yano/main.ts:312 | validateDictionary dispatcher | |
| denops/hellshake-yano/main.ts:316 | isInDictionary dispatcher | |
| denops/hellshake-yano/main.ts:324 | detectWordsVisible dispatcher | |
| denops/hellshake-yano/main.ts:337 | detectWordsMultiWindow dispatcher | |
| denops/hellshake-yano/main.ts:351 | getMinWordLength dispatcher | |
| denops/hellshake-yano/main.ts:363 | generateHints dispatcher | |
| denops/hellshake-yano/main.ts:386 | displayShowHint dispatcher (Vim専用) | |
| denops/hellshake-yano/main.ts:403 | displayShowHintWithWindow dispatcher (Vim専用) | |
| denops/hellshake-yano/main.ts:420 | displayHideAll dispatcher (Vim専用) | |
| denops/hellshake-yano/main.ts:425 | displayHighlightPartialMatches dispatcher | |
| denops/hellshake-yano/main.ts:595 | initializeNeovimLayer | dispatcher定義 |
| denops/hellshake-yano/main.ts:615 | setCount dispatcher (Neovim専用) | |
| denops/hellshake-yano/main.ts:623 | setTimeout dispatcher (Neovim専用) | |
| denops/hellshake-yano/main.ts:630 | showHints dispatcher (Neovim専用) | |
| denops/hellshake-yano/main.ts:648 | hideHints dispatcher (Neovim専用) | |
| denops/hellshake-yano/main.ts:660 | highlightCandidateHints dispatcher | |
| denops/hellshake-yano/main.ts:871 | getVisibleWindows dispatcher | |
| denops/hellshake-yano/implementation-selector.ts:47 | select() | |
| denops/hellshake-yano/implementation-selector.ts:129 | getImplementationMatrix() | |
| denops/hellshake-yano/initializer.ts:96 | userPreference未渡し問題 | |

## COP (Common Operational Picture)

現在の状態:
- autoload/hellshake_yano_vim/ に16ファイル・68関数が存在（Pure VimScript層）
- autoload/hellshake_yano/ に15ファイルのDenopsブリッジ層が存在
- 68関数を4カテゴリに分類済み:
  - カテゴリ1 (21関数): Denops dispatcherが既に存在し即時集約可
  - カテゴリ2 (18-20関数): TS側に新規実装が必要
  - カテゴリ3 (19関数): Vim専用機能としてブリッジ層に責務移動
  - カテゴリ4 (9関数): 削除可能（has_denops系等）

## Progress Map

| Process | タイトル | 状態 | 依存 |
|---|---|---|---|
| 1 | DisplayAdapter インターフェース定義 | pending | - |
| 2 | MotionDetector インターフェース定義 | pending | - |
| 3 | VisualRange インターフェース定義 | pending | - |
| 4 | テスト基盤整備 | pending | - |
| 5 | ExtmarkDisplayAdapter 実装 | pending | 1 |
| 6 | PopupDisplayAdapter 実装 | pending | 1 |
| 7 | IPC契約テスト | pending | 4 |
| 8 | EnvironmentDetector リファクタ | pending | - |
| 9 | ImplementationSelector 統合 | pending | 8 |
| 10 | config関数の集約 (3関数) | pending | 1,4 |
| 11 | dictionary関数の集約 (6関数) | pending | 4 |
| 12 | hint_generator関数の集約 (2関数) | pending | 4 |
| 13 | japanese#segment の集約 | pending | 4 |
| 14 | word_detector関数の集約 (4関数) | pending | 4 |
| 15 | window_detector#get_visible の集約 | pending | 4 |
| 16 | core#init/show/hide の集約 (3関数) | pending | 4 |
| 17 | motion#set_threshold/set_timeout の集約 (2関数) | pending | 4 |
| 18 | Phase 1 統合テスト | pending | 10-17 |
| 19 | Phase 1 VimScript側コード削除確認 | pending | 18 |
| 50 | DisplayAdapter — display#show_hint 実装 | pending | 5,6 |
| 51 | DisplayAdapter — display#show_hint_with_window 実装 | pending | 50 |
| 52 | DisplayAdapter — display#hide_all 実装 | pending | 5,6 |
| 53 | DisplayAdapter — display#highlight_partial_matches 実装 | pending | 5,6 |
| 54 | DisplayAdapter — display#get_highlight_group dispatcher | pending | 5,6 |
| 55 | core#show_with_motion 複合API | pending | 16 |
| 56 | core#show_with_motion_timer 非同期タイマー版 | pending | 55 |
| 57 | core#show_delayed 遅延表示 | pending | 16 |
| 58 | core#get_state → getStatistics拡張 | pending | 16 |
| 59 | core#get_fixed_positions 新規API | pending | 16 |
| 60 | core#should_redraw 統合 | pending | 16 |
| 61 | motion#get_state dispatcher | pending | 17 |
| 62 | motion#handle 代替 | pending | 17 |
| 63 | visual#show → detectWordsInVisualRange新規 | pending | 3 |
| 64 | visual#init / visual#get_state | pending | 3 |
| 65 | filter#by_direction word-detector統合 | pending | 14 |
| 66 | input#get_partial_matches 代替 | pending | 4 |
| 67 | word_filter#apply 統合 | pending | 14 |
| 68 | Phase 2 統合テスト | pending | 50-67 |
| 100 | setup_unified_mappings() motionマッピング書き換え | pending | 62 |
| 101 | setup_unified_mappings() visualマッピング書き換え | pending | 63 |
| 102 | setup_vimscript_mappings() visualマッピング書き換え | pending | 63 |
| 103 | unified.vim s:show_hints_visual()書き換え | pending | 63 |
| 104 | カテゴリ3関数の責務移動 (19関数) | pending | 100-103 |
| 105 | initializer.ts userPreference引数修正 | pending | 9 |
| 106 | Phase 3 統合テスト | pending | 100-105 |
| 150 | カテゴリ4 削除可9関数の除去 | pending | 19,68 |
| 151 | config.vim 廃止 | pending | 10,150 |
| 152 | dictionary.vim 廃止 | pending | 11,150 |
| 153 | hint_generator.vim 廃止 | pending | 12,150 |
| 154 | japanese.vim 廃止 | pending | 13,150 |
| 155 | word_detector.vim 廃止 | pending | 14,150 |
| 156 | window_detector.vim 廃止 | pending | 15,150 |
| 157 | word_filter.vim 廃止 | pending | 67,150 |
| 158 | filter.vim 廃止 | pending | 65,150 |
| 159 | util.vim 廃止 | pending | 150 |
| 160 | display.vim → ブリッジ層統合 | pending | 50-54,150 |
| 161 | core.vim → ブリッジ層統合 | pending | 55-60,150 |
| 162 | motion.vim → ブリッジ層統合 | pending | 61-62,104,150 |
| 163 | visual.vim → ブリッジ層統合 | pending | 63-64,104,150 |
| 164 | input.vim → ブリッジ層責務移動 | pending | 66,104,150 |
| 165 | jump.vim → ブリッジ層責務移動 | pending | 104,150 |
| 166 | key_repeat.vim → ブリッジ層統合 | pending | 104,150 |
| 167 | plugin/hellshake-yano-vim.vim 廃止検討 | pending | 151-166 |
| 168 | Phase 4 回帰テスト | pending | 151-167 |
| 200 | vim-bridge.ts 不要メソッド削除 | pending | 168 |
| 201 | config-mapper.ts 統合検討 | pending | 168 |
| 202 | config-migrator.ts 統合検討 | pending | 168 |
| 203 | config-unifier.ts 統合検討 | pending | 168 |
| 204 | highlight.ts (vim/) 統合 | pending | 168 |
| 205 | popup-display.ts 維持確認 | pending | 168 |
| 206 | japanese.ts (vim/) 統合 | pending | 168 |
| 207 | motion.ts (vim/) 責務確認 | pending | 168 |
| 208 | visual.ts (vim/) 責務確認 | pending | 168 |
| 250 | 共通dispatcher統合 (21メソッド) | pending | 200-208 |
| 251 | Vim専用dispatcher見直し (12メソッド) | pending | 250 |
| 252 | Neovim専用dispatcher整理 (20メソッド) | pending | 250 |
| 253 | initializeVimLayer/NeovimLayer 統合検討 | pending | 251,252 |
| 254 | IPC契約3メソッド最終確認 | pending | 253 |
| 280 | Vim+Denops環境での全機能テスト | pending | 254 |
| 281 | Neovim+Denops環境での全機能テスト | pending | 254 |
| 282 | Denopsなし環境フォールバックテスト | pending | 254 |
| 283 | パフォーマンステスト | pending | 254 |
| 290 | CHANGELOG更新 | pending | 280-283 |
| 291 | README更新 | pending | 280-283 |
| 300 | リリース準備 | pending | 290,291 |


---

## Process 1: DisplayAdapter インターフェース定義

<!--@process-briefing
category: implementation
tags: [interface, display, adapter, typescript]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: display#show_hint / display#hide_all 等がVimScript側とNeovim側で別実装。共通インターフェースなし
- **対象ファイル**:
  - autoload/hellshake_yano_vim/display.vim:171 (show_hint)
  - autoload/hellshake_yano_vim/display.vim:392 (hide_all)
  - denops/hellshake-yano/neovim/display/extmark-display.ts
  - denops/hellshake-yano/vim/display/popup-display.ts

#### Orient（方向付け）
- **方針**: `common/interfaces/display-adapter.ts` にDisplayAdapterインターフェースを定義し、ExtmarkDisplayAdapterとPopupDisplayAdapterの契約を確立する
- **制約**: C-01（popup/extmark非互換）、C-05（popup-display.ts維持必須）

#### Decide（実装方法）
- `denops/hellshake-yano/common/interfaces/display-adapter.ts` を新規作成
- showHint(), showHintWithWindow(), hideAll(), highlightPartialMatches(), getHighlightGroup() を定義

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/unit/common/interfaces/display-adapter.test.ts` を作成
- [ ] DisplayAdapterを実装した仮クラスでコンパイルエラーが出ることを確認
- [ ] `deno test` を実行してテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] `denops/hellshake-yano/common/interfaces/display-adapter.ts` を新規作成
- [ ] `DisplayAdapter` インターフェースに以下のメソッドシグネチャを定義:
  - `showHint(hint: HintItem): Promise<void>`
  - `showHintWithWindow(hint: HintItem, windowId: number): Promise<void>`
  - `hideAll(): Promise<void>`
  - `highlightPartialMatches(keys: string[]): Promise<void>`
  - `getHighlightGroup(type: string): Promise<string>`
- [ ] `deno test` を実行してテスト成功を確認

### Refactor Phase: 品質改善
- [ ] JSDoc コメント追加
- [ ] `common/interfaces/index.ts` にエクスポート追加
- [ ] Impact Verification: `deno check denops/hellshake-yano/main.ts` でコンパイルエラーなし確認

---

## Process 2: MotionDetector インターフェース定義

<!--@process-briefing
category: implementation
tags: [interface, motion, adapter, typescript]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: motion#set_threshold / motion#set_timeout / motion#get_state がVimScript側に存在。Neovim側はsetCount/setTimeout dispatcherで対応
- **対象ファイル**:
  - autoload/hellshake_yano_vim/motion.vim:170 (get_state)
  - autoload/hellshake_yano_vim/motion.vim:188 (set_threshold)
  - autoload/hellshake_yano_vim/motion.vim:206 (set_timeout)
  - denops/hellshake-yano/main.ts:615 (setCount)
  - denops/hellshake-yano/main.ts:623 (setTimeout)
  - denops/hellshake-yano/vim/features/motion.ts (VimMotionDetector)

#### Orient（方向付け）
- **方針**: `common/interfaces/motion-detector.ts` にMotionDetectorインターフェースを定義
- **制約**: カテゴリ3のgetchar入力ループ系はVimScript維持必須（C-02）

#### Decide（実装方法）
- `denops/hellshake-yano/common/interfaces/motion-detector.ts` を新規作成
- setThreshold(), setTimeout(), getState() を定義

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/unit/common/interfaces/motion-detector.test.ts` を作成
- [ ] `deno test` を実行してテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] `denops/hellshake-yano/common/interfaces/motion-detector.ts` を新規作成
- [ ] `MotionDetector` インターフェース定義:
  - `setThreshold(threshold: number): Promise<void>`
  - `setTimeout(timeout: number): Promise<void>`
  - `getState(): Promise<MotionState>`
- [ ] `deno test` を実行してテスト成功を確認

### Refactor Phase: 品質改善
- [ ] JSDoc コメント追加
- [ ] `common/interfaces/index.ts` にエクスポート追加
- [ ] Impact Verification: `deno check denops/hellshake-yano/main.ts` でコンパイルエラーなし確認

---

## Process 3: VisualRange インターフェース定義

<!--@process-briefing
category: implementation
tags: [interface, visual, adapter, typescript]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: visual#show / visual#init / visual#get_state がVimScript側に存在。Neovim側対応なし
- **対象ファイル**:
  - autoload/hellshake_yano_vim/visual.vim:60 (init)
  - autoload/hellshake_yano_vim/visual.vim:71 (get_state)
  - autoload/hellshake_yano_vim/visual.vim:102 (show)
  - denops/hellshake-yano/vim/features/visual.ts (VimVisual)
  - denops/hellshake-yano/main.ts:534 (detectWordsInVisualRange, Vim専用)

#### Orient（方向付け）
- **方針**: `common/interfaces/visual-handler.ts` にVisualHandlerインターフェースを定義
- **制約**: なし

#### Decide（実装方法）
- `denops/hellshake-yano/common/interfaces/visual-handler.ts` を新規作成
- initialize(), getState(), showHints() を定義

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/unit/common/interfaces/visual-handler.test.ts` を作成
- [ ] `deno test` を実行してテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] `denops/hellshake-yano/common/interfaces/visual-handler.ts` を新規作成
- [ ] `VisualHandler` インターフェース定義:
  - `initialize(config: VisualConfig): Promise<void>`
  - `getState(): Promise<VisualState>`
  - `showHints(range: VisualRange): Promise<void>`
- [ ] `deno test` を実行してテスト成功を確認

### Refactor Phase: 品質改善
- [ ] JSDoc コメント追加
- [ ] `common/interfaces/index.ts` にエクスポート追加
- [ ] Impact Verification: `deno check denops/hellshake-yano/main.ts` でコンパイルエラーなし確認

---

## Process 4: テスト基盤整備

<!--@process-briefing
category: implementation
tags: [test, e2e, framework, infrastructure]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: VimScript側のテストは `tests-vim/` に存在。Denops TypeScript側のE2Eテストフレームワークが未整備
- **対象ファイル**:
  - tests/ ディレクトリ
  - tests-vim/ ディレクトリ
  - deno.jsonc (テストタスク定義)

#### Orient（方向付け）
- **方針**: denops-testライブラリを用いたE2Eテスト基盤を整備。IPC呼び出しのモックヘルパーを作成
- **制約**: なし

#### Decide（実装方法）
- `tests/helpers/ipc-mock.ts` にDenops IPCモックを作成
- `tests/helpers/vim-mock.ts` にVimScript呼び出しモックを作成
- `deno.jsonc` にテストタスクを追加

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/helpers/ipc-mock.ts` の仮実装を作成
- [ ] モックを使ったサンプルテストが失敗することを確認

### Green Phase: 最小実装と成功確認
- [ ] `tests/helpers/ipc-mock.ts` 実装:
  - `createMockDenops()`: Denopsオブジェクトのモック生成
  - `createMockDispatcher()`: dispatcher呼び出しのキャプチャ
- [ ] `tests/helpers/vim-mock.ts` 実装:
  - `createMockVimApi()`: Vim API呼び出しのモック
- [ ] `deno.jsonc` に `"test:unit"` と `"test:e2e"` タスクを追加
- [ ] `deno test tests/helpers/` が成功することを確認

### Refactor Phase: 品質改善
- [ ] テストヘルパーの型定義を整備
- [ ] `tests/helpers/index.ts` にエクスポート統合
- [ ] Impact Verification: 既存テストが引き続き通ることを確認


---

## Process 5: ExtmarkDisplayAdapter 実装

<!--@process-briefing
category: implementation
tags: [adapter, extmark, neovim, display]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: extmark-display.ts に `displayHintsOptimized`, `hideHints` 等の関数が存在するが、DisplayAdapterインターフェースを実装したクラスがない
- **対象ファイル**:
  - denops/hellshake-yano/neovim/display/extmark-display.ts
  - denops/hellshake-yano/common/interfaces/display-adapter.ts (Process 1で作成)

#### Orient（方向付け）
- **方針**: `neovim/display/extmark-display-adapter.ts` を新規作成し、DisplayAdapterインターフェースを実装
- **制約**: C-01（popup非互換）、C-04（core.tsモノリスへの変更最小化）
- **依存**: Process 1完了後

#### Decide（実装方法）
- `ExtmarkDisplayAdapter` クラスを作成し `DisplayAdapter` を実装
- 既存の `displayHintsOptimized`, `hideHints` 関数を内部で呼び出す

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/unit/neovim/display/extmark-display-adapter.test.ts` を作成
- [ ] ExtmarkDisplayAdapterのshowHint(), hideAll()の動作テストを記述
- [ ] `deno test` を実行してテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] `denops/hellshake-yano/neovim/display/extmark-display-adapter.ts` を新規作成
- [ ] `ExtmarkDisplayAdapter implements DisplayAdapter` を実装:
  - `showHint()`: extmark-display.tsの既存関数に委譲
  - `hideAll()`: `hideHints()` 関数に委譲
  - `highlightPartialMatches()`: `highlightCandidateHints()` に委譲
  - `showHintWithWindow()`: nvim_open_win近似実装（スタブ可）
  - `getHighlightGroup()`: HighlightManagerに委譲
- [ ] `deno test` を実行してテスト成功を確認

### Refactor Phase: 品質改善
- [ ] エラーハンドリング追加
- [ ] `neovim/display/index.ts` にエクスポート追加
- [ ] Impact Verification: `deno check denops/hellshake-yano/main.ts` でコンパイルエラーなし確認

---

## Process 6: PopupDisplayAdapter 実装

<!--@process-briefing
category: implementation
tags: [adapter, popup, vim, display]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: vim/display/popup-display.ts に VimPopupDisplay クラスが存在。DisplayAdapterインターフェースを実装していない
- **対象ファイル**:
  - denops/hellshake-yano/vim/display/popup-display.ts
  - denops/hellshake-yano/common/interfaces/display-adapter.ts (Process 1で作成)

#### Orient（方向付け）
- **方針**: `PopupDisplayAdapter` を `popup-display.ts` に追加し `DisplayAdapter` を実装
- **制約**: C-05（popup-display.tsのVimPopupDisplayは維持必須）、C-01（extmark非対応）
- **依存**: Process 1完了後

#### Decide（実装方法）
- `PopupDisplayAdapter` クラスを `popup-display.ts` に追加し、内部でVimPopupDisplayに委譲

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/unit/vim/display/popup-display-adapter.test.ts` を作成
- [ ] PopupDisplayAdapterのshowHint(), hideAll()テストを記述
- [ ] `deno test` を実行してテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] `denops/hellshake-yano/vim/display/popup-display.ts` に `PopupDisplayAdapter` クラスを追加:
  - `showHint()`: VimPopupDisplayに委譲
  - `showHintWithWindow()`: VimPopupDisplayのウィンドウ対応関数に委譲
  - `hideAll()`: popup全クリア処理に委譲
  - `highlightPartialMatches()`: VimHighlightに委譲
  - `getHighlightGroup()`: 設定から取得
- [ ] `deno test` を実行してテスト成功を確認

### Refactor Phase: 品質改善
- [ ] VimPopupDisplayとPopupDisplayAdapterの責務境界を明確化
- [ ] Impact Verification: `deno check denops/hellshake-yano/main.ts` でコンパイルエラーなし確認

---

## Process 7: IPC契約テスト

<!--@process-briefing
category: implementation
tags: [test, ipc, contract, integration]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: IPC契約3メソッド（updateConfig, showHintsWithKey, generic bridge）の自動テストが存在しない
- **対象ファイル**:
  - denops/hellshake-yano/main.ts:220 (updateConfig)
  - denops/hellshake-yano/main.ts:767 (showHintsWithKey, Neovim側)
  - denops/hellshake-yano/vim/bridge/vim-bridge.ts (generic bridge)

#### Orient（方向付け）
- **方針**: C-03制約として守るべき3メソッドの契約テストを整備
- **制約**: C-03（IPC契約3メソッド維持必須）
- **依存**: Process 4完了後

#### Decide（実装方法）
- `tests/contract/ipc-contract.test.ts` を作成し、3メソッドの入出力仕様をテスト化

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/contract/ipc-contract.test.ts` を作成
- [ ] updateConfig契約テスト（引数型・戻り値型の検証）を記述
- [ ] showHintsWithKey契約テストを記述
- [ ] generic bridge契約テストを記述
- [ ] `deno test tests/contract/` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] モックを使ったdispatcher呼び出しテストを実装
- [ ] `deno test tests/contract/` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] テストにコメントで契約仕様を明記
- [ ] Impact Verification: CI統合（deno.jsonc の `"test:contract"` タスクに追加）

---

## Process 8: EnvironmentDetector リファクタ

<!--@process-briefing
category: implementation
tags: [refactor, environment, typescript]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: implementation-selector.ts の getImplementationMatrix() で `_editorType` が使われているが、冗長な判定が存在する可能性
- **対象ファイル**:
  - denops/hellshake-yano/implementation-selector.ts:129 (getImplementationMatrix)
  - denops/hellshake-yano/implementation-selector.ts:47 (select)

#### Orient（方向付け）
- **方針**: `_editorType` フィールドの削除可否を検証し、EnvironmentDetectorとの責務分離を明確化
- **制約**: C-03（IPC契約維持）

#### Decide（実装方法）
- getImplementationMatrix() からの `_editorType` 依存を分析
- 削除可能であれば除去し、EnvironmentDetector経由に統一

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/unit/implementation-selector.test.ts` を作成
- [ ] select() が正しくVim/Neovim実装を選択するテストを記述
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] `denops/hellshake-yano/implementation-selector.ts` の `_editorType` 依存を解消
- [ ] getImplementationMatrix() をEnvironmentDetector経由に統一
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] コメント・型定義整備
- [ ] Impact Verification: `deno check denops/hellshake-yano/main.ts` でコンパイルエラーなし確認

---

## Process 9: ImplementationSelector 統合

<!--@process-briefing
category: implementation
tags: [refactor, selector, typescript]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: select() と getImplementationMatrix() に二重実装の疑いあり。initializer.ts:96-98 で userPreference が渡されていない問題
- **対象ファイル**:
  - denops/hellshake-yano/implementation-selector.ts:47 (select)
  - denops/hellshake-yano/implementation-selector.ts:129 (getImplementationMatrix)
  - denops/hellshake-yano/initializer.ts:96

#### Orient（方向付け）
- **方針**: select()とgetImplementationMatrix()の重複ロジックを解消。initializer.tsのuserPreference渡し漏れを修正
- **制約**: なし
- **依存**: Process 8完了後

#### Decide（実装方法）
- select()がgetImplementationMatrix()を使う構造に統一
- initializer.ts:96-98 に userPreference 引数を追加

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/unit/initializer.test.ts` に userPreference 引数テストを追加
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] `implementation-selector.ts` の select() / getImplementationMatrix() 二重実装を解消
- [ ] `initializer.ts:96-98` に userPreference 引数を追加して渡す
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] 型定義整備
- [ ] Impact Verification: `deno check denops/hellshake-yano/main.ts` でコンパイルエラーなし確認


---

## Process 10: config関数の集約

<!--@process-briefing
category: implementation
tags: [phase1, config, aggregation, vimscript]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: config#get / config#set / config#reload がautoload/hellshake_yano_vim/config.vimに存在。Denops側にgetConfig(230)/updateConfig(220)が既存
- **対象ファイル**:
  - autoload/hellshake_yano_vim/config.vim (config#get, config#set, config#reload)
  - autoload/hellshake_yano/config.vim (ブリッジ層)
  - denops/hellshake-yano/main.ts:220 (updateConfig)
  - denops/hellshake-yano/main.ts:230 (getConfig)

#### Orient（方向付け）
- **方針**: autoload/hellshake_yano/config.vim のブリッジ関数から `denops#request` を使ってgetConfig/updateConfigを呼び出す形に書き換え。VimScript側のconfig#get/set/reloadをブリッジ経由に変更
- **制約**: C-03（updateConfig契約維持）
- **依存**: Process 4完了後

#### Decide（実装方法）
1. autoload/hellshake_yano/config.vim に hellshake_yano#config#get() → `denops#request('getConfig', [])` を実装
2. hellshake_yano#config#set() → `denops#request('updateConfig', [args])` を実装
3. hellshake_yano_vim/config.vim の呼び出しをブリッジ経由に変更
4. 全呼び出し元を autoload/hellshake_yano/ 経由に切り替え

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests-vim/config_bridge_test.vim` を作成
- [ ] hellshake_yano#config#get() が denops 経由で値を返すテストを記述
- [ ] テストを実行して失敗することを確認

### Green Phase: 最小実装と成功確認
- [ ] `autoload/hellshake_yano/config.vim` に以下を実装:
  - `hellshake_yano#config#get(key)` → `denops#request('hellshake-yano', 'getConfig', [key])`
  - `hellshake_yano#config#set(key, value)` → `denops#request('hellshake-yano', 'updateConfig', [key, value])`
  - `hellshake_yano#config#reload()` → `denops#request('hellshake-yano', 'updateConfig', [{}])`
- [ ] autoload/hellshake_yano_vim/config.vim の各関数をブリッジ経由に変更（後方互換エイリアスとして存続）
- [ ] テストを実行して成功することを確認

### Refactor Phase: 品質改善
- [ ] 後方互換エイリアスにDeprecation警告コメントを追加
- [ ] Impact Verification: config関数を呼び出している全VimScriptファイルを `grep -r 'hellshake_yano_vim#config'` で検索し呼び出し元確認

---

## Process 11: dictionary関数の集約

<!--@process-briefing
category: implementation
tags: [phase1, dictionary, aggregation, vimscript]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: dictionary#add/clear_cache/is_in_dictionary/reload/show/validate の6関数がautoload/hellshake_yano_vim/dictionary.vimに存在。Denops側に対応dispatcherが全て既存
- **対象ファイル**:
  - autoload/hellshake_yano_vim/dictionary.vim (6関数)
  - autoload/hellshake_yano/dictionary.vim (ブリッジ層)
  - denops/hellshake-yano/main.ts:282 (clearCache)
  - denops/hellshake-yano/main.ts:289 (reloadDictionary)
  - denops/hellshake-yano/main.ts:293 (addToDictionary)
  - denops/hellshake-yano/main.ts:308 (showDictionary)
  - denops/hellshake-yano/main.ts:312 (validateDictionary)
  - denops/hellshake-yano/main.ts:316 (isInDictionary)

#### Orient（方向付け）
- **方針**: 6関数全てをブリッジ層経由のdenops#requestに集約
- **制約**: なし
- **依存**: Process 4完了後

#### Decide（実装方法）
- autoload/hellshake_yano/dictionary.vim に各関数のブリッジ実装を追加
- autoload/hellshake_yano_vim/dictionary.vim の各関数をブリッジ経由に変更

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests-vim/dictionary_bridge_test.vim` を作成
- [ ] hellshake_yano#dictionary#add() 等6関数のブリッジテストを記述
- [ ] テストを実行して失敗することを確認

### Green Phase: 最小実装と成功確認
- [ ] `autoload/hellshake_yano/dictionary.vim` に以下を実装:
  - `hellshake_yano#dictionary#add(word)` → `denops#request('hellshake-yano', 'addToDictionary', [word])`
  - `hellshake_yano#dictionary#clear_cache()` → `denops#request('hellshake-yano', 'clearCache', [])`
  - `hellshake_yano#dictionary#is_in_dictionary(word)` → `denops#request('hellshake-yano', 'isInDictionary', [word])`
  - `hellshake_yano#dictionary#reload()` → `denops#request('hellshake-yano', 'reloadDictionary', [])`
  - `hellshake_yano#dictionary#show()` → `denops#request('hellshake-yano', 'showDictionary', [])`
  - `hellshake_yano#dictionary#validate()` → `denops#request('hellshake-yano', 'validateDictionary', [])`
- [ ] テストを実行して成功することを確認

### Refactor Phase: 品質改善
- [ ] autoload/hellshake_yano_vim/dictionary.vim に Deprecation警告コメントを追加
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#dictionary'` で呼び出し元確認

---

## Process 12: hint_generator関数の集約

<!--@process-briefing
category: implementation
tags: [phase1, hint_generator, aggregation, vimscript]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: hint_generator#generate / hint_generator#clear_cache の2関数がautoload/hellshake_yano_vim/hint_generator.vimに存在。Denops側にgenerateHints(363)/clearCache(282)が既存
- **対象ファイル**:
  - autoload/hellshake_yano_vim/hint_generator.vim
  - autoload/hellshake_yano/hint_generator.vim (ブリッジ層)
  - denops/hellshake-yano/main.ts:363 (generateHints)
  - denops/hellshake-yano/main.ts:282 (clearCache)

#### Orient（方向付け）
- **方針**: 2関数をブリッジ層経由のdenops#requestに集約
- **依存**: Process 4完了後

#### Decide（実装方法）
- autoload/hellshake_yano/hint_generator.vim にブリッジ実装追加

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests-vim/hint_generator_bridge_test.vim` を作成
- [ ] テストを実行して失敗することを確認

### Green Phase: 最小実装と成功確認
- [ ] `autoload/hellshake_yano/hint_generator.vim` に以下を実装:
  - `hellshake_yano#hint_generator#generate(args)` → `denops#request('hellshake-yano', 'generateHints', [args])`
  - `hellshake_yano#hint_generator#clear_cache()` → `denops#request('hellshake-yano', 'clearCache', [])`
- [ ] テストを実行して成功することを確認

### Refactor Phase: 品質改善
- [ ] autoload/hellshake_yano_vim/hint_generator.vim に Deprecation警告コメントを追加
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#hint_generator'` で呼び出し元確認

---

## Process 13: japanese#segment の集約

<!--@process-briefing
category: implementation
tags: [phase1, japanese, aggregation, vimscript]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: japanese#segment がautoload/hellshake_yano_vim/japanese.vimに存在。Denops側にsegmentJapaneseText(240)が既存
- **対象ファイル**:
  - autoload/hellshake_yano_vim/japanese.vim
  - autoload/hellshake_yano/japanese.vim (ブリッジ層)
  - denops/hellshake-yano/main.ts:240 (segmentJapaneseText)

#### Orient（方向付け）
- **方針**: japanese#segment をブリッジ層経由のdenops#requestに集約。japanese#has_japanese/should_segment はカテゴリ4で削除予定
- **依存**: Process 4完了後

#### Decide（実装方法）
- autoload/hellshake_yano/japanese.vim にブリッジ実装追加

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests-vim/japanese_bridge_test.vim` を作成
- [ ] テストを実行して失敗することを確認

### Green Phase: 最小実装と成功確認
- [ ] `autoload/hellshake_yano/japanese.vim` に以下を実装:
  - `hellshake_yano#japanese#segment(text)` → `denops#request('hellshake-yano', 'segmentJapaneseText', [text])`
- [ ] テストを実行して成功することを確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#japanese'` で呼び出し元確認

---

## Process 14: word_detector関数の集約

<!--@process-briefing
category: implementation
tags: [phase1, word_detector, aggregation, vimscript]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: word_detector#detect_visible / detect_multi_window / get_min_length / clear_cache の4関数がautoload/hellshake_yano_vim/word_detector.vimに存在。Denops側に対応dispatcher全て既存
- **対象ファイル**:
  - autoload/hellshake_yano_vim/word_detector.vim
  - autoload/hellshake_yano/word_detector.vim (ブリッジ層)
  - denops/hellshake-yano/main.ts:324 (detectWordsVisible)
  - denops/hellshake-yano/main.ts:337 (detectWordsMultiWindow)
  - denops/hellshake-yano/main.ts:351 (getMinWordLength)
  - denops/hellshake-yano/main.ts:282 (clearCache)

#### Orient（方向付け）
- **方針**: 4関数をブリッジ層経由のdenops#requestに集約
- **依存**: Process 4完了後

#### Decide（実装方法）
- autoload/hellshake_yano/word_detector.vim にブリッジ実装追加

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests-vim/word_detector_bridge_test.vim` を作成
- [ ] テストを実行して失敗することを確認

### Green Phase: 最小実装と成功確認
- [ ] `autoload/hellshake_yano/word_detector.vim` に以下を実装:
  - `hellshake_yano#word_detector#detect_visible()` → `denops#request('hellshake-yano', 'detectWordsVisible', [])`
  - `hellshake_yano#word_detector#detect_multi_window()` → `denops#request('hellshake-yano', 'detectWordsMultiWindow', [])`
  - `hellshake_yano#word_detector#get_min_length()` → `denops#request('hellshake-yano', 'getMinWordLength', [])`
  - `hellshake_yano#word_detector#clear_cache()` → `denops#request('hellshake-yano', 'clearCache', [])`
- [ ] テストを実行して成功することを確認

### Refactor Phase: 品質改善
- [ ] autoload/hellshake_yano_vim/word_detector.vim に Deprecation警告コメントを追加
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#word_detector'` で呼び出し元確認


---

## Process 15: window_detector#get_visible の集約

<!--@process-briefing
category: implementation
tags: [phase1, window_detector, aggregation, vimscript]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: window_detector#get_visible がautoload/hellshake_yano_vim/window_detector.vimに存在。Denops Neovim側にgetVisibleWindows(871)が既存
- **対象ファイル**:
  - autoload/hellshake_yano_vim/window_detector.vim
  - autoload/hellshake_yano/window_detector.vim (ブリッジ層)
  - denops/hellshake-yano/main.ts:871 (getVisibleWindows, Neovim専用)

#### Orient（方向付け）
- **方針**: ブリッジ層経由のdenops#requestに集約。Neovim専用dispatcherのため環境判定が必要
- **制約**: C-02（Vim8ではgetVisibleWindowsが使えない可能性）
- **依存**: Process 4完了後

#### Decide（実装方法）
- autoload/hellshake_yano/window_detector.vim にブリッジ実装追加（Neovim限定フラグ付き）

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests-vim/window_detector_bridge_test.vim` を作成
- [ ] テストを実行して失敗することを確認

### Green Phase: 最小実装と成功確認
- [ ] `autoload/hellshake_yano/window_detector.vim` に以下を実装:
  - `hellshake_yano#window_detector#get_visible()`: Neovimならdenops#request、Vimならフォールバック
- [ ] テストを実行して成功することを確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#window_detector'` で呼び出し元確認

---

## Process 16: core#init/show/hide の集約

<!--@process-briefing
category: implementation
tags: [phase1, core, aggregation, vimscript]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: core#init(42)/core#show(393)/core#hide(607) の3関数がautoload/hellshake_yano_vim/core.vimに存在。Denops側にenable(201)/showHints(630)/hideHints(648)が既存
- **対象ファイル**:
  - autoload/hellshake_yano_vim/core.vim:42 (init)
  - autoload/hellshake_yano_vim/core.vim:393 (show)
  - autoload/hellshake_yano_vim/core.vim:607 (hide)
  - autoload/hellshake_yano/core.vim (ブリッジ層)
  - denops/hellshake-yano/main.ts:201 (enable)
  - denops/hellshake-yano/main.ts:630 (showHints, Neovim専用)
  - denops/hellshake-yano/main.ts:648 (hideHints, Neovim専用)

#### Orient（方向付け）
- **方針**: 3関数をブリッジ層経由のdenops#requestに集約
- **制約**: showHints/hideHintsはNeovim専用dispatcher。Vim環境でのフォールバック検討必要
- **依存**: Process 4完了後

#### Decide（実装方法）
- autoload/hellshake_yano/core.vim にブリッジ実装追加（環境判定あり）

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests-vim/core_bridge_test.vim` を作成
- [ ] hellshake_yano#core#init() / show() / hide() のブリッジテストを記述
- [ ] テストを実行して失敗することを確認

### Green Phase: 最小実装と成功確認
- [ ] `autoload/hellshake_yano/core.vim` に以下を実装:
  - `hellshake_yano#core#init()` → `denops#request('hellshake-yano', 'enable', [])`
  - `hellshake_yano#core#show()` → Neovim: `showHints`, Vim: `displayShowHint`
  - `hellshake_yano#core#hide()` → Neovim: `hideHints`, Vim: `displayHideAll`
- [ ] テストを実行して成功することを確認

### Refactor Phase: 品質改善
- [ ] autoload/hellshake_yano_vim/core.vim の3関数にDeprecation警告コメントを追加
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#core#init\|hellshake_yano_vim#core#show\|hellshake_yano_vim#core#hide'`

---

## Process 17: motion#set_threshold/set_timeout の集約

<!--@process-briefing
category: implementation
tags: [phase1, motion, aggregation, vimscript]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: motion#set_threshold(188) / motion#set_timeout(206) の2関数がautoload/hellshake_yano_vim/motion.vimに存在。Denops Neovim側にsetCount(615)/setTimeout(623)が既存
- **対象ファイル**:
  - autoload/hellshake_yano_vim/motion.vim:188 (set_threshold)
  - autoload/hellshake_yano_vim/motion.vim:206 (set_timeout)
  - autoload/hellshake_yano/motion.vim (ブリッジ層)
  - denops/hellshake-yano/main.ts:615 (setCount, Neovim専用)
  - denops/hellshake-yano/main.ts:623 (setTimeout, Neovim専用)

#### Orient（方向付け）
- **方針**: 2関数をブリッジ層経由のdenops#requestに集約。Neovim専用dispatcherのため環境判定が必要
- **制約**: カテゴリ3のmotion expr系はVimScript維持必須
- **依存**: Process 4完了後

#### Decide（実装方法）
- autoload/hellshake_yano/motion.vim にブリッジ実装追加

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests-vim/motion_bridge_test.vim` を作成
- [ ] テストを実行して失敗することを確認

### Green Phase: 最小実装と成功確認
- [ ] `autoload/hellshake_yano/motion.vim` に以下を実装:
  - `hellshake_yano#motion#set_threshold(n)` → `denops#request('hellshake-yano', 'setCount', [n])`（Neovim）/ Vim側対応
  - `hellshake_yano#motion#set_timeout(ms)` → `denops#request('hellshake-yano', 'setTimeout', [ms])`（Neovim）/ Vim側対応
- [ ] テストを実行して成功することを確認

### Refactor Phase: 品質改善
- [ ] autoload/hellshake_yano_vim/motion.vim の2関数にDeprecation警告コメントを追加
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#motion#set_threshold\|hellshake_yano_vim#motion#set_timeout'`

---

## Process 18: Phase 1 統合テスト

<!--@process-briefing
category: implementation
tags: [phase1, test, integration]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: Process 10-17で21関数のブリッジ集約が完了。統合テストで全体動作確認が必要
- **対象ファイル**:
  - tests-vim/ 配下の各ブリッジテスト
  - autoload/hellshake_yano/ 配下の全ブリッジ実装

#### Orient（方向付け）
- **方針**: 21関数全てについてNeovim+Denops環境とVim+Denops環境での動作を確認
- **依存**: Process 10-17全て完了後

#### Decide（実装方法）
- `tests-vim/phase1_integration_test.vim` を作成して全21関数のE2Eテストを実施

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests-vim/phase1_integration_test.vim` を作成
- [ ] 21関数全てのブリッジ経由呼び出しテストを記述
- [ ] テストを実行して全テストが通ることを確認（失敗するものを特定）

### Green Phase: 最小実装と成功確認
- [ ] 各関数のブリッジ実装を修正して全テストが通ることを確認
- [ ] `vim -u NONE -S tests-vim/phase1_integration_test.vim` で成功確認

### Refactor Phase: 品質改善
- [ ] テスト結果のサマリーを tests-vim/RESULTS.md に記録
- [ ] Impact Verification: 既存の全テストが引き続き通ることを確認

---

## Process 19: Phase 1 VimScript側コード削除確認

<!--@process-briefing
category: implementation
tags: [phase1, cleanup, vimscript]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: Process 18でPhase 1統合テスト完了。ブリッジ経由への移行が確認できたら、autoload/hellshake_yano_vim/の21関数をDeprecated化
- **対象ファイル**:
  - autoload/hellshake_yano_vim/config.vim
  - autoload/hellshake_yano_vim/dictionary.vim
  - autoload/hellshake_yano_vim/hint_generator.vim
  - autoload/hellshake_yano_vim/japanese.vim
  - autoload/hellshake_yano_vim/word_detector.vim
  - autoload/hellshake_yano_vim/window_detector.vim
  - autoload/hellshake_yano_vim/core.vim (init/show/hide の3関数)
  - autoload/hellshake_yano_vim/motion.vim (set_threshold/set_timeout の2関数)

#### Orient（方向付け）
- **方針**: 各VimScript関数を `call hellshake_yano#XXX(...)` に変更してブリッジ経由の薄いラッパーに。削除はPhase 4で実施
- **依存**: Process 18完了後

#### Decide（実装方法）
- 各autoload/hellshake_yano_vim/XXX.vimの対象関数をブリッジ経由の1行ラッパーに差し替え

---

### Red Phase: テスト作成と失敗確認
- [ ] ラッパー化後のテストを事前に記述
- [ ] テストを実行して失敗することを確認

### Green Phase: 最小実装と成功確認
- [ ] 21関数全てを `call hellshake_yano#XXX(...)` の1行ラッパーに書き換え
- [ ] テストを実行して成功することを確認

### Refactor Phase: 品質改善
- [ ] 各ラッパー関数にDeprecation警告 `echomsg` を追加
- [ ] Impact Verification: Phase 1統合テストが引き続き通ることを確認


---

## Process 50: DisplayAdapter — display#show_hint 実装

<!--@process-briefing
category: implementation
tags: [phase2, display, adapter, extmark]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: display#show_hint(display.vim:171) がVimScript側に存在。Denops Vim側にdisplayShowHint(386)が既存。ExtmarkDisplayAdapterには未実装
- **対象ファイル**:
  - autoload/hellshake_yano_vim/display.vim:171
  - denops/hellshake-yano/main.ts:386 (displayShowHint, Vim専用)
  - denops/hellshake-yano/neovim/display/extmark-display-adapter.ts (Process 5で作成)

#### Orient（方向付け）
- **方針**: ExtmarkDisplayAdapter.showHint() の完全実装。既存extmark-display.tsの関数を活用
- **制約**: C-01（Neovim extmark API使用）
- **依存**: Process 5完了後

#### Decide（実装方法）
- ExtmarkDisplayAdapter.showHint() を extmark-display.ts の displayHintsOptimized に委譲する形で実装

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/unit/neovim/display/extmark-display-adapter.test.ts` に showHint() テストを追加
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] `ExtmarkDisplayAdapter.showHint()` を実装
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] エラーハンドリング追加
- [ ] Impact Verification: `deno check denops/hellshake-yano/main.ts` でコンパイルエラーなし確認

---

## Process 51: DisplayAdapter — display#show_hint_with_window 実装

<!--@process-briefing
category: implementation
tags: [phase2, display, adapter, extmark, high-cost]
complexity_estimate: high
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: display#show_hint_with_window(display.vim:296) がVimScript側に存在。Denops Vim側にdisplayShowHintWithWindow(403)が既存。C-01の最大障壁
- **対象ファイル**:
  - autoload/hellshake_yano_vim/display.vim:296
  - denops/hellshake-yano/main.ts:403 (displayShowHintWithWindow, Vim専用)
  - denops/hellshake-yano/neovim/display/extmark-display-adapter.ts

#### Orient（方向付け）
- **方針**: Neovim側は `nvim_open_win()` 近似実装。PopupとExtmarkでウィンドウ表示の挙動が異なる問題に対処
- **制約**: C-01（popup/extmark非互換が最も顕著に現れる箇所）
- **依存**: Process 50完了後

#### Decide（実装方法）
1. Neovim側: nvim_open_win を使ったフローティングウィンドウ表示
2. Vim側: 既存のPopupDisplayAdapterに委譲
3. 両者の動作差異をドキュメント化

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/unit/neovim/display/extmark-display-adapter.test.ts` に showHintWithWindow() テストを追加
- [ ] Vim側とNeovim側の動作差異テストを記述
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] `ExtmarkDisplayAdapter.showHintWithWindow()` を nvim_open_win を使って実装
- [ ] `PopupDisplayAdapter.showHintWithWindow()` を既存のVimPopupDisplay APIに委譲
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] 動作差異をコメントでドキュメント化
- [ ] Impact Verification: Neovim + Vim 両環境での手動確認手順を tests/MANUAL.md に記載

---

## Process 52: DisplayAdapter — display#hide_all 実装

<!--@process-briefing
category: implementation
tags: [phase2, display, adapter]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: display#hide_all(display.vim:392) がVimScript側に存在。Denops Vim側にdisplayHideAll(420)が既存
- **対象ファイル**:
  - autoload/hellshake_yano_vim/display.vim:392
  - denops/hellshake-yano/main.ts:420 (displayHideAll, Vim専用)
  - denops/hellshake-yano/neovim/display/extmark-display-adapter.ts

#### Orient（方向付け）
- **方針**: ExtmarkDisplayAdapter.hideAll() と PopupDisplayAdapter.hideAll() を実装
- **依存**: Process 5, 6完了後

#### Decide（実装方法）
- hideAll() を extmark-display.ts の hideHints / VimPopupDisplay のクリア処理に委譲

---

### Red Phase: テスト作成と失敗確認
- [ ] hideAll() テストを追加
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] `ExtmarkDisplayAdapter.hideAll()` 実装
- [ ] `PopupDisplayAdapter.hideAll()` 実装
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: `deno check denops/hellshake-yano/main.ts` でコンパイルエラーなし確認

---

## Process 53: DisplayAdapter — display#highlight_partial_matches 実装

<!--@process-briefing
category: implementation
tags: [phase2, display, highlight, adapter]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: display#highlight_partial_matches(display.vim:470) がVimScript側に存在。Denops側にdisplayHighlightPartialMatches(425)が既存
- **対象ファイル**:
  - autoload/hellshake_yano_vim/display.vim:470
  - denops/hellshake-yano/main.ts:425
  - denops/hellshake-yano/neovim/display/extmark-display-adapter.ts

#### Orient（方向付け）
- **方針**: ExtmarkDisplayAdapter.highlightPartialMatches() を HighlightManager に委譲
- **依存**: Process 5完了後

#### Decide（実装方法）
- highlightPartialMatches() を neovim/display/highlight.ts の HighlightManager に委譲

---

### Red Phase: テスト作成と失敗確認
- [ ] highlightPartialMatches() テストを追加
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] `ExtmarkDisplayAdapter.highlightPartialMatches()` 実装
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: `deno check denops/hellshake-yano/main.ts` でコンパイルエラーなし確認

---

## Process 54: DisplayAdapter — display#get_highlight_group dispatcher

<!--@process-briefing
category: implementation
tags: [phase2, display, highlight, dispatcher]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: display#get_highlight_group(display.vim:65) がVimScript側に存在。Denops側にdispatcherなし
- **対象ファイル**:
  - autoload/hellshake_yano_vim/display.vim:65
  - denops/hellshake-yano/main.ts (getHighlightGroup dispatcher追加が必要)
  - denops/hellshake-yano/neovim/display/extmark-display-adapter.ts

#### Orient（方向付け）
- **方針**: main.ts に getHighlightGroup dispatcher を追加し、ExtmarkDisplayAdapter.getHighlightGroup() を実装
- **依存**: Process 5完了後

#### Decide（実装方法）
- main.ts に `getHighlightGroup` dispatcher を追加
- ExtmarkDisplayAdapter.getHighlightGroup() を設定/HighlightManagerから取得

---

### Red Phase: テスト作成と失敗確認
- [ ] getHighlightGroup() テストを追加
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] `denops/hellshake-yano/main.ts` に getHighlightGroup dispatcher を追加
- [ ] `ExtmarkDisplayAdapter.getHighlightGroup()` 実装
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: `deno check denops/hellshake-yano/main.ts` でコンパイルエラーなし確認


---

## Process 55: core#show_with_motion 複合API

<!--@process-briefing
category: implementation
tags: [phase2, core, motion, composite-api]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: core#show_with_motion(core.vim:381) がVimScript側に存在。motionDetect + showHintsの複合操作。Denops側に直接対応するdispatcherなし
- **対象ファイル**:
  - autoload/hellshake_yano_vim/core.vim:381
  - denops/hellshake-yano/main.ts:441 (motionDetect, Vim専用)
  - denops/hellshake-yano/main.ts:630 (showHints, Neovim専用)

#### Orient（方向付け）
- **方針**: main.ts に `showHintsWithMotion` 複合dispatcher を追加。内部でmotionDetect + showHints を呼び出す
- **依存**: Process 16完了後

#### Decide（実装方法）
- main.ts に `showHintsWithMotion(args)` dispatcher を追加
- motionDetect → showHints の連鎖呼び出しをTypeScript側で実装

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/unit/main-dispatcher.test.ts` に showHintsWithMotion テストを追加
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] `denops/hellshake-yano/main.ts` に `showHintsWithMotion` dispatcher を追加
- [ ] autoload/hellshake_yano/core.vim に `hellshake_yano#core#show_with_motion()` ブリッジを実装
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] autoload/hellshake_yano_vim/core.vim:381 に Deprecation警告コメントを追加
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#core#show_with_motion'` で呼び出し元確認

---

## Process 56: core#show_with_motion_timer 非同期タイマー版

<!--@process-briefing
category: implementation
tags: [phase2, core, motion, async, timer]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: core#show_with_motion_timer(core.vim:388) がVimScript側に存在。非同期タイマー版
- **対象ファイル**:
  - autoload/hellshake_yano_vim/core.vim:388
  - denops/hellshake-yano/main.ts (showHintsWithMotionTimer dispatcher追加が必要)

#### Orient（方向付け）
- **方針**: main.ts に `showHintsWithMotionTimer` dispatcher を追加。TypeScript側でsetTimeout/非同期処理を実装
- **依存**: Process 55完了後

#### Decide（実装方法）
- `showHintsWithMotionTimer(delay: number)` dispatcher をmain.tsに追加

---

### Red Phase: テスト作成と失敗確認
- [ ] showHintsWithMotionTimer テストを追加
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] `denops/hellshake-yano/main.ts` に `showHintsWithMotionTimer` dispatcher を追加
- [ ] autoload/hellshake_yano/core.vim に `hellshake_yano#core#show_with_motion_timer()` ブリッジを実装
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#core#show_with_motion_timer'` で呼び出し元確認

---

## Process 57: core#show_delayed 遅延表示

<!--@process-briefing
category: implementation
tags: [phase2, core, delay, dispatcher]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: core#show_delayed(core.vim:210) がVimScript側に存在
- **対象ファイル**:
  - autoload/hellshake_yano_vim/core.vim:210
  - denops/hellshake-yano/main.ts (showDelayed dispatcher追加が必要)

#### Orient（方向付け）
- **方針**: main.ts に `showDelayed` dispatcher を追加
- **依存**: Process 16完了後

#### Decide（実装方法）
- `showDelayed(delay: number)` dispatcher をmain.tsに追加

---

### Red Phase: テスト作成と失敗確認
- [ ] showDelayed テストを追加
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] `denops/hellshake-yano/main.ts` に `showDelayed` dispatcher を追加
- [ ] autoload/hellshake_yano/core.vim に `hellshake_yano#core#show_delayed()` ブリッジを実装
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#core#show_delayed'` で呼び出し元確認

---

## Process 58: core#get_state → getStatistics拡張

<!--@process-briefing
category: implementation
tags: [phase2, core, state, statistics]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: core#get_state(core.vim:80) がVimScript側に存在。Denops側にgetStatistics dispatcherが存在するが、返す情報が異なる可能性
- **対象ファイル**:
  - autoload/hellshake_yano_vim/core.vim:80
  - denops/hellshake-yano/main.ts (getStatistics dispatcher)

#### Orient（方向付け）
- **方針**: getStatistics dispatcherを拡張してcore#get_stateが返す全フィールドをカバー
- **依存**: Process 16完了後

#### Decide（実装方法）
- getStatistics の戻り値に state フィールドを追加
- autoload/hellshake_yano/core.vim に hellshake_yano#core#get_state() ブリッジを実装

---

### Red Phase: テスト作成と失敗確認
- [ ] getStatisticsの拡張フィールドテストを追加
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] getStatistics の戻り値を拡張
- [ ] autoload/hellshake_yano/core.vim に hellshake_yano#core#get_state() を実装
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: `deno check denops/hellshake-yano/main.ts` でコンパイルエラーなし確認

---

## Process 59: core#get_fixed_positions 新規API

<!--@process-briefing
category: implementation
tags: [phase2, core, positions, new-api]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: core#get_fixed_positions(core.vim:276) がVimScript側に存在。Denops側に対応APIなし
- **対象ファイル**:
  - autoload/hellshake_yano_vim/core.vim:276
  - denops/hellshake-yano/main.ts (getFixedPositions dispatcher追加が必要)
  - denops/hellshake-yano/neovim/core/core.ts (3660行モノリス)

#### Orient（方向付け）
- **方針**: main.ts に `getFixedPositions` dispatcher を新規追加。C-04制約によりcore.tsへの変更は最小限
- **制約**: C-04（core.ts 3660行モノリスへの変更最小化）
- **依存**: Process 16完了後

#### Decide（実装方法）
- main.ts に `getFixedPositions()` dispatcher を追加
- core.ts からの固定位置データ取得ロジックをmain.ts側に実装

---

### Red Phase: テスト作成と失敗確認
- [ ] getFixedPositions テストを追加
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] `denops/hellshake-yano/main.ts` に `getFixedPositions` dispatcher を追加
- [ ] autoload/hellshake_yano/core.vim に `hellshake_yano#core#get_fixed_positions()` ブリッジを実装
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#core#get_fixed_positions'` で呼び出し元確認

---

## Process 60: core#should_redraw 統合

<!--@process-briefing
category: implementation
tags: [phase2, core, redraw, integration]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: core#should_redraw(core.vim:198) がVimScript側に存在。内部判定ロジックをDenops側に移動
- **対象ファイル**:
  - autoload/hellshake_yano_vim/core.vim:198
  - denops/hellshake-yano/main.ts

#### Orient（方向付け）
- **方針**: should_redraw の判定ロジックをDenops側に移動し、ブリッジ経由で呼び出す
- **依存**: Process 16完了後

#### Decide（実装方法）
- main.ts に `shouldRedraw()` dispatcher を追加

---

### Red Phase: テスト作成と失敗確認
- [ ] shouldRedraw テストを追加
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] `denops/hellshake-yano/main.ts` に `shouldRedraw` dispatcher を追加
- [ ] autoload/hellshake_yano/core.vim に `hellshake_yano#core#should_redraw()` ブリッジを実装
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#core#should_redraw'` で呼び出し元確認


---

## Process 61: motion#get_state dispatcher

<!--@process-briefing
category: implementation
tags: [phase2, motion, state, dispatcher]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: motion#get_state(motion.vim:170) がVimScript側に存在。Denops側にdispatcherなし
- **対象ファイル**:
  - autoload/hellshake_yano_vim/motion.vim:170
  - denops/hellshake-yano/main.ts (motionGetState dispatcher追加が必要)
  - denops/hellshake-yano/vim/features/motion.ts (VimMotionDetector)

#### Orient（方向付け）
- **方針**: main.ts に `motionGetState` dispatcher を追加
- **依存**: Process 17完了後

#### Decide（実装方法）
- main.ts に `motionGetState()` dispatcher を追加
- VimMotionDetector / NeovimMotionDetector から状態取得

---

### Red Phase: テスト作成と失敗確認
- [ ] motionGetState テストを追加
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] `denops/hellshake-yano/main.ts` に `motionGetState` dispatcher を追加
- [ ] autoload/hellshake_yano/motion.vim に `hellshake_yano#motion#get_state()` ブリッジを実装
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#motion#get_state'` で呼び出し元確認

---

## Process 62: motion#handle 代替

<!--@process-briefing
category: implementation
tags: [phase2, motion, handle, dispatcher]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: motion#handle(motion.vim:493) がVimScript側に存在。showHints + setCount の代替として実装
- **対象ファイル**:
  - autoload/hellshake_yano_vim/motion.vim:493
  - denops/hellshake-yano/main.ts:615 (setCount)
  - denops/hellshake-yano/main.ts:630 (showHints)

#### Orient（方向付け）
- **方針**: setCount + showHints の連鎖呼び出しで代替。Process 55で作成したshowHintsWithMotion複合APIを活用
- **依存**: Process 55, 17完了後

#### Decide（実装方法）
- autoload/hellshake_yano/motion.vim に `hellshake_yano#motion#handle(key)` をブリッジ実装

---

### Red Phase: テスト作成と失敗確認
- [ ] motion#handle ブリッジテストを追加
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] autoload/hellshake_yano/motion.vim に `hellshake_yano#motion#handle(key)` を実装
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#motion#handle[^_]'` で呼び出し元確認

---

## Process 63: visual#show → detectWordsInVisualRange新規

<!--@process-briefing
category: implementation
tags: [phase2, visual, word-detection, new-api]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: visual#show(visual.vim:102) がVimScript側に存在。Denops Vim側にdetectWordsInVisualRange(534)が既存（Vim専用）。Neovim側に対応なし
- **対象ファイル**:
  - autoload/hellshake_yano_vim/visual.vim:102
  - denops/hellshake-yano/main.ts:534 (detectWordsInVisualRange, Vim専用)
  - denops/hellshake-yano/vim/features/visual.ts (VimVisual)

#### Orient（方向付け）
- **方針**: Neovim側にもdetectWordsInVisualRange相当のdispatcherを追加。VimVisualとNeovim共通APIで抽象化
- **制約**: C-01（実装が異なる）
- **依存**: Process 3（VisualHandler IF）完了後

#### Decide（実装方法）
- Neovim側のdetectWordsInVisualRange dispatcher を main.ts に追加
- autoload/hellshake_yano/visual.vim に `hellshake_yano#visual#show()` ブリッジを実装

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/unit/visual-handler.test.ts` に detectWordsInVisualRange テストを追加
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] Neovim側 `detectWordsInVisualRange` dispatcher を main.ts に追加
- [ ] autoload/hellshake_yano/visual.vim に `hellshake_yano#visual#show()` ブリッジを実装
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] autoload/hellshake_yano_vim/visual.vim:102 に Deprecation警告コメントを追加
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#visual#show'` で呼び出し元確認

---

## Process 64: visual#init / visual#get_state

<!--@process-briefing
category: implementation
tags: [phase2, visual, init, state]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: visual#init(visual.vim:60) / visual#get_state(visual.vim:71) がVimScript側に存在
- **対象ファイル**:
  - autoload/hellshake_yano_vim/visual.vim:60 (init)
  - autoload/hellshake_yano_vim/visual.vim:71 (get_state)
  - denops/hellshake-yano/main.ts (dispatcher追加が必要)

#### Orient（方向付け）
- **方針**: enable dispatcher（Process 16で使用）の再利用またはvisualInit/visualGetState dispatcherを追加
- **依存**: Process 3, 63完了後

#### Decide（実装方法）
- main.ts に `visualInit` / `visualGetState` dispatcher を追加

---

### Red Phase: テスト作成と失敗確認
- [ ] visualInit / visualGetState テストを追加
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] `denops/hellshake-yano/main.ts` に `visualInit` / `visualGetState` dispatcher を追加
- [ ] autoload/hellshake_yano/visual.vim に対応ブリッジを実装
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#visual#init\|hellshake_yano_vim#visual#get_state'` で呼び出し元確認

---

## Process 65: filter#by_direction word-detector統合

<!--@process-briefing
category: implementation
tags: [phase2, filter, word-detector, integration]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: filter#by_direction が autoload/hellshake_yano_vim/filter.vim に存在。word-detector内に統合予定
- **対象ファイル**:
  - autoload/hellshake_yano_vim/filter.vim
  - denops/hellshake-yano/ (word-detector実装)

#### Orient（方向付け）
- **方針**: filter#by_direction のロジックをDenops word-detector内に統合し、VimScript側から呼び出し不要にする
- **依存**: Process 14完了後

#### Decide（実装方法）
- detectWordsVisible/detectWordsMultiWindow のオプション引数として方向フィルタを実装

---

### Red Phase: テスト作成と失敗確認
- [ ] 方向フィルタつきword-detectionテストを追加
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] Denops word-detector に方向フィルタオプションを追加
- [ ] autoload/hellshake_yano/filter.vim に `hellshake_yano#filter#by_direction()` ブリッジを実装
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] autoload/hellshake_yano_vim/filter.vim に Deprecation警告コメントを追加
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#filter'` で呼び出し元確認

---

## Process 66: input#get_partial_matches 代替

<!--@process-briefing
category: implementation
tags: [phase2, input, partial-matches, dispatcher]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: input#get_partial_matches(input.vim:309) がVimScript側に存在。highlightCandidateHints(660)で代替可能
- **対象ファイル**:
  - autoload/hellshake_yano_vim/input.vim:309
  - denops/hellshake-yano/main.ts:660 (highlightCandidateHints)

#### Orient（方向付け）
- **方針**: highlightCandidateHints dispatcherの戻り値でpartial matchesを返す形に拡張
- **依存**: Process 4完了後

#### Decide（実装方法）
- highlightCandidateHints の戻り値にpartialMatchesフィールドを追加

---

### Red Phase: テスト作成と失敗確認
- [ ] highlightCandidateHints拡張テストを追加
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] `denops/hellshake-yano/main.ts:660` の戻り値を拡張
- [ ] autoload/hellshake_yano/input.vim に `hellshake_yano#input#get_partial_matches()` ブリッジを実装
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] autoload/hellshake_yano_vim/input.vim:309 に Deprecation警告コメントを追加
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#input#get_partial_matches'` で呼び出し元確認

---

## Process 67: word_filter#apply 統合

<!--@process-briefing
category: implementation
tags: [phase2, word_filter, integration]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: word_filter#apply が autoload/hellshake_yano_vim/word_filter.vim に存在。内部統合予定
- **対象ファイル**:
  - autoload/hellshake_yano_vim/word_filter.vim
  - denops/hellshake-yano/ (word-detector実装)

#### Orient（方向付け）
- **方針**: word_filter#apply のロジックをDenops word-detector内に統合
- **依存**: Process 14完了後

#### Decide（実装方法）
- detectWordsVisible のフィルタオプションとしてword_filterを統合

---

### Red Phase: テスト作成と失敗確認
- [ ] word_filterオプションつきword-detectionテストを追加
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] Denops word-detector にword_filterオプションを統合
- [ ] autoload/hellshake_yano/word_filter.vim に薄いブリッジを実装
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] autoload/hellshake_yano_vim/word_filter.vim に Deprecation警告コメントを追加
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#word_filter'` で呼び出し元確認

---

## Process 68: Phase 2 統合テスト

<!--@process-briefing
category: implementation
tags: [phase2, test, integration]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: Process 50-67でPhase 2の18-20関数の新規実装が完了。統合テストで全体動作確認が必要
- **対象ファイル**: tests/ および tests-vim/ 配下の全テスト

#### Orient（方向付け）
- **方針**: Phase 2の全関数についてNeovim+Denops環境での動作を確認
- **依存**: Process 50-67全て完了後

#### Decide（実装方法）
- `tests-vim/phase2_integration_test.vim` を作成して全Phase 2関数のE2Eテストを実施

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests-vim/phase2_integration_test.vim` を作成
- [ ] Phase 2の18-20関数全てのブリッジ経由呼び出しテストを記述
- [ ] テストを実行して失敗するものを特定

### Green Phase: 最小実装と成功確認
- [ ] 各関数の実装を修正して全テストが通ることを確認

### Refactor Phase: 品質改善
- [ ] Phase 1 + Phase 2合算の回帰テストを実施
- [ ] Impact Verification: 既存の全テストが引き続き通ることを確認


---

## Process 100: setup_unified_mappings() motionマッピング書き換え

<!--@process-briefing
category: implementation
tags: [phase3, unified, mapping, motion, vimscript]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: plugin/hellshake-yano-unified.vim:199 で `hellshake_yano_vim#motion#handle_with_count` を直接呼出。Denops dispatcher経由に変更が必要
- **対象ファイル**:
  - plugin/hellshake-yano-unified.vim:193 (setup_unified_mappings())
  - plugin/hellshake-yano-unified.vim:199 (nnoremap行)
  - autoload/hellshake_yano_vim/motion.vim:334 (handle_with_count, カテゴリ3維持)

#### Orient（方向付け）
- **方針**: nnoremap マッピングを `denops#request('hellshake-yano', 'motionDetect', [...])` 経由に書き換え。またはhellshake_yano#motion#handle_with_count() ブリッジ経由
- **制約**: カテゴリ3のhandle_with_countはgetchar入力ループのためVimScript維持必須
- **依存**: Process 62完了後

#### Decide（実装方法）
- unified.vim:199 の nnoremap を `call hellshake_yano#motion#handle_with_count(v:count)` に変更（autoload/hellshake_yano/ ブリッジ経由）

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests-vim/phase3_mapping_test.vim` を作成
- [ ] motionマッピングがブリッジ経由で動作するテストを記述
- [ ] テストを実行して失敗することを確認

### Green Phase: 最小実装と成功確認
- [ ] `plugin/hellshake-yano-unified.vim:199` のnnoremap を以下に変更:
  ```vim
  nnoremap <silent> <expr> ... '<Cmd>call hellshake_yano#motion#handle_with_count(' . v:count . ')<CR>'
  ```
- [ ] autoload/hellshake_yano/motion.vim に `hellshake_yano#motion#handle_with_count()` を実装
- [ ] テストを実行して成功することを確認

### Refactor Phase: 品質改善
- [ ] マッピング変更箇所にコメントを追加
- [ ] Impact Verification: Neovim + Vim 両環境でのキーマッピング動作を手動確認

---

## Process 101: setup_unified_mappings() visualマッピング書き換え

<!--@process-briefing
category: implementation
tags: [phase3, unified, mapping, visual, vimscript]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: plugin/hellshake-yano-unified.vim:211 で `hellshake_yano_vim#motion#visual_schedule` を直接呼出
- **対象ファイル**:
  - plugin/hellshake-yano-unified.vim:211 (xnoremap行)
  - autoload/hellshake_yano_vim/motion.vim:582 (visual_schedule, カテゴリ3維持)

#### Orient（方向付け）
- **方針**: xnoremap マッピングを hellshake_yano#motion#visual_schedule() ブリッジ経由に変更
- **制約**: visual_scheduleはVimScript維持必須（カテゴリ3）
- **依存**: Process 63完了後

#### Decide（実装方法）
- unified.vim:211 の xnoremap を autoload/hellshake_yano/ ブリッジ経由に変更

---

### Red Phase: テスト作成と失敗確認
- [ ] visualマッピングのブリッジ動作テストを追加
- [ ] テストを実行して失敗することを確認

### Green Phase: 最小実装と成功確認
- [ ] `plugin/hellshake-yano-unified.vim:211` の xnoremap を変更
- [ ] autoload/hellshake_yano/motion.vim に `hellshake_yano#motion#visual_schedule()` を実装
- [ ] テストを実行して成功することを確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: ビジュアルモードでのマッピング動作を手動確認

---

## Process 102: setup_vimscript_mappings() visualマッピング書き換え

<!--@process-briefing
category: implementation
tags: [phase3, unified, mapping, visual, vimscript]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: plugin/hellshake-yano-unified.vim:266 で `hellshake_yano_vim#visual#show()` を直接呼出
- **対象ファイル**:
  - plugin/hellshake-yano-unified.vim:226 (setup_vimscript_mappings())
  - plugin/hellshake-yano-unified.vim:266 (visual#show呼出行)

#### Orient（方向付け）
- **方針**: unified.vim:266 の呼び出しを `denops#request('hellshake-yano', 'detectWordsInVisualRange', [...])` 経由に変更
- **依存**: Process 63完了後

#### Decide（実装方法）
- unified.vim:266 を `call hellshake_yano#visual#show()` に変更

---

### Red Phase: テスト作成と失敗確認
- [ ] setup_vimscript_mappings visualマッピングのテストを追加
- [ ] テストを実行して失敗することを確認

### Green Phase: 最小実装と成功確認
- [ ] `plugin/hellshake-yano-unified.vim:266` の呼び出しを変更
- [ ] テストを実行して成功することを確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: Vim環境でのvisualマッピング動作を手動確認

---

## Process 103: unified.vim s:show_hints_visual() 関数書き換え

<!--@process-briefing
category: implementation
tags: [phase3, unified, visual, vimscript]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: plugin/hellshake-yano-unified.vim に s:show_hints_visual() 関数が存在し、VimScript直接呼び出しが含まれる可能性
- **対象ファイル**:
  - plugin/hellshake-yano-unified.vim

#### Orient（方向付け）
- **方針**: s:show_hints_visual() をブリッジ層経由の実装に書き換え
- **依存**: Process 63, 102完了後

#### Decide（実装方法）
- s:show_hints_visual() を `call hellshake_yano#visual#show()` に置き換え

---

### Red Phase: テスト作成と失敗確認
- [ ] s:show_hints_visual()の動作テストを追加
- [ ] テストを実行して失敗することを確認

### Green Phase: 最小実装と成功確認
- [ ] s:show_hints_visual() をブリッジ経由に書き換え
- [ ] テストを実行して成功することを確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: unified.vim の全マッピングを手動確認

---

## Process 104: カテゴリ3関数の責務移動 (19関数)

<!--@process-briefing
category: implementation
tags: [phase3, category3, bridge, responsibility-move]
complexity_estimate: high
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: カテゴリ3の19関数がautoload/hellshake_yano_vim/に存在。autoload/hellshake_yano/（ブリッジ層）に責務移動が必要
- **対象ファイル**:
  - autoload/hellshake_yano_vim/input.vim:43,74,217,292 (input系4関数)
  - autoload/hellshake_yano_vim/jump.vim (jump系2関数)
  - autoload/hellshake_yano_vim/key_repeat.vim (key_repeat系6関数)
  - autoload/hellshake_yano_vim/motion.vim:530,574,582,627 (expr系4関数) + motion.vim:334
  - autoload/hellshake_yano_vim/core.vim:129,155 (autocmd系2関数)
  - autoload/hellshake_yano/ 配下の対応ブリッジファイル

#### Orient（方向付け）
- **方針**: 各関数のロジックをそのままautoload/hellshake_yano/配下のブリッジ層ファイルに移動。autoload/hellshake_yano_vim/側はブリッジ呼び出しのエイリアスに変更
- **制約**: これらの関数はVimScript必須（getchar, reltime, <expr>マッピング, autocmd）
- **依存**: Process 100-103完了後

#### Decide（実装方法）
1. autoload/hellshake_yano/input.vim に input系4関数を移動
2. autoload/hellshake_yano/jump.vim に jump系2関数を移動
3. autoload/hellshake_yano/key_repeat.vim に key_repeat系6関数を移動
4. autoload/hellshake_yano/motion.vim に expr系5関数を移動
5. autoload/hellshake_yano/core.vim に autocmd系2関数を移動

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests-vim/phase3_category3_test.vim` を作成
- [ ] 19関数全ての動作テストを記述
- [ ] テストを実行して失敗することを確認

### Green Phase: 最小実装と成功確認
- [ ] autoload/hellshake_yano/input.vim に input#start / stop / wait_for_input / get_state を移動
- [ ] autoload/hellshake_yano/jump.vim に jump#to / to_window を移動
- [ ] autoload/hellshake_yano/key_repeat.vim に key_repeat系6関数を移動
- [ ] autoload/hellshake_yano/motion.vim に expr系5関数を移動
- [ ] autoload/hellshake_yano/core.vim に on_focus_gained / on_terminal_leave を移動
- [ ] autoload/hellshake_yano_vim/ 側を1行エイリアスに変更
- [ ] テストを実行して成功することを確認

### Refactor Phase: 品質改善
- [ ] autoload/hellshake_yano_vim/ 側のエイリアスにDeprecation警告を追加
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#input\|hellshake_yano_vim#jump\|hellshake_yano_vim#key_repeat'` で呼び出し元確認

---

## Process 105: initializer.ts の userPreference 引数修正

<!--@process-briefing
category: implementation
tags: [phase3, initializer, typescript, bugfix]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: denops/hellshake-yano/initializer.ts:96-98 で userPreference が渡されていない問題
- **対象ファイル**:
  - denops/hellshake-yano/initializer.ts:96

#### Orient（方向付け）
- **方針**: initializer.ts:96-98 に userPreference 引数を追加
- **依存**: Process 9完了後

#### Decide（実装方法）
- `initializer.ts:96` の呼び出しに `userPreference` を追加

---

### Red Phase: テスト作成と失敗確認
- [ ] initializer.ts の userPreference 引数テストを追加
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] `denops/hellshake-yano/initializer.ts:96-98` に userPreference を渡すよう修正
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: `deno check denops/hellshake-yano/main.ts` でコンパイルエラーなし確認

---

## Process 106: Phase 3 統合テスト

<!--@process-briefing
category: implementation
tags: [phase3, test, integration]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: Process 100-105でPhase 3の実装が完了。マッピングとカテゴリ3の責務移動を統合テストで確認
- **対象ファイル**: tests-vim/ および tests/ 配下の全テスト

#### Orient（方向付け）
- **方針**: unified.vimの全マッピングとカテゴリ3の19関数についてNeovim+Vim両環境での動作確認
- **依存**: Process 100-105全て完了後

#### Decide（実装方法）
- `tests-vim/phase3_integration_test.vim` を作成してE2Eテストを実施

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests-vim/phase3_integration_test.vim` を作成
- [ ] 全マッピングと責務移動後の19関数テストを記述

### Green Phase: 最小実装と成功確認
- [ ] 各実装を修正して全テストが通ることを確認

### Refactor Phase: 品質改善
- [ ] Phase 1 + 2 + 3 合算の回帰テストを実施
- [ ] Impact Verification: 既存の全テストが引き続き通ることを確認


---

## Process 150: カテゴリ4 削除可9関数の除去

<!--@process-briefing
category: implementation
tags: [phase4, cleanup, delete, vimscript]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: カテゴリ4の9関数が削除可能な状態。has_denops系、is_denops_ready、get_popup_count、japanese#has_japanese/should_segment
- **対象ファイル**:
  - autoload/hellshake_yano_vim/core.vim:237 (is_denops_ready)
  - autoload/hellshake_yano_vim/dictionary.vim (has_denops)
  - autoload/hellshake_yano_vim/display.vim (has_denops, get_popup_count:545)
  - autoload/hellshake_yano_vim/hint_generator.vim (has_denops)
  - autoload/hellshake_yano_vim/japanese.vim (has_denops, has_japanese, should_segment)
  - autoload/hellshake_yano_vim/motion.vim:114 (has_denops)
  - autoload/hellshake_yano_vim/word_detector.vim (has_denops)

#### Orient（方向付け）
- **方針**: 9関数を全て削除。削除前に全呼び出し元がないことを確認
- **依存**: Process 19, 68完了後（Phase 1+2の集約完了後）

#### Decide（実装方法）
1. grep で呼び出し元が0件であることを確認
2. 各関数を削除

---

### Red Phase: テスト作成と失敗確認
- [ ] 削除対象9関数の呼び出し元がないことを確認するテストを記述
- [ ] `grep -r 'has_denops\|is_denops_ready\|get_popup_count\|has_japanese\|should_segment'` で呼び出し元0件を確認

### Green Phase: 最小実装と成功確認
- [ ] autoload/hellshake_yano_vim/core.vim から `core#is_denops_ready` を削除
- [ ] autoload/hellshake_yano_vim/dictionary.vim から `dictionary#has_denops` を削除
- [ ] autoload/hellshake_yano_vim/display.vim から `display#has_denops` / `display#get_popup_count` を削除
- [ ] autoload/hellshake_yano_vim/hint_generator.vim から `hint_generator#has_denops` を削除
- [ ] autoload/hellshake_yano_vim/japanese.vim から `japanese#has_denops` / `japanese#has_japanese` / `japanese#should_segment` を削除
- [ ] autoload/hellshake_yano_vim/motion.vim から `motion#has_denops` を削除
- [ ] autoload/hellshake_yano_vim/word_detector.vim から `word_detector#has_denops` を削除
- [ ] 全テストが通ることを確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: 削除後に全テストが引き続き通ることを確認

---

## Process 151: autoload/hellshake_yano_vim/config.vim 廃止

<!--@process-briefing
category: implementation
tags: [phase4, config, deprecation, vimscript]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: autoload/hellshake_yano_vim/config.vim がProcess 10でブリッジ経由の薄いラッパーに変更済み。削除可能
- **対象ファイル**:
  - autoload/hellshake_yano_vim/config.vim

#### Orient（方向付け）
- **方針**: ファイルを削除。削除前に呼び出し元が全てブリッジ経由に切り替わっていることを確認
- **依存**: Process 10, 150完了後

#### Decide（実装方法）
- 呼び出し元0件確認後にファイル削除

---

### Red Phase: テスト作成と失敗確認
- [ ] `grep -r 'hellshake_yano_vim#config'` で呼び出し元0件を確認

### Green Phase: 最小実装と成功確認
- [ ] `autoload/hellshake_yano_vim/config.vim` を削除
- [ ] 全テストが通ることを確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: `grep -r 'autoload/hellshake_yano_vim/config'` でファイル参照がないことを確認

---

## Process 152: autoload/hellshake_yano_vim/dictionary.vim 廃止

<!--@process-briefing
category: implementation
tags: [phase4, dictionary, deprecation, vimscript]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: Process 11, 150でブリッジ化・削除関数除去が完了。廃止可能
- **対象ファイル**: autoload/hellshake_yano_vim/dictionary.vim
- **依存**: Process 11, 150完了後

#### Orient（方向付け）
- **方針**: 呼び出し元0件確認後にファイル削除

#### Decide（実装方法）
- ファイル削除

---

### Red Phase: テスト作成と失敗確認
- [ ] `grep -r 'hellshake_yano_vim#dictionary'` で呼び出し元0件を確認

### Green Phase: 最小実装と成功確認
- [ ] `autoload/hellshake_yano_vim/dictionary.vim` を削除
- [ ] 全テストが通ることを確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: 全テストが引き続き通ることを確認

---

## Process 153-166: 各VimScriptファイルの廃止

<!--@process-briefing
category: implementation
tags: [phase4, cleanup, deprecation, vimscript]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: Process 152と同様のパターンで各ファイルを廃止

#### Orient（方向付け）
- 各ProcessはProcess 151-152と同じパターンで実施

#### Decide（実装方法）
- 各ファイルについて: 呼び出し元確認 → 削除 → テスト確認

---

### Process 153: hint_generator.vim 廃止

#### Red Phase
- [ ] `grep -r 'hellshake_yano_vim#hint_generator'` で呼び出し元0件確認

#### Green Phase
- [ ] `autoload/hellshake_yano_vim/hint_generator.vim` を削除
- [ ] 全テストが通ることを確認

#### Refactor Phase
- [ ] Impact Verification完了

---

### Process 154: japanese.vim 廃止

#### Red Phase
- [ ] `grep -r 'hellshake_yano_vim#japanese'` で呼び出し元0件確認

#### Green Phase
- [ ] `autoload/hellshake_yano_vim/japanese.vim` を削除
- [ ] 全テストが通ることを確認

#### Refactor Phase
- [ ] Impact Verification完了

---

### Process 155: word_detector.vim 廃止

#### Red Phase
- [ ] `grep -r 'hellshake_yano_vim#word_detector'` で呼び出し元0件確認

#### Green Phase
- [ ] `autoload/hellshake_yano_vim/word_detector.vim` を削除
- [ ] 全テストが通ることを確認

#### Refactor Phase
- [ ] Impact Verification完了

---

### Process 156: window_detector.vim 廃止

#### Red Phase
- [ ] `grep -r 'hellshake_yano_vim#window_detector'` で呼び出し元0件確認

#### Green Phase
- [ ] `autoload/hellshake_yano_vim/window_detector.vim` を削除
- [ ] 全テストが通ることを確認

#### Refactor Phase
- [ ] Impact Verification完了

---

### Process 157: word_filter.vim 廃止

#### Red Phase
- [ ] `grep -r 'hellshake_yano_vim#word_filter'` で呼び出し元0件確認

#### Green Phase
- [ ] `autoload/hellshake_yano_vim/word_filter.vim` を削除
- [ ] 全テストが通ることを確認

#### Refactor Phase
- [ ] Impact Verification完了

---

### Process 158: filter.vim 廃止

#### Red Phase
- [ ] `grep -r 'hellshake_yano_vim#filter'` で呼び出し元0件確認

#### Green Phase
- [ ] `autoload/hellshake_yano_vim/filter.vim` を削除
- [ ] 全テストが通ることを確認

#### Refactor Phase
- [ ] Impact Verification完了

---

### Process 159: util.vim 廃止

#### Red Phase
- [ ] `grep -r 'hellshake_yano_vim#util'` で呼び出し元0件確認

#### Green Phase
- [ ] `autoload/hellshake_yano_vim/util.vim` を削除（必要な関数はブリッジ層に移動済み）
- [ ] 全テストが通ることを確認

#### Refactor Phase
- [ ] Impact Verification完了

---

## Process 160: display.vim → ブリッジ層統合

<!--@process-briefing
category: implementation
tags: [phase4, display, bridge, integration]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: autoload/hellshake_yano_vim/display.vim がProcess 50-54でブリッジ化済み。残存する関数をブリッジ層に統合して廃止
- **対象ファイル**:
  - autoload/hellshake_yano_vim/display.vim
  - autoload/hellshake_yano/display.vim

#### Orient（方向付け）
- **方針**: display.vim の残存関数を全てブリッジ層に移動後、ファイル廃止
- **依存**: Process 50-54, 150完了後

#### Decide（実装方法）
- 残存関数の呼び出し元確認 → ブリッジ層への移動 → ファイル削除

---

### Red Phase: テスト作成と失敗確認
- [ ] display.vim の残存関数の呼び出し元リストを作成
- [ ] ブリッジ層統合後のテストを記述

### Green Phase: 最小実装と成功確認
- [ ] autoload/hellshake_yano/display.vim に残存関数を移動
- [ ] autoload/hellshake_yano_vim/display.vim を削除
- [ ] 全テストが通ることを確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#display'` で呼び出し元がないことを確認

---

## Process 161: core.vim → ブリッジ層統合

<!--@process-briefing
category: implementation
tags: [phase4, core, bridge, integration]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: autoload/hellshake_yano_vim/core.vim がPhase 1-2でブリッジ化済み。カテゴリ3のon_focus_gained/on_terminal_leaveはProcess 104でブリッジ層に移動済み
- **対象ファイル**:
  - autoload/hellshake_yano_vim/core.vim
  - autoload/hellshake_yano/core.vim

#### Orient（方向付け）
- **方針**: core.vim の全関数がブリッジ層経由になっていることを確認後、ファイル廃止
- **依存**: Process 16, 55-60, 104, 150完了後

#### Decide（実装方法）
- 残存関数の確認 → autoload/hellshake_yano/core.vim への統合 → ファイル削除

---

### Red Phase: テスト作成と失敗確認
- [ ] core.vim の残存関数リストを作成・確認

### Green Phase: 最小実装と成功確認
- [ ] autoload/hellshake_yano_vim/core.vim を削除
- [ ] 全テストが通ることを確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#core'` で呼び出し元がないことを確認

---

## Process 162-166: 残存VimScriptファイルのブリッジ層統合

<!--@process-briefing
category: implementation
tags: [phase4, bridge, integration, vimscript]
complexity_estimate: medium
-->

### Briefing (auto-generated)

各ファイルについてProcess 160-161と同じパターンで実施

---

### Process 162: motion.vim → ブリッジ層統合（expr系のみ残存）

#### Green Phase
- [ ] motion.vim から削除可能な関数（カテゴリ1, 2, 4）を確認・削除済みを確認
- [ ] expr系5関数 (handle_expr, handle_with_count, handle_visual_expr, handle_visual_internal, visual_schedule) がautoload/hellshake_yano/に移動済みを確認
- [ ] autoload/hellshake_yano_vim/motion.vim を廃止（またはexpr系のみ残すスタブに）
- [ ] 全テストが通ることを確認

#### Refactor Phase
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#motion'` で残存呼び出しを確認

---

### Process 163: visual.vim → ブリッジ層統合

#### Green Phase
- [ ] autoload/hellshake_yano_vim/visual.vim を削除
- [ ] 全テストが通ることを確認

#### Refactor Phase
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#visual'` で呼び出し元がないことを確認

---

### Process 164: input.vim → ブリッジ層責務移動

#### Green Phase
- [ ] カテゴリ3の4関数がautoload/hellshake_yano/input.vimに移動済みを確認（Process 104）
- [ ] カテゴリ2の1関数（get_partial_matches）がブリッジ化済みを確認（Process 66）
- [ ] autoload/hellshake_yano_vim/input.vim を削除
- [ ] 全テストが通ることを確認

#### Refactor Phase
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#input'` で呼び出し元がないことを確認

---

### Process 165: jump.vim → ブリッジ層責務移動

#### Green Phase
- [ ] jump系2関数がautoload/hellshake_yano/jump.vimに移動済みを確認（Process 104）
- [ ] autoload/hellshake_yano_vim/jump.vim を削除
- [ ] 全テストが通ることを確認

#### Refactor Phase
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#jump'` で呼び出し元がないことを確認

---

### Process 166: key_repeat.vim → ブリッジ層統合

#### Green Phase
- [ ] key_repeat系6関数がautoload/hellshake_yano/key_repeat.vimに移動済みを確認（Process 104）
- [ ] autoload/hellshake_yano_vim/key_repeat.vim を削除
- [ ] 全テストが通ることを確認

#### Refactor Phase
- [ ] Impact Verification: `grep -r 'hellshake_yano_vim#key_repeat'` で呼び出し元がないことを確認

---

## Process 167: plugin/hellshake-yano-vim.vim 廃止検討

<!--@process-briefing
category: implementation
tags: [phase4, plugin, deprecation, vimscript]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: plugin/hellshake-yano-vim.vim がVim専用エントリポイント。Denops必須化した場合は廃止可能
- **対象ファイル**:
  - plugin/hellshake-yano-vim.vim
  - plugin/hellshake-yano-unified.vim (代替エントリポイント)

#### Orient（方向付け）
- **方針**: C-02制約（Vim8でDeno必須）の確認後、廃止か維持かを決定
- **制約**: C-02（Pure VimScript完全廃止は環境制約あり）
- **依存**: Process 151-166完了後

#### Decide（実装方法）
- autoload/hellshake_yano_vim/ の全ファイルが廃止済みであれば plugin/hellshake-yano-vim.vim も廃止
- unified.vim で全環境をカバーできることを確認

---

### Red Phase: テスト作成と失敗確認
- [ ] plugin/hellshake-yano-vim.vim なし環境でのテストを追加
- [ ] Vim + Denops 環境でunified.vimだけで動作することを確認

### Green Phase: 最小実装と成功確認
- [ ] C-02制約の影響範囲を確認
- [ ] 廃止可能であれば plugin/hellshake-yano-vim.vim を削除
- [ ] unified.vimがVim環境でも動作することを確認

### Refactor Phase: 品質改善
- [ ] README.md からVim専用セクションを更新
- [ ] Impact Verification: Vim環境での全機能テスト

---

## Process 168: Phase 4 回帰テスト

<!--@process-briefing
category: implementation
tags: [phase4, test, regression]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: Phase 4でautoload/hellshake_yano_vim/の全ファイルが廃止完了。全機能の回帰テストが必要

#### Orient（方向付け）
- **方針**: Neovim + Vim 両環境での全機能回帰テストを実施
- **依存**: Process 150-167全て完了後

#### Decide（実装方法）
- `tests-vim/phase4_regression_test.vim` を作成してE2Eテストを実施

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests-vim/phase4_regression_test.vim` を作成
- [ ] 全Phase（1-4）の関数テストを網羅

### Green Phase: 最小実装と成功確認
- [ ] 全テストが通ることを確認

### Refactor Phase: 品質改善
- [ ] テスト結果サマリーを作成
- [ ] Impact Verification: `autoload/hellshake_yano_vim/` ディレクトリが空または廃止済みであることを確認


---

## Process 200: vim-bridge.ts 不要メソッド削除

<!--@process-briefing
category: implementation
tags: [denops-vim, bridge, cleanup, typescript]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: denops/hellshake-yano/vim/bridge/vim-bridge.ts の VimBridge class に、Phase 4廃止後に不要になったメソッドが存在する可能性
- **対象ファイル**:
  - denops/hellshake-yano/vim/bridge/vim-bridge.ts

#### Orient（方向付け）
- **方針**: VimBridgeのメソッドのうち、autoload/hellshake_yano_vim/廃止後に呼び出されなくなるものを特定・削除
- **制約**: C-05（PopupDisplayAdapterは維持）、C-03（IPC契約維持）
- **依存**: Process 168完了後

#### Decide（実装方法）
- 各メソッドの呼び出し元を grep で確認し、呼び出し元0件のものを削除

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/unit/vim/bridge/vim-bridge.test.ts` の各メソッドテストを確認
- [ ] 削除予定メソッドのテストを先に削除
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] VimBridgeの不要メソッドを削除
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: `deno check denops/hellshake-yano/main.ts` でコンパイルエラーなし確認

---

## Process 201: config-mapper.ts 統合検討

<!--@process-briefing
category: implementation
tags: [denops-vim, config, mapper, integration]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: denops/hellshake-yano/vim/config/config-mapper.ts の ConfigMapper class がVim専用。Neovim共通化の検討
- **対象ファイル**:
  - denops/hellshake-yano/vim/config/config-mapper.ts
  - denops/hellshake-yano/neovim/ (共通config)

#### Orient（方向付け）
- **方針**: ConfigMapperがVim専用APIに依存している部分を特定。共通化可能であればcommon/configに移動
- **依存**: Process 168完了後

#### Decide（実装方法）
- Vim専用依存がなければ `common/config/config-mapper.ts` に移動

---

### Red Phase: テスト作成と失敗確認
- [ ] ConfigMapperのVim専用依存箇所を特定するテストを追加
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] 共通化可能な場合: `common/config/config-mapper.ts` に移動
- [ ] Vim専用の場合: 現状維持に決定
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: `deno check denops/hellshake-yano/main.ts` でコンパイルエラーなし確認

---

## Process 202: config-migrator.ts 統合検討

<!--@process-briefing
category: implementation
tags: [denops-vim, config, migrator, integration]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: denops/hellshake-yano/vim/config/config-migrator.ts の ConfigMigrator class がVim専用
- **対象ファイル**: denops/hellshake-yano/vim/config/config-migrator.ts
- **依存**: Process 201完了後（config系を一括検討）

#### Orient（方向付け）
- **方針**: ConfigMigratorの共通化可否を検討

#### Decide（実装方法）
- 共通化可能な場合: `common/config/config-migrator.ts` に移動

---

### Red Phase / Green Phase / Refactor Phase
- [ ] Process 201と同様のパターンで実施
- [ ] `deno test` / `deno check` で確認

---

## Process 203: config-unifier.ts 統合検討

<!--@process-briefing
category: implementation
tags: [denops-vim, config, unifier, integration]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: denops/hellshake-yano/vim/config/config-unifier.ts の ConfigUnifier class がVim専用
- **対象ファイル**: denops/hellshake-yano/vim/config/config-unifier.ts
- **依存**: Process 201-202完了後

#### Orient（方向付け）
- **方針**: ConfigUnifierの共通化可否を検討

---

### Red Phase / Green Phase / Refactor Phase
- [ ] Process 201と同様のパターンで実施
- [ ] `deno test` / `deno check` で確認

---

## Process 204: highlight.ts (vim/) → neovim/display統合

<!--@process-briefing
category: implementation
tags: [denops-vim, highlight, integration, typescript]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: denops/hellshake-yano/vim/display/highlight.ts の VimHighlight class がVim専用ハイライト実装。neovim/display/highlight.ts の HighlightManager との統合を検討
- **対象ファイル**:
  - denops/hellshake-yano/vim/display/highlight.ts (VimHighlight)
  - denops/hellshake-yano/neovim/display/highlight.ts (HighlightManager)

#### Orient（方向付け）
- **方針**: ハイライトグループ定義等の共通部分を `common/display/highlight-common.ts` に移動。Vim固有/Neovim固有部分は各層に維持
- **依存**: Process 168完了後

#### Decide（実装方法）
- 共通部分を抽出してcommon層に移動

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/unit/display/highlight-common.test.ts` を作成
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] `common/display/highlight-common.ts` を作成して共通部分を移動
- [ ] VimHighlight / HighlightManager が共通クラスを使用するよう更新
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: `deno check denops/hellshake-yano/main.ts` でコンパイルエラーなし確認

---

## Process 205: popup-display.ts 維持確認

<!--@process-briefing
category: implementation
tags: [denops-vim, popup, maintenance, c05]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: denops/hellshake-yano/vim/display/popup-display.ts の VimPopupDisplay が C-05 により維持必須
- **対象ファイル**: denops/hellshake-yano/vim/display/popup-display.ts
- **依存**: Process 168完了後

#### Orient（方向付け）
- **方針**: C-05制約を確認。VimPopupDisplay + PopupDisplayAdapter(Process 6)が正しく動作していることをテストで確認
- **制約**: C-05（維持必須）

#### Decide（実装方法）
- PopupDisplayAdapterのテストを追加して維持確認

---

### Red Phase / Green Phase / Refactor Phase
- [ ] `tests/unit/vim/display/popup-display.test.ts` でPopupDisplayAdapterの全メソッドをテスト
- [ ] `deno test` でテスト成功を確認
- [ ] C-05維持確認をドキュメント化

---

## Process 206: japanese.ts (vim/) → common/統合

<!--@process-briefing
category: implementation
tags: [denops-vim, japanese, common, integration]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: denops/hellshake-yano/vim/features/japanese.ts の VimJapaneseSupport class がVim専用。日本語セグメント処理は共通化可能な可能性
- **対象ファイル**:
  - denops/hellshake-yano/vim/features/japanese.ts (VimJapaneseSupport)

#### Orient（方向付け）
- **方針**: VimJapaneseSupportのロジックを `common/features/japanese.ts` に移動可否を検討
- **依存**: Process 13完了後

#### Decide（実装方法）
- Vim固有依存がなければ common/features/ に移動

---

### Red Phase / Green Phase / Refactor Phase
- [ ] VimJapaneseSupportのVim固有依存を確認
- [ ] 共通化可能な場合: `common/features/japanese.ts` に移動
- [ ] `deno test` / `deno check` で確認

---

## Process 207: motion.ts (vim/) — VimMotionDetector 責務確認

<!--@process-briefing
category: implementation
tags: [denops-vim, motion, responsibility, typescript]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: denops/hellshake-yano/vim/features/motion.ts の VimMotionDetector class の責務確認
- **対象ファイル**: denops/hellshake-yano/vim/features/motion.ts
- **依存**: Process 168完了後

#### Orient（方向付け）
- **方針**: VimMotionDetectorの責務を確認し、Phase 2-3で移行したモーション処理との重複を解消

#### Decide（実装方法）
- 重複処理を特定して削除または共通化

---

### Red Phase / Green Phase / Refactor Phase
- [ ] VimMotionDetectorの残存責務を列挙
- [ ] 不要部分を削除または共通化
- [ ] `deno test` / `deno check` で確認

---

## Process 208: visual.ts (vim/) — VimVisual 責務確認

<!--@process-briefing
category: implementation
tags: [denops-vim, visual, responsibility, typescript]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: denops/hellshake-yano/vim/features/visual.ts の VimVisual class の責務確認
- **対象ファイル**: denops/hellshake-yano/vim/features/visual.ts
- **依存**: Process 63-64, 168完了後

#### Orient（方向付け）
- **方針**: VimVisualの残存責務を確認し、Phase 2で移行したVisualRange処理との重複を解消

#### Decide（実装方法）
- 重複処理を特定して削除または共通化

---

### Red Phase / Green Phase / Refactor Phase
- [ ] VimVisualの残存責務を列挙
- [ ] 不要部分を削除または共通化
- [ ] `deno test` / `deno check` で確認


---

## Process 250: Vim/Neovim共通dispatcher統合 (21メソッド)

<!--@process-briefing
category: implementation
tags: [dispatcher, common, integration, typescript]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: main.ts のVim Layer(initializeVimLayer:198-554)とNeovim Layer(initializeNeovimLayer:595-1023)に共通dispatcher21メソッドが重複して存在する可能性
- **対象ファイル**:
  - denops/hellshake-yano/main.ts:198 (initializeVimLayer)
  - denops/hellshake-yano/main.ts:595 (initializeNeovimLayer)
- **共通dispatcher**: enable, disable, toggle, updateConfig, getConfig, validateConfig, segmentJapaneseText, healthCheck, getStatistics, debug, clearCache, reloadDictionary, addToDictionary, editDictionary, showDictionary, validateDictionary, isInDictionary, detectWordsVisible, detectWordsMultiWindow, getMinWordLength, generateHints

#### Orient（方向付け）
- **方針**: 共通21メソッドを `initializeCommonLayer()` として抽出し、Vim/Neovim両Layer から呼び出す形に整理
- **制約**: C-03（IPC契約3メソッド維持）、C-04（core.ts変更最小化）
- **依存**: Process 200-208完了後

#### Decide（実装方法）
- `initializeCommonLayer(denops)` 関数を main.ts に追加
- 21メソッドをcommonLayerに移動

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/unit/main-dispatcher.test.ts` に共通dispatcher統合テストを追加
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] `denops/hellshake-yano/main.ts` に `initializeCommonLayer()` を追加
- [ ] 21メソッドを共通Layer に移動
- [ ] initializeVimLayer / initializeNeovimLayer から共通Layerを呼び出し
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] コメントで共通/Vim専用/Neovim専用の境界を明示
- [ ] Impact Verification: `deno check denops/hellshake-yano/main.ts` でコンパイルエラーなし確認

---

## Process 251: Vim専用dispatcher見直し (12メソッド)

<!--@process-briefing
category: implementation
tags: [dispatcher, vim-only, review, typescript]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: Vim専用dispatcher12メソッドが main.ts に存在。Phase 2で一部がDisplayAdapter経由に変更済み
- **対象ファイル**: denops/hellshake-yano/main.ts:198-554 (Vim Layer)
- **Vim専用dispatcher**: displayShowHint(386), displayShowHintWithWindow(403), displayHideAll(420), displayHighlightPartialMatches(425), displayGetPopupCount(433), motionDetect(441), motionResetState(476), motionSetThreshold(482), motionSetTimeout(490), motionGetState(498), getVisualRange(511), detectWordsInVisualRange(534)

#### Orient（方向付け）
- **方針**: DisplayAdapter経由化済みのdispatcherはAdapterに委譲する形に整理。displayGetPopupCount(433)はカテゴリ4で削除済みを確認
- **依存**: Process 250完了後

#### Decide（実装方法）
- 各Vim専用dispatcherの委譲先をDisplayAdapter / MotionDetectorインターフェース経由に統一

---

### Red Phase: テスト作成と失敗確認
- [ ] 各Vim専用dispatcherのテストを更新
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] displayGetPopupCount が削除済みであることを確認（Process 150）
- [ ] 残存11メソッドをDisplayAdapter/MotionDetector経由に整理
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: `deno check denops/hellshake-yano/main.ts` でコンパイルエラーなし確認

---

## Process 252: Neovim専用dispatcher整理 (20メソッド)

<!--@process-briefing
category: implementation
tags: [dispatcher, neovim-only, review, typescript]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: Neovim専用dispatcher20メソッドが main.ts に存在
- **対象ファイル**: denops/hellshake-yano/main.ts:595-1023 (Neovim Layer)
- **Neovim専用dispatcher**: setCount(615), setTimeout(623), showHints(630), hideHints(648), highlightCandidateHints(660), detectWords(672), showHintsWithKey(767), showHintsMultiWindow(844), hideHintsMultiWindow(852), toggleMultiWindowMode(862), getVisibleWindows(871), enableMultiWindowMode(921), disableMultiWindowMode(938), + Process 55-64で追加したdispatcher

#### Orient（方向付け）
- **方針**: Neovim専用dispatcherをExtmarkDisplayAdapter経由に整理
- **依存**: Process 251完了後

#### Decide（実装方法）
- 各Neovim専用dispatcherをExtmarkDisplayAdapter/NeovimCore経由に統一

---

### Red Phase: テスト作成と失敗確認
- [ ] Neovim専用dispatcherのテストを更新
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] 各dispatcherをAdapter経由に整理
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: `deno check denops/hellshake-yano/main.ts` でコンパイルエラーなし確認

---

## Process 253: initializeVimLayer / initializeNeovimLayer 統合検討

<!--@process-briefing
category: implementation
tags: [dispatcher, layer, integration, typescript]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: main.ts に initializeVimLayer(198) と initializeNeovimLayer(595) の2関数が存在。Process 250で共通Layer抽出済み
- **対象ファイル**: denops/hellshake-yano/main.ts
- **依存**: Process 252完了後

#### Orient（方向付け）
- **方針**: 2つのLayer関数の統合可否を検討。完全統合 or 共通呼び出しパターン維持かを判断
- **制約**: C-04（core.ts変更最小化）

#### Decide（実装方法）
- 統合可能であれば `initializeLayer(denops, editorType)` に統合
- Vim/Neovim固有部分が多い場合は共通Layer呼び出しパターンを維持

---

### Red Phase: テスト作成と失敗確認
- [ ] 統合後のLayer初期化テストを追加
- [ ] `deno test` でテスト失敗を確認

### Green Phase: 最小実装と成功確認
- [ ] 統合判断に基づいて実装
- [ ] `deno test` でテスト成功を確認

### Refactor Phase: 品質改善
- [ ] Impact Verification: `deno check denops/hellshake-yano/main.ts` でコンパイルエラーなし確認

---

## Process 254: IPC契約3メソッドの最終確認

<!--@process-briefing
category: implementation
tags: [ipc, contract, verification, typescript]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: C-03制約として守るべきIPC契約3メソッド（updateConfig, showHintsWithKey, generic bridge）が全Phase完了後も維持されていることを確認
- **対象ファイル**:
  - denops/hellshake-yano/main.ts:220 (updateConfig)
  - denops/hellshake-yano/main.ts:767 (showHintsWithKey)
  - denops/hellshake-yano/vim/bridge/vim-bridge.ts (generic bridge)

#### Orient（方向付け）
- **方針**: Process 7で作成したIPC契約テストを全再実行して契約維持を確認
- **制約**: C-03（維持必須）
- **依存**: Process 253完了後

#### Decide（実装方法）
- `deno test tests/contract/ipc-contract.test.ts` を実行して全テスト通過を確認

---

### Red Phase: テスト作成と失敗確認
- [ ] 全Phaseでの変更を踏まえてIPC契約テストを更新
- [ ] 破壊的変更がないことを確認

### Green Phase: 最小実装と成功確認
- [ ] `deno test tests/contract/ipc-contract.test.ts` で全テスト通過を確認
- [ ] updateConfig / showHintsWithKey / generic bridge の入出力仕様が変わっていないことを確認

### Refactor Phase: 品質改善
- [ ] C-03制約の最終確認をドキュメント化
- [ ] Impact Verification: 外部ツール（他プラグイン等）からのIPC呼び出しが引き続き動作することを確認

---

## Process 280: Vim + Denops環境での全機能テスト

<!--@process-briefing
category: implementation
tags: [test, vim, denops, e2e, final]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: 全Phase完了。Vim + Denops環境での全機能E2Eテストが必要
- **対象ファイル**: tests-vim/ 配下の全テスト
- **依存**: Process 254完了後

#### Orient（方向付け）
- **方針**: Vim 8/9 + Denops環境での全機能テストを実施

#### Decide（実装方法）
- `tests-vim/final_e2e_vim_test.vim` を作成して全機能テストを実施

---

### Red Phase / Green Phase / Refactor Phase
- [ ] `tests-vim/final_e2e_vim_test.vim` を作成
- [ ] Vim環境での全機能テストを実施
- [ ] 全テスト通過を確認
- [ ] Impact Verification: Vim環境でのパフォーマンスが劣化していないことを確認

---

## Process 281: Neovim + Denops環境での全機能テスト

<!--@process-briefing
category: implementation
tags: [test, neovim, denops, e2e, final]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: Neovim + Denops環境での全機能E2Eテストが必要
- **対象ファイル**: tests/ 配下の全テスト
- **依存**: Process 254完了後

#### Orient（方向付け）
- **方針**: Neovim最新版 + Denops環境での全機能テストを実施

#### Decide（実装方法）
- `tests/e2e/final_e2e_neovim_test.ts` を作成して全機能テストを実施

---

### Red Phase / Green Phase / Refactor Phase
- [ ] `tests/e2e/final_e2e_neovim_test.ts` を作成
- [ ] Neovim環境での全機能テストを実施
- [ ] `deno test tests/e2e/` で全テスト通過を確認

---

## Process 282: Denopsなし環境でのフォールバックテスト

<!--@process-briefing
category: implementation
tags: [test, fallback, no-denops, e2e]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: C-02制約（Denops必須化）の影響確認。Denopsなし環境でのフォールバック動作を確認
- **依存**: Process 167完了後

#### Orient（方向付け）
- **方針**: Denopsなし環境でのフォールバック動作（エラーメッセージ等）が適切であることを確認

#### Decide（実装方法）
- Denopsなし環境でのフォールバック動作テストを実施

---

### Red Phase / Green Phase / Refactor Phase
- [ ] Denopsなし環境でのテスト手順を作成
- [ ] フォールバックメッセージが適切に表示されることを確認
- [ ] Impact Verification: ユーザーが Denops なし環境でも適切なエラーガイダンスを受けることを確認

---

## Process 283: パフォーマンステスト

<!--@process-briefing
category: implementation
tags: [test, performance, ipc, benchmark]
complexity_estimate: medium
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: VimScript直接呼び出しからDenops IPC経由への移行によるパフォーマンスへの影響を確認
- **依存**: Process 280-282完了後

#### Orient（方向付け）
- **方針**: IPC overhead を計測し、許容範囲内であることを確認（目安: 1呼び出しあたり10ms以内）

#### Decide（実装方法）
- `tests/benchmark/ipc-overhead.ts` を作成してIPC latencyを計測

---

### Red Phase / Green Phase / Refactor Phase
- [ ] `tests/benchmark/ipc-overhead.ts` を作成
- [ ] 主要dispatcher（showHints, detectWords等）のlatencyを計測
- [ ] 計測結果を `tests/benchmark/RESULTS.md` に記録
- [ ] Impact Verification: IPC overhead が許容範囲内（10ms以内）であることを確認

---

## Process 290: CHANGELOG更新

<!--@process-briefing
category: implementation
tags: [docs, changelog, release]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: 全Phase完了。CHANGELOGを更新して今回の大規模リファクタリング内容を記録
- **依存**: Process 280-283完了後

#### Decide（実装方法）
- CHANGELOG.md に "Vim→Denops実装集約" セクションを追加

---

### Green Phase: 最小実装と成功確認
- [ ] CHANGELOG.md に以下を追加:
  - Breaking Changes: autoload/hellshake_yano_vim/ の廃止
  - Migration Guide: ユーザー向け移行手順
  - New Features: 追加された新規API一覧
  - Removed: 削除された関数一覧

### Refactor Phase: 品質改善
- [ ] Impact Verification: CHANGELOG の記述が正確であることを確認

---

## Process 291: README更新

<!--@process-briefing
category: implementation
tags: [docs, readme, architecture]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: README.md のアーキテクチャ図が古い3層構造を示している。Denops集約後の構造に更新が必要
- **対象ファイル**: README.md, README_ja.md
- **依存**: Process 290完了後

#### Decide（実装方法）
- README.md / README_ja.md のアーキテクチャセクションを更新

---

### Green Phase: 最小実装と成功確認
- [ ] README.md のアーキテクチャ図を更新（Pure VimScript層廃止後の2層構造）
- [ ] README_ja.md を同様に更新
- [ ] インストール手順を確認・更新

### Refactor Phase: 品質改善
- [ ] Impact Verification: README の内容が現在のコードと一致していることを確認

---

## Process 300: リリース準備

<!--@process-briefing
category: implementation
tags: [release, version, tag]
complexity_estimate: low
-->

### Briefing (auto-generated)

#### Observe（観察）
- **現状**: 全Phase + ドキュメント更新が完了。リリース準備
- **依存**: Process 290, 291完了後

#### Orient（方向付け）
- **方針**: セマンティックバージョニングに従ってバージョンをバンプ。今回は破壊的変更（autoload/hellshake_yano_vim/廃止）があるためメジャーバージョンアップ検討

#### Decide（実装方法）
- バージョンバンプ → gitタグ作成 → リリースノート作成

---

### Green Phase: 最小実装と成功確認
- [ ] バージョン番号を更新（deno.jsonc, plugin/ 内のバージョン定義）
- [ ] `git tag v<major>.<minor>.<patch>` でタグを作成
- [ ] GitHub Releases にリリースノートを作成

### Refactor Phase: 品質改善
- [ ] Impact Verification: タグが正しく作成され、リリースノートがCHANGELOGと一致していることを確認

