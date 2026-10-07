import React, { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { CameraRig, Ps1Canvas, pixelTexture, type Cam } from "../ps1kit";
import { Cliffs, Connectome, Crate, DAWN, EYES, Mask, MaskField, Sand, Sea, Sky, surfaceZ, useMats, type Mats } from "../ep4/World";
import { clamp, ease, emblemTexture, flat, hash, lam, lettering, steps, useCastMats, useEyeGeo, useFontReady, type CastMats } from "./Cast";
import type { VozScene } from "./script";

// fixed cameras; a few creep in very slowly over the shot
type Move = { from: Cam; to?: Cam; dur?: number };
const MASTER: Cam = { pos: [4.6, 2.5, 9.5], look: [0.6, 0.4, -6] };
const CAMS: Record<VozScene, Move> = {
  black: { from: MASTER },
  shoreMain: { from: MASTER },
  wallChunk: { from: { pos: [1.2, 0.75, 2.0], look: [0, 0.15, -0.3] } },
  flipPage: { from: { pos: [0.35, 0.8, 1.45], look: [0, 0.55, 0] } },
  frameSurf: { from: { pos: [0.1, 0.55, 1.35], look: [0, 0.0, -0.5] } },
  armchair: { from: { pos: [0.7, 1.0, 3.3], look: [-0.3, 0.55, -4] } },
  doorway: { from: { pos: [0.15, 1.15, 2.7], look: [0, 1.05, -3] } },
  busSeat: { from: { pos: [0.9, 0.5, 1.7], look: [0, 0.3, -0.3] } },
  exitSign: { from: { pos: [0.25, 0.85, 0.75], look: [0, 0, -0.05] } },
  shoreKeeper: { from: MASTER },
  ceilingTile: { from: { pos: [0.55, 1.15, 1.35], look: [0, 0, -0.05] } },
  slipper: { from: { pos: [0.3, 0.32, 0.45], look: [0, 0.02, -0.6] } },
  shoreMasks: { from: MASTER },
  faceTop: { from: { pos: [0, 1.3, 0.001], look: [0, 0, 0] } },
  faceOpen: { from: { pos: [0, 1.0, 0.001], look: [0, 0, 0] } },
  faceStill: { from: { pos: [0.05, 0.55, 0.8], look: [0, 0, 0.0] } },
  keeperCeil: { from: { pos: [0, 0.12, 0.15], look: [0, 1.8, -0.8] }, to: { pos: [0, 0.12, 0.1], look: [0, 2.2, -0.7] }, dur: 2.3 },
  keeperBack: { from: { pos: [0.4, 1.5, 4.0], look: [-2.5, 2.6, -8] } },
  beaconBlink: { from: { pos: [0.4, 1.7, 2.2], look: [-3.2, 5.4, -10] } },
  grinSpread: { from: { pos: [0, 2.5, 0.001], look: [0, 0, 0] } },
  // the echo of keeperCeil: the same look up from the sand, but nobody is standing over us
  ceilingUs: { from: { pos: [0, 0.12, 0.1], look: [0, 2.2, -0.6] } },
};

// --- textures -------------------------------------------------------------------------------------------------
// the yellow office wallpaper, faded by the sea
const wallpaper = () =>
  pixelTexture(32, 32, (ctx) => {
    ctx.fillStyle = "#b09a5c";
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = "#9a8650";
    for (let x = 0; x < 32; x += 8) ctx.fillRect(x, 0, 1, 32);
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = hash(i) < 0.5 ? "#c0aa6c" : "#8e7c4c";
      ctx.fillRect(Math.floor(hash(i * 3 + 1) * 32), Math.floor(hash(i * 7 + 2) * 32), 1, 1);
    }
    // a tide mark
    ctx.fillStyle = "#7a7058";
    ctx.fillRect(0, 24, 32, 1);
  });
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
const rep = (t: THREE.Texture, x: number, y: number) => {
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(x, y);
  return t;
};

const useThings = () =>
  useMemo(
    () => ({
      wallpaper: lam({ map: rep(wallpaper(), 2, 2) }),
      concrete: lam({ color: "#8a8884" }),
      frame: lam({ color: "#4a3a2c" }),
      frameWet: lam({ color: "#6a5440" }),
      chair: lam({ color: "#7a3a36" }),
      chairDark: lam({ color: "#5a2a28" }),
      seat: lam({ color: "#8a2e2c" }),
      chrome: lam({ color: "#a8acb4" }),
      busYellow: lam({ color: "#d0a848" }),
      busStripe: lam({ color: "#2e4e8a" }),
      tile: lam({ map: tiles(false) }),
      tubeOn: flat({ color: "#fffbe8" }),
      tubeOff: lam({ color: "#9a9a90" }),
      slipper: lam({ color: "#9a4a7a" }),
      slipperSole: lam({ color: "#4a3a3a" }),
      rock: lam({ color: "#5e5670" }),
      iron: lam({ color: "#2a2c34" }),
      lamp: flat({ color: "#ffe9a0" }),
      grain: lam({ color: "#5a4c40" }),
    }),
    [],
  );
type Things = ReturnType<typeof useThings>;

