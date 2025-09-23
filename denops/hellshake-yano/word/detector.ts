/**
 * Word Detection Abstraction Layer for Hellshake-Yano
 *
 * This module provides a flexible word detection system that supports
 * multiple detection strategies including regex-based and TinySegmenter-based
 * Japanese word segmentation.
 */

import type { Denops } from "@denops/std";
import type { Word, DetectionContext, WordDetectionResult } from "../types.ts";

// Re-export types for backward compatibility
export type { DetectionContext, WordDetectionResult };
import { type SegmentationResult, TinySegmenter } from "../segmenter.ts";
import { charIndexToByteIndex } from "../utils/encoding.ts";
import { ContextDetector, type SplittingRules } from "./context.ts";
import type { Config } from "../main.ts";
import { getMinLengthForKey } from "../validation/index.ts";
import { convertToDisplayColumn } from "../hint-utils.ts";
import { WordDictionaryImpl, createBuiltinDictionary, applyDictionaryCorrection } from "./dictionary.ts";
import { DictionaryLoader, DictionaryMerger, VimConfigBridge, type UserDictionary } from "./dictionary-loader.ts";

/**
 * Position-aware segment interface for tracking original positions
 *
 * @description 位置情報を保持するセグメントインターフェイス
 * 形態素解析後のセグメント結合処理で元テキスト内の正確な位置を追跡するために使用
 *
 * @example
 * ```typescript
 * const segment: PositionSegment = {
 *   text: "こんにちは",
 *   startIndex: 0,      // 元テキスト内での開始位置
 *   endIndex: 5,        // 元テキスト内での終了位置
 *   originalIndex: 0    // 結合前の元の位置
 * };
 * ```
 */
export interface PositionSegment {
  text: string;
  startIndex: number;
  endIndex: number;
  originalIndex: number; // Position in original text before merging
}

/**
 * Configuration interfaces for word detection
 *
 * @description 単語検出器の設定オプションを定義するインターフェイス
 * 各検出器の動作をカスタマイズするための包括的な設定項目を提供します
 *
 * @example
 * ```typescript
 * // 日本語有効・高精度設定
 * const japaneseConfig: WordDetectionConfig = {
 *   strategy: "hybrid",
 *   use_japanese: true,
 *   enable_tinysegmenter: true,
 *   segmenter_threshold: 4,
 *   japanese_merge_particles: true,
 *   min_word_length: 1
 * };
 *
 * // 英語専用・高速設定
 * const englishConfig: WordDetectionConfig = {
 *   strategy: "regex",
 *   use_japanese: false,
 *   exclude_single_chars: true,
 *   min_word_length: 2,
 *   max_word_length: 30
 * };
 *
 * // パフォーマンス重視設定
 * const performanceConfig: WordDetectionConfig = {
 *   cache_enabled: true,
 *   cache_max_size: 500,
 *   batch_size: 50,
 *   enable_fallback: true
 * };
 * ```
 */
export interface WordDetectionConfig {
  strategy?: "regex" | "tinysegmenter" | "hybrid";
  use_japanese?: boolean;
  // Backward compatibility toggle (ignored in implementation)
  use_improved_detection?: boolean;

  // TinySegmenter specific options
  enable_tinysegmenter?: boolean;
  segmenter_threshold?: number; // minimum characters for segmentation
  segmenter_cache_size?: number;

  // Fallback and error handling
  enable_fallback?: boolean;
  fallback_to_regex?: boolean;
  max_retries?: number;

  // Performance settings
  cache_enabled?: boolean;
  cache_max_size?: number;
  batch_size?: number;

  // Filtering options
  min_word_length?: number;
  max_word_length?: number;
  exclude_numbers?: boolean;
  exclude_single_chars?: boolean;

  // Japanese-specific options
  japanese_merge_particles?: boolean;
  japanese_merge_threshold?: number;
  japanese_min_word_length?: number;
}

// DetectionContext interface moved to types.ts for consolidation
// Use: import type { DetectionContext } from "../types.ts";

// Base interface for all word detectors
export interface WordDetector {
  readonly name: string;
  readonly priority: number; // Higher priority = preferred detector
  readonly supportedLanguages: string[]; // e.g., ['ja', 'en', 'any']

  detectWords(text: string, startLine: number, context?: DetectionContext, denops?: Denops): Promise<Word[]>;
  canHandle(text: string): boolean;
  isAvailable(): Promise<boolean>;
}

// WordDetectionResult interface moved to types.ts for consolidation
// Use: import type { WordDetectionResult } from "../types.ts";

/**
 * Regex-based Word Detector
 * Extracts current word detection logic from word.ts
 */
export class RegexWordDetector implements WordDetector {
  readonly name = "RegexWordDetector";
  readonly priority = 1;
  readonly supportedLanguages = ["en", "ja", "any"];

  private config: WordDetectionConfig;
  private globalConfig?: Config; // 統一的なmin_length処理のためのグローバル設定

  /**
   * RegexWordDetectorのコンストラクタ
   * @description 正規表現ベースの単語ディテクターを初期化
   * @param config - ディテクター設定（省略時はデフォルト設定）
   * @param globalConfig - グローバル設定（統一的なmin_length処理のため）
   *
   * @example
   * ```typescript
   * // 基本的な英語単語検出器
   * const detector = new RegexWordDetector({
   *   use_japanese: false,
   *   min_word_length: 2
   * });
   *
   * // 日本語対応検出器
   * const japaneseDetector = new RegexWordDetector({
   *   use_japanese: true,
   *   exclude_single_chars: false
   * });
   *
   * // 数字除外設定
   * const noNumbersDetector = new RegexWordDetector({
   *   exclude_numbers: true,
   *   max_word_length: 20
   * });
   * ```
   *
   * @since 1.0.0
   */
  constructor(config: WordDetectionConfig = {}, globalConfig?: Config) {
    this.config = this.mergeWithDefaults(config);
    this.globalConfig = globalConfig;
  }

  /**
   * 統一的なmin_length取得
   * @description Context → GlobalConfig → LocalConfig の優先順位でmin_lengthを取得
   * @param context - 検出コンテキスト
   * @param key - モーションキー（グローバル設定のper_key_min_lengthで使用）
   * @returns 使用すべき最小単語長
   */
  private getEffectiveMinLength(context?: DetectionContext, key?: string): number {
    // 1. Context優先
    if (context?.minWordLength !== undefined) {
      return context.minWordLength;
    }

    // 2. グローバル設定のper_key_min_length
    if (this.globalConfig && key) {
      return getMinLengthForKey(this.globalConfig, key);
    }

    // 3. ローカル設定のmin_word_length
    return this.config.min_word_length || 1;
  }

