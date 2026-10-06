import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "../Ui";
import {
  CAMS3,
  CREEPS_PER_WAVE,
  HALF,
  LANE_PATHS,
  PIT,
  RIVER_W,
  TOWERS,
  WAVES,
  creepPose,
  formatClock,
  formatGold,
  heroPose,
  hudState,
  visionCircles,
  type Item,
} from "./dotaPlan";
import { clamp, ease, hash } from "./mat";
import { FPS, type DotaScene } from "./script";

// Game UI in the generic MOBA layout: top 5v5 bar with the clock, minimap bottom-left, hero bar bottom-centre.
// Dark stone-and-bronze panels. Everything sits between the TikTok top strip (170px) and the subtitle box.
const panel: React.CSSProperties = {
  position: "absolute",
  background: "linear-gradient(180deg, #2c3038 0%, #16191f 100%)",
  border: "3px solid #7c6842",
  boxShadow: "0 0 0 3px #0a0b0e, inset 0 0 0 2px #2e281c, 0 6px 18px rgba(0,0,0,0.6)",
  borderRadius: 4,
  imageRendering: "pixelated",
};

const slotStyle: React.CSSProperties = {
  background: "#101318",
  border: "2px solid #4e4834",
  boxShadow: "inset 0 0 0 2px #07080b",
  position: "relative",
  overflow: "hidden",
  boxSizing: "border-box",
};

// --- procedural hero portraits (our own busts: horns, helmets, hoods, crowns, manes, masks) ----------------
const BGS = ["#3a2a4a", "#233446", "#4a2626", "#21402e", "#4a3a20", "#1e2a40", "#3c2034", "#2e3a3e"];
const SKIN = ["#c8a888", "#7a9a6a", "#6a7aa8", "#9a9aa4", "#b86a5a", "#d8c8a0", "#5e5e6c", "#8a6a9a", "#a0c0c8", "#c07848"];
const ARMOR = ["#5a4a3a", "#3a4a5a", "#6a3030", "#3a5a3a", "#6a6a74", "#4a3a5a", "#7a6030", "#2e3440"];
const GLOW = ["#8af4ff", "#ff5a3a", "#ffe27a", "#b8ff6a", "#ffffff", "#d88aff"];
const pick = <T,>(arr: T[], k: number) => arr[Math.floor(k * arr.length) % arr.length];

