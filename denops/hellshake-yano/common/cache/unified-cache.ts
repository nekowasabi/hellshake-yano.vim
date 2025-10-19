/**
 * denops/hellshake-yano/common/cache/unified-cache.ts
 *
 * 統合キャッシュシステム
 *
 * 既存のcache.tsを拡張し、LRUキャッシュとグローバルキャッシュ管理を提供します。
 */

/**
 * キャッシュ統計情報
 */
export interface CacheStatistics {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

/**
 * LRUCache: Least Recently Used キャッシュ
 *
 * 最近使用されていないアイテムを自動的に削除します。
 */
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
      // LRU: 使用されたアイテムを最後に移動
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
      // 最も古いアイテムを削除
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

  resetStatistics(): void {
    this.hits = 0;
    this.misses = 0;
  }
}

/**
 * キャッシュタイプ
 */
export enum CacheType {
  WORDS = "WORDS",
  HINTS = "HINTS",
  DISPLAY = "DISPLAY",
  ANALYSIS = "ANALYSIS",
  TEMP = "TEMP",
  HINT_ASSIGNMENT_NORMAL = "HINT_ASSIGNMENT_NORMAL",
  HINT_ASSIGNMENT_VISUAL = "HINT_ASSIGNMENT_VISUAL",
  HINT_ASSIGNMENT_OTHER = "HINT_ASSIGNMENT_OTHER",
  WORD_DETECTION = "WORD_DETECTION",
}

/**
 * キャッシュ設定
 */
interface CacheConfig {
  size: number;
  description: string;
}

/**
 * GlobalCache: グローバルキャッシュ管理
 *
 * Singletonパターンで全キャッシュを一元管理します。
 */
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
      [CacheType.WORD_DETECTION]: {
        size: 100,
        description: "単語検出のキャッシュ",
      },
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
    for (const [cacheType, cache] of this.caches.entries()) {
      stats[cacheType] = cache.getStats();
    }
    return stats;
  }

  public clearAll(): void {
    for (const cache of this.caches.values()) cache.clear();
  }

  public clearByType(type: CacheType): void {
    const cache = this.caches.get(type);
    if (cache) cache.clear();
  }
}

export const UnifiedCache = GlobalCache;
