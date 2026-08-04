/**
 * Guards against a camera stepping backwards.
 *
 * A move should only ever run forwards, or backwards because the scroll went
 * backwards — never on its own. Two things have caused it to:
 *
 *   - stopping playback on `timeupdate`, which fires about four times a second
 *     and so lets a clip overshoot the mark before being rewound onto it
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
const FRAME = 1 / 24;
const ALLOWED_OFF_TARGET = FRAME * 1.5;

/*
 * Every camera here must come to rest exactly where the scroll asks: the
 * hero's transition and the tunnel are both scrubbed from first frame to last.
 */
const SCENES = [
  { name: 'hero', video: '[data-hero-video="2"]', restsOnTarget: true },
  { name: 'role', video: '[data-role-video]', restsOnTarget: true },
];

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
await page.goto(pathToFileURL(path.join(root, 'index.html')).href, {
  waitUntil: 'load',
});

/*
 * Largest backward step in a run of currentTime samples. The hero idles as a
 * loop, so with `allowWraps` a drop that lands back near 0 is a loop wrap and
 * not a rewind — only partial jumps backwards count.
 */
function worstDrop(samples, allowWraps) {
  let worst = 0;
  let at = null;
  let wraps = 0;
  for (let i = 1; i < samples.length; i++) {
    const drop = samples[i - 1][1] - samples[i][1];
    if (drop <= 0) continue;
    if (allowWraps && samples[i][1] < 0.3) {
      wraps++;
      continue;
    }
    if (drop > worst) {
      worst = drop;
      at = samples[i][0];
    }
  }
  return { worst, at, wraps };
}

const failures = [];

/*
 * 1. The hero background: a 12s clip on loop. Wraps back to 0 are the loop
 *    working; anything else backwards is a rewind. It must actually cycle.
 */
const intro = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const video = document.querySelector('[data-hero-video="1"]');
      const a = [];
      const t0 = performance.now();
      (function tick() {
        const elapsed = performance.now() - t0;
        a.push([Math.round(elapsed), video.currentTime]);
        if (elapsed < 16500) requestAnimationFrame(tick);
        else resolve({ a });
      })();
    })
);

const heroDrop = worstDrop(intro.a, true);
console.log(`
idle    hero clip wrapped ${heroDrop.wraps}x, largest non-wrap backward step ${heroDrop.worst.toFixed(4)}s`);

if (heroDrop.worst > TOLERANCE) failures.push('the hero clip rewinds mid-loop');
if (heroDrop.wraps === 0) failures.push('the hero loop never cycles');

/*
 * 2. Each scrub: ramp the scroll across the section, then hold.
 *
 * It must not step backwards, and it must come to rest on the frame the scroll
 * is asking for. Settling forwards after the scrolling stops is expected — the
 * last seek is still in flight and lands a moment later — so what is checked is
 * where it ends up, not that it stops moving instantly. Asking for the very end
 * lands on the last frame, which starts up to a frame earlier.
 */
for (const scene of SCENES) {
  const run = await page.evaluate(
    ({ name, video }) =>
      new Promise((resolve) => {
        const el = document.querySelector(video);
        const section = document.querySelector(`[data-scene="${name}"]`);
        const top = section.getBoundingClientRect().top + window.scrollY;
        const travel = section.offsetHeight - window.innerHeight;
        const out = [];
        const t0 = performance.now();
        let landed = false;
        (function tick() {
          const elapsed = performance.now() - t0;
          if (elapsed < 2000) {
            window.scrollTo(0, Math.round(top + travel * (elapsed / 2000)));
          } else if (!landed) {
            /*
             * Under load the frame clock skips, so the ramp's last step can
             * stop short of the section's end. Real scrolling has no such
             * quantization — finish on the exact end before judging where
             * the camera rests.
             */
            landed = true;
            window.scrollTo(0, Math.round(top + travel));
          }
          out.push([Math.round(elapsed), el.currentTime]);
          if (elapsed < 3200) requestAnimationFrame(tick);
          else resolve({ samples: out, end: el.duration || 0 });
        })();
      }),
    scene
  );

  const drop = worstDrop(run.samples, !scene.restsOnTarget);
  const atScrollEnd = run.samples.find((s) => s[0] >= 2000)[1];
  const settled = run.samples[run.samples.length - 1][1];
  const offTarget = Math.abs(settled - run.end);

  console.log(`
${scene.name.padEnd(7)} ${atScrollEnd.toFixed(3)}s when the scroll stopped, settled at ${settled.toFixed(3)}s
        largest backward step ${drop.worst.toFixed(4)}s${drop.at !== null ? ` at ${drop.at}ms` : ''}`);

  if (drop.worst > TOLERANCE) failures.push(`the ${scene.name} scrub steps backwards`);
  if (scene.restsOnTarget) {
    console.log(`        asked for ${run.end.toFixed(3)}s — off by ${offTarget.toFixed(3)}s (${(offTarget / FRAME).toFixed(1)} frames)`);
    if (offTarget > ALLOWED_OFF_TARGET) {
      failures.push(`the ${scene.name} camera rests off the frame the scroll asked for`);
    }
  }
}

/*
 * At the very end of the role scroll the next chapter's clip owns the frame.
 * It is scrubbed like everything else, so what proves the hand-off is that the
 * scroll has carried it off its first frame — and that nothing is playing on
 * its own anywhere.
 */
const handoff = await page.evaluate(() => {
  const nextVideo = document.querySelector('[data-role-next-video]');
  const exiting = document.querySelector('[data-role-video]');
  const idle = document.querySelector('[data-hero-video="1"]');
  return {
    nextAt: nextVideo ? nextVideo.currentTime : 0,
    running: [...document.querySelectorAll('video')]
      .filter((v) => !v.paused && v !== idle)
      .map((v) => v.dataset.heroVideo || v.className),
  };
});
console.log(`
handoff next clip at ${handoff.nextAt.toFixed(2)}s; cameras playing on their own: ${handoff.running.length}`);
if (handoff.nextAt <= 0) failures.push('the scroll never moved the incoming container clip');
if (handoff.running.length) failures.push(`a camera is running on its own (${handoff.running.join(', ')})`);

await browser.close();

console.log(
  failures.length
    ? `\nFAIL — ${failures.join('; ')}\n`
    : '\nEvery camera only ever moves forwards, and rests where the scroll asks.\n'
);
process.exit(failures.length ? 1 : 0);
