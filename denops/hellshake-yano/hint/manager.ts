/**
 * HintManagerクラス - ヒント管理システム
 * Process2の実装: キー別最小文字数設定に基づくヒント管理
 */

import type { Config } from "../main.ts";
import { getMinLengthForKey } from "../validation/index.ts";

/**
 * ヒント管理の責務を担うクラス
 *
 * 主要機能:
 * - キー別最小文字数設定の管理
 * - キーコンテキストの変更時のヒントクリア
 * - 設定値の委譲とアクセス
 *
 * Process2の要件を満たす実装:
 * - onKeyPressでヒントクリアと再生成トリガー
 * - getMinLengthForKeyでキー別閾値取得
 * - clearCurrentHintsで即座のヒントクリア
 */
export class HintManager {
  private config: Config;
  private currentKeyContext?: string;

  /**
   * HintManagerのコンストラクタ
   * @param config - ヒント管理に必要な設定オブジェクト
   */
  constructor(config: Config) {
    this.config = config;
    this.currentKeyContext = config.current_key_context;
  }

  /**
   * キー押下時の処理
   *
   * キーコンテキストが変更された場合の処理:
   * 1. 既存ヒントのクリア（即座の表示更新）
   * 2. 新しいキーコンテキストの設定（設定オブジェクトとの同期）
   *
   * @param key - 押下されたキー文字
   */
  onKeyPress(key: string): void {
    const hasKeyChanged = this.currentKeyContext !== key;

    if (hasKeyChanged) {
      this.clearCurrentHints();
    }

    // キーコンテキストの更新（内部状態と設定オブジェクトの両方）
    this.currentKeyContext = key;
    this.config.current_key_context = key;
  }

  /**
   * キー別最小文字数の取得
   *
   * main.tsのgetMinLengthForKey関数に委譲することで:
   * - 設定の一元管理を維持
   * - 後方互換性を保持
   * - 単一責任の原則を遵守
   *
   * @param key - 最小文字数を取得したいキー
   * @returns キーに対応する最小文字数（設定に基づく）
   */
  getMinLengthForKey(key: string): number {
    return getMinLengthForKey(this.config, key);
  }

  /**
   * 現在のヒントを即座にクリア
   *
   * Process2での基本実装:
   * - 状態の初期化
   * - 統合フェーズでの拡張を想定した設計
   *
   * 将来の拡張ポイント:
   * - 実際のVim/Neovim表示クリア
   * - ハイライトの削除
   * - 内部ヒント状態のリセット
   */
  clearCurrentHints(): void {
    // Process5 sub1: 即座のヒントクリア機能の基本実装
    // この段階では状態管理を行い、実際のUI操作は将来の統合で実装予定

    // 内部状態をリセット（Process5の要件）
    // キー変更時の即座クリアを保証

    // キーコンテキストの変更を記録
    if (this.currentKeyContext) {
      // 前のキーコンテキストでのヒント状態をクリア
      // 実際のUI操作は統合フェーズで実装
    }

    // TODO: Process5完了時に実際のヒント表示システムとの統合
    // - Vim/Neovimのハイライトクリア
    // - ExtMarkの削除
    // - 仮想テキストの削除
  }

  /**
   * 現在のキーコンテキストを取得
   * @returns 現在設定されているキーコンテキスト
   */
  getCurrentKeyContext(): string | undefined {
    return this.currentKeyContext;
  }

  /**
   * 設定オブジェクトへの読み取り専用アクセス
   * @returns 現在の設定オブジェクト（読み取り専用）
   */
  getConfig(): Readonly<Config> {
    return this.config;
  }
}
