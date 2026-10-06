import React from "react";
import { AbsoluteFill, Audio, Composition, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Ui2 } from "./Ui";
import { KioskScene3D } from "./World";
import { FPS, GOD_BEAT, WHISPER_GAP, beats2, timeline, type Shot2, type Timeline, type Version } from "./script";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const ShotView: React.FC<{ shot: Shot2 }> = ({ shot }) =>
  shot.kind === "3d" ? (
    <KioskScene3D id={shot.id} />
  ) : (
    <Img src={staticFile(shot.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated" }} />
  );

const Beat2View: React.FC<{ tl: Timeline; index: number }> = ({ tl, index }) => {
  const frame = useCurrentFrame();
  const { shots } = beats2[index];
  const cutFrames = tl.cuts[index].map((c) => Math.round((c - tl.beatStartSec[index]) * FPS));
  // `key={cut}` restarts the shot's animation on each cut (the doubled "И прогревал")
  const cut = cutFrames.filter((c) => frame >= c).length;
  const from = cut === 0 ? 0 : cutFrames[cut - 1];
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence key={cut} from={from} durationInFrames={tl.beatFrames[index] - from}>
        <ShotView shot={shots[cut]} />
      </Sequence>
    </AbsoluteFill>
  );
};

// each version has its own music bed: A keeps the series track, B gets the opening of Sterile Lab
const MUSIC: Record<Version, { src: string; level: number }> = {
  a: { src: "audio/dusty1.mp3", level: 0.2 },
  b: { src: "audio/sterile-lab.m4a", level: 0.16 },
};

export const KebabEpisode: React.FC<{ version: Version }> = ({ version }) => {
  const tl = timeline(version);
  const music = MUSIC[version];
  const splitFrame = Math.round(tl.split * FPS);
  const god = tl.beatStartSec[GOD_BEAT];
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {beats2.map((_, i) => (
        <Sequence key={i} from={tl.beatStarts[i]} durationInFrames={tl.beatFrames[i]}>
          <Beat2View tl={tl} index={i} />
        </Sequence>
      ))}
      <Ui2 tl={tl} />
      {/* the narration, split once for the wordless Latin whisper */}
      <Audio src={staticFile(tl.voice)} trimAfter={splitFrame} volume={1} />
      <Sequence from={splitFrame + Math.round(WHISPER_GAP * FPS)} layout="none">
        <Audio src={staticFile(tl.voice)} trimBefore={splitFrame} volume={1} />
      </Sequence>
      <Audio
        src={staticFile(music.src)}
        volume={(f) => {
          const t = f / FPS;
          // steps back under every line, breathes in the pauses
          const talking = Math.max(...tl.speech.map(([a, b]) => interpolate(t, [a - 0.25, a, b, b + 0.35], [0, 1, 1, 0], clamp)));
          const shape = interpolate(t, [0, 1, god, god + 1.5, tl.end - 3, tl.end], [0, 1, 1, 0.7, 0.7, 0], clamp);
          return music.level * shape * (1 - 0.45 * talking);
        }}
      />
    </AbsoluteFill>
  );
};

export const KebabComposition = () => (
  <>
    <Composition
      id="KebabMaker"
      component={KebabEpisode}
      defaultProps={{ version: "a" as Version }}
      durationInFrames={timeline("a").totalFrames}
      fps={FPS}
      width={1080}
      height={1920}
    />
    <Composition
      id="KebabMakerB"
      component={KebabEpisode}
      defaultProps={{ version: "b" as Version }}
      durationInFrames={timeline("b").totalFrames}
      fps={FPS}
      width={1080}
      height={1920}
    />
  </>
);
