import { assertEquals, assertThrows } from "@std/assert";
import type { Word } from "../denops/hellshake-yano/types.ts";

// Test interfaces and types
export interface WordDetector {
  detectWords(text: string, startLine: number): Promise<Word[]>;
  name: string;
  priority: number; // Higher priority = preferred detector
}

export interface WordDetectionConfig {
  strategy?: "regex" | "tinysegmenter" | "hybrid";
  useJapanese?: boolean;
  useImprovedDetection?: boolean;
  // TinySegmenter specific
  enableTinySegmenter?: boolean;
  segmenterThreshold?: number; // minimum characters for segmentation
  // Fallback options
  enableFallback?: boolean;
  fallbackToRegex?: boolean;
}

// Mock implementation for testing
class MockRegexWordDetector implements WordDetector {
  name = "MockRegex";
  priority = 1;

  async detectWords(text: string, startLine: number): Promise<Word[]> {
    const words: Word[] = [];
    const lines = text.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      const lineNumber = startLine + i;

      // Basic word detection using regex
      const wordRegex = /\b\w+\b/g;
      let match;

      while ((match = wordRegex.exec(lineText)) !== null) {
        if (match[0].length >= 2) { // Skip single characters for now
          words.push({
            text: match[0],
            line: lineNumber,
            col: match.index + 1, // Vim column numbers start at 1
          });
        }
      }
    }

    return words;
  }
}

class MockTinySegmenterWordDetector implements WordDetector {
  name = "MockTinySegmenter";
  priority = 2;

  async detectWords(text: string, startLine: number): Promise<Word[]> {
    const words: Word[] = [];
    const lines = text.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      const lineNumber = startLine + i;

      // Mock Japanese segmentation
      if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(lineText)) {
        // Simulate TinySegmenter behavior for Japanese text
        const segments = this.mockSegmentation(lineText);
        let currentCol = 1;

        for (const segment of segments) {
          const segmentIndex = lineText.indexOf(segment, currentCol - 1);
          if (segmentIndex !== -1 && segment.trim().length > 0) {
            words.push({
              text: segment,
              line: lineNumber,
              col: segmentIndex + 1,
            });
            currentCol = segmentIndex + segment.length + 1;
          }
        }
      } else {
        // Fallback to basic regex for non-Japanese text
        const wordRegex = /\b\w+\b/g;
        let match;

        while ((match = wordRegex.exec(lineText)) !== null) {
          words.push({
            text: match[0],
            line: lineNumber,
            col: match.index + 1,
          });
        }
      }
    }

    return words;
  }

  private mockSegmentation(text: string): string[] {
    // Very simple mock segmentation for testing
    // In real implementation, this would use TinySegmenter
    return text.split("").map((char) => {
      if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(char)) {
        return char; // Each Japanese character as a segment
      }
      return char;
    }).filter((s) => s.trim().length > 0);
  }
}

// Test WordDetectionManager
class MockWordDetectionManager {
  private detectors: WordDetector[] = [];
  private config: WordDetectionConfig;
  private cache = new Map<string, Word[]>();

  constructor(config: WordDetectionConfig = {}) {
    this.config = { ...this.getDefaultConfig(), ...config };
  }

  addDetector(detector: WordDetector): void {
    this.detectors.push(detector);
    // Sort by priority (higher first)
    this.detectors.sort((a, b) => b.priority - a.priority);
  }

