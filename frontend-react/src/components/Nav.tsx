import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ArrowUpRight } from "lucide-react";

const LINKS = [
  { href: "#how", label: "ဘယ်လိုအလုပ်လုပ်သလဲ" },
  { href: "#compare", label: "နှိုင်းယှဉ်ကြည့်ပါ" },
  { href: "#features", label: "လုပ်ဆောင်ချက်" },
  { href: "#faq", label: "မေးခွန်းများ" },
];

export function Mark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="mk" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C63B26" />
          <stop offset="100%" stopColor="#E0A63C" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="45" height="45" rx="11" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M9 16.5l4.2-3.4 4 3.4 4.3-3.4 4 3.4 4.3-3.4 4 3.4 4.2-3.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.42"
      />
      <path
        d="M9 26.5h30M9 34.5h22"
        fill="none"
        stroke="url(#mk)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="36.5" cy="34.5" r="3.2" fill="url(#mk)" />
    </svg>
  );
}

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openPdf = () => {
    setOpen(false);
    document
      .getElementById("hero")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.dispatchEvent(new CustomEvent("akkhara:open-pdf"));
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "glass shadow-[0_10px_40px_-30px_rgba(14,22,38,0.9)] border-b border-[#0e1626]/12"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-[1440px] items-center gap-6 px-5 py-3.5 sm:px-8 lg:px-12">
        <a href="#hero" className="flex items-center gap-3 text-[#0e1626]">
          <Mark />
          <span className="leading-none">
            <span className="block font-display text-[1.35rem] font-black tracking-tight">
              AKKHARA
            </span>
            <span className="micro block text-[#7a7266]">myanmar pdf lab</span>
          </span>
        </a>

        <nav className="ml-auto hidden items-center gap-8 lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="sweep mm text-[0.92rem] font-medium text-[#0e1626]/80 transition-colors hover:text-[#0e1626]"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3 lg:ml-0">
          <button
            onClick={openPdf}
            className="btn btn-primary btn-sm hidden sm:inline-flex"
            aria-label="PDF တင်ရန်"
          >
            PDF တင်ရန်
            <ArrowUpRight size={16} strokeWidth={2.4} />
          </button>
          <button
            className="grid h-10 w-10 place-items-center rounded-full border border-[#0e1626]/20 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="မီနူး"
            aria-expanded={open}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden border-t border-[#0e1626]/10 glass lg:hidden"
          >
            <div className="flex flex-col gap-1 px-5 py-4">
              {LINKS.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 * i + 0.05 }}
                  className="mm rounded-lg px-2 py-3 text-[1rem] font-medium text-[#0e1626] hover:bg-[#0e1626]/6"
                >
                  {l.label}
                </motion.a>
              ))}
              <button onClick={openPdf} className="btn btn-primary mt-2 w-full">
                PDF တင်ရန်
                <ArrowUpRight size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
