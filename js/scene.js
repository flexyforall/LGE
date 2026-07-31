/*
 * Hero scene.
 *
 * The clip is a single continuous move through orbit, so it is treated as a
 * camera rather than a looping background:
 *
 *   1. On load it plays forward for INTRO_SECONDS and holds there.
 *   2. From then on the scroll position drives `currentTime` — scrolling moves
 *      the camera, stopping stops it. It never plays on its own again.
 *   3. The hero copy clears out over the first stretch of that scroll, so the
 *      move continues on its own.
 *
 * The page is `--scene-length` tall and the stage is pinned to the top of it;
 * that extra height is the scroll the camera is mapped onto.
 */
(function () {
  var INTRO_SECONDS = 2.5; // plays on load, then holds
  var COPY_FADE = 0.28; // fraction of the scroll the copy fades over
  var COPY_RISE = 48; // px the copy drifts up as it goes
  var CHROME_FADE_FROM = 0.82; // the clip washes to white at the end, and the
  // nav is white — so it clears out over the last stretch rather than
  // dissolving into the frame.

  var scene = document.querySelector('[data-scene]');
  var video = document.querySelector('[data-scene-video]');
  var copy = document.querySelector('[data-scene-copy]');
  var chrome = document.querySelector('[data-scene-chrome]');
  if (!scene || !video || !copy) return;

  /* Reduced motion: no pinning, no scrub — the poster carries the section. */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    scene.style.height = 'auto';
    return;
  }

  var duration = 0;
  var handedOver = false; // true once the scroll has taken the camera
  var queued = false;

  function progress() {
    var travel = scene.offsetHeight - window.innerHeight;
    if (travel <= 0) return 0;
    return Math.min(1, Math.max(0, -scene.getBoundingClientRect().top / travel));
  }

  function render() {
    queued = false;
    var p = progress();

    var fade = Math.min(1, p / COPY_FADE);
    copy.style.opacity = String(1 - fade);
    copy.style.transform =
      'translateY(calc(-50% - ' + (fade * COPY_RISE).toFixed(1) + 'px))';
    copy.style.pointerEvents = fade === 1 ? 'none' : '';

    if (chrome) {
      var chromeFade = Math.min(
        1,
        Math.max(0, (p - CHROME_FADE_FROM) / (1 - CHROME_FADE_FROM))
      );
      chrome.style.opacity = String(1 - chromeFade);
      chrome.style.pointerEvents = chromeFade === 1 ? 'none' : '';
    }

    if (p > 0) handedOver = true;
    if (!handedOver || !duration) return;

    /* Past the intro the camera answers to the scroll and nothing else. */
    if (!video.paused) video.pause();
    var t = INTRO_SECONDS + p * (duration - INTRO_SECONDS);
    if (Math.abs(video.currentTime - t) > 0.01) video.currentTime = t;
  }

  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(render);
  }

  video.addEventListener('loadedmetadata', function () {
    duration = video.duration;
    render();
  });

  /* Hold the intro on its last frame rather than running the whole clip. */
  video.addEventListener('timeupdate', function () {
    if (!handedOver && video.currentTime >= INTRO_SECONDS) {
      video.pause();
      video.currentTime = INTRO_SECONDS;
    }
  });

  video.play().catch(function () {
    /* Autoplay refused — the scroll still drives the camera from frame one. */
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
})();