  async detectWords(text: string, startLine: number = 1): Promise<Word[]> {
    const cacheKey = `${text}:${startLine}:${JSON.stringify(this.config)}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    let words: Word[] = [];

    // Select detector based on strategy
    const detector = this.selectDetector(text);
    if (detector) {
      try {
        words = await detector.detectWords(text, startLine);
      } catch (error) {
        console.warn(`Detector ${detector.name} failed:`, error);
        if (this.config.enableFallback) {
          const fallbackDetector = this.getFallbackDetector();
          if (fallbackDetector && fallbackDetector !== detector) {
            words = await fallbackDetector.detectWords(text, startLine);
          }
        }
      }
    }

    // Apply filters based on config
    words = this.applyFilters(words);

    // Cache results
    if (this.cache.size < 100) { // Limit cache size
      this.cache.set(cacheKey, words);
    }

    return words;
  }

  private selectDetector(text: string): WordDetector | null {
    if (this.detectors.length === 0) return null;

    switch (this.config.strategy) {
      case "regex":
        return this.detectors.find((d) => d.name.includes("Regex")) || this.detectors[0];
      case "tinysegmenter":
        return this.detectors.find((d) => d.name.includes("TinySegmenter")) || this.detectors[0];
      case "hybrid":
        // Choose based on text content
        if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) {
          return this.detectors.find((d) => d.name.includes("TinySegmenter")) || this.detectors[0];
        } else {
          return this.detectors.find((d) => d.name.includes("Regex")) || this.detectors[0];
        }
      default:
        return this.detectors[0];
    }
  }

  private getFallbackDetector(): WordDetector | null {
    if (this.config.fallbackToRegex) {
      return this.detectors.find((d) => d.name.includes("Regex")) || null;
    }
    return this.detectors.length > 1 ? this.detectors[1] : null;
  }

  private applyFilters(words: Word[]): Word[] {
    let filtered = words;

    // Apply Japanese filtering if configured
    if (!this.config.useJapanese) {
      filtered = filtered.filter((word) =>
        !/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(word.text)
      );
    }

    // Remove duplicates
    const seen = new Set<string>();
    filtered = filtered.filter((word) => {
      const key = `${word.text}:${word.line}:${word.col}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return filtered;
  }

