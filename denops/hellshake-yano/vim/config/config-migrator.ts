/**
 * config-migrator.ts - 設定の自動マイグレーション（統合版）
 *
 * Vim Layer: 設定マイグレーションコンポーネント
 *
 * 目的:
 *   - 既存のVimScript設定を自動検出
 *   - 統合設定への移行を支援
 *   - マイグレーション結果を詳細に追跡
 *   - エラーハンドリングと警告メッセージの表示
 */

import type { Denops } from "@denops/std";

/** マイグレーション状態 */
export type MigrationStatus =
  | "migrated" // 旧設定から新設定へマイグレーション成功
  | "both_exist" // 両方の設定が存在（新設定を優先）
  | "new_only" // 新設定のみ存在（マイグレーション不要）
  | "none" // 設定なし
  | "error"; // エラー発生

/** マイグレーション結果 */
export interface MigrationResult {
  status: MigrationStatus;
  oldConfigExists: boolean;
  newConfigExists: boolean;
  migratedConfig?: Record<string, unknown>;
  warnings: string[];
  error?: string;
}

/**
 * 設定マイグレータークラス
 * 旧設定を検出し、新設定に自動移行する
 */
export class ConfigMigrator {
  private denops: Denops;

  private static readonly OLD_CONFIG_VAR = "g:hellshake_yano_vim_config";
  private static readonly NEW_CONFIG_VAR = "g:hellshake_yano";
  private static readonly BACKUP_CONFIG_VAR = "g:hellshake_yano_vim_config_backup";

  constructor(denops: Denops) {
    this.denops = denops;
  }

  // ==================== Phase-B1 互換メソッド ====================

  /**
   * VimScript設定が存在するか検出
   *
   * @returns VimScript設定が存在する場合true
   */
  async detectVimScriptConfig(): Promise<boolean> {
    const exists = await this.denops.call(
      "exists",
      ConfigMigrator.OLD_CONFIG_VAR,
    ) as number;

    return exists === 1;
  }

  /**
   * マイグレーションが必要かチェック
   *
   * @returns マイグレーションが必要な場合true
   */
  async needsMigration(): Promise<boolean> {
    // VimScript設定が存在するか確認
    const hasVimScriptConfig = await this.detectVimScriptConfig();

    // Denops設定が存在するか確認
    const hasDenopsConfig = await this.denops.call(
      "exists",
      ConfigMigrator.NEW_CONFIG_VAR,
    ) as number;

    // VimScript設定のみ存在する場合、マイグレーションが必要
    return hasVimScriptConfig && hasDenopsConfig === 0;
  }

  /**
   * VimScript設定を取得
   *
   * @returns VimScript設定オブジェクト
   */
  async getVimScriptConfig(): Promise<Record<string, unknown>> {
    const exists = await this.detectVimScriptConfig();

    if (!exists) {
      return {};
    }

    let configResult: unknown;
    try {
      configResult = await this.denops.eval(ConfigMigrator.OLD_CONFIG_VAR);
    } catch (error) {
      console.error(`Failed to eval ${ConfigMigrator.OLD_CONFIG_VAR}:`, error);
      return {};
    }

    if (typeof configResult !== "object" || configResult === null) {
      console.error(`${ConfigMigrator.OLD_CONFIG_VAR} is not an object: ${typeof configResult}`);
      return {};
    }

    return configResult as Record<string, unknown>;
  }

  /**
   * マイグレーション警告を表示
   */
  async showMigrationWarning(): Promise<void> {
    await this.denops.cmd("echohl WarningMsg");
    await this.denops.cmd(
      'echo "[hellshake-yano] VimScript設定が検出されました"',
    );
    await this.denops.cmd(
      'echo "  統合設定 (g:hellshake_yano) への移行を推奨します"',
    );
    await this.denops.cmd("echohl None");
  }

