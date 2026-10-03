/**
 * Seconds -> "HH:MM:SS:FF" (non-drop-frame).
 * The frame rate is rounded to a whole number, so 29.97 shows as 30
 * frames per second, the same way most NLEs label non-drop timecode.
 */
export function formatTimecode(seconds, fps) {
  const rate = Math.max(1, Math.round(fps));
  // The tiny epsilon stops 0.1 * 30 = 2.9999999 from showing frame 2.
  const totalFrames = Math.floor(Math.max(0, seconds) * rate + 1e-6);
  const frames = totalFrames % rate;
  const totalSeconds = Math.floor(totalFrames / rate);

  return [
    Math.floor(totalSeconds / 3600),
    Math.floor(totalSeconds / 60) % 60,
    totalSeconds % 60,
    frames,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}
