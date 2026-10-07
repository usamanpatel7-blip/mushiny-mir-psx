// Episode 5: «Воздухан». A fly-headed coach of the «Свежий Поток» system takes walls away for a living,
// until the sea of ep4 brings back his face. It washes up like every other empty face (every three months is a patch),
// and the keeper who finds it has to decide whether a talking face goes to the senior of the shift (the lighthouse).
export type VozScene =
  | "officeWide"
  | "faceClose"
  | "wallPat"
  | "flipchart"
  | "seminar"
  | "windowOut"
  | "comfortZone"
  | "valve"
  | "module3"
  | "noWall"
  | "busInside"
  | "busOut"
  | "stamp"
  | "shrug"
  | "ceilingOff"
  | "neighbors"
  | "neighborsUp"
  | "tide"
  | "faceTop"
  | "faceOpen"
  | "keeperLow"
  | "faceTalk"
  | "keeperCeil"
  | "keeperTurn"
  | "lighthouseWalls"
  | "crateEnd";

export type Shot5 = { kind: "still"; src: string } | { kind: "3d"; id: VozScene };

// the recording is one breathless take: it is sliced at the short pauses (`start` is where a line's slice begins,
// in voice seconds) and `gap` seconds of silence go after each line, so every image gets room to breathe
export type Part = { text: string; from: number; to: number };
export type Line = { start: number; parts: Part[]; gap: number };
// cuts and sounds are anchored to a line: `at` is in voice seconds and moves with that line
export type Cut = { line: number; at: number; shot: Shot5 };
export type Sfx = { line: number; at: number; src: string; volume: number };

export const FPS = 30;
export const VOICE = "ep5/voice.wav";
export const VOICE_LENGTH = 52.7;
// video second where voice second 0 plays
export const LEAD = 0.6;
// after the last word: the ending, then a slow fade
export const TAIL = 7.8;

const still = (name: string): Shot5 => ({ kind: "still", src: `ps1/${name}.png` });
const k = (id: VozScene): Shot5 => ({ kind: "3d", id });
const P = (text: string, from: number, to: number): Part => ({ text, from, to });

// Text follows the recorded voice (it says «обучение в автобусе»); colons instead of dashes, as in ep4.
export const LINES: Line[] = [
  { start: 0, parts: [P("Воздухан считал, ", 0.05, 1.24), P("что главная проблема человека: ", 1.3, 3.0), P("внутренние стены.", 3.0, 4.22)], gap: 0.3 },
  { start: 4.35, parts: [P("Особенно несущие.", 4.44, 5.66)], gap: 0.9 },
  { start: 5.85, parts: [P("Он разработал авторскую систему ", 5.98, 8.06), P("«Свежий Поток».", 8.06, 9.2)], gap: 0.4 },
  { start: 9.15, parts: [P("На первом занятии ", 9.34, 10.46), P("Воздухан учил расширять рамки.", 10.46, 12.46)], gap: 0.2 },
  { start: 12.65, parts: [P("Обычно начинал с оконной.", 12.8, 14.48)], gap: 1.3 },
  { start: 14.58, parts: [P("На втором: ", 14.74, 15.26), P("выходить из зоны комфорта.", 15.26, 16.9)], gap: 0.5 },
  { start: 17.08, parts: [P("Третий модуль назывался ", 17.2, 18.52), P("«Жизнь без ограничений».", 18.52, 19.9)], gap: 0.3 },
  { start: 20.07, parts: [P("После него обычно ", 20.12, 21.18), P("не оставалось стены.", 21.18, 22.34)], gap: 1.5 },
  { start: 22.5, parts: [P("Однажды Воздухан ", 22.66, 23.68), P("проводил обучение в автобусе.", 23.68, 25.5)], gap: 0.3 },
  { start: 25.6, parts: [P("Через несколько минут ", 25.65, 26.8), P("у автобуса появился новый выход.", 26.8, 28.94)], gap: 1.0 },
  { start: 29.1, parts: [P("Производитель назвал это ", 29.2, 30.58), P("повреждением кузова.", 30.58, 31.86)], gap: 0.4 },
  { start: 31.98, parts: [P("Воздухан: ", 32.12, 32.62), P("расширением возможностей.", 32.62, 34.26)], gap: 1.0 },
  { start: 34.4, parts: [P("Дома он убрал потолок.", 34.58, 36.14)], gap: 0.6 },
  { start: 36.25, parts: [P("Соседи возмущались.", 36.38, 37.64)], gap: 0.3 },
  { start: 37.85, parts: [P("Потом соседей унесло.", 37.98, 39.34)], gap: 2.4 },
  { start: 39.45, parts: [P("Через три месяца ", 39.54, 40.54), P("море выбросило на берег ", 40.54, 41.98), P("лицо Воздухана.", 41.98, 43.04)], gap: 0.6 },
  { start: 43.17, parts: [P("Лицо открыло глаза:", 43.26, 44.42)], gap: 0.7 },
  { start: 44.72, parts: [P("«А что, если твой потолок ", 44.86, 46.32), P("существует только у тебя в голове?»", 46.32, 48.3)], gap: 1.2 },
  { start: 48.4, parts: [P("Смотритель взглянул в сторону маяка.", 48.5, 50.66)], gap: 1.0 },
  { start: 50.82, parts: [P("Стены у него ещё были.", 50.98, 52.32)], gap: 0 },
];

