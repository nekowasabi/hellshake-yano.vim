import { assert, assertEquals } from "@std/assert";
import type { Denops } from "@denops/std";
import { Core } from "../denops/hellshake-yano/neovim/core/core.ts";
import type { Config, HintMapping } from "../denops/hellshake-yano/types.ts";
import { MockDenops } from "./helpers/mock.ts";

function createHint(text: string, line = 1, col = 1): HintMapping {
  return {
    word: { text, line, col },
    hint: text.slice(0, 1).toUpperCase(),
    hintCol: col,
    hintByteCol: col,
  };
}

function setupCore(config: Partial<Config>): {
  core: Core;
  denops: MockDenops;
  restore: () => void;
  hideCalls: { count: number };
  displayCalls: { count: number };
} {
  Core.resetForTesting();
  const core = Core.getInstance(config);
  const denops = new MockDenops();
  const originalHide =
    (core as unknown as { hideHintsOptimized: (d: Denops) => Promise<void> }).hideHintsOptimized;
  const originalShowInternal =
    (core as unknown as { showHintsInternal: (d: Denops, mode?: string) => Promise<void> })
      .showHintsInternal;
  const hideCalls = { count: 0 };
  const displayCalls = { count: 0 };

  (core as unknown as { hideHintsOptimized: (d: Denops) => Promise<void> }).hideHintsOptimized =
    async (_d: Denops) => {
      hideCalls.count++;
    };

  (core as unknown as { showHintsInternal: (d: Denops, mode?: string) => Promise<void> })
    .showHintsInternal = async (_d: Denops, _mode?: string) => {
      displayCalls.count++;
    };

  const restore = () => {
    (core as unknown as { hideHintsOptimized: (d: Denops) => Promise<void> }).hideHintsOptimized =
      originalHide;
    (core as unknown as { showHintsInternal: (d: Denops, mode?: string) => Promise<void> })
      .showHintsInternal = originalShowInternal;
  };

  return { core, denops, restore, hideCalls, displayCalls };
}

Deno.test("continuous hint mode should recenter and redisplay after jump", async () => {
  const { core, denops, restore, hideCalls, displayCalls } = setupCore({
    continuousHintMode: true,
    recenterCommand: "normal! zz",
    maxContinuousJumps: 5,
  });

  try {
    const hints = [createHint("alpha")];
    core.setCurrentHints(hints);

    const executedCommands: string[] = [];
    denops.onCmd((cmd) => executedCommands.push(cmd));

    await (core as unknown as {
      postJumpHandler: (d: Denops, target: HintMapping) => Promise<void>;
    }).postJumpHandler(denops, hints[0]);

    assert(hideCalls.count > 0, "hideHintsOptimized should be called before redisplay");
    assert(displayCalls.count > 0, "showHintsInternal should be called to redraw hints");
    const recenterExecuted = executedCommands.some((cmd) => cmd.includes("normal! zz"));
    assert(recenterExecuted, "recenter command should be executed in continuous mode");
    const jumpCount = (core as unknown as { getContinuousJumpCount: () => number })
      .getContinuousJumpCount();
    assertEquals(jumpCount, 1, "continuous jump count should increment after successful jump");
  } finally {
    restore();
  }
});

Deno.test("continuous hint mode disabled should skip recenter workflow", async () => {
  const { core, denops, restore, hideCalls, displayCalls } = setupCore({
    continuousHintMode: false,
    recenterCommand: "normal! zz",
    maxContinuousJumps: 5,
  });

  try {
    const hints = [createHint("beta")];
    core.setCurrentHints(hints);

    const executedCommands: string[] = [];
    denops.onCmd((cmd) => executedCommands.push(cmd));

    await (core as unknown as {
      postJumpHandler: (d: Denops, target: HintMapping) => Promise<void>;
    }).postJumpHandler(denops, hints[0]);

    assertEquals(
      hideCalls.count,
      1,
      "hideHintsOptimized should run once for standard hint teardown",
    );
    assertEquals(
      displayCalls.count,
      0,
      "showHintsInternal should not rerender hints when mode is disabled",
    );
    const recenterExecuted = executedCommands.some((cmd) => cmd.includes("normal! zz"));
    assertEquals(
      recenterExecuted,
      false,
      "recenter command should not be executed when mode is disabled",
    );
    const jumpCount = (core as unknown as { getContinuousJumpCount: () => number })
      .getContinuousJumpCount();
    assertEquals(jumpCount, 0, "continuous jump count should remain zero when mode is disabled");
  } finally {
    restore();
  }
});

Deno.test("continuous hint mode should reset when invalid key is entered", async () => {
  const { core, denops, restore, hideCalls, displayCalls } = setupCore({
    continuousHintMode: true,
    recenterCommand: "normal! zz",
    maxContinuousJumps: 5,
  });

  try {
    const hints = [createHint("alpha")];
    core.setCurrentHints(hints);
    await (core as unknown as {
      postJumpHandler: (d: Denops, target: HintMapping) => Promise<void>;
    }).postJumpHandler(denops, hints[0]);
    core.setCurrentHints(hints);

    const inputs = ["!".charCodeAt(0)];
    denops.onCall("getchar", () => inputs.shift() ?? 27);
    denops.clearExecutedCommands();

    await core.waitForUserInput(denops);

    const jumpCount = (core as unknown as { getContinuousJumpCount: () => number })
      .getContinuousJumpCount();
    assertEquals(jumpCount, 0, "continuous jump count should reset after invalid key");
    assertEquals(displayCalls.count, 1, "no additional hint redraw should occur after invalid key");
    assert(
      hideCalls.count >= 2,
      "hideHintsOptimized should run for both jump handling and invalid key teardown",
    );
    const commands = denops.getExecutedCommands();
    assert(
      commands.some((cmd) => cmd.includes("feedkeys('!")),
      "original key should be re-fed to Vim",
    );
  } finally {
    restore();
  }
});

