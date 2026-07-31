import localFont from 'next/font/local';

/**
 * Mozilla Text — the design's primary family. Weights used by the hero:
 * 300 (headline), 500 (nav + header button), 700 (hero button).
 * Files come from `assets/fonts/`, synced to `public/assets/` before build.
 */
export const mozillaText = localFont({
  src: [
    { path: '../public/assets/fonts/MozillaText-ExtraLight.ttf', weight: '200', style: 'normal' },
    { path: '../public/assets/fonts/MozillaText-Light.ttf', weight: '300', style: 'normal' },
    { path: '../public/assets/fonts/MozillaText-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../public/assets/fonts/MozillaText-Medium.ttf', weight: '500', style: 'normal' },
    { path: '../public/assets/fonts/MozillaText-SemiBold.ttf', weight: '600', style: 'normal' },
    { path: '../public/assets/fonts/MozillaText-Bold.ttf', weight: '700', style: 'normal' },
  ],
  variable: '--font-mozilla-text',
  display: 'swap',
});
