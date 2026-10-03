/**
 * Page chrome: nav, hero slider, the data-driven lists (marquee,
 * comparison, benefits, FAQ), the in-view reveal and the sticky bar.
 * Same data and same interactions as the React components it mirrors.
 */
import { initPdfDemo } from "./pdf-demo.js";
import { initGrammarTool } from "./grammar-tool.js";
import { initUploadTool } from "./upload-tool.js";
import { openOverlay } from "./overlay.js";
const nav = document.getElementById("nav");
const burger = document.getElementById("navBurger");
const onNavScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 24);
onNavScroll();
window.addEventListener("scroll", onNavScroll, { passive: true });
new MutationObserver(() => nav.classList.toggle("glass", nav.classList.contains("is-scrolled")))
  .observe(nav, { attributes: true, attributeFilter: ["class"] });
burger.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  burger.setAttribute("aria-expanded", String(open));
});
document.querySelectorAll("[data-nav-close]").forEach((link) =>
  link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
  })
);
const scrollToHero = () =>
  document.getElementById("hero")?.scrollIntoView({ behavior: "smooth", block: "start" });
document.querySelectorAll("[data-open-pdf]").forEach((el) =>
  el.addEventListener("click", () => openOverlay("pdf"))
);
document.querySelectorAll("[data-open-pdf-scroll]").forEach((el) =>
  el.addEventListener("click", () => {
    nav.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    scrollToHero();
    window.setTimeout(() => openOverlay("pdf"), 440);
  })
);
const setUploadFlow = (flow) =>
  window.dispatchEvent(new CustomEvent("akkhara:upload-flow", { detail: flow }));
document.querySelectorAll("[data-open-upload-scroll]").forEach((el) =>
  el.addEventListener("click", () => {
    nav.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    setUploadFlow("conversion");
    scrollToHero();
    window.setTimeout(() => openOverlay("upload"), 440);
  })
);
document.querySelectorAll("[data-open-analysis]").forEach((el) =>
  el.addEventListener("click", () => {
    setUploadFlow("analysis");
    openOverlay("upload");
  })
);
document.querySelectorAll("[data-open-grammar-scroll]").forEach((el) =>
  el.addEventListener("click", () => {
    scrollToHero();
    window.setTimeout(() => openOverlay("grammar"), 450);
  })
);
const track = document.getElementById("heroTrack");
const pagerButtons = Array.from(document.querySelectorAll(".lp-pager-bar button"));
let slide = 0;
function setSlide(next) {
  slide = next;
  track.style.transform = `translateX(-${slide * 100}%)`;
  pagerButtons.forEach((button, i) => {
    button.className = i === slide ? (i === 0 ? "is-active is-blue" : "is-active is-indigo") : "";
  });
}
pagerButtons.forEach((button, i) => button.addEventListener("click", () => setSlide(i)));
document
  .querySelectorAll("[data-slide-step]")
  .forEach((button) => button.addEventListener("click", () => setSlide(slide === 0 ? 1 : 0)));
