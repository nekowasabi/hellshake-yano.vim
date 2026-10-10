# denops 削除: 互換性表

`denops/hellshake-yano/`（TypeScript）のコマンド・関数（dispatcher メソッドと export）・マッピング・設定キーごとに 1 行で、`autoload/hellshake_yano_vim/`（pure Vim script）側の対応を示す。
`autoload/hellshake_yano/`（`_vim` なし）は denops と `hellshake_yano_vim` を振り分けるブリッジ層で、備考でのみ触れる。
機能単位の旧表は commit `da69355` の版にある。

- status は全行 `todo`（S1 時点）。
- テストファイル（`*_test.ts`、`*.test.ts`、`__tests__/`）は対象外。
- 備考で「未検証」としたものは、コードを読んだだけで動作を確かめていない。
- 「grep で見つからなかった」は、`autoload/`・`plugin/` に対する `denops#request`/`denops#notify` のリテラル呼び出し検索の結果。動的にメソッド名を組み立てる呼び出しは拾えていない。

## 列の意味

- target: 移植先。
  - `Lua`: Neovim 専用（`nvim_*` API・extmark・floating window に依存）。
  - `Vim9`: Vim 専用（`popup_*`・Vim 固有の挙動）。
  - `both`: Vim と Neovim の両方で必要。`Core` は Vim 層・Neovim 層の両方から使われるので、`neovim/core/` 配下でも既定は `both`。
  - `n/a(理由)`: 移植しない。denops の起動制御・TS 型・再エクスポート・未使用コードなど。
- priority:
  - `P1 (user config)`: `~/.config/nvim/init.vim` 145〜187 行の `g:hellshake_yano` で実際に設定しているキーと、192 行で `,h` に割り当てているコマンド `HellshakeYanoToggle`。
  - `P2`: P1 の設定値またはモーション → ヒント表示 → ジャンプの既定経路で使われる。
  - `P3`: 任意機能・内部ユーティリティ。P1/P2 の経路で使われない。
  - `n/a`: target が `n/a` の行。
- vim script file: `autoload/hellshake_yano_vim/` 側の対応ファイル。無ければ `missing`。

## plugin/ の入口

| file | 役割 |
|---|---|
| `plugin/hellshake-yano.vim` | denops 版の入口。`s:check_denops()` で denops を初期化する |
| `plugin/hellshake-yano-vim.vim` | pure Vim script 版の入口。Neovim では `finish` し、denops 版に任せる |
| `plugin/hellshake-yano-unified.vim` | denops が動いていれば `denops-unified`、なければ `vimscript-pure` を選ぶ |

## コマンド

denops 側で定義されるコマンド。`command-registry.ts` の定義、`core.ts` が起動時に `denops.cmd` で登録するもの、denops 版入口 `plugin/hellshake-yano.vim`・`plugin/hellshake-yano-unified.vim` の `command!` を含む。pure Vim script 版入口 `plugin/hellshake-yano-vim.vim` のコマンドは比較用に末尾に置く。

| command | defined in | 呼び先 | vim script file | target | priority | status | notes |
|---|---|---|---|---|---|---|---|
| `HellshakeYano` | `denops/hellshake-yano/integration/command-registry.ts` | unified: dispatcher `showHints` / vimscript: `hellshake_yano_vim#show_hints()` | missing | both | P3 | todo | `CommandRegistry` は `Initializer` からのみ使われる。vimscript 側の呼び先 `hellshake_yano_vim#show_hints()` は未定義 |
| `HellshakeYanoWord` | `denops/hellshake-yano/integration/command-registry.ts` | unified: dispatcher `showWordHints` / vimscript: `hellshake_yano_vim#show_word_hints()` | missing | n/a(呼び先が存在しない) | n/a | todo | `showWordHints` は main.ts の dispatcher にない。`hellshake_yano_vim#show_word_hints()` も未定義 |
| `HellshakeYanoJpWord` | `denops/hellshake-yano/integration/command-registry.ts` | unified: dispatcher `showJpWordHints` / vimscript: `hellshake_yano_vim#show_jp_word_hints()` | missing | n/a(呼び先が存在しない) | n/a | todo | 同上 |
| `HellshakeYanoAddWord` | `denops/hellshake-yano/neovim/core/core.ts` (`registerDictionaryCommands`) | dispatcher `addToDictionary` | `autoload/hellshake_yano_vim/dictionary.vim` | both | P2 | todo | 辞書系は `dictionaryPath`（P1）の経路。Vim 側 `dictionary#add` は denops に委譲するだけ |
| `HellshakeYanoReloadDict` | `denops/hellshake-yano/neovim/core/core.ts` | dispatcher `reloadDictionary` | `autoload/hellshake_yano_vim/dictionary.vim` | both | P2 | todo | 同上 |
| `HellshakeYanoEditDict` | `denops/hellshake-yano/neovim/core/core.ts` | dispatcher `editDictionary` | missing | both | P3 | todo | dictionary.vim に edit はない |
| `HellshakeYanoShowDict` | `denops/hellshake-yano/neovim/core/core.ts` | dispatcher `showDictionary` | `autoload/hellshake_yano_vim/dictionary.vim` | both | P3 | todo | |
| `HellshakeYanoValidateDict` | `denops/hellshake-yano/neovim/core/core.ts` | dispatcher `validateDictionary` | `autoload/hellshake_yano_vim/dictionary.vim` | both | P3 | todo | |
| `HellshakeYanoEnable` | `plugin/hellshake-yano.vim` | `hellshake_yano#plugin#enable()` → dispatcher `enable` | missing | both | P2 | todo | `HellshakeYanoToggle` が内部で使う。Vim 側は `core#init` が `enable` を notify するだけ |
| `HellshakeYanoDisable` | `plugin/hellshake-yano.vim` | `hellshake_yano#plugin#disable()` → dispatcher `disable` | missing | both | P2 | todo | 同上 |
| `HellshakeYanoToggle` | `plugin/hellshake-yano.vim`, `plugin/hellshake-yano-unified.vim` | `hellshake_yano#plugin#toggle()` / unified: dispatcher `toggle` | missing | both | P1 (user config) | todo | init.vim 192 行で `nnoremap <silent> ,h :HellshakeYanoToggle<CR>`。`command-registry.ts` には定義がない。Vim 側に toggle 相当はない |
| `HellshakeYanoShow` | `plugin/hellshake-yano.vim`, `plugin/hellshake-yano-unified.vim` | `hellshake_yano#hint#show()` / unified: dispatcher `showHints` | `autoload/hellshake_yano_vim/core.vim` | both | P2 | todo | `core#show` が対応 |
| `HellshakeYanoHide` | `plugin/hellshake-yano.vim`, `plugin/hellshake-yano-unified.vim` | `hellshake_yano#hint#hide()` / unified: dispatcher `hideHints` | `autoload/hellshake_yano_vim/core.vim` | both | P2 | todo | `core#hide` が対応 |
| `HellshakeYanoSetCount` | `plugin/hellshake-yano.vim` | `hellshake_yano#config#set_count()` | `autoload/hellshake_yano_vim/motion.vim` | both | P3 | todo | `motion#set_threshold` が近い。`motionCount` は user config にない |
| `HellshakeYanoSetTimeout` | `plugin/hellshake-yano.vim` | `hellshake_yano#config#set_timeout()` | `autoload/hellshake_yano_vim/motion.vim` | both | P3 | todo | `motion#set_timeout` が近い |
| `HellshakeYanoSetHighlight` | `plugin/hellshake-yano.vim` | `hellshake_yano#highlight#update()` | `autoload/hellshake_yano_vim/display.vim` | both | P3 | todo | Vim 側は `s:define_highlight_group` で起動時に定義するだけ。実行時更新コマンドはない |
| `HellshakeYanoSetCountedMotions` | `plugin/hellshake-yano.vim` | `hellshake_yano#mapping#set_counted_motions()` | missing | both | P3 | todo | `countedMotions` は user config にない |
| `HellshakeYanoDebug` | `plugin/hellshake-yano.vim` | `hellshake_yano#debug#display()` | missing | both | P3 | todo | |
| `HellshakeYanoDebugConfig` | `plugin/hellshake-yano.vim` | `denops#request('hellshake-yano', 'getConfig', [])` | `autoload/hellshake_yano_vim/config.vim` | both | P3 | todo | `config#get` で代替できる |
| `HellshakeYanoVimTest` | `plugin/hellshake-yano-vim.vim` | `s:run_all_tests()` | （plugin 内） | n/a(pure Vim script 版の既存コマンド) | n/a | todo | 比較用 |
| `HellshakeYanoVimShow` | `plugin/hellshake-yano-vim.vim` | `s:show_hints()` | `autoload/hellshake_yano_vim/core.vim` | n/a(pure Vim script 版の既存コマンド) | n/a | todo | 比較用 |
| `HellshakeYanoVimHide` | `plugin/hellshake-yano-vim.vim` | `s:hide_hints()` | `autoload/hellshake_yano_vim/core.vim` | n/a(pure Vim script 版の既存コマンド) | n/a | todo | 比較用 |
| `HYVimDictReload` | `plugin/hellshake-yano-vim.vim` | `s:dict_reload()` | `autoload/hellshake_yano_vim/dictionary.vim` | n/a(pure Vim script 版の既存コマンド) | n/a | todo | 比較用 |
| `HYVimDictAdd` | `plugin/hellshake-yano-vim.vim` | `s:dict_add()` | `autoload/hellshake_yano_vim/dictionary.vim` | n/a(pure Vim script 版の既存コマンド) | n/a | todo | 比較用 |
| `HYVimDictEdit` | `plugin/hellshake-yano-vim.vim` | `s:dict_edit()` | missing | n/a(pure Vim script 版の既存コマンド) | n/a | todo | 比較用。案内メッセージだけ |
| `HYVimDictShow` | `plugin/hellshake-yano-vim.vim` | `s:dict_show()` | `autoload/hellshake_yano_vim/dictionary.vim` | n/a(pure Vim script 版の既存コマンド) | n/a | todo | 比較用 |
| `HYVimDictValidate` | `plugin/hellshake-yano-vim.vim` | `s:dict_validate()` | `autoload/hellshake_yano_vim/dictionary.vim` | n/a(pure Vim script 版の既存コマンド) | n/a | todo | 比較用 |

