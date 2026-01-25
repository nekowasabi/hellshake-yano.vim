import type { Denops } from "@denops/std";
import { Core } from "./core/core.ts";
async function getCoreForDictionary(denops: Denops): Promise<Core> {
  return Core.getInstance();
}
export async function initializeDictionarySystem(denops: Denops): Promise<void> {
  try {
    const core = await getCoreForDictionary(denops);
    await core.initializeDictionarySystem(denops);
  } catch (error) {}
}
export async function reloadDictionary(denops: Denops): Promise<void> {
  try {
    const core = await getCoreForDictionary(denops);
    await core.reloadDictionary(denops);
  } catch (error) {
    await denops.cmd(`echoerr "Failed to reload dictionary: ${error}"`);
  }
}
export async function addToDictionary(denops: Denops, word: string, meaning?: string, type?: string): Promise<void> {
  try {
    const core = await getCoreForDictionary(denops);
    await core.addToDictionary(denops, word, meaning || "", type || "");
  } catch (error) {
    await denops.cmd(`echoerr "Failed to add to dictionary: ${error}"`);
  }
}
export async function editDictionary(denops: Denops): Promise<void> {
  try {
    const core = await getCoreForDictionary(denops);
    await core.editDictionary(denops);
  } catch (error) {
    await denops.cmd(`echoerr "Failed to edit dictionary: ${error}"`);
  }
}
export async function showDictionary(denops: Denops): Promise<void> {
  try {
    const core = await getCoreForDictionary(denops);
    await core.showDictionary(denops);
  } catch (error) {
    await denops.cmd(`echoerr "Failed to show dictionary: ${error}"`);
  }
}
export async function validateDictionary(denops: Denops): Promise<void> {
  try {
    const core = await getCoreForDictionary(denops);
    await core.validateDictionary(denops);
  } catch (error) {
    await denops.cmd(`echoerr "Failed to validate dictionary: ${error}"`);
  }
}

export async function isInDictionary(denops: Denops, word: string): Promise<boolean> {
  try {
    const core = await getCoreForDictionary(denops);
    return await core.isInDictionary(denops, word);
  } catch {
    return false;
  }
}
