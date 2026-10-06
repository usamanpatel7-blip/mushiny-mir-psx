import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { subtitleStyle } from "../Ui";
import { FPS, WHISPER_GAP, beatIndexAt, beats2, type Timeline } from "./script";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// subtitles only; the Latin whisper types itself in the wordless pause after the narration
export const Ui2: React.FC<{ tl: Timeline }> = ({ tl }) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const idx = beatIndexAt(tl, t);
  const { text, whisper } = beats2[idx];
  const [s0, s1] = tl.speech[idx];
  const p = interpolate(t, [s0, s1], [0, 1], clamp);
  const shown = text.slice(0, Math.round(p * text.length));
  const wp = whisper ? interpolate(t, [s1 + 0.4, s1 + WHISPER_GAP - 0.4], [0, 1], clamp) : 0;
  return (
    <div style={subtitleStyle}>
      {/* the whole line is laid out from the start (rest invisible) so nothing jumps while typing */}
      <div style={{ fontSize: 30, lineHeight: 1.6 }}>
        {shown}
        <span style={{ color: "transparent", textShadow: "none" }}>{text.slice(shown.length)}</span>
      </div>
      {whisper && wp > 0 && (
        <div style={{ fontSize: 28, lineHeight: 1.6, marginTop: 10, color: "#b9a6ff", fontStyle: "italic" }}>{whisper.slice(0, Math.round(wp * whisper.length))}</div>
      )}
    </div>
  );
};
