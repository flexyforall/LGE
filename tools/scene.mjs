/**
 * Walks the hero scene and reports what the camera and copy are doing at each
 * point of the scroll, with a screenshot per stop.
 *
 *   cd tools && npm install && npm run scene
 *
 * Note on codecs: Playwright's Chromium ships without H.264, so it plays the
 * WebM source. Real browsers pick whichever of the two they prefer.
 *
 * Optional tooling — the site itself needs none of this.
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = process.argv[2] ?? root;
const STOPS = [0, 0.15, 0.35, 0.55, 0.7, 0.9, 1];

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 800 } });
await page.goto(pathToFileURL(path.join(root, 'index.html')).href, {
  waitUntil: 'load',
});
await page.evaluate(() => document.fonts.ready);

const read = () =>
  page.evaluate(() => {
    const video = document.querySelector('[data-scene-video]');
    const copy = document.querySelector('[data-scene-copy]');
    const scene = document.querySelector('[data-scene]');
    return {
      t: video.currentTime,
      duration: video.duration,
      paused: video.paused,
      copy: +getComputedStyle(copy).opacity,
      travel: scene.offsetHeight - window.innerHeight,
      y: window.scrollY,
    };
  });

// Let the intro play out and settle.
await page.waitForTimeout(4000);
const intro = await read();
console.log(
  `\nintro: held at ${intro.t.toFixed(2)}s of ${intro.duration.toFixed(2)}s, ` +
    `paused=${intro.paused}\nscroll travel: ${intro.travel}px\n`
);
if (!intro.paused || intro.t === 0) {
  console.log('WARNING: the intro did not play and hold as expected.\n');
}

console.log('  scroll      y   camera    copy');
for (const frac of STOPS) {
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(intro.travel * frac));
  await page.waitForTimeout(600);
  const s = await read();
  console.log(
    `${String(Math.round(frac * 100)).padStart(7)}% ` +
      `${String(Math.round(s.y)).padStart(6)} ` +
      `${s.t.toFixed(2).padStart(7)}s ` +
      `${s.copy.toFixed(2).padStart(7)}` +
      `${s.paused ? '' : '   PLAYING — should be scroll-driven'}`
  );
  await page.screenshot({
    path: path.join(outDir, `scene-${Math.round(frac * 100)}.png`),
  });
}

await browser.close();
console.log(`\nscreenshots in ${outDir}\n`);
