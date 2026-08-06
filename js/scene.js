/*
 * Scene choreography.
 *
 * Two pinned sections, each taller than the window. The surplus height is the
 * scroll their cameras are mapped onto.
 *
 *   Hero    the one section that is not scrolled through: it holds the window,
 *           its clip idling on a loop, until it is asked to let go — by a
 *           click, or by a scroll, which opens the same door rather than
 *           taking the clip over. Either way one move runs on its own clock:
 *           the copy clears, the clip carries on from whatever frame the loop
 *           was on to its last, where the light has filled the screen, and the
 *           page is handed to the tunnel below. A cursor of its own says so.
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
  /*
   * Where the transition itself begins in the joined clip. The click goes
   * straight here rather than rushing the rest of the flight past first — it
   * is one shot either side of the join, so what is skipped is more of the
   * same rather than a cut to somewhere else. If the loop is already past
   * this, it carries on from where it is: never backwards.
   */
  var HERO_TRANSITION_FROM = 12;
  var HERO_SCRUB_FROM = 0.02; // where the run takes the clip off its loop...
  var HERO_SCRUB_BY = 0.92; // ...and has carried it to the last frame by here
  var FLASH_IN_FROM = 0.86; // the sheet closes whatever white the clip left short
  /*
   * The hero is not scrolled through — it holds the window until it is
   * clicked. This is how long the click's run takes: the copy clears, the
   * clip carries on to its last frame, and the white lands.
   */
  var HERO_RUN_MS = 3200;
  var HERO_LAND_MS = 900; // ...and how long the white takes to lift off the tunnel
  /*
   * A scroll opens the same door as a click, and runs the same one-shot move —
   * the clip is never handed to the scroll to drag through frame by frame.
   * This is how far down the wheel has to ask before the hero lets go, which
   * is far enough that a stray tick of trackpad noise does not send the page
   * off on its own.
   */
  var HERO_PUSH = 40;
  var CURSOR_EASE = 0.22; // fraction of the distance the cursor closes per frame
  var CURSOR_LEAVE_MS = 520; // ...and how long its line takes to turn itself out
  var CURSOR_TYPE_MS = 34; // ms per character as that line writes itself on
  var CURSOR_HOLD_MS = 1700; // ...and how long it stands before it is written again
  /*
   * The cursor's own two squares answer the pointer's movement rather than its
   * position: they are carried apart across the frame — sideways only, never
   * up or down — and draw back level as soon as it stops.
   */
  var SQUARE_THROW = 16; // px the furthest either one is carried
  var SQUARE_GAIN = 0.4; // how much of a move's distance it is pushed by
  var SQUARE_BLEED = 0.84; // how much of that push survives each frame
  var SQUARE_EASE = 0.2; // ...and how much of the way it closes on it
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
  /*
   * The way out is the same wipe, driven by the hero's run rather than a
   * clock, so this stagger is a share of that run rather than milliseconds.
   */
  var EXIT_STAGGER = 0.12;

  /*
   * Outside the spacecraft. The section runs two clips end to end, so its
   * scroll is read as two legs and every fraction below is a fraction of
   * whichever leg it belongs to rather than of the section.
   *
   * The lengths are the ones --scene-length-flight is built out of: the
   * cupola leg keeps the 420 of scroll it has always had, and the orbit that
   * carries on from it is given 560 more. Changing either means changing that
   * custom property to match.
   */
  var FLIGHT_CUPOLA_VH = 420;
  var FLIGHT_ORBIT_VH = 560;
  var FLIGHT_SPLIT = FLIGHT_CUPOLA_VH / (FLIGHT_CUPOLA_VH + FLIGHT_ORBIT_VH);
  /*
   * The scroll the hand-over is dissolved across. The cupola clip's last
   * frame and the orbit clip's first are the same moment of the same move,
   * one twenty-fourth of a second apart, so this is not there to hide a cut
   * — it is there so that a frame the second clip has not painted yet can
   * never show as a flash of black.
   */
  var FLIGHT_SEAM = 0.006;
  /*
   * The orbit clip opens by backing away. The cupola leg ends closing on the
   * satellite hard — its last frames gain on it faster and faster — and the
   * clip that takes over eases out of that move by pulling back about a fifth
   * over its first thirty-five frames, not returning to the size it opened on
   * until frame seventy. Cut together, that reads as the camera stopping and
   * rolling back just after the hand-over.
   *
   * Starting the clip later does not answer it: the frame it opens on is the
   * one the cupola closes on almost exactly, and every later frame has the
   * satellite turned some way round, so any other cut is a visible jump — and
   * one still a fifth smaller, which is the same rollback in a single step.
   *
   * So the pull-back is cancelled optically instead: the picture is scaled by
   * the inverse of what the render gives away, read off the clip frame by
   * frame, and let back down only as the clip's own approach takes over.
   * Times are seconds into the clip; at the join it is exactly 1, so the
   * hand-over itself is untouched.
   */
  var ORBIT_HOLD = [
    [0.0, 1.0], // the join, left exactly as it is
    [0.2, 1.09], // most of the ground is given away in the first half second
    [0.4, 1.17],
    [0.7, 1.23],
    [1.3, 1.25], // the pull-back is at its worst about here...
    [1.8, 1.24], // ...and holds there
    [2.1, 1.18],
    [2.35, 1.09],
    [2.55, 1.0], // by here the clip is closing again under its own power
  ];
  /*
   * The point it is scaled about is where the satellite sits across that
   * stretch rather than the middle of the window — scaling about the middle
   * would swing it outwards as it grows. That is `transform-origin` on
   * .card__media--orbit in the stylesheet.
   */
  /*
   * Fractions of the orbit leg: where the second and third points arrive.
   * Both wait out the stretch above — the copy should change on a camera
   * that is moving, not on one being held still.
   *
   * The third stands as far down the clip as the section will carry it. The
   * two intervals cannot be made equal: the first runs from the first point,
   * which arrives before the hand-over, all the way through the second's
   * three-second wait into the clip, and the third would have to sit past
   * the end of the clip to match it — the leg would have to be four times
   * this long. So the third is put where it still has a window to be read in
   * before the section below covers it, which halves the difference rather
   * than closing it.
   */
  var POINT_2_FROM = 0.42;
  var POINT_3_FROM = 0.72;
  /*
   * The three points read off the orbit, in the order it brings them round.
   * The first is the one the frame draws, and stands from DEVICE_FROM on the
   * cupola leg through the hand-over until the second comes up.
   */
  var FLIGHT_POINTS = [
    {
      title: 'Power.',
      body: 'Generate and transfer power through plasma-based systems.',
    },
    {
      title: 'Connect.',
      body: 'Relay data between orbital platforms through high-bandwidth laser links.',
    },
    {
      title: 'Sustain.',
      body: 'Support persistent operations in VLEO with plasma propulsion.',
    },
  ];

  /* Fractions of the cupola leg's own scroll. */
  var FLIGHT_PREROLL = 1.2; // seconds the clip creeps through while the card scales
  var FLIGHT_WIDEN_BY = 0.09; // the card has widened across both by here...
  var FLIGHT_OPEN_BY = 0.24; // ...and has taken the whole window by here
  /*
   * ...and the cupola clip has run to its end by here — the end of its own
   * leg, where the orbit picks the move up on the next frame.
   */
  var FLIGHT_RUN_BY = 1;
  var TEXT_IN_FROM = 0.26; // the intro copy writes on over the flight...
  var TEXT_IN_BY = 0.6; // ...and has written itself out again by here
  var DEVICE_FROM = 0.68; // the first point arrives with the satellite
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

  /* ------------------------------------------------------------------ *
   * Use cases — fractions of that section's own scroll
   * ------------------------------------------------------------------ */
  /*
   * The line assembles itself out of characters arriving in no order at all,
   * each landing whole and each taking up no room until it does — so every
   * line holds the centre and grows outward out of nothing.
   */
  var USE_TITLE_BY = 0.14;
  /*
   * The section runs a whole sequence, and these are its marks. The line
   * assembles; the three cards run through and the last one leaves with the
   * others; the foot is rubbed out; a second line assembles in its place; the
   * strip's cards fly in and stack into their row, taking that line with them
   * as they land; and from there the strip is browsed to the end.
   */
  var USE_CARDS_BY = 0.72; // the last card has left by here
  var USE_FOOT_OUT_FROM = 0.71; // the foot is wiped out, and the line with it
  var USE_FOOT_OUT_BY = 0.78;
  /*
   * ...and the second line takes the frame. The ground turns over with it —
   * from the black the cards ran on to the white the newsroom below is set
   * on — so the two sections meet on the same paper and this line is in ink
   * rather than in white.
   */
  var USE_WHITE_FROM = 0.78;
  var USE_WHITE_BY = 0.92;
  var USE_TITLE2_FROM = 0.72;
  var USE_TITLE2_BY = 0.86;
  /*
   * ...and then it stops being a headline in the middle of a frame and
   * becomes the newsroom's own head: it shrinks from its 110 to that head's
   * 56 and travels to its place at the top left. The section below stands on
   * the same white and sets its head identically, so when this lands the two
   * are the same line in the same place and the hand-over cannot be seen.
   */
  var USE_MOVE_FROM = 0.88;
  var USE_MOVE_BY = 1;
  var HEAD_SIZE = 56 / 110; // the head's type against the big line's
  /*
   * It is dimmed by whatever is standing over it rather than by the scroll:
   * the further a card is from the centre the more of the line is left, and
   * only a card actually across it takes it all the way down.
   */
  var USE_DIM_TO = 0.1; // the frame's own 0.2 over a colour already at 0.5
  var USE_DIM_OVER = 210; // px of approach the dimming is spread across
  /*
   * And the mark a card leaves as it crosses: a ring of the accent running
   * out from the middle of the line and off its ends. Fast, and once per
   * card — it is armed again only after that card has cleared the line.
   */
  /*
   * The blue ground comes up under the line as the first card is about to
   * rise into the frame. The section opens on black — the line assembles
   * against nothing — and this is in by the time the card shows.
   */
  var USE_GLOW_FROM = 0.12;
  var USE_GLOW_BY = 0.22;
  var WAVE_MS = 760; // the ring's whole run
  var WAVE_BAND = 190; // px of the ring's own width
  var WAVE_FROM = 0.55; // the overlap that sets it off...
  var WAVE_REARM = 0.2; // ...and the one it can be set off from again
  /*
   * And the cards run. Each rises from below the fold, stands a while on its
   * own place across the frame, and carries on up and out as the next comes —
   * so one is always leaving as another arrives, and they are never stacked in
   * a single column.
   */
  var USE_CARDS_FROM = 0.16;
  var USE_CARD_X = [0, -118, 96]; // px across the frame, each its own
  var USE_CARD_W = 550;
  var USE_CARD_H = 354;
  /*
   * A card comes up a shade small and reaches its full size as it arrives, so
   * it reads as coming forward rather than sliding across; and it leans a
   * little under the pointer, eased so it settles rather than tracks.
   */
  var USE_CARD_SCALE = 0.92;
  /*
   * ...and the picture inside it pushes in a little of its own accord across
   * the whole of the card's pass, so the shot is still moving even while the
   * card itself is standing still on its mark.
   */
  var USE_PIC_ZOOM = 0.14;
  /*
   * 407:2627 against 407:2635 — the same picture at 1.089 of its box once it
   * is across the line, against 0.98 on the way there. The marks come with
   * that growth and go with it: 8px, their outer corners the design's 20 off
   * the picture, and held out of what is scaled so they keep their own size.
   */
  var USE_CARD_OVER = 1.089;
  var USE_MARK_OUT = 20;
  var USE_CARD_LEAN = 5; // degrees at the far corners of the window
  var USE_CARD_DRIFT = 26; // px it follows the pointer across
  var USE_LEAN_EASE = 0.09;
  var USE_TITLE_H = 240; // the line's own two rows, for the overlap above
  var USE_STATES = [
    {
      name: 'Orbital data centers',
      body: 'Support scalable computing infrastructure beyond the limits of terrestrial data centers.',
    },
    {
      name: 'Orbital connectivity',
      body: 'Enable high-capacity data transfer between platforms in orbit and the ground.',
    },
    {
      name: 'Crewed operations',
      body: 'Carry power and a continuous link to missions far beyond low Earth orbit.',
    },
  ];

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

  /*
   * Writes a line on one character at a time.
   *
   * With `hold` it never finishes: the line stands for that long, is rubbed
   * out the way it was written, and writes itself again — so the cursor's
   * invitation is always being typed rather than typed once and left.
   *
   * Returns the switch: called with nothing it starts afresh from empty,
   * called with false it stops on the whole line.
   */
  function typeOn(el, ms, hold) {
    if (!el) return function () {};
    var text = el.textContent;
    var timer = null;

    function at(n) {
      el.textContent = text.slice(0, n);
    }

    function write(n) {
      at(n);
      if (n < text.length) {
        timer = setTimeout(function () {
          write(n + 1);
        }, ms);
      } else if (hold) {
        timer = setTimeout(function () {
          rub(text.length);
        }, hold);
      }
    }

    /* Out faster than in — a line is rubbed out more quickly than written. */
    function rub(n) {
      at(n);
      timer = setTimeout(
        n > 0
          ? function () {
              rub(n - 1);
            }
          : function () {
              write(0);
            },
        n > 0 ? ms / 2 : ms * 4
      );
    }

    return function (go) {
      if (timer) clearTimeout(timer);
      timer = null;
      /* A stopped line stands whole — never caught halfway through itself. */
      if (go === false) return void at(text.length);
      write(0);
    };
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
    rotator(scene.querySelector('[data-hero-tag]'), 'hero__tagLine', TAG_LINES, TAG_PERIOD);
  }

  /*
   * The generalised turn-over: one line lives in the box at a time, each new
   * one tipping in from below while the old tips up and away, and the box's
   * width gliding to the new line's. Which edge holds still is the CSS's
   * business — the tag's lines anchor left, the verify row's right.
   */
  function rotator(box, lineClass, LINES, period) {
    if (!box) return;

    var current = box.querySelector('.' + lineClass);
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
      probe.className = lineClass;
      probe.style.visibility = 'hidden';
      probe.textContent = text;
      box.appendChild(probe);
      var w = probe.getBoundingClientRect().width;
      probe.remove();
      return w / scaleOf();
    }

    function fit() {
      box.style.width = widthOf(LINES[idx]) + 'px';
    }

    /* Fonts land late and change the measurement — fit again when they do. */
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    window.addEventListener('resize', fit);

    if (reduced) return;

    setInterval(function () {
      idx = (idx + 1) % LINES.length;

      var next = document.createElement('span');
      next.className = lineClass + ' is-in';
      next.textContent = LINES[idx];
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
    }, period);
  }

  /*
   * The hero's own progress. Where every other section reads its position off
   * the scroll, this one is written by the click's clock — the hero holds the
   * window and never scrolls, so there is no scroll to read.
   */
  var heroP = 0;

  /* Slow at both ends, so the run gathers and then settles rather than snaps. */
  function easeInOut(k) {
    return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  }

  /** Eases the page from one scroll position to another over `ms`. */
  function tweenScroll(from, to, ms, done) {
    var t0 = null;
    requestAnimationFrame(function step(now) {
      if (t0 === null) t0 = now;
      var k = clamp01((now - t0) / ms);
      window.scrollTo(0, Math.round(from + (to - from) * easeInOut(k)));
      if (k < 1) requestAnimationFrame(step);
      else if (done) done();
    });
  }

  /*
   * How hard a move tops up the push the two squares are under, and the stop
   * it is held to. Both the hero's cursor and the newsroom's lens carry their
   * squares by it, so it is written once here.
   */
  function carry(v, by) {
    var n = v + by * SQUARE_GAIN;
    return n > SQUARE_THROW ? SQUARE_THROW : n < -SQUARE_THROW ? -SQUARE_THROW : n;
  }

  /*
   * The cursor that stands in for the pointer over the hero, and the drift it
   * gives the two squares beside the tag: each goes the opposite way as the
   * pointer crosses the window, a few pixels at the very edges. Both are eased
   * toward their target rather than set to it, so the cursor trails the
   * pointer and the squares glide instead of tracking.
   */
  function setUpCursor(scene, live) {
    var el = document.querySelector('[data-hero-cursor]');
    var squares = el ? el.querySelectorAll('.cursor__square') : [];
    if (!el || reduced) return function () {};

    var tx = 0, ty = 0, x = 0, y = 0, placed = false;
    var on = false;
    var leaving = false;
    /*
     * The push the two squares are under: how hard the pointer was last moved
     * across, and which way. It is topped up by each move and bleeds away
     * every frame, so it stands for how the pointer is moving rather than
     * where it is — which is what brings the squares back level the moment it
     * stops. Only sideways: they never travel up or down.
     */
    var want = 0;
    var push = 0;
    var lastX = null;

    /* Its line writes itself on, over and over, the whole time it is up. */
    var retype = typeOn(el.querySelector('.cursor__label'), CURSOR_TYPE_MS, CURSOR_HOLD_MS);

    function show(next) {
      /* Mid-exit the cursor answers to nothing — its turn plays out. */
      if (leaving || next === on) return;
      on = next;
      el.classList.toggle('is-on', on);
      retype(on);
    }

    scene.addEventListener('mousemove', function (event) {
      tx = event.clientX;
      ty = event.clientY;
      if (!placed) {
        placed = true;
        x = tx;
        y = ty;
      }
      if (lastX !== null) want = carry(want, tx - lastX);
      lastX = tx;
      /* Over a link or a button the pointer means what it usually means. */
      show(live() && !event.target.closest('a, button'));
    });

    scene.addEventListener('mouseleave', function () {
      show(false);
      lastX = null;
      lastY = null;
    });

    (function follow() {
      requestAnimationFrame(follow);
      /* Nothing on screen and nothing left to settle — no work to do. */
      if (!on && Math.abs(push) < 0.05 && Math.abs(tx - x) < 0.5) return;

      x += (tx - x) * CURSOR_EASE;
      y += (ty - y) * CURSOR_EASE;
      el.style.transform =
        'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) translate(-50%,-50%)';

      /*
       * The squares are carried apart across the frame as the pointer moves —
       * the top one with it and the bottom one against, so they separate
       * rather than shift together. The want bleeds off each frame, so they
       * draw back level as soon as the pointer settles.
       */
      want *= SQUARE_BLEED;
      push += (want - push) * SQUARE_EASE;
      for (var i = 0; i < squares.length; i++) {
        squares[i].style.setProperty('--px', ((i % 2 ? -1 : 1) * push).toFixed(2) + 'px');
      }
    })();

    /*
     * On the way out the line turns a full circle before the cursor fades, so
     * the click is answered by the thing that asked for it. If the pointer was
     * never over the hero there is nothing standing there to take its leave.
     */
    return function () {
      want = 0;
      /* The line stops where it is and stands whole as it tips away. */
      retype(false);
      if (!on || leaving) return;
      leaving = true;
      el.classList.add('is-leaving');
      setTimeout(function () {
        leaving = false;
        show(false);
        el.classList.remove('is-leaving');
      }, CURSOR_LEAVE_MS);
    };
  }

  function setUpHero() {
    var scene = document.querySelector('[data-scene="hero"]');
    if (!scene) return;

    var video = scene.querySelector('[data-hero-video]');
    var copy = scene.querySelector('[data-scene-copy]');
    var flash = scene.querySelector('[data-hero-flash]');
    if (!video || !copy) return;

    setUpTag(scene);
    /*
     * The hero is clicked through exactly once. Its cursor belongs to that
     * hold and is spent with it — afterwards the section is an ordinary one,
     * with an ordinary pointer.
     */
    var spent = false;
    var dropCursor = setUpCursor(scene, function () {
      return !spent;
    });

    if (reduced) {
      scene.style.height = 'auto';
      return;
    }

    /*
     * The reveal. Both blocks hide before first paint and wipe on once the
     * fonts have landed — splitting sooner would measure fallback metrics.
     */
    var headline = scene.querySelector('.hero__headline');
    var lead = scene.querySelector('.hero__lead');
    if (headline) headline.style.opacity = '0';
    if (lead) lead.style.opacity = '0';
    var fontsReady =
      document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

    /*
     * The lines are kept so the way out can be the way in run backwards. The
     * sets are held separately from the flat list because cancelling belongs
     * to the set a reveal was started on.
     */
    var revealSets = [];
    var wipeLines = [];

    function keep(lines) {
      revealSets.push(lines);
      wipeLines = wipeLines.concat(lines);
    }

    fontsReady.then(function () {
      if (headline) {
        headline.style.opacity = '';
        keep(blockReveal(headline));
      }
      if (lead) {
        setTimeout(function () {
          lead.style.opacity = '';
          keep(blockReveal(lead));
        }, 2 * REVEAL_STAGGER);
      }
    });

    /*
     * Everything in the hero that did not arrive on a wipe leaves on a fade —
     * the tag row, the button, the note and the partner strip. The two that
     * did are driven by wipeOut instead, so the fade is put on these rather
     * than on the block that holds them all.
     */
    var fades = scene.querySelectorAll(
      '.hero__tag, .hero__content .button, .verify, .logos'
    );

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

    /*
     * The hero holds the window from the off. Restoration is switched off so a
     * reload cannot drop the page somewhere below the held section, where
     * nothing would scroll.
     */
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    document.documentElement.classList.add('is-held');

    /*
     * The click. It runs the hero's progress from 0 to 1 on a clock, and every
     * move below is mapped off that exactly as it was off the scroll — the
     * copy clears, the clip carries on to its last frame, the sheet finishes
     * the white. When the white is total the page is moved underneath it, so
     * the jump to the tunnel happens on a frame with nothing in it, and the
     * last beat lifts that white to leave the tunnel running.
     */
    function explore() {
      if (spent) return;
      spent = true;
      dropCursor();
      /* The reveal lets go of the lines so the exit can take them over. */
      for (var r = 0; r < revealSets.length; r++) revealSets[r].cancelled = true;

      var t0 = null;
      requestAnimationFrame(function step(now) {
        if (t0 === null) t0 = now;
        var k = clamp01((now - t0) / HERO_RUN_MS);
        heroP = easeInOut(k);
        paint();
        if (k < 1) return void requestAnimationFrame(step);

        var role = document.querySelector('[data-scene="role"]');
        document.documentElement.classList.remove('is-held');
        if (!role) return;

        var top = role.offsetTop;
        var travel = role.offsetHeight - window.innerHeight;
        window.scrollTo(0, top);
        tweenScroll(top, top + travel * FLASH_FADE, HERO_LAND_MS, function () {
          /*
           * Put the hero back the way it was found. It is off screen by now,
           * so none of this is seen — but scrolling back up should find the
           * hero idling under its clip, not standing on the white frame it
           * was left on.
           */
          heroP = 0;
          paint();
        });
      });
    }

    function held() {
      return document.documentElement.classList.contains('is-held');
    }

    scene.addEventListener('click', function (event) {
      /* The button and the menu's tabs are clicks in their own right. */
      if (event.target.closest('a, button')) return;
      explore();
    });

    /*
     * Asking to scroll down opens the same door, and runs the same move: the
     * clip plays its transition through on its own clock rather than being
     * dragged frame by frame under the wheel. Asking to go back up is not an
     * answer, so the count starts over.
     */
    var pushed = 0;

    window.addEventListener(
      'wheel',
      function (event) {
        if (spent || !held()) return;
        if (event.deltaY <= 0) {
          pushed = 0;
          return;
        }
        var d = event.deltaY;
        if (event.deltaMode === 1) d *= 16; // lines -> px
        else if (event.deltaMode === 2) d *= window.innerHeight;
        pushed += d;
        if (pushed >= HERO_PUSH) explore();
      },
      { passive: true }
    );

    /* A swipe up is the same request on a touch screen. */
    var from = null;

    window.addEventListener(
      'touchstart',
      function (event) {
        from = event.touches[0].clientY;
      },
      { passive: true }
    );

    window.addEventListener(
      'touchmove',
      function (event) {
        if (spent || !held() || from === null) return;
        if (from - event.touches[0].clientY >= HERO_PUSH) explore();
      },
      { passive: true }
    );

    /* ...and the keys that would have scrolled it, for anyone not pointing. */
    document.addEventListener('keydown', function (event) {
      var keys = ['Enter', ' ', 'ArrowDown', 'PageDown', 'End'];
      if (keys.indexOf(event.key) < 0 || !held()) return;
      var focused = document.activeElement;
      if (focused && focused.closest('a, button')) return;
      event.preventDefault();
      explore();
    });

    register(function () {
      var p = heroP;

      /*
       * Off the loop, the run drives the clip on from exactly the frame the
       * loop was showing — not from a fixed mark — so there is nothing to jump
       * over. The anchor is dropped when the hero is put back, and the loop
       * picks up again from wherever it was left.
       */
      if (p < HERO_SCRUB_FROM) {
        if (anchor !== null) {
          anchor = null;
          video.play().catch(function () {});
        }
      } else {
        if (anchor === null) {
          /* Straight to the transition, unless the loop is already past it. */
          anchor = Math.max(video.currentTime, HERO_TRANSITION_FROM);
          video.pause();
        }
        if (video.duration) {
          var t = clamp01((p - HERO_SCRUB_FROM) / (HERO_SCRUB_BY - HERO_SCRUB_FROM));
          seek(anchor + t * (video.duration - anchor));
        }
      }

      /*
       * The copy leaves the way it arrived: the headline and the lead are
       * wiped out under the same rectangle that uncovered them, and the rest
       * fades. The whole block still drifts up as it goes.
       */
      /*
       * Written as `--fade`, not as opacity. Some of these are not meant to
       * stand at full strength even before the hero starts leaving — the
       * partner row is held well back — and an opacity written straight on
       * would have overruled the sheet's resting value from the first frame.
       * The sheet multiplies its own by this instead.
       */
      var fade = Math.min(1, p / COPY_FADE);
      for (var f = 0; f < fades.length; f++)
        fades[f].style.setProperty('--fade', (1 - fade).toFixed(3));
      wipeOut(wipeLines, fade);
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
      /* The exit takes the line over; two hands on it would fight per frame. */
      if (lines.cancelled) return;
      if (t0 === null) t0 = now;
      var settled = true;
      for (var i = 0; i < lines.length; i++) {
        var raw = (now - t0 - i * REVEAL_STAGGER) / REVEAL_MS;
        if (raw < 1) settled = false;
        var k = 1 - Math.pow(1 - clamp01(raw), 3);
        var l = lines[i];
        l.text.style.clipPath = 'inset(-0.25em ' + ((1 - k) * 101).toFixed(2) + '% -0.25em 0)';
        /*
         * From where the text starts, not from where its line does. The
         * rectangle is placed against the line, and on centred copy the text
         * sits in from the line's left edge — so travelling the text's own
         * width from 0 left the rectangle short of the end of the line by
         * exactly that inset. It is 0 on everything set flush left.
         */
        l.block.style.transform =
          'translateX(' + (l.text.offsetLeft + k * l.text.offsetWidth).toFixed(1) + 'px)';
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

  /*
   * The way out is the way in, run backwards: the rectangle starts at the end
   * of the line and travels back to where it set off from, taking the line
   * with it — so the exit rewinds the reveal rather than sweeping on past it.
   * The clip and the rectangle's travel are runReveal's own, with the fraction
   * turned around, which is what makes them land on exactly the state the
   * reveal began in.
   *
   * `p` is a position rather than a clock, so the run can be scrubbed and put
   * back exactly.
   */
  function wipeOut(lines, p) {
    var span = 1 - (lines.length - 1) * EXIT_STAGGER;
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      var k = clamp01((p - i * EXIT_STAGGER) / span);
      if (k === 0) {
        /* Untouched: no clip at all, rather than one that happens to show all. */
        l.text.style.clipPath = '';
        l.block.style.display = 'none';
        continue;
      }
      l.text.style.clipPath = 'inset(-0.25em ' + (k * 101).toFixed(2) + '% -0.25em 0)';
      l.block.style.display = k < 1 ? '' : 'none';
      l.block.style.opacity = k < 1 ? '1' : '0';
      l.block.style.transform =
        'translateX(' + (l.text.offsetLeft + (1 - k) * l.text.offsetWidth).toFixed(1) + 'px)';
    }
  }

  function blockReveal(el, done) {
    var lines = splitIntoLines(el);
    hideReveal(lines);
    runReveal(lines, done);
    return lines;
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
    var cardOn = [];
    var cardLines = [];
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
        /*
         * Each card waits its turn: the second is a tenth of a window later.
         * As one comes on, its copy is wiped in by the block reveal — and
         * reset on the way back out, so scrolling through again replays it.
         */
        var on = progressUp(cards[c], CARDS_RISE_FROM - c * 0.1, CARDS_RISE_BY) > 0;
        if (on !== cardOn[c]) {
          cardOn[c] = on;
          cards[c].classList.toggle('is-in', on);
          if (on) {
            if (!cardLines[c]) {
              cardLines[c] = [];
              cards[c].querySelectorAll('.card__overline, .card__body').forEach(function (el) {
                cardLines[c] = cardLines[c].concat(splitIntoLines(el));
              });
            }
            hideReveal(cardLines[c]);
            runReveal(cardLines[c]);
          } else if (cardLines[c]) {
            hideReveal(cardLines[c]);
          }
        }
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

  /*
   * The compensating scale for a given second of the orbit clip, read off
   * ORBIT_HOLD and eased between its samples so the correction itself never
   * has a corner in it. Past the last sample there is nothing to correct.
   */
  function orbitHold(t) {
    var last = ORBIT_HOLD.length - 1;
    if (t <= ORBIT_HOLD[0][0]) return ORBIT_HOLD[0][1];
    if (t >= ORBIT_HOLD[last][0]) return ORBIT_HOLD[last][1];
    for (var i = 1; i <= last; i++) {
      if (t > ORBIT_HOLD[i][0]) continue;
      var a = ORBIT_HOLD[i - 1];
      var b = ORBIT_HOLD[i];
      var k = (t - a[0]) / (b[0] - a[0]);
      return a[1] + (b[1] - a[1]) * (k * k * (3 - 2 * k));
    }
    return 1;
  }

  function setUpFlight() {
    var scene = document.querySelector('[data-scene="flight"]');
    if (!scene) return;

    var video = document.querySelector('[data-flight-video]');
    var card = video ? video.closest('[data-card]') : null;
    var orbit = card ? card.querySelector('[data-flight-orbit]') : null;
    var row = card ? card.closest('[data-card-row]') : null;
    var intro = scene.querySelector('[data-flight-intro]');
    var introLabel = scene.querySelector('.flight__label');
    var heading = scene.querySelector('[data-flight-text]');
    var device = scene.querySelector('[data-flight-device]');
    var pointTitle = scene.querySelector('[data-flight-point-title]');
    var pointBody = scene.querySelector('[data-flight-point-body]');
    var point = -1;
    if (!video || !card || !heading) return;

    var letters = splitCharacters(heading);
    var seek = seeker(video);
    var seekOrbit = orbit ? seeker(orbit) : null;
    video.pause();
    if (orbit) orbit.pause();

    if (reduced) {
      scene.style.height = 'auto';
      for (var i = 0; i < letters.length; i++) letters[i].className = 'is-in';
      if (device) device.classList.add('is-in');
      return;
    }

    /*
     * A point arriving is the block reveal, the same as the one the use
     * cases' foot runs: the copy is written fresh from the table above — a
     * line that has been split no longer has the spaces that were between
     * the lines in its own textContent — and wiped on again from nothing.
     */
    function showPoint(i) {
      if (i === point) return;
      point = i;
      if (!device) return;
      device.classList.toggle('is-in', i >= 0);
      if (i < 0) return;
      pointTitle.textContent = FLIGHT_POINTS[i].title;
      pointBody.textContent = FLIGHT_POINTS[i].body;
      blockReveal(pointTitle);
      blockReveal(pointBody);
    }

    register(function () {
      var p = progressOf(scene);
      /*
       * Two clips, one move. The section's scroll is split at the frame the
       * cupola clip runs out on: everything the first leg does is read off
       * `p` rescaled to its own length, and the orbit that carries the shot
       * on is read off what is left. Both are clamped, so the first leg
       * simply holds at its end while the second runs.
       */
      var pc = clamp01(p / FLIGHT_SPLIT);
      var po = clamp01((p - FLIGHT_SPLIT) / (1 - FLIGHT_SPLIT));

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
      var widen = clamp01(pc / FLIGHT_WIDEN_BY);
      var zoom = clamp01((pc - FLIGHT_WIDEN_BY) / (FLIGHT_OPEN_BY - FLIGHT_WIDEN_BY));
      /*
       * Where the pinned stage's own top is. It holds at 0 for as long as the
       * section owns the window, and once the section starts leaving it rides
       * up with the page. The opened card is `position: fixed`, so it does not
       * ride with anything on its own — given this it leaves exactly with the
       * copy standing on the same frame, rather than being cut away and
       * leaving the copy to travel up alone.
       */
      var away = Math.min(0, scene.getBoundingClientRect().bottom - window.innerHeight);

      var open = pc >= FLIGHT_OPEN_BY ? 1 : 0;

      if (pc > 0 && pc < FLIGHT_OPEN_BY && row) {
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
          foldNarrow(row, {
            x0: rb.left,
            y: away,
            h: window.innerHeight,
            ww: rb.width,
            rowWidth: rb.width,
          });
        }
        card.style.left = '0px';
        card.style.top = away.toFixed(1) + 'px';
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
        if (p > FLIGHT_SPLIT + FLIGHT_SEAM) {
          /*
           * Past the hand-over the cupola clip is hidden, so it is parked on
           * the frame it handed over on rather than gone on being scrubbed.
           * Parked, not merely left: a page opened at a scroll position past
           * the seam has never run this clip at all, and scrolling back up
           * would otherwise fade in whatever frame it happened to be on.
           */
          seek(video.duration);
        } else {
          var creep = clamp01(pc / FLIGHT_OPEN_BY);
          var run = clamp01((pc - FLIGHT_OPEN_BY) / (FLIGHT_RUN_BY - FLIGHT_OPEN_BY));
          seek(
            run > 0
              ? FLIGHT_PREROLL + run * (video.duration - FLIGHT_PREROLL)
              : creep * FLIGHT_PREROLL
          );
        }
      }

      /*
       * The hand-over. The orbit clip is scrubbed the whole way through the
       * section, not only after the seam: while the cupola still has the
       * screen it is being held on its opening frame, which is the frame the
       * cupola is running toward, so by the time the one above is taken off
       * the picture underneath is already painted and already right.
       *
       * The clip runs on to its end under the section that covers this one,
       * the same as the cupola's used to — the move never stops, it is only
       * covered over.
       */
      if (orbit && orbit.duration) {
        var ot = po * orbit.duration;
        seekOrbit(ot);
        /* ...and the clip's own pull-back taken back out of it. */
        orbit.style.transform = 'scale(' + orbitHold(ot).toFixed(4) + ')';
      }
      video.style.opacity = String(1 - clamp01((p - FLIGHT_SPLIT) / FLIGHT_SEAM));

      /* The intro copy writes itself on over the flight out through the glass. */
      var fill = clamp01((pc - TEXT_IN_FROM) / (TEXT_IN_BY - TEXT_IN_FROM));
      var head = Math.round(fill * (letters.length + TEXT_TRAIL));
      write(letters, head, Math.max(0, head - TEXT_TRAIL));
      if (intro) {
        /* In as the window fills, out once the sentence has written itself off. */
        var shown =
          clamp01((pc - FLIGHT_OPEN_BY) / 0.04) * (1 - clamp01((pc - TEXT_IN_BY) / 0.05));
        intro.style.opacity = String(shown);
        intro.style.visibility = shown === 0 ? 'hidden' : '';
      }

      /*
       * The label leaves ahead of its sentence — holding it to the end left
       * HOW IT WORKS lingering over copy that had already written itself off.
       */
      if (introLabel) {
        introLabel.style.opacity = String(1 - clamp01((pc - LABEL_OUT_FROM) / 0.06));
      }

      /*
       * The points. The first arrives once the satellite is all that is left
       * of the cupola leg and stands through the hand-over; the orbit brings
       * the other two round after it. Each is written and wiped on where the
       * one before stood, so the corner reads as one place being updated
       * rather than three blocks taking turns — and scrolling back up walks
       * the same list backwards, off the end of it to nothing at all.
       */
      var next = -1;
      if (pc >= DEVICE_FROM) next = 0;
      if (po >= POINT_2_FROM) next = 1;
      if (po >= POINT_3_FROM) next = 2;
      showPoint(next);
    });
  }

  /* ------------------------------------------------------------------ *
   * Use cases
   * ------------------------------------------------------------------ */

  /*
   * The page's last section. The line puts itself together out of scattered
   * characters — each landing whole rather than fading in, each arriving in
   * the accent and settling to white the way the tunnel's copy does, and each
   * still to come taking up no room at all, so every line holds the centre
   * and grows outward out of nothing.
   *
   * Once it is whole it dims right back and the cards run over it: each rises
   * from below the fold, stands a while on its own place across the frame,
   * and carries on up and out as the next comes. The foot's name, paragraph
   * and button change with whichever card is standing.
   */
  function setUpUse() {
    var scene = document.querySelector('[data-scene="use"]');
    if (!scene) return;

    var pin = scene.querySelector('[data-use-pin]');
    var headline = scene.querySelector('[data-use-headline]');
    var cards = [].slice.call(scene.querySelectorAll('[data-use-card]'));
    var shots = [].slice.call(scene.querySelectorAll('[data-use-shot]'));
    var marks = [].slice.call(scene.querySelectorAll('[data-use-marks]'));
    var name = scene.querySelector('[data-use-name]');
    var body = scene.querySelector('[data-use-body]');
    var aside = scene.querySelector('[data-use-aside]');
    var glow = scene.querySelector('[data-use-glow]');
    var footButton = aside ? aside.querySelector('.button') : null;
    var paper = scene.querySelector('[data-use-paper]');
    var menu = document.querySelector('[data-site-menu]');
    var wireHead = document.querySelector('[data-wire-headline]');
    /* Looked up when first wanted: the line itself is declared further down. */
    var lines2 = null;

    var chars = [];
    var order = [];
    var chars2 = [];
    var order2 = [];
    /* Out of the scene now — it lives in the overlay over the whole page. */
    var headline2 = document.querySelector('[data-use-headline2]');

    /*
     * The mark a card leaves is drawn on a copy of the line rather than on the
     * line itself. By the time a card is across it the line is down to a tenth
     * of its opacity, and anything coloured on it is taken down with it — the
     * accent would arrive at a tenth of the accent. The copy carries its own
     * opacity, sits exactly under the real one, and shows through a ring that
     * is opened out across it.
     *
     * Taken before the characters are scattered, so it is the whole line and
     * the two of them break in the same places by construction.
     */
    var ghost = headline.cloneNode(true);
    ghost.className = 'use__ghost';
    ghost.removeAttribute('data-use-headline');
    ghost.removeAttribute('data-node-id');
    ghost.setAttribute('aria-hidden', 'true');
    headline.parentNode.insertBefore(ghost, headline);

    /*
     * Split so every character can be taken away on its own. The lines are
     * left as they are — each centres itself, and each keeps its row whether
     * or not anything has landed on it — and the spaces stay bare text, so a
     * gap between words survives while the words either side are still
     * arriving.
     */
    function scatter(el) {
      var out = [];
      [].forEach.call(el.querySelectorAll('.use__line'), function (line) {
        var text = line.textContent;
        line.textContent = '';
        for (var c = 0; c < text.length; c++) {
          if (text[c] === ' ') {
            line.appendChild(document.createTextNode(' '));
            continue;
          }
          var span = document.createElement('span');
          span.className = 'use__ch is-away';
          span.textContent = text[c];
          line.appendChild(span);
          out.push(span);
        }
      });
      return out;
    }

    /* Split once the fonts are in, or the lines land on fallback metrics. */
    var fontsReady =
      document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    /*
     * The order is drawn once and kept, so the same scroll position always
     * shows the same half-built words — scrolling back up takes the
     * characters away in the order they arrived rather than picking a fresh
     * set every frame.
     */
    function shuffled(n) {
      var out = [];
      for (var i = 0; i < n; i++) out.push(i);
      for (var k = out.length - 1; k > 0; k--) {
        var j = Math.floor(Math.random() * (k + 1));
        var t = out[k];
        out[k] = out[j];
        out[j] = t;
      }
      return out;
    }

    fontsReady.then(function () {
      chars = scatter(headline);
      order = shuffled(chars.length);
      if (headline2) {
        chars2 = scatter(headline2);
        order2 = shuffled(chars2.length);
      }
      paint();
    });

    /*
     * How many of a scattered line have landed is the scroll's business;
     * which ones is the shuffled order's. Put back in that same order on the
     * way down, so a line comes apart the way it was built.
     */
    function assemble(set, ord, fill) {
      if (!set.length) return;
      var landed = Math.round(clamp01(fill) * set.length);
      for (var i = 0; i < ord.length; i++) {
        var el = set[ord[i]];
        var away = i >= landed;
        if (el.classList.contains('is-away') === away) continue;
        if (away) {
          el.classList.add('is-away');
          el.classList.remove('is-set');
        } else {
          land(el);
        }
      }
    }

    /*
     * A character cannot transition out of `display: none`, so the settling
     * to white is asked for a frame after it is put back — by which point it
     * is being drawn and the colour has somewhere to move from.
     */
    function land(el) {
      el.classList.remove('is-away');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (!el.classList.contains('is-away')) el.classList.add('is-set');
        });
      });
    }

    /*
     * The touch. A card crossing the line does not only put it out — it leaves
     * a mark: a ring of the accent runs out from the middle of the line and
     * off its ends, once, quickly, as though the card had struck it there.
     *
     * It is a clock rather than the scroll, so it reads the same however fast
     * the crossing is scrolled, and it fires once per card: armed again only
     * after that card has cleared the line.
     *
     * The characters are coloured one by one rather than by a gradient over
     * the line, because each of them is already carrying its own colour — the
     * accent it arrives in, settling to white — and a background clipped to
     * the text would have to take that over. Their own transition is stood
     * down while the ring is on them, or every step of it would be smeared
     * across the settle's 320ms.
     */
    var waveArmed = true;
    var waveRunning = false;
    var waveStart = 0;
    var waveReach = 0;

    function waveFrame(now) {
      var t = (now - waveStart) / WAVE_MS;
      if (t >= 1) {
        ghost.style.opacity = '0';
        waveRunning = false;
        return;
      }
      /* Out fast and easing as it goes, thinning on the way. */
      var r = (1 - Math.pow(1 - t, 2)) * (waveReach + WAVE_BAND);
      ghost.style.opacity = (1 - t * t).toFixed(3);
      var ring =
        'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) ' +
        Math.max(0, r - WAVE_BAND).toFixed(0) +
        'px, #000 ' +
        r.toFixed(0) +
        'px, rgba(0,0,0,0) ' +
        (r + WAVE_BAND).toFixed(0) +
        'px)';
      ghost.style.webkitMaskImage = ring;
      ghost.style.maskImage = ring;
      requestAnimationFrame(waveFrame);
    }

    function strike() {
      if (waveRunning) return;
      var box = ghost.getBoundingClientRect();
      if (!box.width) return;
      /* Far enough for the ring to leave by every corner of the line. */
      waveReach = Math.sqrt(box.width * box.width + box.height * box.height) / 2;
      waveRunning = true;
      waveStart = performance.now();
      requestAnimationFrame(waveFrame);
    }

    /*
     * The pointer's lean, eased toward where it is asked rather than set to
     * it, so the cards settle after the pointer stops instead of tracking it.
     */
    var leanTo = { x: 0, y: 0 };
    var lean = { x: 0, y: 0 };

    scene.addEventListener('mousemove', function (event) {
      leanTo.x = (event.clientX / window.innerWidth) * 2 - 1;
      leanTo.y = (event.clientY / window.innerHeight) * 2 - 1;
    });

    scene.addEventListener('mouseleave', function () {
      leanTo.x = 0;
      leanTo.y = 0;
    });

    (function follow() {
      requestAnimationFrame(follow);
      if (Math.abs(leanTo.x - lean.x) < 0.001 && Math.abs(leanTo.y - lean.y) < 0.001) return;
      lean.x += (leanTo.x - lean.x) * USE_LEAN_EASE;
      lean.y += (leanTo.y - lean.y) * USE_LEAN_EASE;
      paint();
    })();

    var shown = -1;
    var footLines = [];

    function show(i) {
      if (i === shown) return;
      shown = i;
      /*
       * Written fresh from the state rather than read back off the element:
       * once a line has been split, its own textContent has lost the spaces
       * that were between the lines.
       */
      name.textContent = USE_STATES[i].name;
      body.textContent = USE_STATES[i].body;
      /* Kept, so the foot can be rubbed out again once the cards are done. */
      footLines = blockReveal(name).concat(blockReveal(body));
    }

    register(function () {
      var q = progressOf(pin);

      /*
       * The first line assembles, and comes apart again as the foot is being
       * rubbed out — character by character in the order it was built, so it
       * is taken to pieces rather than faded — leaving the frame clear for
       * the second, which then takes it the same way.
       */
      assemble(
        chars,
        order,
        clamp01(q / USE_TITLE_BY) *
          (1 -
            clamp01((q - USE_FOOT_OUT_FROM) / (USE_TITLE2_FROM - USE_FOOT_OUT_FROM)))
      );
      /* The second is not the scroll's — it is written on by the pull. */

      /*
       * The cards, as one train. Every one of them keeps the same distance
       * from the next the whole way — the spacing is written into where they
       * are, not arrived at — so none ever closes on another. The train's
       * position is the scroll's, straight: no easing of its own, nothing
       * that carries on once the scrolling has stopped. It takes a window's
       * worth of travel to bring the next card up.
       */
      var run = clamp01((q - USE_CARDS_FROM) / (USE_CARDS_BY - USE_CARDS_FROM));
      var step = window.innerHeight;
      /*
       * Shifted a whole step back so the first card starts a window below the
       * fold, and reaching the end leaves the last one standing at the centre
       * rather than halfway out of the frame.
       */
      /*
       * One step more than there are cards: the train sets off a window below
       * the fold and runs a window past the last one, so the third card
       * carries on up and out the way the two before it did rather than being
       * left standing on the frame at the end.
       */
      var at = -1 + run * (cards.length + 1);
      var nearest = 0;

      for (var c = 0; c < cards.length; c++) {
        var y = (c - at) * step;
        /*
         * How much of this one is across the line. They share a centre, so
         * the gap between the two blocks is all it takes.
         */
        var over = clamp01(
          ((USE_CARD_H + USE_TITLE_H) / 2 - Math.abs(y)) / USE_DIM_OVER
        );
        if (over > nearest) nearest = over;

        /*
         * Full size at the centre, a shade under it a window away — so a card
         * grows into its place as it arrives rather than simply sliding to it
         * — and then further again for as long as it is across the line.
         */
        var near = clamp01(1 - Math.abs(y) / step);
        var scale =
          (USE_CARD_SCALE + (1 - USE_CARD_SCALE) * near) *
          (1 + (USE_CARD_OVER - 1) * over);

        /* Carried, and leant and drawn a little after the pointer. */
        cards[c].style.transform =
          'translate3d(' +
          (USE_CARD_X[c] - USE_CARD_W / 2 + lean.x * USE_CARD_DRIFT).toFixed(1) +
          'px,' +
          (y - USE_CARD_H / 2).toFixed(1) +
          'px,0)' +
          ' rotateX(' +
          (-lean.y * USE_CARD_LEAN).toFixed(2) +
          'deg) rotateY(' +
          (lean.x * USE_CARD_LEAN).toFixed(2) +
          'deg)';

        /* The growing is the picture's alone; the marks are not in that layer. */
        if (shots[c]) {
          shots[c].style.transform = 'scale(' + scale.toFixed(4) + ')';
          /*
           * And the shot inside it pushes in of its own accord the whole way
           * up — 0 as the card is still below the fold, 1 as it leaves over
           * the top — so it is never quite still even on its mark.
           */
          var pic = shots[c].firstElementChild;
          if (pic) {
            var through = clamp01((step - y) / (2 * step));
            pic.style.transform = 'scale(' + (1 + USE_PIC_ZOOM * through).toFixed(4) + ')';
          }
        }

        /*
         * The marks' box is held out past wherever the picture's edges have
         * grown to, so their outer corners stay the design's 20 off it — and
         * they hold their own 8, having no scale of their own to carry.
         */
        if (marks[c]) {
          var outX = (USE_CARD_W * (1 - scale)) / 2 - USE_MARK_OUT;
          var outY = (USE_CARD_H * (1 - scale)) / 2 - USE_MARK_OUT;
          marks[c].style.inset = outY.toFixed(1) + 'px ' + outX.toFixed(1) + 'px';
          marks[c].style.opacity = over.toFixed(3);
        }
      }

      /*
       * The ground, in just before the first card is up — and out again with
       * the foot, so the strip is pulled through over plain black.
       */
      if (glow) {
        glow.style.opacity = String(
          clamp01((q - USE_GLOW_FROM) / (USE_GLOW_BY - USE_GLOW_FROM)) *
            (1 -
              clamp01(
                (q - USE_FOOT_OUT_FROM) / (USE_WHITE_FROM - USE_FOOT_OUT_FROM)
              ))
        );
      }

      /* Dimmed by whatever is over it, and no further. */
      headline.style.opacity = String(1 - (1 - USE_DIM_TO) * nearest);

      /*
       * ...and struck once as each card comes across it. Armed again only
       * once that card has cleared, so three cards leave three marks and a
       * scroll held still on one leaves nothing more.
       */
      if (nearest >= WAVE_FROM) {
        if (waveArmed) {
          waveArmed = false;
          strike();
        }
      } else if (nearest <= WAVE_REARM) {
        waveArmed = true;
      }

      /* The foot arrives with the cards and changes with whichever stands. */
      var on = clamp01((q - USE_CARDS_FROM) / 0.05);
      name.style.opacity = String(on);
      aside.style.opacity = String(on);
      show(Math.max(0, Math.min(cards.length - 1, Math.round(at))));

      /*
       * ...and once the last card has gone it is rubbed out the way the hero's
       * copy is: the rectangle picks each line up at its end and carries it
       * back to where it was written from. Scrubbed rather than clocked, so it
       * rewinds exactly if the scroll goes back. The button has no lines of
       * its own to take, so it simply goes with them.
       */
      var footOut = clamp01(
        (q - USE_FOOT_OUT_FROM) / (USE_FOOT_OUT_BY - USE_FOOT_OUT_FROM)
      );
      if (footOut > 0 && footLines.length) {
        /* The wipe takes the lines over; the arrival's clock must let go. */
        footLines.cancelled = true;
        wipeOut(footLines, footOut);
      } else if (footLines.length) {
        footLines.cancelled = false;
      }
      if (footButton) footButton.style.opacity = String(1 - footOut);

      /*
       * ...and the second line takes the frame, with the ground turning over
       * under it: the black the cards ran on gives way to the white the
       * newsroom below is set on, so the two meet on the same paper.
       */
      assemble(
        chars2,
        order2,
        (q - USE_TITLE2_FROM) / (USE_TITLE2_BY - USE_TITLE2_FROM)
      );
      if (paper) {
        var white = clamp01(
          (q - USE_WHITE_FROM) / (USE_WHITE_BY - USE_WHITE_FROM)
        );
        paper.style.opacity = String(white);
        /*
         * ...and the bar turns over with it. One bar serves the whole site and
         * it is drawn for dark ground — white type, a white logo, a white
         * plate under black type — all of which would disappear here.
         */
        if (menu) menu.classList.toggle('is-inverted', white > 0.5);
      }

      /*
       * The line's journey into the head. It is scaled about its own top left
       * so the shrink and the travel are one move, and it is taken off at the
       * very end — by which point the section below has its own head standing
       * in exactly the same place.
       */
      if (headline2 && wireHead) {
        var moved = clamp01((q - USE_MOVE_FROM) / (USE_MOVE_BY - USE_MOVE_FROM));
        var ease = moved * moved * (3 - 2 * moved);
        /*
         * It is not sent to a place on this frame — it is sent to the head of
         * the section below, wherever that head happens to be standing. That
         * section is still under the fold while this one is being scrolled
         * through, so the line goes *down* the frame and to the left as it
         * shrinks, and it is only when the section below rises that the line
         * it has become rises with it. Nothing ever disappears and comes back
         * somewhere else: the two are the same line in the same place before
         * the hand-over is made.
         */
        var frame = headline2.parentNode.getBoundingClientRect();
        var head = wireHead.getBoundingClientRect();
        /*
         * Where its own top left stands untransformed. Taken from the layout
         * box and not from the painted one: the painted one already carries
         * the transform this is about to write, and reading it back would
         * feed the move into itself.
         */
        var nowX = frame.width / 2 - headline2.offsetWidth / 2;
        var nowY = frame.height / 2 - headline2.offsetHeight / 2;
        var k = 1 + (HEAD_SIZE - 1) * ease;
        var toX = head.left - frame.left;
        var toY = head.top - frame.top;
        headline2.style.transformOrigin = 'left top';
        headline2.style.transform =
          'translate(-50%, -50%) translate(' +
          ((toX - nowX) * ease).toFixed(1) +
          'px,' +
          ((toY - nowY) * ease).toFixed(1) +
          'px) scale(' +
          k.toFixed(4) +
          ')';
        /*
         * ...and each line walks off its own centre to the block's left edge
         * as it goes. The big line is centred and the head is flush left, so
         * without this the shorter of the two lands short of the other — the
         * jump that reads as the line being swapped rather than moved.
         */
        if (!lines2) lines2 = headline2.querySelectorAll('.use__line');
        for (var li = 0; li < lines2.length; li++) {
          lines2[li].style.transform =
            'translateX(' + (-lines2[li].offsetLeft * ease).toFixed(1) + 'px)';
        }

        /*
         * The hand-over waits for the two to be in the same place rather than
         * for the scroll to reach a mark. That is what stops the head reading
         * as a second line coming back: it is only ever shown once it is
         * standing exactly where the line already is.
         */
        var done = moved >= 1;
        headline2.style.opacity = done ? '0' : '1';
        wireHead.style.opacity = done ? '1' : '0';
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * Newsroom
   * ------------------------------------------------------------------ */

  /*
   * 423:3160. Not pinned — it stands in the page and is read by scrolling
   * past it, so everything here is measured off how far a block has got up
   * the window rather than off a section's own progress.
   *
   * The head's label, note and button are not there when the section arrives:
   * the line above has to land in the head first, and only then do they come
   * in under it. Each card opens rather than fades — its frame grows from a
   * band across the middle out to the full 455 while the picture inside holds
   * still and settles back from a little over size, so it reads as a shutter
   * drawing back off a picture that was always there.
   */
  var WIRE_HEAD_FROM = 0.5; // the head's parts arrive once it is this far up
  var WIRE_CARD_FROM = 0.95; // a card starts opening as its top passes here...
  var WIRE_CARD_BY = 0.45; // ...and is fully open by here
  var WIRE_BAND = 0.34; // the share of its height it opens from
  var WIRE_PIC_ZOOM = 0.12; // and how far over size the picture settles from

  /*
   * The disc's label does not simply appear: it arrives scrambled and reads
   * itself out, a character at a time, left to right.
   *
   * The wait is the smallest that is still a wait — one frame's worth. Any
   * less is nothing at all, and the point of having one is that the decode
   * does not begin on the very frame the pointer crosses the edge.
   */
  var LENS_DECODE_WAIT = 30; // ms before the first character locks
  var LENS_DECODE_STEP = 34; // ...and how long each one after it takes
  var LENS_SCRAMBLE_STEP = 45; // how often a character not yet locked is redrawn
  /*
   * What an unlocked character is drawn as. Caps and figures only: the label
   * is set in caps, so anything else would read as a different kind of thing
   * flickering rather than as this line not having resolved yet.
   */
  var LENS_GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@$*+=/<>';

  /*
   * 425:3537 — the card under the pointer. The shape, the push-in and the two
   * marks are the sheet's, on :hover; what is left for here is the pointer
   * itself, which becomes the button the card is. It is the hero's cursor
   * again: the same trailing follow, and the same two squares carried apart
   * across the frame by however the pointer is moving rather than by where
   * it is, so they draw back level the moment it stops.
   */
  function setUpLens(section) {
    var el = document.querySelector('[data-wire-lens]');
    if (!el || reduced) return;
    var squares = el.querySelectorAll('.lens__square');

    /*
     * The decode. Every character is scrambled to begin with and they lock
     * one after another from the left, so what is on screen is a line half
     * read out rather than a line fading up. Spaces are left alone — they are
     * what keeps the two words readable as two words the whole way through.
     */
    var line = el.querySelector('.lens__line');
    var word = line ? line.textContent : '';
    var clock = null;

    function scrambled(locked) {
      var out = '';
      for (var i = 0; i < word.length; i++) {
        if (word.charAt(i) === ' ') out += ' ';
        else if (i < locked) out += word.charAt(i);
        else out += LENS_GLYPHS.charAt(Math.floor(Math.random() * LENS_GLYPHS.length));
      }
      return out;
    }

    function decode() {
      if (!line) return;
      if (clock) cancelAnimationFrame(clock);
      var began = 0;
      var drawnStep = -1;
      var drawnLocked = -1;
      clock = requestAnimationFrame(function tick(now) {
        if (!began) began = now;
        var run = now - began;
        var locked = Math.floor(Math.max(0, run - LENS_DECODE_WAIT) / LENS_DECODE_STEP);
        if (locked >= word.length) {
          line.textContent = word;
          clock = null;
          return;
        }
        /*
         * Redrawn only when it would actually change — when the scramble is
         * due to be shuffled again, or when another character has locked.
         */
        var step = Math.floor(run / LENS_SCRAMBLE_STEP);
        if (step !== drawnStep || locked !== drawnLocked) {
          drawnStep = step;
          drawnLocked = locked;
          line.textContent = scrambled(locked);
        }
        clock = requestAnimationFrame(tick);
      });
    }

    var tx = 0, ty = 0, x = 0, y = 0;
    var on = false;
    var want = 0;
    var push = 0;
    var lastX = null;

    /*
     * `translate`, the property, not a transform — the sheet centres the disc
     * on its own origin with a margin so this can be the whole of its
     * placing. See .lens for why the usual translate(-50%,-50%) does not
     * survive being scaled.
     */
    function place() {
      el.style.translate = x.toFixed(1) + 'px ' + y.toFixed(1) + 'px';
    }

    function show(next) {
      if (next === on) return;
      on = next;
      if (on) {
        /*
         * It is stood on the pointer and its squares put level before it is
         * shown, rather than eased there from wherever it was last left —
         * it grows in from nothing on the spot, so the jump is never seen.
         */
        x = tx;
        y = ty;
        want = 0;
        push = 0;
        place();
        decode();
      } else if (clock) {
        /* Put away mid-read, it is stopped and left whole for the next time. */
        cancelAnimationFrame(clock);
        clock = null;
        if (line) line.textContent = word;
      }
      el.classList.toggle('is-on', on);
    }

    section.addEventListener('mousemove', function (event) {
      tx = event.clientX;
      ty = event.clientY;
      if (lastX !== null) want = carry(want, tx - lastX);
      lastX = tx;

      /*
       * The picture only. Its tag and title sit below it in the same card,
       * and they are the caption rather than the thing being pointed at —
       * the pointer stays itself over them.
       */
      show(!!event.target.closest('[data-wire-shot]'));
    });

    section.addEventListener('mouseleave', function () {
      show(false);
      lastX = null;
    });

    (function follow() {
      requestAnimationFrame(follow);
      /*
       * It only follows while it is showing. Off, it stands exactly where the
       * pointer left it and fades from there — chasing the pointer through
       * its own fade is what read as it flying off the picture.
       */
      if (!on) return;

      x += (tx - x) * CURSOR_EASE;
      y += (ty - y) * CURSOR_EASE;
      place();

      want *= SQUARE_BLEED;
      push += (want - push) * SQUARE_EASE;
      for (var i = 0; i < squares.length; i++) {
        squares[i].style.setProperty('--px', ((i % 2 ? -1 : 1) * push).toFixed(2) + 'px');
      }
    })();
  }

  function setUpWire() {
    var section = document.querySelector('[data-scene-wire]');
    if (!section) return;

    var label = section.querySelector('[data-wire-label]');
    var aside = section.querySelector('[data-wire-aside]');
    var cards = section.querySelectorAll('[data-wire-card]');
    setUpLens(section);
    if (reduced) return;

    /*
     * Every piece of copy here is wiped on by the rectangle the rest of the
     * page uses rather than faded: the label, the note under it, and each
     * card's tag and title. The squares and the button have no lines of their
     * own to take, so those simply arrive with them.
     */
    var texts = [];
    section
      .querySelectorAll('.wire__labelText, .wire__lead, .wire__tag, .wire__title')
      .forEach(function (el) {
        texts.push({ el: el, lines: null, on: false });
      });
    var plain = section.querySelectorAll('.wire__square, .wire__aside .button');

    register(function () {
      /*
       * The head's own parts follow the line into place: they are keyed off
       * the section's top so they cannot arrive before it has landed.
       */
      /*
       * The squares and the button have no lines to wipe on, so they are
       * faded — but over the same short band the copy beside them is wiped
       * on, and not on a clock of their own. Held apart they read as a
       * second thing arriving after the head rather than as part of it.
       */
      var head = progressUp(section, 0.9, 0.78);
      for (var pi = 0; pi < plain.length; pi++) {
        plain[pi].style.opacity = head.toFixed(3);
      }

      /*
       * A line is split on its first crossing rather than up front: they are
       * measured, and measuring before the fonts have landed splits the copy
       * where the fallback wrapped it.
       */
      for (var ti = 0; ti < texts.length; ti++) {
        var t = texts[ti];
        var on = t.el.getBoundingClientRect().top < window.innerHeight * 0.88;
        if (on === t.on) continue;
        t.on = on;
        if (!t.lines) t.lines = splitIntoLines(t.el);
        hideReveal(t.lines);
        if (on) runReveal(t.lines);
      }

      /*
       * Read every card first, then write every card. Interleaved, each
       * write invalidates the layout the next read needs and the browser has
       * to lay the page out again to answer it — six times a frame, which is
       * what makes the scrolling here feel heavier than the sections above.
       */
      var vh = window.innerHeight;
      var dpr = window.devicePixelRatio || 1;
      var read = [];
      for (var i = 0; i < cards.length; i++) {
        var shot = cards[i].querySelector('[data-wire-shot]');
        if (!shot) continue;
        var box = shot.getBoundingClientRect();
        read.push({
          shot: shot,
          /* asked for by name — the frame holds the corner marks too */
          pic: shot.querySelector('img'),
          top: box.top,
          width: shot.offsetWidth,
          open: clamp01(
            (vh * WIRE_CARD_FROM - box.top) / (vh * WIRE_CARD_FROM - vh * WIRE_CARD_BY)
          ),
        });
      }

      for (var j = 0; j < read.length; j++) {
        var r = read[j];
        var eased = 1 - Math.pow(1 - r.open, 3);
        /*
         * The height comes from the width through the frame's ratio, and it
         * lands on a fraction — 652 across gives 452.89 down. A box whose
         * bottom edge falls between two device pixels is drawn across both,
         * and the half-covered row blends with the white page behind it: the
         * hairline along the bottom of every card. So the height is nudged to
         * whatever puts that edge on a whole device pixel. Under a tenth of a
         * pixel of the frame's ratio, and the hairline goes.
         */
        var full = Math.round(r.width * (455 / 655) * dpr) / dpr;
        var h = Math.round(full * (WIRE_BAND + (1 - WIRE_BAND) * eased) * dpr) / dpr;
        /*
         * ...and the box itself is nudged onto the device grid. Its top is
         * wherever the layout puts it, which is a fraction as often as not,
         * and an edge that falls between two device pixels is drawn across
         * both — the half-covered row blending with the white page behind it
         * is the hairline. Snapping the top and giving the box a whole number
         * of device pixels to be tall puts both edges on the grid. It moves
         * the card by less than a pixel.
         */
        var was = +r.shot.dataset.nudge || 0;
        var raw = r.top - was;
        var nudge = Math.round(raw * dpr) / dpr - raw;
        r.shot.dataset.nudge = nudge;
        var shift = 'translateY(' + nudge.toFixed(3) + 'px)';
        if (r.shot.style.transform !== shift) r.shot.style.transform = shift;
        var height = h.toFixed(3) + 'px';
        if (r.shot.style.height !== height) r.shot.style.height = height;
        if (r.pic) {
          /* +2 for the pixel it stands proud on each side; see the sheet. */
          var ph = (full + 2).toFixed(1) + 'px';
          if (r.pic.style.height !== ph) r.pic.style.height = ph;
          r.pic.style.transform =
            'translateY(' +
            (-(full - h) / 2).toFixed(1) +
            'px) scale(' +
            (1 + WIRE_PIC_ZOOM * (1 - eased)).toFixed(4) +
            ')';
        }
      }
    });
  }


  /* ------------------------------------------------------------------ *
   * The FAQ
   * ------------------------------------------------------------------ */

  /*
   * 438:443. Six pieces of copy turned past the window on one radius —
   * madewithgsap 102. The word FAQ arrives first, assembled out of scattered
   * characters the way the use-cases headline is, on the white the newsroom
   * leaves behind; the ground then goes to black, and from there each line is
   * turned up and away while the next rises into its place.
   *
   * The label and the answer stay square to the window. They are wiped on by
   * the rectangle once their question has landed, and wiped off again — the
   * exit scrubbed by the turn itself — as it starts to leave.
   */
  var FAQ_WORD_BY = 0.1; // the word is whole by here...
  var FAQ_INK_FROM = 0.11; // ...and the ground turns over this band
  var FAQ_INK_BY = 0.17;
  var FAQ_RUN_FROM = 0.19; // the drum has the scroll from here to the end
  var FAQ_TURN = 0.62; // the share of a step that is the turn; the rest holds
  var FAQ_RADIUS = 260; // px — the radius every line stands on
  var FAQ_STEP = 42; // degrees between one line and the next on it
  var FAQ_ROLL = 7; // ...and how far a line rolls in its own plane as it goes
  /*
   * How close to a line the drum has to be for that line's foot to be up, and
   * how far off it before the foot has gone — both measured in lines, so they
   * read the same going forwards and going back. Keyed instead to how far
   * through a step the scroll is, a foot only knows one direction: coming
   * back up through that step it wiped itself away again at exactly the place
   * it should have been putting itself back.
   */
  var FAQ_FOOT_NEAR = 0.16;
  var FAQ_FOOT_GONE = 0.34;
  var FAQ_WAVE_MS = 760; // the ring's whole run over a question that has landed
  var FAQ_WAVE_BAND = 190; // ...and px of its own width

  function setUpFaq() {
    var scene = document.querySelector('[data-scene="faq"]');
    if (!scene) return;

    var frame = scene.querySelector('.faq');
    var paper = scene.querySelector('[data-faq-paper]');
    var word = scene.querySelector('[data-faq-word]');
    var titles = scene.querySelectorAll('.faq__title');
    var labels = scene.querySelectorAll('[data-faq-label]');
    var answers = scene.querySelectorAll('[data-faq-answer]');
    var skip = scene.querySelector('[data-faq-skip]');
    var ghost = scene.querySelector('[data-faq-ghost]');
    var menu = document.querySelector('[data-site-menu]');
    if (!frame || !titles.length) return;

    if (reduced) {
      scene.style.height = 'auto';
      return;
    }

    /*
     * The word's characters, each in a span of its own so the line can be
     * written on the way the tunnel's passages are: a head runs through them
     * left to right and every character it has passed is lit. They hold their
     * room from the start — it is a line being written, not one being
     * assembled out of nothing — so the phrase never moves as it arrives.
     */
    var chars = [];

    /* Split once the fonts are in, or the line lands on fallback metrics. */
    var fontsReady =
      document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fontsReady.then(function () {
      var lines = word ? word.querySelectorAll('.faq__wordLine') : [];
      for (var l = 0; l < lines.length; l++) {
        chars = chars.concat(splitCharacters(lines[l]));
      }
      paint();
    });

    /*
     * The foot. Each question's label and answer are their own elements,
     * stacked on one mark, and split into lines the first time they are
     * called for — measuring them all up front would be work for five when
     * only one is ever wanted, and splitting before the fonts land would cut
     * the copy where the fallback wrapped it.
     */
    var shown = -1; // whose foot is up
    var went = null; // ...and where the drum stood last, which gives its way
    var kept = [];
    var inked = -1;

    function linesFor(n) {
      if (kept[n]) return kept[n];
      var set = [];
      if (labels[n]) set.push(splitIntoLines(labels[n].querySelector('.faq__labelText')));
      if (answers[n]) set.push(splitIntoLines(answers[n]));
      for (var i = 0; i < set.length; i++) hideReveal(set[i]);
      kept[n] = set;
      return set;
    }

    function showFoot(n) {
      /*
       * Whatever was up lets go of its lines before the next takes them, and
       * is put away whole. The label's two marks are not part of its split —
       * they have no line to be wiped on — so hiding the copy alone would
       * leave the pair of them standing over the next question's label.
       */
      for (var q = 0; q < kept.length; q++) {
        if (q === n) continue;
        if (labels[q]) labels[q].style.opacity = '0';
        if (answers[q]) answers[q].style.opacity = '0';
        marks(q, 0);
        if (!kept[q]) continue;
        for (var r = 0; r < kept[q].length; r++) {
          kept[q][r].cancelled = true;
          hideReveal(kept[q][r]);
        }
      }
      if (labels[n]) labels[n].style.opacity = '1';
      if (answers[n]) answers[n].style.opacity = '1';
      marks(n, 1);
      var set = linesFor(n);
      for (var s = 0; s < set.length; s++) {
        set[s].cancelled = false;
        hideReveal(set[s]);
        runReveal(set[s]);
      }
    }

    /*
     * The label's two marks have no line of their own to be wiped on, so they
     * are faded — on the same short clock the copy beside them takes, and not
     * on one of their own. Held apart they read as a second thing arriving
     * after the label rather than as part of it.
     */
    function marks(n, on) {
      if (!labels[n]) return;
      var sq = labels[n].querySelectorAll('.faq__square');
      /* ...and to two places, so a scrub does not write on every frame */
      var v = (+on).toFixed(2);
      for (var i = 0; i < sq.length; i++) {
        if (sq[i].style.opacity !== v) sq[i].style.opacity = v;
      }
    }

    /*
     * The touch. A question that has come to rest is struck once: a ring of
     * the accent runs out from the middle of the line and off its ends, the
     * same one the use-cases headline takes when a card crosses it. It is
     * drawn on a second copy of the line rather than on the line itself,
     * because the ring carries its own strength and the line is already
     * carrying the ink's.
     */
    var waveRunning = false;
    var waveStart = 0;
    var waveReach = 0;

    function waveFrame(now) {
      var t = (now - waveStart) / FAQ_WAVE_MS;
      if (t >= 1) {
        ghost.style.opacity = '0';
        waveRunning = false;
        return;
      }
      /* Out fast and easing as it goes, thinning on the way. */
      var r = (1 - Math.pow(1 - t, 2)) * (waveReach + FAQ_WAVE_BAND);
      ghost.style.opacity = (1 - t * t).toFixed(3);
      var ring =
        'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) ' +
        Math.max(0, r - FAQ_WAVE_BAND).toFixed(0) +
        'px, #000 ' +
        r.toFixed(0) +
        'px, rgba(0,0,0,0) ' +
        (r + FAQ_WAVE_BAND).toFixed(0) +
        'px)';
      ghost.style.webkitMaskImage = ring;
      ghost.style.maskImage = ring;
      requestAnimationFrame(waveFrame);
    }

    function strike(n) {
      if (!ghost || !titles[n]) return;
      ghost.textContent = titles[n].textContent;
      var box = ghost.getBoundingClientRect();
      if (!box.width) return;
      /* Far enough for the ring to leave by every corner of the line. */
      waveReach = Math.sqrt(box.width * box.width + box.height * box.height) / 2;
      /*
       * A strike that lands while the last one is still going restarts it on
       * the new line rather than being dropped — two questions are seconds
       * apart at a reading pace, but a scroll flung through them is not, and
       * the one that arrives is the one that should be struck.
       */
      waveStart = performance.now();
      if (!waveRunning) {
        waveRunning = true;
        requestAnimationFrame(waveFrame);
      }
    }

    function hideFeet() {
      for (var i = 0; i < labels.length; i++) {
        labels[i].style.opacity = '0';
        marks(i, 0);
        if (answers[i]) answers[i].style.opacity = '0';
        if (!kept[i]) continue;
        for (var j = 0; j < kept[i].length; j++) {
          kept[i][j].cancelled = true;
          hideReveal(kept[i][j]);
        }
      }
    }

    /* Nothing is up to begin with — the word has no question to answer. */
    hideFeet();

    register(function () {
      var p = progressOf(scene);
      if (p < 0) p = 0;

      /*
       * The word writes itself on first, on the ground the newsroom left.
       * The tail is held at 0 — the tunnel's passages rub themselves out
       * behind the head because a second one follows them, and this one has
       * to stand whole and then leave on the drum.
       */
      write(chars, Math.round(clamp01(p / FAQ_WORD_BY) * chars.length), 0);

      /*
       * The ground turns over, and the ink with it — written as one value the
       * whole section reads, so the copy and what it stands on never disagree.
       */
      var ink = clamp01((p - FAQ_INK_FROM) / (FAQ_INK_BY - FAQ_INK_FROM));
      /*
       * Only when it has actually moved. `--faq-ink` is inherited by every
       * line, label, mark and answer under the frame, so writing it puts the
       * whole section's style up for recalculation — and for all but a
       * fraction of this scroll it is the same value it already was. That
       * write every frame is what the turn was stuttering on.
       */
      var v = Math.round(3 + (255 - 3) * ink);
      if (v !== inked) {
        inked = v;
        frame.style.setProperty('--faq-ink', 'rgb(' + v + ',' + v + ',' + v + ')');
        if (paper) paper.style.opacity = (1 - ink).toFixed(3);
        if (skip) skip.style.opacity = ink.toFixed(3);
      }

      /*
       * The bar is inverted for the white the newsroom above leaves, and has
       * to come back off as this ground turns. The use section sets it too,
       * from its own white; this only speaks while the section is actually on
       * screen, and it is registered after that one, so what it says holds
       * for as long as it is looking and the other's stands the rest of the
       * time.
       */
      if (menu) {
        var box = scene.getBoundingClientRect();
        if (box.top < window.innerHeight && box.bottom > 0) {
          menu.classList.toggle('is-inverted', ink < 0.5);
        }
      }

      /*
       * The drum. `pos` is where it stands in lines: whole at rest on a line,
       * and running from one to the next over the first FAQ_TURN of each
       * step, so every question is held still to be read before it goes.
       */
      var run = clamp01((p - FAQ_RUN_FROM) / (1 - FAQ_RUN_FROM));
      var steps = titles.length - 1;
      var seg = run * steps;
      var at = Math.min(steps - 1, Math.floor(seg));
      var k = clamp01((seg - at) / FAQ_TURN);
      var eased = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      var pos = at + eased;

      for (var i = 0; i < titles.length; i++) {
        var d = i - pos;
        var el = titles[i];
        if (Math.abs(d) > 1.05) {
          if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden';
          continue;
        }
        el.style.visibility = '';
        /*
         * Behind on the drum means above and turned away; ahead means still
         * below it. The pull-back either side of the swing is what puts the
         * line at the front on z 0, at its true size.
         */
        var deg = -d * FAQ_STEP;
        var roll = FAQ_ROLL * d * (i % 2 ? 1 : -1);
        /*
         * Written only when they have moved. A question is standing still for
         * more of this scroll than it is turning — the hold is a third of
         * every step — and a style set to the value it already holds still
         * costs the whole section a recalculation.
         */
        var turn =
          'translateZ(' + -FAQ_RADIUS + 'px) rotateX(' + deg.toFixed(2) + 'deg) translateZ(' +
          FAQ_RADIUS + 'px) rotateZ(' + roll.toFixed(2) + 'deg)';
        if (el.style.transform !== turn) el.style.transform = turn;
        var lit = clamp01(1 - Math.abs(d)).toFixed(3);
        if (el.style.opacity !== lit) el.style.opacity = lit;
      }

      /*
       * The foot follows the drum rather than a clock of its own: it is wiped
       * on once a question has come to rest, and rewound as that question
       * starts to turn away. Its exit is scrubbed by the turn, so scrolling
       * back up puts it back exactly.
       */
      /*
       * Which foot belongs on screen is read off where the drum is standing,
       * in lines, rather than off how far through a step the scroll has got.
       * Two things follow. A scrollbar dragged, or a wheel flung hard enough
       * to skip frames, cannot step over a mark and leave the last question's
       * label under the next one's — there is no mark to miss. And it reads
       * the same in both directions: coming back up to a question puts its
       * label and its answer back exactly as going down to it put them there.
       */
      /*
       * Which way the drum is turning, taken from where it stood last rather
       * than from which question was last arrived at: a scroll that jumps
       * clean over a question never arrives at it, and a record of arrivals
       * would still be pointing at one from two questions back.
       */
      var onward = went === null || pos > went;
      went = pos;

      var near = Math.round(pos);
      if (near >= 1 && Math.abs(pos - near) <= FAQ_FOOT_NEAR && near !== shown) {
        shown = near;
        showFoot(near - 1);
        /*
         * The touch is for a question being come to, not for one being come
         * back to: turning back to something already read is not an arrival,
         * and striking it again would answer a move nobody made.
         */
        if (onward) strike(near);
      }

      /*
       * ...and the foot rewinds as its own question turns away, scrubbed by
       * how far the drum has moved off it, whichever way it went. At rest on
       * the line there is nothing to rewind, and touching it there would take
       * the reveal's own clock off it.
       */
      if (shown > 0) {
        var was = shown - 1;
        var off = Math.abs(pos - shown);
        var out = clamp01((off - FAQ_FOOT_NEAR) / (FAQ_FOOT_GONE - FAQ_FOOT_NEAR));
        if (out > 0) {
          var set = kept[was];
          for (var w = 0; w < set.length; w++) {
            set[w].cancelled = true;
            wipeOut(set[w], out);
          }
          /* The marks go as the copy does; the boxes only once it has gone. */
          marks(was, 1 - out);
          if (out >= 1) {
            if (labels[was]) labels[was].style.opacity = '0';
            if (answers[was]) answers[was].style.opacity = '0';
            shown = -1;
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
        o = 1 - clamp01((heroP - FLASH_IN_FROM) / (1 - FLASH_IN_FROM));
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
  setUpUse();
  setUpWire();
  setUpFaq();
  setUpMenu();

  if (!reduced) {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    /* Durations arrive late; repaint once they do so the maps are right. */
    document.querySelectorAll('video').forEach(function (video) {
      video.addEventListener('loadedmetadata', paint);
    });
  }

  /*
   * The page is ours now — see the boot script in index.html for what was
   * being held back and why.
   *
   * It waits on the fonts, not just on this script running. Both things the
   * veil covers are built out of measured text and neither can be built
   * before the fonts land: the hero's lines are split where the real metrics
   * wrap them, and the travelling line is cut into characters that take up
   * no room until they are placed. Lifting the veil merely at the end of
   * this file left a second of the page where the script had run but the
   * fonts had not, and the travelling line — still one whole piece of raw
   * text, in a fixed overlay — was drawn straight across the hero again.
   *
   * This is registered after every setUp above, so it runs after the two
   * that wait on the same promise have had their turn, and then one frame
   * more so their work is painted before it is uncovered.
   */
  paint();
  var ready =
    document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(function () {
    paint();
    requestAnimationFrame(function () {
      document.documentElement.classList.remove('is-booting');
    });
  });
})();
