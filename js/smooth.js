/*
 * Smooth scrolling.
 *
 * Wheel input normally jumps the scroll position in steps, which makes the
 * scroll-driven cameras step with it. This eases the position toward where the
 * wheel is asking to be, so the cameras glide.
 *
 * Only the wheel is taken over — touch, keyboard, and the scrollbar stay
 * native, and any of them simply re-syncs the target. Off entirely under a
 * reduced-motion preference.
 */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var EASE = 0.115; // fraction of the remaining distance covered per frame
  var target = window.scrollY;
  var current = window.scrollY;
  var raf = null;

  function maxScroll() {
    return document.documentElement.scrollHeight - window.innerHeight;
  }

  function tick() {
    current += (target - current) * EASE;
    if (Math.abs(target - current) < 0.5) {
      current = target;
      raf = null;
    } else {
      raf = requestAnimationFrame(tick);
    }
    window.scrollTo(0, Math.round(current));
  }

  window.addEventListener(
    'wheel',
    function (event) {
      /* Pinch-zoom arrives as a ctrl-wheel — leave it to the browser. */
      if (event.ctrlKey) return;
      event.preventDefault();

      var delta = event.deltaY;
      if (event.deltaMode === 1) delta *= 16; // lines -> px
      else if (event.deltaMode === 2) delta *= window.innerHeight;

      target = Math.min(Math.max(target + delta, 0), maxScroll());
      if (raf === null) {
        current = window.scrollY;
        raf = requestAnimationFrame(tick);
      }
    },
    { passive: false }
  );

  /* Scrolling by any other means moves the page directly — follow it. */
  window.addEventListener(
    'scroll',
    function () {
      if (raf === null) target = window.scrollY;
    },
    { passive: true }
  );
})();
