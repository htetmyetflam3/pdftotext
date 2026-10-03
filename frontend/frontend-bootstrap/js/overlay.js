/**
 * The shared tool-overlay shell behaviour: one overlay at a time,
 * Escape closes, backdrop mousedown closes, the page behind is locked
 * while it is open and the close button takes focus — the same rules
 * the React ToolShell applies.
 */
const overlays = {
  pdf: () => document.getElementById("pdfOverlay"),
  grammar: () => document.getElementById("grammarOverlay"),
  upload: () => document.getElementById("uploadOverlay"),
};
const listeners = { pdf: [], grammar: [], upload: [] };
let previousOverflow = "";
let current = null;
export function onOverlayOpen(name, handler) {
  listeners[name].push(handler);
}
export function closeOverlay() {
  if (!current) return;
  overlays[current]().hidden = true;
  document.body.style.overflow = previousOverflow;
  current = null;
}
export function openOverlay(name) {
  if (current && current !== name) closeOverlay();
  const el = overlays[name]();
  if (!el || current === name) {
    if (current === name) listeners[name].forEach((fn) => fn());
    return;
  }
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  el.hidden = false;
  current = name;
  el.querySelector(".ts-x")?.focus();
  listeners[name].forEach((fn) => fn());
}
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeOverlay();
});
Object.values(overlays).forEach((get) => {
  const el = get();
  if (!el) return;
  el.addEventListener("mousedown", (event) => {
    if (event.target === el) closeOverlay();
  });
});
document
  .querySelectorAll("[data-close-overlay]")
  .forEach((button) => button.addEventListener("click", () => closeOverlay()));