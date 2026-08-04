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
  var CARDS_FILL_FROM = 0.92; // the heading starts filling as it enters...
  var CARDS_FILL_BY = 0.16; // ...and is only fully read once it is near the top
  var CARDS_RISE_FROM = 0.92; // a card rises as its top reaches here
  var CARDS_RISE_BY = 0.8;
  var CARDS_OPEN_FROM = 0.9; // the pair start trading width here...
  var CARDS_OPEN_BY = 0.3; // ...and have settled on the frame's split by here

  var CARD_WIDE = 915; // the frame's split, and the gap between the pair
  var CARD_GAP = 8;

  var REVEAL_MS = 950; // one line's wipe — unhurried enough to be watched
  var REVEAL_STAGGER = 220; // ms between lines setting off
  var SWAP_PHRASES = [
    'orbital data centers',
    'power generation',
    'data transmission',
    'sustainability in space',
  ];
  var TYPE_HOLD = 2400; // ms a phrase stands before retyping
  var TYPE_DEL = 38; // ms per character on the way out
  var TYPE_ADD = 58; // ...and on the way in

  /* Outside the spacecraft — fractions of that section's own scroll. */
  var FLIGHT_PREROLL = 1.2; // seconds the clip creeps through while the card scales
  var FLIGHT_WIDEN_BY = 0.09; // the card has widened across both by here...
  var FLIGHT_OPEN_BY = 0.24; // ...and has taken the whole window by here
  var FLIGHT_RUN_BY = 0.86; // ...and the clip has run to its end by here
  var TEXT_IN_FROM = 0.26; // the intro copy writes on over the flight...
  var TEXT_IN_BY = 0.6; // ...and has written itself out again by here
  var DEVICE_FROM = 0.68; // the device copy arrives with the satellite
  var LABEL_OUT_FROM = 0.46; // HOW IT WORKS leaves as its sentence starts to go
  /*
   * Leaving Our role: the tunnel stays full-bleed to the last and simply goes
   * dark, while the section below rides up over it — the cover is CSS, this is
   * only the dimming. Both finish together, so the incoming edge never sweeps
   * across a lit frame.
   */
  var DIM_FROM = 0.84;
  var DIM_BY = 1;
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
    if (!video || !copy) return;

    setUpTag(scene);

    if (reduced) {
      scene.style.height = 'auto';
      return;
    }

    /*
     * The reveal. Both blocks hide before first paint and wipe on once the
     * fonts have landed — splitting sooner would measure fallback metrics.
     * The tail starts retyping only after its own line has been revealed.
     */
    var headline = scene.querySelector('.hero__headline');
    var lead = scene.querySelector('.hero__lead');
    var swap = scene.querySelector('[data-hero-swap]');
    if (headline) headline.style.opacity = '0';
    if (lead) lead.style.opacity = '0';
    var fontsReady =
      document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fontsReady.then(function () {
      if (headline) {
        headline.style.opacity = '';
        blockReveal(headline, function () {
          if (swap) startTyper(swap);
        });
      }
      if (lead) {
        setTimeout(function () {
          lead.style.opacity = '';
          blockReveal(lead);
        }, 2 * REVEAL_STAGGER);
      }
    });

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

      /* The white-out that hands over to the section below. */
      var flashIn = clamp01((p - FLASH_IN_FROM) / (1 - FLASH_IN_FROM));
      if (flash) flash.style.opacity = String(flashIn);
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

  /* ------------------------------------------------------------------ *
   * The block reveal
   * ------------------------------------------------------------------ */

  /*
   * Splits a piece of copy into its rendered lines. Copy with explicit <br>s
   * keeps its nodes — the headline's retyping span has to survive by
   * reference — and plain text is measured word by word: each word in a probe
   * span, grouped by the row it landed on, then rebuilt as one span per line.
   */
  function splitIntoLines(el) {
    var lines = [];

    function buildLine(nodes) {
      var line = document.createElement('span');
      line.className = 'rv-line';
      var text = document.createElement('span');
      text.className = 'rv-text';
      for (var i = 0; i < nodes.length; i++) text.appendChild(nodes[i]);
      var block = document.createElement('span');
      block.className = 'rv-block';
      line.appendChild(text);
      line.appendChild(block);
      el.appendChild(line);
      lines.push({ line: line, text: text, block: block });
    }

    if (el.querySelector('br')) {
      var segments = [[]];
      var nodes = [].slice.call(el.childNodes);
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].nodeName === 'BR') segments.push([]);
        else segments[segments.length - 1].push(nodes[i]);
      }
      el.textContent = '';
      for (var j = 0; j < segments.length; j++) buildLine(segments[j]);
    } else {
      var words = el.textContent.split(/\s+/).filter(Boolean);
      el.textContent = '';
      var probes = [];
      for (var k = 0; k < words.length; k++) {
        var probe = document.createElement('span');
        probe.style.display = 'inline-block';
        probe.textContent = words[k];
        el.appendChild(probe);
        el.appendChild(document.createTextNode(' '));
        probes.push(probe);
      }
      var groups = [];
      for (var m = 0; m < probes.length; m++) {
        var top = probes[m].offsetTop;
        if (!groups.length || Math.abs(top - groups[groups.length - 1].top) > 2) {
          groups.push({ top: top, words: [] });
        }
        groups[groups.length - 1].words.push(probes[m].textContent);
      }
      el.textContent = '';
      for (var n = 0; n < groups.length; n++) {
        buildLine([document.createTextNode(groups[n].words.join(' '))]);
      }
    }
    return lines;
  }

  /** The not-yet-revealed state — also what makes a replay possible. */
  function hideReveal(lines) {
    for (var i = 0; i < lines.length; i++) {
      lines[i].text.style.clipPath = 'inset(-0.25em 101% -0.25em 0)';
      lines[i].block.style.display = '';
      lines[i].block.style.opacity = '0';
      lines[i].block.style.transform = '';
    }
  }

  /*
   * The wipe: each line is uncovered left to right, the white rectangle
   * riding the reveal's edge and stepping off past the end of the text; the
   * lines set off REVEAL_STAGGER apart. When the last one lands, the clips
   * come off entirely so nothing later — the retyping tail — is ever cropped.
   */
  function runReveal(lines, done) {
    var t0 = null;
    function frame(now) {
      if (t0 === null) t0 = now;
      var settled = true;
      for (var i = 0; i < lines.length; i++) {
        var raw = (now - t0 - i * REVEAL_STAGGER) / REVEAL_MS;
        if (raw < 1) settled = false;
        var k = 1 - Math.pow(1 - clamp01(raw), 3);
        var l = lines[i];
        l.text.style.clipPath = 'inset(-0.25em ' + ((1 - k) * 101).toFixed(2) + '% -0.25em 0)';
        l.block.style.transform = 'translateX(' + (k * l.text.offsetWidth).toFixed(1) + 'px)';
        l.block.style.opacity = raw >= 0 && raw < 1 ? '1' : '0';
      }
      if (!settled) {
        requestAnimationFrame(frame);
      } else {
        for (var j = 0; j < lines.length; j++) {
          lines[j].text.style.clipPath = '';
          lines[j].block.style.display = 'none';
        }
        if (done) done();
      }
    }
    requestAnimationFrame(frame);
  }

  function blockReveal(el, done) {
    var lines = splitIntoLines(el);
    hideReveal(lines);
    runReveal(lines, done);
    return lines;
  }

  /*
   * The headline's tail retypes itself through SWAP_PHRASES: hold, rub the
   * old phrase out a character at a time, type the new one in, hold again.
   * The cursor is the reveal's rectangle at text scale, on only while the
   * tail is actually being retyped.
   */
  function startTyper(swap) {
    var cursor = document.createElement('span');
    cursor.className = 'hero__swapCursor';
    swap.parentNode.insertBefore(cursor, swap.nextSibling);
    var idx = 0;

    /*
     * The tail is kept as one node per character so each can arrive the way
     * the tunnel's copy does — in the accent, settling to white a beat later.
     * Spaces stay bare text nodes; they have no colour to settle.
     */
    function put(ch) {
      if (ch === ' ') {
        swap.appendChild(document.createTextNode(' '));
        return;
      }
      var span = document.createElement('span');
      span.textContent = ch;
      swap.appendChild(span);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          span.className = 'is-set';
        });
      });
    }

    function retype(next, done) {
      (function del() {
        if (swap.lastChild) {
          swap.removeChild(swap.lastChild);
          setTimeout(del, TYPE_DEL);
        } else {
          var i = 0;
          (function add() {
            if (i < next.length) {
              put(next.charAt(i++));
              setTimeout(add, TYPE_ADD);
            } else {
              done();
            }
          })();
        }
      })();
    }

    (function cycle() {
      setTimeout(function () {
        idx = (idx + 1) % SWAP_PHRASES.length;
        cursor.classList.add('is-typing');
        retype(SWAP_PHRASES[idx], function () {
          cursor.classList.remove('is-typing');
          cycle();
        });
      }, TYPE_HOLD);
    })();
  }

  function setUpRole() {
    var scene = document.querySelector('[data-scene="role"]');
    if (!scene) return;

    var frame = scene.querySelector('.frame');
    var video = scene.querySelector('[data-role-video]');
    var statements = scene.querySelectorAll('[data-role-text]');
    var flash = scene.querySelector('[data-role-flash]');
    var dark = scene.querySelector('[data-role-dark]');
    if (!video || !statements.length) return;

    var passages = [].map.call(scene.querySelectorAll('[data-role-text]'), splitCharacters);

    if (reduced) {
      scene.style.height = 'auto';
      if (flash) flash.style.display = 'none';
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

      /*
       * Once the statement is read, the scroll packs the whole shot into
       * section 3's container — centred between the bar and the bottom edge —
       * where the clip drops its veil and carries on under the same scroll.
       * Further scroll
       * shrinks the box on and sends it out left while the next container
       * comes in from the right, grows to the same spot, and finally opens to
       * the full frame. The copy steps aside as the packing starts.
       */
      var dim = clamp01((p - DIM_FROM) / (DIM_BY - DIM_FROM));
      if (dark) dark.style.opacity = String(dim);

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
    var row = section.querySelector('[data-card-row]');
    if (!heading) return;

    var letters = splitCharacters(heading);

    if (reduced) {
      for (var i = 0; i < letters.length; i++) letters[i].className = 'is-read';
      return;
    }

    /* They start the other way round, and open as the row is scrolled to. */
    if (row) row.style.setProperty('--card-open', '0');

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

      /*
       * The pair trade width as the row comes up: the right one gives way while
       * the left is revealed, settling on the frame's 915 / 405.
       */
      if (row) {
        row.style.setProperty(
          '--card-open',
          progressUp(row, CARDS_OPEN_FROM, CARDS_OPEN_BY).toFixed(4)
        );
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * Outside the spacecraft
   * ------------------------------------------------------------------ */

  /*
   * The wide card above opens out until it fills the window, and only then
   * does the clip inside it start to run.
   *
   * Growing it means taking it out of the card, so over that stretch the box
   * is fixed and its rect is interpolated from wherever the card has it to the
   * whole window. The card's own rect is read every frame rather than captured
   * once, so arriving at any scroll position lands on the right box.
   */
  /*
   * The narrow card folds as the wide one takes the row: pinned to the row's
   * right edge, it gives up exactly the width the wide one gains — their
   * facing edges close on the 8px gap — until nothing of it is left. It never
   * simply stands behind the widening card.
   *
   * It folds in the same frozen frame the wide card grows in. Left in the
   * page it would go on scrolling up while the wide card held still, and the
   * pair's edges would drift apart mid-fold.
   */
  function foldNarrow(row, frozen) {
    var narrow = row.querySelector('.card--narrow');
    if (!narrow) return;
    if (!frozen) {
      narrow.classList.remove('is-opening');
      narrow.style.cssText = '';
      return;
    }
    var w = Math.max(0, frozen.rowWidth - frozen.ww - CARD_GAP);
    narrow.classList.add('is-opening');
    narrow.style.left = (frozen.x0 + frozen.rowWidth - w).toFixed(1) + 'px';
    /* The wide card's own box, so the pair share top and height throughout. */
    narrow.style.top = frozen.y.toFixed(1) + 'px';
    narrow.style.width = w.toFixed(1) + 'px';
    narrow.style.height = frozen.h.toFixed(1) + 'px';
  }

  function setUpFlight() {
    var scene = document.querySelector('[data-scene="flight"]');
    if (!scene) return;

    var video = document.querySelector('[data-flight-video]');
    var card = video ? video.closest('[data-card]') : null;
    var row = card ? card.closest('[data-card-row]') : null;
    var intro = scene.querySelector('[data-flight-intro]');
    var introLabel = scene.querySelector('.flight__label');
    var heading = scene.querySelector('[data-flight-text]');
    var device = scene.querySelector('[data-flight-device]');
    var deviceOn = false;
    var deviceLines = null;
    if (!video || !card || !heading) return;

    var letters = splitCharacters(heading);
    var seek = seeker(video);
    video.pause();

    if (reduced) {
      scene.style.height = 'auto';
      for (var i = 0; i < letters.length; i++) letters[i].className = 'is-in';
      if (device) device.classList.add('is-in');
      return;
    }

    register(function () {
      var p = progressOf(scene);

      /*
       * The card opens out in two moves, and it is the whole card that moves —
       * frame, ticks and copy together, with the clip filling it throughout.
       *
       *   first   it widens across the space both cards held, keeping its own
       *           height and its place in the row
       *   then    it carries on into the window, and its copy fades as it goes
       *           so that by the time the clip has the screen nothing is left
       *           of the card but the picture
       *
       * Both moves grow from where the card stood when the scene began, not
       * from where it is now: the row goes on scrolling away underneath while
       * this lifts out of it, and tracking it instead drags the box up off the
       * screen. That start is recovered rather than captured — the scene's own
       * top is how far the scroll has come into it, so adding it back to the
       * card's current top gives where it stood at zero.
       */
      var widen = clamp01(p / FLIGHT_WIDEN_BY);
      var zoom = clamp01((p - FLIGHT_WIDEN_BY) / (FLIGHT_OPEN_BY - FLIGHT_WIDEN_BY));
      var open = p >= FLIGHT_OPEN_BY ? 1 : 0;

      if (p > 0 && p < FLIGHT_OPEN_BY && row) {
        var into = scene.getBoundingClientRect().top;
        /*
         * Measured off the row, never off the card: the card is fixed by the
         * time this runs a second time, so its own rect would be reporting
         * back the position this very code just gave it. The row stays in the
         * page and keeps telling the truth.
         */
        var rowBox = row.getBoundingClientRect();
        var x0 = rowBox.left;
        var y0 = rowBox.top - into;
        var h0 = rowBox.height;
        /* From the card's own share of the row to the whole of it. */
        var ww = CARD_WIDE + (rowBox.width - CARD_WIDE) * widen;
        var wx = x0;
        var vw = window.innerWidth;
        var vh = window.innerHeight;

        card.classList.add('is-opening');
        foldNarrow(row, {
          x0: x0,
          y: y0 * (1 - zoom),
          h: h0 + (vh - h0) * zoom,
          ww: ww,
          rowWidth: rowBox.width,
        });
        card.style.left = (wx * (1 - zoom)).toFixed(1) + 'px';
        card.style.top = (y0 * (1 - zoom)).toFixed(1) + 'px';
        card.style.width = (ww + (vw - ww) * zoom).toFixed(1) + 'px';
        card.style.height = (h0 + (vh - h0) * zoom).toFixed(1) + 'px';
      } else if (open) {
        card.classList.add('is-opening');
        if (row) {
          var rb = row.getBoundingClientRect();
          foldNarrow(row, { x0: rb.left, y: 0, h: window.innerHeight, ww: rb.width, rowWidth: rb.width });
        }
        card.style.left = '0px';
        card.style.top = '0px';
        card.style.width = '100%';
        card.style.height = '100%';
      } else {
        card.classList.remove('is-opening');
        card.style.cssText = '';
        if (row) foldNarrow(row, null);
      }
      /* The copy goes over the second move only, and is gone by the end of it. */
      card.style.setProperty('--card-copy', String(1 - zoom));

      /*
       * While the card scales, the clip creeps a few frames forward — still
       * well inside the cupola, never out through the glass. The flight
       * proper picks up from exactly where the creep leaves off, so the
       * playhead never jumps.
       */
      if (video.duration) {
        var creep = clamp01(p / FLIGHT_OPEN_BY);
        var run = clamp01((p - FLIGHT_OPEN_BY) / (FLIGHT_RUN_BY - FLIGHT_OPEN_BY));
        seek(
          run > 0
            ? FLIGHT_PREROLL + run * (video.duration - FLIGHT_PREROLL)
            : creep * FLIGHT_PREROLL
        );
      }

      /* The intro copy writes itself on over the flight out through the glass. */
      var fill = clamp01((p - TEXT_IN_FROM) / (TEXT_IN_BY - TEXT_IN_FROM));
      var head = Math.round(fill * (letters.length + TEXT_TRAIL));
      write(letters, head, Math.max(0, head - TEXT_TRAIL));
      if (intro) {
        /* In as the window fills, out once the sentence has written itself off. */
        var shown =
          clamp01((p - FLIGHT_OPEN_BY) / 0.04) * (1 - clamp01((p - TEXT_IN_BY) / 0.05));
        intro.style.opacity = String(shown);
        intro.style.visibility = shown === 0 ? 'hidden' : '';
      }

      /*
       * The label leaves ahead of its sentence — holding it to the end left
       * HOW IT WORKS lingering over copy that had already written itself off.
       */
      if (introLabel) {
        introLabel.style.opacity = String(1 - clamp01((p - LABEL_OUT_FROM) / 0.06));
      }

      /*
       * ...and the device copy arrives once the satellite is all that is
       * left, each line wiped on by the block reveal — and reset on the way
       * back up, so scrolling through again replays it.
       */
      if (device) {
        var on = p >= DEVICE_FROM;
        if (on !== deviceOn) {
          deviceOn = on;
          device.classList.toggle('is-in', on);
          if (on) {
            if (!deviceLines) {
              deviceLines = [];
              device.querySelectorAll('p').forEach(function (el) {
                deviceLines = deviceLines.concat(splitIntoLines(el));
              });
            }
            hideReveal(deviceLines);
            runReveal(deviceLines);
          } else {
            hideReveal(deviceLines);
          }
        }
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * The menu
   * ------------------------------------------------------------------ */

  /*
   * One bar, fixed to the window, owned here and nowhere else. It fades into
   * the hero's white-out, lifts back with the role's flash, and from there it
   * simply holds — through the cover, the cards and the whole flight.
   */
  function setUpMenu() {
    var menu = document.querySelector('[data-site-menu]');
    var hero = document.querySelector('[data-scene="hero"]');
    var role = document.querySelector('[data-scene="role"]');
    if (!menu || !hero || !role) return;

    /*
     * The logo restarts the page: a fresh load from the very top, not a
     * scroll. Restoration is switched off first or the browser would put the
     * reloaded page straight back at the old scroll position.
     */
    var logo = menu.querySelector('.menu__logo');
    if (logo) {
      logo.addEventListener('click', function (event) {
        event.preventDefault();
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
        window.location.reload();
      });
    }

    if (reduced) return;

    register(function () {
      var rp = progressOf(role);
      var o;
      if (rp > 0) {
        o = clamp01(rp / FLASH_FADE);
      } else {
        o = 1 - clamp01((progressOf(hero) - FLASH_IN_FROM) / (1 - FLASH_IN_FROM));
      }
      menu.style.opacity = String(o);
      menu.style.visibility = o === 0 ? 'hidden' : '';
    });
  }

  /* ------------------------------------------------------------------ */

  setUpHero();
  setUpRole();
  setUpCards();
  setUpFlight();
  setUpMenu();

  if (!reduced) {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    /* Durations arrive late; repaint once they do so the maps are right. */
    document.querySelectorAll('video').forEach(function (video) {
      video.addEventListener('loadedmetadata', paint);
    });
  }
})();
