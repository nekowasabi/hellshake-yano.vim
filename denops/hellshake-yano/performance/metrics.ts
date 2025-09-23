/**
 * パフォーマンス測定結果を保持するインターフェース
 *
 * 各操作の実行時間を配列で管理し、最新50件のデータを保持する。
 * メモリ使用量の制限により、古いデータは自動的に削除される。
 *
 * @example
 * ```typescript
 * const metrics: PerformanceMetrics = {
 *   showHints: [10.5, 15.2],
 *   hideHints: [5.1],
 *   wordDetection: [],
 *   hintGeneration: [25.3, 30.7]
 * };
 * ```
 */
export interface PerformanceMetrics {
  /** ヒント表示処理の実行時間（ミリ秒） */
  showHints: number[];
  /** ヒント非表示処理の実行時間（ミリ秒） */
  hideHints: number[];
  /** 単語検出処理の実行時間（ミリ秒） */
  wordDetection: number[];
  /** ヒント生成処理の実行時間（ミリ秒） */
  hintGeneration: number[];
}

/**
 * パフォーマンス測定結果を格納するオブジェクト
 *
 * 各操作の実行時間を保持し、デバッグとパフォーマンス分析に使用される。
 * 最新50件のデータを保持し、古いデータは自動的に削除される。
 *
 * @remarks
 * このオブジェクトは直接変更されることを想定している。
 * 測定データへのアクセスは関連する関数を通じて行うことを推奨する。
 */
export let performanceMetrics: PerformanceMetrics = {
  showHints: [],
  hideHints: [],
  wordDetection: [],
  hintGeneration: [],
};

/**
 * Config型の最小定義（パフォーマンス測定に必要な部分のみ）
 */
export interface PerformanceConfig {
  performance_log: boolean;
  debug_mode: boolean;
}

/**
 * パフォーマンス測定結果を記録する
 *
 * @param operation - 測定対象の操作名
 * @param startTime - 操作開始時刻（ミリ秒）
 * @param endTime - 操作終了時刻（ミリ秒）
 * @param config - パフォーマンス測定の設定
 * @throws {Error} 開始時刻が終了時刻より後の場合
 */
export function recordPerformance(
  operation: keyof PerformanceMetrics,
  startTime: number,
  endTime: number,
  config: PerformanceConfig,
): void {
  if (!config.performance_log) return;

  // エラーハンドリング: 時刻の妥当性チェック
  if (startTime > endTime) {
    throw new Error(`Invalid time range: startTime (${startTime}) > endTime (${endTime})`);
  }

  const duration = endTime - startTime;
  performanceMetrics[operation].push(duration);

  // 最新50件のみ保持（メモリ使用量制限）
  if (performanceMetrics[operation].length > 50) {
    performanceMetrics[operation] = performanceMetrics[operation].slice(-50);
  }

  // デバッグモードの場合はコンソールにもログ出力
  if (config.debug_mode) {
    console.log(`[hellshake-yano:PERF] ${operation}: ${duration}ms`);
  }
}

/**
 * 現在のパフォーマンス測定結果を取得する
 *
 * 元のデータを変更から守るため、各配列のディープコピーを返す。
 * この関数は外部からのメトリクス参照時に使用することを推奨する。
 *
 * @returns パフォーマンス測定結果のディープコピー
 * @example
 * ```typescript
 * const metrics = getPerformanceMetrics();
 * console.log(`平均表示時間: ${metrics.showHints.reduce((a, b) => a + b, 0) / metrics.showHints.length}ms`);
 * ```
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  // スプレッド演算子を使用した効率的なシャローコピー
  // 配列の要素はプリミティブ型（number）のため、シャローコピーで十分
  return {
    showHints: [...performanceMetrics.showHints],
    hideHints: [...performanceMetrics.hideHints],
    wordDetection: [...performanceMetrics.wordDetection],
    hintGeneration: [...performanceMetrics.hintGeneration],
  };
}

/**
 * パフォーマンス測定結果をクリアする
 *
 * 全ての測定データを削除し、メモリ使用量をリセットする。
 * デバッグセッションの区切りや長時間運用時のメモリ管理に使用する。
 *
 * @example
 * ```typescript
 * // デバッグセッション開始時
 * clearPerformanceMetrics();
 *
 * // 測定実行後
 * const metrics = getPerformanceMetrics();
 * console.log("セッション結果:", metrics);
 * ```
 */
export function clearPerformanceMetrics(): void {
  // Object.assignを使用してより効率的にクリア
  Object.assign(performanceMetrics, {
    showHints: [],
    hideHints: [],
    wordDetection: [],
    hintGeneration: [],
  });
}