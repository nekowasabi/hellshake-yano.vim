import { TinySegmenterWordDetector } from "../denops/hellshake-yano/neovim/core/word.ts";
import type { DetectionContext } from "../denops/hellshake-yano/types.ts";

const detector = new TinySegmenterWordDetector();
const text = "私の本";
const context: DetectionContext = {
  minWordLength: 1,
  config: {
    japaneseMinWordLength: 2,
    japaneseMergeParticles: true,
  },
};

const words = await detector.detectWords(text, 1, context);
console.log("Result:", words.map((w) => w.text));
