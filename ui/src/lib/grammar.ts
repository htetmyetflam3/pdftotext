/** Lightweight rule-based Burmese + English proofreading engine. */

export type IssueKind = "spelling" | "grammar" | "spacing" | "style";

export type Issue = {
  id: string;
  kind: IssueKind;
  start: number;
  end: number;
  match: string;
  suggestion: string;
  title: string;
  detail: string;
};

type Rule = {
  kind: IssueKind;
  pattern: RegExp;
  suggestion: string | ((m: RegExpExecArray) => string);
  title: string;
  detail: string;
};

const RULES: Rule[] = [
  {
    kind: "spelling",
    pattern: /ကျွန်တော်တို့များ/g,
    suggestion: "ကျွန်တော်တို့",
    title: "အလိုအလျောက် ပြင်ဆင်ရန်",
    detail: "“တို့” နှင့် “များ” နှစ်ထပ် အများကိန်း ဖြစ်နေသည်။",
  },
  {
    kind: "spelling",
    pattern: /ဆောင်ရွက်ချက်များများ/g,
    suggestion: "ဆောင်ရွက်ချက်များ",
    title: "စာလုံးထပ်နေခြင်း",
    detail: "“များ” ကို နှစ်ကြိမ် ရေးထားသည်။",
  },
  {
    kind: "spelling",
    pattern: /သုံးစွဲသူများအား/g,
    suggestion: "သုံးစွဲသူများကို",
    title: "ဝိဘတ် အသုံးအနှုန်း",
    detail: "ရိုးရှင်းသော ရုံးသုံးစာအတွက် “ကို” က ပိုသင့်လျော်သည်။",
  },
  {
    kind: "spelling",
    pattern: /ယနေ့ ခေတ်/g,
    suggestion: "ယနေ့ခေတ်",
    title: "စာလုံးကွာဟမှု",
    detail: "“ယနေ့ခေတ်” ကို တစ်လုံးတည်း ရေးရသည်။",
  },
  {
    kind: "spelling",
    pattern: /အချက် အလက်/g,
    suggestion: "အချက်အလက်",
    title: "စာလုံးကွာဟမှု",
    detail: "“အချက်အလက်” သည် ပေါင်းစပ်နာမ် ဖြစ်သည်။",
  },
  {
    kind: "grammar",
    pattern: /ရှိသည်ပါသည်/g,
    suggestion: "ရှိပါသည်",
    title: "ဝါကျအဆုံးသတ် ထပ်နေခြင်း",
    detail: "“သည်” နှင့် “ပါသည်” ကို တွဲ၍ မသုံးသင့်ပါ။",
  },
  {
    kind: "grammar",
    pattern: /နိုင်ပါသည်။သို့သော်/g,
    suggestion: "နိုင်ပါသည်။ သို့သော်",
    title: "ဝါကျခြားနေရာ",
    detail: "ပုဒ်မအပြီး နေရာလွတ် တစ်ခု ခြားရန် လိုသည်။",
  },
  {
    kind: "spacing",
    pattern: /\s+([။၊])/g,
    suggestion: "$1",
    title: "ပုဒ်မ/ပုဒ်ဖြတ် ရှေ့တွင် နေရာလွတ်",
    detail: "မြန်မာ ပုဒ်မ (။) နှင့် ပုဒ်ဖြတ် (၊) ရှေ့တွင် နေရာလွတ် မထားရပါ။",
  },
  {
    kind: "spacing",
    pattern: /([။၊])(?=[^\s\n။၊])/g,
    suggestion: "$1 ",
    title: "ပုဒ်မ နောက်တွင် နေရာလွတ်",
    detail: "ဖတ်ရလွယ်ကူစေရန် ပုဒ်မအပြီး နေရာလွတ် ထားသင့်သည်။",
  },
  {
    kind: "spacing",
    pattern: / {2,}/g,
    suggestion: " ",
    title: "Double space",
    detail: "More than one space between words.",
  },
  {
    kind: "grammar",
    pattern: /\b(\w+) \1\b/gi,
    suggestion: (m) => m[1],
    title: "Repeated word",
    detail: "The same word appears twice in a row.",
  },
  {
    kind: "spacing",
    pattern: /,(?=[^\s\d])/g,
    suggestion: ", ",
    title: "Missing space after comma",
    detail: "Add a space after the comma.",
  },
  {
    kind: "style",
    pattern: /\bin order to\b/gi,
    suggestion: "to",
    title: "Wordy phrase",
    detail: "“in order to” can usually be shortened to “to”.",
  },
  {
    kind: "style",
    pattern: /\bvery unique\b/gi,
    suggestion: "unique",
    title: "Redundant intensifier",
    detail: "“unique” is already absolute.",
  },
  {
    kind: "grammar",
    pattern: /\bteh\b/gi,
    suggestion: "the",
    title: "Typo",
    detail: "Common misspelling of “the”.",
  },
  {
    kind: "grammar",
    pattern: /\bdont\b/gi,
    suggestion: "don't",
    title: "Missing apostrophe",
    detail: "Contractions need an apostrophe.",
  },
];

export function checkText(text: string): Issue[] {
  const issues: Issue[] = [];
  RULES.forEach((rule, ri) => {
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);
    let m: RegExpExecArray | null;
    let guard = 0;
    while ((m = re.exec(text)) !== null && guard < 200) {
      guard += 1;
      if (m[0].length === 0) {
        re.lastIndex += 1;
        continue;
      }
      const suggestion =
        typeof rule.suggestion === "function"
          ? rule.suggestion(m)
          : m[0].replace(new RegExp(rule.pattern.source, rule.pattern.flags.replace("g", "")), rule.suggestion);
      if (suggestion === m[0]) continue;
      issues.push({
        id: `r${ri}-${m.index}`,
        kind: rule.kind,
        start: m.index,
        end: m.index + m[0].length,
        match: m[0],
        suggestion,
        title: rule.title,
        detail: rule.detail,
      });
    }
  });
  return issues.sort((a, b) => a.start - b.start);
}

export function applyIssue(text: string, issue: Issue): string {
  return text.slice(0, issue.start) + issue.suggestion + text.slice(issue.end);
}

export function applyAll(text: string): string {
  let out = text;
  let pass = 0;
  while (pass < 6) {
    const issues = checkText(out);
    if (!issues.length) break;
    out = applyIssue(out, issues[0]);
    pass += 1;
  }
  return out;
}

export function scoreOf(text: string, issues: Issue[]): number {
  const words = Math.max(text.trim().split(/\s+/).filter(Boolean).length, 1);
  const penalty = Math.min(1, (issues.length * 6) / words);
  return Math.max(38, Math.round((1 - penalty) * 100));
}
