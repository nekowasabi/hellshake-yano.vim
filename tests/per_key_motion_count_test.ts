/**
 * Tests for per-key motion count configuration (process1)
 *
 * Feature: Allow different motionCount values for different keys
 * Examples:
 * - 'v', 'w', 'b' with motionCount of 1 (immediate hints)
 * - 'h', 'j', 'k', 'l' with motionCount of 3 (show hints after 3 presses)
 */

import { assertEquals, assertNotEquals } from "@std/assert";
import type { Config } from "../denops/hellshake-yano/types.ts";
import { DEFAULT_UNIFIED_CONFIG } from "../denops/hellshake-yano/config.ts";
import { getMotionCountForKey } from "../denops/hellshake-yano/main.ts";

// Test helper to create minimal config with required fields
function createTestConfig(partial: Partial<Config>): Config {
  return {
    ...DEFAULT_UNIFIED_CONFIG,
    markers: ["A", "B", "C"],
    motionCount: 3,
    motionTimeout: 2000,
    hintPosition: "start",
    triggerOnHjkl: true,
    countedMotions: ["w", "b"],
    enabled: true,
    maxHints: 100,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
    ...partial,
  };
}

Deno.test("perKeyMotionCount: basic functionality", () => {
  const config = createTestConfig({motionCount: 3,
    perKeyMotionCount: {
      "v": 1,
      "w": 1,
      "b": 1,
      "h": 3,
      "j": 3,
      "k": 3,
      "l": 3,
    },
    defaultMotionCount: 2,
  });

  // Test per-key specific values
  assertEquals(getMotionCountForKey("v", config), 1);
  assertEquals(getMotionCountForKey("w", config), 1);
  assertEquals(getMotionCountForKey("b", config), 1);
  assertEquals(getMotionCountForKey("h", config), 3);
  assertEquals(getMotionCountForKey("j", config), 3);
  assertEquals(getMotionCountForKey("k", config), 3);
  assertEquals(getMotionCountForKey("l", config), 3);
});

Deno.test("perKeyMotionCount: fallback to defaultMotionCount", () => {
  const config = createTestConfig({motionCount: 3,
    perKeyMotionCount: {
      "v": 1,
    },
    defaultMotionCount: 2,
  });

  // Test fallback to defaultMotionCount for undefined keys
  assertEquals(getMotionCountForKey("v", config), 1); // specific value
  assertEquals(getMotionCountForKey("x", config), 2); // defaultMotionCount
  assertEquals(getMotionCountForKey("z", config), 2); // defaultMotionCount
});

Deno.test("perKeyMotionCount: fallback to motionCount when defaultMotionCount is undefined", () => {
  const config = createTestConfig({motionCount: 3,
    perKeyMotionCount: {
      "v": 1,
    },
    // defaultMotionCount is undefined
  });

  // Test fallback to motionCount for backward compatibility
  assertEquals(getMotionCountForKey("v", config), 1); // specific value
  assertEquals(getMotionCountForKey("x", config), 3); // motionCount (backward compatibility)
});

Deno.test("perKeyMotionCount: undefined perKeyMotionCount uses defaultMotionCount", () => {
  const config = createTestConfig({motionCount: 3,
    // perKeyMotionCount is undefined
    defaultMotionCount: 2,
  });

  // Test fallback to defaultMotionCount when perKeyMotionCount is undefined
  assertEquals(getMotionCountForKey("v", config), 2);
  assertEquals(getMotionCountForKey("h", config), 2);
});

Deno.test("perKeyMotionCount: both undefined uses motionCount", () => {
  const config = createTestConfig({motionCount: 3,
    // both perKeyMotionCount and defaultMotionCount are undefined
  });

  // Test fallback to motionCount for complete backward compatibility
  assertEquals(getMotionCountForKey("v", config), 3);
  assertEquals(getMotionCountForKey("h", config), 3);
});

Deno.test("perKeyMotionCount: edge cases", () => {
  const config = createTestConfig({motionCount: 3,
    perKeyMotionCount: {
      "v": 0, // zero value (should fallback as it's invalid)
      "w": -1, // negative value (should fallback)
    },
    defaultMotionCount: 2,
  });

  // Zero and negative values should fallback to default (only values >= 1 are valid)
  assertEquals(getMotionCountForKey("v", config), 2);
  assertEquals(getMotionCountForKey("w", config), 2);
});

Deno.test("perKeyMotionCount: empty string key", () => {
  const config = createTestConfig({motionCount: 3,
    perKeyMotionCount: {
      "": 1, // empty string key
    },
    defaultMotionCount: 2,
  });

  // Empty string key should work
  assertEquals(getMotionCountForKey("", config), 1);

  // Other keys should use default
  assertEquals(getMotionCountForKey("v", config), 2);
});

Deno.test("perKeyMotionCount: priority test", () => {
  const config = createTestConfig({motionCount: 5,
    perKeyMotionCount: {
      "v": 1,
    },
    defaultMotionCount: 2,
  });

  // Priority: perKeyMotionCount > defaultMotionCount > motionCount
  assertEquals(getMotionCountForKey("v", config), 1); // perKeyMotionCount
  assertEquals(getMotionCountForKey("x", config), 2); // defaultMotionCount

  // Test without perKeyMotionCount
  const configWithoutPerKey = createTestConfig({motionCount: 5,
    defaultMotionCount: 2,
  });
  assertEquals(getMotionCountForKey("v", configWithoutPerKey), 2); // defaultMotionCount

  // Test without both
  const configMinimal = createTestConfig({motionCount: 5,
  });
  assertEquals(getMotionCountForKey("v", configMinimal), 5); // motionCount
});
