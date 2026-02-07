/**
 * denops/hellshake-yano/common/utils/config.ts
 *
 * 設定関連のユーティリティ関数
 */

import type { Config } from "../types/config.ts";

/**
 * Config型の解決
 *
 * 統合された Config 型と従来の Config 型を区別して返す
 *
 * @param config - 設定オブジェクト
 * @returns [統合Config, 従来Config] のタプル
 */
export function resolveConfigType(
  config?: Config | Config,
): [Config | undefined, Config | undefined] {
  if (!config) return [undefined, undefined];

  // 新しい統合Config型の判定（perKeyMinLength または defaultMinWordLength を持つ）
  if ('perKeyMinLength' in config || 'defaultMinWordLength' in config) {
    return [config as Config, undefined];
  }

  // useJapanese を持つ場合は WordDetectionConfig
  if ('useJapanese' in config) {
    return [config as Config, undefined];
  }

  // それ以外は従来のConfig型
  return [undefined, config as Config];
}
