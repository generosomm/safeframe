# SafeFrame

See exactly what the TikTok, Reels and Shorts interface covers on your vertical video, before you post.

Drop in a frame or a video, box the parts that must stay visible, and SafeFrame flags anything that collides with the app's UI. Then export a transparent overlay guide for Premiere Pro, CapCut or After Effects.

**Your file never leaves your device.** Everything runs in the browser; nothing is uploaded.

> Work in progress. Live link, screenshots and the full feature list land with v1.

## Run it locally

No build step. Any static server works, for example:

```sh
npx serve .
# or
python -m http.server 8000
```

Open the printed URL. ES modules do not load from `file://`, so double-clicking `index.html` will not work.

Add `?view=tool` to the URL to preview the tool layout without loading a file, or press **Try a sample** on the landing to load a built-in frame.

To test on your phone, serve on your network (`python -m http.server 8000 --bind 0.0.0.0`) and open `http://<your computer's IP>:8000` on the same Wi-Fi.

## Project structure

```
index.html          landing + tool in one page
css/                tokens, fonts, base, chrome, landing, tool, sheet
js/                 vanilla ES modules, one job per file
js/scene/           3D layer (Phase 7), removable without breaking the tool
data/platforms.json safe zone data: every rect, preset and source
assets/             fonts, images
```

## URL options

| Param | Values | Example |
|---|---|---|
| `p` | `tiktok`, `reels`, `shorts`, `all` | `?p=reels` |
| `preset` | `standard`, `strict` | `?p=all&preset=strict` |

The URL updates as you switch, so a link opens with the same platform and preset. In the tool, keys **1–4** switch platform.

## Safe zone data

All platform numbers live in `data/platforms.json`, never in the JS. Each platform has two presets: **Standard** (AdaptlyPost's 2026 guide, organic posts) and **Strict** (upload-post's checker, room for ads and Shop links). The sources' margins are turned into labelled bands (top bar, action buttons, caption block, edge margin). Every platform is marked `"verified": false` until calibrated against real screenshots.

## Credits

Built by [Merwin Generoso](https://generosomm.dev) · ERO | VISUALS.
Fonts and licences: `assets/fonts/CREDITS.txt`.
