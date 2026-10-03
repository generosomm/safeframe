/* =============================================================
   CONTROLS — the platform toggle, preset toggle and layer switches,
   plus the two shortcuts into them:
     · URL params   ?p=reels&preset=strict  (shareable, kept in sync)
     · keys 1–4     TikTok / Reels / Shorts / All, in the tool view

   The radios are built from platforms.json, so adding a platform to
   the data adds its button and its number key.
   ============================================================= */

import { getState, setState, subscribe } from "./state.js";
import {
  ALL, loadZones, platforms, presets, platformById, presetById, oldestCheck, anyUnverified,
} from "./zones.js";
import { announce } from "./notice.js";

const DEFAULTS = { platform: "tiktok", preset: "standard" };
const root = document.documentElement;

let platformGroup;
let presetGroup;
let presetHint;

export async function initControls() {
  platformGroup = document.querySelector("[data-platform-options]");
  presetGroup = document.querySelector("[data-preset-options]");
  presetHint = document.querySelector("[data-preset-hint]");

  initLayerSwitches();

  try {
    await loadZones();
  } catch {
    return; // overlay.js already told the user
  }

  renderOptions();
  fillDates();
  applyUrl();
  reflect(getState());

  subscribe((state, changed) => {
    if (changed.some((key) => ["platform", "preset", "layers"].includes(key))) reflect(state);
    if (changed.includes("platform") || changed.includes("preset")) writeUrl(state);
  });

  document.addEventListener("keydown", onKey);
}

/* ---- Options from data ------------------------------------------ */

const platformChoices = () => [
  ...platforms().map((p) => ({ id: p.id, name: p.name })),
  { id: ALL, name: "All" },
];

function radio(name, value, text, key) {
  const label = document.createElement("label");
  label.className = "seg";
  const input = document.createElement("input");
  input.type = "radio";
  input.name = name;
  input.value = value;
  if (key) input.setAttribute("aria-keyshortcuts", key);
  const span = document.createElement("span");
  span.textContent = text;
  label.append(input, span);
  return label;
}

function renderOptions() {
  platformGroup.replaceChildren(
    ...platformChoices().map((choice, i) => radio("platform", choice.id, choice.name, String(i + 1)))
  );
  presetGroup.replaceChildren(...presets().map((p) => radio("preset", p.id, p.label)));

  platformGroup.addEventListener("change", (event) => {
    setState({ platform: event.target.value });
  });
  presetGroup.addEventListener("change", (event) => {
    setState({ preset: event.target.value });
  });
}

function initLayerSwitches() {
  for (const input of document.querySelectorAll('input[name="layer"]')) {
    input.addEventListener("change", () => {
      setState({ layers: { ...getState().layers, [input.value]: input.checked } });
    });
  }
}

/** State -> inputs, for changes that came from the URL or a key. */
function reflect(state) {
  for (const input of platformGroup.querySelectorAll("input")) input.checked = input.value === state.platform;
  for (const input of presetGroup.querySelectorAll("input")) input.checked = input.value === state.preset;
  for (const input of document.querySelectorAll('input[name="layer"]')) input.checked = !!state.layers[input.value];

  const preset = presetById(state.preset);
  if (preset && presetHint) {
    const link = document.createElement("a");
    link.href = preset.source.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = preset.source.name;
    presetHint.replaceChildren(`${preset.note} Source: `, link, ".");
  }
}

/* ---- Dates and honesty notes ------------------------------------ */

const formatDate = (iso) =>
  new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

function fillDates() {
  const iso = oldestCheck();
  if (!iso) return;
  for (const time of document.querySelectorAll("[data-last-checked]")) {
    time.dateTime = iso;
    time.textContent = formatDate(iso);
  }
  for (const note of document.querySelectorAll("[data-unverified]")) note.hidden = !anyUnverified();
}

/* ---- URL params --------------------------------------------------- */

const isPlatform = (id) => id === ALL || !!platformById(id);

function applyUrl() {
  const params = new URLSearchParams(location.search);
  const platform = params.get("p");
  const preset = params.get("preset");
  setState({
    platform: isPlatform(platform) ? platform : getState().platform,
    preset: presetById(preset) ? preset : getState().preset,
  });
  writeUrl(getState()); // drops unknown values like ?p=bogus
}

/** replaceState, not pushState: toggling platforms shouldn't fill the
    Back button. Defaults are left out to keep shared links short. */
function writeUrl(state) {
  const url = new URL(location.href);
  const set = (key, value, fallback) =>
    value === fallback ? url.searchParams.delete(key) : url.searchParams.set(key, value);
  set("p", state.platform, DEFAULTS.platform);
  set("preset", state.preset, DEFAULTS.preset);
  history.replaceState(history.state, "", url);
}

/* ---- Keys 1–4 ------------------------------------------------------ */

const isTextField = (node) =>
  node instanceof HTMLElement &&
  (node.isContentEditable ||
    node instanceof HTMLTextAreaElement ||
    (node instanceof HTMLInputElement && !["radio", "checkbox", "button", "file"].includes(node.type)));

function onKey(event) {
  if (root.dataset.view !== "tool") return;
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
  if (isTextField(event.target)) return;

  const index = Number(event.key) - 1;
  const choice = platformChoices()[index];
  if (!Number.isInteger(index) || !choice) return;

  event.preventDefault();
  setState({ platform: choice.id });
  announce(choice.id === ALL ? "Showing all platforms" : `Showing ${choice.name} zones`);
}
