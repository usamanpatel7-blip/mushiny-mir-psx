export type SceneId = "emptyPedestal" | "tuesday" | "cash" | "wednesday" | "week" | "bricks" | "pigeons" | "pigeonsGone" | "locker" | "shares" | "spawn" | "spawnEnd";

export type Shot = { kind: "still"; src: string } | { kind: "3d"; id: SceneId };

export type Beat = {
  text: string;
  // absolute seconds, measured from pauses in voice.mp3
  speech: [number, number];
  shots: Shot[];
  // absolute seconds where the next fixed camera takes over
  cuts: number[];
};

export const FPS = 30;
export const END = 57;
// after "продал" the corridor lights die one by one
export const LIGHTS_OUT_START = 49.5;
export const LIGHTS_OUT_STEP = 0.3;
// Horror coda: the only asset left is Kriptan himself, and the buyer is already known.
export const HORROR = {
  musicGone: 53.2,
  droneFrom: 52.4,
  inventoryFrom: 53.4,
  flickers: [
    [54.3, 54.37],
    [54.47, 54.5],
  ] as [number, number][],
  flash: [55.0, 55.17] as [number, number],
  hudOff: 55.6,
};

const still = (name: string): Shot => ({ kind: "still", src: `ps1/${name}.png` });
const scene = (id: SceneId): Shot => ({ kind: "3d", id });

export const beats: Beat[] = [
  { text: "Криптан всегда пытался разбогатеть.", speech: [0.34, 2.07], shots: [still("kriptan-wide"), still("kriptan-face")], cuts: [1.25] },
  {
    text: "Однажды он узнал, что время — деньги, и сразу продал весь вторник.",
    speech: [2.98, 6.5],
    shots: [scene("tuesday")],
    cuts: [],
  },
  { text: "За вторник ему дали четыреста рублей.", speech: [7.39, 9.18], shots: [scene("cash")], cuts: [] },
  {
    text: "Криптан посчитал сделку удачной и выставил на продажу среду.",
    speech: [10.08, 12.91],
    shots: [scene("wednesday")],
    cuts: [],
  },
  { text: "К вечеру у него закончилась неделя.", speech: [13.89, 15.63], shots: [scene("week")], cuts: [] },
  { text: "Тогда Криптан начал инвестировать в предметы.", speech: [16.63, 18.82], shots: [still("kriptan-eye")], cuts: [] },
  {
    text: "Он купил сорок два кирпича, потому что кирпич всегда в дефиците, если тебе срочно нужен кирпич.",
    speech: [19.73, 24.59],
    shots: [scene("bricks")],
    cuts: [],
  },
  { text: "Потом вложился в голубей.", speech: [25.41, 26.58], shots: [scene("pigeons")], cuts: [] },
  { text: "Голуби улетели.", speech: [27.51, 28.5], shots: [scene("pigeonsGone")], cuts: [] },
  { text: "Криптан назвал это естественной коррекцией рынка.", speech: [29.39, 31.82], shots: [still("kriptan-phone")], cuts: [] },
  {
    text: "Единственным стабильным активом оказался пакет гречки, спрятанный Мухой ещё в 2024 году.",
    speech: [32.77, 38.07],
    shots: [scene("locker")],
    cuts: [],
  },
  { text: "Криптан разделил его на триста акций.", speech: [39.05, 40.87], shots: [scene("shares")], cuts: [] },
  {
    text: "Контрольный пакет случайно съел Кебаб-Мейкер.",
    speech: [41.77, 43.93],
    shots: [scene("emptyPedestal"), still("kebab-grill"), still("kebab-face")],
    cuts: [42.3, 42.95],
  },
  { text: "Сейчас Криптан снова начинает с нуля.", speech: [44.82, 46.78], shots: [scene("spawn")], cuts: [] },
  { text: "Правда, ноль он тоже недавно продал.", speech: [47.74, 49.6], shots: [scene("spawnEnd"), still("kebab-dark"), scene("spawnEnd")], cuts: [55.0, 55.17] },
];

// Each beat starts just before its line, so cuts land in the pauses.
// Kebab-Maker's beat opens early, in the silence after the peak.
export const beatStartSec = beats.map((b, i) => (i === 0 ? 0 : i === 12 ? 41.05 : b.speech[0] - 0.2));
export const beatStarts = beatStartSec.map((s) => Math.round(s * FPS));
export const totalFrames = Math.round(END * FPS);
export const beatFrames = beatStarts.map((s, i) => (i + 1 < beatStarts.length ? beatStarts[i + 1] : totalFrames) - s);

export const sec = (s: number) => Math.round(s * FPS);

// PS1 cutscenes rarely hit 30 fps; motion is quantized to 15.
export const stepped = (frame: number) => Math.floor(frame / 2) * 2;