  /**
   * マイグレーションガイドを表示
   */
  async showMigrationGuide(): Promise<void> {
    await this.denops.cmd("echohl Title");
    await this.denops.cmd(
      'echo "=== hellshake-yano 設定マイグレーションガイド ==="',
    );
    await this.denops.cmd("echohl None");
    await this.denops.cmd('echo ""');
    await this.denops.cmd(
      'echo "旧設定 (g:hellshake_yano_vim_config) が検出されました。"',
    );
    await this.denops.cmd(
      'echo "以下の手順で新しい統合設定に移行してください："',
    );
    await this.denops.cmd('echo ""');
    await this.denops.cmd(
      'echo "1. g:hellshake_yano_vim_config の設定を g:hellshake_yano にコピー"',
    );
    await this.denops.cmd('echo "2. キー名を更新（例: hint_chars → markers）"');
    await this.denops.cmd('echo "3. 旧設定を削除"');
    await this.denops.cmd('echo ""');
  }

  // ==================== Phase-B4 互換メソッド ====================

  /**
   * 設定のマイグレーションを実行
   * @returns マイグレーション結果
   */
  async migrate(): Promise<MigrationResult> {
    const warnings: string[] = [];

    try {
      // 設定の存在確認
      const [oldExists, newExists] = await Promise.all([
        this.checkOldConfigExists(),
        this.checkNewConfigExists(),
      ]);

      // マイグレーション戦略を決定
      const strategy = this.determineStrategy(oldExists, newExists);

      switch (strategy) {
        case "both_exist":
          warnings.push(
            "Both old and new configurations exist. Using new configuration.",
          );
          return this.createResult("both_exist", oldExists, newExists, warnings);

        case "new_only":
          return this.createResult("new_only", oldExists, newExists, warnings);

        case "none":
          return this.createResult("none", oldExists, newExists, warnings);

        case "migrate": {
          // 旧設定のバックアップ作成
          await this.backupOldConfig();

          // マイグレーション実行
          const oldConfig = await this.readOldConfig();
          const migratedConfig = this.mapFromVimScript(oldConfig);

          // 新設定として設定
          await this.setNewConfig(migratedConfig);

          warnings.push(
            `Configuration migrated successfully from ${ConfigMigrator.OLD_CONFIG_VAR} to ${ConfigMigrator.NEW_CONFIG_VAR}`,
          );

          return this.createResult(
            "migrated",
            oldExists,
            newExists,
            warnings,
            migratedConfig,
          );
        }

        default:
          throw new Error(`Unknown migration strategy: ${strategy}`);
      }
    } catch (error) {
      console.error("[ConfigMigrator] Migration failed:", error);
      return this.createResult(
        "error",
        false,
        false,
        warnings,
        undefined,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * 旧設定の存在確認
   * @returns 旧設定が存在する場合true
   */
  async checkOldConfigExists(): Promise<boolean> {
    try {
      const exists = await this.denops.eval(
        `exists('${ConfigMigrator.OLD_CONFIG_VAR}')`,
      ) as number;
      return exists === 1;
    } catch {
      return false;
    }
  }

  /**
   * 新設定の存在確認
   * @returns 新設定が存在する場合true
   */
  async checkNewConfigExists(): Promise<boolean> {
    try {
      const exists = await this.denops.eval(
        `exists('${ConfigMigrator.NEW_CONFIG_VAR}')`,
      ) as number;
      return exists === 1;
    } catch {
      return false;
    }
  }

  /**
   * 旧設定を読み込む
   * @returns 旧設定オブジェクト
   */
  private async readOldConfig(): Promise<Record<string, unknown>> {
    let configResult: unknown;
    try {
      configResult = await this.denops.eval(ConfigMigrator.OLD_CONFIG_VAR);
    } catch (error) {
      console.error(`Failed to eval ${ConfigMigrator.OLD_CONFIG_VAR}:`, error);
      return {};
    }

    if (typeof configResult !== "object" || configResult === null) {
      console.error(`${ConfigMigrator.OLD_CONFIG_VAR} is not an object: ${typeof configResult}`);
      return {};
    }

    return configResult as Record<string, unknown>;
  }

  /**
   * VimScript設定をマップされた設定に変換
   * @param vimConfig VimScript形式の設定
   * @returns マップされた設定
   */
  private mapFromVimScript(
    vimConfig: Record<string, unknown>,
  ): Record<string, unknown> {
    // シンプルなマッピング：VimScript形式からアプリケーション形式への変換
    // config-mapper.ts がある場合はそちらを使用することを想定
    const mapped: Record<string, unknown> = {};

    // キー名のマッピング
    for (const [key, value] of Object.entries(vimConfig)) {
      if (key === "hint_chars" && typeof value === "string") {
        mapped.markers = value.split("");
      } else if (key === "motion_threshold") {
        mapped.motionCount = value;
      } else if (key === "motion_timeout_ms") {
        mapped.motionTimeout = value;
      } else if (key === "max_hints") {
        mapped.maxHints = value;
      } else if (key === "use_japanese") {
        mapped.useJapanese = value;
      } else if (key === "min_word_length") {
        mapped.minWordLength = value;
      } else if (key === "visual_mode_enabled") {
        mapped.visualModeEnabled = value;
      } else if (key === "exclude_numbers") {
        mapped.excludeNumbers = value;
      } else if (key === "debug_mode") {
        mapped.debugMode = value;
      } else {
        // その他のキーはそのままコピー
        mapped[key] = value;
      }
    }

    return mapped;
  }

  /**
   * 新設定を設定する
   * @param config 設定オブジェクト
   */
  private async setNewConfig(config: Record<string, unknown>): Promise<void> {
    // Vimの辞書形式に変換して設定
    const vimDict = this.toVimDict(config);
    await this.denops.cmd(`let ${ConfigMigrator.NEW_CONFIG_VAR} = ${vimDict}`);
  }

  /**
   * JavaScriptオブジェクトをVim辞書形式の文字列に変換
   * @param obj 変換するオブジェクト
   * @returns Vim辞書形式の文字列
   */
  private toVimDict(obj: Record<string, unknown>): string {
    const entries: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const vimValue = this.toVimValue(value);
      entries.push(`'${key}': ${vimValue}`);
    }

    return `{${entries.join(", ")}}`;
  }

  /**
   * 値をVim形式に変換
   * @param value 変換する値
   * @returns Vim形式の文字列
   */
  // deno-lint-ignore no-explicit-any
  private toVimValue(value: any): string {
    if (Array.isArray(value)) {
      const items = value.map((v) => this.toVimValue(v));
      return `[${items.join(", ")}]`;
    }

    if (typeof value === "string") {
      // シングルクォートのエスケープ
      const escaped = value.replace(/'/g, "''");
      return `'${escaped}'`;
    }

    if (typeof value === "boolean") {
      return value ? "1" : "0";
    }

    if (value === null || value === undefined) {
      return "v:null";
    }

    // 数値など
    return String(value);
  }

  /**
   * 旧設定のバックアップを作成
   */
  async backupOldConfig(): Promise<void> {
    try {
      const oldConfig = await this.readOldConfig();
      const backupVimDict = this.toVimDict(oldConfig);
      await this.denops.cmd(
        `let ${ConfigMigrator.BACKUP_CONFIG_VAR} = ${backupVimDict}`,
      );
      console.log("[ConfigMigrator] Old configuration backed up successfully");
    } catch (error) {
      // バックアップ失敗はログのみ（マイグレーションは継続）
      console.error("[ConfigMigrator] Failed to backup old config:", error);
    }
  }

  /**
   * マイグレーション戦略を決定
   * @param oldExists 旧設定の存在
   * @param newExists 新設定の存在
   * @returns 実行すべき戦略
   */
  private determineStrategy(oldExists: boolean, newExists: boolean): string {
    if (oldExists && newExists) return "both_exist";
    if (!oldExists && newExists) return "new_only";
    if (!oldExists && !newExists) return "none";
    return "migrate"; // oldExists && !newExists
  }

  /**
   * マイグレーション結果を作成
   */
  private createResult(
    status: MigrationStatus,
    oldConfigExists: boolean,
    newConfigExists: boolean,
    warnings: string[],
    migratedConfig?: Record<string, unknown>,
    error?: string,
  ): MigrationResult {
    return {
      status,
      oldConfigExists,
      newConfigExists,
      warnings,
      migratedConfig,
      error,
    };
  }
}
