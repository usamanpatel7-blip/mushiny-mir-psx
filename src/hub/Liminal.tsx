import { loadFont } from "@remotion/fonts";
import React from "react";
import { AbsoluteFill, Audio, Composition, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";

// Болотный Хаб in the cloudcore manner: square, cuts on the Cloud Core beat, every beat hops,
// a tiny mono line in the middle, VHS on top, and in the later cuts cut-out figures intruding.
const FPS = 30;
const SIZE = 1080;

loadFont({ family: "Liberation Mono", url: staticFile("fonts/LiberationMono-Regular.ttf"), weight: "400" });

// Cloud Core: 129 BPM, first beat at 0.372 s; a cut every two beats
const BEAT0 = 0.372;
const BEAT = 0.4644;
const STEP = BEAT * 2;
const END = 11.55;
const beatAt = (n: number) => BEAT0 + n * BEAT;

// clips: a = capsule 0.3, night eye 2.2, open space 3.6, gift 5.0, socks 6.1, lobby 7.6
//        b = Snezhana at night 0.2, robot 2.3, eye 4.4, Pomidorych 6.3, jar 8.3
type Shot =
  | { kind: "clip"; src: "a" | "b"; from: number; cx?: number; text: string }
  | { kind: "still"; img: string; y?: number; text: string };

// cut-out figures (public/hub/cut, made by tools/hub_cutout.py) intruding on the picture
// flash: huge, two or three frames; peek: slides in from an edge and back; float: drifts and turns;
// stamp: a strobing grid of copies. at / beats count in beats from the first one.
type Overlay = {
  img: string;
  kind: "flash" | "peek" | "float" | "stamp";
  at: number;
  beats: number;
  x?: number;
  y?: number;
  h?: number;
  rot?: number;
  from?: "left" | "right" | "bottom" | "top";
  red?: boolean;
};

export type LiminalCut = { id: string; shots: Shot[]; overlays: Overlay[] };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const rand = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const shotLen = (i: number, n: number) => (i === 0 ? BEAT0 + STEP : i === n - 1 ? END - (BEAT0 + STEP * (n - 1)) : STEP);
const shotStart = (i: number) => (i === 0 ? 0 : BEAT0 + STEP * i);

const ShotView: React.FC<{ shot: Shot; len: number }> = ({ shot, len }) => {
  const f = useCurrentFrame();
  const z = 1.06 + 0.04 * (f / (len * FPS));
  if (shot.kind === "still") {
    return (
      <Img
        src={staticFile(`hub/ps1/${shot.img}.png`)}
        style={{
          position: "absolute",
          width: SIZE,
          height: SIZE,
          objectFit: "cover",
          objectPosition: `50% ${(shot.y ?? 0.5) * 100}%`,
          transform: `scale(${z})`,
          imageRendering: "pixelated",
        }}
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

const Cut: React.FC<{ img: string; h: number; style?: React.CSSProperties }> = ({ img, h, style }) => (
  <Img src={staticFile(`hub/cut/${img}.png`)} style={{ position: "absolute", height: h, maxWidth: "none", ...style }} />
);

const OverlayView: React.FC<{ o: Overlay; t: number; f: number }> = ({ o, t, f }) => {
  const t0 = beatAt(o.at);
  const t1 = t0 + o.beats * BEAT;
  if (t < t0 || t >= t1) return null;
  const p = (t - t0) / (t1 - t0);
  const h = (o.h ?? 0.8) * SIZE;
  const cx = (o.x ?? 0.5) * SIZE;
  const cy = (o.y ?? 0.5) * SIZE;
  const tint: React.CSSProperties = o.red ? { filter: "sepia(1) saturate(8) hue-rotate(-50deg) contrast(1.4)" } : { filter: "contrast(1.25) saturate(1.2)" };
  const base = (extra: string): React.CSSProperties => ({ left: cx, top: cy, transform: `translate(-50%, -50%) ${extra}`, ...tint });
  if (o.kind === "flash") {
    const shake = `translate(${(rand(f) - 0.5) * 40}px, ${(rand(f + 9) - 0.5) * 40}px) rotate(${(rand(f + 3) - 0.5) * 10 + (o.rot ?? 0)}deg)`;
    return <Cut img={o.img} h={h} style={{ ...base(shake), opacity: rand(f * 5) > 0.15 ? 1 : 0 }} />;
  }
  if (o.kind === "peek") {
    const k = interpolate(p, [0, 0.18, 0.8, 1], [1, 0, 0, 1], clamp);
    const off = { left: [-SIZE, 0], right: [SIZE, 0], bottom: [0, SIZE], top: [0, -SIZE] }[o.from ?? "bottom"];
    const step = Math.floor(k * 6) / 6; // jerky, like a stop-motion puppet
    return <Cut img={o.img} h={h} style={base(`translate(${off[0] * step}px, ${off[1] * step}px) rotate(${o.rot ?? 0}deg)`)} />;
  }
  if (o.kind === "float") {
    const dx = interpolate(p, [0, 1], [-0.15, 0.15]) * SIZE + Math.sin(t * 5) * 20;
    const dy = Math.sin(t * 3.3) * 30 - p * 80;
    return <Cut img={o.img} h={h} style={{ ...base(`translate(${dx}px, ${dy}px) rotate(${(o.rot ?? 0) + p * 40}deg)`), opacity: 0.9 }} />;
  }
  // stamp: a 3×3 grid, every cell blinking on its own
  return (
    <>
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2].map((c) =>
          rand(Math.floor(f / 2) * 31 + r * 3 + c) > 0.35 ? (
            <Cut
              key={`${r}-${c}`}
              img={o.img}
              h={h}
              style={{ left: (c + 0.5) * (SIZE / 3), top: (r + 0.5) * (SIZE / 3), transform: `translate(-50%, -50%) rotate(${(rand(r * 7 + c) - 0.5) * 30}deg)`, ...tint }}
            />
          ) : null,
        ),
      )}
    </>
  );
};

// every beat the picture hops: a quick push and lift that settles before the next one
const hop = (t: number) => (t < BEAT0 ? 0 : Math.exp((-((t - BEAT0) % BEAT) / BEAT) * 7));

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

const Vhs: React.FC<{ f: number }> = ({ f }) => {
  const band = ((f * 7) % (SIZE + 200)) - 100;
  const ss = Math.floor(f / FPS);
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

const LiminalVideo: React.FC<{ cut: LiminalCut }> = ({ cut }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const h = hop(t);
  const jitter = (rand(f) - 0.5) * 6;
  const n = cut.shots.length;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <VhsDefs shift={4 + h * 6} />
      <AbsoluteFill
        style={{
          filter: "url(#vhs) saturate(0.8) contrast(1.08) sepia(0.12) blur(0.6px)",
          transform: `translate(${jitter}px, ${-h * 22}px) scale(${1 + h * 0.07})`,
        }}
      >
        {cut.shots.map((s, i) => (
          <Sequence key={i} from={Math.round(shotStart(i) * FPS)} durationInFrames={Math.round(shotLen(i, n) * FPS)}>
            <ShotView shot={s} len={shotLen(i, n)} />
          </Sequence>
        ))}
        {cut.overlays.map((o, i) => (
          <OverlayView key={i} o={o} t={t} f={f} />
        ))}
        {cut.shots.map((s, i) => (
          <Sequence key={i} from={Math.round(shotStart(i) * FPS)} durationInFrames={Math.round(shotLen(i, n) * FPS)}>
            <Line text={s.text} />
          </Sequence>
        ))}
      </AbsoluteFill>
      <Vhs f={f} />
      <Audio src={staticFile("hub/music-cloudcore.mp3")} volume={() => interpolate(t, [0, 0.05, END - 0.3, END], [0, 1, 1, 0], clamp)} />
    </AbsoluteFill>
  );
};

const CUTS: LiminalCut[] = [
  {
    id: "HubLiminal",
    overlays: [],
    shots: [
      { kind: "clip", src: "a", from: 7.6, text: "??" },
      { kind: "clip", src: "a", from: 6.1, text: "!!!" },
      { kind: "clip", src: "a", from: 2.2, text: "ты ещё тут?" },
      { kind: "clip", src: "a", from: 3.6, text: "заходи!!" },
      { kind: "clip", src: "a", from: 0.3, cx: 0.62, text: "эй" },
      { kind: "clip", src: "b", from: 6.3, text: "зависит." },
      { kind: "clip", src: "b", from: 2.3, text: "× × ×" },
      { kind: "still", img: "scenes/ep0-weekend", text: "суббота!!" },
      { kind: "clip", src: "b", from: 0.2, text: "Эй, иди сюда!!" },
      { kind: "clip", src: "b", from: 4.4, cx: 0.6, text: "..." },
      { kind: "clip", src: "a", from: 5.0, text: "беги." },
      { kind: "clip", src: "b", from: 8.3, text: "× × ×" },
    ],
  },
  // night: the call that never ends
  {
    id: "HubLiminal2",
    shots: [
      { kind: "still", img: "scenes/ep4-1", y: 0.4, text: "алло?" },
      { kind: "clip", src: "b", from: 0.6, text: "тебя не слышно" },
      { kind: "still", img: "scenes/ep6-wet", y: 0.35, text: "..." },
      { kind: "clip", src: "a", from: 2.4, text: "ещё 5 минут" },
      { kind: "still", img: "scenes/ep5-pigeons2", y: 0.45, text: "кто здесь?" },
      { kind: "still", img: "scenes/ep0-capsule", y: 0.5, text: "спи." },
      { kind: "clip", src: "b", from: 2.6, text: "× × ×" },
      { kind: "still", img: "scenes/ep8-3", y: 0.45, text: "не выходи" },
      { kind: "still", img: "scenes/ep3-bake", y: 0.6, text: "ожидания готовы" },
      { kind: "clip", src: "a", from: 5.2, text: "!!!" },
      { kind: "still", img: "scenes/ep6-mugs", y: 0.6, text: "чьи кружки?" },
      { kind: "clip", src: "b", from: 8.6, text: "× × ×" },
    ],
    overlays: [
      { img: "glazik-small", kind: "float", at: 1, beats: 4, x: 0.75, y: 0.35, h: 0.3, rot: -10 },
      { img: "snezhana-face", kind: "flash", at: 6, beats: 0.3, h: 1.2 },
      { img: "dedkod-face", kind: "peek", at: 8, beats: 3, from: "bottom", x: 0.3, y: 0.75, h: 0.7 },
      { img: "glazik-big", kind: "stamp", at: 12, beats: 2, h: 0.32 },
      { img: "timosha-face", kind: "flash", at: 15, beats: 0.3, h: 1.3, red: true },
      { img: "snezhana-face", kind: "peek", at: 17, beats: 3, from: "right", x: 0.8, y: 0.5, h: 0.9, rot: -20 },
      { img: "dedkod-face", kind: "flash", at: 22, beats: 0.4, h: 1.4, red: true },
    ],
  },
  // weeding season: Snezhana walks the floor
  {
    id: "HubLiminal3",
    shots: [
      { kind: "still", img: "scenes/ep6-water", y: 0.45, text: "весна." },
      { kind: "clip", src: "a", from: 3.9, text: "кого польют?" },
      { kind: "still", img: "scenes/ep3-1", y: 0.5, text: "встаньте в очередь" },
      { kind: "still", img: "scenes/ep3-2", y: 0.55, text: "растёшь" },
      { kind: "still", img: "scenes/ep0-cashier", y: 0.55, text: "оплата тикетами" },
      { kind: "clip", src: "b", from: 6.6, text: "зависит." },
      { kind: "clip", src: "a", from: 6.4, text: "носки!!" },
      { kind: "still", img: "scenes/ep8-1", y: 0.6, text: "тестовое на вечерок" },
      { kind: "still", img: "chars/zhorzh", y: 0.4, text: "дейли!!" },
      { kind: "still", img: "scenes/ep3-3", y: 0.6, text: "сырки по четвергам" },
      { kind: "still", img: "scenes/ep0-weekend", y: 0.6, text: "суббота" },
      { kind: "clip", src: "a", from: 7.8, text: "добро пожаловать" },
    ],
    overlays: [
      { img: "snezhana-body", kind: "float", at: 2, beats: 4, x: 0.2, y: 0.6, h: 0.55 },
      { img: "pomidorych-face", kind: "flash", at: 7, beats: 0.3, h: 1.2 },
      { img: "gleb-face", kind: "peek", at: 9, beats: 3, from: "left", x: 0.25, y: 0.55, h: 0.9, rot: 15 },
      { img: "snezhana-face", kind: "stamp", at: 13, beats: 2, h: 0.36 },
      { img: "pomidorych-face", kind: "peek", at: 16, beats: 2, from: "top", x: 0.7, y: 0.3, h: 0.6, rot: 180 },
      { img: "snezhana-face", kind: "flash", at: 22, beats: 0.4, h: 1.5, red: true },
    ],
  },
  // the bank in the jar and everyone who works for it
  {
    id: "HubLiminal4",
    shots: [
      { kind: "clip", src: "b", from: 8.4, text: "банк работает" },
      { kind: "still", img: "scenes/ep5-pigeons", y: 0.55, text: "голуби тоже" },
      { kind: "clip", src: "a", from: 0.8, cx: 0.62, text: "домой не надо" },
      { kind: "still", img: "scenes/ep0-lobby", y: 0.45, text: "Hey come on!!" },
      { kind: "clip", src: "b", from: 2.9, text: "уволился" },
      { kind: "still", img: "scenes/ep5-socks", y: 0.4, text: "пивот!!" },
      { kind: "still", img: "scenes/ep0-gift", y: 0.45, text: "подарок" },
      { kind: "clip", src: "b", from: 4.8, cx: 0.6, text: "повышен." },
      { kind: "still", img: "scenes/ep3-bake", y: 0.4, text: "?? ??" },
      { kind: "clip", src: "a", from: 2.6, text: "кто-то смотрит" },
      { kind: "still", img: "scenes/ep8-jar", y: 0.55, text: "flee." },
      { kind: "clip", src: "a", from: 8.0, text: "× × ×" },
    ],
    overlays: [
      { img: "glazik-big", kind: "peek", at: 3, beats: 3, from: "right", x: 0.78, y: 0.55, h: 0.8, rot: -12 },
      { img: "gleb-face", kind: "flash", at: 9, beats: 0.3, h: 1.3 },
      { img: "glazik-small", kind: "stamp", at: 12, beats: 2, h: 0.3 },
      { img: "dedkod-face", kind: "float", at: 15, beats: 4, x: 0.5, y: 0.7, h: 0.6, rot: 20 },
      { img: "timosha-face", kind: "peek", at: 19, beats: 2, from: "bottom", x: 0.5, y: 0.7, h: 0.8 },
      { img: "glazik-big", kind: "flash", at: 22, beats: 0.4, h: 1.5, red: true },
    ],
  },
];

export const LiminalComposition = () => (
  <>
    {CUTS.map((cut) => (
      <Composition
        key={cut.id}
        id={cut.id}
        component={LiminalVideo}
        defaultProps={{ cut }}
        durationInFrames={Math.round(END * FPS)}
        fps={FPS}
        width={SIZE}
        height={SIZE}
      />
    ))}
  </>
);