## マッピング

| mapping | mode | defined in | RHS | vim script file | target | priority | status | notes |
|---|---|---|---|---|---|---|---|---|
| モーションキー（既定 `w` `b` `e`、`setupMotionMappings(keys)` で変更可） | n | `denops/hellshake-yano/integration/mapping-manager.ts` | `:<C-u>call denops#notify('hellshake-yano', 'handleMotion', ["<key>"])<CR>` | `autoload/hellshake_yano_vim/motion.vim` | n/a(呼び先が存在しない) | n/a | todo | `handleMotion` は main.ts・core.ts の dispatcher にない。`MappingManager` は `Initializer` からのみ使われる |
| `<Leader>h` | x | `denops/hellshake-yano/integration/mapping-manager.ts` (`setupVisualMappings`) | `:<C-u>call denops#notify('hellshake-yano', 'showHints', [])<CR>` | `autoload/hellshake_yano_vim/visual.vim` | both | P3 | todo | Vim 側は `visual#show`。`showHints` は Neovim 層にしかない |
| モーションキー（`hellshake_yano#config#get_motion_keys()`） | n, x | `autoload/hellshake_yano/mapping.vim` (`setup_motion_mappings`、ブリッジ) | `<expr> hellshake_yano#motion#process(key)` / `hellshake_yano#motion#visual(key)` | `autoload/hellshake_yano_vim/motion.vim` | both | P2 | todo | denops 版入口の実際のモーションマッピング。`perKeyMotionCount`（P1）の経路。Vim 側は `motion#handle_with_count` |
| モーションキー（`countedMotions`、既定 `w` `b` `e`） | n | `plugin/hellshake-yano-unified.vim` | `<expr> printf(":\<C-u>call hellshake_yano_vim#motion#handle_with_count(key, %d)\<CR>", v:count1)` | `autoload/hellshake_yano_vim/motion.vim` | both | P2 | todo | unified 入口は denops 有無に関わらず `hellshake_yano_vim` の motion を使う。`motionCounterEnabled` で無効化 |
| モーションキー（`countedMotions`） | x | `plugin/hellshake-yano-unified.vim` | `<expr> hellshake_yano_vim#motion#visual_schedule(key)` | `autoload/hellshake_yano_vim/motion.vim` | both | P3 | todo | |
| `<Leader>h` | x | `plugin/hellshake-yano-unified.vim` | `s:show_hints_visual()`（denops 時）/ `hellshake_yano_vim#visual#show()` | `autoload/hellshake_yano_vim/visual.vim` | both | P3 | todo | `visualModeEnabled` で無効化 |
| `,h` | n | `~/.config/nvim/init.vim` 192 行（ユーザー設定） | `:HellshakeYanoToggle<CR>` | missing | both | P1 (user config) | todo | コマンド `HellshakeYanoToggle` の行を参照 |
| `<Plug>(hellshake-yano-vim-w)` | n | `plugin/hellshake-yano-vim.vim` | `hellshake_yano_vim#motion#*` | `autoload/hellshake_yano_vim/motion.vim` | n/a(pure Vim script 版の既存マッピング) | n/a | todo | 比較用 |
| `<Plug>(hellshake-yano-vim-b)` | n | `plugin/hellshake-yano-vim.vim` | `hellshake_yano_vim#motion#*` | `autoload/hellshake_yano_vim/motion.vim` | n/a(pure Vim script 版の既存マッピング) | n/a | todo | 比較用 |
| `<Plug>(hellshake-yano-vim-e)` | n | `plugin/hellshake-yano-vim.vim` | `hellshake_yano_vim#motion#*` | `autoload/hellshake_yano_vim/motion.vim` | n/a(pure Vim script 版の既存マッピング) | n/a | todo | 比較用 |
| `<Plug>(hellshake-yano-vim-visual)` | x | `plugin/hellshake-yano-vim.vim` | `hellshake_yano_vim#visual#show()` | `autoload/hellshake_yano_vim/visual.vim` | n/a(pure Vim script 版の既存マッピング) | n/a | todo | 比較用 |
| モーションキー（`countedMotions` または `g:hellshake_yano_vim_config.motion_keys`、既定 `w` `b` `e`） | n, x | `plugin/hellshake-yano-vim.vim` | `hellshake_yano_vim#motion#handle_with_count` / `visual_schedule` | `autoload/hellshake_yano_vim/motion.vim` | n/a(pure Vim script 版の既存マッピング) | n/a | todo | 比較用。unified 入口と同じ RHS |
| `<Leader>h` | x | `plugin/hellshake-yano-vim.vim` | `hellshake_yano_vim#visual#show()` | `autoload/hellshake_yano_vim/visual.vim` | n/a(pure Vim script 版の既存マッピング) | n/a | todo | 比較用。`visualModeEnabled` で無効化 |

## dispatcher メソッド

`main.ts` の `denops.dispatcher`。Vim 層（`initializeVimLayer`、217〜637 行）と Neovim 層（`initializeNeovimLayer`、688〜1375 行）の 2 つがあり、Vim 層の 41 メソッドはすべて Neovim 層にもある。layer 列は `V+N`（両層）か `N`（Neovim 層のみ）。

