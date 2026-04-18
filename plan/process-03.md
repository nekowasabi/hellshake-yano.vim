# Process 3: ByteCol/CharCol/ZeroLine branded types

## Overview
col/line の単位（byte/char, 0-indexed/1-indexed）が型レベルで区別されておらず、extmark 呼び出し時の range out-of-bounds エラーの温床となっている。TypeScript の branded type でコンパイル時に単位混在を検出可能にする。

## Affected Files
- `denops/hellshake-yano/types.ts:~284` — 型定義追加
- `denops/hellshake-yano/neovim/core/word.ts:656` — byteCol 生成点を `asByteCol()` に置換
- `denops/hellshake-yano/neovim/core/core.ts:1730` 周辺 — setHintExtmark 引数型を ByteCol に変更
- `denops/hellshake-yano/neovim/display/extmark-display.ts` — col/line を受け渡す API 境界

## Implementation Notes
- 型定義:
  ```typescript
  export type ByteCol = number & { readonly __brand: "ByteCol" };   // 1-indexed byte
  export type CharCol = number & { readonly __brand: "CharCol" };   // 0-indexed char
  export type ZeroLine = number & { readonly __brand: "ZeroLine" }; // 0-indexed
  export type OneLine = number & { readonly __brand: "OneLine" };   // 1-indexed
  export const asByteCol = (n: number): ByteCol => n as ByteCol;
  export const asCharCol = (n: number): CharCol => n as CharCol;
  export const asZeroLine = (n: number): ZeroLine => n as ZeroLine;
  export const asOneLine = (n: number): OneLine => n as OneLine;
  ```
- 境界ヘルパー: `oneLineToZeroLine(l: OneLine): ZeroLine` で明示変換
- Why コメント必須: `// Why: col/line の単位混在は extmark 'out of range' の根本原因だった。branded type で型レベル検出`
- 段階導入: まず Word の byteCol / line のみ branded 化し、呼び出し元は `as unknown as ByteCol` の一時 cast を許容（Process 12 で厳格化）

---

## Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング確認
- [ ] `tests/types_branded_test.ts` を新規作成
  - `const c: CharCol = 5 as CharCol; const b: ByteCol = c;` が ts コンパイルエラーになることを assertThrows 相当で検証
- [ ] テストを実行して失敗することを確認（現状は型が無いため無反応）

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [ ] ブリーフィング確認
- [ ] types.ts に branded types と as* ヘルパーを追加
- [ ] word.ts:656 の byteCol 生成を `asByteCol(byteIndex + 1)` に置換
- [ ] core.ts:1730 周辺の setHintExtmark シグネチャを ByteCol/ZeroLine に変更
- [ ] 呼び出し元の型エラーを修正（必要なら一時 cast）
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [ ] 一時 cast 箇所を洗い出し、境界 API に集約
- [ ] Word 型の列プロパティ命名を `charCol` / `byteCol` に統一（ambiguous な `col` を排除）
- [ ] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 1, 2
- Blocks: 10, 11, 12
