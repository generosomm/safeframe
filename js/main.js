/* =============================================================
   MAIN — boots each module. Module scripts are deferred, so the
   page has already parsed (and the hero has usually painted) by
   the time this runs. Nothing here blocks the first paint.
   ============================================================= */

import { initChrome } from "./chrome.js";
import { initView } from "./view.js";
import { initSheet } from "./sheet.js";
import { initStage } from "./stage.js";
import { initDropzone } from "./dropzone.js";
import { initControls } from "./controls.js";
import { initOverlay } from "./overlay.js";
import { loadZones } from "./zones.js";

// Start fetching the zone data now, while the landing is on screen,
// so it is ready long before the first file is dropped.
loadZones().catch(() => {});

initChrome();
initView();
initSheet();
initStage();
initDropzone();
// Order matters: both wait for the zone data, and controls must apply
// ?p= / ?preset= before the overlay draws its first frame.
initControls();
initOverlay();
