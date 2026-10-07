"""Self-synthesized sound for ep5. Everything Vozdukhan does happens off screen, so it is heard, not seen:
surf for the shore, and far-away events (a pop, brakes behind the cape, wind) muffled and smeared by distance."""
import os, wave
import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "ep5")
rng = np.random.default_rng(5)


def lowpass(x, a):
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += a * (v - acc)
        y[i] = acc
    return y


def env(n, attack, release):
    e = np.ones(n)
    a, r = int(attack * SR), int(release * SR)
    e[:a] = np.linspace(0, 1, a)
    e[n - r:] = np.linspace(1, 0, r)
    return e


def far(x, tail=1.6, wet=0.6):
    """distance: darker, and a long diffuse tail like a sound across a bay"""
    n = int(tail * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 4.5)
    ir = lowpass(ir, 0.08)
    out = np.convolve(x, ir)[: len(x) + n]
    out = np.pad(out, (0, len(x) + n - len(out)))
    dry = np.concatenate([x, np.zeros(n)])
    out = out / (np.max(np.abs(out)) + 1e-9) * np.max(np.abs(x))
    return lowpass((1 - wet) * dry + wet * out, 0.12)


def save(name, x, peak=0.8):
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    with wave.open(os.path.join(OUT, f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    t = lambda n: np.arange(n) / SR

    # surf: a bed of dark noise; every wave swells, breaks into hiss and draws back. 24 s, loops cleanly at wave troughs
    n = int(24 * SR)
    tt = t(n)
    dark = lowpass(rng.standard_normal(n), 0.03)
    bright = rng.standard_normal(n) - lowpass(rng.standard_normal(n), 0.4)
    waves = np.zeros(n)
    for start, length in [(0.3, 6.2), (6.0, 5.4), (11.2, 6.6), (17.4, 6.2)]:
        a = (tt - start) / length
        shape = np.where((a > 0) & (a < 1), np.sin(np.pi * np.clip(a, 0, 1)) ** 2 * np.exp(-2.5 * np.clip(a - 0.35, 0, 1)), 0)
        waves += shape
    surf = dark * (0.35 + 0.65 * waves) + 0.12 * bright * waves**2
    save("surf", surf * env(n, 0.3, 0.3), 0.6)

    # a pop somewhere far off: a frame leaving its wall
    n = int(0.25 * SR)
    pop = rng.standard_normal(n) * np.exp(-t(n) * 40) + np.sin(2 * np.pi * 60 * t(n)) * np.exp(-t(n) * 15)
    save("pop", far(pop, 1.8, 0.7), 0.7)

    # brakes behind the cape: a wavering squeal, then a dull knock
    n = int(2.2 * SR)
    tt = t(n)
    f = 1900 + 160 * np.sin(2 * np.pi * 7 * tt) + 300 * tt
    squeal = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.15, 0.8) * 0.5
    squeal += 0.3 * (rng.standard_normal(n) - lowpass(rng.standard_normal(n), 0.5)) * env(n, 0.1, 1.0)
    knock = np.zeros(n)
    k0 = int(1.6 * SR)
    kk = n - k0
    knock[k0:] = np.sin(2 * np.pi * 55 * t(kk)) * np.exp(-t(kk) * 9)
    save("brakes", far(squeal + 1.5 * knock, 1.5, 0.6), 0.7)

    # a fluorescent tube in the water: mains hum with harmonics, dropping out as it flickers
    n = int(6 * SR)
    tt = t(n)
    hum = sum(np.sin(2 * np.pi * 100 * h * tt) / h for h in (1, 2, 3, 5, 7)) + 0.15 * rng.standard_normal(n)
    gate = np.ones(n)
    for a, b in [(1.1, 1.18), (1.3, 1.34), (3.2, 3.5), (4.4, 4.45), (4.52, 4.6)]:
        gate[int(a * SR) : int(b * SR)] = 0.05
    save("buzz", lowpass(hum * gate, 0.5) * env(n, 0.05, 0.3), 0.5)

    # wet wood creaking as the frame rocks
    n = int(1.4 * SR)
    tt = t(n)
    clicks = (rng.random(n) < (0.004 + 0.02 * np.sin(np.pi * tt / 1.4))).astype(float)
    creak = np.convolve(clicks, np.sin(2 * np.pi * 420 * t(400)) * np.exp(-t(400) * 300), "same")
    save("creak", lowpass(creak, 0.3) * env(n, 0.1, 0.3), 0.6)

    # wind: dark noise that swells and gusts
    n = int(8 * SR)
    tt = t(n)
    w = lowpass(rng.standard_normal(n), 0.02)
    gust = 0.55 + 0.45 * np.sin(tt * 1.3) * np.sin(tt * 0.37 + 1)
    save("wind", w * gust * env(n, 1.0, 1.5), 0.7)

    # the valve: bright noise opening slowly (also the breath at the end)
    n = int(3.0 * SR)
    w = rng.standard_normal(n)
    save("hiss", (w - lowpass(w, 0.25)) * env(n, 0.8, 0.8), 0.6)

    # a dull thud, far
    n = int(0.6 * SR)
    tt = t(n)
    thud = np.sin(2 * np.pi * (70 * tt - 30 * tt * tt)) * np.exp(-tt * 9)
    save("thud", far(thud, 1.2, 0.5), 0.85)
    print("ok")
