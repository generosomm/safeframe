/* =============================================================
   MEDIA — turns a File into something the stage can show.
   The file is never read into memory: URL.createObjectURL() gives
   the browser a pointer to the file on disk, and <img>/<video>
   stream from it. That is why a 100MB+ video opens instantly and
   nothing is ever uploaded.
   ============================================================= */

import { getState, setState } from "./state.js";

/** An error whose message is safe to show the user as-is. */
export class MediaError extends Error {}

const IMAGE_EXT = /\.(png|jpe?g|webp|avif|gif|bmp|heic|heif)$/i;
const VIDEO_EXT = /\.(mp4|m4v|mov|webm|mkv|ogv)$/i;

// Some files (often .mkv, sometimes .mov on Windows) arrive with an
// empty MIME type, so fall back to the extension.
export function kindOf(file) {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (IMAGE_EXT.test(file.name)) return "image";
  if (VIDEO_EXT.test(file.name)) return "video";
  return null;
}

export async function loadMedia(file, { isSample = false } = {}) {
  const kind = kindOf(file);
  if (!kind) throw new MediaError("That file isn't an image or a video.");

  const url = URL.createObjectURL(file);
  const name = file.name || (kind === "image" ? "Pasted image" : "Pasted video");
  try {
    const loaded = kind === "image" ? await loadImage(url, name) : await loadVideo(url, name);
    return { kind, name, size: file.size, url, isSample, ...loaded };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

async function loadImage(url, name) {
  const img = new Image();
  img.decoding = "async";
  img.alt = `Frame from ${name}`;
  img.draggable = false;
  img.src = url;
  try {
    await img.decode();
  } catch {
    throw new MediaError(
      "This browser can't open that image. HEIC photos only open in Safari; try a PNG or JPG."
    );
  }
  return { el: img, width: img.naturalWidth, height: img.naturalHeight, duration: 0 };
}

const VIDEO_TIMEOUT = 15000;

function loadVideo(url, name) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    // Muted + playsinline as attributes too: iOS Safari checks the
    // attributes, not just the properties, before it allows inline play.
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.preload = "auto";
    video.disablePictureInPicture = true;
    video.draggable = false;
    video.setAttribute("aria-label", `Video: ${name}`);

    let timer = 0;
    const done = () => {
      clearTimeout(timer);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("error", onError);
    };
    const fail = (message) => {
      done();
      releaseElement(video);
      reject(new MediaError(message));
    };
    const unsupported = () =>
      fail(
        "This browser can't show that video's picture. iPhone videos are often HEVC: try Safari, or export an H.264 MP4."
      );

    const onMeta = () => {
      // Audio decodes but the picture codec doesn't: width stays 0.
      if (!video.videoWidth) return unsupported();
      done();
      // iOS Safari paints nothing until a frame is decoded; a tiny seek
      // makes it fetch and show the first one.
      video.currentTime = Math.min(0.001, video.duration || 0);
      resolve({
        el: video,
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      });
    };
    const onError = () => unsupported();

    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("error", onError);
    timer = setTimeout(() => fail("That video took too long to open. Try a shorter export."), VIDEO_TIMEOUT);
    video.src = url;
  });
}

/** Stop a video decoding and let the browser free its buffers. */
function releaseElement(el) {
  if (el instanceof HTMLVideoElement) {
    el.pause();
    el.removeAttribute("src");
    el.load();
  }
}

/**
 * Swap the current media for `next` and free the old one. Listeners
 * mount the new element first (setState is synchronous), then the old
 * object URL is revoked.
 */
export function replaceMedia(next) {
  const previous = getState().media;
  setState({ media: next });
  if (previous && previous !== next) {
    releaseElement(previous.el);
    URL.revokeObjectURL(previous.url);
  }
}
