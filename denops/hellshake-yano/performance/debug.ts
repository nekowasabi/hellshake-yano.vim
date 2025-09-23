import type { PerformanceMetrics } from "./metrics.ts";
import { clearPerformanceMetrics } from "./metrics.ts";

/**
 * 基本的な設定情報の型定義（デバッグに必要な最小限の部分）
 *
 * 実際のConfig型のサブセットとして定義し、
 * デバッグ機能に必要な最小限の情報のみを含む。
 */
export interface DebugConfig {
  /** パフォーマンスログの有効/無効 */
  performance_log: boolean;
  /** デバッグモードの有効/無効 */
  debug_mode: boolean;
  /** キーごとのモーション回数設定 */
  motion_count: Record<string, number>;
  /** その他の設定項目（拡張性のため） */
  [key: string]: unknown;
}

/**
 * ヒントマッピング情報の型定義
 */
export interface HintMapping {
  /** ヒント文字 */
  hint: string;
  /** 位置情報 */
  position: {
    line: number;
    col: number;
  };
  /** 対象単語 */
  word: string;
}

/**
 * デバッグ情報を格納するインターフェース
 *
 * 現在のプラグイン状態を包括的に記録し、
 * トラブルシューティングとパフォーマンス分析に使用される。
 *
 * @example
 * ```typescript
 * const debug: DebugInfo = {
 *   config: { performance_log: true, debug_mode: true, motion_count: { w: 10 } },
 *   hintsVisible: false,
 *   currentHints: [],
 *   metrics: { showHints: [10.5], hideHints: [], wordDetection: [], hintGeneration: [] },
 *   timestamp: Date.now()
 * };
 * ```
 */
export interface DebugInfo {
  /** 現在の設定情報 */
  config: DebugConfig;
  /** ヒントの表示状態 */
  hintsVisible: boolean;
  /** 現在のヒントマッピング配列 */
  currentHints: HintMapping[];
  /** パフォーマンス測定結果 */
  metrics: PerformanceMetrics;
  /** デバッグ情報取得時刻 */
  timestamp: number;
}

/**
 * 現在のデバッグ情報を収集する
 *
 * 引数として受け取った状態情報を元にデバッグ情報を構築する。
 * 全ての引数はディープコピーされ、元データへの影響を防ぐ。
 *
 * @param config - 現在の設定情報
 * @param hintsVisible - ヒントの表示状態
 * @param currentHints - 現在のヒントマッピング配列
 * @param metrics - パフォーマンス測定結果
 * @returns 現在の設定、ヒント状態、パフォーマンス指標を含むデバッグ情報
 *
 * @example
 * ```typescript
 * const debugInfo = collectDebugInfo(
 *   config,
 *   true,
 *   [{ hint: "a", position: { line: 1, col: 5 }, word: "test" }],
 *   { showHints: [10.5], hideHints: [], wordDetection: [], hintGeneration: [] }
 * );
 * console.log("デバッグ情報:", debugInfo);
 * ```
 */
export function collectDebugInfo(
  config: DebugConfig,
  hintsVisible: boolean,
  currentHints: HintMapping[],
  metrics: PerformanceMetrics,
): DebugInfo {
  // より効率的なディープコピー実装
  const deepCopyHints = currentHints.map(hint => ({
    hint: hint.hint,
    position: { line: hint.position.line, col: hint.position.col },
    word: hint.word,
  }));

  const deepCopyMetrics: PerformanceMetrics = {
    showHints: [...metrics.showHints],
    hideHints: [...metrics.hideHints],
    wordDetection: [...metrics.wordDetection],
    hintGeneration: [...metrics.hintGeneration],
  };

  return {
    config: { ...config },
    hintsVisible,
    currentHints: deepCopyHints,
    metrics: deepCopyMetrics,
    timestamp: Date.now(),
  };
}

/**
 * デバッグ情報のクリア
 *
 * パフォーマンスメトリクスを完全にリセットし、
 * 新しいデバッグセッションの開始に備える。
 * メトリクス情報の整理やメモリ使用量の削減に使用される。
 *
 * この関数は内部的にclearPerformanceMetrics()を呼び出し、
 * デバッグ関連の全ての状態をクリーンな状態にリセットする。
 *
 * @example
 * ```typescript
 * // デバッグセッション終了時
 * const finalMetrics = getPerformanceMetrics();
 * console.log("最終結果:", finalMetrics);
 *
 * // 新しいセッション開始前にクリア
 * clearDebugInfo();
 * ```
 */
export function clearDebugInfo(): void {
  // メトリクス管理モジュールの関数を使用して一貫性を保つ
  clearPerformanceMetrics();
}