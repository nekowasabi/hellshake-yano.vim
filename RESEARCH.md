# VimScript/TypeScript(Denops) 統合調査レポート

**調査日**: 2026-01-25
**目的**: Vim用VimScriptとNeovim用TypeScriptの二重管理を解消し、Denops側に統一する

---

## 1. 現状のコードベース規模

| 区分 | 行数 | 主要ファイル |
|------|------|-------------|
| VimScript (autoload/) | 約5,064行 | core.vim, display.vim, motion.vim, word_detector.vim |
| TypeScript (denops/) | 約14,689行 | core.ts (3,462行), word.ts (2,264行), hint.ts (736行) |

### 1.1 VimScript モジュール構成

| ファイル | 行数 | 機能 |
|----------|------|------|
| `core.vim` | 442 | 状態管理、統合処理 |
| `display.vim` | 493 | popup/extmark表示（Vim/Neovim両対応） |
| `motion.vim` | 657 | モーション連打検出 |
| `word_detector.vim` | 468 | 単語検出（日本語対応） |
| `input.vim` | 315 | キー入力処理（ブロッキング） |
| `hint_generator.vim` | 230 | ヒント文字列生成 |
| `visual.vim` | 219 | ビジュアルモード対応 |
| `config.vim` | 161 | 設定管理 |
| `dictionary.vim` | 186 | 辞書連携（Denops API呼び出し） |
| `util.vim` | 155 | 共通ユーティリティ |

### 1.2 TypeScript ディレクトリ構造

```
denops/hellshake-yano/
├── main.ts (707行) - メインエントリーポイント
├── config.ts (625行) - 設定管理
├── types.ts (350行) - 型定義
├── common/ - 共通ユーティリティ
├── integration/ - 統合レイヤー
│   ├── implementation-selector.ts - 実装選択
│   └── mapping-manager.ts - マッピング管理
├── neovim/ - Neovim専用実装
│   ├── core/core.ts (3,462行) - コアロジック
│   ├── core/word.ts (2,264行) - 単語検出
│   ├── core/hint.ts (736行) - ヒント生成
│   └── display/extmark-display.ts (604行)
└── vim/ - Vim専用実装
    ├── display/popup-display.ts (133行)
    └── features/motion.ts, visual.ts
```

---

## 2. deno-denops-std API リファレンス

**ソース**: https://github.com/vim-denops/deno-denops-std

### 2.1 モジュール構成

| ディレクトリ | 用途 | Vim/Neovim分岐 |
|-------------|------|---------------|
| `function/` | Vim/Neovim関数ラッパー | `vim/`, `nvim/` サブディレクトリで分離 |
| `popup/` | ポップアップ/フローティングウィンドウ | `vim.ts`, `nvim.ts` で分離 |
| `buffer/` | バッファ操作 | 共通API（内部で分岐） |
| `buffer/decoration.ts` | ハイライト装飾 | 内部で `prop_add` / `extmark` 分岐 |

### 2.2 Vim/Neovim 表示系API比較

#### Vim: popup_create + prop_add

```typescript
// popup_create オプション
{
  line, col,           // 位置（1-indexed）
  pos: 'topleft',      // アンカー位置
  fixed: true,
  maxheight, minheight,
  maxwidth, minwidth,
  border, borderchars,
  highlight,
  zindex,
  posinvert: false,    // Neovim互換
  flip: false,
  scrollbar: 0
}

// prop_add（テキスト装飾）- 事前に型登録が必要
prop_type_add(name, { highlight, priority })
prop_add_list(type, [[lnum, col, lnum_end, col_end], ...])
```

#### Neovim: nvim_open_win + nvim_buf_set_extmark

```typescript
// nvim_open_win オプション
{
  relative: 'editor' | 'cursor',
  row, col,            // 位置（0-indexed）
  width, height,
  anchor: 'NW' | 'NE' | 'SW' | 'SE',
  border,
  focusable: false,    // Vim互換のため
  zindex
}

// nvim_buf_set_extmark（テキスト装飾）
nvim_buf_set_extmark(buffer, ns_id, line, col, {
  virt_text: [[text, hl_group]],
  virt_text_pos: 'overlay',
  hl_group,
  end_row, end_col,
  priority
})
```

### 2.3 座標系の違い（重要）

| 項目 | Vim | Neovim |
|------|-----|--------|
| 行番号 | 1-indexed | 0-indexed |
| 列番号 | 1-indexed | 0-indexed |
| 列の単位 | 表示列 | バイト位置 |
| 変換処理 | screenpos() | 不要（直接指定） |

### 2.4 装飾（decoration）の違い