const useSigns = () =>
  useMemo(
    () => ({
      // the page has been in the sea: the ink has run and gone pale
      page: lam({
        map: lettering(
          64,
          80,
          "#c4c8cc",
          [
            { text: "СВЕЖИЙ", size: 8, color: "#56648a", y: 40 },
            { text: "ПОТОК", size: 8, color: "#56648a", y: 52 },
          ],
          (ctx) => {
            const e = emblemTexture("#a89060").image as HTMLCanvasElement;
            ctx.drawImage(e, 16, 8);
            ctx.fillStyle = "#aab0b8";
            for (let i = 0; i < 40; i++) ctx.fillRect(Math.floor(hash(i * 3) * 64), Math.floor(hash(i * 5 + 1) * 80), 1, 3);
            ctx.fillStyle = "#9ea4ae";
            ctx.fillRect(0, 70, 64, 10);
          },
        ),
        side: THREE.DoubleSide,
      }),
      exitOn: flat({ map: lettering(48, 16, "#0a3a18", [{ text: "ВЫХОД", size: 8, color: "#7aff98", y: 4 }]) }),
      exitDim: flat({ map: lettering(48, 16, "#0a2010", [{ text: "ВЫХОД", size: 8, color: "#2a6a3a", y: 4 }]) }),
      plaque: lam({ map: lettering(64, 16, "#a88a3e", [{ text: "НЕСУЩАЯ", size: 8, color: "#2a1c08", y: 4 }]) }),
    }),
    [],
  );
type Signs = ReturnType<typeof useSigns>;

// --- the sea's edge -------------------------------------------------------------------------------------------
// one wave cycle: the water runs up quickly and slides back slowly; 0 = drawn back, 1 = furthest up
const swell = (s: number, period: number, phase = 0) => {
  const c = ((((s + phase) / period) % 1) + 1) % 1;
  return c < 0.3 ? ease(c / 0.3) : 1 - ease((c - 0.3) / 0.7);
};
// the open sea ends at `edge`; a sheet of water and a line of foam run up the sand as far as edge + reach * swell
const Shore: React.FC<{ mats: Mats; s: number; edge: number; reach?: number; period?: number; phase?: number; width?: number; amp?: number; grain?: number }> = ({
  mats,
  s,
  edge,
  reach = 0.25,
  period = 6.5,
  phase = 0,
  width = 30,
  amp = 0.05,
  grain = 18,
}) => {
  // the foam only breathes at the edge: a few hand-widths up the sand and back, slowly
  const z = edge + Math.min(reach, 0.3) * swell(s, Math.max(period, 6), phase);
  return (
    <>
      <Sky look={DAWN} />
      <Sand look={DAWN} rep={grain} />
      <mesh material={mats.wet} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, edge + 0.35]}>
        <planeGeometry args={[width, 0.8]} />
      </mesh>
      {/* the troughs must stay above the sand, or the sand shows through the sea like puddles */}
      <group position={[0, amp * 1.6 + 0.01, 0]}>
        <Sea mats={mats} s={s} from={-45} to={z} amp={amp} />
      </group>
      {Array.from({ length: 24 }).map((_, i) => (
        <mesh key={i} material={mats.foam} position={[-width / 4 + i * (width / 2 / 24), amp * 1.6 + 0.03, z + (hash(i) - 0.5) * 0.08]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width / 2 / 24 + 0.05, 0.08 + hash(i + 3) * 0.06]} />
        </mesh>
      ))}
    </>
  );
};
// how high the open sea is at a point (the same formula ep4's Sea uses)
const seaY = (x: number, z: number, s: number, amp: number) => amp * (Math.sin(x * 0.9 + s * 1.7 + z * 0.4) + 0.6 * Math.sin(z * 1.3 - s * 2.1));

// --- things the sea brings back -----------------------------------------------------------------------------------
const WindowFrame: React.FC<{ t: Things; w: number; h: number }> = ({ t, w, h }) => (
  <group>
    {[h / 2, -h / 2].map((y) => (
      <mesh key={`h${y}`} material={t.frameWet} position={[0, y, 0]}>
        <boxGeometry args={[w + 0.07, 0.07, 0.07]} />
      </mesh>
    ))}
    {[-w / 2, 0, w / 2].map((x) => (
      <mesh key={`v${x}`} material={t.frameWet} position={[x, 0, 0]}>
        <boxGeometry args={[0.07, h, 0.07]} />
      </mesh>
    ))}
    {/* one shard of glass left in a corner */}
    <mesh material={t.chrome} position={[-w / 4 - 0.08, h / 2 - 0.12, 0]} rotation={[0, 0, 0.6]}>
      <circleGeometry args={[0.1, 3]} />
    </mesh>
  </group>
);

const Armchair: React.FC<{ t: Things }> = ({ t }) => (
  <group>
    <mesh material={t.chair} position={[0, 0.32, 0]}>
      <boxGeometry args={[0.8, 0.22, 0.75]} />
    </mesh>
    <mesh material={t.chair} position={[0, 0.72, 0.33]} rotation={[-0.12, 0, 0]}>
      <boxGeometry args={[0.8, 0.7, 0.16]} />
    </mesh>
    {[-0.42, 0.42].map((x) => (
      <mesh key={x} material={t.chairDark} position={[x, 0.48, 0.02]}>
        <boxGeometry args={[0.14, 0.42, 0.72]} />
      </mesh>
    ))}
    {[
      [-0.32, -0.3],
      [0.32, -0.3],
      [-0.32, 0.3],
      [0.32, 0.3],
    ].map(([x, z], i) => (
      <mesh key={i} material={t.frame} position={[x, 0.1, z]}>
        <boxGeometry args={[0.06, 0.2, 0.06]} />
      </mesh>
    ))}
  </group>
);