| method | layer | 呼び出し元（Vim script） | vim script file | target | priority | status | notes |
|---|---|---|---|---|---|---|---|
| `enable` | V+N | `autoload/hellshake_yano/core.vim`, `autoload/hellshake_yano_vim/core.vim`（notify） | `autoload/hellshake_yano_vim/core.vim` | both | P2 | todo | `HellshakeYanoToggle` の経路。Vim 側は notify するだけで有効/無効の状態を持たない |
| `disable` | V+N | grep で見つからなかった（`hellshake_yano#plugin#disable` 経由と推定、未検証） | missing | both | P2 | todo | 同上 |
| `toggle` | V+N | `plugin/hellshake-yano-unified.vim` | missing | both | P2 | todo | `HellshakeYanoToggle`（P1）の実体 |
| `updateConfig` | V+N | `autoload/hellshake_yano/config.vim`, `autoload/hellshake_yano_vim/config.vim`, `motion.vim`, `plugin/*.vim` | `autoload/hellshake_yano_vim/config.vim` | both | P2 | todo | `config#set` が対応。全 P1 キーの受け渡し口 |
| `getConfig` | V+N | `autoload/hellshake_yano/config.vim`, `autoload/hellshake_yano_vim/config.vim`, `plugin/hellshake-yano.vim` | `autoload/hellshake_yano_vim/config.vim` | both | P2 | todo | `config#reload` は denops の `getConfig` 頼み |
| `validateConfig` | V+N | grep で見つからなかった | missing | both | P3 | todo | `validateConfig`/`validateUnifiedConfig` 相当はない。ブリッジに `hellshake_yano#validation#*` |
| `segmentJapaneseText` | V+N | `autoload/hellshake_yano/japanese.vim`, `autoload/hellshake_yano_vim/japanese.vim` | `autoload/hellshake_yano_vim/japanese.vim` | both | P2 | todo | `useJapanese`/`enableTinySegmenter`（P1）の経路。Vim 側 `s:fallback_segment` は文字種で区切るだけ |
| `healthCheck` | V+N | grep で見つからなかった | missing | both | P3 | todo | ブリッジに `hellshake_yano#debug#*` |
| `getStatistics` | V+N | `autoload/hellshake_yano/core.vim` | missing | both | P3 | todo | |
| `debug` | V+N | grep で見つからなかった | missing | both | P3 | todo | |
| `clearCache` | V+N | `autoload/hellshake_yano/hint_generator.vim`, `word_detector.vim`, `dictionary.vim` | `autoload/hellshake_yano_vim/hint_generator.vim`, `word_detector.vim` | both | P3 | todo | 各モジュールの `clear_cache` が対応 |
| `invalidateBufferCache` | V+N | `plugin/hellshake-yano.vim`（autocmd） | missing | both | P3 | todo | Vim 側の `s:word_cache` は TTL のみで `changedtick` 無効化はない |
| `reloadDictionary` | V+N | `autoload/hellshake_yano/dictionary.vim`, `autoload/hellshake_yano_vim/dictionary.vim` | `autoload/hellshake_yano_vim/dictionary.vim` | both | P2 | todo | `dictionaryPath`（P1）の経路。Vim 側に `DictionaryLoader` 相当はなく、denops がなければ `v:false` |
| `addToDictionary` | V+N | 同上 | `autoload/hellshake_yano_vim/dictionary.vim` | both | P3 | todo | |
| `editDictionary` | V+N | grep で見つからなかった | missing | both | P3 | todo | |
| `showDictionary` | V+N | 同上（dictionary.vim） | `autoload/hellshake_yano_vim/dictionary.vim` | both | P3 | todo | |
| `validateDictionary` | V+N | 同上（dictionary.vim） | `autoload/hellshake_yano_vim/dictionary.vim` | both | P3 | todo | |
| `isInDictionary` | V+N | 同上（dictionary.vim） | `autoload/hellshake_yano_vim/dictionary.vim`, `word_filter.vim` | both | P2 | todo | `word_filter#apply` が辞書語の長さ判定を飛ばすのに使う |
| `detectWordsVisible` | V+N | `autoload/hellshake_yano/word_detector.vim`, `autoload/hellshake_yano_vim/word_detector.vim` | `autoload/hellshake_yano_vim/word_detector.vim` | both | P2 | todo | `detect_visible` は denops を優先し、なければ `s:detect_visible_local` |
| `detectWordsMultiWindow` | V+N | 同上 | `autoload/hellshake_yano_vim/word_detector.vim`, `window_detector.vim` | both | P2 | todo | `multiWindowMode`（P1）の経路 |
| `getMinWordLength` | V+N | `autoload/hellshake_yano/hint_generator.vim`, `word_detector.vim`, `autoload/hellshake_yano_vim/word_detector.vim` | `autoload/hellshake_yano_vim/word_detector.vim` | both | P2 | todo | `perKeyMinLength` → `defaultMinWordLength`（P1）の経路。`s:get_min_length_local` が対応 |
| `generateHints` | V+N | `autoload/hellshake_yano/hint_generator.vim`, `autoload/hellshake_yano_vim/hint_generator.vim` | `autoload/hellshake_yano_vim/hint_generator.vim` | both | P2 | todo | `singleCharKeys`/`multiCharKeys`/`useNumericMultiCharHints`（P1）の経路。`maxSingleCharHints` は未対応 |
| `displayShowHint` | V+N | `autoload/hellshake_yano_vim/display.vim` | `autoload/hellshake_yano_vim/display.vim` | both | P2 | todo | Vim 層は popup、Neovim 層は extmark。Vim 側 `show_hint` は `popup_create`/`nvim_buf_set_extmark` を自前で持つ |
| `displayShowHintWithWindow` | V+N | `autoload/hellshake_yano_vim/display.vim` | `autoload/hellshake_yano_vim/display.vim` | both | P2 | todo | `multiWindowMode`（P1）の経路 |
| `displayHideAll` | V+N | `autoload/hellshake_yano/core.vim`, `autoload/hellshake_yano_vim/core.vim`, `display.vim` | `autoload/hellshake_yano_vim/display.vim` | both | P2 | todo | `hide_all` が対応 |
| `displayHighlightPartialMatches` | V+N | `autoload/hellshake_yano_vim/display.vim` | `autoload/hellshake_yano_vim/display.vim` | both | P2 | todo | `highlight_partial_matches` が対応。`multiCharKeys`（P1）使用時の部分一致表示 |
| `displayGetPopupCount` | V+N | grep で見つからなかった | `autoload/hellshake_yano_vim/display.vim` | both | P3 | todo | `get_popup_count` が対応 |
| `motionDetect` | V+N | `autoload/hellshake_yano_vim/motion.vim` | `autoload/hellshake_yano_vim/motion.vim` | both | P2 | todo | `perKeyMotionCount`/`defaultMotionCount`（P1）の経路。`handle_with_count` が対応 |
| `motionResetState` | V+N | grep で見つからなかった | `autoload/hellshake_yano_vim/motion.vim` | both | P3 | todo | |
| `motionSetThreshold` | V+N | grep で見つからなかった | `autoload/hellshake_yano_vim/motion.vim` | both | P3 | todo | `set_threshold` が `{'threshold'}` を送る点は未検証 |
| `motionSetTimeout` | V+N | grep で見つからなかった | `autoload/hellshake_yano_vim/motion.vim` | both | P3 | todo | |
| `motionGetState` | V+N | `autoload/hellshake_yano/motion.vim` | `autoload/hellshake_yano_vim/motion.vim` | both | P3 | todo | `get_state` が対応 |
| `getVisualRange` | V+N | `autoload/hellshake_yano_vim/visual.vim` | `autoload/hellshake_yano_vim/visual.vim` | both | P3 | todo | |
| `getHighlightGroup` | V+N | grep で見つからなかった | `autoload/hellshake_yano_vim/display.vim` | both | P3 | todo | `get_highlight_group` が対応 |
| `showDelayed` | V+N | `autoload/hellshake_yano/core.vim` | `autoload/hellshake_yano_vim/core.vim` | both | P3 | todo | `show_delayed` が対応 |
| `getFixedPositions` | V+N | `autoload/hellshake_yano/core.vim` | `autoload/hellshake_yano_vim/core.vim` | both | P3 | todo | `get_fixed_positions` が対応 |
| `getPartialMatches` | V+N | `autoload/hellshake_yano/input.vim` | `autoload/hellshake_yano_vim/input.vim` | both | P2 | todo | `get_partial_matches` が対応 |
| `visualInit` | V+N | `autoload/hellshake_yano/visual.vim` | `autoload/hellshake_yano_vim/visual.vim` | both | P3 | todo | `visual#init` が対応 |
| `visualGetState` | V+N | `autoload/hellshake_yano/visual.vim` | `autoload/hellshake_yano_vim/visual.vim` | both | P3 | todo | `visual#get_state` が対応 |
| `shouldRedraw` | V+N | grep で見つからなかった | `autoload/hellshake_yano_vim/core.vim` | both | P3 | todo | `should_redraw` が対応 |
| `detectWordsInVisualRange` | V+N | `autoload/hellshake_yano/visual.vim`, `autoload/hellshake_yano_vim/visual.vim` | `autoload/hellshake_yano_vim/visual.vim` | both | P3 | todo | `s:detect_words_in_range_local` が対応 |
| `setCount` | N | grep で見つからなかった（`HellshakeYanoSetCount` 経由と推定、未検証） | `autoload/hellshake_yano_vim/motion.vim` | both | P3 | todo | |
| `setTimeout` | N | grep で見つからなかった | `autoload/hellshake_yano_vim/motion.vim` | both | P3 | todo | |
| `showHints` | N | `plugin/hellshake-yano-unified.vim` | `autoload/hellshake_yano_vim/core.vim` | both | P2 | todo | `core#show` が対応。`debounceDelay` は未対応 |
| `hideHints` | N | `plugin/hellshake-yano-unified.vim` | `autoload/hellshake_yano_vim/core.vim` | both | P2 | todo | `core#hide` が対応 |
| `highlightCandidateHints` | N | grep で見つからなかった | `autoload/hellshake_yano_vim/display.vim` | Lua | P2 | todo | extmark 前提の `highlightCandidateHintsHybrid` を呼ぶ。Vim 側は `highlight_partial_matches` |
| `detectWords` | N | grep で見つからなかった | `autoload/hellshake_yano_vim/word_detector.vim` | both | P3 | todo | `bufnr` 指定版 |
| `getDebugInfo` | N | grep で見つからなかった | missing | both | P3 | todo | |
| `clearDebugInfo` | N | grep で見つからなかった | missing | both | P3 | todo | |
| `showHintsWithKey` | N | `autoload/hellshake_yano/hint.vim` | `autoload/hellshake_yano_vim/core.vim` | both | P2 | todo | denops 版のモーション → ヒント表示の本線。`core#show_with_motion` が対応。`useHintGroups`/`cancelKeys`/`continuousHintMode`/`recenterCommand`/`maxContinuousJumps`/`directionalHintFilter`（P1）は `core.ts` の `waitForUserInput`/`postJumpHandler` で処理される |
| `showHintsInternal` | N | grep で見つからなかった | `autoload/hellshake_yano_vim/core.vim` | both | P3 | todo | |
| `clearPerformanceLog` | N | grep で見つからなかった | missing | both | P3 | todo | `performanceLog` は user config にない |
| `showHintsMultiWindow` | N | grep で見つからなかった | `autoload/hellshake_yano_vim/core.vim` | both | P2 | todo | core.vim の `multiWindowMode` 分岐が対応 |
| `hideHintsMultiWindow` | N | grep で見つからなかった | `autoload/hellshake_yano_vim/display.vim` | both | P2 | todo | |
| `toggleMultiWindowMode` | N | grep で見つからなかった | missing | both | P3 | todo | |
| `getVisibleWindows` | N | `autoload/hellshake_yano/window_detector.vim` | `autoload/hellshake_yano_vim/window_detector.vim` | both | P2 | todo | `window_detector#get_visible`（`multiWindowExcludeTypes`/`multiWindowMaxWindows`、P1）が対応。floating window の除外は nvim で失敗している（Baseline 参照） |
| `isMultiWindowModeActive` | N | grep で見つからなかった | missing | both | P3 | todo | |
| `updateMultiWindowConfig` | N | grep で見つからなかった | missing | both | P3 | todo | `updateConfig` で代替できる |
| `enableMultiWindowMode` | N | grep で見つからなかった | missing | both | P3 | todo | |
| `disableMultiWindowMode` | N | grep で見つからなかった | missing | both | P3 | todo | |
| `isMultiWindowModeEnabled` | N | grep で見つからなかった | missing | both | P3 | todo | |

## export 関数・クラス

dispatcher 以外の `export`。モジュールごとに並べ、関数とクラスは 1 つ 1 行。クラスの主なメソッドは備考に書く。`export const` の定数と再エクスポートだけは 1 モジュール 1 行にまとめる。

### `denops/hellshake-yano/main.ts`

