/**
 * Walks the whole page and reports what each camera and each piece of copy is
 * doing at every point of the scroll, with a screenshot per stop.
 *
 *   cd tools && npm install && npm run scene
 *
 * Note on codecs: Playwright's Chromium ships without H.264, so it falls
 * through to the WebM sources. Real browsers take the MP4s.
 *
 * Optional tooling — the site itself needs none of this.
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = process.argv[2] ?? root;
const STOPS = [0, 0.15, 0.35, 0.6, 0.85, 1];

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
await page.goto(pathToFileURL(path.join(root, 'index.html')).href, {
  waitUntil: 'load',
});
await page.evaluate(() => document.fonts.ready);

const read = () =>
  page.evaluate(() => {
    const el = (s) => document.querySelector(s);
    const v1 = el('[data-hero-video]');
    const v3 = el('[data-role-video]');
    const copy = el('[data-scene-copy]');
    /* the statement's sliding window: written on, and rubbed out behind */
    const letters = document.querySelectorAll('[data-role-text] span');
    let read = 0;
    let gone = 0;
    letters.forEach((s) => {
      if (s.className === 'is-in') read++;
      if (s.className === 'is-out') gone++;
    });
    return {
      v1: v1.currentTime,
      v3: v3.currentTime,
      copy: +getComputedStyle(copy).opacity,
      readPct: letters.length ? read / letters.length : 0,
      gonePct: letters.length ? gone / letters.length : 0,
      y: window.scrollY,
      pageH: document.documentElement.scrollHeight,
      winH: window.innerHeight,
    };
  });

/* Only the hero's idle loop plays on its own — let it get going before reading. */
await page.waitForTimeout(3000);
const intro = await read();
console.log(
  `\nat rest: the hero's idle clip is at ${intro.v1.toFixed(2)}s\n` +
    `page ${intro.pageH}px over a ${intro.winH}px window\n`
);

const scenes = await page.evaluate(() =>
  [...document.querySelectorAll('[data-scene]')].map((s) => ({
    name: s.dataset.scene,
    top: s.getBoundingClientRect().top + window.scrollY,
    travel: s.offsetHeight - window.innerHeight,
  }))
);

for (const scene of scenes) {
  console.log(`${scene.name}\n  scroll      y      hero   video 3    copy      lit    gone`);
  for (const frac of STOPS) {
    await page.evaluate(
      (y) => window.scrollTo(0, y),
      Math.round(scene.top + scene.travel * frac)
    );
    await page.waitForTimeout(600);
    const s = await read();
    console.log(
      `${String(Math.round(frac * 100)).padStart(7)}% ` +
        `${String(Math.round(s.y)).padStart(6)} ` +
        `${s.v1.toFixed(2).padStart(8)}s ` +
        `${s.v3.toFixed(2).padStart(8)}s ` +
        `${s.copy.toFixed(2).padStart(7)} ` +
        `${(s.readPct * 100).toFixed(0).padStart(6)}% ` +
        `${(s.gonePct * 100).toFixed(0).padStart(6)}%`
    );
    await page.screenshot({
      path: path.join(outDir, `scene-${scene.name}-${Math.round(frac * 100)}.png`),
    });
  }
  console.log('');
}

await browser.close();
console.log(`screenshots in ${outDir}\n`);
