# VimScript/TypeScript(Denops) 統合 - 全体進捗管理

**作成日**: 2026-01-25
**目的**: Vim用VimScriptとNeovim用TypeScriptの二重管理を解消し、Denops側に統一

---

## 全体進捗サマリー

| Phase | 機能数 | 推定期間 | 進捗 |
|-------|--------|----------|------|
| Phase 1: 低リスク | 3 | 3-6日 | ✅ 3/3 (1.1,1.2,1.3完了) |
| Phase 2: 中リスク | 3 | 6-12日 | 🔄 1/3 (2.1完了) |
| Phase 3: 高リスク | 3 | 15-30日 | ⬜ 0/3 |
| **合計** | **9** | **24-48日** | **🔄 4/9** |

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
| 2.2.1 | `@denops/std/popup` モジュールの動作確認 | ⬜ |
| 2.2.2 | `@denops/std/buffer/decoration` モジュールの動作確認 | ⬜ |
| 2.2.3 | 座標変換ロジックをTypeScript側に統一 | ⬜ |
| 2.2.4 | VimScript版をDenops API呼び出しに置き換え | ⬜ |
| 2.2.5 | マルチウィンドウ表示の動作確認 | ⬜ |
| 2.2.6 | Vim で動作確認（popup） | ⬜ |
| 2.2.7 | Neovim で動作確認（extmark） | ⬜ |
| 2.2.8 | 回帰テスト実行 | ⬜ |

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
| 2.3.1 | VimScript版のビジュアルモード処理を分析 | ⬜ |
| 2.3.2 | TypeScript版のAPIを拡張 | ⬜ |
| 2.3.3 | 選択範囲の取得タイミングを検証 | ⬜ |
| 2.3.4 | VimScript版をDenops API呼び出しに置き換え | ⬜ |
| 2.3.5 | Vim で動作確認 | ⬜ |
| 2.3.6 | Neovim で動作確認 | ⬜ |
| 2.3.7 | 回帰テスト実行 | ⬜ |

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
| 3.1.1 | VimScript版のモーション検出ロジックを分析 | ⬜ |
| 3.1.2 | タイマー処理のDenops移植検討 | ⬜ |
| 3.1.3 | v:count処理のDenops移植検討 | ⬜ |
| 3.1.4 | TypeScript版のAPIを拡張 | ⬜ |
| 3.1.5 | VimScript版をDenops API呼び出しに置き換え | ⬜ |
| 3.1.6 | Vim で動作確認 | ⬜ |
| 3.1.7 | Neovim で動作確認 | ⬜ |
| 3.1.8 | 回帰テスト実行 | ⬜ |

**注意点（CLAUDE.mdより）**:
- timer_start(): コールバック第1引数にタイマーIDが自動渡し
- Vimでラムダ使用時は`+lambda`ビルドオプションが必要

**関連ファイル**:
- VimScript: `autoload/hellshake_yano_vim/motion.vim` (657行)
- TypeScript: `denops/hellshake-yano/vim/features/motion.ts` (82行)

---

### 3.2 input 統合

**現状**: VimScript版はgetchar()ベースのブロッキング入力
**難易度**: ★★★ 高
**推定期間**: 5-10日

| # | タスク | 状態 |
|---|--------|------|
| 3.2.1 | VimScript版の入力処理ロジックを分析 | ⬜ |
| 3.2.2 | ブロッキング入力の非同期化検討 | ⬜ |
| 3.2.3 | TypeScript版のAPIを設計 | ⬜ |
| 3.2.4 | VimScript版をDenops API呼び出しに置き換え | ⬜ |
| 3.2.5 | Vim で動作確認 | ⬜ |
| 3.2.6 | Neovim で動作確認 | ⬜ |
| 3.2.7 | 回帰テスト実行 | ⬜ |

**関連ファイル**:
- VimScript: `autoload/hellshake_yano_vim/input.vim` (315行)
- TypeScript: (core.tsに内包)

---

### 3.3 core 統合

**現状**: 両方に大規模な実装あり
**難易度**: ★★★ 高
**推定期間**: 5-10日

| # | タスク | 状態 |
|---|--------|------|
| 3.3.1 | VimScript版のコアロジックを分析 | ⬜ |
| 3.3.2 | TypeScript版との機能マッピング | ⬜ |
| 3.3.3 | Denops dispatcher経由のAPI設計 | ⬜ |
| 3.3.4 | VimScript版をDenops呼び出しラッパーに変更 | ⬜ |
| 3.3.5 | 全機能の統合テスト | ⬜ |
| 3.3.6 | Vim で全機能動作確認 | ⬜ |
| 3.3.7 | Neovim で全機能動作確認 | ⬜ |
| 3.3.8 | 回帰テスト実行 | ⬜ |

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
