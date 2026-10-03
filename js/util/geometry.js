/* =============================================================
   GEOMETRY — the shared coordinate space.
   Everything in SafeFrame (zones, boxes, media placement, exports)
   is measured in one 1080×1920 frame, whatever size it is drawn at.
   The screen is just a scaled view of that frame.
   ============================================================= */

export const FRAME = Object.freeze({ width: 1080, height: 1920 });

/**
 * Place a srcW×srcH picture in the frame, centred.
 *   contain: the whole picture is visible; bars fill the rest
 *   cover:   the frame is filled; the picture's edges are cropped
 * Returns { x, y, w, h } in frame units (may go negative for cover).
 */
export function fitRect(srcW, srcH, mode = "contain", frame = FRAME) {
  const scaleX = frame.width / srcW;
  const scaleY = frame.height / srcH;
  const scale = mode === "cover" ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
  const w = srcW * scale;
  const h = srcH * scale;
  return { x: (frame.width - w) / 2, y: (frame.height - h) / 2, w, h };
}

/** A frame-unit length as a percentage of a frame dimension, for CSS. */
export function toPercent(value, total) {
  return `${(value / total) * 100}%`;
}
