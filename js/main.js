/* =============================================================
   MAIN — boots each module. Module scripts are deferred, so the
   page has already parsed (and the hero has usually painted) by
   the time this runs. Nothing here blocks the first paint.
   ============================================================= */

import { initChrome } from "./chrome.js";
import { initView } from "./view.js";
import { initSheet } from "./sheet.js";

initChrome();
initView();
initSheet();
