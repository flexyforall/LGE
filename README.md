# LGE

Two sites live in this repository. `index.html` is the Lead Generation Experts
page; `corespace.html` is the earlier CoreSpace site, untouched, with all of its
own documentation further down this file.

## Lead Generation Experts

`index.html` — the **Hero Section + Menu** frame from the Lead Generation
Experts Figma file, built to the frame's own numbers rather than to eyeballed
approximations.

```
index.html          the page
css/lge.css         all of its styles
js/lge.js           the fit, the menu and the card run
tools/colorize.py   builds the second state of each card picture
assets/fonts/       SF Pro Display and SF Pro, as woff2
*.png, *.svg        the exported artwork, in the repository root
```

Open `index.html`. There is no build step and nothing to install.

### How it is put together

The frame is 1440 x 859. Every box in the page is placed at the coordinate the
frame gives it, so the CSS reads as a list of measurements — `left: 873.5px`,
`top: 558.24px`, `letter-spacing: -2.88px` — and the numbers are the point.
Rounding them is what breaks the match, so they are left as they are.

The canvas is scaled to the window as a single piece rather than reflowed —
up as readily as down — so it always reaches both edges and nothing is ever cut
off the side. Nothing inside it moves relative to anything else, so the
proportions hold at every width; at exactly 1440 the scale is 1 and the page is
the frame. It is anchored top-left rather than centred, because below 1440 an
auto margin resolves to zero and a centred origin would push the scaled frame
off to one side.

### The pieces

**Ticker** — a 1440 x 48 strip over `Header Image.png`, its row of six
notices centred so it starts at x -629 and runs off both edges. Each notice is
pinned to the width the frame measured for it (361 / 304 / 372), so the run
keeps its rhythm even if a glyph advance drifts. Two of the separators are EN
SPACE (U+2002) rather than ordinary spaces — that is what the frame uses, and it
is the reason the first `·` in the Google Partner line sits wider than the rest.

**Menu** — 568 x 64 on `#020108`, three groups 80px apart. The bracket-and-
equals mark overflows its 40 x 24 box on both axes, which is why it is placed at
`-0.752px / -6.75px` instead of being contained. The logo is a 54 x 24 white
mark; the moon sits in a 40px circle with a 1.5px inside stroke.

**Head** — the headline at 72px SF Pro Display Medium, tracking -4% (-2.88px),
with `Building Brands` in `#7f7f82`. A 1px divider at x 873.5 runs from y 122 to
y 458. The lede is 20px SF Pro Regular at 60% black, 400px wide, and breaks into
exactly three lines.

**Images** — three cards. The middle one is 487.5 x 354 and square to the page;
the outer two are 390 x 284 turned 18 degrees and dropped to 70% opacity. Their
`left` / `top` values are computed so that the *rotated* bounding box lands
where the frame puts it, which is why they are not round numbers.

**Ellipse 13** — a 1440px dashed circle whose 24px stroke is centre-aligned, so
the artwork box is 1464 and sits at (-12, 548). Only its top arc is on screen.

### What moves

Everything is written so that its finished state is no transform at all. That
is what lets the page be the frame the moment it stops moving — and
`index.html?motion=off`, or asking your system for less movement, stops it
before it starts. `tools/lge-measure.mjs` checks against that state.

One easing curve does most of the work: a hard expo out,
`cubic-bezier(0.16, 1, 0.3, 1)`. Things cover most of their distance
immediately and then settle, which is what makes a set of separate animations
read as a single movement rather than a list of them.

**The intro.** The strip drops in, the bar follows it, then the two headline
lines are uncovered from below a beat apart, each riding up out of a mask. The
divider draws down from its top, the lede and the button come up behind it, and
the cards land — the middle one first, the two flanking it a beat later.

**The strip.** Four runs of the same six notices, translating left by exactly
one run: 1373px, being three marks, three notices and their 48px gaps. That
puts every item back where its twin was, so the loop has no seam. One pass
takes 34 seconds.

**The bar.** Clicking it grows the bar out into the whole frame — a mega panel
of three columns — rather than dropping a separate sheet over the page. The
equals mark folds into a cross as it goes: the two bars move to a shared centre
line and turn a quarter of the way round in opposite directions. The toggle,
the mark and the pair on the right travel to their new places in the same
movement, the page dims behind, and the three columns and then their rows come
up out of their own masks. Escape or a click outside closes it. The frame
stacks the bar underneath everything else, which is right at 64px tall and
wrong once it is grown, so it is lifted for as long as it is open.

