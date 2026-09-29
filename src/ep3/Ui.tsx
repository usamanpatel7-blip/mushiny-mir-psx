import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { subtitleStyle } from "../Ui";
import { FPS, LAST, beatIndexAt3, beats3, clickFrame, speech3 } from "./script";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// box-less pixel subtitles with a typewriter
export const Ui3: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const idx = beatIndexAt3(t);
  // the final click is a hard cut to black: the subtitle goes with it
  if (idx === LAST && frame >= clickFrame) return null;
  const { text, whisper } = beats3[idx];
  const [s0, s1] = speech3[idx];
  const p = interpolate(t, [s0, s1], [0, 1], clamp);
  const shown = text.slice(0, Math.round(p * text.length));
  const wp = whisper ? interpolate(t, [s1 + 0.25, s1 + 1.2], [0, 1], clamp) : 0;
  return (
    <div style={subtitleStyle}>
      {/* the whole line is laid out from the start (rest invisible) so nothing jumps while typing */}
      <div style={{ fontSize: 30, lineHeight: 1.6 }}>
        {shown}
        <span style={{ color: "transparent", textShadow: "none" }}>{text.slice(shown.length)}</span>
      </div>
      {whisper && wp > 0 && <div style={{ fontSize: 28, lineHeight: 1.6, marginTop: 10, color: "#b9a6ff" }}>{whisper.slice(0, Math.round(wp * whisper.length))}</div>}
    </div>
  );
};
