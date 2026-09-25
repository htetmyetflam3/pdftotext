import { useCallback, useEffect, useRef, useState } from "react";
import ConverterArt from "./art/ConverterArt";
import GrammarArt from "./art/GrammarArt";
import { cn } from "../utils/cn";

type Slide = {
  id: string;
  index: string;
  eyebrow: string;
  titleTop: string;
  titleGrad: string;
  titleEnd?: string;
  lead: string;
  english: string;
  checks: string[];
  cta: string;
  event: string;
  note: string;
  ping: string;
  art: (props: { className?: string }) => React.JSX.Element;
};

const SLIDES: Slide[] = [
  {
    id: "pdf",
    index: "01",
    eyebrow: "01 / pdf → text",
    titleTop: "Zawgyi PDF ကို",
    titleGrad: "ဖတ်လို့ရတဲ့ စာသား",
    lead: "ဟောင်းနွမ်းနေတဲ့ Zawgyi ဖောင့်နဲ့ ရေးထားတဲ့ PDF တွေကို ဖတ်လို့ရ၊ ကူးယူလို့ရ၊ ပြင်လို့ရတဲ့ ယူနီကုဒ် စာသားအဖြစ် ပြောင်းပေးပါတယ်။ စာလုံးပျက်စီးမှု မရှိတော့ပါဘူး။",
    english: "Legacy Zawgyi PDF → selectable Unicode text, with .txt, .docx & .md export.",
    checks: ["Ligature order ၁၀၀% ပြန်စီပေးသည်", "ဖိုင်များကို browser ထဲမှာပဲ စီမံသည်"],
    cta: "sample PDF ဖြင့် စမ်းကြည့်မယ်",
    event: "akkhara:open-pdf",
    note: "No sign-up · no upload · instant result",
    ping: "Other converters juggle glyphs — we rebuild the ligature order.",
    art: ConverterArt,
  },
  {
    id: "grammar",
    index: "02",
    eyebrow: "02 / spell & grammar",
    titleTop: "Burmese Spell &",
    titleGrad: "Grammar Checker",
    titleEnd: "with AI precision.",
    lead: "မြန်မာစာ သတ်ပုံ၊ သဒ္ဒါ၊ အောက်မြစ်နှင့် ရှေ့ထိုး အမှားများကို အချိန်နှင့်တစ်ပြေးညီ စစ်ဆေး ပြင်ဆင်ပေးသည်။ ရုံးသုံး စာရွက်စာတမ်းများအတွက် အထူး သင့်လျော်ပါသည်။",
    english: "Realtime Burmese orthography, grammar and spacing suggestions you can apply in one click.",
    checks: ["မြန်မာစာအဖွဲ့ သတ်ပုံကျမ်း အခြေခံ စစ်ဆေးစနစ်", "Word, PDF, Text ဖိုင်များ တိုက်ရိုက် ထည့်နိုင်သည်"],
    cta: "grammar checker ဖွင့်မယ်",
    event: "akkhara:open-grammar",
    note: "Rule engine + orthography dictionary",
    ping: "မြန်မာစာအဖွဲ့ သတ်ပုံကျမ်း စံနှုန်းအတိုင်း စစ်ဆေးသည်။",
    art: GrammarArt,
  },
];

