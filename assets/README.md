# Assets

Drop everything exported from Figma in here. One folder per asset type.

| Folder | What goes in it | Preferred format |
| --- | --- | --- |
| `images/` | Photos, illustrations, background images, hero art | `.webp` (or `.jpg`/`.png` if transparency/quality needs it) |
| `icons/` | UI icons, small glyphs, arrows, social icons | `.svg` |
| `logos/` | Brand marks, wordmarks, favicon source | `.svg` (plus a 512px `.png` fallback) |
| `fonts/` | Custom/licensed typefaces used in the design | `.woff2` (add `.woff` only if you need old-browser support) |
| `videos/` | Background loops, product demos | `.mp4` (H.264) + `.webm` |
| `exports/` | Full-page Figma screenshots / reference PNGs of each screen | `.png` |

## Naming

Use lowercase kebab-case, no spaces:

```
hero-background.webp
icon-arrow-right.svg
logo-corespace-dark.svg
about-page-desktop.png
```

For images that need multiple densities, suffix with the scale:

```
team-photo@1x.webp
team-photo@2x.webp
```

## Export settings from Figma

- **Icons / logos** → SVG, "Include id attribute" off, outline strokes on
- **Photos** → WebP or JPG at 2x, quality ~80
- **Screens for reference** (`exports/`) → PNG at 1x, one file per page/breakpoint

## Size limits

GitHub rejects single files over 100 MB and warns above 50 MB. Keep individual
assets under ~5 MB where possible — compress large photos before uploading. If a
video is bigger than that, tell me and we'll host it externally instead of
committing it.

## Video

Three clips, named the way the brief names them. All are derived from ~30 MB
sources that are **not committed** — keep copies if they might need re-encoding.

| File | Where | Source | Encoded |
| --- | --- | --- | --- |
| `video-1.*` | hero, background loop | 3840x2160, 12s | source res, 24fps, crf 19 |
| `video-3.*` | our role + containers | 3840x2160, 5s | 2560 wide, 24fps, crf 21 |

**MP4 is the primary source and WebM the fallback.** That order is deliberate:
VP9 handles video 3's light streaks badly — the same quality costs 16 MB against
H.264's 3 MB — so the WebM is a smaller, softer safety net for engines without
H.264 rather than the preferred file.

Three things shape the encodes:

- **Video 1 keeps its source resolution** and near-transparent crf, so retina
  screens finally get the clip as delivered. Video 3 sits at 2560 — its
  light streaks are brutally expensive to code, and the full-4K version came
  out at 41 MB for five seconds; 2560 is the sane ceiling.
- **Anything the scroll drives gets a keyframe every 8 frames.** The scroll sets
  `currentTime` directly, and seeking is only as precise as the nearest
  keyframe. Video 1 just plays, so it keeps a normal GOP.
- **Quality beats weight here — and it now costs real weight.** ~61 MB of MP4
  all told. If that ever matters, the crf 20-24 encodes of the previous pass
  were the best quality-per-byte trade.

```bash
# video 1 — loops in the background
ffmpeg -i 1.mp4 -vf "fps=24,setsar=1" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 18 -preset slow -g 24 \
  -an -movflags +faststart video-1.mp4

# video 3 — scroll-driven, streak-heavy
ffmpeg -i 3.mp4 -vf "fps=24,scale=2560:-2,setsar=1" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 21 -preset medium \
  -g 8 -keyint_min 8 -sc_threshold 0 -an -movflags +faststart video-3.mp4

# posters, and the WebM fallbacks (smaller and softer on purpose)
ffmpeg -i 1.mp4 -frames:v 1 -vf "scale=1600:-2" -q:v 6 video-1-poster.jpg
ffmpeg -i 1.mp4 -vf "fps=24,scale=1280:-2,setsar=1" -c:v libvpx-vp9 \
  -crf 42 -b:v 0 -row-mt 1 -g 24 -pix_fmt yuv420p -an video-1.webm
```

## Notes on the exports that arrived

