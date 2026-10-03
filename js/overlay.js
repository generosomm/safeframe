/* =============================================================
   OVERLAY — draws the platform zones on the stage and morphs them.

   One <svg viewBox="0 0 1080 1920"> sits on top of the media, so
   every rect from platforms.json is drawn in its own units and the
   browser does the scaling.

   The morph: there is one rect per (platform, zone) pair, always.
   With a single platform selected, every platform's rect for a zone
   is moved onto that platform's rect; with "All", each goes to its
   own. Switching platforms just tweens all of them to new targets.
   The rects are white shapes in an SVG <mask>, and one translucent
   fill is painted through it, so overlapping rects never stack into
   darker patches: what you see is exactly the union of the zones.
   ============================================================= */

import { getState, subscribe } from "./state.js";
import {
  ALL, loadZones, platforms, zoneIds, zoneFor, zoneInfo, universalSafe,
} from "./zones.js";
import { mockShapes } from "./mockui.js";
import { FRAME } from "./util/geometry.js";
import { tween, lerpRect, toMs } from "./util/tween.js";
import { cssVar } from "./util/css.js";
import { notify } from "./notice.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const LABEL_PX = 11; // on-screen label size, whatever the stage size

let svg;
let maskGroup;
let edgeGroup;
let labelGroup;
let mockGroup;
let safeRect;
let safeLabel;

const pairEls = new Map();   // "reels:caption" -> { mask, edge }
const labelEls = new Map();  // "caption" -> <text>
let current = null;          // Map key -> rect, the frame on screen
let cancelMorph = () => {};
let px = 1;                  // frame units per screen pixel

export async function initOverlay() {
  svg = document.querySelector("[data-overlay]");
  if (!svg) return;
  maskGroup = svg.querySelector("[data-zone-mask]");
  edgeGroup = svg.querySelector("[data-zone-edges]");
  labelGroup = svg.querySelector("[data-zone-labels]");
  mockGroup = svg.querySelector("[data-mock]");
  safeRect = svg.querySelector("[data-safe]");
  safeLabel = svg.querySelector("[data-safe-label]");

  watchScale();

  try {
    await loadZones();
  } catch (error) {
    console.error(error);
    notify("Couldn't load the zone data. Reload to try again.", { tone: "error" });
    return;
  }

  build();
  applyLayers(getState().layers);
  morphTo(getState(), { animate: false });

  subscribe((state, changed) => {
    if (changed.includes("platform") || changed.includes("preset")) morphTo(state, { animate: true });
    if (changed.includes("layers")) applyLayers(state.layers);
  });
}

/* ---- Build the fixed set of elements ---------------------------- */

const el = (name, attrs = {}) => {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
};

function build() {
  for (const platform of platforms()) {
    for (const zoneId of zoneIds()) {
      const mask = el("rect", { fill: "#fff" });
      const edge = el("rect", { class: "zone-edge" });
      maskGroup.append(mask);
      edgeGroup.append(edge);
      pairEls.set(`${platform.id}:${zoneId}`, { mask, edge });
    }
  }
  for (const zoneId of zoneIds()) {
    const text = el("text", { class: "zone-label" });
    text.textContent = zoneInfo(zoneId).label.toUpperCase();
    labelGroup.append(text);
    labelEls.set(zoneId, text);
  }
}

/* ---- Targets ---------------------------------------------------- */

/** Where every (platform, zone) rect should end up for this state. */
function targets({ platform, preset }) {
  const out = new Map();
  for (const p of platforms()) {
    const source = platform === ALL ? p.id : platform;
    for (const zoneId of zoneIds()) {
      const zone = zoneFor(source, preset, zoneId);
      out.set(`${p.id}:${zoneId}`, zone ? { ...zone.rect } : collapsed(zoneId, preset));
    }
  }
  out.set("safe", universalSafe(preset));
  return out;
}

/** A zone this platform doesn't have: a zero-width sliver on the
    frame edge it would grow from, so it can morph in and out. */
function collapsed(zoneId, preset) {
  const ref =
    platforms().map((p) => zoneFor(p.id, preset, zoneId)?.rect).find(Boolean) ??
    platforms().flatMap((p) => Object.values(p.presets)).flatMap((e) => e.zones).find((z) => z.id === zoneId)?.rect;
  if (!ref) return { x: 0, y: 0, w: 0, h: 0 };

  const r = { ...ref };
  if (r.x === 0 && r.w < FRAME.width) r.w = 0;
  else if (r.x + r.w === FRAME.width && r.x > 0) { r.x = FRAME.width; r.w = 0; }
  else if (r.y === 0) r.h = 0;
  else if (r.y + r.h === FRAME.height) { r.y = FRAME.height; r.h = 0; }
  else { r.x += r.w / 2; r.y += r.h / 2; r.w = 0; r.h = 0; }
  return r;
}

/* ---- Morph ------------------------------------------------------- */