| export | vim script file | target | priority | status | notes |
|---|---|---|---|---|---|
| `main` | `plugin/hellshake-yano.vim`, `plugin/hellshake-yano-unified.vim` | n/a(denops エントリ) | n/a | todo | `Initializer` → `initializeVimLayer`/`initializeNeovimLayer`。`legacyMode` を `g:hellshake_yano` から読む |
| `displayHintsOptimized` | `autoload/hellshake_yano_vim/display.vim` | Lua | P2 | todo | extmark 描画の入口。Vim 側は `display#show_hint` を 1 件ずつ呼ぶ |
| `hideHints` | `autoload/hellshake_yano_vim/display.vim` | Lua | P2 | todo | `hide_all` が対応 |
| `highlightCandidateHintsAsync` | `autoload/hellshake_yano_vim/display.vim` | Lua | P2 | todo | |
| `createHintConfig` | `autoload/hellshake_yano_vim/hint_generator.vim` | both | P2 | todo | `Config` → `GenerateHintsOptions`。`markers` の既定 `["a","s","d","f"]` は Vim 側にない |
| 再エクスポート（`getDefaultConfig`, `Config`, `detectWordsOptimized`, `generateHintsFromConfig`, `validateConfig`, `cleanupPendingTimers`, `collectDebugInfo`, `highlightCandidateHintsHybrid`） | — | n/a(再エクスポート) | n/a | todo | 実体は各モジュールの行を参照 |

### `denops/hellshake-yano/config.ts`, `common/config.ts`, `common/types/config.ts`

| export | vim script file | target | priority | status | notes |
|---|---|---|---|---|---|
| `DEFAULT_CONFIG`（`common/types/config.ts`、`config.ts`・`common/config.ts` から再エクスポート） | `autoload/hellshake_yano_vim/config.vim` | both | P2 | todo | `s:default_config` は snake_case の少数キーだけ。設定キーの節を参照 |
| `getDefaultConfig`（`config.ts`、`common/config.ts` に同名） | `autoload/hellshake_yano_vim/config.vim` | both | P3 | todo | `common/config.ts` 側は重複 |
| `createMinimalConfig`（`config.ts`、`common/config.ts` に同名） | missing | both | P3 | todo | `{...DEFAULT_CONFIG, ...partial}` |
| `validateUnifiedConfig` | missing | both | P3 | todo | |
| `validateConfig` | missing | both | P3 | todo | `common/utils/validator.ts` にも同名がある |
| `mergeConfig` | `autoload/hellshake_yano_vim/config.vim` | both | P2 | todo | `config#set` の `extend` が近い |
| `cloneConfig` | missing | both | P3 | todo | |
| `getPerKeyValue` | `autoload/hellshake_yano_vim/word_detector.vim`, `motion.vim` | both | P2 | todo | `perKeyMinLength`/`perKeyMotionCount`（P1）の共通ロジック。Vim 側は各モジュールが個別に `get()` する |
| `createModernConfig` | missing | both | P3 | todo | |
| `validateConfigValue` | missing | both | P3 | todo | |
| `validateConfigObject` | missing | both | P3 | todo | |

### `denops/hellshake-yano/neovim/core/core.ts`

| export | vim script file | target | priority | status | notes |
|---|---|---|---|---|---|
| `Core`（クラス） | `autoload/hellshake_yano_vim/core.vim`, `input.vim`, `jump.vim` | both | P2 | todo | `showHints`/`showHintsWithKey`/`showHintsInternal`/`hideHints`/`waitForUserInput`/`jumpToHintTarget`/`postJumpHandler`/`showHintsMultiWindow`/`toggleMultiWindowMode`/`updateConfig`/`initializePlugin`/`registerDictionaryCommands`。`useHintGroups`・`cancelKeys`・`continuousHintMode`・`recenterCommand`・`maxContinuousJumps`（P1）の処理はここ。Vim 側に `waitForUserInput` 内の `useHintGroups` 分岐、`isConfiguredCancelKey`、`postJumpHandler`、`executeRecenterCommand` 相当はない |
| `HellshakeYanoCore`（クラス） | missing | n/a(未検証: 利用箇所が grep で出ない) | n/a | todo | 3808 行目。`Core` との関係は未検証 |
| `resolveGetlineScope` | missing | both | P3 | todo | getline キャッシュ。`VIEWPORT_GETLINE_THRESHOLD` と組 |
| `resetGetlineCacheStats` | missing | both | P3 | todo | |
| `getGetlineCacheStats` | missing | both | P3 | todo | |
| 定数（`VIEWPORT_GETLINE_THRESHOLD`, `HIGHLIGHT_BATCH_SIZE`, `HYBRID_SYNC_BATCH_SIZE`） | missing | both | P3 | todo | |

### `denops/hellshake-yano/neovim/core/hint.ts`, `hint/hint-generator-strategies.ts`

| export | vim script file | target | priority | status | notes |
|---|---|---|---|---|---|
| `generateHints`（3 オーバーロード） | `autoload/hellshake_yano_vim/hint_generator.vim` | both | P2 | todo | `s:generate_local` が対応。`maxSingleCharHints` は未対応 |
| `assignHintsToWords` | `autoload/hellshake_yano_vim/core.vim` | both | P2 | todo | `core#show` は検出順に割り当てるだけ。`sort(` はない |
| `prioritizeHints` | missing | both | P3 | todo | |
| `calculateHintPosition` | missing | both | P3 | todo | `hintPosition`/`bothMinWordLength` は user config にない |
| `filterWordsByDirection` | `autoload/hellshake_yano_vim/filter.vim` | both | P2 | todo | `directionalHintFilter`（P1）。`filter#by_direction` が対応 |
| `resolveDirectionalContext` | `autoload/hellshake_yano_vim/core.vim` | both | P2 | todo | `s:consume_directional_context` が対応 |
| `getCharDisplayWidth` | missing | both | P2 | todo | CJK/絵文字の表示幅。`useJapanese`（P1）で必要。Vim 側に `strdisplaywidth`/`virtcol` の使用はない |
| `getDisplayWidth` | missing | both | P2 | todo | 同上 |
| `convertToDisplayColumn` | missing | both | P2 | todo | 同上 |
| `getWordDisplayEndCol` | missing | both | P2 | todo | 同上 |
| `getWordDisplayStartCol` | missing | both | P2 | todo | 同上 |
| `areWordsAdjacent` | missing | both | P3 | todo | 隣接語処理。grep で adjacent/overlap は Vim 側に出なかった |
| `detectAdjacentWords` | missing | both | P3 | todo | 同上 |
| `calculateWordGap` | missing | both | P3 | todo | 同上 |
| `isPositionWithinWord` | missing | both | P3 | todo | 同上 |
| `shouldSkipHintForOverlap` | missing | both | P3 | todo | |
| `canDisplayHint` | missing | both | P3 | todo | |
| `isSymbolWord` | missing | both | P3 | todo | |
| `isNumericOnlyKeys` | `autoload/hellshake_yano_vim/hint_generator.vim` | both | P2 | todo | `useNumericMultiCharHints`（P1）。`s:generate_numeric_hints` が対応 |
| `generateMultiCharHintsFromKeys` | `autoload/hellshake_yano_vim/hint_generator.vim` | both | P2 | todo | 同上 |
| `validateHintKeyConfig` | missing | both | P3 | todo | |
| `clearHintCache` | `autoload/hellshake_yano_vim/hint_generator.vim` | both | P3 | todo | `clear_cache` が対応 |
| `getHintCacheStats` | missing | both | P3 | todo | stats はない |
| `getGlobalCacheStats` | missing | both | P3 | todo | 同上 |
| `HintManager`（クラス） | missing | n/a(未検証: `new HintManager` が grep で出ない) | n/a | todo | |
| `SingleCharHintStrategy`（クラス、`hint-generator-strategies.ts`） | `autoload/hellshake_yano_vim/hint_generator.vim` | both | P2 | todo | `generateHints` の内部実装。`singleCharKeys`（P1） |
| `MultiCharHintStrategy`（クラス、`hint-generator-strategies.ts`） | `autoload/hellshake_yano_vim/hint_generator.vim` | both | P2 | todo | `multiCharKeys`（P1） |
| `NumericHintStrategy`（クラス、`hint-generator-strategies.ts`） | `autoload/hellshake_yano_vim/hint_generator.vim` | both | P2 | todo | `useNumericMultiCharHints`（P1）。`s:generate_numeric_hints` が対応 |
| `HybridHintStrategy`（クラス、`hint-generator-strategies.ts`） | `autoload/hellshake_yano_vim/hint_generator.vim` | both | P2 | todo | 1 文字と複数文字の組み合わせ |
| `HintGeneratorFactory`（クラス、`hint-generator-strategies.ts`） | `autoload/hellshake_yano_vim/hint_generator.vim` | both | P2 | todo | 戦略の選択 |
| 定数（`BATCH_PROCESS_THRESHOLD`, `BATCH_BATCH_SIZE`, `OVERLAP_SKIP_OPTS`） | missing | both | P3 | todo | |

### `denops/hellshake-yano/neovim/core/word.ts`, `word/*.ts`

