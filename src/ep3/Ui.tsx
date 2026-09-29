import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { fontFamily, windowStyle } from "../Ui";
import { FPS, LAST, beatIndexAt3, beats3, clickFrame, speech3 } from "./script";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// subtitles only: the dialog box with a typewriter
export const Ui3: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const idx = beatIndexAt3(t);
  // the final click is a hard cut to black: the box goes with it
  if (idx === LAST && frame >= clickFrame) return null;
  const { text, whisper } = beats3[idx];
  const [s0, s1] = speech3[idx];
  const p = interpolate(t, [s0, s1], [0, 1], clamp);
  const shown = text.slice(0, Math.round(p * text.length));
  const wp = whisper ? interpolate(t, [s1 + 0.25, s1 + 1.2], [0, 1], clamp) : 0;
  const done = p >= 1 && (!whisper || wp >= 1);
  return (
    <div style={{ ...windowStyle, fontFamily, left: 40, right: 150, bottom: 400, minHeight: 250, padding: "26px 34px", boxSizing: "border-box" }}>
      {/* the whole line is laid out from the start (rest invisible) so the box never jumps while typing */}
      <div style={{ fontSize: 30, lineHeight: 1.65 }}>
        {shown}
        <span style={{ color: "transparent" }}>{text.slice(shown.length)}</span>
      </div>
      {whisper && wp > 0 && (
        <div style={{ fontSize: 28, lineHeight: 1.6, marginTop: 10, color: "#b9a6ff", fontStyle: "italic" }}>{whisper.slice(0, Math.round(wp * whisper.length))}</div>
      )}
      {done && Math.floor(frame / 10) % 2 === 0 && <div style={{ position: "absolute", right: 30, bottom: 16, fontSize: 36, color: "#d9dcef" }}>▼</div>}
    </div>
  );
};
