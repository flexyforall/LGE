/**
 * Screenshots the page for eyeballing against the Figma frame.
 *
 *   node shot.mjs <url-or-path> <out.png> [width] [height] [videoSeconds]
 *
 * `videoSeconds` pauses the background video on a given timestamp, which is how
 * to check text contrast at the bright part of the loop.
 *
 * Optional tooling — the site itself needs none of this.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const [, , target, outPath, w = '1440', h = '800', seek] = process.argv;
const url = target.startsWith('http')
  ? target
  : pathToFileURL(path.resolve(target)).href;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({
  viewport: { width: +w, height: +h },
  deviceScaleFactor: 2,
});
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

if (seek !== undefined) {
  await page.evaluate(async (t) => {
    const video = document.querySelector('video');
    if (!video) return;
    video.pause();
    await new Promise((resolve) => {
      video.addEventListener('seeked', resolve, { once: true });
      video.currentTime = t;
    });
  }, +seek);
}

await page.waitForTimeout(500);
await page.screenshot({ path: outPath });
await browser.close();
