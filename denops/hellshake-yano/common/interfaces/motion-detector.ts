/**
 * common/interfaces/motion-detector.ts
 *
 * MotionDetector インターフェース定義
 *
 * VimScript層の motion#set_threshold / motion#set_timeout / motion#get_state に相当する
 * モーション検出設定の共通契約。
 *
 * ## 制約
 * - C-02: getchar入力ループ系はVimScript維持必須（カテゴリ3）
 * - このインターフェースはconfig/state管理のみを担う
 */

/**
 * MotionDetectorState: モーション検出の現在状態
 *
 * @property threshold - キーストローク数しきい値
 * @property timeout   - タイムアウト（ミリ秒）
 * @property isActive  - モーション入力中フラグ
 */
export interface MotionDetectorState {
  threshold: number;
  timeout: number;
  isActive: boolean;
}

/**
 * MotionDetector: モーション検出設定の共通インターフェース
 *
 * VimScript版 motion#set_threshold / motion#set_timeout / motion#get_state の
 * Denops側実装が実装する契約。
 */
export interface MotionDetector {
  /**
   * キーストローク数しきい値を設定する
   *
   * @param threshold しきい値（VimScript版 motion#set_threshold() に相当）
   */
  setThreshold(threshold: number): Promise<void>;

  /**
   * タイムアウトを設定する（ミリ秒）
   *
   * @param timeout タイムアウト値（VimScript版 motion#set_timeout() に相当）
   */
  setTimeout(timeout: number): Promise<void>;

  /**
   * モーション検出の現在状態を取得する
   *
   * @returns MotionDetectorState（VimScript版 motion#get_state() に相当）
   */
  getState(): Promise<MotionDetectorState>;
}
