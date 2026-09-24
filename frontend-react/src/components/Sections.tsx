import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Minus,
  Plus,
  ArrowUpRight,
  ScanText,
  Layers,
  ShieldCheck,
  Keyboard,
} from "lucide-react";
import { Mark } from "./Nav";

const EASE: [number, number, number, number] = [0.2, 0.8, 0.2, 1];

function Reveal({
  children,
  delay = 0,
  className = "",
  y = 28,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.75, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionLabel({ n, en, mm }: { n: string; en: string; mm: string }) {
  return (
    <div className="flex items-baseline gap-4">
      <span className="font-mono2 text-[0.75rem] text-[#c63b26]">{n}</span>
      <span className="micro text-[#a9a093]">{en}</span>
      <span className="mm ml-auto text-[0.85rem] text-[#7a7266]">{mm}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function SocialProof() {
  const stats = [
    { v: "၁၂၄,၀၀၀+", l: "pages converted" },
    { v: "99.4%", l: "text accuracy" },
    { v: "၈ စက္ကန့်", l: "avg. 10-page run" },
    { v: "4.9 / 5", l: "myanmar writers" },
  ];
  const tags = [
    "တက္ကသိုလ်ကျောင်းသား",
    "စာပေထုတ်ဝေသူ",
    "ဥပဒေရှေ့နေ",
    "သတင်းထောက်",
    "ကျောင်းဆရာ/ဆရာမ",
    "NGO အဖွဲ့",
    "ဘုန်းကြီးကျောင်း",
    "စာရေးသူ",
    "တရားရုံး",
    "စာကြည့်တိုက်",
  ];

  return (
    <section className="border-y border-[#0e1626]/12 bg-[#efe6d3]/55">
      <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.l} delay={i * 0.08}>
              <div className="border-l border-[#0e1626]/15 pl-5">
                <div className="mm-display text-[clamp(1.9rem,3vw,2.7rem)] font-bold leading-none text-[#0e1626]">
                  {s.v}
                </div>
                <div className="micro mt-3 text-[#7a7266]">{s.l}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden border-t border-[#0e1626]/12 py-3.5">
        <div className="marquee-track flex w-max gap-10 whitespace-nowrap">
          {[...tags, ...tags].map((t, i) => (
            <span key={i} className="mm flex items-center gap-3 text-[0.9rem] text-[#7a7266]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c63b26]" />
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const STEPS = [
  {
    n: "01",
    t: "ဖိုင်ကို တင်ပါ",
    d: "Zawgyi နဲ့ ရေးထားတဲ့ PDF ဖိုင်ကို ဆွဲထည့်ပါ၊ ဒါမှမဟုတ် ရွေးချယ်ပါ။ စာမျက်နှာ ၅၀၀ အထိ တစ်ခါတည်း တင်နိုင်တယ်။",
    meta: "drag & drop · .pdf · 40 mb",
  },
  {
    n: "02",
    t: "encoding ခွဲခြမ်းပြီး ပြောင်းတယ်",
    d: "ဖောင်တော်ကို အလိုအလျောက် မှတ်သားပြီး U+1039/U+103A မှားသုံးမှု၊ asat ပျောက်မှုတွေကို ပြင်ကာ Unicode စာသားအဖြစ် ပြန်ရေးတယ်။",
    meta: "zawgyi detect · unicode nfc",
  },
  {
    n: "03",
    t: "ထုတ်ယူပြီး သုံးပါ",
    d: "ရလဒ်ကို ကူးယူ၊ .txt ဒေါင်းလုဒ်၊ Word အတွက် .docx ရယူ — စာလုံးအရွယ်နဲ့ စာကြောင်းခွဲမှု မပျက်ဘူး။",
    meta: "copy · .txt · .docx",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
      <Reveal>
        <SectionLabel n="01" en="how it works" mm="သုံးဆင့်ပဲ ရှိတယ်" />
        <h2 className="mm-display mt-6 max-w-[20ch] text-[clamp(2rem,4.6vw,3.4rem)] font-bold leading-[1.15] tracking-tight">
          တင်တာကနေ ဖတ်လို့ရတဲ့ စာသားထိ —{" "}
          <span className="bg-gradient-to-r from-[#c63b26] to-[#e0a63c] bg-clip-text text-transparent">
            စက္ကန့်ပိုင်းပဲ
          </span>
        </h2>
      </Reveal>

      <div className="mt-14 border-t border-[#0e1626]/15">
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.1}>
            <div
              className={`group grid gap-4 border-b border-[#0e1626]/15 py-9 md:grid-cols-[auto_1.1fr_1.4fr_auto] md:items-baseline md:gap-8`}
              style={{ paddingLeft: `${i * 24}px` }}
            >
              <span className="font-display text-[clamp(2.6rem,6vw,4.6rem)] font-black leading-none text-[#0e1626]/12 transition-colors duration-500 group-hover:text-[#c63b26]/70">
                {s.n}
              </span>
              <h3 className="mm-display text-[1.35rem] font-bold leading-snug text-[#0e1626]">
                {s.t}
              </h3>
              <p className="mm max-w-[56ch] text-[0.98rem] leading-[1.9] text-[#0e1626]/72">
                {s.d}
              </p>
              <span className="micro whitespace-nowrap text-[#a9a093]">{s.meta}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

type Cell = "no" | "part" | "yes";

const ROWS: { label: string; a: Cell; b: Cell; c: Cell; note?: string }[] = [
  { label: "Zawgyi PDF → ဖတ်နိုင်သော Unicode", a: "no", b: "part", c: "yes", note: "စာလုံး မပျက်" },
  { label: "ရွေးချယ်နိုင်၊ ကူးယူနိုင်သော စာသား", a: "no", b: "yes", c: "yes" },
  { label: ".txt / .docx ထုတ်ယူခြင်း", a: "part", b: "part", c: "yes" },
  { label: "မြန်မာ စာလုံးပေါင်း & ဝါကျ စစ်ဆေးခြင်း", a: "no", b: "no", c: "yes" },
  { label: "အစုလိုက် (batch) စီမံခြင်း", a: "part", b: "no", c: "yes" },
  { label: "ဖိုင် သိမ်းဆည်းမှု", a: "part", b: "part", c: "yes" },
  { label: "စျေးနှုန်း", a: "part", b: "part", c: "yes" },
];

const HEAD = ["အခြား PDF → Text ကိရိယာ", "OCR စနစ်ကြီးများ", "AKKHARA"];

function Mark4({ kind }: { kind: Cell }) {
  if (kind === "yes")
    return (
      <span className="inline-flex items-center gap-2 text-[#7ee0b4]">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#2e7d5b]">
          <Check size={14} strokeWidth={3} color="#eafff5" />
        </span>
        <span className="micro hidden lg:inline">full</span>
      </span>
    );
  if (kind === "part")
    return (
      <span className="inline-flex items-center gap-2 text-[#e0a63c]">
        <span className="grid h-6 w-6 place-items-center rounded-full border border-[#e0a63c]/60">
          <Minus size={13} strokeWidth={3} />
        </span>
        <span className="micro hidden lg:inline">partial</span>
      </span>
    );
  return (
    <span className="inline-flex items-center gap-2 text-[#f7f2e7]/45">
      <span className="grid h-6 w-6 place-items-center rounded-full border border-[#f7f2e7]/25">
        <Minus size={13} strokeWidth={3} />
      </span>
      <span className="micro hidden lg:inline">none</span>
    </span>
  );
}

export function Compare() {
  const rowNote: Record<string, [string, string, string]> = {
    "Zawgyi PDF → ဖတ်နိုင်သော Unicode": ["mojibake", "စာကြောင်း အလိုက်သာ", "အပြည့်အစုံ"],
    "ရွေးချယ်နိုင်၊ ကူးယူနိုင်သော စာသား": ["ပုံအဖြစ်သာ", "ရွေးနိုင်တယ်", "ရွေးနိုင် ကူးနိုင်"],
    ".txt / .docx ထုတ်ယူခြင်း": ["txt သာ", "pdf ပြန်သာ", "txt + docx"],
    "မြန်မာ စာလုံးပေါင်း & ဝါကျ စစ်ဆေးခြင်း": ["မရှိ", "မရှိ", "built-in"],
    "အစုလိုက် (batch) စီမံခြင်း": ["အနည်းငယ်သာ", "မရှိ", "၅၀၀ ဖိုင်အထိ"],
    "ဖိုင် သိမ်းဆည်းမှု": ["အမြဲတမ်း သိမ်းထား", "cloud တွင်", "၁ နာရီအတွင်း ဖျက်"],
    စျေးနှုန်း: ["လစဥ် ကြေး", "စာရင်းအလိုက်", "အခမဲ့ စမ်း · ၁၉,၀၀၀ ကျပ်/လ"],
  };

  return (
    <section id="compare" className="ink-panel grain grain-dark relative overflow-hidden">
      <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <Reveal>
          <div className="flex items-baseline gap-4">
            <span className="font-mono2 text-[0.75rem] text-[#e0a63c]">02</span>
            <span className="micro text-[#f7f2e7]/45">comparison</span>
            <span className="mm ml-auto text-[0.85rem] text-[#f7f2e7]/50">
              တခြားကိရိယာတွေနဲ့ ချိန်ကြည့်ပါ
            </span>
          </div>
          <h2 className="mm-display mt-6 max-w-[24ch] text-[clamp(2rem,4.6vw,3.4rem)] font-bold leading-[1.15] text-[#f7f2e7]">
            တခြား converter တွေ ဘာလို့{" "}
            <span className="bg-gradient-to-r from-[#e0a63c] to-[#c63b26] bg-clip-text text-transparent">
              လုပ်မပေးနိုင်တာလဲ
            </span>
          </h2>
          <p className="mm mt-4 max-w-[64ch] text-[0.98rem] leading-[1.9] text-[#f7f2e7]/60">
            Zawgyi ဖောင်တော်ကို နားမလည်တဲ့ ကိရိယာတွေက စာလုံးကို စာလုံးအဖြစ်ပဲ ဖတ်တယ် —
            ရလဒ်က ဖတ်လို့မရတဲ့ စာသားပဲ ထွက်တယ်။ ကျွန်တော်တို့က စာပေကိုပါ ပြန်ရှင်းတယ်။
          </p>
        </Reveal>

        <Reveal delay={0.12} className="mt-10">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#f7f2e7]/20">
                  <th className="micro py-4 pr-4 font-medium text-[#f7f2e7]/45">criteria</th>
                  {HEAD.map((h, i) => (
                    <th
                      key={h}
                      className={`py-4 pr-4 text-[0.95rem] font-semibold ${
                        i === 2 ? "mm text-[#e0a63c]" : "mm text-[#f7f2e7]/75"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r, i) => (
                  <motion.tr
                    key={r.label}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ delay: i * 0.06, duration: 0.5, ease: EASE }}
                    className="group border-b border-[#f7f2e7]/10 transition-colors hover:bg-[#f7f2e7]/6"
                  >
                    <td className="mm py-4 pr-4 text-[0.93rem] text-[#f7f2e7]/85">{r.label}</td>
                    {([r.a, r.b, r.c] as Cell[]).map((cell, j) => (
                      <td key={j} className="py-4 pr-4 align-middle">
                        <Mark4 kind={cell} />
                        <div
                          className={`mm mt-1.5 text-[0.78rem] ${
                            j === 2 ? "text-[#7ee0b4]/85" : "text-[#f7f2e7]/45"
                          }`}
                        >
                          {rowNote[r.label]?.[j]}
                        </div>
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="micro mt-5 text-[#f7f2e7]/35">
            2026 market snapshot · competitor behaviour varies by plan
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const BENEFITS = [
  {
    icon: ScanText,
    t: "စာပေကို နားလည်တယ်",
    d: "Zawgyi ရော Unicode ရော — ဖောင်တော်ကို အလိုအလျောက် မှတ်သားပြီး ပြန်ပြင်ပေးတယ်။",
  },
  {
    icon: Layers,
    t: "စာမျက်နှာ အများကြီး",
    d: "၅၀၀ စာမျက်နှာအထိ တစ်ခါတည်း စီမံနိုင်ပြီး စာကြောင်း ခွဲမှု မပျက်ဘူး။",
  },
  {
    icon: ShieldCheck,
    t: "ဖိုင် လုံခြုံတယ်",
    d: "ဆာဗာတွင် ၁ နာရီအတွင်း အလိုအလျောက် ဖျက်ပစ်ပြီး တတိယဖက်ကို မပေးဘူး။",
  },
  {
    icon: Keyboard,
    t: "လက်ပေါ်လည်း အလုပ်လုပ်တယ်",
    d: "စာလုံးပေါင်းနဲ့ ဝါကျ စစ်ဆေးမှုကို ရိုက်ထားတဲ့ စာသားပေါ်မှာပဲ ချက်ချင်း ပြသတယ်။",
  },
  {
    icon: Check,
    t: "Word နဲ့ ကိုက်တယ်",
    d: ".docx ကို တန်းဖိုးထားတဲ့ Word file အဖြစ် ထုတ်ပေးတယ် — ပြန် format မလုပ်ရဘူး။",
  },
  {
    icon: ArrowUpRight,
    t: "မြန်မာနဲ့ ပြောတယ်",
    d: "interface အားလုံး မြန်မာဘာသာ — ဘာသာစကား အခက်အခဲ မရှိဘူး။",
  },
];

export function Benefits() {
  return (
    <section id="features" className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
      <Reveal>
        <SectionLabel n="03" en="why akkhara" mm="အကျိုးကျေးဇူး" />
        <h2 className="mm-display mt-6 max-w-[22ch] text-[clamp(2rem,4.6vw,3.4rem)] font-bold leading-[1.15] tracking-tight">
          နောက်တစ်ခါ စာလုံးပြင်နေရတဲ့ အချိန် မလိုတော့ဘူး
        </h2>
      </Reveal>

      <div className="mt-12 grid border-l border-t border-[#0e1626]/14 sm:grid-cols-2 lg:grid-cols-3">
        {BENEFITS.map((b, i) => (
          <Reveal key={b.t} delay={(i % 3) * 0.08}>
            <div className="group h-full border-b border-r border-[#0e1626]/14 p-7 transition-colors duration-500 hover:bg-[#fbf8f1]">
              <b.icon
                size={22}
                className="text-[#c63b26] transition-transform duration-500 group-hover:-translate-y-1"
                strokeWidth={1.6}
              />
              <h3 className="mm-display mt-5 text-[1.15rem] font-bold text-[#0e1626]">{b.t}</h3>
              <p className="mm mt-2.5 text-[0.92rem] leading-[1.9] text-[#0e1626]/68">{b.d}</p>
              <span className="micro mt-5 block text-[#a9a093] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                0{i + 1} / benefit
              </span>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const FAQ = [
  {
    q: "Zawgyi PDF ဆိုတာ ဘာလဲ၊ ဘာကြောင့် ဖတ်လို့မရတာလဲ။",
    a: "အရင်က Windows တွေမှာ သုံးခဲ့တဲ့ Zawgyi (WinBurmese) ဖောင်တော်က စာလုံးတွေကို Unicode နဲ့ မတူတဲ့ နေရာမှာ သိမ်းထားတယ်။ ဒါကြောင့် ပုံမှန် PDF → Text ကိရိယာတွေက ဖတ်လိုက်တာနဲ့ ဖတ်လို့မရတဲ့ စာသား (mojibake) ပဲ ထွက်တယ်။",
  },
  {
    q: "ကျွန်တော့်ဖိုင်ကို ဘယ်လောက်ကြာ ကြာလဲ။",
    a: "၁၀ စာမျက်နှာပါ PDF ကို ပျမ်းမျှ ၈ စက္ကန့်လောက်၊ ၅၀၀ စာမျက်နှာဆိုရင် ၂ မိနစ်ဝန်းကျင်။ စာမျက်နှာများလေ ကြာလေပေါ့။",
  },
  {
    q: "စာသား မှန်ရဲ့လား။",
    a: "Text-based PDF တွေမှာ ၉၉% ကျော် မှန်တယ်။ ပုံအဖြစ် scan လုပ်ထားတဲ့ PDF ဆိုရင်တော့ OCR လိုအပ်ပြီး အဲ့ဒါကို နောက်ထပ် ဗားရှင်းမှာ ထည့်နေတယ်။",
  },
  {
    q: "ဖိုင်တွေကို သိမ်းထားလား။",
    a: "မသိမ်းဘူး — တင်ပြီး ၁ နာရီအတွင်း ဆာဗာမှာ အလိုအလျောက် ဖျက်ပစ်တယ်။ တတိယဖက်နဲ့ မျှဝေတာ မရှိဘူး။",
  },
  {
    q: ".docx က ဘယ်လိုထွက်လဲ။",
    a: "ရလဒ် panel မှာ “.docx” ခလုတ်နှိပ်လိုက်ရုံပဲ။ Word မှာ တန်းဖွင့်လို့ရပြီး စာလုံးအရွယ်၊ စာပိုဒ် ခွဲမှုတွေ မပျက်ဘူး။",
  },
  {
    q: "စျေးနှုန်း ဘယ်လောက်လဲ။",
    a: "စမ်းသပ်ခွင့်က အခမဲ့ (နေ့စဉ် ၅ ဖိုင်)။ တစ်လကို ၁၉,၀၀၀ ကျပ်နဲ့ စာမျက်နှာ အကန့်အသတ်မဲ့၊ batch ခွင့်ပါဝင်တယ်။",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section
      id="faq"
      className="border-t border-[#0e1626]/12 bg-[#efe6d3]/40"
    >
      <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <SectionLabel n="04" en="faq" mm="မေးခွန်းများ" />
            <h2 className="mm-display mt-6 text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.15]">
              မေးလေ့ရှိတဲ့ မေးခွန်း ခြောက်ခု
            </h2>
            <p className="mt-4 max-w-[34ch] text-[0.9rem] leading-relaxed text-[#7a7266]">
              Still unsure? Write to us in Burmese — we answer within one working day.
            </p>
            <a
              href="mailto:hello@akkhara.mm"
              className="sweep font-mono2 mt-6 inline-block text-[0.9rem] text-[#c63b26]"
            >
              hello@akkhara.mm
            </a>
          </Reveal>

          <div className="border-t border-[#0e1626]/15">
            {FAQ.map((f, i) => {
              const isOpen = open === i;
              return (
                <Reveal key={f.q} delay={i * 0.05} y={16}>
                  <div className="border-b border-[#0e1626]/15">
                    <button
                      onClick={() => setOpen(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      className="flex w-full items-start gap-5 py-5 text-left"
                    >
                      <span className="font-mono2 mt-1 text-[0.75rem] text-[#a9a093]">
                        0{i + 1}
                      </span>
                      <span className="mm flex-1 text-[1.02rem] font-medium leading-snug text-[#0e1626]">
                        {f.q}
                      </span>
                      <span
                        className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-all duration-300 ${
                          isOpen
                            ? "rotate-180 border-[#c63b26] bg-[#c63b26] text-white"
                            : "border-[#0e1626]/25 text-[#0e1626]"
                        }`}
                      >
                        {isOpen ? <Minus size={14} /> : <Plus size={14} />}
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.4, ease: EASE }}
                          className="overflow-hidden"
                        >
                          <p className="mm max-w-[70ch] pb-6 pl-[3.1rem] pr-8 text-[0.95rem] leading-[1.95] text-[#0e1626]/72">
                            {f.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function CtaBand() {
  const openPdf = () => {
    document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => window.dispatchEvent(new CustomEvent("akkhara:open-pdf")), 450);
  };
  const openGrammar = () => {
    document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => window.dispatchEvent(new CustomEvent("akkhara:open-grammar")), 450);
  };

  return (
    <section className="relative overflow-hidden bg-[#0b1121]">
      <img
        src="images/band.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-55"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b1121] via-[#0b1121]/85 to-[#0b1121]/35" />
      <div className="relative mx-auto max-w-[1440px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <Reveal>
          <span className="micro text-[#e0a63c]">start now · ရန်ကုန်</span>
          <h2 className="mm-display mt-6 max-w-[18ch] text-[clamp(2.2rem,5.6vw,4.2rem)] font-bold leading-[1.1] text-[#f7f2e7]">
            ဖတ်လို့မရတဲ့ PDF ကို{" "}
            <span className="bg-gradient-to-r from-[#e0a63c] to-[#c63b26] bg-clip-text text-transparent">
              ဒီကနေ စမ်းကြည့်ပါ
            </span>
          </h2>
          <p className="mm mt-6 max-w-[56ch] text-[1rem] leading-[1.95] text-[#f7f2e7]/70">
            နမူနာဖိုင်နဲ့ ၃၀ စက္ကန့်အတွင်း ရလဒ်ကို မြင်ရမယ်။ မှတ်ပုံတင်စရာ မလိုဘူး။
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <button className="btn btn-primary" onClick={openPdf}>
              PDF တင်ပြီး စမ်းရန် <ArrowUpRight size={16} />
            </button>
            <button
              className="btn border-[#f7f2e7]/35 text-[#f7f2e7] hover:bg-[#f7f2e7] hover:text-[#0e1626]"
              onClick={openGrammar}
            >
              စာသား စစ်ဆေးရန်
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function Footer() {
  const cols = [
    { h: "ကိရိယာ", items: ["PDF → Text", "Zawgyi → Unicode", "စာလုံးပေါင်း စစ်ဆေး", "DOCX ထုတ်ယူ"] },
    { h: "အထောက်အကူ", items: ["အသုံးပြုနည်း", "API", "စျေးနှုန်း", "ဆက်သွယ်ရန်"] },
    { h: "ဥပဒေ", items: ["ကိုယ်ရေးအကျဉ်း", "စည်းမျဉ်း", "ဖိုင်မူဝါဒ"] },
  ];
  return (
    <footer className="border-t border-[#0e1626]/14 bg-[#f7f2e7]">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-12">
        <div>
          <div className="flex items-center gap-3 text-[#0e1626]">
            <Mark className="h-10 w-10" />
            <span className="font-display text-[1.4rem] font-black">AKKHARA</span>
          </div>
          <p className="mm mt-4 max-w-[36ch] text-[0.92rem] leading-[1.9] text-[#7a7266]">
            မြန်မာစာအတွက် တည်ဆောက်ထားတဲ့ PDF စာသားထုတ်ယူရေးကိရိယာ။ Zawgyi ကနေ Unicode
            ထိ — စာသားအားလုံး ဖတ်နိုင် ရွေးချယ်နိုင်ပါစေ။
          </p>
          <p className="micro mt-6 text-[#a9a093]">
            yangon · myanmar · since 2021
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.h}>
            <h4 className="mm text-[0.95rem] font-semibold text-[#0e1626]">{c.h}</h4>
            <ul className="mt-4 space-y-2.5">
              {c.items.map((it) => (
                <li key={it}>
                  <a
                    href="#hero"
                    className="sweep mm text-[0.9rem] text-[#7a7266] transition-colors hover:text-[#0e1626]"
                  >
                    {it}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-[#0e1626]/12">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 pb-24 pt-5 sm:px-8 lg:px-12">
          <span className="micro text-[#a9a093]">© 2026 akkhara lab</span>
          <span className="micro text-[#a9a093]">unicode first · zawgyi welcome</span>
        </div>
      </div>
    </footer>
  );
}
