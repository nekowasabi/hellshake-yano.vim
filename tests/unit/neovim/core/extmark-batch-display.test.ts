import { assertEquals } from "@std/assert";
import { Core } from "../../../../denops/hellshake-yano/neovim/core/core.ts";
import type { HintMapping } from "../../../../denops/hellshake-yano/types.ts";
import { MockDenops } from "../../../helpers/mock.ts";

class BatchCaptureDenops extends MockDenops {
  batchCalls: Array<Array<[string, ...unknown[]]>> = [];
  private nextExtmarkId = 1;

  override batch(...calls: Array<[string, ...unknown[]]>): Promise<unknown[]> {
    this.batchCalls.push(calls);
    return Promise.resolve(calls.map((call) => {
      const [fn, ...args] = call;
      if (fn === "nvim_buf_get_lines") {
        const line = args[1] as number;
        return [`line-${line} has enough bytes for hints`];
      }
      if (fn === "nvim_buf_set_extmark") {
        return this.nextExtmarkId++;
      }
      return undefined;
    }));
  }
}

function makeHint(line: number, col: number, hint: string): HintMapping {
  return {
    word: { text: `word-${line}-${col}`, line, col, byteCol: col },
    hint,
    hintCol: col,
    hintByteCol: col,
  } as HintMapping;
}

Deno.test("Core.displayHintsWithExtmarksBatch: extmark 設定を denops.batch にまとめる", async () => {
  Core.resetForTesting();
  const core = Core.getInstance();
  const denops = new BatchCaptureDenops();
  denops.setCallResponse("bufnr", 1);
  denops.setCallResponse("bufexists", 1);
  denops.setCallResponse("line", 100);
  denops.setCallResponse("nvim_create_namespace", 10);

  await core.displayHintsWithExtmarksBatch(denops, 1, [
    makeHint(1, 1, "A"),
    makeHint(2, 3, "B"),
    makeHint(2, 8, "C"),
  ]);

  const directExtmarkCalls = denops.getCalls().filter((call) => call.fn === "nvim_buf_set_extmark");
  assertEquals(directExtmarkCalls.length, 0);

  const batchedExtmarkCalls = denops.batchCalls
    .flat()
    .filter((call) => call[0] === "nvim_buf_set_extmark");
  assertEquals(batchedExtmarkCalls.length, 3);

  const bufexistsCalls = denops.getCalls().filter((call) => call.fn === "bufexists");
  const lineCalls = denops.getCalls().filter((call) => call.fn === "line");
  assertEquals(bufexistsCalls.length, 1);
  assertEquals(lineCalls.length, 1);
});

Deno.test("Core.displayHintsWithExtmarksBatch: 行長を超える extmark は事前に除外する", async () => {
  Core.resetForTesting();
  const core = Core.getInstance();
  const denops = new BatchCaptureDenops();
  denops.setCallResponse("bufexists", 1);
  denops.setCallResponse("line", 100);
  denops.setCallResponse("nvim_create_namespace", 10);
  denops.batch = (...calls: Array<[string, ...unknown[]]>): Promise<unknown[]> => {
    denops.batchCalls.push(calls);
    return Promise.resolve(calls.map((call) => {
      if (call[0] === "nvim_buf_get_lines") {
        return ["abc"];
      }
      if (call[0] === "nvim_buf_set_extmark") {
        return 1;
      }
      return undefined;
    }));
  };

  await core.displayHintsWithExtmarksBatch(denops, 1, [
    makeHint(1, 1, "A"),
    makeHint(1, 99, "B"),
  ]);

  const batchedExtmarkCalls = denops.batchCalls
    .flat()
    .filter((call) => call[0] === "nvim_buf_set_extmark");
  assertEquals(batchedExtmarkCalls.length, 1);
  assertEquals(batchedExtmarkCalls[0][4], 0);
});

Deno.test("Core.highlightCandidateHintsHybrid: 1文字目入力後の候補表示を denops.batch にまとめる", async () => {
  Core.resetForTesting();
  const core = Core.getInstance();
  const denops = new BatchCaptureDenops();
  denops.setCallResponse("bufnr", 1);
  denops.setCallResponse("bufexists", 1);
  denops.setCallResponse("nvim_buf_line_count", 100);
  denops.setCallResponse("nvim_create_namespace", 10);
  denops.setCallResponse("hellshake_yano#core#should_redraw", false);

  await core.highlightCandidateHintsHybrid(denops, [
    makeHint(1, 1, "AB"),
    makeHint(2, 1, "AC"),
    makeHint(3, 1, "BD"),
  ], "A");

  const directExtmarkCalls = denops.getCalls().filter((call) => call.fn === "nvim_buf_set_extmark");
  assertEquals(directExtmarkCalls.length, 0);

  const batchedExtmarkCalls = denops.batchCalls
    .flat()
    .filter((call) => call[0] === "nvim_buf_set_extmark");
  assertEquals(batchedExtmarkCalls.length, 3);

  const candidateCalls = batchedExtmarkCalls.filter((call) => {
    const opts = call[5] as { priority?: number };
    return opts.priority === 1001;
  });
  const nonCandidateCalls = batchedExtmarkCalls.filter((call) => {
    const opts = call[5] as { priority?: number };
    return opts.priority === 1000;
  });
  assertEquals(candidateCalls.length, 2);
  assertEquals(nonCandidateCalls.length, 1);
});
