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

## Still needed

Two files the hero is waiting on. Each drops in at the exact path below, under
the exact filename, and is picked up on the next page reload — no code changes.

| File | Where it goes | What it is |
| --- | --- | --- |
| `btn-become-a-partner.svg` | `assets/icons/` | Figma node `183:3191` — the 140x34 shape behind BECOME A PARTNER |
| `btn-explore-technology.svg` | `assets/icons/` | Figma node `183:3246` — the 175x50 shape behind EXPLORE TECHNOLOGY |

The two SVGs currently at those paths are stand-ins with the right dimensions
but guessed corner geometry: this environment's network policy blocks
`figma.com`, so the real exports could not be pulled directly. Overwriting them
with the Figma exports is the whole fix.

## Background video

`videos/hero-bg.mp4` / `.webm` are derived from a 3838x2140, 8s, 30 MB source
clip. The source is not committed — it would cost every clone 30 MB — so keep a
copy if it might need re-encoding.

Two things about the source shaped the edit:

- It ends in a full white-out (the last ~1.3s wash to pure white), which would
  erase the white hero copy on every loop. The clip is cut at 6.3s, before the
  flare ramps.
- The planet fills the left half of the frame, exactly where the headline and
  buttons sit, and peaks bright around 3.3s. `.frame__scrim` in `css/style.css`
  darkens that side; the right half stays clear.

The cut is played forward then reversed, so the loop has no visible jump. To
re-encode from a new source:

```bash
CHAIN="[0:v]trim=0:6.3,setpts=PTS-STARTPTS,fps=24,scale=1920:-2,setsar=1,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[v]"

ffmpeg -i src.mp4 -filter_complex "$CHAIN" -map "[v]" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 28 -preset slow -an \
  -movflags +faststart hero-bg.mp4

ffmpeg -i src.mp4 -filter_complex "$CHAIN" -map "[v]" \
  -c:v libvpx-vp9 -crf 36 -b:v 0 -row-mt 1 -pix_fmt yuv420p -an hero-bg.webm

ffmpeg -i src.mp4 -frames:v 1 -vf "scale=1920:-2,setsar=1" -q:v 4 hero-bg-poster.jpg
```

## Notes on the exports that arrived

`logos/logo.svg` came out of Figma with a viewBox shorter than the artwork
(`0 0 600 352`), so the mark rendered cropped and squashed. It has been
corrected in place to `0 -248 600 600`, read off the mask bounds — nothing else
in the file was touched. Worth re-checking if the logo is ever re-exported.

The PP Neue Montreal faces arrived as `.otf`. Only Medium is wired up — it is
the one weight the hero uses. Converting the family to `.woff2` would cut it to
roughly half the bytes, worth doing before launch.
