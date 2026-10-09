"""Болотный Хаб: cut characters off their flat grey sheet backgrounds for overlays.

The background is flood-filled from the borders of each half (PIL floodfill with a colour threshold),
everything else is kept; the result is cropped to its bounding box and saved as RGBA PNG.
usage: python3 tools/hub_cutout.py
"""
import os
from PIL import Image, ImageDraw, ImageFilter

HUB = os.path.join(os.path.dirname(__file__), "..", "public", "hub")
OUT = os.path.join(HUB, "cut")
KEY = (255, 0, 255)

# name: (sheet, x0, x1) — which part of the sheet holds the figure
CUTS = {
    "snezhana-face": ("snezhana", 780, 1536),
    "snezhana-body": ("snezhana", 0, 560),
    "glazik-big": ("glazik", 760, 1536),
    "glazik-small": ("glazik", 0, 640),
    "pomidorych-face": ("pomidorych", 780, 1536),
    "dedkod-face": ("dedkod", 760, 1536),
    "timosha-face": ("timosha", 760, 1536),
    "gleb-face": ("gleb", 760, 1536),
}


def cut(sheet, x0, x1, thresh=34):
    img = Image.open(os.path.join(HUB, "chars", sheet + ".webp")).convert("RGB").crop((x0, 0, x1, 1024))
    w, h = img.size
    filled = img.copy()
    seeds = [(x, y) for x in range(0, w, 24) for y in (0, h - 1)] + [(x, y) for y in range(0, h, 24) for x in (0, w - 1)]
    for xy in seeds:
        if filled.getpixel(xy) != KEY:
            ImageDraw.floodfill(filled, xy, KEY, thresh=thresh)
    alpha = Image.new("L", (w, h), 255)
    px, ap = filled.load(), alpha.load()
    for y in range(h):
        for x in range(w):
            if px[x, y] == KEY:
                ap[x, y] = 0
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1))
    out = img.copy()
    out.putalpha(alpha)
    return out.crop(alpha.getbbox())


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, (sheet, x0, x1) in CUTS.items():
        im = cut(sheet, x0, x1)
        im.save(os.path.join(OUT, name + ".png"), optimize=True)
        print(name, im.size)
