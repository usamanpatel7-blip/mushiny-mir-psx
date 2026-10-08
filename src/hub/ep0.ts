import type { HubEpisode, HubShot } from "./Episode";

// «Добро пожаловать». Three usable phrases from the long take interleaved with the cast roll call
// (public/hub/ep0/voice.mp3 is cut from take-long.mp3 and take-names.mp3).
// Still missing from the take: «Оплата сдельная», the sleep capsules, «Трындец Плюс».
const VERT: [number, number] = [941, 1672];
const WIDE: [number, number] = [1671, 941];
const SHEET: [number, number] = [1536, 1024];

const shots: HubShot[] = [
  // «Добро пожаловать в Трындец корпорейшн.»
  { img: "scenes/ep3-1-wide", size: WIDE, from: 0, a: { cx: 1400, cy: 470, h: 941 }, b: { cx: 900, cy: 470, h: 941 } },
  // «Мидл Тимоша,»
  { img: "chars/timosha", size: SHEET, from: 4.4, a: { cx: 1080, cy: 560, h: 1000 }, b: { cx: 1070, cy: 500, h: 820 } },
  // «График гибкий: приходите когда хотите,»
  { img: "scenes/ep4-1", size: VERT, from: 6.45, a: { cx: 470, cy: 836, h: 1672 }, b: { cx: 520, cy: 720, h: 1300 } },
  // «уходите после релиза.»
  { img: "scenes/ep8-3", size: VERT, from: 11.95, a: { cx: 330, cy: 900, h: 1000 }, b: { cx: 470, cy: 836, h: 1672 } },
  // «Глеб Стартапович,»
  { img: "chars/gleb", size: SHEET, from: 14.45, a: { cx: 380, cy: 540, h: 1024 }, b: { cx: 390, cy: 500, h: 900 } },
  // «Снежана Вайбовна,»
  { img: "scenes/ep6-water", size: VERT, from: 16.55, a: { cx: 520, cy: 760, h: 1350 }, b: { cx: 540, cy: 600, h: 1000 } },
  // «Разрешаем пилить B2B SaaS по выходным.»
  { img: "scenes/ep8-1", size: VERT, from: 18.8, a: { cx: 470, cy: 836, h: 1672 }, b: { cx: 480, cy: 900, h: 1250 } },
  // «Помидор Джайлович,»
  { img: "chars/pomidorych", size: SHEET, from: 23.45, a: { cx: 1100, cy: 560, h: 1024 }, b: { cx: 1100, cy: 480, h: 760 } },
  // «Жорж Скрамник.» — no sheet for him yet: the whiteboard stands in
  { img: "scenes/ep5-pigeons2", size: VERT, from: 25.85, a: { cx: 800, cy: 380, h: 760 }, b: { cx: 470, cy: 836, h: 1672 } },
];

export const welcome: HubEpisode = {
  id: "Welcome",
  voice: "hub/ep0/voice.mp3",
  end: 29.4,
  musicFrom: 72,
  shots,
  captions: [
    { text: "Добро пожаловать", at: 0 },
    { text: "в «Трындец корпорейшн»", at: 1.8 },
    { text: "Мидл Тимоша", at: 4.55 },
    { text: "График гибкий:", at: 6.62 },
    { text: "приходите когда хотите,", at: 9.9 },
    { text: "уходите после релиза", at: 12.1 },
    { text: "Глеб Стартапович", at: 14.6 },
    { text: "Снежана Вайбовна", at: 16.85 },
    { text: "Разрешаем пилить", at: 19.04 },
    { text: "B2B SaaS по выходным", at: 20.94 },
    { text: "Помидор Джайлович", at: 23.62 },
    { text: "Жорж Скрамник", at: 26.04 },
  ],
};
