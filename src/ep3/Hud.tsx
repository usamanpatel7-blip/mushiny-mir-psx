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
  type Item,
} from "./dotaPlan";
import { clamp, ease, hash } from "./mat";
import { FPS, type DotaScene } from "./script";

// Game UI in the generic MOBA layout: top 5v5 bar with the clock, minimap bottom-left, hero bar bottom-centre.
// Everything sits between the TikTok top strip (170px) and the subtitle box (its top edge is at y>=1212 for every game line).
const HERO_COLORS = ["#4f7fe8", "#5ad6c4", "#a05ae0", "#e8d04a", "#8e9e96"];
const DIRE_COLORS = ["#e87aa8", "#a8b44a", "#6ac8f0", "#3e8a5a", "#a8743e"];
export const FLY_COLOR = HERO_COLORS[4];

const panel: React.CSSProperties = {
  position: "absolute",
  background: "linear-gradient(180deg, #4c5470 0%, #30374e 100%)",
  border: "4px solid #9aa0b8",
  boxShadow: "0 0 0 4px #1c2030, inset 0 0 0 3px rgba(0,0,0,0.35)",
  borderRadius: 6,
  imageRendering: "pixelated",
};

const slotStyle: React.CSSProperties = {
  background: "#232a3c",
  border: "3px solid #6a7290",
  boxShadow: "inset 0 0 0 2px #151a28",
  position: "relative",
  overflow: "hidden",
};

// --- icons (our own simple shapes) ---------------------------------------------------------
const Hatchet: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" style={{ shapeRendering: "crispEdges" }}>
    <rect x="0" y="0" width="16" height="16" fill="#3b4a3a" />
    <polygon points="4,14 5,15 12,6 11,5" fill="#9a6232" />
    <polygon points="9,2 14,5 12,9 10,7 11,5" fill="#cfd4dc" />
    <polygon points="12,9 14,5 15,6 13,10" fill="#f4f6f8" />
  </svg>
);

const Tango: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" style={{ shapeRendering: "crispEdges" }}>
    <rect x="0" y="0" width="16" height="16" fill="#2e4a3a" />
    <path d="M3 13 C3 6 8 3 13 3 C13 8 10 13 3 13 Z" fill="#6ed45a" />
    <path d="M3 13 L11 5" stroke="#2f7a2a" strokeWidth="1" />
    <text x="12.3" y="15" fontSize="5" fill="#ffffff" fontFamily={fontFamily}>
      1
    </text>
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
      const r = Math.sqrt(hash(n + 50));
      const x = cx + Math.cos(a) * rx * r * 0.9;
      const y = cy + Math.sin(a) * ry * r * 0.9;
      const d = hash(n + 90) * Math.PI * 2;
      out.push({ x1: x, y1: y, x2: x + Math.cos(d) * 6, y2: y + Math.sin(d) * 6, h: hash(n + 130) * 360, p: hash(n + 170) * 6.28 });
    }
  });
  return out;
})();

const Artifact: React.FC<{ size: number; s: number; glow: number }> = ({ size, s, glow }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <rect width="100" height="100" fill="#15182a" />
    <circle cx="50" cy="52" r={40 + 4 * glow} fill={`rgba(170,120,255,${0.18 + 0.2 * glow})`} />
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
      background: "#15182a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily,
      fontSize: size * 0.55,
      color: `rgb(${200 + 55 * pulse}, ${200 + 40 * pulse}, ${230})`,
      textShadow: "4px 4px 0 #000",
    }}
  >
    ?
  </div>
);

const ItemIcon: React.FC<{ item: Item; size: number; s: number; glow?: number; pulse?: number }> = ({ item, size, s, glow = 0.4, pulse = 0 }) => {
  if (item === "hatchet") return <Hatchet size={size} />;
  if (item === "tango") return <Tango size={size} />;
  if (item === "artifact") return <Artifact size={size} s={s} glow={glow} />;
  if (item === "secret") return <Secret size={size} pulse={pulse} />;
  return null;
};