| export | vim script file | target | priority | status | notes |
|---|---|---|---|---|---|
| `detectWords`（2 オーバーロード） | `autoload/hellshake_yano_vim/word_detector.vim` | both | P2 | todo | `s:detect_visible_local` が対応 |
| `detectWordsWithManager` | `autoload/hellshake_yano_vim/word_detector.vim` | both | P2 | todo | `wordDetectionStrategy`/`enableTinySegmenter`/`segmenterThreshold`（P1）はここで分岐。Vim 側は `has_japanese` で行ごとに切り替えるだけ |
| `detectWordsWithConfig` | `autoload/hellshake_yano_vim/word_detector.vim` | both | P2 | todo | 同上 |
| `detectWordsWithEnhancedConfig` | `autoload/hellshake_yano_vim/word_detector.vim` | both | P2 | todo | 同上 |
| `detectWordsInRange` | `autoload/hellshake_yano_vim/visual.vim` | both | P3 | todo | `s:detect_words_in_range_local` が対応 |
| `detectWordsMultiWindow` | `autoload/hellshake_yano_vim/word_detector.vim` | both | P2 | todo | `s:detect_multi_window_local` が対応 |
| `detectWordsMultiWindowDetailed` | `autoload/hellshake_yano_vim/word_detector.vim` | both | P2 | todo | 同上 |
| `extractWords` | `autoload/hellshake_yano_vim/word_detector.vim` | both | P2 | todo | `s:detect_english_words`（`\w\+`）が近い。`legacyMode`/`useImprovedDetection` 分岐はない |
| `createCacheKey` | `autoload/hellshake_yano_vim/word_detector.vim` | both | P3 | todo | `s:word_cache` のキーは `bufnr:w0:w$` |
| `clearWordDetectionCache` | `autoload/hellshake_yano_vim/word_detector.vim` | both | P3 | todo | `clear_cache` が対応 |
| `clearDetectionCache` | `autoload/hellshake_yano_vim/word_detector.vim` | both | P3 | todo | 同上 |
| `clearAllWordCaches` | `autoload/hellshake_yano_vim/word_detector.vim` | both | P3 | todo | 同上 |
| `getWordDetectionCacheStats` | missing | both | P3 | todo | stats はない |
| `convertWordConfigToEnhanced` | missing | both | P3 | todo | |
| `createPartialConfig` | missing | both | P3 | todo | |
| `getByteLength` | `autoload/hellshake_yano_vim/util.vim` | both | P2 | todo | `useJapanese`（P1）で必要。Vim 側は `safe_strchars` だけ |
| `clearByteLengthCache` | missing | both | P3 | todo | |
| `charIndexToByteIndex` | missing | both | P2 | todo | `useJapanese`（P1）で必要 |
| `byteIndexToCharIndex` | missing | both | P2 | todo | 同上 |
| `hasMultibyteCharacters` | `autoload/hellshake_yano_vim/japanese.vim` | both | P2 | todo | `has_japanese` が近い |
| `getEncodingInfo` | missing | both | P3 | todo | |
| `getWordDetectionManager` | missing | both | P3 | todo | |
| `resetWordDetectionManager` | missing | both | P3 | todo | |
| `WordDetectionManager`（クラス） | `autoload/hellshake_yano_vim/word_detector.vim` | both | P2 | todo | 戦略の選択とキャッシュ |
| `DictionaryLoader`（クラス） | `autoload/hellshake_yano_vim/dictionary.vim` | both | P2 | todo | `dictionaryPath`（P1）の YAML 読み込み。Vim 側は denops に委譲するだけ |
| `VimConfigBridge`（クラス） | `autoload/hellshake_yano_vim/config.vim` | both | P2 | todo | `g:hellshake_yano.dictionaryPath` と旧 `g:hellshake_yano_dictionary_path` を読む |
| `HintPatternProcessor`（クラス） | missing | both | P3 | todo | 辞書の `hintPatterns`（captureGroup） |
| `RegexWordDetector`（クラス、`word-detector-strategies.ts`） | `autoload/hellshake_yano_vim/word_detector.vim` | both | P2 | todo | `s:detect_english_words` が近い。`excludeNumbers` は Vim 側にない（`exclude_numbers` は config.vim で定義だけ） |
| `TinySegmenterWordDetector`（クラス、`word-detector-strategies.ts`） | `autoload/hellshake_yano_vim/japanese.vim` | both | P2 | todo | `enableTinySegmenter`（P1） |
| `HybridWordDetector`（クラス、`word-detector-strategies.ts`） | `autoload/hellshake_yano_vim/word_detector.vim` | both | P2 | todo | 既定戦略 `hybrid`。Vim 側は `has_japanese` 分岐だけ |
| `TinySegmenter`（クラス、`word-segmenter.ts`） | `autoload/hellshake_yano_vim/japanese.vim` | both | P2 | todo | `enableTinySegmenter`/`japaneseMergeThreshold`（P1）。`segment(t, {mergeParticles})` の助詞結合は Vim 側にない。`s:fallback_segment` は文字種で区切るだけ |
| `tinysegmenter`（インスタンス、`word-segmenter.ts`） | `autoload/hellshake_yano_vim/japanese.vim` | both | P2 | todo | 上のシングルトン |
| `KeyBasedWordCache`（クラス、`word-cache.ts`） | `autoload/hellshake_yano_vim/word_detector.vim` | both | P3 | todo | `s:word_cache`（TTL 付き）が近い |
| `globalWordCache`（インスタンス、`word-cache.ts`） | `autoload/hellshake_yano_vim/word_detector.vim` | both | P3 | todo | |
| `getCharType`（`word-char-utils.ts`） | `autoload/hellshake_yano_vim/japanese.vim` | both | P2 | todo | `s:get_character_type` が対応 |
| `analyzeString`（`word-char-utils.ts`） | missing | both | P2 | todo | |
| `findBoundaries`（`word-char-utils.ts`） | missing | both | P2 | todo | |
| `shouldMerge`（`word-char-utils.ts`） | missing | both | P2 | todo | `japaneseMergeThreshold`（P1） |
| `clearCharTypeCache`（`word-char-utils.ts`） | missing | both | P3 | todo | |
| `isHiragana`（`word-char-utils.ts`） | `autoload/hellshake_yano_vim/japanese.vim` | both | P2 | todo | `s:is_japanese_char` が対応 |
| `isKatakana`（`word-char-utils.ts`） | `autoload/hellshake_yano_vim/japanese.vim` | both | P2 | todo | 同上 |
| `isKanji`（`word-char-utils.ts`） | `autoload/hellshake_yano_vim/japanese.vim` | both | P2 | todo | 同上 |
| `isAlphanumeric`（`word-char-utils.ts`） | `autoload/hellshake_yano_vim/japanese.vim` | both | P2 | todo | `s:get_character_type` が対応。`validator.ts` にも同名がある |
| `isSymbol`（`word-char-utils.ts`） | `autoload/hellshake_yano_vim/japanese.vim` | both | P2 | todo | 同上 |
| `isSpace`（`word-char-utils.ts`） | `autoload/hellshake_yano_vim/japanese.vim` | both | P2 | todo | 同上 |
| `containsJapanese`（`word-char-utils.ts`） | `autoload/hellshake_yano_vim/japanese.vim` | both | P2 | todo | `has_japanese` が対応 |
| `isAllJapanese`（`word-char-utils.ts`） | missing | both | P3 | todo | |

### `denops/hellshake-yano/neovim/core/window.ts`, `neovim/dictionary.ts`

| export | vim script file | target | priority | status | notes |
|---|---|---|---|---|---|
| `isValidBuffer` | `autoload/hellshake_yano_vim/util.vim` | both | P3 | todo | `is_valid_buffer` が対応 |
| `shouldUseMultiWindowMode` | `autoload/hellshake_yano_vim/core.vim` | both | P2 | todo | `multiWindowMode`（P1） |
| `getVisibleWindows` | `autoload/hellshake_yano_vim/window_detector.vim` | both | P2 | todo | `multiWindowExcludeTypes`/`multiWindowMaxWindows`（P1）。nvim の floating window 除外は失敗中（Baseline 参照） |
| `getWindowVisibleLines` | `autoload/hellshake_yano_vim/word_detector.vim` | both | P2 | todo | |
| `initializeDictionarySystem` | missing | both | P2 | todo | 起動時に `dictionaryPath`（P1）を読む |
| `reloadDictionary` | `autoload/hellshake_yano_vim/dictionary.vim` | both | P2 | todo | dispatcher の同名メソッドの実体 |
| `addToDictionary` | `autoload/hellshake_yano_vim/dictionary.vim` | both | P3 | todo | 同上 |
| `editDictionary` | missing | both | P3 | todo | 同上 |
| `showDictionary` | `autoload/hellshake_yano_vim/dictionary.vim` | both | P3 | todo | 同上 |
| `validateDictionary` | `autoload/hellshake_yano_vim/dictionary.vim` | both | P3 | todo | 同上 |
| `isInDictionary` | `autoload/hellshake_yano_vim/dictionary.vim` | both | P2 | todo | 同上 |

### `denops/hellshake-yano/neovim/display/*.ts`

