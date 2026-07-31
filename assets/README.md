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

Three files the hero is waiting on. Each drops in at the exact path below and is
picked up on the next page reload — no code changes.

| File | Where it goes | What it is |
| --- | --- | --- |
| `btn-become-a-partner.svg` | `assets/icons/` | Figma node `183:3191` — the 140x34 shape behind BECOME A PARTNER |
| `btn-explore-technology.svg` | `assets/icons/` | Figma node `183:3246` — the 175x50 shape behind EXPLORE TECHNOLOGY |
| `PPNeueMontreal-Medium.woff2` | `assets/fonts/` | the hero subheading's typeface (licensed — needs a webfont licence) |

The two button SVGs currently in `assets/icons/` are stand-ins with the right
dimensions but guessed corner geometry: this environment's network policy blocks
`figma.com`, so the real exports could not be pulled directly. Overwriting them
with the Figma exports is the whole fix.

Until the PP Neue Montreal webfont is in place, the subheading falls back to
Mozilla Text, so its letterforms differ from the design.

## Notes on the export that arrived

`logos/logo.svg` came out of Figma with a viewBox shorter than the artwork
(`0 0 600 352`), so the mark rendered cropped and squashed. It has been
corrected in place to `0 -248 600 600`, read off the mask bounds — nothing else
in the file was touched. Worth re-checking if the logo is ever re-exported.
