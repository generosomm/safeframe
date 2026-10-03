/* =============================================================
   TWEEN — a 0 -> 1 progress loop on requestAnimationFrame. The
   tool's morphs are small enough that this replaces GSAP, so the
   tool never waits on a CDN script.
   ============================================================= */

/** Close to the CSS --ease-out curve (cubic-bezier(.16, 1, .3, 1)). */
export const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));

/**
 * Calls onUpdate(easedProgress) every frame for `duration` ms.
 * Returns a cancel function. A duration of 0 finishes immediately.
 */
export function tween({ duration, ease = easeOutExpo, onUpdate, onDone }) {
  if (!(duration > 0)) {
    onUpdate(1);
    onDone?.();
    return () => {};
  }
  const start = performance.now();
  let raf = requestAnimationFrame(function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    onUpdate(ease(t));
    if (t < 1) raf = requestAnimationFrame(frame);
    else onDone?.();
  });
  return () => cancelAnimationFrame(raf);
}

export const lerp = (a, b, t) => a + (b - a) * t;

export const lerpRect = (a, b, t) => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
});

/** Parse a CSS time token ("420ms", "0.4s") into milliseconds. */
export function toMs(value) {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return 0;
  return value.trim().endsWith("ms") ? n : n * 1000;
}
