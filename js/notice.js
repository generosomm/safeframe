/* =============================================================
   NOTICE — short status messages ("Opening clip.mp4…", "Can't
   open that file"). Writes into one polite live region that is
   always in the accessibility tree, so every message is announced.
   ============================================================= */

let el;
let timer = 0;

export function notify(message, { tone = "info", timeout = 6000 } = {}) {
  el ??= document.getElementById("notice");
  if (!el) return;
  clearTimeout(timer);
  el.textContent = message;
  el.dataset.tone = tone;
  el.dataset.visible = "";
  if (timeout) timer = setTimeout(clearNotice, timeout);
}

export function clearNotice() {
  if (!el) return;
  clearTimeout(timer);
  delete el.dataset.visible;
  el.textContent = "";
}
