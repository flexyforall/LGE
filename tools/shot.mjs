/**
 * Screenshots the page for eyeballing against the Figma frame.
 *
 *   node shot.mjs <url-or-path> <out.png> [width] [height]
 *
 * Optional tooling — the site itself needs none of this.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const [, , target, outPath, w = '1440', h = '800'] = process.argv;
const url = target.startsWith('http')
  ? target
  : pathToFileURL(path.resolve(target)).href;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({
  viewport: { width: +w, height: +h },
  deviceScaleFactor: 2,
});
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);
await page.screenshot({ path: outPath });
await browser.close();
