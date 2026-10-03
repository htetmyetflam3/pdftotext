// Sample Burmese spelling and grammar issues for the separate review preview.
export interface GrammarIssue {
  id: string;
  original: string;
  suggestion: string;
  reason: string;
  ruleCategory: 'Spelling' | 'Grammar' | 'Punctuation' | 'Font Standardization';
  index: number;
}

export const SAMPLE_GRAMMAR_DOC = {
  rawText: `ယနေ႕ခေတ္ နည်းပညာ တို႕တက်လာမူကြောင့် ကျွန်တော်တို အလုပ်လုပ်ရာတွင် အဆင်ပြေခြင်များစွာ ရှိလာပါတယ္။ ရုံးစာရွက်စာတမ်းမျာကို စနစ်တကျ မသိမ်းစည်းပါက အချက်လက် ဆုံးရှုံးနိုင်ပါသည်။`,
  correctedText: `ယနေ့ခေတ် နည်းပညာ တိုးတက်လာမှုကြောင့် ကျွန်တော်တို့ အလုပ်လုပ်ရာတွင် အဆင်ပြေခြင်းများစွာ ရှိလာပါသည်။ ရုံးစာရွက်စာတမ်းများကို စနစ်တကျ မသိမ်းဆည်းပါက အချက်အလက် ဆုံးရှုံးနိုင်ပါသည်။`,
  issues: [
    {
      id: "iss-1",
      original: "တို႕တက်လာမူ",
      suggestion: "တိုးတက်လာမှု",
      reason: "Zawgyi font artifact + Grammatical suffix 'မှု' vs 'မူ'",
      ruleCategory: "Spelling" as const,
      index: 18
    },
    {
      id: "iss-2",
      original: "ကျွန်တော်တို",
      suggestion: "ကျွန်တော်တို့",
      reason: "Missing tone marker (အောက်မြစ် 'တို့')",
      ruleCategory: "Spelling" as const,
      index: 34
    },
    {
      id: "iss-3",
      original: "အဆင်ပြေခြင်များစွာ",
      suggestion: "အဆင်ပြေခြင်းများစွာ",
      reason: "Missing dot below/consonant sign 'ခြင်း'",
      ruleCategory: "Spelling" as const,
      index: 52
    },
    {
      id: "iss-4",
      original: "စာရွက်စာတမ်းမျာကို",
      suggestion: "စာရွက်စာတမ်းများကို",
      reason: "Missing final killer/diacritic 'များ'",
      ruleCategory: "Grammar" as const,
      index: 82
    },
    {
      id: "iss-5",
      original: "မသိမ်းစည်းပါက",
      suggestion: "မသိမ်းဆည်းပါက",
      reason: "Correct spelling in Myanmar Orthography is 'သိမ်းဆည်း'",
      ruleCategory: "Spelling" as const,
      index: 104
    },
    {
      id: "iss-6",
      original: "အချက်လက်",
      suggestion: "အချက်အလက်",
      reason: "Compound noun completeness: 'အချက်အလက်'",
      ruleCategory: "Grammar" as const,
      index: 119
    }
  ]
};
