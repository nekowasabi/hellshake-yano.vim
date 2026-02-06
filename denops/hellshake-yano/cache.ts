export interface CacheStatistics {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
}
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;
  private hits = 0;
  private misses = 0;
  constructor(maxSize: number) {
    if (maxSize <= 0) throw new Error("maxSize must be positive");
    this.maxSize = maxSize;
  }
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, value);
      this.hits++;
      return value;
    }
    this.misses++;
    return undefined;
  }
  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
  delete(key: K): boolean {
    return this.cache.delete(key);
  }
  has(key: K): boolean {
    return this.cache.has(key);
  }
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
  size(): number {
    return this.cache.size;
  }
  get capacity(): number {
    return this.maxSize;
  }
  getStats(): CacheStatistics {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }
  values(): IterableIterator<V> {
    return this.cache.values();
  }
  entries(): IterableIterator<[K, V]> {
    return this.cache.entries();
  }
  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: unknown): void {
    this.cache.forEach(callbackfn, thisArg);
  }
  getStatistics(): CacheStatistics {
    return this.getStats();
  }
  resetStatistics(): void {
    this.hits = 0;
    this.misses = 0;
  }
}

export enum CacheType {
  WORDS = "WORDS",
  HINTS = "HINTS",
  DISPLAY = "DISPLAY",
  ANALYSIS = "ANALYSIS",
  TEMP = "TEMP",
  HINT_ASSIGNMENT_NORMAL = "HINT_ASSIGNMENT_NORMAL",
  HINT_ASSIGNMENT_VISUAL = "HINT_ASSIGNMENT_VISUAL",
  HINT_ASSIGNMENT_OTHER = "HINT_ASSIGNMENT_OTHER",
  LANGUAGE_RULES = "LANGUAGE_RULES",
  SYNTAX_CONTEXT = "SYNTAX_CONTEXT",
  DICTIONARY = "DICTIONARY",
  CHAR_WIDTH = "CHAR_WIDTH",
  CHAR_TYPE = "CHAR_TYPE",
  BYTE_LENGTH = "BYTE_LENGTH",
  ADJACENCY = "ADJACENCY",
  WORD_DETECTION = "WORD_DETECTION",
}
interface CacheConfig {
  size: number;
  description: string;
}

export class GlobalCache {
  private static instance: GlobalCache;
  private readonly caches: Map<CacheType, LRUCache<unknown, unknown>>;
  private readonly cacheConfigs: Record<CacheType, CacheConfig>;
  private constructor() {
    this.caches = new Map();
    this.cacheConfigs = {
      [CacheType.WORDS]: { size: 1000, description: "単語検出結果のキャッシュ" },
      [CacheType.HINTS]: { size: 500, description: "ヒント生成結果のキャッシュ" },
      [CacheType.DISPLAY]: { size: 200, description: "表示情報のキャッシュ" },
      [CacheType.ANALYSIS]: { size: 300, description: "解析結果のキャッシュ" },
      [CacheType.TEMP]: { size: 100, description: "一時的なデータのキャッシュ" },
      [CacheType.HINT_ASSIGNMENT_NORMAL]: {
        size: 100,
        description: "ノーマルモード用ヒント割り当てキャッシュ",
      },
      [CacheType.HINT_ASSIGNMENT_VISUAL]: {
        size: 100,
        description: "ビジュアルモード用ヒント割り当てキャッシュ",
      },
      [CacheType.HINT_ASSIGNMENT_OTHER]: {
        size: 100,
        description: "その他モード用ヒント割り当てキャッシュ",
      },
      [CacheType.LANGUAGE_RULES]: { size: 50, description: "言語ルールのキャッシュ" },
      [CacheType.SYNTAX_CONTEXT]: {
        size: 200,
        description: "シンタックスコンテキストのキャッシュ",
      },
      [CacheType.DICTIONARY]: { size: 2000, description: "辞書データのキャッシュ" },
      [CacheType.CHAR_WIDTH]: { size: 500, description: "文字幅計算のキャッシュ" },
      [CacheType.CHAR_TYPE]: { size: 1000, description: "文字種判定のキャッシュ" },
      [CacheType.BYTE_LENGTH]: { size: 300, description: "バイト長計算のキャッシュ" },
      [CacheType.ADJACENCY]: { size: 200, description: "隣接単語のキャッシュ" },
      [CacheType.WORD_DETECTION]: { size: 100, description: "単語検出のキャッシュ" },
    };
    this.initializeCaches();
  }
  public static getInstance(): GlobalCache {
    if (!GlobalCache.instance) GlobalCache.instance = new GlobalCache();
    return GlobalCache.instance;
  }
  private initializeCaches(): void {
    Object.entries(this.cacheConfigs).forEach(([cacheType, config]) => {
      this.caches.set(cacheType as CacheType, new LRUCache(config.size));
    });
  }
  public getCache<K, V>(type: CacheType): LRUCache<K, V> {
    const cache = this.caches.get(type);
    if (!cache) {
      throw new Error(
        `Cache for type '${type}' not found. Available types: ${
          Array.from(this.caches.keys()).join(", ")
        }`,
      );
    }
    return cache as LRUCache<K, V>;
  }
  public getAllStats(): Record<string, CacheStatistics> {
    const stats: Record<string, CacheStatistics> = {};
    for (const [cacheType, cache] of this.caches.entries()) stats[cacheType] = cache.getStats();
    return stats;
  }
  public clearAll(): void {
    for (const cache of this.caches.values()) cache.clear();
  }
  public clearByType(type: CacheType): void {
    const cache = this.caches.get(type);
    if (cache) cache.clear();
  }
  public getCacheConfigs(): Readonly<Record<CacheType, CacheConfig>> {
    return this.cacheConfigs;
  }
  public getCacheConfig(type: CacheType): Readonly<CacheConfig> {
    const config = this.cacheConfigs[type];
    if (!config) throw new Error(`Config for cache type '${type}' not found`);
    return config;
  }
}
export const UnifiedCache = GlobalCache;