function morphTo(state, { animate }) {
  const to = targets(state);
  cancelMorph();

  if (!animate || !current) {
    current = to;
    render();
    return;
  }

  const from = new Map(current);
  cancelMorph = tween({
    duration: toMs(cssVar("--dur-morph")),
    onUpdate: (t) => {
      for (const [key, rect] of to) current.set(key, lerpRect(from.get(key) ?? rect, rect, t));
      render();
    },
  });
}

/* ---- Render one frame -------------------------------------------- */

const area = (r) => r.w * r.h;

function setRect(node, r) {
  node.setAttribute("x", r.x);
  node.setAttribute("y", r.y);
  node.setAttribute("width", Math.max(0, r.w));
  node.setAttribute("height", Math.max(0, r.h));
}

function render() {
  for (const [key, { mask, edge }] of pairEls) {
    const r = current.get(key);
    setRect(mask, r);
    setRect(edge, r);
    edge.style.display = r.w < 0.5 || r.h < 0.5 ? "none" : "";
  }

  // One display rect per zone: the largest across platforms (in single
  // mode they are all the same). Labels and mock UI follow these.
  const display = new Map();
  for (const zoneId of zoneIds()) {
    let best = null;
    for (const p of platforms()) {
      const r = current.get(`${p.id}:${zoneId}`);
      if (!best || area(r) > area(best)) best = r;
    }
    display.set(zoneId, best);
  }

  const byType = {};
  for (const [zoneId, r] of display) {
    const { type } = zoneInfo(zoneId);
    if (!byType[type] && r.w > 0.5 && r.h > 0.5) byType[type] = r;
  }

  // Horizontal labels start right of the edge margin, so "TOP BAR"
  // never runs into the vertical "EDGE MARGIN" in the corner.
  const minX = byType.edge ? byType.edge.x + byType.edge.w : 0;
  for (const [zoneId, text] of labelEls) placeLabel(text, zoneInfo(zoneId).type, display.get(zoneId), minX);

  drawMock(mockShapes(byType));

  const safe = current.get("safe");
  setRect(safeRect, safe);
  safeLabel.setAttribute("x", safe.x + 8 * px);
  safeLabel.setAttribute("y", safe.y + (LABEL_PX + 8) * px);
}

/** Labels hug a corner of their zone; tall, narrow zones read top to
    bottom. Hidden when the zone is too thin to hold the text. */
function placeLabel(text, type, r, minX) {
  const size = LABEL_PX * px;
  const pad = 8 * px;
  const vertical = r.h > r.w;
  const thickness = vertical ? r.w : r.h;
  text.style.display = thickness < size * 1.5 ? "none" : "";

  if (vertical) {
    const cx = r.x + r.w / 2 + size * 0.35;
    const y = r.y + pad;
    text.setAttribute("x", cx);
    text.setAttribute("y", y);
    text.setAttribute("text-anchor", "start");
    text.setAttribute("transform", `rotate(90 ${cx} ${y})`);
    return;
  }

  text.removeAttribute("transform");
  if (type === "caption") {
    // Top-right: the mock caption lines live on the left.
    text.setAttribute("x", r.x + r.w - pad);
    text.setAttribute("text-anchor", "end");
    text.setAttribute("y", r.y + pad + size);
  } else {
    text.setAttribute("x", Math.max(r.x, minX) + pad);
    text.setAttribute("text-anchor", "start");
    text.setAttribute("y", r.y + r.h - pad);
  }
}

/** Reuse a pool of shape elements; add or drop only when the count changes. */
function drawMock(shapes) {
  while (mockGroup.childElementCount > shapes.length) mockGroup.lastElementChild.remove();
  shapes.forEach((s, i) => {
    let node = mockGroup.children[i];
    const tag = s.shape === "circle" ? "circle" : "rect";
    if (!node || node.tagName !== tag) {
      const fresh = el(tag);
      node ? node.replaceWith(fresh) : mockGroup.append(fresh);
      node = fresh;
    }
    if (tag === "circle") {
      node.setAttribute("cx", s.x);
      node.setAttribute("cy", s.y);
      node.setAttribute("r", Math.max(0, s.r));
    } else {
      setRect(node, s);
      node.setAttribute("rx", s.r);
    }
  });
}

/* ---- Layers and scale -------------------------------------------- */

function applyLayers(layers) {
  for (const group of svg.querySelectorAll("[data-layer]")) {
    group.toggleAttribute("data-off", !layers[group.dataset.layer]);
  }
}

/** Keep strokes and labels a constant on-screen size: the SVG reads
    --px (frame units per screen pixel) in its CSS. */
function watchScale() {
  const update = () => {
    const width = svg.getBoundingClientRect().width;
    if (!width) return;
    px = FRAME.width / width;
    svg.style.setProperty("--px", px);
    if (current) render();
  };
  new ResizeObserver(update).observe(svg);
}
