import React, { useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CameraRig, Ps1Canvas, basic, lambert, pixelTexture, type Cam } from "../ps1kit";
import type { FacesScene } from "./script";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};
const hash = (i: number) => {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

// two looks: reel 1 is a purple dawn, reel 2 an overcast grey morning
type Look = { skyTop: string; skyMid: string; skyLow: string; sea: string; sand: string; sandDark: string; fog: string; sun: string; hemi: [string, string] };
const DAWN: Look = {
  skyTop: "#3e3a62",
  skyMid: "#8a5c78",
  skyLow: "#f0a060",
  sea: "#4a5a80",
  sand: "#8c786c",
  sandDark: "#76645a",
  fog: "#6a5470",
  sun: "#ffd890",
  hemi: ["#b4a0c8", "#4a3c3a"],
};
const GREY: Look = {
  skyTop: "#4a5068",
  skyMid: "#6e7488",
  skyLow: "#9aa0ae",
  sea: "#3e4e5e",
  sand: "#94846c",
  sandDark: "#84745e",
  fog: "#7a8090",
  sun: "#e8e4d8",
  hemi: ["#b8bcc8", "#5a5040"],
};
const LOOK: Record<FacesScene, Look> = {
  seaFaces: DAWN,
  tide: DAWN,
  shoreWide: DAWN,
  crateTop: DAWN,
  sunTurn: DAWN,
  stare: DAWN,
  morph: DAWN,
  jaws: GREY,
  insideUp: GREY,
  whisperMask: GREY,
  lighthouse: GREY,
  crateFly: GREY,
};

// fixed cameras only
const CAMS: Record<FacesScene, Cam> = {
  seaFaces: { pos: [0, 2.6, 3.2], look: [0, 0, -5] },
  tide: { pos: [0, 0.95, 3.4], look: [0, 0.25, -3] },
  shoreWide: { pos: [0, 7.5, 9], look: [0, 0, -6] },
  crateTop: { pos: [0, 4.3, 0.001], look: [0, 0, 0] },
  sunTurn: { pos: [3.2, 0.75, 3.2], look: [-1.2, 0.45, -6] },
  stare: { pos: [0, 1.18, 0.001], look: [0, 0, 0] },
  morph: { pos: [0, 1.18, 0.001], look: [0, 0, 0] },
  jaws: { pos: [0, 5.2, 0.001], look: [0, 0, 0] },
  insideUp: { pos: [0, 1.35, 0.001], look: [0, 0, 0] },
  whisperMask: { pos: [0.3, 0.62, 0.78], look: [0, 0.06, 0.08] },
  lighthouse: { pos: [0.5, 3.0, 4.5], look: [-2.5, 4.6, -10] },
  crateFly: { pos: [0, 4.3, 0.001], look: [0, 0, 0] },
};

// --- shared geometry ----------------------------------------------------------------------------------------
// a mask in local space: the face looks along +z, forehead towards +y; 1.5 wide, 2 tall before scaling
const MASK_DEPTH = 0.45;
const surfaceZ = (x: number, y: number) => MASK_DEPTH * Math.sqrt(Math.max(0, 1 - (x / 0.75) ** 2 - y ** 2));
const EYES: [number, number][] = [
  [-0.27, 0.2],
  [0.27, 0.2],
];
const MOUTH: [number, number] = [0, -0.48];

const maskGeos = () => {
  const shell = new THREE.SphereGeometry(1, 9, 7, 0, Math.PI, 0, Math.PI);
  shell.scale(0.75, 1, MASK_DEPTH);
  const nose = new THREE.ConeGeometry(0.1, 0.32, 4);
  nose.rotateX(Math.PI / 2 + 0.25);
  nose.translate(0, -0.06, surfaceZ(0, -0.06) + 0.05);
  const holes = EYES.map(([x, y]) => {
    const c = new THREE.CircleGeometry(0.13, 5);
    c.scale(1.25, 0.8, 1);
    c.rotateX(-0.35 * y);
    c.rotateY(0.6 * x);
    c.translate(x, y, surfaceZ(x, y) + 0.012);
    return c;
  });
  return { shell: mergeGeometries([shell.toNonIndexed(), nose.toNonIndexed()]), holes: mergeGeometries(holes.map((h) => h.toNonIndexed())) };
};
let GEOS: ReturnType<typeof maskGeos> | null = null;
const geos = () => (GEOS ??= maskGeos());

const useMats = (look: Look) =>
  useMemo(
    () => ({
      mask: lambert({ color: "#e8e2d6", side: THREE.DoubleSide }),
      maskOld: lambert({ color: "#cfc6b4", side: THREE.DoubleSide }),
      hole: basic({ color: "#120e10" }),
      pupil: basic({ color: "#f4f0e0" }),
      flyEye: lambert({ color: "#c43a24", emissive: "#3a0a04" }),
      flyDark: lambert({ color: "#3c3634" }),
      wood: lambert({ color: "#4e5236" }),
      woodDark: lambert({ color: "#34362a" }),
      rock: lambert({ color: look === DAWN ? "#5e5670" : "#6a6a70" }),
      keeper: lambert({ color: "#2e3448" }),
      wing: basic({ color: "#cfcac4", transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
      sea: lambert({ color: look.sea }),
      foam: basic({ color: "#e8eef2" }),
      wet: lambert({ color: look.sandDark }),
      grain: lambert({ color: "#5a4c40" }),
      sunGlow: basic({ color: look.sun, transparent: true, opacity: 0.45, fog: false }),
      sunDisc: basic({ color: look.sun, fog: false }),
      pool: basic({ color: "#a8aec4", side: THREE.DoubleSide }),
      poolRing: basic({ color: "#d8dce6", side: THREE.DoubleSide }),
    }),
    [look],
  );
type Mats = ReturnType<typeof useMats>;

// --- textures -------------------------------------------------------------------------------------------------
const sandTexture = (look: Look) =>
  pixelTexture(64, 64, (ctx) => {
    ctx.fillStyle = look.sand;
    ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 520; i++) {
      const r = hash(i * 3 + 1);
      ctx.fillStyle = r < 0.55 ? look.sandDark : r < 0.85 ? "#9a8c7c" : r < 0.95 ? "#6e625a" : "#b0a290";
      const s = hash(i * 7 + 2) < 0.85 ? 1 : 2;
      ctx.fillRect(Math.floor(hash(i * 5 + 3) * 64), Math.floor(hash(i * 11 + 4) * 64), s, s);
    }
  });

const skyTexture = (look: Look) =>
  pixelTexture(4, 96, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 96);
    g.addColorStop(0, look.skyTop);
    g.addColorStop(0.62, look.skyMid);
    g.addColorStop(0.86, look.skyLow);
    g.addColorStop(1, look.skyLow);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 96);
    // cloud streaks
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = hash(i) < 0.5 ? look.skyTop : look.skyMid;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(0, Math.floor(hash(i + 40) * 70), 4, 1);
    }
    ctx.globalAlpha = 1;
  });

