import React, { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { CameraRig, Ps1Canvas, pixelTexture, type Cam } from "../ps1kit";
import { DAWN, EYES, Keeper, Lighthouse, Limb, Mask, Sand, Sea, Sky, surfaceZ, useMats, type Mats } from "../ep4/World";
import {
  PEOPLE,
  POSE,
  Person,
  Vozdukhan,
  clamp,
  ease,
  emblemTexture,
  flat,
  hash,
  lam,
  lettering,
  mixArm,
  steps,
  useCastMats,
  useEyeGeo,
  useFontReady,
  type CastMats,
} from "./Cast";
import type { VozScene } from "./script";

// a camera move over `dur` seconds of the shot; most shots creep, a few hold still
type Move = { from: Cam; to?: Cam; dur?: number };
const CAMS: Record<VozScene, Move> = {
  officeWide: { from: { pos: [0.15, 1.3, 2.9], look: [0, 1.05, -0.6] }, to: { pos: [0.05, 1.22, 2.25], look: [0, 1.1, -0.6] }, dur: 4 },
  faceClose: { from: { pos: [0.32, 1.56, 0.8], look: [0, 1.5, -0.1] }, to: { pos: [0.26, 1.53, 0.68], look: [0, 1.5, -0.1] }, dur: 2 },
  wallPat: { from: { pos: [0.25, 1.55, 1.55], look: [-0.3, 1.45, -0.1] }, to: { pos: [0.18, 1.52, 1.3], look: [-0.32, 1.45, -0.1] }, dur: 2.6 },
  flipchart: { from: { pos: [0.1, 1.45, 1.6], look: [-0.2, 1.4, -2.7] }, to: { pos: [0.05, 1.42, 1.2], look: [-0.2, 1.4, -2.7] }, dur: 2.2 },
  seminar: { from: { pos: [1.4, 2.25, 3.4], look: [-0.25, 1.0, -2] }, to: { pos: [1.2, 2.1, 2.9], look: [-0.25, 1.0, -2] }, dur: 3.8 },
  windowOut: { from: { pos: [2.6, 2.0, 13], look: [0, 6.6, 0] } },
  comfortZone: { from: { pos: [0.4, 3.4, 1.9], look: [-0.5, 0.2, -0.4] }, to: { pos: [0.3, 3.2, 1.6], look: [-0.6, 0.2, -0.5] }, dur: 1.7 },
  valve: { from: { pos: [0.42, 1.62, 1.05], look: [0.03, 1.5, 0.15] }, to: { pos: [0.36, 1.6, 0.9], look: [0.03, 1.5, 0.15] }, dur: 1.4 },
  module3: { from: { pos: [0.1, 1.45, 1.3], look: [-0.2, 1.42, -2.7] } },
  noWall: { from: { pos: [2.6, 6.2, 9], look: [0, 7.4, 0] }, to: { pos: [3.6, 5.6, 15], look: [0, 7.6, 0] }, dur: 4.2 },
  busInside: { from: { pos: [0, 1.75, 3.25], look: [0, 1.35, -2] }, to: { pos: [0, 1.7, 2.8], look: [0, 1.38, -2] }, dur: 3.5 },
  busOut: { from: { pos: [4.2, 1.3, 7.2], look: [-0.3, 1.5, 0] } },
  stamp: { from: { pos: [0.05, 1.45, 0.35], look: [0, 0, -0.02] }, to: { pos: [0.04, 1.3, 0.3], look: [0, 0, -0.02] }, dur: 3.3 },
  shrug: { from: { pos: [0.35, 0.95, 2.3], look: [0, 1.5, 0] }, to: { pos: [0.3, 1.0, 2.0], look: [0, 1.52, 0] }, dur: 3.4 },
  ceilingOff: { from: { pos: [0, 10.2, 8.5], look: [0, 10.9, 0] } },
  neighbors: { from: { pos: [0, 9.9, 1.0], look: [0, 12.7, -1.6] } },
  neighborsUp: { from: { pos: [0, 10.5, 15], look: [0, 13.5, 0] }, to: { pos: [0, 11, 15], look: [0, 18, 0] }, dur: 4 },
  tide: { from: { pos: [0, 0.9, 1.25], look: [0, 0, -0.8] } },
  faceTop: { from: { pos: [0, 1.3, 0.001], look: [0, 0, 0] }, to: { pos: [0, 1.05, 0.001], look: [0, 0, 0] }, dur: 1.9 },
  faceOpen: { from: { pos: [0, 1.0, 0.001], look: [0, 0, 0] }, to: { pos: [0, 0.92, 0.001], look: [0, 0, 0] }, dur: 2.2 },
  keeperLow: { from: { pos: [0, 0.12, 0.25], look: [0, 1.6, -0.9] }, to: { pos: [0, 0.12, 0.15], look: [0, 1.6, -0.9] }, dur: 1.6 },
  faceTalk: { from: { pos: [0.35, 0.45, 0.55], look: [0, 0.03, -0.05] } },
  keeperCeil: { from: { pos: [0, 0.12, 0.15], look: [0, 1.8, -0.8] }, to: { pos: [0, 0.12, 0.1], look: [0, 2.2, -0.7] }, dur: 2.3 },
  keeperTurn: { from: { pos: [0.4, 1.5, 4.0], look: [-2.5, 2.6, -8] }, to: { pos: [0.3, 1.45, 3.6], look: [-2.6, 2.8, -8] }, dur: 3.4 },
  lighthouseWalls: { from: { pos: [-1.2, 2.2, -4.2], look: [-3.2, 6.6, -10] }, to: { pos: [-1.4, 2.4, -4.8], look: [-3.2, 6.9, -10] }, dur: 2.4 },
  crateEnd: { from: { pos: [0.5, 3.3, 2.3], look: [0, 0.35, 0] }, to: { pos: [0.9, 4.1, 3.3], look: [0, 0.35, 0] }, dur: 7 },
};

// --- textures -------------------------------------------------------------------------------------------------
// the yellow of his office (and of every room he teaches in): faded wallpaper with thin stripes
const wallpaper = (base = "#b89a50", line = "#a88a44") =>
  pixelTexture(32, 32, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = line;
    for (let x = 0; x < 32; x += 8) ctx.fillRect(x, 0, 1, 32);
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = hash(i) < 0.5 ? "#c4a65c" : "#a48644";
      ctx.fillRect(Math.floor(hash(i * 3 + 1) * 32), Math.floor(hash(i * 7 + 2) * 32), 1, 1);
    }
  });
const planks = () =>
  pixelTexture(32, 32, (ctx) => {
    ctx.fillStyle = "#6a4a32";
    ctx.fillRect(0, 0, 32, 32);
    for (let y = 0; y < 32; y += 4) {
      ctx.fillStyle = "#4e3624";
      ctx.fillRect(0, y, 32, 1);
      ctx.fillRect((y * 7) % 32, y, 1, 4);
    }
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = "#7a5a3e";
      ctx.fillRect(Math.floor(hash(i + 3) * 32), Math.floor(hash(i + 9) * 32), 2, 1);
    }
  });
const carpet = () =>
  pixelTexture(16, 16, (ctx) => {
    ctx.fillStyle = "#8a7e4a";
    ctx.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = hash(i * 2) < 0.5 ? "#7a6e40" : "#968a56";
      ctx.fillRect(Math.floor(hash(i * 5 + 1) * 16), Math.floor(hash(i * 9 + 2) * 16), 1, 1);
    }
  });
// ceiling tiles with a fluorescent panel in every other tile
const tiles = (light = true) =>
  pixelTexture(32, 32, (ctx) => {
    ctx.fillStyle = "#c8c09a";
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = "#8a845e";
    ctx.fillRect(0, 0, 32, 1);
    ctx.fillRect(0, 16, 32, 1);
    ctx.fillRect(0, 0, 1, 32);
    ctx.fillRect(16, 0, 1, 32);
    if (light) {
      ctx.fillStyle = "#fffbe8";
      ctx.fillRect(3, 5, 10, 6);
      ctx.fillRect(19, 21, 10, 6);
    }
  });
// a grey panel block: every panel one window, a few of them lit
const facade = () =>
  pixelTexture(32, 32, (ctx) => {
    ctx.fillStyle = "#8a8c90";
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = "#6e7074";
    ctx.fillRect(0, 31, 32, 1);
    ctx.fillRect(31, 0, 1, 32);
    ctx.fillStyle = "#2a3038";
    ctx.fillRect(9, 8, 14, 14);
    ctx.fillStyle = "#c8c8c0";
    ctx.fillRect(9, 14, 14, 1);
    ctx.fillRect(16, 8, 1, 14);
  });
// the landscape that runs past the bus windows: sky, the sea, the shoulder of the road
const passing = () =>
  pixelTexture(64, 32, (ctx) => {
    ctx.fillStyle = "#a8a8c0";
    ctx.fillRect(0, 0, 64, 18);
    ctx.fillStyle = "#4a5a80";
    ctx.fillRect(0, 18, 64, 6);
    ctx.fillStyle = "#6a6a5a";
    ctx.fillRect(0, 24, 64, 8);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = "#3a3a40";
      ctx.fillRect(i * 11 + 3, 8, 1, 16);
    }
    ctx.fillStyle = "#e8e8f0";
    ctx.fillRect(10, 4, 12, 2);
    ctx.fillRect(40, 7, 9, 2);
  });
const asphalt = () =>
  pixelTexture(32, 32, (ctx) => {
    ctx.fillStyle = "#4e4e52";
    ctx.fillRect(0, 0, 32, 32);
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = hash(i) < 0.5 ? "#5a5a5e" : "#424246";
      ctx.fillRect(Math.floor(hash(i * 3 + 7) * 32), Math.floor(hash(i * 11 + 5) * 32), 1, 1);
    }
    ctx.fillStyle = "#d8d4c0";
    ctx.fillRect(0, 15, 14, 2);
  });
const rep = (t: THREE.Texture, x: number, y: number) => {
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(x, y);
  return t;
};

