import { loadFont } from "@remotion/fonts";
import React from "react";
import { AbsoluteFill, Audio, Composition, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";

// Болотный Хаб in the cloudcore manner: square, ~1.3 s hard cuts, no voice, a tiny mono line in the middle.
const FPS = 30;
const SIZE = 1080;

loadFont({ family: "Liberation Mono", url: staticFile("fonts/LiberationMono-Regular.ttf"), weight: "400" });

// clips: a = capsule, night eye, open space, gift, socks, lobby; b = Snezhana at night, robot, eye, Pomidorych, jar
type Shot =
  | { kind: "clip"; src: "a" | "b"; from: number; len: number; cx?: number; text: string }
  | { kind: "still"; img: string; len: number; text: string };

// Cloud Core: 129 BPM, first beat at 0.372 s; a cut every two beats, alternating light / dark and wide / close
const BEAT0 = 0.372;
const BEAT = 0.4644;
const STEP = BEAT * 2;
const SHOTS: Shot[] = [
  { kind: "clip", src: "a", from: 7.6, len: BEAT0 + STEP, text: "??" },
  { kind: "clip", src: "a", from: 6.1, len: STEP, text: "!!!" },
  { kind: "clip", src: "a", from: 2.2, len: STEP, text: "ты ещё тут?" },
  { kind: "clip", src: "a", from: 3.6, len: STEP, text: "заходи!!" },
  { kind: "clip", src: "a", from: 0.3, len: STEP, cx: 0.62, text: "эй" },
  { kind: "clip", src: "b", from: 6.3, len: STEP, text: "зависит." },
  { kind: "clip", src: "b", from: 2.3, len: STEP, text: "× × ×" },
  { kind: "still", img: "scenes/ep0-weekend", len: STEP, text: "суббота!!" },
  { kind: "clip", src: "b", from: 0.2, len: STEP, text: "Эй, иди сюда!!" },
  { kind: "clip", src: "b", from: 4.4, len: STEP, cx: 0.6, text: "..." },
  { kind: "clip", src: "a", from: 5.0, len: STEP, text: "беги." },
  { kind: "clip", src: "b", from: 8.3, len: 1.0, text: "× × ×" },
];

const starts = SHOTS.reduce<number[]>((acc, s, i) => [...acc, i ? acc[i - 1] + SHOTS[i - 1].len : 0], []);
const END = starts[starts.length - 1] + SHOTS[SHOTS.length - 1].len;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const ShotView: React.FC<{ shot: Shot }> = ({ shot }) => {
  const f = useCurrentFrame();
  const z = 1.06 + 0.04 * (f / (shot.len * FPS));
  if (shot.kind === "still") {
    return (
      <Img
        src={staticFile(`hub/ps1/${shot.img}.png`)}
        style={{ position: "absolute", width: SIZE, height: SIZE, objectFit: "cover", transform: `scale(${z})`, imageRendering: "pixelated" }}
      />
    );
  }
  // 16:9 clip in a square window: full height, horizontal centre at cx
  const w = (SIZE * 16) / 9;
  const left = SIZE / 2 - w * (shot.cx ?? 0.5);
  return (
    <OffthreadVideo
      src={staticFile(`hub/anim/${shot.src}.mp4`)}
      startFrom={Math.round(shot.from * FPS)}
      muted
      style={{ position: "absolute", top: 0, left: Math.min(0, Math.max(SIZE - w, left)), width: w, height: SIZE, maxWidth: "none", transform: `scale(${z})` }}
    />
  );
};

const Line: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Liberation Mono",
      fontSize: 34,
      color: "#f4f4f4",
      textShadow: "0 0 6px rgba(0,0,0,0.9), 0 2px 2px rgba(0,0,0,0.8)",
      letterSpacing: 2,
    }}
  >
    {text}
  </div>
);

// every beat the picture hops: a quick push and lift that settles before the next one
const hop = (t: number) => {
  if (t < BEAT0) return 0;
  const phase = ((t - BEAT0) % BEAT) / BEAT;
  return Math.exp(-phase * 7);
};

// VHS: RGB split through an SVG filter, scanlines, tape noise, a rolling tracking band, PLAY overlay
const VhsDefs: React.FC<{ shift: number }> = ({ shift }) => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <filter id="vhs" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
      <feOffset in="r" dx={shift} dy={0} result="r2" />
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
      <feOffset in="b" dx={-shift} dy={0} result="b2" />
      <feBlend in="r2" in2="g" mode="screen" result="rg" />
      <feBlend in="rg" in2="b2" mode="screen" />
    </filter>
  </svg>
);

const rand = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const Vhs: React.FC<{ f: number }> = ({ f }) => {
  const band = ((f * 7) % (SIZE + 200)) - 100;
  const t = f / FPS;
  const ss = Math.floor(t);
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.28) 0px, rgba(0,0,0,0.28) 2px, transparent 2px, transparent 5px)",
          mixBlendMode: "multiply",
        }}
      />
      <div style={{ position: "absolute", left: 0, right: 0, top: band, height: 60, background: "rgba(255,255,255,0.07)", filter: "blur(6px)" }} />
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <div
          key={k}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: rand(f * 7 + k) * SIZE,
            height: 1 + rand(f + k * 3) * 3,
            background: `rgba(255,255,255,${0.12 + rand(f * 3 + k) * 0.25})`,
          }}
        />
      ))}
      <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 180px rgba(0,0,0,0.75)" }} />
      <div style={{ position: "absolute", left: 48, top: 40, fontFamily: "Liberation Mono", fontSize: 38, color: "#fff", textShadow: "2px 0 #f0f, -2px 0 #0ff" }}>
        PLAY ▶
      </div>
      <div style={{ position: "absolute", left: 48, bottom: 40, fontFamily: "Liberation Mono", fontSize: 32, color: "#fff", textShadow: "2px 0 #f0f, -2px 0 #0ff" }}>
        {`OCT. 09 1998  00:00:${String(ss).padStart(2, "0")}`}
      </div>
    </>
  );
};

const LiminalVideo: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const h = hop(t);
  const jitter = (rand(f) - 0.5) * 6;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <VhsDefs shift={4 + h * 6} />
      <AbsoluteFill
        style={{
          filter: "url(#vhs) saturate(0.8) contrast(1.08) sepia(0.12) blur(0.6px)",
          transform: `translate(${jitter}px, ${-h * 22}px) scale(${1 + h * 0.07})`,
        }}
      >
        {SHOTS.map((s, i) => (
          <Sequence key={i} from={Math.round(starts[i] * FPS)} durationInFrames={Math.round(s.len * FPS)}>
            <ShotView shot={s} />
            <Line text={s.text} />
          </Sequence>
        ))}
      </AbsoluteFill>
      <Vhs f={f} />
      <Audio src={staticFile("hub/music-cloudcore.mp3")} volume={() => interpolate(t, [0, 0.05, END - 0.3, END], [0, 1, 1, 0], clamp)} />
    </AbsoluteFill>
  );
};

export const LiminalComposition = () => (
  <Composition id="HubLiminal" component={LiminalVideo} durationInFrames={Math.round(END * FPS)} fps={FPS} width={SIZE} height={SIZE} />
);
