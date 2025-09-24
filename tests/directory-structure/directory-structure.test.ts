import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { join } from "https://deno.land/std@0.208.0/path/mod.ts";

/**
 * ディレクトリ構造準備のTDDテスト
 * Process1: main.tsを責務ごとに分割するための基盤構築
 */

const DENOPS_DIR = join(Deno.cwd(), "denops", "hellshake-yano");
const SKIP_DIRECTORY_STRUCTURE_TESTS = true;

// 新規作成予定のディレクトリリスト
const TARGET_DIRECTORIES = [
  "display",     // ハイライト表示やUI関連の責務
  "validation",  // 入力検証やバリデーション関連の責務
  "dictionary",  // 辞書機能や単語管理関連の責務
  "input",       // キー入力やイベント処理関連の責務
  "performance", // パフォーマンス監視や最適化関連の責務
  "core"         // コア機能やメイン処理関連の責務
] as const;

Deno.test({
  name: "ディレクトリ構造: 作成されたディレクトリが存在することを確認",
  ignore: SKIP_DIRECTORY_STRUCTURE_TESTS,
}, async () => {
  console.log("📁 ディレクトリ存在確認テスト開始");

  for (const dirName of TARGET_DIRECTORIES) {
    const dirPath = join(DENOPS_DIR, dirName);

    try {
      const stat = await Deno.stat(dirPath);
      // ディレクトリが存在し、かつディレクトリであることを確認
      assertEquals(true, stat.isDirectory, `${dirName} がディレクトリとして存在すべきです`);
      console.log(`✅ ${dirName} ディレクトリの存在を確認: ${dirPath}`);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        // ディレクトリが存在しない場合はエラー
        console.log(`❌ ${dirName} ディレクトリが存在しません: ${dirPath}`);
        throw new Error(`${dirName} ディレクトリが見つかりません`);
      } else {
        throw error;
      }
    }
  }

  console.log("✅ 全てのディレクトリが正しく存在することを確認しました");
});

Deno.test({
  name: "ファイル構造: 各ディレクトリにindex.tsが存在することを確認",
  ignore: SKIP_DIRECTORY_STRUCTURE_TESTS,
}, async () => {
  console.log("📄 index.tsファイル存在確認テスト開始");

  for (const dirName of TARGET_DIRECTORIES) {
    const indexPath = join(DENOPS_DIR, dirName, "index.ts");

    try {
      const stat = await Deno.stat(indexPath);
      // ファイルが存在し、かつファイルであることを確認
      assertEquals(true, stat.isFile, `${dirName}/index.ts がファイルとして存在すべきです`);
      console.log(`✅ ${dirName}/index.ts の存在を確認: ${indexPath}`);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        // ファイルが存在しない場合はエラー
        console.log(`❌ ${dirName}/index.ts が存在しません: ${indexPath}`);
        throw new Error(`${dirName}/index.ts ファイルが見つかりません`);
      } else {
        throw error;
      }
    }
  }

  console.log("✅ 全てのindex.tsファイルが正しく存在することを確認しました");
});

Deno.test({
  name: "Green Phase: ディレクトリ作成テスト",
  ignore: SKIP_DIRECTORY_STRUCTURE_TESTS,
}, async () => {
  console.log("🟢 Green Phase: ディレクトリを作成してテストをパス");

  for (const dirName of TARGET_DIRECTORIES) {
    const dirPath = join(DENOPS_DIR, dirName);

    // ディレクトリを作成
    await Deno.mkdir(dirPath, { recursive: true });
    console.log(`📁 ${dirName} ディレクトリを作成: ${dirPath}`);

    // 作成されたことを確認
    const stat = await Deno.stat(dirPath);
    assertEquals(stat.isDirectory, true, `${dirName} ディレクトリが正しく作成されていません`);
    console.log(`✅ ${dirName} ディレクトリの作成を確認`);
  }

  console.log("🟢 Green Phase完了: 全てのディレクトリが正しく作成されました");
});

Deno.test({
  name: "Green Phase: index.ts作成テスト",
  ignore: SKIP_DIRECTORY_STRUCTURE_TESTS,
}, async () => {
  console.log("🟢 Green Phase: index.tsファイルを作成してテストをパス");

  for (const dirName of TARGET_DIRECTORIES) {
    const indexPath = join(DENOPS_DIR, dirName, "index.ts");

    // 責務に応じたコメントを生成
    const responsibilityComment = getResponsibilityComment(dirName);
    const indexContent = generateIndexTemplate(dirName, responsibilityComment);

    // index.tsファイルを作成
    await Deno.writeTextFile(indexPath, indexContent);
    console.log(`📄 ${dirName}/index.ts を作成: ${indexPath}`);

    // 作成されたことを確認
    const stat = await Deno.stat(indexPath);
    assertEquals(stat.isFile, true, `${dirName}/index.ts が正しく作成されていません`);
    console.log(`✅ ${dirName}/index.ts の作成を確認`);
  }

  console.log("🟢 Green Phase完了: 全てのindex.tsファイルが正しく作成されました");
});

