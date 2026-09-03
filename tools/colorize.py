"""Builds the two states each card image needs.

The frame ships one picture per card. The carousel needs two of each: the
drawn black and white the outer cards wear, and the colour the middle one
does. Two of the three are already the drawing, one is already the colour, so
this fills in the other halves.

Colour is a multiply: a warm paper ground with a flat disc laid on it, with
the drawing multiplied over the top. Ink stays ink, paper takes the ground,
and the halftone reads as dots of the colour underneath — which is what the
reference does.

    pip install pillow && python3 tools/colorize.py
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAPER = (243, 240, 235)
ORANGE = (244, 55, 15)
INK = (26, 24, 22)


def ground(size, disc, bar=None):
    """Warm paper, one flat disc, and an optional solid bar."""
    w, h = size
    ss = 4                                    # drawn large, then brought down
    g = Image.new("RGB", (w * ss, h * ss), PAPER)
    d = ImageDraw.Draw(g)
    cx, cy, r = disc
    cx, cy, r = cx * w * ss, cy * h * ss, r * w * ss
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=ORANGE)
    if bar:
        x0, y0, x1, y1 = bar
        d.rectangle([x0 * w * ss, y0 * h * ss, x1 * w * ss, y1 * h * ss], fill=INK)
    return g.resize((w, h), Image.LANCZOS)


def colourise(src, out, disc, bar=None):
    ink = Image.open(src).convert("L")
    # A touch more contrast so the ink stays black once the ground is under it.
    ink = ImageEnhance.Contrast(ink).enhance(1.08)
    base = ground(ink.size, disc, bar)
    px = Image.merge("RGB", (ink, ink, ink))
    Image.blend(px, px, 0)                    # no-op, keeps the intent readable
    from PIL import ImageChops
    ImageChops.multiply(base, px).save(os.path.join(HERE, out))
    print(out, ink.size)


def drawn(src, out):
    """The inactive state for the one card that starts life as a photograph."""
    im = Image.open(src).convert("L")
    im = ImageEnhance.Contrast(im).enhance(1.22)
    im = im.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=3))
    rgb = Image.merge("RGB", (im, im, im))
    # Pull it a shade towards the paper so it sits with the two drawings.
    rgb = Image.blend(rgb, Image.new("RGB", im.size, PAPER), 0.10)
    rgb.save(os.path.join(HERE, out))
    print(out, im.size)


p = lambda n: os.path.join(HERE, n)

# Right card — the desk. Disc where the reference puts it, behind the figure.
colourise(p("Image 2.png"), "Image 2 Color.png", disc=(0.249, 0.269, 0.1374))

# Left card — the isometric block. Same language, disc clear of the building.
colourise(p("Image 3.png"), "Image 3 Color.png", disc=(0.175, 0.30, 0.145))

# Middle card — a photograph, so its inactive state is the desaturation.
drawn(p("Image 1.png"), "Image 1 BW.png")
