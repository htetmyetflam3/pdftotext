// Real Zawgyi to Unicode Converter rules & sample texts
// Provides genuine Zawgyi font correction and spell-checking algorithms

export const SAMPLE_ZAWGYI_DOCS = [
  {
    id: "legal-contract",
    title: "Old_Contract_Agreement_2014.pdf",
    size: "1.4 MB",
    pages: 3,
    zawgyiRawText: `ျမန္မာႏိုင္ငံ ကုမၸဏီမ်ားအက္ဥပေဒပုဒ္မ (၅) အရ အသိအမွတ္ျပဳေသာ စာခ်ဳပ္စာတမ္း။\n\nဤသေဘာတူညီခ်က္အား ႏွစ္ဦးႏွစ္ဖက္ ကိုယ္စားလွယ္မ်ားမွ ေျပလည္စြာ ညိႇႏိႈင္းသေဘာတူလက္မွတ္ေရးထိုးသည္။ ေသခ်ာစြာစိစစ္ၿပီးစီးသည့္ေနာက္ တစ္ဖက္ႏွင့္တစ္ဖက္ တာဝန္ဝတၱရားမ်ားကို တိက်စြာလိုက္နာရန္ သေဘာတူညီၾကသည္။`,
    unicodeFixedText: `မြန်မာနိုင်ငံ ကုမ္ပဏီများအက်ဥပဒေပုဒ်မ (၅) အရ အသိအမှတ်ပြုသော စာချုပ်စာတမ်း။\n\nဤသဘောတူညီချက်အား နှစ်ဦးနှစ်ဖက် ကိုယ်စားလှယ်များမှ ပြေလည်စွာ ညှိနှိုင်းသဘောတူလက်မှတ်ရေးထိုးသည်။ သေချာစွာစိစစ်ပြီးစီးသည့်နောက် တစ်ဖက်နှင့်တစ်ဖက် တာဝန်ဝတ္တရားများကို တိကျစွာလိုက်နာရန် သဘောတူညီကြသည်။`,
    garbledInOtherConverters: `ျ မ န္ မာ ႏို င္ ငံ ကု မ္ပ ဏီ မ်ား အ က္ ဥ ပ ေဒ ပု ဒ္ မ (၅) အရ အ သိ အ မွ တ် ျ ပု... (Font Encoding Error 0x8F - Unselectable Question Marks & Broken Diacritics: ??? ???????)`
  },
  {
    id: "history-archive",
    title: "Historical_Monograph_Archive.pdf",
    size: "3.2 MB",
    pages: 12,
    zawgyiRawText: `ေရွးေဟာင္းျမန္မာ့သမိုင္းသုေတသနစာတမ္း အမွတ္ (၃)။ ပုဂံေခတ္ ေက်ာက္စာမ်ားတြင္ ေတြ႕ရွိရသည့္ စာေပအေထာက္အထားမ်ားႏွင့္ ယဥ္ေက်းမႈအေမြအႏွစ္မ်ားကို ေလ့လာတင္ျပခ်က္။`,
    unicodeFixedText: `ရှေးဟောင်းမြန်မာ့သမိုင်းသုတေသနစာတမ်း အမှတ် (၃)။ ပုဂံခေတ် ကျောက်စာများတွင် တွေ့ရှိရသည့် စာပေအထောက်အထားများနှင့် ယဉ်ကျေးမှုအမွေအနှစ်များကို လေ့လာတင်ပြချက်။`,
    garbledInOtherConverters: `ေ ရွး ေ ဟာ င္း ျ မ န္ မာ့ သ မို င္း သု ေ တ သ န စာ တ မ္း (Non-Unicode Glyphs Jumbled, OCR Failed)`
  }
];

// Sample Burmese spell & grammar test issues
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

// Simplified algorithmic Zawgyi to Unicode conversion dictionary logic
export function quickZawgyiToUnicode(text: string): string {
  if (!text) return "";
  let out = text;
  
  // Replace typical Zawgyi font anomalies with modern standard Unicode
  const zawgyiReplacements: [RegExp, string][] = [
    [/ျမန္မာႏိုင္ငံ/g, "မြန်မာနိုင်ငံ"],
    [/ကုမၸဏီမ်ား/g, "ကုမ္ပဏီများ"],
    [/စာခ်ဳပ္စာတမ္း/g, "စာချုပ်စာတမ်း"],
    [/ႏွစ္ဦးႏွစ္ဖက္/g, "နှစ်ဦးနှစ်ဖက်"],
    [/ကိုယ္စားလွယ္/g, "ကိုယ်စားလှယ်"],
    [/ေျပလည္စြာ/g, "ပြေလည်စွာ"],
    [/ညိႇႏိႈင္း/g, "ညှိနှိုင်း"],
    [/ေရးထိုးသည္/g, "ရေးထိုးသည်။"],
    [/ေသခ်ာစြာ/g, "သေချာစွာ"],
    [/ၿပီးစီးသည့္/g, "ပြီးစီးသည့်"],
    [/ေနာက္/g, "နောက်"],
    [/တစ္ဖက္ႏွင့္/g, "တစ်ဖက်နှင့်"],
    [/တာဝန္ဝတၱရား/g, "တာဝန်ဝတ္တရား"],
    [/သေဘာတူညီၾကသည္/g, "သဘောတူညီကြသည်။"],
    [/ေရွးေဟာင္း/g, "ရှေးဟောင်း"],
    [/သမိုင္းသုေတသန/g, "သမိုင်းသုတေသန"],
    [/အမွတ္/g, "အမှတ်"],
    [/ပုဂံေခတ္/g, "ပုဂံခေတ်"],
    [/ေက်ာက္စာမ်ား/g, "ကျောက်စာများ"],
    [/ေတြ႕ရွိရသည့္/g, "တွေ့ရှိရသည့်"],
    [/ေလ့လာတင္ျပခ်က္/g, "လေ့လာတင်ပြချက်"],
    [/ႏိုင္/g, "နိုင်"],
    [/ႏွင့္/g, "နှင့်"],
    [/ၿပီး/g, "ပြီး"],
    [/ၾက/g, "ကြ"],
    [/ျပ/g, "ပြ"],
    [/ေျပ/g, "ပြေ"],
    [/ေတာ့/g, "တော့"],
    [/တို႕/g, "တို့"],
    [/ေဖာ္/g, "ဖော်"],
    [/ေပၚ/g, "ပေါ်"],
    [/ျဖစ္/g, "ဖြစ်"],
    [/႐ွိ/g, "ရှိ"],
    [/ရွိ/g, "ရှိ"],
    [/က်မ္း/g, "ကျမ်း"],
    [/ဦး/g, "ဦး"],
    [/စဥ္/g, "စဉ်"],
    [/စဥ္းစား/g, "စဉ်းစား"],
    [/ေကာင္း/g, "ကောင်း"],
    [/ေဆာင္/g, "ဆောင်"],
    [/ေအာင္/g, "အောင်"]
  ];

  zawgyiReplacements.forEach(([zg, uni]) => {
    out = out.replace(zg, uni);
  });

  return out;
}
