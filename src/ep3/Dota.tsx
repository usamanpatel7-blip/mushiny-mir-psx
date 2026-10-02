import { useThree } from "@react-three/fiber";
import React, { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { IH, IW } from "../ps1kit";
import {
  CAMP_A,
  CAMP_B,
  CAMS3,
  CREEPS_PER_WAVE,
  ENEMIES,
  HALF,
  PATH_FOREST,
  PATH_OUT,
  PIT,
  PITCH,
  RIVER_W,
  TOWERS,
  WAVES,
  baseDist,
  creepPose,
  groundY,
  heroPose,
  laneDist,
  pathDist,
  riverDist,
  visionCircles,
  vnoise,
  type EnemyKind,
  type HeroPose,
  type P,
  type Side,
} from "./dotaPlan";
import { FOW, VISION_SLOTS, clamp, ease, flatD, hash, lamD, textTexture } from "./mat";
import { FPS, type DotaScene } from "./script";

// Dusk palette: desaturated ground, dark forest, glow only on effects, creeps and crystals.
const COL = {
  bg: "#1c2230",
  hpAlly: "#5ade4a",
  hpEnemy: "#e8483a",
  hpBack: "#1e2330",
};

// lens shift: the ground target sits above the frame centre, clear of the HUD bar and subtitles
const SHIFT = 80;
// the hero is drawn larger than life so he reads on a phone
const HERO_SIZE = 1.45;

const DotaCam: React.FC<{ target: P; dist: number }> = ({ target, dist }) => {
  const { camera } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const [tx, tz] = target;
  const fullH = IH + SHIFT * 2;
  cam.position.set(tx, dist * Math.sin(PITCH), tz + dist * Math.cos(PITCH));
  cam.lookAt(tx, 0, tz);
  cam.fov = (2 * Math.atan(Math.tan((31 * Math.PI) / 180) * (fullH / IH)) * 180) / Math.PI;
  cam.aspect = IW / fullH;
  cam.near = 0.5;
  cam.far = 220;
  cam.setViewOffset(IW, fullH, 0, SHIFT * 2, IW, IH);
  cam.updateProjectionMatrix();
  return null;
};

// --- procedural ground texture: noise grass, dirt lanes, ash, stone plazas, river bed ---------------------
type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const G = { g1: hex("#3c5a32"), g2: hex("#52703c"), g3: hex("#648446"), gd: hex("#304a30") };
const A = { a1: hex("#443a3e"), a2: hex("#564646"), ember: hex("#9a4226"), speck: hex("#665654") };
const D = { d1: hex("#5e4e3a"), d2: hex("#72604a"), peb: hex("#8e7e66"), dd1: hex("#4e4040"), dd2: hex("#5e4c48") };
const W = { bed: hex("#2c4046"), bed2: hex("#38525a"), stone: hex("#56666a"), bank: hex("#4a4838") };
const S = { r1: hex("#6c6a60"), r2: hex("#7c786a"), rl: hex("#46443e"), d1: hex("#4a4046"), d2: hex("#564a50"), dl: hex("#302a30") };

let GROUND: HTMLCanvasElement | null = null;
const groundCanvas = () => {
  if (GROUND) return GROUND;
  const N = 1024;
  const c = document.createElement("canvas");
  c.width = N;
  c.height = N;
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  const img = ctx.createImageData(N, N);
  const px = img.data;
  const step = (2 * HALF) / N;
  for (let py = 0; py < N; py++) {
    for (let qx = 0; qx < N; qx++) {
      const x = -HALF + (qx + 0.5) * step;
      const z = -HALF + (py + 0.5) * step;
      const n1 = vnoise(x * 0.8, z * 0.8);
      const n2 = vnoise(x * 3.3 + 9, z * 3.3 + 4);
      const n3 = hash(qx * 1.37 + py * 91.3);
      const rad = z - x + (n1 - 0.5) * 1.2 > 0;
      let col: RGB;
      if (rad) {
        col = mix(G.g1, G.g2, Math.min(1, n1 * 0.7 + n2 * 0.5));
        if (n3 > 0.94) col = G.g3;
        else if (n3 < 0.06) col = G.gd;
      } else {
        col = mix(A.a1, A.a2, Math.min(1, n1 * 0.6 + n2 * 0.5));
        if (Math.abs(vnoise(x * 0.6 + 30, z * 0.6) - 0.5) < 0.012) col = A.ember;
        else if (n3 > 0.95) col = A.speck;
      }
      // lanes: worn dirt with pebbles, frayed edges
      const ld = laneDist(x, z) + (n2 - 0.5) * 0.5;
      if (ld < 1.7) {
        const dirt = rad ? mix(D.d1, D.d2, n2) : mix(D.dd1, D.dd2, n2);
        const d2 = n3 > 0.9 ? mix(dirt, D.peb, 0.6) : dirt;
        col = ld < 1.2 ? d2 : mix(d2, col, (ld - 1.2) / 0.5);
      }
      // river bed and muddy banks
      const rd = riverDist(x, z) + (n1 - 0.5) * 0.5;
      if (rd < 2.6) {
        const bed = n3 > 0.88 ? W.stone : mix(W.bed, W.bed2, n2);
        col = rd < 1.9 ? bed : mix(W.bank, col, (rd - 1.9) / 0.7);
      }
      // stone plazas of both bases
      if (baseDist(x, z) < 6.4) {
        const dire = x > 0;
        const tx = x / 1.3;
        const tz = z / 1.3;
        const grout = tx - Math.floor(tx) < 0.08 || tz - Math.floor(tz) < 0.08;
        const tint = hash(Math.floor(tx) * 7.1 + Math.floor(tz) * 13.3);
        col = grout ? (dire ? S.dl : S.rl) : dire ? mix(S.d1, S.d2, tint) : mix(S.r1, S.r2, tint);
      }
      // the pit floor: dark flagstones in rings
      const pd = Math.hypot(x - PIT[0], z - PIT[1]);
      if (pd < 2.9) col = Math.abs(pd - 1.5) < 0.06 || Math.abs(pd - 2.5) < 0.06 ? S.dl : mix(S.d1, S.d2, n2);
      const o = (py * N + qx) * 4;
      px[o] = col[0];
      px[o + 1] = col[1];
      px[o + 2] = col[2];
      px[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  GROUND = c;
  return c;
};

const Terrain: React.FC = () => {
  const { geo, mat, apron, water } = useMemo(() => {
    const g = new THREE.PlaneGeometry(2 * HALF, 2 * HALF, 128, 128);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, groundY(pos.getX(i), pos.getZ(i)));
    g.computeVertexNormals();
    const tex = new THREE.CanvasTexture(groundCanvas());
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestMipmapNearestFilter;
    tex.generateMipmaps = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    return {
      geo: g,
      mat: lamD({ map: tex, flatShading: false }),
      apron: lamD({ color: "#262a2e" }),
      water: flatD({ color: "#3a6c7a", transparent: true, opacity: 0.62, depthWrite: false }),
    };
  }, []);
  const L = (HALF - 1) * 2 * Math.SQRT2;
  return (
    <group>
      <mesh material={apron} position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[240, 240]} />
      </mesh>
      <mesh geometry={geo} material={mat} receiveShadow />
      <group rotation={[0, -Math.PI / 4, 0]}>
        <mesh material={water} position={[0, -0.24, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[L, RIVER_W + 0.4]} />
        </mesh>
      </group>
    </group>
  );
};

// --- trees: dense multi-tone; broadleaf and pines on the green side, dead jagged spikes on the red side ------
type Tree = { x: number; y: number; z: number; s: number; r: number; side: Side; c: number; kind: number };
let TREES: Tree[] | null = null;
const trees = () => {
  if (TREES) return TREES;
  const out: Tree[] = [];
  const step = 1.08;
  let i = 0;
  for (let gx = -HALF + 0.6; gx < HALF - 0.4; gx += step)
    for (let gz = -HALF + 0.6; gz < HALF - 0.4; gz += step) {
      i++;
      const x = gx + (hash(i) - 0.5) * 0.75;
      const z = gz + (hash(i + 999) - 0.5) * 0.75;
      if (Math.abs(x) > HALF - 0.5 || Math.abs(z) > HALF - 0.5) continue;
      if (hash(i + 77) < 0.07) continue;
      if (laneDist(x, z) < 2.1) continue;
      if (riverDist(x, z) < 2.8) continue;
      if (baseDist(x, z) < 7.2) continue;
      if (Math.hypot(x - CAMP_A[0], z - CAMP_A[1]) < 3.4) continue;
      if (Math.hypot(x - CAMP_B[0], z - CAMP_B[1]) < 4.0) continue;
      if (Math.hypot(x - PIT[0], z - PIT[1]) < 3.8) continue;
      if (TOWERS.some((t) => Math.hypot(x - t.p[0], z - t.p[1]) < 1.5)) continue;
      if (pathDist(x, z, PATH_FOREST) < 0.95 || pathDist(x, z, PATH_OUT) < 0.95) continue;
      out.push({ x, y: groundY(x, z), z, s: 0.8 + hash(i + 5) * 0.5, r: hash(i + 6) * 6.28, side: z > x ? "rad" : "dire", c: hash(i + 8), kind: hash(i + 12) < 0.45 ? 1 : 0 });
    }
  TREES = out;
  return out;
};

const Trees: React.FC = () => {
  const meshes = useMemo(() => {
    const d = new THREE.Object3D();
    const all = trees();
    const inst = (geo: THREE.BufferGeometry, color: string, list: Tree[], place: (t: Tree) => void, pal: string[] | null) => {
      const im = new THREE.InstancedMesh(geo, lamD({ color }), list.length);
      list.forEach((t, k) => {
        place(t);
        d.updateMatrix();
        im.setMatrixAt(k, d.matrix);
        if (pal) im.setColorAt(k, new THREE.Color(pal[Math.floor(t.c * pal.length)]));
      });
      im.castShadow = true;
      im.receiveShadow = true;
      return im;
    };
    const set = (t: Tree, y: number, sx: number, sy: number) => {
      d.position.set(t.x, t.y + y * t.s, t.z);
      d.rotation.set(0, t.r, 0);
      d.scale.set(t.s * sx, t.s * sy, t.s * sx);
    };
    const broad = all.filter((t) => t.side === "rad" && t.kind === 0);
    const pine = all.filter((t) => t.side === "rad" && t.kind === 1);
    const dead = all.filter((t) => t.side === "dire");
    const leaf = ["#35552f", "#3f6234", "#4a6e38", "#2f4c36", "#567a3c"];
    const needle = ["#2a4a36", "#32543c", "#3a5c40"];
    const ash = ["#4a3c42", "#563e42", "#4a4248", "#5e423c"];
    return [
      inst(new THREE.CylinderGeometry(0.08, 0.13, 0.9, 5), "#4a3a2c", [...broad, ...pine], (t) => set(t, 0.45, 1, 1), null),
      inst(new THREE.IcosahedronGeometry(0.7, 0), "#ffffff", broad, (t) => set(t, 1.25, 1, 1.05), leaf),
      inst(new THREE.IcosahedronGeometry(0.46, 0), "#ffffff", broad, (t) => set(t, 1.85, 0.9, 1), leaf.slice().reverse()),
      inst(new THREE.ConeGeometry(0.62, 1.4, 6), "#ffffff", pine, (t) => set(t, 1.25, 1, 1), needle),
      inst(new THREE.ConeGeometry(0.45, 1.1, 6), "#ffffff", pine, (t) => set(t, 1.95, 1, 1), needle),
      inst(new THREE.ConeGeometry(0.55, 2.2, 4), "#ffffff", dead, (t) => set(t, 1.1, 1, 1), ash),
      inst(
        new THREE.ConeGeometry(0.3, 1.3, 4),
        "#ffffff",
        dead,
        (t) => {
          set(t, 1.3, 1, 1);
          d.position.x += 0.35 * t.s;
          d.rotation.z = -0.5;
        },
        ash.slice().reverse(),
      ),
    ];
  }, []);
  return (
    <group>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </group>
  );
};

// rocks where the ground is steep and along the river banks
const Rocks: React.FC = () => {
  const mesh = useMemo(() => {
    const list: [number, number, number, number][] = [];
    let i = 0;
    for (let x = -HALF + 1; x < HALF - 1; x += 0.9)
      for (let z = -HALF + 1; z < HALF - 1; z += 0.9) {
        i++;
        const gx = groundY(x + 0.3, z) - groundY(x - 0.3, z);
        const gz = groundY(x, z + 0.3) - groundY(x, z - 0.3);
        const steep = Math.hypot(gx, gz) > 0.55;
        const bank = Math.abs(riverDist(x, z) - 2.4) < 0.35 && hash(i + 3) < 0.35;
        if ((steep && hash(i) < 0.55) || bank) {
          if (laneDist(x, z) < 1.6) continue;
          list.push([x + (hash(i + 1) - 0.5) * 0.5, z + (hash(i + 2) - 0.5) * 0.5, 0.2 + hash(i + 4) * 0.35, hash(i + 5)]);
        }
      }
    const im = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), lamD({ color: "#ffffff" }), list.length);
    const d = new THREE.Object3D();
    const pal = ["#5c5e64", "#6a6a6c", "#4e5058", "#646058"];
    list.forEach(([x, z, s, c], k) => {
      d.position.set(x, groundY(x, z) + s * 0.3, z);
      d.rotation.set(c * 3, c * 7, c * 5);
      d.scale.set(s * 1.2, s * 0.8, s);
      d.updateMatrix();
      im.setMatrixAt(k, d.matrix);
      im.setColorAt(k, new THREE.Color(pal[Math.floor(c * pal.length)]));
    });
    im.castShadow = true;
    im.receiveShadow = true;
    return im;
  }, []);
  return <primitive object={mesh} />;
};

const Tower: React.FC<{ p: P; side: Side }> = ({ p, side }) => {
  const m = useMemo(
    () => ({
      stone: lamD({ color: side === "rad" ? "#8a8676" : "#524852" }),
      trim: lamD({ color: side === "rad" ? "#5a7a4a" : "#6a2e2e" }),
      crystal: flatD({ color: side === "rad" ? "#9affc0" : "#ff5a40" }),
    }),
    [side],
  );
  return (
    <group position={[p[0], groundY(p[0], p[1]), p[1]]}>
      <mesh material={m.stone} position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.75, 0.9, 0.5, 6]} />
      </mesh>
      <mesh material={m.stone} position={[0, 1.3, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.55, 1.9, 6]} />
      </mesh>
      <mesh material={m.trim} position={[0, 2.3, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.42, 0.22, 6]} />
      </mesh>
      {[0, 1, 2, 3].map((k) => (
        <mesh key={k} material={m.trim} position={[Math.cos(k * 1.57) * 0.45, 2.55, Math.sin(k * 1.57) * 0.45]}>
          <coneGeometry args={[0.07, 0.35, 4]} />
        </mesh>
      ))}
      <mesh material={m.crystal} position={[0, 2.85, 0]} scale={[1, 1.6, 1]}>
        <octahedronGeometry args={[0.3]} />
      </mesh>
    </group>
  );
};