const RED = "#b8282a";
const INK = "#2a2a3a";
const useSetMats = () =>
  useMemo(
    () => ({
      wall: lam({ map: rep(wallpaper(), 6, 3) }),
      wallSide: lam({ map: rep(wallpaper(), 4, 3) }),
      homeWall: lam({ map: rep(wallpaper("#6e8a6a", "#5e7a5a"), 4, 3) }),
      floor: lam({ map: rep(planks(), 6, 6) }),
      carpet: lam({ map: rep(carpet(), 10, 10) }),
      ceiling: lam({ map: rep(tiles(), 4, 4), emissive: "#2a2818" }),
      wood: lam({ color: "#6e4c30" }),
      woodDark: lam({ color: "#4a3220" }),
      frame: lam({ color: "#3a2c20" }),
      gilt: lam({ color: "#b89040" }),
      paper: lam({ color: "#e8e2d2" }),
      cash: lam({ color: "#c8b0a0" }),
      cashBand: lam({ color: "#c8a03a" }),
      bag: lam({ color: "#e6e2da" }),
      case: lam({ color: "#20223a" }),
      gold: lam({ color: "#c89c34" }),
      beige: lam({ color: "#c8c0aa" }),
      screen: flat({ color: "#1a2018" }),
      emblemCard: flat({ map: emblemTexture("#c8982e", "#ece6d6") }),
      emblemDark: flat({ map: emblemTexture("#c8982e", "#20223a") }),
      chair: lam({ color: "#3a3028" }),
      metal: lam({ color: "#8a8e94" }),
      dark: flat({ color: "#121214" }),
      glow: flat({ color: "#e8d890" }),
      glass: flat({ color: "#3a4a5a", transparent: true, opacity: 0.6 }),
      facade: lam({ map: rep(facade(), 6, 7) }),
      facadeTile: lam({ map: facade() }),
      concrete: lam({ color: "#7a7c80" }),
      ground: lam({ color: "#5e6a4a" }),
      road: lam({ map: rep(asphalt(), 12, 1) }),
      busBody: lam({ color: "#d8b048" }),
      busStripe: lam({ color: "#2e4e8a" }),
      busDark: lam({ color: "#2a2c30" }),
      seat: lam({ color: "#5a2a2a" }),
      tape: flat({ color: "#e8c020" }),
      curtain: lam({ color: "#c8a858", side: THREE.DoubleSide }),
      sofa: lam({ color: "#7a3a3a" }),
      cloud: flat({ color: "#e8e4ec" }),
      puff: flat({ color: "#eef4f8", transparent: true, opacity: 0.75, depthWrite: false }),
      dust: flat({ color: "#d8c8a0" }),
      crack: flat({ color: "#2a2018" }),
      exitGlow: flat({ color: "#48e070" }),
      slipper: lam({ color: "#8a3a6a" }),
    }),
    [],
  );
type SetMats = ReturnType<typeof useSetMats>;

// in-world lettering: made once the canvas font is in
const useSigns = () =>
  useMemo(() => {
    const sign = (t: THREE.Texture) => flat({ map: t });
    return {
      plaque: sign(lettering(64, 16, "#b89040", [{ text: "НЕСУЩАЯ", size: 8, color: "#2a1c08", y: 4 }])),
      chart1: sign(
        lettering(96, 128, "#f0ece0", [
          { text: "СВЕЖИЙ", size: 8, color: INK, y: 8 },
          { text: "ПОТОК", size: 8, color: INK, y: 20 },
        ], (ctx) => {
          // the diagram: a house, and an arrow straight through it
          ctx.fillStyle = INK;
          ctx.fillRect(28, 62, 40, 1);
          ctx.fillRect(28, 62, 1, 34);
          ctx.fillRect(67, 62, 1, 34);
          ctx.fillRect(28, 95, 40, 1);
          for (let i = 0; i < 20; i++) {
            ctx.fillRect(28 + i, 62 - Math.floor(i * 0.8), 1, 1);
            ctx.fillRect(67 - i, 62 - Math.floor(i * 0.8), 1, 1);
          }
          ctx.fillStyle = "#3a7ad0";
          ctx.fillRect(8, 78, 80, 2);
          for (let i = 0; i < 5; i++) ctx.fillRect(86 - i, 74 + i, 1, 10 - 2 * i);
          ctx.fillStyle = "#3a7ad0";
          ctx.fillRect(16, 72, 6, 1);
          ctx.fillRect(14, 86, 8, 1);
          const e = emblemTexture("#c8982e").image as HTMLCanvasElement;
          ctx.drawImage(e, 32, 32);
        }),
      ),
      chart3: sign(
        lettering(96, 128, "#f0ece0", [
          { text: "МОДУЛЬ 3", size: 8, color: RED, y: 10 },
          { text: "ЖИЗНЬ", size: 16, color: INK, y: 38 },
          { text: "БЕЗ", size: 16, color: INK, y: 60 },
          { text: "ОГРАНИ-", size: 8, color: INK, y: 86 },
          { text: "ЧЕНИЙ", size: 8, color: INK, y: 98 },
        ]),
      ),
      zone: flat({
        map: lettering(64, 16, "#8a7e4a", [{ text: "ЗОНА КОМФОРТА", size: 8, color: "#e8c020", y: 4, x: 2 }]),
        transparent: true,
      }),
      exit: sign(lettering(48, 16, "#0a3a18", [{ text: "ВЫХОД", size: 8, color: "#7aff98", y: 4 }])),
      act: sign(
        lettering(96, 128, "#ece6d4", [
          { text: "АКТ №3", size: 8, color: INK, y: 8 },
          { text: "осмотра", size: 8, color: "#6a6a7a", y: 20 },
          { text: "ТС: автобус", size: 8, color: INK, y: 36, x: 6 },
          { text: "выходов: 3", size: 8, color: INK, y: 48, x: 6 },
          { text: "", size: 8, color: INK, y: 0 },
        ], (ctx) => {
          // a little drawing of the bus with an extra hole in its side, circled
          ctx.fillStyle = INK;
          ctx.fillRect(14, 70, 64, 1);
          ctx.fillRect(14, 92, 64, 1);
          ctx.fillRect(14, 70, 1, 22);
          ctx.fillRect(77, 70, 1, 22);
          for (let x = 18; x < 74; x += 9) ctx.fillRect(x, 74, 6, 6);
          ctx.fillRect(22, 92, 6, 4);
          ctx.fillRect(62, 92, 6, 4);
          ctx.fillStyle = RED;
          for (let a = 0; a < 40; a++) {
            const t = (a / 40) * Math.PI * 2;
            ctx.fillRect(48 + Math.round(Math.cos(t) * 10), 82 + Math.round(Math.sin(t) * 9), 1, 1);
          }
          for (let y = 0; y < 12; y++) ctx.fillRect(84, 100 + y, 1, 1);
        }),
      ),
      stampInk: flat({
        map: lettering(96, 32, "#ece6d4", [
          { text: "ПОВРЕЖДЕНИЕ", size: 8, color: RED, y: 6 },
          { text: "КУЗОВА", size: 8, color: RED, y: 18 },
        ], (ctx) => {
          ctx.fillStyle = RED;
          ctx.fillRect(2, 2, 92, 1);
          ctx.fillRect(2, 29, 92, 1);
          ctx.fillRect(2, 2, 1, 28);
          ctx.fillRect(93, 2, 1, 28);
        }),
      }),
      bang: sign(lettering(16, 16, "#f0ece0", [{ text: "!", size: 8, color: RED, y: 4 }])),
    };
  }, []);
type Signs = ReturnType<typeof useSigns>;

// --- building blocks ----------------------------------------------------------------------------------------------
// a wall with a rectangular hole: four boxes around the opening
const HoleWall: React.FC<{ m: THREE.Material; w: number; h: number; hole: [number, number, number, number]; t?: number }> = ({ m, w, h, hole, t = 0.12 }) => {
  const [x0, x1, y0, y1] = hole;
  return (
    <group>
      <mesh material={m} position={[(-w / 2 + x0) / 2, h / 2, 0]}>
        <boxGeometry args={[x0 + w / 2, h, t]} />
      </mesh>
      <mesh material={m} position={[(w / 2 + x1) / 2, h / 2, 0]}>
        <boxGeometry args={[w / 2 - x1, h, t]} />
      </mesh>
      <mesh material={m} position={[(x0 + x1) / 2, y0 / 2, 0]}>
        <boxGeometry args={[x1 - x0, y0, t]} />
      </mesh>
      <mesh material={m} position={[(x0 + x1) / 2, (y1 + h) / 2, 0]}>
        <boxGeometry args={[x1 - x0, h - y1, t]} />
      </mesh>
    </group>
  );
};

const WindowFrame: React.FC<{ m: SetMats; w: number; h: number; glass?: boolean }> = ({ m, w, h, glass = true }) => (
  <group>
    {[
      [0, h / 2, w, 0.07],
      [0, -h / 2, w, 0.07],
    ].map(([x, y, a, b], i) => (
      <mesh key={`h${i}`} material={m.frame} position={[x, y, 0]}>
        <boxGeometry args={[a + 0.07, b, 0.08]} />
      </mesh>
    ))}
    {[-w / 2, 0, w / 2].map((x) => (
      <mesh key={`v${x}`} material={m.frame} position={[x, 0, 0]}>
        <boxGeometry args={[0.07, h, 0.08]} />
      </mesh>
    ))}
    {glass && (
      <mesh material={m.glass}>
        <planeGeometry args={[w, h]} />
      </mesh>
    )}
  </group>
);

// the sunset coast seen through his window: ep4's sea and its lighthouse
const Coast: React.FC<{ mats: Mats; s: number; y?: number }> = ({ mats, s, y = -1.6 }) => (
  <>
    <Sky look={DAWN} z={-46} y={20} />
    <group position={[0, y, 0]}>
      <Sea mats={mats} s={s} from={-45} to={-2.5} amp={0.07} />
      <mesh material={mats.sunDisc} position={[-1.5, 0.6, -44]}>
        <circleGeometry args={[1.6, 10]} />
      </mesh>
      <group position={[7, 0, -7]}>
        <Lighthouse mats={mats} on={1} s={s} />
      </group>
    </group>
  </>
);

