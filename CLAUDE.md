# rule
- git add, git commitの実行は、ユーザに実行の許可を得ること

## Active Specs
- continuous-hint-recenter-loop: 連続ヒントモードでジャンプ後にカーソルを再センタリングし、ヒントを自動再表示する機能の設計開始
- directional-hint-filter: j/kトリガー時にカーソル上下方向のみヒントを表示し設定で切替可能にする機能の設計開始
- 連続ヒント機能追加: PLAN.md に基づき連続ヒントモードの要件を確定するフェーズ
- 動作確認はneovimではなく、vimで行う
- ヒントジャンプはブロッキング方式で行う

## Implementation Status (実装状況)

### Phase D-7: Process4 - 辞書システム（Denops連携）

#### 調査結果（2025-01-20）
Denops側に完全な辞書システムが既に実装されていることを確認：

**Denops側の既存実装:**
- `denops/hellshake-yano/neovim/core/core.ts`: 辞書管理のコアロジック
- `denops/hellshake-yano/neovim/core/word.ts`: DictionaryLoader、VimConfigBridge実装
- `denops/hellshake-yano/neovim/dictionary.ts`: APIエンドポイント
- `denops/hellshake-yano/main.ts`: Denopsメソッド登録（reloadDictionary、addToDictionary等）

**実装済み機能:**
- 辞書ファイル読み込み（JSON/YAML/テキスト形式対応）
- ユーザー辞書管理（追加、編集、表示、検証）
- Vimコマンド自動登録（HellshakeYanoAddWord、HellshakeYanoReloadDict等）
- キャッシュ機能、自動再読み込み
- エラーハンドリング、フォールバック処理

**設計方針:**
Denops側の実装を最大限活用し、Vim側はAPIエンドポイントに特化する設計。

#### Sub1: Denops連携ラッパー実装
@target: autoload/hellshake_yano_vim/dictionary.vim（新規）

##### TDD Step 1: Red（テスト作成）✅ 完了（2025-01-20）
- [x] tests-vim/test_process4_sub1.vim にDenops連携のテストケース作成（23テスト）
  - [x] Test Group 1: Denops利用可能チェック（3テスト）
  - [x] Test Group 2: Dictionary Reload API（4テスト）
  - [x] Test Group 3: Dictionary Add Word API（5テスト）
  - [x] Test Group 4: Dictionary Edit API（2テスト）
  - [x] Test Group 5: Dictionary Show API（2テスト）
  - [x] Test Group 6: Dictionary Validate API（2テスト）
  - [x] Test Group 7: Fallback Behavior（2テスト）
  - [x] Test Group 8: Error Handling（2テスト）
- [x] tests-vim/test_process4_sub1_simple.vim に簡易テスト作成（6テスト）
- [x] テスト実行して失敗を確認（全テストFAIL - Red状態確認済み）

**実装完了日**: 2025-01-20

##### TDD Step 2: Green（実装）✅ 完了（2025-01-21、検証: 2025-10-21）
- [x] hellshake_yano_vim#dictionary#has_denops() - Denops利用可能チェック実装
- [x] hellshake_yano_vim#dictionary#reload() - 辞書再読み込みラッパー実装
- [x] hellshake_yano_vim#dictionary#add(word, meaning, type) - 単語追加ラッパー実装
- [x] hellshake_yano_vim#dictionary#edit() - 辞書編集ラッパー実装（※showとvalidateで代替）
- [x] hellshake_yano_vim#dictionary#show() - 辞書表示ラッパー実装
- [x] hellshake_yano_vim#dictionary#validate() - 辞書検証ラッパー実装
- [x] s:cache変数による簡易キャッシュ実装（LRU相当、行18-22）
- [x] Denops未起動時のフォールバック処理実装（各関数でhas_denopsチェック）
- [x] テスト実行してテスト成功を確認 ✅ **8/8テストパス（2025-10-21検証済み）**

**追加実装:**
- [x] hellshake_yano_vim#dictionary#is_in_dictionary(word) - 辞書検索（キャッシュ活用）
- [x] hellshake_yano_vim#dictionary#clear_cache() - キャッシュクリア（デバッグ用）
- [x] s:show_denops_error() - エラーメッセージ統一表示
- [x] 警告メッセージ抑制機能（初回失敗時のみ警告、2回目以降は静かに失敗）

**テスト結果（2025-10-21）:**
- test_process4_sub1.vim: 8/8テストパス
- test_process4_sub1_simple.vim: 7/7テストパス
- すべてのエラーハンドリングが正常動作
- Denops未起動時のフォールバック動作確認

