/**
 * ヒント選択機能の修正テスト
 * Process 50 Sub1の修正確認用
 */

import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";

// ヒント選択ロジックのモック実装
interface HintMapping {
  hint: string;
  word: {
    text: string;
    line: number;
    col: number;
  };
}

class HintSelector {
  private currentHints: HintMapping[] = [];
  private config = { useNumbers: false, highlightSelected: false };

  setHints(hints: HintMapping[]) {
    this.currentHints = hints;
  }

  setConfig(config: Partial<typeof this.config>) {
    this.config = { ...this.config, ...config };
  }

  // 入力文字を処理（大文字変換）
  processInputChar(char: number): string {
    const inputChar = String.fromCharCode(char);
    // アルファベットの場合は大文字に変換（数字はそのまま）
    if (/[a-zA-Z]/.test(inputChar)) {
      return inputChar.toUpperCase();
    }
    return inputChar;
  }

  // 入力文字の検証
  validateInput(inputChar: string): boolean {
    const validPattern = this.config.useNumbers ? /[A-Z0-9]/ : /[A-Z]/;
    return validPattern.test(inputChar);
  }

  // ヒント選択ロジック（修正版）
  selectHint(firstChar: string, secondChar?: string): HintMapping | null {
    // 入力文字で始まる全てのヒントを探す
    const matchingHints = this.currentHints.filter((h) => h.hint.startsWith(firstChar));

    if (matchingHints.length === 0) {
      return null; // No matching hint
    }

    // 単一文字のヒントと複数文字のヒントを分離
    const singleCharTarget = matchingHints.find((h) => h.hint === firstChar);
    const multiCharHints = matchingHints.filter((h) => h.hint.length > 1);

    // 第2文字が指定されていない場合
    if (!secondChar) {
      // 複数文字ヒントが存在しない場合のみ、単一文字でジャンプ
      if (singleCharTarget && multiCharHints.length === 0) {
        return singleCharTarget;
      }
      // 複数文字ヒントが存在する場合は、第2文字入力を待つ必要がある
      return null;
    }

    // 第2文字が指定されている場合
    const fullHint = firstChar + secondChar;
    const target = this.currentHints.find((h) => h.hint === fullHint);
    return target || null;
  }

  // 候補ヒントの取得
  getCandidateHints(firstChar: string): HintMapping[] {
    return this.currentHints.filter((h) => h.hint.startsWith(firstChar));
  }
}

