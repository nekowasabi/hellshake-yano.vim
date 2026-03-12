import { assertEquals } from "@std/assert";
import type { Denops } from "@denops/std";
import { Core } from "../denops/hellshake-yano/neovim/core/core.ts";
import type { HintMapping } from "../denops/hellshake-yano/types.ts";
import { MockDenops } from "./helpers/mock.ts";

function createHints(): HintMapping[] {
  return [
    {
      hint: "EC",
      word: { text: "echo", line: 3, col: 3 },
      hintCol: 3,
      hintByteCol: 3,
    },
    {
      hint: "ED",
      word: { text: "delta", line: 5, col: 8 },
      hintCol: 8,
      hintByteCol: 8,
    },
  ];
}

Deno.test("cancelKeys should pass through configured cancel key on second input", async () => {
  Core.resetForTesting();
  const core = Core.getInstance({
    useHintGroups: true,
    continuousHintMode: false,
    singleCharKeys: ["/"],
    multiCharKeys: ["A", "B", "C", "D", "E"],
    cancelKeys: ["y"],
  });
  const denops = new MockDenops();
  const inputs = [69, 121]; // E, y

  denops.onCall("getchar", () => inputs.shift() ?? 27);

  core.setCurrentHints(createHints());

  const coreForPatch = core as unknown as {
    highlightCandidateHintsHybrid: (
      denops: Denops,
      hintMappings: HintMapping[],
      partialInput: string,
      config?: { mode?: "normal" | "visual" | "operator" },
    ) => Promise<void>;
    hideHintsOptimized: (denops: Denops) => Promise<void>;
  };
  const originalHighlight = coreForPatch.highlightCandidateHintsHybrid;
  const originalHide = coreForPatch.hideHintsOptimized;
  coreForPatch.highlightCandidateHintsHybrid = async () => {};
  coreForPatch.hideHintsOptimized = async () => {};

  try {
    await core.waitForUserInput(denops);
  } finally {
    coreForPatch.highlightCandidateHintsHybrid = originalHighlight;
    coreForPatch.hideHintsOptimized = originalHide;
  }

  assertEquals(denops.getExecutedCommands().includes("call feedkeys('y', 'm')"), true);
});
