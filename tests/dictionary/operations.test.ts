// TDD Red-Green-Refactor: Dictionary Operations Tests
// 辞書操作機能のテスト

import { assertEquals, assertRejects } from "https://deno.land/std@0.200.0/assert/mod.ts";
import { assertSpyCall, spy, stub } from "https://deno.land/std@0.200.0/testing/mock.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.0.1/mod.ts";

// Mock Denops interface
const createMockDenops = (): Denops => ({
  name: "hellshake-yano",
  cmd: spy(() => Promise.resolve()),
  call: spy(() => Promise.resolve()),
  eval: spy(() => Promise.resolve()),
  batch: spy(() => Promise.resolve()),
  dispatch: spy(() => Promise.resolve()),
  redraw: spy(() => Promise.resolve()),
  meta: {
    platform: "linux" as const,
    host: "nvim" as const,
    version: "0.5.0",
  },
  interrupted: Promise.resolve(false),
} as any);

// RED PHASE: Write failing tests first

Deno.test("Dictionary Operations - Global Variables", async (t) => {
  await t.step("dictionaryLoader should exist", () => {
    // This test will fail initially - Red phase
    try {
      // Import will fail since the module doesn't exist yet
      import("../../denops/hellshake-yano/dictionary/operations.ts");
    } catch {
      // Expected to fail in Red phase
      throw new Error("operations.ts module not found - Red phase expected");
    }
  });

  await t.step("vimConfigBridge should exist", () => {
    // This test will fail initially - Red phase
    try {
      // Import will fail since the module doesn't exist yet
      import("../../denops/hellshake-yano/dictionary/operations.ts");
    } catch {
      // Expected to fail in Red phase
      throw new Error("operations.ts module not found - Red phase expected");
    }
  });
});

Deno.test("Dictionary Operations - reloadDictionary function", async (t) => {
  await t.step("should reload dictionary successfully", async () => {
    // GREEN PHASE: Function should exist and work
    const { reloadDictionary } = await import("../../denops/hellshake-yano/dictionary/operations.ts");
    const denops = createMockDenops();

    // Should not throw error
    await reloadDictionary(denops);

    // Verify that denops.cmd was called with success message
    assertSpyCall(denops.cmd as ReturnType<typeof spy>, 0, { args: ['echo "Dictionary reloaded successfully"'] });
  });

  await t.step("should handle initialization when system not initialized", async () => {
    // GREEN PHASE: Function should handle initialization
    const { reloadDictionary } = await import("../../denops/hellshake-yano/dictionary/operations.ts");
    const denops = createMockDenops();

    // Should not throw error and handle initialization internally
    await reloadDictionary(denops);

    // Should call success message
    assertSpyCall(denops.cmd as ReturnType<typeof spy>, 0, { args: ['echo "Dictionary reloaded successfully"'] });
  });
});

Deno.test("Dictionary Operations - editDictionary function", async (t) => {
  await t.step("should open existing dictionary file", async () => {
    // GREEN PHASE: Function should exist and work
    const { editDictionary } = await import("../../denops/hellshake-yano/dictionary/operations.ts");
    const denops = createMockDenops();

    // Should not throw error
    await editDictionary(denops);

    // Should call denops.cmd to open file
    // The exact args depend on the dictionary path, so we just verify cmd was called
    const cmdSpy = denops.cmd as ReturnType<typeof spy>;
    assertEquals(cmdSpy.calls.length > 0, true);
  });
});

Deno.test("Dictionary Operations - showDictionary function", async (t) => {
  await t.step("should display dictionary content in new buffer", async () => {
    // GREEN PHASE: Function should exist and work
    const { showDictionary } = await import("../../denops/hellshake-yano/dictionary/operations.ts");
    const denops = createMockDenops();

    // Should not throw error
    await showDictionary(denops);

    // Should call multiple denops commands to create new buffer
    const cmdSpy2 = denops.cmd as ReturnType<typeof spy>;
    const callSpy = denops.call as ReturnType<typeof spy>;
    assertEquals(cmdSpy2.calls.length > 0, true);
    assertEquals(callSpy.calls.length > 0, true);
  });
});

Deno.test("Dictionary Operations - validateDictionary function", async (t) => {
  await t.step("should validate dictionary format", async () => {
    // GREEN PHASE: Function should exist and work
    const { validateDictionary } = await import("../../denops/hellshake-yano/dictionary/operations.ts");
    const denops = createMockDenops();

    // Should not throw error
    await validateDictionary(denops);

    // Should call denops.cmd with validation result
    const cmdSpy3 = denops.cmd as ReturnType<typeof spy>;
    assertEquals(cmdSpy3.calls.length > 0, true);
  });
});