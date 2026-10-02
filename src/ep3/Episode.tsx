import React from "react";
import { AbsoluteFill, Audio, Composition, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { DotaHud, InventoryCloseup, PickScreen } from "./Hud";
import { Ui3 } from "./Ui";
import { Ep3Scene3D } from "./World";
import { FPS, GAP, VOICE_SPLIT, beatFrames3, beatStartSec3, beatStarts3, beats3, clickFrame, isDota, totalFrames3, type Shot3 } from "./script";

const ShotView: React.FC<{ shot: Shot3 }> = ({ shot }) => {
  if (shot.kind === "still") {
    return <Img src={staticFile(shot.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated" }} />;
  }
  if (shot.kind === "clip") {
    return <OffthreadVideo muted src={staticFile(shot.src)} playbackRate={shot.rate} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
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
      {/* the two closest standoff shots drop the HUD: nothing between him and them */}
      {isDota(shot.id) && shot.id !== "enemies" && shot.id !== "heroClose" && <DotaHud id={shot.id} />}
    </>
  );
};

const Beat3View: React.FC<{ index: number }> = ({ index }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { shots, cuts } = beats3[index];
  const cutFrames = cuts.map((c) => Math.round((c - beatStartSec3[index]) * FPS));
  // `key={cut}` restarts each shot's animation on its cut
  const cut = cutFrames.filter((c) => frame >= c).length;
  const from = cut === 0 ? 0 : cutFrames[cut - 1];
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence key={cut} from={from} durationInFrames={durationInFrames - from}>
        <ShotView shot={shots[cut]} />
      </Sequence>
    </AbsoluteFill>
  );
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const SoslanEpisode: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    {beats3.map((_, i) => (
      <Sequence key={i} from={beatStarts3[i]} durationInFrames={beatFrames3[i]}>
        <Beat3View index={i} />
      </Sequence>
    ))}
    <Ui3 />
    {/* the voice, split once: the standoff before the last line has no words */}
    <Audio src={staticFile("audio/voice-soslan.wav")} trimAfter={Math.round(VOICE_SPLIT * FPS)} volume={1} />
    <Sequence from={Math.round((VOICE_SPLIT + GAP) * FPS)} layout="none">
      <Audio src={staticFile("audio/voice-soslan.wav")} trimBefore={Math.round(VOICE_SPLIT * FPS)} volume={1} />
    </Sequence>
    {/* series track under the voice; it sinks during the standoff, is gone at the click, and comes back alone in the dark */}
    <Audio
      src={staticFile("audio/dusty1.mp3")}
      trimAfter={Math.round((VOICE_SPLIT + GAP) * FPS)}
      volume={(f) => interpolate(f / FPS, [0, 1, VOICE_SPLIT, VOICE_SPLIT + 1.8, VOICE_SPLIT + GAP], [0, 0.2, 0.2, 0.05, 0.03], clamp)}
    />
    <Sequence from={Math.round((VOICE_SPLIT + 0.3) * FPS)} durationInFrames={clickFrame - Math.round((VOICE_SPLIT + 0.3) * FPS)} layout="none">
      {/* the ep1 drone, stretched to last until the click */}
      <Audio src={staticFile("audio/drone.wav")} playbackRate={0.55} volume={(f) => interpolate(f / FPS, [0, 1.5], [0, 0.6], clamp)} />
    </Sequence>
    <Sequence from={clickFrame + Math.round(0.9 * FPS)} layout="none">
      <Audio
        src={staticFile("audio/dusty1.mp3")}
        trimBefore={Math.round((VOICE_SPLIT + GAP) * FPS)}
        volume={(f) => {
          const left = totalFrames3 - clickFrame - Math.round(0.9 * FPS);
          return interpolate(f, [0, 20, left - 45, left], [0, 0.22, 0.22, 0], clamp);
        }}
      />
    </Sequence>
    <Sequence from={clickFrame} durationInFrames={15}>
      <Audio src={staticFile("ep3/click.wav")} volume={0.9} />
    </Sequence>
  </AbsoluteFill>
);

export const SoslanComposition = () => (
  <Composition id="Soslan" component={SoslanEpisode} durationInFrames={totalFrames3} fps={FPS} width={1080} height={1920} />
);
