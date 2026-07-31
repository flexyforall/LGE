# tools

Optional. Nothing here is needed to view or deploy the site — open
`index.html` and you are done.

## Design parity check

`measure.mjs` opens the page in a headless browser and diffs every box, text
origin and gap against the numbers read off Figma node `183:3165`. It finds
elements by the `data-node-id` attributes in `index.html`.

```bash
cd tools
npm install
npm run check
```

Output is one line per measurement — the Figma value, the rendered value, and
the difference:

```
ok    header (183:3224)   figma[   40.0    20.0  1360.0    64.0 ]  dom[ ... ]  d[  0.0  0.0  0.0  0.0 ]
```

To check a running server instead of the local file:

```bash
npm run check -- http://localhost:8000
```
