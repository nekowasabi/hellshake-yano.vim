/**
 * denops/hellshake-yano/common/utils/base.ts
 *
 * 共通基底処理
 *
 * Phase B-3とPhase B-4の共通基底処理を統合しています。
 * Phase B-3互換の検証関数も提供します。
 */

/**
 * 状態管理用の基本インターフェース
 */
export interface StateBase {
  [key: string]: unknown;
}

// ========== Singleton パターン ==========

/**
 * Singleton パターン用のユーティリティ関数
 *
 * @template T Singletonクラスの型
 * @param instance 現在のインスタンス
 * @param createFn インスタンス作成関数
 * @returns Singletonインスタンス
 */
export function getSingletonInstance<T>(
  instance: T | undefined,
  createFn: () => T,
): T {
  return instance || createFn();
}

// ========== 状態管理 ==========

/**
 * 状態初期化のヘルパー（ディープコピー）
 *
 * @template T 状態の型
 * @param state 初期化する状態
 * @returns 初期化された状態のコピー
 */
export function initializeState<T extends StateBase>(state: T): T {
  return JSON.parse(JSON.stringify(state));
}

/**
 * 状態取得のヘルパー（ディープコピー）
 *
 * @template T 状態の型
 * @param state 取得する状態
 * @returns 状態のコピー
 */
export function getStateCopy<T extends StateBase>(state: T): T {
  return JSON.parse(JSON.stringify(state));
}

// ========== エラーハンドリング ==========

/**
 * エラー時のフォールバック処理
 *
 * @template T 戻り値の型
 * @param fn 実行する関数
 * @param fallback エラー時に返す値
 * @param context コンテキスト情報
 * @returns 関数の結果またはフォールバック値
 */
export async function withFallback<T>(
  fn: () => Promise<T>,
  fallback: T,
  context: string,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(
      `[${context}] ${error instanceof Error ? error.message : String(error)}`,
    );
    return fallback;
  }
}

// ========== Phase B-3互換検証関数 ==========
// 後方互換性のため、string | null を返すバリデーション関数を提供

/**
 * 数値の範囲を検証（Phase B-3互換）
 *
 * @param value チェックする値
 * @param min 最小値
 * @param max 最大値
 * @param paramName パラメータ名
 * @returns 検証成功時はnull、失敗時はエラーメッセージ
 *
 * @deprecated Phase B-4の`validateRange`関数の使用を推奨
 */
export function validateRangeCompat(
  value: number,
  min: number,
  max: number,
  paramName: string,
): string | null {
  if (value < min || value > max) {
    return `${paramName} must be between ${min} and ${max}, got ${value}`;
  }
  return null;
}

/**
 * 値が空でないことを検証（Phase B-3互換）
 *
 * @param value チェックする値
 * @param paramName パラメータ名
 * @returns 検証成功時はnull、失敗時はエラーメッセージ
 *
 * @deprecated Phase B-4の`validateNonEmpty`関数の使用を推奨
 */
export function validateNonEmptyCompat(
  value: string,
  paramName: string,
): string | null {
  if (!value || value.trim().length === 0) {
    return `${paramName} must not be empty`;
  }
  return null;
}

/**
 * 値がリストに含まれることを検証（Phase B-3互換）
 *
 * @param value チェックする値
 * @param validValues 有効な値のリスト
 * @param paramName パラメータ名
 * @returns 検証成功時はnull、失敗時はエラーメッセージ
 *
 * @deprecated Phase B-4の`validateInList`関数の使用を推奨
 */
export function validateInListCompat(
  value: string,
  validValues: string[],
  paramName: string,
): string | null {
  if (!validValues.includes(value)) {
    return `${paramName} must be one of [${validValues.join(", ")}], got ${value}`;
  }
  return null;
}
