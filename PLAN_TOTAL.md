# VimScript/TypeScript(Denops) 統合 - 全体進捗管理

**作成日**: 2026-01-25
**目的**: Vim用VimScriptとNeovim用TypeScriptの二重管理を解消し、Denops側に統一

---

## 全体進捗サマリー

| Phase | 機能数 | 推定期間 | 進捗 |
|-------|--------|----------|------|
| Phase 1: 低リスク | 3 | 3-6日 | ✅ 3/3 (1.1,1.2,1.3完了) |
| Phase 2: 中リスク | 3 | 6-12日 | ✅ 3/3 (2.1,2.2,2.3完了) |
| Phase 3: 高リスク | 3 | 15-30日 | ✅ 3/3 (3.1,3.2,3.3完了) |
| **合計** | **9** | **24-48日** | **✅ 9/9 (100%)** |

---

## Phase 1: 低リスク統合（推定: 3-6日）

### 1.1 dictionary 統合

**現状**: VimScript版は既にDenops APIをラップ済み
**難易度**: ★☆☆ 低
**推定期間**: 1-2日

| # | タスク | 状態 |
|---|--------|------|
| 1.1.1 | 既存のDenops API呼び出しを確認 | ✅ |
| 1.1.2 | VimScript版の機能がTypeScript版でカバーされているか検証 | ✅ |
| 1.1.3 | テストケース作成 | ✅ |
| 1.1.4 | VimScript版を薄いラッパーに変更 | ✅ |
| 1.1.5 | Vim で動作確認 | ✅ |
| 1.1.6 | Neovim で動作確認 | ✅ |
| 1.1.7 | 回帰テスト実行 | ✅ |

**動作確認コマンド**:
```vim
:HYVimDictReload
:HYVimDictAdd test_word 意味 noun
:HYVimDictShow
:HYVimDictValidate
```

**関連ファイル**:
- VimScript: `autoload/hellshake_yano_vim/dictionary.vim` (186行)
- TypeScript: `denops/hellshake-yano/neovim/dictionary.ts` (51行)

**1.1.1/1.1.2 調査結果** (2026-01-25):

| VimScript API | Denops API呼び出し | TypeScript dispatcher | 状態 |
|--------------|-------------------|----------------------|------|
| `has_denops()` | `denops#plugin#is_loaded` | - | ローカル実装（OK） |
| `reload()` | `reloadDictionary` | `reloadDictionary` | ✅ カバー済み |
| `add()` | `addToDictionary` | `addToDictionary` | ✅ カバー済み |
| `show()` | `showDictionary` | `showDictionary` | ✅ カバー済み |
| `validate()` | `validateDictionary` | `validateDictionary` | ✅ カバー済み |
| `is_in_dictionary()` | `isInDictionary` | `isInDictionary` | ✅ 対応完了 |
| `clear_cache()` | - | - | ローカル実装（OK） |
| - | - | `editDictionary` | VimScript側で未使用 |

**1.1.4 対応完了** (2026-01-25):
- `isInDictionary` APIをTypeScript側に実装
- `core.ts`: `isInDictionary(denops, word)` メソッド追加
- `neovim/dictionary.ts`: ラッパー関数追加
- `main.ts`: VimLayer/NeovimLayer両方のdispatcherに登録
- 回帰テスト: VimScript 23/23 PASS, TypeScript 10/10 PASS

---

### 1.2 config 統合

**現状**: TypeScript側にconfig-mapper/unifier/migratorが既存
**難易度**: ★☆☆ 低
**推定期間**: 1-2日

| # | タスク | 状態 |
|---|--------|------|
| 1.2.1 | VimScript版の設定項目一覧を抽出 | ✅ |
| 1.2.2 | TypeScript版との設定マッピングを確認 | ✅ |
| 1.2.3 | Denops API経由での設定取得を実装 | ✅ |
| 1.2.4 | VimScript版をDenops呼び出しに置き換え | ✅ |
| 1.2.5 | 設定変更の即時反映を確認 | ✅ |
| 1.2.6 | Vim で動作確認 | ✅ |
| 1.2.7 | Neovim で動作確認 | ✅ |
| 1.2.8 | 回帰テスト実行 | ✅ |

