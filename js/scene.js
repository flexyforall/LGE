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

  var HERO_TAIL = 2; // seconds of video 2 played on load, after video 1 ends
  var COPY_FADE = 0.22; // fraction of the hero scroll the copy fades over
  var COPY_RISE = 48; // px the copy drifts up as it goes
  var FLASH_IN_FROM = 0.86; // the hero whites out over its last stretch
  var FLASH_FADE = 0.16; // fraction of the role scroll the white flash lifts over
  var TEXT_FILL_FROM = 0.16; // the statement starts filling once the flash is gone
  var TEXT_FILL_BY = 0.72; // ...and is fully read by here
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
    if (!frame || !first || !second || !copy) return;

    if (reduced) {
      scene.style.height = 'auto';
      return;
    }

    var seek = seeker(second);
    /*
     * Where video 2 was when the scroll took over, and the origin the scrub
     * runs from. Null while the intro is still running.
     *
     * It is read off the video rather than assumed to be HERO_TAIL: playback
     * always overshoots the mark by a frame or two, and rewinding onto a round
     * number shows as a hitch backwards just as the motion settles.
     */
    var handOver = null;

    function showSecond() {
      frame.dataset.heroStage = '2';
    }

    function endIntro() {
      if (handOver !== null) return;
      first.pause();
      second.pause();
      showSecond();
      if (second.currentTime >= HERO_TAIL) {
        handOver = second.currentTime;
      } else {
        /* Scrolled before video 2 had its turn — start the scrub at the mark. */
        handOver = HERO_TAIL;
        seek(HERO_TAIL);
      }
    }

    function watchTail() {
      if (handOver !== null) return;
      if (second.currentTime >= HERO_TAIL || second.ended) {
        endIntro();
        return;
      }
      requestAnimationFrame(watchTail);
    }

    function startTail() {
      if (handOver !== null) return;
      showSecond();
      second.play().then(watchTail).catch(endIntro);
    }

    /*
     * Watch on the frame clock rather than `timeupdate`, which only fires about
     * four times a second — far too coarse to change over on a mark.
     */
    function watchFirst() {
      if (handOver !== null) return;
      if (first.ended || (first.duration && first.currentTime >= first.duration - 0.05)) {
        startTail();
        return;
      }
      requestAnimationFrame(watchFirst);
    }

    first.addEventListener('ended', startTail);
    first.play().then(watchFirst).catch(endIntro);

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
      if (flash) {
        flash.style.opacity = String(clamp01((p - FLASH_IN_FROM) / (1 - FLASH_IN_FROM)));
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

    var video = scene.querySelector('[data-role-video]');
    var statement = scene.querySelector('[data-role-text]');
    var flash = scene.querySelector('[data-role-flash]');
    if (!video || !statement) return;

    var letters = splitCharacters(statement);

    if (reduced) {
      scene.style.height = 'auto';
      if (flash) flash.style.display = 'none';
      for (var i = 0; i < letters.length; i++) letters[i].className = 'is-read';
      return;
    }

    var seek = seeker(video);
    var read = 0;

    register(function () {
      var p = progressOf(scene);

      /*
       * The hero hands over on a frame of solid white; this lifts that white
       * off video 3, which reads as falling out of the flash into the tunnel.
       */
      if (flash) {
        var lift = clamp01(p / FLASH_FADE);
        flash.style.opacity = String(1 - lift);
        flash.style.visibility = lift === 1 ? 'hidden' : '';
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
      if (!video.paused) video.pause();
      seek(p * video.duration);
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
