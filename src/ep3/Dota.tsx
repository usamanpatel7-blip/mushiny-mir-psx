import { useThree } from "@react-three/fiber";
import React, { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { IH, IW } from "../ps1kit";
import {
  BASE_DIRE,
  BASE_RAD,
  CAMP_A,
  CAMP_B,
  CAMS3,
  CREEPS_PER_WAVE,
  HALF,
  LANE_SEGS,
  LANE_W,
  PATH_FOREST,
  PATH_OUT,
  PIT,
  PITCH,
  RIVER_W,
  TOWERS,
  WAVES,
  creepPose,
  heroPose,
  pathDist,
  type HeroPose,
  type P,
  type Side,
} from "./dotaPlan";
import { clamp, ease, flat, hash, lam, textTexture } from "./mat";
import { FPS, type DotaScene } from "./script";

const COL = {
  bg: "#2e3852",
  apron: "#3f5048",
  grass: "#5da83f",
  burnt: "#6a4c52",
  bank: "#8a9a74",
  water: "#4f9fd0",
  shimmer: "#bfe6ff",
  laneRad: "#d2ba80",
  laneRadEdge: "#a8905c",
  laneDire: "#94787c",
  laneDireEdge: "#725a62",
  plazaRad: "#d8d2bc",
  plazaDire: "#7c6a74",
  stoneRad: "#dcd6c2",
  stoneDire: "#6e6272",
  crystalRad: "#8affb0",
  crystalDire: "#ff5a48",
  hpAlly: "#5ade4a",
  hpEnemy: "#e8483a",
  hpBack: "#343e58",
};

// lens shift: the ground target sits above the frame centre, clear of the HUD bar and subtitles
const SHIFT = 80;

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

// flat strip on the ground from a to b
const Strip: React.FC<{ a: P; b: P; w: number; y: number; material: THREE.Material; extra?: number }> = ({ a, b, w, y, material, extra = 0 }) => {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz) + extra;
  return (
    <group position={[(a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2]} rotation={[0, -Math.atan2(dz, dx), 0]}>
      <mesh material={material} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[len, w]} />
      </mesh>
    </group>
  );
};

const triGeo = (pts: P[]) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts.flatMap(([x, z]) => [x, 0, z]), 3));
  g.computeVertexNormals();
  return g;
};

// --- trees: round and lush on the green side, jagged and burnt on the red side ------------------------
type Tree = { x: number; z: number; s: number; r: number; side: Side; c: number };
const TREES: Tree[] = (() => {
  const out: Tree[] = [];
  const step = 1.32;
  let i = 0;
  for (let gx = -HALF + 0.7; gx < HALF - 0.5; gx += step)
    for (let gz = -HALF + 0.7; gz < HALF - 0.5; gz += step) {
      i++;
      const x = gx + (hash(i) - 0.5) * 0.8;
      const z = gz + (hash(i + 999) - 0.5) * 0.8;
      if (Math.abs(x) > HALF - 0.6 || Math.abs(z) > HALF - 0.6) continue;
      if (hash(i + 77) < 0.1) continue;
      if (LANE_SEGS.some((l) => pathDist(x, z, [l.a, l.b]) < LANE_W / 2 + 0.95)) continue;
      if (Math.abs(z - x) / Math.SQRT2 < RIVER_W / 2 + 1.0) continue;
      if ([BASE_RAD, BASE_DIRE].some((b) => Math.abs(x - b[0]) < 6.6 && Math.abs(z - b[1]) < 6.6)) continue;
      if (Math.hypot(x - CAMP_A[0], z - CAMP_A[1]) < 3.4) continue;
      if (Math.hypot(x - CAMP_B[0], z - CAMP_B[1]) < 4.0) continue;
      if (Math.hypot(x - PIT[0], z - PIT[1]) < 3.7) continue;
      if (TOWERS.some((t) => Math.hypot(x - t.p[0], z - t.p[1]) < 1.5)) continue;
      if (pathDist(x, z, PATH_FOREST) < 0.9 || pathDist(x, z, PATH_OUT) < 0.9) continue;
      out.push({ x, z, s: 0.85 + hash(i + 5) * 0.4, r: hash(i + 6) * 6.28, side: z > x ? "rad" : "dire", c: hash(i + 8) });
    }
  return out;
})();

