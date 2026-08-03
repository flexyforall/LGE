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
  // --- hero ("section 5"), 313:1164 ---
  ['313:1200', 20, 20, 1400, 64, 'header'],
  ['313:1201', 40, 35, 697, 34, 'header leading group'],
  ['313:1203', 40, 35, 34, 34, 'logo'],
  ['313:1212', 1260, 33, 140, 38, 'become-a-partner slot'],
  ['313:1213', 1254, 32, 146, 36, 'become-a-partner shape'],
  // tag 14 + 32 + [headline 128 + 40 + button 57] = 271, centred on the frame
  ['313:1246', 220, 269, 1000, 271, 'hero content'],
  ['313:1240', null, 269, null, 14, 'tag row'],
  ['313:1241', null, 272, 8, 8, 'tag square (left)'],
  ['313:1239', 220, 315, 1000, 225, 'title + button stack'],
  ['313:1221', 220, 315, 1000, 128, 'headline'],
  ['313:1223', 626, 483, 188, 57, 'button row'],
  ['313:1224', 626, 486.5, 171, 50, 'button'],
  ['313:1225', 703, 481, 94, 40, 'button glow'],
  ['313:1228', 626, 488, 188, 50, 'button tab'],
  ['313:1229', 626, 486, 188, 54, 'button plate'],
  ['313:1230', 626, 486, 188, 54, 'button sheen'],
  // two 16px lines — the height the bottom anchor is set from
  ['313:1216', 460, 728, 520, 32, 'bottom note'],

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
  ['313:1208', 114, 44.2, 'nav: TECHNOLOGY'],
  ['313:1214', 1270, 42, 'become-a-partner label'],
  ['313:1237', 644, 506, 'explore label'],
  ['313:1218', 460, 728, 'bottom note text'],
  ['238:2679', 687, 760, 'our-role label'],
  ['238:2682', 607, 760, 'our-role row'],
];

/** [fromNodeId, toNodeId, expectedGap, label] — the paddings and margins themselves. */
const GAPS = [
  ['313:1203', '313:1207', 40, 'logo -> nav'],
  ['313:1208', '313:1209', 30, 'nav: TECHNOLOGY -> COMPANY'],
  ['313:1209', '313:1210', 30, 'nav: COMPANY -> FOR INVESTORS'],
  ['313:1210', '313:1211', 30, 'nav: FOR INVESTORS -> CONTACT'],
  // the tag's law: 56px of air between the text and each square
  ['313:1241', '313:1240-text', 56, 'tag: left square -> text'],
  ['313:1240-text', '313:1244', 56, 'tag: text -> right square'],
  ['313:1240', '313:1239', 32, 'tag -> title stack'],
  ['313:1221', '313:1223', 40, 'headline -> button'],
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
  const tagText = document.querySelector('[data-hero-tag]');
  if (tagText) {
    const frame = tagText.closest('.frame').getBoundingClientRect();
    const r = tagText.getBoundingClientRect();
    out['313:1240-text'] = {
      x: r.x - frame.x,
      y: r.y - frame.y,
      w: r.width,
      h: r.height,
    };
  }
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

const n = (v) => (v === null ? '      —' : v.toFixed(1).padStart(7));
let failures = 0;

/*
 * A null in `want` means the design does not pin that number: the tag row's
 * width follows whichever line is showing, and the note's height follows how
 * many lines its copy takes. Those are reported and skipped.
 */
const check = (label, got, want) => {
  const deltas = got.map((g, i) => (want[i] === null ? null : g - want[i]));
  const ok = deltas.every((d) => d === null || Math.abs(d) <= TOL);
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
