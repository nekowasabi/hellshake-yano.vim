# Phase 1.2 Config統合 調査ブリーフィング

**作成日**: 2026-01-25
**Mission ID**: ffa54b61

---

## Key Findings

### 1. 既存インフラが充実

TypeScript側に以下のconfig関連モジュールが既に存在:

- **config-mapper.ts** (225行): VimScript→TypeScript形式変換
- **config-unifier.ts** (169行): 設定統合
- **config-migrator.ts** (401行): 自動マイグレーション

Phase 1.1 dictionaryと異なり、**新規API追加は不要**の見込み。

### 2. キー名マッピング定義済み

config-mapper.tsに以下のマッピングが定義済み:

```typescript
const CONFIG_MAP = {
  "hint_chars": { key: "markers", transform: (v) => v.split("") },
  "motion_threshold": { key: "motionCount" },
  "motion_timeout_ms": { key: "motionTimeout" },
  "motion_keys": { key: "countedMotions" },
  "motion_enabled": { key: "motionCounterEnabled" },
  "visual_mode_enabled": { key: "visualModeEnabled" },
  "max_hints": { key: "maxHints" },
  "min_word_length": { key: "defaultMinWordLength" },
  "use_japanese": { key: "useJapanese" },
  "debug_mode": { key: "debugMode" },
};
```

### 3. dispatcher API存在

main.tsに以下のAPIが既に存在:
- `getConfig()` - 現在の設定を返す
- `updateConfig(cfg)` - 設定を更新
- `validateConfig(cfg)` - 設定を検証

### 4. 注意点: exclude_numbers

VimScript側の`exclude_numbers`はconfig-mapper.tsにマッピングがない。
TypeScript側のConfig型にも`excludeNumbers`は存在しない。

**対応方針**: マッピング追加、またはVimScript側でのみ処理

### 5. 既存テスト

`tests-vim/hellshake_yano_vim/test_config.vim` に23テストケースが存在。

テスト項目:
- デフォルト値取得
- set/get動作
- ユーザーオーバーライド
- 存在しないキー
- Phase A-5設定項目
- マルチウィンドウ設定

---

## アーキテクチャ決定

### VimScript側の役割（変更後）

```
VimScript (config.vim)
  |
  +-- get(key)
  |     |-- Denops ready? --> denops#request('getConfig')
  |     |-- Not ready?    --> s:default_config[key]
  |
  +-- set(key, value)
  |     |-- Update g:hellshake_yano_vim_config
  |     |-- Denops ready? --> denops#request('updateConfig')
  |
  +-- reload()
        |-- denops#request('getConfig')
        |-- Update g:hellshake_yano_vim_config
```

### 設定フロー

```
[Vim起動]
    |
    v
[VimScript: s:default_config読み込み]
    |
    v
[Denops初期化]
    |
    v
[TypeScript: g:hellshake_yano読み込み]
    |
    v
[ConfigUnifier: 設定統合]
    |
    v
[Core: 統合設定で動作]
```

---

## 関連ファイル

### VimScript
- `/autoload/hellshake_yano_vim/config.vim` (161行)

### TypeScript
- `/denops/hellshake-yano/config.ts` (625行)
- `/denops/hellshake-yano/vim/config/config-mapper.ts` (225行)
- `/denops/hellshake-yano/vim/config/config-unifier.ts` (169行)
- `/denops/hellshake-yano/vim/config/config-migrator.ts` (401行)
- `/denops/hellshake-yano/main.ts` (dispatcher定義)

### テスト
- `/tests-vim/hellshake_yano_vim/test_config.vim` (352行, 23テスト)

---

## 参照

- 計画書: `/home/takets/.claude/plans/spicy-dancing-ocean-agent-a8290e0.md`
- Phase 1.1参考: dictionary統合成功パターン