const Ancients: React.FC = () => {
  const m = useMemo(
    () => ({
      pale: lamD({ color: "#b8c8bc" }),
      leaf: lamD({ color: "#8ad8c0", emissive: "#1e4a40" }),
      glow: flatD({ color: "#dafff0" }),
      dark: lamD({ color: "#3e3444" }),
      darker: lamD({ color: "#342c3a" }),
      core: flatD({ color: "#ff5a3a" }),
      hutR: lamD({ color: "#8a8676" }),
      roofR: lamD({ color: "#3e6a3a" }),
      hutD: lamD({ color: "#4a4050" }),
      roofD: lamD({ color: "#7a2e2e" }),
    }),
    [],
  );
  const yR = groundY(-19.6, 19.6);
  const yD = groundY(19.6, -19.6);
  return (
    <group>
      <group position={[-19.6, yR, 19.6]}>
        <mesh material={m.pale} position={[0, 1.6, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.8, 3.2, 6]} />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} material={m.leaf} position={[Math.cos(i * 1.05) * 1.3, 3.6 + (i % 2) * 0.6, Math.sin(i * 1.05) * 1.3]} scale={[1, 1.4, 1]} castShadow>
            <octahedronGeometry args={[0.9]} />
          </mesh>
        ))}
        <mesh material={m.glow} position={[0, 4.4, 0]} scale={[1, 1.8, 1]}>
          <octahedronGeometry args={[0.7]} />
        </mesh>
      </group>
      <group position={[19.6, yD, -19.6]}>
        <mesh material={m.dark} position={[0, 3, 0]} castShadow>
          <coneGeometry args={[1.5, 6, 5]} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={i}
            material={m.darker}
            position={[Math.cos(i * 1.26) * 1.4, 1.5, Math.sin(i * 1.26) * 1.4]}
            rotation={[Math.sin(i * 1.26) * 0.5, 0, -Math.cos(i * 1.26) * 0.5]}
            castShadow
          >
            <coneGeometry args={[0.5, 3, 4]} />
          </mesh>
        ))}
        <mesh material={m.core} position={[0, 2.4, 1.2]}>
          <octahedronGeometry args={[0.45]} />
        </mesh>
      </group>
      {(
        [
          [-14.2, 16.4, 0],
          [-16.4, 14.2, 0],
          [-13.4, 13.4, 0],
          [14.2, -16.4, 1],
          [16.4, -14.2, 1],
          [13.4, -13.4, 1],
        ] as [number, number, number][]
      ).map(([x, z, dire], i) => (
        <group key={i} position={[x, groundY(x, z), z]}>
          <mesh material={dire ? m.hutD : m.hutR} position={[0, 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.4, 1, 1.4]} />
          </mesh>
          <mesh material={dire ? m.roofD : m.roofR} position={[0, 1.4, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[1.15, dire ? 1.1 : 0.8, 4]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const PitWalls: React.FC = () => {
  const mat = useMemo(() => lamD({ color: "#6a6670" }), []);
  const y = groundY(PIT[0], PIT[1]);
  return (
    <group position={[PIT[0], y, PIT[1]]}>
      {Array.from({ length: 14 }).map((_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const open = Math.abs(Math.atan2(Math.sin(a - (3 * Math.PI) / 4), Math.cos(a - (3 * Math.PI) / 4))) < 0.5;
        if (open) return null;
        return (
          <mesh key={i} material={mat} position={[Math.cos(a) * 3.1, 0.5, Math.sin(a) * 3.1]} rotation={[0, -a, hash(i) * 0.2]} castShadow receiveShadow>
            <boxGeometry args={[0.8, 1.1 + hash(i) * 0.6, 1.4]} />
          </mesh>
        );
      })}
    </group>
  );
};

// everything that never moves; memoised so it is not rebuilt each frame
const MapStatic: React.FC = React.memo(function MapStatic() {
  return (
    <group>
      <Terrain />
      <PitWalls />
      {TOWERS.map((t, i) => (
        <Tower key={i} p={t.p} side={t.side} />
      ))}
      <Ancients />
      <Trees />
      <Rocks />
    </group>
  );
});

// soft light dashes drifting down the river
const Shimmer: React.FC<{ s: number }> = ({ s }) => {
  const mat = useMemo(() => flatD({ color: "#8ab8c8", transparent: true, opacity: 0.7 }), []);
  const L = (HALF - 3) * 2 * Math.SQRT2;
  return (
    <group rotation={[0, -Math.PI / 4, 0]}>
      {Array.from({ length: 30 }).map((_, i) => {
        const u = ((hash(i) * L + s * 0.7) % L) - L / 2;
        return (
          <mesh key={i} material={mat} position={[u, -0.22, (hash(i + 40) - 0.5) * (RIVER_W - 0.8)]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.6, 0.06]} />
          </mesh>
        );
      })}
    </group>
  );
};

// health bar facing the fixed camera
const Bar: React.FC<{ y: number; w: number; frac: number; color: string }> = ({ y, w, frac, color }) => {
  const m = useMemo(() => ({ back: flatD({ color: COL.hpBack }), fill: flatD({ color }) }), [color]);
  const h = w * 0.13;
  return (
    <group position={[0, y, 0]} rotation={[-PITCH, 0, 0]}>
      <mesh material={m.back}>
        <planeGeometry args={[w + 0.06, h + 0.06]} />
      </mesh>
      <mesh material={m.fill} position={[(-w * (1 - frac)) / 2, 0, 0.005]}>
        <planeGeometry args={[w * frac, h]} />
      </mesh>
    </group>
  );
};

const Creep: React.FC<{ side: Side; ranged: boolean; x: number; z: number; dx: number; dz: number; s: number; j: number; fighting: boolean }> = ({
  side,
  ranged,
  x,
  z,
  dx,
  dz,
  s,
  j,
  fighting,
}) => {
  const m = useMemo(
    () =>
      side === "rad"
        ? { body: lamD({ color: "#4a7a3e" }), head: lamD({ color: "#7aa060" }), eye: flatD({ color: "#d8ff8a" }), extra: flatD({ color: "#c8ffb0" }) }
        : { body: lamD({ color: "#7a3034" }), head: lamD({ color: "#9a5048" }), eye: flatD({ color: "#ffb04a" }), extra: flatD({ color: "#ff9050" }) },
    [side],
  );
  const bob = fighting ? 0 : Math.abs(Math.sin(s * 7 + j * 1.3)) * 0.06;
  const lunge = fighting ? Math.max(0, Math.sin(s * 5 + j * 1.7)) * 0.18 : 0;
  const px = x + dx * lunge;
  const pz = z + dz * lunge;
  return (
    <group position={[px, groundY(px, pz) + bob, pz]} rotation={[0, Math.atan2(dx, dz), 0]}>
      <mesh material={m.body} position={[0, 0.26, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.2, ranged ? 0.52 : 0.42, 6]} />
      </mesh>
      <mesh material={m.head} position={[0, ranged ? 0.62 : 0.54, 0.02]} castShadow>
        <dodecahedronGeometry args={[0.15]} />
      </mesh>
      <mesh material={m.eye} position={[0, ranged ? 0.64 : 0.56, 0.14]}>
        <boxGeometry args={[0.14, 0.035, 0.02]} />
      </mesh>
      {ranged && (
        <mesh material={m.extra} position={[0.2, 0.64, 0.12]}>
          <octahedronGeometry args={[0.08]} />
        </mesh>
      )}
      {side === "dire" &&
        [-1, 1].map((sd) => (
          <mesh key={sd} material={m.body} position={[sd * 0.09, 0.72, 0]} rotation={[0, 0, -sd * 0.5]}>
            <coneGeometry args={[0.04, 0.18, 4]} />
          </mesh>
        ))}
      <group rotation={[0, -Math.atan2(dx, dz), 0]}>
        <Bar y={1.05} w={0.55} frac={fighting ? 0.55 + 0.35 * hash(j + 3) : 1} color={side === "rad" ? COL.hpAlly : COL.hpEnemy} />
      </group>
    </group>
  );
};

// our hero: a grey fly with red eyes and a hatchet (our own design), with a bright selection circle
const HeroFly: React.FC<{ pose: HeroPose; s: number; ghost?: boolean; opacity?: number }> = ({ pose, s, ghost = false, opacity = 1 }) => {
  const m = useMemo(() => {
    if (ghost) {
      const g = flatD({ color: "#ffe27a", transparent: true, opacity: 0.3, depthWrite: false });
      return { body: g, dark: g, eye: g, wing: g, handle: g, blade: g, ring: g, disc: g };
    }
    return {
      body: lamD({ color: "#9aaaa2" }),
      dark: lamD({ color: "#5e6a74" }),
      eye: lamD({ color: "#ff4a30", emissive: "#6a140a" }),
      wing: flatD({ color: "#e4f2fa", transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
      handle: lamD({ color: "#8e5c32" }),
      blade: lamD({ color: "#e0e4ec" }),
      ring: flatD({ color: "#7aff6a" }),
      disc: flatD({ color: "#7aff6a", transparent: true, opacity: 0.18, depthWrite: false }),
    };
  }, [ghost]);
  if (ghost) for (const mat of Object.values(m)) (mat as THREE.MeshBasicMaterial).opacity = 0.32 * opacity;
  const size = pose.scale * HERO_SIZE;
  const walkPh = s * 9;
  const bob = pose.walk * Math.abs(Math.sin(walkPh)) * 0.05 + (1 - pose.walk) * Math.sin(s * 2.2) * 0.02;
  const swing = pose.attack ? 1.1 * Math.cos((s / 0.8) * Math.PI * 2) - 0.3 : pose.walk * Math.sin(walkPh) * 0.4;
  const wingA = 0.35 + 0.12 * Math.sin(s * 5);
  const gy = groundY(pose.x, pose.z);
  return (
    <group position={[pose.x, gy, pose.z]}>
      {!ghost && (
        <>
          <mesh material={m.disc} position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={size}>
            <circleGeometry args={[0.7, 24]} />
          </mesh>
          <mesh material={m.ring} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={size}>
            <ringGeometry args={[0.62, 0.72, 24]} />
          </mesh>
          <pointLight position={[0, 2.2, 0.8]} intensity={2} distance={4.5} decay={1.2} color="#fff0d8" />
        </>
      )}
      <group rotation={[0, pose.yaw, 0]} scale={size} position={[0, bob, 0]}>
        {[-1, 1].map((side) =>
          [0, 1, 2].map((k) => (
            <mesh
              key={`${side}${k}`}
              material={m.dark}
              position={[side * 0.2, 0.22, 0.18 - k * 0.18]}
              rotation={[pose.walk * Math.sin(walkPh + k * 2 + (side > 0 ? Math.PI : 0)) * 0.5, 0, side * 0.5]}
            >
              <cylinderGeometry args={[0.025, 0.02, 0.45, 4]} />
            </mesh>
          )),
        )}
        <mesh material={m.body} position={[0, 0.5, -0.22]} scale={[0.9, 0.85, 1.3]} castShadow={!ghost}>
          <dodecahedronGeometry args={[0.24]} />
        </mesh>
        <mesh material={m.dark} position={[0, 0.52, -0.3]} scale={[0.95, 0.4, 1]}>
          <dodecahedronGeometry args={[0.22]} />
        </mesh>
        <mesh material={m.body} position={[0, 0.66, 0.06]} castShadow={!ghost}>
          <dodecahedronGeometry args={[0.2]} />
        </mesh>
        <mesh material={m.body} position={[0, 0.9, 0.18]}>
          <dodecahedronGeometry args={[0.16]} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} material={m.eye} position={[side * 0.15, 0.95, 0.22]}>
            <icosahedronGeometry args={[0.13, 1]} />
          </mesh>
        ))}
        {[-1, 1].map((side) => (
          <mesh key={`w${side}`} material={m.wing} position={[side * 0.28, 0.82, -0.2]} rotation={[0.3, side * 0.5, side * wingA]}>
            <boxGeometry args={[0.52, 0.02, 0.26]} />
          </mesh>
        ))}
        <group position={[0.26, 0.66, 0.1]} rotation={[swing, 0, -0.2]}>
          <mesh material={m.dark} position={[0, -0.12, 0.05]} rotation={[0.3, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.025, 0.28, 4]} />
          </mesh>
          <group position={[0, -0.22, 0.12]} rotation={[1.3, 0, 0]}>
            <mesh material={m.handle} position={[0, 0.16, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.5, 4]} />
            </mesh>
            <mesh material={m.blade} position={[0, 0.36, 0.08]}>
              <boxGeometry args={[0.04, 0.14, 0.17]} />
            </mesh>
          </group>
        </group>
      </group>
      {!ghost && <Bar y={1.5 * size} w={1.1} frac={0.86} color={COL.hpAlly} />}
    </group>
  );
};

// ancient creep: a slow stone golem with mossy shoulders
const Golem: React.FC<{ x: number; z: number; yaw: number; scale: number; s: number; phase: number; hp: number }> = ({ x, z, yaw, scale, s, phase, hp }) => {
  const m = useMemo(
    () => ({
      stone: lamD({ color: "#77747e" }),
      stoneDark: lamD({ color: "#5c5a66" }),
      moss: lamD({ color: "#4e7240" }),
      rune: flatD({ color: "#8af4ff" }),
    }),
    [],
  );
  const sway = Math.sin(s * 1.1 + phase) * 0.06;
  const arm = Math.sin(s * 1.1 + phase) * 0.25;
  return (
    <group position={[x, groundY(x, z), z]}>
      <group rotation={[0, yaw, sway]} scale={scale}>
        {[-1, 1].map((side) => (
          <mesh key={side} material={m.stoneDark} position={[side * 0.28, 0.3, 0]} castShadow>
            <boxGeometry args={[0.3, 0.6, 0.34]} />
          </mesh>
        ))}
        <mesh material={m.stone} position={[0, 1.05, 0]} scale={[1.15, 0.95, 0.85]} castShadow>
          <dodecahedronGeometry args={[0.55]} />
        </mesh>
        <mesh material={m.rune} position={[0, 1.05, 0.45]}>
          <boxGeometry args={[0.1, 0.34, 0.04]} />
        </mesh>
        <mesh material={m.stoneDark} position={[0, 1.62, 0.18]} castShadow>
          <boxGeometry args={[0.36, 0.3, 0.34]} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={`e${side}`} material={m.rune} position={[side * 0.09, 1.65, 0.36]}>
            <boxGeometry args={[0.07, 0.05, 0.02]} />
          </mesh>
        ))}
        {[-1, 1].map((side) => (
          <group key={`a${side}`} position={[side * 0.72, 1.35, 0]} rotation={[side * arm, 0, side * 0.15]}>
            <mesh material={m.moss} position={[0, 0.12, 0]} castShadow>
              <dodecahedronGeometry args={[0.28]} />
            </mesh>
            <mesh material={m.stone} position={[0, -0.45, 0.05]} castShadow>
              <boxGeometry args={[0.3, 0.8, 0.3]} />
            </mesh>
            <mesh material={m.stoneDark} position={[0, -0.95, 0.08]}>
              <dodecahedronGeometry args={[0.26]} />
            </mesh>
          </group>
        ))}
      </group>
      <Bar y={2.2 * scale} w={0.5 + 0.35 * scale} frac={hp} color={COL.hpEnemy} />
    </group>
  );
};

