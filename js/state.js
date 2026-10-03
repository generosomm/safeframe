/* =============================================================
   STATE — one small store for everything the tool shows.
   Modules call setState() with a partial update and subscribe to
   hear which keys changed. No framework: a plain object and a Set
   of listeners is all a tool this size needs.
   ============================================================= */

const state = {
  media: null,        // { kind, name, size, url, el, width, height, duration, isSample }
  platform: "tiktok", // tiktok | reels | shorts | all
  preset: "standard", // standard | strict
  layers: { mock: true, zones: true, safe: false },
  boxes: [],          // { id, label, x, y, w, h } in 1080×1920 units
};

const listeners = new Set();

export function getState() {
  return state;
}

/** Shallow-merge `patch`; listeners get the list of keys that changed. */
export function setState(patch) {
  const changed = Object.keys(patch).filter((key) => state[key] !== patch[key]);
  if (!changed.length) return;
  Object.assign(state, patch);
  for (const listener of listeners) listener(state, changed);
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
