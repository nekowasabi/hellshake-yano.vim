/**
 * window.ts - マルチウィンドウ機能
 *
 * Phase D-7 Process5: マルチウィンドウサポート
 *
 * このモジュールは複数ウィンドウ環境でのヒント表示を管理します。
 * - shouldUseMultiWindowMode: マルチウィンドウモードを使用すべきか判定
 * - getVisibleWindows: 可視ウィンドウの情報を取得
 */
import type { Denops } from "jsr:@denops/std@^7.4.0";
import type { Config, WindowInfo } from "../../types.ts";

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
    // nvim_buf_get_lines は 0-indexed で、end は exclusive
    const lines = await denops.call(
      "nvim_buf_get_lines",
      windowInfo.bufnr,
      windowInfo.topline - 1,  // 0-indexed に変換
      windowInfo.botline,       // exclusive なのでそのまま
      false                     // strict_indexing = false
    ) as string[];

    return lines;
  } catch (error) {
    console.error("[window.ts] getWindowVisibleLines error:", error);
    return [];
  }
}