const Ability: React.FC<{ i: number; size: number; cd: number }> = ({ i, size, cd }) => {
  const bg = ["#2c6a7a", "#5a3a8a", "#7a2e2e", "#8a5a1a"][i];
  return (
    <div style={{ ...slotStyle, width: size, height: size, borderColor: i === 3 ? "#d8b04a" : "#6a7290" }}>
      <svg width={size - 6} height={size - 6} viewBox="0 0 20 20" style={{ shapeRendering: "crispEdges", display: "block" }}>
        <rect width="20" height="20" fill={bg} />
        {i === 0 && [4, 8, 12].map((y) => <path key={y} d={`M3 ${y + 2} Q10 ${y - 3} 17 ${y + 2}`} stroke="#c8f4ff" strokeWidth="1.6" fill="none" />)}
        {i === 1 && [3, 6, 9].map((r) => <circle key={r} cx="10" cy="10" r={r} stroke="#e6c8ff" strokeWidth="1.3" fill="none" />)}
        {i === 2 &&
          [0, 1, 2, 3, 4, 5, 6].map((k) => (
            <circle key={k} cx={k === 6 ? 10 : 10 + Math.cos(k * 1.047) * 5} cy={k === 6 ? 10 : 10 + Math.sin(k * 1.047) * 5} r="2" fill="#ff8a6a" />
          ))}
        {i === 3 && [0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => <rect key={k} x={3 + hash(k) * 13} y={3 + hash(k + 9) * 13} width="2" height="2" fill="#ffe27a" />)}
      </svg>
      {cd > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(10,12,20,0.6)",
            color: "#fff",
            fontFamily,
            fontSize: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {Math.ceil(cd)}
        </div>
      )}
    </div>
  );
};

const FlyPortrait: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: "block" }}>
    <rect width="40" height="40" fill="#6a8a7a" />
    <rect y="26" width="40" height="14" fill="#4f6a5e" />
    <ellipse cx="20" cy="30" rx="11" ry="9" fill="#8e9e96" />
    <ellipse cx="20" cy="19" rx="7" ry="7" fill="#9aaaa2" />
    <circle cx="12.5" cy="17" r="6" fill="#e84a34" />
    <circle cx="27.5" cy="17" r="6" fill="#e84a34" />
    <circle cx="11" cy="15" r="1.6" fill="#ffb8a8" />
    <circle cx="26" cy="15" r="1.6" fill="#ffb8a8" />
  </svg>
);

// --- minimap --------------------------------------------------------------------------------
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
  return (
    <svg width={size} height={size} viewBox={`0 0 ${2 * H} ${2 * H}`} style={{ display: "block", shapeRendering: "crispEdges" }}>
      <polygon points={`${pt(-H, -H)} ${pt(-H, H)} ${pt(H, H)}`} fill="#4f8a3a" />
      <polygon points={`${pt(-H, -H)} ${pt(H, H)} ${pt(H, -H)}`} fill="#5c3e46" />
      <line x1="0" y1="0" x2={2 * H} y2={2 * H} stroke="#4f9fd0" strokeWidth={RIVER_W * 0.9} />
      {Object.values(LANE_PATHS).map((p, i) => (
        <polyline key={i} points={lanePts(p)} fill="none" stroke="#d2c090" strokeWidth={1.6} />
      ))}
      <rect x={1} y={2 * H - 11} width={10} height={10} fill="#bfe8c0" />
      <rect x={2 * H - 11} y={1} width={10} height={10} fill="#c85a4a" />
      <circle cx={PIT[0] + H} cy={PIT[1] + H} r={1.8} fill="#a898c0" />
      {TOWERS.map((t, i) => (
        <rect key={i} x={t.p[0] + H - 0.9} y={t.p[1] + H - 0.9} width={1.8} height={1.8} fill={t.side === "rad" ? "#8aff9a" : "#ff6a5a"} />
      ))}
      {WAVES[id].flatMap((w, wi) =>
        Array.from({ length: CREEPS_PER_WAVE }).map((_, j) => {
          const c = creepPose(w, j, s);
          return <rect key={`${wi}-${j}`} x={c.x + H - 0.5} y={c.z + H - 0.5} width={1} height={1} fill={w.side === "rad" ? "#b8ff90" : "#ff9080"} />;
        }),
      )}
      {id !== "pit" && <circle cx={hero.x + H} cy={hero.z + H} r={1.6} fill={FLY_COLOR} stroke="#ffffff" strokeWidth={0.6} />}
      <polygon
        points={`${pt(cl(target[0] - nw), near)} ${pt(cl(target[0] + nw), near)} ${pt(cl(target[0] + fw), far)} ${pt(cl(target[0] - fw), far)}`}
        fill="none"
        stroke="#ffffff"
        strokeWidth={0.45}
      />
    </svg>
  );
};