| export | vim script file | target | priority | status | notes |
|---|---|---|---|---|---|
| `displayHintsOptimized` | `autoload/hellshake_yano_vim/display.vim` | Lua | P2 | todo | `s:show_hint_neovim`（`nvim_buf_set_extmark`）が 1 件ずつ。バッチ描画はない |
| `displayHintsAsync` | missing | Lua | P3 | todo | 非同期描画はない |
| `hideHints` | `autoload/hellshake_yano_vim/display.vim` | Lua | P2 | todo | `hide_all` が対応 |
| `highlightCandidateHintsAsync` | `autoload/hellshake_yano_vim/display.vim` | Lua | P2 | todo | `highlight_partial_matches` が対応 |
| `highlightCandidateHintsHybrid` | `autoload/hellshake_yano_vim/display.vim` | Lua | P2 | todo | 同上 |
| `isRenderingHints` | missing | Lua | P3 | todo | |
| `abortCurrentRendering` | missing | Lua | P3 | todo | |
| `cleanupPendingTimers` | missing | Lua | P3 | todo | |
| `clampMarkPosition` | missing | Lua | P2 | todo | nvim の `E5555: Invalid 'col'` は Vim 側で未対応（Baseline の `test_display_multi.vim`） |
| `resetExtmarkClampWarnCounter` | missing | Lua | P3 | todo | |
| `resetExtmarkSetFailCounter` | missing | Lua | P3 | todo | |
| `displayHintsMultiBuffer` | `autoload/hellshake_yano_vim/display.vim` | Lua | P2 | todo | `multiWindowMode`（P1）。Vim 側は `show_hint_with_window` だけ |
| `processExtmarksForBuffer` | missing | Lua | P2 | todo | 同上 |
| `clearHintsMultiBuffer` | `autoload/hellshake_yano_vim/display.vim` | Lua | P2 | todo | `hide_all` が近い |
| `clearHintsForBuffers` | missing | Lua | P3 | todo | |
| `hideHintsMultiBuffer` | `autoload/hellshake_yano_vim/display.vim` | Lua | P2 | todo | `hide_all` が近い |
| `displayHintsAutoMultiBuffer` | missing | Lua | P2 | todo | `multiWindowMode`（P1）で単一/複数バッファを自動選択 |
| `getMultiBufferExtmarkState` | missing | Lua | P3 | todo | |
| `getSingleBufferExtmarkState` | missing | Lua | P3 | todo | |
| `clearSingleBufferExtmarkState` | missing | Lua | P3 | todo | |
| `clearHintDisplayTracked` | missing | Lua | P3 | todo | |
| 定数（`EXTMARK_CLAMP_WARN_INTERVAL`, `EXTMARK_SET_FAIL_LOG_INTERVAL`, `HIGHLIGHT_BATCH_SIZE`, `MAX_HINT_LENGTH`, `DEFAULT_HINT_PRIORITY`, `MULTI_WINDOW_LINE_OFFSET`, `DEFAULT_HINT_COUNT`, `MULTI_BUFFER_EXTMARK_STATE`） | missing | Lua | P3 | todo | |
| `ExtmarkDisplayAdapter`（クラス、`extmark-display-adapter.ts`） | `autoload/hellshake_yano_vim/display.vim` | Lua | P2 | todo | `hintPosition` 対応は未対応 |
| `HighlightManager`（クラス、`highlight.ts`） | `autoload/hellshake_yano_vim/display.vim` | Lua | P2 | todo | `highlightHintMarker`/`highlightHintMarkerCurrent`（P1、dict 形式 `{'bg','fg'}`）。`highlightSelected`（P1）は Vim 側で未対応。ブリッジに `hellshake_yano#highlight#*` |

### `denops/hellshake-yano/vim/**/*.ts`

| export | vim script file | target | priority | status | notes |
|---|---|---|---|---|---|
| `VimPopupDisplay`（クラス、`display/popup-display.ts`） | `autoload/hellshake_yano_vim/display.vim` | Vim9 | P2 | todo | `s:show_hint_vim`（`popup_create`）が対応。Vim 層で `new VimPopupDisplay` |
| `PopupDisplayAdapter`（クラス、`display/popup-display.ts`） | `autoload/hellshake_yano_vim/display.vim` | Vim9 | P3 | todo | `new PopupDisplayAdapter` は grep で出ない（未検証） |
| `VimHighlight`（クラス、`display/highlight.ts`） | `autoload/hellshake_yano_vim/display.vim` | Vim9 | P2 | todo | `s:define_highlight_group` が対応 |
| `VimMotion`（クラス、`features/motion.ts`） | `autoload/hellshake_yano_vim/motion.vim` | both | P3 | todo | `new VimMotion` は grep で出ない（未検証） |
| `VimMotionDetector`（クラス、`features/motion.ts`） | `autoload/hellshake_yano_vim/motion.vim`, `key_repeat.vim` | both | P2 | todo | Vim 層・Neovim 層の両方で `new VimMotionDetector`。`setPerKeyMotionCount`/`getMotionCountForKey`（`perKeyMotionCount`、P1）と `suppressOnKeyRepeat` 系。`motion#get_motion_count`、`s:handle_key_repeat_detection` が対応 |
| `VimVisual`（クラス、`features/visual.ts`） | `autoload/hellshake_yano_vim/visual.vim` | both | P3 | todo | 両層で `new VimVisual` |
| `VimJapaneseSupport`（クラス、`features/japanese.ts`） | `autoload/hellshake_yano_vim/japanese.vim` | n/a(未使用: `new VimJapaneseSupport` が grep で出ない) | n/a | todo | |
| `VimBridge`（クラス、`bridge/vim-bridge.ts`） | — | n/a(未使用: `new VimBridge` が grep で出ない) | n/a | todo | `detectWords` が `detectWordsVisible` に対応していた |
| `ConfigMapper`（クラス、`config/config-mapper.ts`） | `autoload/hellshake_yano_vim/config.vim` | n/a(`Initializer` からのみ使用。user config は全キー camelCase) | n/a | todo | `s:map_key_to_ts`/`s:map_config_from_ts` が 11 キーだけ対応している |
| `ConfigMigrator`（クラス、`config/config-migrator.ts`） | missing | n/a(`Initializer` からのみ使用) | n/a | todo | `migrate`/`backupOldConfig`/`showMigrationGuide` |
| `ConfigUnifier`（クラス、`config/config-unifier.ts`） | missing | n/a(`Initializer` からのみ使用) | n/a | todo | `unify` |

### `denops/hellshake-yano/integration/*.ts`

| export | vim script file | target | priority | status | notes |
|---|---|---|---|---|---|
| `Initializer`（クラス） | `plugin/hellshake-yano-unified.vim` | n/a(denops の起動制御。plugin/ の入口が担う) | n/a | todo | |
| `EnvironmentDetector`（クラス） | `autoload/hellshake_yano_vim/core.vim` | n/a(同上) | n/a | todo | Vim 側は `core#is_denops_ready` と各モジュールの `has_denops` |
| `ImplementationSelector`（クラス） | `plugin/hellshake-yano-unified.vim` | n/a(同上) | n/a | todo | `legacyMode` 判定 |
| `CommandRegistry`（クラス） | `plugin/*.vim` | n/a(同上。登録先の dispatcher メソッドも存在しない) | n/a | todo | コマンドの節を参照 |
| `MappingManager`（クラス） | `plugin/*.vim` | n/a(同上。`handleMotion` が存在しない) | n/a | todo | マッピングの節を参照 |

### `denops/hellshake-yano/common/**/*.ts`