export const CUTS: Cut[] = [
  { line: 0, at: -LEAD, shot: k("officeWide") },
  { line: 0, at: 3.0, shot: k("faceClose") },
  { line: 1, at: 4.35, shot: k("wallPat") },
  // his own office, as the reference shows it: the system sells
  { line: 2, at: 5.85, shot: still("voz-office") },
  { line: 2, at: 7.55, shot: k("flipchart") },
  { line: 3, at: 9.15, shot: k("seminar") },
  { line: 4, at: 12.65, shot: k("windowOut") },
  { line: 5, at: 14.58, shot: k("comfortZone") },
  // outside the comfort zone there is only the yellow office that never ends, and he is already there
  { line: 5, at: 16.2, shot: still("voz-backrooms") },
  { line: 6, at: 17.08, shot: k("valve") },
  { line: 6, at: 18.45, shot: k("module3") },
  { line: 7, at: 20.07, shot: k("noWall") },
  { line: 8, at: 22.5, shot: k("busInside") },
  { line: 9, at: 25.6, shot: k("busOut") },
  { line: 10, at: 29.1, shot: k("stamp") },
  { line: 11, at: 31.98, shot: k("shrug") },
  { line: 12, at: 34.4, shot: k("ceilingOff") },
  { line: 13, at: 36.25, shot: k("neighbors") },
  { line: 14, at: 37.85, shot: k("neighborsUp") },
  { line: 15, at: 39.45, shot: k("tide") },
  { line: 15, at: 41.9, shot: k("faceTop") },
  { line: 16, at: 43.17, shot: k("faceOpen") },
  { line: 17, at: 44.72, shot: k("keeperLow") },
  { line: 17, at: 46.32, shot: k("faceTalk") },
  // «у тебя в голове»: for a moment the sky above the keeper is a ceiling with fluorescent panels
  { line: 17, at: 47.3, shot: k("keeperCeil") },
  { line: 18, at: 48.4, shot: k("keeperTurn") },
  { line: 19, at: 50.82, shot: k("lighthouseWalls") },
  // the open ending: the face goes into a crate like all the others, and the crate loses a wall
  { line: 19, at: 53.0, shot: k("crateEnd") },
];

export const SFX: Sfx[] = [
  // the window frame pops on the hiss and lands in the pause
  { line: 4, at: 13.75, src: "ep5/hiss.wav", volume: 0.35 },
  { line: 4, at: 14.5, src: "ep5/thud.wav", volume: 0.5 },
  { line: 6, at: 17.3, src: "ep5/hiss.wav", volume: 0.45 },
  { line: 7, at: 20.07, src: "ep5/wind.wav", volume: 0.3 },
  { line: 9, at: 27.15, src: "ep5/hiss.wav", volume: 0.4 },
  { line: 9, at: 28.3, src: "ep5/thud.wav", volume: 0.45 },
  { line: 10, at: 30.35, src: "ep5/stamp.wav", volume: 0.7 },
  { line: 12, at: 34.55, src: "ep5/hiss.wav", volume: 0.3 },
  { line: 14, at: 37.9, src: "ep5/wind.wav", volume: 0.4 },
  // the lid goes on plank by plank; the crate breathes out and loses a wall
  ...[53.95, 54.4, 54.85, 55.3].map((at) => ({ line: 19, at, src: "ep5/stamp.wav", volume: 0.18 })),
  { line: 19, at: 56.5, src: "ep5/hiss.wav", volume: 0.25 },
  { line: 19, at: 57.5, src: "ep5/thud.wav", volume: 0.35 },
];

// office music until the neighbours are gone, then the shore theme of ep4 comes back with the sea
export const MUSIC = [
  { src: "audio/dusty1.mp3", level: 0.17, from: { line: 0, at: -LEAD }, to: { line: 14, at: 40.4 } },
  { src: "ep4/music-1.mp3", level: 0.2, from: { line: 14, at: 39.6 }, to: null },
] as const;

// voice second -> video second for a given line
export const offsets = () => LINES.map((_, i) => LEAD + LINES.slice(0, i).reduce((a, l) => a + l.gap, 0));
export const toVideo = (line: number, t: number) => t + offsets()[line];
export const END = (() => {
  const last = LINES.length - 1;
  const parts = LINES[last].parts;
  return toVideo(last, parts[parts.length - 1].to) + TAIL;
})();
// each line's slice of the voice track
export const voiceSegments = () =>
  LINES.map((l, i) => {
    const end = i + 1 < LINES.length ? LINES[i + 1].start : VOICE_LENGTH;
    return { start: l.start, end, at: toVideo(i, l.start) };
  });
