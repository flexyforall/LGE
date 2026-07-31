import DesignFrame from '@/components/DesignFrame/DesignFrame';
import SiteHeader from '@/components/SiteHeader/SiteHeader';
import styles from './Hero.module.css';

/**
 * Figma: "Hero" (183:3165) — 1440 x 800.
 *
 * `data-node-id` mirrors the Figma node each element came from. `measure.mjs`
 * uses them to diff the rendered boxes against the design.
 */
export default function Hero() {
  return (
    <DesignFrame nodeId="183:3165">
      <SiteHeader />

      <div className={styles.content} data-node-id="183:3223">
        <div className={styles.copy} data-node-id="183:3216">
          <h1 className={styles.headline} data-node-id="183:3207">
            The Enabling Technology Behind Orbital Data Centers
          </h1>
          <p className={styles.subhead} data-node-id="183:3214">
            Plasma power and propulsion, connected by high-bandwidth laser links
          </p>
        </div>

        <div className={styles.actions} data-node-id="183:3217">
          <a
            className={styles.exploreButton}
            href="/technology"
            data-node-id="183:3218"
          >
            <span className={styles.exploreInner} data-node-id="183:3219">
              <img
                className={styles.exploreShape}
                src="/assets/icons/btn-explore-technology.svg"
                alt=""
                width={175}
                height={50}
                data-node-id="183:3246"
              />
              <span className={styles.exploreLabel} data-node-id="183:3221">
                EXPLORE TECHNOLOGY
              </span>
            </span>
          </a>
        </div>
      </div>
    </DesignFrame>
  );
}