const BusSeat: React.FC<{ t: Things }> = ({ t }) => (
  <group>
    <mesh material={t.seat}>
      <boxGeometry args={[0.85, 0.12, 0.45]} />
    </mesh>
    <mesh material={t.seat} position={[0, 0.3, -0.22]} rotation={[-0.1, 0, 0]}>
      <boxGeometry args={[0.85, 0.6, 0.09]} />
    </mesh>
    <mesh material={t.chrome} position={[0, 0.62, -0.25]}>
      <boxGeometry args={[0.85, 0.04, 0.04]} />
    </mesh>
    {/* a line of stitching down the middle */}
    <mesh material={t.slipperSole} position={[0, 0.3, -0.17]}>
      <boxGeometry args={[0.02, 0.5, 0.01]} />
    </mesh>
  </group>
);

const Slipper: React.FC<{ t: Things }> = ({ t }) => (
  <group>
    <mesh material={t.slipperSole} position={[0, 0.015, 0]}>
      <boxGeometry args={[0.11, 0.03, 0.28]} />
    </mesh>
    <mesh material={t.slipper} position={[0, 0.05, 0.06]} scale={[1, 0.6, 1]}>
      <sphereGeometry args={[0.065, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2]} />
    </mesh>
    <mesh material={t.slipper} position={[0, 0.045, -0.06]}>
      <boxGeometry args={[0.1, 0.05, 0.1]} />
    </mesh>
  </group>
);

// a piece of a room's wall: concrete, with the yellow wallpaper still on one face (and its little brass plaque)
const WallChunk: React.FC<{ t: Things; signs: Signs }> = ({ t, signs }) => (
  <group>
    <mesh material={t.concrete}>
      <boxGeometry args={[1.3, 0.9, 0.22]} />
    </mesh>
    <mesh material={t.wallpaper} position={[0, 0, 0.112]}>
      <planeGeometry args={[1.3, 0.9]} />
    </mesh>
    <mesh material={signs.plaque} position={[0.2, 0.18, 0.115]}>
      <planeGeometry args={[0.3, 0.075]} />
    </mesh>
    {/* the broken edge: lumps and a bent rod */}
    {Array.from({ length: 5 }).map((_, i) => (
      <mesh key={i} material={t.concrete} position={[-0.68, -0.35 + i * 0.18, (hash(i) - 0.5) * 0.1]} rotation={[hash(i + 2), hash(i + 3), 0]}>
        <boxGeometry args={[0.14, 0.12, 0.2]} />
      </mesh>
    ))}
    <mesh material={t.iron} position={[-0.8, 0.1, 0]} rotation={[0, 0, 1.2]}>
      <cylinderGeometry args={[0.012, 0.012, 0.35, 4]} />
    </mesh>
  </group>
);

const CeilingTile: React.FC<{ t: Things; on: boolean }> = ({ t, on }) => (
  <group>
    <mesh material={t.tile}>
      <boxGeometry args={[0.6, 0.03, 0.6]} />
    </mesh>
    {[-0.1, 0.1].map((x) => (
      <mesh key={x} material={on ? t.tubeOn : t.tubeOff} position={[x, 0.025, 0]}>
        <boxGeometry args={[0.06, 0.02, 0.5]} />
      </mesh>
    ))}
  </group>
);

// --- the keeper -------------------------------------------------------------------------------------------------------
// the keeper of the shift: a worker in a light blue coverall, rubber boots, a fly's head
const useKeeperMats = () =>
  useMemo(
    () => ({
      // a little self-light so he never turns into a black cut-out against the dawn
      suit: lam({ color: "#8ab4d8", emissive: "#1c2c3c" }),
      seam: lam({ color: "#6a92b8", emissive: "#121e2a" }),
      boot: lam({ color: "#3a3c3a" }),
      belt: lam({ color: "#4a4a52" }),
      head: lam({ color: "#7a6a5a", emissive: "#1a140e" }),
      eye: lam({ color: "#c43a24", emissive: "#4a0e06" }),
      feeler: lam({ color: "#3a322c" }),
    }),
    [],
  );
