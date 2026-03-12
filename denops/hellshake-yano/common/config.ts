/**
 * denops/hellshake-yano/common/config.ts
 *
 * 設定管理
 *
 * common/types/config.tsの型を使用した設定管理機能を提供します。
 */

import type { Config } from "./types/config.ts";
import { DEFAULT_CONFIG } from "./types/config.ts";

/**
 * デフォルト設定を返す
 *
 * @returns デフォルト設定
 */
export function getDefaultConfig(): Config {
  return DEFAULT_CONFIG;
}

/**
 * DEFAULT_CONFIGをエクスポート（互換性のため）
 */
export { DEFAULT_CONFIG };

/**
 * 部分設定からConfig型を作成
 *
 * デフォルト設定と部分設定をマージします。
 *
 * @param partial - 部分設定
 * @returns 完全な設定
 *
 * @example
 * ```typescript
 * const config = createMinimalConfig({ enabled: false, motionCount: 5 });
 * // config.enabled === false
 * // config.motionCount === 5
 * // config.maxHints === 336 (default)
 * ```
 */
export function createMinimalConfig(partial: Partial<Config> = {}): Config {
  return { ...DEFAULT_CONFIG, ...partial };
}

