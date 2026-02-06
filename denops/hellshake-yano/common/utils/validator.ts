/**
 * denops/hellshake-yano/common/utils/validator.ts
 *
 * バリデーション機能の統合
 *
 * 以下の機能を統合しています:
 * - Phase B-3とPhase B-4の基本バリデーション（validateRange, validateNonEmpty, validateInList）
 * - validation.tsのハイライト関連バリデーション機能
 * - Config全体のバリデーション
 */

import type { Config, HighlightColor } from "../types/index.ts";

/**
 * バリデーション結果
 *
 * @property valid - バリデーション成功かどうか
 * @property error - エラーメッセージ（失敗時のみ）
 *
 * @example
 * ```typescript
 * const result = validateRange(50, 0, 100, "value");
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 * ```
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ========== 基本バリデーション ==========

/**
 * 数値の範囲を検証
 *
 * @param value - 検証する値
 * @param min - 最小値
 * @param max - 最大値
 * @param name - フィールド名
 * @returns バリデーション結果
 *
 * @example
 * ```typescript
 * const result = validateRange(50, 0, 100, "count");
 * if (!result.valid) {
 *   console.error(result.error); // "count must be between 0 and 100, got 150"
 * }
 * ```
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  name: string,
): ValidationResult {
  if (value < min || value > max) {
    return {
      valid: false,
      error: `${name} must be between ${min} and ${max}, got ${value}`,
    };
  }
  return { valid: true };
}

/**
 * 値が空でないことを検証
 *
 * @param value - 検証する値
 * @param name - フィールド名
 * @returns バリデーション結果
 *
 * @example
 * ```typescript
 * const result = validateNonEmpty("", "username");
 * if (!result.valid) {
 *   console.error(result.error); // "username must not be empty"
 * }
 * ```
 */
export function validateNonEmpty(
  value: unknown,
  name: string,
): ValidationResult {
  if (value === null || value === undefined || value === "") {
    return {
      valid: false,
      error: `${name} must not be empty`,
    };
  }
  return { valid: true };
}

/**
 * 値がリストに含まれることを検証
 *
 * @param value - 検証する値
 * @param list - 許可される値のリスト
 * @param name - フィールド名
 * @returns バリデーション結果
 *
 * @example
 * ```typescript
 * const result = validateInList("red", ["red", "green", "blue"], "color");
 * if (!result.valid) {
 *   console.error(result.error); // "color must be one of [red, green, blue], got yellow"
 * }
 * ```
 */
export function validateInList<T>(
  value: T,
  list: T[],
  name: string,
): ValidationResult {
  if (!list.includes(value)) {
    return {
      valid: false,
      error: `${name} must be one of [${list.join(", ")}], got ${value}`,
    };
  }
  return { valid: true };
}

// ========== ハイライト関連バリデーション ==========

/**
 * ハイライトグループ名を検証
 *
 * @param groupName - 検証するグループ名
 * @returns 有効な場合true、無効な場合false
 */
export function validateHighlightGroupName(groupName: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(groupName) && groupName.length <= 100;
}

/**
 * カラー名が有効かどうかを検証
 *
 * @param colorName - 検証するカラー名
 * @returns 有効な場合true、無効な場合false
 */
export function isValidColorName(colorName: string): boolean {
  if (typeof colorName !== "string") return false;
  const standardColors = [
    "black",
    "red",
    "green",
    "yellow",
    "blue",
    "magenta",
    "cyan",
    "white",
    "gray",
    "grey",
    "none",
  ];
  return standardColors.includes(colorName.toLowerCase());
}

/**
 * Hex色が有効かどうかを検証
 *
 * @param hexColor - 検証するHex色
 * @returns 有効な場合true、無効な場合false
 */
export function isValidHexColor(hexColor: string): boolean {
  if (typeof hexColor !== "string") return false;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hexColor);
}

/**
 * ハイライト色を検証
 *
 * @param colorConfig - 検証する色設定
 * @returns バリデーション結果
 */
