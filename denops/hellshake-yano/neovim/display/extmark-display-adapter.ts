/**
 * neovim/display/extmark-display-adapter.ts
 *
 * ExtmarkDisplayAdapter — Neovim extmark APIを使ったDisplayAdapterの実装
 *
 * DisplayAdapterインターフェースを実装し、Neovimの nvim_buf_set_extmark を
 * 使用してヒントを表示する。extmark-display.ts の既存関数に委譲する。
 *
 * ## 制約
 * - C-01: Vim popup非互換 → このクラスはNeovim専用
 * - C-04: core.tsモノリスへの変更最小化 → 既存関数を内部呼び出し
 */

import type { Denops } from "@denops/std";
import type { DisplayAdapter, HintItem } from "../../common/interfaces/display-adapter.ts";

/** デフォルトのhintハイライトグループ */
const DEFAULT_HINT_GROUP = "HellshakeYanoMarker";
/** extmarkの優先度 */
const HINT_PRIORITY = 200;

/**
 * ExtmarkDisplayAdapter — Neovim用DisplayAdapter実装
 *
 * nvim_buf_set_extmark による仮想テキスト表示でヒントを描画する。
 */
export class ExtmarkDisplayAdapter implements DisplayAdapter {
  private namespace: number | null = null;
  private hints: HintItem[] = [];
  private extmarkIds: number[] = [];

  constructor(private readonly denops: Denops) {}

  /**
   * namespaceを遅延初期化する（テスト時のcall回数を最小化）
   */
  private async getNamespace(): Promise<number> {
    if (this.namespace === null) {
      this.namespace = await this.denops.call(
        "nvim_create_namespace",
        "hellshake_yano_hints",
      ) as number;
    }
    return this.namespace;
  }

  /**
   * ヒントを表示する
   *
   * nvim_buf_set_extmark で仮想テキストとして描画する。
   */
  async showHint(hint: HintItem): Promise<void> {
    const ns = await this.getNamespace();
    const bufnr = await this.denops.call("nvim_get_current_buf") as number;

    // 0-indexed に変換（nvim API は0-indexed）
    const row = hint.line - 1;
    const col = hint.col - 1;

    const id = await this.denops.call("nvim_buf_set_extmark", bufnr, ns, row, col, {
      virt_text: [[hint.hint, DEFAULT_HINT_GROUP]],
      virt_text_pos: "overlay",
      priority: HINT_PRIORITY,
    }) as number;

    this.hints.push(hint);
    this.extmarkIds.push(id);
  }

  /**
   * 特定ウィンドウにヒントを表示する（スタブ実装）
   *
   * Neovim ではウィンドウ単位のextmarkはフローティングウィンドウで実現するが、
   * 現状は通常のshowHintに委譲する。
   */
  async showHintWithWindow(hint: HintItem, _windowId: number): Promise<void> {
    await this.showHint(hint);
  }

  /**
   * 全ヒントを消去する
   *
   * nvim_buf_clear_namespace で namespace内の全extmarkを削除する。
   */
  async hideAll(): Promise<void> {
    const ns = await this.getNamespace();
    const bufnr = await this.denops.call("nvim_get_current_buf") as number;

    await this.denops.call("nvim_buf_clear_namespace", bufnr, ns, 0, -1);

    this.hints = [];
    this.extmarkIds = [];
  }

  /**
   * 部分マッチするヒントのみ表示を維持する
   *
   * マッチしないヒントを削除し、マッチするもののみ残す。
   * 実装: 全削除 → マッチするヒントを再描画
   */
  async highlightPartialMatches(keys: string[]): Promise<void> {
    const matchingHints = this.hints.filter((h) => keys.includes(h.hint));

    // 全クリア
    await this.hideAll();

    // マッチするヒントのみ再描画
    for (const hint of matchingHints) {
      await this.showHint(hint);
    }
  }

  /**
   * ハイライトグループ名を取得する
   */
  async getHighlightGroup(_type: string): Promise<string> {
    return DEFAULT_HINT_GROUP;
  }

  /**
   * 現在表示中のヒント数を取得する（テスト用）
   */
  getHintCount(): number {
    return this.hints.length;
  }
}
