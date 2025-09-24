/**
 * Backward compatibility shim for modules still importing from main/operations.
 *
 * The actual implementation lives in denops/hellshake-yano/core/operations.ts.
 */

export {
  createHintOperations,
} from "../core/operations.ts";
export type {
  HintOperationDependencies,
  HintOperations,
  HintState,
} from "../core/operations.ts";
