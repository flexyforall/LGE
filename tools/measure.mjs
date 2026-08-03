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
  // --- section 1 (hero), 235:2775 ---
  ['235:2779', 20, 20, 1400, 64, 'header'],
  ['235:2780', 40, 35, 697, 34, 'header leading group'],
  ['235:2781', 40, 35, 34, 34, 'logo'],
  ['235:2792', 1260, 33, 140, 38, 'become-a-partner button'],
  ['235:2793', 1260, 33, 140, 34, 'become-a-partner shape'],
  ['235:2807', 60, 285, 1320, 240, 'title block'],
  ['235:2816', 60, 710, 1320, 50, 'hero footer'],
  ['235:2802', 1209, 710, 171, 50, 'actions'],
  ['235:2803', 1209, 710, 171, 50, 'explore button'],
  ['235:2804', 1229, 720, 131, 30, 'explore label box'],
  ['235:2805', 1207, 710, 175, 50, 'explore plate'],

  // --- section 2 (our role), 238:2674 ---
  ['238:2675', 338, 321, 764, 168, 'statement'],
  ['238:2680', 607, 763, 8, 8, 'dot (left)'],
];

/**
 * Text runs. Figma reports these rounded to whole px, and its glyph advances
 * differ from the browser's by a few tenths, so only the origin is asserted —
 * the spacing between them is covered by GAPS below.
 */
const TEXT_ORIGINS = [
  ['235:2808', 60, 285, 'headline'],
  ['235:2814', 60, 736, 'subhead'],
  ['235:2787', 114, 45, 'nav: TECHNOLOGY'],
  ['235:2794', 1278, 43, 'become-a-partner label'],
  ['235:2806', 1229, 728, 'explore label'],
  ['238:2679', 687, 760, 'our-role label'],
  ['238:2682', 607, 760, 'our-role row'],
];

/** [fromNodeId, toNodeId, expectedGap, label] — the paddings and margins themselves. */
const GAPS = [
  ['235:2781', '235:2786', 40, 'logo -> nav'],
  ['235:2787', '235:2788', 30, 'nav: TECHNOLOGY -> COMPANY'],
  ['235:2788', '235:2789', 30, 'nav: COMPANY -> NEWSROOM'],
  ['235:2789', '235:2790', 30, 'nav: NEWSROOM -> FOR INVESTORS'],
  ['235:2790', '235:2791', 30, 'nav: FOR INVESTORS -> CONTACT'],
  ['238:2680', '238:2679', 72, 'dot -> OUR ROLE'],
  ['238:2679', '238:2681', 72, 'OUR ROLE -> dot'],
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

/*
 * Each section has its own frame, so boxes are measured against whichever
 * frame encloses them rather than against a single origin.
 */
const rects = await page.evaluate(() => {
  const out = {};
  for (const el of document.querySelectorAll('[data-node-id]')) {
    const frame = el.closest('.frame');
    if (!frame) continue;
    const origin = frame.getBoundingClientRect();
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