const Trees: React.FC = () => {
  const meshes = useMemo(() => {
    const d = new THREE.Object3D();
    const build = (side: Side) => {
      const list = TREES.filter((t) => t.side === side);
      const crownGeo = side === "rad" ? new THREE.IcosahedronGeometry(0.72, 0) : new THREE.ConeGeometry(0.62, 1.9, 5);
      const trunkGeo = new THREE.CylinderGeometry(0.09, 0.14, 0.8, 5);
      const crown = new THREE.InstancedMesh(crownGeo, lam({ color: "#ffffff" }), list.length);
      const trunk = new THREE.InstancedMesh(trunkGeo, lam({ color: side === "rad" ? "#80603e" : "#5a4a56" }), list.length);
      const pal = side === "rad" ? ["#4f9a38", "#62b446", "#3f8a3a", "#74be4e"] : ["#5e4250", "#564858", "#6a4048", "#5a4a5c"];
      list.forEach((t, k) => {
        d.position.set(t.x, 0.4 * t.s, t.z);
        d.rotation.set(0, t.r, 0);
        d.scale.setScalar(t.s);
        d.updateMatrix();
        trunk.setMatrixAt(k, d.matrix);
        d.position.set(t.x, (side === "rad" ? 1.25 : 1.55) * t.s, t.z);
        d.scale.set(t.s, t.s * (side === "rad" ? 1.15 : 1), t.s);
        d.updateMatrix();
        crown.setMatrixAt(k, d.matrix);
        crown.setColorAt(k, new THREE.Color(pal[Math.floor(t.c * pal.length)]));
      });
      return [crown, trunk];
    };
    return [...build("rad"), ...build("dire")];
  }, []);
  return (
    <group>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </group>
  );
};

const Tower: React.FC<{ p: P; side: Side }> = ({ p, side }) => {
  const m = useMemo(
    () => ({
      stone: lam({ color: side === "rad" ? COL.stoneRad : COL.stoneDire }),
      trim: lam({ color: side === "rad" ? "#7fae6a" : "#9a4a4a" }),
      crystal: flat({ color: side === "rad" ? COL.crystalRad : COL.crystalDire }),
    }),
    [side],
  );
  return (
    <group position={[p[0], 0, p[1]]}>
      <mesh material={m.stone} position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.75, 0.85, 0.4, 6]} />
      </mesh>
      <mesh material={m.stone} position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.35, 0.55, 1.7, 6]} />
      </mesh>
      <mesh material={m.trim} position={[0, 2.1, 0]}>
        <cylinderGeometry args={[0.55, 0.45, 0.2, 6]} />
      </mesh>
      <mesh material={m.crystal} position={[0, 2.65, 0]} scale={[1, 1.6, 1]}>
        <octahedronGeometry args={[0.32]} />
      </mesh>
    </group>
  );
};

