/*
 * Scene choreography.
 *
 * Two pinned sections, each taller than the window. The surplus height is the
 * scroll their cameras are mapped onto.
 *
 *   Hero    video 1 plays straight through on load, video 2 follows it for
 *           HERO_TAIL seconds, then everything stops. From there the scroll
 *           drives video 2 to its end, where the light fills the frame and
 *           hands over to the section below.
 *
 *   Role    video 3 answers to the scroll from its first frame, and the
 *           statement fills in reading order over the same scroll.
 *
 * Nothing ever plays on its own again once the scroll has taken over.
 */
(function () {
  'use strict';

  var HERO_LOOP_CUT = 5.5; // video 2 loops back before its flare starts growing
  var COPY_FADE = 0.22; // fraction of the hero scroll the copy fades over
  var COPY_RISE = 48; // px the copy drifts up as it goes
  var FLASH_IN_FROM = 0.86; // the hero whites out over its last stretch
  var FLASH_FADE = 0.16; // fraction of the role scroll the white flash lifts over
  var ROLE_INTRO = 1.5; // seconds of video 3 played on entering the section
  var TEXT_FILL_FROM = 0.16; // the statement starts filling once the flash is gone
  var TEXT_FILL_BY = 0.52; // ...and is fully read by here
  var SHRINK_FROM = 0.6; // once read, the shot starts packing itself...
  var SHRINK_BY = 0.95; // ...into section 3's container
  var SHRINK_W = 478; // the container, from Figma 242:2689
  var SHRINK_H = 626;
  var SHRINK_BOTTOM = 50; // its designed gap to the frame's bottom edge
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

  function setUpHero() {
    var scene = document.querySelector('[data-scene="hero"]');
    if (!scene) return;

    var frame = scene.querySelector('[data-design-frame]');
    var first = scene.querySelector('[data-hero-video="1"]');
    var second = scene.querySelector('[data-hero-video="2"]');
    var copy = scene.querySelector('[data-scene-copy]');
    var flash = scene.querySelector('[data-hero-flash]');
    var chrome = scene.querySelector('[data-hero-chrome]');
    if (!frame || !first || !second || !copy) return;

    if (reduced) {
      scene.style.height = 'auto';
      return;
    }

    var seek = seeker(second);
    /*
     * Where video 2 was when the scroll took over, and the origin the scrub
     * runs from. Null while the idle loop still has the stage.
     *
     * It is read off the video rather than assumed: playback always overshoots
     * a mark by a frame or two, and rewinding onto a round number shows as a
     * hitch backwards just as the motion settles.
     */
    var handOver = null;
    var stage = 1;

    function show(n) {
      stage = n;
      frame.dataset.heroStage = String(n);
    }

    function ignore() {}

    /*
     * The idle loop: video 1 in full, video 2 up to HERO_LOOP_CUT — cutting
     * away just before its flare starts to grow — then around again, crossing
     * on each change. Watched on the frame clock rather than `timeupdate`,
     * which fires about four times a second, far too coarse to cut on a mark.
     */
    /*
     * The hidden clip is rewound only after the 500ms cross has finished, and
     * never while it is on stage. Rewinding it at the moment of the cut put a
     * stray frame on screen — the incoming clip fading in on whatever frame it
     * had been left showing.
     */
    function rewindWhenHidden(video, ofStage) {
      setTimeout(function () {
        if (handOver === null && stage !== ofStage) video.currentTime = 0;
      }, 700);
    }

    function watchLoop() {
      if (handOver !== null) return;
      if (stage === 1) {
        if (first.ended || (first.duration && first.currentTime >= first.duration - 0.05)) {
          show(2);
          second.play().catch(ignore);
          /* Video 1 has faded out on its last frame — reset it off stage. */
          rewindWhenHidden(first, 1);
        }
      } else if (second.currentTime >= HERO_LOOP_CUT || second.ended) {
        show(1);
        second.pause();
        first.play().catch(ignore);
        rewindWhenHidden(second, 2);
      }
      requestAnimationFrame(watchLoop);
    }

    /* The first scroll breaks the loop and gives video 2 to the scrub. */
    function endIntro() {
      if (handOver !== null) return;
      first.pause();
      second.pause();
      if (stage === 1) show(2);
      handOver = Math.min(second.currentTime, HERO_LOOP_CUT);
    }

    first.play().catch(ignore);
    watchLoop();

    register(function () {
      var p = progressOf(scene);

      var fade = Math.min(1, p / COPY_FADE);
      copy.style.opacity = String(1 - fade);
      copy.style.transform = 'translateY(' + (-fade * COPY_RISE).toFixed(1) + 'px)';
      /* Visibility cascades where pointer-events does not, so it also takes
         the two blocks out of reach once they are gone. */
      copy.style.visibility = fade === 1 ? 'hidden' : '';

      /*
       * Video 2's last frames are bright but faintly textured; this finishes
       * the white-out so the hand-off to the section below is pure white on
       * both sides of the seam.
       */
      var flashIn = clamp01((p - FLASH_IN_FROM) / (1 - FLASH_IN_FROM));
      if (flash) flash.style.opacity = String(flashIn);
      /* The bar fades with the white-out, so nothing rides the flash. */
      if (chrome) {
        chrome.style.opacity = String(1 - flashIn);
        chrome.style.visibility = flashIn === 1 ? 'hidden' : '';
      }

      /* Scrolling hands the camera over from wherever the intro had got to. */
      if (p > 0) endIntro();
      if (handOver === null || !second.duration) return;

      if (!second.paused) second.pause();
      seek(handOver + p * (second.duration - handOver));
      scene.dataset.cameraEnd = String(second.duration);
    });
  }

  /* ------------------------------------------------------------------ *
   * Our role
   * ------------------------------------------------------------------ */

  /**
   * Wraps every character in its own span so the statement can be filled one
   * character at a time — which is what gives the mid-word edge the design
   * shows. Spaces stay as bare text nodes so lines still break normally.
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
    if (!video || !statement) return;

    var letters = splitCharacters(statement);

    if (reduced) {
      scene.style.height = 'auto';
      if (flash) flash.style.display = 'none';
      if (chrome) chrome.style.opacity = '1';
      for (var i = 0; i < letters.length; i++) letters[i].className = 'is-read';
      return;
    }

    var seek = seeker(video);
    var read = 0;

    /*
     * The flight into the tunnel. The first time the section pins, video 3
     * plays forward on its own for ROLE_INTRO seconds — so the tunnel is
     * already rushing past as the white lifts — and stops where it gets to.
     * From there the scroll has the camera, exactly like the hero.
     */
    var introStarted = false;
    var handOver = null;

    function endIntro() {
      if (handOver !== null) return;
      video.pause();
      handOver = video.currentTime;
    }

    function watchIntro() {
      if (handOver !== null) return;
      if (video.currentTime >= ROLE_INTRO || video.ended) {
        endIntro();
        return;
      }
      requestAnimationFrame(watchIntro);
    }

    function startIntro() {
      if (introStarted) return;
      introStarted = true;
      video.play().then(watchIntro).catch(endIntro);
    }

    register(function () {
      var p = progressOf(scene);

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
       * section 3's container: the box tightens onto its designed spot, the
       * page behind it goes white, and the bar takes its black plate. The
       * copy steps aside over the first stretch of the move.
       */
      var t = clamp01((p - SHRINK_FROM) / (SHRINK_BY - SHRINK_FROM));
      if (shrink && frame) {
        var fw = frame.clientWidth;
        var fh = frame.clientHeight;
        /* Fit the designed box into short frames rather than overflowing. */
        var boxH = Math.min(SHRINK_H, fh - SHRINK_BOTTOM - 84);
        var boxW = SHRINK_W * (boxH / SHRINK_H);
        var w = fw + (boxW - fw) * t;
        var h = fh + (boxH - fh) * t;
        shrink.style.left = ((fw - w) / 2).toFixed(1) + 'px';
        shrink.style.top = ((fh - SHRINK_BOTTOM - boxH) * t).toFixed(1) + 'px';
        shrink.style.width = w.toFixed(1) + 'px';
        shrink.style.height = h.toFixed(1) + 'px';
      }
      if (white) white.style.opacity = String(t);
      if (chrome) chrome.style.backgroundColor = 'rgba(0, 0, 0, ' + t.toFixed(3) + ')';

      var aside = clamp01((p - SHRINK_FROM) / 0.08);
      statement.style.opacity = String(1 - aside);
      statement.style.visibility = aside === 1 ? 'hidden' : '';
      if (footer) {
        footer.style.opacity = String(1 - aside);
        footer.style.visibility = aside === 1 ? 'hidden' : '';
      }

      var fill = clamp01((p - TEXT_FILL_FROM) / (TEXT_FILL_BY - TEXT_FILL_FROM));
      var want = Math.round(fill * letters.length);
      if (want > read) {
        for (var i = read; i < want; i++) letters[i].className = 'is-read';
      } else if (want < read) {
        for (var j = read - 1; j >= want; j--) letters[j].className = '';
      }
      read = want;

      if (!video.duration) return;

      /* The section pinning is what starts the flight. */
      if (p > 0 && !introStarted) startIntro();

      /* A fast scroller does not get held inside the intro. */
      if (introStarted && handOver === null && p > 0.3) endIntro();

      if (handOver === null) return;
      if (!video.paused) video.pause();
      seek(handOver + p * (video.duration - handOver));
      scene.dataset.cameraEnd = String(video.duration);
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