export const Portrait: React.FC<{ seed: number; w: number; h: number }> = ({ seed, w, h }) => {
  const r = (k: number) => hash(seed * 13.7 + k * 3.1);
  const bg = pick(BGS, r(1));
  const skin = pick(SKIN, r(2));
  const armor = pick(ARMOR, r(3));
  const kind = Math.floor(r(4) * 6);
  const glow = r(5) > 0.3 ? pick(GLOW, r(6)) : null;
  const dx = (r(7) - 0.5) * 12;
  const id = `pt${seed}`;
  const hx = 50 + dx;
  return (
    <svg width={w} height={h} viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice" style={{ display: "block" }}>
      <defs>
        <radialGradient id={`${id}b`} cx={0.3 + r(8) * 0.4} cy="0.3" r="0.9">
          <stop offset="0" stopColor={bg} stopOpacity="1" />
          <stop offset="1" stopColor="#07080c" />
        </radialGradient>
        <linearGradient id={`${id}s`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.5" />
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      <rect width="100" height="60" fill={`url(#${id}b)`} />
      {kind === 4 && <path d={`M${hx - 22} 50 Q${hx - 26} 14 ${hx} 8 Q${hx + 26} 14 ${hx + 22} 50 Z`} fill={pick(ARMOR, r(9))} />}
      {kind === 2 && <path d={`M${hx - 30} 62 Q${hx - 28} 18 ${hx} 8 Q${hx + 28} 18 ${hx + 30} 62 Z`} fill={armor} />}
      <path d={`M${hx - 40} 62 Q${hx - 30} 38 ${hx} 36 Q${hx + 30} 38 ${hx + 40} 62 Z`} fill={armor} />
      <path d={`M${hx - 40} 62 Q${hx - 30} 38 ${hx} 36 Q${hx + 30} 38 ${hx + 40} 62 Z`} fill={`url(#${id}s)`} />
      {r(10) > 0.5 && (
        <>
          <ellipse cx={hx - 24} cy={44} rx={10} ry={6} fill={pick(ARMOR, r(11))} />
          <ellipse cx={hx + 24} cy={44} rx={10} ry={6} fill={pick(ARMOR, r(11))} />
        </>
      )}
      <ellipse cx={hx} cy={27} rx={11} ry={13} fill={kind === 5 ? "#d8d2c0" : skin} />
      <ellipse cx={hx} cy={27} rx={11} ry={13} fill={`url(#${id}s)`} />
      {kind === 2 && <ellipse cx={hx} cy={27} rx={10} ry={12} fill="#0a0a10" opacity={0.55} />}
      {kind === 0 && (
        <>
          <path d={`M${hx - 8} 18 Q${hx - 22} 10 ${hx - 20} -2 Q${hx - 14} 8 ${hx - 4} 15 Z`} fill="#d8cca6" />
          <path d={`M${hx + 8} 18 Q${hx + 22} 10 ${hx + 20} -2 Q${hx + 14} 8 ${hx + 4} 15 Z`} fill="#d8cca6" />
        </>
      )}
      {kind === 1 && (
        <>
          <path d={`M${hx - 13} 30 Q${hx - 13} 10 ${hx} 9 Q${hx + 13} 10 ${hx + 13} 30 L${hx + 10} 30 L${hx + 10} 25 L${hx - 10} 25 L${hx - 10} 30 Z`} fill="#8a8e9a" />
          <path d={`M${hx - 2} 9 L${hx} -2 L${hx + 2} 9 Z`} fill={pick(GLOW, r(12))} opacity={0.8} />
        </>
      )}
      {kind === 3 && <path d={`M${hx - 12} 16 L${hx - 10} 6 L${hx - 5} 13 L${hx} 3 L${hx + 5} 13 L${hx + 10} 6 L${hx + 12} 16 Z`} fill="#d8b04a" />}
      {kind === 5 && (
        <>
          <ellipse cx={hx - 4.5} cy={27} rx={3} ry={3.5} fill="#1a1418" />
          <ellipse cx={hx + 4.5} cy={27} rx={3} ry={3.5} fill="#1a1418" />
        </>
      )}
      {glow && (
        <>
          <circle cx={hx - 4.5} cy={27} r={5} fill={glow} opacity={0.25} />
          <circle cx={hx + 4.5} cy={27} r={5} fill={glow} opacity={0.25} />
          <rect x={hx - 6.5} y={26} width={4} height={2} fill={glow} />
          <rect x={hx + 2.5} y={26} width={4} height={2} fill={glow} />
        </>
      )}
      <path d={`M${hx + 9} 18 Q${hx + 12} 27 ${hx + 8} 37`} stroke="#fff" strokeOpacity={0.25} strokeWidth={1.5} fill="none" />
    </svg>
  );
};

export const FlyPortrait: React.FC<{ w: number; h: number }> = ({ w, h }) => (
  <svg width={w} height={h} viewBox="0 0 40 40" preserveAspectRatio="xMidYMid slice" style={{ display: "block" }}>
    <defs>
      <radialGradient id="flybg" cx="0.4" cy="0.3" r="0.9">
        <stop offset="0" stopColor="#3a5046" />
        <stop offset="1" stopColor="#0c1010" />
      </radialGradient>
    </defs>
    <rect width="40" height="40" fill="url(#flybg)" />
    <ellipse cx="20" cy="33" rx="13" ry="10" fill="#5e6a66" />
    <ellipse cx="20" cy="20" rx="8" ry="8" fill="#8a9a94" />
    <circle cx="12" cy="17" r="6.5" fill="#d8402c" />
    <circle cx="28" cy="17" r="6.5" fill="#d8402c" />
    <circle cx="10.5" cy="15" r="1.8" fill="#ffb8a8" />
    <circle cx="26.5" cy="15" r="1.8" fill="#ffb8a8" />
  </svg>
);

// --- item icons: our own pixel art that only evokes the late-game classics by shape and colour ----------------
const Px: React.FC<{ rows: string[]; pal: Record<string, string>; size: number; bg: string }> = ({ rows, pal, size, bg }) => {
  const n = rows.length;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} style={{ display: "block", shapeRendering: "crispEdges" }}>
      <rect width={n} height={n} fill={bg} />
      {rows.flatMap((row, y) => row.split("").map((c, x) => (pal[c] ? <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={pal[c]} /> : null)))}
    </svg>
  );
};

