import type { HubEpisode, HubShot } from "./Episode";

// «Пивот». Placeholder cut from character sheets and the swamp exterior until the scenes arrive:
// socks warehouse, pigeons on blockchain, the round dance around the building.
const SHEET: [number, number] = [1536, 1024];
const RAIN: [number, number] = [940, 1672]; // scenes/ep8-3: the Hub at night in the rain

const shots: HubShot[] = [
  // «По вторникам Глеб Стартапович»
  { img: "chars/gleb", size: SHEET, from: 0, a: { cx: 380, cy: 540, h: 1024 }, b: { cx: 390, cy: 500, h: 900 } },
  // «надевает очки и видит будущее.»
  { img: "chars/gleb", size: SHEET, from: 2.4, a: { cx: 1110, cy: 560, h: 1024 }, b: { cx: 1110, cy: 470, h: 760 } },
  // «В будущем у нас доставка носков.»
  { img: "chars/gleb", size: SHEET, from: 6.25, a: { cx: 1120, cy: 330, h: 640 }, b: { cx: 1120, cy: 260, h: 480 } },
  // «Ночью офис разворачивается на 180 градусов.»
  { img: "scenes/ep8-3", size: RAIN, from: 9.15, a: { cx: 300, cy: 520, h: 1000 }, b: { cx: 520, cy: 520, h: 1000 } },
  // «В среду мы блокчейн для голубей.»
  { img: "chars/gleb", size: SHEET, from: 14.2, a: { cx: 380, cy: 512, h: 1024 }, b: { cx: 380, cy: 512, h: 1024 } },
  // «В четверг — ИИ для блокчейна для голубей.»
  { img: "chars/pomidorych", size: SHEET, from: 17.2, a: { cx: 1100, cy: 560, h: 1024 }, b: { cx: 1100, cy: 480, h: 760 } },
  // «Протестующие уже водят хоровод вокруг здания.»
  { img: "scenes/ep8-3", size: RAIN, from: 21.1, a: { cx: 700, cy: 980, h: 1000 }, b: { cx: 470, cy: 836, h: 1672 } },
];

export const pivot: HubEpisode = {
  id: "Pivot",
  voice: "hub/ep5/voice.mp3",
  end: 26.6,
  musicFrom: 96,
  shots,
  captions: [
    { text: "По вторникам", at: 0 },
    { text: "Глеб Стартапович", at: 0.92 },
    { text: "надевает очки", at: 2.54 },
    { text: "и видит будущее", at: 4.06 },
    { text: "В будущем у нас", at: 6.42 },
    { text: "доставка носков", at: 7.54 },
    { text: "Ночью офис", at: 9.34 },
    { text: "разворачивается", at: 10.38 },
    { text: "на 180 градусов", at: 11.64 },
    { text: "В среду мы", at: 14.4 },
    { text: "блокчейн для голубей", at: 15.16 },
    { text: "В четверг —", at: 17.36 },
    { text: "ИИ для блокчейна", at: 18.24 },
    { text: "для голубей", at: 20.16 },
    { text: "Протестующие уже", at: 21.3 },
    { text: "водят хоровод", at: 22.68 },
    { text: "вокруг здания", at: 23.76 },
  ],
};
