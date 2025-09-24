// Dictionary Recovery System Tests
// 辞書モジュール復旧システムのテスト

import { assertEquals, assertExists } from "https://deno.land/std@0.200.0/assert/mod.ts";
import {
  checkDictionaryIndex,
  restoreDictionaryIndex,
  backupDictionaryIndex,
  autoRecoverDictionaryIndex,
  testDictionaryModuleIntegrity,
} from "../../denops/hellshake-yano/dictionary/recovery.ts";

// Create a temporary directory for testing
async function createTempDir(): Promise<string> {
  return await Deno.makeTempDir({ prefix: "dictionary_recovery_test_" });
}

// Clean up temporary directory
async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    await Deno.remove(tempDir, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }
}

Deno.test("Dictionary Recovery - checkDictionaryIndex", async (t) => {
  const tempDir = await createTempDir();

  try {
    await t.step("should return false when index.ts doesn't exist", async () => {
      const result = await checkDictionaryIndex(tempDir);
      assertEquals(result, false);
    });

    await t.step("should return false when index.ts has incorrect content", async () => {
      // Create directory and file with wrong content
      await Deno.mkdir(`${tempDir}/dictionary`, { recursive: true });
      await Deno.writeTextFile(`${tempDir}/dictionary/index.ts`, "export {};");

      const result = await checkDictionaryIndex(tempDir);
      assertEquals(result, false);
    });

    await t.step("should return true when index.ts has correct content", async () => {
      const correctContent = `// Dictionary Module Entry Point
export {
  reloadDictionary,
  editDictionary,
  showDictionary,
  validateDictionary,
} from "./operations.ts";

export {
  initializeDictionarySystem,
  registerDictionaryCommands,
} from "./commands.ts";`;

      await Deno.writeTextFile(`${tempDir}/dictionary/index.ts`, correctContent);
      const result = await checkDictionaryIndex(tempDir);
      assertEquals(result, true);
    });
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test("Dictionary Recovery - restoreDictionaryIndex", async (t) => {
  const tempDir = await createTempDir();

  try {
    await t.step("should restore from backup when backup exists", async () => {
      const backupContent = "// Backup content";
      await Deno.mkdir(`${tempDir}/dictionary`, { recursive: true });
      await Deno.writeTextFile(`${tempDir}/dictionary/index.ts.backup`, backupContent);

      const result = await restoreDictionaryIndex(tempDir);
      assertEquals(result, true);

      const restoredContent = await Deno.readTextFile(`${tempDir}/dictionary/index.ts`);
      assertEquals(restoredContent, backupContent);
    });

    await t.step("should create default content when backup doesn't exist", async () => {
      // Clean up previous test
      await Deno.remove(`${tempDir}/dictionary`, { recursive: true });

      const result = await restoreDictionaryIndex(tempDir);
      assertEquals(result, true);

      const createdContent = await Deno.readTextFile(`${tempDir}/dictionary/index.ts`);
      assertEquals(createdContent.includes("reloadDictionary"), true);
      assertEquals(createdContent.includes("initializeDictionarySystem"), true);
    });
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test("Dictionary Recovery - backupDictionaryIndex", async (t) => {
  const tempDir = await createTempDir();

  try {
    await t.step("should create backup of existing index.ts", async () => {
      const originalContent = "// Original content";
      await Deno.mkdir(`${tempDir}/dictionary`, { recursive: true });
      await Deno.writeTextFile(`${tempDir}/dictionary/index.ts`, originalContent);

      const result = await backupDictionaryIndex(tempDir);
      assertEquals(result, true);

      const backupContent = await Deno.readTextFile(`${tempDir}/dictionary/index.ts.backup`);
      assertEquals(backupContent, originalContent);
    });

    await t.step("should return false when index.ts doesn't exist", async () => {
      // Clean up previous test
      await Deno.remove(`${tempDir}/dictionary`, { recursive: true });

      const result = await backupDictionaryIndex(tempDir);
      assertEquals(result, false);
    });
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test("Dictionary Recovery - autoRecoverDictionaryIndex", async (t) => {
  const tempDir = await createTempDir();

  try {
    await t.step("should return true when index.ts is already valid", async () => {
      const validContent = `export {
        reloadDictionary,
        editDictionary,
        showDictionary,
        validateDictionary,
      } from "./operations.ts";

      export {
        initializeDictionarySystem,
        registerDictionaryCommands,
      } from "./commands.ts";`;

      await Deno.mkdir(`${tempDir}/dictionary`, { recursive: true });
      await Deno.writeTextFile(`${tempDir}/dictionary/index.ts`, validContent);

      const result = await autoRecoverDictionaryIndex(tempDir);
      assertEquals(result, true);
    });

    await t.step("should recover when index.ts is invalid", async () => {
      // Create invalid index.ts
      await Deno.writeTextFile(`${tempDir}/dictionary/index.ts`, "invalid content");

      const result = await autoRecoverDictionaryIndex(tempDir);
      assertEquals(result, true);

      // Check that the file was recovered
      const recoveredContent = await Deno.readTextFile(`${tempDir}/dictionary/index.ts`);
      assertEquals(recoveredContent.includes("reloadDictionary"), true);
    });
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test("Dictionary Recovery - testDictionaryModuleIntegrity", async (t) => {
  const tempDir = await createTempDir();

  try {
    await t.step("should report all files missing", async () => {
      const result = await testDictionaryModuleIntegrity(tempDir);
      assertEquals(result.valid, false);
      assertEquals(result.errors.length >= 3, true); // At least index, operations, and commands missing
    });

    await t.step("should report valid when all files exist", async () => {
      // Create all required files
      await Deno.mkdir(`${tempDir}/dictionary`, { recursive: true });

      const validIndexContent = `export {
        reloadDictionary,
        editDictionary,
        showDictionary,
        validateDictionary,
      } from "./operations.ts";

      export {
        initializeDictionarySystem,
        registerDictionaryCommands,
      } from "./commands.ts";`;

      await Deno.writeTextFile(`${tempDir}/dictionary/index.ts`, validIndexContent);
      await Deno.writeTextFile(`${tempDir}/dictionary/operations.ts`, "// Operations file");
      await Deno.writeTextFile(`${tempDir}/dictionary/commands.ts`, "// Commands file");

      const result = await testDictionaryModuleIntegrity(tempDir);
      assertEquals(result.valid, true);
      assertEquals(result.errors.length, 0);
    });
  } finally {
    await cleanupTempDir(tempDir);
  }
});