  async detectWords(text: string, startLine: number, context?: DetectionContext, denops?: Denops): Promise<Word[]> {
    const words: Word[] = [];
    const lines = text.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      const lineNumber = startLine + i;

      // 常に改善版検出を使用（統合済み）
      const lineWords = this.extractWordsImproved(lineText, lineNumber, context);

      words.push(...lineWords);
    }

    return this.applyFilters(words, context);
  }

  canHandle(text: string): boolean {
    return true; // Regex detector can handle any text
  }

  async isAvailable(): Promise<boolean> {
    return true; // Always available
  }

  /**
   * Improved word extraction (from word.ts extractWordsFromLine)
   */
  private extractWordsImproved(
    lineText: string,
    lineNumber: number,
    context?: DetectionContext,
  ): Word[] {
    const words: Word[] = [];

    if (!lineText || lineText.trim().length < 1) {
      return words;
    }

    // 1. Basic word detection
    const basicWordRegex = this.config.use_japanese
      ? /[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]+/g
      : /[a-zA-Z0-9]+/g;

    let match: RegExpExecArray | null;
    const allMatches: { text: string; index: number }[] = [];

    const minLength = this.getEffectiveMinLength(context, context?.currentKey);
    const perKeyConfig = (this.globalConfig as Config | undefined)?.per_key_min_length ||
      (this.config as unknown as { per_key_min_length?: Record<string, number> })
        .per_key_min_length;
    const enableSingleCharExpansion = Boolean(
      minLength <= 1 && perKeyConfig && Object.values(perKeyConfig).some((value) => value <= 1),
    );

    while ((match = basicWordRegex.exec(lineText)) !== null) {
      if (match[0].length >= minLength) {
        allMatches.push({ text: match[0], index: match.index });
      }
    }

    // 2. Split compound words (kebab-case, snake_case)
    const splitMatches: { text: string; index: number }[] = [];

    for (const originalMatch of allMatches) {
      const text = originalMatch.text;
      const baseIndex = originalMatch.index;

      // kebab-case splitting
      if (text.includes("-") && /^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)+$/.test(text)) {
        const parts = text.split("-");
        let currentIndex = baseIndex;

        for (const part of parts) {
          if (part.length >= 1) {
            splitMatches.push({ text: part, index: currentIndex });
          }
          currentIndex += part.length + 1;
        }
      } // snake_case splitting
      else if (text.includes("_") && /^[a-zA-Z0-9]+(_[a-zA-Z0-9]+)+$/.test(text)) {
        const parts = text.split("_");
        let currentIndex = baseIndex;

        for (const part of parts) {
          if (part.length >= 1) {
            splitMatches.push({ text: part, index: currentIndex });
          }
          currentIndex += part.length + 1;
        }
      } // 0xFF / 0b1010 の先頭0を境界として分割（例: 0xFF -> xFF, 0b1010 -> b1010）
      else if (/^0[xX][0-9a-fA-F]+$/.test(text)) {
        // 'x' 以降を単語として扱う
        const sub = text.slice(1); // drop leading '0'
        splitMatches.push({ text: sub, index: baseIndex + 1 });
      } else if (/^0[bB][01]+$/.test(text)) {
        const sub = text.slice(1);
        splitMatches.push({ text: sub, index: baseIndex + 1 });
      } // Japanese word boundary splitting (only if Japanese is enabled)
      // 日本語単語境界分割: 文字種別ごとに分割し、自然な単語境界を形成
      // - 漢字: \u4E00-\u9FAF\u3400-\u4DBF
      // - ひらがな: \u3040-\u309F
      // - カタカナ: \u30A0-\u30FF
      // - 英数字: a-zA-Z0-9
      else if (
        this.config.use_japanese && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text) &&
        text.length > 4
      ) {
        // 日本語文字種別別の分割パターン
        const japaneseWordRegex =
          /[\u4E00-\u9FAF\u3400-\u4DBF]+|[\u3040-\u309F]+|[\u30A0-\u30FF]+|[a-zA-Z0-9]+/g;
        let jpMatch;
        japaneseWordRegex.lastIndex = 0;

        while ((jpMatch = japaneseWordRegex.exec(text)) !== null) {
          if (jpMatch[0].length >= 1) {
            splitMatches.push({
              text: jpMatch[0],
              index: baseIndex + jpMatch.index,
            });
          }
        }
      } // Regular words
      else {
        splitMatches.push(originalMatch);
      }

      if (enableSingleCharExpansion && text.length > 1) {
        for (let charIndex = 0; charIndex < text.length; charIndex++) {
          const char = text[charIndex];
          if (/^[a-zA-Z0-9]$/.test(char)) {
            splitMatches.push({ text: char, index: baseIndex + charIndex });
          }
        }
      }
    }

    // 3. Additional single character detection
    if (!this.config.exclude_single_chars) {
      // Single digit detection
      const numberRegex = /\b\d\b/g;
      let numberMatch: RegExpExecArray | null;
      while ((numberMatch = numberRegex.exec(lineText)) !== null) {
        const isAlreadyMatched = splitMatches.some((existing) =>
          existing.index <= numberMatch!.index &&
          existing.index + existing.text.length >= numberMatch!.index + numberMatch![0].length
        );

        if (!isAlreadyMatched) {
          splitMatches.push({ text: numberMatch[0], index: numberMatch.index });
        }
      }

      // Single character words
      const singleCharRegex = /\b[a-zA-Z]\b/g;
      let charMatch: RegExpExecArray | null;
      while ((charMatch = singleCharRegex.exec(lineText)) !== null) {
        const isAlreadyMatched = splitMatches.some((existing) =>
          existing.index <= charMatch!.index &&
          existing.index + existing.text.length >= charMatch!.index + charMatch![0].length
        );

        if (!isAlreadyMatched) {
          splitMatches.push({ text: charMatch[0], index: charMatch.index });
        }
      }
    }

    // 4. Sort, deduplicate, and convert to Word objects
    const uniqueMatches = splitMatches
      .sort((a, b) => a.index - b.index)
      .filter((match, index, array) => {
        if (index === 0) return true;
        const prev = array[index - 1];
        return !(prev.index === match.index && prev.text === match.text);
      });

    // 5. Performance protection
    const finalMatches = uniqueMatches.slice(0, 100);

    for (const match of finalMatches) {
      // Calculate byte position for UTF-8 compatibility
      const byteIndex = charIndexToByteIndex(lineText, match.index);

      words.push({
        text: match.text,
        line: lineNumber,
        col: convertToDisplayColumn(lineText, match.index, 8), // Display width based column position
        byteCol: byteIndex + 1, // Vim byte column numbers start at 1
      });
    }

    return words;
  }

  /**
   * Standard word extraction (compatible with original)
   */
  private extractWordsStandard(lineText: string, lineNumber: number): Word[] {
    const words: Word[] = [];

    if (!lineText || lineText.trim().length < 2) {
      return words;
    }

    const wordRegex = this.config.use_japanese
      ? /[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]+/g
      : /\b[a-zA-Z0-9]+\b/g;

    let match;
    const matches: { text: string; index: number }[] = [];

    while ((match = wordRegex.exec(lineText)) !== null) {
      if (match[0].length >= 2 && (!this.config.exclude_numbers || !/^\d+$/.test(match[0]))) {
        matches.push({ text: match[0], index: match.index });
      }

      if (matches.length >= 100) break; // Performance protection
    }

    for (const match of matches) {
      // Calculate byte position for UTF-8 compatibility
      const byteIndex = charIndexToByteIndex(lineText, match.index);

      words.push({
        text: match.text,
        line: lineNumber,
        col: convertToDisplayColumn(lineText, match.index, 8), // Display width based column position
        byteCol: byteIndex + 1, // Vim byte column numbers start at 1
      });
    }

    return words;
  }

  private applyFilters(words: Word[], context?: DetectionContext): Word[] {
    let filtered = words;

    // Length filters - unified min_length processing
    const effectiveMinLength = this.getEffectiveMinLength(context, context?.currentKey);
    filtered = filtered.filter((w) => w.text.length >= effectiveMinLength);

    if (this.config.max_word_length !== undefined) {
      filtered = filtered.filter((w) => w.text.length <= this.config.max_word_length!);
    }

    // Japanese filter
    // use_japanese = false の場合、日本語文字を含む単語を除外
    // 対象文字範囲: ひらがな(\u3040-\u309F)、カタカナ(\u30A0-\u30FF)、漢字(\u4E00-\u9FAF)
    if (!this.config.use_japanese) {
      filtered = filtered.filter((w) => !/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(w.text));
    }

    // Number filter
    if (this.config.exclude_numbers) {
      filtered = filtered.filter((w) => !/^\d+$/.test(w.text));
    }

    return filtered;
  }

  private mergeWithDefaults(config: WordDetectionConfig): WordDetectionConfig {
    // デフォルト値（configで上書き可能）
    const defaults = {
      min_word_length: 1,
      max_word_length: 50,
      exclude_numbers: false,
      exclude_single_chars: false,
    };

    // 渡されたconfigの値を優先（use_japaneseは渡された値をそのまま使用）
    return {
      ...defaults,
      ...config,
    };
  }
}

