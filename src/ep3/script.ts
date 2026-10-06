// Episode 3: Сослан / Сосик. Timing measured on the voice track (silencedetect), like ep1.
export type PcScene = "dumpling" | "pcCase" | "radio" | "knolling" | "paste" | "mites" | "memorial";
export type DotaScene = "lanes" | "toForest" | "camp" | "levelUp" | "golem" | "pit" | "clock40" | "inventoryBg" | "standoff" | "enemies" | "heroClose";
export type Scene3 = PcScene | DotaScene;

export type Shot3 =
  | { kind: "still"; src: string }
  | { kind: "3d"; id: Scene3 }
  | { kind: "pick" }
  | { kind: "inventory" }
  | { kind: "clip"; src: string; rate: number }
  | { kind: "black" };

export type Beat3 = {
  text: string;
  whisper: string | null;
  // narration window in the voice track, absolute seconds
  speech: [number, number];
  shots: Shot3[];
  // absolute seconds where the next fixed camera takes over
  cuts: number[];
};

export const FPS = 30;

export const DOTA_SCENES: readonly DotaScene[] = ["lanes", "toForest", "camp", "levelUp", "golem", "pit", "clock40", "inventoryBg", "standoff", "enemies", "heroClose"];
export const isDota = (id: Scene3): id is DotaScene => (DOTA_SCENES as readonly string[]).includes(id);

const k = (id: Scene3): Shot3 => ({ kind: "3d", id });

// muted PS1 cut of the uploaded footage (tools/footage.py)
const clip = (name: string, rate = 1): Shot3 => ({ kind: "clip", src: `ep3/clips/${name}.mp4`, rate });

// silent standoff inserted into the narration before the last line
export const GAP = 6.7;
// voice-track second where the narration is split for the standoff
export const VOICE_SPLIT = 70.5;

const B = (text: string, speech: [number, number], shots: Shot3[], cuts: number[] = [], whisper: string | null = null): Beat3 => ({
  text,
  whisper,
  speech,
  shots,
  cuts,
});

export const beats3: Beat3[] = [
  B(
    "В один понедельник, который выглядел как недоваренный пельмень, Сослан проснулся внутри старого системного блока.",
    [0.2, 7.27],
    [k("dumpling"), k("pcCase")],
    [4.15],
  ),
  B("Сослан умел чинить любую технику.", [7.87, 10.2], [k("radio")]),
  B("Проблема заключалась в том, что чаще всего она не была сломана.", [10.64, 14.68], [k("knolling")]),
  B("Сосик жил там третью неделю, питался остатками термопасты и общался с пылевыми клещами.", [15.14, 21.29], [k("paste"), k("mites")], [19.2]),
  B("В системнике ходили слухи, что Сослана давно нет в живых.", [21.75, 25.43], [k("memorial")]),
  B("Но Сос был занят.", [26.12, 27.3], [clip("room")]),
  B("Он зашёл в Доту последним, когда все уже выбрали героев и забыли про него.", [27.86, 32.71], [{ kind: "pick" }]),
  B("Сослан купил топорик, один танго и ушёл в лес, потому что линии были слишком прямыми.", [33.37, 39.29], [k("lanes"), k("toForest")], [35.85]),
  B("В лесу он фармил древних крипов, которые шептали ему координаты будущих патчей.", [39.7, 44.94], [clip("shoulder", 0.9), k("camp")], [41.73]),
  B("Через 10 минут Сос получил уровень boss и стал немного больше, чем был, но меньше, чем мог бы.", [45.61, 51.83], [k("levelUp")]),
  B(
    "Он сидел между деревьями, убивая огромного голема и думал, почему Рошан иногда снится ему до того, как появляется на карте.",
    [52.55, 60.98],
    [k("golem"), k("pit")],
    [56.1],
  ),
  B("На 40-й минуте Сос вышел из леса.", [61.6, 64.12], [clip("side", 0.9), k("clock40")], [62.5]),
  B("У него был странный артефакт, 20 тысяч золота и секрет, который не знал никто.", [64.69, 70.24], [{ kind: "inventory" }]),
  // no words: the farmed carry walks out on all five of them
  B("", [70.58, 70.58], [k("standoff"), k("enemies"), k("heroClose")], [73.3, 75.2]),
  B("Сослан нажал атаку.", [70.78 + GAP, 72.13 + GAP], [clip("keys"), clip("eye"), { kind: "black" }], [71.45 + GAP, 72.25 + GAP]),
];

export const beatStartSec3 = beats3.map((b, i) => (i === 0 ? 0 : b.speech[0] - 0.2));
// a long black after the click: the music is left alone with it
export const END3 = 72.25 + GAP + 4.5;
export const beatStarts3 = beatStartSec3.map((s) => Math.round(s * FPS));
export const totalFrames3 = Math.round(END3 * FPS);
export const beatFrames3 = beatStarts3.map((s, i) => (i + 1 < beatStarts3.length ? beatStarts3[i + 1] : totalFrames3) - s);

// narration window inside each beat, for the typewriter
export const speech3 = beats3.map((b) => b.speech);

// the last line ends on a hard cut to black: the click
export const LAST = beats3.length - 1;
export const clickFrame = Math.round(beats3[LAST].cuts[1] * FPS);

export const beatIndexAt3 = (t: number) => {
  let idx = 0;
  for (let i = 0; i < beats3.length; i++) if (t >= beatStartSec3[i]) idx = i;
  return idx;
};
