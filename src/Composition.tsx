import React from "react";
import { AbsoluteFill, Audio, Composition, Sequence, interpolate, staticFile } from "remotion";
import { Beat } from "./Beat";
import { Ui } from "./Ui";
import { END, FPS, HORROR, LIGHTS_OUT_START, beatFrames, beatStarts, beats, sec, totalFrames } from "./script";

export const KriptanComposition = () => (
  <Composition id="Kriptan" component={KriptanVideo} durationInFrames={totalFrames} fps={FPS} width={1080} height={1920} />
);

// Music edit, all times in seconds.
// dusty2's drop (18.96s) lands on "Тогда Криптан начал инвестировать".
// After the peak ("триста акций") the music drains away in the pause: the Kebab-Maker line lands in silence.
// "снова начинает с нуля" literally restarts dusty2 from the top.
const DROP_IN_TRACK = 18.96;
const DROP_IN_VIDEO = 16.43;
const FADE_START = 40.95;
const FADE_END = 41.55;
const MUSIC = [
  { src: "audio/dusty2.mp3", from: 0, to: FADE_END, startFrom: DROP_IN_TRACK - DROP_IN_VIDEO, quietUntil: DROP_IN_VIDEO },
  { src: "audio/dusty2.mp3", from: 44.62, to: END, startFrom: 0.82, quietUntil: END },
] as const;

const BODY = 0.18;
const INTRO = 0.3; // sparse intro is ~7 dB quieter in the source

// the music steps back under every line and breathes again in the pauses
const duck = (t: number) => {
  const talking = Math.max(...beats.map((b) => interpolate(t, [b.speech[0] - 0.25, b.speech[0], b.speech[1], b.speech[1] + 0.35], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  return 1 - 0.45 * talking;
};

const Soundtrack: React.FC = () => (
  <>
    {/* loudness-normalized narration (-15 LUFS) */}
    <Audio src={staticFile("audio/voice-kriptan.wav")} volume={1} />
    {/* self-synthesized: rising sub drone, cut dead by the sting */}
    <Sequence from={sec(HORROR.droneFrom)} durationInFrames={sec(HORROR.flash[0]) - sec(HORROR.droneFrom)} layout="none">
      <Audio src={staticFile("audio/drone.wav")} volume={0.9} />
    </Sequence>
    <Sequence from={sec(HORROR.flash[0])} durationInFrames={sec(END) - sec(HORROR.flash[0])} layout="none">
      <Audio src={staticFile("audio/sting.wav")} volume={0.85} />
    </Sequence>
    {MUSIC.map((m, i) => {
      const len = sec(m.to) - sec(m.from);
      return (
        <Sequence key={i} from={sec(m.from)} durationInFrames={len} layout="none">
          <Audio
            src={staticFile(m.src)}
            startFrom={sec(m.startFrom)}
            volume={(f) => {
              const t = m.from + f / FPS;
              const base = (m.quietUntil !== null && t < m.quietUntil ? INTRO : BODY) * duck(t) *
                (m.to === FADE_END
                  ? interpolate(t, [FADE_START, FADE_END], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
                  : // darkness: the music keeps going, quieter, then drifts away
                    // then silence before the scare
                    interpolate(t, [LIGHTS_OUT_START, LIGHTS_OUT_START + 2.5, HORROR.musicGone - 0.6, HORROR.musicGone], [1, 0.4, 0.4, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
              // 2-frame ramps so hard music cuts don't click
              return base * interpolate(f, [0, 2, len - 2, len], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            }}
          />
        </Sequence>
      );
    })}
  </>
);

export const KriptanVideo: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    {beats.map((_, i) => (
      <Sequence key={i} from={beatStarts[i]} durationInFrames={beatFrames[i]}>
        <Beat index={i} />
      </Sequence>
    ))}
    <Ui />
    <Soundtrack />
  </AbsoluteFill>
);