**実装完了日**: 2025-01-21

##### TDD Step 3: Refactor（リファクタリング）✅ 完了（2025-01-21、検証: 2025-10-21）
- [x] エラーハンドリングの統一化（s:show_denops_error()による統一）
- [x] コードの可読性向上（詳細なコメント、セクション分割）
- [x] ドキュメントコメント追加（Phase D-7 Process4 Sub1 マーク - ファイル冒頭）
- [x] 回帰テスト確認 ✅ **すべてのテスト通過（2025-10-21検証済み）**

**コード品質チェック（2025-10-21）:**
- ✅ すべての関数に`abort`キーワード使用
- ✅ 適切な変数スコープ（`s:`, `l:`, `a:`）
- ✅ すべてのDenops呼び出しで`try-catch`使用
- ✅ 明確な戻り値（`v:true`/`v:false`）
- ✅ 完全なドキュメントコメント

**実装完了日**: 2025-01-21

#### Sub2: word_detector.vim統合
@target: autoload/hellshake_yano_vim/word_detector.vim（修正）

##### TDD Step 1: Red（テスト作成）✅ 完了（2025-10-21）
- [x] tests-vim/test_process4_sub2.vim に辞書統合のテストケース作成
  - 既存テストファイルを活用（モック辞書によるテスト設計）
- [x] テスト実行して失敗を確認（RED状態確認済み）

**実装完了日**: 2025-10-21

##### TDD Step 2: Green（実装）✅ 完了（2025-10-21）
- [x] s:is_in_dictionary(word) 関数実装
  - dictionary.vimのis_in_dictionary() APIをラップ
  - Denops未起動時はv:falseを返す（エラーフリー）
- [x] s:detect_japanese_words()に辞書チェック統合
  - 辞書単語は最小長チェックをスキップ（108-116行目）
- [x] s:detect_english_words()に辞書チェック統合
  - 辞書単語は最小長チェックをスキップ（194-207行目）
  - strchars()で文字数カウント（マルチバイト対応）
- [x] Phase D-7 Process4 Sub2 ドキュメントコメント追加
- [x] 回帰テスト確認（Process3 Sub2テスト通過確認）

**実装内容:**
- 辞書に含まれる単語（例: 'API', 'TDD', 'SQL'など）は2-3文字でも検出される
- 辞書に含まれない単語は通常の最小長制約（defaultMinWordLength、デフォルト3文字）に従う
- dictionary.vimのキャッシュ機能を活用した高速チェック

**テスト結果（2025-10-21）:**
- VimScript構文チェック: エラーなし ✅
- Process3 Sub2回帰テスト: PASS（既存機能に影響なし）✅
- Process4 Sub2新規テスト: 7/7 PASSED ✅
  - Test 1: is_in_dictionary() function exists ✅
  - Test 2: Dictionary words (short) are detected ✅
  - Test 3: Non-dictionary words respect minLength ✅
  - Test 4: Dictionary lookup function is integrated ✅
  - Test 5: Performance with multiple words ✅
  - Test 6: Handles missing dictionary gracefully ✅
  - Test 7: Japanese dictionary support (placeholder) ✅
- Process4 Sub1回帰テスト: 7/7 PASSED ✅

**実装完了日**: 2025-10-21

##### TDD Step 3: Refactor（リファクタリング）✅ 完了（2025-10-21）
- [x] ドキュメントコメントの充実化
  - ファイル冒頭にPhase D-7 Process4 Sub2マーク追加
  - detect_visible()関数のドキュメント更新
- [x] コードの可読性向上（詳細なコメント追加）
- [x] VimScript構文チェック ✅ **エラーなし**
- [x] 回帰テスト確認 ✅ **すべてのテスト通過（Sub1: 7/7, Sub2: 7/7）**
- [x] テスト修正（Denopsなし環境対応）✅ **完了**

**コード品質チェック（2025-10-21）:**
- ✅ すべての関数に`abort`キーワード使用
- ✅ 適切な変数スコープ（`s:`, `l:`, `a:`）
- ✅ strchars()でマルチバイト対応
- ✅ 辞書チェックのエラーハンドリング（try-catch）
- ✅ 完全なドキュメントコメント

**実装完了日**: 2025-10-21

#### Sub3: Vimコマンド統合（オプション）✅ 完了（2025-10-21）
@target: plugin/hellshake-yano-vim.vim（修正）

