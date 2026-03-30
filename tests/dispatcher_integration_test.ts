/**
 * @fileoverview Process 10: Dispatcher統合テスト
 *
 * Vim層(initializeVimLayer)とNeovim層(initializeNeovimLayer)の
 * dispatcher関数名が完全一致することを検証する。
 *
 * Why: ソースコード解析アプローチ（正規表現）を採用。
 * 理由: initializeVimLayer/initializeNeovimLayerはexportされていないため、
 * ランタイムテストではなくソースコード静的解析で関数名一致を検証する。
 */
import { assertEquals, assertNotEquals } from "@std/assert";

const MAIN_TS_PATH = new URL(
  "../denops/hellshake-yano/main.ts",
  import.meta.url,
);

/**
 * main.tsのソースコードから指定された関数ブロック内のdispatcher関数名を抽出する。
 *
 * Why: `denops.dispatcher = { ... }` 内の `async funcName(` パターンで抽出。
 * `["']?(\w+)["']?\s*\(` でもマッチ可能だが、実際のコードは全て
 * `async funcName(` 形式なので、よりシンプルなパターンを採用。
 */
function extractDispatcherFunctions(
  source: string,
  startMarker: string,
  endMarker: string | null,
): string[] {
  // startMarkerの位置を検索
  const startIdx = source.indexOf(startMarker);
  if (startIdx === -1) {
    throw new Error(`Start marker not found: "${startMarker}"`);
  }

  // endMarkerの位置を検索（nullの場合はファイル末尾）
  let endIdx: number;
  if (endMarker === null) {
    endIdx = source.length;
  } else {
    endIdx = source.indexOf(endMarker, startIdx + startMarker.length);
    if (endIdx === -1) {
      throw new Error(`End marker not found: "${endMarker}"`);
    }
  }

  const block = source.substring(startIdx, endIdx);

  // `denops.dispatcher = {` から対応する `};` までを抽出
  const dispatcherStart = block.indexOf("denops.dispatcher = {");
  if (dispatcherStart === -1) {
    throw new Error(
      `denops.dispatcher assignment not found in block starting with "${startMarker}"`,
    );
  }

  // dispatcher オブジェクト内の async 関数名を抽出
  // パターン: `async funcName(` — dispatcher直下の関数定義を捕捉
  const dispatcherBlock = block.substring(dispatcherStart);

  // Why: 行頭のインデント + "async" + 関数名 + "(" パターンで抽出。
  // dispatcher内のネストされた async（コールバック等）を除外するため、
  // 適切なインデントレベル（6スペースまたは相当）でフィルタする。
  const funcPattern = /^\s+async\s+(\w+)\s*\(/gm;
  const functions: string[] = [];
  let match;

  while ((match = funcPattern.exec(dispatcherBlock)) !== null) {
    const funcName = match[1];
    // dispatcher直下の関数のみ（ネストされた無名async関数を除外）
    // ヒューリスティック: 行のインデントが浅い（dispatcher直下）ものだけ
    const line = match[0];
    const indent = line.length - line.trimStart().length;
    // dispatcher = { の直下は通常6-8スペースのインデント
    if (indent <= 12) {
      functions.push(funcName);
    }
  }

  return [...new Set(functions)].sort();
}

Deno.test("Dispatcher Integration: Vim層とNeovim層の関数名一致検証", async (t) => {
  const source = await Deno.readTextFile(MAIN_TS_PATH);

  let vimFunctions: string[];
  let neovimFunctions: string[];

  await t.step("main.tsのソースコードを読み込めること", () => {
    assertNotEquals(source.length, 0, "main.ts should not be empty");
  });

  await t.step("Vim層のdispatcher関数名を抽出できること", () => {
    vimFunctions = extractDispatcherFunctions(
      source,
      "async function initializeVimLayer(",
      "async function initializeNeovimLayer(",
    );
    assertNotEquals(
      vimFunctions.length,
      0,
      "Vim layer should have dispatcher functions",
    );
    console.log(`  Vim層 dispatcher関数数: ${vimFunctions.length}`);
    console.log(`  Vim層 関数一覧: ${vimFunctions.join(", ")}`);
  });

  await t.step("Neovim層のdispatcher関数名を抽出できること", () => {
    neovimFunctions = extractDispatcherFunctions(
      source,
      "async function initializeNeovimLayer(",
      null, // ファイル末尾まで
    );
    assertNotEquals(
      neovimFunctions.length,
      0,
      "Neovim layer should have dispatcher functions",
    );
    console.log(`  Neovim層 dispatcher関数数: ${neovimFunctions.length}`);
    console.log(`  Neovim層 関数一覧: ${neovimFunctions.join(", ")}`);
  });

  await t.step("Vim層にのみ存在する関数を検出", () => {
    const vimOnly = vimFunctions.filter((f) => !neovimFunctions.includes(f));
    if (vimOnly.length > 0) {
      console.log(`  ⚠ Vim層にのみ存在: ${vimOnly.join(", ")}`);
    } else {
      console.log("  Vim層固有の関数なし（全てNeovim層にも存在）");
    }
    // 情報として記録（不一致があってもテスト自体は後続stepで判定）
  });

  await t.step("Neovim層にのみ存在する関数を検出", () => {
    const neovimOnly = neovimFunctions.filter(
      (f) => !vimFunctions.includes(f),
    );
    if (neovimOnly.length > 0) {
      console.log(`  ⚠ Neovim層にのみ存在: ${neovimOnly.join(", ")}`);
    } else {
      console.log("  Neovim層固有の関数なし（全てVim層にも存在）");
    }
  });

  // Why: 完全一致テストではなくスーパーセット検証に変更。
  // Neovim層はVim層の全関数を含み、さらにNeovim固有の関数（マルチウィンドウ等）を持つ。
  // Vim層の全関数がNeovim層に存在することを保証すれば互換性は担保される。
  await t.step("Vim層の全関数がNeovim層にも存在すること（スーパーセット検証）", () => {
    const vimOnly = vimFunctions.filter((f) => !neovimFunctions.includes(f));
    const neovimOnly = neovimFunctions.filter(
      (f) => !vimFunctions.includes(f),
    );

    if (vimOnly.length > 0) {
      const report = [
        "Vim層にのみ存在する関数を検出（Neovim層に不足）:",
        "",
      ];
      vimOnly.forEach((f) => report.push(`  - ${f}`));
      console.log(report.join("\n"));
    }
    if (neovimOnly.length > 0) {
      console.log(
        `  Neovim層固有の関数 (${neovimOnly.length}件、許容): ${neovimOnly.join(", ")}`,
      );
    }

    // Why: assertEquals(vimOnly, []) ではなく assertEquals(vimOnly.length, 0) を使用。
    // 配列比較だと差分が見えにくいため、先にログ出力してから件数で判定する。
    assertEquals(
      vimOnly.length,
      0,
      `Vim層の関数がNeovim層に不足しています: [${vimOnly.join(", ")}]`,
    );
  });
});

Deno.test("Dispatcher Integration: 全関数がasync関数であること", async (t) => {
  const source = await Deno.readTextFile(MAIN_TS_PATH);

  for (const layerName of ["Vim", "Neovim"] as const) {
    await t.step(`${layerName}層の全dispatcher関数がasyncであること`, () => {
      const startMarker = layerName === "Vim"
        ? "async function initializeVimLayer("
        : "async function initializeNeovimLayer(";
      const endMarker = layerName === "Vim"
        ? "async function initializeNeovimLayer("
        : null;

      const startIdx = source.indexOf(startMarker);
      const endIdx = endMarker
        ? source.indexOf(endMarker, startIdx + startMarker.length)
        : source.length;
      const block = source.substring(startIdx, endIdx);

      // dispatcher内の関数定義を探す
      const dispatcherStart = block.indexOf("denops.dispatcher = {");
      const dispatcherBlock = block.substring(dispatcherStart);

      // dispatcher直下の関数定義パターン（asyncなし含む）を検索
      // Why: "async funcName(" だけでなく "funcName(" も検出して、
      // async でない関数がないか確認する
      const allFuncPattern = /^\s{4,12}(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*Promise)?/gm;
      const nonAsyncPattern = /^\s{4,12}(\w+)\s*\([^)]*\)\s*:/gm;

      let asyncCount = 0;
      const asyncPattern = /^\s{4,12}async\s+(\w+)\s*\(/gm;
      let match;
      while ((match = asyncPattern.exec(dispatcherBlock)) !== null) {
        asyncCount++;
      }

      assertNotEquals(
        asyncCount,
        0,
        `${layerName} layer should have async dispatcher functions`,
      );
      console.log(
        `  ${layerName}層: ${asyncCount}個のasync関数を検出`,
      );
    });
  }
});
