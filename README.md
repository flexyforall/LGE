# CoreSpace

Website built from the CoreSpace Figma design. Plain HTML and CSS — no build
step, no dependencies, no install.

## Viewing it

Double-click `index.html`. That's it.

## Layout

```
index.html          the page
css/style.css       all styles
assets/             Figma exports — see assets/README.md
tools/              optional design-parity check, not needed to run the site
```

## Design parity

The hero reproduces Figma node `183:3165` at 1440x800. Elements carry a
`data-node-id` attribute naming the Figma node they came from, and the CSS
comments name the node each rule was read off, so any value can be traced back
to the design.

`tools/measure.mjs` diffs every box, text origin and gap against the design
numbers — all currently match exactly. See [`tools/README.md`](./tools/README.md).

Below 1440px the frame scales down as a whole rather than re-flowing, which
holds every padding and margin at its designed ratio. That is a stopgap —
replace it with real breakpoints once tablet and mobile frames exist in Figma.

## Publishing

Everything is static, so any host works — copy `index.html`, `css/` and
`assets/` to the server root. No configuration needed.

## Still needed from Figma

See [`assets/README.md`](./assets/README.md#still-needed) — two button shapes
and one licensed font.
