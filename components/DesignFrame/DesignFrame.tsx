import styles from './DesignFrame.module.css';

/**
 * Holds the 1440 x 800 frame the design is drawn on, so every child can use the
 * exact px values from Figma.
 *
 * Below 1440px the frame is scaled down as a whole rather than re-laid out —
 * that keeps every padding and margin at its designed ratio. Once tablet and
 * mobile frames exist in Figma, they should replace the scaling with real
 * breakpoints. `--frame-scale` is set by the inline script in `app/layout.tsx`.
 */
export default function DesignFrame({
  nodeId,
  children,
}: {
  nodeId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.viewport}>
      <div className={styles.frame} data-node-id={nodeId} data-design-frame="">
        {children}
      </div>
    </div>
  );
}
