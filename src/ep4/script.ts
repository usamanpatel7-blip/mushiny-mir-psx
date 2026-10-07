// Episode 4: «Пустые лица», two reels cut from one narration. Times are measured on each half of the voice (silencedetect).
export type FacesScene =
  | "seaFaces"
  | "tide"
  | "shoreWide"
  | "crateTop"
  | "sunTurn"
  | "stare"
  | "morph"
  | "jaws"
  | "insideUp"
  | "whisperMask"
  | "lighthouse"
  | "crateFly";

export type Shot4 = { kind: "still"; src: string } | { kind: "3d"; id: FacesScene };

// a subtitle line is typed part by part, each part inside its own speech window (video seconds)
export type Part = { text: string; from: number; to: number };
export type Line = { parts: Part[] };

// a shot holds from `at` (video seconds) until the next shot
export type Cut = { at: number; shot: Shot4 };

export type Reel = {
  voice: string;
  voiceDelay: number;
  music: string;
  musicLevel: number;
  lines: Line[];
  cuts: Cut[];
  end: number;
};

export const FPS = 30;

const still = (name: string): Shot4 => ({ kind: "still", src: `ps1/${name}.png` });
const k = (id: FacesScene): Shot4 => ({ kind: "3d", id });
const P = (text: string, from: number, to: number): Part => ({ text, from, to });

export const REEL1: Reel = {
  voice: "ep4/voice-1.wav",
  voiceDelay: 0,
  music: "ep4/music-1.mp3",
  musicLevel: 0.22,
  lines: [
    { parts: [P("Раз в три месяца море приносит пустые лица.", 0.92, 4.08)] },
    { parts: [P("К рассвету берег бывает покрыт ими целиком.", 5.34, 8.13)] },
    { parts: [P("Смотрители собирают их вручную ", 9.4, 11.3), P("и складывают в пронумерованные ящики.", 11.4, 13.74)] },
    { parts: [P("Почему это нужно сделать до восхода солнца, ", 14.92, 17.21), P("никто уже не помнит.", 17.49, 18.77)] },
    { parts: [P("Главное правило: ", 19.96, 20.95), P("не смотреть на лицо слишком долго.", 21.22, 23.38)] },
    { parts: [P("Иногда оно начинает становиться похожим на тебя.", 24.65, 27.51)] },
  ],
  cuts: [
    { at: 0, shot: k("seaFaces") },
    { at: 2.4, shot: k("tide") },
    { at: 5.14, shot: k("shoreWide") },
    { at: 9.2, shot: still("faces-crates-wide") },
    { at: 11.3, shot: k("crateTop") },
    { at: 14.72, shot: k("sunTurn") },
    { at: 17.35, shot: still("faces-crates-far") },
    { at: 19.76, shot: k("stare") },
    { at: 24.45, shot: k("morph") },
    { at: 27.6, shot: still("faces-suit-face") },
  ],
  end: 31.0,
};

// the second half of the narration, started 0.6 s into the reel
const D = 0.6;
export const REEL2: Reel = {
  voice: "ep4/voice-2.wav",
  voiceDelay: D,
  music: "ep4/music-2.m4a",
  musicLevel: 0.16,
  lines: [
    { parts: [P("Правило 1: ", 0.62 + D, 1.64 + D), P("не считать лица вслух.", 2.84 + D, 4.43 + D)] },
    { parts: [P("Правило 2: ", 5.62 + D, 6.46 + D), P("не поднимать лицо, если оно лежит внутренней стороной вверх.", 7.7 + D, 11.6 + D)] },
    { parts: [P("Правило 3: ", 12.74 + D, 13.59 + D), P("если лицо произнесло ваше имя, ", 14.84 + D, 16.88 + D), P("сообщить старшему смены.", 17.21 + D, 18.74 + D)] },
    { parts: [P("Правило 4: ", 19.93 + D, 20.96 + D), P("если среди найденных есть ваше лицо, ", 22.17 + D, 24.5 + D), P("смену продолжить как обычно.", 24.8 + D, 26.61 + D)] },
  ],
  cuts: [
    { at: 0, shot: k("jaws") },
    { at: 5.42 + D, shot: still("faces-suit-light") },
    { at: 7.6 + D, shot: k("insideUp") },
    { at: 12.54 + D, shot: k("whisperMask") },
    { at: 17.05 + D, shot: k("lighthouse") },
    { at: 19.73 + D, shot: k("crateFly") },
    { at: 24.65 + D, shot: still("faces-suit-wide") },
  ],
  end: 26.61 + D + 3.4,
};
