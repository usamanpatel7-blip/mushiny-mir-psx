import type { HubEpisode, HubShot } from "./Episode";

// «Прополка». Two takes joined, the second starts at B. Placeholder cut from character sheets
//.
const B = 12.58;
const SHEET: [number, number] = [1536, 1024];
const RAIN: [number, number] = [940, 1672];
const WIDE: [number, number] = [1671, 941]; // scenes/ep3-1-wide: the queue of middles

const shots: HubShot[] = [
  // «Весной в Болотном Хабе начинается прополка.»
  { img: "scenes/ep8-3", size: RAIN, from: 0, a: { cx: 300, cy: 600, h: 1100 }, b: { cx: 320, cy: 500, h: 900 } },
  // «Снежана Вайбовна ходит по опенспейсу с лейкой.»
  { img: "scenes/ep6-water", size: RAIN, from: 4.7, a: { cx: 470, cy: 836, h: 1672 }, b: { cx: 520, cy: 760, h: 1350 } },
  // «Кого польёт — тот остаётся.»
  { img: "scenes/ep6-water", size: RAIN, from: 9.25, a: { cx: 260, cy: 760, h: 900 }, b: { cx: 240, cy: 780, h: 760 } },
  // «Кого не польёт, того зовут на синкопу ненадолго»
  { img: "scenes/ep3-1-wide", size: WIDE, from: B - 0.1, a: { cx: 1400, cy: 470, h: 941 }, b: { cx: 1250, cy: 470, h: 941 } },
  // «и говорят, что мы семья, просто семья теперь поменьше.»
  { img: "chars/snezhana", size: SHEET, from: B + 4.65, a: { cx: 1140, cy: 560, h: 1024 }, b: { cx: 1140, cy: 470, h: 760 } },
  // «Тимошу полили. Он стоит мокрый и счастливый.»
  { img: "scenes/ep6-wet", size: RAIN, from: B + 9.75, a: { cx: 470, cy: 836, h: 1672 }, b: { cx: 450, cy: 600, h: 1100 } },
  // «Ему отдали задачи троих ушедших и их кружки.»
  { img: "scenes/ep6-mugs", size: RAIN, from: B + 14.4, a: { cx: 470, cy: 836, h: 1672 }, b: { cx: 560, cy: 1000, h: 1100 } },
];

export const weeding: HubEpisode = {
  id: "Weeding",
  voice: "hub/ep6/voice.mp3",
  end: 33.1,
  musicFrom: 144,
  shots,
  captions: [
    { text: "Весной", at: 0 },
    { text: "в Болотном Хабе", at: 0.7 },
    { text: "начинается прополка", at: 2.12 },
    { text: "Снежана Вайбовна", at: 4.86 },
    { text: "ходит по опенспейсу", at: 6.16 },
    { text: "с лейкой", at: 7.92 },
    { text: "Кого польёт —", at: 9.4 },
    { text: "тот остаётся", at: 10.6 },
    { text: "Кого не польёт —", at: B },
    { text: "того зовут на синкопу", at: B + 1.6 },
    { text: "«ненадолго»", at: B + 3.28 },
    { text: "и говорят,", at: B + 4.78 },
    { text: "что мы семья", at: B + 5.5 },
    { text: "просто семья", at: B + 6.86 },
    { text: "теперь поменьше", at: B + 7.8 },
    { text: "Тимошу полили", at: B + 9.94 },
    { text: "Он стоит", at: B + 11.5 },
    { text: "мокрый и счастливый", at: B + 12.0 },
    { text: "Ему отдали задачи", at: B + 14.56 },
    { text: "троих ушедших", at: B + 16.08 },
    { text: "и их кружки", at: B + 17.44 },
  ],
};