/**
 * TinySegmenter-based Word Detector for Japanese
 *
 * @description 日本語形態素解析による高精度な単語検出器
 * TinySegmenterライブラリを使用してMeCabと同等の精度で日本語テキストを
 * 形態素（単語の最小単位）に分解し、適切な単語境界を検出します。
 *
 * ## 特徴
 * - **日本語専用**: ひらがな、カタカナ、漢字を含む日本語テキストに特化
 * - **高精度分割**: 文脈を考慮した形態素解析により、従来の正規表現では
 *   困難な複合語や活用語の適切な分割を実現
 * - **パフォーマンス最適化**: キャッシュ機能により同一テキストの再処理を高速化
 * - **フォールバック機能**: 分析失敗時はRegexWordDetectorに自動切り替え
 *
 * ## 使用例
 * ```typescript
 * const detector = new TinySegmenterWordDetector({
 *   segmenter_threshold: 4,           // 4文字以上で形態素解析実行
 *   japanese_merge_particles: true,   // 助詞を前の単語と結合
 *   japanese_min_word_length: 2       // 最小単語長2文字
 * });
 *
 * // 日本語テキストの単語検出
 * const words = await detector.detectWords("これは日本語のテストです。", 1);
 * // 結果: ["これ", "は", "日本語", "の", "テスト", "です"]
 * ```
 *
 * ## パフォーマンス特性
 * - **初回処理**: ~10-50ms (テキスト長による)
 * - **キャッシュヒット**: ~1-5ms
 * - **メモリ使用量**: 設定可能なキャッシュサイズに依存
 * - **最適化閾値**: 4文字未満は正規表現フォールバックで高速処理
 *
 * @since 1.0.0
 * @author hellshake-yano.vim team
 */
import { CharType, getCharType, analyzeString, findBoundaries, shouldMerge } from "../utils/charType.ts";

export class TinySegmenterWordDetector implements WordDetector {
  readonly name = "TinySegmenterWordDetector";
  readonly priority = 2;
  readonly supportedLanguages = ["ja"];

  private segmenter: TinySegmenter;
  private config: WordDetectionConfig;
  private globalConfig?: Config; // 統一的なmin_length処理のためのグローバル設定
  private dictionary: WordDictionaryImpl; // 辞書ベースの補正システム
  private dictionaryLoader: DictionaryLoader; // ユーザー定義辞書ローダー
  private dictionaryMerger: DictionaryMerger; // 辞書マージャー
  private vimBridge: VimConfigBridge; // Vim設定ブリッジ
  private mergedDictionary?: WordDictionaryImpl; // マージ済み辞書（キャッシュ）

  /**
   * TinySegmenterWordDetectorのコンストラクタ
   *
   * @description TinySegmenterベースの日本語単語ディテクターを初期化
   * TinySegmenterインスタンスを取得し、日本語形態素解析の準備を行います。
   *
   * @param config - ディテクター設定オブジェクト（省略時はデフォルト設定を使用）
   * @param config.segmenter_threshold - 形態素解析を実行する最小文字数 (default: 4)
   * @param config.japanese_merge_particles - 助詞を前の単語と結合するか (default: true)
   * @param config.japanese_min_word_length - 最小単語長 (default: 2)
   * @param config.enable_tinysegmenter - TinySegmenter機能の有効化 (default: true)
   *
   * @example
   * ```typescript
   * // デフォルト設定での初期化
   * const detector = new TinySegmenterWordDetector();
   *
   * // カスタム設定での初期化
   * const customDetector = new TinySegmenterWordDetector({
   *   segmenter_threshold: 6,           // 6文字以上で形態素解析
   *   japanese_merge_particles: false,  // 助詞を個別の単語として扱う
   *   japanese_min_word_length: 1       // 1文字の単語も許可
   * });
   * ```
   *
   * @since 1.0.0
   */
  constructor(config: WordDetectionConfig = {}, globalConfig?: Config) {
    this.config = this.mergeWithDefaults(config);
    this.globalConfig = globalConfig;
    this.segmenter = TinySegmenter.getInstance();
    this.dictionary = createBuiltinDictionary(); // ビルトイン辞書で初期化

    // ユーザー定義辞書システムを初期化
    this.dictionaryLoader = new DictionaryLoader();
    this.dictionaryMerger = new DictionaryMerger();
    this.vimBridge = new VimConfigBridge();
  }

