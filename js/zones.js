/* =============================================================
   ZONES — loads data/platforms.json and answers questions about it.
   This is the only module that knows the file's shape; everything
   else asks here ("zones for Reels on Strict", "the universal safe
   area"), so a schema change touches one file.
   ============================================================= */

import { FRAME } from "./util/geometry.js";

export const ALL = "all";
const DATA_URL = "data/platforms.json";

let data = null;
let loading = null;

/** Fetch once; every caller shares the same promise. */
export function loadZones() {
  loading ??= fetch(DATA_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`${DATA_URL}: HTTP ${response.status}`);
      return response.json();
    })
    .then((json) => {
      validate(json);
      data = json;
      return json;
    });
  return loading;
}

export const getData = () => data;
export const platforms = () => data?.platforms ?? [];
export const presets = () => data?.presets ?? [];
export const platformById = (id) => platforms().find((p) => p.id === id) ?? null;
export const presetById = (id) => presets().find((p) => p.id === id) ?? null;

/** Every zone id used anywhere, in first-seen order (stable morph keys). */
export function zoneIds() {
  const ids = [];
  for (const platform of platforms()) {
    for (const preset of Object.values(platform.presets)) {
      for (const zone of preset.zones) if (!ids.includes(zone.id)) ids.push(zone.id);
    }
  }
  return ids;
}

export function zonesFor(platformId, presetId) {
  return platformById(platformId)?.presets[presetId]?.zones ?? [];
}

export function zoneFor(platformId, presetId, zoneId) {
  return zonesFor(platformId, presetId).find((zone) => zone.id === zoneId) ?? null;
}

/** A zone's label and type, taken from whichever platform defines it. */
export function zoneInfo(zoneId) {
  for (const platform of platforms()) {
    for (const preset of Object.values(platform.presets)) {
      const zone = preset.zones.find((z) => z.id === zoneId);
      if (zone) return { label: zone.label, type: zone.type };
    }
  }
  return { label: zoneId, type: "other" };
}

export function safeFor(platformId, presetId) {
  return platformById(platformId)?.presets[presetId]?.safe ?? null;
}

/** The area visible on every platform: the intersection of safe rects. */
export function universalSafe(presetId) {
  let left = 0;
  let top = 0;
  let right = FRAME.width;
  let bottom = FRAME.height;
  for (const platform of platforms()) {
    const safe = platform.presets[presetId]?.safe;
    if (!safe) continue;
    left = Math.max(left, safe.x);
    top = Math.max(top, safe.y);
    right = Math.min(right, safe.x + safe.w);
    bottom = Math.min(bottom, safe.y + safe.h);
  }
  return { x: left, y: top, w: Math.max(0, right - left), h: Math.max(0, bottom - top) };
}

/** How a platform fits non-9:16 media ("contain" | "cover"). */
export function fitFor(platformId) {
  return platformById(platformId)?.nonVerticalFit ?? "contain";
}

/** The oldest lastChecked date across platforms (the honest one to show). */
export function oldestCheck() {
  const dates = platforms().map((p) => p.lastChecked).filter(Boolean).sort();
  return dates[0] ?? null;
}

export const anyUnverified = () => platforms().some((p) => !p.verified);

/* ---- Validation ------------------------------------------------
   Catches hand-editing mistakes (a typo'd rect, a margin that does
   not match its safe area) the moment the file loads. Warnings only:
   the tool still runs with whatever is there. */

function validate(json) {
  const problems = [];
  const inFrame = (r) =>
    r && r.w >= 0 && r.h >= 0 && r.x >= 0 && r.y >= 0 &&
    r.x + r.w <= FRAME.width && r.y + r.h <= FRAME.height;

  for (const platform of json.platforms ?? []) {
    for (const preset of json.presets ?? []) {
      const entry = platform.presets?.[preset.id];
      const where = `${platform.id}/${preset.id}`;
      if (!entry) {
        problems.push(`${where}: missing`);
        continue;
      }
      if (!inFrame(entry.safe)) problems.push(`${where}: safe rect outside the frame`);
      for (const zone of entry.zones) {
        if (!inFrame(zone.rect)) problems.push(`${where}/${zone.id}: rect outside the frame`);
      }
      const m = entry.margins;
      if (m) {
        const expected = { x: m.left, y: m.top, w: FRAME.width - m.left - m.right, h: FRAME.height - m.top - m.bottom };
        if (["x", "y", "w", "h"].some((k) => expected[k] !== entry.safe?.[k])) {
          problems.push(`${where}: safe rect does not match its margins`);
        }
      }
    }
  }
  if (problems.length) console.warn("platforms.json:\n  " + problems.join("\n  "));
}
