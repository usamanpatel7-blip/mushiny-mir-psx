import type { HubEpisode, HubShot } from "./Episode";

// «Тестовое». The bank-in-a-jar finale still to come; until then the model bank closes it.
const VERT: [number, number] = [941, 1672]; // scenes/ep8-1: Timosha building the test task as desk models
const RAIN: [number, number] = [940, 1672];
const SHEET: [number, number] = [1536, 1024];

const shots: HubShot[] = [
  // «Чтобы попасть в Болотный Хаб,»
  { img: "scenes/ep8-3", size: RAIN, from: 0, a: { cx: 300, cy: 560, h: 1100 }, b: { cx: 340, cy: 480, h: 900 } },
  // «нужно сделать тестовое.»
  { img: "chars/timosha", size: SHEET, from: 2.55, a: { cx: 300, cy: 512, h: 1024 }, b: { cx: 300, cy: 420, h: 800 } },
  // «Небольшое, на вечерок:»
  { img: "scenes/ep8-1", size: VERT, from: 5.45, a: { cx: 470, cy: 836, h: 1672 }, b: { cx: 500, cy: 900, h: 1300 } },
  // «соцсеть, платформа такси с экосистемой»
  { img: "scenes/ep8-1", size: VERT, from: 7.7, a: { cx: 400, cy: 1060, h: 700 }, b: { cx: 440, cy: 1050, h: 600 } },
  // «и маленький большой банк.»
  { img: "scenes/ep8-1", size: VERT, from: 11.9, a: { cx: 760, cy: 1000, h: 640 }, b: { cx: 760, cy: 980, h: 520 } },
  // «Тимоша сделал за две недели.»
  { img: "scenes/ep8-1", size: VERT, from: 14.6, a: { cx: 420, cy: 560, h: 820 }, b: { cx: 420, cy: 520, h: 680 } },
  // «Снежана Вайбовна помахала ему вилкой.»
  { img: "chars/snezhana", size: SHEET, from: 17.8, a: { cx: 330, cy: 512, h: 1024 }, b: { cx: 1140, cy: 500, h: 900 } },
  // «Тимошу не взяли.»
  { img: "chars/timosha", size: SHEET, from: 21.35, a: { cx: 1080, cy: 560, h: 1000 }, b: { cx: 1060, cy: 480, h: 780 } },
  // «Банк работает в банке до сих пор.»
  { img: "scenes/ep8-1", size: VERT, from: 23.1, a: { cx: 760, cy: 1000, h: 560 }, b: { cx: 760, cy: 980, h: 420 } },
];

export const testTask: HubEpisode = {
  id: "TestTask",
  voice: "hub/ep8/voice.mp3",
  end: 27.6,
  musicFrom: 24,
  shots,
  captions: [
    { text: "Чтобы попасть", at: 0 },
    { text: "в Болотный Хаб,", at: 1.24 },
    { text: "нужно сделать тестовое", at: 2.7 },
    { text: "Небольшое,", at: 5.64 },
    { text: "на вечерок:", at: 6.68 },
    { text: "соцсеть,", at: 7.84 },
    { text: "платформа такси", at: 8.9 },
    { text: "с экосистемой", at: 10.12 },
    { text: "и маленький", at: 12.06 },
    { text: "большой банк", at: 13.0 },
    { text: "Тимоша сделал", at: 14.74 },
    { text: "за две недели", at: 15.96 },
    { text: "Снежана Вайбовна", at: 17.96 },
    { text: "помахала ему вилкой", at: 19.34 },
    { text: "Тимошу не взяли", at: 21.52 },
    { text: "Банк работает", at: 23.26 },
    { text: "в банке", at: 24.32 },
    { text: "до сих пор", at: 24.98 },
  ],
};
