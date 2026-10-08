import type { HubEpisode, HubShot } from "./Episode";

// «Великое Взвешивание». Voice: fish.audio take, times from its word timestamps.
const VERT: [number, number] = [941, 1672]; // scenes/ep3-1: empty scale, queue; ep3-2: Timosha vs achievements
const BAKE: [number, number] = [1122, 1402]; // scenes/ep3-bake: expectations being baked in the office kitchen
const SHEET: [number, number] = [1536, 1024];
// the Thursday tail is a second take, glued on after «но не туда»
const B = 25.03;

const shots: HubShot[] = [
  // «Раз в полгода Снежана Вайбовна взвешивает мидлов»
  { img: "scenes/ep3-1", size: VERT, from: 0, a: { cx: 470, cy: 836, h: 1672 }, b: { cx: 470, cy: 800, h: 1450 } },
  // «На одну чашу кладут ачивки,» — the pan full of cups and gems
  { img: "scenes/ep3-2", size: VERT, from: 5.0, a: { cx: 760, cy: 860, h: 780 }, b: { cx: 760, cy: 880, h: 640 } },
  // «на другую — ожидания» — the dough
  { img: "scenes/ep3-bake", size: BAKE, from: 7.5, a: { cx: 250, cy: 700, h: 760 }, b: { cx: 280, cy: 680, h: 680 } },
  // «Ожидания всегда тяжелее:» — the office kitchen at work
  { img: "scenes/ep3-bake", size: BAKE, from: 9.75, a: { cx: 380, cy: 701, h: 1402 }, b: { cx: 720, cy: 701, h: 1402 } },
  // «их пекут заранее» — the tray comes out of the oven
  { img: "scenes/ep3-bake", size: BAKE, from: 12.05, a: { cx: 900, cy: 880, h: 820 }, b: { cx: 930, cy: 900, h: 680 } },
  // «Тимоша положил на весы закрытые тикетни»
  { img: "scenes/ep3-2", size: VERT, from: 14.0, a: { cx: 190, cy: 660, h: 940 }, b: { cx: 180, cy: 600, h: 780 } },
  // «ночные инциденты и свою спину»
  { img: "chars/timosha", size: SHEET, from: 17.65, a: { cx: 1080, cy: 560, h: 1000 }, b: { cx: 1060, cy: 480, h: 800 } },
  // «Растёшь, — сказала Снежана…» — from him on the pan across to her
  { img: "scenes/ep3-2", size: VERT, from: 20.85, a: { cx: 280, cy: 660, h: 1100 }, b: { cx: 640, cy: 640, h: 1100 } },
  // «…но не туда»
  { img: "chars/snezhana", size: SHEET, from: 23.35, a: { cx: 1140, cy: 540, h: 1000 }, b: { cx: 1140, cy: 470, h: 780 } },
  // «Зато по четвергам у нас сырки.» — scenes/ep3-3: the glass case
  { img: "scenes/ep3-3", size: VERT, from: B - 0.2, a: { cx: 470, cy: 836, h: 1672 }, b: { cx: 500, cy: 900, h: 1400 } },
  // «Если перевести сырок в годовой доход,»
  { img: "scenes/ep3-3", size: VERT, from: B + 2.8, a: { cx: 560, cy: 1250, h: 760 }, b: { cx: 560, cy: 1260, h: 640 } },
  // «то это почти повышение.»
  { img: "scenes/ep3-3", size: VERT, from: B + 6.1, a: { cx: 680, cy: 470, h: 860 }, b: { cx: 680, cy: 420, h: 680 } },
  // «Но два взять нельзя,»
  { img: "scenes/ep3-3", size: VERT, from: B + 8.4, a: { cx: 200, cy: 420, h: 820 }, b: { cx: 190, cy: 380, h: 680 } },
  // «иначе нарушится грейдовая сетка.»
  { img: "scenes/ep3-3", size: VERT, from: B + 10.35, a: { cx: 520, cy: 760, h: 1100 }, b: { cx: 470, cy: 836, h: 1672 } },
];

export const weighing: HubEpisode = {
  id: "Weighing",
  voice: "hub/ep3/voice-full.mp3",
  end: 39.6,
  musicFrom: 0,
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
    { text: "Зато по четвергам", at: B },
    { text: "у нас сырки", at: B + 1.64 },
    { text: "Если перевести сырок", at: B + 2.96 },
    { text: "в годовой доход,", at: B + 4.68 },
    { text: "то это почти повышение", at: B + 6.28 },
    { text: "Но два взять нельзя —", at: B + 8.56 },
    { text: "иначе нарушится", at: B + 10.48 },
    { text: "грейдовая сетка", at: B + 11.6 },
  ],
};
