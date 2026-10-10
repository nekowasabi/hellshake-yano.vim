# denops 削除: 機能互換性表

`denops/hellshake-yano/`（TypeScript）の機能ごとに、`autoload/hellshake_yano_vim/`（pure Vim script）側の対応ファイルを示す。
`autoload/hellshake_yano/`（`_vim` なし）は denops と `hellshake_yano_vim` を振り分けるブリッジ層で、備考でのみ触れる。

- status は全行 `todo`（S1 時点）。
- テストファイル（`*_test.ts`、`*.test.ts`、`__tests__/`）は対象外。
- 備考で「未検証」としたものは、コードを読んだだけで動作を確かめていない。

## plugin/ の入口

| file | 役割 |
|---|---|
| `plugin/hellshake-yano.vim` | denops 版の入口。`s:check_denops()` で denops を初期化する |
| `plugin/hellshake-yano-vim.vim` | pure Vim script 版の入口。Neovim では `finish` し、denops 版に任せる |
| `plugin/hellshake-yano-unified.vim` | denops が動いていれば `denops-unified`、なければ `vimscript-pure` を選ぶ |

## 互換性表

| feature | denops file | vim script file | status | notes |
|---|---|---|---|---|
| デフォルト設定・設定マージ/クローン | `denops/hellshake-yano/common/types/config.ts`, `denops/hellshake-yano/common/config.ts`, `denops/hellshake-yano/config.ts` | `autoload/hellshake_yano_vim/config.vim` | todo | partial: `s:default_config` は snake_case の少数キーだけ。`mergeConfig`/`cloneConfig`/`getPerKeyValue`/`createMinimalConfig` に当たる処理はない |
| 設定の取得・更新（getConfig/updateConfig） | `denops/hellshake-yano/main.ts`, `denops/hellshake-yano/neovim/core/core.ts` | `autoload/hellshake_yano_vim/config.vim` | todo | partial: `config#get/set/reload`。`reload` は denops の `getConfig` 頼み。word_detector/hint_generator/display/motion は `g:hellshake_yano` の camelCase キーを直接読む |
| 設定キー変換（snake_case↔camelCase） | `denops/hellshake-yano/vim/config/config-mapper.ts` | `autoload/hellshake_yano_vim/config.vim` | todo | partial: `s:map_key_to_ts`/`s:map_config_from_ts` は11キーだけ。`hint_chars`↔`markers` を文字列⇔配列で変換する |
| 旧設定の移行・統合（migration/unifier） | `denops/hellshake-yano/vim/config/config-migrator.ts`, `denops/hellshake-yano/vim/config/config-unifier.ts` | missing | todo | `ConfigMigrator.migrate`/`backupOldConfig`/`showMigrationGuide`、`ConfigUnifier.unify` に当たる処理はない。`Initializer` から呼ばれる |
| 設定バリデーション（validateConfig） | `denops/hellshake-yano/config.ts`, `denops/hellshake-yano/common/utils/validator.ts`, `denops/hellshake-yano/main.ts` | missing | todo | `validateConfig`/`validateUnifiedConfig`/`validateConfigObject` 相当はない。ブリッジ側に `hellshake_yano#validation#*` がある |
| ハイライト設定の検証（色名・HEX・グループ名） | `denops/hellshake-yano/common/utils/validator.ts`, `denops/hellshake-yano/neovim/core/core.ts` | missing | todo | `validateHighlightColor`/`isValidHexColor`/`validateHighlightGroupName` 相当はない。ブリッジに `hellshake_yano#validation#color_value` がある |
| プラグインの有効化/無効化/トグル | `denops/hellshake-yano/main.ts`, `denops/hellshake-yano/neovim/core/core.ts` | missing | todo | dispatcher は `enable`/`disable`/`toggle`。Vim 側は `core#init` が denops に `enable` を notify するだけ。ブリッジに `hellshake_yano#plugin#enable/disable/toggle` がある |
| 単語検出（正規表現） | `denops/hellshake-yano/neovim/core/word/word-detector-strategies.ts`, `denops/hellshake-yano/neovim/core/word.ts` | `autoload/hellshake_yano_vim/word_detector.vim` | todo | partial: `s:detect_english_words` は `matchstrpos` と `\w\+` で検出する。`RegexWordDetector` の `excludeNumbers` 処理はない。`exclude_numbers` は config.vim で定義されているが他ファイルで未使用 |
| 日本語分割（TinySegmenter） | `denops/hellshake-yano/neovim/core/word/word-segmenter.ts`, `denops/hellshake-yano/vim/features/japanese.ts`, `denops/hellshake-yano/main.ts` | `autoload/hellshake_yano_vim/japanese.vim` | todo | partial: `japanese#segment` は denops の `segmentJapaneseText` を優先する。代替の `s:fallback_segment` は文字種で区切るだけ |
| 助詞結合（japaneseMergeParticles/Threshold） | `denops/hellshake-yano/neovim/core/word/word-segmenter.ts`, `denops/hellshake-yano/neovim/core/word.ts` | missing | todo | `segment(t, {mergeParticles})` の particles 結合はローカルにない。denops に渡す options の中身は未検証 |
| 文字種判定ユーティリティ | `denops/hellshake-yano/neovim/core/word/word-char-utils.ts` | `autoload/hellshake_yano_vim/japanese.vim` | todo | partial: `s:get_character_type`/`s:is_japanese_char`/`has_japanese` はある。`findBoundaries`/`shouldMerge`/`analyzeString` はない |
| ハイブリッド検出戦略（wordDetectionStrategy） | `denops/hellshake-yano/neovim/core/word/word-detector-strategies.ts`, `denops/hellshake-yano/neovim/core/word.ts` | `autoload/hellshake_yano_vim/word_detector.vim` | todo | partial: `has_japanese` で行ごとに英語/日本語を切り替えるだけ。`wordDetectionStrategy`/`enableTinySegmenter`/`segmenterThreshold` は未対応 |
| 表示範囲の単語検出（detectWordsVisible） | `denops/hellshake-yano/main.ts`, `denops/hellshake-yano/neovim/core/core.ts`, `denops/hellshake-yano/vim/bridge/vim-bridge.ts` | `autoload/hellshake_yano_vim/word_detector.vim` | todo | `detect_visible` は denops を優先し、なければ `s:detect_visible_local`（`w0`〜`w$`）を使う。`VimBridge.detectWords` に対応する |
| キー別の最小単語長（perKeyMinLength） | `denops/hellshake-yano/main.ts`, `denops/hellshake-yano/neovim/core/core.ts`, `denops/hellshake-yano/common/utils/config.ts` | `autoload/hellshake_yano_vim/word_detector.vim` | todo | `get_min_length`/`s:get_min_length_local` は `perKeyMinLength`→`defaultMinWordLength` の順に見る。core.vim は `get_min_length('')` で呼んでいる |
| 最小単語長フィルタと辞書語の除外 | `denops/hellshake-yano/neovim/core/word/word-detector-base.ts`, `denops/hellshake-yano/neovim/core/word.ts` | `autoload/hellshake_yano_vim/word_filter.vim` | todo | `word_filter#apply` は `dictionary#is_in_dictionary` に当たった語の長さ判定を飛ばす。`japaneseMinWordLength` は word_detector.vim で参照している |
| バイト/文字インデックス変換 | `denops/hellshake-yano/neovim/core/word.ts`, `denops/hellshake-yano/main.ts` | `autoload/hellshake_yano_vim/util.vim` | todo | partial: `safe_strchars` だけ。`charIndexToByteIndex`/`getByteLength` 相当はない。`toVimWordData` が byteCol→col に変換する |
| 表示幅計算（CJK/絵文字） | `denops/hellshake-yano/neovim/core/hint.ts`, `denops/hellshake-yano/neovim/core/core.ts` | missing | todo | `getDisplayWidth`/`getDisplayWidthCached`/`hasWideCharacters` 相当はない。core/display/motion/hint_generator を grep したが `strdisplaywidth`/`virtcol` はなかった |
| ヒントパターン処理（captureGroup） | `denops/hellshake-yano/neovim/core/word.ts`, `denops/hellshake-yano/neovim/core/core.ts` | missing | todo | `HintPatternProcessor`/`HintPattern` に当たる処理はない |
| 複数ウィンドウの単語検出 | `denops/hellshake-yano/neovim/core/word.ts`, `denops/hellshake-yano/neovim/core/window.ts`, `denops/hellshake-yano/main.ts` | `autoload/hellshake_yano_vim/word_detector.vim`, `autoload/hellshake_yano_vim/window_detector.vim` | todo | `detect_multi_window`/`s:detect_multi_window_local` と `window_detector#get_visible`（`multiWindowExcludeTypes`/`MaxWindows`）がある |
| 複数ウィンドウモードの切替 | `denops/hellshake-yano/neovim/core/core.ts`, `denops/hellshake-yano/main.ts` | `autoload/hellshake_yano_vim/core.vim` | todo | partial: `multiWindowMode` 設定を参照するだけ。`toggleMultiWindowMode`/`enableMultiWindowMode`/`updateMultiWindowConfig` はない |
| 1文字/複数文字ヒント生成 | `denops/hellshake-yano/neovim/core/hint.ts`, `denops/hellshake-yano/neovim/core/hint/hint-generator-strategies.ts` | `autoload/hellshake_yano_vim/hint_generator.vim` | todo | partial: `generate`/`s:generate_local` は `singleCharKeys`/`multiCharKeys` を使う。`maxSingleCharHints` は未対応 |
| 数字の複数文字ヒント | `denops/hellshake-yano/neovim/core/hint/hint-generator-strategies.ts`, `denops/hellshake-yano/neovim/core/hint.ts` | `autoload/hellshake_yano_vim/hint_generator.vim` | todo | `s:generate_numeric_hints` は `useNumericMultiCharHints` が有効なときに使われ、上限は+100。`NumericHintStrategy`/`isNumericOnlyKeys` に対応する |
| ヒントキー設定の検証 | `denops/hellshake-yano/neovim/core/hint.ts` | missing | todo | `validateHintKeyConfig` 相当はない |
| ヒント割当と優先順位付け | `denops/hellshake-yano/neovim/core/hint.ts` | `autoload/hellshake_yano_vim/core.vim` | todo | partial: `core#show` は検出順に割り当て、`sort(` はない。`assignHintsToWords`/`prioritizeHints` 相当はない |
| ヒント位置（hintPosition/bothMinWordLength） | `denops/hellshake-yano/neovim/core/hint.ts`, `denops/hellshake-yano/neovim/display/extmark-display.ts` | missing | todo | `calculateHintPosition`（start/end/overlay/before/after）と `bothMinWordLength` は未対応 |
| 隣接語・重なり・記号語のスキップ | `denops/hellshake-yano/neovim/core/hint.ts` | missing | todo | `detectAdjacentWords`/`shouldSkipHintForOverlap`/`isSymbolWord` 相当はない。grep で adjacent/overlap は出なかった |
| 方向別ヒントフィルタ | `denops/hellshake-yano/neovim/core/hint.ts`, `denops/hellshake-yano/neovim/core/core.ts` | `autoload/hellshake_yano_vim/filter.vim`, `autoload/hellshake_yano_vim/core.vim` | todo | `filter#by_direction` と `s:consume_directional_context`（`directionalHintFilter`）がある。`filterWordsByDirection` に対応する |
| ヒントグループ（useHintGroups） | `denops/hellshake-yano/neovim/core/core.ts` | missing | todo | `waitForUserInput` 内の `useHintGroups` 分岐に当たる処理はない |
| ヒントキャッシュ | `denops/hellshake-yano/neovim/core/hint.ts` | `autoload/hellshake_yano_vim/hint_generator.vim` | todo | `s:hint_cache`（件数がキー、`s:cache_max_size`）と `clear_cache` がある。`getHintCacheStats` 相当はない |
| extmark 表示（Neovim） | `denops/hellshake-yano/neovim/display/extmark-display.ts`, `denops/hellshake-yano/neovim/display/extmark-display-adapter.ts` | `autoload/hellshake_yano_vim/display.vim` | todo | `s:show_hint_neovim` が `nvim_buf_set_extmark` を使う。`ExtmarkDisplayAdapter` に対応する |
| popup 表示（Vim） | `denops/hellshake-yano/vim/display/popup-display.ts`, `denops/hellshake-yano/main.ts` | `autoload/hellshake_yano_vim/display.vim` | todo | `show_hint`/`s:show_hint_vim`（popup_create）、`hide_all`、`get_popup_count` がある。dispatcher は `displayShowHint`/`displayHideAll`/`displayGetPopupCount` |
| 非同期/バッチ描画・中断 | `denops/hellshake-yano/neovim/display/extmark-display.ts`, `denops/hellshake-yano/neovim/core/core.ts` | missing | todo | `displayHintsAsync`/`abortCurrentRendering`/`displayHintsWithExtmarksBatch`/`displayHintsWithMatchAddBatch` 相当はない |
| 複数バッファの extmark 管理 | `denops/hellshake-yano/neovim/display/extmark-display.ts` | `autoload/hellshake_yano_vim/display.vim` | todo | partial: `show_hint_with_window` だけ。`displayHintsMultiBuffer`/`clearHintsForBuffers` 相当はない |
| ハイライトグループと色 | `denops/hellshake-yano/neovim/display/highlight.ts`, `denops/hellshake-yano/vim/display/highlight.ts`, `denops/hellshake-yano/main.ts` | `autoload/hellshake_yano_vim/display.vim` | todo | partial: `get_highlight_group`/`s:define_highlight_group` は `highlightHintMarker(Current)` だけ扱う。`highlightSelected` は未対応。ブリッジに `hellshake_yano#highlight#*` がある |
| 部分一致ハイライト | `denops/hellshake-yano/neovim/display/extmark-display.ts`, `denops/hellshake-yano/main.ts` | `autoload/hellshake_yano_vim/display.vim` | todo | `highlight_partial_matches` がある。dispatcher は `highlightCandidateHints`/`displayHighlightPartialMatches`、TS 側は `highlightCandidateHintsHybrid` |
| 遅延再描画とフォーカス復帰 | `denops/hellshake-yano/main.ts` | `autoload/hellshake_yano_vim/core.vim` | todo | `show_delayed`/`get_fixed_positions`/`should_redraw`/`on_focus_gained` がある。dispatcher は `showDelayed`/`getFixedPositions`/`shouldRedraw` |
| ヒント表示/非表示の入口 | `denops/hellshake-yano/main.ts`, `denops/hellshake-yano/neovim/core/core.ts` | `autoload/hellshake_yano_vim/core.vim` | todo | partial: `core#show`/`hide`/`show_with_motion` がある。`debounceDelay` は未対応。dispatcher は `showHints`/`showHintsWithKey`/`hideHints`/`showHintsInternal` |
| 複数ウィンドウでのヒント表示とジャンプ | `denops/hellshake-yano/neovim/core/core.ts`, `denops/hellshake-yano/main.ts` | `autoload/hellshake_yano_vim/core.vim`, `autoload/hellshake_yano_vim/jump.vim` | todo | core.vim の `multiWindowMode` 分岐と `jump#to_window` がある。`showHintsMultiWindow`/`waitForUserInputMultiWindow` に対応する |
| ヒント入力待ちとジャンプ | `denops/hellshake-yano/neovim/core/core.ts`, `denops/hellshake-yano/main.ts` | `autoload/hellshake_yano_vim/input.vim`, `autoload/hellshake_yano_vim/jump.vim` | todo | `input#wait_for_input`/`get_partial_matches` と `jump#to` がある。`waitForUserInput`/`jumpToHintTarget`/`getPartialMatches` に対応する |
| キャンセルキー（cancelKeys） | `denops/hellshake-yano/neovim/core/core.ts` | `autoload/hellshake_yano_vim/input.vim` | todo | partial: 一致しない入力が来ると break するだけ。`isConfiguredCancelKey`/`cancelKeys` は未対応 |
| 連続ヒントモードと recenter | `denops/hellshake-yano/neovim/core/core.ts` | missing | todo | `postJumpHandler`/`continuousHintMode`/`maxContinuousJumps`/`executeRecenterCommand`（`recenterCommand`）相当はない |
| 複数文字入力の解析と制御文字判定 | `denops/hellshake-yano/neovim/core/core.ts` | missing | todo | `createMultiCharInputManager`/`analyzeInputCharacter`/`isControlCharacter` 相当はない。input.vim は `getchar`+`nr2char` だけ |
| モーション回数の閾値とタイムアウト | `denops/hellshake-yano/vim/features/motion.ts`, `denops/hellshake-yano/main.ts`, `denops/hellshake-yano/neovim/core/core.ts` | `autoload/hellshake_yano_vim/motion.vim` | todo | `init`/`set_threshold`/`set_timeout`/`get_state`/`handle_with_count` がある。`set_threshold` が `{'threshold'}` を送る点は未検証 |
| キー別のモーション回数（perKeyMotionCount） | `denops/hellshake-yano/vim/features/motion.ts`, `denops/hellshake-yano/neovim/core/core.ts` | `autoload/hellshake_yano_vim/motion.vim` | todo | `get_motion_count` は `perKeyMotionCount`/`defaultMotionCount` を参照する。`setPerKeyMotionCount`/`getMotionCountForKey` に対応する |
| キーリピート時の抑制 | `denops/hellshake-yano/vim/features/motion.ts`, `denops/hellshake-yano/main.ts` | `autoload/hellshake_yano_vim/motion.vim`, `autoload/hellshake_yano_vim/key_repeat.vim` | todo | `s:handle_key_repeat_detection` と `key_repeat#*` は `suppressOnKeyRepeat`/`keyRepeatThreshold`/`keyRepeatResetDelay` を使う |
| ビジュアルモードのヒント | `denops/hellshake-yano/vim/features/visual.ts`, `denops/hellshake-yano/main.ts` | `autoload/hellshake_yano_vim/visual.vim`, `autoload/hellshake_yano_vim/motion.vim` | todo | `visual#init/get_state/show`/`s:detect_words_in_range_local` と `handle_visual_expr` がある。dispatcher は `getVisualRange`/`detectWordsInVisualRange` |
| マッピング管理 | `denops/hellshake-yano/integration/mapping-manager.ts` | missing | todo | `MappingManager` 相当はない。ブリッジに `hellshake_yano#mapping#setup_motion_mappings` がある |
| 辞書の再読込/追加/表示/検証/照会 | `denops/hellshake-yano/neovim/dictionary.ts`, `denops/hellshake-yano/neovim/core/word.ts`, `denops/hellshake-yano/main.ts` | `autoload/hellshake_yano_vim/dictionary.vim` | todo | partial: `DictionaryLoader` がなく、`denops#request` に任せるだけ。denops がなければ `v:false` を返す |
| 辞書の編集（editDictionary） | `denops/hellshake-yano/neovim/dictionary.ts`, `denops/hellshake-yano/main.ts` | missing | todo | dictionary.vim に edit 関数はない。plugin/ の `HYVimDictEdit` は `s:dict_edit`（案内メッセージだけ） |
| 統合キャッシュ（LRU/CacheType） | `denops/hellshake-yano/common/cache/unified-cache.ts`, `denops/hellshake-yano/cache.ts` | missing | todo | `UnifiedCache`/`LRUCache` 相当はない。各モジュールが `s:` の dict を個別に持っている |
| 単語キャッシュとバッファ無効化 | `denops/hellshake-yano/neovim/core/word/word-cache.ts`, `denops/hellshake-yano/main.ts` | `autoload/hellshake_yano_vim/word_detector.vim` | todo | partial: `s:word_cache` は `bufnr:w0:w$` をキーに TTL 付きで持ち、`clear_cache` がある。`changedtick` と `invalidateBufferCache` はない |
| getline キャッシュ | `denops/hellshake-yano/neovim/core/core.ts` | missing | todo | `resolveGetlineScope`/`VIEWPORT_GETLINE_THRESHOLD` 相当はない |
| 環境検出・実装選択・初期化 | `denops/hellshake-yano/integration/environment-detector.ts`, `denops/hellshake-yano/integration/implementation-selector.ts`, `denops/hellshake-yano/integration/initializer.ts`, `denops/hellshake-yano/main.ts` | missing | todo | Vim 側にあるのは `core#is_denops_ready` と各モジュールの `has_denops` だけ。`legacyMode` 判定はない |
| コマンド登録 | `denops/hellshake-yano/integration/command-registry.ts` | missing | todo | 登録先の `showWordHints`/`showJpWordHints` は main.ts の dispatcher にない。`hellshake_yano_vim#show_hints()` も未定義。実際のコマンドは plugin/ にある |
| ヘルスチェック・統計・デバッグ情報 | `denops/hellshake-yano/main.ts`, `denops/hellshake-yano/neovim/core/core.ts` | missing | todo | `healthCheck`/`getStatistics`/`debug`/`getDebugInfo`/`getHealthStatus` 相当はない。ブリッジに `hellshake_yano#debug#*` がある |
| デバッグログ | `denops/hellshake-yano/common/utils/logger.ts` | `autoload/hellshake_yano_vim/util.vim` | todo | partial: `util#debug_log` は `g:hellshake_yano_debug` だけを見る。`debugLogFile` へのファイル出力はない |
| パフォーマンス計測 | `denops/hellshake-yano/common/utils/performance.ts`, `denops/hellshake-yano/main.ts` | missing | todo | `recordPerformance`/`collectDebugInfo` と dispatcher の `clearPerformanceLog`/`clearDebugInfo` 相当はない。`performanceLog` も未対応 |
| エラー処理とメッセージ表示 | `denops/hellshake-yano/common/utils/error-handler.ts` | `autoload/hellshake_yano_vim/util.vim` | todo | partial: `show_error`/`show_warning`/`show_info` だけ。`handleError` の結果オブジェクトはない |
| その他ユーティリティ（batch/side-effect/base） | `denops/hellshake-yano/common/utils/batch.ts`, `denops/hellshake-yano/common/utils/side-effect.ts`, `denops/hellshake-yano/common/utils/base.ts` | `autoload/hellshake_yano_vim/util.vim` | todo | partial: `clamp`/`is_valid_buffer`/`is_valid_window` だけ。`callAtomic`/`SideEffectChecker`/`withFallback` はない |
| 型定義・インターフェース | `denops/hellshake-yano/common/types/*.ts`, `denops/hellshake-yano/common/interfaces/*.ts`, `denops/hellshake-yano/types.ts` | missing | todo | 型定義だけで、実行時の挙動はない（DisplayAdapter/MotionDetector/VisualHandler など） |
| 再エクスポート | `denops/hellshake-yano/cache.ts`, `denops/hellshake-yano/validation-utils.ts` | missing | todo | どちらも1行の `export * from` だけで、実行時の挙動はない |

