import { loadFont } from "@remotion/fonts";
import React from "react";
import { AbsoluteFill, Audio, Composition, Img, interpolate, staticFile, useCurrentFrame } from "remotion";

// Болотный Хаб: one narrator, AI-generated stills, slow camera moves, short uppercase captions.

export const FPS = 30;
const W = 1080;
const H = 1920;

loadFont({ family: "Inter", url: staticFile("fonts/Inter-ExtraBold.otf"), weight: "800" });

// a camera window on a still: centre and height in source pixels (width follows 9:16)
export type Cam = { cx: number; cy: number; h: number };
export type HubShot = { img: string; size: [number, number]; from: number; a: Cam; b: Cam };
export type Caption = { text: string; at: number };
export type HubEpisode = { id: string; voice: string; end: number; shots: HubShot[]; captions: Caption[] };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (p: number) => p * p * (3 - 2 * p);

const Still: React.FC<{ shot: HubShot; t: number; until: number }> = ({ shot, t, until }) => {
  // PS1 cutscenes move at 15 fps
  const p = ease(interpolate(Math.floor(t * 15) / 15, [shot.from, until], [0, 1], clamp));
  const [sw, sh] = shot.size;
  const h = Math.min(shot.a.h + (shot.b.h - shot.a.h) * p, sh, (sw * 16) / 9);
  const w = (h * 9) / 16;
  const cx = Math.min(Math.max(shot.a.cx + (shot.b.cx - shot.a.cx) * p, w / 2), sw - w / 2);
  const cy = Math.min(Math.max(shot.a.cy + (shot.b.cy - shot.a.cy) * p, h / 2), sh - h / 2);
  const s = H / h;
  return (
    <Img
      src={staticFile(`hub/ps1/${shot.img}.png`)}
      style={{ position: "absolute", left: W / 2 - cx * s, top: H / 2 - cy * s, width: sw * s, height: sh * s, maxWidth: "none", imageRendering: "pixelated" }}
    />
  );
};

const CaptionView: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: "absolute", left: 60, right: 60, top: 1240, display: "flex", justifyContent: "center" }}>
    <div
      style={{
        fontFamily: "Inter",
        fontWeight: 800,
        fontSize: 64,
        lineHeight: 1.15,
        color: "#fff",
        textAlign: "center",
        textTransform: "uppercase",
        background: "rgba(10,10,12,0.82)",
        borderRadius: 14,
        padding: "10px 24px 14px",
      }}
    >
      {text}
    </div>
  </div>
);

export const HubVideo: React.FC<{ ep: HubEpisode }> = ({ ep }) => {
  const t = useCurrentFrame() / FPS;
  const i = Math.max(0, ep.shots.filter((s) => t >= s.from).length - 1);
  const c = ep.captions.filter((x) => t >= x.at).pop();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Still shot={ep.shots[i]} t={t} until={ep.shots[i + 1]?.from ?? ep.end} />
      {c && <CaptionView text={c.text} />}
      <Audio src={staticFile(ep.voice)} />
    </AbsoluteFill>
  );
};

export const hubComposition = (ep: HubEpisode) => (
  <Composition
    key={ep.id}
    id={ep.id}
    component={HubVideo}
    defaultProps={{ ep }}
    durationInFrames={Math.round(ep.end * FPS)}
    fps={FPS}
    width={W}
    height={H}
  />
);