// the warm band of the gradient sits right on the horizon
const Sky: React.FC<{ look: Look; z?: number; y?: number }> = ({ look, z = -46, y = 24 }) => {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: skyTexture(look), fog: false }), [look]);
  return (
    <mesh material={mat} position={[0, y, z]}>
      <planeGeometry args={[200, 60]} />
    </mesh>
  );
};

const Sand: React.FC<{ look: Look; size?: number; rep?: number; z?: number }> = ({ look, size = 60, rep = 18, z = 0 }) => {
  const mat = useMemo(() => {
    const t = sandTexture(look);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rep, rep);
    return lambert({ map: t });
  }, [look, rep]);
  return (
    <mesh material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, z]}>
      <planeGeometry args={[size, size]} />
    </mesh>
  );
};

// the sea: a flat-shaded grid whose vertices bob in steps
const Sea: React.FC<{ mats: Mats; s: number; from: number; to: number; width?: number; opacity?: number; amp?: number }> = ({
  mats,
  s,
  from,
  to,
  width = 80,
  opacity = 1,
  amp = 0.06,
}) => {
  const ref = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, to - from, 28, 24);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, (from + to) / 2);
    return g;
  }, [width, from, to]);
  const mat = useMemo(() => {
    if (opacity >= 1) return mats.sea;
    const m = mats.sea.clone();
    m.transparent = true;
    m.opacity = opacity;
    m.depthWrite = false;
    return m;
  }, [mats, opacity]);
  useLayoutEffect(() => {
    const p = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      p.setY(i, amp * (Math.sin(x * 0.9 + s * 1.7 + z * 0.4) + 0.6 * Math.sin(z * 1.3 - s * 2.1)));
    }
    p.needsUpdate = true;
    geo.computeVertexNormals();
  }, [geo, s, amp]);
  return <mesh ref={ref} geometry={geo} material={mat} />;
};

