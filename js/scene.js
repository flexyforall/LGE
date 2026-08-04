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
  var VIDEO2_FROM = 0.3; // the transition takes the frame once the copy has gone
  var VIDEO2_BY = 0.92; // ...and the scroll has driven it to its last frame by here
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
  var TEXT_FILL_FROM = 0.12; // the statement starts writing on once the flash is gone
  var TEXT_FILL_BY = 0.38; // ...and has written itself out again by here
  /*
   * How many characters stay lit behind the head before they start dissolving.
   * The whole effect is this one number: raise it past the statement's length
   * and nothing ever dissolves, leaving a plain reveal.
   */
  var TEXT_TRAIL = 26;
  var SHRINK_FROM = 0.44; // once read, the shot starts packing itself...
  var SHRINK_BY = 0.58; // ...into section 3's container, where it plays free
  var SWAP_FROM = 0.66; // then it shrinks on and exits left...
  var SWAP_BY = 0.84; // ...while the next container comes in from the right
  var OPEN_FROM = 0.87; // which then opens up...
  var OPEN_BY = 1; // ...to the full frame
  var SHRINK_W = 478; // the container, from Figma 242:2689
  var SHRINK_H = 626;
  var EXIT_SCALE = 0.81; // the leaving box's scale as it goes (251:2811)
  var ENTER_SCALE = 0.4; // the incoming box's scale at the right edge (251:2833)
  var SEEK_EPSILON = 0.008; // ignore seeks smaller than a third of a frame

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ *
   * Shared plumbing
   * ------------------------------------------------------------------ */

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
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

    var frame = scene.querySelector('.frame');
    var video = scene.querySelector('[data-hero-video="1"]');
    var transition = scene.querySelector('[data-hero-video="2"]');
    var copy = scene.querySelector('[data-scene-copy]');
    var flash = scene.querySelector('[data-hero-flash]');
    var chrome = scene.querySelector('[data-hero-chrome]');
    if (!video || !copy) return;

    setUpTag(scene);

    if (reduced) {
      scene.style.height = 'auto';
      return;
    }

    /* Video 1 is a background: it loops on its own until the scroll takes over. */
    video.loop = true;
    video.play().catch(function () {});

    var seekTransition = transition ? seeker(transition) : null;
    if (transition) transition.pause();

    register(function () {
      var p = progressOf(scene);

      /*
       * The hand-off. The two shots are unrelated, so the frame crosses to the
       * transition rather than cutting, and the idle loop rests while it is
       * off screen — picking back up the moment scrolling brings it back.
       */
      if (transition && frame) {
        var live = p >= VIDEO2_FROM;
        frame.dataset.heroStage = live ? '2' : '1';
        if (live) {
          if (!video.paused) video.pause();
          if (transition.duration) {
            var t = clamp01((p - VIDEO2_FROM) / (VIDEO2_BY - VIDEO2_FROM));
            seekTransition(t * transition.duration);
          }
        } else if (video.paused) {
          video.play().catch(function () {});
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
    var statement = scene.querySelector('[data-role-text]');
    var flash = scene.querySelector('[data-role-flash]');
    var chrome = scene.querySelector('[data-role-chrome]');
    var footer = scene.querySelector('[data-role-footer]');
    var shrink = scene.querySelector('[data-role-shrink]');
    var white = scene.querySelector('[data-role-white]');
    var overlay = shrink ? shrink.querySelector('.frame__overlay') : null;
    var next = scene.querySelector('[data-role-next]');
    var nextVideo = scene.querySelector('[data-role-next-video]');
    if (!video || !statement) return;

    var letters = splitCharacters(statement);

    if (reduced) {
      scene.style.height = 'auto';
      if (flash) flash.style.display = 'none';
      if (chrome) chrome.style.opacity = '1';
      for (var i = 0; i < letters.length; i++) letters[i].className = 'is-in';
      return;
    }

    /*
     * Both clips here are cameras, not backgrounds: neither ever plays on its
     * own. The tunnel answers to the section's scroll from its first frame,
     * and the clip in the container that follows it answers to the stretch of
     * scroll that brings that container in.
     */
    var seekTunnel = seeker(video);
    var seekNext = nextVideo ? seeker(nextVideo) : null;
    video.pause();
    if (nextVideo) nextVideo.pause();

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
      var u = clamp01((p - SWAP_FROM) / (SWAP_BY - SWAP_FROM));
      var o = clamp01((p - OPEN_FROM) / (OPEN_BY - OPEN_FROM));

      var fw = frame ? frame.clientWidth : 0;
      var fh = frame ? frame.clientHeight : 0;
      /* The bar ends 84px down; the box centres in what is left below it. */
      var below = fh - 84;
      var boxH = Math.min(SHRINK_H, below - 100);
      var boxW = SHRINK_W * (boxH / SHRINK_H);
      var boxTop = 84 + (below - boxH) / 2;
      var boxCy = boxTop + boxH / 2;

      if (shrink && frame) {
        var w1;
        var h1;
        var left1;
        var top1;
        if (u <= 0) {
          /* Packing in: full bleed down onto the parked spot. */
          w1 = fw + (boxW - fw) * t;
          h1 = fh + (boxH - fh) * t;
          left1 = (fw - w1) / 2;
          top1 = boxTop * t;
        } else {
          /* The hand-off: shrinking on and leaving through the left edge. */
          var s1 = 1 - (1 - EXIT_SCALE) * u;
          w1 = boxW * s1;
          h1 = boxH * s1;
          var cx1 = fw / 2 + (-boxW / 2 - fw / 2) * u;
          left1 = cx1 - w1 / 2;
          top1 = boxCy - h1 / 2;
        }
        shrink.style.left = left1.toFixed(1) + 'px';
        shrink.style.top = top1.toFixed(1) + 'px';
        shrink.style.width = w1.toFixed(1) + 'px';
        shrink.style.height = h1.toFixed(1) + 'px';
      }

      /* Inside the container the clip plays clean — the veil goes with t. */
      if (overlay) overlay.style.opacity = String(1 - t);
      if (white) white.style.opacity = String(t);
      if (chrome) chrome.style.backgroundColor = 'rgba(0, 0, 0, ' + t.toFixed(3) + ')';

      /* The next chapter's box: in from the right, grow, then open up. */
      if (next && nextVideo) {
        var visible = u > 0;
        /* The stylesheet parks it hidden, so visible must be said outright. */
        next.style.visibility = visible ? 'visible' : 'hidden';
        if (visible) {
          var w2;
          var h2;
          var left2;
          var top2;
          if (o > 0) {
            w2 = boxW + (fw - boxW) * o;
            h2 = boxH + (fh - boxH) * o;
            left2 = (fw - w2) / 2;
            top2 = boxTop * (1 - o);
          } else {
            var s2 = ENTER_SCALE + (1 - ENTER_SCALE) * u;
            w2 = boxW * s2;
            h2 = boxH * s2;
            var cx2 = fw + w2 / 2 + (fw / 2 - fw - w2 / 2) * u;
            left2 = cx2 - w2 / 2;
            top2 = boxCy - h2 / 2;
          }
          next.style.left = left2.toFixed(1) + 'px';
          next.style.top = top2.toFixed(1) + 'px';
          next.style.width = w2.toFixed(1) + 'px';
          next.style.height = h2.toFixed(1) + 'px';
          if (seekNext && nextVideo.duration) {
            var v = clamp01((p - SWAP_FROM) / (1 - SWAP_FROM));
            seekNext(v * nextVideo.duration);
          }
        }
      }

      var aside = clamp01((p - SHRINK_FROM) / 0.06);
      statement.style.opacity = String(1 - aside);
      statement.style.visibility = aside === 1 ? 'hidden' : '';
      if (footer) {
        footer.style.opacity = String(1 - aside);
        footer.style.visibility = aside === 1 ? 'hidden' : '';
      }

      /*
       * The statement writes itself on, one character at a time, and rubs
       * itself out the same way a fixed distance behind — so what is on screen
       * is a window of TEXT_TRAIL characters sliding through the sentence
       * rather than the whole thing.
       *
       * Only the two edges move, so only the characters they cross are
       * touched; the class each one lands in decides the rest, and the timing
       * of a single character's turn is the CSS transition, not this.
       */
      var fill = clamp01((p - TEXT_FILL_FROM) / (TEXT_FILL_BY - TEXT_FILL_FROM));
      var head = Math.round(fill * (letters.length + TEXT_TRAIL));
      var tail = Math.max(0, head - TEXT_TRAIL);
      write(letters, head, tail);

    });
  }

  /* ------------------------------------------------------------------ */

  setUpHero();
  setUpRole();

  if (!reduced) {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    /* Durations arrive late; repaint once they do so the maps are right. */
    document.querySelectorAll('video').forEach(function (video) {
      video.addEventListener('loadedmetadata', paint);
    });
  }
})();
