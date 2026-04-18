#!/usr/bin/env -S deno test --allow-all

import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { validateConfig } from "../denops/hellshake-yano/config.ts";

describe("Null Value Test", () => {
  it("should handle null values gracefully", () => {
    const result = validateConfig({ motionCount: null as any, hintPosition: null as any });
    assertEquals(result.valid, false);
    assertEquals(result.errors.length, 2);
  });
});