const HEART = [
  "................",
  "......aa..aa....",
  ".....aAa.aAa....",
  "...kkaakkaakk...",
  "..krrrrrkrrrrk..",
  ".krhhrrrrrrrRrk.",
  ".krhrrrrrrrrRrk.",
  ".krrrrrvrrrrRrk.",
  ".krrrrrvvrrRRrk.",
  "..krrrrrvrrRrk..",
  "...krrrrvrRrk...",
  "....krrrrRrk....",
  ".....krrRrk.....",
  "......krrk......",
  ".......kk.......",
  "................",
];
const SATANIC = [
  ".h............h.",
  ".hh..........hh.",
  "..hh.kkkkkk.hh..",
  "...hkddddddkh...",
  "...kddddddddk...",
  "..kddDDDDDDddk..",
  "..kdDDDDDDDDdk..",
  "..kdDrrDDrrDdk..",
  "..kdDRrDDrRDdk..",
  "..kdDDDDDDDDdk..",
  "..kddDDkkDDddk..",
  "...kdDkddkDdk...",
  "...kddkddkddk...",
  "....kdkddkdk....",
  ".....kk..kk.....",
  "................",
];

const Butterfly: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: "block" }}>
    <rect width="16" height="16" fill="#0e1a14" />
    <path d="M8 8 C5 1 1 2 1.5 6.5 C2 9.5 5.5 9.5 8 8 Z" fill="#46c866" stroke="#1a5a30" strokeWidth="0.4" />
    <path d="M8 8 C11 1 15 2 14.5 6.5 C14 9.5 10.5 9.5 8 8 Z" fill="#46c866" stroke="#1a5a30" strokeWidth="0.4" />
    <path d="M8 8.5 C6 10 3 11 3.5 13 C4.5 14.5 7 12 8 8.5 Z" fill="#2e9a50" />
    <path d="M8 8.5 C10 10 13 11 12.5 13 C11.5 14.5 9 12 8 8.5 Z" fill="#2e9a50" />
    <path d="M8 8 L3 4 M8 8 L13 4 M8 8 L2.5 6.5 M8 8 L13.5 6.5" stroke="#c8ffd0" strokeWidth="0.35" />
    <path d="M8 3 L8 15" stroke="#e8f0e0" strokeWidth="0.8" />
    <circle cx="8" cy="15" r="0.8" fill="#d8b04a" />
  </svg>
);

const Daedalus: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: "block" }}>
    <rect width="16" height="16" fill="#1c160c" />
    <path d="M3 13.5 Q4 5 14.5 1.5 Q9 6.5 5 14 Z" fill="#e8b830" />
    <path d="M4 12.5 Q5.5 6 13.5 2.5" stroke="#fff0a0" strokeWidth="0.6" fill="none" />
    <path d="M1.5 11.5 L5.5 15.5" stroke="#8a5a20" strokeWidth="1.6" />
    <path d="M1 15 L3 13" stroke="#5a3a18" strokeWidth="1.4" />
    <circle cx="3.5" cy="13.5" r="0.9" fill="#ff4a3a" />
  </svg>
);

const Rapier: React.FC<{ size: number; s: number }> = ({ size, s }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: "block" }}>
    <defs>
      <radialGradient id="rapierglow" cx="0.55" cy="0.45" r="0.6">
        <stop offset="0" stopColor="#fff4b0" stopOpacity={0.55 + 0.15 * Math.sin(s * 3)} />
        <stop offset="1" stopColor="#1a1408" stopOpacity="1" />
      </radialGradient>
    </defs>
    <rect width="16" height="16" fill="url(#rapierglow)" />
    <path d="M4.5 11.5 L14.5 1.5" stroke="#fffbe0" strokeWidth="1.1" />
    <path d="M3 10 Q5.5 9.5 6 13" stroke="#e8b830" strokeWidth="0.9" fill="none" />
    <path d="M1.5 14.5 L4.5 11.5" stroke="#b8862a" strokeWidth="1.5" />
    <circle cx="1.6" cy="14.4" r="0.9" fill="#ffe27a" />
  </svg>
);

const Hatchet: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" style={{ shapeRendering: "crispEdges", display: "block" }}>
    <rect width="16" height="16" fill="#1e2418" />
    <polygon points="4,14 5,15 12,6 11,5" fill="#9a6232" />
    <polygon points="9,2 14,5 12,9 10,7 11,5" fill="#cfd4dc" />
    <polygon points="12,9 14,5 15,6 13,10" fill="#f4f6f8" />
  </svg>
);

const Tango: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" style={{ shapeRendering: "crispEdges", display: "block" }}>
    <rect width="16" height="16" fill="#142a1e" />
    <path d="M3 13 C3 6 8 3 13 3 C13 8 10 13 3 13 Z" fill="#6ed45a" />
    <path d="M3 13 L11 5" stroke="#2f7a2a" strokeWidth="1" />
  </svg>
);

