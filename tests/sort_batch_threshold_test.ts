import { assertEquals } from "@std/assert";
import {
  BATCH_BATCH_SIZE,
  BATCH_PROCESS_THRESHOLD,
} from "../denops/hellshake-yano/neovim/core/hint.ts";

Deno.test("sortWordsByDistanceOptimized uses 500 threshold", () => {
  assertEquals(BATCH_PROCESS_THRESHOLD, 500);
});

Deno.test("sortWordsInBatches uses 250 batch size", () => {
  assertEquals(BATCH_BATCH_SIZE, 250);
});
