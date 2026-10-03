/* =============================================================
   ASPECT — names a picture's aspect ratio and says what fitting it
   into a 9:16 frame will do to it.
   ============================================================= */

// Ratios creators actually export, plus tall phone screenshots.
const NAMED = [
  [9, 16], [4, 5], [1, 1], [16, 9], [3, 4], [4, 3], [2, 3], [3, 2],
  [9, 18], [9, 19.5], [9, 20], [21, 9],
];

const VERTICAL = 9 / 16;

/** 1% either way still counts as 9:16 (1080×1916 is 9:16 in practice). */
const MATCH_916 = 0.01;
/** Snap to a named ratio within 1.5%, otherwise print it as N:1. */
const MATCH_NAMED = 0.015;

export function describeAspect(width, height) {
  const ratio = width / height;
  const named = NAMED.find(([w, h]) => Math.abs(ratio / (w / h) - 1) < MATCH_NAMED);

  return {
    ratio,
    label: named ? `${named[0]}:${named[1]}` : `${ratio.toFixed(2)}:1`,
    isVertical: Math.abs(ratio / VERTICAL - 1) < MATCH_916,
    // Wider than 9:16 gets bars top and bottom; narrower gets side bars.
    isWider: ratio > VERTICAL,
  };
}

/** What a fit mode does to a non-9:16 picture, in a few words. */
export function fitNote(aspect, mode = "contain") {
  if (aspect.isVertical) return "";
  if (mode === "cover") return "will be cropped";
  return aspect.isWider ? "will be letterboxed" : "will be pillarboxed";
}
