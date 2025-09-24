// Dictionary Commands Module
// コマンド登録を管理するモジュール

import type { Denops } from "https://deno.land/x/denops_std@v6.0.1/mod.ts";
import { DictionaryLoader } from "../word/dictionary-loader.ts";
import { VimConfigBridge } from "../word/dictionary-loader.ts";
import type { Config } from "../config.ts";

/**
 * Dictionary command names constants
 * These constants ensure consistency across command registration and usage
 */
const DICTIONARY_COMMANDS = {
  RELOAD: "HellshakeYanoReloadDict",
  EDIT: "HellshakeYanoEditDict",
  SHOW: "HellshakeYanoShowDict",
  VALIDATE: "HellshakeYanoValidateDict",
} as const;

/**
 * Internal config reference (will be properly integrated with main.ts during integration phase)
 */
let config: Config | null = null;

/**
 * Dictionary system global state (internal use only)
 * These variables maintain the singleton instances of the dictionary system components
 */
let dictionaryLoader: DictionaryLoader | null = null;
let vimConfigBridge: VimConfigBridge | null = null;

/**
 * Initialize config reference (to be called from main.ts during integration)
 * @param mainConfig - Configuration object from main.ts
 */
export function initializeConfigReference(mainConfig: Config): void {
  config = mainConfig;
}

/**
 * Initialize dictionary system (internal function, non-export)
 * This function sets up the dictionary system components and registers Vim commands
 * @param denops - Denops instance for Vim operations
 * @returns Promise<void>
 */
export async function initializeDictionarySystem(denops: Denops): Promise<void> {
  try {
    // Initialize dictionary system components
    dictionaryLoader = new DictionaryLoader();
    vimConfigBridge = new VimConfigBridge();

    // Register all dictionary-related Vim commands
    await registerDictionaryCommands(denops);

    // Load initial dictionary to ensure system is ready
    const dictConfig = await vimConfigBridge.getConfig(denops);
    await dictionaryLoader.loadUserDictionary(dictConfig);

    if (config?.debug_mode) {
      console.log("[hellshake-yano] Dictionary system initialized successfully");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[hellshake-yano] Failed to initialize dictionary system: ${errorMessage}`);
    // Re-throw to allow caller to handle initialization failure
    throw error;
  }
}

/**
 * Register dictionary-related Vim commands (internal function, non-export)
 * This function registers all dictionary commands with Vim
 * @param denops - Denops instance for Vim operations
 * @returns Promise<void>
 */
export async function registerDictionaryCommands(denops: Denops): Promise<void> {
  const commands = [
    {
      name: DICTIONARY_COMMANDS.RELOAD,
      method: "reloadDictionary",
      description: "Reload dictionary from files",
    },
    {
      name: DICTIONARY_COMMANDS.EDIT,
      method: "editDictionary",
      description: "Edit dictionary file",
    },
    {
      name: DICTIONARY_COMMANDS.SHOW,
      method: "showDictionary",
      description: "Show current dictionary content",
    },
    {
      name: DICTIONARY_COMMANDS.VALIDATE,
      method: "validateDictionary",
      description: "Validate dictionary format",
    },
  ];

  // Register all commands with consistent error handling
  for (const cmd of commands) {
    try {
      await denops.cmd(
        `command! ${cmd.name} call denops#request("${denops.name}", "${cmd.method}", [])`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to register command ${cmd.name}: ${errorMessage}`);
      throw error;
    }
  }
}