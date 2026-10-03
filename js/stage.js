/* =============================================================
   STAGE — shows the media inside the 9:16 frame.
   The stage element is sized by CSS (container query units); this
   module only places the picture inside it. Placement is a rect in
   1080×1920 units turned into percentages, so it is identical at
   any screen size and the export (Phase 6) can reuse the same rect.
   ============================================================= */

import { getState, subscribe } from "./state.js";
import { ALL, getData, platforms, platformById, fitFor, loadZones } from "./zones.js";
import { FRAME, fitRect, toPercent } from "./util/geometry.js";
import { describeAspect, fitNote } from "./util/aspect.js";

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
    if (changed.includes("media")) mount(state.media);
    if (changed.includes("media") || changed.includes("platform")) place(state);
  });
  // Fit modes come from the data; re-place once it has arrived.
  loadZones().then(() => place(getState()), () => {});
}

/** The fit for the current view. "All" uses the shared mode, or
    "contain" if the platforms disagree (the chip lists each one). */
function currentFit(platformId) {
  if (!getData()) return "contain";
  if (platformId !== ALL) return fitFor(platformId);
  const modes = new Set(platforms().map((p) => fitFor(p.id)));
  return modes.size === 1 ? [...modes][0] : "contain";
}

function mount(media) {
  if (!media) {
    layer.replaceChildren();
    delete stage.dataset.hasMedia;
    fileName.textContent = "No file loaded";
    metaChip.hidden = true;
    aspectChip.hidden = true;
    return;
  }

  layer.replaceChildren(media.el);
  stage.dataset.hasMedia = media.kind;
  fileName.textContent = media.name;

  const aspect = describeAspect(media.width, media.height);
  const meta = [`${media.width}×${media.height}`, aspect.label];
  if (media.kind === "video") meta.push(formatDuration(media.duration));
  metaChip.textContent = meta.join(" · ");
  metaChip.hidden = false;
}

function place({ media, platform }) {
  if (!media) return;
  const fit = fitRect(media.width, media.height, currentFit(platform));
  layer.style.left = toPercent(fit.x, FRAME.width);
  layer.style.top = toPercent(fit.y, FRAME.height);
  layer.style.width = toPercent(fit.w, FRAME.width);
  layer.style.height = toPercent(fit.h, FRAME.height);

  const aspect = describeAspect(media.width, media.height);
  aspectChip.hidden = aspect.isVertical;
  aspectChip.textContent = aspect.isVertical ? "" : `${aspect.label} detected · ${fitSummary(aspect, platform)}`;
}

/** "will be letterboxed", or per platform when they differ:
    "TikTok, Reels letterboxed · Shorts cropped". */
function fitSummary(aspect, platformId) {
  if (!getData()) return fitNote(aspect, "contain");
  const ids = platformId === ALL ? platforms().map((p) => p.id) : [platformId];
  const groups = new Map();
  for (const id of ids) {
    const note = fitNote(aspect, fitFor(id));
    groups.set(note, [...(groups.get(note) ?? []), platformById(id)?.name ?? id]);
  }
  if (groups.size === 1) return [...groups.keys()][0];
  return [...groups].map(([note, names]) => `${names.join(", ")} ${note.replace("will be ", "")}`).join(" · ");
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "live";
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