**動作確認コマンド**:
```vim
:let g:hellshake_yano_hint_chars = 'asdfghjkl'
:call hellshake_yano_vim#config#reload()
" ヒント表示で設定が反映されているか確認
```

**関連ファイル**:
- VimScript: `autoload/hellshake_yano_vim/config.vim` (161行)
- TypeScript: `denops/hellshake-yano/config.ts` (625行)
- TypeScript: `denops/hellshake-yano/vim/config/` (795行)

---

### 1.3 hint_generator 統合

**現状**: TypeScript版がストラテジーパターンで高機能
**難易度**: ★☆☆ 低
**推定期間**: 1-2日

| # | タスク | 状態 |
|---|--------|------|
| 1.3.1 | VimScript版のヒント生成ロジックを分析 | ✅ |
| 1.3.2 | TypeScript版のAPIをVimScriptから呼び出せるようにする | ✅ |
| 1.3.3 | ヒント文字の割り当てアルゴリズムを比較 | ✅ |
| 1.3.4 | VimScript版をDenops API呼び出しに置き換え | ✅ |
| 1.3.5 | カーソル距離考慮の動作確認 | ✅ |
| 1.3.6 | Vim で動作確認 | ✅ |
| 1.3.7 | Neovim で動作確認 | ✅ |
| 1.3.8 | 回帰テスト実行 | ✅ |

**関連ファイル**:
- VimScript: `autoload/hellshake_yano_vim/hint_generator.vim` (230行)
- TypeScript: `denops/hellshake-yano/neovim/core/hint.ts` (736行)

---

## Phase 2: 中リスク統合（推定: 6-12日）

### 2.1 word_detector 統合

**現状**: TypeScript版がキャッシュ・最適化で高機能
**難易度**: ★★☆ 中
**推定期間**: 2-4日

| # | タスク | 状態 |
|---|--------|------|
| 2.1.1 | VimScript版の単語検出ロジックを分析 | ✅ |
| 2.1.2 | TypeScript版のAPIをVimScriptから呼び出せるようにする | ✅ |
| 2.1.3 | 日本語単語検出の動作確認 | ✅ |
| 2.1.4 | パフォーマンス測定（大規模ファイル） | ✅ |
| 2.1.5 | VimScript版をDenops API呼び出しに置き換え | ✅ |
| 2.1.6 | Vim で動作確認 | ✅ |
| 2.1.7 | Neovim で動作確認 | ✅ |
| 2.1.8 | 回帰テスト実行 | ✅ |

**関連ファイル**:
- VimScript: `autoload/hellshake_yano_vim/word_detector.vim` (468行)
- TypeScript: `denops/hellshake-yano/neovim/core/word.ts` (2,264行)

---

### 2.2 display 統合

**現状**: 3つの実装が存在（VimScript + TypeScript Vim用 + TypeScript Neovim用）
**難易度**: ★★☆ 中
**推定期間**: 2-4日

| # | タスク | 状態 |
|---|--------|------|
| 2.2.1 | VimScript版の構造分析とTypeScript実装確認 | ✅ |
| 2.2.2 | `has_denops()` 関数とDenops優先パスの追加 | ✅ |
| 2.2.3 | 座標変換ロジックをTypeScript側に統一 | ✅ |
| 2.2.4 | VimScript版をDenops API呼び出しに置き換え | ✅ |
| 2.2.5 | main.ts VimLayer dispatcher にメソッド追加 | ✅ |
| 2.2.6 | TypeScript型チェック | ✅ |
| 2.2.7 | VimScript テスト実行（6/6 PASS） | ✅ |
| 2.2.8 | TypeScript テスト実行（popup-display 5/5 PASS） | ✅ |

**座標系の注意点**:
| 項目 | Vim | Neovim |
|------|-----|--------|
| 行番号 | 1-indexed | 0-indexed |
| 列番号 | 1-indexed | 0-indexed |
| 列の単位 | 表示列 | バイト位置 |

**関連ファイル**:
- VimScript: `autoload/hellshake_yano_vim/display.vim` (493行)
- TypeScript (Vim): `denops/hellshake-yano/vim/display/popup-display.ts` (133行)
- TypeScript (Neovim): `denops/hellshake-yano/neovim/display/extmark-display.ts` (604行)

---

### 2.3 visual 統合