const Desk: React.FC<{ m: SetMats }> = ({ m }) => (
  <group position={[0, 0, 0.55]}>
    <mesh material={m.wood} position={[0, 0.76, 0]}>
      <boxGeometry args={[2.3, 0.06, 0.85]} />
    </mesh>
    <mesh material={m.woodDark} position={[0, 0.38, 0.4]}>
      <boxGeometry args={[2.25, 0.74, 0.04]} />
    </mesh>
    {/* stacks of cash with gold bands */}
    {[0, 1, 2].map((i) => (
      <group key={i} position={[-0.85 + (i % 2) * 0.05, 0.83 + i * 0.09, 0.15]} rotation={[0, 0.1 * i, 0]}>
        <mesh material={m.cash}>
          <boxGeometry args={[0.34, 0.08, 0.18]} />
        </mesh>
        <mesh material={m.cashBand}>
          <boxGeometry args={[0.04, 0.085, 0.185]} />
        </mesh>
      </group>
    ))}
    {/* paper bags of the system */}
    {[
      [-0.48, 0.22, 0.95],
      [-0.3, 0.05, 0.7],
    ].map(([x, z, k], i) => (
      <group key={`bag${i}`} position={[x, 0.79, z]} scale={k}>
        <mesh material={m.bag} position={[0, 0.17, 0]} rotation={[0, Math.PI / 4, 0]}>
          <cylinderGeometry args={[0.08, 0.13, 0.34, 4]} />
        </mesh>
        <mesh material={m.emblemCard} position={[0, 0.17, 0.083]}>
          <planeGeometry args={[0.09, 0.07]} />
        </mesh>
      </group>
    ))}
    {/* the name card */}
    <group position={[0.05, 0.79, 0.28]}>
      <mesh material={m.paper} position={[0, 0.07, 0]} rotation={[-0.35, 0, 0]}>
        <boxGeometry args={[0.42, 0.16, 0.01]} />
      </mesh>
      <mesh material={m.emblemCard} position={[0, 0.07, 0.03]} rotation={[-0.35, 0, 0]}>
        <planeGeometry args={[0.12, 0.09]} />
      </mesh>
    </group>
    {/* the briefcase */}
    <group position={[0.8, 0.79, 0.05]} rotation={[0, -0.2, 0]}>
      <mesh material={m.case} position={[0, 0.16, 0]}>
        <boxGeometry args={[0.55, 0.32, 0.16]} />
      </mesh>
      <mesh material={m.case} position={[0, 0.36, 0]}>
        <boxGeometry args={[0.18, 0.05, 0.04]} />
      </mesh>
      <mesh material={m.emblemDark} position={[0, 0.19, 0.081]}>
        <planeGeometry args={[0.16, 0.12]} />
      </mesh>
      {[-0.18, 0.18].map((x) => (
        <mesh key={x} material={m.gold} position={[x, 0.07, 0.085]}>
          <boxGeometry args={[0.05, 0.04, 0.01]} />
        </mesh>
      ))}
    </group>
  </group>
);

const Office: React.FC<{ m: SetMats; mats: Mats; s: number }> = ({ m, mats, s }) => (
  <>
    <Coast mats={mats} s={s} />
    <mesh material={m.floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.5]}>
      <planeGeometry args={[7, 5]} />
    </mesh>
    <group position={[0, 0, -2]}>
      <HoleWall m={m.wall} w={7} h={3.2} hole={[-1.7, 1.7, 0.75, 2.7]} />
      {[-1.7, 0, 1.7].map((x) => (
        <mesh key={x} material={m.frame} position={[x, 1.72, 0.02]}>
          <boxGeometry args={[0.08, 1.95, 0.16]} />
        </mesh>
      ))}
      {[0.75, 2.7].map((y) => (
        <mesh key={y} material={m.frame} position={[0, y, 0.02]}>
          <boxGeometry args={[3.48, 0.08, 0.16]} />
        </mesh>
      ))}
    </group>
    {[-3.5, 3.5].map((x) => (
      <mesh key={x} material={m.wallSide} position={[x, 1.6, 0.5]} rotation={[0, -Math.sign(x) * Math.PI / 2, 0]}>
        <planeGeometry args={[5, 3.2]} />
      </mesh>
    ))}
    {/* a CRT on the side desk */}
    <group position={[-2.3, 0, -1.2]} rotation={[0, 0.5, 0]}>
      <mesh material={m.wood} position={[0, 0.72, 0]}>
        <boxGeometry args={[1.2, 0.05, 0.7]} />
      </mesh>
      <mesh material={m.beige} position={[0, 0.98, 0]}>
        <boxGeometry args={[0.45, 0.4, 0.42]} />
      </mesh>
      <mesh material={m.screen} position={[0, 1.0, 0.212]}>
        <planeGeometry args={[0.34, 0.27]} />
      </mesh>
    </group>
    <mesh material={m.chair} position={[0, 0.9, -0.62]}>
      <boxGeometry args={[0.6, 0.75, 0.08]} />
    </mesh>
    <Desk m={m} />
  </>
);

// the seminar room: yellow walls, carpet, fluorescent tiles; the flipchart at the front (z = -3), a window on the left
const SEM_W = 6;
const SEM_D = 7;
const SEM_H = 2.8;
const SEM_WINDOW: [number, number, number, number] = [-2.2, -0.6, 0.9, 2.3];
const Seminar: React.FC<{ m: SetMats; s: number; windowGone?: boolean; noFront?: boolean; outside?: React.ReactNode }> = ({ m, windowGone = false, noFront = false, outside }) => (
  <>
    <mesh material={m.carpet} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.5]}>
      <planeGeometry args={[SEM_W, SEM_D]} />
    </mesh>
    <mesh material={m.ceiling} rotation={[Math.PI / 2, 0, 0]} position={[0, SEM_H, 0.5]}>
      <planeGeometry args={[SEM_W, SEM_D]} />
    </mesh>
    <mesh material={m.wall} position={[0, SEM_H / 2, -3]}>
      <planeGeometry args={[SEM_W, SEM_H]} />
    </mesh>
    {!noFront && (
      <mesh material={m.wall} position={[0, SEM_H / 2, 4]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[SEM_W, SEM_H]} />
      </mesh>
    )}
    <mesh material={m.wallSide} position={[SEM_W / 2, SEM_H / 2, 0.5]} rotation={[0, -Math.PI / 2, 0]}>
      <planeGeometry args={[SEM_D, SEM_H]} />
    </mesh>
    {/* the left wall with the window */}
    <group position={[-SEM_W / 2, 0, 0.5]} rotation={[0, Math.PI / 2, 0]}>
      <HoleWall m={m.wallSide} w={SEM_D} h={SEM_H} hole={SEM_WINDOW} t={0.1} />
      {!windowGone && (
        <group position={[(SEM_WINDOW[0] + SEM_WINDOW[1]) / 2, (SEM_WINDOW[2] + SEM_WINDOW[3]) / 2, 0]}>
          <WindowFrame m={m} w={SEM_WINDOW[1] - SEM_WINDOW[0]} h={SEM_WINDOW[3] - SEM_WINDOW[2]} />
        </group>
      )}
    </group>
    {outside}
  </>
);

const Flipchart: React.FC<{ m: SetMats; page: THREE.Material; under?: THREE.Material; flip?: number; flutter?: number }> = ({ m, page, under, flip = 0, flutter = 0 }) => (
  <group position={[-0.5, 0, -2.6]}>
    {[-0.4, 0.4].map((x) => (
      <mesh key={x} material={m.metal} position={[x, 0.85, -0.12]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[0.04, 1.75, 0.04]} />
      </mesh>
    ))}
    <mesh material={m.metal} position={[0, 0.8, -0.35]} rotation={[-0.35, 0, 0]}>
      <boxGeometry args={[0.04, 1.6, 0.04]} />
    </mesh>
    <mesh material={m.woodDark} position={[0, 1.4, -0.03]}>
      <boxGeometry args={[0.95, 1.2, 0.03]} />
    </mesh>
    {under && (
      <mesh material={under} position={[0, 1.38, 0.0]}>
        <planeGeometry args={[0.84, 1.12]} />
      </mesh>
    )}
    {/* the top page hinges at its upper edge: it lifts and goes over, or shivers in the draught */}
    <group position={[0, 1.94, 0.012]} rotation={[-flip * 3.0 - flutter, 0, 0]}>
      <mesh material={page} position={[0, -0.56, 0]}>
        <planeGeometry args={[0.84, 1.12]} />
      </mesh>
    </group>
    <mesh material={m.metal} position={[0, 1.97, 0.0]}>
      <boxGeometry args={[0.95, 0.05, 0.06]} />
    </mesh>
  </group>
);

// an empty picture frame held up in two hands
const PicFrame: React.FC<{ m: SetMats; w: number; h: number }> = ({ m, w, h }) => (
  <group>
    {[
      [0, h / 2, w, 0.035],
      [0, -h / 2, w, 0.035],
      [-w / 2, 0, 0.035, h],
      [w / 2, 0, 0.035, h],
    ].map(([x, y, a, b], i) => (
      <mesh key={i} material={m.gilt} position={[x, y, 0]}>
        <boxGeometry args={[a, b, 0.03]} />
      </mesh>
    ))}
  </group>
);

const Chair: React.FC<{ m: SetMats }> = ({ m }) => (
  <group>
    <mesh material={m.chair} position={[0, 0.45, 0]}>
      <boxGeometry args={[0.46, 0.05, 0.44]} />
    </mesh>
    <mesh material={m.chair} position={[0, 0.72, 0.21]}>
      <boxGeometry args={[0.46, 0.5, 0.04]} />
    </mesh>
    {[
      [-0.2, -0.18],
      [0.2, -0.18],
      [-0.2, 0.18],
      [0.2, 0.18],
    ].map(([x, z], i) => (
      <mesh key={i} material={m.metal} position={[x, 0.22, z]}>
        <boxGeometry args={[0.03, 0.45, 0.03]} />
      </mesh>
    ))}
  </group>
);