`logos/logo.svg` came out of Figma with a viewBox shorter than the artwork
(`0 0 600 352`), so the mark rendered cropped and squashed. It has been
corrected in place to `0 -248 600 600`, read off the mask bounds — nothing else
in the file was touched. Worth re-checking if the logo is ever re-exported.

### Fonts

The hero (356:1231) is set in three Stack Sans families, and all three are on
Google Fonts. They are committed here as `.woff2` rather than linked from
`fonts.googleapis.com`, so the page needs no network — it opens on a
double-click and the type is still right.

| File | Figma role | Notes |
| --- | --- | --- |
| `StackSansHeadline.woff2` | headline/Display | static 400 |
| `StackSansText.woff2` | paragraph/L | variable, wght 200-700 |
| `StackSansNotch.woff2` | label/M, label/S | variable, wght 200-700 |

Latin subset only, which is all this copy needs. Re-fetch a wider subset from
Google Fonts if the site ever carries other scripts.

Mozilla Text is still what Our role's statement is set in. PP Neue Montreal is
no longer used by either section; both families are kept for the frames that
may still call for them. The PP faces arrived as `.otf` — converting them to
`.woff2` would halve their bytes if they come back into use.

### Buttons and icons

| File | Where | Figma node |
| --- | --- | --- |
| `images/buttonSecondary.svg` | the bar's BECOME A PARTNER | `356:1254` — 188x44 |
| `images/buttonPrimary.svg` | the hero's BECOME PARTNER | `356:1266` — the button at 47/60 inside a 314x163 canvas, so its glow comes with it |
| `icons/plus.svg` | both buttons, twice each | `341:1405` — 20x20, white |

`icons/plus.svg` was uploaded as `plus icon.svg`; the space was taken out of the
name so the URL needs no escaping. The plus is white, which is what the dark
plate wants — the light plate flips it with `filter: brightness(0)`. A CSS mask
would have coloured it from `currentcolor`, but a mask is a fetch and a fetch
from a `file://` page is blocked, and the page has to keep working on a
double-click.

### Partner logos

`logos/` holds the nine marks from the design's bottom row. **Seven are in
use.** `Frame.png` and `layer1.png` both arrived as 1x1 pixels — the export
appears to have failed for those two — so they are left out of the running row
rather than showing as blank gaps. They are the two that sat fully off-frame in
the Figma render, which is probably why the failure went unnoticed. Re-upload
them and add two `<img>` rows to `.logos__track` (in both copies of the list)
to bring them in.

The seven that work, at the sizes the design gives them:

| File | Size | Mark |
| --- | --- | --- |
| `Layer_2.png` | 168 x 32 | Stop & Shop |
| `MeijerLogo-Primary-FullColor.png` | 82.4 x 32 | Meijer |
| `svg52656.png` | 90.4 x 28.8 | Smith's |
| `Frame-3.png` | 160 x 25.6 | Albertsons |
| `Frame-2.png` | 111.2 x 24 | Foods Co |
| `Frame-1.png` | 69.6 x 33.6 | Rite Aid |
| `Group.png` | 110.4 x 41.6 | Kroger |

They are white on transparent and run at the design's 50%.

### Earlier vector uploads, now unused

These belong to hero designs that have since been replaced. They are kept as
the record of shapes that earlier CSS was built from; nothing references them.

| File | Uploaded as | Figma node |
| --- | --- | --- |
| `icons/btn-become-a-partner.svg` | `shaperec1.svg` | `201:3095` — 140x34 |
| `icons/btn-explore-glow.svg` | `base.svg` | `201:3133` |
| `icons/glow-soft.svg` | `Ellipse 2510.svg` | `201:3135` |
| `icons/glow-core.svg` | `Ellipse 2511.svg` | `201:3136` |
| `icons/btn-explore-base.svg` | — | `201:3078`, redrawn here rather than exported |

figma.com is unreachable from this machine, so nothing in `icons/` can be
re-exported without someone uploading it.
