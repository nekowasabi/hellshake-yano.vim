/**
 * denops/hellshake-yano/common/utils/batch.ts
 *
 * denops.batch / nvim_call_atomic ラッパー
 *
 * 本モジュールは2つのユーティリティを提供する:
 * 1. batchGet<T>() - 型安全な denops.batch 値取得ラッパー（Task 2-A）
 * 2. callAtomic()  - nvim_call_atomic ラッパー（Task 3-A）
 *
 * 制約 C1: batchGet のコールバック内で await 不可（collect の仕様）
 * 制約 C2: callAtomic はエラー発生時に途中で停止するため事前バリデーション必須
 */

import type { Denops } from "@denops/std";
import { BatchError } from "jsr:@denops/core@^7.0.1/error";
// Why: collect instead of raw denops.batch — collect provides typed return values
// and handles the single-RPC batching internally; raw denops.batch only fires-and-forgets.
// Why: @denops/std/batch ではなく jsr 直接パス — import map に @denops/std のサブパスが未登録のため
import { collect } from "jsr:@denops/std@^7.4.0/batch";

/**
 * 型安全な denops.batch 値取得ラッパー
 *
 * Why: 直接 denops.batch を使うと戻り値の型が unknown[] — ラッパーでキャスト集約。
 * Why: collect を使用することで型推論が働き、呼び出し側でのキャストが不要になる。
 *
 * 制約 C1: コールバック内で await 不可（collect の仕様）。
 * コールバックは同期的に Promise 配列を返す必要がある。
 *
 * @example
 * ```ts
 * const [bufnr, winLine, winLastLine] = await batchGet(denops, (d) => [
 *   d.call("bufnr", "%"),
 *   d.eval("line('w0')"),
 *   d.eval("line('w$')"),
 * ] as const);
 * ```
 *
 * @param denops - Denops インスタンス
 * @param fn - collect コールバック。Promise 配列を返す（await 不可）
 * @returns 各呼び出しの解決値のタプル
 */
export function batchGet<T extends readonly unknown[] | []>(
  denops: Denops,
  fn: (helper: Denops) => T,
): Promise<{ -readonly [K in keyof T]: Awaited<T[K]> }> {
  // Why: collect instead of manual denops.batch spread — collect resolves tuple types
  // correctly and handles the CollectHelper lifecycle (open/close) automatically.
  return collect(denops, fn) as Promise<{ -readonly [K in keyof T]: Awaited<T[K]> }>;
}

/**
 * denops.batch ベースの一括 API 呼び出しラッパー（エラーハンドリング付き）
 *
 * Why: denops.call("nvim_call_atomic") ではなく denops.batch() を使用。
 * 理由: denops.call() は Vim の call() にマップされるため、Neovim RPC API
 * (nvim_call_atomic) を直接呼び出すと E117 エラーが発生する。
 * denops.batch() は内部で複数呼び出しを1回の RPC にまとめる機能を持ち、
 * Vim/Neovim 両対応で動作する。
 *
 * Why: エラー時途中停止のため事前バリデーションが必須（制約 C2）。
 * denops.batch() はエラー発生時に BatchError をスローし、
 * error.results に成功した呼び出しまでの部分結果が格納される。
 * 呼び出し元は calls 配列の内容を事前にバリデートすること。
 *
 * @param denops - Denops インスタンス
 * @param calls - API 呼び出しの配列。各要素は [関数名, ...引数] の形式。
 * @returns 各呼び出しの結果配列
 * @throws エラー発生時に Error をスロー（BatchError のメッセージを含む）
 */
export async function callAtomic(
  denops: Denops,
  calls: Array<[string, ...unknown[]]>,
): Promise<unknown[]> {
  if (calls.length === 0) return [];

  try {
    // Why: denops.batch(...calls) — calls は [fn, ...args][] 形式で
    // denops.batch のシグネチャ (...calls: [string, ...unknown[]][]) に直接適合する。
    return await denops.batch(...calls) as unknown[];
  } catch (err) {
    if (err instanceof BatchError) {
      throw new Error(
        `callAtomic failed: ${err.message}`,
      );
    }
    throw err;
  }
}
