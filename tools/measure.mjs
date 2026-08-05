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
  // --- hero ("Hero"), 356:1231 ---
  ['356:1237', 20, 20, 1400, 64, 'menu'],
  ['356:1240', 40, 35, 34, 34, 'logo'],
  // the plate is 180 x 40, so the button is; it stays flush with the bar's
  // right padding and centred on its 64
  ['356:1254', 1220, 32, 180, 40, 'become-a-partner button'],
  ['356:1246', null, 36, null, 32, 'tab: TECHNOLOGY'],
  // label 20 + 16 + headline 160 + 24 + lead 28 + 40 + button 56 = 344,
  // centred on the frame
  ['356:1255', 56, 233, null, 344, 'hero content'],
  ['356:1257', 56, 233, null, 248, 'title block'],
  ['356:1258', 56, 233, null, 196, 'label + headline'],
  ['356:1259', 56, 233, null, 20, 'tag row'],
  ['356:1260', 56, 239, 8, 8, 'tag square (left)'],
  ['356:1264', 56, 269, null, 160, 'headline'],
  ['356:1265', 56, 453, 677, 28, 'lead'],
  ['356:1266', 56, 521, 210, 56, 'become-partner button'],
  // the frame sets this row's label at 14; it is 12 on request, so the row is
  // narrower than the design's and its left edge follows from the right edge
  ['356:1234', null, 659, null, 20, 'progress-you-can-verify'],
  ['356:1236', null, 668.5, 72, 1, 'its rule'],
  ['356:1267', 0, 679, 1440, 132, 'partner row'],

  // --- section 2 (our role), 238:2674, restyled by 330:489 ---
  // three lines of headline/H1 at 72 — the 64/72 the Intro frame sets
  ['330:497', 338, 321, 764, 216, 'statement'],

  // --- cards, 339:343 (measured against the section, which is its own origin)
  // 160 + [label 20 + 24 + four 52px lines] + 80 + 600 + 160
  ['339:343', 0, 0, 1440, 1252, 'cards section'],
  ['339:486', null, 160, null, 252, 'label + heading'],
  ['339:481', null, 160, null, 20, 'label row'],
  ['339:374', null, 204, 843, 208, 'heading'],
  ['339:353', 56, 492, 1328, 600, 'card row'],
  ['339:354', 56, 492, 915, 600, 'wide card'],
  ['339:365', 979, 492, 405, 600, 'narrow card'],
  ['339:360', 79.5, 515.5, 360, null, 'wide card overline'],
  ['339:372', 1118.5, 602, 380, 380, 'narrow card figure'],

  // --- use cases, 402:2207. Measured with the line landed and the cards on
  // their marks — its characters take up no room until they arrive, and the
  // first card stands dead centre on the frame.
  ['402:2215', null, null, null, 240, 'use: headline (landed)'],
  ['402:2333', 445, 228, 550, 354, 'use: card'],
  ['402:2327', null, 676, null, 44, 'use: name'],
  ['402:2302', 1041, 642, 343, 112, 'use: aside'],
  ['402:2303', 1041, 642, 343, 48, 'use: paragraph'],
  ['402:2304', 1041, 714, 199, 40, 'use: button'],

  // --- newsroom, 396:975. Not pinned, so it is measured against its own
  // section. The cards' own y is not asserted: the frame draws card 1 open and
  // lets its 20px halo take room in the column, which puts every card below it
  // 40 further down than here — the halo is drawn outside the flow so that a
  // card growing never shunts the ones under it. The 100 between them is
  // asserted below instead.
  ['396:976', 56, 80, 1328, 164, 'news: head'],
  ['396:977', 56, 80, 707, 164, 'news: title block'],
  ['396:978', 56, 80, 181, 20, 'news: label row'],
  ['396:979', 56, 86, 8, 8, 'news: label square (left)'],
  ['396:982', 229, 86, 8, 8, 'news: label square (right)'],
  ['396:983', 56, 116, 707, 128, 'news: headline'],
  ['396:1210', 1012, 124, 372, 120, 'news: aside'],
  ['396:1211', 1012, 124, 372, 56, 'news: aside paragraph'],
  ['396:1187', 1012, 204, 130, 40, 'news: read-more button'],
  ['396:1342', 56, 344, 1328, null, 'news: cards'],
  ['396:1027', 56, 344, 655, 431, 'news: card 1 picture'],
  ['396:1156', 729, null, 655, 431, 'news: card 2 picture'],
  ['396:1124', 56, null, 655, 431, 'news: card 3 picture'],
  ['396:1133', 542, null, 145, 40, 'news: card 3 button'],
];

