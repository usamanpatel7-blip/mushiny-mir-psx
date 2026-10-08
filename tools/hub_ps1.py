"""Болотный Хаб: give every generated still the same PS1 finish.

Sources come from different generators (some textures already pixelated, some smooth),
so each one is shrunk by 0.75 and pushed through 15-bit colour with a 4x4 Bayer dither.
The camera framing happens later in Remotion, on the whole image.

usage: python3 tools/hub_ps1.py [name ...]   (names relative to public/hub, e.g. scenes/ep3-1)
"""
import os
import sys
import numpy as np
from PIL import Image

HUB = os.path.join(os.path.dirname(__file__), "..", "public", "hub")
OUT = os.path.join(HUB, "ps1")
SCALE = 0.75

BAYER = (
    np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=np.float32)
    / 16.0
    - 0.5
)


def ps1(img):
    w, h = round(img.width * SCALE), round(img.height * SCALE)
    small = np.asarray(img.convert("RGB").resize((w, h), Image.BILINEAR), dtype=np.float32)
    thr = np.tile(BAYER, (h // 4 + 1, w // 4 + 1))[:h, :w, None] * 8.0
    return Image.fromarray(np.clip(np.round((small + thr) / 8.0) * 8.0, 0, 248).astype(np.uint8))


if __name__ == "__main__":
    names = sys.argv[1:] or [
        f"{d}/{f[:-5]}" for d in ("scenes", "chars") for f in sorted(os.listdir(os.path.join(HUB, d))) if f.endswith(".webp")
    ]
    for name in names:
        dst = os.path.join(OUT, name + ".png")
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        ps1(Image.open(os.path.join(HUB, name + ".webp"))).save(dst, optimize=True)
        print(name)