// students in rows, facing the flipchart (-z). `frames` > 0: each holds a picture frame and pulls it wider
const SEATS: [number, number][] = [];
for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) SEATS.push([(c - 1.5) * 0.95 + 0.3, -0.6 + r * 1.15]);
const Students: React.FC<{ m: SetMats; s: number; frames?: number; skip?: number[]; wind?: number }> = ({ m, s, frames = 0, skip = [], wind = 0 }) => (
  <>
    {SEATS.map(([x, z], i) => {
      if (skip.includes(i)) return null;
      const w = 0.42 * (1 + frames * (0.6 + 0.5 * hash(i)));
      const reach = Math.min(1.2, 0.25 + w * 0.6);
      return (
        <group key={i} position={[x, 0, z]} rotation={[0, Math.PI, 0]}>
          <group rotation={[0, Math.PI, 0]}>
            <Chair m={m} />
          </group>
          <Person
            look={PEOPLE[i % PEOPLE.length]}
            seated
            headTilt={wind * Math.sin(s * 13 + i) * 0.05}
            arms={
              frames > 0
                ? [
                    [-1.25, reach],
                    [-1.25, reach],
                  ]
                : [
                    [-0.6, 0.05],
                    [-0.6, 0.05],
                  ]
            }
            elbows={frames > 0 ? [-0.2, -0.2] : [-0.9, -0.9]}
          />
          {frames > 0 && (
            <group position={[0, 1.08, 0.55]}>
              <PicFrame m={m} w={w} h={0.32} />
            </group>
          )}
        </group>
      );
    })}
  </>
);

// the panel block from the street. The seminar room is on the third floor, its window at (0, 7.6)
const FLOOR_H = 3;
const Block: React.FC<{ m: SetMats; hole?: "window" | "wall" | null; room?: React.ReactNode }> = ({ m, hole = null, room }) => {
  // the facade as tiles, 2.4 wide x 3 tall; the hole leaves some out
  const tilesOut = (c: number, r: number) => (hole === "wall" ? r === 2 && c >= -2 && c <= 2 : false);
  return (
    <group>
      {Array.from({ length: 9 }).map((_, ci) =>
        Array.from({ length: 6 }).map((__, r) => {
          const c = ci - 4;
          if (tilesOut(c, r)) return null;
          if (hole === "window" && r === 2 && c === 0) return null;
          return (
            <mesh key={`${c}_${r}`} material={m.facadeTile} position={[c * 2.4, r * FLOOR_H + 1.5 + 0.1, 0]}>
              <planeGeometry args={[2.4, FLOOR_H]} />
            </mesh>
          );
        }),
      )}
      {/* the window tile, cut open */}
      {hole === "window" && (
        <group position={[0, 2 * FLOOR_H + 1.6, 0]}>
          <HoleWall m={m.concrete} w={2.4} h={3} hole={[-0.7, 0.7, 0.9, 2.3]} t={0.05} />
        </group>
      )}
      {/* the slab edge where the wall used to be */}
      {hole === "wall" && (
        <>
          <mesh material={m.concrete} position={[0, 2 * FLOOR_H + 0.12, 0]}>
            <boxGeometry args={[12, 0.24, 0.3]} />
          </mesh>
          <mesh material={m.concrete} position={[0, 3 * FLOOR_H + 0.08, 0]}>
            <boxGeometry args={[12, 0.24, 0.3]} />
          </mesh>
        </>
      )}
      <mesh material={m.concrete} position={[0, 18.15, -2]}>
        <boxGeometry args={[21.6, 0.3, 4.4]} />
      </mesh>
      {room}
    </group>
  );
};

const Ground: React.FC<{ m: SetMats }> = ({ m }) => (
  <>
    <mesh material={m.ground} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 10]}>
      <planeGeometry args={[80, 40]} />
    </mesh>
    <mesh material={m.road} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 6]}>
      <planeGeometry args={[60, 4]} />
    </mesh>
  </>
);

// the bus: a long yellow box with a blue stripe, windows, wheels. Its doors are on the right (+x), we see the left
const BUS_L = 7;
// the panel that becomes the new exit
const HOLE_I = 1;
const HOLE_Z = -1.8;
const Bus: React.FC<{ m: SetMats; panel?: number; s: number; inside?: boolean; signs: Signs; exitOn?: number }> = ({ m, panel = 0, s, inside = false, signs, exitOn = 0 }) => {
  const sway = Math.sin(s * 3) * 0.01;
  return (
    <group rotation={[0, 0, sway]}>
      {/* the left side, in panels; the middle one becomes the new exit */}
      {[-3, -1.8, -0.6, 0.6, 1.8, 3].map((z, i) => {
        if (inside) return null;
        const isHole = i === HOLE_I;
        const k = isHole ? panel : 0;
        return (
          <group key={z} position={[-1.2 - k * 3.5, 0.3 + k * 1.2 - k * k * 2.2, z + k * 1.5]} rotation={[k * 2.2, 0, k * 1.3]}>
            <mesh material={m.busBody} position={[0, 0.55, 0]}>
              <boxGeometry args={[0.06, 0.9, 1.2]} />
            </mesh>
            <mesh material={m.busStripe} position={[0.0, 0.85, 0]}>
              <boxGeometry args={[0.07, 0.12, 1.2]} />
            </mesh>
            <mesh material={m.busBody} position={[0, 2.25, 0]}>
              <boxGeometry args={[0.06, 0.3, 1.2]} />
            </mesh>
            <mesh material={m.glass} position={[-0.035, 1.55, 0]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[1.1, 1.0]} />
            </mesh>
            {[-0.6, 0.6].map((pz) => (
              <mesh key={pz} material={m.busDark} position={[0, 1.55, pz]}>
                <boxGeometry args={[0.07, 1.1, 0.06]} />
              </mesh>
            ))}
          </group>
        );
      })}
      {/* roof, right side, front and back */}
      <mesh material={m.busBody} position={[0, 2.55, 0]}>
        <boxGeometry args={[2.5, 0.12, BUS_L + 0.2]} />
      </mesh>
      <mesh material={m.busBody} position={[1.2, 1.5, 0]}>
        <boxGeometry args={[0.06, 2.1, BUS_L]} />
      </mesh>
      <mesh material={m.busBody} position={[0, 1.4, -BUS_L / 2]}>
        <boxGeometry args={[2.46, 2.3, 0.08]} />
      </mesh>
      {!inside && (
        <mesh material={m.busBody} position={[0, 1.4, BUS_L / 2]}>
          <boxGeometry args={[2.46, 2.3, 0.08]} />
        </mesh>
      )}
      <mesh material={m.busDark} position={[0, 0.3, 0]}>
        <boxGeometry args={[2.3, 0.3, BUS_L]} />
      </mesh>
      {!inside &&
        [-2.4, 2.4].map((z) => (
          <mesh key={z} material={m.busDark} position={[-1.15, 0.38, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.42, 0.42, 0.3, 8]} />
          </mesh>
        ))}
      {/* inside: floor, seats, the rail */}
      <mesh material={m.busDark} position={[0, 0.46, 0]}>
        <boxGeometry args={[2.3, 0.02, BUS_L - 0.1]} />
      </mesh>
      {[-2.6, -1.6, -0.6, 1.4, 2.4].map((z) =>
        [-0.75, 0.75].map((x) => (
          <group key={`${x}_${z}`} position={[x, 0.46, z]}>
            <mesh material={m.seat} position={[0, 0.45, 0]}>
              <boxGeometry args={[0.8, 0.1, 0.45]} />
            </mesh>
            <mesh material={m.seat} position={[0, 0.8, 0.22]}>
              <boxGeometry args={[0.8, 0.6, 0.08]} />
            </mesh>
          </group>
        )),
      )}
      {[-0.32, 0.32].map((x) => (
        <mesh key={x} material={m.metal} position={[x, 2.35, 0]}>
          <boxGeometry args={[0.03, 0.03, BUS_L - 0.4]} />
        </mesh>
      ))}
      {/* the new exit gets a sign at once */}
      {exitOn > 0 && (
        <group position={[-1.26, 2.1, HOLE_Z]} rotation={[0, -Math.PI / 2, 0]}>
          <mesh material={signs.exit}>
            <planeGeometry args={[0.6, 0.2]} />
          </mesh>
        </group>
      )}
    </group>
  );
};