  /**
   * 統一的なmin_length取得
   * @description Context → GlobalConfig → LocalConfig の優先順位でmin_lengthを取得
   * @param context - 検出コンテキスト
   * @param key - モーションキー（グローバル設定のper_key_min_lengthで使用）
   * @returns 使用すべき最小単語長
   */
  private getEffectiveMinLength(context?: DetectionContext, key?: string): number {
    // 1. Context優先
    if (context?.minWordLength !== undefined) {
      return context.minWordLength;
    }

    // 2. グローバル設定のper_key_min_length
    if (this.globalConfig && key) {
      return getMinLengthForKey(this.globalConfig, key);
    }

    // 3. ローカル設定のmin_word_length
    return this.config.min_word_length || 1;
  }

  async detectWords(text: string, startLine: number, context?: DetectionContext, denops?: Denops): Promise<Word[]> {
    const words: Word[] = [];
    const lines = text.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      const lineNumber = startLine + i;

      if (!this.shouldSegmentLine(lineText)) {
        // Fall back to basic regex for non-Japanese content
        const fallbackWords = await this.fallbackDetection(lineText, lineNumber, context);
        words.push(...fallbackWords);
        continue;
      }

      try {
        const result = await this.segmenter.segment(lineText);
        if (result.success) {
          const lineWords = this.segmentsToWords(result.segments, lineText, lineNumber, context);
          words.push(...lineWords);
        } else {
          // Fallback on segmentation failure
          const fallbackWords = await this.fallbackDetection(lineText, lineNumber, context);
          words.push(...fallbackWords);
        }
      } catch (error) {
        // console.warn(`TinySegmenter failed for line ${lineNumber}:`, error);
        const fallbackWords = await this.fallbackDetection(lineText, lineNumber, context);
        words.push(...fallbackWords);
      }
    }