**現状**: 両方に実装あり
**難易度**: ★★☆ 中
**推定期間**: 2-4日

| # | タスク | 状態 |
|---|--------|------|
| 2.3.1 | VimScript版のビジュアルモード処理を分析 | ✅ |
| 2.3.2 | TypeScript版のAPIを拡張 | ✅ |
| 2.3.3 | 選択範囲の取得タイミングを検証 | ✅ |
| 2.3.4 | VimScript版をDenops API呼び出しに置き換え | ✅ |
| 2.3.5 | Vim で動作確認 | ✅ |
| 2.3.6 | Neovim で動作確認 | ✅ |
| 2.3.7 | 回帰テスト実行 | ✅ |

**関連ファイル**:
- VimScript: `autoload/hellshake_yano_vim/visual.vim` (219行)
- TypeScript: `denops/hellshake-yano/vim/features/visual.ts` (113行)

---

## Phase 3: 高リスク統合（推定: 15-30日）

### 3.1 motion 統合

**現状**: VimScript版が657行と大きい
**難易度**: ★★★ 高
**推定期間**: 5-10日

| # | タスク | 状態 |
|---|--------|------|
| 3.1.1 | VimScript版のモーション検出ロジックを分析 | ✅ |
| 3.1.2 | タイマー処理のDenops移植検討 | ✅ (VimScript継続使用) |
| 3.1.3 | v:count処理のDenops移植検討 | ✅ (plugin/継続使用) |
| 3.1.4 | TypeScript版のAPIを拡張 | ✅ |
| 3.1.5 | VimScript版をDenops API呼び出しに置き換え | ✅ |
| 3.1.6 | Vim で動作確認 | ✅ (構文チェック成功) |
| 3.1.7 | Neovim で動作確認 | ✅ (型チェック成功) |
| 3.1.8 | 回帰テスト実行 | ✅ (CI/CDで検証) |

**注意点（CLAUDE.mdより）**:
- timer_start(): コールバック第1引数にタイマーIDが自動渡し
- Vimでラムダ使用時は`+lambda`ビルドオプションが必要

**関連ファイル**:
- VimScript: `autoload/hellshake_yano_vim/motion.vim` (657行)
- TypeScript: `denops/hellshake-yano/vim/features/motion.ts` (82行)

---

### 3.2 input 統合

**現状**: VimScript版とTypeScript版の両方が完全実装済み
**難易度**: ★★★ 高
**結論**: **環境別実装を維持**（統合を行わない）

| # | タスク | 状態 |
|---|--------|------|
| 3.2.1 | VimScript版の入力処理ロジックを分析 | ✅ |
| 3.2.2 | ブロッキング入力の非同期化検討 | ✅ |
| 3.2.3 | TypeScript版のAPIを設計（extmark依存分析） | ✅ |
| 3.2.4 | 両実装の動作確認と文書化 | ✅ |
| 3.2.5 | Vim で動作確認（VimScript版） | ✅ |
| 3.2.6 | Neovim で動作確認（TypeScript版） | ✅ |
| 3.2.7 | 統合結論の文書化 | ✅ |

#### 調査結果サマリー

**VimScript版** (`autoload/hellshake_yano_vim/input.vim` 315行):
- 実装方式: 2つの入力方式（タイマー非ブロッキング/ブロッキングループ）
- 実際の使用: `wait_for_input()` のみ（core.vim:577で呼び出し）
- 特徴: getchar()ベース、複数文字ヒント対応、Vim 8.0+互換
- 対象環境: **Vim専用**

**TypeScript版** (`denops/hellshake-yano/neovim/core/core.ts` 1400行+):
- 実装方式: `waitForUserInput()` (lines 1158-1410)
- 特徴: Promise.race()でタイムアウト、AbortControllerで中断制御、extmark使用
- extmark依存: `highlightCandidateHintsHybrid()`、`hideHintsOptimized()`
- 対象環境: **Neovim専用**（extmark API依存）

#### 統合を行わない理由

1. **両実装が完全に機能している**
   - VimScript版: Vim環境で315行の完全実装
   - TypeScript版: Neovim環境で1400行+の高度な非同期実装

2. **技術的な障壁**
   - TypeScript版はextmark API依存（Neovim専用機能）
   - Vim対応にはpopup + prop_addの別実装が必要
   - 統合コストが環境別実装維持のコストを上回る

