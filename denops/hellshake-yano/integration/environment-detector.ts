/**
 * Environment Detector - Integration Layer
 * 環境判定モジュール: Denopsの利用可能性とエディタ情報を検出
 * TDDフェーズ: 共通処理を活用して改善
 */
import type { Denops } from "jsr:@denops/std@7.4.0";
import { withFallback } from "../common/utils/base.ts";

/** Multiplier to extract major version from Neovim v:version */
const NEOVIM_VERSION_MAJOR_MULTIPLIER = 10000;
/** Multiplier to extract minor version from Neovim v:version */
const NEOVIM_VERSION_MINOR_MULTIPLIER = 100;

/** Denopsの利用可能性情報 */
export interface DenopsAvailability {
  available: boolean;
  running: boolean;
  version?: string;
}

/** エディタ情報 */
export interface EditorInfo {
  type: "vim" | "neovim";
  version: string;
  hasNvim: boolean;
}

/** 環境詳細情報 */
export interface EnvironmentDetails {
  denops: DenopsAvailability;
  editor: EditorInfo;
}

/**
 * 環境判定クラス
 * Denopsの状態とエディタの種類を判定
 */
export class EnvironmentDetector {
  private denops: Denops;
  private cachedDetails?: EnvironmentDetails;

  constructor(denops: Denops) {
    this.denops = denops;
  }

  /**
   * Denopsの利用可能性をチェック
   * @returns Denopsの状態情報
   */
  async isDenopsAvailable(): Promise<DenopsAvailability> {
    return await withFallback(
      async () => {
        // g:loaded_denopsの存在確認
        const loaded = await this.denops.eval("exists('g:loaded_denops')") as number;

        if (loaded === 0) {
          return {
            available: false,
            running: false,
            version: undefined,
          };
        }

        // Denopsサーバーのステータス確認
        const running = await withFallback(
          async () => {
            const status = await this.denops.eval("denops#server#status()") as string;
            return status === "running";
          },
          true,
          "EnvironmentDetector.statusCheck",
        );

        // バージョン取得（実際のDenopsバージョン）
        const version = await withFallback(
          async () => {
            const denopsVersion = await this.denops.eval(
              "get(g:, 'denops_version', '')",
            ) as string;
            return denopsVersion || "7.4.0";
          },
          "7.4.0",
          "EnvironmentDetector.versionCheck",
        );

        return {
          available: true,
          running,
          version,
        };
      },
      {
        available: false,
        running: false,
        version: undefined,
      },
      "EnvironmentDetector.isDenopsAvailable",
    );
  }

  /**
   * エディタ情報を取得
   * @returns エディタの種類とバージョン
   */
  async getEditorInfo(): Promise<EditorInfo> {
    return await withFallback(
      async () => {
        // Neovimかどうかを判定
        const hasNvim = await this.denops.eval("has('nvim')") as number;
        const isNeovim = hasNvim === 1;

        // バージョン番号を取得
        const versionNum = await this.denops.eval("v:version") as number;

        // バージョン文字列を生成
        const version = isNeovim
          ? await this.getNeovimVersion(versionNum)
          : await this.getVimVersion(versionNum);

        return {
          type: isNeovim ? "neovim" : "vim",
          version,
          hasNvim: isNeovim,
        };
      },
      {
        type: "vim" as const,
        version: "8.0",
        hasNvim: false,
      },
      "EnvironmentDetector.getEditorInfo",
    );
  }

  /**
   * Neovim バージョンを取得
   * @param versionNum - v:versionの値
   * @returns バージョン文字列
   */
  private async getNeovimVersion(versionNum: number): Promise<string> {
    return await withFallback(
      async () => {
        // deno-lint-ignore no-explicit-any
        const versionInfo = await this.denops.eval("api_info().version") as any;

        if (versionInfo && versionInfo.major !== undefined) {
          return `${versionInfo.major}.${versionInfo.minor}.${versionInfo.patch || 0}`;
        }

        // フォールバック: v:versionから推定
        const major = Math.floor(versionNum / NEOVIM_VERSION_MAJOR_MULTIPLIER);
        const minor = Math.floor((versionNum % NEOVIM_VERSION_MAJOR_MULTIPLIER) / NEOVIM_VERSION_MINOR_MULTIPLIER);
        const patch = versionNum % NEOVIM_VERSION_MINOR_MULTIPLIER;
        return `${major}.${minor}.${patch}`;
      },
      "0.8.0",
      "EnvironmentDetector.getNeovimVersion",
    );
  }

  /**
   * Vim バージョンを取得
   * @param versionNum - v:versionの値
   * @returns バージョン文字列
   */
  private getVimVersion(versionNum: number): string {
    const major = Math.floor(versionNum / 100);
    const minor = versionNum % 100;
    return `${major}.${minor}`;
  }

  /**
   * 環境の詳細情報を取得（キャッシュ機能付き）
   * @returns 環境の完全な情報
   */
  async getEnvironmentDetails(): Promise<EnvironmentDetails> {
    // キャッシュが存在する場合はそれを返す
    if (this.cachedDetails) {
      return this.cachedDetails;
    }

    // 新しく情報を取得（並列実行で高速化）
    const [denops, editor] = await Promise.all([
      this.isDenopsAvailable(),
      this.getEditorInfo(),
    ]);

    // キャッシュに保存
    this.cachedDetails = {
      denops,
      editor,
    };

    return this.cachedDetails;
  }

  /**
   * キャッシュをクリア
   * 環境が変更された可能性がある場合に使用
   */
  clearCache(): void {
    this.cachedDetails = undefined;
  }

  /**
   * 実装選択のための判定ヘルパー
   * @returns Denops実装を使用すべきかどうか
   */
  async shouldUseDenopsImplementation(): Promise<boolean> {
    const details = await this.getEnvironmentDetails();
    return details.denops.available && details.denops.running;
  }
}
