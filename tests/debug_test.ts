import { TinySegmenterWordDetector } from "../denops/hellshake-yano/neovim/core/word.ts";
import type { DetectionContext } from "../denops/hellshake-yano/types.ts";

const detector = new TinySegmenterWordDetector();

console.log("Test 1: 私の名前は田中です");
const text1 = "私の名前は田中です";
const context1: DetectionContext = {
  minWordLength: 2,
  config: {
    japaneseMinWordLength: 2,
  },
};
const words1 = await detector.detectWords(text1, 1, context1);
console.log("Result:", words1.map((w) => w.text));
console.log();

console.log("Test 2: これはテストです");
const text2 = "これはテストです";
const context2: DetectionContext = {
  config: {
    japaneseMinWordLength: 3,
  },
};
const words2 = await detector.detectWords(text2, 1, context2);
console.log("Result:", words2.map((w) => w.text));
console.log();

console.log("Test 3: 東京から大阪まで行く");
const text3 = "東京から大阪まで行く";
const context3: DetectionContext = {
  minWordLength: 1,
  config: {
    japaneseMinWordLength: 2,
  },
};
const words3 = await detector.detectWords(text3, 1, context3);
console.log("Result:", words3.map((w) => w.text));
