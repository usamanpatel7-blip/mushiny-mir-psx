// Episode 3: Сослан / Сосик. Draft timing (no voice yet): replace `seconds` with real voice timings later.
export type PcScene = "dumpling" | "pcCase" | "radio" | "knolling" | "paste" | "mites" | "memorial";
export type DotaScene = "lanes" | "toForest" | "camp" | "levelUp" | "golem" | "pit" | "clock40" | "inventoryBg";
export type Scene3 = PcScene | DotaScene;

export type Shot3 =
  | { kind: "still"; src: string }
  | { kind: "3d"; id: Scene3 }
  | { kind: "pick" }
  | { kind: "inventory" }
  | { kind: "black" };

export type Beat3 = {
  text: string;
  whisper: string | null;
  seconds: number;
  shots: Shot3[];
  // fractions of the beat where the next fixed camera takes over
  cutsAt: number[];
};

export const FPS = 30;

export const DOTA_SCENES: readonly DotaScene[] = ["lanes", "toForest", "camp", "levelUp", "golem", "pit", "clock40", "inventoryBg"];
export const isDota = (id: Scene3): id is DotaScene => (DOTA_SCENES as readonly string[]).includes(id);

const still = (name: string): Shot3 => ({ kind: "still", src: `ps1/${name}.png` });
const k = (id: Scene3): Shot3 => ({ kind: "3d", id });

// ~15 chars/s like the earlier narration plus a pause
const est = (text: string, extra = 0) => Math.max(2.4, text.length / 15 + 0.7 + extra);

const B = (text: string, shots: Shot3[], cutsAt: number[] = [], extra = 0, whisper: string | null = null): Beat3 => ({
  text,
  whisper,
  seconds: est(text, extra),
  shots,
  cutsAt,
});

export const beats3: Beat3[] = [
  B(
    "В один понедельник, который выглядел как недоваренный пельмень, муха по имени Сосик проснулась внутри старого системного блока.",
    [k("dumpling"), k("pcCase")],
    [0.42],
  ),
  B("Сослан умел чинить любую технику.", [k("radio")], [], 0.3),
  B("Проблема заключалась в том, что чаще всего она не была сломана.", [k("knolling")], [], 0.4),
  B("Сосик жил там третью неделю, питался остатками термопасты и общался с пылевыми клещами.", [k("paste"), k("mites")], [0.45]),
  B("В системнике ходили слухи, что Сослана давно нет в живых.", [k("memorial")], [], 0.4),
  B("Но Сосик был занят.", [still("soslan-wide")], [], 0.4),
  B("Он зашёл в Доту последним, когда все уже выбрали героев и забыли про него.", [{ kind: "pick" }], [], 0.6),
  B("Сослан купил топорик, один танго и ушёл в лес, потому что линии были слишком прямыми.", [k("lanes"), k("toForest")], [0.4]),
  B("В лесу он фармил древних крипов, которые шептали ему координаты будущих патчей.", [k("camp")]),
  B("Через 20 минут Сос нафармил уровень boss и стал немного больше, чем был, но меньше, чем мог бы.", [k("levelUp")], [], 0.3),
  B(
    "Он сидел между деревьями, убивая огромного голема и думая, почему Рошан иногда снится ему до того, как появляется на карте.",
    [k("golem"), k("pit")],
    [0.58],
  ),
  B("На 40-й минуте Сос вышел из леса.", [k("clock40")], [], 0.6),
  B("У него был странный артефакт, 20 тысяч золота и секрет, который не знал никто.", [{ kind: "inventory" }], [], 0.4),
  B("Сослан нажал атаку.", [still("soslan-hand"), still("soslan-eye"), { kind: "black" }], [0.3, 0.6], 1.6),
];

export const beatStartSec3 = beats3.map((_, i) => beats3.slice(0, i).reduce((a, b) => a + b.seconds, 0));
export const END3 = beatStartSec3[beats3.length - 1] + beats3[beats3.length - 1].seconds;
export const beatStarts3 = beatStartSec3.map((s) => Math.round(s * FPS));
export const totalFrames3 = Math.round(END3 * FPS);
export const beatFrames3 = beatStarts3.map((s, i) => (i + 1 < beatStarts3.length ? beatStarts3[i + 1] : totalFrames3) - s);

// narration window inside each beat, for the typewriter
export const speech3 = beats3.map((b, i): [number, number] => [beatStartSec3[i] + 0.25, beatStartSec3[i] + b.seconds - 0.5 - (b.whisper ? 1.3 : 0)]);

// the last line ends on a hard cut to black: the click
export const LAST = beats3.length - 1;
export const clickFrame = beatStarts3[LAST] + Math.round(beats3[LAST].cutsAt[1] * beatFrames3[LAST]);

export const beatIndexAt3 = (t: number) => {
  let idx = 0;
  for (let i = 0; i < beats3.length; i++) if (t >= beatStartSec3[i]) idx = i;
  return idx;
};
