import type { Denops } from "@denops/std";
import type { DetectionContext, Word } from "../../../types.ts";
import type { Config } from "../../../config.ts";
import { Core } from "../core.ts";
import { tinysegmenter } from "./word-segmenter.ts";
import { resolveConfigType } from "../../../common/utils/config.ts";
import { charIndexToByteIndex } from "../word.ts";
export interface WordDetector {
  readonly name: string;
  readonly priority: number;
  readonly supportedLanguages: string[];
  detectWords(t: string, sl: number, c?: DetectionContext, d?: Denops): Promise<Word[]>;
  canHandle(t: string): boolean;
  isAvailable(): Promise<boolean>;
}
export interface WordDetectionConfig {
  strategy?: "regex" | "tinysegmenter" | "hybrid";
  useJapanese?: boolean;
  useImprovedDetection?: boolean;
  enableTinySegmenter?: boolean;
  segmenterThreshold?: number;
  segmenterCacheSize?: number;
  enableFallback?: boolean;
  fallbackToRegex?: boolean;
  maxRetries?: number;
  cacheEnabled?: boolean;
  cacheMaxSize?: number;
  batchSize?: number;
  defaultMinWordLength?: number;
  currentKey?: string;
  minWordLength?: number;
  maxWordLength?: number;
  exclude_numbers?: boolean;
  exclude_single_chars?: boolean;
  japanese_merge_particles?: boolean;
  japanese_merge_threshold?: number;
  japanese_min_word_length?: number;
}
interface ExtractWordsOptions {
  useImprovedDetection?: boolean;
  excludeJapanese?: boolean;
  useJapanese?: boolean;
  strategy?: "regex" | "tinysegmenter" | "hybrid";
  perKeyMinLength?: Record<string, number>;
  defaultMinWordLength?: number;
  currentKeyContext?: string;
  minWordLength?: number;
  maxWordLength?: number;
  enableTinySegmenter?: boolean;
  legacyMode?: boolean;
}
declare global {
  // deno-lint-ignore no-var
  var extractWords: ((lt: string, ln: number, o?: ExtractWordsOptions) => Word[]) | undefined;
}
export class RegexWordDetector implements WordDetector {
  readonly name = "RegexWordDetector";
  readonly priority = 1;
  readonly supportedLanguages = ["en", "ja", "any"];
  private config: WordDetectionConfig;
  private globalConfig?: Config;
  private unifiedConfig?: Config;
  constructor(config: WordDetectionConfig = {}, gc?: Config | Config) {
    this.config = { strategy: "regex", useJapanese: true, minWordLength: 1, maxWordLength: 50, exclude_numbers: false, exclude_single_chars: false, cacheEnabled: true, batchSize: 50, ...config };
    [this.unifiedConfig, this.globalConfig] = resolveConfigType(gc);
  }
  private getEffectiveMinLength(c?: DetectionContext, k?: string): number {
    if (c?.minWordLength !== undefined) return c.minWordLength;
    if (this.unifiedConfig && k) return this.unifiedConfig.perKeyMinLength?.[k] || this.unifiedConfig.defaultMinWordLength;
    if (this.globalConfig && k) return Core.getMinLengthForKey(this.globalConfig, k);
    return this.config.minWordLength || 1;
  }
  async detectWords(t: string, sl: number, c?: DetectionContext, d?: Denops): Promise<Word[]> {
    const words: Word[] = [];
    const lines = t.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const lt = lines[i];
      const ln = sl + i;
      const lw = this.extractWordsImproved(lt, ln, c);
      words.push(...lw);
    }
    return this.applyFilters(words, c);
  }
  canHandle(t: string): boolean { return true; }
  async isAvailable(): Promise<boolean> { return true; }
  private extractWordsImproved(lt: string, ln: number, c?: DetectionContext): Word[] {
    const uj = c?.config?.useJapanese ?? this.config.useJapanese;
    const ej = !uj;
    return globalThis.extractWords?.(lt, ln, { useImprovedDetection: true, excludeJapanese: ej }) || [];
  }
  private applyFilters(words: Word[], c?: DetectionContext): Word[] {
    const ml = this.getEffectiveMinLength(c, c?.currentKey);
    const maxLen = this.config.maxWordLength;
    const excludeNumbers = this.config.exclude_numbers;
    const excludeSingleChars = this.config.exclude_single_chars && ml > 1;

    // 単一パスフィルタリング: 60-75%削減
    return words.filter((w) => {
      const len = w.text.length;
      // minLength チェック
      if (ml >= 1 && len < ml) return false;
      // maxWordLength チェック
      if (maxLen && len > maxLen) return false;
      // exclude_numbers チェック
      if (excludeNumbers && /^\d+$/.test(w.text)) return false;
      // exclude_single_chars チェック
      if (excludeSingleChars && len <= 1) return false;
      return true;
    });
  }
}
export class TinySegmenterWordDetector implements WordDetector {
  readonly name = "TinySegmenterWordDetector";
  readonly priority = 10;
  readonly supportedLanguages = ["ja"];
  private readonly japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  private readonly particles = new Set(["の", "が", "を", "に", "へ", "と", "から", "まで", "より", "は", "も", "こそ", "さえ", "でも", "しか", "まで", "だけ", "ばかり", "ほど", "くらい", "など", "なり", "やら", "か", "のみ", "ば", "と", "ても", "でも", "のに", "ので", "から", "けど", "けれど", "けれども", "が", "し", "て", "で", "ながら", "つつ", "たり", "な", "よ", "ね", "か", "ぞ", "ぜ", "さ", "わ", "の", "です", "ます", "だ", "である", "や", "とか", "だの"]);
  async detectWords(t: string, sl: number, c?: DetectionContext, d?: Denops): Promise<Word[]> {
    if (!this.canHandle(t)) return [];
    const words: Word[] = [];
    const lines = t.split("\n");
    const jml = c?.config?.japaneseMinWordLength;
    const ml = jml ?? c?.minWordLength ?? 1;
    const mp = c?.config?.japaneseMergeParticles ?? true;
    for (let i = 0; i < lines.length; i++) {
      const lt = lines[i];
      const ln = sl + i;
      if (lt.trim().length === 0) continue;
      try {
        const sr = await tinysegmenter.segment(lt, { mergeParticles: false });
        if (sr.success && sr.segments) {
          let segs = sr.segments;
          if (mp) segs = this.postProcessSegments(segs);
          let ci = 0;
          for (const seg of segs) {
            if (seg.trim().length === 0) { ci += seg.length; continue; }
            if (mp && this.particles.has(seg)) { ci += seg.length; continue; }
            if (seg.length < ml) { ci += seg.length; continue; }
            const idx = lt.indexOf(seg, ci);
            if (idx !== -1) {
              const col = idx + 1;
              let bc: number;
              try {
                bc = charIndexToByteIndex(lt, idx) + 1;
              } catch {
                bc = col;
              }
              words.push({ text: seg, line: ln, col: col, byteCol: bc });
              ci = idx + seg.length;
            } else {
              ci += seg.length;
            }
          }
        }
      } catch {
        continue;
      }
    }
    return words;
  }
  private postProcessSegments(segs: string[]): string[] {
    const proc: string[] = [];
    let i = 0;
    while (i < segs.length) {
      const cur = segs[i];
      if (!cur || cur.trim().length === 0) { i++; continue; }
      let mrg = cur;
      let j = i + 1;
      while (j < segs.length) {
        const nxt = segs[j];
        if (nxt && this.particles.has(nxt)) { mrg += nxt; j++; } else break;
      }
      proc.push(mrg);
      i = j;
    }
    return proc;
  }
  canHandle(t: string): boolean { return this.japaneseRegex.test(t); }
  async isAvailable(): Promise<boolean> { return true; }
}
export class HybridWordDetector implements WordDetector {
  readonly name = "HybridWordDetector";
  readonly priority = 15;
  readonly supportedLanguages = ["ja", "en", "any"];
  private regexDetector: RegexWordDetector;
  private tinySegmenterDetector: TinySegmenterWordDetector;
  constructor(config?: WordDetectionConfig) {
    this.regexDetector = new RegexWordDetector(config);
    this.tinySegmenterDetector = new TinySegmenterWordDetector();
  }
  async detectWords(t: string, sl: number, c?: DetectionContext, d?: Denops): Promise<Word[]> {
    if (!t || t.trim().length === 0) return [];
    if (t.length < 2) return [];
    try {
      const uj = c?.config?.useJapanese ?? true;
      if (!uj) return await this.regexDetector.detectWords(t, sl, c, d);
      const [rr, tr] = await Promise.allSettled([this.regexDetector.detectWords(t, sl, c, d), this.tinySegmenterDetector.detectWords(t, sl, c, d)]);
      const rw = rr.status === "fulfilled" ? rr.value : [];
      const tw = tr.status === "fulfilled" ? tr.value : [];
      const mw = this.mergeAndDeduplicateWords(rw, tw);
      return this.sortWordsByPosition(mw);
    } catch {
      return [];
    }
  }
  canHandle(t: string): boolean { return true; }
  async isAvailable(): Promise<boolean> {
    try {
      const [ra, ta] = await Promise.all([this.regexDetector.isAvailable?.() ?? true, this.tinySegmenterDetector.isAvailable()]);
      return ra && ta;
    } catch {
      return false;
    }
  }
  private mergeAndDeduplicateWords(rw: Word[], tw: Word[]): Word[] {
    const pm = new Map<string, Word>();
    const tws = new Set(tw);
    const aw = [...rw, ...tw];
    for (const w of aw) {
      const pk = `${w.line}-${w.col}`;
      const ex = pm.get(pk);
      if (!ex) {
        pm.set(pk, w);
      } else {
        if (this.shouldReplaceWord(ex, w, tws)) pm.set(pk, w);
      }
    }
    return Array.from(pm.values());
  }
  private shouldReplaceWord(ew: Word, nw: Word, tws: Set<Word>): boolean {
    if (nw.text.length > ew.text.length) return true;
    if (nw.text.length < ew.text.length) return false;
    const inw = tws.has(nw);
    const iew = tws.has(ew);
    if (inw && !iew) return true;
    return false;
  }
  private sortWordsByPosition(words: Word[]): Word[] {
    return words.sort((a, b) => {
      if (a.line !== b.line) return a.line - b.line;
      return a.col - b.col;
    });
  }
}