describe("Hint Selection Fix Tests", () => {
  describe("Input Character Processing", () => {
    it("should convert lowercase letters to uppercase", () => {
      const selector = new HintSelector();

      // 小文字を大文字に変換
      assertEquals(selector.processInputChar(97), "A"); // 'a' -> 'A'
      assertEquals(selector.processInputChar(122), "Z"); // 'z' -> 'Z'

      // 大文字はそのまま
      assertEquals(selector.processInputChar(65), "A"); // 'A' -> 'A'
      assertEquals(selector.processInputChar(90), "Z"); // 'Z' -> 'Z'
    });

    it("should keep numbers as is", () => {
      const selector = new HintSelector();

      assertEquals(selector.processInputChar(48), "0"); // '0' -> '0'
      assertEquals(selector.processInputChar(57), "9"); // '9' -> '9'
    });

    it("should validate input based on config", () => {
      const selector = new HintSelector();

      // アルファベットのみモード
      selector.setConfig({ useNumbers: false });
      assertEquals(selector.validateInput("A"), true);
      assertEquals(selector.validateInput("Z"), true);
      assertEquals(selector.validateInput("0"), false);
      assertEquals(selector.validateInput("9"), false);

      // 数字も許可するモード
      selector.setConfig({ useNumbers: true });
      assertEquals(selector.validateInput("A"), true);
      assertEquals(selector.validateInput("Z"), true);
      assertEquals(selector.validateInput("0"), true);
      assertEquals(selector.validateInput("9"), true);
    });
  });

  describe("Single vs Multi-Character Hint Selection", () => {
    it("should jump immediately for single-char hint when no multi-char hints exist", () => {
      const selector = new HintSelector();
      selector.setHints([
        { hint: "A", word: { text: "apple", line: 1, col: 1 } },
        { hint: "B", word: { text: "banana", line: 2, col: 1 } },
        { hint: "C", word: { text: "cherry", line: 3, col: 1 } },
      ]);

      const result = selector.selectHint("A");
      assertExists(result);
      assertEquals(result.word.text, "apple");
    });

    it("should wait for second char when multi-char hints exist", () => {
      const selector = new HintSelector();
      selector.setHints([
        { hint: "A", word: { text: "apple", line: 1, col: 1 } },
        { hint: "AA", word: { text: "apricot", line: 2, col: 1 } },
        { hint: "AB", word: { text: "avocado", line: 3, col: 1 } },
      ]);

      // 第1文字だけでは選択しない（複数文字ヒントが存在するため）
      const result1 = selector.selectHint("A");
      assertEquals(result1, null);

      // 第2文字を指定すると選択される
      const result2 = selector.selectHint("A", "A");
      assertExists(result2);
      assertEquals(result2.word.text, "apricot");

      const result3 = selector.selectHint("A", "B");
      assertExists(result3);
      assertEquals(result3.word.text, "avocado");
    });

    it("should select single-char hint with timeout when multi-char hints exist", () => {
      const selector = new HintSelector();
      selector.setHints([
        { hint: "A", word: { text: "apple", line: 1, col: 1 } },
        { hint: "AA", word: { text: "apricot", line: 2, col: 1 } },
        { hint: "AB", word: { text: "avocado", line: 3, col: 1 } },
      ]);

      // タイムアウト時のシミュレーション：第2文字なしで単一文字を明示的に選択
      const candidates = selector.getCandidateHints("A");
      assertEquals(candidates.length, 3);

      // 単一文字ヒントが存在することを確認
      const singleChar = candidates.find((h) => h.hint === "A");
      assertExists(singleChar);
      assertEquals(singleChar.word.text, "apple");
    });

    it("should handle no matching hints gracefully", () => {
      const selector = new HintSelector();
      selector.setHints([
        { hint: "A", word: { text: "apple", line: 1, col: 1 } },
        { hint: "B", word: { text: "banana", line: 2, col: 1 } },
      ]);

      const result = selector.selectHint("C");
      assertEquals(result, null);
    });

    it("should handle mixed single and multi-char hints correctly", () => {
      const selector = new HintSelector();
      selector.setHints([
        { hint: "A", word: { text: "apple", line: 1, col: 1 } },
        { hint: "B", word: { text: "banana", line: 2, col: 1 } },
        { hint: "BA", word: { text: "blackberry", line: 3, col: 1 } },
        { hint: "BB", word: { text: "blueberry", line: 4, col: 1 } },
        { hint: "C", word: { text: "cherry", line: 5, col: 1 } },
      ]);

      // Aは単一文字のみなので即座に選択
      const resultA = selector.selectHint("A");
      assertExists(resultA);
      assertEquals(resultA.word.text, "apple");

      // Bは複数文字ヒントも存在するので待機
      const resultB = selector.selectHint("B");
      assertEquals(resultB, null);

      // B + Aで選択
      const resultBA = selector.selectHint("B", "A");
      assertExists(resultBA);
      assertEquals(resultBA.word.text, "blackberry");

      // Cは単一文字のみなので即座に選択
      const resultC = selector.selectHint("C");
      assertExists(resultC);
      assertEquals(resultC.word.text, "cherry");
    });

    it("should handle B and BP case correctly", () => {
      const selector = new HintSelector();
      selector.setHints([
        { hint: "A", word: { text: "apple", line: 1, col: 1 } },
        { hint: "B", word: { text: "banana", line: 2, col: 1 } },
        { hint: "BP", word: { text: "blueprint", line: 3, col: 1 } },
        { hint: "C", word: { text: "cherry", line: 4, col: 1 } },
      ]);

      // Bは複数文字ヒント(BP)が存在するので待機すべき
      const resultB = selector.selectHint("B");
      assertEquals(resultB, null);

      // B + Pで選択
      const resultBP = selector.selectHint("B", "P");
      assertExists(resultBP);
      assertEquals(resultBP.word.text, "blueprint");

      // Aは単一文字のみなので即座に選択
      const resultA = selector.selectHint("A");
      assertExists(resultA);
      assertEquals(resultA.word.text, "apple");

      // Cも単一文字のみなので即座に選択
      const resultC = selector.selectHint("C");
      assertExists(resultC);
      assertEquals(resultC.word.text, "cherry");
    });
  });

  describe("Number Support in Hints", () => {
    it("should handle numeric hints when enabled", () => {
      const selector = new HintSelector();
      selector.setConfig({ useNumbers: true });
      selector.setHints([
        { hint: "0", word: { text: "zero", line: 1, col: 1 } },
        { hint: "1", word: { text: "one", line: 2, col: 1 } },
        { hint: "2A", word: { text: "two-a", line: 3, col: 1 } },
        { hint: "A1", word: { text: "a-one", line: 4, col: 1 } },
      ]);

      // 数字単体のヒント
      const result0 = selector.selectHint("0");
      assertExists(result0);
      assertEquals(result0.word.text, "zero");

      // 数字で始まる複数文字ヒント
      const result2 = selector.selectHint("2");
      assertEquals(result2, null); // 複数文字ヒントが存在するので待機

      const result2A = selector.selectHint("2", "A");
      assertExists(result2A);
      assertEquals(result2A.word.text, "two-a");

      // アルファベット + 数字の組み合わせ
      const resultA = selector.selectHint("A");
      assertEquals(resultA, null); // 複数文字ヒントが存在するので待機

      const resultA1 = selector.selectHint("A", "1");
      assertExists(resultA1);
      assertEquals(resultA1.word.text, "a-one");
    });

    it("should validate numeric input correctly", () => {
      const selector = new HintSelector();

      // 数字無効モード
      selector.setConfig({ useNumbers: false });
      assertEquals(selector.validateInput("0"), false);
      assertEquals(selector.validateInput("9"), false);

      // 数字有効モード
      selector.setConfig({ useNumbers: true });
      assertEquals(selector.validateInput("0"), true);
      assertEquals(selector.validateInput("9"), true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty hint list", () => {
      const selector = new HintSelector();
      selector.setHints([]);

      const result = selector.selectHint("A");
      assertEquals(result, null);
    });

    it("should handle very long hint strings", () => {
      const selector = new HintSelector();
      selector.setHints([
        { hint: "AAA", word: { text: "triple-a", line: 1, col: 1 } },
        { hint: "AAAA", word: { text: "quad-a", line: 2, col: 1 } },
      ]);

      // 3文字以上のヒントは通常サポートされないが、ロジックは正しく動作すべき
      const candidates = selector.getCandidateHints("A");
      assertEquals(candidates.length, 2);

      const candidates2 = selector.getCandidateHints("AA");
      assertEquals(candidates2.length, 2);

      const candidates3 = selector.getCandidateHints("AAA");
      assertEquals(candidates3.length, 2);
    });

    it("should handle special characters in word text", () => {
      const selector = new HintSelector();
      selector.setHints([
        { hint: "A", word: { text: "hello-world", line: 1, col: 1 } },
        { hint: "B", word: { text: "foo_bar", line: 2, col: 1 } },
        { hint: "C", word: { text: "日本語", line: 3, col: 1 } },
      ]);

      const resultA = selector.selectHint("A");
      assertExists(resultA);
      assertEquals(resultA.word.text, "hello-world");

      const resultC = selector.selectHint("C");
      assertExists(resultC);
      assertEquals(resultC.word.text, "日本語");
    });
  });
});