    return this.applyFilters(words, context);
  }

  /**
   * 指定されたテキストが当ディテクターで処理可能かどうかを判定
   *
   * @description テキストに日本語文字（ひらがな、カタカナ、漢字）が
   * 含まれているかチェックし、TinySegmenterによる処理が適切かを判定します。
   *
   * ## 判定対象の文字範囲
   * - ひらがな: U+3040-U+309F
   * - カタカナ: U+30A0-U+30FF
   * - CJK統合漢字: U+4E00-U+9FAF
   * - CJK拡張A: U+3400-U+4DBF
   *
   * @param text - 判定対象のテキスト
   * @returns 日本語を含む場合true、含まない場合false
   *
   * @example
   * ```typescript
   * const detector = new TinySegmenterWordDetector();
   *
   * detector.canHandle("Hello World");        // false
   * detector.canHandle("こんにちは");           // true
   * detector.canHandle("Hello こんにちは");     // true
   * detector.canHandle("123ABC");             // false
   * ```
   */
  canHandle(text: string): boolean {
    return this.segmenter.hasJapanese(text);
  }

  async isAvailable(): Promise<boolean> {
    if (!this.config.enable_tinysegmenter) return false;

    try {
      const testResult = await this.segmenter.segment("テスト");
      return testResult.success;
    } catch {
      return false;
    }
  }

  /**
   * 行テキストを形態素解析すべきかどうかを判定
   *
   * @description テキスト長と日本語文字の有無を考慮して、
   * TinySegmenterによる処理が効果的かつ効率的かを判定します。
   * 短いテキストは正規表現フォールバックの方が高速なため、
   * 閾値以下の場合は形態素解析をスキップします。
   *
   * @param lineText - 判定対象の行テキスト
   * @returns 形態素解析を実行すべき場合true
   *
   * @example
   * ```typescript
   * // threshold = 4 の場合
   * detector.shouldSegmentLine("短い");           // false (2文字)
   * detector.shouldSegmentLine("これは長い文章");   // true (6文字)
   * detector.shouldSegmentLine("ABC");           // false (日本語なし)
   * ```
   *
   * @private
   */
  private shouldSegmentLine(lineText: string): boolean {
    const threshold = this.config.segmenter_threshold || 4;
    return this.segmenter.shouldSegment(lineText, threshold);
  }

  private segmentsToWords(segments: string[], originalText: string, lineNumber: number, context?: DetectionContext): Word[] {
    // 辞書ベースの補正を適用
    const correctedSegments = this.applyDictionaryCorrection(segments);

    // まず位置情報付きセグメントを作成
    const positionSegments = this.createPositionSegments(correctedSegments, originalText);

    // 日本語分割精度設定を適用（位置情報を保持）
    const mergedSegments = this.mergeShortSegmentsWithPosition(positionSegments);
    const words: Word[] = [];

    // Use context-aware min length instead of config min length
    const effectiveMinLength = this.getEffectiveMinLength(context, context?.currentKey);

    for (const segment of mergedSegments) {
      if (segment.text.trim().length > 0) {
        // 単語の長さフィルタリング - use context-aware length
        if (
          segment.text.length >= effectiveMinLength &&
          segment.text.length <= (this.config.max_word_length || 50)
        ) {
          // 数字除外オプション
          if (this.config.exclude_numbers && /^\d+$/.test(segment.text)) {
            continue;
          }

          // 単一文字除外オプション
          if (this.config.exclude_single_chars && segment.text.length === 1) {
            continue;
          }

          // Calculate byte position for UTF-8 compatibility
          const byteIndex = charIndexToByteIndex(originalText, segment.startIndex);

          words.push({
            text: segment.text,
            line: lineNumber,
            col: segment.startIndex + 1, // Vim column numbers start at 1
            byteCol: byteIndex + 1, // Vim byte column numbers start at 1
          });
        }
      }
    }

    return words;
  }

  /**
   * 辞書ベースの補正をセグメントに適用
   *
   * @description TinySegmenterの分割結果に対して辞書ベースの補正を適用します。
   * プログラミング用語などの複合語を適切に結合し、過度な分割を防ぎます。
   *
   * @param segments - TinySegmenterによる分割結果
   * @returns 辞書補正が適用されたセグメント配列
   *
   * @example
   * ```typescript
   * // "関数", "定義" → "関数定義"
   * const segments = ["関数", "定義"];
   * const corrected = this.applyDictionaryCorrection(segments);
   * // Result: ["関数定義"]
   * ```
   *
   * @private
   */
  /**
   * ユーザー定義辞書を読み込んでマージ
   */
  async initializeUserDictionary(denops?: Denops): Promise<void> {
    try {
      if (denops) {
        const config = await this.vimBridge.getConfig(denops);
        const userDict = await this.dictionaryLoader.loadUserDictionary(config);
        this.mergedDictionary = this.dictionaryMerger.merge(this.dictionary, userDict);
      }
    } catch (error) {
      console.warn('Failed to initialize user dictionary:', error);
      this.mergedDictionary = this.dictionary; // フォールバック
    }
  }

  private applyDictionaryCorrection(segments: string[]): string[] {
    // マージ済み辞書があればそれを使用、なければビルトイン辞書を使用
    const dictionary = this.mergedDictionary || this.dictionary;
    return applyDictionaryCorrection(segments, dictionary);
  }

  private async fallbackDetection(
    lineText: string,
    lineNumber: number,
    context?: DetectionContext,
  ): Promise<Word[]> {
    // Use simplified regex detection as fallback
    const regexDetector = new RegexWordDetector(this.config);
    const singleLineText = lineText + "\n";
    return regexDetector.detectWords(singleLineText, lineNumber, context);
  }

  /**
   * 位置情報付きセグメントを作成
   */
  private createPositionSegments(segments: string[], originalText: string): PositionSegment[] {
    const positionSegments: PositionSegment[] = [];
    let currentIndex = 0;

    for (const segment of segments) {
      const segmentIndex = originalText.indexOf(segment, currentIndex);

      if (segmentIndex !== -1) {
        positionSegments.push({
          text: segment,
          startIndex: segmentIndex,
          endIndex: segmentIndex + segment.length,
          originalIndex: segmentIndex,
        });
        currentIndex = segmentIndex + segment.length;
      }
    }

    return positionSegments;
  }

  /**
   * 短いセグメントを結合して分割精度を調整（位置情報保持版）
   */
  private mergeShortSegmentsWithPosition(segments: PositionSegment[]): PositionSegment[] {
    const mergeParticles = this.config.japanese_merge_particles !== false;
    const mergeThreshold = this.config.japanese_merge_threshold || 2;
    const minLength = this.config.japanese_min_word_length || 2;

    if (!mergeParticles && minLength <= 1) {
      return segments; // 結合処理不要
    }

    const result: PositionSegment[] = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const prevSegment = segments[i - 1];
      const nextSegment = segments[i + 1];

      // 隣接文字解析による結合判定
      if (prevSegment && shouldMerge(prevSegment.text, segment.text, nextSegment?.text)) {
        if (result.length > 0) {
          // 前の結果と結合
          const lastResult = result[result.length - 1];
          result[result.length - 1] = {
            text: lastResult.text + segment.text,
            startIndex: lastResult.startIndex,
            endIndex: segment.endIndex,
            originalIndex: lastResult.originalIndex,
          };
          continue;
        }
      }

      // 文字種境界を考慮した処理
      const segmentBoundaries = findBoundaries(segment.text);
      if (segmentBoundaries.length > 2) { // 境界が開始と終了以外にもある場合
        // 複数の文字種を含むセグメントを分割
        for (let j = 0; j < segmentBoundaries.length - 1; j++) {
          const start = segmentBoundaries[j];
          const end = segmentBoundaries[j + 1];
          const subText = segment.text.slice(start, end);
          
          if (subText.trim().length > 0) {
            const subSegment: PositionSegment = {
              text: subText,
              startIndex: segment.startIndex + start,
              endIndex: segment.startIndex + end,
              originalIndex: segment.originalIndex,
            };
            
            // 分割されたサブセグメントに対して処理を適用
            this.processSegment(subSegment, null, result, mergeParticles, mergeThreshold, minLength);
          }
        }
      } else {
        // 単一文字種セグメントの処理
        this.processSegment(segment, null, result, mergeParticles, mergeThreshold, minLength);
      }
    }

    return result;
  }

  /**
   * 個別セグメントの処理ロジック（共通化）
   */
  private processSegment(
    segment: PositionSegment,
    buffer: PositionSegment | null,
    result: PositionSegment[],
    mergeParticles: boolean,
    mergeThreshold: number,
    minLength: number
  ): void {
    // 拡張助詞・接続詞パターン
    const extendedParticlePattern = /^(の|が|を|に|で|と|は|も|から|まで|より|へ|や|ね|よ|など|こそ|さえ|だけ|ばかり|しか|でも|なら|って|とか)+$/;
    const extendedConjunctionPattern = /^(そして|また|しかし|だから|それで|ところで|つまり|要するに|ただし|もちろん|確かに|実際|結局|例えば)+$/;

    // 括弧・引用符内保持判定
    if (this.isQuotedOrBracketed(segment.text)) {
      result.push(segment);
      return;
    }

    // CamelCase分割処理
    const camelCaseSegments = this.splitCamelCase(segment);
    if (camelCaseSegments.length > 1) {
      for (const camelSegment of camelCaseSegments) {
        this.processBasicSegment(camelSegment, buffer, result, mergeParticles, mergeThreshold, minLength);
      }
      return;
    }

    // 基本的なセグメント処理
    this.processBasicSegment(segment, buffer, result, mergeParticles, mergeThreshold, minLength);
  }

  /**
   * 括弧・引用符内判定
   */
  private isQuotedOrBracketed(text: string): boolean {
    const patterns = [
      /^".*"$/,       // 二重引用符
      /^'.*'$/,       // 単一引用符
      /^`.*`$/,       // バッククォート
      /^\(.*\)$/,     // 丸括弧
      /^\[.*\]$/,     // 角括弧
      /^\{.*\}$/,     // 波括弧
      /^「.*」$/,     // 日本語括弧
      /^『.*』$/,     // 日本語二重括弧
      /^\(\(.*\)\)$/, // ネストした括弧
    ];
    
    return patterns.some(pattern => pattern.test(text));
  }

  /**
   * CamelCase分割
   */
  private splitCamelCase(segment: PositionSegment): PositionSegment[] {
    const text = segment.text;
    
    // CamelCaseパターンの判定
    if (!/[a-zA-Z]/.test(text) || !/[A-Z]/.test(text)) {
      return [segment]; // CamelCaseではない
    }

    const boundaries = findBoundaries(text);
    if (boundaries.length <= 2) {
      return [segment]; // 分割不要
    }

    const subSegments: PositionSegment[] = [];
    for (let i = 0; i < boundaries.length - 1; i++) {
      const start = boundaries[i];
      const end = boundaries[i + 1];
      const subText = text.slice(start, end);
      
      if (subText.length > 0) {
        subSegments.push({
          text: subText,
          startIndex: segment.startIndex + start,
          endIndex: segment.startIndex + end,
          originalIndex: segment.originalIndex,
        });
      }
    }

    return subSegments;
  }

  /**
   * 基本的なセグメント処理ロジック
   */
  private processBasicSegment(
    segment: PositionSegment,
    buffer: PositionSegment | null,
    result: PositionSegment[],
    mergeParticles: boolean,
    mergeThreshold: number,
    minLength: number
  ): void {
    // 拡張助詞・接続詞パターン
    const extendedParticlePattern = /^(の|が|を|に|で|と|は|も|から|まで|より|へ|や|ね|よ|など|こそ|さえ|だけ|ばかり|しか|でも|なら|って|とか)+$/;
    const extendedConjunctionPattern = /^(そして|また|しかし|だから|それで|ところで|つまり|要するに|ただし|もちろん|確かに|実際|結局|例えば)+$/;

    // 短いセグメントの処理
    if (segment.text.length <= mergeThreshold) {
      // 拡張助詞・接続詞の場合は前の単語と結合
      if (
        mergeParticles &&
        (extendedParticlePattern.test(segment.text) || extendedConjunctionPattern.test(segment.text))
      ) {
        if (result.length > 0) {
          // 前の結果と結合
          const lastResult = result[result.length - 1];
          result[result.length - 1] = {
            text: lastResult.text + segment.text,
            startIndex: lastResult.startIndex,
            endIndex: segment.endIndex,
            originalIndex: lastResult.originalIndex,
          };
        } else {
          result.push(segment);
        }
      } else if (segment.text.length >= minLength) {
        result.push(segment);
      } else if (result.length > 0) {
        // 最小長に満たない場合は前の結果と結合
        const lastResult = result[result.length - 1];
        result[result.length - 1] = {
          text: lastResult.text + segment.text,
          startIndex: lastResult.startIndex,
          endIndex: segment.endIndex,
          originalIndex: lastResult.originalIndex,
        };
      } else {
        // 単独で追加
        result.push(segment);
      }
    } else {
      // 長いセグメント
      result.push(segment);
    }
  }

  /**
   * 短いセグメントを結合して分割精度を調整（レガシー版）
   */
  private mergeShortSegments(segments: string[]): string[] {
    const mergeParticles = this.config.japanese_merge_particles !== false;
    const mergeThreshold = this.config.japanese_merge_threshold || 2;
    const minLength = this.config.japanese_min_word_length || 2;

    if (!mergeParticles && minLength <= 1) {
      return segments; // 結合処理不要
    }

    const result: string[] = [];
    let buffer = "";

    // 日本語の助詞・接続詞パターン（レガシー版）
    // 助詞: を、で、に、へ、と、から、より、の、が、は、も、や、ね、よ、など
    const particlePattern = /^[をでにへとからよりのがはもやねよなど]+$/;
    // 接続詞: そして、しかし、だから、けれど、けど、もの、で、なら、ない、し
    const conjunctionPattern = /^[そしてしかしだからけれどけどものでならないし]+$/;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const nextSegment = segments[i + 1];

      // 短いセグメントをバッファに追加
      if (segment.length <= mergeThreshold) {
        // 助詞・接続詞の場合は前の単語と結合
        if (mergeParticles && (particlePattern.test(segment) || conjunctionPattern.test(segment))) {
          if (buffer) {
            buffer += segment;
          } else if (result.length > 0) {
            // 前の結果と結合
            result[result.length - 1] += segment;
          } else {
            buffer = segment;
          }
        } else if (nextSegment && nextSegment.length <= mergeThreshold) {
          // 次も短い場合はバッファに追加
          buffer += segment;
        } else {
          // 単独で最小長を満たすか、バッファと結合
          if (buffer) {
            buffer += segment;
            if (buffer.length >= minLength) {
              result.push(buffer);
            }
            buffer = "";
          } else if (segment.length >= minLength) {
            result.push(segment);
          } else if (result.length > 0) {
            // 最小長に満たない場合は前の結果と結合
            result[result.length - 1] += segment;
          } else {
            buffer = segment;
          }
        }
      } else {
        // 長いセグメント
        if (buffer) {
          if (buffer.length >= minLength) {
            result.push(buffer);
          } else if (result.length > 0) {
            result[result.length - 1] += buffer;
          }
          buffer = "";
        }
        result.push(segment);
      }
    }

    // 残ったバッファを処理
    if (buffer) {
      if (buffer.length >= minLength) {
        result.push(buffer);
      } else if (result.length > 0) {
        result[result.length - 1] += buffer;
      }
    }

    return result;
  }

  private applyFilters(words: Word[], context?: DetectionContext): Word[] {
    let filtered = words;

    // Length filters - unified min_length processing
    const effectiveMinLength = this.getEffectiveMinLength(context, context?.currentKey);
    filtered = filtered.filter((w) => w.text.length >= effectiveMinLength);

    if (this.config.max_word_length !== undefined) {
      filtered = filtered.filter((w) => w.text.length <= this.config.max_word_length!);
    }

    return filtered;
  }

  private mergeWithDefaults(config: WordDetectionConfig): WordDetectionConfig {
    return {
      enable_tinysegmenter: true,
      segmenter_threshold: 4,
      segmenter_cache_size: 1000,
      enable_fallback: true,
      fallback_to_regex: true,
      min_word_length: 1,
      max_word_length: 50,
      ...config,
    };
  }
}

