/* =============================================================
   STAGE — shows the media inside the 9:16 frame.
   The stage element is sized by CSS (container query units); this
   module only places the picture inside it. Placement is a rect in
   1080×1920 units turned into percentages, so it is identical at
   any screen size and the export (Phase 6) can reuse the same rect.
   ============================================================= */

import { subscribe } from "./state.js";
import { FRAME, fitRect, toPercent } from "./util/geometry.js";
import { describeAspect, fitNote } from "./util/aspect.js";

// TODO(phase 3): read each platform's nonVerticalFit from platforms.json.
// Until then every platform is assumed to letterbox ("contain").
const FIT_MODE = "contain";

let stage;
let layer;
let fileName;
let metaChip;
let aspectChip;

export function initStage() {
  stage = document.getElementById("stage");
  if (!stage) return;
  layer = stage.querySelector("[data-stage-media]");
  fileName = document.querySelector("[data-file-name]");
  metaChip = document.querySelector("[data-media-chip]");
  aspectChip = document.querySelector("[data-aspect-chip]");

  subscribe((state, changed) => {
    if (changed.includes("media")) render(state.media);
  });
}

function render(media) {
  if (!media) {
    layer.replaceChildren();
    delete stage.dataset.hasMedia;
    fileName.textContent = "No file loaded";
    metaChip.hidden = true;
    aspectChip.hidden = true;
    return;
  }

  const fit = fitRect(media.width, media.height, FIT_MODE);
  layer.style.left = toPercent(fit.x, FRAME.width);
  layer.style.top = toPercent(fit.y, FRAME.height);
  layer.style.width = toPercent(fit.w, FRAME.width);
  layer.style.height = toPercent(fit.h, FRAME.height);
  layer.replaceChildren(media.el);
  stage.dataset.hasMedia = media.kind;

  const aspect = describeAspect(media.width, media.height);
  fileName.textContent = media.name;

  const meta = [`${media.width}×${media.height}`, aspect.label];
  if (media.kind === "video") meta.push(formatDuration(media.duration));
  metaChip.textContent = meta.join(" · ");
  metaChip.hidden = false;

  aspectChip.hidden = aspect.isVertical;
  aspectChip.textContent = aspect.isVertical ? "" : `${aspect.label} detected · ${fitNote(aspect, FIT_MODE)}`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "live";
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