// the bus seen from inside: walls with windows that the landscape runs past
const BusInterior: React.FC<{ m: SetMats; s: number }> = ({ m, s }) => {
  const land = useMemo(() => {
    const t = rep(passing(), 1, 1);
    return flat({ map: t });
  }, []);
  (land.map as THREE.Texture).offset.x = steps(s * 0.6, 8);
  return (
    <>
      {[-1.2, 1.2].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh material={m.busBody} position={[0, 0.9, 0]}>
            <boxGeometry args={[0.05, 0.9, BUS_L]} />
          </mesh>
          <mesh material={m.busBody} position={[0, 2.3, 0]}>
            <boxGeometry args={[0.05, 0.4, BUS_L]} />
          </mesh>
          <mesh material={land} position={[x > 0 ? 0.05 : -0.05, 1.72, 0]} rotation={[0, x > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
            <planeGeometry args={[BUS_L, 0.8]} />
          </mesh>
          {[-3, -1.8, -0.6, 0.6, 1.8, 3].map((z) => (
            <mesh key={z} material={m.busDark} position={[0, 1.72, z]}>
              <boxGeometry args={[0.07, 0.8, 0.07]} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh material={m.beige} position={[0, 2.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.4, BUS_L]} />
      </mesh>
      {[-1.6, 0.4, 2.0].map((z) => (
        <mesh key={z} material={m.metal} position={[0.55, 1.5, z]}>
          <cylinderGeometry args={[0.02, 0.02, 2.0, 5]} />
        </mesh>
      ))}
    </>
  );
};

// his flat on the top floor, the front wall cut away for us; the ceiling is a lid that can leave
const ROOF_Y = 12;
const Flat: React.FC<{ m: SetMats; lid: number; s: number; cm: CastMats; jaw?: number }> = ({ m, lid, s, cm, jaw = 0 }) => (
  <group>
    {/* the floors below: the block's facade */}
    {Array.from({ length: 5 }).map((_, ci) =>
      Array.from({ length: 3 }).map((__, r) => (
        <mesh key={`${ci}_${r}`} material={m.facadeTile} position={[(ci - 2) * 2.4, r * FLOOR_H + 1.5, 1.6]}>
          <planeGeometry args={[2.4, FLOOR_H]} />
        </mesh>
      )),
    )}
    {[-6, 6].map((x) => (
      <mesh key={x} material={m.facade} position={[x * 0.9, 7.5, -1]}>
        <boxGeometry args={[2.4, 15, 5]} />
      </mesh>
    ))}
    <group position={[0, 9, 0]}>
      <mesh material={m.floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[4.2, 3.2]} />
      </mesh>
      <mesh material={m.concrete} position={[0, -0.12, 0]}>
        <boxGeometry args={[4.4, 0.24, 3.4]} />
      </mesh>
      <mesh material={m.homeWall} position={[0, 1.5, -1.6]}>
        <planeGeometry args={[4.2, 3]} />
      </mesh>
      {[-2.1, 2.1].map((x) => (
        <mesh key={x} material={m.homeWall} position={[x, 1.5, 0]} rotation={[0, -Math.sign(x) * Math.PI / 2, 0]}>
          <planeGeometry args={[3.2, 3]} />
        </mesh>
      ))}
      {/* the outside of the walls, seen from below the edge */}
      {[-2.2, 2.2].map((x) => (
        <mesh key={`o${x}`} material={m.concrete} position={[x, 1.5, 0]}>
          <boxGeometry args={[0.18, 3.0, 3.4]} />
        </mesh>
      ))}
      <mesh material={m.concrete} position={[0, 1.5, -1.7]}>
        <boxGeometry args={[4.6, 3.0, 0.18]} />
      </mesh>
      {/* the sofa, a lamp, a rug */}
      <group position={[0, 0, -1.1]}>
        <mesh material={m.sofa} position={[0, 0.25, 0]}>
          <boxGeometry args={[1.8, 0.4, 0.7]} />
        </mesh>
        <mesh material={m.sofa} position={[0, 0.65, -0.3]}>
          <boxGeometry args={[1.8, 0.5, 0.15]} />
        </mesh>
        {[-0.95, 0.95].map((x) => (
          <mesh key={x} material={m.sofa} position={[x, 0.45, 0]}>
            <boxGeometry args={[0.15, 0.5, 0.7]} />
          </mesh>
        ))}
      </group>
      <mesh material={m.metal} position={[1.6, 0.8, -1.2]}>
        <cylinderGeometry args={[0.02, 0.02, 1.6, 4]} />
      </mesh>
      <mesh material={m.glow} position={[1.6, 1.65, -1.2]}>
        <coneGeometry args={[0.2, 0.25, 6, 1, true]} />
      </mesh>
      <Vozdukhan mats={cm} position={[0, 0.55, -0.95]} pose={{ seated: true, armL: POSE.knee, armR: POSE.knee, headNod: -0.35 * lid, jaw, s, twitch: Math.sin(s * 7) > 0.7 ? 1 : 0 }} />
      {/* the ceiling: a slab with a light fitting, pulled straight up into the sky */}
      <group position={[0, 3 + lid * 14, 0]} rotation={[lid * 0.3, 0, lid * 0.15]}>
        <mesh material={m.concrete}>
          <boxGeometry args={[4.4, 0.24, 3.4]} />
        </mesh>
        <mesh material={m.glow} position={[0, -0.14, 0]}>
          <boxGeometry args={[0.6, 0.04, 0.2]} />
        </mesh>
      </group>
    </group>
  </group>
);

// the two neighbours from the roof next door: an old man in a vest, a woman in a dressing gown with curlers
const NEIGHBOURS = [
  { body: "#e4e0d4", legs: "#3a3a48", skin: "#d0a888", hair: "#9a9a9a" },
  { body: "#8a5a8a", legs: "#8a5a8a", skin: "#d8b294", hair: "#c8a060" },
];

const Clouds: React.FC<{ m: SetMats; s: number; y?: number }> = ({ m, s, y = 20 }) => (
  <>
    {Array.from({ length: 10 }).map((_, i) => (
      <mesh key={i} material={m.cloud} position={[-16 + hash(i) * 32 + steps(s * 0.3, 4), y + hash(i + 5) * 14, -14 - hash(i + 9) * 10]}>
        <boxGeometry args={[2 + hash(i + 2) * 4, 0.5 + hash(i + 3) * 0.6, 0.1]} />
      </mesh>
    ))}
  </>
);

// a backrooms ceiling where the sky should be: tiles and fluorescent panels, fading in and out
const CeilingSky: React.FC<{ k: number }> = ({ k }) => {
  const mat = useMemo(() => {
    const t = rep(tiles(), 10, 10);
    return new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false, fog: false, side: THREE.DoubleSide });
  }, []);
  mat.opacity = k;
  return (
    <mesh material={mat} position={[0, 7, -2]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[40, 40]} />
    </mesh>
  );
};

// his grin, laid onto the curve of an empty mask: a dark strip and two rows of teeth sitting on the surface
const MW = 0.5;
const mUp = (u: number) => -0.34 + 0.12 * u * u;
const mLow = (u: number, jaw: number) => -0.58 - jaw * 0.12 + 0.2 * u * u;
const onMask = (x: number, y: number, lift: number) => surfaceZ(x, y) + lift;
const MaskGrin: React.FC<{ cm: CastMats; jaw: number }> = ({ cm, jaw }) => {
  const j = Math.round(jaw * 3) / 3;
  const geo = useMemo(() => {
    const N = 12;
    const p: number[] = [];
    for (let i = 0; i < N; i++) {
      const [u0, u1] = [-1 + (2 * i) / N, -1 + (2 * (i + 1)) / N];
      const a = [u0 * MW, mUp(u0)];
      const b = [u1 * MW, mUp(u1)];
      const c = [u1 * MW, mLow(u1, j)];
      const d = [u0 * MW, mLow(u0, j)];
      for (const [x, y] of [a, d, b, b, d, c]) p.push(x, y, onMask(x, y, 0.012));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.computeVertexNormals();
    return g;
  }, [j]);
  return (
    <group>
      <mesh geometry={geo} material={cm.mouth} />
      {Array.from({ length: 11 }).map((_, i) => {
        const u = (i - 5) / 5.6;
        const x = u * MW * 0.95;
        const y = mUp(u) - 0.05;
        return (
          <mesh key={`u${i}`} material={cm.teeth} position={[x, y, onMask(x, y, 0.03)]} rotation={[0.3, u * 0.9, 0.2 * u]}>
            <boxGeometry args={[0.075, 0.1 - Math.abs(u) * 0.03, 0.035]} />
          </mesh>
        );
      })}
      {Array.from({ length: 9 }).map((_, i) => {
        const u = (i - 4) / 4.8;
        const x = u * MW * 0.88;
        const y = mLow(u, j) + 0.045;
        return (
          <mesh key={`l${i}`} material={cm.teeth} position={[x, y, onMask(x, y, 0.03)]} rotation={[0.4, u * 0.9, 0.25 * u]}>
            <boxGeometry args={[0.07, 0.08 - Math.abs(u) * 0.02, 0.035]} />
          </mesh>
        );
      })}
    </group>
  );
};

// the washed-up face: an empty mask from ep4, but with his grin, his eyes in the holes and two limp antennae
const VozMask: React.FC<{ mats: Mats; cm: CastMats; pos: [number, number, number]; scale: number; eyes: number; jaw?: number; lift?: number; rot?: [number, number, number]; s?: number }> = ({
  mats,
  cm,
  pos,
  scale,
  eyes,
  jaw = 0,
  lift = 0,
  rot,
  s = 0,
}) => {
  const eyeGeo = useEyeGeo();
  return (
    <Mask mats={mats} pos={pos} scale={scale} rot={rot}>
      <MaskGrin cm={cm} jaw={jaw} />
      {EYES.map(([x, y], i) => (
        <mesh key={i} geometry={eyeGeo} material={cm.eye} position={[x, y, surfaceZ(x, y) - 0.02]} scale={[0.17 * eyes, 0.13 * eyes, 0.12 * eyes]} visible={eyes > 0.01} />
      ))}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.16, 0.8, 0.15]} rotation={[0.1 + lift * 1.0 + Math.sin(s * 9 + side) * 0.05 * lift, 0, -side * 0.35]}>
          <mesh material={cm.antenna} position={[0, 0.3, 0]}>
            <boxGeometry args={[0.05, 0.6, 0.05]} />
          </mesh>
          <group position={[0, 0.58, 0]} rotation={[0.4 * lift, 0, -side * 0.3]}>
            <mesh material={cm.antenna} position={[0, 0.25, 0]}>
              <boxGeometry args={[0.04, 0.5, 0.04]} />
            </mesh>
          </group>
        </group>
      ))}
    </Mask>
  );
};

// --- scenes ---------------------------------------------------------------------------------------------------
const VozWorld: React.FC<{ id: VozScene }> = ({ id }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // PS1 animation steps at 15 fps
  const s = Math.floor(frame / 2) * (2 / fps);
  const mats = useMats(DAWN);
  const cm = useCastMats();
  const m = useSetMats();
  const ready = useFontReady();
  const { camera } = useThree();
  (camera as THREE.PerspectiveCamera).far = 160;
  const move = CAMS[id];
  const t = move.to ? ease(s / (move.dur ?? 3)) : 0;
  const twitch = Math.sin(s * 9) > 0.6 ? 1 : 0;
  // he talks with his whole grin while the voice runs
  const talk = (a: number, b: number) => (s > a && s < b ? steps(Math.abs(Math.sin(s * 10)), 3) * 0.6 : 0);
  if (!ready) return null;
  return <Scene id={id} s={s} t={t} move={move} mats={mats} cm={cm} m={m} twitch={twitch} talk={talk} />;
};