/**
 * Hybrid Word Detector that combines multiple strategies
 *
 * @description ハイブリッドアプローチによる最適化された単語検出器
 * TinySegmenterとRegexWordDetectorを組み合わせ、テキストの特性に応じて
 * 最適な検出手法を自動選択し、日本語と英語の混在テキストでも
 * 高精度な単語境界検出を実現します。
 *
 * ## ハイブリッドアプローチの利点
 * - **知的切り替え**: テキストの言語特性を判定し、最適な検出器を自動選択
 * - **高精度結合**: 日本語部分はTinySegmenter、英数字部分はRegexで処理
 * - **フォールバック保証**: 一方の検出器が失敗しても、もう一方で継続処理
 * - **パフォーマンス最適化**: 不要な処理を回避し、全体的な処理速度を向上
 *
 * ## 切り替え条件の詳細
 * 1. **use_japanese = true**:
 *    - 日本語あり && TinySegmenter有効 → TinySegmenter + Regexの結合
 *    - 日本語なし || TinySegmenter無効 → 既存のextractWordsFromLineWithConfig
 * 2. **use_japanese = false**:
 *    - 常にRegexWordDetectorを使用し、日本語を自動除外
 *
 * @example
 * ```typescript
 * // 日本語有効でのハイブリッド検出
 * const hybridDetector = new HybridWordDetector({
 *   use_japanese: true,
 *   enable_tinysegmenter: true
 * });
 *
 * // 混在テキストの処理
 * const words = await hybridDetector.detectWords(
 *   "Hello こんにちは world 世界",
 *   1
 * );
 * // 結果: ["Hello", "こんにちは", "world", "世界"]
 * ```
 *
 * @since 1.0.0
 * @author hellshake-yano.vim team
 */
