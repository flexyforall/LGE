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

The encode does three things:

- **Mirrors the frame** (`hflip`). In the source the planet fills the left half,
  exactly where the headline and buttons sit. Mirrored, it moves to the right
  and the copy sits over open space — pure black under the copy for the whole
  intro, measured, so the video needs no scrim or tint of any kind.
- **Keeps the full 8s**, white-out included. It is the end of the camera move
  and the natural hand-off to whatever section comes next.
- **Puts a keyframe every 8 frames.** The scroll drives `currentTime` directly,
  and seeking is only as precise as the nearest keyframe.

Both formats ship: browsers that take WebM use it, Safari and iOS take the MP4.

```bash
VF="hflip,fps=24,scale=1920:-2,setsar=1"

ffmpeg -i src.mp4 -vf "$VF" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 28 -preset slow \
  -g 8 -keyint_min 8 -sc_threshold 0 -an -movflags +faststart hero-scene.mp4

ffmpeg -i src.mp4 -vf "$VF" \
  -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 -g 8 -keyint_min 8 \
  -pix_fmt yuv420p -an hero-scene.webm

ffmpeg -i src.mp4 -frames:v 1 -vf "hflip,scale=1920:-2,setsar=1" -q:v 4 hero-scene-poster.jpg
```

## Notes on the exports that arrived

`logos/logo.svg` came out of Figma with a viewBox shorter than the artwork
(`0 0 600 352`), so the mark rendered cropped and squashed. It has been
corrected in place to `0 -248 600 600`, read off the mask bounds — nothing else
in the file was touched. Worth re-checking if the logo is ever re-exported.

The PP Neue Montreal faces arrived as `.otf`. Only Medium is wired up — it is
the one weight the hero uses. Converting the family to `.woff2` would cut it to
roughly half the bytes, worth doing before launch.

The button shapes arrived as `shaperec.svg` / `shaperec1.svg` in `images/` and
were moved to `icons/` under the names the markup uses. `shaperec1.svg` is
140x34, matching its Figma node exactly. `shaperec.svg` is 175x44 while Figma
reports the node box as 175x50 — the export's own artwork is the one used, since
stretching it to 50 would flatten the 45-degree corners. It stays centred on the
same point, so the label sits where the design puts it either way.
