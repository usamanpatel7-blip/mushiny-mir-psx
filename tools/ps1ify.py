"""Turn source stills into PS1-looking 1080x1920 frames.

Crop a 9:16 "fixed camera" window, downscale to 270x480, quantize to
15-bit colour with a 4x4 ordered (Bayer) dither, upscale x4 nearest-neighbour.
"""
import os
import sys
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..", "public")
SRC = os.path.join(ROOT, "gen")
OUT = os.path.join(ROOT, "ps1")
IW, IH = 270, 480

BAYER = (
    np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=np.float32)
    / 16.0
    - 0.5
)

# name: (source, cx, cy, zoom) — cx/cy relative to the source image, zoom 1 = largest 9:16 crop
CAMS = {
    "kriptan-wide": ("00-kriptan.jpg", 0.47, 0.5, 1.0),
    "kriptan-face": ("00-kriptan.jpg", 0.49, 0.33, 2.3),
    "kriptan-eye": ("00-kriptan.jpg", 0.44, 0.31, 4.2),
    "kriptan-phone": ("00-kriptan.jpg", 0.685, 0.44, 3.0),
    "kriptan-legs": ("00-kriptan.jpg", 0.47, 0.82, 2.0),
    "tuesday-wide": ("01-tuesday.jpg", 0.5, 0.5, 1.0),
    "tuesday-page": ("01-tuesday.jpg", 0.49, 0.3, 1.9),
    "money": ("02-money.jpg", 0.55, 0.52, 1.25),
    "wednesday": ("03-wednesday.jpg", 0.5, 0.5, 1.0),
    "wednesday-sticker": ("03-wednesday.jpg", 0.56, 0.52, 2.4),
    "week": ("04-week-empty.jpg", 0.5, 0.5, 1.0),
    "bricks-wide": ("05-bricks.jpg", 0.5, 0.52, 1.0),
    "bricks-tag": ("05-bricks.jpg", 0.59, 0.5, 2.2),
    "kebab-wide": ("src-kebab.jpg", 0.56, 0.5, 1.0),
    "kebab-face": ("src-kebab.jpg", 0.56, 0.3, 2.2),
    "kebab-grill": ("src-kebab.jpg", 0.38, 0.78, 1.8),
    "kebab-eyes": ("src-kebab.jpg", 0.63, 0.31, 4.2),
    "soslan-wide": ("src-soslan.jpg", 0.57, 0.5, 1.0),
    "soslan-eye": ("src-soslan.jpg", 0.455, 0.34, 3.4),
    "faces-crates-wide": ("src-faces-crates.jpg", 0.33, 0.5, 1.0),
    "faces-crates-box": ("src-faces-crates.jpg", 0.42, 0.68, 1.9),
    "faces-crates-far": ("src-faces-crates.jpg", 0.7, 0.45, 1.9),
    "faces-suit-wide": ("src-faces-suit.jpg", 0.42, 0.5, 1.0),
    "faces-suit-face": ("src-faces-suit.jpg", 0.6, 0.56, 2.2),
    "faces-suit-light": ("src-faces-suit.jpg", 0.22, 0.2, 2.6),
}


def crop(img, cx, cy, zoom):
    w, h = img.size
    ch = h if w / h >= 9 / 16 else w * 16 / 9
    ch /= zoom
    cw = ch * 9 / 16
    x0 = min(max(cx * w - cw / 2, 0), w - cw)
    y0 = min(max(cy * h - ch / 2, 0), h - ch)
    return img.crop((round(x0), round(y0), round(x0 + cw), round(y0 + ch)))


def ps1(img):
    small = np.asarray(img.convert("RGB").resize((IW, IH), Image.BILINEAR), dtype=np.float32)
    thr = np.tile(BAYER, (IH // 4 + 1, IW // 4 + 1))[:IH, :IW, None] * 8.0
    q = np.clip(np.round((small + thr) / 8.0) * 8.0, 0, 248).astype(np.uint8)
    return Image.fromarray(q).resize((IW * 4, IH * 4), Image.NEAREST)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    only = sys.argv[1:]
    for name, (src, cx, cy, zoom) in CAMS.items():
        if only and name not in only:
            continue
        img = Image.open(os.path.join(SRC, src))
        ps1(crop(img, cx, cy, zoom)).save(os.path.join(OUT, f"{name}.png"), optimize=True)
        print(name)
