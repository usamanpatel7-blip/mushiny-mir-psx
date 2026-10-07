// Episode 4: «Пустые лица», two reels cut from one narration.
// The lore: the faces wash up while the drosophila god sleeps (ep2 ends with it closing its eyes);
// dawn is the god opening them. Every three months is a patch; the lighthouse is the senior of the shift.
export type FacesScene =
  | "seaFaces"
  | "tide"
  | "shoreWide"
  | "crateTop"
  | "sunTurn"
  | "stare"
  | "morph"
  | "dawnGod"
  | "jaws"
  | "insideUp"
  | "whisperMask"
  | "lighthouse"
  | "crateFly"
  | "crateLid"
  | "lighthouseEnd";

export type Shot4 = { kind: "still"; src: string } | { kind: "3d"; id: FacesScene };

// a subtitle line is typed part by part inside its own speech windows (voice seconds);
// `gap` is the silence added after the line, so every image gets room to breathe
export type Part = { text: string; from: number; to: number };
export type Line = { parts: Part[]; gap: number };

// a cut is anchored to a line: `at` is in voice seconds and moves with that line
export type Cut = { line: number; at: number; shot: Shot4 };

export type Reel = {
  voice: string;
  // video second where voice second 0 plays
  lead: number;
  voiceLength: number;
  music: string;
  musicLevel: number;
  lines: Line[];
  cuts: Cut[];
  // seconds after the last word: the ending, then a slow fade
  tail: number;
};

export const FPS = 30;

const still = (name: string): Shot4 => ({ kind: "still", src: `ps1/${name}.png` });
const k = (id: FacesScene): Shot4 => ({ kind: "3d", id });
const P = (text: string, from: number, to: number): Part => ({ text, from, to });

export const REEL1: Reel = {
  voice: "ep4/voice-1.wav",
  lead: 0,
  voiceLength: 28.1,
  music: "ep4/music-1.mp3",
  musicLevel: 0.22,
  lines: [
    { parts: [P("Раз в три месяца море приносит пустые лица.", 0.92, 4.08)], gap: 1.2 },
    { parts: [P("К рассвету берег бывает покрыт ими целиком.", 5.34, 8.13)], gap: 1.4 },
    { parts: [P("Смотрители собирают их вручную ", 9.4, 11.3), P("и складывают в пронумерованные ящики.", 11.4, 13.74)], gap: 1.2 },
    { parts: [P("Почему это нужно сделать до восхода солнца, ", 14.92, 17.21), P("никто уже не помнит.", 17.49, 18.77)], gap: 1.6 },
    { parts: [P("Главное правило: ", 19.96, 20.95), P("не смотреть на лицо слишком долго.", 21.22, 23.38)], gap: 1.4 },
    { parts: [P("Иногда оно начинает становиться похожим на тебя.", 24.65, 27.51)], gap: 0 },
  ],
  cuts: [
    { line: 0, at: 0, shot: k("seaFaces") },
    { line: 0, at: 2.4, shot: k("tide") },
    { line: 1, at: 5.14, shot: k("shoreWide") },
    { line: 2, at: 9.2, shot: still("faces-crates-wide") },
    { line: 2, at: 11.35, shot: k("crateTop") },
    { line: 3, at: 14.72, shot: k("sunTurn") },
    { line: 3, at: 17.35, shot: still("faces-crates-far") },
    { line: 4, at: 19.76, shot: k("stare") },
    { line: 5, at: 24.45, shot: k("morph") },
    { line: 5, at: 28.5, shot: still("faces-suit-face") },
    // the open ending: the sun comes up and, faintly, the god opens its eyes
    { line: 5, at: 30.8, shot: k("dawnGod") },
  ],
  tail: 9.7,
};

export const REEL2: Reel = {
  voice: "ep4/voice-2.wav",
  lead: 0.6,
  voiceLength: 26.86,
  music: "ep4/music-2.m4a",
  musicLevel: 0.16,
  lines: [
    { parts: [P("Правило 1: ", 0.62, 1.64), P("не считать лица вслух.", 2.84, 4.43)], gap: 1.4 },
    { parts: [P("Правило 2: ", 5.62, 6.46), P("не поднимать лицо, если оно лежит внутренней стороной вверх.", 7.7, 11.6)], gap: 1.4 },
    { parts: [P("Правило 3: ", 12.74, 13.59), P("если лицо произнесло ваше имя, ", 14.84, 16.88), P("сообщить старшему смены.", 17.21, 18.74)], gap: 1.4 },
    { parts: [P("Правило 4: ", 19.93, 20.96), P("если среди найденных есть ваше лицо, ", 22.17, 24.5), P("смену продолжить как обычно.", 24.8, 26.61)], gap: 0 },
  ],
  cuts: [
    { line: 0, at: -0.6, shot: k("jaws") },
    { line: 1, at: 5.42, shot: still("faces-suit-light") },
    { line: 1, at: 7.6, shot: k("insideUp") },
    { line: 2, at: 12.54, shot: k("whisperMask") },
    { line: 2, at: 17.05, shot: k("lighthouse") },
    { line: 3, at: 19.73, shot: k("crateFly") },
    { line: 3, at: 24.65, shot: k("crateLid") },
    { line: 3, at: 27.6, shot: still("faces-suit-wide") },
    // the brain in the lighthouse blinks once, like an eye, and the reel fades with the music
    { line: 3, at: 29.5, shot: k("lighthouseEnd") },
  ],
  tail: 8.4,
};

// voice second -> video second for a given line
export const offsets = (reel: Reel) => reel.lines.map((_, i) => reel.lead + reel.lines.slice(0, i).reduce((a, l) => a + l.gap, 0));
export const toVideo = (reel: Reel, line: number, t: number) => t + offsets(reel)[line];
export const reelEnd = (reel: Reel) => {
  const last = reel.lines.length - 1;
  const parts = reel.lines[last].parts;
  return toVideo(reel, last, parts[parts.length - 1].to) + reel.tail;
};
// each line's slice of the voice track, split in the middle of the pauses
export const voiceSegments = (reel: Reel) =>
  reel.lines.map((l, i) => {
    const start = i === 0 ? 0 : (reel.lines[i - 1].parts[reel.lines[i - 1].parts.length - 1].to + l.parts[0].from) / 2;
    const next = reel.lines[i + 1];
    const end = next ? (l.parts[l.parts.length - 1].to + next.parts[0].from) / 2 : reel.voiceLength;
    return { start, end, at: toVideo(reel, i, start) };
  });