export function validateHighlightColor(
  colorConfig: string | HighlightColor,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (colorConfig === null) {
    errors.push("highlight_hint_marker must be a string");
    return { valid: false, errors };
  }

  if (typeof colorConfig === "number") {
    errors.push("highlight_hint_marker must be a string");
    return { valid: false, errors };
  }

  if (Array.isArray(colorConfig)) {
    errors.push("highlight_hint_marker must be a string");
    return { valid: false, errors };
  }

  if (typeof colorConfig === "string") {
    if (colorConfig === "") {
      errors.push("highlight_hint_marker must be a non-empty string");
      return { valid: false, errors };
    }

    if (!validateHighlightGroupName(colorConfig)) {
      if (!/^[a-zA-Z_]/.test(colorConfig)) {
        errors.push(
          "highlight_hint_marker must start with a letter or underscore",
        );
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

  if (typeof colorConfig === "object" && colorConfig !== null) {
    const color = colorConfig as Record<string, unknown>;

    if (Object.keys(color).length === 0 && !("fg" in color) && !("bg" in color)) {
      errors.push("Highlight color must have fg or bg property");
      return { valid: false, errors };
    }

    if (color.fg !== undefined && color.fg !== null) {
      if (typeof color.fg !== "string") {
        errors.push("fg must be a string");
      } else {
        const fg = color.fg;
        if (fg === "") {
          errors.push("fg cannot be empty string");
        } else if (
          !isValidColorName(fg) &&
          !isValidHexColor(fg) &&
          fg.toLowerCase() !== "none"
        ) {
          errors.push(`Invalid fg color: ${fg}`);
        }
      }
    }

    if (color.bg !== undefined && color.bg !== null) {
      if (typeof color.bg !== "string") {
        errors.push("bg must be a string");
      } else {
        const bg = color.bg;
        if (bg === "") {
          errors.push("bg cannot be empty string");
        } else if (
          !isValidColorName(bg) &&
          !isValidHexColor(bg) &&
          bg.toLowerCase() !== "none"
        ) {
          errors.push(`Invalid bg color: ${bg}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  errors.push("Color configuration must be a string or object");
  return { valid: false, errors };
}

/**
 * カラー名を正規化
 *
 * @param color - 正規化するカラー名
 * @returns 正規化されたカラー名
 */
export function normalizeColorName(color: string): string {
  if (typeof color !== "string") return "";
  if (color.toLowerCase() === "none") return "None";
  return color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
}

/**
 * ハイライトコマンドを生成
 *
 * @param groupName - ハイライトグループ名
 * @param color - ハイライト色設定
 * @returns 生成されたハイライトコマンド
 */
export function generateHighlightCommand(
  groupName: string,
  color: HighlightColor,
): string {
  const parts = [`highlight ${groupName}`];

  if (color.fg) {
    const fg = color.fg.toLowerCase() === "none"
      ? "None"
      : isValidHexColor(color.fg)
      ? color.fg
      : color.fg.charAt(0).toUpperCase() + color.fg.slice(1).toLowerCase();

    if (isValidHexColor(color.fg)) {
      parts.push(`guifg=${fg}`);
    } else {
      parts.push(`ctermfg=${fg}`);
      parts.push(`guifg=${fg}`);
    }
  }

  if (color.bg) {
    const bg = color.bg.toLowerCase() === "none"
      ? "None"
      : isValidHexColor(color.bg)
      ? color.bg
      : color.bg.charAt(0).toUpperCase() + color.bg.slice(1).toLowerCase();

    if (isValidHexColor(color.bg)) {
      parts.push(`guibg=${bg}`);
    } else {
      parts.push(`ctermbg=${bg}`);
      parts.push(`guibg=${bg}`);
    }
  }

  return parts.join(" ");
}

/**
 * ハイライト設定を検証
 *
 * @param config - 検証する設定オブジェクト
 * @returns バリデーション結果
 */
export function validateHighlightConfig(config: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const highlightKeys = [
    "highlightHintMarker",
    "highlightHintMarkerCurrent",
    "highlight_hint_marker",
    "highlight_hint_marker_current",
  ];

  for (const [key, value] of Object.entries(config)) {
    if (!highlightKeys.includes(key)) continue;

    if (typeof value === "string") {
      if (
        value.includes("-") ||
        value.includes(" ") ||
        /^\d/.test(value) ||
        value === ""
      ) {
        errors.push(`Invalid highlight group name for ${key}: ${value}`);
      }
    } else if (typeof value === "object" && value !== null) {
      const colorObj = value as Record<string, unknown>;

      if (!("fg" in colorObj || "bg" in colorObj)) {
        errors.push(`Invalid highlight config for ${key}: must have fg or bg`);
      } else {
        if ("fg" in colorObj) {
          const fg = colorObj.fg;
          if (fg === null) {
            errors.push(`fg must be a string for ${key}`);
          } else if (fg !== undefined) {
            if (typeof fg !== "string") {
              errors.push(`fg must be a string for ${key}`);
            } else {
              const fgStr = fg;
              if (fgStr === "") {
                errors.push(`fg cannot be empty string for ${key}`);
              } else if (
                !isValidColorName(fgStr) &&
                !isValidHexColor(fgStr) &&
                fgStr.toLowerCase() !== "none"
              ) {
                if (!validateHighlightGroupName(fgStr)) {
                  errors.push(`Invalid value for ${key}.fg: ${fgStr}`);
                }
              }
            }
          }
        }

        if ("bg" in colorObj) {
          const bg = colorObj.bg;
          if (bg === null) {
            errors.push(`bg must be a string for ${key}`);
          } else if (bg !== undefined) {
            if (typeof bg !== "string") {
              errors.push(`bg must be a string for ${key}`);
            } else {
              const bgStr = bg;
              if (bgStr === "") {
                errors.push(`bg cannot be empty string for ${key}`);
              } else if (
                !isValidColorName(bgStr) &&
                !isValidHexColor(bgStr) &&
                bgStr.toLowerCase() !== "none"
              ) {
                if (!validateHighlightGroupName(bgStr)) {
                  errors.push(`Invalid value for ${key}.bg: ${bgStr}`);
                }
              }
            }
          }
        }
      }
    } else {
      errors.push(`Invalid highlight config for ${key}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Config全体を検証
 *
 * @param cfg - 検証する設定オブジェクト
 * @returns バリデーション結果
 */
export function validateConfig(cfg: Partial<Config>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const c = cfg as Record<string, unknown>;

  if (c.highlightHintMarker === null) {
    errors.push("highlightHintMarker must be a string");
  }
  if (c.highlightHintMarker === "") {
    errors.push("highlightHintMarker must be a non-empty string");
  }
  if (c.highlightHintMarkerCurrent === null) {
    errors.push("highlightHintMarkerCurrent must be a string");
  }
  if (c.highlightHintMarkerCurrent === "") {
    errors.push("highlightHintMarkerCurrent must be a non-empty string");
  }

  if (typeof c.highlightHintMarker === "number") {
    errors.push("highlightHintMarker must be a string");
  }
  if (typeof c.highlightHintMarkerCurrent === "number") {
    errors.push("highlightHintMarkerCurrent must be a string");
  }

  if (Array.isArray(c.highlightHintMarker)) {
    errors.push("highlightHintMarker must be a string");
  }
  if (Array.isArray(c.highlightHintMarkerCurrent)) {
    errors.push("highlightHintMarkerCurrent must be a string");
  }

  // Vim の v:true/v:false は数値 (1/0) として渡されるため、数値の 0/1 も許容
  if (c.continuousHintMode !== undefined) {
    const isBool = typeof c.continuousHintMode === "boolean";
    const isVimBool = typeof c.continuousHintMode === "number" &&
      (c.continuousHintMode === 0 || c.continuousHintMode === 1);
    if (!isBool && !isVimBool) {
      errors.push("continuousHintMode must be a boolean");
    }
  }

  if (c.recenterCommand !== undefined) {
    if (
      typeof c.recenterCommand !== "string" ||
      c.recenterCommand.trim() === ""
    ) {
      errors.push("recenterCommand must be a non-empty string");
    }
  }

  const maxContinuousJumps = c.maxContinuousJumps;
  if (maxContinuousJumps !== undefined) {
    if (
      typeof maxContinuousJumps !== "number" ||
      !Number.isInteger(maxContinuousJumps) ||
      maxContinuousJumps <= 0
    ) {
      errors.push("maxContinuousJumps must be a positive integer");
    }
  }

  if (typeof c.highlightHintMarker === "string" && c.highlightHintMarker !== "") {
    if (/^[0-9]/.test(c.highlightHintMarker)) {
      errors.push(
        "highlightHintMarker must start with a letter or underscore",
      );
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(c.highlightHintMarker)) {
      errors.push(
        "highlightHintMarker must contain only alphanumeric characters and underscores",
      );
    } else if (c.highlightHintMarker.length > 100) {
      errors.push("highlightHintMarker must be 100 characters or less");
    }
  }

  if (
    typeof c.highlightHintMarkerCurrent === "string" &&
    c.highlightHintMarkerCurrent !== ""
  ) {
    if (/^[0-9]/.test(c.highlightHintMarkerCurrent)) {
      errors.push(
        "highlightHintMarkerCurrent must start with a letter or underscore",
      );
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(c.highlightHintMarkerCurrent)) {
      errors.push(
        "highlightHintMarkerCurrent must contain only alphanumeric characters and underscores",
      );
    } else if (c.highlightHintMarkerCurrent.length > 100) {
      errors.push("highlightHintMarkerCurrent must be 100 characters or less");
    }
  }

  return { valid: errors.length === 0, errors };
}
