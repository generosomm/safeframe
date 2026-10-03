/* =============================================================
   CHROME — the running timecode in the top-right corner.
   On the landing it counts session time like a recorder. It only
   writes to the DOM when the frame number changes (30 times a
   second, not 60), and requestAnimationFrame stops by itself in a
   hidden tab. The button pauses it; reduced-motion users start
   paused.
   ============================================================= */

import { formatTimecode } from "./util/timecode.js";

const FPS = 30;

export function initChrome() {
  const button = document.querySelector("[data-timecode]");
  if (!button) return;

  const value = button.querySelector(".chrome-tc-value");
  const tag = button.querySelector(".chrome-tc-tag");

  let elapsed = 0;       // seconds banked across pauses
  let resumedAt = null;  // performance.now() of the last resume; null while paused
  let lastFrame = -1;
  let raf = 0;

  const now = () =>
    elapsed + (resumedAt === null ? 0 : (performance.now() - resumedAt) / 1000);

  const render = () => {
    const seconds = now();
    const frame = Math.floor(seconds * FPS);
    if (frame === lastFrame) return;
    lastFrame = frame;
    value.textContent = formatTimecode(seconds, FPS);
  };

  const tick = () => {
    render();
    raf = requestAnimationFrame(tick);
  };

  const setRunning = (running) => {
    if (running) {
      resumedAt = performance.now();
      raf = requestAnimationFrame(tick);
    } else {
      elapsed = now();
      resumedAt = null;
      cancelAnimationFrame(raf);
      render();
    }
    button.setAttribute("aria-pressed", String(!running));
    tag.textContent = running ? "REC" : "PAUSED";
  };

  button.addEventListener("click", () => setRunning(resumedAt === null));

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  setRunning(!reduced);
}
