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

## Scene video

`videos/hero-scene.mp4` / `.webm` are derived from a 3838x2140, 8s, 30 MB source
clip. The source is not committed — it would cost every clone 30 MB — so keep a
copy if it might need re-encoding.

The clip is placed the way Figma places it: turned a quarter turn anticlockwise
and cropped to the frame, which stands the planet up as a horizon along the
bottom. The rotation is done in CSS, not baked in, so the file stays in its
original orientation.

That drives the encode height. Rotated, the clip's **height** becomes the strip's
width on screen, and the strip is as wide as the frame — so it is encoded at
1444 tall to match the 1440 design, and the width follows from the aspect ratio.
Wider windows scale it up a little; the source tops out at 2140 tall, so there
is some headroom but not unlimited.

Two other things:

- **The full 8s is kept**, white-out included. It is the end of the camera move
  and the natural hand-off to whatever section comes next.
- **A keyframe every 8 frames.** The scroll drives `currentTime` directly, and
  seeking is only as precise as the nearest keyframe.

Both formats ship: browsers that take WebM use it, Safari and iOS take the MP4.

```bash
VF="fps=24,scale=-2:1444,setsar=1"

ffmpeg -i src.mp4 -vf "$VF" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 29 -preset slow \
  -g 8 -keyint_min 8 -sc_threshold 0 -an -movflags +faststart hero-scene.mp4

ffmpeg -i src.mp4 -vf "$VF" \
  -c:v libvpx-vp9 -crf 36 -b:v 0 -row-mt 1 -g 8 -keyint_min 8 \
  -pix_fmt yuv420p -an hero-scene.webm

ffmpeg -i src.mp4 -frames:v 1 -vf "scale=-2:1444,setsar=1" -q:v 4 hero-scene-poster.jpg
```

## Notes on the exports that arrived

`logos/logo.svg` came out of Figma with a viewBox shorter than the artwork
(`0 0 600 352`), so the mark rendered cropped and squashed. It has been
corrected in place to `0 -248 600 600`, read off the mask bounds — nothing else
in the file was touched. Worth re-checking if the logo is ever re-exported.

The PP Neue Montreal faces arrived as `.otf`. Only Medium is wired up — it is
the one weight the hero uses. Converting the family to `.woff2` would cut it to
roughly half the bytes, worth doing before launch.

Vector uploads keep arriving in `images/` and get moved to `icons/` under the
names the markup uses:

| Uploaded as | Now | Figma node |
| --- | --- | --- |
| `shaperec1.svg` | `icons/btn-become-a-partner.svg` | `201:3095` — 140x34 |
| `base.svg` | `icons/btn-explore-glow.svg` | `201:3133` — the glow inside the button |
| `Ellipse 2510.svg` | `icons/glow-soft.svg` | `201:3135` |
| `Ellipse 2511.svg` | `icons/glow-core.svg` | `201:3136` |

`icons/btn-explore-base.svg` is the one asset not exported from Figma. It is the
white 175x50 plate the glow sits on — Figma node `201:3078`
("Rectangle 26102856"), which was not in the upload. The outline is taken
verbatim from the path `btn-explore-glow.svg` masks itself with, so the two line
up exactly; only the fill is assumed. Exporting `201:3078` and dropping it in at
that path would replace it.

`shaperec.svg` (175x44) belonged to the earlier left-aligned hero and is no
longer used — the current design's button is 175x50.
