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

The PP Neue Montreal faces arrived as `.otf`. Book and Medium are wired up —
the two weights these sections use. Converting the family to `.woff2` would cut
it to roughly half the bytes, worth doing before launch.

Vector uploads keep arriving in `images/` and get moved to `icons/` under the
names the markup used at the time:

| Uploaded as | Now | Figma node |
| --- | --- | --- |
| `shaperec1.svg` | `icons/btn-become-a-partner.svg` | `201:3095` — 140x34 |
| `base.svg` | `icons/btn-explore-glow.svg` | `201:3133` — the glow inside the button |
| `Ellipse 2510.svg` | `icons/glow-soft.svg` | `201:3135` |
| `Ellipse 2511.svg` | `icons/glow-core.svg` | `201:3136` |

`icons/btn-explore-base.svg` is the one file here not exported from Figma. It
is the white 175x50 plate the glow sits on — Figma node `201:3078`
("Rectangle 26102856"), which was not in the upload. Its outline is taken
verbatim from the path `btn-explore-glow.svg` masks itself with.

**Every SVG in `icons/` is currently unused.** Both buttons are now drawn in
CSS instead:

- The hero's EXPLORE TECHNOLOGY button (`313:1223`, `314:1263`) grew to a
  188x54 plate, so the 175x50 exports no longer fit it — and its bloom has to
  breathe and follow the pointer, which a flat SVG cannot do. The plate is a
  `clip-path` and the bloom a pair of gradients; the ellipse geometry is the
  same as `glow-soft.svg` and `glow-core.svg` (rx 47 at 30px and 10px of
  blur), read off those files.
- BECOME A PARTNER (`313:1213`) turned from the white plate into the dark one
  with a hairline, the shape `314:1287` uses at its larger size. That border
  is a 1px inset of a cut-cornered outline, which needs a second copy of the
  outline to hold, so it too is two clipped layers rather than an export.

The files are kept because they are the record of the shapes those rules were
built from, and because a design that uses them may come back. figma.com is
unreachable from here, so nothing in `icons/` can be re-exported without
someone uploading it.

`shaperec.svg` (175x44) belonged to an earlier hero and is no longer used.
