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
      'menu button': box('.menu__cta'), 'menu label': box('.menu__cta > .swap'),
      ticker: box('.ticker'),
      headline: box('.headline'), divider: box('.divider'), lede: box('.lede'),
      button: box('.cta'), 'button label': box('.cta > .swap'), 'button arrow': box('.cta img'),
      ellipse: box('.ellipse'), images: box('.images'),
      'card left': box('.card[data-slot="2"]'), 'card middle': box('.card[data-slot="3"]'), 'card right': box('.card[data-slot="4"]'),

      // Trusted By — 231:2525
      trusted: box('.trusted'), 'trusted lede': box('.trusted__lede'),
      'logo row': box('.trusted__track'), 'logo 1': box('.logo'),
      'fade left': box('.trusted__fade--left'), 'fade right': box('.trusted__fade--right'),

      // Proof Band — 231:2601
      proof: box('.proof'), 'proof title': box('.proof__title'),
      'proof lede': box('.proof__lede'), 'proof stats': box('.proof__stats'),
      'stat row 1': box('.stat:nth-child(1)'), 'stat row 2': box('.stat:nth-child(2)'),
      'stat row 3': box('.stat:nth-child(3)'), 'stat row 4': box('.stat:nth-child(4)'),
      'stat value 1': box('.stat:nth-child(1) .stat__value'),
      'stat icon 1': box('.stat:nth-child(1) .stat__icon'),
      'stat desc 1': box('.stat:nth-child(1) .stat__desc'),
      'stat value 3': box('.stat:nth-child(3) .stat__value'),
      'stat desc 3': box('.stat:nth-child(3) .stat__desc'),
    },
    tickerItems: [...document.querySelectorAll('.ticker__row > *')]
      .map(el => +(el.getBoundingClientRect().left - frame.left).toFixed(2)),
    ledeLines: (() => {
      const range = document.createRange();
      range.selectNodeContents(document.querySelector('.lede'));
      return range.getClientRects().length;
    })(),
    page: [+document.getElementById('page').getBoundingClientRect().width.toFixed(2),
           +document.getElementById('page').getBoundingClientRect().height.toFixed(2)],
    advances: {
      'Menu': advance('Menu', display(14, 500, 0)),
      'Book a Demo': advance('Book a Demo', display(14, 500, 0)),
      'See Our Works': advance('See Our Works', display(18, 500, -0.18)),
      'ticker / since': advance('Exclusively serving the built environment since 2013', display(14, 400, 0)),
      'card / left': advance('Concept & Construct Process', display(24, 500, -0.24)),
      'card / middle': advance('Between Space & Context', display(24, 500, -0.24)),
      'card / right': advance('Architectural Workflow', display(24, 500, -0.24)),
      '$48M': advance('$48M', display(54, 500, -1.62)),
      '218': advance('218', display(54, 500, -1.62)),
      '16K': advance('16K', display(54, 500, -1.62)),
    },
  };
});

const FIGMA_BOXES = {
  menu: [436, 68, 568, 64], 'menu logo': [693, 88, 54, 24], 'menu moon': [827, 80, 40, 40],
  'menu button': [879, 80, 113, 40], 'menu label': [895, 90, 81, 19.6],
  ticker: [0, 0, 1440, 48],
  headline: [80, 226, 648, 172.8], divider: [873.5, 122, 1, 336], lede: [944, 238, 400, 84],
  button: [944, 346, 190, 52], 'button label': [996, 361, 114, 21.6],
  'button arrow': [964, 360, 24, 24],
  ellipse: [-12, 548, 1464, 1464], images: [0, 458, 1440, 401],
  'card left': [-45.48, 558.24, 458.67, 390.62],
  'card middle': [476, 458, 487.5, 354],
  'card right': [1026.47, 548, 458.67, 390.62],

  trusted: [0, 859, 1440, 262], 'trusted lede': [80, 922, 308, 56],
  'logo row': [428, 900, 1012, 100], 'logo 1': [428, 900, 180, 100],
  'fade left': [388, 859, 220, 262], 'fade right': [1220, 859, 220, 262],

  proof: [0, 1121, 1440, 624], 'proof title': [80, 1201, 524, 118.8],
  'proof lede': [80, 1580, 524, 84], 'proof stats': [620, 1121, 820, 623],
  'stat row 1': [621, 1121, 819, 156], 'stat row 2': [621, 1277, 819, 156],
  'stat row 3': [621, 1433, 819, 156], 'stat row 4': [621, 1589, 819, 155],
  'stat value 1': [661, 1169, 182, 59],
  'stat icon 1': [811, 1182.5, 32, 32],
  'stat desc 1': [928, 1170.5, 432, 56],
  'stat value 3': [661, 1481, 127, 59],
  'stat desc 3': [928, 1496.5, 432, 28],
};
// Figma reports a text box rounded up to whole pixels, so these run about a
// pixel over the true advance.
// [figma box width, type size]. Figma rounds a text box up to whole pixels,
// and the slack that leaves grows with the size, so the room allowed does too.
const FIGMA_ADVANCES = {
  'Menu': [35, 14], 'Book a Demo': [81, 14], 'See Our Works': [114, 18],
  'ticker / since': [304, 14],
  'card / left': [301, 24], 'card / middle': [266, 24], 'card / right': [231, 24],
  '$48M': [142, 54], '218': [87, 54], '16K': [89, 54],
};
const FIGMA_TICKER = [-629, -565, -156, -92, 260, 324, 744, 808, 1217, 1281, 1633, 1697];

let bad = 0;

const pad = (n, w) => String(n).padStart(w);
const report = (ok, name, figma, dom, delta) => {
  if (!ok) bad++;
  console.log(`${ok ? 'ok   ' : 'DIFF '} ${name.padEnd(14)} figma[${figma} ]  dom[${dom} ]  d[${delta} ]`);
};

console.log(`frame  ${got.frame[0]} x ${got.frame[1]}  (figma: 1440 x 859)`);
console.log(`page   ${got.page[0]} x ${got.page[1]}  (figma: 1440 x 1745)\n`);
if (got.page[0] !== 1440 || Math.abs(got.page[1] - 1745) > 0.5) bad++;
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
  const [figma, size] = FIGMA_ADVANCES[name];
  const d = +(dom - figma).toFixed(2);
  report(d <= 0.1 && d > -Math.max(2, size * 0.07), name, pad(figma, 8), pad(dom, 8), pad(d, 7));
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