export class HybridWordDetector implements WordDetector {
  readonly name = "HybridWordDetector";
  readonly priority = 3;
  readonly supportedLanguages = ["ja", "en", "any"];

  private regexDetector: RegexWordDetector;
  private segmenterDetector: TinySegmenterWordDetector;
  private config: WordDetectionConfig;
  private globalConfig?: Config; // 統一的なmin_length処理のためのグローバル設定
  private contextDetector: ContextDetector; // コンテキスト認識による分割調整

  /**
   * HybridWordDetectorのコンストラクタ
   *
   * @description ハイブリッドアプローチによる単語検出器を初期化
   * RegexWordDetectorとTinySegmenterWordDetectorの両方を内部に保持し、
   * 同一の設定を共有して一貫性のある動作を実現します。
   *
   * @param config - ディテクター設定オブジェクト（省略時はデフォルト設定を使用）
   * @param config.use_japanese - 日本語処理の有効化 (重要: 切り替え動作を制御)
   * @param config.enable_tinysegmenter - TinySegmenter機能の有効化 (default: true)
   * @param config.enable_fallback - フォールバック機能の有効化 (default: true)
   *
   * @example
   * ```typescript
   * // 日本語有効のハイブリッド検出器
   * const detector = new HybridWordDetector({
   *   use_japanese: true,
   *   enable_tinysegmenter: true,
   *   segmenter_threshold: 4
   * });
   *
   * // 英語オンリーの検出器
   * const englishDetector = new HybridWordDetector({
   *   use_japanese: false,
   *   exclude_single_chars: true
   * });
   * ```
   *
   * @since 1.0.0
   */
  constructor(config: WordDetectionConfig = {}, globalConfig?: Config) {
    this.config = this.mergeWithDefaults(config);
    this.globalConfig = globalConfig;
    // 子Detectorにも同じマージされた設定とグローバル設定を渡す
    this.regexDetector = new RegexWordDetector(this.config, globalConfig);
    this.segmenterDetector = new TinySegmenterWordDetector(this.config, globalConfig);
    this.contextDetector = new ContextDetector(); // コンテキスト検出器を初期化
  }

  /**
   * 統一的なmin_length取得
   * @description Context → GlobalConfig → LocalConfig の優先順位でmin_lengthを取得
   * @param context - 検出コンテキスト
   * @param key - モーションキー（グローバル設定のper_key_min_lengthで使用）
   * @returns 使用すべき最小単語長
   */
  private getEffectiveMinLength(context?: DetectionContext, key?: string): number {
    // 1. Context優先
    if (context?.minWordLength !== undefined) {
      return context.minWordLength;
    }

    // 2. グローバル設定のper_key_min_length
    if (this.globalConfig && key) {
      return getMinLengthForKey(this.globalConfig, key);
    }

    // 3. ローカル設定のmin_word_length
    return this.config.min_word_length || 1;
  }

  async detectWords(text: string, startLine: number, context?: DetectionContext, denops?: Denops): Promise<Word[]> {
    const lines = text.split("\n");
    const allWords: Word[] = [];

    // コンテキスト認識による分割調整を適用
    const enhancedContext = await this.enhanceContext(context, denops);

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      const lineNumber = startLine + i;

      if (!lineText || lineText.trim().length === 0) {
        continue;
      }

      // 行ごとのコンテキストを更新
      const lineContext = enhancedContext.fileType
        ? this.contextDetector.detectLineContext(lineText, enhancedContext.fileType)
        : undefined;

      const lineEnhancedContext = {
        ...enhancedContext,
        lineContext,
        syntaxContext: enhancedContext.fileType
          ? this.contextDetector.detectSyntaxContext(lineText, lineNumber, enhancedContext.fileType)
          : enhancedContext.syntaxContext
      };

      // コンテキストに基づく分割ルールを適用
      const splittingRules = this.contextDetector.getSplittingRules(lineEnhancedContext);
      const contextWithRules = this.applyContextRules(lineEnhancedContext, splittingRules);

      // use_japanese 設定に基づいて処理を決定
      if (this.config.use_japanese === true) {
        // 日本語モード：TinySegmenterが利用可能で日本語を含む場合は使用
        const isSegmenterAvailable = await this.segmenterDetector.isAvailable();
        const hasJapanese = this.segmenterDetector.canHandle(lineText);

        if (this.config.enable_tinysegmenter && isSegmenterAvailable && hasJapanese) {
          const segmenterWords = await this.segmenterDetector.detectWords(
            lineText,
            lineNumber,
            contextWithRules,
          );
          // 英数字も検出するためRegexDetectorも併用
          const regexWords = await this.regexDetector.detectWords(lineText, lineNumber, contextWithRules);
          let mergedWords = this.mergeWordResults(segmenterWords, regexWords);

          // Apply context-based filtering if context is provided
          if (contextWithRules?.minWordLength !== undefined) {
            mergedWords = mergedWords.filter((w) => w.text.length >= contextWithRules.minWordLength!);
          }

          allWords.push(...mergedWords);
        } else {
          // TinySegmenter無効または日本語なし：統合関数を使用
          const { extractWordsUnified } = await import("../word.ts");
          let words = extractWordsUnified(lineText, lineNumber, this.config);

          // Apply context-based filtering if context is provided (since extractWordsUnified doesn't handle context)
          if (contextWithRules?.minWordLength !== undefined) {
            words = words.filter((w) => w.text.length >= contextWithRules.minWordLength!);
          }

          allWords.push(...words);
        }
      } else {
        // 日本語除外モード：RegexDetectorを使用（日本語は除外される）
        let regexWords = await this.regexDetector.detectWords(lineText, lineNumber, contextWithRules);

        // Apply context-based filtering if context is provided
        if (contextWithRules?.minWordLength !== undefined) {
          regexWords = regexWords.filter((w) => w.text.length >= contextWithRules.minWordLength!);
        }

        allWords.push(...regexWords);
      }
    }

