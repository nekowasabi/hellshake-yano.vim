import type { Denops } from "@denops/std";
import type { DetectionContext, Word } from "../../../types.ts";
import type { Config } from "../../../config.ts";
import { Core } from "../core.ts";
import type { WordDetector, WordDetectionConfig } from "./word-detector-strategies.ts";
import { resolveConfigType } from "../../../common/utils/config.ts";
export abstract class BaseWordDetector implements WordDetector {
  abstract readonly name: string;
  abstract readonly priority: number;
  abstract readonly supportedLanguages: string[];
  protected config: WordDetectionConfig;
  protected unifiedConfig?: Config;
  protected globalConfig?: Config;
  constructor(config: WordDetectionConfig = {}, gc?: Config | Config) {
    this.config = this.mergeWithDefaults(config);
    [this.unifiedConfig, this.globalConfig] = resolveConfigType(gc);
  }
  async detectWords(t: string, sl: number, c?: DetectionContext, d?: Denops): Promise<Word[]> {
    const pt = this.preprocess(t, c);
    const lines = pt.split("\n");
    const words: Word[] = [];
    for (let i = 0; i < lines.length; i++) {
      const lt = lines[i];
      const ln = sl + i;
      const lw = await this.extractWordsFromLine(lt, ln, c, d);
      words.push(...lw);
    }
    const f = this.applyFilters(words, c);
    return this.postprocess(f, c);
  }
  protected preprocess(t: string, c?: DetectionContext): string { return t; }
  protected abstract extractWordsFromLine(lt: string, ln: number, c?: DetectionContext, d?: Denops): Promise<Word[]>;
  protected applyFilters(words: Word[], c?: DetectionContext): Word[] {
    let f = words;
    const ml = this.getEffectiveMinLength(c, c?.currentKey);
    if (ml >= 1) f = f.filter((w) => w.text.length >= ml);
    if (this.config.maxWordLength) f = f.filter((w) => w.text.length <= this.config.maxWordLength!);
    if (this.config.exclude_numbers) f = f.filter((w) => !/^\d+$/.test(w.text));
    if (this.config.exclude_single_chars && ml !== 1) f = f.filter((w) => w.text.length > 1);
    return f;
  }
  protected postprocess(words: Word[], c?: DetectionContext): Word[] { return words; }
  protected getEffectiveMinLength(c?: DetectionContext, k?: string): number {
    if (c?.minWordLength !== undefined) return c.minWordLength;
    if (this.unifiedConfig && k) return this.unifiedConfig.perKeyMinLength?.[k] || this.unifiedConfig.defaultMinWordLength;
    if (this.globalConfig && k) return Core.getMinLengthForKey(this.globalConfig, k);
    return this.config.minWordLength || 1;
  }
  protected mergeWithDefaults(cfg: WordDetectionConfig): WordDetectionConfig {
    return { strategy: "regex", useJapanese: true, minWordLength: 1, maxWordLength: 50, exclude_numbers: false, exclude_single_chars: false, cacheEnabled: true, batchSize: 50, ...cfg };
  }
  abstract canHandle(t: string): boolean;
  abstract isAvailable(): Promise<boolean>;
}
