import type { HighlightColor, HintPositionType } from "./types.ts";
import { validateHighlightGroupName } from "./validation-utils.ts";

export interface Config {
  enabled: boolean;
  markers: string[];
  motionCount: number;
  motionTimeout: number;
  hintPosition: "start" | "end" | "overlay" | "both";
  triggerOnHjkl: boolean;
  countedMotions: string[];
  maxHints: number;
  debounceDelay: number;
  useNumbers: boolean;
  directionalHintFilter: boolean;
  highlightSelected: boolean;
  debugCoordinates: boolean;
  singleCharKeys: string[];
  multiCharKeys: string[];
  maxSingleCharHints?: number;
  useHintGroups: boolean;
  continuousHintMode: boolean;
  recenterCommand: string;
  maxContinuousJumps: number;
  highlightHintMarker: string | HighlightColor;
  highlightHintMarkerCurrent: string | HighlightColor;
  suppressOnKeyRepeat: boolean;
  keyRepeatThreshold: number;
  useJapanese: boolean;
  wordDetectionStrategy: "regex" | "tinysegmenter" | "hybrid";
  enableTinySegmenter: boolean;
  segmenterThreshold: number;
  japaneseMinWordLength: number;
  japaneseMergeParticles: boolean;
  japaneseMergeThreshold: number;
  perKeyMinLength?: Record<string, number>;
  defaultMinWordLength: number;
  perKeyMotionCount?: Record<string, number>;
  defaultMotionCount: number;
  currentKeyContext?: string;
  motionCounterEnabled: boolean;
  motionCounterThreshold: number;
  motionCounterTimeout: number;
  showHintOnMotionThreshold: boolean;
  debugMode: boolean;
  performanceLog: boolean;
  debug?: boolean;
  useNumericMultiCharHints?: boolean;
  bothMinWordLength?: number;
  // Multi-window support settings (Phase MW)
  /** Enable multi-window hint display mode */
  multiWindowMode: boolean;
  /** Buffer types to exclude from multi-window detection */
  multiWindowExcludeTypes: string[];
  /** Maximum number of windows to process */
  multiWindowMaxWindows: number;
}

export const DEFAULT_CONFIG: Config = {
  enabled: true,
  markers: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  motionCount: 3,
  motionTimeout: 2000,
  hintPosition: "start",
  triggerOnHjkl: true,
  countedMotions: [],
  maxHints: 336,
  debounceDelay: 50,
  useNumbers: false,
  directionalHintFilter: false,
  highlightSelected: false,
  debugCoordinates: false,
  singleCharKeys: [
    "A",
    "S",
    "D",
    "F",
    "G",
    "H",
    "J",
    "K",
    "L",
    "N",
    "M",
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
  ],
  multiCharKeys: ["B", "C", "E", "I", "O", "P", "Q", "R", "T", "U", "V", "W", "X", "Y", "Z"],
  maxSingleCharHints: 21,
  useHintGroups: true,
  continuousHintMode: false,
  recenterCommand: "normal! zz",
  maxContinuousJumps: 50,
  highlightHintMarker: "DiffAdd",
  highlightHintMarkerCurrent: "DiffText",
  suppressOnKeyRepeat: true,
  keyRepeatThreshold: 50,
  useJapanese: false,
  wordDetectionStrategy: "hybrid",
  enableTinySegmenter: true,
  segmenterThreshold: 4,
  japaneseMinWordLength: 2,
  japaneseMergeParticles: true,
  japaneseMergeThreshold: 2,
  perKeyMinLength: {},
  defaultMinWordLength: 3,
  perKeyMotionCount: {},
  defaultMotionCount: 3,
  motionCounterEnabled: true,
  motionCounterThreshold: 3,
  motionCounterTimeout: 2000,
  showHintOnMotionThreshold: true,
  debugMode: false,
  performanceLog: false,
  debug: false,
  useNumericMultiCharHints: false,
  bothMinWordLength: 5,
  // Multi-window support defaults (Phase MW)
  multiWindowMode: false, // Disabled by default for backward compatibility
  multiWindowExcludeTypes: ["help", "quickfix", "terminal", "popup", "nofile"],
  multiWindowMaxWindows: 4,
};