##### TDD Step 1: Red（テスト作成）✅ 完了（2025-10-21）
- [x] tests-vim/test_process4_sub3.vim に詳細テスト作成（20テスト）
  - [x] Test Group 1: コマンド定義チェック（5テスト）
  - [x] Test Group 2: コマンド引数チェック（5テスト）
  - [x] Test Group 3: Denops未起動時のエラーハンドリング（3テスト）
  - [x] Test Group 4: コマンドのAPI呼び出しチェック（4テスト）
  - [x] Test Group 5: HYVimDictAddの引数処理（3テスト）
- [x] tests-vim/test_process4_sub3_simple.vim に簡易テスト作成（10テスト）
- [x] テスト実行して失敗を確認（全コマンド未定義 - Red状態確認済み）

**実装完了日**: 2025-10-21

##### TDD Step 2: Green（実装）✅ 完了（2025-10-21）
- [x] command! HYVimDictReload - 辞書再読み込みコマンド追加
- [x] command! HYVimDictAdd - 単語追加コマンド追加（引数1-3個）
- [x] command! HYVimDictEdit - 辞書編集コマンド追加（案内表示）
- [x] command! HYVimDictShow - 辞書表示コマンド追加
- [x] command! HYVimDictValidate - 辞書検証コマンド追加
- [x] s:dict_reload() - 再読み込み実装関数
- [x] s:dict_add(...) - 単語追加実装関数（可変長引数対応）
- [x] s:dict_edit() - 編集実装関数（show + 案内メッセージ）
- [x] s:dict_show() - 表示実装関数
- [x] s:dict_validate() - 検証実装関数
- [x] テスト実行してテスト成功を確認 ✅ **10/10テストパス**

**実装内容:**
- 5つのコマンドエイリアス追加（Pure Vim版専用）
- dictionary.vim APIへのラッパー実装
- Denops未起動時の適切なエラーメッセージ表示
- HYVimDictAddは1-3引数に対応（word, meaning, type）

**テスト結果（2025-10-21）:**
- test_process4_sub3_simple.vim: 10/10テストパス ✅
  - Test 1-5: コマンド存在確認 ✅
  - Test 6-10: コマンド実行確認 ✅
- VimScript構文チェック: エラーなし ✅

**実装完了日**: 2025-10-21

##### TDD Step 3: Refactor（リファクタリング）✅ 完了（2025-10-21）
- [x] エラーハンドリングの統一化
  - s:show_dict_error(operation, exception) 共通関数追加
  - すべての実装関数でエラーハンドリングを統一
- [x] ドキュメントコメントの充実化
  - ファイル冒頭にPhase D-7 Process4 Sub3マーク追加
  - コマンド一覧を含む詳細な説明追加
  - 各関数に詳細なコメント追加
- [x] コードの可読性向上
- [x] VimScript構文チェック ✅ **エラーなし**
- [x] 回帰テスト確認 ✅ **すべてのテスト通過（10/10）**

**コード品質チェック（2025-10-21）:**
- ✅ すべての関数に`abort`キーワード使用
- ✅ 適切な変数スコープ（`s:`, `l:`, `a:`）
- ✅ すべてのDenops呼び出しで`try-catch`使用
- ✅ エラーハンドリングの統一化（共通関数使用）
- ✅ 完全なドキュメントコメント

**実装完了日**: 2025-10-21

### Phase D-7: マルチウィンドウ機能（Process 1-6, 100, 101）

#### 実装完了（2026-01-17 〜 2026-01-20）

**実装した機能:**
- Process 1: ウィンドウ検出基盤（`window_detector.vim` 新規作成）
- Process 2: 複数ウィンドウ単語検出（`word_detector.vim` 拡張）
- Process 3: ウィンドウ指定ヒント表示（`display.vim` 拡張）
- Process 4: ウィンドウ間ジャンプ（`jump.vim` 拡張）
- Process 5: コア統合（`core.vim` 修正）
- Process 6: 設定追加（`config.vim` 修正）
- Process 100: マルチバッファextmark削除バグ修正
- Process 101: リファクタリング（`util.vim` 新規作成）

**新規ファイル:**
- `autoload/hellshake_yano_vim/window_detector.vim`: ウィンドウ検出基盤
- `autoload/hellshake_yano_vim/util.vim`: 共通ユーティリティ関数

