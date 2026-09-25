import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "../utils/cn";

/* ------------------------------------------------------------------
   One shell for every tool overlay — identical chrome, header, body
   grid and footer, so the PDF tool and the Grammar tool are twins.
------------------------------------------------------------------ */

export type ToolShellProps = {
  open: boolean;
  onClose: () => void;
  file: string;
  status: string;
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  icon: ReactNode;
  badges?: string[];
  footer?: ReactNode;
  children: ReactNode;
};

export function ToolShell({
  open,
  onClose,
  file,
  status,
  eyebrow,
  title,
  subtitle,
  icon,
  badges = [],
  footer,
  children,
}: ToolShellProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="ak-fade fixed inset-0 z-90 flex items-start justify-center overflow-y-auto bg-ink/65 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={eyebrow}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="ak-zoom my-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-line bg-white shadow-[0_40px_120px_-40px_rgba(10,17,36,0.6)]">
        {/* window chrome */}
        <div className="flex items-center gap-3 border-b border-line bg-gradient-to-r from-brand-50 via-white to-[#eafaf8] px-4 py-3 sm:px-6">
          <span className="flex items-center gap-1.5">
            <i className="h-3 w-3 rounded-full bg-rose-brand" />
            <i className="h-3 w-3 rounded-full bg-amber-brand" />
            <i className="h-3 w-3 rounded-full bg-teal-brand" />
          </span>
          <span className="truncate font-mono text-[11px] text-muted sm:text-xs">{file}</span>
          <span className="ml-auto hidden items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-[11px] font-semibold text-brand-600 sm:inline-flex">
            <i className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-brand" />
            {status}
          </span>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full border border-line bg-white text-ink-3 transition hover:border-rose-brand hover:text-rose-brand"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* header */}
        <div className="flex flex-col gap-4 border-b border-line px-4 py-5 sm:flex-row sm:items-center sm:px-6">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-brand text-white shadow-lg shadow-brand-500/25">
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">{eyebrow}</p>
            <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{title}</h2>
            <p className="font-mm mt-1 text-sm text-muted">{subtitle}</p>
          </div>
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <span key={b} className="rounded-full border border-line bg-canvas px-3 py-1 text-[11px] font-semibold text-ink-3">
                  {b}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* body */}
        <div className="ak-scroll max-h-[min(66vh,720px)] overflow-y-auto bg-canvas px-4 py-5 sm:px-6">{children}</div>

        {/* footer */}
        {footer && (
          <div className="flex flex-col gap-3 border-t border-line bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------- shared bits ---------------------------- */

export function Panel({
  title,
  hint,
  actions,
  children,
  className,
}: {
  title: string;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col overflow-hidden rounded-2xl border border-line bg-white", className)}>
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <h3 className="text-sm font-bold text-ink">{title}</h3>
        {hint && <span className="hidden text-[11px] text-muted sm:inline">{hint}</span>}
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col p-4">{children}</div>
    </section>
  );
}

export function Btn({
  children,
  onClick,
  variant = "ghost",
  size = "md",
  disabled,
  type = "button",
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "soft";
  size?: "sm" | "md";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-45",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-5 py-2.5 text-sm",
        variant === "primary" &&
          "bg-gradient-to-r from-brand-500 to-violet-brand text-white shadow-lg shadow-brand-500/25 hover:brightness-110",
        variant === "soft" && "border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100",
        variant === "ghost" && "border border-line bg-white text-ink-2 hover:border-brand-300 hover:text-brand-600",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 text-center">
      <p className="text-base font-extrabold leading-none text-ink">{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}
