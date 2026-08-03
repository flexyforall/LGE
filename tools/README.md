# tools

Optional. Nothing here is needed to view or deploy the site — open
`index.html` and you are done.

## Design parity check

`measure.mjs` opens the page in a headless browser and diffs every box, text
origin and gap against the numbers read off the Figma frames — `313:1164` for
the hero, `238:2674` for Our role. It finds elements by the `data-node-id`
attributes in `index.html`.

```bash
cd tools
npm install
npm run check
```

Output is one line per measurement — the Figma value, the rendered value, and
the difference:

```
ok    header (313:1200)   figma[   20.0    20.0  1400.0    64.0 ]  dom[ ... ]  d[  0.0  0.0  0.0  0.0 ]
```

A `—` in the Figma column is a number the design does not pin — the tag row's
width follows whichever line is showing — and is reported without being
asserted.

To check a running server instead of the local file:

```bash
npm run check -- http://localhost:8000
```

## Scene walkthrough

`scene.mjs` steps through both sections' scroll and reports where each clip is,
how far the copy has faded and how much of the statement has been read — with a
screenshot at each stop.

```bash
npm run scene
```

Playwright's Chromium ships without H.264, so it plays the WebM source. Real
browsers pick whichever of the two they prefer.

## Playback direction

`playback.mjs` guards against a clip stepping backwards on its own — once
across the hero's idle loop, where wraps back to 0 are the loop working and
anything else is a rewind, and once through a scripted scroll ramp over Our
role. Exits non-zero if it finds a backward step, or if the hand-off to the
next container never happens.

```bash
npm run playback
```
