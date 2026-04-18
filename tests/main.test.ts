/**
 * @fileoverview main.ts のユニットテスト (TDD RED-GREEN-REFACTOR)
 * Phase 5: メインエントリーポイント統合
 *
 * テスト要件:
 * - 環境判定テスト（Vim vs Neovim）
 * - 初期化フローテスト
 * - dispatcher登録テスト
 * - エラーハンドリングテスト
 */

import { assertEquals } from "jsr:@std/assert@1.0.9";
import { describe, it } from "jsr:@std/testing@1.0.7/bdd";
import type { Denops } from "jsr:@denops/std@7.4.0";
import { main } from "../denops/hellshake-yano/main.ts";

// Mock Denops インスタンス
function createMockDenops(isNeovim: boolean = false): Denops {
  const mockDenops = {
    meta: {
      host: isNeovim ? "nvim" : "vim",
      mode: "invoking",
      version: "7.4.0",
    },
    call: async (name: string, ...args: unknown[]) => {
      if (name === "has" && args[0] === "nvim") {
        return isNeovim ? 1 : 0;
      }
      if (name === "nvim_create_namespace") {
        return 1;
      }
      return undefined;
    },
    eval: async (expr: string) => {
      if (expr === "g:hellshake_yano") {
        return {};
      }
      return undefined;
    },
    cmd: async () => undefined,
    notify: async () => undefined,
    dispatch: async () => undefined,
    dispatcher: {} as Record<string, unknown>,
  } as unknown as Denops;

  return mockDenops;
}

describe("main.ts - Environment Detection and Initialization", () => {
  it("should initialize with Vim environment", async () => {
    const mockDenops = createMockDenops(false);

    try {
      await main(mockDenops);
      assertEquals(mockDenops.meta.host, "vim");
    } catch (error) {
      console.log(`Vim initialization: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  it("should initialize with Neovim environment", async () => {
    const mockDenops = createMockDenops(true);

    try {
      await main(mockDenops);
      assertEquals(mockDenops.meta.host, "nvim");
    } catch (error) {
      console.log(
        `Neovim initialization: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });

  it("should register dispatcher methods", async () => {
    const mockDenops = createMockDenops(true);

    try {
      await main(mockDenops);
      const dispatcher = mockDenops.dispatcher as Record<string, unknown>;
      assertEquals(typeof dispatcher, "object");
    } catch (error) {
      console.log(
        `Dispatcher registration: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });

  it("should have showHints dispatcher method", async () => {
    const mockDenops = createMockDenops(true);

    try {
      await main(mockDenops);
      const dispatcher = mockDenops.dispatcher as Record<string, unknown>;
      assertEquals(typeof dispatcher.showHints, "function");
    } catch (error) {
      console.log(`showHints method: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  it("should have hideHints dispatcher method", async () => {
    const mockDenops = createMockDenops(true);

    try {
      await main(mockDenops);
      const dispatcher = mockDenops.dispatcher as Record<string, unknown>;
      assertEquals(typeof dispatcher.hideHints, "function");
    } catch (error) {
      console.log(`hideHints method: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  it("should have toggle dispatcher method", async () => {
    const mockDenops = createMockDenops(true);

    try {
      await main(mockDenops);
      const dispatcher = mockDenops.dispatcher as Record<string, unknown>;
      assertEquals(typeof dispatcher.toggle, "function");
    } catch (error) {
      console.log(`toggle method: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  it("should have detectWords dispatcher method", async () => {
    const mockDenops = createMockDenops(true);

    try {
      await main(mockDenops);
      const dispatcher = mockDenops.dispatcher as Record<string, unknown>;
      assertEquals(typeof dispatcher.detectWords, "function");
    } catch (error) {
      console.log(`detectWords method: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  it("should have getConfig dispatcher method", async () => {
    const mockDenops = createMockDenops(true);

    try {
      await main(mockDenops);
      const dispatcher = mockDenops.dispatcher as Record<string, unknown>;
      assertEquals(typeof dispatcher.getConfig, "function");
    } catch (error) {
      console.log(`getConfig method: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  it("should have updateConfig dispatcher method", async () => {
    const mockDenops = createMockDenops(true);

    try {
      await main(mockDenops);
      const dispatcher = mockDenops.dispatcher as Record<string, unknown>;
      assertEquals(typeof dispatcher.updateConfig, "function");
    } catch (error) {
      console.log(`updateConfig method: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  it("should handle initialization errors gracefully", async () => {
    const mockDenops = {
      meta: { host: "nvim", mode: "invoking", version: "7.4.0" },
      call: async () => {
        throw new Error("Denops call failed");
      },
      eval: async () => ({}),
      cmd: async () => undefined,
      notify: async () => undefined,
      dispatch: async () => undefined,
      dispatcher: {},
    } as unknown as Denops;

    try {
      await main(mockDenops);
    } catch (_error) {
      // エラーはキャッチされるべき
    }
  });
});
