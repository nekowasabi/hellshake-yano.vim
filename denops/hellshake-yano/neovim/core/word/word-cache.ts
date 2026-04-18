import type { Word } from "../../../types.ts";
import { CacheType, GlobalCache } from "../../../cache.ts";
export interface KeyBasedWordCacheStats {
  size: number;
  keys: string[];
  hits: number;
  misses: number;
  hitRate: number;
  maxSize: number;
  cacheType: CacheType;
  description: string;
  unified: boolean;
}
export class KeyBasedWordCache {
  private globalCache: GlobalCache;
  private wordsCache: ReturnType<GlobalCache["getCache"]>;
  constructor() {
    try {
      this.globalCache = GlobalCache.getInstance();
      this.wordsCache = this.globalCache.getCache<string, Word[]>(CacheType.WORDS);
    } catch (e) {
      throw new Error(
        `KeyBasedWordCache initialization failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
  set(k: string, w: Word[]): void {
    this.wordsCache.set(k, [...w]);
  }
  get(k: string): Word[] | undefined {
    const c = this.wordsCache.get(k) as Word[] | undefined;
    if (c && Array.isArray(c)) return [...c];
    return undefined;
  }
  has(k: string): boolean {
    return this.wordsCache.has(k);
  }
  clear(k?: string): void {
    if (k) this.wordsCache.delete(k);
    else this.globalCache.clearByType(CacheType.WORDS);
  }
  getStats(): KeyBasedWordCacheStats {
    try {
      const us = this.globalCache.getAllStats();
      const ws = us.WORDS;
      if (!ws) throw new Error("WORDS cache statistics not found");
      const cfg = this.globalCache.getCacheConfig(CacheType.WORDS);
      return {
        size: ws.size,
        keys: [],
        hits: ws.hits,
        misses: ws.misses,
        hitRate: ws.hitRate,
        maxSize: ws.maxSize,
        cacheType: CacheType.WORDS,
        description: cfg.description,
        unified: true,
      };
    } catch {
      return {
        size: 0,
        keys: [],
        hits: 0,
        misses: 0,
        hitRate: 0,
        maxSize: 1000,
        cacheType: CacheType.WORDS,
        description: "単語検出結果のキャッシュ（統計取得エラー）",
        unified: true,
      };
    }
  }
  size(): number {
    return this.getStats().size;
  }
  isEmpty(): boolean {
    return this.size() === 0;
  }
}
export const globalWordCache = new KeyBasedWordCache();
