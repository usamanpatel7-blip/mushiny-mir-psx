import type { HubEpisode, HubShot } from "./Episode";

// «Великое Взвешивание». Voice: fish.audio take, times from its word timestamps.
const VERT: [number, number] = [941, 1672]; // scenes/ep3-1: empty scale, queue of middles
const WIDE: [number, number] = [1671, 941]; // scenes/ep3-1-wide: Timosha already on the pan
const SHEET: [number, number] = [1536, 1024];

const shots: HubShot[] = [
  // «Раз в полгода Снежана Вайбовна взвешивает мидлов»
  { img: "scenes/ep3-1", size: VERT, from: 0, a: { cx: 470, cy: 836, h: 1672 }, b: { cx: 470, cy: 800, h: 1450 } },
  // «На одну чашу кладут ачивки, на другую — ожидания»
  { img: "scenes/ep3-1", size: VERT, from: 5.0, a: { cx: 440, cy: 760, h: 940 }, b: { cx: 500, cy: 740, h: 880 } },
  // «Ожидания всегда тяжелее: их пекут заранее»
  { img: "scenes/ep3-1", size: VERT, from: 9.75, a: { cx: 150, cy: 440, h: 760 }, b: { cx: 150, cy: 360, h: 600 } },
  // «Тимоша положил на весы закрытые тикетни»
  { img: "scenes/ep3-1-wide", size: WIDE, from: 14.0, a: { cx: 610, cy: 470, h: 941 }, b: { cx: 610, cy: 420, h: 800 } },
  // «ночные инциденты и свою спину»
  { img: "chars/timosha", size: SHEET, from: 17.65, a: { cx: 1080, cy: 560, h: 1000 }, b: { cx: 1060, cy: 480, h: 800 } },
  // «Растёшь, — сказала Снежана…» — from him on the pan across to her
  { img: "scenes/ep3-1-wide", size: WIDE, from: 20.85, a: { cx: 610, cy: 470, h: 941 }, b: { cx: 330, cy: 470, h: 941 } },
  // «…но не туда»
  { img: "chars/snezhana", size: SHEET, from: 23.35, a: { cx: 1140, cy: 540, h: 1000 }, b: { cx: 1140, cy: 470, h: 780 } },
];

export const weighing: HubEpisode = {
  id: "Weighing",
  voice: "hub/ep3/voice.mp3",
  end: 26,
  shots,
  captions: [
    { text: "Раз в полгода", at: 0 },
    { text: "Снежана Вайбовна", at: 1.22 },
    { text: "взвешивает мидлов", at: 2.68 },
    { text: "На одну чашу", at: 5.16 },
    { text: "кладут ачивки,", at: 6.24 },
    { text: "на другую — ожидания", at: 7.62 },
    { text: "Ожидания всегда тяжелее:", at: 9.9 },
    { text: "их пекут заранее", at: 12.18 },
    { text: "Тимоша положил", at: 14.16 },
    { text: "на весы закрытые тикетни,", at: 15.2 },
    { text: "ночные инциденты", at: 17.82 },
    { text: "и свою спину", at: 19.28 },
    { text: "«Растёшь, —", at: 20.98 },
    { text: "сказала Снежана, —", at: 21.84 },
    { text: "но не туда»", at: 23.46 },
  ],
};