| export | vim script file | target | priority | status | notes |
|---|---|---|---|---|---|
| `initializeDebugMode`（`utils/logger.ts`） | missing | both | P2 | todo | `debugMode`/`debugLogFile`（P1）を `g:hellshake_yano` から読む。`util#debug_log` は別変数 `g:hellshake_yano_debug` だけを見る |
| `setDebugMode`（`utils/logger.ts`） | missing | both | P3 | todo | |
| `getDebugMode`（`utils/logger.ts`） | `autoload/hellshake_yano_vim/util.vim` | both | P2 | todo | `util#debug_log` 内の判定が近い |
| `logMessage`（`utils/logger.ts`） | `autoload/hellshake_yano_vim/util.vim` | both | P2 | todo | `util#debug_log` が対応。`debugLogFile`（P1）へのファイル出力はない |
| `recordPerformance`（`utils/performance.ts`） | missing | both | P3 | todo | `performanceLog` は user config にない |
| `getPerformanceMetrics`（`utils/performance.ts`） | missing | both | P3 | todo | 同上 |
| `resetPerformanceMetrics`（`utils/performance.ts`） | missing | both | P3 | todo | 同上 |
| `collectDebugInfo`（`utils/performance.ts`） | missing | both | P3 | todo | |
| `clearDebugInfo`（`utils/performance.ts`） | missing | both | P3 | todo | |
| `getWordsCache`（`utils/performance.ts`） | `autoload/hellshake_yano_vim/word_detector.vim` | both | P3 | todo | `s:word_cache` が近い |
| `getHintsCache`（`utils/performance.ts`） | `autoload/hellshake_yano_vim/hint_generator.vim` | both | P3 | todo | `s:hint_cache` が近い |
| `clearCaches`（`utils/performance.ts`） | `autoload/hellshake_yano_vim/word_detector.vim`, `hint_generator.vim` | both | P3 | todo | 各 `clear_cache` が対応 |
| `detectWordsOptimized`（`utils/performance.ts`） | `autoload/hellshake_yano_vim/word_detector.vim` | both | P2 | todo | キャッシュ付きラッパー |
| `generateHintsOptimized`（`utils/performance.ts`） | `autoload/hellshake_yano_vim/hint_generator.vim` | both | P2 | todo | 同上 |
| `generateHintsFromConfigOptimized`（`utils/performance.ts`） | `autoload/hellshake_yano_vim/hint_generator.vim` | both | P2 | todo | 同上 |
| `generateHintsFromConfig`（`utils/performance.ts`） | `autoload/hellshake_yano_vim/hint_generator.vim` | both | P2 | todo | `generate` が対応 |
| `validateRange`（`utils/validator.ts`） | missing | both | P3 | todo | |
| `validateNonEmpty`（`utils/validator.ts`） | missing | both | P3 | todo | |
| `validateInList`（`utils/validator.ts`） | missing | both | P3 | todo | |
| `validateHighlightGroupName`（`utils/validator.ts`） | missing | both | P2 | todo | `highlightHintMarker`（P1）の検証。ブリッジに `hellshake_yano#validation#*` |
| `isValidColorName`（`utils/validator.ts`） | missing | both | P2 | todo | user 値 `black`/`Red`/`White` |
| `isValidHexColor`（`utils/validator.ts`） | missing | both | P2 | todo | user 値 `#57FD14` |
| `validateHighlightColor`（`utils/validator.ts`） | missing | both | P2 | todo | ブリッジに `hellshake_yano#validation#color_value` |
| `normalizeColorName`（`utils/validator.ts`） | missing | both | P3 | todo | |
| `generateHighlightCommand`（`utils/validator.ts`） | `autoload/hellshake_yano_vim/display.vim` | both | P2 | todo | `{'bg', 'fg'}` を `highlight` コマンドにする。`s:define_highlight_group` が近い（dict 形式の扱いは未検証） |
| `validateHighlightConfig`（`utils/validator.ts`） | missing | both | P2 | todo | |
| `isValidSymbol`（`utils/validator.ts`） | missing | both | P3 | todo | |
| `isAlphanumeric`（`utils/validator.ts`） | missing | both | P3 | todo | `word-char-utils.ts` にも同名がある |
| `isDigit`（`utils/validator.ts`） | missing | both | P3 | todo | |
| `isWhitespace`（`utils/validator.ts`） | missing | both | P3 | todo | |
| `isControlCharacter`（`utils/validator.ts`） | missing | both | P3 | todo | 入力解析で使う。input.vim は `getchar`+`nr2char` だけ |
| `validateConfig`（`utils/validator.ts`） | missing | both | P3 | todo | `config.ts` の同名と別物 |
| `resolveConfigType`（`utils/config.ts`） | missing | both | P3 | todo | |
| `handleError`（`utils/error-handler.ts`） | `autoload/hellshake_yano_vim/util.vim` | both | P3 | todo | `show_error`/`show_warning`/`show_info` だけ |
| `batchGet`（`utils/batch.ts`） | — | n/a(denops の batch API 依存) | n/a | todo | |
| `callAtomic`（`utils/batch.ts`） | — | n/a(denops の batch API 依存) | n/a | todo | |
| `getSingletonInstance`（`utils/base.ts`） | — | n/a(TS 内部ユーティリティ) | n/a | todo | |
| `initializeState`（`utils/base.ts`） | — | n/a(TS 内部ユーティリティ) | n/a | todo | |
| `getStateCopy`（`utils/base.ts`） | — | n/a(TS 内部ユーティリティ) | n/a | todo | |
| `withFallback`（`utils/base.ts`） | — | n/a(TS 内部ユーティリティ) | n/a | todo | |
| `validateRangeCompat`（`utils/base.ts`） | — | n/a(TS 内部ユーティリティ) | n/a | todo | |
| `validateNonEmptyCompat`（`utils/base.ts`） | — | n/a(TS 内部ユーティリティ) | n/a | todo | |
| `validateInListCompat`（`utils/base.ts`） | — | n/a(TS 内部ユーティリティ) | n/a | todo | |
| `SideEffectChecker`（クラス、`utils/side-effect.ts`） | — | n/a(未使用: `new SideEffectChecker` が grep で出ない) | n/a | todo | |
| `LRUCache`（クラス、`cache/unified-cache.ts`） | missing | both | P3 | todo | 各モジュールが `s:` の dict を個別に持っている |
| `GlobalCache`（クラス、`cache/unified-cache.ts`） | missing | both | P3 | todo | 同上 |
| `UnifiedCache`（インスタンス、`cache/unified-cache.ts`） | missing | both | P3 | todo | 同上 |
| `vimScriptToDenops`（`types/word.ts`） | — | n/a(TS↔Vim script のデータ変換) | n/a | todo | |
| `denopsToVimScript`（`types/word.ts`） | — | n/a(TS↔Vim script のデータ変換) | n/a | todo | |
| `isVimScriptWord`（`types/word.ts`） | — | n/a(TS↔Vim script のデータ変換) | n/a | todo | |
| `isDenopsWord`（`types/word.ts`） | — | n/a(TS↔Vim script のデータ変換) | n/a | todo | |
| `createDefaultMotionState`（`types/state.ts`） | `autoload/hellshake_yano_vim/motion.vim` | both | P3 | todo | |

### `denops/hellshake-yano/types.ts`, `cache.ts`, `validation-utils.ts`

| export | vim script file | target | priority | status | notes |
|---|---|---|---|---|---|
| `asByteCol` | — | n/a(ブランド型の変換) | n/a | todo | |
| `asCharCol` | — | n/a(ブランド型の変換) | n/a | todo | |
| `asZeroLine` | — | n/a(ブランド型の変換) | n/a | todo | |
| `asOneLine` | — | n/a(ブランド型の変換) | n/a | todo | |
| `oneLineToZeroLine` | — | n/a(ブランド型の変換) | n/a | todo | |
| `zeroLineToOneLine` | — | n/a(ブランド型の変換) | n/a | todo | |
| `isWord` | — | n/a(型ガード) | n/a | todo | |
| `isWindowInfo` | — | n/a(型ガード) | n/a | todo | |
| `isHintMapping` | — | n/a(型ガード) | n/a | todo | |
| `isConfig` | — | n/a(型ガード) | n/a | todo | |
| `isHintPosition` | — | n/a(型ガード) | n/a | todo | |
| `isDetectionStrategy` | — | n/a(型ガード) | n/a | todo | |
| `DEFAULT_HINT_MARKERS` | `autoload/hellshake_yano_vim/hint_generator.vim` | both | P3 | todo | |
| `cache.ts`, `validation-utils.ts`（`export * from`） | — | n/a(再エクスポート) | n/a | todo | |

## 設定キー

`Config` 型（`common/types/config.ts`）の全 51 キーと、型にないが `g:hellshake_yano` から読まれるキー 3 つ。user value は init.vim の値。vim script file は `g:hellshake_yano` のそのキーを読んでいる `autoload/hellshake_yano_vim/` のファイル。