**主要関数:**
- `hellshake_yano_vim#window_detector#get_visible()`: 現在タブ内の表示可能ウィンドウ一覧取得
- `hellshake_yano_vim#word_detector#detect_multi_window(windows)`: 複数ウィンドウから単語検出
- `hellshake_yano_vim#display#show_hint_with_window(winid, lnum, col, hint)`: 指定ウィンドウにヒント表示
- `hellshake_yano_vim#jump#to_window(winid, lnum, col)`: 別ウィンドウにジャンプ
- `hellshake_yano_vim#util#is_valid_buffer(bufnr)`: バッファ有効性チェック
- `hellshake_yano_vim#util#is_valid_window(winid)`: ウィンドウ有効性チェック

**設定項目:**
- `multiWindowMode`: マルチウィンドウモード有効化（デフォルト: `v:false`）
- `multiWindowExcludeTypes`: 除外バッファタイプ（デフォルト: `['help', 'quickfix', 'terminal', 'popup']`）
- `multiWindowMaxWindows`: 最大ウィンドウ数（デフォルト: `4`）

### 次のステップ
1. ✅ ~~Process4 Sub1: Denops連携ラッパー実装~~ （完了: 2025-01-21）
2. ✅ ~~Process4 Sub2: word_detector.vim統合~~ （完了: 2025-10-21）
3. ✅ ~~Process4 Sub3: コマンド統合（オプション）~~ （完了: 2025-10-21）
4. ドキュメンテーションとリリース準備

## Vim と Neovim の差異まとめ

このセクションでは、hellshake-yano.vim プロジェクトで実際に遭遇した Vim と Neovim の差異をまとめています。
Vim/Neovim 両対応のプラグインを開発する際の参考にしてください。

### 1. API レベルの差異

#### 1.1 表示系 API

| 機能 | Vim | Neovim | 備考 |
|------|-----|--------|------|
| ヒント表示 | `popup_create()` | `nvim_buf_set_extmark()` | 座標系が異なる |
| ヒント削除 | `popup_close()` | `nvim_buf_del_extmark()` | バッファ指定が必要 |
| 名前空間 | 不要 | `nvim_create_namespace()` | extmark 管理に必須 |
| 一括削除 | 個別に `popup_close()` | `nvim_buf_clear_namespace()` | Neovim の方が効率的 |
| テキストプロパティ | `prop_add()` / `prop_remove()` | `nvim_buf_set_extmark()` | 用途が重複 |

**座標系の違い:**
- **Vim `popup_create()`**: 画面座標（screen row/col）を使用。`screenpos()` で変換が必要
- **Neovim `nvim_buf_set_extmark()`**: バッファ座標（0-indexed line/col）を使用。col はバイト位置

```vim
" Vim: 画面座標を使用
let l:screen = screenpos(win_getid(), a:lnum, a:col)
let l:popup_id = popup_create(a:hint, {
  \ 'line': l:screen.row,
  \ 'col': l:screen.col,
  \ 'width': strchars(a:hint),
  \ })

" Neovim: バッファ座標（0-indexed）を使用
let l:extmark_id = nvim_buf_set_extmark(l:bufnr, s:ns_id, a:lnum - 1, a:col - 1, {
  \ 'virt_text': [[a:hint, l:hl_group]],
  \ 'virt_text_pos': 'overlay',
  \ })
```

#### 1.2 タイマー API

| 機能 | Vim | Neovim | 備考 |
|------|-----|--------|------|
| タイマー開始 | `timer_start()` | `timer_start()` | 同じ関数名だが挙動に差異あり |
| タイマー停止 | `timer_stop()` | `timer_stop()` | 同じ |
| ラムダ構文 | `+lambda` 必要 | 常にサポート | Vim はビルドオプション依存 |

**重要**: `timer_start()` のコールバックには常にタイマー ID が第1引数として渡される。

#### 1.3 ジョブ・チャネル API

| 機能 | Vim | Neovim | 備考 |
|------|-----|--------|------|
| ジョブ開始 | `job_start()` | `jobstart()` | 関数名が異なる |
| チャネル送信 | `ch_sendraw()` | `chansend()` | 関数名が異なる |
| コールバック形式 | 辞書形式 | リスト形式 | オプション構造が異なる |

#### 1.4 バッファ・ウィンドウ API

| 機能 | Vim | Neovim | 備考 |
|------|-----|--------|------|
| バッファ番号 | `bufnr()` | `bufnr()` / `nvim_get_current_buf()` | Neovim は API 版もあり |
| 行設定 | `setline()` | `setline()` / `nvim_buf_set_lines()` | Neovim は API 版もあり |
| カーソル位置 | `getpos('.')` | `getpos('.')` / `nvim_win_get_cursor()` | 戻り値形式が異なる |