export default function Hero() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  const go = useCallback((n: number) => setActive((n + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => setActive((i) => (i + 1) % SLIDES.length), 9000);
    return () => window.clearInterval(t);
  }, [paused]);

  return (
    <section id="hero" className="relative overflow-hidden pt-20 lg:pt-24">
      {/* ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 -top-24 h-[420px] w-[420px] rounded-full bg-brand-100/70 blur-3xl" />
        <div className="absolute -right-32 top-24 h-[460px] w-[460px] rounded-full bg-[#ece7ff]/80 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-canvas" />
      </div>

      <div
        className="mx-auto max-w-7xl px-4 sm:px-6"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
          setPaused(true);
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 48) go(active + (dx < 0 ? 1 : -1));
          touchX.current = null;
          setPaused(false);
        }}
      >
        <div className="-mx-3 overflow-hidden px-3 sm:-mx-4 sm:px-4">
          <div
            className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(-${active * 100}%)` }}
          >
            {SLIDES.map((s, i) => {
              const Art = s.art;
              return (
                <article
                  key={s.id}
                  aria-hidden={i !== active}
                  inert={i !== active}
                  className="w-full shrink-0 grow-0 basis-full px-0.5 pb-6 pt-6 lg:pb-12 lg:pt-10"
                >
                  <div className="grid items-center gap-8 lg:grid-cols-[1.02fr_1.08fr] lg:gap-12">
                    {/* ---------- copy ---------- */}
                    <div className="mx-auto w-full max-w-xl text-center lg:mx-0 lg:max-w-none lg:text-left">
                      <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700 shadow-sm">
                        <i className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-brand" />
                        {s.eyebrow}
                      </span>

                      <h1
                        className={cn(
                          "font-mm mt-5 text-[30px] font-extrabold leading-[1.28] tracking-tight text-ink sm:text-[40px] lg:text-[52px] lg:leading-[1.2]",
                          i !== active && "select-none",
                        )}
                      >
                        {s.titleTop}
                        <br />
                        <span className="ak-grad-text">{s.titleGrad}</span>
                        {s.titleEnd && (
                          <>
                            <br />
                            <span className="text-ink-2">{s.titleEnd}</span>
                          </>
                        )}
                      </h1>

                      <p className="font-mm mx-auto mt-4 max-w-xl text-[15px] leading-8 text-ink-3 lg:mx-0">{s.lead}</p>
                      <p className="mt-2 text-sm text-muted">{s.english}</p>

                      <ul className="mx-auto mt-5 grid max-w-md gap-2 text-left lg:mx-0 lg:max-w-none">
                        {s.checks.map((c) => (
                          <li key={c} className="flex items-start gap-2.5">
                            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#d7f5f2] text-teal-brand">
                              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                            <span className="font-mm text-[13.5px] leading-6 text-ink-2">{c}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                        <button
                          onClick={() => window.dispatchEvent(new Event(s.event))}
                          className="font-mm inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-violet-brand px-6 py-3.5 text-[15px] font-bold text-white shadow-xl shadow-brand-500/25 transition hover:brightness-110 active:scale-[0.99] sm:w-auto"
                        >
                          {s.cta}
                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                        </button>
                        <a
                          href="#how"
                          className="font-mm inline-flex w-full items-center justify-center rounded-full border border-line bg-white px-6 py-3.5 text-[15px] font-bold text-ink-2 transition hover:border-brand-300 hover:text-brand-600 sm:w-auto"
                        >
                          နည်းပညာ ကြည့်ရန်
                        </a>
                      </div>
                      <p className="mt-3 text-xs text-muted">{s.note}</p>
                    </div>

                    {/* ---------- artwork ---------- */}
                    <div className="w-full">
                      <div className="relative mx-auto w-full max-w-[560px] lg:max-w-none">
                        <div className="ak-ring overflow-hidden rounded-[28px] border border-line bg-white p-2 sm:p-3">
                          <div className="overflow-hidden rounded-[20px] bg-gradient-to-br from-brand-50 via-white to-[#eafaf8] p-1.5 sm:p-3">
                            <Art />
                          </div>
                        </div>
                        <p className="mx-auto mt-3 flex max-w-[94%] items-start gap-2 rounded-2xl border border-line bg-white/90 px-3.5 py-2 text-[11px] font-semibold text-ink-3 shadow-sm backdrop-blur sm:text-xs">
                          <i className="mt-1.5 h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-brand-500" />
                          <span className="font-mm text-left leading-5">{s.ping}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* ---------- controls ---------- */}
        <div className="mt-2 flex items-center justify-center gap-4 pb-10 lg:mt-0 lg:justify-start">
          <div className="flex items-center gap-2">
            <button
              onClick={() => go(active - 1)}
              aria-label="Previous slide"
              className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-ink-2 transition hover:border-brand-300 hover:text-brand-600"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
            <button
              onClick={() => go(active + 1)}
              aria-label="Next slide"
              className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-ink-2 transition hover:border-brand-300 hover:text-brand-600"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {SLIDES.map((s, i) => (
              <button
                key={s.id}
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={cn(
                  "h-2.5 rounded-full transition-all duration-300",
                  i === active ? "w-8 bg-gradient-to-r from-brand-500 to-violet-brand" : "w-2.5 bg-line hover:bg-brand-200",
                )}
              />
            ))}
          </div>

          <span className="font-mono text-xs font-semibold text-muted">
            {SLIDES[active].index} / 0{SLIDES.length}
          </span>
        </div>
      </div>
    </section>
  );
}
