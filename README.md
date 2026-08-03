# CoreSpace

Website built from the CoreSpace Figma design. Plain HTML, CSS and one script —
no build step, no dependencies, no install.

## Viewing it

Double-click `index.html`. That's it.

## Layout

```
index.html          the page
css/style.css       all styles
js/scene.js         the scroll-driven cameras, the reading fill, the shrink
js/smooth.js        eases wheel scrolling so the cameras glide
assets/             Figma exports and video — see assets/README.md
tools/              optional checks, not needed to run the site
```

## The sections

Two sections, each pinned while its own stretch of scroll plays out.

**Hero** — Figma `section 1` (235:2775).

1. While nobody scrolls, the hero idles as a loop: video 1 in full, then
   video 2 up to just before its flare starts growing (`HERO_LOOP_CUT`, 5.5s),
   crossing over on each change, and around again.
2. The first scroll breaks the loop wherever it happens to be and hands
   video 2 to the scroll. Scrolling moves the camera, stopping stops it — it
   never plays on its own again.
3. The title and footer clear out over the first fifth of that scroll.
4. Over the last stretch a white sheet finishes video 2's flash to pure white
   — and the next section starts under an identical sheet that lifts over its
   first stretch. The seam between them is white-on-white, so the flash and the
   drop into the tunnel read as one continuous shot.

**Our role** — Figma `section 2` (238:2674) through `section 2.1` (242:2673)
and into `section 3` (242:2681), all on one scroll.

Video 3 loops on its own as the background — it is not scroll-driven. The
scroll animates the statement's reading fill and the container moves only. The
statement (centred, per the updated frame) fills once the flash is gone; every
character is its own span, so the edge lands mid-word exactly as the design has
it.

Once it is read, the scroll packs the whole shot into section 3's 478x626
container — centred between the bar and the bottom edge, equal air above and
below — where it drops its veil and simply plays, looping. Further scroll
shrinks the box on and sends it out through the left edge while the next
chapter's container (placeholder: the same tunnel, looping) comes in from the
right at 0.4x, grows to the same spot, and finally opens up to the full frame —
the shape of Figma's `section 3.1` reference. The constants for every phase sit
at the top of `js/scene.js`.

Both sections put a 30% veil over their media — the media-at-70% from the
design, kept as a sheet.

The constants at the top of `js/scene.js` control the intro length and both
fades; `--scene-length-hero` and `--scene-length-role` in the CSS control how
much scroll each move is spread over.

## Design parity

The sections reproduce Figma nodes `235:2775`, `238:2674` and `242:2673` at
1440x810. Elements carry a `data-node-id` attribute naming the Figma node they
came from, and the CSS comments name the node each rule was read off, so any
value can be traced back to the design.

`tools/measure.mjs` diffs every box, text origin and gap against the design
numbers — all currently match exactly. See [`tools/README.md`](./tools/README.md).

## Sizing

A frame fills the window rather than sitting as a 1440px box in the middle of
it — video runs edge to edge and the copy keeps its designed insets. At exactly
1440x810 every measurement equals the Figma frame.

- **Wider than 1440** — the frame stretches and the video widens with it. Type
  stays at its designed size.
- **Any height** — the stage fills the window.
- **Narrower than 900** (`--frame-min-width`) — nothing left to stretch into, so
  the whole frame scales down proportionally, holding every padding and margin
  at its designed ratio. That is a stopgap — replace it with real breakpoints
  once tablet and mobile frames exist in Figma.

## Publishing

Everything is static, so any host works — copy `index.html`, `css/`, `js/` and
`assets/` to the server root. No configuration needed.

## Assets

Every asset the sections use is in place. See
[`assets/README.md`](./assets/README.md) for where each one came from, how the
video is encoded, and the handful of notes on the exports.