### 2. VimScript レベルの差異

#### 2.1 ラムダ構文

```vim
" Neovim: 常に動作
let F = {-> 'hello'}
call timer_start(100, {t -> DoSomething()})

" Vim: +lambda がないとエラー (E110: Missing ')')
" 対策: function() を使用
call timer_start(100, function('s:callback'))
```

#### 2.2 文字列関数

| 関数 | 用途 | Vim/Neovim 共通 | 備考 |
|------|------|----------------|------|
| `strlen()` | バイト長 | Yes | マルチバイト非対応 |
| `strchars()` | 文字数 | Yes | マルチバイト対応 |
| `strdisplaywidth()` | 表示幅 | Yes | 全角文字対応 |
| `byteidx()` | 文字→バイト位置 | Yes | |
| `charidx()` | バイト→文字位置 | Yes | |

**推奨**: マルチバイト文字を扱う場合は `strchars()` を使用。

#### 2.3 型定数

```vim
" 推奨: 明示的な型定数を使用
if type(l:value) == v:t_string
if type(l:value) == v:t_dict
if type(l:value) == v:t_list

" 非推奨: 数値リテラル（可読性が低い）
if type(l:value) == 1  " string
if type(l:value) == 4  " dict
```

### 3. Denops 固有の注意点

#### 3.1 denops.call() の戻り値

Vim と Neovim で戻り値の型が異なる場合がある。必ず型アサーションを行う。

```typescript
// 型アサーションを明示
const isNeovim = (await denops.call("has", "nvim") as number) ? true : false;
const bufnr = await denops.call("bufnr", "%") as number;
const lines = await denops.call("getline", 1, "$") as string[];
```

#### 3.2 環境判定

```typescript
// Denops での環境判定
const hasNvim = await denops.eval("has('nvim')") as number;
if (hasNvim) {
  // Neovim 専用処理
} else {
  // Vim 専用処理
}
```

#### 3.3 API 呼び出しの分岐

```typescript
// Neovim 専用 API は has('nvim') で分岐
if (await denops.eval("has('nvim')") as number) {
  await denops.call("nvim_buf_set_extmark", bufnr, nsId, line, col, opts);
} else {
  await denops.call("popup_create", text, popupOpts);
}
```

### 4. このプロジェクトで遭遇した具体的な問題

以下は、このプロジェクトで実際に遭遇し、解決した問題です。

---

### 知見メモ: Vim と Neovim の timer 呼び出し差異
- **背景**: 方向限定ヒント導入時、Visual モードで `timer_start()` にラムダ (`{-> ...}`) を渡して `hellshake_yano_vim#motion#handle_visual_internal()` を非同期実行していたところ、Vim で `E110: Missing ')'` が発生。Neovim では正常に動作。
- **Neovim が動作した理由**: Neovim はデフォルトで `+lambda` をサポートし、Timer API でもラムダクロージャを安全に扱える。また、`denops` 経由の方向キー情報はグローバル状態に保持されており、タイマー呼び出しで渡した引数が不要でも破綻しなかった。
- **Vim での問題点**:
  - Vim の多くのビルドは `+lambda` を無効にコンパイルしており、`{-> ...}` 構文が `E110` になる。
  - `timer_start()` は常に最初の引数にタイマー ID を渡すため、ラムダを使わずに `function('name', [arg])` を指定した場合でも、呼び出し側 (`hellshake_yano_vim#motion#handle_visual_internal`) にはタイマー ID が **第1引数** として届く。結果としてモーションキーの代わりに `1`, `2`, ... が渡り、`invalid motion key: 1` などのログが大量発生しヒント表示がブロックされた。
- **最終対処**:
  - Visual モードのマッピングでラムダを排除し、`hellshake_yano_vim#motion#visual_schedule()` から同期的に `handle_visual_internal()` を呼ぶ形に戻す。
  - ヒント表示用タイマー (`hellshake_yano_vim#core#show_with_motion_timer`) はキー引数を受け取らず、直前に保持している `directional_last_motion_key` を使用するよう変更。
- **教訓**: Vim 互換コードでは `+lambda` 依存を避け、Timer API には「タイマー ID が自動で第1引数に挿入される」ことを前提にコールバックの引数を設計する。