// --- the face -------------------------------------------------------------------------------------------------
type MaskProps = {
  mats: Mats;
  pos: [number, number, number];
  // face-up by default (forehead towards -z); `rot` overrides
  rot?: [number, number, number] | [number, number, number, THREE.EulerOrder];
  scale: number;
  jaw?: number;
  pupils?: number;
  gaze?: number;
  fly?: number;
  insideUp?: boolean;
  old?: boolean;
  visible?: boolean;
  children?: React.ReactNode;
};

const Mask: React.FC<MaskProps> = ({ mats, pos, rot, scale, jaw = 0, pupils = 0, gaze = 0, fly = 0, insideUp = false, old = false, visible = true, children }) => {
  const g = geos();
  const r = rot ?? (insideUp ? [Math.PI / 2, 0, Math.PI] : [-Math.PI / 2, 0, 0]);
  const mouthH = 0.045 + jaw * 0.2;
  return (
    <group position={pos} rotation={r} scale={scale} visible={visible}>
      <mesh geometry={g.shell} material={old ? mats.maskOld : mats.mask} />
      <mesh geometry={g.holes} material={mats.hole} />
      {/* mouth slit: it opens downwards */}
      <mesh material={mats.hole} position={[MOUTH[0], MOUTH[1] - jaw * 0.08, surfaceZ(MOUTH[0], MOUTH[1]) + 0.02]} rotation={[0.45, 0, 0]}>
        <boxGeometry args={[0.36, mouthH, 0.02]} />
      </mesh>
      {pupils > 0 &&
        EYES.map(([x, y], i) => (
          <mesh key={i} material={mats.pupil} position={[x + (gaze - 1) * 0.05, y + 0.01, surfaceZ(x, y) + 0.03]} scale={pupils}>
            <circleGeometry args={[0.035, 4]} />
          </mesh>
        ))}
      {fly > 0 && (
        <>
          {EYES.map(([x, y], i) => (
            <mesh key={`f${i}`} material={mats.flyEye} position={[x * (1 + 0.25 * fly), y + 0.05 * fly, surfaceZ(x, y) + 0.02]} scale={[fly * 1.2, fly * 1.3, fly]}>
              <icosahedronGeometry args={[0.21, 1]} />
            </mesh>
          ))}
          {/* the proboscis slides out of the mouth */}
          <mesh material={mats.flyDark} position={[0, MOUTH[1] - 0.12 * fly, surfaceZ(0, MOUTH[1]) + 0.02]} rotation={[0.5, 0, 0]} scale={[1, fly, 1]}>
            <cylinderGeometry args={[0.035, 0.06, 0.4, 5]} />
          </mesh>
        </>
      )}
      {children}
    </group>
  );
};