const hornGeo = (pts: [number, number, number][], r: number) => {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  const seg = 10;
  const rad = 6;
  const g = new THREE.TubeGeometry(curve, seg, r, rad, false);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const c = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    curve.getPointAt(i / seg, c);
    const k = 1 - (0.9 * i) / seg;
    for (let j = 0; j <= rad; j++) {
      const idx = i * (rad + 1) + j;
      pos.setXYZ(idx, c.x + (pos.getX(idx) - c.x) * k, c.y + (pos.getY(idx) - c.y) * k, c.z + (pos.getZ(idx) - c.z) * k);
    }
  }
  g.computeVertexNormals();
  return g;
};

// the big horned beast of the pit (our own shape); `ghost` = the dream version
const Beast: React.FC<{ ghost: boolean; opacity: number; s: number }> = ({ ghost, opacity, s }) => {
  const m = useMemo(() => {
    if (ghost) {
      const g = flatD({ color: "#bfe0ff", transparent: true, opacity: 0.3 });
      return { skin: g, belly: g, bone: flatD({ color: "#ffffff", transparent: true, opacity: 0.6 }), eye: flatD({ color: "#ffe27a", transparent: true, opacity: 0.8 }) };
    }
    return {
      skin: lamD({ color: "#5a4c6c", transparent: true }),
      belly: lamD({ color: "#7e6c78", transparent: true }),
      bone: lamD({ color: "#d8cca6", transparent: true }),
      eye: flatD({ color: "#ffb030", transparent: true }),
    };
  }, [ghost]);
  for (const [k, mat] of Object.entries(m)) (mat as THREE.Material).opacity = (ghost ? (k === "eye" ? 0.9 : k === "bone" ? 0.75 : 0.42) : 1) * opacity;
  const horns = useMemo(
    () =>
      [-1, 1].map((side) =>
        hornGeo(
          [
            [side * 0.45, 3.55, 1.1],
            [side * 1.15, 4.0, 0.95],
            [side * 1.6, 4.6, 0.35],
            [side * 1.4, 5.15, -0.25],
          ],
          0.2,
        ),
      ),
    [],
  );
  const breathe = 1 + 0.025 * Math.sin(s * 1.6);
  const cs = !ghost;
  return (
    <group>
      <mesh material={m.skin} position={[0, 1.5, 0]} scale={[1.25, 1.0 * breathe, 1.1]} castShadow={cs}>
        <dodecahedronGeometry args={[1.3]} />
      </mesh>
      <mesh material={m.skin} position={[0, 2.5, 0.45]} scale={[1, breathe, 1]} castShadow={cs}>
        <dodecahedronGeometry args={[1.1]} />
      </mesh>
      <mesh material={m.belly} position={[0, 2.1, 1.35]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[1.1, 1.3, 0.2]} />
      </mesh>
      <mesh material={m.skin} position={[0, 3.3, 1.25]} scale={[1.2, 0.9, 1.1]} castShadow={cs}>
        <dodecahedronGeometry args={[0.62]} />
      </mesh>
      <mesh material={m.skin} position={[0, 2.95, 1.8]}>
        <boxGeometry args={[0.85, 0.36, 0.6]} />
      </mesh>
      {[-1, 1].map((side) => (
        <React.Fragment key={side}>
          <mesh material={m.bone} position={[side * 0.3, 3.2, 2.05]}>
            <coneGeometry args={[0.08, 0.36, 4]} />
          </mesh>
          <mesh material={m.eye} position={[side * 0.28, 3.4, 1.82]}>
            <boxGeometry args={[0.18, 0.08, 0.05]} />
          </mesh>
          <mesh material={m.bone} geometry={horns[side < 0 ? 0 : 1]} castShadow={cs} />
          <group position={[side * 1.35, 2.6, 0.6]} rotation={[0.5, 0, side * 0.15]}>
            <mesh material={m.skin} position={[0, -0.8, 0]} castShadow={cs}>
              <boxGeometry args={[0.6, 1.8, 0.6]} />
            </mesh>
            <mesh material={m.skin} position={[0, -1.8, 0.1]}>
              <dodecahedronGeometry args={[0.45]} />
            </mesh>
            {[-1, 0, 1].map((c) => (
              <mesh key={c} material={m.bone} position={[c * 0.16, -2.05, 0.42]} rotation={[1.2, 0, 0]}>
                <coneGeometry args={[0.06, 0.25, 4]} />
              </mesh>
            ))}
          </group>
          <mesh material={m.skin} position={[side * 0.95, 0.65, 0.5]} scale={[1, 0.8, 1.3]}>
            <dodecahedronGeometry args={[0.6]} />
          </mesh>
        </React.Fragment>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={`sp${i}`} material={m.bone} position={[0, 3.1 - i * 0.45, -0.3 - i * 0.3]} rotation={[-0.9, 0, 0]}>
          <coneGeometry args={[0.16, 0.6, 4]} />
        </mesh>
      ))}
    </group>
  );
};

