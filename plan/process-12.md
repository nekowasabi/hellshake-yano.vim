# Process 12: branded types 型エラー検証

## Overview
Process 3 で導入した ByteCol/CharCol/ZeroLine/OneLine branded types が意図どおり型レベルで単位混在を拒否することを検証する。deno-lint と tsc の noEmit モードで compile-error アサーションを実施。

## Affected Files
- `tests/types_branded_test.ts` — 新規、`// @ts-expect-error` ベースで違反パターンを列挙
- `denops/hellshake-yano/types.ts:~284` — 検証対象の branded types

## Implementation Notes
- `// @ts-expect-error` を利用した compile-time negative test:
  - `const b: ByteCol = 5;` → error (raw number 不可)
  - `const c: CharCol = asByteCol(5);` → error (別ブランド不可)
  - `const l: ZeroLine = asOneLine(1);` → error (別ブランド不可)
- positive test:
  - `const b: ByteCol = asByteCol(5);` → ok
  - `const z: ZeroLine = oneLineToZeroLine(asOneLine(5));` → ok
- `deno check tests/types_branded_test.ts` が成功（@ts-expect-error のおかげで 0 errors）
- Why コメント必須: `// Why: col/line 単位混在を型で detect する契約をコンパイル時に固定`

---

## Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング確認
- [ ] `tests/types_branded_test.ts` に違反/正常の両ケースを記述
- [ ] 違反ケースが tsc/deno エラーになることを確認（@ts-expect-error 無しで一度実行）

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [ ] ブリーフィング確認
- [ ] @ts-expect-error を適切な行に配置
- [ ] `deno check tests/types_branded_test.ts` が 0 errors で通ることを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [ ] Process 3 の一時 cast 箇所（`as unknown as ByteCol` 等）を列挙し、境界 API に集約する TODO を別 issue/Process へ
- [ ] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 3
- Blocks: 100
