import type { HubEpisode, HubShot } from "./Episode";

// «Зелёный глазик». Voice: two fish.audio takes joined, the second starts at B.
const B = 9.93;
const ROOM: [number, number] = [940, 1672]; // scenes/ep4-1: Timosha at night, the eye on the monitor
const SHEET: [number, number] = [1536, 1024];

const shots: HubShot[] = [
  // «На удалёнке у каждого есть зелёный глазик.»
  { img: "scenes/ep4-1", size: ROOM, from: 0, a: { cx: 470, cy: 836, h: 1672 }, b: { cx: 600, cy: 700, h: 1300 } },
  // «Если он потухнет,»
  { img: "scenes/ep4-1", size: ROOM, from: 3.4, a: { cx: 780, cy: 420, h: 640 }, b: { cx: 790, cy: 410, h: 520 } },
  // «придёт Снежана и спросит, всё ли у тебя хорошо.»
  { img: "chars/snezhana", size: SHEET, from: 5.35, a: { cx: 1140, cy: 560, h: 1024 }, b: { cx: 1140, cy: 470, h: 760 } },
  // «Поэтому Тимоша кормит глазик.»
  { img: "scenes/ep4-1", size: ROOM, from: B - 0.2, a: { cx: 430, cy: 640, h: 1000 }, b: { cx: 460, cy: 600, h: 860 } },
  // «Двигает мышку каждые четыре минуты.»
  { img: "scenes/ep4-1", size: ROOM, from: B + 3.05, a: { cx: 560, cy: 1120, h: 760 }, b: { cx: 600, cy: 1120, h: 660 } },
  // «Он не спит уже полгода.»
  { img: "chars/timosha", size: SHEET, from: B + 6.65, a: { cx: 1080, cy: 560, h: 1000 }, b: { cx: 1050, cy: 450, h: 720 } },
  // «Глазик вырос большой и сытый»
  { img: "chars/glazik", size: SHEET, from: B + 9.0, a: { cx: 270, cy: 560, h: 760 }, b: { cx: 300, cy: 560, h: 1000 } },
  // «и сам начал ходить на синкопы.»
  { img: "chars/glazik", size: SHEET, from: B + 12.1, a: { cx: 1060, cy: 560, h: 1024 }, b: { cx: 1060, cy: 520, h: 900 } },
  // «Глазика повысили.»
  { img: "chars/glazik", size: SHEET, from: B + 15.05, a: { cx: 1070, cy: 380, h: 760 }, b: { cx: 1070, cy: 330, h: 560 } },
  // «Тимоша по-прежнему мидл.»
  { img: "scenes/ep4-1", size: ROOM, from: B + 16.85, a: { cx: 430, cy: 640, h: 900 }, b: { cx: 470, cy: 836, h: 1672 } },
];

export const greenEye: HubEpisode = {
  id: "GreenEye",
  voice: "hub/ep4/voice.mp3",
  end: 30.8,
  musicFrom: 48,
  shots,
  captions: [
    { text: "На удалёнке", at: 0 },
    { text: "у каждого есть", at: 1.04 },
    { text: "зелёный глазик", at: 1.96 },
    { text: "Если он потухнет,", at: 3.56 },
    { text: "придёт Снежана", at: 5.48 },
    { text: "и спросит,", at: 6.66 },
    { text: "всё ли у тебя хорошо", at: 7.78 },
    { text: "Поэтому Тимоша", at: B },
    { text: "кормит глазик", at: B + 1.58 },
    { text: "Двигает мышку", at: B + 3.22 },
    { text: "каждые четыре минуты", at: B + 4.48 },
    { text: "Он не спит", at: B + 6.82 },
    { text: "уже полгода", at: B + 7.6 },
    { text: "Глазик вырос", at: B + 9.14 },
    { text: "большой и сытый", at: B + 10.08 },
    { text: "и сам начал ходить", at: B + 11.86 },
    { text: "на синкопы", at: B + 13.6 },
    { text: "Глазика повысили", at: B + 15.2 },
    { text: "Тимоша", at: B + 17.02 },
    { text: "по-прежнему мидл", at: B + 17.8 },
  ],
};