// the strange artifact: a tiny fruit-fly brain drawn in rainbow lines
const BRAIN_LINES = (() => {
  const lobes: [number, number, number, number][] = [
    [22, 50, 17, 24],
    [78, 50, 17, 24],
    [50, 46, 22, 17],
    [50, 70, 10, 7],
  ];
  const out: { x1: number; y1: number; x2: number; y2: number; h: number; p: number }[] = [];
  let n = 0;
  lobes.forEach(([cx, cy, rx, ry], li) => {
    const count = li === 3 ? 10 : 34;
    for (let i = 0; i < count; i++) {
      n++;
      const a = hash(n) * Math.PI * 2;
      const rr = Math.sqrt(hash(n + 50));
      const x = cx + Math.cos(a) * rx * rr * 0.9;
      const y = cy + Math.sin(a) * ry * rr * 0.9;
      const d = hash(n + 90) * Math.PI * 2;
      out.push({ x1: x, y1: y, x2: x + Math.cos(d) * 6, y2: y + Math.sin(d) * 6, h: hash(n + 130) * 360, p: hash(n + 170) * 6.28 });
    }
  });
  return out;
})();

const Artifact: React.FC<{ size: number; s: number; glow: number }> = ({ size, s, glow }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
    <rect width="100" height="100" fill="#0e0f1c" />
    <circle cx="50" cy="52" r={40 + 4 * glow} fill={`rgba(170,120,255,${0.16 + 0.2 * glow})`} />
    {BRAIN_LINES.map((l, i) => {
      const k = 0.55 + 0.45 * Math.sin(s * 2.2 + l.p);
      return (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={`hsl(${(l.h + s * 40) % 360}, 90%, ${45 + 25 * k}%)`} strokeWidth={3.2} strokeLinecap="square" />
      );
    })}
  </svg>
);

const Secret: React.FC<{ size: number; pulse: number }> = ({ size, pulse }) => (
  <div
    style={{
      width: size,
      height: size,
      background: "#0e0f16",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily,
      fontSize: size * 0.55,
      color: `rgb(${200 + 55 * pulse}, ${200 + 40 * pulse}, ${230})`,
      textShadow: `0 0 ${10 * pulse}px #b890ff, 4px 4px 0 #000`,
    }}
  >
    ?
  </div>
);

const ItemIcon: React.FC<{ item: Item; size: number; s: number; glow?: number; pulse?: number }> = ({ item, size, s, glow = 0.4, pulse = 0 }) => {
  switch (item) {
    case "hatchet":
      return <Hatchet size={size} />;
    case "tango":
      return <Tango size={size} />;
    case "artifact":
      return <Artifact size={size} s={s} glow={glow} />;
    case "secret":
      return <Secret size={size} pulse={pulse} />;
    case "heart":
      return (
        <Px rows={HEART} size={size} bg="#1e0c10" pal={{ a: "#b84a5a", A: "#e87a8a", k: "#3a0c14", r: "#c42a38", h: "#ff8a90", R: "#8a1626", v: "#6a1020" }} />
      );
    case "satanic":
      return <Px rows={SATANIC} size={size} bg="#120a0c" pal={{ h: "#d8cca6", k: "#0e0a0e", d: "#3a1418", D: "#6a1c24", r: "#ff3a2a", R: "#ffb04a" }} />;
    case "butterfly":
      return <Butterfly size={size} />;
    case "daedalus":
      return <Daedalus size={size} />;
    case "rapier":
      return <Rapier size={size} s={s} />;
    default:
      return null;
  }
};

const Ability: React.FC<{ i: number; size: number; cd: number }> = ({ i, size, cd }) => {
  const bg = ["#1e4a56", "#3e2860", "#5a2222", "#6a4414"][i];
  return (
    <div style={{ ...slotStyle, width: size, height: size, borderColor: i === 3 ? "#c8a04a" : "#4e4834" }}>
      <svg width={size - 4} height={size - 4} viewBox="0 0 20 20" style={{ display: "block" }}>
        <defs>
          <radialGradient id={`ab${i}`} cx="0.4" cy="0.35" r="0.8">
            <stop offset="0" stopColor={bg} />
            <stop offset="1" stopColor="#07080c" />
          </radialGradient>
        </defs>
        <rect width="20" height="20" fill={`url(#ab${i})`} />
        {i === 0 && [4, 8, 12].map((y) => <path key={y} d={`M3 ${y + 2} Q10 ${y - 3} 17 ${y + 2}`} stroke="#9ae4f4" strokeWidth="1.4" fill="none" />)}
        {i === 1 && [3, 6, 9].map((rr) => <circle key={rr} cx="10" cy="10" r={rr} stroke="#d0b0ff" strokeWidth="1.2" fill="none" />)}
        {i === 2 &&
          [0, 1, 2, 3, 4, 5, 6].map((k) => (
            <circle key={k} cx={k === 6 ? 10 : 10 + Math.cos(k * 1.047) * 5} cy={k === 6 ? 10 : 10 + Math.sin(k * 1.047) * 5} r="2" fill="#ff7a5a" />
          ))}
        {i === 3 && [0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => <rect key={k} x={3 + hash(k) * 13} y={3 + hash(k + 9) * 13} width="2" height="2" fill="#ffd86a" />)}
      </svg>
      {cd > 0 && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(6,7,12,0.65)", color: "#fff", fontFamily, fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {Math.ceil(cd)}
        </div>
      )}
    </div>
  );
};

