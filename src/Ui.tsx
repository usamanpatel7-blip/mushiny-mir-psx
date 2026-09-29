import { loadFont } from "@remotion/fonts";
import React from "react";
import { interpolate, staticFile, useCurrentFrame } from "remotion";
import { FPS, HORROR, LIGHTS_OUT_START, beats, beatStartSec } from "./script";

// Self-hosted: the render sandbox can't verify fonts.gstatic.com's certificate.
// Pixelify Sans only supplies the ₽ glyph that Press Start 2P lacks.
export const fontFamily = '"Press Start 2P", "Pixelify Sans", monospace';
const FONT_FILES = [
  { family: "Press Start 2P", file: "pstart-lat.woff2", range: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2212, U+FEFF, U+FFFD" },
  { family: "Press Start 2P", file: "pstart-latext.woff2", range: "U+0100-02BA, U+20A0-20AB, U+2113" },
  { family: "Press Start 2P", file: "pstart-cyr.woff2", range: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116" },
  { family: "Pixelify Sans", file: "pixelify-latext.woff2", range: "U+20BD" },
];
for (const { family, file, range } of FONT_FILES) {
  loadFont({ family, url: staticFile(`fonts/${file}`), weight: "400", unicodeRange: range });
}

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const windowStyle: React.CSSProperties = {
  position: "absolute",
  background: "linear-gradient(180deg, rgba(40,52,150,0.93) 0%, rgba(10,14,58,0.93) 100%)",
  border: "4px solid #d9dcef",
  boxShadow: "0 0 0 4px #10122a, inset 0 0 0 3px rgba(0,0,0,0.35)",
  borderRadius: 10,
  fontFamily,
  color: "#f1f1f7",
  imageRendering: "pixelated",
};

// Box-less subtitles: pixel text with a hard 1-texel black outline and a soft drop shadow.
const O = 4;
export const subtitleStyle: React.CSSProperties = {
  position: "absolute",
  left: 50,
  right: 150,
  bottom: 400,
  fontFamily,
  color: "#fdfbf2",
  textAlign: "center",
  textShadow: [
    `${O}px 0 0 #000`, `-${O}px 0 0 #000`, `0 ${O}px 0 #000`, `0 -${O}px 0 #000`,
    `${O}px ${O}px 0 #000`, `-${O}px ${O}px 0 #000`, `${O}px -${O}px 0 #000`, `-${O}px -${O}px 0 #000`,
    "0 10px 18px rgba(0,0,0,0.6)",
  ].join(", "),
};

// --- pixel icons (1 char = 1 texel) ---------------------------------------
const ICONS: Record<string, { rows: string[]; palette: Record<string, string> }> = {
  brick: {
    rows: ["............", "rrrrrrRrrrrr", "rRRRRRRrRRRR", "rrrrrrrrrrrr", "rrrRrrrrrrRr", "RRRRrRRRRRrR", "rrrrrrrrrrrr", "............"],
    palette: { r: "#b24a32", R: "#6e2a1b" },
  },
  pigeon: {
    rows: ["............", ".......hh...", "......hwhb..", ".....hhhh...", "..gggggggg..", ".ggGGGGggg..", "gggGGGGgg...", "..gggggg....", "....y..y....", "...yy.yy...."],
    palette: { h: "#5e6b72", w: "#e05a1c", b: "#c98f3a", g: "#9a9ca0", G: "#6c6e72", y: "#c98f3a" },
  },
  fly: {
    rows: ["...kk..kk...", "..kWWkkWWk..", "..kWkkkkWk..", "...kkkkkk...", ".gg.kkkk.gg.", "gggrrrrrrggg", ".g.rYYYYr.g.", "...rkkkkr...", "...kkkkkk...", "....k..k....", "...k....k..."],
    palette: { k: "#1c1c22", W: "#e8e4d8", g: "#9aa0a8", r: "#6e3a2c", Y: "#d8b233" },
  },
  bag: {
    rows: ["...kkkk...", "..kssssk..", ".kssssssk.", ".kssssssk.", ".rrrrrrrr.", ".rWWWWWWr.", ".rrrrrrrr.", ".ksdssdsk.", ".kssssssk.", ".ksdsssdk.", ".kssssssk.", "..kkkkkk.."],
    palette: { k: "#3a2c14", s: "#ddd1ad", d: "#7a5a30", r: "#b8332a", W: "#f3ead0" },
  },
};

export const PixelIcon: React.FC<{ name: keyof typeof ICONS; px: number; style?: React.CSSProperties }> = ({ name, px, style }) => {
  const { rows, palette } = ICONS[name];
  return (
    <svg width={rows[0].length * px} height={rows.length * px} style={{ shapeRendering: "crispEdges", ...style }}>
      {rows.flatMap((row, y) =>
        row.split("").map((c, x) => (palette[c] ? <rect key={`${x}-${y}`} x={x * px} y={y * px} width={px} height={px} fill={palette[c]} /> : null)),
      )}
    </svg>
  );
};

// --- state of the world at time t (seconds) ----------------------------------
const DAYS = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];
const daySoldAt: Record<string, number> = { ВТ: 6.25, СР: 12.55, ПН: 14.75, ЧТ: 14.95, ПТ: 15.15, СБ: 15.35, ВС: 15.55 };

const rollInt = (t: number, t0: number, t1: number, from: number, to: number) =>
  Math.round(interpolate(t, [t0, t1], [from, to], clamp));

const assetsAt = (t: number) => {
  if (t < 8.3) return 0;
  if (t < 17.6) return rollInt(t, 8.3, 8.9, 0, 400);
  return rollInt(t, 17.6, 18.3, 400, 0);
};

type Slot = { icon: keyof typeof ICONS; count: number; note: string | null; noteColor: string } | null;

const slotsAt = (t: number): Slot[] => {
  const bricks: Slot = t >= 20.3 ? { icon: "brick", count: rollInt(t, 20.3, 20.9, 0, 42), note: null, noteColor: "" } : null;
  let pigeons: Slot = null;
  if (t >= 26.1 && t < 27.95) pigeons = { icon: "pigeon", count: rollInt(t, 26.1, 26.5, 0, 12), note: null, noteColor: "" };
  if (t >= 27.95) pigeons = { icon: "pigeon", count: 0, note: t >= 30.9 ? "КОРРЕКЦИЯ" : null, noteColor: "#8fd18f" };
  let grain: Slot = null;
  if (t >= 35.0) {
    let count = 1;
    let note: string | null = "2024";
    let noteColor = "#e8d27a";
    if (t >= 39.9) count = rollInt(t, 39.9, 40.6, 1, 300);
    if (t >= 42.55) {
      count = rollInt(t, 42.55, 42.9, 300, 147);
      note = "−153";
      noteColor = "#ff6b5a";
    }
    grain = { icon: "bag", count, note, noteColor };
  }
  return [bricks, pigeons, grain];
};

// ------------------------------------------------------------------------------
const AssetsWindow: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  const zeroGone = t >= 49.25;
  const value = assetsAt(t);
  const cursorOn = Math.floor(frame / 9) % 2 === 0;
  return (
    <div style={{ ...windowStyle, left: 40, top: 170, width: 600, padding: "22px 26px 22px" }}>
      <div style={{ fontSize: 24, color: "#c8cbe6" }}>КРИПТАН · LV 1</div>
      <div style={{ fontSize: 40, marginTop: 16, whiteSpace: "pre" }}>
        АКТИВЫ:{" "}
        {zeroGone ? (
          <span>
            <span style={{ opacity: cursorOn ? 1 : 0 }}>▮</span> ₽
          </span>
        ) : (
          <span style={{ color: value > 0 ? "#fff3a6" : "#f1f1f7" }}>{value} ₽</span>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14, minHeight: 46 }}>
        {DAYS.filter((d) => t < daySoldAt[d]).map((d) => {
          const blink = t > daySoldAt[d] - 0.25 && Math.floor(frame / 2) % 2 === 0;
          return (
            <div
              key={d}
              style={{
                width: 62,
                height: 46,
                border: "3px solid #d9dcef",
                borderRadius: 4,
                fontSize: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: blink ? "#d9dcef" : "rgba(0,0,0,0.25)",
                color: blink ? "#10122a" : "#f1f1f7",
              }}
            >
              {d}
            </div>
          );
        })}
        {t >= 15.55 && <div style={{ fontSize: 24, color: "#8a8fb8", alignSelf: "center" }}>НЕДЕЛЯ: —</div>}
      </div>
    </div>
  );
};