export const DEFAULT_UNIFIED_CONFIG: Config = DEFAULT_CONFIG;
export function getDefaultConfig(): Config {
  return DEFAULT_CONFIG;
}
export function getDefaultUnifiedConfig(): Config {
  return DEFAULT_UNIFIED_CONFIG;
}
export function createMinimalConfig(p: Partial<Config> = {}): Config {
  return { ...DEFAULT_CONFIG, ...p };
}

function isValidHighlightGroup(n: string): boolean {
  return validateHighlightGroupName(n);
}

function vCore(c: Partial<Config>, e: string[]): void {
  if (c.markers !== undefined) {
    if (!Array.isArray(c.markers)) e.push("markers must be an array");
    else if (c.markers.length === 0) e.push("markers must not be empty");
    else {
      if (!c.markers.every((m) => typeof m === "string")) {
        e.push("markers must be an array of strings");
      } else if (new Set(c.markers).size !== c.markers.length) {
        e.push("markers must contain unique values");
      }
    }
  }
  if (
    c.motionCount !== undefined &&
    (c.motionCount === null || !Number.isInteger(c.motionCount) || c.motionCount <= 0)
  ) {
    e.push("motionCount must be a positive integer");
  }
  if (
    c.motionTimeout !== undefined && (!Number.isInteger(c.motionTimeout) || c.motionTimeout < 100)
  ) {
    e.push("motionTimeout must be at least 100ms");
  }
  if (c.hintPosition !== undefined) {
    const vp = ["start", "end", "overlay", "both"];
    if (c.hintPosition === null || !vp.includes(c.hintPosition as string)) {
      e.push("hintPosition must be one of: start, end, overlay, both");
    }
  }
}

