import type { Config, HighlightColor } from "../types.ts";

/**
 * 有効な色名（Vimの標準色名）をチェックする関数
 * @param colorName チェックする色名
 * @returns 有効な場合はtrue、無効な場合はfalse
 */
export function isValidColorName(colorName: string): boolean {
  if (!colorName || typeof colorName !== "string") {
    return false;
  }
  // 標準的なVim色名（大文字小文字不区別）
  const validColorNames = [
    "black",
    "darkblue",
    "darkgreen",
    "darkcyan",
    "darkred",
    "darkmagenta",
    "brown",
    "darkgray",
    "darkgrey",
    "lightgray",
    "lightgrey",
    "lightblue",
    "lightgreen",
    "lightcyan",
    "lightred",
    "lightmagenta",
    "yellow",
    "white",
    "gray",
    "grey",
    "blue",
    "green",
    "cyan",
    "red",
    "magenta",
    "none", // 特殊値
  ];
  return validColorNames.includes(colorName.toLowerCase());
}

/**
 * 16進数カラーコードが有効かどうかをチェックする関数
 * @param hexColor チェックする16進数カラーコード
 * @returns 有効な場合はtrue、無効な場合はfalse
 */
export function isValidHexColor(hexColor: string): boolean {
  if (!hexColor || typeof hexColor !== "string") {
    return false;
  }
  // #で始まること
  if (!hexColor.startsWith("#")) {
    return false;
  }
  // #を除いた部分
  const hexPart = hexColor.slice(1);
  // 6桁または3桁の16進数であること
  if (hexPart.length !== 6 && hexPart.length !== 3) {
    return false;
  }
  // 16進数文字のみであること
  return /^[0-9a-fA-F]+$/.test(hexPart);
}

/**
 * ハイライトグループ名が有効かどうかを検証する関数
 *
 * 有効な条件：
 * - 空文字列でない
 * - 英字またはアンダースコアで始まる
 * - 英数字とアンダースコアのみを含む
 * - 100文字以下
 * @param groupName 検証するハイライトグループ名
 * @returns 有効な場合はtrue、無効な場合はfalse
 */
export function validateHighlightGroupName(groupName: string): boolean {
  // 空文字列チェック
  if (!groupName || groupName.length === 0) {
    return false;
  }
  // 長さチェック（100文字以下）
  if (groupName.length > 100) {
    return false;
  }
  // 最初の文字は英字またはアンダースコアでなければならない
  const firstChar = groupName.charAt(0);
  if (!/[a-zA-Z_]/.test(firstChar)) {
    return false;
  }
  // 全体の文字列は英数字とアンダースコアのみ
  if (!/^[a-zA-Z0-9_]+$/.test(groupName)) {
    return false;
  }
  return true;
}

/**
 * ハイライト色設定を検証する関数
 * @param colorConfig 検証する色設定（文字列またはオブジェクト）
 * @returns 検証結果
 */
export function validateHighlightColor(
  colorConfig: string | HighlightColor,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  // null と undefined のチェック
  if (colorConfig === null) {
    errors.push("highlight_hint_marker must be a string");
    return { valid: false, errors };
  }
  // 数値や配列などの無効な型チェック
  if (typeof colorConfig === "number") {
    errors.push("highlight_hint_marker must be a string");
    return { valid: false, errors };
  }
  if (Array.isArray(colorConfig)) {
    errors.push("highlight_hint_marker must be a string");
    return { valid: false, errors };
  }
  // 文字列の場合（従来のハイライトグループ名）
  if (typeof colorConfig === "string") {
    // 空文字列チェック
    if (colorConfig === "") {
      errors.push("highlight_hint_marker must be a non-empty string");
      return { valid: false, errors };
    }
    // ハイライトグループ名のバリデーション
    if (!validateHighlightGroupName(colorConfig)) {
      // より詳細なエラーメッセージを提供
      if (!/^[a-zA-Z_]/.test(colorConfig)) {
        errors.push("highlight_hint_marker must start with a letter or underscore");
      } else if (!/^[a-zA-Z0-9_]+$/.test(colorConfig)) {
        errors.push(
          "highlight_hint_marker must contain only alphanumeric characters and underscores",
        );
      } else if (colorConfig.length > 100) {
        errors.push("highlight_hint_marker must be 100 characters or less");
      } else {
        errors.push(`Invalid highlight group name: ${colorConfig}`);
      }
    }
    return { valid: errors.length === 0, errors };
  }
  // オブジェクトの場合（fg/bg個別指定）
  if (typeof colorConfig === "object" && colorConfig !== null) {
    const { fg, bg } = colorConfig;
    // fgの検証
    if (fg !== undefined) {
      if (typeof fg !== "string") {
        errors.push("fg must be a string");
      } else if (fg === "") {
        errors.push("fg cannot be empty string");
      } else if (!isValidColorName(fg) && !isValidHexColor(fg)) {
        errors.push(`Invalid fg color: ${fg}`);
      }
    }
    // bgの検証
    if (bg !== undefined) {
      if (typeof bg !== "string") {
        errors.push("bg must be a string");
      } else if (bg === "") {
        errors.push("bg cannot be empty string");
      } else if (!isValidColorName(bg) && !isValidHexColor(bg)) {
        errors.push(`Invalid bg color: ${bg}`);
      }
    }
    // fgもbgも指定されていない場合
    if (fg === undefined && bg === undefined) {
      errors.push("At least one of fg or bg must be specified");
    }
    return { valid: errors.length === 0, errors };
  }
  errors.push("Color configuration must be a string or object");
  return { valid: false, errors };
}

