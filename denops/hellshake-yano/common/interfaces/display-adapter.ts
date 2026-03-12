/**
 * common/interfaces/display-adapter.ts
 *
 * DisplayAdapter インターフェース定義
 *
 * VimScript層の display#show_hint / display#hide_all 等に相当する
 * 表示操作の共通契約。ExtmarkDisplay (Neovim) と PopupDisplay (Vim) が実装する。
 *
 * ## 制約
 * - C-01: popup/extmark非互換 → 実装クラスが環境差を吸収する
 * - C-05: popup-display.ts 維持必須（Vim popup APIのアダプタとして存続）
 */

/**
 * HintItem: 表示するヒントの情報
 *
 * @property hint - ヒント文字列（例: 'a', 'ab'）
 * @property line - 行番号（1-indexed）
 * @property col  - 列番号（1-indexed）
 */
export interface HintItem {
  hint: string;
  line: number;
  col: number;
}

/**
 * DisplayAdapter: ヒント表示の共通インターフェース
 *
 * Vim (popup_create) / Neovim (nvim_buf_set_extmark) の差異を隠蔽する。
 */
export interface DisplayAdapter {
  /**
   * ヒントを1つ表示する
   *
   * @param hint 表示するヒント情報
   */
  showHint(hint: HintItem): Promise<void>;

  /**
   * 特定ウィンドウにヒントを表示する
   *
   * @param hint 表示するヒント情報
   * @param windowId 対象ウィンドウID
   */
  showHintWithWindow(hint: HintItem, windowId: number): Promise<void>;

  /**
   * 全ヒントを非表示にする
   *
   * VimScript版 display#hide_all() に相当
   */
  hideAll(): Promise<void>;

  /**
   * 部分マッチするヒントのみ表示を維持する
   *
   * @param keys 維持するヒントキーのリスト
   */
  highlightPartialMatches(keys: string[]): Promise<void>;

  /**
   * ハイライトグループ名を取得する
   *
   * @param type ハイライトの種別（例: 'marker', 'partial'）
   * @returns ハイライトグループ名
   */
  getHighlightGroup(type: string): Promise<string>;
}
