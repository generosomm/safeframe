/* =============================================================
   DROPZONE — every way a file gets in:
     · the drop zone's own <input type="file"> (click, tap, keyboard)
     · "Check your video" / "New file" -> the shared hidden picker
     · drag and drop anywhere on the window
     · paste (Ctrl+V / ⌘V) of a copied image or file
     · "Try a sample" -> a generated frame, same pipeline
   All of them end in openFile().
   ============================================================= */

import { getState, setState } from "./state.js";
import { loadMedia, replaceMedia, MediaError } from "./media.js";
import { setView } from "./view.js";
import { notify, clearNotice } from "./notice.js";
import { createSampleFile, SAMPLE_BOXES } from "./sample.js";

const root = document.documentElement;
const SLOW_NOTICE_MS = 300; // only say "Opening…" if it isn't instant

let busy = false;
let nextBoxId = 1;

export async function openFile(file, { isSample = false } = {}) {
  if (busy || !file) return;
  busy = true;
  const slow = setTimeout(() => notify(`Opening ${file.name || "file"}…`, { timeout: 0 }), SLOW_NOTICE_MS);

  try {
    const media = await loadMedia(file, { isSample });
    const previous = getState().media;

    replaceMedia(media);
    // The sample brings its own boxes. A real file keeps the boxes you
    // drew (handy across frames of one edit), unless they were the
    // sample's.
    if (isSample) {
      setState({ boxes: SAMPLE_BOXES.map((box) => ({ ...box, id: `box-${nextBoxId++}` })) });
    } else if (previous?.isSample) {
      setState({ boxes: [] });
    }

    clearNotice();
    setView("tool");
    document.dispatchEvent(new CustomEvent("media:loaded", { detail: { kind: media.kind } }));
  } catch (error) {
    if (!(error instanceof MediaError)) console.error(error);
    notify(error instanceof MediaError ? error.message : "Couldn't open that file.", { tone: "error" });
  } finally {
    clearTimeout(slow);
    busy = false;
  }
}

async function openSample() {
  if (busy) return;
  try {
    await openFile(await createSampleFile(), { isSample: true });
  } catch (error) {
    console.error(error);
    notify("Couldn't draw the sample frame in this browser.", { tone: "error" });
  }
}

export function initDropzone() {
  const dropInput = document.getElementById("file-input");
  const picker = document.getElementById("file-picker");

  for (const input of [dropInput, picker]) {
    input?.addEventListener("change", () => {
      openFile(input.files?.[0]);
      input.value = ""; // so picking the same file again still fires
    });
  }

  document.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "browse" || action === "new-file") picker?.click();
    if (action === "sample") openSample();
  });

  initDragAndDrop();
  initPaste();
  labelPasteShortcut();
}

/* ---- Drag and drop -------------------------------------------
   Entering the window shows the overlay; from then on the overlay
   is the only target, so its dragleave means "left the window". */

function initDragAndDrop() {
  const overlay = document.querySelector(".drop-overlay");
  const hasFiles = (event) => Array.from(event.dataTransfer?.types ?? []).includes("Files");
  const hide = () => root.classList.remove("is-dragging");

  window.addEventListener("dragenter", (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    root.classList.add("is-dragging");
  });

  // Without preventDefault on dragover the browser refuses the drop
  // and navigates to the file instead.
  window.addEventListener("dragover", (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  });

  overlay?.addEventListener("dragleave", hide);

  window.addEventListener("drop", (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    hide();
    openFile(event.dataTransfer.files[0]);
  });
}

/* ---- Paste ---------------------------------------------------- */

const isTextField = (el) =>
  el instanceof HTMLElement &&
  (el.isContentEditable ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLInputElement && !["file", "radio", "checkbox", "button"].includes(el.type)));

function initPaste() {
  document.addEventListener("paste", (event) => {
    if (isTextField(event.target)) return; // let text fields paste text

    const data = event.clipboardData;
    const file =
      data?.files?.[0] ??
      Array.from(data?.items ?? [])
        .find((item) => item.kind === "file")
        ?.getAsFile();

    if (!file) {
      notify("Nothing to open on the clipboard. Copy a frame or a file first.");
      return;
    }
    event.preventDefault();
    openFile(file);
  });
}

/** Show ⌘V instead of Ctrl+V on Apple devices. */
function labelPasteShortcut() {
  const platform = navigator.userAgentData?.platform ?? navigator.platform ?? "";
  if (!/mac|iphone|ipad/i.test(platform)) return;
  for (const el of document.querySelectorAll("[data-paste-key]")) el.textContent = "⌘V";
}