// soft patch numbers whispered by the ancient creeps
const FloatNum: React.FC<{ text: string; x: number; y: number; z: number; k: number; color: string; h?: number; rise?: number }> = ({
  text,
  x,
  y,
  z,
  k,
  color,
  h = 0.42,
  rise = 1.3,
}) => {
  const { tex, aspect } = useMemo(() => textTexture(text, color), [text, color]);
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }), [tex]);
  if (k <= 0 || k >= 1) return null;
  mat.opacity = interpolate(k, [0, 0.15, 0.7, 1], [0, 1, 1, 0]);
  return <sprite material={mat} position={[x, y + ease(k) * rise, z]} scale={[h * aspect, h, 1]} renderOrder={10} />;
};

const LevelUpFx: React.FC<{ s: number; x: number; z: number }> = ({ s, x, z }) => {
  const rings = useMemo(() => [0, 1, 2].map(() => flatD({ color: "#ffd84a", transparent: true, depthWrite: false, side: THREE.DoubleSide })), []);
  const pillar = useMemo(() => flatD({ color: "#ffe890", transparent: true, depthWrite: false, side: THREE.DoubleSide }), []);
  const spark = useMemo(() => flatD({ color: "#fff4b0" }), []);
  const e = s - 0.9;
  if (e < 0) return null;
  pillar.opacity = interpolate(e, [0, 0.25, 1.4, 2.4], [0, 0.45, 0.35, 0], clamp);
  return (
    <group position={[x, groundY(x, z), z]}>
      {rings.map((mat, i) => {
        const k = interpolate(e - i * 0.28, [0, 1.3], [0, 1], clamp);
        mat.opacity = interpolate(k, [0, 0.1, 1], [0, 0.95, 0], clamp);
        return (
          <mesh key={i} material={mat} position={[0, 0.14 + i * 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.3 + ease(k) * 3.4}>
            <ringGeometry args={[0.85, 1, 32]} />
          </mesh>
        );
      })}
      <mesh material={pillar} position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.85, 1.0, 5, 14, 1, true]} />
      </mesh>
      {Array.from({ length: 14 }).map((_, i) => {
        const k = interpolate(e - hash(i) * 0.5, [0, 1.6], [0, 1], clamp);
        if (k <= 0 || k >= 1) return null;
        const a = hash(i + 3) * 6.28 + k * 2;
        const r = 0.6 + hash(i + 9) * 0.5;
        return (
          <mesh key={`s${i}`} material={spark} position={[Math.cos(a) * r, 0.3 + k * 3.2, Math.sin(a) * r]}>
            <boxGeometry args={[0.07, 0.07, 0.07]} />
          </mesh>
        );
      })}
      <pointLight position={[0, 1.5, 0.5]} intensity={interpolate(e, [0, 0.3, 2.5], [0, 5, 0], clamp)} distance={7} color="#ffd070" />
    </group>
  );
};

