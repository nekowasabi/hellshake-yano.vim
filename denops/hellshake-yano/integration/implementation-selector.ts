/**
 * Implementation Selector - Integration Layer
 * 実装選択ロジック: 環境に応じて最適な実装を選択
 * TDDフェーズ: 共通処理を活用して改善
 */
import type { Denops } from "jsr:@denops/std@7.4.0";
import type { EnvironmentDetails } from "./environment-detector.ts";
import { logMessage } from "../common/utils/logger.ts";

/** 実装タイプ */
export type ImplementationType = "denops-unified" | "vimscript-pure";

/** ユーザー設定 */
export type UserPreference = "legacy" | undefined;

/** 選択基準 */
export interface SelectionCriteria {
  environment: EnvironmentDetails;
  userPreference?: UserPreference;
}

/** 選択結果 */
export interface SelectionResult {
  implementation: ImplementationType;
  reason: string;
  warnings: string[];
}

/**
 * 実装選択クラス
 * 環境とユーザー設定に基づいて最適な実装を選択
 */
export class ImplementationSelector {
  private denops: Denops;
  private static readonly DENOPS_RECOMMENDATION =
    "Neovim detected but Denops is not available. Consider installing Denops for better performance.";

  constructor(denops: Denops) {
    this.denops = denops;
  }

  /**
   * 実装を選択
   * @param criteria 選択基準
   * @returns 選択結果
   */
  select(criteria: SelectionCriteria): SelectionResult {
    const { environment, userPreference } = criteria;
    const warnings: string[] = [];

    logMessage(
      "DEBUG",
      "ImplementationSelector",
      `Selecting implementation: denops=${environment.denops.available}, running=${environment.denops.running}, editor=${environment.editor.type}, user=${
        userPreference || "default"
      }`,
    );

    // getImplementationMatrix() で実装タイプを決定（重複ロジック解消）
    const implementationType = this.getImplementationMatrix(
      environment.denops.available,
      environment.denops.running,
      userPreference,
    );

    // ユーザーがlegacyモードを強制している場合
    if (userPreference === "legacy") {
      const result = this.createResult(
        implementationType,
        "User preference: legacy mode",
        warnings,
      );
      logMessage(
        "INFO",
        "ImplementationSelector",
        `Selected: ${result.implementation} (user override)`,
      );
      return result;
    }

    // Denopsが利用可能で実行中の場合
    if (implementationType === "denops-unified") {
      const result = this.createResult(
        implementationType,
        "Denops is available and running",
        warnings,
      );
      logMessage(
        "INFO",
        "ImplementationSelector",
        `Selected: ${result.implementation}`,
      );
      return result;
    }

    // Denopsが利用不可の場合はVimScriptにフォールバック
    // Neovimの場合は警告を追加
    if (environment.editor.hasNvim) {
      warnings.push(ImplementationSelector.DENOPS_RECOMMENDATION);
      logMessage(
        "WARN",
        "ImplementationSelector",
        ImplementationSelector.DENOPS_RECOMMENDATION,
      );
    }

    // Denopsが停止している場合の詳細メッセージ
    const reason = this.getDenopsUnavailableReason(environment.denops);
    const result = this.createResult(implementationType, reason, warnings);

    logMessage(
      "INFO",
      "ImplementationSelector",
      `Selected: ${result.implementation} (fallback)`,
    );
    return result;
  }

  /**
   * 実装選択マトリクスによる判定
   * PLAN.mdの仕様に基づいた選択ロジック
   *
   * | Denops状態 | エディタ | ユーザー設定 | 選択される実装 |
   * |-----------|---------|-------------|--------------｜
   * | 利用可能   | Vim/Neovim | - | denops-unified |
   * | 利用可能   | Vim/Neovim | legacy=true | vimscript-pure |
   * | 停止/不在  | Vim | - | vimscript-pure |
   * | 停止/不在  | Neovim | - | vimscript-pure（警告表示） |
   *
   * @param denopsAvailable Denopsが利用可能か
   * @param denopsRunning Denopsが実行中か
   * @param _editorType エディタの種類（ドキュメンテーション用、現在未使用）
   * @param userPreference ユーザー設定
   * @returns 選択される実装
   */
  getImplementationMatrix(
    denopsAvailable: boolean,
    denopsRunning: boolean,
    userPreference?: UserPreference,
  ): ImplementationType {
    // ユーザーがlegacyを指定した場合は常にvimscript-pure
    if (userPreference === "legacy") {
      return "vimscript-pure";
    }

    // Denopsが利用可能で実行中の場合はdenops-unified
    if (denopsAvailable && denopsRunning) {
      return "denops-unified";
    }

    // それ以外はvimscript-pure
    return "vimscript-pure";
  }

  /**
   * 選択結果を作成するヘルパー
   * @param implementation 実装タイプ
   * @param reason 選択理由
   * @param warnings 警告メッセージ
   * @returns 選択結果
   */
  private createResult(
    implementation: ImplementationType,
    reason: string,
    warnings: string[],
  ): SelectionResult {
    return {
      implementation,
      reason,
      warnings,
    };
  }

  /**
   * Denopsが利用不可の理由を取得
   * @param denops Denopsの状態
   * @returns 理由の説明文字列
   */
  private getDenopsUnavailableReason(denops: {
    available: boolean;
    running: boolean;
    version?: string;
  }): string {
    if (!denops.available) {
      return "Denops is not available";
    }
    if (!denops.running) {
      return "Denops is available but not running";
    }
    return "Denops is not available";
  }
}
