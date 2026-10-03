/* =============================================================
   MOCK UI — generic stand-ins for each app's interface, drawn from
   the zone rects alone: a stack of round buttons in the action
   column, username + caption + audio lines in the caption block,
   two tab pills in the top bar. No logos, no icons, no pixel copies.

   Renderer-agnostic: returns plain shapes, so the SVG overlay and
   the PNG export (Phase 6) draw exactly the same thing. Because the
   shapes are recomputed from the rects on every frame, they morph
   for free when the zones do.
   ============================================================= */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * @param {Record<string, {x,y,w,h}>} rects  display rect per zone type
 * @returns {Array<{shape:"rect"|"circle", x, y, w, h, r}>}
 */
export function mockShapes(rects) {
  const shapes = [];
  if (rects.topbar) topBar(rects.topbar, shapes);
  if (rects.actions) actionStack(rects.actions, shapes);
  if (rects.caption) captionBlock(rects.caption, rects.actions, shapes);
  return shapes;
}

/** Two tab pills, centred, sitting in the lower part of the bar
    (the phone's status bar is above them). */
function topBar(r, out) {
  const h = clamp(r.h * 0.3, 0, 30);
  if (h < 2) return;
  const cy = r.y + r.h * 0.62;
  const gap = 36;
  const widths = [150, 176];
  let x = r.x + r.w / 2 - (widths[0] + widths[1] + gap) / 2;
  for (const w of widths) {
    out.push({ shape: "rect", x, y: cy - h / 2, w, h, r: h / 2 });
    x += w + gap;
  }
}

/** Avatar plus four round buttons, stacked up from the column's foot. */
function actionStack(r, out) {
  const count = 5;
  let d = clamp(r.w * 0.6, 0, 84);
  let gap = d * 0.62;
  const needed = count * d + (count - 1) * gap + d * 0.2; // avatar is 20% larger
  const room = r.h * 0.72; // the stack never climbs into the top of the column
  if (needed > room && needed > 0) {
    const k = room / needed;
    d *= k;
    gap *= k;
  }
  if (d < 2) return;
  const cx = r.x + r.w / 2;
  let bottom = r.y + r.h - d * 0.5;
  for (let i = 0; i < count; i++) {
    const size = i === count - 1 ? d * 1.2 : d;
    out.push({ shape: "circle", x: cx, y: bottom - size / 2, r: size / 2 });
    bottom -= size + gap;
  }
}

/** Username, two caption lines and an audio line, top-left of the
    block, kept clear of the action column. */
function captionBlock(r, actions, out) {
  if (r.h < 40) return;
  const left = r.x + 48;
  const right = (actions ? actions.x : r.x + r.w) - 48;
  const maxW = Math.max(0, right - left);
  let y = r.y + 44;
  const line = (w, h, gapAfter) => {
    out.push({ shape: "rect", x: left, y, w: Math.min(w, maxW), h, r: h / 2 });
    y += h + gapAfter;
  };
  line(220, 30, 26);  // username
  line(640, 24, 18);  // caption line 1
  line(480, 24, 26);  // caption line 2
  out.push({ shape: "circle", x: left + 14, y: y + 14, r: 14 }); // audio disc
  out.push({ shape: "rect", x: left + 40, y: y + 4, w: Math.min(300, maxW - 40), h: 20, r: 10 });
}