const Scene: React.FC<{
  id: VozScene;
  s: number;
  t: number;
  move: Move;
  mats: Mats;
  cm: CastMats;
  m: SetMats;
  twitch: number;
  talk: (a: number, b: number) => number;
}> = ({ id, s, t, move, mats, cm, m, twitch, talk }) => {
  const signs = useSigns();
  const beach = ["tide", "faceTop", "faceOpen", "keeperLow", "faceTalk", "keeperCeil", "keeperTurn", "lighthouseWalls", "crateEnd"].includes(id);
  const outdoors = beach || ["windowOut", "noWall", "busOut", "shrug", "ceilingOff", "neighbors", "neighborsUp"].includes(id);
  const fogColor = beach || outdoors ? DAWN.fog : "#3a3020";
  return (
    <>
      <color attach="background" args={[beach ? DAWN.fog : outdoors ? DAWN.skyTop : "#1a1610"]} />
      <fog attach="fog" args={[fogColor, beach ? 18 : 20, beach ? 75 : 90]} />
      <CameraRig from={move.from} to={move.to ?? move.from} t={t} />
      {beach ? (
        <>
          <hemisphereLight args={[DAWN.hemi[0], DAWN.hemi[1], 2.2]} />
          <directionalLight position={[-8, 5, -10]} intensity={2.2} color={DAWN.sun} />
          <ambientLight intensity={0.6} />
        </>
      ) : (
        <>
          <hemisphereLight args={["#e0d0c0", "#5a4a40", 2.4]} />
          <directionalLight position={[-3, 4, -6]} intensity={1.8} color="#ffc890" />
          <directionalLight position={[2.5, 3, 5]} intensity={1.7} color="#f0e8ff" />
          <ambientLight intensity={0.9} />
        </>
      )}

      {(id === "officeWide" || id === "faceClose") && (
        <>
          <Office m={m} mats={mats} s={s} />
          {(() => {
            // he opens his arms on «стены»
            const k = id === "officeWide" ? ease(steps(interpolate(s, [2.0, 2.8], [0, 1], clamp), 4)) : 1;
            return (
              <Vozdukhan
                mats={cm}
                position={[0, 0.2, -0.25]}
                pose={{
                  seated: true,
                  armL: mixArm(POSE.desk, POSE.shrug, k),
                  armR: mixArm(POSE.desk, POSE.shrug, k),
                  jaw: id === "faceClose" ? talk(0, 1.25) : talk(0.5, 3.6) * 0.5,
                  twitch,
                  headTilt: -0.08 + 0.14 * k,
                  s,
                }}
              />
            );
          })()}
        </>
      )}

      {id === "wallPat" && (
        <>
          <Office m={m} mats={mats} s={s} />
          {/* a load-bearing wall with a plaque; he pats it the way you pat a horse */}
          <mesh material={m.wallSide} position={[-0.75, 1.6, -0.3]}>
            <boxGeometry args={[0.2, 3.2, 3.4]} />
          </mesh>
          <mesh material={signs.plaque} position={[-0.645, 1.82, 0.12]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.44, 0.11]} />
          </mesh>
          {/* the crack runs out from under his palm */}
          {Array.from({ length: 8 }).map((_, i) => {
            const k = steps(interpolate(s, [1.2 + i * 0.1, 1.45 + i * 0.1], [0, 1], clamp), 3);
            return (
              <mesh
                key={i}
                material={m.crack}
                position={[-0.643, 1.42 - i * 0.11 + (i % 2) * 0.3, -0.12 + (hash(i) - 0.5) * 0.25]}
                rotation={[(hash(i + 3) - 0.5) * 1.6, Math.PI / 2, 0]}
                scale={[1, k, 1]}
              >
                <planeGeometry args={[0.012, 0.16]} />
              </mesh>
            );
          })}
          {Array.from({ length: 10 }).map((_, i) => {
            const k = (s - 1.3 - hash(i) * 0.6) * 1.4;
            if (k < 0) return null;
            return (
              <mesh key={`d${i}`} material={m.dust} position={[-0.6 + hash(i + 1) * 0.08, 1.4 - k * k * 0.6, -0.1 + (hash(i + 7) - 0.5) * 0.4]}>
                <boxGeometry args={[0.012, 0.012, 0.012]} />
              </mesh>
            );
          })}
          <Vozdukhan
            mats={cm}
            position={[0.1, 0, -0.12]}
            rotation={[0, -Math.PI / 2, 0]}
            pose={{
              armR: { ...POSE.pat, sx: POSE.pat.sx + (s < 1.3 ? (Math.floor(s * 6) % 2) * 0.12 : 0) },
              armL: POSE.hang,
              headYaw: -0.7,
              headTilt: 0.12,
              twitch,
              jaw: talk(0.1, 1.3) * 0.6,
              s,
            }}
          />
        </>
      )}

      {(id === "flipchart" || id === "module3") && (
        <>
          <Seminar m={m} s={s} windowGone={id === "module3"} />
          {id === "flipchart" ? (
            <Flipchart m={m} page={signs.chart1} />
          ) : (
            // the first page goes over the top in the draught; module 3 is underneath, and it won't keep still either
            <Flipchart
              m={m}
              page={s < 0.6 ? signs.chart1 : signs.chart3}
              under={signs.chart3}
              flip={s < 0.6 ? steps(interpolate(s, [0.1, 0.6], [0, 1], clamp), 4) : 0}
              flutter={s >= 0.6 ? steps(Math.abs(Math.sin(s * 7)), 3) * 0.35 : 0}
            />
          )}
          {/* a loose page from the first module, flying past */}
          {id === "module3" && s > 0.6 && (
            <mesh material={signs.chart1} position={[-0.5 + (s - 0.6) * 2.2, 1.9 + Math.sin(s * 6) * 0.15, -2.2 + (s - 0.6) * 1.2]} rotation={[s * 3, s * 2, s]}>
              <planeGeometry args={[0.42, 0.56]} />
            </mesh>
          )}
          <Vozdukhan
            mats={cm}
            position={[0.55, 0, -2.3]}
            rotation={[0, -0.5, 0]}
            pose={{ armR: POSE.hang, armL: id === "flipchart" ? POSE.point : POSE.shrug, twitch, jaw: id === "flipchart" ? talk(0, 1.6) : talk(0, 1.4), headYaw: -0.3, s }}
          />
          {/* the backs of two heads in the front row */}
          {[-0.45, 0.55].map((x, i) => (
            <Person key={x} look={PEOPLE[i + 2]} position={[x, 0, 0.75]} rotation={[0, Math.PI, 0]} seated />
          ))}
        </>
      )}

      {id === "seminar" && (
        <>
          <Seminar m={m} s={s} />
          <Flipchart m={m} page={signs.chart1} />
          <Students m={m} s={s} frames={steps(interpolate(s, [1.5, 3.1], [0, 1], clamp), 4)} />
          <Vozdukhan mats={cm} position={[0.25, 0, -1.95]} rotation={[0, 0.2, 0]} pose={{ armL: POSE.shrug, armR: POSE.shrug, twitch, jaw: talk(0, 3.3), headYaw: 0.15, s }} />
        </>
      )}

      {id === "windowOut" && (() => {
        // the frame pops out on the hiss, sails towards us and falls
        const k = Math.max(0, s - 1.1);
        const fallen = s > 1.85;
        return (
          <>
            <Sky look={DAWN} z={-40} y={20} />
            <Ground m={m} />
            <Block m={m} hole="window" room={<mesh material={m.glow} position={[0, 7.6, -0.4]}><planeGeometry args={[1.4, 1.4]} /></mesh>} />
            <group
              position={fallen ? [0.4, 0.06, 6.6] : [k * 0.5, 7.6 + k * 1.6 - k * k * 6.4, 0.08 + k * 7.6]}
              rotation={fallen ? [-Math.PI / 2, 0, 0.3] : [k * 5.5, k * 1.2, k * 0.8]}
            >
              <WindowFrame m={m} w={1.4} h={1.4} glass={s < 1.1} />
            </group>
            {/* the curtains follow the frame out and stay there, flapping */}
            {s > 1.1 &&
              [-0.45, 0.45].map((x, i) => (
                <mesh key={x} material={m.curtain} position={[x, 7.4, 0.3]} rotation={[-0.9 - Math.sin(s * 12 + i) * 0.2, 0, 0]}>
                  <planeGeometry args={[0.45, 1.2]} />
                </mesh>
              ))}
            {s > 1.1 &&
              Array.from({ length: 5 }).map((_, i) => {
                const q = (s - 1.1) * 1.5 + hash(i) * 0.3;
                return (
                  <mesh key={`p${i}`} material={m.puff} position={[(hash(i + 3) - 0.5) * 1.6 * q, 7.6 + (hash(i + 5) - 0.5) * q, q * 2]} scale={0.1 + q * 0.15}>
                    <icosahedronGeometry args={[1, 0]} />
                  </mesh>
                );
              })}
            <Clouds m={m} s={s} y={12} />
          </>
        );
      })()}

      {id === "comfortZone" && (() => {
        // the student gets up out of the armchair and steps over the yellow tape
        const up = ease(steps(interpolate(s, [0.25, 0.7], [0, 1], clamp), 3));
        const walk = steps(interpolate(s, [0.7, 1.7], [0, 1], clamp), 6);
        return (
          <>
            <Seminar m={m} s={s} windowGone />
            {/* outside the hole: only light */}
            <mesh material={m.glow} position={[-3.2, 1.6, 2.0]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[1.6, 1.4]} />
            </mesh>
            {[
              [0, -0.7, 1.6, 0.06],
              [0, 0.7, 1.6, 0.06],
              [-0.8, 0, 0.06, 1.4],
              [0.8, 0, 0.06, 1.4],
            ].map(([x, z, w, d], i) => (
              <mesh key={i} material={m.tape} position={[x - 0.4, 0.012, z - 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[w, d]} />
              </mesh>
            ))}
            <mesh material={signs.zone} position={[-0.4, 0.015, 0.45]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[1.4, 0.35]} />
            </mesh>
            <group position={[-0.4, 0, -0.75]}>
              <mesh material={m.sofa} position={[0, 0.25, 0]}>
                <boxGeometry args={[0.8, 0.4, 0.7]} />
              </mesh>
              <mesh material={m.sofa} position={[0, 0.7, -0.3]}>
                <boxGeometry args={[0.8, 0.6, 0.15]} />
              </mesh>
            </group>
            <Person
              look={PEOPLE[1]}
              position={[-0.4 - walk * 1.6, up * 0.45, -0.6 + up * 0.1 + walk * 0.6]}
              rotation={[0, walk > 0 ? -Math.PI / 2 - 0.4 : 0, 0]}
              seated={up < 0.5}
              arms={[
                [walk > 0 ? Math.sin(s * 14) * 0.4 : -0.5, 0.1],
                [walk > 0 ? -Math.sin(s * 14) * 0.4 : -0.5, 0.1],
              ]}
            />
            <Vozdukhan mats={cm} position={[1.2, 0, -1.2]} rotation={[0, -0.7, 0]} pose={{ armL: POSE.shrug, armR: POSE.shrug, twitch, jaw: talk(0.1, 1.5), s }} />
          </>
        );
      })()}

      {id === "valve" && (
        <>
          <Seminar m={m} s={s} />
          <Vozdukhan
            mats={cm}
            position={[0, 0, 0]}
            pose={{
              armR: POSE.valve,
              armL: POSE.hang,
              valve: steps(interpolate(s, [0.2, 1.0], [0, 1], clamp), 4),
              puff: interpolate(s, [0.35, 0.8], [0, 1], clamp),
              twitch,
              jaw: talk(0, 1.3) * 0.4,
              headNod: 0.2,
              s,
            }}
          />
        </>
      )}

      {id === "noWall" && (
        <>
          <Sky look={DAWN} z={-40} y={20} />
          <Ground m={m} />
          <Block
            m={m}
            hole="wall"
            room={
              <group position={[0, 2 * FLOOR_H + 0.24, -3.6]}>
                <Seminar m={m} s={s} windowGone noFront />
                <Flipchart m={m} page={signs.chart3} flutter={steps(Math.abs(Math.sin(s * 8)), 3) * 0.5} />
                <Students m={m} s={s} wind={1} />
                <Vozdukhan mats={cm} position={[0.6, 0, -2.0]} rotation={[0, -0.2, 0]} pose={{ armL: POSE.shrug, armR: POSE.shrug, twitch, puff: 1, s }} />
              </group>
            }
          />
          {/* the handouts leave through the missing wall */}
          {Array.from({ length: 14 }).map((_, i) => {
            const q = (s * 0.5 + hash(i)) % 1;
            return (
              <mesh key={i} material={m.paper} position={[(hash(i + 2) - 0.5) * 8 + q * 3, 7.5 + q * 3 - q * q * 5, -1 + q * 6]} rotation={[s * 4 + i, s * 3, i]}>
                <planeGeometry args={[0.25, 0.32]} />
              </mesh>
            );
          })}
          <Clouds m={m} s={s} y={14} />
        </>
      )}

      {id === "busInside" && (
        <group rotation={[0, 0, Math.sin(s * 2.4) * 0.012]}>
          <Bus m={m} s={s} inside signs={signs} />
          <BusInterior m={m} s={s} />
          {[
            [-0.75, -1.6],
            [0.75, -1.6],
            [-0.75, 1.4],
            [0.75, 2.4],
            [-0.75, -0.6],
          ].map(([x, z], i) => (
            <Person key={i} look={PEOPLE[(i + 1) % PEOPLE.length]} position={[x, 0.46, z]} rotation={[0, Math.PI, 0]} seated />
          ))}
          <Vozdukhan mats={cm} position={[0.05, 0.46, -1.0]} pose={{ armR: POSE.rail, armL: POSE.shrug, twitch, jaw: talk(0, 3.0), s }} />
        </group>
      )}

      {id === "busOut" && (() => {
        // a tracking shot faked the PS1 way: the bus stays, the road and the poles run backwards
        const roll = s < 2.6 ? s : 2.6 + (s - 2.6) * 0.15;
        const bulge = s > 1.55 && s < 2.15 ? 0.5 + Math.sin(s * 40) * 0.5 : 0;
        const panel = s > 2.15 ? Math.min(1.4, (s - 2.15) * 1.6) : 0;
        return (
          <>
            <Coast mats={mats} s={s} y={-1.5} />
            <group position={[0, 0, steps(-roll * 6, 15) % 6]}>
              {Array.from({ length: 10 }).map((_, i) => (
                <mesh key={i} material={m.busDark} position={[-3.4, 1.2, 12 - i * 6]}>
                  <boxGeometry args={[0.1, 2.4, 0.1]} />
                </mesh>
              ))}
            </group>
            <mesh material={m.road} rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0, 0]}>
              <planeGeometry args={[60, 5]} />
            </mesh>
            <group rotation={[0, Math.PI, 0]}>
              <Bus m={m} s={s} panel={panel + bulge * 0.02} signs={signs} exitOn={s > 2.65 ? 1 : 0} />
              {/* who is inside, glimpsed through the hole */}
              <Person look={PEOPLE[0]} position={[-0.75, 0.46, HOLE_Z - 0.2]} rotation={[0, -Math.PI / 2, 0]} seated />
              <Vozdukhan mats={cm} position={[0.1, 0.46, HOLE_Z + 0.55]} rotation={[0, -Math.PI / 2, 0]} pose={{ armL: POSE.shrug, armR: POSE.rail, twitch, s }} />
            </group>
          </>
        );
      })()}

      {id === "stamp" && (() => {
        // the stamp comes down on the act, stays a beat, lifts off: the ink is there
        const down = interpolate(s, [1.0, 1.25, 1.65, 2.1], [0.6, 0.02, 0.02, 0.6], clamp);
        return (
          <>
            <mesh material={m.wood} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[3, 3]} />
            </mesh>
            <mesh material={signs.act} rotation={[-Math.PI / 2, 0, 0.05]} position={[0, 0.005, 0]}>
              <planeGeometry args={[0.6, 0.8]} />
            </mesh>
            {s > 1.25 && (
              <mesh material={signs.stampInk} rotation={[-Math.PI / 2, 0, -0.18]} position={[0.02, 0.008, 0.16]}>
                <planeGeometry args={[0.42, 0.14]} />
              </mesh>
            )}
            <group position={[0.02 + (s > 1.65 ? (down - 0.02) * 0.9 : 0), steps(down, 6), 0.16]} rotation={[0, 0.18, 0]}>
              <mesh material={m.seat} position={[0, 0.015, 0]}>
                <boxGeometry args={[0.44, 0.03, 0.15]} />
              </mesh>
              <mesh material={m.woodDark} position={[0, 0.045, 0]}>
                <boxGeometry args={[0.46, 0.03, 0.17]} />
              </mesh>
              <mesh material={m.wood} position={[0, 0.14, 0]}>
                <cylinderGeometry args={[0.035, 0.05, 0.18, 6]} />
              </mesh>
              <mesh material={m.wood} position={[0, 0.26, 0]}>
                <sphereGeometry args={[0.07, 6, 4]} />
              </mesh>
            </group>
            {/* a pen and the manufacturer's coffee */}
            <mesh material={m.busStripe} position={[-0.42, 0.01, 0.1]} rotation={[0, 0.7, Math.PI / 2]}>
              <cylinderGeometry args={[0.01, 0.01, 0.3, 5]} />
            </mesh>
            <mesh material={m.beige} position={[0.45, 0.06, -0.3]}>
              <cylinderGeometry args={[0.06, 0.05, 0.12, 8]} />
            </mesh>
          </>
        );
      })()}

      {id === "shrug" && (
        <>
          <Coast mats={mats} s={s} y={-1.5} />
          <mesh material={m.road} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
            <planeGeometry args={[60, 5]} />
          </mesh>
          <group position={[1.0, 0, -2.3]} rotation={[0, Math.PI / 2, 0]}>
            <Bus m={m} s={0} panel={3} signs={signs} exitOn={1} />
            <Person look={PEOPLE[3]} position={[-0.75, 0.46, HOLE_Z]} rotation={[0, Math.PI / 2, 0]} seated />
          </group>
          {(() => {
            const k = ease(steps(interpolate(s, [0.5, 1.0], [0, 1], clamp), 4));
            return (
              <Vozdukhan
                mats={cm}
                position={[0, 0, 0]}
                rotation={[0, 0.15, 0]}
                pose={{ armL: mixArm(POSE.hang, POSE.shrug, k), armR: mixArm(POSE.hang, POSE.shrug, k), headTilt: 0.18 * k, twitch, jaw: talk(0.1, 2.3) * 0.5, s }}
              />
            );
          })()}
        </>
      )}

      {(id === "ceilingOff" || id === "neighbors" || id === "neighborsUp") && (() => {
        const lid = id === "ceilingOff" ? steps(interpolate(s, [0.2, 2.2], [0, 1], clamp) ** 2, 10) : 1.6 + s;
        // the neighbours lean over the edge and shake their fists; then the sky takes them
        const fly = id === "neighborsUp" ? Math.max(0, s - 0.3) : 0;
        return (
          <>
            <Sky look={DAWN} z={-40} y={20} />
            <Clouds m={m} s={s} y={16} />
            <Flat m={m} lid={lid} s={s} cm={cm} />
            {id !== "ceilingOff" &&
              NEIGHBOURS.map((look, i) => {
                const side = i === 0 ? -1 : 1;
                const fist = steps(Math.abs(Math.sin(s * 9 + i * 1.3)), 2);
                return (
                  <group
                    key={i}
                    position={[side * 0.55 + side * fly * 0.9, ROOF_Y + fly * fly * 3.2 + fly * 1.5, -2.0 - fly * 0.6]}
                    rotation={[fly * 1.4, fly * 2.4 * side, fly * 1.8 * side]}
                  >
                    <Person
                      look={look}
                      rotation={[fly > 0 ? 0.2 : 0.6, side * 0.15, 0]}
                      arms={
                        fly > 0
                          ? [
                              [-2.6, 0.6],
                              [-2.6, 0.6],
                            ]
                          : side < 0
                            ? [
                                [-2.4 - fist * 0.4, 0.2],
                                [-0.6, 0.1],
                              ]
                            : [
                                [-0.6, 0.1],
                                [-2.4 - fist * 0.4, 0.2],
                              ]
                      }
                      elbows={fly > 0 ? [0, 0] : side < 0 ? [-1.2, -0.6] : [-0.6, -1.2]}
                    />
                    {fly === 0 && fist > 0 && (
                      <mesh material={signs.bang} position={[side * 0.35, 2.25, 0.3]}>
                        <planeGeometry args={[0.28, 0.28]} />
                      </mesh>
                    )}
                  </group>
                );
              })}
            {/* a slipper comes back down */}
            {id === "neighborsUp" && s > 1.4 && (
              <mesh material={m.slipper} position={[1.2, ROOF_Y + 8 - (s - 1.4) * (s - 1.4) * 4, 0]} rotation={[s * 6, s * 4, 0]}>
                <boxGeometry args={[0.12, 0.05, 0.3]} />
              </mesh>
            )}
            <mesh material={m.concrete} position={[0, ROOF_Y - 1.5, -3.6]}>
              <boxGeometry args={[6, 3, 3.6]} />
            </mesh>
          </>
        );
      })()}

      {beach && (
        <BeachScene id={id} s={s} mats={mats} cm={cm} talk={talk} />
      )}
    </>
  );
};

