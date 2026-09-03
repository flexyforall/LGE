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

  var page = document.getElementById('page');
  var hero = document.getElementById('hero');
  var stage = page.parentNode;
  var PAGE_H = 1745;

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
    page.style.setProperty('--scale', s);
    stage.style.height = PAGE_H * s + 'px';
  }
  fit();
  addEventListener('resize', fit);

  if (still) {
    page.classList.add('no-motion');
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
            y: (r.top - base.top) / s,
            w: r.width / s
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
      el.style.visibility = '';
    }, total + 60);
    return total;
  }

  // ------------------------------------------------------------ cipher --
  // Every control's label is enciphered under the pointer and then deciphers
  // itself, left to right. Read off the reference recording: the label empties
  // at about 70ms, characters arrive from the left roughly every 23ms as
  // random glyphs, and from 400ms they lock to their real values in the same
  // order and at the same pace.
  //
  // The label is set in a proportional face, so a random glyph is rarely the
  // width of the one it stands in for. Each character is therefore given its
  // own cell at the position measured off the real text — the same Range
  // measuring the headings use — which is what keeps the line from jittering
  // and the arrow beside it from being nudged about.
  var CIPHER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ<>[]{}/=+-_$%^&*#@?~;:,.';
  var CIPHER_APPEAR = 70;    // before the first character shows
  var CIPHER_STEP = 23;      // between one character and the next, both ways
  var CIPHER_LOCK = 400;     // before the first character settles
  var CIPHER_TICK = 33;      // between one set of random glyphs and the next

  function glyph() {
    return CIPHER.charAt((Math.random() * CIPHER.length) | 0);
  }

  function cipher(el) {
    if (el.dataset.ciphering === '1') return;
    var parts = measure(el, 'chars');
    if (!parts.length) return;

    el.dataset.ciphering = '1';
    var layer = document.createElement('span');
    layer.className = 'sc-layer';
    layer.setAttribute('aria-hidden', 'true');

    var cells = parts.map(function (part) {
      var cell = document.createElement('span');
      cell.className = 'sc';
      cell.style.left = part.x + 'px';
      cell.style.top = part.y + 'px';
      cell.style.width = part.w + 'px';
      cell.style.color = part.colour;
      layer.appendChild(cell);
      return cell;
    });

    el.classList.add('is-ciphering');
    // Inline, so it beats the rule that gave the label its colour without an
    // !important that would also silence the cells.
    el.style.color = 'transparent';
    el.appendChild(layer);

    var t0 = performance.now();
    var painted = -1;
    var done = CIPHER_LOCK + parts.length * CIPHER_STEP;

    function frame(now) {
      var t = now - t0;
      var tick = (t / CIPHER_TICK) | 0;
      if (tick !== painted) {
        painted = tick;
        for (var i = 0; i < cells.length; i++) {
          var shown = t >= CIPHER_APPEAR + i * CIPHER_STEP;
          var locked = t >= CIPHER_LOCK + i * CIPHER_STEP;
          if (!shown) { cells[i].textContent = ''; continue; }
          cells[i].textContent = locked ? parts[i].text : glyph();
          // A character that has only just arrived is still faint.
          cells[i].style.opacity =
            locked || t >= CIPHER_APPEAR + i * CIPHER_STEP + CIPHER_TICK * 2 ? 1 : 0.45;
        }
      }
      if (t < done) return requestAnimationFrame(frame);
      layer.remove();
      el.classList.remove('is-ciphering');
      el.style.color = '';
      delete el.dataset.ciphering;
    }
    requestAnimationFrame(frame);
  }

  [].forEach.call(document.querySelectorAll('.btn-label'), function (label) {
    var control = label.closest('a, button') || label;
    control.addEventListener('pointerenter', function () { cipher(label); });
    control.addEventListener('focus', function () { cipher(label); });
  });

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
    page.classList.toggle('menu-open', open);
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

  // ------------------------------------------------------- on approach --
  // Headings below the fold wait, hidden, until they are scrolled to. The
  // measuring still works while they are hidden — visibility keeps the box.
  var waiting = [].slice.call(document.querySelectorAll('[data-reveal]'))
    .filter(function (el) { return !hero.contains(el); });
  waiting.forEach(function (el) { el.style.visibility = 'hidden'; });

  // The figures count up from nothing while their rows come in.
  var COUNT_MS = 1700;
  function countUp(el, delay) {
    var to = Number(el.dataset.countTo);
    if (!isFinite(to)) return;
    var pre = el.dataset.prefix || '';
    var suf = el.dataset.suffix || '';
    el.textContent = pre + '0' + suf;
    var t0 = null;
    function frame(now) {
      if (t0 === null) t0 = now;
      var t = (now - t0 - delay) / COUNT_MS;
      if (t < 0) return requestAnimationFrame(frame);
      if (t >= 1) { el.textContent = pre + to + suf; return; }
      // Same shape as the easing everything else uses: most of the distance
      // early, then a long settle.
      var eased = 1 - Math.pow(1 - t, 4);
      el.textContent = pre + Math.round(to * eased) + suf;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // The column rolls: every row moves up one slot, the four the frame draws
  // dimming as they climb, and the one that leaves the top is put back at the
  // bottom while it is out of the clip. It stops under the pointer, which is
  // what makes the row hover usable.
  var ROLL_SLOTS = 8;
  var ROLL_STEP_MS = 950;
  var ROLL_HOLD_MS = 2600;
  var ROLL_OPACITY = [1, 1, 0.7, 0.2];   // by visible slot, read off the frame

  var proof = document.getElementById('proof');
  var stats = document.getElementById('proofStats');
  var statRows = stats ? [].slice.call(stats.querySelectorAll('.stat')) : [];
  var rollTimer = null;

  function slotOpacity(slot) {
    return slot >= 0 && slot < ROLL_OPACITY.length ? ROLL_OPACITY[slot] : 0;
  }

  function rollStep() {
    statRows.forEach(function (row) {
      var slot = Number(row.style.getPropertyValue('--slot')) - 1;
      row.style.setProperty('--slot', slot);
      row.style.setProperty('--rest', slotOpacity(slot));
      if (slot !== -1) return;
      // Above the clip now, so it can be put back at the bottom unseen.
      setTimeout(function () {
        row.classList.add('is-jumping');
        row.style.setProperty('--slot', ROLL_SLOTS - 1);
        void row.offsetWidth;
        row.classList.remove('is-jumping');
      }, ROLL_STEP_MS + 40);
    });
  }

  function rollPlay() {
    if (rollTimer || !statRows.length) return;
    rollTimer = setInterval(rollStep, ROLL_HOLD_MS + ROLL_STEP_MS);
  }
  function rollPause() {
    clearInterval(rollTimer);
    rollTimer = null;
  }

  if (stats) {
    stats.addEventListener('pointerenter', rollPause);
    stats.addEventListener('pointerleave', function () {
      if (proof.classList.contains('is-in') && !document.hidden) rollPlay();
    });
  }

  function enterProof() {
    proof.classList.add('is-in', 'is-entering');
    proof.querySelectorAll('[data-count-to]').forEach(function (el, i) {
      // The rows are there twice over, so a copy counts with its original.
      countUp(el, (i % 4) * 120);
    });
    // Once it is in, the delays have to go or the hover inherits them.
    setTimeout(function () {
      proof.classList.remove('is-entering');
      rollPlay();
    }, 1500);
  }

  if ('IntersectionObserver' in window) {
    var seen = new WeakSet();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting || seen.has(e.target)) return;
        seen.add(e.target);
        io.unobserve(e.target);
        if (e.target === proof) enterProof();
        else reveal(e.target, 0);
      });
    }, { threshold: 0.2 });
    waiting.forEach(function (el) { io.observe(el); });
    if (proof) io.observe(proof);
  } else {
    waiting.forEach(function (el) { el.style.visibility = ''; });
    if (proof) enterProof();
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
      if (document.hidden) { pause(); rollPause(); return; }
      if (!hero.classList.contains('is-intro')) play();
      if (proof && proof.classList.contains('is-in')) rollPlay();
    });
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start);
    setTimeout(start, 3000);   // in case the faces never resolve
  } else {
    start();
  }
})();
