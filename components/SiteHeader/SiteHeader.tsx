import styles from './SiteHeader.module.css';

const NAV_LINKS = [
  { label: 'TECHNOLOGY', href: '/technology', nodeId: '183:3200' },
  { label: 'COMPANY', href: '/company', nodeId: '183:3201' },
  { label: 'NEWSROOM', href: '/newsroom', nodeId: '183:3202' },
  { label: 'FOR INVESTORS', href: '/investors', nodeId: '183:3203' },
  { label: 'CONTACT', href: '/contact', nodeId: '183:3204' },
];

/**
 * Figma: "Frame 2147227336" (183:3224) — 1360 x 64, inset 40/20 in the hero frame.
 *
 * `data-node-id` mirrors the Figma node each element came from. `measure.mjs`
 * uses them to diff the rendered boxes against the design.
 */
export default function SiteHeader() {
  return (
    <header className={styles.header} data-node-id="183:3224">
      <div className={styles.leadingGroup} data-node-id="183:3193">
        <a
          className={styles.logo}
          href="/"
          aria-label="Core Space — home"
          data-node-id="183:3194"
        >
          <img src="/assets/logos/logo.svg" alt="" width={34} height={34} />
        </a>

        <nav className={styles.nav} data-node-id="183:3199">
          {NAV_LINKS.map(({ label, href, nodeId }) => (
            <a
              key={label}
              className={styles.navLink}
              href={href}
              data-node-id={nodeId}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>

      <a className={styles.partner} href="/partner" data-node-id="183:3190">
        <img
          className={styles.partnerShape}
          src="/assets/icons/btn-become-a-partner.svg"
          alt=""
          width={140}
          height={34}
          data-node-id="183:3191"
        />
        <span className={styles.partnerLabel} data-node-id="183:3192">
          BECOME A PARTNER
        </span>
      </a>
    </header>
  );
}
