"""Self-synthesized foley for ep5: canister hiss, wind, a dull thud and a rubber stamp."""
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


def save(name, x, peak=0.8):
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    with wave.open(os.path.join(OUT, f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    # hiss: bright noise (white minus its own lowpass), opening like a valve
    n = int(2.4 * SR)
    w = rng.standard_normal(n)
    hiss = (w - lowpass(w, 0.25)) * env(n, 0.25, 0.6)
    save("hiss", hiss, 0.6)
    # wind: dark noise that swells and gusts
    n = int(8 * SR)
    w = lowpass(rng.standard_normal(n), 0.02)
    t = np.arange(n) / SR
    gust = 0.55 + 0.45 * np.sin(t * 1.3) * np.sin(t * 0.37 + 1)
    save("wind", w * gust * env(n, 1.0, 1.5), 0.7)
    # thud: a falling low sine with a little crunch
    n = int(0.6 * SR)
    t = np.arange(n) / SR
    thud = np.sin(2 * np.pi * (70 * t - 30 * t * t)) * np.exp(-t * 9) + 0.25 * lowpass(rng.standard_normal(n), 0.3) * np.exp(-t * 30)
    save("thud", thud, 0.85)
    # stamp: a click and a short knock on wood
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    stamp = 0.6 * np.sin(2 * np.pi * 180 * t) * np.exp(-t * 28) + 0.8 * rng.standard_normal(n) * np.exp(-t * 120)
    save("stamp", stamp, 0.8)
    print("ok")