### 知見メモ: Neovim nvim_buf_set_extmark API の id オプション仕様
- **背景**: マルチバッファ/マルチウィンドウ機能で extmark を設定する際、`id: 0` を指定して「Neovim に ID を自動割り当てさせる」意図でコードを書いたところ、`E5555: Invalid 'id': expected positive Integer` エラーが発生。
- **問題の原因**: `nvim_buf_set_extmark()` の `id` オプションに `0` を渡すと、「ID 0 の extmark を操作する」と解釈される。コメントに "Let Neovim assign ID" と書いても、API の挙動は変わらない。
- **正しい方法**:
  - ID の自動割り当てを希望する場合は、`id` オプション自体を省略する
  - 明示的に ID を指定する場合は、1 以上の正の整数を使用する
- **コード例**:
  ```typescript
  // NG - E5555 エラーが発生
  await denops.call("nvim_buf_set_extmark", buffer, nsId, row, col, {
    id: 0,  // これは無効
    virt_text: [[label, hlGroup]],
  });

  // OK - id オプションを省略
  await denops.call("nvim_buf_set_extmark", buffer, nsId, row, col, {
    virt_text: [[label, hlGroup]],
  });

  // OK - 明示的に正の整数を指定
  await denops.call("nvim_buf_set_extmark", buffer, nsId, row, col, {
    id: 1,  // 1 以上の正の整数
    virt_text: [[label, hlGroup]],
  });
  ```
- **影響範囲**: エラーが発生してもキャッチされて処理が続行されると、連鎖的な問題（意図しないジャンプ等）を引き起こす可能性がある。
- **関連ファイル**: `denops/hellshake-yano/neovim/display/extmark-display.ts`
- **教訓**: Neovim API のオプションは「省略」と「0 を指定」で挙動が異なる場合がある。ドキュメントを確認し、「自動割り当て」を期待する場合はオプション自体を省略する。

### 知見メモ: Neovim nvim_buf_set_extmark の col パラメータはバイト位置
- **背景**: マルチバイト文字（日本語等）やタブ文字を含む行で `nvim_buf_set_extmark()` を呼び出すと `E5555: Invalid 'col': out of range` エラーが発生。
- **問題の原因**: `nvim_buf_set_extmark()` の `col` パラメータはバイト位置（byte index, 0-indexed）を期待するが、表示列（display column）を渡していた。
  - タブ文字: 1 バイトだが表示幅は複数（例: 8）
  - マルチバイト文字: 複数バイトだが表示幅は 1-2
  - 例: 「日本語」の「語」は表示位置 5 だが、バイト位置は 7（各文字 3 バイト）
- **正しい方法**:
  - `HintMapping.hintByteCol` または `Word.byteCol` を使用する（既に計算済み）
  - 表示列（`col`）ではなくバイト位置を渡す
  - エラーハンドリングを追加して範囲外の場合はスキップ
- **コード例**:
  ```typescript
  // NG - 表示列を使用（E5555 エラーの可能性）
  const p = calculateHintPosition(h.word, { hintPosition: "offset" });
  await denops.call("nvim_buf_set_extmark", bufnr, nsId, p.line - 1, p.col - 1, { ... });

  // OK - バイト位置を使用
  const line = h.word.line - 1;
  const col = (h.hintByteCol !== undefined && h.hintByteCol > 0)
    ? h.hintByteCol - 1
    : (h.word.byteCol !== undefined && h.word.byteCol > 0)
      ? h.word.byteCol - 1
      : h.word.col - 1;  // フォールバック

  try {
    await denops.call("nvim_buf_set_extmark", bufnr, nsId, line, col, { ... });
  } catch (error) {
    console.warn(`Skipping extmark: col out of range`);
  }
  ```
- **注意**: Vim の `matchadd()` は表示列を使用するため、Vim 用コードでは `p.col` をそのまま使用して良い。
- **関連ファイル**: `denops/hellshake-yano/neovim/display/extmark-display.ts`
- **教訓**: Neovim API と Vim API で列の扱いが異なる。Neovim はバイト位置、Vim は表示列を使うことが多い。マルチバイト文字対応時は常にこの違いを意識する。

### 知見メモ: popup_create() と nvim_buf_set_extmark() の width 指定

- **背景**: ヒント表示の幅指定で `strlen()` を使用していたところ、マルチバイト文字で表示崩れが発生。
- **問題の原因**: `strlen()` はバイト長を返すため、マルチバイト文字では実際の表示幅と異なる。
- **正しい方法**:
  - Vim `popup_create()` の `width`: `strchars()` を使用（文字数）
  - Neovim `nvim_buf_set_extmark()`: width 指定は不要（virt_text が自動調整）
- **コード例**:
  ```vim
  " Vim: strchars() で文字数を取得
  let l:popup_id = popup_create(a:hint, {
    \ 'width': strchars(a:hint),
    \ })
  ```
