/**
 * Is there readable Burmese in this text?
 *
 * The gate probes extracted text with the Myanmar character class:
 *
 *     [\u1000-\u109F\uA9E0-\uA9FF\uAA60-\uAA7F]
 *
 * A bare match on that class is not enough to accept a document, and the
 * repo's own 100-page fixture is the proof. Run PDF.js over
 * `public/samples/sample.pdf` (a Zawgyi document) and you get 1,042 characters
 * from that class across the whole file — and **zero** Myanmar letters. Every
 * single match is punctuation or a digit:
 *
 *     ။ ×893   ၍ ×44   ၊ ×24   ၁ ×19   ၀ ×18   ၂ ×11   …
 *
 * Those code points survive because they are font-independent; the consonants
 * are the part a Zawgyi font mapping destroys. So `MYANMAR.test(text)` returns
 * true for exactly the document the prompt is meant to catch.
 *
 * The verdict therefore counts the subset of that same class that actually
 * carries words — letters and independent vowels, with the digit block
 * (U+1040–U+1049) and the punctuation/symbol block (U+104A–U+104F) removed.
 *
 * This number is load-bearing: it is what decides `method`, and `method`
 * decides whether the praser runs at all. A false "readable" sends
 * `method: "default"`, which tells the manager to skip the praser — on a
 * Zawgyi document that is the one outcome we must never produce.
 */

/** the probe class, verbatim — "is there anything Myanmar-shaped in here at all" */
export const MYANMAR = /[\u1000-\u109F\uA9E0-\uA9FF\uAA60-\uAA7F]/;

/** same class, global, for counting */
export const MYANMAR_ALL = /[\u1000-\u109F\uA9E0-\uA9FF\uAA60-\uAA7F]/g;

/**
 * The part of the class that is a letter rather than a digit or a mark:
 * consonants and independent vowels (U+1000–U+102A), U+103F great sa,
 * U+104E the `၎` symbol, and the Shan / Mon / Tai letter ranges.
 */
export const MYANMAR_LETTERS =
  /[\u1000-\u102A\u103F\u104E\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\uA9E0-\uA9E4\uA9E7-\uA9EF\uA9FA-\uA9FE\uAA60-\uAA76\uAA7A\uAA7E-\uAA7F]/g;

/** a document needs this many Myanmar letters before it counts as readable */
export const MIN_LETTERS = 12;

export type ScriptVerdict = {
  /** the user's class matched at least once */
  matched: boolean;
  /** how many characters of that class are present */
  myanmarChars: number;
  /** how many of them are letters rather than digits or punctuation */
  myanmarLetters: number;
  /** letters as a share of all non-whitespace characters */
  density: number;
  /** the accept decision: letters, not bare matches */
  readable: boolean;
  /**
   * `none`       — no Myanmar at all (an English or empty document)
   * `unreadable` — Myanmar punctuation/digits survived but the letters did
   *                not: the Zawgyi signature
   * `myanmar`    — real Burmese letters came through
   */
  kind: "none" | "unreadable" | "myanmar";
};

export function probeScript(text: string): ScriptVerdict {
  const source = text ?? "";
  const myanmarChars = (source.match(MYANMAR_ALL) || []).length;
  const myanmarLetters = (source.match(MYANMAR_LETTERS) || []).length;
  const nonWhitespace = source.replace(/\s/g, "").length;
  const readable = myanmarLetters >= MIN_LETTERS;

  return {
    matched: MYANMAR.test(source),
    myanmarChars,
    myanmarLetters,
    density: nonWhitespace ? myanmarLetters / nonWhitespace : 0,
    readable,
    kind: readable ? "myanmar" : myanmarChars > 0 ? "unreadable" : "none",
  };
}