/**
 * 設定値を検証する関数（テスト用にエクスポート）
 * @param cfg 検証する設定オブジェクト
 * @returns 検証結果（valid: 成功/失敗、errors: エラーメッセージ配列）
 */
export function validateConfig(cfg: Partial<Config>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  // motion_count の検証
  if (cfg.motion_count !== undefined) {
    if (
      typeof cfg.motion_count !== "number" || cfg.motion_count < 1 ||
      !Number.isInteger(cfg.motion_count)
    ) {
      errors.push("motion_count must be a positive integer");
    }
  }
  // motion_timeout の検証
  if (cfg.motion_timeout !== undefined) {
    if (typeof cfg.motion_timeout !== "number" || cfg.motion_timeout < 100) {
      errors.push("motion_timeout must be at least 100ms");
    }
  }
  // hint_position の検証
  if (cfg.hint_position !== undefined) {
    const validPositions = ["start", "end", "overlay"];
    if (!validPositions.includes(cfg.hint_position)) {
      errors.push(`hint_position must be one of: ${validPositions.join(", ")}`);
    }
  }
  // markers の検証
  if (cfg.markers !== undefined) {
    if (!Array.isArray(cfg.markers)) {
      errors.push("markers must be an array");
    } else if (cfg.markers.length === 0) {
      errors.push("markers must not be empty");
    } else if (!cfg.markers.every((m: any) => typeof m === "string" && m.length > 0)) {
      errors.push("markers must be an array of strings");
    }
  }
  // use_numbers の検証
  if (cfg.use_numbers !== undefined) {
    if (typeof cfg.use_numbers !== "boolean") {
      errors.push("use_numbers must be a boolean");
    }
  }
  // maxHints の検証
  if (cfg.maxHints !== undefined) {
    if (typeof cfg.maxHints !== "number" || cfg.maxHints < 1 || !Number.isInteger(cfg.maxHints)) {
      errors.push("maxHints must be a positive integer");
    }
  }
  // debounceDelay の検証
  if (cfg.debounceDelay !== undefined) {
    if (typeof cfg.debounceDelay !== "number" || cfg.debounceDelay < 0) {
      errors.push("debounceDelay must be a non-negative number");
    }
  }
  // highlight_selected の検証
  if (cfg.highlight_selected !== undefined) {
    if (typeof cfg.highlight_selected !== "boolean") {
      errors.push("highlight_selected must be a boolean");
    }
  }
  // debug_coordinates の検証
  if (cfg.debug_coordinates !== undefined) {
    if (typeof cfg.debug_coordinates !== "boolean") {
      errors.push("debug_coordinates must be a boolean");
    }
  }
  // trigger_on_hjkl の検証
  if (cfg.trigger_on_hjkl !== undefined) {
    if (typeof cfg.trigger_on_hjkl !== "boolean") {
      errors.push("trigger_on_hjkl must be a boolean");
    }
  }
  // counted_motions の検証
  if (cfg.counted_motions !== undefined) {
    if (!Array.isArray(cfg.counted_motions)) {
      errors.push("counted_motions must be an array");
    } else {
      for (const key of cfg.counted_motions) {
        if (typeof key !== "string" || key.length !== 1) {
          errors.push(
            `counted_motions contains invalid key: ${key} (must be single character strings)`,
          );
          break;
        }
      }
    }
  }
  // enabled の検証
  if (cfg.enabled !== undefined) {
    if (typeof cfg.enabled !== "boolean") {
      errors.push("enabled must be a boolean");
    }
  }
  if (cfg.use_japanese !== undefined) {
    if (typeof cfg.use_japanese !== "boolean") {
      errors.push("use_japanese must be a boolean");
    }
  }
  if (cfg.highlight_hint_marker !== undefined) {
    // null チェック
    if (cfg.highlight_hint_marker === null) {
      errors.push("highlight_hint_marker must be a string");
    } else {
      const markerResult = validateHighlightColor(cfg.highlight_hint_marker);
      if (!markerResult.valid) {
        errors.push(...markerResult.errors);
      }
    }
  }
  if (cfg.highlight_hint_marker_current !== undefined) {
    // null チェック
    if (cfg.highlight_hint_marker_current === null) {
      errors.push("highlight_hint_marker_current must be a string");
    } else {
      const currentResult = validateHighlightColor(cfg.highlight_hint_marker_current);
      if (!currentResult.valid) {
        errors.push(
          ...currentResult.errors.map((e) =>
            e.replace("highlight_hint_marker", "highlight_hint_marker_current")
          ),
        );
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * デフォルト設定を取得（テスト用にエクスポート）
 * @returns デフォルト設定オブジェクト
 */
export function getDefaultConfig(): Config {
  return {
    markers: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
    motion_count: 3,
    motion_timeout: 2000,
    hint_position: "start",
    trigger_on_hjkl: true,
    counted_motions: [],
    enabled: true,
    maxHints: 336,
    debounceDelay: 50,
    use_numbers: false,
    highlight_selected: false,
    debug_coordinates: false, // デフォルトでデバッグログは無効
    highlight_hint_marker: "DiffAdd",
    highlight_hint_marker_current: "DiffText",
    // process1追加: キー別motion_count設定のデフォルト値
    default_motion_count: 3, // グローバルなデフォルト値
    // per_key_motion_countはデフォルトでは未定義（ユーザーが必要に応じて設定）
  };
}

/**
 * キー別の最小文字数を取得する関数
 *
 * 優先順位:
 * 1. per_key_min_length[key] （キー別設定）
 * 2. default_min_word_length （デフォルト設定）
 * 3. min_word_length （後方互換性）
 * 4. 2 （ハードコードされたデフォルト）
 *
 * @param config 設定オブジェクト
 * @param key 対象のキー
 * @returns キーに対する最小文字数
 */
export function getMinLengthForKey(config: Config, key: string): number {
  // キー別設定が存在し、そのキーの設定があれば使用
  if (config.per_key_min_length && config.per_key_min_length[key] !== undefined) {
    return config.per_key_min_length[key];
  }

  // default_min_word_length が設定されていれば使用
  if (config.default_min_word_length !== undefined) {
    return config.default_min_word_length;
  }

  // 後方互換性：旧形式のmin_word_lengthを使用（デフォルト: 2）
  return config.min_word_length ?? 2;
}

/**
 * キー別のモーション回数を取得する関数
 *
 * 優先順位:
 * 1. per_key_motion_count[key] （キー別設定、有効な整数値のみ）
 * 2. default_motion_count （デフォルト設定）
 * 3. motion_count （後方互換性）
 * 4. 3 （ハードコードされたデフォルト）
 *
 * @param key 対象のキー
 * @param config 設定オブジェクト
 * @returns キーに対するモーション回数
 */
export function getMotionCountForKey(key: string, config: Config): number {
  // キー別設定が存在し、そのキーの設定があれば使用
  if (config.per_key_motion_count && config.per_key_motion_count[key] !== undefined) {
    const value = config.per_key_motion_count[key];
    // 1以上の整数値のみ有効とみなす
    if (value >= 1 && Number.isInteger(value)) {
      return value;
    }
  }

  // default_motion_count が設定されていれば使用
  if (config.default_motion_count !== undefined && config.default_motion_count >= 1) {
    return config.default_motion_count;
  }

  // 後方互換性：既存のmotion_countを使用
  if (config.motion_count !== undefined && config.motion_count >= 1) {
    return config.motion_count;
  }

  // 最終的なデフォルト値
  return 3;
}

/**
 * 後方互換性フラグを正規化する関数
 *
 * 廃止された設定項目を除去して、新しい設定形式に正規化します。
 * 現在の対象: use_improved_detection（廃止済み）
 *
 * @param cfg 正規化対象の設定オブジェクト
 * @returns 正規化された設定オブジェクト（元のオブジェクトは変更されない）
 */
export function normalizeBackwardCompatibleFlags(cfg: Partial<Config>): Partial<Config> {
  const normalized = { ...cfg };

  // 廃止されたuse_improved_detectionフラグを削除
  if ("use_improved_detection" in normalized) {
    delete normalized.use_improved_detection;
  }

  return normalized;
}

/**
 * 色名を正規化する関数
 *
 * 16進数色の場合はそのまま返し、色名の場合は最初の文字を大文字、
 * 残りを小文字にして正規化します。
 *
 * @param color 正規化対象の色名
 * @returns 正規化された色名
 */
export function normalizeColorName(color: string): string {
  if (!color || typeof color !== "string") {
    return color;
  }

  // 16進数色の場合はそのまま返す
  if (color.startsWith("#")) {
    return color;
  }

  // 色名の場合は最初の文字を大文字、残りを小文字にする
  return color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
}

/**
 * ハイライトコマンドを生成する関数
 *
 * 文字列の場合はlinkコマンド、オブジェクトの場合は
 * fg/bgの個別指定でコマンドを生成します。
 *
 * @param hlGroupName ハイライトグループ名
 * @param colorConfig 色設定（文字列またはHighlightColorオブジェクト）
 * @returns 生成されたハイライトコマンド
 */
export function generateHighlightCommand(
  hlGroupName: string,
  colorConfig: string | HighlightColor,
): string {
  // 文字列の場合（従来のハイライトグループ名）
  if (typeof colorConfig === "string") {
    return `highlight default link ${hlGroupName} ${colorConfig}`;
  }

  // オブジェクトの場合（fg/bg個別指定）
  const { fg, bg } = colorConfig;
  const parts = [`highlight ${hlGroupName}`];

  if (fg !== undefined) {
    const normalizedFg = normalizeColorName(fg);
    if (fg.startsWith("#")) {
      // 16進数色の場合はguifgのみ
      parts.push(`guifg=${fg}`);
    } else {
      // 色名の場合はctermfgとguifgの両方
      parts.push(`ctermfg=${normalizedFg}`);
      parts.push(`guifg=${normalizedFg}`);
    }
  }

  if (bg !== undefined) {
    const normalizedBg = normalizeColorName(bg);
    if (bg.startsWith("#")) {
      // 16進数色の場合はguibgのみ
      parts.push(`guibg=${bg}`);
    } else {
      // 色名の場合はctermbgとguibgの両方
      parts.push(`ctermbg=${normalizedBg}`);
      parts.push(`guibg=${normalizedBg}`);
    }
  }

  return parts.join(" ");
}

/**
 * ハイライト設定を検証する関数（設定更新時に使用）
 *
 * highlight_hint_markerとhighlight_hint_marker_currentの
 * 設定値を検証します。
 *
 * @param config 検証する設定オブジェクト
 * @returns 検証結果（valid: 成功/失敗、errors: エラーメッセージ配列）
 */
export function validateHighlightConfig(
  config: {
    highlight_hint_marker?: string | HighlightColor;
    highlight_hint_marker_current?: string | HighlightColor;
  },
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // highlight_hint_markerの検証
  if (config.highlight_hint_marker !== undefined) {
    const markerResult = validateHighlightColor(config.highlight_hint_marker);
    if (!markerResult.valid) {
      errors.push(...markerResult.errors.map((e) => `highlight_hint_marker: ${e}`));
    }
  }

  // highlight_hint_marker_currentの検証
  if (config.highlight_hint_marker_current !== undefined) {
    const currentResult = validateHighlightColor(config.highlight_hint_marker_current);
    if (!currentResult.valid) {
      errors.push(...currentResult.errors.map((e) => `highlight_hint_marker_current: ${e}`));
    }
  }

  return { valid: errors.length === 0, errors };
}