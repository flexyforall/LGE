/**
 * Copies design exports from `assets/` — the folder Figma exports get uploaded
 * to — into `public/assets/`, where Next.js can serve them.
 *
 * Runs automatically before `dev` and `build`, so uploading a new export and
 * restarting is all that's needed. `public/assets/` is generated and gitignored;
 * `assets/` stays the source of truth.
 */
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'assets');
const dest = path.join(root, 'public', 'assets');

await rm(dest, { recursive: true, force: true });
await mkdir(path.dirname(dest), { recursive: true });
await cp(src, dest, {
  recursive: true,
  filter: (entry) => !entry.endsWith('.gitkeep') && !entry.endsWith('README.md'),
});

await repairLogoViewBox(path.join(dest, 'logos', 'logo.svg'));

/**
 * The `logo.svg` export carries a viewBox that is shorter than the artwork it
 * contains, so the mark renders cropped and squashed. The `<mask>` element
 * records the true bounds, so we restore the viewBox from it.
 *
 * Harmless once Figma exports a correct viewBox — the bounds will already
 * agree and nothing is rewritten.
 */
async function repairLogoViewBox(file) {
  let svg;
  try {
    svg = await readFile(file, 'utf8');
  } catch {
    console.warn('[sync-assets] no logos/logo.svg to check');
    return;
  }

  const mask = svg.match(
    /<mask[^>]*\sx="(-?[\d.]+)"\sy="(-?[\d.]+)"\swidth="([\d.]+)"\sheight="([\d.]+)"/
  );
  if (!mask) return;

  const [, x, y, width, height] = mask;
  const viewBox = `${x} ${y} ${width} ${height}`;
  const current = svg.match(/<svg[^>]*\sviewBox="([^"]+)"/);
  if (current?.[1] === viewBox) return;

  await writeFile(
    file,
    svg.replace(
      /(<svg[^>]*?)\swidth="[\d.]+"\sheight="[\d.]+"\sviewBox="[^"]+"/,
      `$1 width="${width}" height="${height}" viewBox="${viewBox}"`
    )
  );
  console.log(`[sync-assets] logo.svg viewBox ${current?.[1]} -> ${viewBox}`);
}
