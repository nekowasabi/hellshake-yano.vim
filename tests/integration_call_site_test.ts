/**
 * @fileoverview Integration tests for call site modification
 * Verifies the actual call flow in main.ts
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.201.0/assert/mod.ts";
import { delay } from "https://deno.land/std@0.201.0/async/delay.ts";

// Read and analyze the actual source code
const sourceCode = await Deno.readTextFile("denops/hellshake-yano/main.ts");

Deno.test("Integration: 実装ファイルで非同期版が使用されている", () => {
  // Line 2469付近で非同期版が呼ばれていることを確認
  const callSitePattern = /highlightCandidateHintsAsync\s*\(\s*denops\s*,\s*inputChar\s*\)/;

  const hasAsyncCall = callSitePattern.test(sourceCode);

  assertEquals(
    hasAsyncCall,
    true,
    "main.ts should call highlightCandidateHintsAsync"
  );
});

Deno.test("Integration: awaitが使用されていない", () => {
  // 呼び出し箇所でawaitが使われていないことを確認
  const lines = sourceCode.split("\n");

  // Line 2469付近を探す
  let foundCall = false;
  let hasAwait = false;

  for (let i = 2460; i < 2480 && i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("highlightCandidateHintsAsync")) {
      foundCall = true;
      if (line.includes("await")) {
        hasAwait = true;
      }
      break;
    }
  }

  assertEquals(foundCall, true, "Should find the async call");
  assertEquals(hasAwait, false, "Should NOT use await with async call");
});

Deno.test("Integration: 条件分岐内で正しく呼ばれている", () => {
  // shouldHighlightの条件内で呼ばれていることを確認
  const contextPattern = /if\s*\(\s*shouldHighlight[^}]*highlightCandidateHintsAsync/s;

  const hasCorrectContext = contextPattern.test(sourceCode);

  assertEquals(
    hasCorrectContext,
    true,
    "Async call should be inside shouldHighlight condition"
  );
});

Deno.test("Integration: コメントが適切に記載されている", () => {
  // 非同期版使用の理由がコメントに記載されていることを確認
  const lines = sourceCode.split("\n");

  let foundComment = false;

  for (let i = 2475; i < 2480 && i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("非同期") || line.includes("ブロック") || line.includes("async")) {
      foundComment = true;
      break;
    }
  }

  assertEquals(
    foundComment,
    true,
    "Should have a comment explaining async usage"
  );
});

Deno.test("Integration: 古い同期版の呼び出しが残っていない", () => {
  // highlightCandidateHints（同期版）がawait付きで呼ばれていないことを確認
  const syncCallPattern = /await\s+highlightCandidateHints\s*\(/;

  const hasSyncAwaitCall = syncCallPattern.test(sourceCode);

  assertEquals(
    hasSyncAwaitCall,
    false,
    "Should not have await highlightCandidateHints calls"
  );
});

Deno.test("Integration: エクスポートが正しく設定されている", () => {
  // highlightCandidateHintsAsyncがexportされていることを確認
  const exportPattern = /export\s+function\s+highlightCandidateHintsAsync/;

  const isExported = exportPattern.test(sourceCode);

  assertEquals(
    isExported,
    true,
    "highlightCandidateHintsAsync should be exported"
  );
});

console.log("✅ Integration tests for call site modification completed");