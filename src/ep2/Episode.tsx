import React from "react";
import { AbsoluteFill, Audio, Composition, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Ui2 } from "./Ui";
import { KioskScene3D } from "./World";
import { FPS, beatFrames2, beatStarts2, beatStartSec2, beats2, totalFrames2, type Shot2 } from "./script";

const ShotView: React.FC<{ shot: Shot2 }> = ({ shot }) =>
  shot.kind === "3d" ? (
    <KioskScene3D id={shot.id} />
  ) : (
    <Img src={staticFile(shot.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated" }} />
  );

const Beat2View: React.FC<{ index: number }> = ({ index }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { shots, cutsAt } = beats2[index];
  const shot = shots[cutsAt.filter((c) => frame >= Math.round(c * durationInFrames)).length];
  // the doubled "И прогревал" shot must restart its animation on the cut
  const cut = cutsAt.filter((c) => frame >= Math.round(c * durationInFrames)).length;
  const from = cut === 0 ? 0 : Math.round(cutsAt[cut - 1] * durationInFrames);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence key={cut} from={from} durationInFrames={durationInFrames - from}>
        <ShotView shot={shot} />
      </Sequence>
    </AbsoluteFill>
  );
};

export const KebabEpisode: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    {beats2.map((_, i) => (
      <Sequence key={i} from={beatStarts2[i]} durationInFrames={beatFrames2[i]}>
        <Beat2View index={i} />
      </Sequence>
    ))}
    <Ui2 />
    {/* series track; no voice yet, so it sits a little higher than it will under narration */}
    <Audio
      src={staticFile("audio/dusty1.mp3")}
      volume={(f) => {
        const t = f / FPS;
        const god = beatStartSec2[20];
        return interpolate(t, [0, 1, god, god + 1.5, totalFrames2 / FPS - 2.5, totalFrames2 / FPS], [0, 0.35, 0.35, 0.2, 0.2, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
      }}
    />
  </AbsoluteFill>
);

export const KebabComposition = () => (
  <Composition id="KebabMaker" component={KebabEpisode} durationInFrames={totalFrames2} fps={FPS} width={1080} height={1920} />
);