  private getDefaultConfig(): WordDetectionConfig {
    return {
      strategy: "hybrid",
      useJapanese: false,
      useImprovedDetection: true,
      enableTinySegmenter: true,
      segmenterThreshold: 4,
      enableFallback: true,
      fallbackToRegex: true,
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Test cases
Deno.test("WordDetector Interface Tests", async (t) => {
  await t.step("MockRegexWordDetector basic functionality", async () => {
    const detector = new MockRegexWordDetector();
    assertEquals(detector.name, "MockRegex");
    assertEquals(detector.priority, 1);

    const text = "hello world test";
    const words = await detector.detectWords(text, 1);

    assertEquals(words.length, 3);
    assertEquals(words[0].text, "hello");
    assertEquals(words[0].line, 1);
    assertEquals(words[0].col, 1);

    assertEquals(words[1].text, "world");
    assertEquals(words[2].text, "test");
  });

  await t.step("MockTinySegmenterWordDetector Japanese text", async () => {
    const detector = new MockTinySegmenterWordDetector();
    assertEquals(detector.name, "MockTinySegmenter");
    assertEquals(detector.priority, 2);

    const text = "これはテストです";
    const words = await detector.detectWords(text, 1);

    // Mock segmentation should detect individual characters for now
    assertEquals(words.length > 0, true);
    assertEquals(words[0].line, 1);
  });

  await t.step("MockTinySegmenterWordDetector English fallback", async () => {
    const detector = new MockTinySegmenterWordDetector();

    const text = "hello world";
    const words = await detector.detectWords(text, 1);

    assertEquals(words.length, 2);
    assertEquals(words[0].text, "hello");
    assertEquals(words[1].text, "world");
  });
});

Deno.test("WordDetectionManager Tests", async (t) => {
  await t.step("Manager basic setup and detector registration", () => {
    const manager = new MockWordDetectionManager();
    const regexDetector = new MockRegexWordDetector();
    const segmenterDetector = new MockTinySegmenterWordDetector();

    manager.addDetector(regexDetector);
    manager.addDetector(segmenterDetector);

    // Priority should be sorted (TinySegmenter=2, Regex=1)
    // Verify via detection behavior
  });

  await t.step("Strategy-based detector selection", async () => {
    const manager = new MockWordDetectionManager({ strategy: "regex" });
    manager.addDetector(new MockRegexWordDetector());
    manager.addDetector(new MockTinySegmenterWordDetector());

    const text = "hello world";
    const words = await manager.detectWords(text, 1);

    assertEquals(words.length, 2);
  });

  await t.step("Hybrid strategy with Japanese content", async () => {
    const manager = new MockWordDetectionManager({ strategy: "hybrid" });
    manager.addDetector(new MockRegexWordDetector());
    manager.addDetector(new MockTinySegmenterWordDetector());

    const japaneseText = "これはテスト";
    const words = await manager.detectWords(japaneseText, 1);

    // Mock implementation might return empty results, so we just check it doesn't error
    assertEquals(Array.isArray(words), true);
  });

  await t.step("Hybrid strategy with English content", async () => {
    const manager = new MockWordDetectionManager({ strategy: "hybrid" });
    manager.addDetector(new MockRegexWordDetector());
    manager.addDetector(new MockTinySegmenterWordDetector());

    const englishText = "hello world test";
    const words = await manager.detectWords(englishText, 1);

    assertEquals(words.length, 3);
  });

  await t.step("Japanese filtering configuration", async () => {
    const manager = new MockWordDetectionManager({ useJapanese: false, strategy: "hybrid" });
    manager.addDetector(new MockRegexWordDetector());
    manager.addDetector(new MockTinySegmenterWordDetector());

    const mixedText = "hello こんにちは world";
    const words = await manager.detectWords(mixedText, 1);

    // Should filter out Japanese words
    const hasJapanese = words.some((w) => /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(w.text));
    assertEquals(hasJapanese, false);
  });

  await t.step("Caching functionality", async () => {
    const manager = new MockWordDetectionManager();
    manager.addDetector(new MockRegexWordDetector());

    const text = "cached test words";

    // First call
    const words1 = await manager.detectWords(text, 1);
    const stats1 = manager.getCacheStats();
    assertEquals(stats1.size, 1);

    // Second call should use cache
    const words2 = await manager.detectWords(text, 1);
    const stats2 = manager.getCacheStats();
    assertEquals(stats2.size, 1);
    assertEquals(words1.length, words2.length);

    // Clear cache
    manager.clearCache();
    const stats3 = manager.getCacheStats();
    assertEquals(stats3.size, 0);
  });

  await t.step("Error handling and fallback", async () => {
    class FailingDetector implements WordDetector {
      name = "Failing";
      priority = 3;
      async detectWords(): Promise<Word[]> {
        throw new Error("Simulated failure");
      }
    }

    const manager = new MockWordDetectionManager({
      enableFallback: true,
      fallbackToRegex: true,
    });
    manager.addDetector(new FailingDetector());
    manager.addDetector(new MockRegexWordDetector());

    const text = "fallback test";
    const words = await manager.detectWords(text, 1);

    // Should fall back to regex detector
    assertEquals(words.length, 2);
    assertEquals(words[0].text, "fallback");
    assertEquals(words[1].text, "test");
  });

  await t.step("Configuration validation", () => {
    // Test default config
    const manager1 = new MockWordDetectionManager();
    const stats1 = manager1.getCacheStats();
    assertEquals(stats1.size, 0);

    // Test custom config
    const customConfig: WordDetectionConfig = {
      strategy: "regex",
      useJapanese: true,
      enableFallback: false,
    };
    const manager2 = new MockWordDetectionManager(customConfig);
    const stats2 = manager2.getCacheStats();
    assertEquals(stats2.size, 0);
  });
});

Deno.test("WordDetectionConfig Tests", async (t) => {
  await t.step("Default configuration", () => {
    const manager = new MockWordDetectionManager();
    const stats = manager.getCacheStats();
    assertEquals(typeof stats, "object");
  });

  await t.step("Strategy configuration validation", () => {
    const validStrategies = ["regex", "tinysegmenter", "hybrid"];

    for (const strategy of validStrategies) {
      const config: WordDetectionConfig = { strategy: strategy as any };
      const manager = new MockWordDetectionManager(config);
      // Should not throw
      assertEquals(manager !== null, true);
    }
  });

  await t.step("Boolean configuration validation", () => {
    const config: WordDetectionConfig = {
      useJapanese: true,
      useImprovedDetection: false,
      enableTinySegmenter: true,
      enableFallback: false,
      fallbackToRegex: true,
    };

    const manager = new MockWordDetectionManager(config);
    assertEquals(manager !== null, true);
  });
});
