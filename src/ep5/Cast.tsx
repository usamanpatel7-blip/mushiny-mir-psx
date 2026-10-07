import { useEffect, useMemo, useState } from "react";
import { useThree } from "@react-three/fiber";
import { continueRender, delayRender } from "remotion";
import * as THREE from "three";
import { pixelTexture, snapVertices } from "../ps1kit";

// a finer vertex snap than ep4's beach: the things on the shore are mostly seen up close
export const lam = (p: THREE.MeshLambertMaterialParameters) => snapVertices(new THREE.MeshLambertMaterial({ flatShading: true, ...p }), 2);
export const flat = (p: THREE.MeshBasicMaterialParameters) => snapVertices(new THREE.MeshBasicMaterial(p), 2);

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ease = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};
export const hash = (i: number) => {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
// PS1 animation: hold every value for a few frames
export const steps = (v: number, n: number) => Math.floor(v * n) / n;

// --- textures -------------------------------------------------------------------------------------------------
// the winged mark of «Свежий Поток»: a stem with an arrow head and three feathers on each side
export const emblemTexture = (gold = "#d8a83a", bg: string | null = null) =>
  pixelTexture(32, 24, (ctx) => {
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 32, 24);
    }
    ctx.fillStyle = gold;
    // stem with a spike at the bottom and a small crest on top
    ctx.fillRect(15, 3, 2, 16);
    for (let i = 0; i < 3; i++) ctx.fillRect(14 + i, 19 + i, 4 - 2 * i, 1);
    ctx.fillRect(14, 2, 4, 2);
    // three feathers on each wing, rising outwards
    for (let f = 0; f < 3; f++) {
      const len = 13 - f * 3;
      for (let x = 0; x < len; x++) {
        const y = 13 + f * 3 - Math.floor(x * (0.75 - f * 0.12));
        ctx.fillRect(14 - x, y, 1, 2);
        ctx.fillRect(17 + x, y, 1, 2);
      }
    }
  });

// in-world lettering is drawn with the subtitle font; the canvas waits until its Cyrillic subset is in
const FONT = '"Press Start 2P"';
export const useFontReady = () => {
  const [handle] = useState(() => delayRender("ep5 canvas font"));
  const [ready, setReady] = useState(false);
  const { advance } = useThree();
  useEffect(() => {
    // the face may not be registered yet when this runs: then load() resolves with nothing, so try again
    let tries = 0;
    const attempt = () =>
      Promise.all([document.fonts.load(`8px ${FONT}`, "АЖЮЯжюя№«»"), document.fonts.load(`8px ${FONT}`, "AZaz09")]).then(([cyr, lat]) => {
        if ((cyr.length && lat.length) || tries++ > 100) setReady(true);
        else setTimeout(attempt, 50);
      });
    attempt();
  }, []);
  useEffect(() => {
    if (!ready) return;
    advance(performance.now());
    continueRender(handle);
  }, [ready, advance, handle]);
  return ready;
};

export type TextRow = { text: string; size: number; color: string; y: number; x?: number };
export const lettering = (w: number, h: number, bg: string, rows: TextRow[], draw?: (ctx: CanvasRenderingContext2D) => void) =>
  pixelTexture(w, h, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    draw?.(ctx);
    ctx.textBaseline = "top";
    for (const r of rows) {
      ctx.font = `${r.size}px ${FONT}`;
      ctx.fillStyle = r.color;
      const x = r.x ?? Math.round((w - ctx.measureText(r.text).width) / 2);
      ctx.fillText(r.text, x, r.y);
    }
  });

// --- materials ------------------------------------------------------------------------------------------------
const RAINBOW = ["#8a78c0", "#4e9a96", "#3a5aa6", "#6aa07a", "#a888c8", "#2e3c78", "#7ab0b0", "#5a4a90"];
// compound eyes: every facet its own colour, like the reference
const eyeGeometry = () => {
  const g = new THREE.IcosahedronGeometry(1, 1).toNonIndexed();
  const n = g.attributes.position.count;
  const colors: number[] = [];
  for (let f = 0; f < n / 3; f++) {
    const c = new THREE.Color(RAINBOW[Math.floor(hash(f * 3.7) * RAINBOW.length)]);
    for (let v = 0; v < 3; v++) colors.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return g;
};

export const useCastMats = () =>
  useMemo(
    () => ({
      teeth: lam({ color: "#f4f0e4", emissive: "#2a2a24" }),
      mouth: flat({ color: "#2a0c0c", side: THREE.DoubleSide }),
      eye: lam({ vertexColors: true, emissive: "#141428" }),
      antenna: lam({ color: "#2e2824" }),
    }),
    [],
  );
export type CastMats = ReturnType<typeof useCastMats>;

const EYE_GEO = eyeGeometry();
export const useEyeGeo = () => EYE_GEO;

