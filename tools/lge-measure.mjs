// Diffs the rendered Lead Generation Experts page against the numbers read off
// the Figma frame (ZYsev0ryrBYAfE2RHfC384, node 221:2799, 1440 x 859).
//
//   npm run lge                       checks the local files
//   npm run lge -- http://host:8000   checks a running server
//
// Every value on the right-hand side below came out of the frame itself. A
// difference over half a pixel is reported as DIFF; text advances are allowed a
// little more room, because Figma rounds a text box up to whole pixels.

import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff2': 'font/woff2',
};

let base = process.argv[2];
let server = null;
if (!base) {
  server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    fs.readFile(file, (err, body) => {
      if (err) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      res.end(body);
    });
  });
  await new Promise(done => server.listen(0, done));
  base = 'http://localhost:' + server.address().port;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const failed = [];
page.on('response', r => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()); });
// `motion=off` holds the page in its rest state — the frame, standing still.
await page.goto(base + '/index.html?motion=off', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

const got = await page.evaluate(() => {
  const frame = document.getElementById('hero').getBoundingClientRect();
  const box = sel => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return [+(b.left - frame.left).toFixed(2), +(b.top - frame.top).toFixed(2),
            +b.width.toFixed(2), +b.height.toFixed(2)];
  };
  const advance = (text, css) => {
    const s = document.createElement('span');
    s.style.cssText = 'position:absolute;white-space:nowrap;visibility:hidden;' + css;
    s.textContent = text;
    document.body.appendChild(s);
    const w = s.getBoundingClientRect().width;
    s.remove();
    return +w.toFixed(2);
  };
  const display = (size, weight, tracking) =>
    `font-family:"SF Pro Display";font-weight:${weight};font-size:${size}px;letter-spacing:${tracking}px;`;
  return {
    frame: [+frame.width.toFixed(2), +frame.height.toFixed(2)],
    boxes: {
      menu: box('.menu'), 'menu logo': box('.menu__logo'), 'menu moon': box('.menu__moon'),
      'menu button': box('.menu__cta'), ticker: box('.ticker'),
      headline: box('.headline'), divider: box('.divider'), lede: box('.lede'),
      button: box('.cta'), 'button arrow': box('.cta img'),
      ellipse: box('.ellipse'), images: box('.images'),
      'card left': box('.card[data-slot="2"]'), 'card middle': box('.card[data-slot="3"]'), 'card right': box('.card[data-slot="4"]'),
    },
    tickerItems: [...document.querySelectorAll('.ticker__row > *')]
      .map(el => +(el.getBoundingClientRect().left - frame.left).toFixed(2)),
    ledeLines: (() => {
      const range = document.createRange();
      range.selectNodeContents(document.querySelector('.lede'));
      return range.getClientRects().length;
    })(),
    advances: {
      'Menu': advance('Menu', display(14, 500, 0)),
      'Book a Demo': advance('Book a Demo', display(14, 500, 0)),
      'See Our Works': advance('See Our Works', display(18, 500, -0.18)),
      'ticker / since': advance('Exclusively serving the built environment since 2013', display(14, 400, 0)),
      'card / left': advance('Concept & Construct Process', display(24, 500, -0.24)),
      'card / middle': advance('Between Space & Context', display(24, 500, -0.24)),
      'card / right': advance('Architectural Workflow', display(24, 500, -0.24)),
    },
  };
});

const FIGMA_BOXES = {
  menu: [436, 68, 568, 64], 'menu logo': [693, 88, 54, 24], 'menu moon': [827, 80, 40, 40],
  'menu button': [879, 80, 113, 40], ticker: [0, 0, 1440, 48],
  headline: [80, 226, 648, 172.8], divider: [873.5, 122, 1, 336], lede: [944, 238, 400, 84],
  button: [944, 346, 190, 52], 'button arrow': [964, 360, 24, 24],
  ellipse: [-12, 548, 1464, 1464], images: [0, 458, 1440, 401],
  'card left': [-45.48, 558.24, 458.67, 390.62],
  'card middle': [476, 458, 487.5, 354],
  'card right': [1026.47, 548, 458.67, 390.62],
};
// Figma reports a text box rounded up to whole pixels, so these run about a
// pixel over the true advance.
const FIGMA_ADVANCES = {
  'Menu': 35, 'Book a Demo': 81, 'See Our Works': 114, 'ticker / since': 304,
  'card / left': 301, 'card / middle': 266, 'card / right': 231,
};
const FIGMA_TICKER = [-629, -565, -156, -92, 260, 324, 744, 808, 1217, 1281, 1633, 1697];

let bad = 0;
const pad = (n, w) => String(n).padStart(w);
const report = (ok, name, figma, dom, delta) => {
  if (!ok) bad++;
  console.log(`${ok ? 'ok   ' : 'DIFF '} ${name.padEnd(14)} figma[${figma} ]  dom[${dom} ]  d[${delta} ]`);
};

console.log(`frame  ${got.frame[0]} x ${got.frame[1]}  (figma: 1440 x 859)\n`);
console.log('--- boxes: x, y, width, height, relative to the frame ---');
for (const [name, figma] of Object.entries(FIGMA_BOXES)) {
  const dom = got.boxes[name];
  if (!dom) { console.log(`MISSING  ${name}`); bad++; continue; }
  const d = dom.map((v, i) => +(v - figma[i]).toFixed(2));
  report(d.every(v => Math.abs(v) <= 0.5), name,
    figma.map(n => pad(n, 8)).join(''), dom.map(n => pad(n, 8)).join(''), d.map(n => pad(n, 7)).join(''));
}

console.log('\n--- ticker item origins (the frame draws the first twelve) ---');
FIGMA_TICKER.forEach((figma, i) => {
  const d = +(got.tickerItems[i] - figma).toFixed(2);
  report(Math.abs(d) <= 0.5, 'item ' + i, pad(figma, 8), pad(got.tickerItems[i], 8), pad(d, 7));
});

// The strip loops by travelling exactly one run of six items. If the runs are
// not that far apart the loop shows a seam.
console.log('\n--- ticker loop, one run = 1373px ---');
for (let run = 1; run * 6 < got.tickerItems.length; run++) {
  const gap = +(got.tickerItems[run * 6] - got.tickerItems[0]).toFixed(2);
  const d = +(gap - run * 1373).toFixed(2);
  report(Math.abs(d) <= 0.01, 'run ' + run, pad(run * 1373, 8), pad(gap, 8), pad(d, 7));
}

console.log('\n--- text advances ---');
for (const [name, dom] of Object.entries(got.advances)) {
  const figma = FIGMA_ADVANCES[name];
  const d = +(dom - figma).toFixed(2);
  report(d <= 0.1 && d > -2, name, pad(figma, 8), pad(dom, 8), pad(d, 7));
}

console.log(`\nlede line count: ${got.ledeLines}  (figma: 3)`);
if (got.ledeLines !== 3) bad++;
console.log('failed requests:', failed.length ? failed : 'none');
if (failed.length) bad++;

const shot = path.join(ROOT, 'tools', 'lge-render.png');
await page.screenshot({ path: shot, clip: { x: 0, y: 0, width: 1440, height: 859 } });
console.log('screenshot:', shot);

await browser.close();
if (server) server.close();
process.exit(bad ? 1 : 0);
