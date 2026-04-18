import { CacheType, GlobalCache } from "../../../cache.ts";
export enum CharType {
  Hiragana = "hiragana",
  Katakana = "katakana",
  Kanji = "kanji",
  Alphanumeric = "alphanumeric",
  Symbol = "symbol",
  Space = "space",
  Other = "other",
}
export interface AdjacentAnalysis {
  type: CharType;
  start: number;
  end: number;
  text: string;
}
const charTypeCache = GlobalCache.getInstance().getCache<string, CharType>(CacheType.CHAR_TYPE);
export function getCharType(c: string): CharType {
  if (!c || c.length === 0) return CharType.Other;
  const cached = charTypeCache.get(c);
  if (cached !== undefined) return cached;
  const code = c.codePointAt(0);
  if (code === undefined) {
    charTypeCache.set(c, CharType.Other);
    return CharType.Other;
  }
  let r: CharType;
  if (c === " " || c === "　" || c === "\t" || c === "\n" || c === "\r") r = CharType.Space;
  else if (code >= 0x3040 && code <= 0x309F) r = CharType.Hiragana;
  else if (code >= 0x30A0 && code <= 0x30FF) r = CharType.Katakana;
  else if (code >= 0x4E00 && code <= 0x9FFF) r = CharType.Kanji;
  else if (
    (code >= 0x0030 && code <= 0x0039) || (code >= 0x0041 && code <= 0x005A) ||
    (code >= 0x0061 && code <= 0x007A)
  ) r = CharType.Alphanumeric;
  else if (
    (code >= 0x0020 && code <= 0x002F) || (code >= 0x003A && code <= 0x0040) ||
    (code >= 0x005B && code <= 0x0060) || (code >= 0x007B && code <= 0x007E) ||
    (code >= 0x3000 && code <= 0x303F) || (code >= 0xFF00 && code <= 0xFFEF)
  ) r = CharType.Symbol;
  else r = CharType.Other;
  charTypeCache.set(c, r);
  return r;
}
export function analyzeString(t: string): AdjacentAnalysis[] {
  if (!t || t.length === 0) return [];
  const res: AdjacentAnalysis[] = [];
  let ct = getCharType(t[0]);
  let s = 0;
  for (let i = 1; i <= t.length; i++) {
    const cht = i < t.length ? getCharType(t[i]) : null;
    if (cht !== ct || i === t.length) {
      res.push({ type: ct, start: s, end: i, text: t.slice(s, i) });
      if (cht !== null) {
        ct = cht;
        s = i;
      }
    }
  }
  return res;
}
export function findBoundaries(t: string): number[] {
  if (!t || t.length === 0) return [0];
  const b = new Set<number>();
  b.add(0);
  for (let i = 1; i < t.length; i++) {
    const pc = t[i - 1];
    const cc = t[i];
    const pt = getCharType(pc);
    const ct = getCharType(cc);
    if (pt !== ct) b.add(i);
    if (
      pt === CharType.Alphanumeric && ct === CharType.Alphanumeric && pc >= "a" && pc <= "z" &&
      cc >= "A" && cc <= "Z"
    ) b.add(i);
    if (ct === CharType.Symbol && pt !== CharType.Symbol) b.add(i);
    if (pt === CharType.Symbol && ct !== CharType.Symbol) b.add(i);
  }
  b.add(t.length);
  return Array.from(b).sort((a, b) => a - b);
}
const particleSet = new Set([
  "の",
  "が",
  "を",
  "に",
  "で",
  "と",
  "は",
  "も",
  "から",
  "まで",
  "より",
]);
const connectorSet = new Set(["そして", "また", "しかし", "だから", "それで", "ところで"]);
const verbEndingSet = new Set(["する", "され", "でき", "れる", "られ"]);
export function shouldMerge(ps: string, cs: string, ns?: string): boolean {
  if (particleSet.has(cs)) return true;
  if (connectorSet.has(cs)) return true;
  const pt = ps.length > 0 ? getCharType(ps[ps.length - 1]) : null;
  const ct = cs.length > 0 ? getCharType(cs[0]) : null;
  if (pt === CharType.Kanji && ct === CharType.Hiragana) {
    for (const e of verbEndingSet) if (cs.startsWith(e)) return true;
  }
  if (pt === CharType.Katakana && ct === CharType.Katakana) return true;
  return false;
}
export function clearCharTypeCache(): void {
  charTypeCache.clear();
}
export function isHiragana(c: string): boolean {
  return getCharType(c) === CharType.Hiragana;
}
export function isKatakana(c: string): boolean {
  return getCharType(c) === CharType.Katakana;
}
export function isKanji(c: string): boolean {
  return getCharType(c) === CharType.Kanji;
}
export function isAlphanumeric(c: string): boolean {
  return getCharType(c) === CharType.Alphanumeric;
}
export function isSymbol(c: string): boolean {
  return getCharType(c) === CharType.Symbol;
}
export function isSpace(c: string): boolean {
  return getCharType(c) === CharType.Space;
}
export function containsJapanese(t: string): boolean {
  for (let i = 0; i < t.length; i++) {
    const ty = getCharType(t[i]);
    if (ty === CharType.Hiragana || ty === CharType.Katakana || ty === CharType.Kanji) return true;
  }
  return false;
}
export function isAllJapanese(t: string): boolean {
  if (!t || t.length === 0) return false;
  for (let i = 0; i < t.length; i++) {
    const ty = getCharType(t[i]);
    if (
      ty !== CharType.Hiragana && ty !== CharType.Katakana && ty !== CharType.Kanji &&
      ty !== CharType.Space
    ) return false;
  }
  return true;
}
