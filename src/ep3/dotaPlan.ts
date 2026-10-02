import type { DotaScene } from "./script";

// Map layout in world units (x right, z towards the camera). Square map, green bottom-left, red top-right.
export type P = [number, number];
export type Side = "rad" | "dire";

export const HALF = 24;
export const LANE_W = 2.4;
export const RIVER_W = 3.2;
export const PITCH = (57 * Math.PI) / 180;

export const sideOf = (x: number, z: number): Side => (z > x ? "rad" : "dire");

// lanes from the green base to the red base
export const LANE_PATHS: Record<"top" | "mid" | "bot", P[]> = {
  top: [
    [-19, 14],
    [-19, -19],
    [14, -19],
  ],
  mid: [
    [-14, 14],
    [14, -14],
  ],
  bot: [
    [-14, 19],
    [19, 19],
    [19, -14],
  ],
};
export type Lane = keyof typeof LANE_PATHS;

export const LANE_SEGS: { a: P; b: P; side: Side }[] = [
  { a: [-19, 14], b: [-19, -19], side: "rad" },
  { a: [-19, -19], b: [14, -19], side: "dire" },
  { a: [-14, 14], b: [0, 0], side: "rad" },
  { a: [0, 0], b: [14, -14], side: "dire" },
  { a: [-14, 19], b: [19, 19], side: "rad" },
  { a: [19, 19], b: [19, -14], side: "dire" },
];

export const TOWERS: { p: P; side: Side }[] = [
  ...(
    [
      [-20.9, 9],
      [-20.9, -1],
      [-20.9, -11],
      [-10.2, 12.8],
      [-6.7, 9.3],
      [-2.4, 5.6],
      [-10, 20.9],
      [0, 20.9],
      [10, 20.9],
    ] as P[]
  ).map((p) => ({ p, side: "rad" as Side })),
  ...(
    [
      [-11, -20.9],
      [1, -20.9],
      [10, -20.9],
      [2.4, -5.6],
      [6.7, -9.3],
      [10.2, -12.8],
      [20.9, 9],
      [20.9, -1],
      [20.9, -10],
    ] as P[]
  ).map((p) => ({ p, side: "dire" as Side })),
];

export const BASE_RAD: P = [-18.5, 18.5];
export const BASE_DIRE: P = [18.5, -18.5];
export const CAMP_A: P = [2, 12.5]; // ancient creeps
export const CAMP_B: P = [-12, 0]; // the huge golem
export const PIT: P = [-8, -14];

// hero walking paths that must stay free of trees
export const PATH_FOREST: P[] = [
  [-8.6, 8.6],
  [-6, 6],
  [-3.4, 8.6],
  [-1.2, 10.8],
];
export const PATH_OUT: P[] = [
  [2.5, 13.6],
  [2.5, 18.7],
];

const segDist = (x: number, z: number, a: P, b: P) => {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const k = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * k, z - a[1] - dz * k);
};
export const pathDist = (x: number, z: number, path: P[]) => Math.min(...path.slice(1).map((b, i) => segDist(x, z, path[i], b)));

// --- terrain: value noise, high-ground bases, a sunken river, forest hills and cliffs ----------------------
const h2 = (x: number, y: number) => {
  const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - Math.floor(v);
};
export const vnoise = (x: number, y: number) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = h2(xi, yi);
  const b = h2(xi + 1, yi);
  const c = h2(xi, yi + 1);
  const d = h2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
export const sstep = (e0: number, e1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};
export const laneDist = (x: number, z: number) => Math.min(...LANE_SEGS.map((l) => segDist(x, z, l.a, l.b)));
export const riverDist = (x: number, z: number) => Math.abs(z - x) / Math.SQRT2;
const cheb = (x: number, z: number, b: P) => Math.max(Math.abs(x - b[0]), Math.abs(z - b[1]));
export const baseDist = (x: number, z: number) => Math.min(cheb(x, z, BASE_RAD), cheb(x, z, BASE_DIRE));

