import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { fontFamily, windowStyle } from "../Ui";
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
  const done = p >= 1 && (!whisper || wp >= 1);
  return (
    <div style={{ ...windowStyle, fontFamily, left: 40, right: 150, bottom: 400, minHeight: 250, padding: "26px 34px" }}>
      <div style={{ fontSize: 34, lineHeight: 1.65 }}>{shown}</div>
      {whisper && wp > 0 && (
        <div style={{ fontSize: 28, lineHeight: 1.6, marginTop: 10, color: "#b9a6ff", fontStyle: "italic" }}>{whisper.slice(0, Math.round(wp * whisper.length))}</div>
      )}
      {done && Math.floor(frame / 10) % 2 === 0 && <div style={{ position: "absolute", right: 30, bottom: 16, fontSize: 36, color: "#d9dcef" }}>▼</div>}
    </div>
  );
};