// the enemy five: other insects, each its own silhouette, red ring and full red bar
const EnemyBug: React.FC<{ kind: EnemyKind; x: number; z: number; s: number; phase: number; back: number }> = ({ kind, x, z, s, phase, back }) => {
  const m = useMemo(
    () => ({
      ring: flatD({ color: "#ff3a2a" }),
      disc: flatD({ color: "#ff3a2a", transparent: true, opacity: 0.16, depthWrite: false }),
      eye: lamD({ color: "#ffe14a", emissive: "#6a5200" }),
      beetle: lamD({ color: "#3a4a8a" }),
      beetleD: lamD({ color: "#222a4e" }),
      wasp: lamD({ color: "#e0a82a" }),
      waspD: lamD({ color: "#2a2422" }),
      mantis: lamD({ color: "#6aa04a" }),
      mantisD: lamD({ color: "#3e6a30" }),
      mosq: lamD({ color: "#8a8478" }),
      mosqD: lamD({ color: "#4a4440" }),
      roach: lamD({ color: "#7a4428" }),
      roachD: lamD({ color: "#4a2a1a" }),
      wing: flatD({ color: "#e4f2fa", transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }),
    }),
    [],
  );
  const size = 1.75;
  const zz = z - back;
  const gy = groundY(x, zz);
  const breathe = Math.sin(s * 2.4 + phase) * 0.025;
  const sway = Math.sin(s * 1.6 + phase) * 0.12;
  const legs = (mat: THREE.Material, y: number, spread: number, len: number) =>
    [-1, 1].flatMap((side) =>
      [0, 1, 2].map((k) => (
        <mesh key={`${side}${k}`} material={mat} position={[side * spread, y, 0.18 - k * 0.18]} rotation={[0, 0, side * 0.55]}>
          <cylinderGeometry args={[0.022, 0.018, len, 4]} />
        </mesh>
      )),
    );
  let body: React.ReactNode;
  if (kind === "beetle") {
    // a heavy horned tank
    body = (
      <>
        {legs(m.beetleD, 0.2, 0.3, 0.4)}
        <mesh material={m.beetle} position={[0, 0.48, -0.08]} scale={[1.25, 0.8, 1.35]}>
          <dodecahedronGeometry args={[0.3]} />
        </mesh>
        <mesh material={m.beetleD} position={[0, 0.5, 0.3]}>
          <dodecahedronGeometry args={[0.17]} />
        </mesh>
        <mesh material={m.beetleD} position={[0, 0.78, 0.42]} rotation={[-0.5, 0, 0]}>
          <coneGeometry args={[0.07, 0.5, 4]} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} material={m.eye} position={[side * 0.1, 0.56, 0.44]}>
            <icosahedronGeometry args={[0.05, 0]} />
          </mesh>
        ))}
      </>
    );
  } else if (kind === "wasp") {
    // striped, hovering, stinger forward
    const hover = 0.25 + Math.sin(s * 6 + phase) * 0.04;
    body = (
      <group position={[0, hover, 0]}>
        {[0, 1, 2].map((k) => (
          <mesh key={k} material={k % 2 ? m.waspD : m.wasp} position={[0, 0.5, -0.12 - k * 0.15]} scale={[1, 1, 0.8]}>
            <dodecahedronGeometry args={[0.19 - k * 0.025]} />
          </mesh>
        ))}
        <mesh material={m.waspD} position={[0, 0.48, -0.62]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.05, 0.25, 4]} />
        </mesh>
        <mesh material={m.wasp} position={[0, 0.62, 0.16]}>
          <dodecahedronGeometry args={[0.16]} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} material={m.eye} position={[side * 0.09, 0.68, 0.28]}>
            <icosahedronGeometry args={[0.055, 0]} />
          </mesh>
        ))}
        {[-1, 1].map((side) => (
          <mesh key={`w${side}`} material={m.wing} position={[side * 0.3, 0.72, -0.1]} rotation={[0.2, side * 0.4, side * (0.3 + Math.sin(s * 40) * 0.25)]}>
            <boxGeometry args={[0.5, 0.02, 0.22]} />
          </mesh>
        ))}
      </group>
    );
  } else if (kind === "mantis") {
    // tall, two raised scythes
    body = (
      <>
        {legs(m.mantisD, 0.22, 0.22, 0.48)}
        <mesh material={m.mantis} position={[0, 0.42, -0.2]} scale={[0.7, 0.6, 1.6]}>
          <dodecahedronGeometry args={[0.2]} />
        </mesh>
        <mesh material={m.mantis} position={[0, 0.78, 0.06]} rotation={[0.35, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.08, 0.6, 5]} />
        </mesh>
        <mesh material={m.mantis} position={[0, 1.14, 0.18]} scale={[1.3, 0.8, 0.9]}>
          <tetrahedronGeometry args={[0.14]} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.14, 0.92, 0.2]} rotation={[-0.9 + sway * side, 0, side * 0.25]}>
            <mesh material={m.mantisD} position={[0, 0.16, 0]}>
              <boxGeometry args={[0.05, 0.34, 0.05]} />
            </mesh>
            <mesh material={m.mantisD} position={[0, 0.34, 0.12]} rotation={[1.2, 0, 0]}>
              <boxGeometry args={[0.04, 0.3, 0.06]} />
            </mesh>
          </group>
        ))}
        {[-1, 1].map((side) => (
          <mesh key={`e${side}`} material={m.eye} position={[side * 0.11, 1.16, 0.22]}>
            <icosahedronGeometry args={[0.045, 0]} />
          </mesh>
        ))}
      </>
    );
  } else if (kind === "mosquito") {
    // stilt legs, a long needle nose
    body = (
      <>
        {[-1, 1].flatMap((side) =>
          [0, 1, 2].map((k) => (
            <mesh key={`${side}${k}`} material={m.mosqD} position={[side * 0.3, 0.42, 0.25 - k * 0.25]} rotation={[0, 0, side * 0.6]}>
              <cylinderGeometry args={[0.012, 0.01, 0.95, 3]} />
            </mesh>
          )),
        )}
        <mesh material={m.mosq} position={[0, 0.82, -0.25]} rotation={[0.5, 0, 0]} scale={[0.6, 0.6, 1.8]}>
          <dodecahedronGeometry args={[0.15]} />
        </mesh>
        <mesh material={m.mosq} position={[0, 0.86, 0.06]}>
          <dodecahedronGeometry args={[0.13]} />
        </mesh>
        <mesh material={m.mosqD} position={[0, 0.8, 0.38]} rotation={[Math.PI / 2 + 0.25, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.006, 0.55, 3]} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} material={m.eye} position={[side * 0.08, 0.92, 0.15]}>
            <icosahedronGeometry args={[0.05, 0]} />
          </mesh>
        ))}
        {[-1, 1].map((side) => (
          <mesh key={`w${side}`} material={m.wing} position={[side * 0.25, 0.95, -0.15]} rotation={[0.3, side * 0.3, side * (0.2 + Math.sin(s * 30 + 1) * 0.2)]}>
            <boxGeometry args={[0.46, 0.02, 0.14]} />
          </mesh>
        ))}
      </>
    );
  } else {
    // a flat glossy roach with whip antennae
    body = (
      <>
        {legs(m.roachD, 0.12, 0.34, 0.36)}
        <mesh material={m.roach} position={[0, 0.25, -0.1]} scale={[1.1, 0.42, 1.7]}>
          <dodecahedronGeometry args={[0.28]} />
        </mesh>
        <mesh material={m.roachD} position={[0, 0.28, 0.36]} scale={[1.2, 0.5, 0.8]}>
          <dodecahedronGeometry args={[0.15]} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} material={m.roachD} position={[side * 0.18, 0.42, 0.78]} rotation={[1.2 + sway * side, 0, -side * 0.45]}>
            <cylinderGeometry args={[0.01, 0.006, 0.8, 3]} />
          </mesh>
        ))}
        {[-1, 1].map((side) => (
          <mesh key={`e${side}`} material={m.eye} position={[side * 0.1, 0.34, 0.46]}>
            <icosahedronGeometry args={[0.04, 0]} />
          </mesh>
        ))}
      </>
    );
  }
  return (
    <group position={[x, gy, zz]}>
      <mesh material={m.disc} position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={size}>
        <circleGeometry args={[0.7, 24]} />
      </mesh>
      <mesh material={m.ring} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={size}>
        <ringGeometry args={[0.62, 0.72, 24]} />
      </mesh>
      {/* facing down the lane, at him */}
      <group scale={size} position={[0, breathe, 0]}>
        {body}
      </group>
      <Bar y={2.2} w={1.1} frac={1} color={COL.hpEnemy} />
    </group>
  );
};

