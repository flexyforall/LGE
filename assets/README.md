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
| `video-1.*` | hero, plays on load | 3840x2160, 8s | 1920 wide, 24fps, crf 23 |
| `video-2.*` | hero, scroll-driven | 3838x2140, 8s | 1920 **tall**, 24fps, crf 27 |
| `video-3.*` | our role, scroll-driven | 3840x2160, 5s | 1920 wide, 24fps, crf 27 |

**MP4 is the primary source and WebM the fallback.** That order is deliberate:
VP9 handles video 3's light streaks badly — the same quality costs 16 MB against
H.264's 3 MB — so the WebM is a smaller, softer safety net for engines without
H.264 rather than the preferred file.

Three things shape the encodes:

- **Video 2 is turned a quarter turn in CSS**, the way Figma places it, so its
  *height* becomes the on-screen width. It is encoded 1920 tall so a 1920-wide
  window gets true 1:1 pixels — encoding it to the design's 1440 meant a 1.33x
  upscale on common screens, which is exactly the softness that got reported.
- **Anything the scroll drives gets a keyframe every 8 frames.** The scroll sets
  `currentTime` directly, and seeking is only as precise as the nearest
  keyframe. Video 1 just plays, so it keeps a normal GOP and stays smaller.
- **Quality beats weight here.** These clips are the whole design, so they get
  the bitrate they need (~17 MB of MP4 all told). Squeezing them below that is
  what made the first pass look bad.

```bash
# video 1 — plays straight through
ffmpeg -i 1.mp4 -vf "fps=24,scale=1920:-2,setsar=1" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 23 -preset slow -g 24 \
  -an -movflags +faststart video-1.mp4

# video 2 — quarter-turned in CSS, so encode to the height the rotation needs
ffmpeg -i 2.mp4 -vf "fps=24,scale=-2:1920,setsar=1" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 27 -preset medium \
  -g 8 -keyint_min 8 -sc_threshold 0 -an -movflags +faststart video-2.mp4

# video 3 — scroll-driven, streak-heavy
ffmpeg -i 3.mp4 -vf "fps=24,scale=1920:-2,setsar=1" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 27 -preset slow \
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

The PP Neue Montreal faces arrived as `.otf`. Only Book is wired up — it is the
one weight these sections use. Converting the family to `.woff2` would cut it to
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

`shaperec.svg` (175x44) belonged to an earlier hero and is no longer used — the
current design's button is 175x50.

The current hero's button has no glow behind it, so `glow-soft.svg`,
`glow-core.svg` and `btn-explore-glow.svg` are unused for now. They are kept
because they belong to a design that may come back.