    const finalWords = this.deduplicateWords(allWords);
    return finalWords;
  }

  /**
   * 指定されたテキストが当ディテクターで処理可能かどうかを判定
   *
   * @description ハイブリッドディテクターはRegexとTinySegmenterの両方を
   * 保持しているため、どのようなテキストでも処理可能です。
   * 日本語、英語、数字、特殊文字、及びこれらの混在テキストを
   * すべてサポートします。
   *
   * @param text - 判定対象のテキスト
   * @returns 常にtrue（ハイブリッドディテクターはあらゆるテキストを処理可能）
   *
   * @example
   * ```typescript
   * const detector = new HybridWordDetector();
   *
   * detector.canHandle("こんにちは");              // true
   * detector.canHandle("Hello World");           // true
   * detector.canHandle("Hello こんにちは world");  // true
   * detector.canHandle("123!@#$%");             // true
   * detector.canHandle("");                     // true (空文字列も処理可能)
   * ```
   */
  canHandle(text: string): boolean {
    return true; // Hybrid can handle any text
  }

  async isAvailable(): Promise<boolean> {
    const regexAvailable = await this.regexDetector.isAvailable();
    const segmenterAvailable = await this.segmenterDetector.isAvailable();
    return regexAvailable; // At minimum, regex should be available
  }

  private mergeWordResults(segmenterWords: Word[], regexWords: Word[]): Word[] {
    const merged = [...segmenterWords];
    const segmenterPositions = new Set(
      segmenterWords.map((w) => `${w.line}:${w.col}:${w.text}`),
    );

    // Add regex words that don't overlap with segmenter results
    for (const regexWord of regexWords) {
      const position = `${regexWord.line}:${regexWord.col}:${regexWord.text}`;
      if (!segmenterPositions.has(position)) {
        // Check for overlap by position range
        const overlaps = segmenterWords.some((sw) =>
          sw.line === regexWord.line &&
          sw.col <= regexWord.col &&
          sw.col + sw.text.length >= regexWord.col + regexWord.text.length
        );

        if (!overlaps) {
          merged.push(regexWord);
        }
      }
    }

    return merged;
  }

  private deduplicateWords(words: Word[]): Word[] {
    const seen = new Set<string>();
    return words.filter((word) => {
      const key = `${word.text}:${word.line}:${word.col}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * コンテキストを拡張してファイルタイプ情報を追加
   */
  private async enhanceContext(context?: DetectionContext, denops?: Denops): Promise<DetectionContext> {
    const baseContext = context || {};

    // Denopsが利用可能な場合、ファイルタイプを取得
    if (denops && !baseContext.fileType) {
      try {
        const fileType = await this.contextDetector.detectFileType(denops);
        return {
          ...baseContext,
          fileType,
          metadata: {
            ...baseContext.metadata,
            contextEnhanced: true,
            enhancedAt: Date.now(),
          },
        };
      } catch (error) {
        // エラーが発生した場合は元のコンテキストを返すが、メタデータにエラー情報を記録
        return {
          ...baseContext,
          metadata: {
            ...baseContext.metadata,
            contextEnhancementError: error instanceof Error ? error.message : String(error),
            enhancedAt: Date.now(),
          },
        };
      }
    }

    return baseContext;
  }

  /**
   * コンテキストルールを適用して新しいコンテキストを生成
   */
  private applyContextRules(context: DetectionContext, splittingRules: SplittingRules): DetectionContext {
    return {
      ...context,
      // contextのminWordLengthを優先、なければsplittingRulesのものを使用
      minWordLength: context.minWordLength ?? splittingRules.minWordLength,
      metadata: {
        ...context.metadata,
        splittingRules,
      },
    };
  }

  private mergeWithDefaults(config: WordDetectionConfig): WordDetectionConfig {
    // デフォルト値を設定し、渡されたconfigで上書きする
    const defaults = {
      enable_tinysegmenter: true,
      enable_fallback: true,
      fallback_to_regex: true,
      min_word_length: 1,
      max_word_length: 50,
      exclude_numbers: false,
      exclude_single_chars: false,
    };

    // 渡されたconfigの値を優先（特にuse_japaneseは重要）
    return {
      ...defaults,
      ...config,
    };
  }
}

/**
 * Process5 sub2: キー別単語キャッシュ機構（最適化実装）
 *
 * キー別の単語検出結果をキャッシュし、同じキーでの再計算を回避する
 * パフォーマンス向上とUIちらつき軽減のための最適化機能
 */
export class KeyBasedWordCache {
  private cache: Map<string, Word[]> = new Map();
  private maxSize: number = 100; // キャッシュサイズ上限

  /**
   * キーに基づいて単語リストをキャッシュに保存
   * @param key - キャッシュキー（通常は押下されたキー + バッファ情報）
   * @param words - キャッシュする単語リスト
   */
  set(key: string, words: Word[]): void {
    // キャッシュサイズ制限のチェック
    if (this.cache.size >= this.maxSize) {
      // 最も古いエントリを削除（LRU的な動作）
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, [...words]); // 浅いコピーで保存
  }

  /**
   * キーに基づいてキャッシュから単語リストを取得
   * @param key - キャッシュキー
   * @returns キャッシュされた単語リスト、または undefined
   */
  get(key: string): Word[] | undefined {
    const cached = this.cache.get(key);
    if (cached) {
      // キャッシュヒット: 新しい配列として返す（参照汚染防止）
      return [...cached];
    }
    return undefined;
  }

  /**
   * 特定のキーのキャッシュをクリア
   * @param key - クリアするキャッシュキー
   */
  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * キャッシュ統計情報を取得
   * @returns キャッシュサイズとヒット可能なキー一覧
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// グローバルキャッシュインスタンス（Process5 sub2実装）
export const globalWordCache = new KeyBasedWordCache();
