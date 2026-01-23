/**
 * window.ts - マルチウィンドウ機能
 *
 * Phase D-7 Process5: マルチウィンドウサポート
 *
 * このモジュールは複数ウィンドウ環境でのヒント表示を管理します。
 * - isValidBuffer: バッファ有効性チェック（Race Condition 対策）
 * - shouldUseMultiWindowMode: マルチウィンドウモードを使用すべきか判定
 * - getVisibleWindows: 可視ウィンドウの情報を取得
 * - getWindowVisibleLines: ウィンドウ可視範囲の行テキストを取得
 */
import type { Denops } from "jsr:@denops/std@^7.4.0";
import type { Config, WindowInfo } from "../../types.ts";

/**
 * バッファが有効かどうかをチェック
 *
 * Phase D-7: Race Condition 対策
 * getVisibleWindows() でバッファ情報を取得後、
 * getWindowVisibleLines() で使用するまでにバッファが
 * 閉じられる可能性があるため、API呼び出し前にチェックする。
 *
 * @param denops - Denops インスタンス
 * @param bufnr - チェックするバッファ番号
 * @returns バッファが存在し有効な場合は true
 */
export async function isValidBuffer(
  denops: Denops,
  bufnr: number
): Promise<boolean> {
  try {
    const exists = (await denops.call("bufexists", bufnr)) as number;
    return exists === 1;
  } catch {
    // エラー発生時は無効として扱う
    return false;
  }
}

/**
 * マルチウィンドウモードを使用すべきか判定
 *
 * @param denops - Denops インスタンス
 * @param config - プラグイン設定
 * @returns マルチウィンドウモードを有効にすべきかどうか
 *
 * 以下の条件をすべて満たす場合に true を返す:
 * 1. config.multiWindowMode が true
 * 2. 除外タイプを除いた可視ウィンドウが2つ以上存在
 */
export async function shouldUseMultiWindowMode(
  denops: Denops,
  config: Config
): Promise<boolean> {
  // マルチウィンドウモードが無効なら即座にfalse
  if (!config.multiWindowMode) {
    return false;
  }

  // 可視ウィンドウ数を取得
  const windows = await getVisibleWindows(denops, config);
  return windows.length > 1;
}

/**
 * 可視ウィンドウ情報を取得
 *
 * @param denops - Denops インスタンス
 * @param config - プラグイン設定
 * @returns 可視ウィンドウ情報の配列
 *
 * 除外対象のバッファタイプ（help, quickfix, terminal等）は
 * 結果から除外されます。また、multiWindowMaxWindows で
 * 取得するウィンドウ数の上限を設定できます。
 */
export async function getVisibleWindows(
  denops: Denops,
  config: Config
): Promise<WindowInfo[]> {
  const result: WindowInfo[] = [];

  try {
    // getwininfo() で全ウィンドウ情報を一括取得（より効率的）
    const winInfoList = await denops.call("getwininfo") as Array<{
      winid: number;
      bufnr: number;
      topline: number;
      botline: number;
      width: number;
      height: number;
    }>;

    const currentWin = await denops.call("win_getid") as number;

    for (const info of winInfoList) {
      // 最大ウィンドウ数チェック
      if (config.multiWindowMaxWindows && result.length >= config.multiWindowMaxWindows) {
        break;
      }

      // バッファタイプを取得
      const buftype = await denops.call("getbufvar", info.bufnr, "&buftype") as string;

      // 除外対象のバッファタイプはスキップ
      if (config.multiWindowExcludeTypes?.includes(buftype)) {
        continue;
      }

      result.push({
        winid: info.winid,
        bufnr: info.bufnr,
        topline: info.topline,
        botline: info.botline,
        width: info.width,
        height: info.height,
        isCurrent: info.winid === currentWin,
      });
    }
  } catch (error) {
    console.error("[window.ts] getVisibleWindows error:", error);
  }

  return result;
}

/**
 * ウィンドウの可視範囲の行テキストを取得
 *
 * Phase D-7: Race Condition 対策
 * API呼び出し前にバッファ有効性をチェックし、
 * 無効なバッファの場合は空配列を返す。
 *
 * @param denops - Denops インスタンス
 * @param windowInfo - ウィンドウ情報
 * @returns 可視範囲の行テキスト配列
 *
 * windowInfo.topline から windowInfo.botline までの
 * 行テキストを配列として返します。
 */
export async function getWindowVisibleLines(
  denops: Denops,
  windowInfo: WindowInfo
): Promise<string[]> {
  try {
    // バッファ有効性チェック（Race Condition 対策）
    if (!(await isValidBuffer(denops, windowInfo.bufnr))) {
      console.warn(
        `[window.ts] Buffer ${windowInfo.bufnr} is no longer valid (likely closed during async operation)`
      );
      return [];
    }

    // nvim_buf_get_lines は 0-indexed で、end は exclusive
    const lines = (await denops.call(
      "nvim_buf_get_lines",
      windowInfo.bufnr,
      windowInfo.topline - 1, // 0-indexed に変換
      windowInfo.botline, // exclusive なのでそのまま
      false // strict_indexing = false
    )) as string[];

    return lines;
  } catch (error) {
    // Race condition による Invalid buffer id エラーは警告レベルに
    if (error instanceof Error && error.message.includes("Invalid buffer id")) {
      console.warn(
        `[window.ts] Buffer became invalid during getWindowVisibleLines: ${error.message}`
      );
    } else {
      console.error("[window.ts] getWindowVisibleLines error:", error);
    }
    return [];
  }
}
