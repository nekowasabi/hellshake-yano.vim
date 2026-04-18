import type { HintKeyConfig } from "../../../types.ts";
import { DEFAULT_HINT_MARKERS } from "../../../types.ts";
export interface HintGenerationStrategy {
  readonly name: string;
  readonly priority: number;
  generate(c: number, cfg?: HintKeyConfig): string[];
  canHandle(c: number, cfg?: HintKeyConfig): boolean;
}
export class SingleCharHintStrategy implements HintGenerationStrategy {
  readonly name = "SingleChar";
  readonly priority = 10;
  generate(c: number, cfg?: HintKeyConfig): string[] {
    const k = this.getKeys(cfg);
    return k.slice(0, Math.min(c, k.length));
  }
  canHandle(c: number, cfg?: HintKeyConfig): boolean {
    const k = this.getKeys(cfg);
    return c > 0 && c <= k.length;
  }
  private getKeys(cfg?: HintKeyConfig): string[] {
    if (!cfg) return "ASDFGHJKLNM0123456789".split("");
    const sck = Array.isArray(cfg.singleCharKeys)
      ? cfg.singleCharKeys
      : typeof cfg.singleCharKeys === "string"
      ? (cfg.singleCharKeys as string).split("")
      : [];
    return sck.length > 0 ? sck : "ASDFGHJKLNM0123456789".split("");
  }
}
export class MultiCharHintStrategy implements HintGenerationStrategy {
  readonly name = "MultiChar";
  readonly priority = 8;
  generate(c: number, cfg?: HintKeyConfig): string[] {
    const k = this.getKeys(cfg);
    const h: string[] = [];
    if (this.isNumericOnlyKeys(k)) {
      for (let i = 1; i <= 9 && h.length < c; i++) h.push(String(i).padStart(2, "0"));
      for (let i = 10; i < 100 && h.length < c; i++) h.push(String(i).padStart(2, "0"));
      if (h.length < c) h.push("00");
      return h;
    }
    const mh = k.length * k.length;
    const ac = Math.min(c, mh);
    for (let i = 0; i < ac; i++) h.push(k[Math.floor(i / k.length)] + k[i % k.length]);
    return h;
  }
  canHandle(c: number, cfg?: HintKeyConfig): boolean {
    const k = this.getKeys(cfg);
    return c > 0 && k.length > 0;
  }
  private isNumericOnlyKeys(k: string[]): boolean {
    if (!Array.isArray(k) || k.length === 0) return false;
    return k.every((key) => key.length === 1 && key >= "0" && key <= "9");
  }
  private getKeys(cfg?: HintKeyConfig): string[] {
    if (!cfg) return "BCEIOPQRTUVWXYZ".split("");
    const mck = Array.isArray(cfg.multiCharKeys)
      ? cfg.multiCharKeys
      : typeof cfg.multiCharKeys === "string"
      ? (cfg.multiCharKeys as string).split("")
      : [];
    return mck.length > 0 ? mck : "BCEIOPQRTUVWXYZ".split("");
  }
}
export class NumericHintStrategy implements HintGenerationStrategy {
  readonly name = "Numeric";
  readonly priority = 5;
  generate(c: number, cfg?: HintKeyConfig): string[] {
    const h: string[] = [];
    if (c <= 0) return h;
    const mc = Math.min(c, 100);
    for (let i = 1; i <= 9 && h.length < mc; i++) h.push(String(i).padStart(2, "0"));
    for (let i = 10; i < 100 && h.length < mc; i++) h.push(String(i).padStart(2, "0"));
    if (h.length < mc) h.push("00");
    return h;
  }
  canHandle(c: number, cfg?: HintKeyConfig): boolean {
    return c > 0 && cfg?.useNumericMultiCharHints === true;
  }
}
export class HybridHintStrategy implements HintGenerationStrategy {
  readonly name = "Hybrid";
  readonly priority = 15;
  private singleCharStrategy = new SingleCharHintStrategy();
  private multiCharStrategy = new MultiCharHintStrategy();
  private numericStrategy = new NumericHintStrategy();
  generate(c: number, cfg?: HintKeyConfig): string[] {
    const h: string[] = [];
    let r = c;
    const hsck = cfg?.singleCharKeys &&
      ((Array.isArray(cfg.singleCharKeys) && cfg.singleCharKeys.length > 0) ||
        (typeof cfg.singleCharKeys === "string" && (cfg.singleCharKeys as string).length > 0));
    const hmck = cfg?.multiCharKeys &&
      ((Array.isArray(cfg.multiCharKeys) && cfg.multiCharKeys.length > 0) ||
        (typeof cfg.multiCharKeys === "string" && (cfg.multiCharKeys as string).length > 0));
    if (!hsck && !hmck) {
      const m = cfg?.markers
        ? (Array.isArray(cfg.markers) ? cfg.markers : (cfg.markers as string).split(""))
        : DEFAULT_HINT_MARKERS.split("");
      return this.generateFromMarkers(c, m);
    }
    if (hsck) {
      const sck = Array.isArray(cfg?.singleCharKeys)
        ? cfg.singleCharKeys
        : typeof cfg?.singleCharKeys === "string"
        ? (cfg.singleCharKeys as string).split("")
        : [];
      const msc = cfg?.maxSingleCharHints ?? sck.length;
      const scc = Math.min(r, msc, sck.length);
      if (scc > 0) {
        h.push(...this.singleCharStrategy.generate(scc, cfg));
        r -= scc;
      }
    }
    if (r > 0 && hmck) {
      const mch = this.multiCharStrategy.generate(r, cfg);
      h.push(...mch);
      r -= mch.length;
    }
    if (r > 0 && cfg?.useNumericMultiCharHints) {
      const nh = this.numericStrategy.generate(r, cfg);
      h.push(...nh);
    }
    return h;
  }
  private generateFromMarkers(c: number, m: string[]): string[] {
    const h: string[] = [];
    h.push(...m.slice(0, Math.min(c, m.length)));
    const r = c - m.length;
    if (r > 0) {
      const mdh = m.length * m.length;
      const adh = Math.min(r, mdh);
      for (let i = 0; i < adh; i++) h.push(m[Math.floor(i / m.length)] + m[i % m.length]);
    }
    return h.slice(0, c);
  }
  canHandle(c: number, cfg?: HintKeyConfig): boolean {
    return c > 0;
  }
}
export class HintGeneratorFactory {
  private static strategies: HintGenerationStrategy[] = [
    new HybridHintStrategy(),
    new SingleCharHintStrategy(),
    new MultiCharHintStrategy(),
    new NumericHintStrategy(),
  ];
  static generate(c: number, cfg?: HintKeyConfig): string[] {
    if (cfg?.useNumericMultiCharHints && !cfg.singleCharKeys && !cfg.multiCharKeys) {
      return new NumericHintStrategy().generate(c, cfg);
    }
    const ss = [...this.strategies].sort((a, b) => b.priority - a.priority);
    for (const s of ss) if (s.canHandle(c, cfg)) return s.generate(c, cfg);
    return new HybridHintStrategy().generate(c, cfg);
  }
  static registerStrategy(s: HintGenerationStrategy): void {
    this.strategies.push(s);
  }
  static getStrategies(): readonly HintGenerationStrategy[] {
    return this.strategies;
  }
}
