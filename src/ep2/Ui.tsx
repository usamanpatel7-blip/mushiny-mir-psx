import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { subtitleStyle } from "../Ui";
import { FPS, beatIndexAt, beats2, speech2 } from "./script";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// subtitles only; the Latin whisper types itself after the narration
export const Ui2: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const idx = beatIndexAt(t);
  const { text, whisper } = beats2[idx];
  const [s0, s1] = speech2[idx];
  const p = interpolate(t, [s0, s1], [0, 1], clamp);
  const shown = text.slice(0, Math.round(p * text.length));
  const wp = whisper ? interpolate(t, [s1 + 0.25, s1 + 1.2], [0, 1], clamp) : 0;
  return (
    <div style={subtitleStyle}>
      <div style={{ fontSize: 36, lineHeight: 1.6 }}>{shown}</div>
      {whisper && wp > 0 && (
        <div style={{ fontSize: 28, lineHeight: 1.6, marginTop: 10, color: "#b9a6ff", fontStyle: "italic" }}>{whisper.slice(0, Math.round(wp * whisper.length))}</div>
      )}
    </div>
  );
};
