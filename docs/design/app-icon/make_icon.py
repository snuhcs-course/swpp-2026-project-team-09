#!/usr/bin/env python3
################################################################################
# AI-generated with Claude
#
# 2026-11-18  Opus 5.5   prompted by TaeHyun79
################################################################################

# Writes the app icon's master and every image derived from it: the SVGs beside this script, then the PNGs that
# mobile/app.json names and the sign-in screen's wordmark. README.md gives the commands.
import io
import math
import sys
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
FONT = ROOT / "mobile/assets/fonts/Pretendard-Bold.otf"
IMAGES = ROOT / "mobile/assets/images"

NAVY, PIN, BG, WHITE = "#001A72", "#2F6BFF", "#FFFFFF", "#FFFFFF"

# "now" is drawn in its own units, placed by translate(NOW_X,BASELINE) scale(NOW_SCALE).
NOW_X, BASELINE, NOW_SCALE, STROKE = 19.6, 70, 0.78, 5.5
N_PATH = "M2.75,0V-10.5A8,8 0 0 1 18.75,-10.5V0"
W_PATH = "M51.25,-21V-9A6,6 0 0 0 63.25,-9V-15M63.25,-9A6,6 0 0 0 75.25,-9V-21"
# n's left edge (2.75 - 2.75), the top of n's arch (-10.5 - 8 - 2.75), and w's right edge (75.25 + 2.75).
NOW_LEFT, NOW_TOP, NOW_RIGHT = 0, -21.25, 78

# The person marker: a square with three fully rounded corners; rotate(-45) points the sharp one down.
PIN_X, PIN_Y, PIN_SCALE, HOLE_R = 35, -10.5, 0.525, 5
PIN_PATH = "M-20,0A20,20 0 0 1 0,-20A20,20 0 0 1 20,0A20,20 0 0 1 0,20L-20,20Z"
PIN_TOP, PIN_TIP = -20, 20 * math.sqrt(2)  # in the marker's own units, after the rotation
_r = f"{HOLE_R / PIN_SCALE:.4f}"
HOLE_CUT = f"M-{_r},0A{_r},{_r} 0 1 0 {_r},0A{_r},{_r} 0 1 0 -{_r},0Z"


def snu_glyphs():
    """SNU outlined from Pretendard Bold, cap height about 18, baseline y = 44, centred on its ink."""
    f = TTFont(FONT)
    gs, cmap, upm = f.getGlyphSet(), f.getBestCmap(), f["head"].unitsPerEm
    k = 25 / upm  # font-size 25 in the 100-unit icon
    spacing = 1 / k  # letter-spacing 1
    glyphs, x, xmin, xmax, ymin, ymax = [], 0.0, None, None, math.inf, -math.inf
    for ch in "SNU":
        name = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[name].draw(pen)
        bp = BoundsPen(gs)
        gs[name].draw(bp)
        b = bp.bounds
        xmin = x + b[0] if xmin is None else xmin
        xmax = x + b[2]
        ymin, ymax = min(ymin, b[1]), max(ymax, b[3])
        glyphs.append((x, pen.getCommands()))
        x += gs[name].width + spacing
    x0 = 50 - (xmax - xmin) * k / 2 - xmin * k  # centre the ink, not the advances
    paths = [(f"translate({x0 + gx * k:.3f},44) scale({k:.5f},{-k:.5f})", d) for gx, d in glyphs]
    return paths, (x0 + xmin * k, 44 - ymax * k, x0 + xmax * k, 44 - ymin * k)


SNU_PATHS, SNU_INK = snu_glyphs()


def ink_box():
    """The wordmark's ink in the master's units: left, top, right, bottom."""
    pin_bottom = PIN_Y + PIN_TIP * PIN_SCALE
    now = (NOW_X + NOW_SCALE * NOW_LEFT, BASELINE + NOW_SCALE * NOW_TOP,
           NOW_X + NOW_SCALE * NOW_RIGHT, BASELINE + NOW_SCALE * pin_bottom)
    return (min(SNU_INK[0], now[0]), min(SNU_INK[1], now[1]), max(SNU_INK[2], now[2]), max(SNU_INK[3], now[3]))


def pin(fill, hole, indent):
    """The pin with a white hole, as the master has it, or with the hole cut out when hole is None."""
    t = f"translate({PIN_X},{PIN_Y}) rotate(-45) scale({PIN_SCALE})"
    if hole is None:
        return f'{indent}<path fill="{fill}" fill-rule="evenodd" transform="{t}" d="{PIN_PATH}{HOLE_CUT}"/>'
    return (f'{indent}<path fill="{fill}" transform="{t}" d="{PIN_PATH}"/>\n'
            f'{indent}<circle cx="{PIN_X}" cy="{PIN_Y}" r="{HOLE_R}" fill="{hole}"/>')