// many masks on one beach: two instanced meshes (shell + eye holes)
const MaskField: React.FC<{ mats: Mats; items: { x: number; z: number; yaw: number; s: number }[] }> = ({ mats, items }) => {
  const g = geos();
  const shellRef = useRef<THREE.InstancedMesh>(null);
  const holeRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    items.forEach((it, i) => {
      const qy = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, it.yaw, 0));
      m.compose(new THREE.Vector3(it.x, 0.02, it.z), qy.multiply(q), new THREE.Vector3(it.s, it.s, it.s));
      shellRef.current?.setMatrixAt(i, m);
      holeRef.current?.setMatrixAt(i, m);
    });
    if (shellRef.current) shellRef.current.instanceMatrix.needsUpdate = true;
    if (holeRef.current) holeRef.current.instanceMatrix.needsUpdate = true;
  }, [items]);
  return (
    <>
      <instancedMesh ref={shellRef} args={[g.shell, mats.mask, items.length]} />
      <instancedMesh ref={holeRef} args={[g.holes, mats.hole, items.length]} />
    </>
  );
};

// a hunched keeper far away: hood, red eyes, folded wings
const Keeper: React.FC<{ mats: Mats; x: number; z: number; yaw: number; s: number; bend: number }> = ({ mats, x, z, yaw, s, bend }) => (
  <group position={[x, 0, z]} rotation={[0, yaw, 0]} scale={s}>
    <mesh material={mats.keeper} position={[0, 0.25, 0]}>
      <cylinderGeometry args={[0.05, 0.07, 0.5, 5]} />
    </mesh>
    <group position={[0, 0.5, 0]} rotation={[bend, 0, 0]}>
      <mesh material={mats.keeper} position={[0, 0.25, 0.05]} scale={[1, 1.2, 0.9]}>
        <dodecahedronGeometry args={[0.22]} />
      </mesh>
      <mesh material={mats.keeper} position={[0, 0.5, 0.18]}>
        <dodecahedronGeometry args={[0.15]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} material={mats.flyEye} position={[side * 0.09, 0.5, 0.29]}>
          <icosahedronGeometry args={[0.075, 0]} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={`w${side}`} material={mats.wing} position={[side * 0.2, 0.42, -0.25]} rotation={[0.9, side * 0.4, side * 0.2]}>
          <planeGeometry args={[0.3, 0.7]} />
        </mesh>
      ))}
    </group>
  </group>
);

const Cliffs: React.FC<{ mats: Mats }> = ({ mats }) => (
  <>
    {[
      [-11, -10, 5, 4.5],
      [-9.5, -16, 6, 5.5],
      [-8, -23, 7, 6],
      [-6.5, -31, 8, 5.4],
      [-4, -40, 9, 5],
    ].map(([x, z, w, h], i) => (
      <mesh key={i} material={mats.rock} position={[x - 2, h / 2 - 0.2, z]} rotation={[0, 0.3 + hash(i) * 0.4, 0]} scale={[w * 0.55, h, w * 0.5]}>
        <cylinderGeometry args={[0.8, 1, 1, 5]} />
      </mesh>
    ))}
  </>
);

// numbered crates in the stills; in 3D the crate stays bare
const Crate: React.FC<{ mats: Mats; w: number; d: number; h: number }> = ({ mats, w, d, h }) => {
  const t = 0.07;
  return (
    <group>
      <mesh material={mats.woodDark} position={[0, 0.02, 0]}>
        <boxGeometry args={[w, 0.04, d]} />
      </mesh>
      {[
        [0, h / 2, -d / 2, w, h, t],
        [0, h / 2, d / 2, w, h, t],
        [-w / 2, h / 2, 0, t, h, d],
        [w / 2, h / 2, 0, t, h, d],
      ].map(([x, y, z, a, b, c], i) => (
        <mesh key={i} material={mats.wood} position={[x, y, z]}>
          <boxGeometry args={[a, b, c]} />
        </mesh>
      ))}
      {/* plank seams */}
      {[0.33, 0.66].map((k) => (
        <mesh key={k} material={mats.woodDark} position={[0, h * k, d / 2 + 0.04]}>
          <boxGeometry args={[w, 0.03, 0.01]} />
        </mesh>
      ))}
    </group>
  );
};

