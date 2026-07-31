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
  ['201:3081', 40, 20, 1360, 64, 'header'],
  ['201:3082', 60, 35, 697, 34, 'header leading group'],
  ['201:3083', 60, 35, 34, 34, 'logo'],
  ['201:3094', 1240, 33, 140, 38, 'become-a-partner button'],
  ['201:3095', 1240, 33, 140, 34, 'become-a-partner shape'],
  ['201:3127', 40, 252, 1360, 306, 'hero block'],
  ['201:3125', 40, 252, 1360, 20, 'eyebrow'],
  ['201:3098', 40, 292, 1360, 266, 'hero body'],
  ['201:3069', 40, 292, 1360, 128, 'headline row'],
  ['201:3071', 167.5, 292, 1105, 128, 'headline'],
  ['201:3073', 40, 460, 1360, 98, 'lede'],
  ['201:3074', 40, 460, 1360, 24, 'subhead'],
  ['201:3075', 634.5, 508, 171, 50, 'actions'],
  ['201:3076', 634.5, 508, 171, 50, 'explore button'],
  ['201:3077', 654.5, 518, 131, 30, 'explore label box'],
  // 175 x 50 centred on the label box.
  ['201:3078', 632.5, 508, 175, 50, 'explore plate'],
  ['201:3133', 632.5, 508, 175, 50, 'explore glow'],
  // Figma places these by a 94 x 40 / 94 x 32 box; each SVG carries its own
  // blur, so it renders larger and is centred on that box.
  ['201:3135', 649, 446, 214, 160, 'glow (soft)'],
  ['201:3136', 689, 494, 134, 72, 'glow (core)'],
];

/**
 * Text runs. Figma reports these rounded to whole px, and its glyph advances
 * differ from the browser's by a few tenths, so only the origin is asserted —
 * the spacing between them is covered by GAPS below.
 */
const TEXT_ORIGINS = [
  ['201:3089', 134, 45, 'nav: TECHNOLOGY'],
  ['201:3096', 1258, 43, 'become-a-partner label'],
  ['201:3079', 654.5, 526, 'explore label'],
];

/** [fromNodeId, toNodeId, expectedGap, label] — the paddings and margins themselves. */
const GAPS = [
  ['201:3083', '201:3088', 40, 'logo -> nav'],
  ['201:3089', '201:3090', 30, 'nav: TECHNOLOGY -> COMPANY'],
  ['201:3090', '201:3091', 30, 'nav: COMPANY -> NEWSROOM'],
  ['201:3091', '201:3092', 30, 'nav: NEWSROOM -> FOR INVESTORS'],
  ['201:3092', '201:3093', 30, 'nav: FOR INVESTORS -> CONTACT'],
  ['201:3125', '201:3098', 20, 'eyebrow -> body'],
  ['201:3069', '201:3073', 40, 'headline -> lede'],
  ['201:3074', '201:3075', 24, 'subhead -> button'],
];

const TOL = 0.5;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--no-sandbox', '--allow-file-access-from-files'],
});
// The Figma frame's own size — the frame stretches to fill the window, so this
// is the one viewport where the rendered boxes should equal the design values.
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
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
