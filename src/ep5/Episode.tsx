import React from "react";
import { AbsoluteFill, Audio, Composition, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { subtitleStyle } from "../Ui";
import { VozScene3D } from "./World";
import { CUTS, END, FPS, LINES, MUSIC, SFX, SURF, VOICE, offsets, toVideo, voiceSegments, type Shot5 } from "./script";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const ShotView: React.FC<{ shot: Shot5 }> = ({ shot }) =>
  shot.kind === "3d" && shot.id === "black" ? null : shot.kind === "3d" ? (
    <VozScene3D id={shot.id} />
  ) : (
    <Img src={staticFile(shot.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated" }} />
  );

// box-less subtitles typed part by part inside the speech windows; the pauses here are short,
// so a line leaves just before the next one starts instead of lingering over it
const Subtitles: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const off = offsets();
  const lines = LINES.map((l, i) => l.parts.map((p) => ({ text: p.text, from: p.from + off[i], to: p.to + off[i] })));
  const idx = lines.findIndex((parts, i) => {
    const next = lines[i + 1];
    const until = Math.min(parts[parts.length - 1].to + 0.9, next ? next[0].from - 0.12 : Infinity);
    return t >= parts[0].from - 0.15 && t <= until;
  });
  if (idx < 0) return null;
  const parts = lines[idx];
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

export const VozReel: React.FC = () => {
  const frame = useCurrentFrame();
  const total = Math.round(END * FPS);
  const cuts = CUTS.map((c) => ({ at: toVideo(c.line, c.at), shot: c.shot }));
  const off = offsets();
  const speech = LINES.flatMap((l, i) => l.parts.map((p) => [p.from + off[i], p.to + off[i]] as const));
  const surfAt = toVideo(SURF.from.line, SURF.from.at);
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
      {/* the first image comes up slowly out of the dark */}
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: interpolate(frame / FPS, [surfAt, surfAt + 1.6], [1, 0], clamp) }} />
      <Subtitles />
      {/* the open ending dims slowly, together with the music */}
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: interpolate(frame / FPS, [END - 2.2, END - 0.2], [0, 1], clamp) }} />
      {voiceSegments().map((seg, i) => (
        <Sequence key={`v${i}`} from={Math.round(seg.at * FPS)} layout="none">
          <Audio src={staticFile(VOICE)} trimBefore={Math.round(seg.start * FPS)} trimAfter={Math.round(seg.end * FPS)} volume={1} />
        </Sequence>
      ))}
      {SFX.map((fx, i) => (
        <Sequence key={`fx${i}`} from={Math.round(toVideo(fx.line, fx.at) * FPS)} layout="none">
          <Audio src={staticFile(fx.src)} volume={() => fx.volume} />
        </Sequence>
      ))}
      {/* the surf never stops once the shore is on screen */}
      <Sequence from={Math.round(surfAt * FPS)} layout="none">
        <Audio
          src={staticFile(SURF.src)}
          loop
          volume={(f) => SURF.level * interpolate(f / FPS, [0, 1.6, END - surfAt - 2.2, END - surfAt], [0, 1, 1, 0], clamp)}
        />
      </Sequence>
      {MUSIC.map((m, i) => {
        const a = toVideo(m.from.line, m.from.at);
        const b = m.to ? toVideo(m.to.line, m.to.at) : END;
        return (
          <Sequence key={`m${i}`} from={Math.round(a * FPS)} durationInFrames={Math.round((b - a) * FPS)} layout="none">
            <Audio
              src={staticFile(m.src)}
              volume={(f) => {
                const t = a + f / FPS;
                // the music steps back under every phrase and comes forward in the pauses
                const talking = Math.max(...speech.map(([x, y]) => interpolate(t, [x - 0.25, x, y, y + 0.35], [0, 1, 1, 0], clamp)));
                const shape = interpolate(t, [a, a + 0.8, b - 1.6, b], [0, 1, 1, 0], clamp);
                return m.level * shape * (1 - 0.5 * talking);
              }}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const VozComposition = () => (
  <Composition id="Vozdukhan" component={VozReel} durationInFrames={Math.round(END * FPS)} fps={FPS} width={1080} height={1920} />
);