const Ancients: React.FC = () => {
  const m = useMemo(
    () => ({
      pale: lam({ color: "#e8f2ea" }),
      leaf: lam({ color: "#c6f4e6", emissive: "#2a5a50" }),
      glow: flat({ color: "#eafff8" }),
      dark: lam({ color: "#52465a" }),
      darker: lam({ color: "#46404e" }),
      core: flat({ color: "#ff5a3a" }),
      plazaR: flat({ color: COL.plazaRad }),
      plazaD: flat({ color: COL.plazaDire }),
      hutR: lam({ color: "#e2dcc6" }),
      roofR: lam({ color: "#5ea24a" }),
      hutD: lam({ color: "#5e5264" }),
      roofD: lam({ color: "#a03c3a" }),
    }),
    [],
  );
  return (
    <group>
      <mesh material={m.plazaR} position={[BASE_RAD[0], 0.04, BASE_RAD[1]]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 12]} />
      </mesh>
      <mesh material={m.plazaD} position={[BASE_DIRE[0], 0.04, BASE_DIRE[1]]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 12]} />
      </mesh>
      {/* green Ancient: a pale crystal tree */}
      <group position={[-19.6, 0, 19.6]}>
        <mesh material={m.pale} position={[0, 1.6, 0]}>
          <cylinderGeometry args={[0.35, 0.8, 3.2, 6]} />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} material={m.leaf} position={[Math.cos(i * 1.05) * 1.3, 3.6 + (i % 2) * 0.6, Math.sin(i * 1.05) * 1.3]} scale={[1, 1.4, 1]}>
            <octahedronGeometry args={[0.9]} />
          </mesh>
        ))}
        <mesh material={m.glow} position={[0, 4.4, 0]} scale={[1, 1.8, 1]}>
          <octahedronGeometry args={[0.7]} />
        </mesh>
      </group>
      {/* red Ancient: a dark jagged spire with a burning core */}
      <group position={[19.6, 0, -19.6]}>
        <mesh material={m.dark} position={[0, 3, 0]}>
          <coneGeometry args={[1.5, 6, 5]} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} material={m.darker} position={[Math.cos(i * 1.26) * 1.4, 1.5, Math.sin(i * 1.26) * 1.4]} rotation={[Math.sin(i * 1.26) * 0.5, 0, -Math.cos(i * 1.26) * 0.5]}>
            <coneGeometry args={[0.5, 3, 4]} />
          </mesh>
        ))}
        <mesh material={m.core} position={[0, 2.4, 1.2]}>
          <octahedronGeometry args={[0.45]} />
        </mesh>
      </group>
      {/* barracks */}
      {(
        [
          [-14.2, 16.4],
          [-16.4, 14.2],
          [-13.2, 13.2],
        ] as P[]
      ).map(([x, z], i) => (
        <group key={`r${i}`} position={[x, 0, z]}>
          <mesh material={m.hutR} position={[0, 0.5, 0]}>
            <boxGeometry args={[1.4, 1, 1.4]} />
          </mesh>
          <mesh material={m.roofR} position={[0, 1.35, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[1.2, 0.8, 4]} />
          </mesh>
        </group>
      ))}
      {(
        [
          [14.2, -16.4],
          [16.4, -14.2],
          [13.2, -13.2],
        ] as P[]
      ).map(([x, z], i) => (
        <group key={`d${i}`} position={[x, 0, z]}>
          <mesh material={m.hutD} position={[0, 0.5, 0]}>
            <boxGeometry args={[1.4, 1, 1.4]} />
          </mesh>
          <mesh material={m.roofD} position={[0, 1.4, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[1.1, 1.1, 4]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// everything that never moves; memoised so it is not rebuilt each frame
const MapStatic: React.FC = React.memo(() => {
  const m = useMemo(
    () => ({
      apron: flat({ color: COL.apron }),
      grass: flat({ color: COL.grass, side: THREE.DoubleSide }),
      burnt: flat({ color: COL.burnt, side: THREE.DoubleSide }),
      bank: flat({ color: COL.bank }),
      water: flat({ color: COL.water }),
      laneR: flat({ color: COL.laneRad }),
      laneRE: flat({ color: COL.laneRadEdge }),
      laneD: flat({ color: COL.laneDire }),
      laneDE: flat({ color: COL.laneDireEdge }),
      pitFloor: flat({ color: "#6a6474" }),
      pitStone: lam({ color: "#8e8898" }),
    }),
    [],
  );
  const geos = useMemo(
    () => ({
      rad: triGeo([
        [-HALF, -HALF],
        [-HALF, HALF],
        [HALF, HALF],
      ]),
      dire: triGeo([
        [-HALF, -HALF],
        [HALF, HALF],
        [HALF, -HALF],
      ]),
    }),
    [],
  );
  const R = HALF - 2;
  return (
    <group>
      <mesh material={m.apron} position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[240, 240]} />
      </mesh>
      <mesh material={m.grass} geometry={geos.rad} />
      <mesh material={m.burnt} geometry={geos.dire} />
      <Strip a={[-R, -R]} b={[R, R]} w={RIVER_W + 1.3} y={0.01} material={m.bank} />
      <Strip a={[-R, -R]} b={[R, R]} w={RIVER_W} y={0.02} material={m.water} />
      {LANE_SEGS.map((l, i) => (
        <React.Fragment key={i}>
          <Strip a={l.a} b={l.b} w={LANE_W + 0.5} y={0.03} material={l.side === "rad" ? m.laneRE : m.laneDE} extra={LANE_W + 0.5} />
          <Strip a={l.a} b={l.b} w={LANE_W} y={0.04} material={l.side === "rad" ? m.laneR : m.laneD} extra={LANE_W} />
        </React.Fragment>
      ))}
      {/* the boss pit on the river bank, open towards the water */}
      <group position={[PIT[0], 0, PIT[1]]}>
        <mesh material={m.pitFloor} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.9, 12]} />
        </mesh>
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const open = Math.abs(Math.atan2(Math.sin(a - (3 * Math.PI) / 4), Math.cos(a - (3 * Math.PI) / 4))) < 0.5;
          if (open) return null;
          return (
            <mesh key={i} material={m.pitStone} position={[Math.cos(a) * 3.1, 0.45, Math.sin(a) * 3.1]} rotation={[0, -a, 0]}>
              <boxGeometry args={[0.7, 0.9 + hash(i) * 0.4, 1.5]} />
            </mesh>
          );
        })}
      </group>
      {TOWERS.map((t, i) => (
        <Tower key={i} p={t.p} side={t.side} />
      ))}
      <Ancients />
      <Trees />
    </group>
  );
});

