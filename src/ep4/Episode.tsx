import React from "react";
import { AbsoluteFill, Audio, Composition, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { subtitleStyle } from "../Ui";
import { FacesScene3D } from "./World";
import { FPS, REEL1, REEL2, type Reel, type Shot4 } from "./script";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const ShotView: React.FC<{ shot: Shot4 }> = ({ shot }) =>
  shot.kind === "3d" ? (
    <FacesScene3D id={shot.id} />
  ) : (
    <Img src={staticFile(shot.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated" }} />
  );

// box-less subtitles; each part of a line types itself inside its own speech window
const Subtitles: React.FC<{ reel: Reel }> = ({ reel }) => {
  const t = useCurrentFrame() / FPS;
  const starts = reel.lines.map((l) => l.parts[0].from - 0.2);
  let idx = -1;
  for (let i = 0; i < starts.length; i++) if (t >= starts[i]) idx = i;
  if (idx < 0) return null;
  const { parts } = reel.lines[idx];
  const last = parts[parts.length - 1];
  // the last line leaves a moment after it is spoken
  if (idx === reel.lines.length - 1 && t > last.to + 1.6) return null;
  const full = parts.map((p) => p.text).join("");
  const shown = parts.map((p) => p.text.slice(0, Math.round(interpolate(t, [p.from, p.to], [0, 1], clamp) * p.text.length))).join("");
  return (
    <div style={subtitleStyle}>
      {/* the whole line is laid out from the start (rest invisible) so nothing jumps while typing */}
      <div style={{ fontSize: 30, lineHeight: 1.6 }}>
        {shown}
        <span style={{ color: "transparent", textShadow: "none" }}>{full.slice(shown.length)}</span>
      </div>
    </div>
  );
};

export const FacesReel: React.FC<{ reel: Reel }> = ({ reel }) => {
  const total = Math.round(reel.end * FPS);
  const speech = reel.lines.flatMap((l) => l.parts.map((p) => [p.from, p.to] as const));
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {reel.cuts.map((c, i) => {
        const from = Math.round(c.at * FPS);
        const to = i + 1 < reel.cuts.length ? Math.round(reel.cuts[i + 1].at * FPS) : total;
        return (
          <Sequence key={i} from={from} durationInFrames={to - from}>
            <ShotView shot={c.shot} />
          </Sequence>
        );
      })}
      <Subtitles reel={reel} />
      <Sequence from={Math.round(reel.voiceDelay * FPS)} layout="none">
        <Audio src={staticFile(reel.voice)} volume={1} />
      </Sequence>
      <Audio
        src={staticFile(reel.music)}
        volume={(f) => {
          const t = f / FPS;
          // the music steps back under every phrase and breathes in the pauses
          const talking = Math.max(...speech.map(([a, b]) => interpolate(t, [a - 0.25, a, b, b + 0.35], [0, 1, 1, 0], clamp)));
          const shape = interpolate(t, [0, 0.8, reel.end - 2.4, reel.end], [0, 1, 1, 0], clamp);
          return reel.musicLevel * shape * (1 - 0.45 * talking);
        }}
      />
    </AbsoluteFill>
  );
};

export const FacesComposition = () => (
  <>
    <Composition id="Faces1" component={FacesReel} defaultProps={{ reel: REEL1 }} durationInFrames={Math.round(REEL1.end * FPS)} fps={FPS} width={1080} height={1920} />
    <Composition id="Faces2" component={FacesReel} defaultProps={{ reel: REEL2 }} durationInFrames={Math.round(REEL2.end * FPS)} fps={FPS} width={1080} height={1920} />
  </>
);