// --- minimap with fog of war --------------------------------------------------------------------------------
const Minimap: React.FC<{ id: DotaScene; s: number; size: number }> = ({ id, s, size }) => {
  const hero = heroPose(id, s);
  const { target, dist } = CAMS3[id];
  const H = HALF;
  const pt = (x: number, z: number) => `${x + H},${z + H}`;
  const near = Math.min(target[1] + 0.35 * dist, H);
  const far = Math.max(target[1] - 0.95 * dist, -H);
  const nw = 0.3 * dist;
  const fw = 0.62 * dist;
  const cl = (v: number) => Math.max(-H, Math.min(H, v));
  const lanePts = (p: [number, number][]) => p.map(([x, z]) => pt(x, z)).join(" ");
  const vis = visionCircles(id, s);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${2 * H} ${2 * H}`} style={{ display: "block", shapeRendering: "crispEdges" }}>
      <defs>
        <mask id={`fow-${id}`}>
          <rect width={2 * H} height={2 * H} fill="white" />
          {vis.map(([x, z, rr], i) => (
            <circle key={i} cx={x + H} cy={z + H} r={rr * 0.85} fill="black" />
          ))}
        </mask>
      </defs>
      <polygon points={`${pt(-H, -H)} ${pt(-H, H)} ${pt(H, H)}`} fill="#34502c" />
      <polygon points={`${pt(-H, -H)} ${pt(H, H)} ${pt(H, -H)}`} fill="#3e3036" />
      <line x1="0" y1="0" x2={2 * H} y2={2 * H} stroke="#3a6a7a" strokeWidth={RIVER_W * 0.9} />
      {Object.values(LANE_PATHS).map((p, i) => (
        <polyline key={i} points={lanePts(p)} fill="none" stroke="#8a7a5a" strokeWidth={1.6} />
      ))}
      <rect x={1} y={2 * H - 11} width={10} height={10} fill="#8ab89a" />
      <rect x={2 * H - 11} y={1} width={10} height={10} fill="#8a3a32" />
      <circle cx={PIT[0] + H} cy={PIT[1] + H} r={1.8} fill="#7a6a90" />
      <rect width={2 * H} height={2 * H} fill="#05060a" opacity={0.55} mask={`url(#fow-${id})`} />
      {TOWERS.map((t, i) => (
        <rect key={i} x={t.p[0] + H - 0.9} y={t.p[1] + H - 0.9} width={1.8} height={1.8} fill={t.side === "rad" ? "#8aff9a" : "#ff6a5a"} />
      ))}
      {WAVES[id].flatMap((w, wi) =>
        Array.from({ length: CREEPS_PER_WAVE }).map((_, j) => {
          const c = creepPose(w, j, s);
          return <rect key={`${wi}-${j}`} x={c.x + H - 0.5} y={c.z + H - 0.5} width={1} height={1} fill={w.side === "rad" ? "#b8ff90" : "#ff9080"} />;
        }),
      )}
      {id !== "pit" && <circle cx={hero.x + H} cy={hero.z + H} r={1.8} fill="#9aaaa2" stroke="#ffffff" strokeWidth={0.6} />}
      <polygon
        points={`${pt(cl(target[0] - nw), near)} ${pt(cl(target[0] + nw), near)} ${pt(cl(target[0] + fw), far)} ${pt(cl(target[0] - fw), far)}`}
        fill="none"
        stroke="#ffffff"
        strokeWidth={0.45}
      />
    </svg>
  );
};

