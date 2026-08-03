# CoreSpace

Website built from the CoreSpace Figma design. Plain HTML, CSS and one script —
no build step, no dependencies, no install.

## Viewing it

Double-click `index.html`. That's it.

## Layout

```
index.html          the page
css/style.css       all styles
js/scene.js         the scroll-driven cameras and the reading fill
assets/             Figma exports and video — see assets/README.md
tools/              optional checks, not needed to run the site
```

## The sections

Two sections, each pinned while its own stretch of scroll plays out.

**Hero** — Figma `section 1` (235:2775).

1. Video 1 plays straight through on load.
2. Video 2 follows it for `HERO_TAIL` seconds (2s), crossing over as it does.
   Then everything stops.
3. From there the scroll drives video 2. Scrolling moves the camera, stopping
   stops it — it never plays on its own again.
4. The title and footer clear out over the first fifth of that scroll.
5. The scroll ends where video 2's light fills the frame, which is what hands
   over to the section below.

Scrolling during the intro cuts straight to video 2 at the same mark rather than
holding the visitor there.

**Our role** — Figma `section 2` (238:2674) resolving into `section 2.1`
(242:2673).

Video 3 answers to the scroll from its first frame, and the statement fills in
reading order over the same scroll, finishing by 70% of the way through. Every
character is its own span, so the edge lands mid-word exactly as the design has
it.

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