window.setInterval(() => {
  if (window.innerWidth < 1024) return;
  setSlide(slide === 0 ? 1 : 0);
}, 6000);
const TAGS = [
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
document.getElementById("proofMarquee").innerHTML = [...TAGS, ...TAGS]
  .map(
    (tag) =>
      `<span class="ak-marquee-item mm"><span class="ak-marquee-dot"></span>${tag}</span>`
  )
  .join("");
const ROWS = [
  { label: "ပုံမှန် Unicode text-based PDF", cells: ["yes", "part", "yes"], notes: ["ပုံမှန် encoding အတွက်သင့်", "မလိုအပ်ဘဲ pixel ဖတ်", "တိုက်ရိုက် extract"] },
  { label: "Embedded Zawgyi/Myanmar font PDF", cells: ["part", "part", "yes"], notes: ["စာပျောက်/ပျက်နိုင်", "မြင်ကွင်းကနေ ခန့်မှန်း", "font mapping ကို ဖတ်"] },
  { label: "Scan / image-only PDF", cells: ["no", "yes", "part"], notes: ["text layer မရှိ", "အဓိကအသုံးပြုရာ", "custom OCR ဖွံ့ဖြိုးဆဲ"] },
  { label: "ရွေးချယ်၊ ရှာဖွေ၊ ကူးယူနိုင်သော စာသား", cells: ["yes", "part", "yes"], notes: ["mapping မှန်လျှင်", "OCR အမှား စစ်ရန်လို", "Unicode output"] },
  { label: "TXT / DOCX ထုတ်ယူခြင်း", cells: ["part", "part", "yes"], notes: ["tool အလိုက်ကွာ", "tool အလိုက်ကွာ", "TXT + DOCX"] },
  { label: "ထုတ်ယူပြီး ပြန်လည်စစ်ဆေးရန်", cells: ["part", "yes", "yes"], notes: ["legacy font စစ်ရန်", "recognition စစ်ရန်", "မူရင်းနှင့် နှိုင်းရန်"] },
];
const HEAD = ["Standard text extractor", "Stock OCR", "AKKHARA"];
const CHECK_SVG =
  '<svg width="14" height="14" fill="none" stroke="#eafff5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#i-check"></use></svg>';
const MINUS_SVG =
  '<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#i-minus"></use></svg>';
function mark(kind) {
  if (kind === "yes")
    return `<span class="ak-mk is-yes"><span class="ak-mk-ico">${CHECK_SVG}</span><span class="micro">full</span></span>`;
  if (kind === "part")
    return `<span class="ak-mk is-part"><span class="ak-mk-ico">${MINUS_SVG}</span><span class="micro">partial</span></span>`;
  return `<span class="ak-mk is-no"><span class="ak-mk-ico">${MINUS_SVG}</span><span class="micro">none</span></span>`;
}
document.getElementById("cmpRows").innerHTML = ROWS.map(
  (row, i) => `
      <tr class="reveal is-fast" style="--reveal-y: 14px; --reveal-delay: ${i * 0.06}s">
        <td class="is-crit mm">${row.label}</td>
        ${row.cells
          .map(
            (cell, j) => `<td>${mark(cell)}<div class="ak-cmp-note mm${j === 2 ? " is-us" : ""}">${row.notes[j]}</div></td>`
          )
          .join("")}
      </tr>`
).join("");
document.getElementById("cmpCards").innerHTML = ROWS.map(
  (row, i) => `
      <article class="ak-cmp-card reveal is-fast" style="--reveal-y: 14px; --reveal-delay: ${i * 0.04}s" role="row">
        <h3 class="mm">${row.label}</h3>
        <div class="ak-cmp-rows">
          ${row.cells
            .map(
              (cell, j) => `
            <div class="ak-cmp-row${j === 2 ? " is-us" : ""}" role="cell">
              <div class="min-w-0">
                <div class="ak-cmp-row-h mm">${HEAD[j]}</div>
                <div class="ak-cmp-note mm${j === 2 ? " is-us" : ""}">${row.notes[j]}</div>
              </div>
              ${mark(cell)}
            </div>`
            )
            .join("")}
        </div>
      </article>`
).join("");
const ICONS = {
  scanText:
    '<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#i-scan-lines"></use></svg>',
  layers:
    '<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#i-layers"></use></svg>',
  check:
    '<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#i-check"></use></svg>',
  keyboard:
    '<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#i-keyboard"></use></svg>',
  arrowUpRight:
    '<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#i-arrow-up-right"></use></svg>',
};
const BENEFITS = [
  { icon: "scanText", t: "Embedded font mapping ကို ဖတ်တယ်", d: "ပုံမှန် extractor က ကျော်သွားနိုင်တဲ့ legacy Myanmar glyph mapping ကို parser က ပြန်ဖော်ထုတ်ဖို့ ရည်ရွယ်ထားပါတယ်။" },
  { icon: "layers", t: "စာမျက်နှာအလိုက် ခွဲခြားတယ်", d: "PDF တစ်ခုလုံးကို တစ်မျိုးတည်း မယူဘဲ page တစ်ခုချင်း Zawgyi/Unicode detection ရလဒ်နဲ့ ဆက်လက်စီမံပါတယ်။" },
  { icon: "check", t: "ရလဒ်ကို စစ်ဆေးလို့ရတယ်", d: "ထုတ်ယူထားတဲ့ Unicode စာသားကို မူရင်း PDF နဲ့ ဘေးချင်းယှဉ်ပြီး English၊ punctuation နဲ့ စာလုံးစီစဉ်မှုကို ပြန်စစ်နိုင်ပါတယ်။" },
  { icon: "keyboard", t: "စာသားကို browser ထဲမှာ ပြောင်းတယ်", d: "Paste လုပ်ထားတဲ့ Zawgyi စာသားအတွက် browser အတွင်းက Zawgyi → Unicode tool ကို သီးခြား အသုံးပြုနိုင်ပါတယ်။" },
  { icon: "arrowUpRight", t: "TXT နဲ့ DOCX ဆက်သုံးနိုင်တယ်", d: "စစ်ဆေးပြီးသား output ကို TXT သို့မဟုတ် DOCX အဖြစ် ထုတ်ယူနိုင်ပြီး complex layout တွေကို Word မှာ ပြန်စစ်သင့်ပါတယ်။" },
  { icon: "scanText", t: "Custom OCR ကို ဖွံ့ဖြိုးနေတယ်", d: "Scan PDF အတွက် Tesseract recognition model ကို ကိုယ်ပိုင် Myanmar document analysis နဲ့ processing logic တို့နဲ့ ပေါင်းစပ်နေပါတယ်။" },
];
document.getElementById("benefitsGrid").innerHTML = BENEFITS.map(
  (benefit, i) => `
      <div class="reveal" style="--reveal-delay: ${(i % 3) * 0.08}s">
        <div class="ak-ben-cell">
          ${ICONS[benefit.icon]}
          <h3 class="ak-ben-t mm-display">${benefit.t}</h3>
          <p class="ak-ben-d mm">${benefit.d}</p>
          <span class="ak-ben-i micro">0${i + 1} / benefit</span>
        </div>
      </div>`
).join("");
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
const PLUS_SVG =
  '<svg class="ak-faq-plus" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#i-plus"></use></svg>';
const FAQ_MINUS_SVG =
  '<svg class="ak-faq-minus" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#i-minus"></use></svg>';
const faqList = document.getElementById("faqList");
faqList.innerHTML = FAQ.map(
  (item, i) => `
      <div class="reveal" style="--reveal-y: 16px; --reveal-delay: ${i * 0.05}s">
        <div class="ak-faq-item${i === 0 ? " is-open" : ""}">
          <button type="button" class="ak-faq-q" aria-expanded="${i === 0}">
            <span class="ak-faq-n font-mono2">0${i + 1}</span>
            <span class="ak-faq-t mm">${item.q}</span>
            <span class="ak-faq-ico">${PLUS_SVG}${FAQ_MINUS_SVG}</span>
          </button>
          <div class="ak-faq-a"><p class="mm">${item.a}</p></div>
        </div>
      </div>`
).join("");
faqList.querySelectorAll(".ak-faq-q").forEach((button) =>
  button.addEventListener("click", () => {
    const item = button.closest(".ak-faq-item");
    const wasOpen = item.classList.contains("is-open");
    faqList.querySelectorAll(".ak-faq-item").forEach((other) => {
      other.classList.remove("is-open");
      other.querySelector(".ak-faq-q").setAttribute("aria-expanded", "false");
    });
    if (!wasOpen) {
      item.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
    }
  })
);
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.2 }
);
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
const sticky = document.getElementById("stickyCta");
let stickyGone = false;
const onStickyScroll = () => sticky.classList.toggle("is-show", !stickyGone && window.scrollY > 760);
onStickyScroll();
window.addEventListener("scroll", onStickyScroll, { passive: true });
document.getElementById("stickyClose").addEventListener("click", () => {
  stickyGone = true;
  sticky.classList.remove("is-show");
});
initPdfDemo();
initGrammarTool();
initUploadTool();