export const groundY = (x: number, z: number) => {
  const ld = laneDist(x, z);
  const rd = riverDist(x, z);
  const bd = baseDist(x, z);
  const clear = Math.min(
    Math.hypot(x - CAMP_A[0], z - CAMP_A[1]) - 3.4,
    Math.hypot(x - CAMP_B[0], z - CAMP_B[1]) - 4.2,
    Math.hypot(x - PIT[0], z - PIT[1]) - 3.6,
    pathDist(x, z, PATH_FOREST) - 0.9,
    pathDist(x, z, PATH_OUT) - 0.9,
  );
  const open = sstep(1.8, 4.2, ld) * sstep(2.8, 4.8, rd) * sstep(0, 2.2, clear) * sstep(7, 9, bd);
  let h = open * (vnoise(x * 0.22 + 3, z * 0.22 + 11) * 0.9 + sstep(0.56, 0.6, vnoise(x * 0.1 + 5, z * 0.1 + 2)) * 1.3);
  h += 0.9 * (1 - sstep(6.4, 7.4, bd));
  h -= 0.55 * (1 - sstep(1.7, 2.7, rd));
  h -= 0.3 * (1 - sstep(2.7, 3.3, Math.hypot(x - PIT[0], z - PIT[1])));
  return h;
};

export const pathLen = (path: P[]) => path.slice(1).reduce((a, b, i) => a + Math.hypot(b[0] - path[i][0], b[1] - path[i][1]), 0);

// point + heading at distance d along a polyline
export const along = (path: P[], d: number): { x: number; z: number; dx: number; dz: number } => {
  let rest = Math.max(0, d);
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i];
    const [bx, bz] = path[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    if (rest <= len || i === path.length - 2) {
      const k = Math.min(1, rest / len);
      return { x: ax + (bx - ax) * k, z: az + (bz - az) * k, dx: (bx - ax) / len, dz: (bz - az) / len };
    }
    rest -= len;
  }
  return { x: path[0][0], z: path[0][1], dx: 1, dz: 0 };
};

const ease = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

export type HeroPose = { x: number; z: number; yaw: number; walk: number; attack: boolean; scale: number };

export const yawOf = (dx: number, dz: number) => Math.atan2(dx, dz);

export const heroPose = (id: DotaScene, s: number): HeroPose => {
  if (id === "lanes") {
    const p = along(LANE_PATHS.mid, 5.5 + s * 1.3);
    return { x: p.x, z: p.z, yaw: yawOf(p.dx, p.dz), walk: 1, attack: false, scale: 1 };
  }
  if (id === "toForest") {
    const d = Math.max(0, s - 0.3) * 1.7;
    const p = along(PATH_FOREST, d);
    return { x: p.x, z: p.z, yaw: yawOf(p.dx, p.dz), walk: d < pathLen(PATH_FOREST) ? 1 : 0, attack: false, scale: 1 };
  }
  if (id === "camp") return { x: CAMP_A[0] - 1.1, z: CAMP_A[1] + 1.0, yaw: yawOf(1, -0.9), walk: 0, attack: true, scale: 1 };
  if (id === "levelUp") {
    // bigger than he was, smaller than he could be
    const up = ease((s - 0.9) / 0.7);
    const settle = ease((s - 1.8) / 1.1);
    return { x: CAMP_A[0], z: CAMP_A[1] + 0.4, yaw: 0.25, walk: 0, attack: false, scale: 1 + 0.6 * up - 0.28 * settle };
  }
  if (id === "golem") return { x: CAMP_B[0] - 1.5, z: CAMP_B[1] - 1.5, yaw: yawOf(1.1, 0.8), walk: 0, attack: true, scale: 1.32 };
  if (id === "pit") return { x: PIT[0] + 60, z: PIT[1], yaw: 0, walk: 0, attack: false, scale: 1.32 };
  if (id === "clock40") {
    const k = ease((s - 0.8) / 1.9);
    const len = pathLen(PATH_OUT);
    const p = along(PATH_OUT, k * len);
    return { x: p.x, z: p.z, yaw: k < 1 ? 0 : yawOf(1, 0.2), walk: k > 0 && k < 1 ? 1 : 0, attack: false, scale: 1.32 };
  }
  if (id === "standoff") {
    // up the top lane, then he stops
    const k = ease((s - 0.15) / 2.1);
    return { x: -19, z: 6.2 - 4 * k, yaw: Math.PI, walk: k > 0 && k < 1 ? 1 : 0, attack: false, scale: 1.55 };
  }
  if (id === "enemies" || id === "heroClose") return { x: -19, z: 2.2, yaw: Math.PI, walk: 0, attack: false, scale: 1.55 };
  // inventoryBg: standing on the lane
  return { x: PATH_OUT[1][0], z: PATH_OUT[1][1], yaw: yawOf(1, 0.2), walk: 0, attack: false, scale: 1.32 };
};

