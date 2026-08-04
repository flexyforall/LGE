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

Two sections, each pinned while its own stretch of scroll plays out.

**Hero** — Figma `Hero` (356:1231).

One clip loops as the background at its own scale, covering the frame and no
more. The design crops it instead — 356:1233 blows it up to 2616x1472 and
pulls it 100 left and 10 up, so the frame's window lands on the upper-left of
the shot — and those four numbers are kept in a comment beside the rule in case
that is wanted back. The copy is back on the left
margin: label, 72px title, lead line and the primary button all stack on x 56
and centre on the frame. `Progress you can verify` rests on the bottom-right,
directly on top of the partner row.

The scroll fades the copy over the first stretch. With the copy gone the frame
crosses to the transition clip, which never plays on its own — the scroll drives
it frame by frame to its end, where its own flare has filled the screen. A white
sheet closes the last of that, and the section below lifts its twin sheet off
video 3, so the seam between the two is white on white and the whole thing reads
as one shot: into the light, through it, out into the tunnel.

`VIDEO2_FROM` / `VIDEO2_BY` in `js/scene.js` set which stretch of the hero's
scroll the transition is mapped onto, and `FLASH_IN_FROM` where the sheet starts
closing.

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
the light one in the bar, `buttonPrimary2.svg` for the primary one under the
lead. That one is a lit outline over a 20% black wash, so the clip still reads
through the button while the label keeps something to sit on; its glow is drawn
into the same canvas and hangs off the button on every side.

**Our role** — Figma `section 2` (238:2674) through `section 2.1` (242:2673)
and into `section 3` (242:2681), all on one scroll.

Video 3 answers to the scroll from its first frame, and so does the clip in the
container that follows it — neither ever plays on its own. The same scroll
writes the statement on and moves the containers.

The statement writes itself on once the flash is gone. Every character is its
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

Once it is read, the scroll packs the whole shot into section 3's 478x626
container — centred between the bar and the bottom edge, equal air above and
below — where it drops its veil and simply plays, looping. Further scroll
shrinks the box on and sends it out through the left edge while the next
chapter's container (placeholder: the same tunnel, looping) comes in from the
right at 0.4x, grows to the same spot, and finally opens up to the full frame —
the shape of Figma's `section 3.1` reference. The constants for every phase sit
at the top of `js/scene.js`.

Our role puts a 30% veil over its media — the media-at-70% from the design,
kept as a sheet. The hero frame has no veil and runs its clips at full strength.

Nothing plays on its own anywhere except the hero's idle loop and the partner
row.

The constants at the top of `js/scene.js` control the intro length and both
fades; `--scene-length-hero` and `--scene-length-role` in the CSS control how
much scroll each move is spread over.

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
