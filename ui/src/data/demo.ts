/** Demo content used by the two tool overlays. */

export const SAMPLE_ZAWGYI_PAGES: string[] = [
  "ျမန္မာႏိုင္ငံ ပညာေရး ဝန္ႀကီးဌာန\nအစီရင္ခံစာ (၂၀၁၄ ခုႏွစ္)\n\nေက်ာင္းသား ဦးေရ တိုးတက္မႈႏွင့္ ပတ္သက္၍ ေလ့လာခ်က္မ်ားကို ေအာက္ပါအတိုင္း တင္ျပအပ္ပါသည္။",
  "အခန္း (၁) — နိဒါန္း\n\nဤစာတမ္းသည္ ၂၀၀၆ ခုႏွစ္မွ ၂၀၁၈ ခုႏွစ္အတြင္း ထုတ္ေဝခဲ့ေသာ စာရြက္စာတမ္းမ်ားကို ျပန္လည္ စိစစ္ထားျခင္း ျဖစ္ပါသည္။",
  "အခန္း (၂) — နည္းစနစ္\n\nေဖာင့္ ligature အစီအစဥ္ မွားယြင္းမႈေၾကာင့္ ကူးယူ၍ မရေသာ စာသားမ်ားကို Unicode သို႔ ေျပာင္းလဲ ေပးပါသည္။",
];

export const SAMPLE_GRAMMAR_TEXT = `ယနေ့ ခေတ် နည်းပညာ တိုးတက်လာမှုကြောင့် ကျွန်တော်တို့များ အလုပ်လုပ်ရာတွင် အဆင်ပြေမှု များစွာ ရှိသည်ပါသည် ။
ရုံးစာရွက်စာတမ်းများကို စနစ်တကျ မသိမ်းဆည်းပါက အချက် အလက် ဆုံးရှုံးနိုင်ပါသည်။သို့သော် ယခုအခါ ဒစ်ဂျစ်တယ် စနစ်ဖြင့် သိမ်းဆည်းနိုင်ပါပြီ။
Our team reviewed teh document in order to verify the the numbers,and dont forget the appendix.`;

export const FILE_TARGETS = [
  { id: "txt", label: ".TXT", hint: "Plain UTF-8 text", accent: "#2b59ff" },
  { id: "docx", label: ".DOCX", hint: "Word compatible", accent: "#7c5cff" },
  { id: "md", label: ".MD", hint: "Markdown notes", accent: "#00b8a9" },
];

export const PIPELINE_STEPS = [
  { key: "read", label: "Reading document", mm: "ဖိုင် ဖတ်ယူခြင်း" },
  { key: "ocr", label: "Extracting glyph layer", mm: "စာလုံးအလွှာ ထုတ်ယူခြင်း" },
  { key: "map", label: "Mapping Zawgyi code points", mm: "ဇော်ဂျီ ကုဒ်များ တွဲချိန်ခြင်း" },
  { key: "order", label: "Re-ordering ligatures", mm: "ligature အစီအစဉ် ပြန်စီခြင်း" },
  { key: "done", label: "Unicode text ready", mm: "ယူနီကုဒ် စာသား ပြီးပါပြီ" },
];