// the brain artifact bleeds a slow pink aura around the carry
const Aura: React.FC<{ x: number; z: number; s: number; size: number }> = ({ x, z, s, size }) => {
  const m = useMemo(() => flatD({ color: "#ff7ad8", transparent: true, opacity: 0.3, depthWrite: false }), []);
  const pulse = 0.5 + 0.5 * Math.sin(s * 2.2);
  m.opacity = 0.16 + 0.16 * pulse;
  return (
    <group position={[x, groundY(x, z), z]}>
      <mesh material={m} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={size * (1.25 + 0.12 * pulse)}>
        <ringGeometry args={[0.78, 0.98, 24]} />
      </mesh>
      <pointLight position={[0, 1.4, 0]} intensity={2.5 + 2 * pulse} distance={5} decay={1.3} color="#ff8ad8" />
    </group>
  );
};

const setVision = (id: DotaScene, s: number) => {
  const circles = visionCircles(id, s);
  for (let i = 0; i < VISION_SLOTS; i++) {
    const c = circles[i];
    FOW.value[i].set(c ? c[0] : 0, c ? c[1] : 0, c ? c[2] : 0);
  }
};

// low warm dusk sun with hard pixel shadows
const Sun: React.FC<{ target: P; size: number }> = ({ target, size }) => {
  const tgt = useMemo(() => new THREE.Object3D(), []);
  return (
    <>
      <primitive object={tgt} position={[target[0], 0, target[1]]} />
      <directionalLight
        position={[target[0] - 14, 13, target[1] + 6]}
        target={tgt}
        intensity={3.6}
        color="#ffc896"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-size}
        shadow-camera-right={size}
        shadow-camera-top={size}
        shadow-camera-bottom={-size}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-bias={-0.002}
      />
    </>
  );
};

