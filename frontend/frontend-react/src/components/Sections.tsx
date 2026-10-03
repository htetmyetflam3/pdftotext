import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Minus,
  Plus,
  ArrowUpRight,
  Download,
  ScanText,
  Layers,
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
    { v: "၁၀၀", l: "pages in verified sample" },
    { v: "၁၀၀ / ၁၀၀", l: "pages classified as Zawgyi" },
    { v: "TXT · DOCX", l: "available output paths" },
    { v: "OCR", l: "custom logic in development" },
  ];
  const tags = [
    "text-based PDF",
    "embedded font mapping",
    "page-by-page detection",
    "Zawgyi → Unicode",
    "reviewable output",
    "TXT export",
    "DOCX export",
    "mixed-script review",
    "custom OCR in development",
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
    t: "စာသားအလွှာပါတဲ့ PDF ကို ရွေးပါ",
    d: "လက်ရှိ extraction လမ်းကြောင်းက selectable text ပါတဲ့ PDF အတွက် ဖြစ်ပါတယ်။ ပုံအဖြစ် scan လုပ်ထားတဲ့ စာမျက်နှာတွေကတော့ OCR လမ်းကြောင်း လိုအပ်ပါတယ်။",
    meta: "text-based · .pdf",
  },
  {
    n: "02",
    t: "ဖောင် mapping ကို စာမျက်နှာအလိုက် ဖတ်တယ်",
    d: "Parser က embedded font mapping ကို စစ်ဆေး၊ Zawgyi/Unicode ကို စာမျက်နှာအလိုက် ခွဲခြားပြီး လိုအပ်တဲ့ စာသားပြောင်းလဲမှုကို လုပ်ပါတယ်။",
    meta: "font map · detect · convert",
  },
  {
    n: "03",
    t: "မူရင်းနဲ့ စစ်ပြီး ထုတ်ယူပါ",
    d: "ထုတ်ယူထားတဲ့ စာသားကို မူရင်း PDF နဲ့ နှိုင်းယှဉ်စစ်ဆေးပြီး ကူးယူနိုင်သလို TXT သို့မဟုတ် DOCX အဖြစ် ဆက်သုံးနိုင်ပါတယ်။",
    meta: "review · .txt · .docx",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
      <Reveal>
        <SectionLabel n="01" en="how it works" mm="သုံးဆင့်ပဲ ရှိတယ်" />
        <h2 className="mm-display mt-6 max-w-[20ch] text-[clamp(2rem,4.6vw,3.4rem)] font-bold leading-[1.15] tracking-tight">
          PDF ထဲက font mapping ကနေ —{" "}
          <span className="bg-gradient-to-r from-[#c63b26] to-[#e0a63c] bg-clip-text text-transparent">
            စစ်ဆေးလို့ရတဲ့ စာသားထိ
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

const ROWS: { label: string; a: Cell; b: Cell; c: Cell }[] = [
  { label: "ပုံမှန် Unicode text-based PDF", a: "yes", b: "part", c: "yes" },
  { label: "Embedded Zawgyi/Myanmar font PDF", a: "part", b: "part", c: "yes" },
  { label: "Scan / image-only PDF", a: "no", b: "yes", c: "part" },
  { label: "ရွေးချယ်၊ ရှာဖွေ၊ ကူးယူနိုင်သော စာသား", a: "yes", b: "part", c: "yes" },
  { label: "TXT / DOCX ထုတ်ယူခြင်း", a: "part", b: "part", c: "yes" },
  { label: "ထုတ်ယူပြီး ပြန်လည်စစ်ဆေးရန်", a: "part", b: "yes", c: "yes" },
];

const HEAD = ["Standard text extractor", "Stock OCR", "AKKHARA"];

const BENCHMARK_TOOLS = [
  {
    name: "PDF2Go",
    detail: "PDF-to-Text upload page",
    href: "https://www.pdf2go.com/pdf-to-text",
  },
  {
    name: "Adobe Acrobat",
    detail: "PDF-to-Word converter",
    href: "https://www.adobe.com/acrobat/online/pdf-to-word.html",
  },
  {
    name: "Google Drive / Docs",
    detail: "Official OCR instructions",
    href: "https://support.google.com/drive/answer/176692?hl=en&co=GENIE.Platform%3DDesktop",
  },
  {
    name: "FreeConvert",
    detail: "PDF-to-Text upload page",
    href: "https://www.freeconvert.com/pdf-to-text",
  },
];

const SAVED_OUTPUTS = [
  { name: "AKKHARA · cleanup off", href: "/samples/sample.praser.txt" },
  { name: "FreeConvert", href: "/samples/sample-freeconvert.txt" },
  { name: "PDF2Go", href: "/samples/sample-pdf2go.txt" },
  { name: "PDF24", href: "/samples/sample-pdf24.txt" },
  { name: "pdftotext", href: "/samples/sample-pdftotext.txt" },
];

function Mark4({ kind }: { kind: Cell }) {
  if (kind === "yes")
    return (
      <span className="inline-flex items-center gap-2 text-[#7ee0b4]">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#2e7d5b]">
          <Check size={14} strokeWidth={3} color="#eafff5" />
        </span>
        <span className="micro">full</span>
      </span>
    );
  if (kind === "part")
    return (
      <span className="inline-flex items-center gap-2 text-[#e0a63c]">
        <span className="grid h-6 w-6 place-items-center rounded-full border border-[#e0a63c]/60">
          <Minus size={13} strokeWidth={3} />
        </span>
        <span className="micro">partial</span>
      </span>
    );
  return (
    <span className="inline-flex items-center gap-2 text-[#f7f2e7]/45">
      <span className="grid h-6 w-6 place-items-center rounded-full border border-[#f7f2e7]/25">
        <Minus size={13} strokeWidth={3} />
      </span>
      <span className="micro">none</span>
    </span>
  );
}

export function Compare() {
  const rowNote: Record<string, [string, string, string]> = {
    "ပုံမှန် Unicode text-based PDF": ["ပုံမှန် encoding အတွက်သင့်", "မလိုအပ်ဘဲ pixel ဖတ်", "တိုက်ရိုက် extract"],
    "Embedded Zawgyi/Myanmar font PDF": ["စာပျောက်/ပျက်နိုင်", "မြင်ကွင်းကနေ ခန့်မှန်း", "font mapping ကို ဖတ်"],
    "Scan / image-only PDF": ["text layer မရှိ", "အဓိကအသုံးပြုရာ", "custom OCR ဖွံ့ဖြိုးဆဲ"],
    "ရွေးချယ်၊ ရှာဖွေ၊ ကူးယူနိုင်သော စာသား": ["mapping မှန်လျှင်", "OCR အမှား စစ်ရန်လို", "Unicode output"],
    "TXT / DOCX ထုတ်ယူခြင်း": ["tool အလိုက်ကွာ", "tool အလိုက်ကွာ", "TXT + DOCX"],
    "ထုတ်ယူပြီး ပြန်လည်စစ်ဆေးရန်": ["legacy font စစ်ရန်", "recognition စစ်ရန်", "မူရင်းနှင့် နှိုင်းရန်"],
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
            Text extraction နဲ့ OCR —{" "}
            <span className="bg-gradient-to-r from-[#e0a63c] to-[#c63b26] bg-clip-text text-transparent">
              ဘယ်အချိန် ဘာသုံးမလဲ
            </span>
          </h2>
          <p className="mm mt-4 max-w-[70ch] text-[0.98rem] leading-[1.9] text-[#f7f2e7]/60">
            Text-based PDF မှာ code အဖြစ်ရှိပြီးသား စာသားကို extract လုပ်တာ အကောင်းဆုံးပါ။ Scan PDF ကတော့ pixel ကို ဖတ်တဲ့ OCR လိုပါတယ်။
            AKKHARA က embedded Zawgyi/Myanmar font mapping ကို လက်ရှိကိုင်တွယ်ပြီး Tesseract recognition model နဲ့ ကိုယ်ပိုင်
            Myanmar processing logic သုံးတဲ့ OCR လမ်းကြောင်းကို ဖွံ့ဖြိုးနေပါတယ်။
          </p>
        </Reveal>

        <Reveal delay={0.12} className="mt-10">
          {/* Mobile and tablet: each criterion becomes a readable comparison card. */}
          <div className="grid gap-4 lg:hidden" role="table" aria-label="PDF extraction and OCR comparison">
            {ROWS.map((r, i) => (
              <motion.article
                key={r.label}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ delay: i * 0.04, duration: 0.45, ease: EASE }}
                className="rounded-2xl border border-[#f7f2e7]/14 bg-[#f7f2e7]/5 p-4"
                role="row"
              >
                <h3 className="mm border-b border-[#f7f2e7]/12 pb-3 text-[0.96rem] font-semibold leading-relaxed text-[#f7f2e7]">
                  {r.label}
                </h3>
                <div className="mt-2 grid gap-1">
                  {HEAD.map((heading, j) => {
                    const cell = ([r.a, r.b, r.c] as Cell[])[j];
                    return (
                      <div
                        key={heading}
                        className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-3 ${
                          j === 2 ? "bg-[#2e7d5b]/16" : "bg-[#f7f2e7]/[0.025]"
                        }`}
                        role="cell"
                      >
                        <div className="min-w-0">
                          <div className={`mm text-[0.82rem] font-semibold ${j === 2 ? "text-[#e0a63c]" : "text-[#f7f2e7]/72"}`}>
                            {heading}
                          </div>
                          <div className={`mm mt-1 text-[0.76rem] leading-relaxed ${j === 2 ? "text-[#7ee0b4]/85" : "text-[#f7f2e7]/45"}`}>
                            {rowNote[r.label]?.[j]}
                          </div>
                        </div>
                        <Mark4 kind={cell} />
                      </div>
                    );
                  })}
                </div>
              </motion.article>
            ))}
          </div>

          {/* Desktop: retain the compact comparison table. */}
          <div className="hidden lg:block">
            <table className="w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="border-b border-[#f7f2e7]/20">
                  <th className="micro w-[28%] py-4 pr-4 font-medium text-[#f7f2e7]/45">criteria</th>
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
                    <td className="mm py-4 pr-4 text-[0.93rem] leading-relaxed text-[#f7f2e7]/85">{r.label}</td>
                    {([r.a, r.b, r.c] as Cell[]).map((cell, j) => (
                      <td key={j} className="py-4 pr-4 align-middle">
                        <Mark4 kind={cell} />
                        <div className={`mm mt-1.5 text-[0.78rem] leading-relaxed ${j === 2 ? "text-[#7ee0b4]/85" : "text-[#f7f2e7]/45"}`}>
                          {rowNote[r.label]?.[j]}
                        </div>
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="micro mt-5 leading-relaxed text-[#f7f2e7]/40">
            capability guide · competitor behaviour varies · AKKHARA OCR is in development
          </p>
        </Reveal>

        <Reveal delay={0.16} className="mt-16">
          <div
            id="benchmark"
            className="scroll-mt-24 overflow-hidden rounded-[2rem] border border-[#e0a63c]/35 bg-[#f7f2e7]/[0.055] shadow-2xl shadow-black/20"
          >
            <div className="grid gap-8 border-b border-[#f7f2e7]/12 p-5 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:p-10">
              <div>
                <div className="micro flex items-center gap-3 text-[#e0a63c]">
                  <span>reproducible benchmark</span>
                  <span className="h-px w-10 bg-[#e0a63c]/50" />
                  <span>100 pages</span>
                </div>
                <h3 className="mm-display mt-4 max-w-[18ch] text-[clamp(1.7rem,3.6vw,2.65rem)] font-bold leading-tight text-[#f7f2e7]">
                  ဒီ sample တစ်ခုတည်းကို tool တိုင်းမှာ စမ်းကြည့်ပါ
                </h3>
                <p className="mm mt-4 max-w-[64ch] text-[0.94rem] leading-[1.9] text-[#f7f2e7]/62">
                  ဒီမှာသုံးထားတာဟာ 100-page text-based Zawgyi PDF အတိအကျပါ။ PDF ကို တစ်ကြိမ် download လုပ်ပြီး
                  အောက်က tool တွေမှာ မပြောင်းလဲဘဲ upload လုပ်ပါ။ ရလာတဲ့ Myanmar စာသား၊ English စာသား၊ punctuation နဲ့
                  page boundaries တွေကို မူရင်းနဲ့ ပြန်စစ်နိုင်ပါတယ်။
                </p>
                <p className="mt-4 break-all font-mono2 text-[0.61rem] leading-relaxed text-[#f7f2e7]/35">
                  SHA-256 · a94e42e891e2b8d2c6b92300a52d86df3738575e09beddd362f93ba262a2c9fa
                </p>
              </div>

              <div className="grid content-start gap-3">
                {[
                  ["01", "Download", "Exact sample.pdf · 269,519 bytes"],
                  ["02", "Upload unchanged", "Use each official link below"],
                  ["03", "Compare complete output", "One sample is evidence, not a universal accuracy score"],
                ].map(([n, title, detail]) => (
                  <div key={n} className="grid grid-cols-[auto_1fr] gap-3 rounded-2xl border border-[#f7f2e7]/10 bg-black/10 p-3.5">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[#e0a63c] font-mono2 text-[0.65rem] font-bold text-[#0e1626]">{n}</span>
                    <div>
                      <div className="text-sm font-bold text-[#f7f2e7]">{title}</div>
                      <div className="mt-0.5 text-xs leading-relaxed text-[#f7f2e7]/45">{detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 sm:p-8 lg:p-10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href="/samples/sample.pdf"
                  download="sample.pdf"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e0a63c] px-5 py-3 text-sm font-bold text-[#0e1626] transition hover:bg-[#efb94c]"
                >
                  <Download size={17} /> Download exact sample PDF
                </a>
                <button
                  type="button"
                  data-open-pdf
                  onClick={() => window.dispatchEvent(new CustomEvent("akkhara:open-pdf"))}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#f7f2e7]/20 px-5 py-3 text-sm font-bold text-[#f7f2e7] transition hover:bg-[#f7f2e7]/10"
                >
                  Run the API demo <ArrowUpRight size={16} />
                </button>
              </div>

              <div className="mt-8">
                <div className="micro text-[#f7f2e7]/38">test with the article&apos;s referenced tools</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {BENCHMARK_TOOLS.map((tool) => (
                    <a
                      key={tool.name}
                      href={tool.href}
                      target="_blank"
                      rel="noreferrer"
                      className="group rounded-2xl border border-[#f7f2e7]/12 bg-[#f7f2e7]/[0.035] p-4 transition hover:border-[#e0a63c]/55 hover:bg-[#f7f2e7]/[0.075]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-[#f7f2e7]">{tool.name}</span>
                        <ArrowUpRight size={15} className="shrink-0 text-[#e0a63c] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-[#f7f2e7]/45">{tool.detail}</p>
                    </a>
                  ))}
                </div>
                <p className="mt-3 text-[0.72rem] leading-relaxed text-[#f7f2e7]/35">
                  These are independent third-party services. Review each service&apos;s privacy and file-retention terms before uploading another document.
                </p>
              </div>

              <div className="mt-8 border-t border-[#f7f2e7]/12 pt-6">
                <div className="micro text-[#f7f2e7]/38">download the saved full-text evidence</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SAVED_OUTPUTS.map((output) => (
                    <a
                      key={output.name}
                      href={output.href}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#f7f2e7]/14 bg-black/10 px-3 py-2 text-xs font-semibold text-[#f7f2e7]/70 transition hover:border-[#7ee0b4]/55 hover:text-[#7ee0b4]"
                    >
                      <Download size={13} /> {output.name}
                    </a>
                  ))}
                </div>
                <p className="mm mt-4 max-w-[92ch] text-[0.76rem] leading-relaxed text-[#f7f2e7]/42">
                  AKKHARA file က cleanup ပိတ်ထားပြီး parser ကို တကယ် run ထားတဲ့ raw result ပါ။ Saved output တွေကို selective excerpt မဟုတ်ဘဲ
                  file အပြည့် download လုပ်နိုင်ပါတယ်။ ဒီ benchmark တစ်ခုတည်းနဲ့ PDF အမျိုးအစားအားလုံးအတွက် accuracy မသတ်မှတ်ထားပါဘူး။
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const BENEFITS = [
  {
    icon: ScanText,
    t: "Embedded font mapping ကို ဖတ်တယ်",
    d: "ပုံမှန် extractor က ကျော်သွားနိုင်တဲ့ legacy Myanmar glyph mapping ကို parser က ပြန်ဖော်ထုတ်ဖို့ ရည်ရွယ်ထားပါတယ်။",
  },
  {
    icon: Layers,
    t: "စာမျက်နှာအလိုက် ခွဲခြားတယ်",
    d: "PDF တစ်ခုလုံးကို တစ်မျိုးတည်း မယူဘဲ page တစ်ခုချင်း Zawgyi/Unicode detection ရလဒ်နဲ့ ဆက်လက်စီမံပါတယ်။",
  },
  {
    icon: Check,
    t: "ရလဒ်ကို စစ်ဆေးလို့ရတယ်",
    d: "ထုတ်ယူထားတဲ့ Unicode စာသားကို မူရင်း PDF နဲ့ ဘေးချင်းယှဉ်ပြီး English၊ punctuation နဲ့ စာလုံးစီစဉ်မှုကို ပြန်စစ်နိုင်ပါတယ်။",
  },
  {
    icon: Keyboard,
    t: "စာသားကို browser ထဲမှာ ပြောင်းတယ်",
    d: "Paste လုပ်ထားတဲ့ Zawgyi စာသားအတွက် browser အတွင်းက Zawgyi → Unicode tool ကို သီးခြား အသုံးပြုနိုင်ပါတယ်။",
  },
  {
    icon: ArrowUpRight,
    t: "TXT နဲ့ DOCX ဆက်သုံးနိုင်တယ်",
    d: "စစ်ဆေးပြီးသား output ကို TXT သို့မဟုတ် DOCX အဖြစ် ထုတ်ယူနိုင်ပြီး complex layout တွေကို Word မှာ ပြန်စစ်သင့်ပါတယ်။",
  },
  {
    icon: ScanText,
    t: "Custom OCR ကို ဖွံ့ဖြိုးနေတယ်",
    d: "Scan PDF အတွက် Tesseract recognition model ကို ကိုယ်ပိုင် Myanmar document analysis နဲ့ processing logic တို့နဲ့ ပေါင်းစပ်နေပါတယ်။",
  },
];

export function Benefits() {
  return (
    <section id="features" className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
      <Reveal>
        <SectionLabel n="03" en="why akkhara" mm="အကျိုးကျေးဇူး" />
        <h2 className="mm-display mt-6 max-w-[22ch] text-[clamp(2rem,4.6vw,3.4rem)] font-bold leading-[1.15] tracking-tight">
          PDF ထဲက စာသားကို ပြန်ယူပြီး စစ်ဆေးရလွယ်စေတယ်
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
    q: "Zawgyi PDF ဆိုတာ ဘာလဲ၊ ဘာကြောင့် ပုံမှန် extractor မှာ ပျက်တာလဲ။",
    a: "Legacy PDF တချို့က မြင်ရတဲ့ စာလုံးနဲ့ content stream ထဲက code ကို embedded font mapping နဲ့ ဆက်ထားပါတယ်။ အဲဒီ mapping ကို ပုံမှန် extractor က မဖတ်နိုင်ရင် မြန်မာစာ ပျောက်တာ၊ placeholder ဖြစ်တာ၊ စာလုံးစီစဉ်မှု မှားတာတွေ ဖြစ်နိုင်ပါတယ်။",
  },
  {
    q: "Scan လုပ်ထားတဲ့ PDF ကို အခုဖတ်နိုင်ပြီလား။",
    a: "လက်ရှိ parser လမ်းကြောင်းက text-based PDF အတွက်ပါ။ Scan/image-only PDF အတွက် Tesseract recognition model ကို AKKHARA ရဲ့ ကိုယ်ပိုင် Myanmar document analysis နဲ့ processing logic တို့နဲ့ ပေါင်းစပ်တဲ့ custom OCR လမ်းကြောင်းကို ဖွံ့ဖြိုးနေပါတယ်။",
  },
  {
    q: "ထုတ်ယူထားတဲ့ စာသားက အမြဲတမ်း အမှန်လား။",
    a: "မဟုတ်ပါဘူး။ Font encoding နဲ့ PDF တည်ဆောက်ပုံအလိုက် ရလဒ်ကွာနိုင်ပါတယ်။ မြန်မာစာကို ပြန်ရနိုင်ပေမယ့် English၊ brackets၊ punctuation၊ spacing နဲ့ mark order တချို့ကို မူရင်း PDF နဲ့ နှိုင်းယှဉ်စစ်ဆေးသင့်ပါတယ်။",
  },
  {
    q: "Cleanup ဆိုတာ ဘာလုပ်တာလဲ။",
    a: "Cleanup က extraction ပြီးနောက် imposter code point နဲ့ mark order တချို့ကို ပြင်ဖို့ သီးခြားအဆင့်ပါ။ အသုံးပြုသူက apply/skip ရွေးနိုင်ပြီး font decoding အမှားကို ဖုံးကွယ်ဖို့ မသုံးပါဘူး။",
  },
  {
    q: "TXT နဲ့ DOCX output ဘာကွာလဲ။",
    a: "TXT က ထုတ်ယူထားတဲ့ စာသားကို ရိုးရိုးဖိုင်အဖြစ် ပေးပါတယ်။ DOCX က page နဲ့ line placement အချက်အလက်ကို အသုံးပြုပြီး Word မှာ ဆက်ပြင်နိုင်အောင် ထုတ်ပေးပေမယ့် complex layout ကို မူရင်းနဲ့ ပြန်စစ်သင့်ပါတယ်။",
  },
  {
    q: "ဘယ်လိုစမ်းသပ်ထားလဲ။",
    a: "လက်ရှိ comparison က 100-page Zawgyi sample PDF နဲ့ generic extractor outputs ကို ဘေးချင်းယှဉ်ထားတာပါ။ Sample တစ်ခုရဲ့ရလဒ်ကို PDF အမျိုးအစားအားလုံးအတွက် accuracy ရာခိုင်နှုန်းအဖြစ် မယူထားပါဘူး။",
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
            100-page နမူနာဖိုင်က generic extractor output နဲ့ AKKHARA output ဘယ်လိုကွာသလဲဆိုတာ အရင်နှိုင်းယှဉ်ကြည့်ပါ။
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <button className="btn btn-primary" onClick={openPdf}>
              နမူနာ နှိုင်းယှဉ်ရန် <ArrowUpRight size={16} />
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
    { h: "ကိရိယာ", items: ["PDF Text Extraction", "Zawgyi → Unicode", "Custom OCR (ဖွံ့ဖြိုးဆဲ)", "DOCX ထုတ်ယူ"] },
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
            Embedded Myanmar font ပါတဲ့ text-based PDF တွေက စာသားကို ပြန်လည်ထုတ်ယူဖို့ တည်ဆောက်ထားတဲ့ parser။
            Scan PDF အတွက် custom OCR လမ်းကြောင်းကို ဆက်လက်ဖွံ့ဖြိုးနေပါတယ်။
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
