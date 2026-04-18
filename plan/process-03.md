# Process 3: 全パターン行単位走査（join 廃止）

## Overview
`applyHintPatterns` (word.ts:1386-1458) 内で `lines.join("\n")` による全文字列化を廃止し、**全辞書パターンを行単位走査**に切り替える。数 MB の文字列生成を回避し、RegExp の内部解析コストも軽減。複数行パターン（`.source.includes("\\n")` 等）は例外的に従来の join ルートにフォールバック。

## Affected Files
- `denops/hellshake-yano/neovim/core/word.ts:1386-1458` — applyHintPatterns 本体
- `denops/hellshake-yano/neovim/core/word.ts:1402-1410` — pattern ループ
- `denops/hellshake-yano/neovim/core/word.ts:1490-1496` — findWordAtPosition（行単位呼び出しに調整）

## Implementation Notes
1. 判定ヘルパ `isMultilinePattern(re: RegExp): boolean`:
   - `re.source.includes("\\n")` or `re.flags.includes("s")` で複数行跨ぎの意図を検出
   - 大部分の辞書は `^...$` or 単一行想定 → 行単位走査が default
2. 行単位走査ルート:
   ```ts
   for (let i = 0; i < lines.length; i++) {
     const line = lines[i];
     let m: RegExpExecArray | null;
     regex.lastIndex = 0;
     while ((m = regex.exec(line)) !== null) {
       const lnum = i + 1;  // 1-origin
       const col = m.index + 1;
       // findWordAtPosition(words, lnum, col) でヒント対象 word を特定
       if (!regex.global) break;
     }
   }
   ```
3. 複数行パターン: 従来の `text = lines.join("\n")` 経路にフォールバック（稀なケースなので性能最適化しない）
4. findWordAtPosition: 行配列が既に行インデックスでアクセス可能なため、join した text からの lnum 逆算が不要になりコードも簡潔化
5. 辞書パターン数が 0 なら applyHintPatterns 自体を早期 return（既存挙動踏襲）

## Red Phase
- [ ] Process 12 のテストで以下を検証
  - `/^\s*-\s*\[\s\]\s+(.)/` で行単位走査
  - `/\bclass\b/` でも行単位走査（default ルート）
  - 複数行パターン `/foo[\s\S]*?bar/` は join ルート
  - 全ルートで同じマッチ結果（等価性保証）

✅ **Phase Complete**

## Green Phase
- [ ] `isMultilinePattern` ヘルパ追加
- [ ] 行単位走査ループ実装
- [ ] フォールバック路線実装
- [ ] findWordAtPosition 調整

✅ **Phase Complete**

## Refactor Phase
- [ ] 走査ロジックの関数分割 (`scanByLines`, `scanByJoinedText`)
- [ ] JSDoc + 例示

✅ **Phase Complete**

## Dependencies
- Requires: -
- Blocks: Process 12, Process 13