const DressedKeeper: React.FC<{ pos: [number, number, number]; yaw: number; scale?: number; look?: number; turn?: number }> = ({ pos, yaw, scale = 1, look = 0, turn = 0 }) => {
  const m = useKeeperMats();
  return (
    <group position={pos} rotation={[0, yaw, 0]} scale={scale}>
      {/* boots and coverall legs */}
      {[-0.1, 0.1].map((x) => (
        <group key={x}>
          <mesh material={m.boot} position={[x, 0.12, 0.02]}>
            <boxGeometry args={[0.13, 0.24, 0.22]} />
          </mesh>
          <mesh material={m.suit} position={[x, 0.55, 0]}>
            <boxGeometry args={[0.15, 0.66, 0.17]} />
          </mesh>
        </group>
      ))}
      {/* body of the coverall: belt, zip, a chest pocket */}
      <mesh material={m.suit} position={[0, 1.1, 0]}>
        <boxGeometry args={[0.42, 0.52, 0.24]} />
      </mesh>
      <mesh material={m.belt} position={[0, 0.88, 0]}>
        <boxGeometry args={[0.43, 0.05, 0.25]} />
      </mesh>
      <mesh material={m.seam} position={[0, 1.1, 0.121]}>
        <boxGeometry args={[0.018, 0.5, 0.005]} />
      </mesh>
      <mesh material={m.seam} position={[-0.11, 1.2, 0.122]}>
        <boxGeometry args={[0.1, 0.09, 0.005]} />
      </mesh>
      <mesh material={m.suit} position={[0, 1.37, 0]}>
        <boxGeometry args={[0.5, 0.08, 0.26]} />
      </mesh>
      {/* sleeves hang down, the hands are lost in the cuffs */}
      {[-0.27, 0.27].map((x) => (
        <group key={`a${x}`}>
          <mesh material={m.suit} position={[x, 1.08, 0.01]} rotation={[0, 0, x > 0 ? 0.07 : -0.07]}>
            <boxGeometry args={[0.11, 0.56, 0.12]} />
          </mesh>
          <mesh material={m.head} position={[x * 1.07, 0.77, 0.01]}>
            <boxGeometry args={[0.07, 0.07, 0.07]} />
          </mesh>
        </group>
      ))}
      <mesh material={m.seam} position={[0, 1.43, 0]}>
        <cylinderGeometry args={[0.1, 0.13, 0.06, 7]} />
      </mesh>
      <group position={[0, 1.57, 0.02]} rotation={[look, turn, 0]}>
        <mesh material={m.head} scale={[1, 1, 1.1]}>
          <dodecahedronGeometry args={[0.13]} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} material={m.eye} position={[side * 0.09, 0.02, 0.07]} scale={[1, 1.15, 0.9]}>
            <icosahedronGeometry args={[0.08, 0]} />
          </mesh>
        ))}
        {[-1, 1].map((side) => (
          <mesh key={`f${side}`} material={m.feeler} position={[side * 0.04, 0.17, 0.04]} rotation={[-0.4, 0, -side * 0.35]}>
            <boxGeometry args={[0.015, 0.14, 0.015]} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// the senior of the shift: a red and white lighthouse on its headland, the god's brain in the lantern
const useBeaconMats = () =>
  useMemo(
    () => ({
      red: lam({ color: "#b8382e" }),
      white: lam({ color: "#e4e0dc" }),
      iron: lam({ color: "#2a2c34" }),
      glass: flat({ color: "#2a2c34", transparent: true, opacity: 0.5, depthWrite: false }),
      glow: flat({ color: "#ffe9a0", transparent: true, opacity: 0.35, depthWrite: false }),
    }),
    [],
  );
const BANDS = 6;
const Beacon: React.FC<{ mats: Mats; s: number; on?: number }> = ({ mats, s, on = 1 }) => {
  const m = useBeaconMats();
  m.glow.opacity = 0.35 * on;
  return (
    <group position={[-3.2, 0, -10]}>
      <mesh material={mats.rock} position={[0, 1.2, 0]} scale={[7, 2.6, 5]}>
        <dodecahedronGeometry args={[0.6, 0]} />
      </mesh>
      {Array.from({ length: BANDS }).map((_, i) => {
        const h = 4.2 / BANDS;
        const r0 = 0.55 - (0.17 * i) / BANDS;
        const r1 = 0.55 - (0.17 * (i + 1)) / BANDS;
        return (
          <mesh key={i} material={i % 2 ? m.white : m.red} position={[0, 2.5 + h * (i + 0.5), 0]}>
            <cylinderGeometry args={[r1, r0, h, 8]} />
          </mesh>
        );
      })}
      <mesh material={m.iron} position={[0, 6.8, 0]}>
        <cylinderGeometry args={[0.62, 0.62, 0.12, 8]} />
      </mesh>
      <mesh material={m.glass} position={[0, 7.15, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.55, 8, 1, true]} />
      </mesh>
      <Connectome s={s} k={0.15 + 0.85 * on} pos={[0, 7.15, 0]} scale={0.12} />
      <mesh material={m.red} position={[0, 7.65, 0]}>
        <coneGeometry args={[0.5, 0.5, 8]} />
      </mesh>
      <mesh material={m.glow} position={[0, 7.15, -0.5]}>
        <circleGeometry args={[1.4, 10]} />
      </mesh>
      {on > 0 && <pointLight position={[0, 7.2, 1.2]} intensity={6 * on} distance={14} color="#ffe2a0" />}
    </group>
  );
};

// --- his face --------------------------------------------------------------------------------------------------------
// the grin laid onto the curve of an empty mask: a dark strip and two rows of teeth sitting on the surface
const MW = 0.5;
const mUp = (u: number) => -0.34 + 0.12 * u * u;
const mLow = (u: number) => -0.58 + 0.2 * u * u;
const onMask = (x: number, y: number, lift: number) => surfaceZ(x, y) + lift;
const MaskGrin: React.FC<{ cm: CastMats }> = ({ cm }) => {
  const geo = useMemo(() => {
    const N = 12;
    const p: number[] = [];
    for (let i = 0; i < N; i++) {
      const [u0, u1] = [-1 + (2 * i) / N, -1 + (2 * (i + 1)) / N];
      const a = [u0 * MW, mUp(u0)];
      const b = [u1 * MW, mUp(u1)];
      const c = [u1 * MW, mLow(u1)];
      const d = [u0 * MW, mLow(u0)];
      for (const [x, y] of [a, d, b, b, d, c]) p.push(x, y, onMask(x, y, 0.012));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.computeVertexNormals();
    return g;
  }, []);
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
        const y = mLow(u) + 0.045;
        return (
          <mesh key={`l${i}`} material={cm.teeth} position={[x, y, onMask(x, y, 0.03)]} rotation={[0.4, u * 0.9, 0.25 * u]}>
            <boxGeometry args={[0.07, 0.08 - Math.abs(u) * 0.02, 0.035]} />
          </mesh>
        );
      })}
    </group>
  );
};