## Baseline

S1 時点（denops 削除前）に `scripts/test-vim.sh` と `scripts/test-nvim.sh` を実行した結果。両スクリプトとも exit 1。

| 実行環境 | version | PASS | FAIL | SKIP |
|---|---|---|---|---|
| Vim | `VIM - Vi IMproved 9.1 (2024 Jan 02, compiled Aug 24 2026 22:13:04)`, `Included patches: 1-16, 647, 678, 697` | 23 | 17 | 13 |
| Neovim | `NVIM v0.12.0-nightly+52cd9dc` | 22 | 18 | 13 |

### 実行条件

- 対象: `tests-vim/*.vim` と `tests-vim/hellshake_yano_vim/*.vim`。ライブラリの `test_runner.vim` は除く（計 53 ファイル）。
- 起動: vim は `-N -u NONE -i NONE -n -es`、nvim は `--headless -u NONE -i NONE -n`。共通で `--cmd "set rtp^=<repo>"`、`--cmd "set verbosefile=<log>"`、`-c 'source %'`、`-c 'qall!'`。タイムアウトはファイルごとに 60 秒。
- 対象ファイルをカレントバッファとして開く。多くのテストは `expand('<sfile>:p') ==# expand('%:p')` のときだけ走るため。
- `RunTests()` が定義されていれば呼ぶ（`test_single_window_optimization.vim` の実行手順どおり）。
- `-u NONE` のため `plugin/` は読み込まれない。denops も起動しないので、各テストは denops なしの経路だけを通る。
- 判定: exit≠0、タイムアウト、失敗パターン（`✗`、`FAIL:`、`[FAIL]`、`FAILED`、`Some tests failed`、`E\d+:` など）の出力、またはテスト出力なしは FAIL。ほとんどのテストは失敗しても exit 0 で終わるため、終了コードではなく出力で判定する。
- SKIP: `themis#suite` を使う 13 ファイル。この環境には vim-themis が入っていない（`command -v themis` は空）。大半は `SKIP: Denops not available` のガード付きで、denops 依存のテストなので denops 削除後に見直す。

