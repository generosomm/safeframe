/** Read a design token from :root, so canvas drawing uses the same
    colours as the CSS. */
export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
