# CoreSpace

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