// an empty mask from ep4, but with his grin, his compound eyes in the holes and two antennae
const VozMask: React.FC<{ mats: Mats; cm: CastMats; pos: [number, number, number]; scale: number; eyes: boolean; lift?: number; rot?: [number, number, number] }> = ({
  mats,
  cm,
  pos,
  scale,
  eyes,
  lift = 0,
  rot,
}) => {
  return (
    <Mask mats={mats} pos={pos} scale={scale} rot={rot}>
      <MaskGrin cm={cm} />
      {eyes && <FlyEyes cm={cm} />}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.16, 0.8, 0.15]} rotation={[0.1 + lift, 0, -side * 0.35]}>
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

// his compound eyes, sitting in the eye holes of any mask
const FlyEyes: React.FC<{ cm: CastMats }> = ({ cm }) => {
  const eyeGeo = useEyeGeo();
  return (
    <>
      {EYES.map(([x, y], i) => (
        <mesh key={i} geometry={eyeGeo} material={cm.eye} position={[x, y, surfaceZ(x, y) - 0.02]} scale={[0.17, 0.13, 0.12]} />
      ))}
    </>
  );
};

// a backrooms ceiling where the sky should be: tiles and fluorescent panels, fading in and out
const CeilingSky: React.FC<{ k: number; lit?: number }> = ({ k, lit = 1 }) => {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: rep(tiles(), 10, 10), transparent: true, opacity: 0, depthWrite: false, fog: false, side: THREE.DoubleSide }), []);
  mat.opacity = k;
  mat.color.setScalar(0.35 + 0.65 * lit);
  return (
    <mesh material={mat} position={[0, 7, -2]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[40, 40]} />
    </mesh>
  );
};

// a few ordinary empty faces around a point; with `eyes` they have caught his eyes
const Around: React.FC<{ mats: Mats; n: number; r: number; at?: [number, number]; eyes?: CastMats }> = ({ mats, n, r, at = [0, 0], eyes }) => (
  <>
    {Array.from({ length: n }).map((_, i) => {
      const a = (i / n) * Math.PI * 2 + 0.4;
      return (
        <Mask
          key={i}
          mats={mats}
          pos={[at[0] + Math.cos(a) * r * (0.9 + hash(i) * 0.3), 0.02, at[1] + Math.sin(a) * r * (0.9 + hash(i + 2) * 0.3)]}
          rot={[-Math.PI / 2, 0, (hash(i + 4) - 0.5) * 1.2]}
          scale={0.26}
        >
          {eyes && <FlyEyes cm={eyes} />}
        </Mask>
      );
    })}
  </>
);

// --- the master shot ---------------------------------------------------------------------------------------------------
// the same frame three times: at first light the beach is bare; then everything the air took is lying on it and the
// keeper drags it to his crates; three months later the patch has come in and the faces cover it
const MASK_FIELD = (() => {
  const out: { x: number; z: number; yaw: number; s: number }[] = [];
  for (let i = 0; i < 320; i++) {
    const x = (hash(i * 3 + 7) - 0.5) * 16 - 1;
    const z = -3.4 + hash(i * 5 + 9) * 7.6;
    out.push({ x, z, yaw: (hash(i * 13 + 1) - 0.5) * 1.2, s: 0.24 + hash(i * 17 + 3) * 0.06 });
  }
  return out;
})();