### test_runner.vim 由来の失敗

`test_runner.vim` は、失敗を確かめるための自己テスト（`Test_AssertEqual_failure`、`Test_AssertTrue_failure`、`Test_AssertFalse_failure`）を無条件に定義している。`RunAllTests()` は `Test_` で始まる関数をすべて拾うので、runner を使うファイルにはどれも `✗` が 3 件混ざる。

次のファイルの `✗` はこの 3 件だけで、本体のテストは全件 PASS している。

- Vim と Neovim の両方: `test_core.vim`、`test_example.vim`、`test_filter.vim`、`test_focus_restore.vim`、`test_jump.vim`、`test_visual.vim`
- Vim のみ: `test_window_detector.vim`

これを除いた実質の FAIL は Vim 10、Neovim 12。S1 では runner もテストも変更していない。

### ファイル別結果

`hellshake_yano_vim/` は `tests-vim/hellshake_yano_vim/` を指す。失敗の原因はまだ調べていない（備考は出力の抜粋）。

| file | vim | nvim | 備考 |
|---|---|---|---|
| `display_test.vim` | PASS | PASS | |
| `hint_generator_test.vim` | PASS | PASS | |
| `japanese_test.vim` | PASS | PASS | |
| `motion_test.vim` | PASS | PASS | |
| `phase1_integration_test.vim` | SKIP | SKIP | themis |
| `test_core_hint_limit_safety.vim` | FAIL | FAIL | `E461: Illegal variable name: l:result` |
| `test_core_limit.vim` | PASS | PASS | アサーションなし、診断出力だけ |
| `test_display_multi.vim` | PASS | FAIL | nvim: `E5555: API call: Invalid 'col': out of range`（`s:test_out_of_screen_coordinates`） |
| `test_japanese_fix.vim` | PASS | PASS | |
| `test_motion_count.vim` | PASS | PASS | |
| `test_motion_count_integration.vim` | FAIL | FAIL | `Test 7 FAILED: 'j' mapping not found` |
| `test_motion_count_simple.vim` | PASS | PASS | |
| `test_motion_fix.vim` | FAIL | FAIL | `E216: No such group or event: filetypedetect *`、`E461: Illegal variable name: l:motion_count` |
| `test_multi_window_integration.vim` | PASS | PASS | |
| `test_phase1_3_integration.vim` | SKIP | SKIP | themis |
| `test_phase2_1_integration.vim` | FAIL | PASS | vim: `s:test_e2e_word_detection`/`multi_window`/`fallback` で AssertionError |
| `test_process100_multi_buffer_extmark.vim` | FAIL | FAIL | vim: ヒント数の `[FAIL]` と `E445: Other window contains changes`。nvim: `E117: Unknown function: <SNR>1_assert_true` |
| `test_process100_multi_window_context.vim` | PASS | PASS | |
| `test_process10_edge_cases.vim` | FAIL | FAIL | `E966: Invalid line number: 100` |
| `test_process4_sub1.vim` | PASS | PASS | |
| `test_process4_sub1_simple.vim` | PASS | PASS | |
| `test_single_window_optimization.vim` | PASS | PASS | ハーネスが `RunTests()` を呼ぶ |
| `test_visual_count.vim` | PASS | PASS | |
| `test_visual_schedule_mapping.vim` | PASS | PASS | |
| `test_window_detector_floating.vim` | PASS | FAIL | vim: 4/8 PASS、残り 4 件は SKIP 扱い。nvim: floating window が除外されず 4 件 FAIL |
| `test_word_detector_multi_simple.vim` | PASS | PASS | |
| `word_detector_test.vim` | FAIL | FAIL | vim: `FAIL: Detects words in buffer` など。nvim: `FAIL: Empty buffer returns empty list` |
| `hellshake_yano_vim/test_config.vim` | PASS | PASS | |
| `hellshake_yano_vim/test_core.vim` | FAIL | FAIL | runner 由来の 3 件だけ |
| `hellshake_yano_vim/test_display.vim` | PASS | PASS | |
| `hellshake_yano_vim/test_example.vim` | FAIL | FAIL | runner 由来の 3 件だけ |
| `hellshake_yano_vim/test_filter.vim` | FAIL | FAIL | runner 由来の 3 件だけ |
| `hellshake_yano_vim/test_focus_restore.vim` | FAIL | FAIL | runner 由来の 3 件だけ |
| `hellshake_yano_vim/test_hint_generator.vim` | FAIL | FAIL | `[FAIL] generate() should use g:hellshake_yano.singleCharKeys` など 4 件 |
| `hellshake_yano_vim/test_hint_generator_cache.vim` | SKIP | SKIP | themis |
| `hellshake_yano_vim/test_hint_generator_denops.vim` | SKIP | SKIP | themis |
| `hellshake_yano_vim/test_hint_generator_fallback.vim` | SKIP | SKIP | themis |
| `hellshake_yano_vim/test_hint_generator_golden.vim` | SKIP | SKIP | themis |
| `hellshake_yano_vim/test_hint_generator_latency.vim` | SKIP | SKIP | themis |
| `hellshake_yano_vim/test_input.vim` | PASS | PASS | |
| `hellshake_yano_vim/test_integration.vim` | FAIL | FAIL | 単語数・ヒント生成の `[FAIL]`（例: `should generate correct hints for 8 words`） |
| `hellshake_yano_vim/test_jump.vim` | FAIL | FAIL | runner 由来の 3 件だけ |
| `hellshake_yano_vim/test_jump_multi.vim` | PASS | PASS | |
| `hellshake_yano_vim/test_motion.vim` | PASS | PASS | |
| `hellshake_yano_vim/test_visual.vim` | FAIL | FAIL | runner 由来の 3 件だけ |
| `hellshake_yano_vim/test_window_detector.vim` | FAIL | FAIL | vim: runner 由来の 3 件だけ。nvim: ほかに floating window 関連の `✗` が 7 件 |
| `hellshake_yano_vim/test_word_detector.vim` | FAIL | FAIL | runner 由来以外の `✗` が vim 9 件、nvim 2 件（例: `should detect at least 8 words from 4 lines`） |
| `hellshake_yano_vim/test_word_detector_cache.vim` | SKIP | SKIP | themis |
| `hellshake_yano_vim/test_word_detector_config_integration.vim` | SKIP | SKIP | themis |
| `hellshake_yano_vim/test_word_detector_denops.vim` | SKIP | SKIP | themis |
| `hellshake_yano_vim/test_word_detector_fallback.vim` | SKIP | SKIP | themis |
| `hellshake_yano_vim/test_word_detector_golden.vim` | SKIP | SKIP | themis |
| `hellshake_yano_vim/test_word_detector_latency.vim` | SKIP | SKIP | themis |
