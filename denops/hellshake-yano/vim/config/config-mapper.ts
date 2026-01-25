/**
 * config-mapper.ts - 設定変換マッパー
 *
 * Vim Layer: 設定マッピングコンポーネント
 *
 * 旧VimScript形式から新形式への変換
 */

/** VimScript側の旧設定形式 */
export interface VimScriptConfig {
  hint_chars?: string;
  motion_threshold?: number | null;
  motion_timeout_ms?: number;
  motion_keys?: string[];
  motion_enabled?: boolean;
  visual_mode_enabled?: boolean;
  max_hints?: number;
  min_word_length?: number;
  use_japanese?: boolean;
  debug_mode?: boolean;
  exclude_numbers?: boolean;
  // deno-lint-ignore no-explicit-any
  [key: string]: any; // Unknown keys are allowed but will be ignored
}

/** 変換後の新設定形式（部分） */
export interface MappedConfig {
  markers?: string[];
  motionCount?: number;
  motionTimeout?: number;
  countedMotions?: string[];
  motionCounterEnabled?: boolean;
  visualModeEnabled?: boolean;
  maxHints?: number;
  defaultMinWordLength?: number;
  useJapanese?: boolean;
  debugMode?: boolean;
  excludeNumbers?: boolean;
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}

/** 変換マッピング定義 */
interface ConfigMapping {
  key: string;
  // deno-lint-ignore no-explicit-any
  transform?: (value: any) => any;
}

/**
 * 設定マッパークラス
 * VimScript形式の設定を新形式に変換
 */
export class ConfigMapper {
  /** 設定マッピングテーブル（PLAN.mdの仕様に基づく） */
  private readonly CONFIG_MAP: Record<string, ConfigMapping> = {
    "hint_chars": {
      key: "markers",
      transform: (v: string) => v ? v.split("") : undefined,
    },
    "motion_threshold": {
      key: "motionCount",
      transform: (v: number) => v,
    },
    "motion_timeout_ms": {
      key: "motionTimeout",
      transform: (v: number) => v,
    },
    "motion_keys": {
      key: "countedMotions",
      transform: (v: string[]) => v,
    },
    "motion_enabled": {
      key: "motionCounterEnabled",
      transform: (v: boolean) => v,
    },
    "visual_mode_enabled": {
      key: "visualModeEnabled",
      transform: (v: boolean) => v,
    },
    "max_hints": {
      key: "maxHints",
      transform: (v: number) => v,
    },
    "min_word_length": {
      key: "defaultMinWordLength",
      transform: (v: number) => v,
    },
    "use_japanese": {
      key: "useJapanese",
      transform: (v: boolean) => v,
    },
    "debug_mode": {
      key: "debugMode",
      transform: (v: boolean) => v,
    },
    "exclude_numbers": {
      key: "excludeNumbers",
      transform: (v: boolean) => v,
    },
  };

  /**
   * VimScript形式の設定を新形式にマッピング
   * @param oldConfig 旧VimScript形式の設定
   * @returns 変換後の新形式設定
   */
  mapFromVimScript(oldConfig: VimScriptConfig): MappedConfig {
    const result: MappedConfig = {};

    for (const [oldKey, value] of Object.entries(oldConfig)) {
      // null または undefined の値はスキップ
      if (this.isNullOrUndefined(value)) {
        continue;
      }

      const transformedEntry = this.transformEntry(oldKey, value);
      if (transformedEntry) {
        result[transformedEntry.key] = transformedEntry.value;
      }
    }

    return result;
  }

  /**
   * 指定されたキーのマッピング情報を取得
   * @param key 旧形式のキー名
   * @returns マッピング情報、存在しない場合はundefined
   */
  getMapping(key: string): ConfigMapping | undefined {
    return this.CONFIG_MAP[key];
  }

  /**
   * 値を変換
   * @param key 旧形式のキー名
   * @param value 変換する値
   * @returns 変換後の値
   */
  // deno-lint-ignore no-explicit-any
  transformValue(key: string, value: any): any {
    const mapping = this.CONFIG_MAP[key];
    if (!mapping) {
      return undefined;
    }

    return mapping.transform ? mapping.transform(value) : value;
  }

  /**
   * エントリを変換するヘルパーメソッド
   * @param oldKey 旧形式のキー
   * @param value 値
   * @returns 変換後のキーと値のペア、または undefined
   */
  // deno-lint-ignore no-explicit-any
  private transformEntry(oldKey: string, value: any): { key: string; value: any } | undefined {
    const mapping = this.CONFIG_MAP[oldKey];
    if (!mapping) {
      // Unknown keys are ignored
      this.logIgnoredKey(oldKey);
      return undefined;
    }

    const transformedValue = mapping.transform ? mapping.transform(value) : value;

    // 変換後の値がundefinedの場合はエントリをスキップ
    if (transformedValue === undefined) {
      return undefined;
    }

    return {
      key: mapping.key,
      value: transformedValue,
    };
  }

  /**
   * 値がnullまたはundefinedかチェック
   * @param value チェックする値
   * @returns nullまたはundefinedの場合true
   */
  // deno-lint-ignore no-explicit-any
  private isNullOrUndefined(value: any): boolean {
    return value === null || value === undefined;
  }

  /**
   * 無視されたキーのログを出力（デバッグ用）
   * @param key 無視されたキー名
   */
  private logIgnoredKey(key: string): void {
    // Production環境では出力しない
    if (typeof Deno !== "undefined" && Deno.env.get("DEBUG")) {
      console.debug(`[ConfigMapper] Ignored unknown key: ${key}`);
    }
  }

  /**
   * マッピング統計情報を取得
   * @param oldConfig 旧設定
   * @returns マッピング結果の統計
   */
  getMappingStatistics(oldConfig: VimScriptConfig): {
    totalKeys: number;
    mappedKeys: number;
    ignoredKeys: string[];
  } {
    const ignoredKeys: string[] = [];
    let mappedKeys = 0;

    for (const [key, value] of Object.entries(oldConfig)) {
      if (this.isNullOrUndefined(value)) {
        continue;
      }

      if (this.CONFIG_MAP[key]) {
        mappedKeys++;
      } else {
        ignoredKeys.push(key);
      }
    }

    return {
      totalKeys: Object.keys(oldConfig).length,
      mappedKeys,
      ignoredKeys,
    };
  }
}