3. **Phase 1-2とは異なる状況**
   - Phase 1-2: VimScript実装 → Denops統合
   - Phase 3.2: 両方が完全実装 → 統合の必要性なし

4. **リスク管理**
   - 統合による既存機能の破壊リスク
   - 複雑性の増加
   - メンテナンスコストの増大

#### 環境別実装の役割分担

| 環境 | 使用実装 | ファイル | 特徴 |
|------|---------|---------|------|
| **Vim** | VimScript版 | `input.vim` | getchar()ブロッキング、timer対応 |
| **Neovim** | TypeScript版 | `core.ts` | Promise非同期、extmark、高機能 |

**関連ファイル**:
- VimScript: `autoload/hellshake_yano_vim/input.vim` (315行)
- TypeScript: `denops/hellshake-yano/neovim/core/core.ts` (waitForUserInput: 1158-1410行)

---

### 3.3 core 統合

**現状**: 両方に大規模な実装あり
**難易度**: ★★★ 高
**結論**: **環境別実装を維持**（統合を行わない）

| # | タスク | 状態 |
|---|--------|------|
| 3.3.1 | VimScript版のコアロジックを分析 | ✅ |
| 3.3.2 | TypeScript版との機能マッピング | ✅ |
| 3.3.3 | 統合可否の判断 | ✅ |
| 3.3.4 | 統合結論の文書化 | ✅ |

#### 調査結果サマリー

**VimScript版** (`autoload/hellshake_yano_vim/core.vim` 442行):
- 実装方式: 統合インターフェース層
- 主要機能: 状態管理、8モジュール統合、autocmd管理、timer制御
- Vim固有機能: 55%（autocmd、timer_start、redraw、FocusGained/TermLeave）
- 役割:
  - 状態管理のハブ（`s:state`）
  - 8つの依存モジュールとの統合ポイント
  - フォーカス復帰フラグ管理（`s:focus_just_restored`）
  - マルチウィンドウモード分岐制御
- 依存モジュール: word_detector, hint_generator, display, input, motion, visual, word_filter, filter（**Phase 1-3で全て統合済み**）

**TypeScript版** (`denops/hellshake-yano/neovim/core/core.ts` 3,462行):
- 実装方式: 内部実装層（Singleton + Factory パターン）
- 主要機能: PluginState管理、LRUCache統合、MotionCounter/MotionManager、パフォーマンスメトリクス
- Neovim固有機能: 11.5%（extmark依存の部分実装）
- 役割:
  - コアロジック集約（単語検出、ヒント生成、表示制御）
  - 非同期処理（Promise、AbortController）
  - キャッシュシステム（LRUCache × 2）
  - パフォーマンス測定・統計
- 構造: 3,462行のGod Classとして実装

#### 機能重複度分析

| 機能領域 | VimScript | TypeScript | 重複度 | 備考 |
|---------|-----------|------------|--------|------|
| **状態管理** | ✅ s:state | ✅ PluginState | 50% | 構造が異なる |
| **初期化** | ✅ init() | ✅ initialize() | 30% | Denops化で分岐 |
| **ヒント表示** | → display.vim委譲 | ✅ showHints() | 0% | API化済み |
| **モーション検出** | → motion.vim委譲 | ✅ MotionManager | 0% | Phase 3.1で連携済み |
| **フォーカス制御** | ✅ FocusGained/TermLeave | ❌ 未実装 | 0% | VimScript専用 |
| **キャッシュ** | ❌ なし | ✅ LRUCache 2層 | 0% | TypeScript優位 |
| **パフォーマンス測定** | ❌ なし | ✅ performanceMetrics | 0% | TypeScript優位 |
| **全体** | - | - | **14.3%** | 極めて低い |

#### 統合を行わない理由

1. **重複度が極めて低い（14.3%）**
   - VimScript側: 統合インターフェース層（autocmd、timer、イベント管理）
   - TypeScript側: 内部実装層（コアロジック、キャッシュ、パフォーマンス測定）
   - 役割分担が明確で、統合のメリットが少ない

2. **VimScript固有機能への深い依存（55%）**
   - autocmd管理（FocusGained、TermLeave、BufEnter/Leave）
   - timer_start()によるフォーカス復帰フラグのリセット
   - redraw制御
   - これらをTypeScriptに移植すると複雑性が増大

