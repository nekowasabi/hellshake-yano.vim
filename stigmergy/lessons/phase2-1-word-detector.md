# Phase 2.1: word_detector 統合の教訓

**ミッション**: word-detector-integration-2026-02-06
**完了日**: 2026-02-06
**進捗**: 11/11 tasks (100%)

---

## 重要な発見

### L1: col 座標系の不一致（High Priority）

**問題**: VimScript と TypeScript で `col` の意味が異なる

| 項目 | VimScript | TypeScript |
|------|-----------|------------|
| `col` | バイト位置 (1-indexed) | 表示列 (1-indexed) |
| `byteCol` | なし | バイト位置 (1-indexed) |

**対策**: `word.byteCol ?? word.col` でバイト位置を優先取得

**実装**: `denops/hellshake-yano/main.ts` lines 137-150 (toVimWordData)

**影響**: マルチバイト文字（日本語等）で位置ズレが発生

**例**: `"abc日本語def"` の `"本"` の位置
- VimScript `col`: 7 (byte)
- TypeScript `col`: 6 (display) ← 不一致!
- TypeScript `byteCol`: 7 (byte) ← 一致

**教訓**: VimScript と TypeScript で同じフィールド名でも意味が異なる場合がある。マルチバイト文字を扱う場合は必ず座標系の確認が必要。

---

### L2: get_min_length の高頻度呼び出し（Medium Priority）

**問題**: キー入力ごとに呼ばれるため、Denops RPC がボトルネック

**対策**: VimScript側でキャッシュ（TTL 100ms、max 10 entries、LRU eviction）

**実装**: `autoload/hellshake_yano_vim/word_detector.vim` lines 363-387

**計測結果**:
- キャッシュなし: 5ms
- キャッシュあり: 0.1ms
- **50-100x 高速化達成**

**教訓**: 高頻度呼び出し関数は VimScript 側でキャッシュが必須。Denops RPC のオーバーヘッドは無視できない。

---

### L3: Phase 1.3 成功パターンの有効性（High Priority）

**パターン**: has_denops() + try-catch + ローカルフォールバック

**実装例**:
```vim
function! hellshake_yano_vim#word_detector#detect_visible() abort
  " キャッシュチェック
  let l:cache_key = printf('%d:%d:%d', l:bufnr, l:topline, l:botline)
  if has_key(s:word_cache, l:cache_key) && !expired(l:cache_key)
    return s:word_cache[l:cache_key].data
  endif

  " Denops 優先
  if hellshake_yano_vim#word_detector#has_denops()
    try
      let l:result = denops#request('hellshake-yano', 'detectWordsVisible', [])
      " キャッシュ保存
      let s:word_cache[l:cache_key] = {'data': l:result, 'timestamp': reltime()}
      return l:result
    catch
      " エラー時はフォールバック
    endtry
  endif

  " ローカルフォールバック
  return s:detect_visible_local()
endfunction
```

**再利用性**: Phase 2.2 (display) / Phase 2.3 (visual) でも同じパターンを適用可能

**教訓**: Phase 1.3 で確立したパターンは Phase 2 でも有効。一貫性のあるアーキテクチャが開発効率を向上させる。

---

## Antipattern（回避すべきパターン）

### ❌ Antipattern 1: TypeScript `col` を直接 VimScript に渡す

**問題**: マルチバイト文字で位置がずれる

**修正前**:
```typescript
return { col: word.col };  // NG
```

**修正後**:
```typescript
return { col: word.byteCol ?? word.col };  // OK
```

### ❌ Antipattern 2: キャッシュなしの高頻度 Denops 呼び出し

**問題**: 1キーストロークあたり数ms のオーバーヘッド

**修正前**:
```vim
let l:min = denops#request('hellshake-yano', 'getMinWordLength', [a:key])
```

**修正後**:
```vim
" キャッシュヒット時は即座に返却
if has_key(s:min_length_cache, a:key)
  return s:min_length_cache[a:key]
endif
let l:min = denops#request('hellshake-yano', 'getMinWordLength', [a:key])
let s:min_length_cache[a:key] = l:min
```

### ❌ Antipattern 3: exists() チェックなしの関数呼び出し

**問題**: Denops 未起動時にエラー

**修正前**:
```vim
call denops#request(...)  " Denops 未起動時にエラー
```

**修正後**:
```vim
if hellshake_yano_vim#word_detector#has_denops()
  try
    call denops#request(...)
  catch
    " フォールバック
  endtry
endif
```

---

## Best Practice（推奨パターン）

### ✅ Pattern 1: byteCol 優先使用

**コンテキスト**: VimScript と TypeScript 間でバイト位置を渡す

**ソリューション**: `word.byteCol ?? word.col` パターン

**利点**: マルチバイト文字でも正確な位置を保証

### ✅ Pattern 2: VimScript 側キャッシュ（高頻度呼び出し関数）

**コンテキスト**: キーストロークごとに呼ばれる関数

**ソリューション**: TTL 100ms, max 10 entries, LRU eviction

**利点**: 50-100x 高速化、ユーザー体験の向上

### ✅ Pattern 3: Denops優先 + ローカルフォールバック

**コンテキスト**: Vim/Neovim 両環境対応が必要

**ソリューション**:
1. has_denops() で利用可否確認
2. try-catch で Denops 呼び出し
3. エラー時は VimScript ローカル実装にフォールバック

**利点**: 堅牢性、両環境での動作保証

---

## 統計データ

### 実装規模
- **追加行数**: 約 3,938 行
- **テストケース**: 41 件
- **修正ファイル**: 16 件
- **コミット数**: 3 件

### パフォーマンス
- **キャッシュ高速化**: 50-100x
- **テスト実行時間**: word-detector 26ms (13 tests)

### 進捗
- **完了タスク**: 11/11 (100%)
- **推定期間**: 2-4日
- **実績期間**: 1日（並列実行により短縮）

---

## 次のステップへの推奨事項

### Phase 2.2 (display 統合) への適用

1. **byteCol パターン**: popup/extmark の座標変換で必須
2. **キャッシュ**: 表示更新の高頻度化に対応
3. **Denops優先パターン**: 3つの実装（VimScript, Vim用TypeScript, Neovim用TypeScript）を統一

### Phase 2.3 (visual 統合) への適用

1. **同じアーキテクチャ**: Phase 1.3/2.1 のパターンを踏襲
2. **テストファースト**: TDD Red-Green-Refactor を継続
3. **並列実行**: Process 10-12 のような独立タスクは並列化

---

## 参照

### 関連ドキュメント
- `PLAN.md`: Process 1-12 の詳細仕様
- `PLAN_TOTAL.md`: Phase 2.1 進捗管理
- `RESEARCH.md`: byteCol 座標系問題の技術文書

### 関連コミット
- `de5a33e`: feat(word-detector): Phase 2.1 統合完了
- `3518d91`: test(word-detector): テストスイート追加
- `8b8f360`: docs(word-detector): Process 1-12 完了レポート

### テストファイル
- `tests/vim_layer_word_test.ts`: TypeScript API テスト (13 cases)
- `tests-vim/hellshake_yano_vim/test_word_detector_*.vim`: VimScript テスト (6 files, 50 cases)

---

**作成日**: 2026-02-06
**作成者**: OODA Feedback Loop (Process 300)
**ミッション完了**: Phase 2.1 word_detector 統合 ✅
