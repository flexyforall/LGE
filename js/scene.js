/*
 * Scene choreography.
 *
 * Two pinned sections, each taller than the window. The surplus height is the
 * scroll their cameras are mapped onto.
 *
 *   Hero    video 1 loops as a background. Once the scroll has cleared the
 *           copy the frame crosses to video 2 — the transition — which never
 *           plays on its own: the scroll drives it to its last frame, where
 *           the light has filled the screen and the section below takes over.
 *           The tag line rotates on its own clock; the partner row runs on its
 *           own in CSS.
 *
 *   Role    video 3 answers to the scroll from its first frame, and so does
 *           the clip in the container that follows it. The same scroll writes
 *           the statement on and moves the containers.
 *
 * Nothing but the hero's idle loop and the partner row ever plays on its own.
 */
(function () {
  'use strict';

  var COPY_FADE = 0.3; // fraction of the hero scroll the copy fades over
  var COPY_RISE = 48; // px the copy drifts up as it goes
  /*
   * The hero clip is one continuous shot — the flight, and the transition that
   * follows it — so it idles on a loop that runs a couple of seconds into the
   * transition rather than stopping at the join. Whatever frame the loop is on
   * when the scroll arrives is where the scroll picks it up, which is what
   * keeps it feeling like one camera moving rather than a cut to another shot.
   */
  var HERO_LOOP_END = 14; // seconds — the flight plus two of the transition
  var HERO_SCRUB_FROM = 0.02; // where the scroll takes the clip off its loop...
  var HERO_SCRUB_BY = 0.92; // ...and has carried it to the last frame by here
  var FLASH_IN_FROM = 0.86; // the sheet closes whatever white the clip left short
  var TAG_LINES = [
    'WELCOME TO CORE SPACE',
    'POWER GENERATION & TRANSMISSION',
    'HIGH-BANDWIDTH LASER LINKS',
    'PLASMA ELECTRIC PROPULSION',
    'ENGINEERED FOR VLEO',
  ];
  var TAG_PERIOD = 2800; // ms between rotations
  var FLASH_FADE = 0.16; // fraction of the role scroll the white flash lifts over
  /*
   * Each passage writes itself on and rubs itself out over its own stretch, and
   * the stretches do not overlap — so the first is gone before the second
   * starts and they never share the frame.
   */
  var TEXT_SPANS = [
    [0.12, 0.34],
    [0.38, 0.6],
  ];
  /*
   * How many characters stay lit behind the head before they start dissolving.
   * The whole effect is this one number: raise it past the statement's length
   * and nothing ever dissolves, leaving a plain reveal.
   */
  var TEXT_TRAIL = 26;
  /* The cards section is not pinned; these are fractions of the window. */
  var CARDS_FILL_FROM = 0.8; // the heading starts filling here...
  var CARDS_FILL_BY = 0.34; // ...and is fully read by here
  var CARDS_RISE_FROM = 0.92; // a card rises as its top reaches here
  var CARDS_RISE_BY = 0.8;
  var SHRINK_FROM = 0.64; // once read, the shot starts packing itself...
  var SHRINK_BY = 0.76; // ...into section 3's container, where it plays free
  var FOLD_FROM = 0.84; // and then folds shut...
  var FOLD_BY = 0.98; // ...until there is nothing left of it
  var SHRINK_W = 478; // the container, from Figma 242:2689
  var SHRINK_H = 626;
  var SEEK_EPSILON = 0.008; // ignore seeks smaller than a third of a frame

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ *
   * Shared plumbing
   * ------------------------------------------------------------------ */

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  /**
   * How far a block that is not pinned has travelled up the window, 0 to 1 —
   * measured from its top passing `from` to its top passing `to`, both as a
   * fraction of the window's height.
   */
  function progressUp(el, from, to) {
    var h = window.innerHeight;
    var top = el.getBoundingClientRect().top;
    return clamp01((h * from - top) / (h * from - h * to));
  }

  /** How far through a pinned section the scroll has travelled, 0 to 1. */
  function progressOf(scene) {
    var travel = scene.offsetHeight - window.innerHeight;
    if (travel <= 0) return 0;
    return clamp01(-scene.getBoundingClientRect().top / travel);
  }

  /*
   * Seeks are asynchronous, and issuing a new one while the last is still in
   * flight makes the browser drop frames. So only the most recent request is
   * kept, it goes out as soon as the video is free, and it re-fires on `seeked`
   * so the final position lands even after the scrolling has stopped.
   */
  function seeker(video) {
    var pending = null;

    function flush() {
      if (pending === null || video.seeking) return;
      var t = pending;
      pending = null;
      if (Math.abs(video.currentTime - t) > SEEK_EPSILON) video.currentTime = t;
    }

    video.addEventListener('seeked', flush);
    return function (t) {
      pending = t;
      flush();
    };
  }

  var painters = [];
  var queued = false;

  function paint() {
    queued = false;
    for (var i = 0; i < painters.length; i++) painters[i]();
  }

  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(paint);
  }

  function register(fn) {
    painters.push(fn);
    fn();
  }

  /* ------------------------------------------------------------------ *
   * Hero
   * ------------------------------------------------------------------ */

  /*
   * The rotating tag. One line lives in the box at a time; on each tick the
   * next line tips in from below while the old one tips up and away, and the
   * box's width glides to the new line's width — which is what slides the
   * right-hand square while the left one holds the 56px column, each keeping
   * its 40px of air.
   */
  function setUpTag(scene) {
    var box = scene.querySelector('[data-hero-tag]');
    if (!box) return;

    var current = box.querySelector('.hero__tagLine');
    var frame = box.closest('.frame');
    var idx = 0;

    /*
     * Below --frame-min-width the whole frame is drawn scaled, so a measured
     * rect comes back in screen pixels while the width being set is read in
     * the frame's own. Dividing by the scale puts them in the same units —
     * without it the box comes out short and clips the line.
     */
    function scaleOf() {
      if (!frame || !frame.offsetWidth) return 1;
      return frame.getBoundingClientRect().width / frame.offsetWidth || 1;
    }

    function widthOf(text) {
      var probe = document.createElement('span');
      probe.className = 'hero__tagLine';
      probe.style.visibility = 'hidden';
      probe.textContent = text;
      box.appendChild(probe);
      var w = probe.getBoundingClientRect().width;
      probe.remove();
      return w / scaleOf();
    }

    function fit() {
      box.style.width = widthOf(TAG_LINES[idx]) + 'px';
    }

    /* Fonts land late and change the measurement — fit again when they do. */
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    window.addEventListener('resize', fit);

    if (reduced) return;

    setInterval(function () {
      idx = (idx + 1) % TAG_LINES.length;

      var next = document.createElement('span');
      next.className = 'hero__tagLine is-in';
      next.textContent = TAG_LINES[idx];
      box.appendChild(next);
      fit();

      var old = current;
      current = next;

      /* Two frames so the entering transform is committed before it animates. */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          next.classList.remove('is-in');
          if (old) old.classList.add('is-out');
        });
      });
      setTimeout(function () {
        if (old) old.remove();
      }, 650);
    }, TAG_PERIOD);
  }

  function setUpHero() {
    var scene = document.querySelector('[data-scene="hero"]');
    if (!scene) return;

    var video = scene.querySelector('[data-hero-video]');
    var copy = scene.querySelector('[data-scene-copy]');
    var flash = scene.querySelector('[data-hero-flash]');
    var chrome = scene.querySelector('[data-hero-chrome]');
    if (!video || !copy) return;

    setUpTag(scene);

    if (reduced) {
      scene.style.height = 'auto';
      return;
    }

    var seek = seeker(video);
    var anchor = null;

    /*
     * The idle loop. `video.loop` would cycle at the end of the file, which is
     * two seconds past where this wants to turn over, so the turn is made here
     * instead — on the frame clock, because `timeupdate` fires about four times
     * a second and would let it run well into the transition first.
     */
    video.play().catch(function () {});
    (function idle() {
      requestAnimationFrame(idle);
      if (anchor !== null) return;
      if (video.currentTime >= HERO_LOOP_END) video.currentTime = 0;
    })();

    register(function () {
      var p = progressOf(scene);

      /*
       * Off the loop, the scroll drives the clip on from exactly the frame the
       * loop was showing — not from a fixed mark — so there is nothing to jump
       * over. The anchor is dropped when the scroll comes back to the top, and
       * the loop picks up again from wherever it was left.
       */
      if (p < HERO_SCRUB_FROM) {
        if (anchor !== null) {
          anchor = null;
          video.play().catch(function () {});
        }
      } else {
        if (anchor === null) {
          anchor = video.currentTime;
          video.pause();
        }
        if (video.duration) {
          var t = clamp01((p - HERO_SCRUB_FROM) / (HERO_SCRUB_BY - HERO_SCRUB_FROM));
          seek(anchor + t * (video.duration - anchor));
        }
      }

      var fade = Math.min(1, p / COPY_FADE);
      copy.style.opacity = String(1 - fade);
      copy.style.transform = 'translateY(' + (-fade * COPY_RISE).toFixed(1) + 'px)';
      copy.style.visibility = fade === 1 ? 'hidden' : '';

      /*
       * The white-out that hands over to the section below; the bar fades
       * with it, so nothing rides the flash.
       */
      var flashIn = clamp01((p - FLASH_IN_FROM) / (1 - FLASH_IN_FROM));
      if (flash) flash.style.opacity = String(flashIn);
      if (chrome) {
        chrome.style.opacity = String(1 - flashIn);
        chrome.style.visibility = flashIn === 1 ? 'hidden' : '';
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * Our role
   * ------------------------------------------------------------------ */

  /**
   * Wraps every character in its own span so the statement can be written on
   * one character at a time. Spaces stay as bare text nodes so lines still
   * break normally.
   */
  function splitCharacters(el) {
    var text = el.textContent;
    var frag = document.createDocumentFragment();
    var spans = [];

    for (var i = 0; i < text.length; i++) {
      if (text[i] === ' ') {
        frag.appendChild(document.createTextNode(' '));
        continue;
      }
      var span = document.createElement('span');
      span.textContent = text[i];
      frag.appendChild(span);
      spans.push(span);
    }

    el.textContent = '';
    el.appendChild(frag);
    return spans;
  }

  /*
   * Puts every character in the class its position asks for: nothing ahead of
   * the head, lit between the head and the tail, gone behind the tail.
   *
   * It reads every character each frame — the statement is one sentence, so
   * that is cheaper than tracking which ones moved — but only writes to the
   * ones whose class actually changed, which is what keeps it off the DOM.
   * Deriving the class from the position rather than stepping a cursor is also
   * what makes scrolling backwards undo it exactly.
   */
  function write(letters, head, tail) {
    for (var i = 0; i < letters.length; i++) {
      var want = i >= head ? '' : i < tail ? 'is-out' : 'is-in';
      if (letters[i].className !== want) letters[i].className = want;
    }
  }

  function setUpRole() {
    var scene = document.querySelector('[data-scene="role"]');
    if (!scene) return;

    var frame = scene.querySelector('.frame');
    var video = scene.querySelector('[data-role-video]');
    var statements = scene.querySelectorAll('[data-role-text]');
    var flash = scene.querySelector('[data-role-flash]');
    var chrome = scene.querySelector('[data-role-chrome]');
    var shrink = scene.querySelector('[data-role-shrink]');
    var page = scene.querySelector('[data-role-page]');
    var overlay = shrink ? shrink.querySelector('.frame__overlay') : null;
    if (!video || !statements.length) return;

    var passages = [].map.call(scene.querySelectorAll('[data-role-text]'), splitCharacters);

    if (reduced) {
      scene.style.height = 'auto';
      if (flash) flash.style.display = 'none';
      if (chrome) chrome.style.opacity = '1';
      /* Nothing to scroll through, so only the first passage has a place. */
      for (var i = 0; i < passages[0].length; i++) passages[0][i].className = 'is-in';
      for (var j = 1; j < passages.length; j++) statements[j].style.display = 'none';
      return;
    }

    /*
     * The tunnel is a camera, not a background: it never plays on its own, and
     * answers to the section's scroll from its first frame.
     */
    var seekTunnel = seeker(video);
    video.pause();

    register(function () {
      var p = progressOf(scene);

      if (video.duration) seekTunnel(clamp01(p) * video.duration);
      /* Published for tools/playback.mjs — where the camera should come to rest. */
      scene.dataset.cameraEnd = video.duration || 0;

      /*
       * The hero hands over on a frame of solid white; this lifts that white
       * off video 3, which reads as falling out of the flash into the tunnel.
       * The bar surfaces with it, so it never rides the white either.
       */
      var lift = clamp01(p / FLASH_FADE);
      if (flash) {
        flash.style.opacity = String(1 - lift);
        flash.style.visibility = lift === 1 ? 'hidden' : '';
      }
      if (chrome) chrome.style.opacity = String(lift);

      /*
       * Once the statement is read, the scroll packs the whole shot into
       * section 3's container — centred between the bar and the bottom edge —
       * where the clip drops its veil and carries on under the same scroll.
       * Further scroll
       * shrinks the box on and sends it out left while the next container
       * comes in from the right, grows to the same spot, and finally opens to
       * the full frame. The copy steps aside as the packing starts.
       */
      var t = clamp01((p - SHRINK_FROM) / (SHRINK_BY - SHRINK_FROM));
      var f = clamp01((p - FOLD_FROM) / (FOLD_BY - FOLD_FROM));

      var fw = frame ? frame.clientWidth : 0;
      var fh = frame ? frame.clientHeight : 0;
      /* The bar ends 84px down; the box centres in what is left below it. */
      var below = fh - 84;
      var boxH = Math.min(SHRINK_H, below - 100);
      var boxW = SHRINK_W * (boxH / SHRINK_H);
      var boxTop = 84 + (below - boxH) / 2;

      if (shrink && frame) {
        /*
         * Packing in: full bleed down onto the parked spot. Then the fold —
         * the box loses its height about its own middle until there is nothing
         * left, which is why the top comes down as the height goes.
         */
        var w1 = fw + (boxW - fw) * t;
        var h1 = (fh + (boxH - fh) * t) * (1 - f);
        var left1 = (fw - w1) / 2;
        var top1 = boxTop * t + ((fh + (boxH - fh) * t) - h1) / 2;
        shrink.style.left = left1.toFixed(1) + 'px';
        shrink.style.top = top1.toFixed(1) + 'px';
        shrink.style.width = w1.toFixed(1) + 'px';
        shrink.style.height = h1.toFixed(1) + 'px';
      }

      /* Inside the container the clip plays clean — the veil goes with t. */
      if (overlay) overlay.style.opacity = String(1 - t);
      if (page) page.style.opacity = String(t);
      if (chrome) chrome.style.backgroundColor = 'rgba(0, 0, 0, ' + t.toFixed(3) + ')';

      /*
       * Each passage writes itself on, one character at a time, and rubs itself
       * out the same way a fixed distance behind — so what is on screen is a
       * window of TEXT_TRAIL characters sliding through the sentence rather
       * than the whole of it.
       *
       * Only the two edges move, so only the characters they cross are
       * touched; the class each one lands in decides the rest, and the timing
       * of a single character's turn is the CSS transition, not this.
       */
      for (var s = 0; s < passages.length; s++) {
        var span = TEXT_SPANS[s] || TEXT_SPANS[TEXT_SPANS.length - 1];
        var letters = passages[s];
        var fill = clamp01((p - span[0]) / (span[1] - span[0]));
        var head = Math.round(fill * (letters.length + TEXT_TRAIL));
        write(letters, head, Math.max(0, head - TEXT_TRAIL));
      }

    });
  }

  /* ------------------------------------------------------------------ *
   * Cards
   * ------------------------------------------------------------------ */

  /*
   * The section is not pinned — it scrolls past like any other block — so what
   * drives it is how far it has come up the window rather than a scroll offset
   * inside it.
   *
   * The heading fills in reading order, which is the state 339:374 is drawn
   * in: read characters go transparent and let the paragraph's gradient
   * through, the rest keep their 20%. The cards rise as they arrive, the wide
   * one a beat before the narrow one.
   */
  function setUpCards() {
    var section = document.querySelector('[data-cards]');
    if (!section) return;

    var heading = section.querySelector('[data-cards-text]');
    var cards = section.querySelectorAll('[data-card]');
    if (!heading) return;

    var letters = splitCharacters(heading);

    if (reduced) {
      for (var i = 0; i < letters.length; i++) letters[i].className = 'is-read';
      return;
    }

    register(function () {
      var fill = progressUp(heading, CARDS_FILL_FROM, CARDS_FILL_BY);
      var read = Math.round(fill * letters.length);
      for (var i = 0; i < letters.length; i++) {
        var want = i < read ? 'is-read' : '';
        if (letters[i].className !== want) letters[i].className = want;
      }

      for (var c = 0; c < cards.length; c++) {
        /* Each card waits its turn: the second is a tenth of a window later. */
        var up = progressUp(cards[c], CARDS_RISE_FROM - c * 0.1, CARDS_RISE_BY);
        cards[c].classList.toggle('is-in', up > 0);
      }
    });
  }

  /* ------------------------------------------------------------------ */

  setUpHero();
  setUpRole();
  setUpCards();

  if (!reduced) {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    /* Durations arrive late; repaint once they do so the maps are right. */
    document.querySelectorAll('video').forEach(function (video) {
      video.addEventListener('loadedmetadata', paint);
    });
  }
})();
