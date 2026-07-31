import type { Metadata } from 'next';
import { mozillaText } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Core Space — The Enabling Technology Behind Orbital Data Centers',
  description:
    'Plasma power and propulsion, connected by high-bandwidth laser links.',
};

/**
 * Sets `--frame-scale` before first paint so the 1440px design frame fits
 * narrower viewports without a flash of overflowing content. Kept as a CSS
 * variable rather than React state so there is nothing to hydrate.
 */
const FRAME_SCALE_SCRIPT = `(function(){
  var set=function(){document.documentElement.style.setProperty('--frame-scale',Math.min(1,window.innerWidth/1440));};
  set();addEventListener('resize',set);
})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={mozillaText.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: FRAME_SCALE_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