def wordmark(letters=NAVY, pin_fill=PIN, hole=BG, indent="  "):
    i, j, k = indent, indent + "  ", indent + "    "
    snu = "\n".join(f'{j}<path transform="{t}" d="{d}"/>' for t, d in SNU_PATHS)
    return f'''{i}<g fill="{letters}">
{snu}
{i}</g>
{i}<g transform="translate({NOW_X},{BASELINE}) scale({NOW_SCALE})">
{j}<g fill="none" stroke="{letters}" stroke-width="{STROKE}">
{k}<path d="{N_PATH}"/>
{k}<path d="{W_PATH}"/>
{j}</g>
{pin(pin_fill, hole, j)}
{i}</g>'''


def svg(view_box, body, width, height):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="{view_box}">\n'
            f'{body}\n</svg>\n')


def master():
    return svg("0 0 100 100", f'  <rect width="100" height="100" fill="{BG}"/>\n{wordmark()}', 1024, 1024)


def adaptive_layer(**colours):
    """The master's 100 units on the middle 72 dp of the 108 dp layer: u becomes 18 + 0.72 u."""
    body = f'  <g transform="translate(18,18) scale(0.72)">\n{wordmark(indent="    ", **colours)}\n  </g>'
    return svg("0 0 108 108", body, 1024, 1024)


def cropped(margin, width):
    """The whole wordmark, cropped to its ink with a margin on each side."""
    x0, y0, x1, y1 = ink_box()
    w, h = x1 - x0 + 2 * margin, y1 - y0 + 2 * margin
    return svg(f"{x0 - margin:.3f} {y0 - margin:.3f} {w:.3f} {h:.3f}", wordmark(), width, round(width * h / w))


def notification(size=96, margin=8):
    """The pin alone, white, its hole cut out, with the margin that Android's 24 dp grid keeps (2 dp)."""
    height = PIN_TIP - PIN_TOP
    side = height * size / (size - 2 * margin)
    top = PIN_TOP - (side - height) / 2
    body = f'  <path fill="{WHITE}" fill-rule="evenodd" transform="rotate(-45)" d="{PIN_PATH}{HOLE_CUT}"/>'
    return svg(f"{-side / 2:.3f} {top:.3f} {side:.3f} {side:.3f}", body, size, size)


SVGS = {
    "snu-now-icon.svg": master(),
    "android-icon-foreground.svg": adaptive_layer(),
    "android-icon-monochrome.svg": adaptive_layer(pin_fill=NAVY, hole=None),
    "splash-icon.svg": cropped(margin=2, width=1024),
    "sign-in-wordmark.svg": cropped(margin=0, width=660),
    "notification-icon.svg": notification(),
}

# Each PNG in mobile/assets/images/, its SVG, and its width in px (None: the SVG's own size). The kind is "opaque" for
# no alpha channel, "alpha", or a colour that every pixel takes, so that the edges' antialiasing keeps only the alpha.
PNGS = [
    ("icon.png", "snu-now-icon.svg", None, "opaque"),
    ("favicon.png", "snu-now-icon.svg", 48, "opaque"),
    ("android-icon-foreground.png", "android-icon-foreground.svg", None, "alpha"),
    ("android-icon-monochrome.png", "android-icon-monochrome.svg", None, NAVY),
    ("splash-icon.png", "splash-icon.svg", None, "alpha"),
    ("sign-in-wordmark.png", "sign-in-wordmark.svg", None, "alpha"),
    ("notification-icon.png", "notification-icon.svg", None, WHITE),
]


def main():
    for name, text in SVGS.items():
        (HERE / name).write_text(text)
    if "--svg-only" in sys.argv[1:]:
        return
    import cairosvg
    from PIL import Image

    for png, source, width, kind in PNGS:
        raw = cairosvg.svg2png(bytestring=SVGS[source].encode(), output_width=width, output_height=width)
        image = Image.open(io.BytesIO(raw)).convert("RGBA")
        if kind == "opaque":
            image = image.convert("RGB")
        elif kind != "alpha":
            image = Image.merge("RGBA", (*Image.new("RGB", image.size, kind).split(), image.getchannel("A")))
        image.save(IMAGES / png, optimize=True)
        print(f"{png}: {image.width} x {image.height} {image.mode}")


if __name__ == "__main__":
    main()
