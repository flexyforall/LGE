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

/*
 * 2. The scrub: ramp the scroll to the end, then hold.
 *
 * It must not step backwards, and it must come to rest on the frame the scroll
 * is asking for. Settling forwards after the scrolling stops is expected — the
 * last seek is still in flight and lands a moment later — so what is checked is
 * where it ends up, not that it stops moving instantly.
 */
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
        else resolve({ samples: out, duration: video.duration });
      })();
    })
);

await browser.close();

const FRAME = 1 / 24;
const introDrop = worstDrop(intro);
const scrubDrop = worstDrop(scrub.samples);
const atScrollEnd = scrub.samples.find((s) => s[0] >= 2000)[1];
const afterHolding = scrub.samples[scrub.samples.length - 1][1];
/*
 * Scrolled all the way, so it is asked for `duration` — but the frame holding
 * that moment starts a frame earlier, so landing up to ~1 frame short is the
 * correct outcome, not a miss. Anything beyond that is drift.
 */
const expected = scrub.duration;
const offTarget = Math.abs(afterHolding - expected);
const ALLOWED_OFF_TARGET = FRAME * 1.5;

console.log(`
intro   settled at ${intro[intro.length - 1][1].toFixed(3)}s
        largest backward step ${introDrop.worst.toFixed(4)}s${introDrop.at !== null ? ` at ${introDrop.at}ms` : ''}

scrub   ${atScrollEnd.toFixed(3)}s when the scroll stopped, settled at ${afterHolding.toFixed(3)}s
        asked for ${expected.toFixed(3)}s — off by ${offTarget.toFixed(3)}s (${(offTarget / FRAME).toFixed(1)} frames)
        largest backward step ${scrubDrop.worst.toFixed(4)}s${scrubDrop.at !== null ? ` at ${scrubDrop.at}ms` : ''}
`);

const failures = [];
if (introDrop.worst > TOLERANCE) failures.push('the intro rewinds as it stops');
if (scrubDrop.worst > TOLERANCE) failures.push('the scrub steps backwards');
if (offTarget > ALLOWED_OFF_TARGET)
  failures.push('the camera rests off the frame the scroll asked for');

console.log(
  failures.length
    ? `FAIL — ${failures.join('; ')}\n`
    : 'The camera only ever moves forwards, and rests where the scroll asks.\n'
);
process.exit(failures.length ? 1 : 0);
