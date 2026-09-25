/**
 * Compact Zawgyi-One -> Myanmar Unicode converter.
 * A practical subset of the well known rule-based mapping: code-point
 * normalisation first, then vowel / medial re-ordering.
 */

type Rule = [RegExp, string];

const NORMALISE: Rule[] = [
  [/\u106a/g, "\u1009"],
  [/\u106b/g, "\u100a"],
  [/\u106c/g, "\u1039\u1000"],
  [/\u106d/g, "\u1039\u1001"],
  [/\u106e/g, "\u100d\u1039\u100d"],
  [/\u106f/g, "\u100d\u1039\u100e"],
  [/\u1070/g, "\u1039\u1002"],
  [/\u1071|\u1072/g, "\u1039\u1004"],
  [/\u1073|\u1074/g, "\u1039\u1005"],
  [/\u1075/g, "\u1039\u1007"],
  [/\u1076/g, "\u1039\u100a"],
  [/\u1077/g, "\u1039\u100b"],
  [/\u1078/g, "\u1039\u100c"],
  [/\u1079/g, "\u1039\u100d"],
  [/\u107a/g, "\u1039\u100f"],
  [/\u107b/g, "\u1039\u1010"],
  [/\u107c/g, "\u1039\u1011"],
  [/\u107d/g, "\u103a"],
  [/\u107e|\u107f|\u1080|\u1081|\u1082|\u1083|\u1084/g, "\u103b"],
  [/\u1085/g, "\u1039\u101a"],
  [/\u1086/g, "\u103f"],
  [/\u1087|\u1088|\u1089|\u108a/g, "\u103e"],
  [/\u108b/g, "\u1064\u102d"],
  [/\u108c/g, "\u1064\u102e"],
  [/\u108d/g, "\u1064\u1036"],
  [/\u108e/g, "\u102d\u1036"],
  [/\u108f/g, "\u1014"],
  [/\u1090/g, "\u101b"],
  [/\u1091/g, "\u100f\u1039\u100d"],
  [/\u1019\u102c(\u107b|\u1093)/g, "\u1019\u1039\u1018\u102c"],
  [/\u1093/g, "\u1039\u1018"],
  [/\u1094|\u1095/g, "\u1037"],
  [/\u1096/g, "\u1039\u1010\u103d"],
  [/\u1097/g, "\u100b\u1039\u100b"],
  [/\u102f\u1036/g, "\u1036\u102f"],
  [/\u1025\u1039/g, "\u1009\u1039"],
  [/\u1025\u102e/g, "\u1026"],
  [/\u103c\u103a/g, "\u103a\u103c"],
];

const REORDER: Rule[] = [
  // kinzi
  [/\u1064/g, "\u1004\u103a\u1039"],
  [/([\u1000-\u1021])(\u1004\u103a\u1039)/g, "$2$1"],
  // e-vowel goes after its consonant (+ medials)
  [/\u1031([\u1000-\u1021])(\u103b|\u103c)?(\u103d)?(\u103e)?/g, "$1$2$3$4\u1031"],
  // medial ra wraps the consonant
  [/\u103c([\u1000-\u1021])/g, "$1\u103c"],
  // medial ordering: ya, ra, wa, ha
  [/(\u103d)(\u103b|\u103c)/g, "$2$1"],
  [/(\u103e)(\u103b|\u103c|\u103d)/g, "$2$1"],
  // vowel sign ordering
  [/(\u102f|\u1030)(\u102d|\u102e)/g, "$2$1"],
  [/(\u1037)(\u102f|\u1030|\u102d|\u102e|\u1036)/g, "$2$1"],
  [/\u1036(\u102f|\u1030)/g, "\u1036$1"],
  [/\s+([\u102b-\u103e])/g, "$1"],
];

export function isLikelyZawgyi(text: string): boolean {
  if (!text) return false;
  const zawgyiOnly = /[\u1060-\u1097]/.test(text);
  const misplacedE = /\u1031[\u1000-\u1021]/.test(text);
  const misplacedRa = /\u103b[\u1000-\u1021]/.test(text);
  return zawgyiOnly || misplacedE || misplacedRa;
}

export function zawgyiToUnicode(input: string): string {
  let out = input;
  for (const [re, rep] of NORMALISE) out = out.replace(re, rep);
  for (const [re, rep] of REORDER) out = out.replace(re, rep);
  return out;
}

export function textStats(text: string) {
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lines = text ? text.split(/\n/).length : 0;
  const myanmar = (text.match(/[\u1000-\u109f]/g) || []).length;
  return { chars, words, lines, myanmar };
}