// creep waves: marching along a lane, queueing up at a stop point and trading hits there
export type Wave = { lane: Lane; side: Side; d0: number; stop: number };
export const CREEP_SPEED = 1.15;
export const WAVES: Record<DotaScene, Wave[]> = {
  lanes: [
    { lane: "mid", side: "rad", d0: 11, stop: 19.1 },
    { lane: "mid", side: "dire", d0: 13.5, stop: 19.1 },
    { lane: "top", side: "rad", d0: 24, stop: 32.2 },
    { lane: "top", side: "dire", d0: 27, stop: 32.2 },
    { lane: "bot", side: "rad", d0: 22, stop: 32.2 },
    { lane: "bot", side: "dire", d0: 25, stop: 32.2 },
  ],
  toForest: [{ lane: "mid", side: "rad", d0: 4.2, stop: 19.1 }],
  camp: [],
  levelUp: [],
  golem: [],
  pit: [],
  clock40: [
    { lane: "bot", side: "rad", d0: 15.5, stop: 20.2 },
    { lane: "bot", side: "dire", d0: 39.5, stop: 44.2 },
  ],
  inventoryBg: [
    { lane: "bot", side: "rad", d0: 20.2, stop: 20.2 },
    { lane: "bot", side: "dire", d0: 44.2, stop: 44.2 },
  ],
  standoff: [],
  enemies: [],
  heroClose: [],
};

// the five of them, blocking the top lane in a wedge
export type EnemyKind = "beetle" | "wasp" | "mantis" | "mosquito" | "roach";
export const ENEMIES: { kind: EnemyKind; x: number; z: number }[] = [
  { kind: "beetle", x: -19, z: -2.2 },
  { kind: "wasp", x: -20.25, z: -2.9 },
  { kind: "mantis", x: -17.75, z: -2.9 },
  { kind: "roach", x: -20.8, z: -3.8 },
  { kind: "mosquito", x: -17.2, z: -3.8 },
];

export const CREEPS_PER_WAVE = 4;
export const creepPose = (w: Wave, j: number, s: number) => {
  const path = w.side === "rad" ? LANE_PATHS[w.lane] : [...LANE_PATHS[w.lane]].reverse();
  const head = Math.min(w.d0 + s * CREEP_SPEED, w.stop);
  const fighting = w.d0 + s * CREEP_SPEED >= w.stop;
  const row = j < 2 ? 0 : 1;
  const p = along(path, head - row * 0.8);
  const lat = (j % 2 === 0 ? -1 : 1) * 0.38;
  return { x: p.x - p.dz * lat, z: p.z + p.dx * lat, dx: p.dx, dz: p.dz, fighting };
};

// fixed Dota-style cameras: target on the ground, distance along the 57° view line
export const CAMS3: Record<DotaScene, { target: P; dist: number }> = {
  lanes: { target: [0, 4], dist: 76 },
  toForest: { target: [-4.8, 8.2], dist: 17 },
  camp: { target: [2, 11.2], dist: 12.5 },
  levelUp: { target: [2, 12.7], dist: 11 },
  golem: { target: [-12, -3.6], dist: 17 },
  pit: { target: [-8, -13.6], dist: 15 },
  clock40: { target: [4.2, 16.6], dist: 14 },
  inventoryBg: { target: [4.2, 16.6], dist: 14 },
  standoff: { target: [-19, -1.1], dist: 14 },
  enemies: { target: [-19, -3.2], dist: 8 },
  heroClose: { target: [-19, -1.85], dist: 9 },
};

