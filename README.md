# CoreSpace

Website built from the CoreSpace Figma design. Plain HTML and CSS — no build
step, no dependencies, no install.

## Viewing it

Double-click `index.html`. That's it.

## Layout

```
index.html          the page
css/style.css       all styles
js/scene.js         the hero's scroll-driven camera
assets/             Figma exports — see assets/README.md
tools/              optional checks, not needed to run the site
```

## The hero scene

The clip is one continuous move through orbit, so it is treated as a camera
rather than a looping background:

1. On load it plays forward for 1.2s and stops where it gets to.
2. From then on the scroll position drives `currentTime`. Scrolling moves the
   camera, stopping stops it — it never plays on its own again.
3. The copy clears out over the first stretch of that scroll, so the move
   carries the section on its own.

The camera stops at 3.4s (`SCENE_END` in `js/scene.js`), not at the end of the
clip. Measured off the framed shot, the planet completes its sweep from the
bottom edge into the corner by about then, and from roughly 5.75s a flare grows
until the frame is solid white. Running further would buy a couple of seconds of
near-static space and then blow the frame out.

The section is `--scene-length` tall (360vh) and the stage inside it is pinned;
that surplus height is the scroll the move is mapped onto. The constants at the
top of `js/scene.js` control the intro length, where the camera stops, and the
copy fade.

The clip is turned a quarter turn and cropped to the frame, the way Figma
places it, which stands the planet up as a horizon along the bottom and leaves
the centred copy over open space. It plays at full opacity — no scrim, no tint.

Scrolling to the end leaves the planet parked in the corner — the end of the
camera move, and where the next section should pick up.

## Design parity

The hero reproduces Figma node `183:3313` at 1440x810. Elements carry a
`data-node-id` attribute naming the Figma node they came from, and the CSS
comments name the node each rule was read off, so any value can be traced back
to the design.

`tools/measure.mjs` diffs every box, text origin and gap against the design
numbers — all currently match exactly. See [`tools/README.md`](./tools/README.md).

## Sizing

The frame fills the window rather than sitting as a 1440px box in the middle of
it — the video and nav run edge to edge and the copy keeps its designed measure.
At exactly 1440x810 every measurement equals the Figma frame.

- **Wider than 1440** — the frame stretches and the video widens with it. Type
  stays at its designed size, so the copy holds its measure in the middle. To
  scale type up on very large monitors instead, that is a change to
  `--frame-scale` in `index.html`.
- **Any height** — the stage fills the window; the copy keeps its designed
  position relative to the frame's midline.
- **Narrower than 900** (`--frame-min-width`) — nothing left to stretch into, so
  the whole frame scales down proportionally, holding every padding and margin
  at its designed ratio. That is a stopgap — replace it with real breakpoints
  once tablet and mobile frames exist in Figma.

## Publishing

Everything is static, so any host works — copy `index.html`, `css/` and
`assets/` to the server root. No configuration needed.

## Assets

Every asset the hero uses is in place. See
[`assets/README.md`](./assets/README.md) for where each one came from and the
handful of notes on the exports.
