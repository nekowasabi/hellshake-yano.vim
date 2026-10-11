# Vim9 ネイティブ実装の検証チェックポイント

2026-10-11。S3 の opt-in 実装です。標準起動経路の切替と denops 削除はまだ行っていません。

## 実装範囲

- `autoload/hellshake_yano/native/`: Vim9 の設定、ヒント生成・距離割当、単語検出、TinySegmenter、popup、入力、motion、辞書、dispatcher。
- 実行時依存は Vim の組込み機能と同梱データのみ。Deno、Lua、外部コマンドでの単語処理は不要。
- 型と値を確認した設定を読み込み、既存の設定キー・デフォルト値・主要 snake_case 別名を維持。
- popup はウィンドウごとに作成。同じ buffer の複数表示でもラベルを分離。取消、古い changedtick、閉じたウィンドウ、UTF-8 継続バイトへの移動を検査。
- 連続ジャンプは回数制限付き。入力待ちはタイムアウトと取消に対応。通常キーだけでなく矢印などの特殊キーも回帰テスト。
- マッピングとコマンドは未定義の場合だけ作成。解除時も自分の定義と一致するものだけ削除。
- `autoload/hellshake_yano_vim/*` の既存関数は別の opt-in transport から呼び出せる。未指定時と他プラグイン宛ての呼出しは従来の Denops に委譲。
- Vim の旧 dispatcher の display API は、Neovim と異なる「指定ラベル以外を閉じる」部分一致処理を維持。新 runtime の prefix 表示とは分離している。
- 辞書は JSON、text、および Lua と同じデータ専用 YAML 部分集合を読込。書込みは JSON のみ。未知フィールドを保持し、非 regular file、破損、容量超過、観測した同時変更を拒否。独立した private staging directory と fsync 後の rename を使う。変更比較と rename は OS の atomic compare-and-swap ではないため、すべての外部競合を防げるとは主張しない。
- 辞書 timestamp は Vim のタイムゾーンオフセットを付けた ISO-8601。Lua の UTC `Z` 表記とは文字列表現が異なる。

## 明示的な試用

既存プラグインの command/mapping と混在させず、`vim -N -u NONE -i NONE -n` で試す。
リポジトリを runtimepath に追加した後、以下を実行する。

```vim
call hellshake_yano#native#runtime#Setup({'useJapanese': v:true})
call hellshake_yano#native#runtime#Activate()
call hellshake_yano#native#runtime#Show()
```

既存の `hellshake_yano_vim#*` 関数を試す場合だけ追加する。

```vim
call hellshake_yano#native#runtime#EnableBridge()
" 試用後
call hellshake_yano#native#runtime#DisableBridge()
call hellshake_yano#native#runtime#Deactivate()
```

この bridge は Neovim の `require('hellshake_yano').enable_bridge()` とは別。
`plugin/*.vim` の自動起動、既存 `HellshakeYano*` command の置換、通常の Vim 設定への導入はまだ切り替えていない。

## 検証

```sh
VIM_BIN=/path/to/full/vim scripts/test-vim9.sh
NVIM_BIN=/path/to/nvim scripts/test-lua.sh
VIM_BIN=/path/to/full/vim scripts/test-vim.sh
NVIM_BIN=/path/to/nvim scripts/test-nvim.sh
python3 scripts/test-vim-gate.py
```

- Debian 公式 Vim 9.1 パッケージと runtime を作業フォルダ内に展開し、それぞれ公開 SHA-256 と照合。システム設定は変更していない。パッケージ版は `9.1.1230-2`、含まれるパッチは `1-948, 950-1230, 1242, 1244`。
- 12 個の Vim9 単体スイート、4 個の実端末 UI スイート。100x30 の実 PTY 上で描画・日本語・同一 buffer の複数ウィンドウ・Normal/Visual の queued motion・辞書・設定プロファイルを検証。
- 既存 TypeScript / upstream を参照した比較: ヒント 500、TinySegmenter 1,000、後処理 2,016、単語抽出 3,042、正規表現部分集合 513、旧 dispatcher motion 1,000 ケース。一部をチェックイン済み fixture として継続実行。
- 旧 Vim / Neovim gate はいずれも PASS 21 / KNOWN 20 / FAIL 0 / SKIP 13。既知失敗を削除・拡張していない。
- Lua 15 スイートと実画面検証も継続実行。Vim9 移植中に確認した「YAML の二重 single quote の後に # / : / comma がある」読込不具合は両実装で修正。
- `profile-ui.vim` は既存資料から転記した合成設定。`HY_EVIDENCE_DIR` 指定時は Vim の runtimepath / scriptnames を記録する。実際のユーザー init.vim の検証ではない。

## 切替前に残る確認・判断

1. 元の Deno YAML parser と ECMAScript RegExp 全体との互換性は未達。anchors、aliases、block scalar、lookaround、lazy quantifier などは明示的に拒否。任意の既存辞書をそのまま扱えると保証しない。
2. ネイティブは明示した dictionaryPath を厳密に読み、破損時に失敗する。旧 Loader は標準 3 パスを先に検索し、エラーを無視してから明示パスへ進む。この優先順位とエラー方針は切替前に決める必要がある。
3. `mergeRules` / `compoundPatterns` はデータ保持のみ。現 TS tree の参照調査では型定義・読込・空値初期化以外の実行箇所を確認できなかった。「旧版で動作していた規則の実行を移植済み」とも「確実な既存機能欠落」とも扱わない。
4. ウィンドウ選別（現在 tab、現在 window 優先で上限適用）、TinySegmenter threshold、辞書 literal の独立ターゲット化など、Lua チェックポイントで記録した差異は引き続き要確認。
5. Vim の旧 Visual dispatcher は古い `<` / `>` marks を読む構造と block-mode 判定の問題がある。本変更は黙って意味を変えていない。新 runtime の同一 window Visual anchor はテスト済み。別 buffer にまたがる Visual 操作の UX は未決定。
6. 診断値はネイティブ dispatcher の測定範囲のみ。キャッシュ統計は未使用を示す 0。旧 motion timestamp は Vim の単調増加時計、debug timestamp は秒精度の Unix 時刻を ms 単位にした値。旧 Deno の時刻・測定履歴を再現するものではない。
7. `plugin/` の起動順・公開共通 `hellshake_yano#*` と Vim 専用 namespace の統合、通常起動での有効化、denops の物理削除、README の最終切替は未実施。
8. 実ユーザー init.vim の許可されたコピーが VM にない。最終 rtp / scriptnames 条件は合成設定だけでは満たさない。

これらは未完了の移行条件であり、API 名の対応数や単体テスト成功だけで S3/S4 完了とはしない。
