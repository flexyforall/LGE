// Lead Generation Experts — hero.
//
// Four things move: the strip along the top, the run of cards along the
// bottom, the bar in the middle when it is clicked, and each heading the
// first time it is seen. The strip is CSS on its own; the rest is here.
//
// Everything is written so that standing still means "exactly the Figma
// frame". `?motion=off` and prefers-reduced-motion both take that state and
// hold it.

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
  function scale() {
    return document.documentElement.clientWidth / 1440;
  }
  function fit() {
    var s = scale();
    hero.style.setProperty('--scale', s);
    stage.style.height = 859 * s + 'px';
  }
  fit();
  addEventListener('resize', fit);

  if (still) {
    hero.classList.add('no-motion');
    return;
  }

  // ---------------------------------------------------- heading reveal --
  // Headings arrive a piece at a time, each piece lifting into place out of a
  // soft blur.
  //
  // Splitting a heading into spans would break kerning across every boundary,
  // and the line would stop being the width the frame says it is. So the real
  // text is never touched: its pieces are *measured* with a Range while it is
  // still whole, a copy is laid over the top to do the moving, and the copy is
  // thrown away at the end. What is left standing is the untouched heading.
  //
  // data-reveal picks the grain: "chars" (the default), "words", or "lines"
  // for the plain masked line reveal, which is CSS and needs nothing here.
  var GRAIN_STEP = { chars: 18, words: 55 };
  var PIECE_MS = 950;

  function measure(el, grain) {
    var s = scale();
    var base = el.getBoundingClientRect();
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var out = [];
    var node;
    while ((node = walker.nextNode())) {
      var text = node.nodeValue;
      var colour = getComputedStyle(node.parentElement).color;
      var i = 0;
      while (i < text.length) {
        if (/\s/.test(text[i])) { i++; continue; }
        var end = i + 1;
        if (grain === 'words') {
          while (end < text.length && !/\s/.test(text[end])) end++;
        }
        var range = document.createRange();
        range.setStart(node, i);
        range.setEnd(node, end);
        var r = range.getBoundingClientRect();
        if (r.width || r.height) {
          out.push({
            text: text.slice(i, end),
            colour: colour,
            x: (r.left - base.left) / s,
            y: (r.top - base.top) / s
          });
        }
        i = end;
      }
    }
    return out;
  }

  function reveal(el, startMs) {
    if (!el) return 0;
    var grain = el.dataset.reveal || 'chars';
    if (grain === 'lines') return 0;

    var parts = measure(el, grain);
    if (!parts.length) return 0;

    var step = GRAIN_STEP[grain] || GRAIN_STEP.chars;
    var layer = document.createElement('span');
    layer.className = 'rv-layer';
    layer.setAttribute('aria-hidden', 'true');
    parts.forEach(function (part, i) {
      var piece = document.createElement('span');
      piece.className = 'rv';
      piece.textContent = part.text;
      piece.style.left = part.x + 'px';
      piece.style.top = part.y + 'px';
      piece.style.color = part.colour;
      piece.style.animationDelay = startMs + i * step + 'ms';
      layer.appendChild(piece);
    });

    el.classList.add('is-revealing');
    el.appendChild(layer);

    var total = startMs + (parts.length - 1) * step + PIECE_MS;
    setTimeout(function () {
      layer.remove();
      el.classList.remove('is-revealing');
    }, total + 60);
    return total;
  }

  // -------------------------------------------------------------- menu --
  var menu = document.getElementById('menu');
  var toggle = document.getElementById('menuToggle');
  var panel = document.getElementById('menuPanel');
  var panelSeen = false;

  function setMenu(open) {
    // The bar has to stay above the headline until it has finished shrinking,
    // or the last of the panel is drawn behind it on the way down.
    if (open) menu.classList.remove('is-closing');
    else menu.classList.add('is-closing');
    menu.classList.toggle('is-open', open);
    hero.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) panel.removeAttribute('inert');
    else panel.setAttribute('inert', '');

    if (open && !panelSeen) {
      panelSeen = true;
      // Late enough that the panel has opened out to its full width, or the
      // pieces would be measured against a box still on its way there.
      setTimeout(function () {
        panel.querySelectorAll('[data-reveal]').forEach(function (h) { reveal(h, 0); });
      }, 620);
    }
  }

  menu.addEventListener('transitionend', function (e) {
    if (e.target === menu && e.propertyName === 'width' && !menu.classList.contains('is-open')) {
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

  // ------------------------------------------------------------- intro --
  // Nothing is measured until the faces are in: under font-display: block the
  // heading has no glyphs to measure a moment earlier, and every piece would
  // land in the wrong place.
  var started = false;
  function start() {
    // The fallback timer fires whether or not the faces resolved, and by then
    // the intro class is already off again — so the latch is its own flag.
    if (started) return;
    started = true;
    hero.classList.add('is-intro');

    var end = Math.max(2000, reveal(document.querySelector('.headline'), 300) + 60);
    setTimeout(function () { hero.classList.remove('is-intro'); }, end);
    setTimeout(function () { if (!document.hidden) play(); }, end + 600);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) pause();
      else if (!hero.classList.contains('is-intro')) play();
    });
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start);
    setTimeout(start, 3000);   // in case the faces never resolve
  } else {
    start();
  }
})();