The panels are flat colours rather than white at low alpha. The cards behind
are on their own compositing layers, and anything translucent blended over them
left a one-level ghost of their bounding boxes — invisible in use, but visible
the moment the contrast is pushed.

The menu's labels are placeholders — the Figma file has no menu frame yet.
They are two lists and a feature card near the top of `index.html`.

**The cards.** Six cards over six slots: the three the frame draws, and three
more parked off the page. Every 3.5 seconds each card moves one slot to the
left, morphing between the outer shape (390 x 284, turned 18 degrees) and the
middle one (487.5 x 354, square) as it passes through. The card that runs off
the left end is put back on the right with its transition switched off, which
is invisible because both ends are off screen. Six slots against three pictures
means the run repeats every third step, so the frame's own arrangement comes
back around. It pauses while the tab is in the background.

The middle card is the active one and wears its picture in colour; the two
outside it wear the drawing. Each card holds both, stacked, and they cross over
as it takes the middle slot.

**The buttons.** One idea everywhere: the label sits in a mask with a copy of
itself waiting underneath, and on hover the two travel together — the visible
one leaves upwards as its twin arrives. The control moves at the same time, so
it reads as a single gesture rather than a text effect bolted onto a colour
change. The arrow on *See Our Works* does the same thing sideways.

### The card pictures

The frame ships one picture per card, but the run needs two of each: the
drawing the outer cards wear and the colour the middle one does. Two of the
three arrive as the drawing and one as the colour, so `tools/colorize.py` fills
in the other halves — needs Pillow, and is only run when a source picture
changes:

```bash
pip install pillow && python3 tools/colorize.py
```

Colour is a multiply: a warm paper ground with a flat disc on it, and the
drawing multiplied over the top. Ink stays ink, paper takes the ground, and the
halftone reads as dots of the colour underneath. The one card that starts life
as a photograph gets a desaturation for its inactive state instead.

The outputs — `Image 2 Color.png`, `Image 3 Color.png`, `Image 1 BW.png` — are
committed, so a hand-made replacement can simply be dropped over one of them.

### Fonts

The frame uses SF Pro Display Medium and Regular, and SF Pro Regular for the
lede. The originals in `assets/fonts/` are a 335KB OTF pair and a 23MB variable
TTF, so the page loads woff2 builds instead:

- `SFProDisplay-Regular.woff2` / `SFProDisplay-Medium.woff2` — straight repacks
  of the OTFs. Nothing is subsetted, so every glyph and metric survives.
- `SF-Pro-subset.woff2` — the variable font pinned to the `Regular` instance the
  frame uses (`wdth` 100, `opsz` 28, `wght` 400) and cut down to Latin-1 plus the
  punctuation the copy needs. 23MB becomes 30KB, with identical metrics.

The OTF and TTF originals stay in `src` behind the woff2 as a fallback.

### Checking it against the frame

`tools/lge-measure.mjs` opens the page with `motion=off`, diffs every box
against the numbers read off the Figma frame, checks that the strip's runs are
exactly one run apart, and writes a 2x screenshot. It exits non-zero on
anything more than half a pixel out.

```bash
cd tools
npm install
npm run lge
```

---

# CoreSpace (`corespace.html`)

Website built from the CoreSpace Figma design. Plain HTML, CSS and one script —
no build step, no dependencies, no install.

## Viewing it

Double-click `index.html`. That's it.

## Layout

```
index.html          the page
css/style.css       all styles
js/scene.js         the choreography: fades, fills, the shrink, the tag
js/smooth.js        eases wheel scrolling so the cameras glide
assets/             Figma exports and video — see assets/README.md
tools/              optional checks, not needed to run the site
```

## The loader

Figma `Loader` (372:1852). A black sheet over everything while its clip — the
burst, trimmed to its last seven seconds — plays once. The counter rides the
clip's own playhead, so 100% lands exactly as the burst whites out, and then
the sheet lifts over 900ms into the hero, whose reveal waits for it — the copy
wipes on just as the white clears. The copy block runs on `mix-blend-mode:
exclusion`, so the rays print through the text and squares where they cross.
Scroll is held while the sheet is up. If the clip cannot play, the loader gets
out of the way instead of standing over the page.

