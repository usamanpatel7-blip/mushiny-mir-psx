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
  seconds: number;
  shots: Shot2[];
  // fractions of the beat where the next fixed camera takes over
  cutsAt: number[];
};

export const FPS = 30;

const still = (name: string): Shot2 => ({ kind: "still", src: `ps1/${name}.png` });
const k = (id: KioskScene): Shot2 => ({ kind: "3d", id });

// Draft timing: no voice yet, ~15 chars/s like the Kriptan narration plus a pause.
const est = (text: string, extra = 0) => Math.max(2.4, text.length / 15 + 0.7 + extra);

const B = (text: string, shots: Shot2[], cutsAt: number[] = [], extra = 0, whisper: string | null = null): Beat2 => ({
  text,
  whisper,
  seconds: est(text, extra),
  shots,
  cutsAt,
});

export const beats2: Beat2[] = [
  B("Кебаб-мэйкер считал, что завернуть в лаваш можно абсолютно всё.", [k("stallWide"), still("kebab-wide")], [0.5]),
  B("Первым пострадал прямой угол между стеной и прилавком.", [k("corner")]),
  B(
    "Кебаб-мэйкер аккуратно срезал его ножом для гироса, уложил на бездрожжевое тесто, добавил томаты и халапеньо.",
    [k("cornerRound"), k("angleWrap")],
    [0.3],
  ),
  B("С тех пор в ларьке исчезли тени, а клиенты не могли повернуться налево.", [k("shadows"), k("turns")], [0.45]),
  B("Капуста всегда оставалась свежей.", [k("cabbage")]),
  B("Однажды Кебаб-мэйкер завернул в лаваш плохое предчувствие.", [k("badFeeling")]),
  B("Конверт получился тяжёлым.", [k("heavy")], [], 0.6),
  B(
    "Когда лаваш прижали грилем, из-под верхней крышки раздался тихий шёпот на латыни.",
    [k("press")],
    [],
    1.4,
    "— Plus allii, quaeso…",
  ),
  B("Шёпот просил добавить чуть больше чесночного соуса.", [k("sauceCreep")]),
  B("В ход пошло то, у чего нет названий.", [k("nameless")]),
  B("Он заворачивал в лаваш три часа сна своей покойной бабушки.", [k("granny")]),
  B("Заворачивал четыреста тридцать два герца.", [k("hertz")]),
  B("Он бережно складывал их внутрь.", [k("fold")]),
  B("Поливал фирменным белым соусом.", [k("sauce")]),
  // the same shot twice: literal repetition
  B("И прогревал. И прогревал.", [k("heat"), k("heat")], [0.5], 0.6),
  B("Единственное, что Кебаб-мэйкер так и не смог завернуть в лаваш, — сам лаваш.", [k("lavashAlone")]),
  B("Это было его запретное желание.", [still("kebab-face")]),
  B(
    "Попытка обернуть лаваш вокруг самого себя создавала бесконечную петлю. Ткань реальности истончалась, обнажая сырую сетку полигонов, уходящую в пустоту.",
    [k("selfWrap"), k("wireframe")],
    [0.42],
    0.4,
  ),
  B("Это сильно его беспокоит.", [still("kebab-eyes")]),
  B("Изнутри лаваша уже слышен хруст.", [k("crunch")]),
  B("Кажется, высшее создание начинает закрывать глаза.", [k("brainSky")], [], 1.2),
  B("И только Сослан ещё не спит.", [k("soslan"), still("soslan-wide"), still("soslan-eye")], [0.3, 0.72], 2.2),
];

export const beatStartSec2 = beats2.map((_, i) => beats2.slice(0, i).reduce((a, b) => a + b.seconds, 0));
export const END2 = beatStartSec2[beats2.length - 1] + beats2[beats2.length - 1].seconds;
export const beatStarts2 = beatStartSec2.map((s) => Math.round(s * FPS));
export const totalFrames2 = Math.round(END2 * FPS);
export const beatFrames2 = beatStarts2.map((s, i) => (i + 1 < beatStarts2.length ? beatStarts2[i + 1] : totalFrames2) - s);

// narration window inside each beat, for the typewriter
export const speech2 = beats2.map((b, i): [number, number] => [beatStartSec2[i] + 0.25, beatStartSec2[i] + b.seconds - 0.5 - (b.whisper ? 1.3 : 0)]);

export const beatIndexAt = (t: number) => {
  let idx = 0;
  for (let i = 0; i < beats2.length; i++) if (t >= beatStartSec2[i]) idx = i;
  return idx;
};
