/*
 * Hero scene.
 *
 * The clip is a single continuous move through orbit, so it is treated as a
 * camera rather than a looping background:
 *
 *   1. On load it plays forward for INTRO_SECONDS and stops where it gets to.
 *   2. From then on the scroll position drives `currentTime` — scrolling moves
 *      the camera, stopping stops it. It never plays on its own again.
 *   3. The hero copy clears out over the first stretch of that scroll, so the
 *      move carries the section on its own.
 *
 * The page is `--scene-length` tall and the stage is pinned to the top of it;
 * that extra height is the scroll the camera is mapped onto.
 */
(function () {
  var INTRO_SECONDS = 1.2; // plays on load, then holds
  /*
   * Where the camera stops, in seconds.
   *
   * Measured off the framed clip: the planet sweeps out of shot by about 3.4s,
   * and from roughly 5.75s a flare grows until the frame is solid white. Ending
   * on the planet's exit keeps the whole of that move and stops well short of
   * the flare — going further would buy a couple of seconds of empty space and
   * then blow the frame out.
   */
  var SCENE_END = 3.4;
  var COPY_FADE = 0.28; // fraction of the scroll the copy fades over
  var COPY_RISE = 48; // px the copy drifts up as it goes
  var SEEK_EPSILON = 0.008; // ignore seeks smaller than a third of a frame

  var scene = document.querySelector('[data-scene]');
  var video = document.querySelector('[data-scene-video]');
  var copy = document.querySelector('[data-scene-copy]');
  if (!scene || !video || !copy) return;

  /* Reduced motion: no pinning, no scrub — the poster carries the section. */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    scene.style.height = 'auto';
    return;
  }

  /*
   * Where the intro actually stopped. Null while it is still running.
   *
   * This is read off the video rather than assumed to be INTRO_SECONDS: the
   * clip will always overshoot the cutoff by a frame or two, and rewinding it
   * to a round number would show as a visible hitch backwards at the exact
   * moment the motion settles.
   */
  var introEnd = null;
  var queued = false;
  var pendingSeek = null;

  function cameraEnd() {
    return video.duration ? Math.min(SCENE_END, video.duration) : SCENE_END;
  }

  function progress() {
    var travel = scene.offsetHeight - window.innerHeight;
    if (travel <= 0) return 0;
    return Math.min(1, Math.max(0, -scene.getBoundingClientRect().top / travel));
  }

  function endIntro() {
    if (introEnd !== null) return;
    video.pause();
    introEnd = video.currentTime;
  }

  /*
   * Seeks are asynchronous, and issuing a new one while the last is still in
   * flight makes the browser drop frames. So only the most recent request is
   * kept, and it goes out as soon as the video is free — re-fired on `seeked`
   * so the final position always lands even after the scrolling has stopped.
   */
  function flushSeek() {
    if (pendingSeek === null || video.seeking) return;
    var t = pendingSeek;
    pendingSeek = null;
    if (Math.abs(video.currentTime - t) > SEEK_EPSILON) video.currentTime = t;
  }

  function render() {
    queued = false;
    var p = progress();

    var fade = Math.min(1, p / COPY_FADE);
    copy.style.opacity = String(1 - fade);
    copy.style.transform =
      'translateY(calc(-50% - ' + (fade * COPY_RISE).toFixed(1) + 'px))';
    copy.style.pointerEvents = fade === 1 ? 'none' : '';

    /* Scrolling during the intro hands the camera over from wherever it is. */
    if (p > 0) endIntro();
    if (introEnd === null || !video.duration) return;

    /* Past the intro the camera answers to the scroll and nothing else. */
    if (!video.paused) video.pause();
    pendingSeek = introEnd + p * (cameraEnd() - introEnd);
    flushSeek();
  }

  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(render);
  }

  /*
   * Watch the intro on the frame clock rather than `timeupdate`, which only
   * fires about four times a second — far too coarse to stop on a mark.
   */
  function watchIntro() {
    if (introEnd !== null) return;
    if (video.currentTime >= INTRO_SECONDS || video.ended) {
      endIntro();
      return;
    }
    requestAnimationFrame(watchIntro);
  }

  video.addEventListener('seeked', flushSeek);
  video.addEventListener('loadedmetadata', function () {
    /* Published for tools/playback.mjs, which checks where the camera rests. */
    scene.dataset.cameraEnd = String(cameraEnd());
    render();
  });

  video
    .play()
    .then(watchIntro)
    .catch(function () {
      /* Autoplay refused — hand straight over to the scroll from frame one. */
      endIntro();
      render();
    });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
})();
