/**
 * motion.ts - モーション検出
 *
 * Vim Layer: モーション検出コンポーネント
 *
 * Vim モーション (h, j, k, l, w, W, b, B等) の検出
 */

/**
 * モーション タイプ
 */
export enum MotionType {
  Character = "char", // h, l, 矢印キー
  Word = "word", // w, W, b, B
  Line = "line", // j, k
  Other = "other", // その他
}

/**
 * モーション情報
 */
export interface MotionInfo {
  key: string; // モーションキー (例: 'w', 'h', 'j')
  type: MotionType;
  count?: number; // 繰り返し回数 (例: '3w' -> count: 3)
}

/**
 * VimMotion - モーション検出クラス
 */
export class VimMotion {
  private static readonly CHARACTER_MOTIONS = new Set(["h", "l", "k", "j"]);
  private static readonly WORD_MOTIONS = new Set(["w", "W", "b", "B", "e", "E"]);
  private static readonly LINE_MOTIONS = new Set(["g", "G", "0", "$"]);

  /**
   * キー入力からモーション情報を検出
   *
   * @param key - 入力キー
   * @returns モーション情報
   *
   * @example
   * const motion = VimMotion.detectMotion('w');
   * // { key: 'w', type: MotionType.Word }
   */
  static detectMotion(key: string): MotionInfo {
    const type = this.getMotionType(key);
    return {
      key,
      type,
    };
  }

  /**
   * キーからモーション タイプを判定
   *
   * @param key - 入力キー
   * @returns モーション タイプ
   */
  private static getMotionType(key: string): MotionType {
    if (this.CHARACTER_MOTIONS.has(key)) {
      return MotionType.Character;
    }
    if (this.WORD_MOTIONS.has(key)) {
      return MotionType.Word;
    }
    if (this.LINE_MOTIONS.has(key)) {
      return MotionType.Line;
    }
    return MotionType.Other;
  }

  /**
   * モーション情報が有効か検証
   *
   * @param motion - モーション情報
   * @returns 有効な場合true
   */
  static isValidMotion(motion: MotionInfo): boolean {
    return motion.type !== MotionType.Other;
  }
}

/**
 * モーション検出状態
 */
export interface MotionState {
  lastMotion: string;           // 最後に実行したモーション
  lastMotionTime: number;        // 最後の実行時刻（ミリ秒）
  motionCount: number;           // 連打カウント
  timeoutMs: number;             // タイムアウト時間（デフォルト2000ms）
  threshold: number;             // ヒント表示閾値（デフォルト2）
}

/**
 * キーリピート設定
 */
export interface KeyRepeatConfig {
  enabled: boolean;              // 機能有効/無効
  threshold: number;             // リピート判定閾値（デフォルト50ms）
  resetDelay: number;            // リセット遅延（デフォルト300ms）
}

/**
 * モーション検出結果
 */
export interface MotionDetectionResult {
  shouldShowHints: boolean;      // ヒント表示すべきか
  skipReason?: string;           // スキップ理由（デバッグ用）
  newCount: number;              // 更新後のカウント
}

/**
 * VimMotionDetector - モーション連打検出クラス
 *
 * VimScript版のhandle_with_count()ロジックをTypeScript化
 */
export class VimMotionDetector {
  private state: MotionState;
  private lastKeyTime: number = 0;
  private isKeyRepeating: boolean = false;

  constructor(
    timeoutMs: number = 2000,
    threshold: number = 2
  ) {
    this.state = {
      lastMotion: "",
      lastMotionTime: 0,
      motionCount: 0,
      timeoutMs,
      threshold,
    };
  }

  /**
   * モーション検出処理（メインロジック）
   *
   * @param motionKey モーションキー（例: 'w', 'j'）
   * @param count カウント値（v:count1の値）
   * @param keyRepeatConfig キーリピート設定
   * @returns 検出結果
   */
  detectMotion(
    motionKey: string,
    count: number,
    keyRepeatConfig: KeyRepeatConfig
  ): MotionDetectionResult {
    const currentTime = Date.now();

    // 1. 数字プレフィックス判定（count > 1）
    if (count > 1) {
      this.resetState();
      return {
        shouldShowHints: false,
        skipReason: "numeric_prefix",
        newCount: 0,
      };
    }

    // 2. キーリピート検出
    if (this.checkKeyRepeat(currentTime, keyRepeatConfig)) {
      return {
        shouldShowHints: false,
        skipReason: "key_repeat",
        newCount: this.state.motionCount,
      };
    }

    // 3. 時間差計算
    const timeDiff = currentTime - this.state.lastMotionTime;

    // 4. タイムアウト判定
    if (timeDiff > this.state.timeoutMs) {
      this.state.motionCount = 1;
      this.state.lastMotion = motionKey;
      this.state.lastMotionTime = currentTime;
      return {
        shouldShowHints: false,
        skipReason: "timeout_reset",
        newCount: 1,
      };
    }

    // 5. 同モーション判定
    if (this.state.lastMotion === motionKey) {
      this.state.motionCount++;
    } else {
      // 別モーションなので新規カウント開始
      this.state.motionCount = 1;
      this.state.lastMotion = motionKey;
    }

    this.state.lastMotionTime = currentTime;

    // 6. 閾値チェック
    if (this.state.motionCount >= this.state.threshold) {
      return {
        shouldShowHints: true,
        newCount: this.state.motionCount,
      };
    }

    return {
      shouldShowHints: false,
      skipReason: "below_threshold",
      newCount: this.state.motionCount,
    };
  }

  /**
   * キーリピート検出
   *
   * @param currentTime 現在時刻（ミリ秒）
   * @param config キーリピート設定
   * @returns リピート検出された場合true
   */
  private checkKeyRepeat(
    currentTime: number,
    config: KeyRepeatConfig
  ): boolean {
    if (!config.enabled) {
      this.lastKeyTime = currentTime;
      return false;
    }

    const timeDiff = currentTime - this.lastKeyTime;

    // 初回キー入力は除外（lastKeyTime === 0）
    if (timeDiff < config.threshold && this.lastKeyTime > 0) {
      this.isKeyRepeating = true;
      this.lastKeyTime = currentTime;
      return true;
    }

    // リピート終了判定（reset_delay経過後）
    if (timeDiff > config.resetDelay) {
      this.isKeyRepeating = false;
    }

    this.lastKeyTime = currentTime;
    return false;
  }

  /**
   * 状態をリセット
   */
  resetState(): void {
    this.state.lastMotion = "";
    this.state.lastMotionTime = 0;
    this.state.motionCount = 0;
  }

  /**
   * 閾値を設定
   */
  setThreshold(threshold: number): void {
    this.state.threshold = threshold;
  }

  /**
   * タイムアウトを設定
   */
  setTimeout(timeoutMs: number): void {
    this.state.timeoutMs = timeoutMs;
  }

  /**
   * 現在の状態を取得（テスト用）
   */
  getState(): MotionState {
    return { ...this.state };
  }

  /**
   * キー別モーション閾値を取得
   *
   * @param key モーションキー
   * @param perKeyMotionCount キー別設定
   * @param defaultMotionCount デフォルト閾値
   * @returns 閾値
   */
  static getMotionCount(
    key: string,
    perKeyMotionCount?: Record<string, number>,
    defaultMotionCount: number = 3
  ): number {
    if (perKeyMotionCount && key in perKeyMotionCount) {
      return perKeyMotionCount[key];
    }
    return defaultMotionCount;
  }
}