// soft light dashes drifting down the river
const Shimmer: React.FC<{ s: number }> = ({ s }) => {
  const mat = useMemo(() => flat({ color: COL.shimmer }), []);
  const L = (HALF - 3) * 2 * Math.SQRT2;
  return (
    <group rotation={[0, -Math.PI / 4, 0]}>
      {Array.from({ length: 26 }).map((_, i) => {
        const u = ((hash(i) * L + s * 0.7) % L) - L / 2;
        return (
          <mesh key={i} material={mat} position={[u, 0.03, (hash(i + 40) - 0.5) * (RIVER_W - 0.8)]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.6, 0.07]} />
          </mesh>
        );
      })}
    </group>
  );
};

// health bar facing the fixed camera
const Bar: React.FC<{ y: number; w: number; frac: number; color: string }> = ({ y, w, frac, color }) => {
  const m = useMemo(() => ({ back: flat({ color: COL.hpBack }), fill: flat({ color }) }), [color]);
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
        ? { body: lam({ color: "#58b844" }), head: lam({ color: "#a6e67a" }), extra: flat({ color: "#dfffb0" }) }
        : { body: lam({ color: "#b8403c" }), head: lam({ color: "#e0806a" }), extra: flat({ color: "#ffb070" }) },
    [side],
  );
  const bob = fighting ? 0 : Math.abs(Math.sin(s * 7 + j * 1.3)) * 0.06;
  const lunge = fighting ? Math.max(0, Math.sin(s * 5 + j * 1.7)) * 0.18 : 0;
  return (
    <group position={[x + dx * lunge, bob, z + dz * lunge]} rotation={[0, Math.atan2(dx, dz), 0]}>
      <mesh material={m.body} position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.13, 0.19, ranged ? 0.5 : 0.4, 6]} />
      </mesh>
      <mesh material={m.head} position={[0, ranged ? 0.6 : 0.52, 0.02]}>
        <dodecahedronGeometry args={[0.14]} />
      </mesh>
      {ranged && (
        <mesh material={m.extra} position={[0.2, 0.62, 0.12]}>
          <octahedronGeometry args={[0.08]} />
        </mesh>
      )}
      {side === "dire" && (
        <>
          <mesh material={m.body} position={[-0.09, 0.68, 0]} rotation={[0, 0, 0.5]}>
            <coneGeometry args={[0.04, 0.16, 4]} />
          </mesh>
          <mesh material={m.body} position={[0.09, 0.68, 0]} rotation={[0, 0, -0.5]}>
            <coneGeometry args={[0.04, 0.16, 4]} />
          </mesh>
        </>
      )}
      <group rotation={[0, -Math.atan2(dx, dz), 0]}>
        <Bar y={1.0} w={0.55} frac={fighting ? 0.55 + 0.35 * hash(j + 3) : 1} color={side === "rad" ? COL.hpAlly : COL.hpEnemy} />
      </group>
    </group>
  );
};