## The sections

Four: two pinned while their own stretch of scroll plays out, one that rides up
over the second, and a last one the third opens out into.

**Hero** — Figma `Hero` (356:1231).

One clip runs the whole hero. It is the flight and the transition that follows
it joined into a single file — they were generated as one continuous shot, the
second starting on exactly the frame the first ends on — so there is no cut in
it anywhere.

At rest it idles on a loop that runs a couple of seconds into the transition
(`HERO_LOOP_END`), and the scroll then carries it on **from whatever frame the
loop happens to be showing** rather than from a fixed mark. That is the whole
point: nothing is ever crossed, faded or jumped to, so it reads as one camera
continuing to move rather than a cut to another shot. Measured across the
hand-off, the largest single-frame step in the playhead is under one frame.

The copy fades over the first stretch. The scroll drives the clip on to its
end, where its own flare has filled the screen; a white sheet closes the last of
that, and the section below lifts its twin sheet off video 3, so the seam
between the two is white on white and the whole thing reads as one shot: into
the light, through it, out into the tunnel.

`HERO_SCRUB_FROM` / `HERO_SCRUB_BY` in `js/scene.js` set which stretch of the
hero's scroll the clip is mapped onto, and `FLASH_IN_FROM` where the sheet
starts closing.

The headline and the lead wipe on at load, line by line: each line is uncovered
left to right with a solid white rectangle — sharp corners, no fade — riding
the reveal's edge, the lines setting off a beat apart (`REVEAL_MS` /
`REVEAL_STAGGER`). Once its line has been revealed, the tail of the second line
retypes itself on a loop through `SWAP_PHRASES` — orbital data centers, power
generation, data transmission, sustainability in space — a character at
a time, each typed character arriving in the accent and settling to white the way the tunnel's copy does, the reveal's rectangle standing in as the cursor. The flight's device
copy and both cards' copy run the same wipe every time they come on.

The tag line above the headline rotates through five points on its own clock
(`TAG_LINES` / `TAG_PERIOD` in `js/scene.js`): the next line tips in from below
while the old one tips up and away, and the text box's width glides to the new
line — the left square holds the 56px column while the right one slides,
keeping 40px of air on both sides of the text throughout.

The partner logos along the bottom edge are one static row in the design, wider
than the window. Here they run: the list is repeated once and the track travels
exactly one copy's width, which puts every logo back where its twin was, so the
loop has no seam. `--logos-period` in the CSS sets the pace.

Both buttons are the uploaded exports — `assets/images/buttonSecondary.svg` for
the light one in the bar, `buttonPrimary.svg` for the primary one under the
lead. That one is the solid plate, so the label always has its own ground; its
glow is drawn into the same canvas and hangs off the button on every side. Two
see-through variants of it sit beside it in the folder.

**Our role** — Figma `section 2` (238:2674) through `section 2.1` (242:2673)
and into `section 3` (242:2681), all on one scroll.

Video 3 answers to the scroll from its first frame, and so does the clip in the
container that follows it — neither ever plays on its own. The same scroll
writes the copy on and moves the containers.

Two passages write themselves on in turn once the flash is gone, one after the
other on the same spot, each over its own stretch of the scroll (`TEXT_SPANS`)
so the first is gone before the second starts and they never share the frame. Every character is its
own span, and two edges move through them: a head that writes characters on and
a tail that rubs them out a fixed distance behind, so what is on screen is a
window of about 26 characters sliding through the sentence rather than the whole
of it. A character arrives holding the accent blue and settles to white about a
third of a second later, which is what makes the leading edge read as coloured
and the body behind it plain — and it leaves from white, so the accent never
shows on the way out.

The whole effect is `TEXT_TRAIL` in `js/scene.js`: raise it past the statement's
length and nothing ever dissolves, leaving a plain reveal. The timing of one
character's turn is the CSS transition on `.role__statement span`, not the
script — the script only ever moves the two edges.

The shot is never packed away: it holds the full frame to the last and goes
dark in place as the section below rides up over it. That cover is the overlap
itself — the cards section is pulled a window up into this one, so the last
stretch of scroll here carries it over the pinned stage rather than pushing it
along. The dimming and the cover finish together, which is what stops the
incoming edge sweeping across a lit frame.

