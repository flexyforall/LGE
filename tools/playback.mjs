/**
 * Guards against the camera stepping backwards.
 *
 * The move should only ever run forwards, or backwards because the scroll went
 * backwards — never on its own. Two things have caused it to:
 *
 *   - stopping the intro on `timeupdate`, which fires about four times a second
 *     and so lets the clip overshoot the mark before being rewound onto it
 *   - issuing a fresh seek while the last one is still in flight
 *
 * Both show up here as a backward step in `currentTime`.
 *
 *   cd tools && npm install && npm run playback
 *
 * Optional tooling — the site itself needs none of this.
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOLERANCE = 0.005; // seconds; below a tenth of a frame

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 800 } });
await page.goto(pathToFileURL(path.join(root, 'index.html')).href, {
  waitUntil: 'load',
});

function worstDrop(samples) {
  let worst = 0;
  let at = null;
  for (let i = 1; i < samples.length; i++) {
    const drop = samples[i - 1][1] - samples[i][1];
    if (drop > worst) {
      worst = drop;
      at = samples[i][0];
    }
  }
  return { worst, at };
}

/* 1. The intro: plays, then stops. It must not snap back as it settles. */
const intro = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const video = document.querySelector('[data-scene-video]');
      const out = [];
      const t0 = performance.now();
      (function tick() {
        const elapsed = performance.now() - t0;
        out.push([Math.round(elapsed), video.currentTime]);
        if (elapsed < 5000) requestAnimationFrame(tick);
        else resolve(out);
      })();
    })
);

/* 2. The scrub: ramp the scroll, then hold. It must not drift or lurch. */
const scrub = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const video = document.querySelector('[data-scene-video]');
      const scene = document.querySelector('[data-scene]');
      const travel = scene.offsetHeight - window.innerHeight;
      const out = [];
      const t0 = performance.now();
      (function tick() {
        const elapsed = performance.now() - t0;
        if (elapsed < 2000) window.scrollTo(0, Math.round(travel * (elapsed / 2000)));
        out.push([Math.round(elapsed), video.currentTime]);
        if (elapsed < 3200) requestAnimationFrame(tick);
        else resolve(out);
      })();
    })
);

await browser.close();

const introDrop = worstDrop(intro);
const scrubDrop = worstDrop(scrub);
const atScrollEnd = scrub.find((s) => s[0] >= 2000)[1];
const afterHolding = scrub[scrub.length - 1][1];
const drift = afterHolding - atScrollEnd;

console.log(`
intro   settled at ${intro[intro.length - 1][1].toFixed(3)}s
        largest backward step ${introDrop.worst.toFixed(4)}s${introDrop.at !== null ? ` at ${introDrop.at}ms` : ''}

scrub   ${atScrollEnd.toFixed(3)}s at the end of the scroll, ${afterHolding.toFixed(3)}s after holding (drift ${drift.toFixed(3)}s)
        largest backward step ${scrubDrop.worst.toFixed(4)}s${scrubDrop.at !== null ? ` at ${scrubDrop.at}ms` : ''}
`);

const failures = [];
if (introDrop.worst > TOLERANCE) failures.push('the intro rewinds as it stops');
if (scrubDrop.worst > TOLERANCE) failures.push('the scrub steps backwards');
if (Math.abs(drift) > TOLERANCE) failures.push('the camera drifts after the scroll stops');

console.log(failures.length ? `FAIL — ${failures.join('; ')}\n` : 'The camera only ever moves forwards.\n');
process.exit(failures.length ? 1 : 0);