const BeachScene: React.FC<{ id: VozScene; s: number; mats: Mats; cm: CastMats; talk: (a: number, b: number) => number }> = ({ id, s, mats, cm }) => {
  // a few ordinary empty faces around his
  const around = (n: number, r: number) =>
    Array.from({ length: n }).map((_, i) => {
      const a = (i / n) * Math.PI * 2 + 0.4;
      return <Mask key={i} mats={mats} pos={[Math.cos(a) * r * (0.9 + hash(i) * 0.3), 0.02, Math.sin(a) * r * (0.9 + hash(i + 2) * 0.3)]} rot={[-Math.PI / 2, 0, (hash(i + 4) - 0.5) * 1.2]} scale={0.26} />;
    });
  const grains = (on: boolean) =>
    Array.from({ length: 12 }).map((_, i) => {
      const hop = on ? Math.abs(Math.sin(s * 22 + i * 1.9)) * 0.035 * (0.4 + hash(i + 4)) : 0;
      const a = (i / 12) * Math.PI * 2;
      return (
        <mesh key={`g${i}`} material={mats.grain} position={[Math.cos(a) * 0.14 * (0.6 + hash(i)), 0.03 + hop, 0.17 + Math.sin(a) * 0.05]}>
          <boxGeometry args={[0.014, 0.014, 0.014]} />
        </mesh>
      );
    });
  return (
    <>
      {id === "tide" && (() => {
        // the wave comes in, hangs, slides back and leaves him behind with the others
        const foamZ = interpolate(s, [0, 0.8, 1.1, 2.3], [-3.2, -0.3, -0.3, -3.2], clamp);
        const back = s > 1.1;
        return (
          <>
            <Sky look={DAWN} />
            <Sand look={DAWN} />
            <mesh material={mats.wet} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -1.9]}>
              <planeGeometry args={[30, 2.8]} />
            </mesh>
            <Sea mats={mats} s={s} from={-45} to={-3.2} amp={0.05} />
            <mesh material={mats.sea} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, (foamZ - 3.2) / 2]} scale={[1, Math.max(0.01, foamZ + 3.2), 1]}>
              <planeGeometry args={[30, 1]} />
            </mesh>
            {Array.from({ length: 22 }).map((_, i) => (
              <mesh key={i} material={mats.foam} position={[-7 + i * 0.68, 0.035, foamZ + (hash(i) - 0.5) * 0.18]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.72, 0.16 + hash(i + 3) * 0.12]} />
              </mesh>
            ))}
            {Array.from({ length: 12 }).map((_, i) => {
              const z = -2.9 + hash(i * 3) * 2.2;
              const x = (hash(i * 7 + 1) - 0.5) * 6;
              return <Mask key={i} mats={mats} pos={[x, 0.03, z]} rot={[-Math.PI / 2, 0, (hash(i + 2) - 0.5) * 1.4]} scale={0.26} visible={back && foamZ < z - 0.15} />;
            })}
            {back && foamZ < -0.45 && <VozMask mats={mats} cm={cm} pos={[0.05, 0.03, -0.3]} rot={[-Math.PI / 2, 0, 0.2]} scale={0.32} eyes={0} />}
          </>
        );
      })()}

      {(id === "faceTop" || id === "faceOpen") && (() => {
        const eyes = id === "faceOpen" ? steps(interpolate(s, [0.45, 1.2], [0, 1], clamp), 4) : 0;
        const reach = id === "faceOpen" ? interpolate(s, [0.0, 0.5], [0.55, 0.62], clamp) : 0;
        const shake = id === "faceOpen" && s > 0.5 ? (Math.floor(s * 15) % 2 ? 0.006 : -0.006) : 0;
        return (
          <>
            <Sand look={DAWN} size={6} rep={6} />
            {around(5, 0.95)}
            <VozMask mats={mats} cm={cm} pos={[0, 0.03, 0.02]} scale={0.42} eyes={eyes} lift={id === "faceOpen" ? steps(interpolate(s, [0.9, 1.6], [0, 1], clamp), 3) : 0} s={s} />
            {id === "faceOpen" && (
              <group scale={0.55} position={[0.05, 0, 0.1]}>
                <Limb mats={mats} reach={reach} shake={shake} />
              </group>
            )}
          </>
        );
      })()}

      {(id === "keeperLow" || id === "keeperCeil") && (
        <>
          <Sky look={DAWN} />
          <Sand look={DAWN} size={20} rep={10} />
          {/* the keeper bends over the face; on «в голове» he straightens a little and looks up too */}
          <pointLight position={[0, 0.3, 0.2]} intensity={3} distance={4} color="#c8b0d8" />
          <Keeper mats={mats} x={0} z={-1.3} yaw={0} s={1.7} bend={id === "keeperLow" ? 0.62 : interpolate(s, [0.6, 1.4], [0.62, 0.15], clamp)} />
          {id === "keeperCeil" && <CeilingSky k={steps(interpolate(s, [0.1, 0.7, 1.4, 2.1], [0, 0.85, 0.85, 0], clamp), 5)} />}
        </>
      )}

      {id === "faceTalk" && (
        <>
          <Sand look={DAWN} size={6} rep={6} />
          {around(4, 0.8)}
          <VozMask mats={mats} cm={cm} pos={[0, 0.03, 0.02]} scale={0.42} eyes={1} lift={1} jaw={steps(Math.abs(Math.sin(s * 11)), 3)} s={s} />
          <group position={[0, 0, 0]}>{grains(true)}</group>
        </>
      )}

      {(id === "keeperTurn" || id === "lighthouseWalls") && (
        <>
          <Sky look={DAWN} />
          <Sand look={DAWN} size={60} rep={20} />
          <Sea mats={mats} s={s} from={-45} to={-4.5} amp={0.08} />
          <mesh material={mats.foam} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, -4.5]}>
            <planeGeometry args={[80, 0.12]} />
          </mesh>
          <Lighthouse mats={mats} on={id === "lighthouseWalls" ? interpolate(s, [1.2, 1.5, 1.8, 2.2], [1, 0.3, 0.3, 1], clamp) : 1} s={s} />
          {id === "keeperTurn" && (
            <>
              {/* he looks down at the face, then up the beach to the lighthouse, in three jerks */}
              <Keeper
                mats={mats}
                x={0.15}
                z={0.9}
                yaw={interpolate(steps(interpolate(s, [0.5, 1.6], [0, 1], clamp), 3), [0, 1], [-2.0, -2.85])}
                s={1.5}
                bend={interpolate(s, [0.5, 1.6], [0.9, 0.15], clamp)}
              />
              <VozMask mats={mats} cm={cm} pos={[-0.3, 0.03, 0.4]} rot={[-Math.PI / 2, 0, -0.6]} scale={0.3} eyes={1} lift={1} s={s} />
              {around(6, 1.6).map((el, i) => (
                <group key={i} position={[-0.3, 0, 0.4]}>
                  {el}
                </group>
              ))}
            </>
          )}
        </>
      )}

      {id === "crateEnd" && (() => {
        const w = 1.5;
        const d = 2.4;
        const slots: [number, number][] = [];
        for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) slots.push([(c - 1) * 0.46, (r - 1.5) * 0.58]);
        // the side wall of the crate lets go after the hiss and falls outwards
        const fall = steps(ease(interpolate(s, [4.1, 4.5], [0, 1], clamp)), 4);
        return (
          <>
            <Sand look={DAWN} size={14} rep={10} />
            <group>
              <mesh material={mats.woodDark} position={[0, 0.02, 0]}>
                <boxGeometry args={[w, 0.04, d]} />
              </mesh>
              {[
                [0, -d / 2, w, 0.07],
                [0, d / 2, w, 0.07],
                [-w / 2, 0, 0.07, d],
              ].map(([x, z, a, c], i) => (
                <mesh key={i} material={mats.wood} position={[x, 0.4, z]}>
                  <boxGeometry args={[a, 0.8, c]} />
                </mesh>
              ))}
              <group position={[w / 2, 0.02, 0]} rotation={[0, 0, -fall * (Math.PI / 2)]}>
                <mesh material={mats.wood} position={[0, 0.4, 0]}>
                  <boxGeometry args={[0.07, 0.8, d]} />
                </mesh>
              </group>
            </group>
            {slots.map(([x, z], i) =>
              i === 4 ? (
                <VozMask key={i} mats={mats} cm={cm} pos={[x, 0.52, z]} rot={[-Math.PI / 2 + 0.22, 0, 0.05]} scale={0.29} eyes={1} lift={0.4} s={s} />
              ) : (
                <Mask key={i} mats={mats} pos={[x, 0.52, z]} rot={[-Math.PI / 2 + 0.22, 0, (hash(i) - 0.5) * 0.25]} scale={0.29} />
              ),
            )}
            {/* the shift goes on as usual: the lid goes on, plank by plank */}
            {[0, 1, 2, 3].map((j) => {
              const k = ease((s - 0.6 - j * 0.45) / 0.35);
              return (
                <mesh key={j} material={j % 2 ? mats.plank : mats.wood} position={[2.6 * (1 - k), 0.86, (j - 1.5) * 0.6]}>
                  <boxGeometry args={[1.62, 0.06, 0.58]} />
                </mesh>
              );
            })}
            {/* a breath of air between the planks */}
            {s > 3.5 &&
              s < 4.6 &&
              Array.from({ length: 6 }).map((_, i) => {
                const q = (s - 3.5) * 1.2 + hash(i) * 0.2;
                return (
                  <mesh key={`h${i}`} material={cm.puff} position={[(hash(i + 3) - 0.5) * 1.2, 0.9 + q * 0.5, -0.3 + (i % 2) * 0.6]} scale={0.04 + q * 0.12}>
                    <icosahedronGeometry args={[1, 0]} />
                  </mesh>
                );
              })}
          </>
        );
      })()}
    </>
  );
};

export const VozScene3D: React.FC<{ id: VozScene }> = ({ id }) => (
  <Ps1Canvas>
    <VozWorld id={id} />
  </Ps1Canvas>
);

