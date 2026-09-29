import React from "react";
import { AbsoluteFill, Audio, Composition, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { DotaHud, InventoryCloseup, PickScreen } from "./Hud";
import { Ui3 } from "./Ui";
import { Ep3Scene3D } from "./World";
import { FPS, beatFrames3, beatStarts3, beats3, clickFrame, isDota, totalFrames3, type Shot3 } from "./script";

const ShotView: React.FC<{ shot: Shot3 }> = ({ shot }) => {
  if (shot.kind === "still") {
    return <Img src={staticFile(shot.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated" }} />;
  }
  if (shot.kind === "pick") return <PickScreen />;
  if (shot.kind === "black") return <AbsoluteFill style={{ backgroundColor: "#000" }} />;
  if (shot.kind === "inventory") {
    return (
      <>
        <Ep3Scene3D id="inventoryBg" />
        <DotaHud id="inventoryBg" />
        <InventoryCloseup />
      </>
    );
  }
  return (
    <>
      <Ep3Scene3D id={shot.id} />
      {isDota(shot.id) && <DotaHud id={shot.id} />}
    </>
  );
};

const Beat3View: React.FC<{ index: number }> = ({ index }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { shots, cutsAt } = beats3[index];
  // `key={cut}` restarts each shot's animation on its cut
  const cut = cutsAt.filter((c) => frame >= Math.round(c * durationInFrames)).length;
  const from = cut === 0 ? 0 : Math.round(cutsAt[cut - 1] * durationInFrames);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence key={cut} from={from} durationInFrames={durationInFrames - from}>
        <ShotView shot={shots[cut]} />
      </Sequence>
    </AbsoluteFill>
  );
};

export const SoslanEpisode: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    {beats3.map((_, i) => (
      <Sequence key={i} from={beatStarts3[i]} durationInFrames={beatFrames3[i]}>
        <Beat3View index={i} />
      </Sequence>
    ))}
    <Ui3 />
    {/* series track; no voice yet */}
    <Audio
      src={staticFile("audio/dusty1.mp3")}
      volume={(f) => {
        const end = totalFrames3 / FPS;
        return interpolate(f / FPS, [0, 1, end - 2.5, end], [0, 0.35, 0.35, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      }}
    />
    <Sequence from={clickFrame} durationInFrames={15}>
      <Audio src={staticFile("ep3/click.wav")} volume={0.9} />
    </Sequence>
  </AbsoluteFill>
);

export const SoslanComposition = () => (
  <Composition id="Soslan" component={SoslanEpisode} durationInFrames={totalFrames3} fps={FPS} width={1080} height={1920} />
);
