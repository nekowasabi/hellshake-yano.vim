// Dictionary Module Recovery System
// 辞書モジュールの自動復旧機能

/**
 * Recovery system for dictionary module index.ts
 * This module provides automatic recovery mechanisms for the dictionary module
 */

import { ensureDir } from "https://deno.land/std@0.200.0/fs/ensure_dir.ts";

/**
 * Expected content for dictionary index.ts
 */
const EXPECTED_INDEX_CONTENT = `// Dictionary Module Entry Point
// 辞書機能や単語管理関連の責務を管理

/**
 * dictionary モジュールのエントリーポイント
 *
 * このファイルは main.ts から分離された dictionary 関連の機能を
 * 統一的に管理するためのインデックスファイルです。
 */

// Re-export all dictionary operations
export {
  reloadDictionary,
  editDictionary,
  showDictionary,
  validateDictionary,
} from "./operations.ts";

// Re-export dictionary command functions (for internal use)
export {
  initializeDictionarySystem,
  registerDictionaryCommands,
} from "./commands.ts";`;

/**
 * Check if dictionary index.ts exists and has correct content
 * @param basePath - Base path to the denops plugin directory
 * @returns Promise<boolean> - true if index.ts is valid, false otherwise
 */
export async function checkDictionaryIndex(basePath: string): Promise<boolean> {
  try {
    const indexPath = `${basePath}/dictionary/index.ts`;
    const content = await Deno.readTextFile(indexPath);

    // Check if the file contains the essential exports
    const hasOperationsExports = content.includes('reloadDictionary') &&
                                 content.includes('editDictionary') &&
                                 content.includes('showDictionary') &&
                                 content.includes('validateDictionary');

    const hasCommandsExports = content.includes('initializeDictionarySystem') &&
                              content.includes('registerDictionaryCommands');

    return hasOperationsExports && hasCommandsExports;
  } catch {
    return false;
  }
}

/**
 * Restore dictionary index.ts from backup
 * @param basePath - Base path to the denops plugin directory
 * @returns Promise<boolean> - true if restore was successful, false otherwise
 */
export async function restoreDictionaryIndex(basePath: string): Promise<boolean> {
  try {
    const indexPath = `${basePath}/dictionary/index.ts`;
    const backupPath = `${basePath}/dictionary/index.ts.backup`;

    // First, try to restore from backup file
    try {
      const backupContent = await Deno.readTextFile(backupPath);
      await Deno.writeTextFile(indexPath, backupContent);
      return true;
    } catch {
      // If backup doesn't exist, create from expected content
      await ensureDir(`${basePath}/dictionary`);
      await Deno.writeTextFile(indexPath, EXPECTED_INDEX_CONTENT);
      return true;
    }
  } catch (error) {
    console.error("[dictionary-recovery] Failed to restore index.ts:", error);
    return false;
  }
}

/**
 * Create or update backup of dictionary index.ts
 * @param basePath - Base path to the denops plugin directory
 * @returns Promise<boolean> - true if backup was successful, false otherwise
 */
export async function backupDictionaryIndex(basePath: string): Promise<boolean> {
  try {
    const indexPath = `${basePath}/dictionary/index.ts`;
    const backupPath = `${basePath}/dictionary/index.ts.backup`;

    const content = await Deno.readTextFile(indexPath);
    await Deno.writeTextFile(backupPath, content);
    return true;
  } catch (error) {
    console.error("[dictionary-recovery] Failed to create backup:", error);
    return false;
  }
}

/**
 * Automatic recovery check and restore if needed
 * This function should be called during module initialization
 * @param basePath - Base path to the denops plugin directory
 * @returns Promise<boolean> - true if index.ts is valid after recovery, false otherwise
 */
export async function autoRecoverDictionaryIndex(basePath: string): Promise<boolean> {
  const isValid = await checkDictionaryIndex(basePath);

  if (!isValid) {
    console.warn("[dictionary-recovery] index.ts is invalid or missing, attempting recovery...");
    const recovered = await restoreDictionaryIndex(basePath);

    if (recovered) {
      console.info("[dictionary-recovery] Successfully recovered dictionary index.ts");
      return true;
    } else {
      console.error("[dictionary-recovery] Failed to recover dictionary index.ts");
      return false;
    }
  }

  return true;
}

/**
 * Test dictionary module integrity
 * @param basePath - Base path to the denops plugin directory
 * @returns Promise<{valid: boolean, errors: string[]}> - Validation result
 */
export async function testDictionaryModuleIntegrity(basePath: string): Promise<{valid: boolean, errors: string[]}> {
  const errors: string[] = [];

  // Check if index.ts exists and is valid
  const indexValid = await checkDictionaryIndex(basePath);
  if (!indexValid) {
    errors.push("Dictionary index.ts is missing or invalid");
  }

  // Check if operations.ts exists
  try {
    await Deno.stat(`${basePath}/dictionary/operations.ts`);
  } catch {
    errors.push("Dictionary operations.ts is missing");
  }

  // Check if commands.ts exists
  try {
    await Deno.stat(`${basePath}/dictionary/commands.ts`);
  } catch {
    errors.push("Dictionary commands.ts is missing");
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}