/**
 * Text runs. Figma reports these rounded to whole px, and its glyph advances
 * differ from the browser's by a few tenths, so only the origin is asserted —
 * the spacing between them is covered by GAPS below.
 */
const TEXT_ORIGINS = [
  ['356:1235', null, 659, 'progress you can verify'],
];

/** [fromNodeId, toNodeId, expectedGap, label] — the paddings and margins themselves. */
const GAPS = [
  ['356:1246', '356:1248', 24, 'tabs: TECHNOLOGY -> COMPANY'],
  ['356:1248', '356:1250', 24, 'tabs: COMPANY -> FOR INVESTORS'],
  ['356:1250', '356:1252', 24, 'tabs: FOR INVESTORS -> CONTACT'],
  ['356:1245', '356:1254', 40, 'tabs -> button'],
  // the tag's law: 40px of air between the text and each square
  ['356:1260', '356:1259-text', 40, 'tag: left square -> text'],
  ['356:1259-text', '356:1263', 40, 'tag: text -> right square'],
  ['356:1259', '356:1264', 16, 'tag -> headline'],
  ['356:1264', '356:1265', 24, 'headline -> lead'],
  ['356:1265', '356:1266', 40, 'lead -> button'],
  ['356:1235', '356:1236', 9, 'verify: text -> rule'],
  ['339:481', '339:374', 24, 'cards: label -> heading'],
  ['339:354', '339:365', 8, 'cards: wide -> narrow'],
  ['402:2303', '402:2304', 24, 'use: paragraph -> button'],
  ['396:979', '396:981', 40, 'news: square -> NEWSROOM'],
  ['396:981', '396:982', 40, 'news: NEWSROOM -> square'],
  ['396:978', '396:983', 16, 'news: label -> headline'],
  ['396:1211', '396:1187', 24, 'news: note -> button'],
  ['396:983', '396:1342', 100, 'news: head -> cards'],
  ['396:1029', '396:1155', 100, 'news: card 1 -> card 2'],
  ['396:1155', '396:1123', 100, 'news: card 2 -> card 3'],
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
/*
 * The cards rise into place and trade width as they are scrolled to. Parity is
 * about where they come to rest, so they are landed here rather than scrolled
 * to — the pinned sections above them have to stay at the top of their scroll.
 */
await page.evaluate(() => {
  const row = document.querySelector('[data-card-row]');
  if (row) row.style.setProperty('--card-open', '1');
  document.querySelectorAll('[data-card]').forEach((c) => {
    c.style.transition = 'none';
    c.classList.add('is-in');
  });
  /*
   * The use head assembles itself out of characters that take up no room
   * until they land, so at the top of the page it measures as nothing.
   * Parity is about the line it finishes on — land them all.
   */
  document.querySelectorAll('.use__ch').forEach((c) => c.classList.remove('is-away'));
  /* ...and the first card stood on its mark, where the frame draws it. */
  const first = document.querySelector('[data-use-card]');
  if (first) first.style.transform = 'translate3d(-275px, -177px, 0)';
  /* ...and the foot shown, which only arrives once the cards are running */
  document.querySelectorAll('[data-use-name], [data-use-aside]').forEach((e) => {
    e.style.opacity = '1';
  });
});
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
    out['356:1259-text'] = {
      x: r.x - frame.x,
      y: r.y - frame.y,
      w: r.width,
      h: r.height,
    };
  }
  for (const el of document.querySelectorAll('[data-node-id]')) {
    /*
     * Pinned sections are measured against their own frame; the cards section
     * is not pinned and is its own origin.
     */
    const frame =
      el.closest('.frame') ||
      el.closest('[data-cards]') ||
      el.closest('[data-scene-news]') ||
      el.closest('.use__introStage');
    /*
     * The menu is fixed to the window and lives in no frame; the viewport is
     * its origin, which at the top of the page is the hero frame's own.
     */
    const origin = frame ? frame.getBoundingClientRect() : { x: 0, y: 0 };
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