// HUD state
export type Item = "hatchet" | "tango" | "artifact" | "secret" | "heart" | "butterfly" | "satanic" | "daedalus" | "rapier" | null;
export type HudState = { clock: number; gold: number; level: string; items: Item[]; backpack: Item[]; score: [number, number] };

export const LATE_BUILD: Item[] = ["artifact", "heart", "butterfly", "satanic", "daedalus", "rapier"];
export const LATE_BACKPACK: Item[] = ["secret", null, null];

export const hudState = (id: DotaScene, s: number): HudState => {
  const early: Item[] = ["hatchet", "tango", null, null, null, null];
  const none: Item[] = [null, null, null];
  switch (id) {
    case "lanes":
      return { clock: 31 + s, gold: 390 + Math.floor(s * 1.3), level: "1", items: early, backpack: none, score: [0, 0] };
    case "toForest":
      return { clock: 44 + s, gold: 396 + Math.floor(s * 1.3), level: "1", items: early, backpack: none, score: [0, 0] };
    case "camp":
      return { clock: 7 * 60 + 12 + s, gold: 1870 + Math.floor(s * 1.3), level: "7", items: ["hatchet", null, null, null, null, null], backpack: none, score: [3, 7] };
    case "levelUp":
      return {
        clock: 19 * 60 + 59.1 + s,
        gold: 9215 + Math.floor(s * 1.3),
        level: s >= 0.9 ? "BOSS" : "17",
        items: ["hatchet", "butterfly", null, null, null, null],
        backpack: none,
        score: [9, 24],
      };
    case "golem":
    case "pit":
      return {
        clock: 24 * 60 + 10 + s + (id === "pit" ? 5.2 : 0),
        gold: 12640 + Math.floor(s * 1.3),
        level: "BOSS",
        items: ["hatchet", "butterfly", "daedalus", null, null, null],
        backpack: none,
        score: [12, 29],
      };
    case "clock40":
      return { clock: 39 * 60 + 58.4 + s, gold: Math.min(20000, 19940 + Math.floor(s * 40)), level: "BOSS", items: LATE_BUILD, backpack: LATE_BACKPACK, score: [19, 58] };
    default:
      return { clock: 40 * 60 + 3 + s, gold: 20000, level: "BOSS", items: LATE_BUILD, backpack: LATE_BACKPACK, score: [19, 58] };
  }
};

export const formatClock = (sec: number) => {
  const t = Math.floor(sec);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

export const formatGold = (g: number) => (g >= 10000 ? `${Math.floor(g / 1000)} ${String(g % 1000).padStart(3, "0")}` : String(g));

// allied vision (fog of war): green base, hero, green towers, green creeps; a ward watches the pit
export const visionCircles = (id: DotaScene, s: number): [number, number, number][] => {
  const circles: [number, number, number][] = [[BASE_RAD[0], BASE_RAD[1], 13]];
  if (id !== "pit") {
    const h = heroPose(id, s);
    circles.push([h.x, h.z, 8.5]);
  } else circles.push([PIT[0] + 1, PIT[1] + 1, 9]);
  // the enemies are standing right in front of him, in plain sight
  if (id === "standoff" || id === "enemies" || id === "heroClose") circles.push([-19, -3.2, 4]);
  for (const t of TOWERS) if (t.side === "rad") circles.push([t.p[0], t.p[1], 7]);
  for (const w of WAVES[id])
    if (w.side === "rad")
      for (let j = 0; j < CREEPS_PER_WAVE; j += 2) {
        const c = creepPose(w, j, s);
        circles.push([c.x, c.z, 5]);
      }
  return circles;
};
