# Dispatcher Integration Lessons

**ミッション**: hellshake-yano dispatcher integration debugging
**完了日**: 2026-03-30
**参照コミット**: e07cd0c

---

## 重要な発見

### L1: VimScript↔TypeScript snake_case/camelCase 不一致（High Priority）

**問題**: VimScript は snake_case、TypeScript は camelCase。config.ts の `normalizeLegacyKeys()` で変換が必要だが、新キー追加時に漏れやすい。

**実例**: `per_key_motion_count` → `perKeyMotionCount`、`reset_delay` → `resetDelay`

**対策**: 新 config 項目追加時は必ず `normalizeLegacyKeys()` に変換ルールを追加。

### L2: dispatcher 未登録関数のフォールバック隠蔽（Critical）

**問題**: dispatcher 関数未登録 → `denops#request` 例外 → catch → VimScript フォールバックで動作。関数登録すると Denops パスが有効になり TS 側の不完全実装が露呈。

**対策**: dispatcher 関数追加時はフォールバックパスとの動作等価性を検証。

**実例**: `motionDetect` 追加後、perKeyMotionCount 未対応・カウントリセット漏れが発覚。

### L3: denops#notify vs denops#request

- `denops#notify`: fire-and-forget、戻り値不可、`silent!` で安全化可能
- `denops#request`: 同期、戻り値必須時に使用、`silent!` 不可（戻り値消失）
- `motionDetect` は `shouldShowHints` 戻り値が必要 → `denops#request` 必須

### L4: Neovim extmark vs Vim popup

- Vim: `popup_create()` / Neovim: `nvim_buf_set_extmark()` virt_text
- 座標: Vim=1-indexed / Neovim=0-indexed
- カウント: Vim=`popup_list()` / Neovim=`currentHints.length`

### L5: VimMotionDetector 初期化

- コンストラクタ: `config.motionTimeout`, `config.motionCount`
- `perKeyMotionCount` は `setPerKeyMotionCount()` で別途設定必須
- Vim 層・Neovim 層で同一初期化手順を踏むこと

### L6: ヒント表示リグレッション（未解決）

- `motionDetect` Neovim 層登録後、w キー 2 回押しでヒント非表示
- perKeyMotionCount 対応・カウントリセット・snake_case 変換は修正済み
- Denops パスの motionDetect 戻り値 → `core#show()` フローに問題の可能性
- **次回セッションで要追加調査**
