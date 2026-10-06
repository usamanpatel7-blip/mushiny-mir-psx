export type KioskScene =
  | "stallWide"
  | "corner"
  | "cornerRound"
  | "angleWrap"
  | "shadows"
  | "turns"
  | "cabbage"
  | "badFeeling"
  | "heavy"
  | "press"
  | "sauceCreep"
  | "nameless"
  | "granny"
  | "hertz"
  | "fold"
  | "sauce"
  | "heat"
  | "lavashAlone"
  | "selfWrap"
  | "wireframe"
  | "crunch"
  | "brainSky"
  | "soslan";

export type Shot2 = { kind: "still"; src: string } | { kind: "3d"; id: KioskScene };

export type Beat2 = {
  text: string;
  // extra line typed after the narration (the whisper)
  whisper: string | null;
  shots: Shot2[];
};

export const FPS = 30;

const still = (name: string): Shot2 => ({ kind: "still", src: `ps1/${name}.png` });
const k = (id: KioskScene): Shot2 => ({ kind: "3d", id });

// Text follows the recorded narration word for word (both voices read the same text).
export const beats2: Beat2[] = [
  { text: "Кебаб-мэйкер считал, что завернуть в лаваш можно абсолютно всё.", whisper: null, shots: [k("stallWide"), still("kebab-wide")] },
  { text: "Первым пострадал прямой угол между стеной и прилавком.", whisper: null, shots: [k("corner")] },
  {
    text: "Кебаб-мэйкер аккуратно срезал его ножом для гироса, уложил на бездрожжевое тесто, добавил томаты и халапеньо.",
    whisper: null,
    shots: [k("cornerRound"), k("angleWrap")],
  },
  { text: "С тех пор в ларьке исчезли тени, а клиенты не могли повернуться налево.", whisper: null, shots: [k("shadows"), k("turns")] },
  { text: "Капуста всегда оставалась свежей.", whisper: null, shots: [k("cabbage")] },
  { text: "Однажды Кебаб-мэйкер завернул в лаваш плохое предчувствие.", whisper: null, shots: [k("badFeeling")] },
  { text: "Конверт получился тяжёлым.", whisper: null, shots: [k("heavy")] },
  // the voice is split after this line: a wordless pause where the whisper is only read, while the garlic sauce creeps closer
  {
    text: "Когда лаваш прижали грилем, из-под верхней крышки раздался тихий шёпот на латыни.",
    whisper: "— Plus allii, quaeso…",
    shots: [k("press"), k("sauceCreep")],
  },
  { text: "В ход пошло то, у чего нет названий.", whisper: null, shots: [k("nameless")] },
  { text: "Он заворачивал в лаваш три часа сна своей покойной бабушки.", whisper: null, shots: [k("granny")] },
  { text: "Заворачивал четыреста тридцать два герца.", whisper: null, shots: [k("hertz")] },
  { text: "Он бережно складывал их внутрь.", whisper: null, shots: [k("fold")] },
  { text: "Поливал фирменным белым соусом.", whisper: null, shots: [k("sauce")] },
  // the same shot twice: literal repetition
  { text: "И прогревал. И прогревал.", whisper: null, shots: [k("heat"), k("heat")] },
  { text: "Единственное, что Кебаб-мэйкер так и не смог завернуть в лаваш, — сам лаваш.", whisper: null, shots: [k("lavashAlone")] },
  { text: "Это сильно его беспокоит.", whisper: null, shots: [still("kebab-face"), still("kebab-eyes")] },
  {
    text: "Попытка обернуть лаваш вокруг самого себя создавала бесконечную петлю. Ткань реальности истончалась, обнажая сырую сетку полигонов, уходящую в пустоту.",
    whisper: null,
    shots: [k("selfWrap"), k("wireframe")],
  },
  { text: "Изнутри лаваша уже слышен хруст.", whisper: null, shots: [k("crunch")] },
  { text: "Кажется, высшее создание начинает закрывать глаза.", whisper: null, shots: [k("brainSky")] },
  { text: "И только Сослан ещё не спит.", whisper: null, shots: [k("soslan"), still("soslan-wide"), still("soslan-eye")] },
];

