import React from "react";
import { AbsoluteFill, Audio, Composition, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { subtitleStyle } from "../Ui";
import { FacesScene3D } from "./World";
import { FPS, REEL1, REEL2, offsets, reelEnd, toVideo, voiceSegments, type Reel, type Shot4 } from "./script";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const hash = (i: number) => {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

// the stills from the generated images are evidence: faded polaroid prints lying on a dark desk,
// each one developing out of a milky haze as it appears; static, no text
const Polaroid: React.FC<{ src: string }> = ({ src }) => {
  const frame = useCurrentFrame();
  const seed = src.length * 7 + src.charCodeAt(src.length - 5);
  const tilt = (hash(seed) - 0.5) * 5;
  const develop = interpolate(frame, [0, 16], [0.75, 0], clamp);
  const W = 900;
  const win = 816;
  return (
    <AbsoluteFill style={{ backgroundColor: "#1c1714" }}>
      {/* the desk */}
      <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="desk" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.18" numOctaves="3" seed={3} />
            <feColorMatrix type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.12  0 0 0 0 0.09  0 0 0 0.9 0" />
          </filter>
          <radialGradient id="lamp" cx="50%" cy="38%" r="70%">
            <stop offset="0%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.8" />
          </radialGradient>
        </defs>
        <rect width="1080" height="1920" filter="url(#desk)" />
      </svg>
      <div
        style={{
          position: "absolute",
          left: (1080 - W) / 2,
          top: 190,
          width: W,
          height: W * 1.2,
          backgroundColor: "#ece6da",
          transform: `rotate(${tilt.toFixed(2)}deg)`,
          boxShadow: "0 24px 50px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ position: "absolute", left: (W - win) / 2, top: (W - win) / 2, width: win, height: win, overflow: "hidden", backgroundColor: "#22262a" }}>
          {/* faded instant-film colour: softer contrast, warm highlights */}
          <Img
            src={staticFile(src)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              imageRendering: "pixelated",
              filter: "saturate(0.8) contrast(0.88) brightness(1.14) sepia(0.14)",
            }}
          />
          <svg width={win} height={win} style={{ position: "absolute", inset: 0 }}>
            <defs>
              <radialGradient id="pvig" cx="50%" cy="50%" r="72%">
                <stop offset="60%" stopColor="#000" stopOpacity="0" />
                <stop offset="100%" stopColor="#1a1208" stopOpacity="0.45" />
              </radialGradient>
            </defs>
            {/* lifted, teal-tinted blacks */}
            <rect width={win} height={win} fill="#2c4a52" opacity="0.38" style={{ mixBlendMode: "lighten" }} />
            {/* warm cast on the highlights */}
            <rect width={win} height={win} fill="#ffcf96" opacity="0.18" style={{ mixBlendMode: "soft-light" }} />
            <rect width={win} height={win} fill="url(#pvig)" />
            {/* the print developing */}
            <rect width={win} height={win} fill="#d8dcd6" opacity={develop} />
          </svg>
        </div>
      </div>
      <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
        <rect width="1080" height="1920" fill="url(#lamp)" />
      </svg>
    </AbsoluteFill>
  );
};

const ShotView: React.FC<{ shot: Shot4 }> = ({ shot }) =>
  shot.kind === "3d" ? (
    <FacesScene3D id={shot.id} />
  ) : (
    <Polaroid src={shot.src.replace("ps1/", "polaroid/")} />
  );

// box-less subtitles; each part of a line types itself inside its own speech window,
// and the line leaves the screen during the pause that follows it
const Subtitles: React.FC<{ reel: Reel }> = ({ reel }) => {
  const t = useCurrentFrame() / FPS;
  const off = offsets(reel);
  const lines = reel.lines.map((l, i) => l.parts.map((p) => ({ text: p.text, from: p.from + off[i], to: p.to + off[i] })));
  const idx = lines.findIndex((parts) => t >= parts[0].from - 0.2 && t <= parts[parts.length - 1].to + 1.0);
  if (idx < 0) return null;
  const parts = lines[idx];
  const full = parts.map((p) => p.text).join("");
  const shown = parts.map((p) => p.text.slice(0, Math.round(interpolate(t, [p.from, p.to], [0, 1], clamp) * p.text.length))).join("");
  return (
    <div style={subtitleStyle}>
      {/* the whole line is laid out from the start (rest invisible) so nothing jumps while typing */}
      <div style={{ fontSize: 40, lineHeight: 1.55 }}>
        {shown}
        <span style={{ color: "transparent", textShadow: "none" }}>{full.slice(shown.length)}</span>
      </div>
    </div>
  );
};

export const FacesReel: React.FC<{ reel: Reel }> = ({ reel }) => {
  const frame = useCurrentFrame();
  const end = reelEnd(reel);
  const total = Math.round(end * FPS);
  const cuts = reel.cuts.map((c) => ({ at: toVideo(reel, c.line, c.at), shot: c.shot }));
  const off = offsets(reel);
  const speech = reel.lines.flatMap((l, i) => l.parts.map((p) => [p.from + off[i], p.to + off[i]] as const));
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {cuts.map((c, i) => {
        const from = Math.round(c.at * FPS);
        const to = i + 1 < cuts.length ? Math.round(cuts[i + 1].at * FPS) : total;
        return (
          <Sequence key={i} from={from} durationInFrames={to - from}>
            <ShotView shot={c.shot} />
          </Sequence>
        );
      })}
      <Subtitles reel={reel} />
      {/* the open ending dims slowly, together with the music */}
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: interpolate(frame / FPS, [end - 2.2, end - 0.2], [0, 1], clamp) }} />
      {/* the narration, one slice per line, with silence between */}
      {voiceSegments(reel).map((seg, i) => (
        <Sequence key={`v${i}`} from={Math.round(seg.at * FPS)} layout="none">
          <Audio src={staticFile(reel.voice)} trimBefore={Math.round(seg.start * FPS)} trimAfter={Math.round(seg.end * FPS)} volume={1} />
        </Sequence>
      ))}
      <Audio
        src={staticFile(reel.music)}
        volume={(f) => {
          const t = f / FPS;
          // the music steps back under every phrase and comes forward in the pauses and the ending
          const talking = Math.max(...speech.map(([a, b]) => interpolate(t, [a - 0.25, a, b, b + 0.35], [0, 1, 1, 0], clamp)));
          const shape = interpolate(t, [0, 0.8, end - 3.5, end], [0, 1, 1, 0], clamp);
          return reel.musicLevel * shape * (1 - 0.5 * talking);
        }}
      />
    </AbsoluteFill>
  );
};

export const FacesComposition = () => (
  <>
    <Composition id="Faces1" component={FacesReel} defaultProps={{ reel: REEL1 }} durationInFrames={Math.round(reelEnd(REEL1) * FPS)} fps={FPS} width={1080} height={1920} />
    <Composition id="Faces2" component={FacesReel} defaultProps={{ reel: REEL2 }} durationInFrames={Math.round(reelEnd(REEL2) * FPS)} fps={FPS} width={1080} height={1920} />
  </>
);