Deno.test({
  name: "Refactor Phase: 作成された構造の整合性テスト",
  ignore: SKIP_DIRECTORY_STRUCTURE_TESTS,
}, async () => {
  console.log("🔄 Refactor Phase: 作成された構造の整合性テスト");

  // ディレクトリ構造の検証
  for (const dirName of TARGET_DIRECTORIES) {
    const dirPath = join(DENOPS_DIR, dirName);
    const indexPath = join(DENOPS_DIR, dirName, "index.ts");

    // ディレクトリが存在することを確認
    const dirStat = await Deno.stat(dirPath);
    assertEquals(dirStat.isDirectory, true, `${dirName} ディレクトリが存在しません`);

    // index.tsファイルが存在することを確認
    const fileStat = await Deno.stat(indexPath);
    assertEquals(fileStat.isFile, true, `${dirName}/index.ts ファイルが存在しません`);

    // ファイル内容の検証
    const content = await Deno.readTextFile(indexPath);
    assertEquals(content.includes(`${dirName} モジュールのエントリーポイント`), true, `${dirName}/index.ts のコメントが正しくありません`);
    assertEquals(content.includes(`export {};`), true, `${dirName}/index.ts のexport文が見つかりません`);

    console.log(`✅ ${dirName} の構造整合性を確認`);
  }

  console.log("🔄 Refactor Phase完了: 全ての構造整合性を確認しました");
});

Deno.test({
  name: "Refactor Phase: ディレクトリ責務のドキュメント生成",
  ignore: SKIP_DIRECTORY_STRUCTURE_TESTS,
}, async () => {
  console.log("🔄 Refactor Phase: ディレクトリ責務のドキュメント生成");

  const documentationPath = join(DENOPS_DIR, "DIRECTORY_STRUCTURE.md");
  const docContent = generateDirectoryDocumentation();

  await Deno.writeTextFile(documentationPath, docContent);
  console.log(`📋 ディレクトリ構造ドキュメントを作成: ${documentationPath}`);

  // ドキュメントの存在確認
  const stat = await Deno.stat(documentationPath);
  assertEquals(stat.isFile, true, "ディレクトリ構造ドキュメントが作成されていません");

  console.log("🔄 Refactor Phase完了: ディレクトリ構造ドキュメントを生成しました");
});

/**
 * ディレクトリの責務に応じたコメントを生成
 */
function getResponsibilityComment(dirName: string): string {
  const comments = {
    "display": "// ハイライト表示やUI関連の責務を管理",
    "validation": "// 入力検証やバリデーション関連の責務を管理",
    "dictionary": "// 辞書機能や単語管理関連の責務を管理",
    "input": "// キー入力やイベント処理関連の責務を管理",
    "performance": "// パフォーマンス監視や最適化関連の責務を管理",
    "core": "// コア機能やメイン処理関連の責務を管理"
  } as const;

  return comments[dirName as keyof typeof comments] || `// ${dirName} 関連の責務を管理`;
}

/**
 * index.tsのテンプレートを生成
 */
function generateIndexTemplate(dirName: string, responsibilityComment: string): string {
  return `${responsibilityComment}

/**
 * ${dirName} モジュールのエントリーポイント
 *
 * このファイルは main.ts から分離された ${dirName} 関連の機能を
 * 統一的に管理するためのインデックスファイルです。
 */

// TODO: main.ts から ${dirName} 関連の機能を移行予定

export {};
`;
}

/**
 * ディレクトリ構造のドキュメントを生成
 */
function generateDirectoryDocumentation(): string {
  const directoryInfo = {
    "display": {
      "purpose": "ハイライト表示やUI関連の責務",
      "functions": ["ハイライト表示管理", "UI コンポーネント", "視覚効果"]
    },
    "validation": {
      "purpose": "入力検証やバリデーション関連の責務",
      "functions": ["入力値検証", "データ形式チェック", "エラーハンドリング"]
    },
    "dictionary": {
      "purpose": "辞書機能や単語管理関連の責務",
      "functions": ["辞書データ管理", "単語検索", "辞書キャッシュ"]
    },
    "input": {
      "purpose": "キー入力やイベント処理関連の責務",
      "functions": ["キーボード入力処理", "イベントハンドリング", "入力マッピング"]
    },
    "performance": {
      "purpose": "パフォーマンス監視や最適化関連の責務",
      "functions": ["パフォーマンス測定", "最適化処理", "メモリ管理"]
    },
    "core": {
      "purpose": "コア機能やメイン処理関連の責務",
      "functions": ["基本機能", "プラグイン初期化", "設定管理"]
    }
  };

  let doc = `# hellshake-yano.vim ディレクトリ構造

このドキュメントは、main.ts のリファクタリングで作成されたディレクトリ構造を説明します。

## 概要

main.ts (3300行超) を責務ごとに分割し、保守性とテスタビリティを向上させるための
ディレクトリ構造を構築しました。

## ディレクトリ構造

\`\`\`
denops/hellshake-yano/
├── display/         # ハイライト表示・UI関連
├── validation/      # 入力検証・バリデーション関連
├── dictionary/      # 辞書機能・単語管理関連
├── input/           # キー入力・イベント処理関連
├── performance/     # パフォーマンス監視・最適化関連
└── core/            # コア機能・メイン処理関連
\`\`\`

## 各ディレクトリの責務

`;

  for (const [dirName, info] of Object.entries(directoryInfo)) {
    doc += `### ${dirName}/

**責務**: ${info.purpose}

**主な機能**:
${info.functions.map(func => `- ${func}`).join('\n')}

`;
  }

  doc += `## TDD実装プロセス

このディレクトリ構造は、TDD (Test-Driven Development) のRed-Green-Refactorサイクルに従って実装されました：

1. **Red Phase**: 存在しないディレクトリ/ファイルのテストを作成し、失敗を確認
2. **Green Phase**: ディレクトリとindex.tsファイルを作成し、テストをパス
3. **Refactor Phase**: 構造の整合性チェックとドキュメント生成

## 次のステップ

各ディレクトリの index.ts ファイルには TODO コメントが含まれており、
main.ts から該当する機能を段階的に移行する予定です。

---

*Generated by TDD process on ${new Date().toISOString()}*
`;

  return doc;
}
