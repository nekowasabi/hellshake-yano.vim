/**
 * motion.ts のテスト
 *
 * TDD Phase: RED
 * Process9-sub1: テストファイル作成
 */

import { assertEquals } from "jsr:@std/assert";
import { MotionType, VimMotion } from "../../../denops/hellshake-yano/vim/features/motion.ts";

Deno.test("VimMotion: モーション検出", async (t) => {
  await t.step("文字モーション検出", () => {
    const motions = ["h", "j", "k", "l"];
    for (const key of motions) {
      const motion = VimMotion.detectMotion(key);
      assertEquals(motion.key, key);
      assertEquals(motion.type, MotionType.Character);
    }
  });

  await t.step("単語モーション検出", () => {
    const motions = ["w", "W", "b", "B"];
    for (const key of motions) {
      const motion = VimMotion.detectMotion(key);
      assertEquals(motion.key, key);
      assertEquals(motion.type, MotionType.Word);
    }
  });

  await t.step("行モーション検出", () => {
    const motions = ["g", "G", "0", "$"];
    for (const key of motions) {
      const motion = VimMotion.detectMotion(key);
      assertEquals(motion.key, key);
      assertEquals(motion.type, MotionType.Line);
    }
  });

  await t.step("不明なモーション", () => {
    const motion = VimMotion.detectMotion("x");
    assertEquals(motion.type, MotionType.Other);
    assertEquals(VimMotion.isValidMotion(motion), false);
  });
});
