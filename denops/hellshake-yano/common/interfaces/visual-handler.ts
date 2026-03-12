/**
 * common/interfaces/visual-handler.ts
 *
 * VisualHandler インターフェース定義
 *
 * VimScript層の visual#init / visual#get_state / visual#show に相当する
 * ビジュアルモードヒント表示の共通契約。
 */

/**
 * VisualConfig: ビジュアルモードの設定
 *
 * @property mode - ビジュアルモードの種別
 */
export interface VisualConfig {
  mode: "char" | "line" | "block";
}

/**
 * VisualState: ビジュアルモードの現在状態
 *
 * @property isActive  - ビジュアルモード中フラグ
 * @property startLine - 選択開始行（1-indexed）
 * @property endLine   - 選択終了行（1-indexed）
 * @property startCol  - 選択開始列（1-indexed）
 * @property endCol    - 選択終了列（1-indexed）
 */
export interface VisualState {
  isActive: boolean;
  startLine: number;
  endLine: number;
  startCol: number;
  endCol: number;
}

/**
 * VisualRange: ビジュアル選択範囲
 *
 * @property startLine - 範囲開始行（1-indexed）
 * @property endLine   - 範囲終了行（1-indexed）
 * @property startCol  - 範囲開始列（1-indexed）
 * @property endCol    - 範囲終了列（1-indexed）
 */
export interface VisualRange {
  startLine: number;
  endLine: number;
  startCol: number;
  endCol: number;
}

/**
 * VisualHandler: ビジュアルモードヒント表示の共通インターフェース
 *
 * VimScript版 visual#init / visual#get_state / visual#show の
 * Denops側実装が実装する契約。
 */
export interface VisualHandler {
  /**
   * ビジュアルモードを初期化する
   *
   * @param config ビジュアルモード設定（VimScript版 visual#init() に相当）
   */
  initialize(config: VisualConfig): Promise<void>;

  /**
   * ビジュアルモードの現在状態を取得する
   *
   * @returns VisualState（VimScript版 visual#get_state() に相当）
   */
  getState(): Promise<VisualState>;

  /**
   * 指定範囲内にヒントを表示する
   *
   * @param range ビジュアル選択範囲（VimScript版 visual#show() に相当）
   */
  showHints(range: VisualRange): Promise<void>;
}
