/**
 * denops/hellshake-yano/common/utils/logger.ts
 *
 * ログ機能
 *
 * Phase B-3とPhase B-4のログ機能を統合します。
 * デバッグモード制御を追加（g:hellshake_yano.debugMode）
 */

import type { Denops } from "jsr:@denops/std@7.4.0";

/**
 * ログレベル
 */
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

/**
 * デバッグモードフラグ（グローバル状態）
 * デフォルトはfalse（ログ抑制）
 */
let debugMode = false;

/**
 * デバッグログファイルパス（グローバル状態）
 * Why: console.log だけでは外部ツール(tail/less)で追跡できない。
 *      g:hellshake_yano.debugLogFile 指定時のみファイル追記 fallback を有効化。
 */
let debugLogFilePath: string | null = null;

/**
 * デバッグモードを初期化
 * g:hellshake_yano.debugMode / debugLogFile の値をチェックして設定
 *
 * @param denops - Denopsインスタンス
 *
 * @example
 * ```typescript
 * await initializeDebugMode(denops);
 * ```
 */
export async function initializeDebugMode(denops: Denops): Promise<void> {
  try {
    const config = await denops.eval("get(g:, 'hellshake_yano', {})") as Record<string, unknown>;
    debugMode = config?.debugMode === true;
    // Why: Vim 側の debugLogFile が既に init.vim で設定されているのに denops 側が受け取れていない事象に対応。
    //      string 型で明示された場合のみ有効化し、未設定・誤型は null のままにして従来挙動を維持。
    const path = config?.debugLogFile;
    debugLogFilePath = typeof path === "string" && path.length > 0 ? path : null;
  } catch {
    // エラー時はデバッグモードを無効化
    debugMode = false;
    debugLogFilePath = null;
  }
}

/**
 * デバッグモードを手動設定（テスト用）
 *
 * @param enabled - デバッグモードを有効にするか
 */
export function setDebugMode(enabled: boolean): void {
  debugMode = enabled;
}

/**
 * 現在のデバッグモード状態を取得
 *
 * @returns デバッグモードが有効かどうか
 */
export function getDebugMode(): boolean {
  return debugMode;
}

/**
 * 統一フォーマットでログを出力
 *
 * タイムスタンプとコンテキスト情報を含むログメッセージを出力します。
 * デバッグモードが無効の場合、INFO/DEBUGレベルのログは抑制されます。
 * WARN/ERRORは常に表示されます。
 *
 * @param level - ログレベル
 * @param context - モジュール/関数の名前
 * @param message - ログメッセージ
 *
 * @example
 * ```typescript
 * logMessage("INFO", "MyModule", "Processing started");
 * // デバッグモード有効時: [2024-01-01T12:00:00.000Z] [INFO] [MyModule] Processing started
 * // デバッグモード無効時: (出力なし)
 * ```
 */
export function logMessage(
  level: LogLevel,
  context: string,
  message: string,
): void {
  // デバッグモードが無効の場合、INFO/DEBUGは抑制
  if (!debugMode && (level === "INFO" || level === "DEBUG")) {
    return;
  }

  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}] [${context}] ${message}`;

  switch (level) {
    case "ERROR":
      console.error(logEntry);
      break;
    case "WARN":
      console.warn(logEntry);
      break;
    case "DEBUG":
    case "INFO":
    default:
      console.log(logEntry);
  }

  // Why: 既存 console.log のみでは外部ツール（tail, less）で追跡できない。
  //      debugLogFile 指定時のみファイル追記する fallback を追加（最小侵襲）。
  //      書き込み失敗はプラグイン本体を壊さないため silent に無視。
  if (debugMode && debugLogFilePath) {
    try {
      Deno.writeTextFileSync(debugLogFilePath, logEntry + "\n", { append: true });
    } catch {
      /* silent fail */
    }
  }
}