// a keeper's foreleg: three dark segments, a hooked tip and a few bristles
const Limb: React.FC<{ mats: Mats; reach: number; shake: number }> = ({ mats, reach, shake }) => (
  <group position={[0.05 + shake, 0.42, 1.6 - reach * 1.25]} rotation={[0, 0.12, 0]}>
    <mesh material={mats.flyDark} position={[0, 0.08, 0.55]} rotation={[-0.25, 0, 0]}>
      <boxGeometry args={[0.07, 0.07, 0.7]} />
    </mesh>
    <mesh material={mats.flyDark} position={[0, -0.02, 0.05]} rotation={[0.35, 0, 0]}>
      <boxGeometry args={[0.05, 0.05, 0.42]} />
    </mesh>
    <mesh material={mats.flyDark} position={[0, -0.13, -0.17]} rotation={[0.9, 0, 0]}>
      <coneGeometry args={[0.03, 0.18, 4]} />
    </mesh>
    {[0.2, 0.4, 0.6, 0.8].map((k) => (
      <mesh key={k} material={mats.flyDark} position={[0.04, 0.12, 0.25 + k * 0.5]} rotation={[0, 0, 0.7]}>
        <boxGeometry args={[0.008, 0.08, 0.008]} />
      </mesh>
    ))}
  </group>
);

const Lighthouse: React.FC<{ mats: Mats; on: number }> = ({ mats, on }) => {
  const lamp = useMemo(() => basic({ color: "#fff2b0" }), []);
  const dark = useMemo(() => basic({ color: "#2a2c34" }), []);
  const glow = useMemo(() => basic({ color: "#ffe9a0", transparent: true, opacity: 0.35, depthWrite: false }), []);
  glow.opacity = 0.35 * on;
  return (
    <group position={[-3.2, 0, -10]}>
      {/* headland */}
      <mesh material={mats.rock} position={[0, 1.2, 0]} scale={[7, 2.6, 5]}>
        <dodecahedronGeometry args={[0.6, 0]} />
      </mesh>
      <mesh material={mats.keeper} position={[0, 4.6, 0]}>
        <cylinderGeometry args={[0.38, 0.55, 4.2, 7]} />
      </mesh>
      <mesh material={mats.keeper} position={[0, 6.8, 0]}>
        <cylinderGeometry args={[0.62, 0.62, 0.12, 8]} />
      </mesh>
      <mesh material={on > 0.5 ? lamp : dark} position={[0, 7.15, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.55, 8]} />
      </mesh>
      <mesh material={mats.keeper} position={[0, 7.65, 0]}>
        <coneGeometry args={[0.5, 0.5, 8]} />
      </mesh>
      <mesh material={glow} position={[0, 7.15, 0.6]}>
        <circleGeometry args={[1.4, 10]} />
      </mesh>
      {on > 0 && <pointLight position={[0, 7.2, 1.2]} intensity={6 * on} distance={14} color="#ffe2a0" />}
    </group>
  );
};

