import { useEffect, useState } from "react";
import { cn } from "../utils/cn";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#compare", label: "Compare" },
  { href: "#faq", label: "FAQ" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        solid ? "border-b border-line/80 bg-white/85 backdrop-blur-xl" : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:h-[72px]">
        <a href="#hero" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-brand text-base font-bold text-white shadow-lg shadow-brand-500/25">
            အ
          </span>
          <span className="text-[17px] font-extrabold tracking-tight text-ink">
            Akkhara<span className="text-brand-500">.</span>
          </span>
        </a>

        <nav className="ml-6 hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-ink-3 transition hover:bg-brand-50 hover:text-brand-700"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <button
            onClick={() => window.dispatchEvent(new Event("akkhara:open-grammar"))}
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-2 transition hover:border-brand-300 hover:text-brand-600"
          >
            Grammar checker
          </button>
          <button
            onClick={() => window.dispatchEvent(new Event("akkhara:open-pdf"))}
            className="rounded-full bg-gradient-to-r from-brand-500 to-violet-brand px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:brightness-110"
          >
            Convert a PDF
          </button>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          className="ml-auto grid h-10 w-10 place-items-center rounded-xl border border-line bg-white text-ink lg:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="ak-fade border-t border-line bg-white px-4 pb-5 pt-3 lg:hidden">
          <nav className="grid gap-1">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-2 hover:bg-canvas"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 grid gap-2">
            <button
              onClick={() => {
                setOpen(false);
                window.dispatchEvent(new Event("akkhara:open-pdf"));
              }}
              className="rounded-full bg-gradient-to-r from-brand-500 to-violet-brand px-4 py-2.5 text-sm font-semibold text-white"
            >
              Convert a PDF
            </button>
            <button
              onClick={() => {
                setOpen(false);
                window.dispatchEvent(new Event("akkhara:open-grammar"));
              }}
              className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-ink-2"
            >
              Grammar checker
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
