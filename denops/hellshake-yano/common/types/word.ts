/**
 * denops/hellshake-yano/common/types/word.ts
 *
 * 単語型の定義と座標系変換
 *
 * VimScript型とDenops型の相互変換を提供します。
 * 座標系の違いに注意してください（全て1-indexed）。
 */

/**
 * VimScript版の単語データ型定義
 *
 * VimScript版のword_detector.vimが返すデータ構造
 *
 * @property text - 単語文字列
 * @property lnum - 行番号（1-indexed）
 * @property col - 開始列（1-indexed）
 * @property end_col - 終了列（1-indexed、matchstrposの戻り値 + 1）
 */
export interface VimScriptWord {
  text: string;
  lnum: number;
  col: number;
  end_col: number;
}

/**
 * Denops版のWord型
 *
 * @property text - 単語文字列
 * @property line - 行番号（1-indexed）
 * @property col - 開始列（1-indexed）
 * @property byteCol - バイト列（オプショナル）
 */
export interface DenopsWord {
  text: string;
  line: number;
  col: number;
  byteCol?: number;
}

/**
 * VimScriptWord型をDenopsWord型に変換
 *
 * VimScript版の単語データをDenops版のWord型に変換します。
 * end_col情報は失われますが、text, line, colのみを使用します。
 *
 * @param vimWord - VimScript版の単語データ
 * @returns Denops版のWord型
 *
 * @example
 * ```typescript
 * const vimWord = { text: "hello", lnum: 10, col: 5, end_col: 10 };
 * const denopsWord = vimScriptToDenops(vimWord);
 * // { text: "hello", line: 10, col: 5 }
 * ```
 */
export function vimScriptToDenops(vimWord: VimScriptWord): DenopsWord {
  return {
    text: vimWord.text,
    line: vimWord.lnum,
    col: vimWord.col,
  };
}

/**
 * DenopsWord型をVimScriptWord型に変換
 *
 * Denops版のWord型をVimScript版の単語データに変換します。
 * end_colは単語の長さから計算します（col + text.length）。
 *
 * @param denopsWord - Denops版のWord型
 * @returns VimScript版の単語データ
 *
 * @example
 * ```typescript
 * const denopsWord = { text: "hello", line: 10, col: 5 };
 * const vimWord = denopsToVimScript(denopsWord);
 * // { text: "hello", lnum: 10, col: 5, end_col: 10 }
 * ```
 */
export function denopsToVimScript(denopsWord: DenopsWord): VimScriptWord {
  return {
    text: denopsWord.text,
    lnum: denopsWord.line,
    col: denopsWord.col,
    end_col: denopsWord.col + denopsWord.text.length,
  };
}

/**
 * VimScriptWord型の型ガード
 *
 * @param obj - チェック対象のオブジェクト
 * @returns VimScriptWord型かどうか
 */
export function isVimScriptWord(obj: unknown): obj is VimScriptWord {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as VimScriptWord).text === "string" &&
    typeof (obj as VimScriptWord).lnum === "number" &&
    typeof (obj as VimScriptWord).col === "number" &&
    typeof (obj as VimScriptWord).end_col === "number" &&
    (obj as VimScriptWord).lnum > 0 &&
    (obj as VimScriptWord).col >= 0 &&
    (obj as VimScriptWord).end_col > 0
  );
}

/**
 * DenopsWord型の型ガード
 *
 * @param obj - チェック対象のオブジェクト
 * @returns DenopsWord型かどうか
 */
export function isDenopsWord(obj: unknown): obj is DenopsWord {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as DenopsWord).text === "string" &&
    typeof (obj as DenopsWord).line === "number" &&
    typeof (obj as DenopsWord).col === "number" &&
    (obj as DenopsWord).line > 0 &&
    (obj as DenopsWord).col >= 0
  );
}
