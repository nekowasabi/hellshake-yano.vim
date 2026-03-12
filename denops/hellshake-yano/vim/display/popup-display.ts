/**
 * popup-display.ts - Vim環境でのpopup_create()を使用したヒント表示
 *
 * Vim Layer: ポップアップ表示コンポーネント
 *
 * VimScript版のdisplay.vimを完全移植し、popup_create()を使用したヒント表示機能を提供
 *
 * ## VimScript版との互換性保証
 * - popup_create(): Vim標準のポップアップ機能
 * - popup_close(): ポップアップクローズ機能
 * - HintMarkerハイライト: Vimのハイライトグループ
 * - 座標系: 1-indexed（Vim標準）
 *
 * ## アルゴリズム（VimScript版と同一）
 * 1. showHint(): popup_create()でヒント表示、IDを保存
 * 2. hideAll(): 全popup_close()でクリア
 * 3. highlightPartialMatches(): マッチしないヒントのpopup_close()
 */

import type { Denops } from "@denops/std";
import type {
  DisplayAdapter,
  HintItem,
} from "../../common/interfaces/display-adapter.ts";

/**
 * ヒント情報の型定義
 */
export interface HintInfo {
  id: number; // popup ID
  hint: string; // ヒント文字列（例: 'a', 'aa', 'as'）
}

/**
 * VimPopupDisplay - Vim環境でのヒント表示クラス
 *
 * VimScript版のhellshake_yano_vim#display#show_hint()を完全移植
 */
export class VimPopupDisplay {
  private popupIds: HintInfo[] = [];

  constructor(private denops: Denops) {}

  /**
   * ヒントを表示
   *
   * VimScript版の popup_create() を呼び出し
   *
   * @param lnum 行番号（1-indexed）
   * @param col 列番号（1-indexed）
   * @param hint 表示するヒント文字列
   * @returns popup ID
   * @throws popup_create失敗時
   *
   * @example
   * const display = new VimPopupDisplay(denops);
   * const popupId = await display.showHint(10, 5, "a");
   */
  async showHint(lnum: number, col: number, hint: string): Promise<number> {
    // popup_create() を呼び出し
    const popupId = (await this.denops.call("popup_create", hint, {
      line: lnum,
      col: col,
      width: hint.length,
      height: 1,
      highlight: "HintMarker",
      zindex: 1000,
      wrap: 0,
    })) as number;

    // popup_create 失敗時チェック
    if (popupId === -1) {
      throw new Error(`failed to create popup at (${lnum}, ${col})`);
    }

    // popup ID とヒント文字を保存
    this.popupIds.push({ id: popupId, hint });

    return popupId;
  }

  /**
   * 全てのヒントを非表示
   *
   * VimScript版の popup_close() を使用して全popup をクローズ
   */
  async hideAll(): Promise<void> {
    // 各 popup を個別に閉じる
    for (const popupInfo of this.popupIds) {
      try {
        await this.denops.call("popup_close", popupInfo.id);
      } catch {
        // popup が既に閉じられている場合はスキップ
      }
    }

    // popup_ids 配列をクリア
    this.popupIds = [];
  }

  /**
   * 部分マッチしたヒントのみ表示
   *
   * VimScript版の highlightPartialMatches() ロジック
   *
   * @param matches 表示するヒントのリスト
   */
  async highlightPartialMatches(matches: string[]): Promise<void> {
    const newPopupIds: HintInfo[] = [];

    for (const popupInfo of this.popupIds) {
      if (matches.includes(popupInfo.hint)) {
        // 部分マッチ: ポップアップを維持
        newPopupIds.push(popupInfo);
      } else {
        // マッチしない: ポップアップを非表示
        try {
          await this.denops.call("popup_close", popupInfo.id);
        } catch {
          // popup が既に閉じられている場合はスキップ
        }
      }
    }

    // popup_ids を更新（マッチしたヒントのみ）
    this.popupIds = newPopupIds;
  }

  /**
   * 表示中のヒント数を取得（テスト用）
   *
   * @returns 表示中のヒント数
   */
  getPopupCount(): number {
    return this.popupIds.length;
  }
}

/**
 * PopupDisplayAdapter — VimPopupDisplayをDisplayAdapterインターフェースでラップする
 *
 * C-05: VimPopupDisplayは維持必須。このアダプターは委譲パターンで包む。
 */
export class PopupDisplayAdapter implements DisplayAdapter {
  private inner: VimPopupDisplay;

  constructor(denops: Denops) {
    this.inner = new VimPopupDisplay(denops);
  }

  /**
   * ヒントを表示する
   *
   * HintItem → VimPopupDisplay.showHint(lnum, col, hint) に委譲
   */
  async showHint(hint: HintItem): Promise<void> {
    await this.inner.showHint(hint.line, hint.col, hint.hint);
  }

  /**
   * 特定ウィンドウにヒントを表示する
   *
   * Vim popup はウィンドウ非依存で表示するため、通常の showHint に委譲。
   */
  async showHintWithWindow(hint: HintItem, _windowId: number): Promise<void> {
    await this.showHint(hint);
  }

  /**
   * 全ヒントを非表示にする
   */
  async hideAll(): Promise<void> {
    await this.inner.hideAll();
  }

  /**
   * 部分マッチするヒントのみ表示を維持する
   */
  async highlightPartialMatches(keys: string[]): Promise<void> {
    await this.inner.highlightPartialMatches(keys);
  }

  /**
   * ハイライトグループ名を取得する
   *
   * Vim popup は "HintMarker" グループを使用する。
   */
  async getHighlightGroup(_type: string): Promise<string> {
    return "HintMarker";
  }
}