| 項目 | Vim (prop_add) | Neovim (extmark) |
|------|---------------|------------------|
| 事前登録 | 必要（prop_type_add） | 不要 |
| 名前空間 | 型名で管理 | nvim_create_namespace |
| 削除 | prop_remove | nvim_buf_del_extmark |
| 一括削除 | prop_remove({type}) | nvim_buf_clear_namespace |
| 優先度 | 型名に含める | opts.priority |

### 2.5 Denops統一API

```typescript
// popup モジュール - Vim/Neovim共通インターフェース
import * as popup from "jsr:@denops/std/popup";
const win = await popup.open(denops, {
  bufnr,
  relative: "editor",
  width: 20,
  height: 20,
  row: 1,
  col: 1,
});
await win.close();

// buffer/decoration - 統一された装飾API
import { decorate } from "jsr:@denops/std/buffer";
await decorate(denops, bufnr, decorations);
// 内部でVim/Neovim分岐を処理

// function モジュール - 型安全なVim関数呼び出し
import * as fn from "jsr:@denops/std/function";
import * as nvimFn from "jsr:@denops/std/function/nvim";
import * as vimFn from "jsr:@denops/std/function/vim";
```

---

## 3. 主要なNeovim固有API（extmark関連）

```typescript
// 名前空間作成
nvim_create_namespace(denops, name): Promise<number>

// extmark設定
nvim_buf_set_extmark(denops, buffer, ns_id, line, col, opts): Promise<number>
// opts: { virt_text, virt_text_pos, hl_group, end_row, end_col, priority }

// extmark取得
nvim_buf_get_extmark_by_id(denops, buffer, ns_id, id, opts): Promise<[number, number]>
nvim_buf_get_extmarks(denops, buffer, ns_id, start, end, opts): Promise<unknown[]>

// extmark削除
nvim_buf_del_extmark(denops, buffer, ns_id, id): Promise<boolean>
nvim_buf_clear_namespace(denops, buffer, ns_id, line_start, line_end): Promise<void>
```

---

## 4. 主要なVim固有API（popup/prop関連）

```typescript
// popup関連
popup_create(denops, what, options): Promise<number>  // ウィンドウID
popup_close(denops, id, result?): Promise<void>
popup_list(denops): Promise<number[]>
popup_getpos(denops, id): Promise<Record<string, unknown>>
popup_getoptions(denops, id): Promise<Record<string, unknown>>

// prop関連
prop_type_add(denops, name, props): Promise<void>
prop_add(denops, lnum, col, props): Promise<void>
prop_add_list(denops, type, items): Promise<void>
prop_remove(denops, props, lnum?, lnum_end?): Promise<number>
prop_list(denops, lnum, props?): Promise<unknown[]>
prop_find(denops, props, direction?): Promise<unknown>
```

---

## 5. 重複機能の特定と統合優先度

| 機能 | VimScript | TypeScript | 重複度 | 統合難易度 | 優先度 |
|------|-----------|------------|--------|-----------|--------|
| dictionary | 186行 | 51行 | 低 | **低** | **1** |
| config | 161行 | 625行 | 高 | **低** | **2** |
| hint_generator | 230行 | 736行 | 高 | **低** | **3** |
| word_detector | 468行 | 2,264行 | 高 | 中 | 4 |
| display | 493行 | 737行 | 高 | 中 | 5 |
| visual | 219行 | 113行 | 中 | 中 | 6 |
| motion | 657行 | 82行 | 中 | 高 | 7 |
| input | 315行 | (内包) | 低 | 高 | 8 |
| core | 442行 | 3,462行 | 高 | 高 | 9 |

---

## 6. 推奨統合順序

### Phase 1: 低リスク（各1-2日）

1. **dictionary統合**
   - 現状: VimScript版は既にDenops APIをラップ
   - 作業: VimScript版を削除し、TypeScript版に一本化
   - Denops API: `denops.dispatch('hellshake-yano', 'reloadDictionary')`

2. **config統合**
   - 現状: TypeScript側にconfig-mapper/unifier/migratorが存在
   - 作業: VimScript版config.vimをDenops呼び出しに置き換え

3. **hint_generator統合**
   - 現状: TypeScript版の方が高機能（ストラテジーパターン）
   - 作業: VimScript版をDenops API呼び出しに置き換え

### Phase 2: 中リスク（各2-4日）

4. **word_detector統合**
   - 現状: TypeScript版がはるかに高機能（キャッシュ、最適化）
   - 作業: VimScript版をDenops API呼び出しに置き換え
   - 考慮点: パフォーマンス測定が必要