| key | type | default | user value | vim script file | target | priority | status | notes |
|---|---|---|---|---|---|---|---|---|
| `enabled` | boolean | `true` | — | `autoload/hellshake_yano_vim/config.vim`, `core.vim` | both | P2 | todo | `plugin/hellshake-yano.vim` も起動時に見る |
| `markers` | string[] | `A`〜`Z` | — | `autoload/hellshake_yano_vim/config.vim` | both | P3 | todo | `hint_chars` から文字列⇔配列で変換される |
| `motionCount` | number | `3` | — | `autoload/hellshake_yano_vim/config.vim` | both | P3 | todo | `perKeyMotionCount`/`defaultMotionCount` が優先。motion.vim は読まない |
| `motionTimeout` | number | `2000` | — | `autoload/hellshake_yano_vim/config.vim`, `motion.vim` | both | P2 | todo | `VimMotionDetector` のタイムアウト |
| `hintPosition` | `start`/`end`/`overlay`/`both` | `start` | — | missing | both | P3 | todo | `calculateHintPosition` 未対応 |
| `triggerOnHjkl` | boolean | `true` | — | missing | both | P3 | todo | |
| `countedMotions` | string[] | `[]` | — | missing | both | P2 | todo | `plugin/hellshake-yano-unified.vim` のマッピング対象。空なら `w` `b` `e` |
| `maxHints` | number | `336` | — | `autoload/hellshake_yano_vim/config.vim` | both | P2 | todo | ヒント数の上限。core.vim での参照は grep で出なかった |
| `debounceDelay` | number | `50` | — | missing | both | P3 | todo | |
| `useNumbers` | boolean | `false` | — | missing | both | P3 | todo | |
| `directionalHintFilter` | boolean | `false` | `v:true` | `autoload/hellshake_yano_vim/core.vim` | both | P1 (user config) | todo | `filter#by_direction` が対応。ブリッジは `directional_hint_filter` と相互変換する |
| `highlightSelected` | boolean | `false` | `v:true` | missing | both | P1 (user config) | todo | Vim 側 `display.vim` は `highlightHintMarker(Current)` だけ扱い、`highlightSelected` は未対応 |
| `debugCoordinates` | boolean | `false` | — | missing | both | P3 | todo | |
| `singleCharKeys` | string[] | `A S D F G H J K L N M 0`〜`9` | `'/'`（文字列） | `autoload/hellshake_yano_vim/hint_generator.vim` | both | P1 (user config) | todo | 型は `string[]` だが user は文字列で渡す。ブリッジ `plugin/hellshake-yano.vim` の `s:normalize_key_collection` が配列化する。Vim 側 `hint_generator.vim` の扱いは未検証 |
| `multiCharKeys` | string[] | `B C E I O Q R T U V W X Y Z` | `'BCDEGHJKLMNOQRSUWZ'`（文字列） | `autoload/hellshake_yano_vim/hint_generator.vim` | both | P1 (user config) | todo | 同上 |
| `maxSingleCharHints` | number? | `21` | — | missing | both | P3 | todo | Vim 側未対応 |
| `cancelKeys` | string[]? | `[]` | `['y','p','x','v','a','i','f','F','t','T','<CR>','0'〜'9']` | missing | both | P1 (user config) | todo | `core.ts` の `isConfiguredCancelKey`。Vim 側 `input.vim` は一致しない入力で break するだけ。ブリッジが `singleCharKeys`/`multiCharKeys` との重複を検査する |
| `useHintGroups` | boolean | `true` | `v:true` | missing | both | P1 (user config) | todo | `core.ts` の `waitForUserInput` 内の分岐。Vim 側にない |
| `continuousHintMode` | boolean | `false` | `v:false` | missing | both | P1 (user config) | todo | `postJumpHandler`。Vim 側にない。user 値は既定と同じ |
| `recenterCommand` | string | `normal! zz` | `'normal! zz'` | missing | both | P1 (user config) | todo | `executeRecenterCommand`。Vim 側にない。user 値は既定と同じ。ブリッジが空文字を既定に戻す |
| `maxContinuousJumps` | number | `50` | `25` | missing | both | P1 (user config) | todo | Vim 側にない |
| `highlightHintMarker` | string または `{bg,fg,ctermbg,ctermfg}` | `DiffAdd` | `{'bg': 'black', 'fg': '#57FD14'}` | `autoload/hellshake_yano_vim/display.vim` | both | P1 (user config) | todo | `s:define_highlight_group` が対応。dict 形式・HEX 色の扱いは未検証 |
| `highlightHintMarkerCurrent` | string または `{bg,fg,ctermbg,ctermfg}` | `DiffText` | `{'bg': 'Red', 'fg': 'White'}` | `autoload/hellshake_yano_vim/display.vim` | both | P1 (user config) | todo | 同上 |
| `suppressOnKeyRepeat` | boolean | `true` | — | `autoload/hellshake_yano_vim/motion.vim` | both | P2 | todo | 既定 true なので user の経路で動く。motion.vim が読んで `key_repeat.vim` に渡す |
| `keyRepeatThreshold` | number | `50` | — | `autoload/hellshake_yano_vim/motion.vim` | both | P2 | todo | 同上 |
| `keyRepeatResetDelay` | number | `300` | — | `autoload/hellshake_yano_vim/motion.vim` | both | P2 | todo | 同上 |
| `useJapanese` | boolean | `false` | `v:true` | `autoload/hellshake_yano_vim/config.vim` | both | P1 (user config) | todo | word_detector.vim は `has_japanese` で判定し、このキーを読まない。`japanese#segment` は denops の `segmentJapaneseText` を優先する |
| `wordDetectionStrategy` | `regex`/`tinysegmenter`/`hybrid` | `hybrid` | — | missing | both | P2 | todo | 既定 hybrid が user の経路。Vim 側は `has_japanese` 分岐だけ |
| `enableTinySegmenter` | boolean | `true` | `v:true` | missing | both | P1 (user config) | todo | user 値は既定と同じ。Vim 側に TinySegmenter はなく `s:fallback_segment` |
| `segmenterThreshold` | number | `4` | `3` | missing | both | P1 (user config) | todo | Vim 側未対応 |
| `japaneseMinWordLength` | number | `2` | `5` | `autoload/hellshake_yano_vim/word_detector.vim` | both | P1 (user config) | todo | |
| `japaneseMergeParticles` | boolean | `true` | — | missing | both | P2 | todo | 既定 true。助詞結合は Vim 側にない |
| `japaneseMergeThreshold` | number | `2` | `3` | missing | both | P1 (user config) | todo | Vim 側未対応 |
| `perKeyMinLength` | Record<string, number>? | `{}` | `{'w': 3, 'b': 3, 'e': 3}` | `autoload/hellshake_yano_vim/word_detector.vim` | both | P1 (user config) | todo | `get_min_length`/`s:get_min_length_local` が対応。core.vim は `get_min_length('')` で呼ぶため per-key が効かない可能性（未検証） |
| `defaultMinWordLength` | number | `3` | `3` | `autoload/hellshake_yano_vim/config.vim`, `word_detector.vim` | both | P1 (user config) | todo | user 値は既定と同じ |
| `perKeyMotionCount` | Record<string, number>? | `{}` | `{'w','b','e','h','j','k','l': 2}` | `autoload/hellshake_yano_vim/motion.vim` | both | P1 (user config) | todo | `motion#get_motion_count` が対応。`h`/`j`/`k`/`l` はマッピング対象（`countedMotions`）に入っていないと効かない（未検証） |
| `defaultMotionCount` | number | `3` | `3` | `autoload/hellshake_yano_vim/motion.vim` | both | P1 (user config) | todo | user 値は既定と同じ |
| `currentKeyContext` | string? | （未設定） | — | missing | both | P3 | todo | 実行時に denops 内部で設定される |
| `motionCounterEnabled` | boolean | `true` | — | missing | both | P2 | todo | `plugin/hellshake-yano-unified.vim` がマッピング有効化に使う |
| `motionCounterThreshold` | number | `3` | — | missing | both | P3 | todo | |
| `motionCounterTimeout` | number | `2000` | — | missing | both | P3 | todo | |
| `showHintOnMotionThreshold` | boolean | `true` | — | missing | both | P2 | todo | 既定 true |
| `debugMode` | boolean | `false` | `v:false` | `autoload/hellshake_yano_vim/config.vim` | both | P1 (user config) | todo | `util#debug_log` と core.vim は別変数 `g:hellshake_yano_debug` を見る。user 値は既定と同じ |
| `debugLogFile` | string? | （未設定） | `'/tmp/hellshake-yano-debug.log'` | missing | both | P1 (user config) | todo | `logger.ts` のファイル出力。Vim 側にない |
| `performanceLog` | boolean | `false` | — | missing | both | P3 | todo | |
| `debug` | boolean? | `false` | — | missing | both | P3 | todo | `debugMode` と重複。Vim 側は別変数 `g:hellshake_yano_debug` |
| `useNumericMultiCharHints` | boolean? | `false` | `v:true` | `autoload/hellshake_yano_vim/hint_generator.vim` | both | P1 (user config) | todo | `s:generate_numeric_hints` が対応（上限 +100） |
| `bothMinWordLength` | number? | `5` | — | missing | both | P3 | todo | `hintPosition: both` 用。ブリッジが `both_min_word_length` と相互変換する |
| `multiWindowMode` | boolean | `false` | `v:true` | `autoload/hellshake_yano_vim/config.vim`, `core.vim` | both | P1 (user config) | todo | core.vim の分岐。`toggleMultiWindowMode` 等はない |
| `multiWindowExcludeTypes` | string[] | `help quickfix terminal popup nofile` | `['help', 'quickfix', 'terminal', 'popup']` | `autoload/hellshake_yano_vim/config.vim`, `window_detector.vim` | both | P1 (user config) | todo | user 値に `nofile` がない。nvim の floating window 除外は失敗中（Baseline 参照） |
| `multiWindowMaxWindows` | number | `4` | `4` | `autoload/hellshake_yano_vim/config.vim`, `window_detector.vim` | both | P1 (user config) | todo | user 値は既定と同じ |
| `dictionaryPath` | （`Config` 型にない） | （なし） | `'~/.config/nvim/dictionary.yaml'` | `autoload/hellshake_yano_vim/dictionary.vim` | both | P1 (user config) | todo | `Config`/`DEFAULT_CONFIG` にはない。`neovim/core/word.ts` の `VimConfigBridge.getConfig` が `g:hellshake_yano.dictionaryPath`（旧 `g:hellshake_yano_dictionary_path`）を読み、`DictionaryLoader` と `core.ts` の `registerDictionaryCommands` 後の読み込みで使う（`DictionaryConfig.dictionaryPath`）。Vim 側は読み込みを denops に委譲するだけ |
| `legacyMode` | （`Config` 型にない） | `v:false` 扱い | — | missing | n/a(denops の実装選択) | n/a | todo | `main.ts` が `get(g:hellshake_yano, 'legacyMode', v:false)` で読み、`Initializer` に `legacy` を渡す。`word.ts` の `legacyMode` オプションとは別物 |
| `visualModeEnabled` | （`Config` 型にない） | `v:true` 扱い | — | （`plugin/*.vim` 内） | both | P3 | todo | `plugin/hellshake-yano-unified.vim`・`plugin/hellshake-yano-vim.vim` が `<Leader>h` の有効化に使う。`config-mapper.ts`/`config-unifier.ts` が `visual_mode_enabled` から変換する |

`plugin/hellshake-yano.vim` が `g:hellshake_yano` に書き込む snake_case キー（`key_repeat_threshold`、`key_repeat_reset_delay`、`suppress_on_key_repeat`、`motion_count`、`motion_timeout`、`per_key_min_length`、`min_word_length`、`per_key_motion_count`、`default_motion_count`、`directional_hint_filter`、`both_min_word_length`）と `multiWindowRestoreDelay`・`multiWindowDetectFocusGained` は、denops の `Config` 型にないので表に入れていない。ブリッジ層の都合であり、S1 では触らない。

## Baseline

S1 時点（denops 削除前）に `scripts/test-vim.sh` と `scripts/test-nvim.sh` を実行した結果。

- 両スクリプトとも exit 1 で終わる。原因は S1 より前からある失敗で、S1 の変更によるものではない。
- 内訳は Vim が PASS 23 / FAIL 17 / SKIP 13、Neovim が PASS 22 / FAIL 18 / SKIP 13。
- FAIL のうち、`test_runner.vim` を使うファイルには意図的な自己テスト失敗 3 件（`Test_AssertEqual_failure`、`Test_AssertTrue_failure`、`Test_AssertFalse_failure`）が必ず混ざる。詳細は下の「test_runner.vim 由来の失敗」。

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
