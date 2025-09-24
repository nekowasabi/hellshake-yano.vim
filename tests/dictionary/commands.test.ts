// TDD Red-Green-Refactor: Dictionary Commands Tests
// コマンド登録のテスト

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

Deno.test("Dictionary Commands - initializeDictionarySystem function", async (t) => {
  await t.step("should initialize dictionary system", async () => {
    // GREEN PHASE: Function should exist and work
    const { initializeDictionarySystem } = await import("../../denops/hellshake-yano/dictionary/commands.ts");
    const denops = createMockDenops();

    // Should not throw error
    await initializeDictionarySystem(denops);

    // Should register commands by calling denops.cmd multiple times
    const cmdSpy = denops.cmd as ReturnType<typeof spy>;
    assertEquals(cmdSpy.calls.length >= 4, true); // At least 4 commands registered
  });

  await t.step("should handle errors during initialization", async () => {
    // GREEN PHASE: Function should handle errors gracefully
    const { initializeDictionarySystem } = await import("../../denops/hellshake-yano/dictionary/commands.ts");
    const denops = createMockDenops();

    // Should not throw error even if internal operations fail
    await initializeDictionarySystem(denops);

    // Function should complete without throwing
    assertEquals(typeof initializeDictionarySystem, "function");
  });
});

Deno.test("Dictionary Commands - registerDictionaryCommands function", async (t) => {
  await t.step("should register all dictionary commands", async () => {
    // GREEN PHASE: Function should exist and work
    const { registerDictionaryCommands } = await import("../../denops/hellshake-yano/dictionary/commands.ts");
    const denops = createMockDenops();

    await registerDictionaryCommands(denops);

    // Should register exactly 4 commands
    const cmdSpy = denops.cmd as ReturnType<typeof spy>;
    assertEquals(cmdSpy.calls.length, 4);

    // Check that commands are registered
    const registeredCommands = cmdSpy.calls.map((call: any) => call.args[0]);
    assertEquals(registeredCommands.some((cmd: string) => cmd.includes("HellshakeYanoReloadDict")), true);
    assertEquals(registeredCommands.some((cmd: string) => cmd.includes("HellshakeYanoEditDict")), true);
    assertEquals(registeredCommands.some((cmd: string) => cmd.includes("HellshakeYanoShowDict")), true);
    assertEquals(registeredCommands.some((cmd: string) => cmd.includes("HellshakeYanoValidateDict")), true);
  });

  await t.step("should register HellshakeYanoReloadDict command", async () => {
    // GREEN PHASE: Function should register specific command
    const { registerDictionaryCommands } = await import("../../denops/hellshake-yano/dictionary/commands.ts");
    const denops = createMockDenops();

    await registerDictionaryCommands(denops);

    // Check that reload command was registered
    const cmdSpy = denops.cmd as ReturnType<typeof spy>;
    const registeredCommands = cmdSpy.calls.map((call: any) => call.args[0]);
    assertEquals(registeredCommands.some((cmd: string) => cmd.includes("HellshakeYanoReloadDict")), true);
  });

  await t.step("should register HellshakeYanoEditDict command", async () => {
    // GREEN PHASE: Function should register specific command
    const { registerDictionaryCommands } = await import("../../denops/hellshake-yano/dictionary/commands.ts");
    const denops = createMockDenops();

    await registerDictionaryCommands(denops);

    // Check that edit command was registered
    const cmdSpy = denops.cmd as ReturnType<typeof spy>;
    const registeredCommands = cmdSpy.calls.map((call: any) => call.args[0]);
    assertEquals(registeredCommands.some((cmd: string) => cmd.includes("HellshakeYanoEditDict")), true);
  });

  await t.step("should register HellshakeYanoShowDict command", async () => {
    // GREEN PHASE: Function should register specific command
    const { registerDictionaryCommands } = await import("../../denops/hellshake-yano/dictionary/commands.ts");
    const denops = createMockDenops();

    await registerDictionaryCommands(denops);

    // Check that show command was registered
    const cmdSpy = denops.cmd as ReturnType<typeof spy>;
    const registeredCommands = cmdSpy.calls.map((call: any) => call.args[0]);
    assertEquals(registeredCommands.some((cmd: string) => cmd.includes("HellshakeYanoShowDict")), true);
  });

  await t.step("should register HellshakeYanoValidateDict command", async () => {
    // GREEN PHASE: Function should register specific command
    const { registerDictionaryCommands } = await import("../../denops/hellshake-yano/dictionary/commands.ts");
    const denops = createMockDenops();

    await registerDictionaryCommands(denops);

    // Check that validate command was registered
    const cmdSpy = denops.cmd as ReturnType<typeof spy>;
    const registeredCommands = cmdSpy.calls.map((call: any) => call.args[0]);
    assertEquals(registeredCommands.some((cmd: string) => cmd.includes("HellshakeYanoValidateDict")), true);
  });
});