// --- scenes ---------------------------------------------------------------------------------------------------
const FacesWorld: React.FC<{ id: FacesScene }> = ({ id }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // PS1 animation steps at 15 fps
  const s = Math.floor(frame / 2) * (2 / fps);
  const look = LOOK[id];
  const mats = useMats(look);
  const cam = CAMS[id];
  // the sky and the sun sit far away: open the far plane past the kit's default
  const { camera } = useThree();
  (camera as THREE.PerspectiveCamera).far = 160;

  const field = useMemo(() => {
    const out: { x: number; z: number; yaw: number; s: number }[] = [];
    for (let i = 0; i < 520; i++) {
      const x = (hash(i * 3 + 7) - 0.5) * 22;
      const z = -12.5 + hash(i * 5 + 9) * 18;
      if (x < -6 + (z + 12) * 0.12 && z < -6) continue;
      out.push({ x, z, yaw: (hash(i * 13 + 1) - 0.5) * 1.2, s: 0.26 + hash(i * 17 + 3) * 0.06 });
    }
    return out;
  }, []);

  return (
    <>
      <color attach="background" args={[look.fog]} />
      <fog attach="fog" args={[look.fog, 18, id === "shoreWide" || id === "lighthouse" || id === "sunTurn" || id === "seaFaces" ? 75 : 40]} />
      <CameraRig from={cam} to={cam} t={0} />
      <hemisphereLight args={[look.hemi[0], look.hemi[1], 2.2]} />
      <directionalLight position={look === DAWN ? [-8, 5, -10] : [3, 8, 4]} intensity={look === DAWN ? 2.2 : 1.3} color={look.sun} />
      <ambientLight intensity={0.6} />

      {id === "seaFaces" && (
        <>
          <Sky look={look} />
          <Sea mats={mats} s={s} from={-45} to={6} opacity={0.55} amp={0.06} />
          {/* rows of faces just under the surface, drifting to shore */}
          {Array.from({ length: 34 }).map((_, i) => {
            const row = Math.floor(i / 5);
            const col = i % 5;
            const z = -11 + row * 2.1 + ((s * 0.45) % 2.1) + hash(i) * 0.5;
            const x = (col - 2) * 1.25 + (hash(i + 5) - 0.5) * 0.6;
            return <Mask key={i} mats={mats} pos={[x, -0.1 + Math.sin(s * 1.5 + i) * 0.03, z]} rot={[-Math.PI / 2 + 0.25, 0, (hash(i + 9) - 0.5) * 0.8]} scale={0.36} />;
          })}
          {/* dark bed far below */}
          <mesh material={mats.wet} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, -20]}>
            <planeGeometry args={[80, 60]} />
          </mesh>
        </>
      )}

      {id === "tide" && (() => {
        // the wave comes in, hangs, slides back; it leaves the faces behind
        const foamZ = interpolate(s, [0, 0.9, 1.25, 2.5], [-3.2, -0.55, -0.55, -3.2], clamp);
        const back = s > 1.25;
        return (
          <>
            <Sky look={look} />
            <Sand look={look} />
            <mesh material={mats.wet} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -1.9]}>
              <planeGeometry args={[30, 2.8]} />
            </mesh>
            <Sea mats={mats} s={s} from={-45} to={-3.2} amp={0.05} />
            {/* the sheet of water over the sand up to the foam line */}
            <mesh material={mats.sea} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, (foamZ - 3.2) / 2]} scale={[1, Math.max(0.01, foamZ + 3.2), 1]}>
              <planeGeometry args={[30, 1]} />
            </mesh>
            {Array.from({ length: 22 }).map((_, i) => (
              <mesh key={i} material={mats.foam} position={[-7 + i * 0.68, 0.035, foamZ + (hash(i) - 0.5) * 0.18]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.72, 0.16 + hash(i + 3) * 0.12]} />
              </mesh>
            ))}
            {Array.from({ length: 16 }).map((_, i) => {
              const z = -2.9 + hash(i * 3) * 2.2;
              const x = (hash(i * 7 + 1) - 0.5) * 6;
              return (
                <Mask
                  key={i}
                  mats={mats}
                  pos={[x, 0.03, z]}
                  rot={[-Math.PI / 2, 0, (hash(i + 2) - 0.5) * 1.4]}
                  scale={0.26}
                  visible={back && foamZ < z - 0.15}
                />
              );
            })}
          </>
        );
      })()}

      {id === "shoreWide" && (
        <>
          <Sky look={look} />
          <Sand look={look} size={80} rep={26} />
          <Sea mats={mats} s={s} from={-45} to={-12.6} amp={0.08} />
          <mesh material={mats.foam} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, -12.6]}>
            <planeGeometry args={[80, 0.14]} />
          </mesh>
          <Cliffs mats={mats} />
          <MaskField mats={mats} items={field} />
          <Keeper mats={mats} x={2.2} z={-2} yaw={-0.6} s={1.15} bend={0.9 + Math.sin(s * 0.9) * 0.08} />
          <Keeper mats={mats} x={-3.5} z={-7} yaw={0.4} s={1.1} bend={1.0} />
          <Keeper mats={mats} x={5.5} z={-9.5} yaw={-1.2} s={1.1} bend={0.7 + Math.sin(s * 0.7 + 1) * 0.1} />
          {/* the sun is still under the sea: only its glow */}
          <mesh material={mats.sunGlow} position={[4, -1.1, -45]}>
            <circleGeometry args={[4, 10]} />
          </mesh>
        </>
      )}

      {(id === "crateTop" || id === "crateFly") && (() => {
        const w = 1.5;
        const d = 2.4;
        const slots: [number, number][] = [];
        for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) slots.push([(c - 1) * 0.46, (r - 1.5) * 0.58]);
        const last = 7;
        const drop = ease((s - 0.5) / 1.3);
        return (
          <>
            <Sand look={look} size={14} rep={10} />
            <Crate mats={mats} w={w} d={d} h={0.8} />
            {/* the bottom layer */}
            {slots.map(([x, z], i) => (
              <Mask key={`b${i}`} mats={mats} pos={[x + 0.1, 0.28, z + 0.12]} rot={[-Math.PI / 2 + 0.3, 0, 0.2]} scale={0.27} old />
            ))}
            {slots.map(([x, z], i) => {
              if (id === "crateTop" && i === last) {
                // the last face is lowered into its place
                return <Mask key={i} mats={mats} pos={[x, 3.6 - drop * 3.08, z]} rot={[-Math.PI / 2 + 0.25 * (1 - drop), 0, 0.5 * (1 - drop)]} scale={0.29} />;
              }
              const mine = id === "crateFly" && i === 4;
              return (
                <Mask
                  key={i}
                  mats={mats}
                  pos={[x, 0.52, z]}
                  rot={[-Math.PI / 2 + 0.22, 0, (hash(i) - 0.5) * 0.25 + (mine ? interpolate(s, [3, 5], [0, 0.35], clamp) : 0)]}
                  scale={0.29}
                  fly={mine ? 1 : 0}
                />
              );
            })}
          </>
        );
      })()}

      {id === "sunTurn" && (
        <>
          <Sky look={look} />
          <Sand look={look} size={60} rep={20} />
          <Sea mats={mats} s={s} from={-45} to={-5} amp={0.07} />
          <mesh material={mats.foam} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, -5]}>
            <planeGeometry args={[80, 0.12]} />
          </mesh>
          {/* the rim of the sun: it rises a little while we watch */}
          <mesh material={mats.sunDisc} position={[-16.4, interpolate(s, [0, 2.6], [-1.8, -0.9]), -44]}>
            <circleGeometry args={[2.4, 12]} />
          </mesh>
          {/* every face turns to the sun, in jerks, all together */}
          {Array.from({ length: 18 }).map((_, i) => {
            const x = -3 + hash(i * 3 + 1) * 6;
            const z = -4.2 + hash(i * 5 + 2) * 5;
            const k = Math.floor(interpolate(s, [0.5 + hash(i) * 0.2, 2.2], [0, 4], clamp)) / 4;
            const yaw = Math.atan2(-16.4 - x, -44 - z);
            return <Mask key={i} mats={mats} pos={[x, 0.03 + k * 0.27, z]} rot={[-Math.PI / 2 + k * (Math.PI / 2 - 0.15), yaw, 0, "YXZ"]} scale={0.28} />;
          })}
        </>
      )}

      {(id === "stare" || id === "morph") && (
        <>
          <Sand look={look} size={6} rep={6} />
          <Mask
            mats={mats}
            pos={[0, 0.03, 0.02]}
            scale={0.47}
            pupils={id === "stare" ? Math.floor(interpolate(s, [1.4, 2.0], [0, 3], clamp)) / 3 : 1}
            gaze={id === "stare" ? Math.floor(interpolate(s, [2.2, 3.6], [0, 4], clamp)) / 4 : 1}
            fly={id === "morph" ? Math.floor(interpolate(s, [0.4, 2.5], [0, 8], clamp)) / 8 : 0}
          />
        </>
      )}

      {id === "jaws" && (
        <>
          <Sand look={look} size={14} rep={10} />
          {/* they count themselves, one after another, then shut all at once */}
          {Array.from({ length: 40 }).map((_, i) => {
            const c = i % 5;
            const r = Math.floor(i / 5);
            const open = s > 3.0 + i * 0.045 && s < 5.2 ? 1 : 0;
            return (
              <Mask
                key={i}
                mats={mats}
                pos={[(c - 2) * 0.64 + (hash(i) - 0.5) * 0.12, 0.03, (r - 3.5) * 0.74 + (hash(i + 3) - 0.5) * 0.1]}
                rot={[-Math.PI / 2, 0, (hash(i + 7) - 0.5) * 0.3]}
                scale={0.27}
                jaw={open}
              />
            );
          })}
        </>
      )}

      {id === "insideUp" && (() => {
        const reach = interpolate(s, [0.6, 1.7, 3.4, 4.3], [0, 1, 1, 0], clamp);
        const shake = s > 1.7 && s < 3.4 ? (Math.floor(s * 15) % 2 ? 0.006 : -0.006) : 0;
        const ripple = (s * 0.6) % 1;
        return (
          <>
            <Sand look={look} size={6} rep={6} />
            <Mask mats={mats} pos={[0, 0.2, 0]} scale={0.47} insideUp>
              {/* seawater in the hollow, holding the sky */}
              <mesh material={mats.pool} position={[0, 0.05, 0.16]}>
                <circleGeometry args={[0.6, 9]} />
              </mesh>
              <mesh material={mats.poolRing} position={[0.1, 0.12, 0.165]} scale={0.15 + ripple * 0.35}>
                <ringGeometry args={[0.8, 1, 9]} />
              </mesh>
            </Mask>
            <Limb mats={mats} reach={reach} shake={shake} />
          </>
        );
      })()}

      {id === "whisperMask" && (
        <>
          <Sand look={look} size={8} rep={8} />
          <Mask mats={mats} pos={[0, 0.03, 0]} rot={[-Math.PI / 2, 0, 0.15]} scale={0.5}>
            {/* grains of sand hop at the mouth while it speaks */}
            {Array.from({ length: 14 }).map((_, i) => {
              const talking = s > 1.8 && s < 3.9;
              const hop = talking ? Math.abs(Math.sin(s * 22 + i * 1.9)) * 0.07 * (0.4 + hash(i + 4)) : 0;
              const a = (i / 14) * Math.PI * 2;
              return (
                <mesh key={i} material={mats.grain} position={[Math.cos(a) * 0.24 * (0.5 + hash(i)), MOUTH[1] - 0.08 + Math.sin(a) * 0.07, surfaceZ(0, MOUTH[1]) + 0.03 + hop]}>
                  <boxGeometry args={[0.025, 0.025, 0.025]} />
                </mesh>
              );
            })}
          </Mask>
        </>
      )}

      {id === "lighthouse" && (
        <>
          <Sky look={look} />
          <Sea mats={mats} s={s} from={-45} to={8} amp={0.1} />
          <Lighthouse mats={mats} on={s > 0.5 ? 1 : 0} />
        </>
      )}
    </>
  );
};

export const FacesScene3D: React.FC<{ id: FacesScene }> = ({ id }) => (
  <Ps1Canvas>
    <FacesWorld id={id} />
  </Ps1Canvas>
);