5. **display統合**
   - 現状: 3つの実装が存在
   - 作業: `@denops/std/popup` と `@denops/std/buffer/decoration` を活用
   - 考慮点: 座標変換ロジックの正確な移植

6. **visual統合**
   - 作業: TypeScript版を拡張し、VimScript版を置き換え
   - 考慮点: 選択範囲の取得タイミング

### Phase 3: 高リスク（各5-10日）

7. **motion統合**
   - 考慮点: タイマー処理、v:count処理のDenops移植

8. **input統合**
   - 考慮点: getchar()ブロッキング入力の非同期化

9. **core統合**
   - 考慮点: 全機能の回帰テスト

---

## 7. 技術的リスクと対策

| リスク | 影響度 | 対策 |
|--------|-------|------|
| Denops呼び出しのレイテンシ | 中 | バッチ処理、キャッシュ活用 |
| Vim 8.0との互換性 | 中 | CI/CDでのVim 8.0テスト |
| タイマーAPI挙動差異 | 高 | CLAUDE.mdの知見を活用 |
| v:count消失問題 | 高 | 現行の回避策を維持 |
| 座標系の違い | 高 | Denops統一APIを活用 |

---

## 8. 既知のVim/Neovim差異（CLAUDE.mdより）

### 8.1 timer_start()のコールバック引数
- タイマーIDが第1引数として自動渡し
- Vimでラムダ使用時は`+lambda`ビルドオプションが必要

### 8.2 nvim_buf_set_extmark()のid=0
- 「自動割り当て」ではなく「ID 0の操作」と解釈される
- 自動割り当てを希望する場合はidオプションを省略

### 8.3 colパラメータ
- extmarkはバイト位置（0-indexed）
- popupは表示列（1-indexed）
- マルチバイト文字で要注意

### 8.4 nvim_buf_clear_namespace(0, ...)
- 「カレントバッファのみ」を意味
- 「全バッファ」ではない
- マルチバッファ対応時は明示的にバッファ番号を指定

---

## 9. 期待効果

- 約5,000行のVimScript削減可能
- TypeScript版の高機能（キャッシュ、最適化、高度なヒント割り当て）をVimでも利用可能
- メンテナンス性の向上
- バグ修正の一元化
- 型安全性の向上

---

## 10. 参考リンク

- [deno-denops-std](https://github.com/vim-denops/deno-denops-std) - Denops標準ライブラリ
- [Denops Documentation](https://vim-denops.github.io/denops-documentation/) - 公式ドキュメント
- [JSR @denops/std](https://jsr.io/@denops/std) - JSRパッケージ

---

## 11. Phase 2.1 で発見された座標系の問題

### 11.1 col の不一致問題

Phase 2.1 (word_detector 統合) で、VimScript と TypeScript の `col` 座標の意味が異なることが判明。

| 項目 | VimScript | TypeScript |
|------|-----------|------------|
| `col` | バイト位置 (1-indexed) | 表示列 (1-indexed) |
| `byteCol` | なし | バイト位置 (1-indexed) |

**問題**: マルチバイト文字（日本語など）を含む行で、座標が一致しない。

**例**: `"abc日本語def"` の `"本"` の位置
- VimScript `col`: 7 (byte)
- TypeScript `col`: 6 (display) ← **不一致!**
- TypeScript `byteCol`: 7 (byte) ← 一致

### 11.2 実装パターン: byteCol 優先

TypeScript側で `word.byteCol ?? word.col` パターンを使用し、バイト位置を優先取得。

```typescript
function toVimWordData(word: Word): Record<string, unknown> {
  const encoder = new TextEncoder();
  const byteLen = encoder.encode(word.text).length;
  const col = word.byteCol ?? word.col;  // byteCol 優先
  return {
    text: word.text,
    lnum: word.line,
    col: col,
    end_col: col + byteLen,
  };
}
```

**実装箇所**: `denops/hellshake-yano/main.ts` lines 137-150

### 11.3 回避策

1. **TypeScript側**: `byteCol` フィールドを明示的に設定
2. **VimScript側**: `col` をそのまま使用（バイト位置として扱う）
3. **変換関数**: `toVimWordData()` で `byteCol` を優先

### 11.4 教訓

- VimScript と TypeScript で同じフィールド名でも意味が異なる場合がある
- マルチバイト文字を扱う場合は必ず座標系の確認が必要
- Phase 1.1-1.3 では辞書・設定・ヒント生成のため、この問題は顕在化しなかった
- Phase 2.1 (単語検出) で初めて座標の正確性が要求され、問題が発見された

---

**更新履歴**
- 2026-01-25: 初版作成
- 2026-02-06: Phase 2.1 座標系問題の文書化追加
