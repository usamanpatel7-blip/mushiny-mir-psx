"""Cut muted 9:16 PS1-styled clips out of public/ep3/footage.mp4 (the clip's own audio is dropped)."""
import os, subprocess, sys, tempfile, glob
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from ps1ify import crop, ps1, ROOT

SRC = os.path.join(ROOT, "ep3", "footage.mp4")
OUT = os.path.join(ROOT, "ep3", "clips")
# name: (start, end, cx, cy, zoom) in source seconds / relative frame coords
CLIPS = {
    "room": (0.05, 1.95, 0.53, 0.5, 1.0),
    "keys": (1.96, 2.95, 0.5, 0.5, 1.0),
    "shoulder": (2.96, 5.04, 0.45, 0.5, 1.0),
    "eye": (5.05, 6.04, 0.5, 0.5, 1.0),
    "side": (6.05, 7.12, 0.52, 0.5, 1.0),
}
FF = ["npx", "remotion", "ffmpeg", "-loglevel", "error", "-y"]

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    only = sys.argv[1:]
    for name, (t0, t1, cx, cy, zoom) in CLIPS.items():
        if only and name not in only:
            continue
        with tempfile.TemporaryDirectory() as tmp:
            subprocess.run(FF + ["-ss", str(t0), "-to", str(t1), "-i", SRC, "-an", os.path.join(tmp, "%04d.png")], check=True)
            for f in sorted(glob.glob(os.path.join(tmp, "*.png"))):
                ps1(crop(Image.open(f), cx, cy, zoom)).save(f)
            subprocess.run(FF + ["-framerate", "24", "-i", os.path.join(tmp, "%04d.png"), "-an", "-c:v", "libx264", "-crf", "16",
                                 "-pix_fmt", "yuv420p", os.path.join(OUT, f"{name}.mp4")], check=True)
        print(name)
