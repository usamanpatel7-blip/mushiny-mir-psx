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

const SHOTS: Shot[] = [
  { kind: "clip", src: "a", from: 7.6, len: 1.4, text: "??" },
  { kind: "clip", src: "a", from: 0.3, len: 1.3, cx: 0.62, text: "эй" },
  { kind: "clip", src: "a", from: 2.2, len: 1.3, text: "ты ещё тут?" },
  { kind: "still", img: "scenes/ep0-weekend", len: 1.2, text: "суббота!!" },
  { kind: "clip", src: "a", from: 3.6, len: 1.3, text: "заходи!!" },
  { kind: "clip", src: "b", from: 2.3, len: 1.3, text: "× × ×" },
  { kind: "clip", src: "a", from: 6.1, len: 1.2, text: "!!!" },
  { kind: "still", img: "scenes/ep6-mugs", len: 1.2, text: "ещё чуть-чуть" },
  { kind: "clip", src: "b", from: 0.2, len: 1.4, text: "Эй, иди сюда!!" },
  { kind: "clip", src: "b", from: 4.4, len: 1.2, cx: 0.6, text: "..." },
  { kind: "clip", src: "b", from: 6.3, len: 1.3, text: "зависит." },
  { kind: "clip", src: "a", from: 5.0, len: 1.2, text: "беги." },
  { kind: "clip", src: "b", from: 8.3, len: 1.8, text: "× × ×" },
];

const starts = SHOTS.reduce<number[]>((acc, s, i) => [...acc, i ? acc[i - 1] + SHOTS[i - 1].len : 0], []);
const END = starts[starts.length - 1] + SHOTS[SHOTS.length - 1].len;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const ShotView: React.FC<{ shot: Shot }> = ({ shot }) => {
  const f = useCurrentFrame();
  const z = 1 + 0.04 * (f / (shot.len * FPS));
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

const LiminalVideo: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {SHOTS.map((s, i) => (
        <Sequence key={i} from={Math.round(starts[i] * FPS)} durationInFrames={Math.round(s.len * FPS)}>
          <ShotView shot={s} />
          <Line text={s.text} />
        </Sequence>
      ))}
      <Audio
        src={staticFile("hub/music-focus-flow.mp3")}
        startFrom={30 * FPS}
        volume={() => 0.8 * interpolate(f / FPS, [0, 0.3, END - 1, END], [0, 1, 1, 0], clamp)}
      />
    </AbsoluteFill>
  );
};

export const LiminalComposition = () => (
  <Composition id="HubLiminal" component={LiminalVideo} durationInFrames={Math.round(END * FPS)} fps={FPS} width={SIZE} height={SIZE} />
);
