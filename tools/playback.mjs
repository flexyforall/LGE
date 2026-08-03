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

const SCENES = [
  { name: 'hero', video: '[data-hero-video="2"]' },
  { name: 'role', video: '[data-role-video]' },
];

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
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

const failures = [];

/*
 * 1. The hero intro: video 1 runs out, video 2 takes over for its couple of
 *    seconds, then both stop. Neither must snap back as it settles.
 */
const intro = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const first = document.querySelector('[data-hero-video="1"]');
      const second = document.querySelector('[data-hero-video="2"]');
      const a = [];
      const b = [];
      const t0 = performance.now();
      (function tick() {
        const elapsed = performance.now() - t0;
        a.push([Math.round(elapsed), first.currentTime]);
        b.push([Math.round(elapsed), second.currentTime]);
        if (elapsed < 13000) requestAnimationFrame(tick);
        else resolve({ a, b });
      })();
    })
);

const firstDrop = worstDrop(intro.a);
const secondDrop = worstDrop(intro.b);
console.log(`
intro   video 1 settled at ${intro.a[intro.a.length - 1][1].toFixed(3)}s, largest backward step ${firstDrop.worst.toFixed(4)}s
        video 2 settled at ${intro.b[intro.b.length - 1][1].toFixed(3)}s, largest backward step ${secondDrop.worst.toFixed(4)}s`);

if (firstDrop.worst > TOLERANCE) failures.push('video 1 rewinds as it stops');
if (secondDrop.worst > TOLERANCE) failures.push('video 2 rewinds as it stops');

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
        (function tick() {
          const elapsed = performance.now() - t0;
          if (elapsed < 2000) {
            window.scrollTo(0, Math.round(top + travel * (elapsed / 2000)));
          }
          out.push([Math.round(elapsed), el.currentTime]);
          if (elapsed < 3200) requestAnimationFrame(tick);
          else resolve({ samples: out, end: +section.dataset.cameraEnd });
        })();
      }),
    scene
  );

  const drop = worstDrop(run.samples);
  const atScrollEnd = run.samples.find((s) => s[0] >= 2000)[1];
  const settled = run.samples[run.samples.length - 1][1];
  const offTarget = Math.abs(settled - run.end);

  console.log(`
${scene.name.padEnd(7)} ${atScrollEnd.toFixed(3)}s when the scroll stopped, settled at ${settled.toFixed(3)}s
        asked for ${run.end.toFixed(3)}s — off by ${offTarget.toFixed(3)}s (${(offTarget / FRAME).toFixed(1)} frames)
        largest backward step ${drop.worst.toFixed(4)}s${drop.at !== null ? ` at ${drop.at}ms` : ''}`);

  if (drop.worst > TOLERANCE) failures.push(`the ${scene.name} scrub steps backwards`);
  if (offTarget > ALLOWED_OFF_TARGET) {
    failures.push(`the ${scene.name} camera rests off the frame the scroll asked for`);
  }
}

await browser.close();

console.log(
  failures.length
    ? `\nFAIL — ${failures.join('; ')}\n`
    : '\nEvery camera only ever moves forwards, and rests where the scroll asks.\n'
);
process.exit(failures.length ? 1 : 0);