export const WHISPER_BEAT = 7;
export const GOD_BEAT = 18;
// wordless pause inserted into the voice after the Latin line
export const WHISPER_GAP = 2.6;

export type Version = "a" | "b";

// Measured on each voice track (silencedetect): speech windows and cut points, in voice seconds.
type Take = { voice: string; speech: [number, number][]; cuts: number[][]; split: number; tail: number };
export const TAKES: Record<Version, Take> = {
  a: {
    voice: "audio/voice-kebab-a.wav",
    speech: [
      [0.2, 3.81], [4.45, 7.44], [7.99, 14.3], [14.85, 18.95], [19.53, 21.42], [21.95, 25.17], [25.7, 27.23], [27.79, 32.5],
      [32.97, 34.92], [35.31, 38.71], [39.25, 41.7], [42.25, 43.92], [44.54, 46.34], [46.86, 48.75], [49.39, 53.59],
      [54.19, 55.72], [56.22, 65.82], [66.42, 68.37], [68.92, 71.89], [72.21, 73.88],
    ],
    cuts: [[1.9], [], [10.9], [16.74], [], [], [], [32.75], [], [], [], [], [], [47.8], [], [55.0], [60.6], [], [], [73.2, 75.4]],
    split: 32.75,
    tail: 3.4,
  },
  b: {
    voice: "audio/voice-kebab-b.wav",
    speech: [
      [0.12, 4.11], [4.84, 8.14], [8.73, 15.74], [16.33, 20.89], [21.53, 23.64], [24.22, 27.78], [28.36, 30.03], [30.7, 35.91],
      [36.4, 38.59], [39.02, 42.8], [43.4, 46.1], [46.72, 48.57], [49.26, 51.25], [51.82, 53.92], [54.63, 59.27],
      [59.95, 61.62], [62.19, 72.86], [73.51, 75.66], [76.29, 79.58], [79.93, 81.77],
    ],
    cuts: [[2.1], [], [11.99], [18.43], [], [], [], [36.15], [], [], [], [], [], [52.88], [], [60.8], [67.06], [], [], [81.1, 83.3]],
    split: 36.15,
    tail: 3.4,
  },
};

// voice seconds -> video seconds (everything after the split slides by the whisper gap; a cut exactly at the split opens the pause)
const shift = (take: Take, t: number) => (t > take.split ? t + WHISPER_GAP : t);

export type Timeline = {
  voice: string;
  split: number;
  speech: [number, number][];
  cuts: number[][];
  beatStartSec: number[];
  beatStarts: number[];
  beatFrames: number[];
  totalFrames: number;
  end: number;
};

export const timeline = (v: Version): Timeline => {
  const take = TAKES[v];
  const speech = take.speech.map(([a, b]): [number, number] => [shift(take, a), shift(take, b)]);
  const cuts = take.cuts.map((c) => c.map((t) => shift(take, t)));
  const beatStartSec = speech.map((s, i) => (i === 0 ? 0 : s[0] - 0.2));
  const end = speech[speech.length - 1][1] + take.tail;
  const beatStarts = beatStartSec.map((s) => Math.round(s * FPS));
  const totalFrames = Math.round(end * FPS);
  const beatFrames = beatStarts.map((s, i) => (i + 1 < beatStarts.length ? beatStarts[i + 1] : totalFrames) - s);
  return { voice: take.voice, split: take.split, speech, cuts, beatStartSec, beatStarts, beatFrames, totalFrames, end };
};

export const beatIndexAt = (tl: Timeline, t: number) => {
  let idx = 0;
  for (let i = 0; i < beats2.length; i++) if (t >= tl.beatStartSec[i]) idx = i;
  return idx;
};