function vHint(c: Partial<Config>, e: string[]): void {
  if (c.directionalHintFilter !== undefined && typeof c.directionalHintFilter !== "boolean") {
    e.push("directionalHintFilter must be a boolean");
  }
  if (c.maxHints !== undefined && (!Number.isInteger(c.maxHints) || c.maxHints <= 0)) {
    e.push("maxHints must be a positive integer");
  }
  if (
    c.debounceDelay !== undefined && (!Number.isInteger(c.debounceDelay) || c.debounceDelay < 0)
  ) e.push("debounceDelay must be a non-negative number");
  if (c.useNumbers !== undefined && typeof c.useNumbers !== "boolean") {
    e.push("useNumbers must be a boolean");
  }
  if (c.continuousHintMode !== undefined && typeof c.continuousHintMode !== "boolean") {
    e.push("continuousHintMode must be a boolean");
  }
  if (c.recenterCommand !== undefined) {
    if (typeof c.recenterCommand !== "string" || c.recenterCommand.trim() === "") {
      e.push("recenterCommand must be a non-empty string");
    }
  }
  if (
    c.maxContinuousJumps !== undefined &&
    (!Number.isInteger(c.maxContinuousJumps) || c.maxContinuousJumps <= 0)
  ) {
    e.push("maxContinuousJumps must be a positive integer");
  }
  if (
    c.bothMinWordLength !== undefined &&
    (!Number.isInteger(c.bothMinWordLength) || c.bothMinWordLength < 1)
  ) {
    e.push("bothMinWordLength must be a positive integer");
  }
  // singleCharKeys: 文字列または配列を許可
  if (c.singleCharKeys !== undefined) {
    const r = c as Record<string, unknown>;
    const isString = typeof r.singleCharKeys === "string";
    const isArray = Array.isArray(r.singleCharKeys);

    if (!isString && !isArray) {
      e.push("singleCharKeys must be a string or an array");
    } else if (isString) {
      const str = r.singleCharKeys as string;
      if (str === "") {
        e.push("singleCharKeys must not be empty");
      } else {
        const vs = new Set([";", ":", "[", "]", "'", '"', ",", ".", "/", "\\", "-", "=", "`", "@"]);
        for (let i = 0; i < str.length; i++) {
          const k = str[i];
          const isAn = /^[a-zA-Z0-9]$/.test(k);
          const isVs = vs.has(k);
          const isWs = /^\s$/.test(k);
          const isCc = k.charCodeAt(0) < 32 || k.charCodeAt(0) === 127;
          if (!isAn && !isVs) {
            if (isWs) {
              e.push("singleCharKeys must not contain whitespace characters (space, tab, newline)");
            } else if (isCc) e.push("singleCharKeys must not contain control characters");
            else {e.push(
                `singleCharKeys contains invalid character: '${k}'. Valid symbols are: ; : [ ] ' " , . / \\ - = \` @`,
              );}
            break;
          }
        }
        if (new Set(str).size !== str.length) e.push("singleCharKeys must contain unique values");
      }
    } else if (isArray) {
      const arr = r.singleCharKeys as unknown[];
      if (arr.length > 0) {
        const vs = new Set([";", ":", "[", "]", "'", '"', ",", ".", "/", "\\", "-", "=", "`", "@"]);
        for (let i = 0; i < arr.length; i++) {
          const k = arr[i];
          if (typeof k !== "string") {
            e.push("singleCharKeys must be an array of strings");
            break;
          }
          if (k === "") {
            e.push("singleCharKeys must not contain empty strings");
            break;
          }
          if (k.length !== 1) {
            e.push("singleCharKeys must contain only single character strings");
            break;
          }
          const isAn = /^[a-zA-Z0-9]$/.test(k);
          const isVs = vs.has(k);
          const isWs = /^\s$/.test(k);
          const isCc = k.charCodeAt(0) < 32 || k.charCodeAt(0) === 127;
          if (!isAn && !isVs) {
            if (isWs) {
              e.push("singleCharKeys must not contain whitespace characters (space, tab, newline)");
            } else if (isCc) e.push("singleCharKeys must not contain control characters");
            else {e.push(
                `singleCharKeys contains invalid character: '${k}'. Valid symbols are: ; : [ ] ' " , . / \\ - = \` @`,
              );}
            break;
          }
        }
        if (new Set(arr).size !== arr.length) e.push("singleCharKeys must contain unique values");
      }
    }
  }

  // multiCharKeys: 文字列または配列を許可
  if (c.multiCharKeys !== undefined) {
    const r = c as Record<string, unknown>;
    const isString = typeof r.multiCharKeys === "string";
    const isArray = Array.isArray(r.multiCharKeys);

    if (!isString && !isArray) {
      e.push("multiCharKeys must be a string or an array");
    } else if (isString) {
      const str = r.multiCharKeys as string;
      if (str === "") {
        e.push("multiCharKeys must not be empty");
      } else {
        for (let i = 0; i < str.length; i++) {
          const k = str[i];
          if (!/^[a-zA-Z0-9]$/.test(k)) {
            e.push(`multiCharKeys must contain only alphanumeric characters, found: '${k}'`);
            break;
          }
        }
        if (new Set(str).size !== str.length) e.push("multiCharKeys must contain unique values");
      }
    } else if (isArray) {
      const arr = r.multiCharKeys as unknown[];
      if (arr.length > 0) {
        for (let i = 0; i < arr.length; i++) {
          const k = arr[i];
          if (typeof k !== "string") {
            e.push("multiCharKeys must be an array of strings");
            break;
          }
          if (k === "") {
            e.push("multiCharKeys must not contain empty strings");
            break;
          }
          if (k.length !== 1) {
            e.push("multiCharKeys must contain only single character strings");
            break;
          }
          if (!/^[a-zA-Z0-9]$/.test(k)) {
            e.push(`multiCharKeys must contain only alphanumeric characters, found: '${k}'`);
            break;
          }
        }
        if (new Set(arr).size !== arr.length) e.push("multiCharKeys must contain unique values");
      }
    }
  }
}

