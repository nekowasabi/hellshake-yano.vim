// Dictionary Operations Module
// 辞書操作機能を管理するモジュール

import type { Denops } from "https://deno.land/x/denops_std@v6.0.1/mod.ts";
import { DictionaryLoader } from "../word/dictionary-loader.ts";
import { VimConfigBridge } from "../word/dictionary-loader.ts";

/**
 * Dictionary system global state
 * These variables maintain the singleton instances of the dictionary system components
 */
let dictionaryLoader: DictionaryLoader | null = null;
let vimConfigBridge: VimConfigBridge | null = null;

/**
 * Initialize dictionary system components if not already initialized
 * @param denops - Denops instance for Vim operations
 * @returns Promise<void>
 */
async function ensureDictionarySystemInitialized(denops: Denops): Promise<void> {
  if (!dictionaryLoader || !vimConfigBridge) {
    dictionaryLoader = new DictionaryLoader();
    vimConfigBridge = new VimConfigBridge();
  }
}

/**
 * Default dictionary template for new dictionary files
 */
const DEFAULT_DICTIONARY_TEMPLATE = {
  customWords: ["例: 機械学習"],
  preserveWords: ["例: HelloWorld"],
  mergeRules: {
    "の": "always",
    "を": "always",
  },
  hintPatterns: [
    {
      pattern: "^-\\s*\\[\\s*\\]\\s*(.)",
      hintPosition: "capture:1",
      priority: 100,
      description: "Checkbox first character",
    },
  ],
};

/**
 * Reload dictionary from files
 * @param denops - Denops instance for Vim operations
 * @returns Promise<void>
 */
export async function reloadDictionary(denops: Denops): Promise<void> {
  try {
    await ensureDictionarySystemInitialized(denops);

    if (!vimConfigBridge || !dictionaryLoader) {
      throw new Error("Dictionary system initialization failed");
    }

    const dictConfig = await vimConfigBridge.getConfig(denops);
    const dictionary = await dictionaryLoader.loadUserDictionary(dictConfig);

    // Note: Word detection manager update will be handled during integration
    // This ensures the dictionary is loaded and available for use

    await denops.cmd('echo "Dictionary reloaded successfully"');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await denops.cmd(`echoerr "Failed to reload dictionary: ${errorMessage}"`);
  }
}

/**
 * Edit dictionary file in Vim
 * @param denops - Denops instance for Vim operations
 * @returns Promise<void>
 */
export async function editDictionary(denops: Denops): Promise<void> {
  try {
    await ensureDictionarySystemInitialized(denops);

    if (!vimConfigBridge) {
      throw new Error("Dictionary system initialization failed");
    }

    const dictConfig = await vimConfigBridge.getConfig(denops);
    const dictionaryPath = dictConfig.dictionaryPath || ".hellshake-yano/dictionary.json";

    if (dictionaryPath) {
      await denops.cmd(`edit ${dictionaryPath}`);
    } else {
      // Create new dictionary file with default template
      const newPath = ".hellshake-yano/dictionary.json";
      await denops.cmd(`edit ${newPath}`);

      // Insert default template
      const templateContent = JSON.stringify(DEFAULT_DICTIONARY_TEMPLATE, null, 2);
      await denops.call("setline", 1, templateContent.split("\n"));
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await denops.cmd(`echoerr "Failed to edit dictionary: ${errorMessage}"`);
  }
}

/**
 * Show current dictionary content in a new readonly buffer
 * @param denops - Denops instance for Vim operations
 * @returns Promise<void>
 */
export async function showDictionary(denops: Denops): Promise<void> {
  try {
    await ensureDictionarySystemInitialized(denops);

    if (!vimConfigBridge || !dictionaryLoader) {
      throw new Error("Dictionary system initialization failed");
    }

    const dictConfig = await vimConfigBridge.getConfig(denops);
    const dictionary = await dictionaryLoader.loadUserDictionary(dictConfig);

    // Create a new scratch buffer for dictionary content
    await denops.cmd("new");
    await denops.cmd("setlocal buftype=nofile");
    await denops.cmd("setlocal bufhidden=wipe");
    await denops.cmd("setlocal noswapfile");
    await denops.cmd("setlocal filetype=json");
    await denops.cmd("file [HellshakeYano Dictionary]");

    // Format and display dictionary content
    const content = JSON.stringify(dictionary, null, 2);
    await denops.call("setline", 1, content.split("\n"));

    // Make buffer readonly
    await denops.cmd("setlocal readonly");
    await denops.cmd("setlocal nomodifiable");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await denops.cmd(`echoerr "Failed to show dictionary: ${errorMessage}"`);
  }
}

/**
 * Validation result interface
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate dictionary format and accessibility
 * @param denops - Denops instance for Vim operations
 * @returns Promise<void>
 */
export async function validateDictionary(denops: Denops): Promise<void> {
  try {
    await ensureDictionarySystemInitialized(denops);

    if (!vimConfigBridge || !dictionaryLoader) {
      throw new Error("Dictionary system initialization failed");
    }

    const dictConfig = await vimConfigBridge.getConfig(denops);
    const result: ValidationResult = await performDictionaryValidation(dictConfig);

    if (result.valid) {
      await denops.cmd('echo "Dictionary format is valid"');
    } else {
      const errorMessage = `Dictionary validation failed: ${result.errors.join(", ")}`;
      await denops.cmd(`echoerr "${errorMessage}"`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await denops.cmd(`echoerr "Failed to validate dictionary: ${errorMessage}"`);
  }
}

/**
 * Perform dictionary validation checks
 * @param dictConfig - Dictionary configuration object
 * @returns Promise<ValidationResult>
 */
async function performDictionaryValidation(dictConfig: any): Promise<ValidationResult> {
  const result: ValidationResult = { valid: true, errors: [] };

  if (dictConfig.dictionaryPath) {
    try {
      const stat = await Deno.stat(dictConfig.dictionaryPath);
      if (!stat.isFile) {
        result.valid = false;
        result.errors.push("Dictionary path exists but is not a file");
      }
      // Additional validation could be added here:
      // - JSON format validation
      // - Schema validation
      // - Required fields validation
    } catch {
      result.valid = false;
      result.errors.push("Dictionary file not found or inaccessible");
    }
  } else {
    // No dictionary path specified - this might be valid depending on configuration
    result.errors.push("No dictionary path specified");
  }

  return result;
}