**Cards** — Figma `Cards` (339:343).

Not a pinned scene: it scrolls past like any other block, so what drives it is
how far it has come up the window rather than an offset inside it
(`progressUp`). The heading fills in reading order — which is the state the
frame draws it in, half read — the two cards rise into place as they arrive,
and the pair trade width: they come in the other way round and the right one
gives way while the left is revealed, settling on the frame's 915 / 405. The
two widths are read off one `--card-open` so they always sum to the row.

The heading's gradient belongs to the paragraph rather than to any character:
it is painted on the paragraph and clipped to the text, a character that has
been read goes transparent and lets it through, and one that has not paints its
own 20% over the top.

No section veils its media — every clip runs at full strength.

Nothing plays on its own anywhere except the hero's idle loop and the partner
row.

The constants at the top of `js/scene.js` control the intro length and both
fades; `--scene-length-hero` and `--scene-length-role` in the CSS control how
much scroll each move is spread over.

**Outside the spacecraft** — Figma `Shot 2` (342:1556) into `Shot 3` (342:1597).

The wide card above opens out in two moves, and it is the whole card that
moves — frame, ticks and copy together, with the clip filling it throughout.
First it widens across the space both cards held, keeping its own height and
its place in the row — and the narrow card folds against it, pinned to the
row's right edge and giving up exactly the width the wide one gains, their
facing edges closing on the 8px gap. It folds in the same frozen frame the
wide card grows in, sharing its top and height throughout; left in the page it
would go on scrolling up while the wide card held still. Then it carries on into the window, and its copy fades as
it goes, so that by the time the clip has the screen nothing is left of the
card but the picture. While the card scales, the clip creeps a few frames forward
(`FLIGHT_PREROLL`) — still well inside the cupola, never out through the
glass — and the flight proper picks up from exactly where the creep leaves
off, so the playhead never jumps.

Both moves grow from where the card stood when the scene began, not from where
it is now: the row goes on scrolling away underneath while the card lifts out
of it, and tracking it instead drags the box up off the screen. That start is
recovered rather than captured — the scene's own top is how far the scroll has
come into it, so adding it back gives where the row stood at zero, recomputed
every frame so arriving at any scroll position lands on the right box. It is
measured off the row and never off the card, which by then is fixed and would
only report back the position this same code just gave it.

The clip then flies out through the illuminator to the satellite. The intro copy
writes itself on the way the tunnel's passages do — a window of characters
sliding through the sentence — and writes itself off again; the device copy
arrives in the bottom-left once the satellite is all that is left.

`FLIGHT_WIDEN_BY` / `FLIGHT_OPEN_BY` / `FLIGHT_RUN_BY` in `js/scene.js` set
where each move ends
and the clip's run finishes; `TEXT_IN_FROM` / `TEXT_IN_BY` and `DEVICE_FROM` the
two blocks of copy.

## Design parity

The sections reproduce Figma nodes `356:1231`, `238:2674` and `242:2673` at
1440x810. Elements carry a `data-node-id` attribute naming the Figma node they
came from, and the CSS comments name the node each rule was read off, so any
value can be traced back to the design.

`tools/measure.mjs` diffs every box, text origin and gap against the design
numbers — all currently match exactly. See [`tools/README.md`](./tools/README.md).

## Sizing

A frame fills the window rather than sitting as a 1440px box in the middle of
it — video runs edge to edge and the copy keeps its designed insets. At exactly
1440x810 every measurement equals the Figma frame.

- **Wider than 1440** — the frame stretches and the video widens with it. Type
  stays at its designed size.
- **Any height** — the stage fills the window.
- **Narrower than 980** (`--frame-min-width`) — nothing left to stretch into,
  so the whole frame scales down proportionally, holding every padding and
  margin at its designed ratio. The 980 is set by the hero's headline, which
  runs about 868 wide from its 56px margin. That is a stopgap — replace it with
  real breakpoints once tablet and mobile frames exist in Figma.

## Publishing

Everything is static, so any host works — copy `index.html`, `css/`, `js/` and
`assets/` to the server root. No configuration needed.

## Assets

Every asset the sections use is in place. See
[`assets/README.md`](./assets/README.md) for where each one came from, how the
video is encoded, and the handful of notes on the exports.