function vExtHint(c: Partial<Config>, e: string[]): void {
  if (
    c.maxSingleCharHints !== undefined &&
    (!Number.isInteger(c.maxSingleCharHints) || c.maxSingleCharHints <= 0)
  ) {
    e.push("maxSingleCharHints must be a positive integer");
  }
  const vHlg = (v: string | HighlightColor | undefined, n: string) => {
    if (v !== undefined) {
      if (typeof v === "string") {
        if (v === "") e.push(`${n} must be a non-empty string`);
        else if (!isValidHighlightGroup(v)) {
          if (v.length > 100) e.push(`${n} must be 100 characters or less`);
          else if (/^[0-9]/.test(v)) e.push(`${n} must start with a letter or underscore`);
          else e.push(`${n} must contain only alphanumeric characters and underscores`);
        }
      } else if (typeof v !== "object") e.push(`${n} must be a string or HighlightColor object`);
    }
  };
  vHlg(c.highlightHintMarker, "highlightHintMarker");
  vHlg(c.highlightHintMarkerCurrent, "highlightHintMarkerCurrent");
}

function vWord(c: Partial<Config>, e: string[]): void {
  if (
    c.keyRepeatThreshold !== undefined &&
    (!Number.isInteger(c.keyRepeatThreshold) || c.keyRepeatThreshold < 0)
  ) {
    e.push("keyRepeatThreshold must be a non-negative integer");
  }
  if (c.wordDetectionStrategy !== undefined) {
    const vs = ["regex", "tinysegmenter", "hybrid"];
    if (!vs.includes(c.wordDetectionStrategy)) {
      e.push(`wordDetectionStrategy must be one of: ${vs.join(", ")}`);
    }
  }
  if (
    c.segmenterThreshold !== undefined &&
    (!Number.isInteger(c.segmenterThreshold) || c.segmenterThreshold <= 0)
  ) {
    e.push("segmenterThreshold must be a positive integer");
  }
}

function vJpWord(c: Partial<Config>, e: string[]): void {
  if (
    c.japaneseMinWordLength !== undefined &&
    (!Number.isInteger(c.japaneseMinWordLength) || c.japaneseMinWordLength <= 0)
  ) {
    e.push("japaneseMinWordLength must be a positive integer");
  }
  if (
    c.japaneseMergeThreshold !== undefined &&
    (!Number.isInteger(c.japaneseMergeThreshold) || c.japaneseMergeThreshold <= 0)
  ) {
    e.push("japaneseMergeThreshold must be a positive integer");
  }
  if (
    c.defaultMinWordLength !== undefined &&
    (!Number.isInteger(c.defaultMinWordLength) || c.defaultMinWordLength <= 0)
  ) {
    e.push("defaultMinWordLength must be a positive integer");
  }
  if (
    c.defaultMotionCount !== undefined &&
    (!Number.isInteger(c.defaultMotionCount) || c.defaultMotionCount <= 0)
  ) {
    e.push("defaultMotionCount must be a positive integer");
  }
}

export function validateUnifiedConfig(c: Partial<Config>): { valid: boolean; errors: string[] } {
  const e: string[] = [];
  vCore(c, e);
  vHint(c, e);
  vExtHint(c, e);
  vWord(c, e);
  vJpWord(c, e);
  return { valid: e.length === 0, errors: e };
}

