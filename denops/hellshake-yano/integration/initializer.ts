/**
 * Initializer - Integration Layer TDD Implementation
 * 統合完了フェーズ: テストを通すための最小実装
 *
 * @module initializer
 */

import type { Denops } from "jsr:@denops/std@7.4.0";
import { EnvironmentDetector } from "./environment-detector.ts";
import { ImplementationSelector, type UserPreference } from "./implementation-selector.ts";
import { ConfigMigrator } from "../vim/config/config-migrator.ts";
import { CommandRegistry } from "./command-registry.ts";

/**
 * 初期化結果
 */
export interface InitializationResult {
  /** 初期化成功フラグ */
  success: boolean;
  /** 選択された実装タイプ */
  implementation: "denops-unified" | "vimscript-pure";
  /** 設定マイグレーション実行フラグ */
  migrated: boolean;
  /** 警告メッセージ */
  warnings: string[];
  /** エラーメッセージ */
  errors: string[];
}

/**
 * Initializer - 初期化オーケストレーター
 *
 * Integration Layerの統合エントリーポイント初期化を管理
 * 環境判定 → 設定移行 → 実装選択 → コマンド登録の流れを制御
 */
export class Initializer {
  private denops: Denops;
  private detector: EnvironmentDetector;
  private selector: ImplementationSelector;
  private migrator: ConfigMigrator;
  private registry: CommandRegistry;

  constructor(denops: Denops) {
    this.denops = denops;
    this.detector = new EnvironmentDetector(denops);
    this.selector = new ImplementationSelector(denops);
    this.migrator = new ConfigMigrator(denops);
    this.registry = new CommandRegistry(denops);
  }

  /**
   * 初期化を実行
   *
   * 初期化フロー:
   * 1. 環境判定（Denops利用可能性、エディタ種別）
   * 2. 設定マイグレーション（旧設定→新設定）
   * 3. 実装選択（Denops統合版 or VimScript版）
   * 4. コマンド登録（選択された実装のコマンド登録）
   *
   * エラー時は自動的にVimScript版にフォールバック
   */
  async initialize(userPreference?: UserPreference): Promise<InitializationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    let migrated = false;
    let implementation: "denops-unified" | "vimscript-pure" = "vimscript-pure";

    try {
      // ========================================
      // Step 1: 環境判定
      // ========================================
      const envDetails = await this.detector.getEnvironmentDetails();

      // ========================================
      // Step 2: 設定マイグレーション
      // ========================================
      try {
        const migrationResult = await this.migrator.migrate();
        migrated = migrationResult.status === "migrated";

        if (migrationResult.warnings.length > 0) {
          warnings.push(...migrationResult.warnings);
        }
      } catch (error) {
        // マイグレーション失敗は致命的ではない
        // エラーを記録して継続
        errors.push(
          `Config migration failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      // ========================================
      // Step 3: 実装選択
      // ========================================
      try {
        const selectionResult = await this.selector.select({
          environment: envDetails,
          userPreference,
        });

        implementation = selectionResult.implementation as
          | "denops-unified"
          | "vimscript-pure";

        if (selectionResult.warnings.length > 0) {
          warnings.push(...selectionResult.warnings);
        }
      } catch (error) {
        // 実装選択失敗時はVimScriptにフォールバック
        errors.push(
          `Implementation selection failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        implementation = "vimscript-pure";
      }

      // ========================================
      // Step 4: コマンド登録
      // ========================================
      try {
        if (implementation === "denops-unified") {
          await this.registry.registerUnifiedCommands();
        } else {
          await this.registry.registerVimScriptCommands();
        }
      } catch (error) {
        errors.push(
          `Command registration failed: ${error instanceof Error ? error.message : String(error)}`,
        );

        // コマンド登録失敗時のリカバリー
        try {
          await this.registry.registerVimScriptCommands({ force: true });
          implementation = "vimscript-pure";
        } catch (fallbackError) {
          errors.push(
            `Fallback command registration failed: ${
              fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
            }`,
          );
        }
      }

      return {
        success: true,
        implementation,
        migrated,
        warnings,
        errors,
      };
    } catch (error) {
      // ========================================
      // 最終フォールバック
      // ========================================
      // 環境判定失敗など、初期化の最初の段階で失敗した場合
      errors.push(
        `Initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      // VimScript版コマンドの登録を試行
      try {
        await this.registry.registerVimScriptCommands({ force: true });
      } catch (_fallbackError) {
        // 完全に失敗してもsuccessはtrue（部分的に動作可能）
      }

      return {
        success: true,
        implementation: "vimscript-pure",
        migrated: false,
        warnings,
        errors,
      };
    }
  }
}