Deno.test("continuous hint mode should reset when ESC is pressed", async () => {
  const { core, denops, restore, hideCalls, displayCalls } = setupCore({
    continuousHintMode: true,
    recenterCommand: "normal! zz",
    maxContinuousJumps: 5,
  });

  try {
    const hints = [createHint("gamma")];
    core.setCurrentHints(hints);
    await (core as unknown as {
      postJumpHandler: (d: Denops, target: HintMapping) => Promise<void>;
    }).postJumpHandler(denops, hints[0]);
    core.setCurrentHints(hints);

    denops.onCall("getchar", () => 27);
    denops.clearExecutedCommands();

    await core.waitForUserInput(denops);

    const jumpCount = (core as unknown as { getContinuousJumpCount: () => number })
      .getContinuousJumpCount();
    assertEquals(jumpCount, 0, "continuous jump count should reset after ESC");
    assertEquals(displayCalls.count, 1, "no additional hint redraw should occur after ESC");
    assert(hideCalls.count >= 2, "hideHintsOptimized should run for ESC handling");
    const commands = denops.getExecutedCommands();
    assert(
      commands.some((cmd) => cmd.includes("echo 'Cancelled'")),
      "should notify cancellation when ESC is pressed",
    );
  } finally {
    restore();
  }
});

Deno.test("continuous hint mode should stop when max jumps reached", async () => {
  const { core, denops, restore, hideCalls, displayCalls } = setupCore({
    continuousHintMode: true,
    recenterCommand: "normal! zz",
    maxContinuousJumps: 1,
  });

  try {
    const hints = [createHint("delta")];
    const commands: string[] = [];
    denops.onCmd((cmd) => commands.push(cmd));

    core.setCurrentHints(hints);
    await (core as unknown as {
      postJumpHandler: (d: Denops, target: HintMapping) => Promise<void>;
    }).postJumpHandler(denops, hints[0]);

    core.setCurrentHints(hints);
    await (core as unknown as {
      postJumpHandler: (d: Denops, target: HintMapping) => Promise<void>;
    }).postJumpHandler(denops, hints[0]);

    const jumpCount = (core as unknown as { getContinuousJumpCount: () => number })
      .getContinuousJumpCount();
    assertEquals(jumpCount, 0, "continuous jump count should reset after reaching max");
    assertEquals(
      displayCalls.count,
      1,
      "loop should stop without additional redraw when max reached",
    );
    assert(hideCalls.count >= 2, "hideHintsOptimized should run for each jump");
    assert(
      commands.some((cmd) => cmd.includes("max jumps reached")),
      "should notify user when max jumps hit",
    );
  } finally {
    restore();
  }
});

Deno.test("continuous hint mode should stop when buffer changes", async () => {
  const { core, denops, restore, hideCalls, displayCalls } = setupCore({
    continuousHintMode: true,
    recenterCommand: "normal! zz",
    maxContinuousJumps: 5,
  });

  try {
    const hints = [createHint("epsilon")];
    const commands: string[] = [];
    denops.onCmd((cmd) => commands.push(cmd));

    denops.setCallResponse("bufnr", () => 1);

    core.setCurrentHints(hints);
    await (core as unknown as {
      postJumpHandler: (d: Denops, target: HintMapping) => Promise<void>;
    }).postJumpHandler(denops, hints[0]);

    denops.setCallResponse("bufnr", () => 2);
    core.setCurrentHints(hints);
    await (core as unknown as {
      postJumpHandler: (d: Denops, target: HintMapping) => Promise<void>;
    }).postJumpHandler(denops, hints[0]);

    const jumpCount = (core as unknown as { getContinuousJumpCount: () => number })
      .getContinuousJumpCount();
    assertEquals(jumpCount, 0, "continuous jump count should reset after buffer change");
    assertEquals(displayCalls.count, 1, "buffer change should stop further redraws");
    assert(hideCalls.count >= 2, "hideHintsOptimized should be invoked during buffer transition");
    assert(
      commands.some((cmd) => cmd.includes("buffer changed")),
      "should notify user about buffer change stop",
    );
  } finally {
    restore();
  }
});

Deno.test("continuous hint mode should disable when recenter command fails", async () => {
  const { core, denops, restore, hideCalls, displayCalls } = setupCore({
    continuousHintMode: true,
    recenterCommand: "normal! zz",
    maxContinuousJumps: 5,
  });

  try {
    const hints = [createHint("zeta")];
    const commands: string[] = [];
    denops.onCmd((cmd) => {
      commands.push(cmd);
      if (cmd.includes("normal! zz")) {
        throw new Error("recenter failure");
      }
    });

    core.setCurrentHints(hints);
    await (core as unknown as {
      postJumpHandler: (d: Denops, target: HintMapping) => Promise<void>;
    }).postJumpHandler(denops, hints[0]);

    const jumpCount = (core as unknown as { getContinuousJumpCount: () => number })
      .getContinuousJumpCount();
    assertEquals(jumpCount, 0, "continuous jump count should reset when recenter fails");
    assertEquals(displayCalls.count, 0, "failed recenter should prevent redraw");
    assert(hideCalls.count >= 1, "hideHintsOptimized should run even when recenter fails");
    assert(
      commands.some((cmd) => cmd.includes("Failed to recenter")),
      "should notify user when recenter command fails",
    );
  } finally {
    restore();
  }
});
