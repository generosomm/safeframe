/* =============================================================
   SAMPLE — a built-in 1080×1920 frame for people with no vertical
   video on hand. It is drawn on a canvas (0 bytes to download) and
   handed to the normal file pipeline as a File, so the sample goes
   through exactly the same code as a real upload.

   Two boxes come with it (shown from Phase 4): a title in the safe
   middle, and a CTA pill low enough to sit under every platform's
   caption block, so one collision shows up straight away.
   ============================================================= */

import { FRAME } from "./util/geometry.js";
import { cssVar } from "./util/css.js";

// The drawing below is laid out around these rects.
const TITLE = { x: 180, y: 560, w: 720, h: 280 };
const CTA = { x: 150, y: 1640, w: 600, h: 150 };

export const SAMPLE_BOXES = Object.freeze([
  { label: "Title", ...TITLE },
  { label: "CTA", ...CTA },
]);

export async function createSampleFile() {
  const display = cssVar("--font-display");
  const body = cssVar("--font-body");
  const mono = cssVar("--font-mono");

  // Canvas text silently falls back if a face isn't loaded yet.
  await Promise.all([
    document.fonts.load(`600 120px ${display}`),
    document.fonts.load(`500 56px ${body}`),
    document.fonts.load(`500 28px ${mono}`),
  ]).catch(() => {});

  const canvas = document.createElement("canvas");
  canvas.width = FRAME.width;
  canvas.height = FRAME.height;
  const ctx = canvas.getContext("2d");
  const bone = cssVar("--scene-bone");
  const ink = cssVar("--ink-900");

  drawBackdrop(ctx, bone);

  // Kicker, so nobody mistakes this for their own footage.
  ctx.fillStyle = cssVar("--text-mid");
  ctx.font = `500 28px ${mono}`;
  ctx.letterSpacing = "6px";
  ctx.textAlign = "center";
  ctx.fillText("SAMPLE FRAME", FRAME.width / 2, TITLE.y - 40);
  ctx.letterSpacing = "0px";

  // Title: largest size where both lines fit the title box.
  const lines = ["Your hook", "lives here"];
  let size = 140;
  ctx.font = `600 ${size}px ${display}`;
  while (size > 60 && Math.max(...lines.map((l) => ctx.measureText(l).width)) > TITLE.w - 40) {
    size -= 4;
    ctx.font = `600 ${size}px ${display}`;
  }
  ctx.fillStyle = bone;
  ctx.textBaseline = "alphabetic";
  const lineHeight = size * 0.98;
  const firstBaseline = TITLE.y + TITLE.h / 2 - lineHeight / 2 + size * 0.36;
  lines.forEach((line, i) => ctx.fillText(line, FRAME.width / 2, firstBaseline + i * lineHeight));

  // CTA pill, deliberately low: the caption block covers it everywhere.
  ctx.fillStyle = cssVar("--text");
  ctx.beginPath();
  ctx.roundRect(CTA.x, CTA.y, CTA.w, CTA.h, CTA.h / 2);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.font = `500 56px ${body}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Link in bio  →", CTA.x + CTA.w / 2, CTA.y + CTA.h / 2 + 2);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  return new File([blob], "sample-frame.jpg", { type: "image/jpeg" });
}

/** A quiet studio shot: warm graphite gradient, soft key light, floor. */
function drawBackdrop(ctx, bone) {
  const { width: w, height: h } = FRAME;

  const wall = ctx.createLinearGradient(0, 0, 0, h);
  wall.addColorStop(0, "#26241f");
  wall.addColorStop(0.62, "#151513");
  wall.addColorStop(1, "#0c0c0b");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, w, h);

  // Soft key light from upper right.
  const light = ctx.createRadialGradient(720, 980, 40, 720, 980, 760);
  light.addColorStop(0, withAlpha(bone, 0.2));
  light.addColorStop(1, withAlpha(bone, 0));
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, w, h);

  // Floor line and a simple product silhouette resting on it.
  const horizon = 1330;
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(0, horizon, w, h - horizon);
  ctx.fillStyle = withAlpha(bone, 0.08);
  ctx.fillRect(0, horizon, w, 2);

  const body = ctx.createLinearGradient(430, 0, 650, 0);
  body.addColorStop(0, "#2c2b28");
  body.addColorStop(0.7, "#1b1a18");
  body.addColorStop(1, "#121211");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(440, 960, 200, 380, 36);
  ctx.fill();
  ctx.fillStyle = withAlpha(bone, 0.18);
  ctx.fillRect(452, 990, 3, 320); // rim highlight
}

/** "#rrggbb" + alpha -> "rgba()" (tokens are stored as hex). */
function withAlpha(hex, alpha) {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