export function validateConfig(c: Partial<Config>): { valid: boolean; errors: string[] } {
  const e: string[] = [];
  const r = c as Record<string, unknown>;
  if (r.motionCount !== undefined && r.motionCount === null) e.push("motionCount cannot be null");
  if (r.hintPosition !== undefined && r.hintPosition === null) {
    e.push("hintPosition cannot be null");
  }
  if (r.highlightHintMarker !== undefined) {
    if (r.highlightHintMarker === null) e.push("highlightHintMarker cannot be null");
    else if (typeof r.highlightHintMarker === "number") {
      e.push("highlightHintMarker must be a string");
    } else if (Array.isArray(r.highlightHintMarker)) e.push("highlightHintMarker must be a string");
    else if (typeof r.highlightHintMarker === "string") {
      if (r.highlightHintMarker === "") e.push("highlightHintMarker must be a non-empty string");
      else if (!isValidHighlightGroup(r.highlightHintMarker)) {
        if (r.highlightHintMarker.length > 100) {
          e.push("highlightHintMarker must be 100 characters or less");
        } else if (/^[0-9]/.test(r.highlightHintMarker)) {
          e.push("highlightHintMarker must start with a letter or underscore");
        } else {e.push(
            "highlightHintMarker must contain only alphanumeric characters and underscores",
          );}
      }
    }
  }
  if (r.highlightHintMarkerCurrent !== undefined) {
    if (r.highlightHintMarkerCurrent === null) e.push("highlightHintMarkerCurrent cannot be null");
    else if (typeof r.highlightHintMarkerCurrent === "number") {
      e.push("highlightHintMarkerCurrent must be a string");
    } else if (Array.isArray(r.highlightHintMarkerCurrent)) {
      e.push("highlightHintMarkerCurrent must be a string");
    } else if (typeof r.highlightHintMarkerCurrent === "string") {
      if (r.highlightHintMarkerCurrent === "") {
        e.push("highlightHintMarkerCurrent must be a non-empty string");
      } else if (!isValidHighlightGroup(r.highlightHintMarkerCurrent)) {
        if (r.highlightHintMarkerCurrent.length > 100) {
          e.push("highlightHintMarkerCurrent must be 100 characters or less");
        } else if (/^[0-9]/.test(r.highlightHintMarkerCurrent)) {
          e.push("highlightHintMarkerCurrent must start with a letter or underscore");
        } else {e.push(
            "highlightHintMarkerCurrent must contain only alphanumeric characters and underscores",
          );}
      }
    }
  }
  if (e.length > 0) return { valid: false, errors: e };
  const v = validateUnifiedConfig(c);
  return { valid: v.valid && e.length === 0, errors: [...e, ...v.errors] };
}

type LegacyConfig = Partial<Config> & Record<string, unknown>;

function normalizeLegacyKeys(input: Partial<Config>): Partial<Config> {
  const normalized = { ...input } as LegacyConfig;
  const legacyDirectional = normalized["directional_hint_filter"];
  if (normalized.directionalHintFilter === undefined && legacyDirectional !== undefined) {
    if (typeof legacyDirectional === "number") {
      normalized.directionalHintFilter = legacyDirectional !== 0;
    } else if (typeof legacyDirectional === "boolean") {
      normalized.directionalHintFilter = legacyDirectional;
    } else if (typeof legacyDirectional === "string") {
      normalized.directionalHintFilter = legacyDirectional.toLowerCase() === "true";
    }
  }
  if (Object.prototype.hasOwnProperty.call(normalized, "directional_hint_filter")) {
    delete normalized["directional_hint_filter"];
  }
  return normalized;
}

export function mergeConfig(b: Config, u: Partial<Config>): Config {
  const normalizedInput = normalizeLegacyKeys(u);
  const v = validateConfig(normalizedInput);
  if (!v.valid) {
    console.error("[ERROR] mergeConfig: validation failed", v.errors);
    throw new Error(`Invalid config: ${v.errors.join(", ")}`);
  }

  // Vim の v:true/v:false (数値 1/0) を boolean に正規化
  const normalized = { ...normalizedInput } as LegacyConfig;

  if (typeof normalized.continuousHintMode === "number") {
    normalized.continuousHintMode = normalized.continuousHintMode !== 0;
  }

  // singleCharKeys: 文字列を配列に正規化
  const r = normalized as Record<string, unknown>;
  if (typeof r.singleCharKeys === "string") {
    r.singleCharKeys = r.singleCharKeys.split("");
  }

  // multiCharKeys: 文字列を配列に正規化
  if (typeof r.multiCharKeys === "string") {
    r.multiCharKeys = r.multiCharKeys.split("");
  }

  const result = { ...b, ...normalized };

  return result;
}
export function cloneConfig(c: Config): Config {
  return JSON.parse(JSON.stringify(c));
}
export function getPerKeyValue<T>(
  c: Config,
  k: string,
  p: Record<string, T> | undefined,
  d: T | undefined,
  f: T,
): T {
  if (p && p[k] !== undefined) return p[k];
  if (d !== undefined) return d;
  return f;
}
export function createModernConfig(i: Partial<Config> = {}): Config {
  return createMinimalConfig(i);
}