const Master: React.FC<{ mats: Mats; t: Things; signs: Signs; s: number; stage: 0 | 1 | 2 }> = ({ mats, t, signs, s, stage }) => {
  return (
    <>
      <Shore mats={mats} s={s} edge={-4.2} width={40} amp={0.07} />
      <Cliffs mats={mats} />
      <Beacon mats={mats} s={s} />
      {/* the sun is a rim on the sea at first, a little higher three months later */}
      <mesh material={mats.sunDisc} position={[9, stage === 0 ? -1.6 : stage === 1 ? -1.0 : -0.6, -44]}>
        <circleGeometry args={[2.4, 12]} />
      </mesh>
      <mesh material={mats.sunGlow} position={[9, -0.6, -44.5]}>
        <circleGeometry args={[5, 12]} />
      </mesh>
      {stage >= 1 && (
        <>
          {/* the crates, up the beach */}
          {[0, 1, 2].map((i) => (
            <group key={i} position={[2.6 + i * 0.25, 0, 1.6 - i * 1.7]} rotation={[0, 0.2, 0]} scale={0.7}>
              <Crate mats={mats} w={1.5} d={2.4} h={0.8} />
            </group>
          ))}
          <group position={[-1.6, 0.04, -2.6]} rotation={[-Math.PI / 2, 0, 0.5]}>
            <WindowFrame t={t} w={0.9} h={1.1} />
          </group>
          <group position={[-0.4, 0, -3.9]} rotation={[0, 0.3, 0]}>
            <Armchair t={t} />
          </group>
          <group position={[-3.0, 0.05, -1.4]} rotation={[0.35, 0.8, 0.1]}>
            <BusSeat t={t} />
          </group>
          <mesh material={signs.exitOn} position={[0.4, 0.03, -1.2]} rotation={[-Math.PI / 2, 0, 0.3]}>
            <planeGeometry args={[0.5, 0.17]} />
          </mesh>
        </>
      )}
      {stage === 1 && (
        <>
          <DressedKeeper pos={[1.9, 0, 0.3]} yaw={-0.9} scale={1.05} look={0.35} />
          {/* the yellow side of a bus, laid down by the crates */}
          <group position={[1.3, 0.03, 1.3]} rotation={[-Math.PI / 2, 0, 0.4]}>
            <mesh material={t.busYellow}>
              <boxGeometry args={[1.1, 0.75, 0.04]} />
            </mesh>
            <mesh material={t.busStripe} position={[0, -0.15, 0.025]}>
              <boxGeometry args={[1.1, 0.08, 0.01]} />
            </mesh>
          </group>
        </>
      )}
      {stage === 2 && (
        <>
          <MaskField mats={mats} items={MASK_FIELD} />
          <DressedKeeper pos={[1.4, 0, -1.6]} yaw={-0.4} scale={1.05} look={0.5} />
        </>
      )}
    </>
  );
};

// --- scenes ---------------------------------------------------------------------------------------------------------
const VozWorld: React.FC<{ id: VozScene }> = ({ id }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // PS1 animation steps at 15 fps
  const s = Math.floor(frame / 2) * (2 / fps);
  const mats = useMats(DAWN);
  // the crates stand against the sun: a little self-light keeps them from going black (this canvas only)
  (mats.wood as THREE.MeshLambertMaterial).emissive.set("#3a3a24");
  (mats.woodDark as THREE.MeshLambertMaterial).emissive.set("#26261a");
  const cm = useCastMats();
  const t = useThings();
  const ready = useFontReady();
  const { camera } = useThree();
  (camera as THREE.PerspectiveCamera).far = 160;
  const move = CAMS[id];
  const k = move.to ? ease(s / (move.dur ?? 3)) : 0;
  if (!ready) return null;
  return (
    <>
      <color attach="background" args={[DAWN.fog]} />
      <fog attach="fog" args={[DAWN.fog, 18, 80]} />
      <CameraRig from={move.from} to={move.to ?? move.from} t={k} />
      <hemisphereLight args={[DAWN.hemi[0], DAWN.hemi[1], 2.2]} />
      <directionalLight position={[8, 4, -10]} intensity={2.0} color={DAWN.sun} />
      <directionalLight position={[-3, 5, 6]} intensity={0.6} color="#c8c0e0" />
      <ambientLight intensity={0.6} />
      <Scene id={id} s={s} mats={mats} cm={cm} t={t} />
    </>
  );
};

