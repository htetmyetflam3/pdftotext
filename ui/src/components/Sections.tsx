import { useState } from "react";
import { cn } from "../utils/cn";

const openPdf = () => window.dispatchEvent(new Event("akkhara:open-pdf"));
const openGrammar = () => window.dispatchEvent(new Event("akkhara:open-grammar"));

function Heading({ kicker, title, lead }: { kicker: string; title: string; lead?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">
        {kicker}
      </span>
      <h2 className="mt-4 text-[26px] font-extrabold tracking-tight text-ink sm:text-[34px]">{title}</h2>
      {lead && <p className="font-mm mt-3 text-[15px] leading-8 text-ink-3">{lead}</p>}
    </div>
  );
}

/* ----------------------------- social proof ----------------------------- */
export function SocialProof() {
  const stats = [
    { v: "12,400+", l: "documents converted", mm: "စာရွက်စာတမ်း ပြောင်းလဲပြီး" },
    { v: "99.2%", l: "ligature accuracy", mm: "ligature တိကျမှု" },
    { v: "0", l: "files uploaded", mm: "server သို့ မတင်ပါ" },
    { v: "4.9/5", l: "user rating", mm: "အသုံးပြုသူ အဆင့်သတ်မှတ်ချက်" },
  ];
  return (
    <section className="border-y border-line bg-white/70">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden bg-line px-0 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.l} className="bg-white px-5 py-7 text-center">
            <p className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{s.v}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-brand-600">{s.l}</p>
            <p className="font-mm mt-1 text-[11px] text-muted">{s.mm}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------- how it works ----------------------------- */
export function HowItWorks() {
  const steps = [
    {
      n: "01",
      t: "Drop the document",
      mm: "PDF သို့မဟုတ် Text ဖိုင်ကို ဆွဲထည့်ပါ။",
      icon: "M12 16V4M7 9l5-5 5 5M20 16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3",
    },
    {
      n: "02",
      t: "Detect & remap glyphs",
      mm: "Zawgyi ကုဒ်များကို ယူနီကုဒ်သို့ တွဲချိန်ပြီး ligature ပြန်စီသည်။",
      icon: "M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1m0-12.8l-2.1 2.1M7.7 16.3l-2.1 2.1",
    },
    {
      n: "03",
      t: "Export & keep editing",
      mm: ".txt / .docx / .md အဖြစ် ထုတ်ယူပြီး ဆက်ပြင်နိုင်သည်။",
      icon: "M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M12 3v12M8 11l4 4 4-4",
    },
  ];
  return (
    <section id="how" className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Heading
          kicker="how it works"
          title="Three steps, no learning curve"
          lead="ဖိုင်ထည့်ပါ — ပြောင်းပါ — ထုတ်ယူပါ။ နည်းပညာ အသိပညာ မလိုအပ်ပါ။"
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <article key={s.n} className="ak-card relative p-6">
              <span className="absolute right-5 top-5 text-4xl font-extrabold text-brand-50">{s.n}</span>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-brand text-white shadow-lg shadow-brand-500/20">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d={s.icon} />
                </svg>
              </span>
              <h3 className="mt-5 text-lg font-bold text-ink">{s.t}</h3>
              <p className="font-mm mt-2 text-sm leading-7 text-ink-3">{s.mm}</p>
              {i < steps.length - 1 && (
                <span className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 place-items-center rounded-full border border-line bg-white text-brand-500 md:grid">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </span>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- features ------------------------------- */
export function Features() {
  const items = [
    { t: "Ligature-safe engine", mm: "စာလုံးဆက်စပ်မှု အစီအစဉ် မှန်ကန်စွာ ပြန်စီပေးသည်။", c: "#2b59ff" },
    { t: "Selectable output", mm: "ရလဒ်စာသားကို ကူးယူ၊ ရှာဖွေ၊ ပြင်ဆင် နိုင်သည်။", c: "#7c5cff" },
    { t: "Runs in your browser", mm: "ဖိုင်များ စက်ထဲမှာပဲ ရှိနေပြီး privacy အပြည့် ရသည်။", c: "#00b8a9" },
    { t: "Orthography checker", mm: "သတ်ပုံ၊ သဒ္ဒါ အမှားများကို တစ်ချက်နှိပ် ပြင်နိုင်သည်။", c: "#ffb020" },
    { t: "Batch friendly", mm: "စာမျက်နှာ များစွာကို တစ်ပြိုင်နက် စီမံနိုင်သည်။", c: "#ff5a5f" },
    { t: "Export anywhere", mm: ".txt, .docx, .md အဖြစ် ချက်ချင်း ထုတ်ယူနိုင်သည်။", c: "#2b59ff" },
  ];
  return (
    <section id="features" className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Heading kicker="features" title="Built for real Myanmar documents" lead="ရုံးသုံး၊ ကျောင်းသုံး၊ သတင်းဌာန သုံး စာရွက်စာတမ်းများအတွက် ဒီဇိုင်းထားသည်။" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((f) => (
            <article key={f.t} className="ak-card group p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
              <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${f.c}1a`, color: f.c }}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <h3 className="mt-4 text-[15px] font-bold text-ink">{f.t}</h3>
              <p className="font-mm mt-1.5 text-[13px] leading-7 text-muted">{f.mm}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- compare -------------------------------- */
export function Compare() {
  const rows = [
    { label: "Keeps ligature order", a: true, b: false },
    { label: "Selectable / copyable text", a: true, b: true },
    { label: "Works offline in browser", a: true, b: false },
    { label: "Burmese grammar checking", a: true, b: false },
    { label: "Export .docx & .md", a: true, b: false },
    { label: "No account required", a: true, b: true },
  ];
  return (
    <section id="compare" className="py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Heading kicker="compare" title="Akkhara vs. typical converters" />
        <div className="ak-card mt-10 overflow-hidden">
          <div className="grid grid-cols-[1fr_88px_88px] items-center gap-2 border-b border-line bg-canvas px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted sm:grid-cols-[1fr_140px_140px] sm:px-6">
            <span>Capability</span>
            <span className="text-center text-brand-700">Akkhara</span>
            <span className="text-center">Others</span>
          </div>
          {rows.map((r) => (
            <div
              key={r.label}
              className="grid grid-cols-[1fr_88px_88px] items-center gap-2 border-b border-line px-4 py-3.5 last:border-0 sm:grid-cols-[1fr_140px_140px] sm:px-6"
            >
              <span className="text-[13px] font-semibold text-ink-2 sm:text-sm">{r.label}</span>
              <span className="flex justify-center">{r.a ? <Tick ok /> : <Tick />}</span>
              <span className="flex justify-center">{r.b ? <Tick ok /> : <Tick />}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Tick({ ok = false }: { ok?: boolean }) {
  return (
    <span
      className={cn(
        "grid h-7 w-7 place-items-center rounded-full",
        ok ? "bg-[#d7f5f2] text-teal-brand" : "bg-[#ffe3e4] text-rose-brand",
      )}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        {ok ? <path d="M5 13l4 4L19 7" /> : <path d="M6 6l12 12M18 6L6 18" />}
      </svg>
    </span>
  );
}

/* -------------------------------- voices -------------------------------- */
export function Voices() {
  const quotes = [
    { q: "၂၀၁၀ ခုနှစ်က စာအုပ်တွေကို ပြန်ရိုက်စရာ မလိုတော့ဘူး။ ငါးမိနစ်နဲ့ ပြီးသွားတယ်။", n: "Ma Thida", r: "Publishing editor" },
    { q: "Ligature order ကို အမှန်ပြန်စီပေးတာ တခြား converter တွေမှာ မတွေ့ဖူးဘူး။", n: "Ko Zaw", r: "Software engineer" },
    { q: "Grammar checker က ရုံးစာတွေ တင်မပို့ခင် နောက်ဆုံး စစ်ဖို့ အရမ်းအဆင်ပြေတယ်။", n: "Daw Nwe", r: "Office administrator" },
  ];
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Heading kicker="voices" title="Teams that stopped retyping" />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {quotes.map((c) => (
            <figure key={c.n} className="ak-card flex h-full flex-col p-6">
              <span className="text-3xl leading-none text-brand-200">“</span>
              <blockquote className="font-mm mt-2 flex-1 text-[14px] leading-8 text-ink-2">{c.q}</blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-violet-brand text-xs font-bold text-white">
                  {c.n.split(" ").map((w) => w[0]).join("")}
                </span>
                <span>
                  <span className="block text-sm font-bold text-ink">{c.n}</span>
                  <span className="block text-[11px] text-muted">{c.r}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- faq ---------------------------------- */
export function Faq() {
  const faqs = [
    {
      q: "Zawgyi နဲ့ Unicode ဘာကွာလဲ?",
      a: "Zawgyi သည် code point များကို စံမကိုက်ဘဲ သုံးထားသော ဖောင့်ဖြစ်ပြီး Unicode သည် နိုင်ငံတကာ စံသတ်မှတ်ချက် ဖြစ်သည်။ Unicode စာသားသည် ရှာဖွေ၊ ကူးယူ၊ စစ်ဆေး၍ ရသည်။",
    },
    { q: "ကျွန်တော့် ဖိုင်တွေ လုံခြုံလား?", a: "ဖိုင်များကို သင့် browser ထဲမှာပဲ စီမံပါသည်။ မည်သည့် server သို့မျှ မပို့ပါ။" },
    { q: "Scan လုပ်ထားတဲ့ PDF ရော ရလား?", a: "စာသားအလွှာ (text layer) ပါသော PDF များအတွက် အကောင်းဆုံး အလုပ်လုပ်ပါသည်။ ပုံအဖြစ် scan ထားသည့် ဖိုင်များအတွက် OCR အဆင့် လိုအပ်ပါသည်။" },
    { q: "Export ဘာတွေ ရနိုင်လဲ?", a: ".txt, .docx (Word) နှင့် .md အဖြစ် တစ်ချက်နှိပ်ရုံဖြင့် ထုတ်ယူနိုင်ပါသည်။" },
    { q: "အသုံးပြုခ ကျသလား?", a: "အခြေခံ converter နှင့် grammar checker ကို အခမဲ့ အသုံးပြုနိုင်ပါသည်။" },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Heading kicker="faq" title="Frequently asked questions" />
        <div className="mt-10 space-y-3">
          {faqs.map((f, i) => (
            <div key={f.q} className="ak-card overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left"
                aria-expanded={open === i}
              >
                <span className="font-mm flex-1 text-[15px] font-bold text-ink">{f.q}</span>
                <span
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line text-brand-600 transition",
                    open === i && "rotate-45 border-brand-300 bg-brand-50",
                  )}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </button>
              {open === i && <p className="font-mm ak-fade border-t border-line px-5 py-4 text-[14px] leading-8 text-ink-3">{f.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- cta band -------------------------------- */
export function CtaBand() {
  return (
    <section className="px-4 pb-16 sm:px-6 sm:pb-24">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[28px] bg-gradient-to-br from-brand-600 via-brand-500 to-violet-brand px-6 py-12 text-center shadow-2xl shadow-brand-500/25 sm:px-12">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/10" />
        <h2 className="font-mm relative text-[26px] font-extrabold leading-snug text-white sm:text-[34px]">
          ဇော်ဂျီ PDF တွေကို ယနေ့ပဲ ယူနီကုဒ်အဖြစ် ပြောင်းလိုက်ပါ
        </h2>
        <p className="relative mx-auto mt-3 max-w-xl text-sm leading-7 text-white/85">
          No sign-up, no upload, no lost glyphs — everything runs right here in your browser.
        </p>
        <div className="relative mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={openPdf}
            className="w-full rounded-full bg-white px-6 py-3.5 text-[15px] font-bold text-brand-700 shadow-lg transition hover:brightness-95 sm:w-auto"
          >
            Convert a PDF
          </button>
          <button
            onClick={openGrammar}
            className="w-full rounded-full border border-white/40 bg-white/10 px-6 py-3.5 text-[15px] font-bold text-white backdrop-blur transition hover:bg-white/20 sm:w-auto"
          >
            Check my Burmese
          </button>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- footer --------------------------------- */
export function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-brand text-base font-bold text-white">
              အ
            </span>
            <span className="text-[17px] font-extrabold tracking-tight text-ink">
              Akkhara<span className="text-brand-500">.</span>
            </span>
          </div>
          <p className="font-mm mt-3 max-w-sm text-[13px] leading-7 text-muted">
            မြန်မာစာ စာရွက်စာတမ်းများအတွက် ယူနီကုဒ် ပြောင်းလဲရေးနှင့် သတ်ပုံစစ်ဆေးရေး ကိရိယာများ။
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-ink-3">
          <a href="#how" className="hover:text-brand-600">How it works</a>
          <a href="#features" className="hover:text-brand-600">Features</a>
          <a href="#compare" className="hover:text-brand-600">Compare</a>
          <a href="#faq" className="hover:text-brand-600">FAQ</a>
        </nav>
      </div>
      <div className="border-t border-line px-4 py-5 text-center text-xs text-muted sm:px-6">
        © {new Date().getFullYear()} Akkhara — PDF to Text & Burmese Grammar Suite. Built for Myanmar Unicode.
      </div>
    </footer>
  );
}

/* ------------------------------- sticky cta ------------------------------- */
export function StickyCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:hidden">
      <div className="flex gap-2">
        <button
          onClick={openPdf}
          className="flex-1 rounded-full bg-gradient-to-r from-brand-500 to-violet-brand px-4 py-3 text-sm font-bold text-white"
        >
          Convert PDF
        </button>
        <button onClick={openGrammar} className="flex-1 rounded-full border border-line px-4 py-3 text-sm font-bold text-ink-2">
          Grammar
        </button>
      </div>
    </div>
  );
}
