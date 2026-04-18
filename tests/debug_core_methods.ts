/**
 * Debug test to check available methods on Core class
 */

import { Core } from "../denops/hellshake-yano/neovim/core/core.ts";
import { getDefaultConfig } from "../denops/hellshake-yano/config.ts";

const config = getDefaultConfig();
const core = Core.getInstance(config);

console.log("Available methods on Core:");
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(core)));
console.log("\nAll properties and methods:");
for (const key in core) {
  console.log(`- ${key}: ${typeof (core as any)[key]}`);
}

// Check if our new methods exist
const methodsToCheck = [
  "enablePlugin",
  "disablePlugin",
  "togglePlugin",
  "isPluginEnabled",
  "setMotionCount",
  "setMotionTimeout",
  "toggleDebugMode",
  "getCommandFactory",
];

console.log("\nChecking for specific methods:");
methodsToCheck.forEach((method) => {
  console.log(`- ${method}: ${typeof (core as any)[method]}`);
});