const Scene: React.FC<{ id: VozScene; s: number; mats: Mats; cm: CastMats; t: Things }> = ({ id, s, mats, cm, t }) => {
  const signs = useSigns();
  switch (id) {
    case "black":
      return null;
    case "shoreMain":
      return <Master mats={mats} t={t} signs={signs} s={s} stage={0} />;
    case "shoreKeeper":
      return <Master mats={mats} t={t} signs={signs} s={s} stage={1} />;
    case "shoreMasks":
      return <Master mats={mats} t={t} signs={signs} s={s} stage={2} />;

    case "wallChunk":
      return (
        <>
          <Shore mats={mats} s={s} edge={-1.2} reach={1.0} period={3.6} phase={1.2} grain={48} />
          <group position={[0, 0.2, -0.2]} rotation={[-1.05, 0.35, 0.12]}>
            <WallChunk t={t} signs={signs} />
          </group>
        </>
      );

    case "flipPage": {
      // the page is plastered to a rock; one loose corner lifts in the wind and drops
      const lift = steps(Math.max(0, Math.sin(s * 2.6)), 3) * 0.5;
      return (
        <>
          <Shore mats={mats} s={s} edge={-2.5} reach={1.2} period={4.6} grain={48} />
          <mesh material={t.rock} position={[0, 0.3, -0.2]} scale={[1.1, 0.75, 0.9]}>
            <dodecahedronGeometry args={[0.55, 0]} />
          </mesh>
          <mesh material={signs.page} position={[0, 0.52, 0.2]} rotation={[-0.55, 0.05, 0.04]}>
            <planeGeometry args={[0.52, 0.65]} />
          </mesh>
          <group position={[0.26, 0.78, 0.04]} rotation={[-0.55 - lift, 0.05, 0.04]}>
            <mesh material={t.tile} position={[-0.06, 0.05, 0.002]} rotation={[0, 0, 0.3]}>
              <planeGeometry args={[0.12, 0.1]} />
            </mesh>
          </group>
        </>
      );
    }

    case "frameSurf": {
      // the frame floats flat on the swell, rising and tipping with the water under it
      const y = seaY(0, -0.4, s, 0.09);
      const dz = seaY(0, 0.0, s, 0.09) - seaY(0, -0.8, s, 0.09);
      const dx = seaY(0.4, -0.4, s, 0.09) - seaY(-0.4, -0.4, s, 0.09);
      return (
        <>
          <Sky look={DAWN} />
          <Sea mats={mats} s={s} from={-45} to={6} amp={0.09} />
          <mesh material={mats.sunDisc} position={[2.5, -0.4, -44]}>
            <circleGeometry args={[2.0, 12]} />
          </mesh>
          <group position={[0.05, y + 0.03, -0.4]} rotation={[-Math.PI / 2 + dz * 1.1, 0, 0.35 - dx * 1.1]}>
            <WindowFrame t={t} w={0.9} h={1.1} />
          </group>
        </>
      );
    }

    case "armchair":
      return (
        <>
          <Shore mats={mats} s={s} edge={-1.4} reach={1.6} period={4.8} width={40} amp={0.06} />
          <Beacon mats={mats} s={s} />
          <group position={[0.55, 0, -0.5]} rotation={[0, -0.15, 0]}>
            <Armchair t={t} />
          </group>
          <mesh material={mats.sunDisc} position={[6, -1.0, -44]}>
            <circleGeometry args={[2.2, 12]} />
          </mesh>
        </>
      );

    case "doorway":
      // a piece of a room's wall stands on the beach with its door in it; through the door, the sea
      return (
        <>
          <Shore mats={mats} s={s} edge={-6} reach={1.4} period={5.0} width={40} amp={0.07} />
          <group position={[0, 0, -1.6]}>
            {[
              [-0.85, 1.25, 1.1, 2.5],
              [0.85, 1.25, 1.1, 2.5],
              [0, 2.3, 0.6, 0.4],
            ].map(([x, y, w, h], i) => (
              <group key={i} position={[x, y, 0]}>
                <mesh material={t.concrete}>
                  <boxGeometry args={[w, h, 0.18]} />
                </mesh>
                <mesh material={t.wallpaper} position={[0, 0, 0.092]}>
                  <planeGeometry args={[w, h]} />
                </mesh>
              </group>
            ))}
          </group>
          {Array.from({ length: 16 }).map((_, i) => {
            const q = (s * (0.5 + hash(i) * 0.6) + hash(i + 3)) % 1;
            return (
              <mesh key={i} material={t.grain} position={[-2.5 + q * 5, 0.05 + hash(i + 5) * 0.25, -0.5 + hash(i + 7) * 1.5]}>
                <boxGeometry args={[0.015, 0.015, 0.015]} />
              </mesh>
            );
          })}
        </>
      );

    case "busSeat":
      return (
        <>
          <Shore mats={mats} s={s} edge={-3} reach={1.2} period={4.4} grain={48} />
          <group position={[0, 0.12, -0.2]} rotation={[0.45, 0.5, 0.2]}>
            <BusSeat t={t} />
          </group>
          {/* the handrail it was bolted to, stuck in the sand at an angle */}
          <mesh material={t.chrome} position={[-0.55, 0.5, -0.5]} rotation={[0.2, 0, 0.35]}>
            <cylinderGeometry args={[0.02, 0.02, 1.2, 5]} />
          </mesh>
        </>
      );

    case "exitSign": {
      // the sign lies in the wash; it still glows, and drowns for a moment under every wave
      return (
        <>
          <Shore mats={mats} s={s} edge={-1.3} phase={0.6} grain={48} />
          <group position={[0, 0.03, -0.05]} rotation={[-Math.PI / 2 + 0.08, 0, 0.18]}>
            <mesh material={t.iron} position={[0, 0, -0.02]}>
              <boxGeometry args={[0.56, 0.2, 0.04]} />
            </mesh>
            <mesh material={Math.floor(s * 7) % 9 === 0 ? signs.exitDim : signs.exitOn} position={[0, 0, 0.002]}>
              <planeGeometry args={[0.5, 0.16]} />
            </mesh>
          </group>
        </>
      );
    }

    case "ceilingTile": {
      // a piece of an office ceiling floats in the shallows; its tubes flicker with the hum
      const OFF: [number, number][] = [
        [1.1, 1.18],
        [1.3, 1.34],
        [3.2, 3.5],
        [4.4, 4.45],
        [4.52, 4.6],
      ];
      const on = !OFF.some(([a, b]) => s >= a && s < b);
      const y = seaY(0, 0, s, 0.05);
      return (
        <>
          <Sky look={DAWN} />
          <Sea mats={mats} s={s} from={-45} to={6} amp={0.05} />
          <group position={[0, y + 0.02, 0]} rotation={[seaY(0, 0.3, s, 0.05) - seaY(0, -0.3, s, 0.05), 0.5, 0]}>
            <CeilingTile t={t} on={on} />
          </group>
          {on && <pointLight position={[0, 0.3, 0]} intensity={1.5} distance={1.5} color="#fffbe8" />}
        </>
      );
    }

    case "slipper": {
      // one slipper afloat, turning slowly on the swell
      const y = seaY(0, 0, s, 0.05);
      return (
        <>
          <Sky look={DAWN} />
          <Sea mats={mats} s={s} from={-45} to={6} amp={0.05} />
          <group position={[0, y + 0.0, -0.4]} rotation={[seaY(0, 0.2, s, 0.05) - seaY(0, -0.2, s, 0.05), 0.4 + s * 0.08, 0]}>
            <group scale={1.5}>
              <Slipper t={t} />
            </group>
          </group>
        </>
      );
    }

    case "faceTop":
    case "faceOpen":
      return (
        <>
          <Sand look={DAWN} size={6} rep={10} />
          <Around mats={mats} n={5} r={0.95} />
          {/* the eyes are simply there, from one frame to the next */}
          <VozMask mats={mats} cm={cm} pos={[0, 0.03, 0.02]} scale={0.42} eyes={id === "faceOpen" && s >= 0.5} lift={id === "faceOpen" && s >= 0.5 ? 0.25 : 0} />
        </>
      );

    case "faceStill":
      return (
        <>
          <Sand look={DAWN} size={6} rep={10} />
          <Around mats={mats} n={4} r={0.8} />
          <VozMask mats={mats} cm={cm} pos={[0, 0.03, 0.02]} scale={0.42} eyes lift={0.25} />
          {/* the face does not move; only the grains at its mouth tremble while it talks */}
          {Array.from({ length: 12 }).map((_, i) => {
            const shake = s < 2.6 ? (Math.floor(s * 15 + i) % 2) * 0.006 * (0.5 + hash(i)) : 0;
            const a = (i / 12) * Math.PI * 2;
            return (
              <mesh key={i} material={t.grain} position={[Math.cos(a) * 0.15 * (0.6 + hash(i)), 0.035 + shake, 0.23 + Math.sin(a) * 0.05]}>
                <boxGeometry args={[0.012, 0.012, 0.012]} />
              </mesh>
            );
          })}
        </>
      );

    case "keeperCeil":
      return (
        <>
          <Sky look={DAWN} />
          <Sand look={DAWN} size={20} rep={10} />
          <pointLight position={[0, 0.3, 0.2]} intensity={3} distance={4} color="#c8b0d8" />
          {/* on «в голове» the keeper straightens and looks up: for a moment the sky is a ceiling */}
          <DressedKeeper pos={[0, 0, -1.3]} yaw={0} scale={1.25} look={interpolate(steps(interpolate(s, [0.6, 1.4], [0, 1], clamp), 3), [0, 1], [0.6, -0.5])} />
          <CeilingSky k={steps(interpolate(s, [0.1, 0.7, 1.4, 2.1], [0, 0.85, 0.85, 0], clamp), 5)} />
        </>
      );

    case "keeperBack":
      return (
        <>
          <Shore mats={mats} s={s} edge={-4.5} width={60} amp={0.08} />
          <Beacon mats={mats} s={s} />
          {/* he stands over the face; once, he turns his head to the lighthouse */}
          <DressedKeeper pos={[0.15, 0, 0.9]} yaw={-2.2} scale={1.1} look={s < 1.0 ? 0.55 : 0.05} turn={s < 1.0 ? 0 : -0.55} />
          <VozMask mats={mats} cm={cm} pos={[-0.3, 0.03, 0.4]} rot={[-Math.PI / 2, 0, -0.6]} scale={0.3} eyes lift={0.25} />
          <Around mats={mats} n={6} r={1.6} at={[-0.3, 0.4]} />
        </>
      );

    case "beaconBlink":
      // the senior of the shift hears it, and blinks once, slowly, like an eye
      return (
        <>
          <Shore mats={mats} s={s} edge={-4.5} width={60} amp={0.08} />
          <Beacon mats={mats} s={s} on={interpolate(s, [1.0, 1.45, 1.75, 2.2], [1, 0, 0, 1], clamp)} />
          <Around mats={mats} n={7} r={1.8} at={[0.2, -0.6]} />
        </>
      );

    case "grinSpread":
      // his face among the empty ones; one cut later, every face around looks out with his eyes
      return (
        <>
          <Sand look={DAWN} size={8} rep={14} />
          <Around mats={mats} n={7} r={0.95} eyes={s >= 1.4 ? cm : undefined} />
          <Around mats={mats} n={11} r={1.75} eyes={s >= 1.4 ? cm : undefined} />
          <VozMask mats={mats} cm={cm} pos={[0, 0.03, 0.02]} scale={0.42} eyes lift={0.25} />
        </>
      );

    case "ceilingUs": {
      // the sky turns into a ceiling and stays; the tubes flicker with the hum, then everything goes out
      const OFF: [number, number][] = [
        [1.9, 1.98],
        [2.1, 2.14],
        [4.0, 4.3],
      ];
      const lit = OFF.some(([a, b]) => s >= a && s < b) ? 0 : 1;
      return (
        <>
          <Sky look={DAWN} />
          <Sand look={DAWN} size={20} rep={10} />
          <CeilingSky k={steps(interpolate(s, [0.3, 1.6], [0, 1], clamp), 6)} lit={lit} />
        </>
      );
    }
  }
};

export const VozScene3D: React.FC<{ id: VozScene }> = ({ id }) => (
  <Ps1Canvas>
    <VozWorld id={id} />
  </Ps1Canvas>
);
