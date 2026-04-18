import { TinySegmenter as NpmTinySegmenter } from "https://esm.sh/@birchill/tiny-segmenter@1.0.0";
import { CacheType, GlobalCache } from "../../../cache.ts";
export interface SegmentationResult {
  segments: string[];
  success: boolean;
  error?: string;
  source: "tinysegmenter" | "fallback";
}
export class TinySegmenter {
  private static instance: TinySegmenter;
  private segmenter: NpmTinySegmenter;
  private globalCache: GlobalCache;
  private enabled: boolean;
  constructor() {
    this.segmenter = new NpmTinySegmenter();
    this.globalCache = GlobalCache.getInstance();
    this.enabled = true;
  }
  static getInstance(): TinySegmenter {
    if (!TinySegmenter.instance) TinySegmenter.instance = new TinySegmenter();
    return TinySegmenter.instance;
  }
  private postProcessSegments(segs: string[]): string[] {
    const proc: string[] = [];
    let i = 0;
    const particles = new Set([
      "の",
      "は",
      "が",
      "を",
      "に",
      "へ",
      "と",
      "や",
      "で",
      "も",
      "か",
      "な",
      "よ",
      "ね",
      "ぞ",
      "さ",
      "わ",
      "ば",
      "から",
      "まで",
      "です",
      "ます",
      "だ",
      "である",
    ]);
    while (i < segs.length) {
      const cur = segs[i];
      if (cur && /^\d+$/.test(cur)) {
        let num = cur;
        let j = i + 1;
        while (j < segs.length && /^\d+$/.test(segs[j])) {
          num += segs[j];
          j++;
        }
        if (j < segs.length) {
          const u = segs[j];
          if (u === "%" || u === "％" || /^(年|月|日|時|分|秒)$/.test(u)) {
            num += u;
            j++;
          }
        }
        proc.push(num);
        i = j;
        continue;
      }
      if (cur === "（" || cur === "(") {
        let j = i + 1;
        let cnt = cur;
        while (j < segs.length && segs[j] !== "）" && segs[j] !== ")") {
          cnt += segs[j];
          j++;
        }
        if (j < segs.length) {
          cnt += segs[j];
          proc.push(cnt);
          i = j + 1;
          continue;
        }
      }
      if (cur && cur.trim().length > 0) {
        let mrg = cur;
        let j = i + 1;
        while (j < segs.length) {
          const nxt = segs[j];
          if (nxt && particles.has(nxt)) {
            mrg += nxt;
            j++;
          } else break;
        }
        proc.push(mrg);
        i = j;
        continue;
      }
      i++;
    }
    return proc;
  }
  async segment(t: string, o?: { mergeParticles?: boolean }): Promise<SegmentationResult> {
    if (!this.enabled) {
      return {
        segments: await this.fallbackSegmentation(t),
        success: false,
        error: "TinySegmenter disabled",
        source: "fallback",
      };
    }
    if (!t || t.trim().length === 0) {
      return { segments: [], success: true, source: "tinysegmenter" };
    }
    const mp = o?.mergeParticles ?? true;
    const ck = `${t}:${mp}`;
    const cache = this.globalCache.getCache<string, string[]>(CacheType.ANALYSIS);
    if (cache.has(ck)) return { segments: cache.get(ck)!, success: true, source: "tinysegmenter" };
    try {
      const rs = this.segmenter.segment(t);
      const segs = mp ? this.postProcessSegments(rs) : rs;
      cache.set(ck, segs);
      return { segments: segs, success: true, source: "tinysegmenter" };
    } catch (e) {
      return {
        segments: await this.fallbackSegmentation(t),
        success: false,
        error: e instanceof Error ? e.message : "Unknown error",
        source: "fallback",
      };
    }
  }
  private async fallbackSegmentation(t: string): Promise<string[]> {
    const segs: string[] = [];
    const cs = Array.from(t);
    let cur = "";
    let lt = "";
    for (const c of cs) {
      const ct = this.getCharacterType(c);
      if (ct !== lt && cur.length > 0) {
        segs.push(cur);
        cur = c;
      } else cur += c;
      lt = ct;
    }
    if (cur.length > 0) segs.push(cur);
    return segs.filter((s) => s.trim().length > 0);
  }
  private getCharacterType(c: string): string {
    if (/[\u4E00-\u9FAF]/.test(c)) return "kanji";
    if (/[\u3040-\u309F]/.test(c)) return "hiragana";
    if (/[\u30A0-\u30FF]/.test(c)) return "katakana";
    if (/[a-zA-Z]/.test(c)) return "latin";
    if (/[0-9]/.test(c)) return "digit";
    if (/\s/.test(c)) return "space";
    return "other";
  }
  hasJapanese(t: string): boolean {
    return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(t);
  }
  shouldSegment(t: string, th: number = 4): boolean {
    return this.hasJapanese(t) && t.length >= th;
  }
  clearCache(): void {
    this.globalCache.getCache<string, string[]>(CacheType.ANALYSIS).clear();
  }
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    const cache = this.globalCache.getCache<string, string[]>(CacheType.ANALYSIS);
    const stats = cache.getStats();
    const cfg = this.globalCache.getCacheConfig(CacheType.ANALYSIS);
    return { size: stats.size, maxSize: cfg.size, hitRate: stats.hitRate };
  }
  setEnabled(e: boolean): void {
    this.enabled = e;
  }
  isEnabled(): boolean {
    return this.enabled;
  }
  async test(): Promise<{ success: boolean; results: SegmentationResult[] }> {
    const tcs = [
      "これはテストです",
      "私の名前は田中です",
      "今日は良い天気ですね",
      "Hello World",
      "プログラミング言語",
      "",
    ];
    const res: SegmentationResult[] = [];
    let sc = 0;
    for (const tc of tcs) {
      const r = await this.segment(tc);
      res.push(r);
      if (r.success) sc++;
    }
    return { success: sc === tcs.length, results: res };
  }
}
export const tinysegmenter = TinySegmenter.getInstance();