// top bar: our side left (the fly is the last), the enemy right, the game clock in between
const RAD_SEEDS = [3, 11, 27, 41];
const DIRE_SEEDS = [57, 64, 78, 85, 92];
const TopBar: React.FC<{ clockStr: string; hit: boolean; pop: number; score: [number, number] }> = ({ clockStr, hit, pop, score }) => (
  <div style={{ position: "absolute", top: 184, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "flex-start", gap: 8 }}>
    <div style={{ display: "flex", gap: 4 }}>
      {[...RAD_SEEDS, -1].map((seed, i) => (
        <div key={i} style={{ width: 60, height: 44, border: "2px solid #0a0b0e", borderBottom: "5px solid #4ac85a", boxSizing: "content-box", overflow: "hidden" }}>
          {seed < 0 ? <FlyPortrait w={60} h={44} /> : <Portrait seed={seed} w={60} h={44} />}
        </div>
      ))}
    </div>
    <div style={{ ...panel, position: "relative", width: 160, height: 76, marginTop: -6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 26, color: hit ? "#ffe27a" : "#e8e4d8", transform: `scale(${pop})`, textShadow: hit ? "0 0 12px #ffcc33, 3px 3px 0 #000" : "3px 3px 0 #000" }}>{clockStr}</div>
      <div style={{ display: "flex", gap: 38, fontSize: 15, marginTop: 8 }}>
        <span style={{ color: "#8aff9a" }}>{score[0]}</span>
        <span style={{ color: "#ff8a7a" }}>{score[1]}</span>
      </div>
    </div>
    <div style={{ display: "flex", gap: 4 }}>
      {DIRE_SEEDS.map((seed, i) => (
        <div key={i} style={{ width: 60, height: 44, border: "2px solid #0a0b0e", borderBottom: "5px solid #d8483a", boxSizing: "content-box", overflow: "hidden" }}>
          <Portrait seed={seed} w={60} h={44} />
        </div>
      ))}
    </div>
  </div>
);

