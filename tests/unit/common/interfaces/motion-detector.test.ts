/**
 * tests/unit/common/interfaces/motion-detector.test.ts
 *
 * MotionDetector インターフェースの契約テスト (TDD Red Phase)
 */

import { assertEquals } from "@std/assert";
import type {
  MotionDetector,
  MotionDetectorState,
} from "../../../../denops/hellshake-yano/common/interfaces/motion-detector.ts";

class StubMotionDetector implements MotionDetector {
  private threshold = 2;
  private timeoutMs = 300;
  private active = false;

  async setThreshold(threshold: number): Promise<void> {
    this.threshold = threshold;
  }

  async setTimeout(timeout: number): Promise<void> {
    this.timeoutMs = timeout;
  }

  async getState(): Promise<MotionDetectorState> {
    return {
      threshold: this.threshold,
      timeout: this.timeoutMs,
      isActive: this.active,
    };
  }
}

Deno.test("MotionDetector: setThreshold() はしきい値を更新する", async () => {
  const detector = new StubMotionDetector();

  await detector.setThreshold(5);
  const state = await detector.getState();

  assertEquals(state.threshold, 5);
});

Deno.test("MotionDetector: setTimeout() はタイムアウトを更新する", async () => {
  const detector = new StubMotionDetector();

  await detector.setTimeout(500);
  const state = await detector.getState();

  assertEquals(state.timeout, 500);
});

Deno.test("MotionDetector: getState() は MotionDetectorState を返す", async () => {
  const detector = new StubMotionDetector();
  await detector.setThreshold(3);
  await detector.setTimeout(200);

  const state = await detector.getState();

  assertEquals(state.threshold, 3);
  assertEquals(state.timeout, 200);
  assertEquals(typeof state.isActive, "boolean");
});