// --- the in-game HUD ----------------------------------------------------------------------------
export const DotaHud: React.FC<{ id: DotaScene }> = ({ id }) => {
  const frame = useCurrentFrame();
  const s = frame / FPS;
  const st = hudState(id, s);
  const clockStr = formatClock(st.clock);
  const hit40 = id === "clock40" && st.clock >= 40 * 60;
  const pop40 = hit40 ? interpolate(st.clock - 40 * 60, [0, 0.15, 0.6], [1, 1.35, 1.15], clamp) : 1;
  const lvlPop = id === "levelUp" ? interpolate(s, [0.9, 1.05, 1.5], [1, 1.7, 1.15], clamp) : 1;
  const sos = st.level === "SOS";
  const attacking = id === "camp" || id === "golem";
  return (
    <AbsoluteFill style={{ fontFamily, color: "#f1f1f7" }}>
      {/* top bar: 5 v 5 and the game clock */}
      <div style={{ position: "absolute", top: 184, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "flex-start", gap: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {HERO_COLORS.map((c, i) => (
            <div key={i} style={{ width: 56, height: 46, background: c, border: "3px solid #1c2030", borderBottom: "6px solid #52d66a", boxSizing: "border-box" }} />
          ))}
        </div>
        <div style={{ ...panel, position: "relative", width: 176, height: 78, marginTop: -6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              fontSize: 28,
              color: hit40 ? "#ffe27a" : "#f1f1f7",
              transform: `scale(${pop40})`,
              textShadow: hit40 ? "0 0 12px #ffcc33, 3px 3px 0 #000" : "3px 3px 0 #000",
            }}
          >
            {clockStr}
          </div>
          <div style={{ display: "flex", gap: 38, fontSize: 16, marginTop: 8 }}>
            <span style={{ color: "#8aff9a" }}>{st.score[0]}</span>
            <span style={{ color: "#ff8a7a" }}>{st.score[1]}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {DIRE_COLORS.map((c, i) => (
            <div key={i} style={{ width: 56, height: 46, background: c, border: "3px solid #1c2030", borderBottom: "6px solid #e2483a", boxSizing: "border-box" }} />
          ))}
        </div>
      </div>

      {/* minimap */}
      <div style={{ ...panel, left: 36, top: 990, width: 212, height: 212, padding: 0, overflow: "hidden" }}>
        <Minimap id={id} s={s} size={204} />
      </div>

      {/* hero bar */}
      <div style={{ ...panel, left: 262, top: 1020, width: 668, height: 182 }}>
        <div style={{ position: "absolute", left: 10, top: 14, width: 138, height: 138, borderRadius: "50%", overflow: "hidden", border: "4px solid #d8b04a", boxSizing: "border-box" }}>
          <FlyPortrait size={130} />
        </div>
        <div
          style={{
            position: "absolute",
            left: sos ? 86 : 108,
            top: 118,
            minWidth: sos ? 86 : 44,
            height: 44,
            padding: "0 6px",
            boxSizing: "border-box",
            borderRadius: 22,
            background: sos ? "#b8860b" : "#2a3048",
            border: `3px solid ${sos ? "#ffe27a" : "#9aa0b8"}`,
            fontSize: sos ? 20 : 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${lvlPop})`,
            boxShadow: sos ? "0 0 16px #ffcc33" : "none",
          }}
        >
          {st.level}
        </div>
        <div style={{ position: "absolute", left: 164, top: 14, display: "flex", gap: 8 }}>
          {[0, 1, 2, 3].map((i) => (
            <Ability key={i} i={i} size={72} cd={attacking && i === 1 ? 6 - ((s * 1.2) % 6) : 0} />
          ))}
        </div>
        <div style={{ position: "absolute", left: 164, top: 100, width: 312, height: 20, background: "#1c2030", border: "2px solid #6a7290" }}>
          <div style={{ width: "86%", height: "100%", background: "linear-gradient(180deg,#7af06a,#3aa83a)" }} />
        </div>
        <div style={{ position: "absolute", left: 164, top: 128, width: 312, height: 16, background: "#1c2030", border: "2px solid #6a7290" }}>
          <div style={{ width: "64%", height: "100%", background: "linear-gradient(180deg,#6aa8ff,#2a5ad0)" }} />
        </div>
        <div style={{ position: "absolute", left: 488, top: 12, display: "grid", gridTemplateColumns: "repeat(3, 52px)", gap: 6 }}>
          {st.items.map((it, i) => (
            <div key={i} style={{ ...slotStyle, width: 52, height: 52, boxSizing: "border-box", borderWidth: 2 }}>
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

// --- hero pick screen -----------------------------------------------------------------------
const GROUPS = [
  { color: "#c85a48", shape: "diamond" },
  { color: "#5aa850", shape: "circle" },
  { color: "#4a7ad0", shape: "square" },
] as const;

export const PickScreen: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames;
  const fillAt = 0.84;
  const filled = t >= fillAt;
  const remaining = Math.max(0, Math.ceil(interpolate(t, [0, fillAt], [7, 0], clamp)));
  const flash = interpolate(t, [fillAt, fillAt + 0.08], [1, 0], clamp);
  const TW = 112;
  const TH = 64;
  const GAP = 8;
  const COLS = 6;
  const gridLeft = (1080 - (COLS * TW + (COLS - 1) * GAP)) / 2 - 40;
  // the cursor drifts over taken heroes, finding nothing
  const way: [number, number][] = [
    [700, 1180],
    [300, 420],
    [620, 520],
    [420, 700],
    [760, 770],
    [260, 960],
    [560, 1010],
    [360, 270],
  ];
  const seg = interpolate(t, [0, fillAt], [0, way.length - 1.001], clamp);
  const i0 = Math.floor(seg);
  const f = ease(seg - i0);
  const cx = way[i0][0] + (way[i0 + 1][0] - way[i0][0]) * f;
  const cy = way[i0][1] + (way[i0 + 1][1] - way[i0][1]) * f;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #313a56 0%, #262c42 60%, #2b2438 100%)", fontFamily, color: "#f1f1f7" }}>
      {/* 5 v 5 slots */}
      <div style={{ position: "absolute", top: 196, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 12, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {HERO_COLORS.map((c, i) => {
            const empty = i === 4 && !filled;
            return (
              <div
                key={i}
                style={{
                  width: 60,
                  height: 76,
                  boxSizing: "border-box",
                  background: empty ? "#1e2334" : c,
                  border: empty ? `4px dashed rgba(255,255,255,${0.35 + 0.35 * Math.abs(Math.sin(frame / 12))})` : "3px solid #1c2030",
                  borderBottom: empty ? undefined : "7px solid #52d66a",
                  boxShadow: i === 4 && filled ? `0 0 ${30 * flash + 6}px rgba(255,240,160,${0.4 + 0.6 * flash})` : "none",
                }}
              />
            );
          })}
        </div>
        <div style={{ ...panel, position: "relative", width: 150, height: 92, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 40, color: remaining <= 3 ? "#ff7a5a" : "#f1f1f7", textShadow: "3px 3px 0 #000" }}>0:{String(remaining).padStart(2, "0")}</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {DIRE_COLORS.map((c, i) => (
            <div key={i} style={{ width: 60, height: 76, boxSizing: "border-box", background: c, border: "3px solid #1c2030", borderBottom: "7px solid #e2483a" }} />
          ))}
        </div>
      </div>
      {/* hero grid: three attribute groups, every tile already taken */}
      {GROUPS.map((g, gi) => (
        <div key={gi} style={{ position: "absolute", left: gridLeft, top: 350 + gi * 250 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                background: g.color,
                borderRadius: g.shape === "circle" ? "50%" : 3,
                transform: g.shape === "diamond" ? "rotate(45deg) scale(0.85)" : "none",
                border: "3px solid #1c2030",
              }}
            />
            <div style={{ height: 6, width: COLS * TW + (COLS - 1) * GAP - 40, background: g.color, opacity: 0.8 }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, ${TW}px)`, gap: GAP }}>
            {Array.from({ length: COLS * 3 }).map((_, k) => {
              const n = gi * 100 + k;
              return (
                <div
                  key={k}
                  style={{
                    width: TW,
                    height: TH,
                    boxSizing: "border-box",
                    background: `linear-gradient(160deg, ${g.color} 0%, ${g.color} ${40 + hash(n) * 40}%, #2a2e40 100%)`,
                    border: "3px solid #1c2030",
                    filter: "grayscale(0.55) brightness(0.6)",
                  }}
                />
              );
            })}
          </div>
        </div>
      ))}
      {/* the empty pick area, a greyed-out confirm button */}
      <div style={{ ...panel, left: gridLeft + 150, top: 1116, width: 480, height: 104, filter: filled ? "none" : "grayscale(1) brightness(0.7)" }}>
        <div style={{ position: "absolute", inset: 18, background: filled ? "#3f8a3a" : "#3a4058", border: "3px solid #1c2030" }} />
      </div>
      {/* pixel cursor */}
      <svg width={66} height={96} viewBox="0 0 11 16" style={{ position: "absolute", left: cx, top: cy, shapeRendering: "crispEdges" }}>
        <path d="M0 0 L0 13 L3 10 L5 15 L7 14 L5 9 L9 9 Z" fill="#ffffff" stroke="#10121c" strokeWidth="1" />
      </svg>
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
  const items: Item[] = ["artifact", "hatchet", "secret", null, null, null];
  const focus = t < 0.36 ? 0 : t < 0.62 ? 1 : 2; // artifact, gold, secret
  const gold = Math.round(interpolate(t, [0.36, 0.5], [19940, 20000], clamp));
  const SZ = 196;
  return (
    <AbsoluteFill style={{ fontFamily, color: "#f1f1f7" }}>
      <AbsoluteFill style={{ background: "rgba(14,18,30,0.62)" }} />
      <div
        style={{
          ...panel,
          left: 540 - 340,
          top: 380,
          width: 680,
          height: 640,
          transform: `scale(${0.6 + 0.4 * zoom})`,
          opacity: zoom,
          transformOrigin: "50% 60%",
        }}
      >
        <div style={{ position: "absolute", left: 30, top: 30, display: "grid", gridTemplateColumns: `repeat(3, ${SZ}px)`, gap: 16 }}>
          {items.map((it, i) => {
            const lit = (focus === 0 && i === 0) || (focus === 2 && i === 2);
            return (
              <div
                key={i}
                style={{
                  ...slotStyle,
                  width: SZ,
                  height: SZ,
                  boxSizing: "border-box",
                  borderWidth: 5,
                  borderColor: lit ? "#ffe27a" : "#6a7290",
                  boxShadow: lit ? "0 0 30px #b890ff, inset 0 0 0 2px #151a28" : slotStyle.boxShadow,
                }}
              >
                <ItemIcon item={it} size={SZ - 10} s={s} glow={focus === 0 ? 1 : 0.4} pulse={focus === 2 ? 0.5 + 0.5 * Math.sin(s * 5) : 0} />
              </div>
            );
          })}
        </div>
        <div
          style={{
            position: "absolute",
            left: 30,
            right: 30,
            top: 470,
            height: 130,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 26,
            fontSize: 62,
            color: "#ffd84a",
            textShadow: focus === 1 ? "0 0 18px #ffb800, 4px 4px 0 #000" : "4px 4px 0 #000",
            background: "#232a3c",
            border: `4px solid ${focus === 1 ? "#ffe27a" : "#6a7290"}`,
          }}
        >
          <div style={{ width: 58, height: 58, borderRadius: "50%", background: "#e8b830", border: "5px solid #8a6010" }} />
          {formatGold(gold)}
        </div>
      </div>
    </AbsoluteFill>
  );
};