const PIGEON_FLY_START = 27.95;

const Inventory: React.FC<{ t: number }> = ({ t }) => {
  if (t < 16.43 || t >= 44.62) return null;
  const slots = slotsAt(t);
  const flyT = t - PIGEON_FLY_START;
  return (
    <div style={{ ...windowStyle, right: 40, top: 170, width: 380, padding: "14px 18px 18px" }}>
      <div style={{ fontSize: 24, color: "#c8cbe6", marginBottom: 12 }}>ИНВЕНТАРЬ</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {slots.map((slot, i) => (
          <div
            key={i}
            style={{
              height: 92,
              border: "3px solid rgba(217,220,239,0.55)",
              borderRadius: 6,
              background: "rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              padding: "0 14px",
              gap: 16,
              position: "relative",
              overflow: "visible",
            }}
          >
            {slot && slot.count > 0 && <PixelIcon name={slot.icon} px={6} />}
            {slot && <div style={{ fontSize: 32 }}>×{slot.count}</div>}
            {slot?.note && <div style={{ fontSize: 16, color: slot.noteColor, marginLeft: "auto" }}>{slot.note}</div>}
            {i === 1 && flyT >= 0 && flyT < 1.6 &&
              [0, 1, 2, 3, 4].map((k) => {
                const s = Math.floor((flyT - k * 0.06) * 15) / 15;
                if (s < 0) return null;
                return (
                  <PixelIcon
                    key={k}
                    name="pigeon"
                    px={6}
                    style={{
                      position: "absolute",
                      left: 14 + k * 14,
                      top: 10,
                      transform: `translate(${s * (160 + k * 60)}px, ${-s * s * (900 + k * 120)}px) scaleX(${k % 2 ? -1 : 1})`,
                    }}
                  />
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
};

// Horror coda: one slot, one asset left.
const LastAsset: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  if (t < HORROR.inventoryFrom || t >= HORROR.hudOff) return null;
  const sold = t >= HORROR.flash[0];
  const pop = Math.floor(frame / 2) % 2 === 0 || t > HORROR.inventoryFrom + 0.2;
  if (!pop) return null;
  return (
    <div style={{ ...windowStyle, right: 40, top: 170, width: 380, padding: "14px 18px 18px" }}>
      <div style={{ fontSize: 24, color: "#c8cbe6", marginBottom: 12 }}>ИНВЕНТАРЬ</div>
      <div
        style={{
          height: 92,
          border: "3px solid rgba(217,220,239,0.55)",
          borderRadius: 6,
          background: "rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          gap: 16,
        }}
      >
        {!sold && <PixelIcon name="fly" px={6} />}
        <div style={{ fontSize: 32, color: sold ? "#ff5a4a" : "#f1f1f7" }}>×{sold ? 0 : 1}</div>
      </div>
    </div>
  );
};

const DialogBox: React.FC<{ t: number }> = ({ t }) => {
  let idx = 0;
  for (let i = 0; i < beats.length; i++) if (t >= beatStartSec[i]) idx = i;
  const { text, speech } = beats[idx];
  const p = interpolate(t, [speech[0] - 0.05, speech[1] - 0.15], [0, 1], clamp);
  const shown = text.slice(0, Math.round(p * text.length));
  // the held breath before the Kebab-Maker line: no box, just the empty pedestal
  if (idx === 12 && shown === "") return null;
  return (
    <div style={subtitleStyle}>
      <div style={{ fontSize: 36, lineHeight: 1.6 }}>{shown}</div>
    </div>
  );
};

export const Ui: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  if (t >= HORROR.hudOff) return null;
  // after the flash the HUD glitches: jitter, red channel, dropped frames
  const glitch = t >= HORROR.flash[0];
  const g = Math.sin(frame * 12.9898) * 43758.5453;
  const r = g - Math.floor(g);
  const glitchStyle: React.CSSProperties = glitch
    ? { transform: `translate(${(r - 0.5) * 40}px, ${(r * 7 - Math.floor(r * 7) - 0.5) * 24}px)`, filter: "sepia(1) saturate(6) hue-rotate(-40deg)", opacity: r > 0.3 ? 1 : 0 }
    : {};
  return (
    <>
      <div style={glitchStyle}>
        <AssetsWindow t={t} frame={frame} />
        <LastAsset t={t} frame={frame} />
      </div>
      <Inventory t={t} />
      {t < LIGHTS_OUT_START + 1.2 && <DialogBox t={t} />}
    </>
  );
};
