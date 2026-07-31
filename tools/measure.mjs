/**
 * Diffs the rendered hero against the Figma frame.
 *
 * Elements in index.html carry a `data-node-id` matching their Figma node, so
 * every box can be looked up and compared with the numbers read off the design.
 *
 *   cd tools && npm install && npm run check
 *
 * Optional tooling — the site itself needs none of this.
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target =
  process.argv[2] ?? pathToFileURL(path.join(root, 'index.html')).href;

/** Boxes in frame coordinates: [nodeId, x, y, w, h, label]. */
const BOXES = [
  ['183:3224', 40, 20, 1360, 64, 'header'],
  ['183:3193', 60, 35, 697, 34, 'header leading group'],
  ['183:3194', 60, 35, 34, 34, 'logo'],
  ['183:3190', 1240, 33, 140, 38, 'become-a-partner button'],
  ['183:3191', 1240, 33, 140, 34, 'become-a-partner shape'],
  ['183:3223', 60, 264, 653, 346, 'hero content'],
  ['183:3216', 60, 264, 653, 240, 'hero copy'],
  ['183:3207', 60, 264, 653, 192, 'headline'],
  ['183:3214', 60, 480, 653, 24, 'subhead'],
  ['183:3217', 60, 560, 173, 50, 'actions'],
  ['183:3218', 60, 560, 171, 50, 'explore button'],
  ['183:3219', 80, 570, 131, 30, 'explore label box'],
  // The export's artwork is 175 x 44 inside Figma's 175 x 50 node box, so it
  // sits centred on the same point rather than being stretched to fill it.
  ['183:3246', 60, 563, 175, 44, 'explore shape'],
];

/**
 * Text runs. Figma reports these rounded to whole px, and its glyph advances
 * differ from the browser's by a few tenths, so only the origin is asserted —
 * the spacing between them is covered by GAPS below.
 */
const TEXT_ORIGINS = [
  ['183:3200', 134, 45, 'nav: TECHNOLOGY'],
  ['183:3192', 1258, 43, 'become-a-partner label'],
  ['183:3221', 80, 578, 'explore label'],
];

/** [fromNodeId, toNodeId, expectedGap, label] — the paddings and margins themselves. */
const GAPS = [
  ['183:3194', '183:3199', 40, 'logo -> nav'],
  ['183:3200', '183:3201', 30, 'nav: TECHNOLOGY -> COMPANY'],
  ['183:3201', '183:3202', 30, 'nav: COMPANY -> NEWSROOM'],
  ['183:3202', '183:3203', 30, 'nav: NEWSROOM -> FOR INVESTORS'],
  ['183:3203', '183:3204', 30, 'nav: FOR INVESTORS -> CONTACT'],
  ['183:3207', '183:3214', 24, 'headline -> subhead'],
  ['183:3216', '183:3217', 56, 'copy -> actions'],
];

const TOL = 0.5;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--no-sandbox', '--allow-file-access-from-files'],
});
// The Figma frame's own size — the frame stretches to fill the window, so this
// is the one viewport where the rendered boxes should equal the design values.
const page = await browser.newPage({ viewport: { width: 1440, height: 800 } });
await page.goto(target, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);

const rects = await page.evaluate(() => {
  const origin = document
    .querySelector('[data-design-frame]')
    .getBoundingClientRect();
  const out = {};
  for (const el of document.querySelectorAll('[data-node-id]')) {
    const r = el.getBoundingClientRect();
    out[el.dataset.nodeId] = {
      x: r.x - origin.x,
      y: r.y - origin.y,
      w: r.width,
      h: r.height,
    };
  }
  return out;
});

await browser.close();

const n = (v) => v.toFixed(1).padStart(7);
let failures = 0;

const check = (label, got, want) => {
  const deltas = got.map((g, i) => g - want[i]);
  const ok = deltas.every((d) => Math.abs(d) <= TOL);
  if (!ok) failures++;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'}  ${label.padEnd(34)}` +
      ` figma[${want.map(n).join(' ')} ]  dom[${got.map(n).join(' ')} ]  d[${deltas.map(n).join(' ')} ]`
  );
};

console.log(`\nchecking ${target}\n\nBOXES  (x, y, width, height)`);
for (const [id, x, y, w, h, label] of BOXES) {
  const r = rects[id];
  if (!r) {
    console.log(`FAIL  ${label} — ${id} not in the DOM`);
    failures++;
    continue;
  }
  check(`${label} (${id})`, [r.x, r.y, r.w, r.h], [x, y, w, h]);
}

console.log('\nTEXT ORIGINS  (x, y)');
for (const [id, x, y, label] of TEXT_ORIGINS) {
  const r = rects[id];
  if (!r) {
    console.log(`FAIL  ${label} — ${id} not in the DOM`);
    failures++;
    continue;
  }
  check(`${label} (${id})`, [r.x, r.y], [x, y]);
}

console.log('\nGAPS');
for (const [fromId, toId, gap, label] of GAPS) {
  const a = rects[fromId];
  const b = rects[toId];
  if (!a || !b) {
    console.log(`FAIL  ${label} — missing node`);
    failures++;
    continue;
  }
  const horizontal = b.x > a.x + a.w - 1;
  const got = horizontal ? b.x - (a.x + a.w) : b.y - (a.y + a.h);
  check(label, [got], [gap]);
}

console.log(
  failures === 0
    ? '\nEvery box, origin and gap matches Figma.\n'
    : `\n${failures} mismatch(es).\n`
);
process.exit(failures === 0 ? 0 : 1);