// our hero: a small grey fly with red eyes and a hatchet (our own design)
const HeroFly: React.FC<{ pose: HeroPose; s: number; ghost?: boolean; opacity?: number }> = ({ pose, s, ghost = false, opacity = 1 }) => {
  const m = useMemo(() => {
    if (ghost) {
      const g = flat({ color: "#ffe27a", transparent: true, opacity: 0.3, depthWrite: false });
      return { body: g, dark: g, eye: g, wing: g, handle: g, blade: g, ring: g };
    }
    return {
      body: lam({ color: "#8e9e96" }),
      dark: lam({ color: "#5e6a74" }),
      eye: lam({ color: "#e84a34", emissive: "#4a120a" }),
      wing: flat({ color: "#e4f2fa", transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
      handle: lam({ color: "#8e5c32" }),
      blade: lam({ color: "#d4d8e0" }),
      ring: flat({ color: "#6aff72" }),
    };
  }, [ghost]);
  if (ghost) for (const mat of Object.values(m)) (mat as THREE.MeshBasicMaterial).opacity = 0.32 * opacity;
  const walkPh = s * 9;
  const bob = pose.walk * Math.abs(Math.sin(walkPh)) * 0.05 + (1 - pose.walk) * Math.sin(s * 2.2) * 0.02;
  const swing = pose.attack ? 1.1 * Math.cos((s / 0.8) * Math.PI * 2) - 0.3 : pose.walk * Math.sin(walkPh) * 0.4;
  const wingA = 0.35 + 0.12 * Math.sin(s * 5);
  return (
    <group position={[pose.x, 0, pose.z]}>
      {!ghost && (
        <mesh material={m.ring} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={pose.scale}>
          <ringGeometry args={[0.55, 0.64, 20]} />
        </mesh>
      )}
      <group rotation={[0, pose.yaw, 0]} scale={pose.scale} position={[0, bob, 0]}>
        {/* legs */}
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
        {/* abdomen, thorax, head */}
        <mesh material={m.body} position={[0, 0.5, -0.22]} scale={[0.9, 0.85, 1.3]}>
          <dodecahedronGeometry args={[0.24]} />
        </mesh>
        <mesh material={m.dark} position={[0, 0.52, -0.3]} scale={[0.95, 0.4, 1]}>
          <dodecahedronGeometry args={[0.22]} />
        </mesh>
        <mesh material={m.body} position={[0, 0.66, 0.06]}>
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
        {/* wings */}
        {[-1, 1].map((side) => (
          <mesh key={`w${side}`} material={m.wing} position={[side * 0.28, 0.82, -0.2]} rotation={[0.3, side * 0.5, side * wingA]}>
            <boxGeometry args={[0.52, 0.02, 0.26]} />
          </mesh>
        ))}
        {/* the hatchet arm */}
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
      {!ghost && <Bar y={1.45 * pose.scale} w={1.0} frac={0.86} color={COL.hpAlly} />}
    </group>
  );
};

// ancient creep: a slow stone golem with mossy shoulders
const Golem: React.FC<{ x: number; z: number; yaw: number; scale: number; s: number; phase: number; hp: number }> = ({ x, z, yaw, scale, s, phase, hp }) => {
  const m = useMemo(
    () => ({
      stone: lam({ color: "#9a98a8" }),
      stoneDark: lam({ color: "#747484" }),
      moss: lam({ color: "#6eaa4c" }),
      rune: flat({ color: "#8af4ff" }),
    }),
    [],
  );
  const sway = Math.sin(s * 1.1 + phase) * 0.06;
  const arm = Math.sin(s * 1.1 + phase) * 0.25;
  return (
    <group position={[x, 0, z]}>
      <group rotation={[0, yaw, sway]} scale={scale}>
        {[-1, 1].map((side) => (
          <mesh key={side} material={m.stoneDark} position={[side * 0.28, 0.3, 0]}>
            <boxGeometry args={[0.3, 0.6, 0.34]} />
          </mesh>
        ))}
        <mesh material={m.stone} position={[0, 1.05, 0]} scale={[1.15, 0.95, 0.85]}>
          <dodecahedronGeometry args={[0.55]} />
        </mesh>
        <mesh material={m.rune} position={[0, 1.05, 0.45]}>
          <boxGeometry args={[0.1, 0.34, 0.04]} />
        </mesh>
        <mesh material={m.stoneDark} position={[0, 1.62, 0.18]}>
          <boxGeometry args={[0.36, 0.3, 0.34]} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={`e${side}`} material={m.rune} position={[side * 0.09, 1.65, 0.36]}>
            <boxGeometry args={[0.07, 0.05, 0.02]} />
          </mesh>
        ))}
        {[-1, 1].map((side) => (
          <group key={`a${side}`} position={[side * 0.72, 1.35, 0]} rotation={[side * arm, 0, side * 0.15]}>
            <mesh material={m.moss} position={[0, 0.12, 0]}>
              <dodecahedronGeometry args={[0.28]} />
            </mesh>
            <mesh material={m.stone} position={[0, -0.45, 0.05]}>
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

// tapered curved horn
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
      const g = flat({ color: "#cfe8ff", transparent: true, opacity: 0.3 });
      return { skin: g, belly: g, bone: flat({ color: "#ffffff", transparent: true, opacity: 0.6 }), eye: flat({ color: "#ffe27a", transparent: true, opacity: 0.8 }) };
    }
    return {
      skin: lam({ color: "#76648a", transparent: true }),
      belly: lam({ color: "#a8929e", transparent: true }),
      bone: lam({ color: "#eadcb2", transparent: true }),
      eye: flat({ color: "#ffb030", transparent: true }),
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
  return (
    <group>
      <mesh material={m.skin} position={[0, 1.5, 0]} scale={[1.25, 1.0 * breathe, 1.1]}>
        <dodecahedronGeometry args={[1.3]} />
      </mesh>
      <mesh material={m.skin} position={[0, 2.5, 0.45]} scale={[1, breathe, 1]}>
        <dodecahedronGeometry args={[1.1]} />
      </mesh>
      <mesh material={m.belly} position={[0, 2.1, 1.35]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[1.1, 1.3, 0.2]} />
      </mesh>
      <mesh material={m.skin} position={[0, 3.3, 1.25]} scale={[1.2, 0.9, 1.1]}>
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
          <mesh material={m.bone} geometry={horns[side < 0 ? 0 : 1]} />
          {/* arms down to the knuckles */}
          <group position={[side * 1.35, 2.6, 0.6]} rotation={[0.5, 0, side * 0.15]}>
            <mesh material={m.skin} position={[0, -0.8, 0]}>
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
const FloatNum: React.FC<{ text: string; x: number; y: number; z: number; k: number; color: string; h?: number; rise?: number }> = ({ text, x, y, z, k, color, h = 0.42, rise = 1.3 }) => {
  const { tex, aspect } = useMemo(() => textTexture(text, color), [text, color]);
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }), [tex]);
  if (k <= 0 || k >= 1) return null;
  mat.opacity = interpolate(k, [0, 0.15, 0.7, 1], [0, 1, 1, 0]);
  return <sprite material={mat} position={[x, y + ease(k) * rise, z]} scale={[h * aspect, h, 1]} renderOrder={10} />;
};

const LevelUpFx: React.FC<{ s: number; x: number; z: number }> = ({ s, x, z }) => {
  const rings = useMemo(() => [0, 1, 2].map(() => flat({ color: "#ffd84a", transparent: true, depthWrite: false, side: THREE.DoubleSide })), []);
  const pillar = useMemo(() => flat({ color: "#ffe890", transparent: true, depthWrite: false, side: THREE.DoubleSide }), []);
  const spark = useMemo(() => flat({ color: "#fff4b0" }), []);
  const t0 = 0.9;
  const e = s - t0;
  if (e < 0) return null;
  pillar.opacity = interpolate(e, [0, 0.25, 1.4, 2.4], [0, 0.45, 0.35, 0], clamp);
  return (
    <group position={[x, 0, z]}>
      {rings.map((mat, i) => {
        const k = interpolate(e - i * 0.28, [0, 1.3], [0, 1], clamp);
        mat.opacity = interpolate(k, [0, 0.1, 1], [0, 0.95, 0], clamp);
        return (
          <mesh key={i} material={mat} position={[0, 0.12 + i * 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.3 + ease(k) * 3.2}>
            <ringGeometry args={[0.85, 1, 32]} />
          </mesh>
        );
      })}
      <mesh material={pillar} position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.75, 0.9, 5, 14, 1, true]} />
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
    </group>
  );
};

const PATCHES = ["7.41", "7.42", "8.00", "7.43", "9.13", "8.01"];

export const DotaWorld: React.FC<{ id: DotaScene; durationInFrames: number }> = ({ id, durationInFrames }) => {
  const frame = useCurrentFrame();
  const s = frame / FPS;
  const t = frame / durationInFrames;
  const cam = CAMS3[id];
  const hero = heroPose(id, s);
  return (
    <>
      <color attach="background" args={[COL.bg]} />
      <DotaCam target={cam.target} dist={cam.dist} />
      <ambientLight intensity={1.5} color="#c8d0f0" />
      <directionalLight position={[-6, 12, 8]} intensity={2.3} color="#fff2dc" />
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
          <Golem x={CAMP_A[0] + 0.7} z={CAMP_A[1] - 0.5} yaw={-2.4} scale={1.05} s={s} phase={0} hp={interpolate(t, [0, 1], [0.8, 0.35])} />
          <Golem x={CAMP_A[0] + 1.9} z={CAMP_A[1] + 0.6} yaw={-2.0} scale={0.9} s={s} phase={2} hp={0.9} />
          <Golem x={CAMP_A[0] - 0.4} z={CAMP_A[1] - 1.7} yaw={-3.0} scale={0.85} s={s} phase={4} hp={0.95} />
          {PATCHES.map((p, i) => {
            const src = [
              [CAMP_A[0] + 0.7, 2.3, CAMP_A[1] - 0.5],
              [CAMP_A[0] + 1.9, 2.0, CAMP_A[1] + 0.6],
              [CAMP_A[0] - 0.4, 1.9, CAMP_A[1] - 1.7],
            ][i % 3];
            return <FloatNum key={p} text={p} x={src[0]} y={src[1]} z={src[2]} k={(s - 0.3 - i * 0.85) / 2.4} color={["#c8f2ff", "#e2ffd4", "#fff0c0"][i % 3]} h={0.6} />;
          })}
        </>
      )}
      {id === "levelUp" && (
        <>
          <LevelUpFx s={s} x={hero.x} z={hero.z} />
          {/* how big he could have been */}
          <HeroFly pose={{ ...hero, scale: 2.3 }} s={s} ghost opacity={interpolate(s, [1.5, 2.3, 3.6, 4.6], [0, 1, 1, 0], clamp)} />
          <FloatNum text="SOS" x={hero.x} y={2.0} z={hero.z + 0.4} k={(s - 0.95) / 3.2} color="#ffd84a" h={0.62} rise={0.35} />
        </>
      )}
      {id === "golem" && (
        <>
          <Golem x={CAMP_B[0] + 0.5} z={CAMP_B[1] - 0.6} yaw={-2.5} scale={1.9} s={s * 0.6} phase={1} hp={interpolate(t, [0, 1], [0.7, 0.42])} />
          <group position={[CAMP_B[0] + 0.2, 0.4 + Math.sin(s * 0.8) * 0.12, CAMP_B[1] - 4.6]} scale={1.05} rotation={[0.55, 0.1, 0]}>
            <Beast ghost opacity={interpolate(t, [0.25, 0.55], [0, 1], clamp)} s={s} />
          </group>
        </>
      )}
      {id === "pit" && (
        <group position={[PIT[0], 0.05, PIT[1]]} rotation={[0, -Math.PI / 4 + 0.2, 0]} scale={0.95}>
          <Beast ghost opacity={interpolate(t, [0, 0.15, 0.45, 0.7], [0, 1, 1, 0], clamp)} s={s} />
          {t > 0.4 && <Beast ghost={false} opacity={interpolate(t, [0.4, 0.75], [0, 1], clamp)} s={s} />}
        </group>
      )}
    </>
  );
};