export interface ValidationRules {
  type?: "string" | "number" | "boolean" | "array" | "object";
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  enum?: readonly (string | number | boolean)[];
  custom?: (value: unknown) => boolean;
}
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

function isValidType(v: unknown, t: string): boolean {
  if (t === "string") return typeof v === "string";
  if (t === "number") return typeof v === "number" && !isNaN(v);
  if (t === "boolean") return typeof v === "boolean";
  if (t === "array") return Array.isArray(v);
  if (t === "object") return typeof v === "object" && v !== null && !Array.isArray(v);
  return false;
}
function isInRange(v: number, min?: number, max?: number): boolean {
  if (min !== undefined && v < min) return false;
  if (max !== undefined && v > max) return false;
  return true;
}
function isValidLength(v: string, min?: number, max?: number): boolean {
  if (min !== undefined && v.length < min) return false;
  if (max !== undefined && v.length > max) return false;
  return true;
}
function isValidArrayLength(a: unknown[], min?: number, max?: number): boolean {
  if (min !== undefined && a.length < min) return false;
  if (max !== undefined && a.length > max) return false;
  return true;
}
function isValidEnum(v: unknown, vs: readonly (string | number | boolean)[]): boolean {
  return vs.includes(v as string | number | boolean);
}
export function validateConfigValue(k: string, v: unknown, r: ValidationRules): ValidationResult {
  if (r.required && (v === undefined || v === null)) {
    return { valid: false, error: `${k} is required` };
  }
  if (v === undefined || v === null) return { valid: true };
  if (r.type && !isValidType(v, r.type)) {
    return { valid: false, error: `${k} must be of type ${r.type}` };
  }
  if (r.type === "number" && typeof v === "number") {
    if (!isInRange(v, r.min, r.max)) {
      const ms = r.min !== undefined ? `min: ${r.min}` : "";
      const xs = r.max !== undefined ? `max: ${r.max}` : "";
      const rs = [ms, xs].filter((s) => s).join(", ");
      return { valid: false, error: `${k} is out of range (${rs})` };
    }
  }
  if (r.type === "string" && typeof v === "string") {
    if (!isValidLength(v, r.minLength, r.maxLength)) {
      const ms = r.minLength !== undefined ? `min: ${r.minLength}` : "";
      const xs = r.maxLength !== undefined ? `max: ${r.maxLength}` : "";
      const ls = [ms, xs].filter((s) => s).join(", ");
      return { valid: false, error: `${k} length is invalid (${ls})` };
    }
  }
  if (r.type === "array" && Array.isArray(v)) {
    if (!isValidArrayLength(v, r.minLength, r.maxLength)) {
      const ms = r.minLength !== undefined ? `min: ${r.minLength}` : "";
      const xs = r.maxLength !== undefined ? `max: ${r.maxLength}` : "";
      const ls = [ms, xs].filter((s) => s).join(", ");
      return { valid: false, error: `${k} array length is invalid (${ls})` };
    }
  }
  if (r.enum && !isValidEnum(v, r.enum)) {
    return { valid: false, error: `${k} must be one of: ${r.enum.join(", ")}` };
  }
  if (r.custom && !r.custom(v)) return { valid: false, error: `${k} failed custom validation` };
  return { valid: true };
}
export function validateConfigObject(
  c: Record<string, unknown>,
  rm: Record<string, ValidationRules>,
): ValidationResult & { errors?: Record<string, string> } {
  const es: Record<string, string> = {};
  let he = false;
  for (const [k, r] of Object.entries(rm)) {
    const res = validateConfigValue(k, c[k], r);
    if (!res.valid && res.error) {
      es[k] = res.error;
      he = true;
    }
  }
  return {
    valid: !he,
    ...(he && { error: `Validation failed for: ${Object.keys(es).join(", ")}`, errors: es }),
  };
}
