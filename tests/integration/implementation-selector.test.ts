/**
 * Implementation Selector Test - Phase B-4 TDD Implementation
 * REDフェーズ: 失敗するテストから開始
 */
import { assertEquals } from "jsr:@std/assert@1.0.9";
import { describe, it } from "jsr:@std/testing@1.0.7/bdd";
import type { Denops } from "jsr:@denops/std@7.4.0";

// これから実装するImplementationSelectorをインポート
import {
  ImplementationSelector,
  ImplementationType,
  SelectionCriteria,
  SelectionResult,
} from "../../denops/hellshake-yano/integration/implementation-selector.ts";
import type { EnvironmentDetails } from "../../denops/hellshake-yano/integration/environment-detector.ts";

describe("ImplementationSelector", () => {
  describe("select", () => {
    it("should select denops-unified when Denops is available and running", async () => {
      const mockDenops = {} as Denops;
      const selector = new ImplementationSelector(mockDenops);

      const environment: EnvironmentDetails = {
        denops: {
          available: true,
          running: true,
          version: "7.4.0",
        },
        editor: {
          type: "vim",
          version: "9.0",
          hasNvim: false,
        },
      };

      const criteria: SelectionCriteria = {
        environment,
        userPreference: undefined,
      };

      const result = await selector.select(criteria);

      assertEquals(result, {
        implementation: "denops-unified",
        reason: "Denops is available and running",
        warnings: [],
      });
    });

    it("should select vimscript-pure when user forces legacy mode", async () => {
      const mockDenops = {} as Denops;
      const selector = new ImplementationSelector(mockDenops);

      const environment: EnvironmentDetails = {
        denops: {
          available: true,
          running: true,
          version: "7.4.0",
        },
        editor: {
          type: "vim",
          version: "9.0",
          hasNvim: false,
        },
      };

      const criteria: SelectionCriteria = {
        environment,
        userPreference: "legacy",
      };

      const result = await selector.select(criteria);

      assertEquals(result, {
        implementation: "vimscript-pure",
        reason: "User preference: legacy mode",
        warnings: [],
      });
    });

    it("should fallback to vimscript-pure when Denops is not available", async () => {
      const mockDenops = {} as Denops;
      const selector = new ImplementationSelector(mockDenops);

      const environment: EnvironmentDetails = {
        denops: {
          available: false,
          running: false,
          version: undefined,
        },
        editor: {
          type: "vim",
          version: "8.2",
          hasNvim: false,
        },
      };

      const criteria: SelectionCriteria = {
        environment,
        userPreference: undefined,
      };

      const result = await selector.select(criteria);

      assertEquals(result, {
        implementation: "vimscript-pure",
        reason: "Denops is not available",
        warnings: [],
      });
    });

    it("should show warning for Neovim when falling back to vimscript-pure", async () => {
      const mockDenops = {} as Denops;
      const selector = new ImplementationSelector(mockDenops);

      const environment: EnvironmentDetails = {
        denops: {
          available: false,
          running: false,
          version: undefined,
        },
        editor: {
          type: "neovim",
          version: "0.9.0",
          hasNvim: true,
        },
      };

      const criteria: SelectionCriteria = {
        environment,
        userPreference: undefined,
      };

      const result = await selector.select(criteria);

      assertEquals(result.implementation, "vimscript-pure");
      assertEquals(result.reason, "Denops is not available");
      assertEquals(result.warnings.length, 1);
      assertEquals(
        result.warnings[0],
        "Neovim detected but Denops is not available. Consider installing Denops for better performance.",
      );
    });
  });

  describe("getImplementationMatrix", () => {
    it("should return correct implementation for all matrix combinations", () => {
      const mockDenops = {} as Denops;
      const selector = new ImplementationSelector(mockDenops);

      // Denops利用可能、Vim/Neovim、ユーザー設定なし
      assertEquals(
        selector.getImplementationMatrix(true, true, undefined),
        "denops-unified",
      );

      // Denops利用可能、legacy=true
      assertEquals(
        selector.getImplementationMatrix(true, true, "legacy"),
        "vimscript-pure",
      );

      // Denops停止/不在
      assertEquals(
        selector.getImplementationMatrix(false, false, undefined),
        "vimscript-pure",
      );

      // Denops停止/不在（Neovimでも同じ結果）
      assertEquals(
        selector.getImplementationMatrix(false, false, undefined),
        "vimscript-pure",
      );
    });
  });
});