// --- the in-game HUD ----------------------------------------------------------------------------
export const DotaHud: React.FC<{ id: DotaScene; dim?: boolean }> = ({ id, dim = false }) => {
  const frame = useCurrentFrame();
  const s = frame / FPS;
  const st = hudState(id, s);
  const hit40 = id === "clock40" && st.clock >= 40 * 60;
  const hit20 = id === "levelUp" && st.clock >= 10 * 60;
  const pop = hit40 ? interpolate(st.clock - 40 * 60, [0, 0.15, 0.6], [1, 1.35, 1.15], clamp) : hit20 ? interpolate(st.clock - 10 * 60, [0, 0.15, 0.6], [1, 1.3, 1.1], clamp) : 1;
  const lvlPop = id === "levelUp" ? interpolate(s, [0.9, 1.05, 1.5], [1, 1.7, 1.15], clamp) : 1;
  const boss = st.level === "BOSS";
  const attacking = id === "camp" || id === "golem";
  return (
    <AbsoluteFill style={{ fontFamily, color: "#ece8dc", opacity: dim ? 0.55 : 1 }}>
      <TopBar clockStr={formatClock(st.clock)} hit={hit40 || hit20} pop={pop} score={st.score} />

      <div style={{ ...panel, left: 36, top: 990, width: 212, height: 212, padding: 0, overflow: "hidden" }}>
        <Minimap id={id} s={s} size={206} />
      </div>

      <div style={{ ...panel, left: 262, top: 1020, width: 668, height: 182 }}>
        <div style={{ position: "absolute", left: 10, top: 12, width: 140, height: 140, borderRadius: "50%", overflow: "hidden", border: "4px solid #b8903a", boxSizing: "border-box", boxShadow: "0 0 0 3px #0a0b0e" }}>
          <FlyPortrait w={132} h={132} />
        </div>
        <div
          style={{
            position: "absolute",
            left: boss ? 64 : 104,
            top: 120,
            minWidth: boss ? 108 : 46,
            height: 44,
            padding: "0 8px",
            boxSizing: "border-box",
            borderRadius: 22,
            background: boss ? "linear-gradient(180deg,#d8a020,#8a5a10)" : "#1c2028",
            border: `3px solid ${boss ? "#ffe27a" : "#7c6842"}`,
            fontSize: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${lvlPop})`,
            boxShadow: boss ? "0 0 16px #ffb830, 0 0 0 2px #0a0b0e" : "0 0 0 2px #0a0b0e",
            color: boss ? "#fff8e0" : "#ece8dc",
            textShadow: "2px 2px 0 #000",
          }}
        >
          {st.level}
        </div>
        <div style={{ position: "absolute", left: 164, top: 14, display: "flex", gap: 8 }}>
          {[0, 1, 2, 3].map((i) => (
            <Ability key={i} i={i} size={72} cd={attacking && i === 1 ? 6 - ((s * 1.2) % 6) : 0} />
          ))}
        </div>
        <div style={{ position: "absolute", left: 164, top: 100, width: 312, height: 20, background: "#07080b", border: "2px solid #4e4834" }}>
          <div style={{ width: "86%", height: "100%", background: "linear-gradient(180deg,#6ad85a,#2a8a2a)" }} />
        </div>
        <div style={{ position: "absolute", left: 164, top: 128, width: 312, height: 16, background: "#07080b", border: "2px solid #4e4834" }}>
          <div style={{ width: "64%", height: "100%", background: "linear-gradient(180deg,#5a90f0,#1e48b0)" }} />
        </div>
        <div style={{ position: "absolute", left: 488, top: 12, display: "grid", gridTemplateColumns: "repeat(3, 52px)", gap: 6 }}>
          {st.items.map((it, i) => (
            <div key={i} style={{ ...slotStyle, width: 52, height: 52 }}>
              <ItemIcon item={it} size={48} s={s} />
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", left: 488, top: 132, width: 168, height: 34, display: "flex", alignItems: "center", gap: 8, fontSize: 18, color: "#ffd84a" }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#e8b830", border: "2px solid #8a6010" }} />
          {formatGold(st.gold)}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// --- hero pick screen: every hero is taken; one slot on our side is still empty ------------------------------
const GROUPS = [
  { color: "#d0503c", shape: "diamond" },
  { color: "#4ab85a", shape: "circle" },
  { color: "#4a7ae0", shape: "square" },
] as const;

const Ornament: React.FC<{ width: number; color: string }> = ({ width, color }) => (
  <svg width={width} height={14} style={{ display: "block" }}>
    <line x1={0} y1={7} x2={width} y2={7} stroke="#7c6842" strokeWidth={2} />
    <line x1={0} y1={10} x2={width} y2={10} stroke="#3a3222" strokeWidth={1} />
    <path d={`M${width / 2 - 8} 7 L${width / 2} 1 L${width / 2 + 8} 7 L${width / 2} 13 Z`} fill={color} stroke="#0a0b0e" strokeWidth={1} />
  </svg>
);

export const PickScreen: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames;
  const remaining = Math.max(0, Math.ceil(interpolate(t, [0, 0.9], [7, 0], clamp)));
  const pulse = 0.5 + 0.5 * Math.sin(frame / 9);
  const TW = 86;
  const TH = 50;
  const GAP = 4;
  const COLS = 9;
  const ROWS = 4;
  const gridW = COLS * TW + (COLS - 1) * GAP;
  const left = 520 - gridW / 2;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 90% 60% at 50% 35%, #262a34 0%, #121418 70%, #0a0b0e 100%)", fontFamily, color: "#ece8dc" }}>
      {/* stone grain */}
      <svg width="1080" height="1920" style={{ position: "absolute", inset: 0, opacity: 0.22, mixBlendMode: "overlay" }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={4} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="1080" height="1920" filter="url(#grain)" />
      </svg>
      {/* 5 v 5 */}
      <div style={{ position: "absolute", top: 186, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 10, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 5 }}>
          {[...RAD_SEEDS, -1].map((seed, i) =>
            seed < 0 ? (
              <div
                key={i}
                style={{
                  width: 66,
                  height: 90,
                  boxSizing: "border-box",
                  background: "linear-gradient(180deg,#14161c,#0a0b0e)",
                  border: `3px solid rgba(216,176,74,${0.45 + 0.45 * pulse})`,
                  boxShadow: `0 0 ${10 + 14 * pulse}px rgba(255,200,90,${0.35 + 0.3 * pulse}), inset 0 0 12px #000`,
                }}
              />
            ) : (
              <div key={i} style={{ width: 66, height: 90, border: "2px solid #0a0b0e", borderBottom: "6px solid #4ac85a", overflow: "hidden", boxSizing: "border-box" }}>
                <Portrait seed={seed} w={66} h={84} />
              </div>
            ),
          )}
        </div>
        <div style={{ ...panel, position: "relative", width: 124, height: 96, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 34, color: remaining <= 3 ? "#ff6a4a" : "#ece8dc", textShadow: "3px 3px 0 #000" }}>0:{String(remaining).padStart(2, "0")}</div>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {DIRE_SEEDS.map((seed, i) => (
            <div key={i} style={{ width: 66, height: 90, border: "2px solid #0a0b0e", borderBottom: "6px solid #d8483a", overflow: "hidden", boxSizing: "border-box" }}>
              <Portrait seed={seed} w={66} h={84} />
            </div>
          ))}
        </div>
      </div>
      {/* the hero grid: three attribute groups, nearly all portraits greyed as taken */}
      <div style={{ ...panel, left: left - 18, top: 330, width: gridW + 36, height: 3 * (30 + ROWS * TH + (ROWS - 1) * GAP) + 2 * 18 + 30 }} />
      {GROUPS.map((g, gi) => (
        <div key={gi} style={{ position: "absolute", left, top: 346 + gi * (30 + ROWS * TH + (ROWS - 1) * GAP + 18) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 20,
                height: 20,
                background: g.color,
                borderRadius: g.shape === "circle" ? "50%" : 2,
                transform: g.shape === "diamond" ? "rotate(45deg) scale(0.85)" : "none",
                border: "2px solid #0a0b0e",
                boxShadow: `0 0 10px ${g.color}`,
              }}
            />
            <Ornament width={gridW - 32} color={g.color} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, ${TW}px)`, gap: GAP, filter: "blur(0.4px)" }}>
            {Array.from({ length: COLS * ROWS }).map((_, k) => {
              const seed = 100 + gi * 50 + k;
              const free = hash(seed * 1.9) < 0.1;
              return (
                <div key={k} style={{ width: TW, height: TH, border: `2px solid ${free ? g.color : "#050608"}`, boxSizing: "border-box", overflow: "hidden", position: "relative" }}>
                  <div style={{ filter: free ? "brightness(1.15)" : "grayscale(1) brightness(0.85)" }}>
                    <Portrait seed={seed} w={TW - 4} h={TH - 4} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

// --- inventory close-up -----------------------------------------------------------------------
export const InventoryCloseup: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames;
  const s = frame / FPS;
  const zoom = ease(interpolate(frame, [0, 8], [0, 1], clamp));
  const st = hudState("inventoryBg", s);
  const focus = t < 0.36 ? 0 : t < 0.62 ? 1 : 2; // artifact, gold, secret
  const SZ = 190;
  const lit = "#ffe27a";
  return (
    <AbsoluteFill style={{ fontFamily, color: "#ece8dc" }}>
      <AbsoluteFill style={{ background: "rgba(6,8,12,0.62)" }} />
      <div style={{ ...panel, left: 540 - 345, top: 340, width: 690, height: 790, transform: `scale(${0.6 + 0.4 * zoom})`, opacity: zoom, transformOrigin: "50% 60%" }}>
        <div style={{ position: "absolute", left: 30, top: 28, display: "grid", gridTemplateColumns: `repeat(3, ${SZ}px)`, gap: 16 }}>
          {st.items.map((it, i) => {
            const on = focus === 0 && i === 0;
            return (
              <div
                key={i}
                style={{ ...slotStyle, width: SZ, height: SZ, borderWidth: 4, borderColor: on ? lit : "#6a5a3a", boxShadow: on ? "0 0 30px #b890ff, inset 0 0 0 2px #07080b" : slotStyle.boxShadow }}
              >
                <ItemIcon item={it} size={SZ - 8} s={s} glow={focus === 0 ? 1 : 0.4} />
              </div>
            );
          })}
        </div>
        {/* backpack: three smaller slots below, the secret in the first */}
        <div style={{ position: "absolute", left: 30, top: 460, display: "flex", gap: 16, alignItems: "center" }}>
          {st.backpack.map((it, i) => {
            const on = focus === 2 && it === "secret";
            return (
              <div
                key={i}
                style={{ ...slotStyle, width: 128, height: 128, borderWidth: 4, borderColor: on ? lit : "#4e4834", opacity: it ? 1 : 0.6, boxShadow: on ? "0 0 26px #b890ff" : slotStyle.boxShadow }}
              >
                <ItemIcon item={it} size={120} s={s} pulse={on ? 0.5 + 0.5 * Math.sin(s * 5) : 0.2} />
              </div>
            );
          })}
        </div>
        <div
          style={{
            position: "absolute",
            left: 30,
            right: 30,
            top: 624,
            height: 130,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 26,
            fontSize: 62,
            color: "#ffd84a",
            textShadow: focus === 1 ? "0 0 18px #ffb800, 4px 4px 0 #000" : "4px 4px 0 #000",
            background: "#101318",
            border: `4px solid ${focus === 1 ? lit : "#6a5a3a"}`,
          }}
        >
          <div style={{ width: 58, height: 58, borderRadius: "50%", background: "#e8b830", border: "5px solid #8a6010" }} />
          {formatGold(st.gold)}
        </div>
      </div>
    </AbsoluteFill>
  );
};