const PATCHES = ["7.41", "7.42", "8.00", "7.43", "9.13", "8.01"];

export const DotaWorld: React.FC<{ id: DotaScene; durationInFrames: number }> = ({ id, durationInFrames }) => {
  const frame = useCurrentFrame();
  const s = frame / FPS;
  const t = frame / durationInFrames;
  const cam = CAMS3[id];
  const hero = heroPose(id, s);
  setVision(id, s);
  const gA = groundY;
  return (
    <>
      <color attach="background" args={[COL.bg]} />
      <DotaCam target={cam.target} dist={cam.dist} />
      <ambientLight intensity={2.3} color="#8090b8" />
      <hemisphereLight args={["#9aa8d0", "#3a3428", 0.9]} />
      <Sun target={cam.target} size={Math.max(12, cam.dist * 0.95)} />
      <MapStatic />
      <Shimmer s={s + (id === "pit" ? 30 : 0)} />
      {WAVES[id].flatMap((w, wi) =>
        Array.from({ length: CREEPS_PER_WAVE }).map((_, j) => {
          const c = creepPose(w, j, s);
          return <Creep key={`${wi}-${j}`} side={w.side} ranged={j === 3} {...c} s={s} j={j + wi * 4} />;
        }),
      )}
      {id !== "pit" && <HeroFly pose={hero} s={s} />}
      {id === "camp" && (
        <>
          <Golem x={CAMP_A[0] + 0.9} z={CAMP_A[1] - 0.6} yaw={-2.4} scale={1.05} s={s} phase={0} hp={interpolate(t, [0, 1], [0.8, 0.35])} />
          <Golem x={CAMP_A[0] + 2.1} z={CAMP_A[1] + 0.6} yaw={-2.0} scale={0.9} s={s} phase={2} hp={0.9} />
          <Golem x={CAMP_A[0] - 0.3} z={CAMP_A[1] - 1.8} yaw={-3.0} scale={0.85} s={s} phase={4} hp={0.95} />
          {PATCHES.map((p, i) => {
            const src = [
              [CAMP_A[0] + 0.9, CAMP_A[1] - 0.6, 2.3],
              [CAMP_A[0] + 2.1, CAMP_A[1] + 0.6, 2.0],
              [CAMP_A[0] - 0.3, CAMP_A[1] - 1.8, 1.9],
            ][i % 3];
            return (
              <FloatNum
                key={p}
                text={p}
                x={src[0]}
                y={gA(src[0], src[1]) + src[2]}
                z={src[1]}
                k={(s - 0.3 - i * 0.85) / 2.4}
                color={["#c8f2ff", "#e2ffd4", "#fff0c0"][i % 3]}
                h={0.6}
              />
            );
          })}
        </>
      )}
      {id === "levelUp" && (
        <>
          <LevelUpFx s={s} x={hero.x} z={hero.z} />
          {/* how big he could have been */}
          <HeroFly pose={{ ...hero, scale: 2.1 }} s={s} ghost opacity={interpolate(s, [1.5, 2.3, 3.6, 4.6], [0, 1, 1, 0], clamp)} />
          <FloatNum text="BOSS" x={hero.x} y={gA(hero.x, hero.z) + 2.6} z={hero.z + 0.4} k={(s - 0.95) / 3.2} color="#ffd84a" h={0.62} rise={0.35} />
        </>
      )}
      {id === "golem" && (
        <>
          <Golem x={CAMP_B[0] + 0.5} z={CAMP_B[1] - 0.6} yaw={-2.5} scale={1.9} s={s * 0.6} phase={1} hp={interpolate(t, [0, 1], [0.7, 0.42])} />
          <group position={[CAMP_B[0] + 0.2, gA(CAMP_B[0], CAMP_B[1] - 4.6) + 0.4 + Math.sin(s * 0.8) * 0.12, CAMP_B[1] - 4.6]} scale={1.05} rotation={[0.55, 0.1, 0]}>
            <Beast ghost opacity={interpolate(t, [0.25, 0.55], [0, 1], clamp)} s={s} />
          </group>
        </>
      )}
      {(id === "standoff" || id === "enemies" || id === "heroClose") && (
        <>
          <Aura x={hero.x} z={hero.z} s={s} size={hero.scale * 1.45} />
          {ENEMIES.map((e, i) => (
            <EnemyBug
              key={e.kind}
              kind={e.kind}
              x={e.x}
              z={e.z}
              s={s}
              phase={i * 1.7}
              // the mosquito loses its nerve and takes a step back
              back={e.kind === "mosquito" && id !== "standoff" ? interpolate(s, [id === "enemies" ? 1.05 : 0, id === "enemies" ? 1.45 : 0.01], [0, 0.55], clamp) : 0}
            />
          ))}
        </>
      )}
      {id === "pit" && (
        <group position={[PIT[0], gA(PIT[0], PIT[1]) + 0.02, PIT[1]]} rotation={[0, -Math.PI / 4 + 0.2, 0]} scale={0.95}>
          <Beast ghost opacity={interpolate(t, [0, 0.15, 0.45, 0.7], [0, 1, 1, 0], clamp)} s={s} />
          {t > 0.4 && <Beast ghost={false} opacity={interpolate(t, [0.4, 0.75], [0, 1], clamp)} s={s} />}
        </group>
      )}
    </>
  );
};
