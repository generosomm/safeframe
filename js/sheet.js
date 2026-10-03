/* =============================================================
   SHEET — the tool's bottom sheet on screens under 1024px.
   The handle cycles peek -> half -> full. Tabbing into a control
   that is still below the screen edge opens the sheet, so keyboard
   focus never lands somewhere you cannot see. Escape collapses it.
   Drag-to-snap arrives in the Phase 8 responsive pass.
   ============================================================= */

const STATES = ["peek", "half", "full"];
const LABELS = {
  peek: "Show more controls",
  half: "Show all controls",
  full: "Collapse controls",
};

export function initSheet() {
  const sheet = document.getElementById("tool-sheet");
  const handle = sheet?.querySelector(".sheet-handle");
  if (!handle) return;

  const label = handle.querySelector("[data-sheet-label]");
  const peekArea = sheet.querySelector("[data-sheet-peek]");
  const desktop = window.matchMedia("(min-width: 1024px)");

  const set = (state) => {
    sheet.dataset.state = state;
    handle.setAttribute("aria-expanded", String(state !== "peek"));
    label.textContent = LABELS[state];
  };

  handle.addEventListener("click", () => {
    const next = STATES[(STATES.indexOf(sheet.dataset.state) + 1) % STATES.length];
    set(next);
  });

  sheet.addEventListener("focusin", (event) => {
    if (desktop.matches || sheet.dataset.state !== "peek") return;
    if (event.target === handle || peekArea?.contains(event.target)) return;
    set("full");
  });

  sheet.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || desktop.matches || sheet.dataset.state === "peek") return;
    set("peek");
    handle.focus();
  });

  // Leaving the tool always resets the sheet for next time.
  document.addEventListener("view:change", () => set("peek"));
}