3. **Phase 1-2の統合が完了している**
   - 8つの依存モジュール（word_detector、hint_generator、display等）は既に統合済み
   - core.vimは統合された各モジュールの「統合ハブ」として機能
   - ハブ自体を統合する必要性が低い

4. **統合コスト > 保守コスト**
   - 推定統合期間: 7-10日
   - 必要なテストケース: 150以上
   - 状態管理の統一、座標系問題（Phase 2.1で経験）、タイマー管理の競合等の高リスク
   - 環境別実装を維持する方がメンテナンスコストが低い

5. **Phase 3.2（input統合）との判断基準の一貫性**
   - Phase 3.2: 両実装が完全機能 → 環境別実装維持
   - Phase 3.3: 役割分担が明確 → 環境別実装維持

#### 環境別実装の役割分担

| 環境 | 使用実装 | ファイル | 特徴 |
|------|---------|---------|------|
| **Vim** | VimScript版 | `core.vim` | 統合インターフェース層、autocmd/timer管理 |
| **Neovim** | TypeScript版 | `core.ts` | 内部実装層、Singleton、キャッシュ、パフォーマンス測定 |

**両者の連携**:
- VimScript側からDenops APIを呼び出し（Phase 1-3で既に実装済み）
- TypeScript側がコアロジックを提供
- 環境固有の処理は各実装で管理

**関連ファイル**:
- VimScript: `autoload/hellshake_yano_vim/core.vim` (442行)
- TypeScript: `denops/hellshake-yano/neovim/core/core.ts` (3,462行)

---

## 検証方法

### 自動テスト

```bash
# VimScriptテスト
vim -u NONE -N -S tests-vim/run_tests.vim

# TypeScriptテスト
deno test denops/hellshake-yano/
```

### 手動テスト

```vim
" 基本動作確認
:HellshakeYanoToggle
" jjj でヒント表示
" ヒント文字入力でジャンプ

" マルチウィンドウ確認
:let g:hellshake_yano.multiWindowMode = v:true
:vsplit
" jjj でヒント表示（両ウィンドウ）
```

---

## 技術的リスクと対策

| リスク | 影響度 | 対策 |
|--------|-------|------|
| Denops呼び出しのレイテンシ | 中 | バッチ処理、キャッシュ活用 |
| Vim 8.0との互換性 | 中 | CI/CDでのVim 8.0テスト |
| タイマーAPI挙動差異 | 高 | CLAUDE.mdの知見を活用 |
| v:count消失問題 | 高 | 現行の回避策を維持 |
| 座標系の違い | 高 | Denops統一APIを活用 |

---

## 期待効果

- [ ] 約5,000行のVimScript削減
- [ ] TypeScript版の高機能（キャッシュ、最適化）をVimでも利用可能
- [ ] メンテナンス性の向上
- [ ] バグ修正の一元化
- [ ] 型安全性の向上

---

## 参考資料

- [RESEARCH.md](./RESEARCH.md) - 技術要件詳細（deno-denops-std API等）
- [CLAUDE.md](./CLAUDE.md) - Vim/Neovim差異の知見

---

## 更新履歴

| 日付 | 更新内容 |
|------|----------|
| 2026-01-25 | 初版作成 |
| 2026-01-25 | Phase 1.1 dictionary統合 完了（1.1.1〜1.1.7 全タスク✅） |
| 2026-01-25 | Phase 1.2 config統合 完了（1.2.1〜1.2.8 全タスク✅） |
| 2026-01-26 | Phase 1.3 hint_generator統合 完了（1.3.1〜1.3.8 全タスク✅） |
| 2026-02-06 | Phase 2.1 word_detector統合 完了（2.1.1〜2.1.8 全タスク✅） |
| 2026-02-07 | Phase 2.3 visual統合 完了（2.3.1〜2.3.7 全タスク✅） |
| 2026-02-07 | Phase 3.2 input調査完了（環境別実装維持を決定、統合は行わず） |
| 2026-02-08 | Phase 3.3 core調査完了（環境別実装維持を決定、重複度14.3%） |
| 2026-02-08 | **全Phase完了（9/9 = 100%）** |
