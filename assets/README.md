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

Two clips. Both are derived from ~30 MB sources that are **not committed** —
keep copies if they might need re-encoding.

| File | Where | Source | Encoded |
| --- | --- | --- | --- |
| `video-hero.*` | hero | two 3840x2160 clips, 12s + 8s | source res, 24fps, crf 23, keyframe every 8 |
| `video-3.*` | our role | 2754x1536, 12s | source res, 24fps, crf 21, keyframe every 8 |
| `video-cupola.*` | the card that opens out | 3256x2160, 9s | source res, 24fps, crf 21, keyframe every 8 |
| `video-loader.*` | the loader | 1980x1536, trimmed to its last 7s | source res, 24fps, crf 21, normal GOP — it only ever plays |

`video-hero` is the old videos 1 and 2 joined into one file. They were generated
as one continuous shot — the second begins on **exactly** the frame the first
ends on, checked pixel for pixel — so the join is invisible and the hero can
treat the whole 20s as a single camera move. That is what lets the scroll pick
the clip up from wherever its idle loop happens to be rather than cutting to a
second element. `video-1.*` and `video-2.*` are gone; this replaces both.

**MP4 is the primary source and WebM the fallback.** That order is deliberate:
VP9 handles the light streaks badly — the same quality costs many times the
bytes — so the WebM is a smaller, softer safety net for engines without H.264
rather than the preferred file.

Two things shape the encodes:

- **Both keep their source resolution.** The hero is at crf 23 rather than the
  21 its parts used, which is what keeps a 20-second 4K file under GitHub's
  50 MB warning. For reference, the same encode measured 58 MB at crf 21 and
  33 MB at 2560 wide — if the hero ever needs to be lighter, dropping the width
  is the bigger lever and the one to reach for first.
- **Both get a keyframe every 8 frames**, because the scroll sets `currentTime`
  directly and seeking is only as precise as the nearest keyframe. That tight
  GOP is most of why these files are as big as they are.

The hero clip ends on white: its mean luminance climbs from 65 at the
eighteen-second mark to 255 over the last half second. The white sheet only has
to close the last of it — see the note beside `.hero__flash` in the CSS.

```bash
# the hero — two sources concatenated, then encoded once
printf "file '1.mp4'\nfile '2.mp4'\n" > join.txt
ffmpeg -f concat -safe 0 -i join.txt -vf "fps=24,setsar=1" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 23 -preset medium \
  -g 8 -keyint_min 8 -sc_threshold 0 -an -movflags +faststart video-hero.mp4

ffmpeg -i 3.mp4 -vf "fps=24,setsar=1" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 21 -preset medium \
  -g 8 -keyint_min 8 -sc_threshold 0 -an -movflags +faststart video-3.mp4

# posters, and the WebM fallbacks (smaller and softer on purpose)
ffmpeg -i video-hero.mp4 -frames:v 1 -vf "scale=1600:-2" -q:v 6 video-hero-poster.jpg
ffmpeg -i video-hero.mp4 -vf "fps=24,scale=1280:-2,setsar=1" -c:v libvpx-vp9 \
  -crf 42 -b:v 0 -row-mt 1 -g 8 -keyint_min 8 -pix_fmt yuv420p -an video-hero.webm
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
| `images/buttonPrimary.svg` | the hero's BECOME PARTNER | `356:1266` — the solid plate, drawn at 47/60 inside a 314x163 canvas so its glow comes with it |
| `images/buttonPrimary2.svg` | — | the same outline over a 20% black wash, see-through. Drawn at 42.36/56.91 inside 264x148 at 202.61x51 |
| `images/buttonPrimaryTransparent.svg` | — | as above but a 5% white wash — the lightest of the three |
| `icons/plus.svg` | both buttons, twice each | `341:1405` — 20x20, white |

The solid plate is drawn at the frame's own 210 x 56 and needs no adjustment.
The two see-through bases measure 202.61 x 51 instead, so using either means
scaling its canvas until the shape lands on the button's box and offsetting it
by where the shape starts — the numbers are derived in git history, in the
commit that first wired one up.

`icons/plus.svg` was uploaded as `plus icon.svg`; the space was taken out of the
name so the URL needs no escaping. The plus is white, which is what the dark
plate wants — the light plate flips it with `filter: brightness(0)`. A CSS mask
would have coloured it from `currentcolor`, but a mask is a fetch and a fetch
from a `file://` page is blocked, and the page has to keep working on a
double-click.

### Still needed — bitmaps

These could not be exported: figma.com is unreachable from here, so they have
to be uploaded. The section is built and
measured against the frame; these are the only things missing from it, and each
is referenced by a CSS `background-image`, so until they land the slots simply
render empty rather than broken.

| Put it here | Figma node | Size | What it is |
| --- | --- | --- | --- |
| `images/cards-wash.png` | `342:576` | 1456 x 1555 | the wash behind the whole section, dodged over the black |
| `images/card-partner.png` | `339:355` | 544 x 306 ratio | the band across the top of the wide card |

`342:1558` and `342:1599` are not on this list: both are stills of the same
cupola footage, so `video-cupola` stands in for them and the section is built
from the clip rather than from two bitmaps.

`images/card.png` is the satellite on the narrow card (`339:372`), uploaded
under that name rather than the one suggested.

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
