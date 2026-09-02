// Lead Generation Experts — hero.
//
// Three things move: the strip along the top, the run of cards along the
// bottom, and the bar in the middle when it is clicked. The strip is CSS on
// its own; the other two are here.
//
// Everything is written so that standing still means "exactly the Figma frame".
// `?motion=off` and prefers-reduced-motion both take that state and hold it.

(function () {
  'use strict';

  var hero = document.getElementById('hero');
  var stage = hero.parentNode;

  var still =
    new URLSearchParams(location.search).get('motion') === 'off' ||
    matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ------------------------------------------------------------- width --
  // The frame is 1440 wide. Scale it to whatever the window is — up as well
  // as down — so the page always reaches both edges and nothing is cut off.
  function fit() {
    var scale = document.documentElement.clientWidth / 1440;
    hero.style.setProperty('--scale', scale);
    stage.style.height = 859 * scale + 'px';
  }
  fit();
  addEventListener('resize', fit);

  if (still) {
    hero.classList.add('no-motion');
    return;
  }

  // ------------------------------------------------------------- intro --
  // The class carries every entrance animation; it comes off once they have
  // all finished so nothing is left holding a transform.
  hero.classList.add('is-intro');
  var INTRO_MS = 2000;
  setTimeout(function () { hero.classList.remove('is-intro'); }, INTRO_MS);

  // -------------------------------------------------------------- menu --
  var menu = document.getElementById('menu');
  var toggle = document.getElementById('menuToggle');
  var panel = document.getElementById('menuPanel');

  function measurePanel() {
    menu.style.setProperty('--menu-open-height', 64 + panel.offsetHeight + 'px');
  }
  measurePanel();
  addEventListener('resize', measurePanel);

  function setMenu(open) {
    // The bar has to stay above the headline until it has finished shrinking,
    // or the last of the panel is drawn behind it on the way down.
    if (open) menu.classList.remove('is-closing');
    else menu.classList.add('is-closing');
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) panel.removeAttribute('inert');
    else panel.setAttribute('inert', '');
  }

  menu.addEventListener('transitionend', function (e) {
    if (e.target === menu && e.propertyName === 'height' && !menu.classList.contains('is-open')) {
      menu.classList.remove('is-closing');
    }
  });

  toggle.addEventListener('click', function () {
    setMenu(!menu.classList.contains('is-open'));
  });

  addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) {
      setMenu(false);
      toggle.focus();
    }
  });

  document.addEventListener('pointerdown', function (e) {
    if (menu.classList.contains('is-open') && !menu.contains(e.target)) setMenu(false);
  });

  // ----------------------------------------------------------- carousel --
  // Slots 2, 3 and 4 are the three the frame draws; 0, 1 and 5 sit off the
  // page. Every step shifts each card one slot to the left. The card leaving
  // slot 0 is put back at slot 5 with the transition switched off, which is
  // invisible because both ends are off screen.
  var SLOTS = 6;
  var HOLD_MS = 2600;
  var STEP_MS = 950;

  var cards = [].slice.call(document.querySelectorAll('.card'));
  var timer = null;

  function step() {
    cards.forEach(function (card) {
      var slot = (Number(card.dataset.slot) + SLOTS - 1) % SLOTS;
      if (slot === SLOTS - 1) {
        // Jumped the gap rather than crossed the page.
        card.classList.add('is-jumping');
        card.dataset.slot = slot;
        void card.offsetWidth;
        card.classList.remove('is-jumping');
      } else {
        card.dataset.slot = slot;
      }
    });
  }

  function play() {
    if (timer) return;
    timer = setInterval(step, HOLD_MS + STEP_MS);
  }
  function pause() {
    clearInterval(timer);
    timer = null;
  }

  // Nothing runs while the tab is in the background, and the run waits for
  // the entrance to finish before it takes over.
  setTimeout(function () { if (!document.hidden) play(); }, INTRO_MS + 600);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause();
    else if (!hero.classList.contains('is-intro')) play();
  });
})();