- **教訓**: 表示幅が必要な場合は `strdisplaywidth()`、文字数が必要な場合は `strchars()` を使用する。`strlen()` はバイト処理専用。

### 知見メモ: Neovim nvim_buf_clear_namespace() のバッファ指定

- **背景**: マルチウィンドウ機能で複数バッファにextmarkを設定後、`nvim_buf_clear_namespace(0, ...)` で全クリアしようとしたところ、カレントバッファ以外のextmarkが残存。
- **問題の原因**: `nvim_buf_clear_namespace()` の第1引数 `0` は「カレントバッファ」を意味し、「全バッファ」ではない。
- **正しい方法**:
  - 各バッファのextmarkを個別にクリアする
  - extmark作成時にバッファ番号を保存しておく
- **コード例**:
  ```vim
  " NG - カレントバッファのみクリア
  call nvim_buf_clear_namespace(0, s:ns_id, 0, -1)

  " OK - 保存したバッファ番号を使用して個別クリア
  for l:popup_info in s:popup_ids
    let l:bufnr = get(l:popup_info, 'bufnr', 0)
    if l:bufnr > 0 && bufexists(l:bufnr)
      call nvim_buf_clear_namespace(l:bufnr, s:ns_id, 0, -1)
    endif
  endfor
  ```
- **教訓**: Neovim API の `0` は「カレント」を意味することが多い。複数バッファを扱う場合は明示的にバッファ番号を指定する。

### 知見メモ: Vim/Neovim 判定のベストプラクティス

- **推奨方法**: `has('nvim')` を使用
- **注意点**: この関数は Vim では常に `0` を返し、Neovim では `1` を返す
- **コード例**:
  ```vim
  " VimScript
  if has('nvim')
    " Neovim 専用処理
  else
    " Vim 専用処理
  endif
  ```
  ```typescript
  // Denops (TypeScript)
  const isNeovim = await denops.call("has", "nvim") as number;
  if (isNeovim) {
    // Neovim 専用処理
  }
  ```
- **避けるべき方法**: `exists('*nvim_create_namespace')` など特定関数の存在確認（将来的に Vim に追加される可能性）

### 知見メモ: try-catch の重要性（Vim/Neovim 両対応）

- **背景**: バッファやウィンドウが予期せず削除された場合、API 呼び出しでエラーが発生
- **対策**: すべての Vim/Neovim API 呼び出しを try-catch で囲む
- **コード例**:
  ```vim
  " VimScript
  try
    call nvim_buf_del_extmark(l:bufnr, s:ns_id, l:extmark_id)
  catch
    " extmark が既に削除されている場合はスキップ
  endtry
  ```
  ```typescript
  // Denops (TypeScript)
  try {
    await denops.call("nvim_buf_set_extmark", bufnr, nsId, line, col, opts);
  } catch (error) {
    console.warn(`Skipping extmark: ${error}`);
  }
  ```
- **教訓**: エラーが発生しても処理を継続できるよう、適切なエラーハンドリングを実装する。特にクリーンアップ処理では重要。

### 知見メモ: TypeScript プロパティ名の命名規則不一致によるキャッシュ無効化バグ
- **背景**: `createCacheKey()` 関数で `config.japanese_min_word_length` と `config.japanese_merge_threshold` を参照していたが、`Config` インターフェースは camelCase（`japaneseMinWordLength`, `japaneseMergeThreshold`）で定義されていた
- **症状**: 2回目以降のヒント表示で設定が無視され、ヒント幅が極端に狭くなる
- **原因**: snake_case プロパティは `Config` 型に存在しないため常に `undefined` を返し、フォールバック値が使われる。結果としてキャッシュキーが設定変更を反映せず、古いキャッシュが再利用された
- **修正**:
  1. `EnhancedWordConfig` 型に camelCase プロパティを追加
  2. `createCacheKey()` で camelCase を使用
- **教訓**: TypeScript では型定義と実装コードの命名規則を一致させること。特にキャッシュキー生成など、値の同一性が重要な箇所では注意が必要

### 知見メモ: マルチウィンドウ実装パターン
- **背景**: 分割ウィンドウ間でのヒントジャンプ機能を実装（Process 1-6）
- **実装パターン**:
  1. **ウィンドウ検出**: `getwininfo()` で全ウィンドウ情報を取得し、`tabpagenr()` で同一タブ内をフィルタ
  2. **座標変換**: `screenpos(winid, lnum, col)` でウィンドウIDを指定して別ウィンドウの座標も変換可能
  3. **ウィンドウ間ジャンプ**: `win_gotoid(winid)` でウィンドウ移動後に `cursor()` でカーソル移動
- **コード例**:
  ```vim
  " ウィンドウ検出
  let l:all_windows = getwininfo()
  let l:current_tabnr = tabpagenr()
  for l:wininfo in l:all_windows
    if l:wininfo.tabnr == l:current_tabnr
      " 同一タブ内のウィンドウを処理
    endif
  endfor

  " 別ウィンドウの座標変換
  let l:screen = screenpos(a:winid, a:lnum, a:col)

  " ウィンドウ間ジャンプ
  let l:prev_winid = win_getid()
  if win_gotoid(a:winid)
    call cursor(a:lnum, a:col)
  else
    " ウィンドウが存在しない場合のエラー処理
  endif
  ```
- **教訓**: マルチウィンドウ機能は `winid` を一貫して使用することで、ウィンドウの特定と操作が確実になる

### 知見メモ: 共通ユーティリティ関数の集約パターン
- **背景**: Process 101 リファクタリングで、複数モジュールに散在していた共通パターンを `util.vim` に集約
- **集約した関数**:
  - `hellshake_yano_vim#util#is_valid_buffer(bufnr)`: バッファ有効性チェック（`bufexists()` + `bufloaded()`）
  - `hellshake_yano_vim#util#is_valid_window(winid)`: ウィンドウ有効性チェック（`win_id2win()` > 0）
  - `hellshake_yano_vim#util#show_error(msg)`: エラーメッセージ表示（ErrorMsg ハイライト）
  - `hellshake_yano_vim#util#show_warning(msg)`: 警告メッセージ表示（WarningMsg ハイライト）
  - `hellshake_yano_vim#util#debug_log(msg)`: デバッグログ出力
  - `hellshake_yano_vim#util#clamp(value, min, max)`: 値のクランプ
  - `hellshake_yano_vim#util#safe_strchars(str)`: 安全な文字数カウント
- **効果**:
  - 重複コード削減
  - エラーハンドリングの一貫性向上
  - テスト容易性の向上
- **コード例**:
  ```vim
  " バッファ/ウィンドウの有効性チェック（統一パターン）
  if !hellshake_yano_vim#util#is_valid_buffer(l:bufnr)
    return
  endif

  if !hellshake_yano_vim#util#is_valid_window(l:winid)
    call hellshake_yano_vim#util#show_error('Invalid window')
    return
  endif
  ```
- **教訓**: 複数モジュールで同じパターンが3回以上出現したら、共通モジュールへの集約を検討する

### 知見メモ: multiWindowMode はウィンドウ数もチェックすべき
- **背景**: `multiWindowMode` 設定が `true` のとき、ウィンドウが1つしかない場合でもマルチウィンドウ処理が実行され、画面描画が乱れる現象が発生。Vim/Neovim 両方で再現。
- **問題の原因**: `core.vim` の `show()` 関数で `multiWindowMode` フラグのみをチェックし、実際のウィンドウ数を確認していなかった。
  - シングルウィンドウでも `detect_multi_window()` が呼ばれる
  - 各単語に `winid`/`bufnr` が付与される
  - `show_hint_with_window()` → `screenpos(winid, ...)` のパスが実行される
  - Vim/Neovim で異なる座標計算が行われ、表示が乱れる
- **正しい方法**:
  - `multiWindowMode = true` の場合でも、`len(windows) == 1` ならシングルウィンドウ処理に切り替える
  - `l:multi_window_mode = v:false` を設定して後続処理もシングルモードにする
- **コード例**:
  ```vim
  if l:multi_window_mode
    let l:windows = hellshake_yano_vim#window_detector#get_visible()
    if empty(l:windows)
      return
    endif
    " ウィンドウが1つの場合はシングルウィンドウ処理に切り替え
    if len(l:windows) == 1
      let l:detected_words = hellshake_yano_vim#word_detector#detect_visible()
      let l:multi_window_mode = v:false
    else
      let l:detected_words = hellshake_yano_vim#word_detector#detect_multi_window(l:windows)
    endif
  endif
  ```
- **Vim/Neovim 両対応の重要性**: 本プラグインは Vim/Neovim 両対応が必須。修正時は必ず両環境でテストすること。
- **教訓**: 設定フラグだけでなく、実際の状態（ウィンドウ数など）も確認して処理を分岐すべき。「モードが有効」と「機能が必要」は別の概念
