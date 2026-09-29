import { useThree } from "@react-three/fiber";
import React, { useLayoutEffect, useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { CameraRig, Ps1Canvas, pixelTexture, snapVertices, type Cam } from "../ps1kit";
import { stepped } from "../script";
import type { KioskScene } from "./script";

// Clean low-poly: flat colours, no photo textures. Finer vertex snap keeps frames calm.
const lam = (p: THREE.MeshLambertMaterialParameters) => snapVertices(new THREE.MeshLambertMaterial({ flatShading: true, ...p }), 2);
const smooth = (p: THREE.MeshLambertMaterialParameters) => snapVertices(new THREE.MeshLambertMaterial({ flatShading: false, ...p }), 2);
const flat = (p: THREE.MeshBasicMaterialParameters) => snapVertices(new THREE.MeshBasicMaterial(p), 2);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const hash = (n: number) => {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

const PAL = {
  sky: "#0b1430",
  ground: "#2e3852",
  sidewalk: "#4e5a78",
  kioskOut: "#1f5f66",
  trim: "#e8dcc2",
  steel: "#b7bec6",
  steelDark: "#5a6068",
  warm: "#ffe0ac",
  lamp: "#ffb25a",
  awningA: "#cf3f36",
  awningB: "#efe3cb",
};

const COUNTER_Y = 1.0;
const WORK: [number, number, number] = [-0.25, COUNTER_Y + 0.005, -0.3];
const GRILL_X = -1.05;
const PRESS_X = 0.4;
const BINS_X = [0.78, 0.95, 1.12];

// --- procedural textures (clean, not photo) ------------------------------------------
const tileTex = () =>
  pixelTexture(16, 16, (ctx) => {
    ctx.fillStyle = "#f2efe6";
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = "#cfcabd";
    ctx.fillRect(0, 15, 16, 1);
    ctx.fillRect(15, 0, 1, 16);
  });

const lavashTex = () =>
  pixelTexture(32, 32, (ctx) => {
    ctx.fillStyle = "#ead8a8";
    ctx.fillRect(0, 0, 32, 32);
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = i % 3 === 0 ? "#a8743e" : "#d2a868";
      ctx.fillRect(Math.floor(hash(i) * 31), Math.floor(hash(i + 50) * 31), 2, 1);
    }
  });

const missingTex = () => {
  const t = pixelTexture(8, 8, (ctx) => {
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? "#000000" : "#ff00dc";
        ctx.fillRect(x, y, 1, 1);
      }
  });
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
};

const clockTex = (hoursAngle: number, minutesAngle: number) =>
  pixelTexture(32, 32, (ctx) => {
    ctx.fillStyle = "#e9ecf5";
    ctx.beginPath();
    ctx.arc(16, 16, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2a3150";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(16, 16);
    ctx.lineTo(16 + Math.sin(hoursAngle) * 7, 16 - Math.cos(hoursAngle) * 7);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(16, 16);
    ctx.lineTo(16 + Math.sin(minutesAngle) * 11, 16 - Math.cos(minutesAngle) * 11);
    ctx.stroke();
  });

// --- the kiosk -------------------------------------------------------------------------
const Kiosk: React.FC<{ rounded: boolean; light: number }> = ({ rounded, light }) => {
  const m = useMemo(() => {
    const tiles = tileTex();
    tiles.wrapS = THREE.RepeatWrapping;
    tiles.wrapT = THREE.RepeatWrapping;
    tiles.repeat.set(10, 8);
    const tileMat = lam({ map: tiles });
    const out = lam({ color: PAL.kioskOut });
    return {
      ground: lam({ color: PAL.ground }),
      sidewalk: lam({ color: PAL.sidewalk }),
      out,
      trim: lam({ color: PAL.trim }),
      steel: lam({ color: PAL.steel }),
      steelDark: lam({ color: PAL.steelDark }),
      back: [out, out, out, out, tileMat, out],
      left: [tileMat, out, out, out, out, out],
      right: [out, tileMat, out, out, out, out],
      awningA: lam({ color: PAL.awningA }),
      awningB: lam({ color: PAL.awningB }),
      tube: flat({ color: "#fff7e6" }),
      meat: lam({ color: "#8e4c2c" }),
      lavash: lam({ color: "#e6d3a2" }),
      cove: smooth({ color: PAL.steel }),
      line: flat({ color: "#6a7084" }),
    };
  }, []);
  const cove = useMemo(() => {
    const r = 0.22;
    const shape = new THREE.Shape();
    shape.moveTo(-r, 0);
    shape.lineTo(0, 0);
    shape.lineTo(0, r);
    shape.absarc(-r, r, r, 0, -Math.PI / 2, true);
    return new THREE.ExtrudeGeometry(shape, { depth: 0.6, bevelEnabled: false, curveSegments: 16 });
  }, []);
  return (
    <group>
      <mesh material={m.ground} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 6]} receiveShadow>
        <planeGeometry args={[60, 40, 6, 6]} />
      </mesh>
      <mesh material={m.sidewalk} position={[0, 0.06, 0.6]} receiveShadow>
        <boxGeometry args={[14, 0.12, 5]} />
      </mesh>
      {[-4, -2, 0, 2, 4, 6].map((x) => (
        <mesh key={x} material={m.line} position={[x, 0.005, 5.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1, 0.08]} />
        </mesh>
      ))}
      {/* shell */}
      <mesh material={m.back} position={[0, 1.3, -1.84]} castShadow receiveShadow>
        <boxGeometry args={[3.36, 2.6, 0.08]} />
      </mesh>
      <mesh material={m.left} position={[-1.64, 1.3, -0.9]} castShadow receiveShadow>
        <boxGeometry args={[0.08, 2.6, 1.9]} />
      </mesh>
      <mesh material={m.right} position={[1.64, 1.3, -0.9]} castShadow receiveShadow>
        <boxGeometry args={[0.08, 2.6, 1.9]} />
      </mesh>
      <mesh material={m.out} position={[0, 2.66, -0.85]} castShadow>
        <boxGeometry args={[3.5, 0.12, 2.1]} />
      </mesh>
      <mesh material={m.trim} position={[0, 2.58, 0.12]}>
        <boxGeometry args={[3.5, 0.06, 0.06]} />
      </mesh>
      {/* striped awning */}
      <group position={[0, 2.55, 0.12]} rotation={[0.42, 0, 0]}>
        {Array.from({ length: 10 }).map((_, i) => (
          <mesh key={i} material={i % 2 ? m.awningB : m.awningA} position={[-1.575 + i * 0.35, 0, 0.3]} castShadow>
            <boxGeometry args={[0.35, 0.03, 0.6]} />
          </mesh>
        ))}
      </group>
      <mesh material={m.tube} position={[0, 2.5, -0.9]}>
        <boxGeometry args={[1.6, 0.03, 0.06]} />
      </mesh>
      {/* counter */}
      <mesh material={m.trim} position={[-0.175, COUNTER_Y / 2, -0.3]} castShadow receiveShadow>
        <boxGeometry args={[2.85, COUNTER_Y, 0.6]} />
      </mesh>
      <mesh material={m.out} position={[-0.175, 0.08, -0.005]}>
        <boxGeometry args={[2.85, 0.16, 0.02]} />
      </mesh>
      <mesh material={m.steel} position={[-0.175, COUNTER_Y - 0.02, -0.3]} receiveShadow>
        <boxGeometry args={[2.87, 0.04, 0.64]} />
      </mesh>
      <mesh material={m.trim} position={[1.425, COUNTER_Y / 2, -0.3]} castShadow>
        <boxGeometry args={[0.35, COUNTER_Y, 0.6]} />
      </mesh>
      <mesh material={m.steel} position={[1.425, COUNTER_Y - 0.02, -0.3]}>
        <boxGeometry args={[0.35, 0.04, 0.64]} />
      </mesh>
      {/* after the right angle was taken, the corner is the only smooth curve in the world */}
      {rounded && <mesh material={m.cove} geometry={cove} position={[1.6, COUNTER_Y, -0.6]} />}
      {/* doner + lavash stack */}
      <mesh material={m.steelDark} position={[-1.3, COUNTER_Y + 0.45, -1.3]}>
        <cylinderGeometry args={[0.012, 0.012, 0.95, 4]} />
      </mesh>
      <DonerSpit material={m.meat} />
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} material={m.lavash} position={[0.2, COUNTER_Y + 0.01 + i * 0.011, -1.3]} rotation={[0, i * 0.5, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.009, 12]} />
        </mesh>
      ))}
      <ambientLight intensity={0.5 * light} color="#7d8fc4" />
      <pointLight position={[0, 2.3, -0.5]} intensity={5.5 * light} distance={5} decay={1.3} color={PAL.warm} />
    </group>
  );
};

const DonerSpit: React.FC<{ material: THREE.Material }> = ({ material }) => {
  const frame = useCurrentFrame();
  return (
    <mesh material={material} position={[-1.3, COUNTER_Y + 0.44, -1.3]} rotation={[0, frame * 0.03, 0]}>
      <cylinderGeometry args={[0.2, 0.13, 0.62, 8]} />
    </mesh>
  );
};

const StreetLamp: React.FC<{ on: number }> = ({ on }) => {
  const m = useMemo(() => ({ pole: lam({ color: "#2c3244" }), head: flat({ color: PAL.lamp }) }), []);
  return (
    <group position={[2.8, 0, 1.6]}>
      <mesh material={m.pole} position={[0, 1.7, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, 3.4, 6]} />
      </mesh>
      <mesh material={m.pole} position={[-0.25, 3.38, 0]}>
        <boxGeometry args={[0.5, 0.05, 0.08]} />
      </mesh>
      <mesh material={m.head} position={[-0.45, 3.32, 0]}>
        <boxGeometry args={[0.22, 0.06, 0.16]} />
      </mesh>
      <pointLight position={[-0.45, 3.1, 0]} intensity={4 * on} distance={8} decay={1.1} color={PAL.lamp} />
    </group>
  );
};

const Grill: React.FC<{ glow: number }> = ({ glow }) => {
  const m = useMemo(() => ({ body: lam({ color: "#2e3036" }), bar: lam({ color: "#8e939a" }) }), []);
  const coal = useMemo(() => flat({ color: "#ff5a1a" }), []);
  coal.color.setRGB(0.45 + 0.55 * glow, 0.12 + 0.28 * glow, 0.02);
  return (
    <group position={[GRILL_X, COUNTER_Y, -0.3]}>
      <mesh material={m.body} position={[0, 0.05, 0]}>
        <boxGeometry args={[0.6, 0.1, 0.4]} />
      </mesh>
      <mesh material={coal} position={[0, 0.101, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.52, 0.32]} />
      </mesh>
      {[-0.2, -0.1, 0, 0.1, 0.2].map((x) => (
        <mesh key={x} material={m.bar} position={[x, 0.115, 0]}>
          <boxGeometry args={[0.012, 0.012, 0.38]} />
        </mesh>
      ))}
      <pointLight position={[0, 0.3, 0.1]} intensity={2.2 * glow} distance={1.5} color="#ff6a2a" />
    </group>
  );
};

const LavashSheet: React.FC = () => {
  const mat = useMemo(() => lam({ map: lavashTex() }), []);
  return (
    <mesh material={mat} position={WORK}>
      <cylinderGeometry args={[0.24, 0.24, 0.008, 14]} />
    </mesh>
  );
};

// a bad feeling: a dark mass that breathes slowly instead of flickering
const Blob: React.FC<{ frame: number; scale?: number; position?: [number, number, number] }> = ({ frame, scale = 1, position }) => {
  const mat = useMemo(() => smooth({ color: "#0d0a12", emissive: "#1e0a2a" }), []);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(0.1, 2), []);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const t = frame / 30;
  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3];
    const y = base[i * 3 + 1];
    const z = base[i * 3 + 2];
    const k = 1 + 0.12 * Math.sin(x * 30 + t * 1.3) * Math.sin(y * 26 + t * 0.9) + 0.06 * Math.sin(z * 40 + t * 1.7);
    pos.setXYZ(i, x * k, y * k, z * k);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return <mesh material={mat} geometry={geo} position={position ?? [WORK[0], WORK[1] + 0.09, WORK[2]]} scale={scale} />;
};

// a neatly folded parcel: seams on top, no floppy triangles
const Parcel: React.FC<{ x: number; y: number; aura?: number; frame?: number }> = ({ x, y, aura = 0, frame = 0 }) => {
  const m = useMemo(() => ({ dough: lam({ map: lavashTex() }), seam: flat({ color: "#b98a4e" }), mote: flat({ color: "#130a1c" }) }), []);
  return (
    <group position={[x, y, -0.3]}>
      <mesh material={m.dough}>
        <boxGeometry args={[0.28, 0.07, 0.22]} />
      </mesh>
      {[0.66, -0.66].map((r) => (
        <mesh key={r} material={m.seam} position={[0, 0.036, 0]} rotation={[0, r, 0]}>
          <boxGeometry args={[0.3, 0.002, 0.006]} />
        </mesh>
      ))}
      {aura > 0 &&
        Array.from({ length: 10 }).map((_, i) => {
          const a = hash(i) * Math.PI * 2 + (frame / 30) * 0.6;
          const r = 0.19 + 0.03 * Math.sin(frame / 30 + i);
          return (
            <mesh key={i} material={m.mote} position={[Math.cos(a) * r, 0.03 + hash(i + 4) * 0.12, Math.sin(a) * r * 0.8]} scale={aura}>
              <boxGeometry args={[0.012, 0.012, 0.012]} />
            </mesh>
          );
        })}
      {aura > 0 && <pointLight position={[0, 0.02, 0.1]} intensity={0.8 * aura} distance={0.6} color="#7a2ab0" />}
    </group>
  );
};

const Roll: React.FC<{ position: [number, number, number]; tremble?: number; frame: number }> = ({ position, tremble = 0, frame }) => {
  const mat = useMemo(() => lam({ map: lavashTex() }), []);
  const w = tremble * Math.sin(frame * 1.7) * Math.sin(frame * 0.37);
  return (
    <mesh material={mat} position={[position[0] + w * 0.006, position[1], position[2]]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.07, 0.07, 0.34, 9]} />
    </mesh>
  );
};

const Press: React.FC<{ close: number; glow: number }> = ({ close, glow }) => {
  const m = useMemo(() => ({ plate: lam({ color: "#3e4148" }), lid: lam({ color: "#575b63" }), handle: lam({ color: "#1a1a1c" }), gap: flat({ color: "#b060ff" }) }), []);
  return (
    <group position={[PRESS_X, COUNTER_Y, -0.3]}>
      <mesh material={m.plate} position={[0, 0.03, 0]}>
        <boxGeometry args={[0.46, 0.06, 0.36]} />
      </mesh>
      <group position={[0, 0.12, -0.18]} rotation={[-(1 - close) * 1.15, 0, 0]}>
        <mesh material={m.lid} position={[0, 0, 0.18]}>
          <boxGeometry args={[0.46, 0.05, 0.36]} />
        </mesh>
        <mesh material={m.handle} position={[0, 0.02, 0.38]}>
          <boxGeometry args={[0.3, 0.03, 0.04]} />
        </mesh>
      </group>
      {glow > 0 && (
        <>
          <mesh material={m.gap} position={[0, 0.087, 0.181]}>
            <boxGeometry args={[0.4, 0.01 * glow + 0.002, 0.002]} />
          </mesh>
          <pointLight position={[0, 0.1, 0.3]} intensity={1.6 * glow} distance={1.2} color="#b060ff" />
        </>
      )}
    </group>
  );
};

const GarlicBottle: React.FC<{ x: number }> = ({ x }) => {
  const m = useMemo(() => ({ body: smooth({ color: "#f3f1ea" }), cap: lam({ color: "#e9e4d2" }), band: lam({ color: "#9bb56a" }) }), []);
  return (
    <group position={[x, COUNTER_Y, -0.42]}>
      <mesh material={m.body} position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.04, 0.045, 0.2, 10]} />
      </mesh>
      <mesh material={m.band} position={[0, 0.11, 0]}>
        <cylinderGeometry args={[0.0455, 0.0455, 0.05, 10]} />
      </mesh>
      <mesh material={m.cap} position={[0, 0.23, 0]}>
        <coneGeometry args={[0.03, 0.06, 8]} />
      </mesh>
    </group>
  );
};


// cabbage stays fresh while time runs: tomatoes and onions rot in fast-forward next to it
const Bins: React.FC<{ age: number; frame: number }> = ({ age, frame }) => {
  const bin = useMemo(() => lam({ color: "#9aa1aa" }), []);
  const glintMat = useMemo(() => flat({ color: "#ffffff" }), []);
  const pieces = useMemo(() => {
    const make = (n: number, shape: "slice" | "ring" | "shred") => {
      const geo =
        shape === "slice"
          ? new THREE.CylinderGeometry(0.022, 0.022, 0.008, 6)
          : shape === "ring"
            ? new THREE.TorusGeometry(0.018, 0.005, 3, 7)
            : new THREE.BoxGeometry(0.03, 0.006, 0.01);
      const im = new THREE.InstancedMesh(geo, lam({ color: "#ffffff" }), n);
      const d = new THREE.Object3D();
      for (let i = 0; i < n; i++) {
        d.position.set((hash(i + n) - 0.5) * 0.11, 0.075 + hash(i + 9) * 0.02, (hash(i + 3 * n) - 0.5) * 0.18);
        d.rotation.set(hash(i + 1) * 3, hash(i + 2) * 3, hash(i + 4) * 3);
        d.updateMatrix();
        im.setMatrixAt(i, d.matrix);
      }
      return im;
    };
    return { tomato: make(14, "slice"), onion: make(14, "ring"), cabbage: make(40, "shred") };
  }, []);
  const lerp = (a: string, b: string, k: number) => new THREE.Color(a).lerp(new THREE.Color(b), k);
  const setAll = (im: THREE.InstancedMesh, c: THREE.Color, vary: number) => {
    for (let i = 0; i < im.count; i++) im.setColorAt(i, c.clone().offsetHSL(0, 0, (hash(i) - 0.5) * vary));
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  };
  setAll(pieces.tomato, lerp("#e0331f", "#3a1a10", age), 0.08);
  setAll(pieces.onion, lerp("#f4efe2", "#7a6a3a", age), 0.05);
  setAll(pieces.cabbage, new THREE.Color("#9ee26f"), 0.12);
  const shrink = 1 - age * 0.3;
  const glint = Math.floor(frame / 5) % 6 === 0;
  return (
    <group>
      {BINS_X.map((x, i) => (
        <group key={x} position={[x, COUNTER_Y, -0.42]}>
          <mesh material={bin} position={[0, 0.035, 0]}>
            <boxGeometry args={[0.15, 0.07, 0.22]} />
          </mesh>
          <group scale={i < 2 ? [shrink, 1, shrink] : [1, 1, 1]}>
            <primitive object={i === 0 ? pieces.tomato : i === 1 ? pieces.onion : pieces.cabbage} />
          </group>
          {i === 2 && glint && (
            <mesh material={glintMat} position={[0.03, 0.11, 0.05]}>
              <boxGeometry args={[0.01, 0.01, 0.01]} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
};

const Nameless: React.FC<{ frame: number }> = ({ frame }) => {
  const mat = useMemo(() => flat({ map: missingTex() }), []);
  const geos = useMemo(
    () => [new THREE.TorusKnotGeometry(0.045, 0.014, 24, 4), new THREE.OctahedronGeometry(0.06), new THREE.TetrahedronGeometry(0.07), new THREE.DodecahedronGeometry(0.055)],
    [],
  );
  return (
    <group>
      {geos.map((g, i) => (
        <mesh
          key={i}
          geometry={g}
          material={mat}
          position={[WORK[0] - 0.3 + i * 0.2, COUNTER_Y + 0.12 + Math.sin(frame * 0.05 + i) * 0.015, WORK[2]]}
          rotation={[frame * 0.012 * (i + 1), frame * 0.02, 0]}
        />
      ))}
    </group>
  );
};

// three hours of a late grandmother's sleep: a pillow, a moon, a clock running backwards
const GrannySleep: React.FC<{ frame: number }> = ({ frame }) => {
  const m = useMemo(() => ({ pillow: smooth({ color: "#c9d6ff", emissive: "#1d2a56" }), moon: flat({ color: "#ffe9a6" }), star: flat({ color: "#ffffff" }) }), []);
  const minutes = -frame * 0.02;
  const step = Math.floor(minutes * 8) / 8;
  const clock = useMemo(() => flat({ map: clockTex(Math.PI / 2 + step / 12, step), transparent: true }), [step]);
  const bob = Math.sin(frame * 0.06) * 0.008;
  return (
    <group position={[WORK[0], WORK[1] + 0.1 + bob, WORK[2]]}>
      <mesh material={m.pillow} scale={[1.4, 0.38, 0.95]}>
        <sphereGeometry args={[0.1, 10, 6]} />
      </mesh>
      <mesh material={clock} position={[0.02, 0.12, 0.02]}>
        <planeGeometry args={[0.1, 0.1]} />
      </mesh>
      <mesh material={m.moon} position={[-0.13, 0.17, -0.02]}>
        <sphereGeometry args={[0.025, 8, 6]} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} material={m.star} position={[(hash(i) - 0.5) * 0.4, 0.08 + hash(i + 4) * 0.18, -0.05]} visible={Math.floor(frame / 8 + i) % 3 !== 0}>
          <boxGeometry args={[0.006, 0.006, 0.006]} />
        </mesh>
      ))}
    </group>
  );
};

const SineWave: React.FC<{ frame: number; y?: number; width?: number; glow?: number }> = ({ frame, y = WORK[1] + 0.13, width = 0.5, glow = 1.2 }) => {
  const line = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(64 * 3), 3));
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color: "#6ff8ff" }));
  }, []);
  const pos = line.geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < 64; i++) {
    const x = WORK[0] + (i / 63 - 0.5) * width;
    pos.setXYZ(i, x, y + Math.sin((i / 63) * Math.PI * 6 + frame * 0.12) * 0.03, WORK[2]);
  }
  pos.needsUpdate = true;
  return (
    <group>
      <primitive object={line} />
      {glow > 0 && <pointLight position={[WORK[0], y, WORK[2] + 0.12]} intensity={glow} distance={0.8} color="#6ff8ff" />}
    </group>
  );
};


const SelfWrap: React.FC<{ frame: number }> = ({ frame }) => {
  const mat = useMemo(() => {
    const t = lavashTex();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 2);
    return lam({ map: t, side: THREE.DoubleSide });
  }, []);
  const K = 0.62;
  const phase = ((frame / 30) * 0.45) % 1;
  const zoom = Math.pow(1 / K, phase);
  return (
    <group scale={zoom}>
      {Array.from({ length: 7 }).map((_, i) => {
        const s = Math.pow(K, i);
        return (
          <mesh key={i} material={mat} position={[0, 0, -2 * s]} rotation={[Math.PI / 2, i * 0.7, 0]} scale={s}>
            <cylinderGeometry args={[0.8, 0.8, 3.2, 12, 1, true]} />
          </mesh>
        );
      })}
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 0, 0.5]} intensity={3} distance={6} color="#ffe2a8" />
    </group>
  );
};

const Wireframer: React.FC<{ progress: number }> = ({ progress }) => {
  const { scene } = useThree();
  useLayoutEffect(() => {
    let i = 0;
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const on = hash(i++) < progress;
      for (const mat of mats) (mat as THREE.MeshLambertMaterial).wireframe = on;
    });
  });
  return null;
};

const Cracks: React.FC<{ n: number }> = ({ n }) => {
  const mat = useMemo(() => flat({ color: "#1a0c04" }), []);
  return (
    <group position={[WORK[0], COUNTER_Y + 0.075, WORK[2]]}>
      {Array.from({ length: n }).map((_, i) => (
        <mesh key={i} material={mat} position={[(hash(i) - 0.5) * 0.28, 0.069, (hash(i + 7) - 0.5) * 0.04]} rotation={[0, hash(i + 2) * 3, 0]}>
          <boxGeometry args={[0.06, 0.003, 0.003]} />
        </mesh>
      ))}
    </group>
  );
};

// the knife for gyros, lying by the corner it's about to take
const Knife: React.FC = () => {
  const m = useMemo(() => ({ blade: lam({ color: "#d8dde3" }), handle: lam({ color: "#1c1c20" }) }), []);
  return (
    <group position={[1.2, COUNTER_Y + 0.006, -0.12]} rotation={[0, 0.5, 0]}>
      <mesh material={m.blade} position={[0.12, 0, 0]}>
        <boxGeometry args={[0.26, 0.004, 0.035]} />
      </mesh>
      <mesh material={m.handle} position={[-0.06, 0.006, 0]}>
        <boxGeometry args={[0.11, 0.016, 0.026]} />
      </mesh>
    </group>
  );
};

// the street shot: props casting hard shadows from the lamp, then the shadows are gone
const StreetProps: React.FC = () => {
  const m = useMemo(() => ({ stool: lam({ color: "#c43f33" }), leg: lam({ color: "#3a3f4c" }), can: lam({ color: "#4a8a5a" }) }), []);
  return (
    <group>
      <group position={[0.4, 0.12, 1.3]}>
        <mesh material={m.stool} position={[0, 0.62, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.05, 10]} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} material={m.leg} position={[Math.cos(i * 1.57) * 0.12, 0.3, Math.sin(i * 1.57) * 0.12]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 0.6, 4]} />
          </mesh>
        ))}
      </group>
      <mesh material={m.can} position={[-1.2, 0.12 + 0.35, 1.5]} castShadow>
        <cylinderGeometry args={[0.2, 0.17, 0.7, 10]} />
      </mesh>
    </group>
  );
};

// top-down: to turn left, a customer has to turn right three times
const Pawn: React.FC<{ t: number; x0: number; color: string }> = ({ t, x0, color }) => {
  const m = useMemo(() => ({ body: smooth({ color }), head: smooth({ color: "#f1e6d6" }) }), [color]);
  const pts: [number, number][] = [
    [x0, 5.2],
    [x0, 1.4],
    [x0 + 0.7, 1.4],
    [x0 + 0.7, 2.1],
    [x0 - 3.5, 2.1],
  ];
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = lens.reduce((a, b) => a + b, 0);
  let d = Math.max(0, t) * total;
  let seg = 0;
  while (seg < lens.length - 1 && d > lens[seg]) {
    d -= lens[seg];
    seg++;
  }
  const k = Math.min(1, d / lens[seg]);
  const [ax, az] = pts[seg];
  const [bx, bz] = pts[seg + 1];
  const x = ax + (bx - ax) * k;
  const z = az + (bz - az) * k;
  const yaw = Math.atan2(-(bx - ax), -(bz - az));
  return (
    <group position={[x, 0.12, z]} rotation={[0, yaw, 0]} scale={1.7}>
      <mesh material={m.body} position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.1, 0.16, 0.6, 10]} />
      </mesh>
      <mesh material={m.head} position={[0, 0.72, 0]}>
        <sphereGeometry args={[0.12, 10, 8]} />
      </mesh>
      <mesh material={m.body} position={[0, 0.72, -0.12]}>
        <boxGeometry args={[0.08, 0.04, 0.04]} />
      </mesh>
    </group>
  );
};

// --- the higher being: an AI grown from the fruit fly's connectome, hanging over the city ---------------------
const BRAIN_LOBES: [number, number, number, number, number, number][] = [
  [-9, 0, 0, 5, 7.5, 2.5], // optic lobe = its eye
  [9, 0, 0, 5, 7.5, 2.5],
  [0, 0.8, 0, 7, 5.2, 3],
  [0, -4.2, 0, 3.2, 2.2, 2],
];

// neurons carry soft pulses; the optic lobes (its eyes) close top-down, then the centre sleeps
const Connectome: React.FC<{ frame: number; t: number }> = ({ frame, t }) => {
  const { lines, base, lobeOf, ys, phase, step } = useMemo(() => {
    let seed = 11;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const inside = (x: number, y: number, z: number) =>
      BRAIN_LOBES.findIndex(([cx, cy, cz, rx, ry, rz]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 < 1);
    const pos: number[] = [];
    const col: number[] = [];
    const lobe: number[] = [];
    const yv: number[] = [];
    const ph: number[] = [];
    const st: number[] = [];
    for (let n = 0; n < 1600; n++) {
      let x = (rnd() - 0.5) * 28;
      let y = (rnd() - 0.5) * 16;
      let z = (rnd() - 0.5) * 6;
      const l0 = inside(x, y, z);
      if (l0 < 0) continue;
      const c = new THREE.Color().setHSL(rnd(), 0.85, 0.62);
      const p0 = rnd() * Math.PI * 2;
      let a = rnd() * Math.PI * 2;
      for (let k = 0; k < 16; k++) {
        a += (rnd() - 0.5) * 0.9;
        const nx = x + Math.cos(a) * 0.55;
        const ny = y + Math.sin(a) * 0.55;
        const nz = z + (rnd() - 0.5) * 0.3;
        if (inside(nx, ny, nz) < 0) {
          a += Math.PI;
          continue;
        }
        pos.push(x, y, z, nx, ny, nz);
        col.push(c.r, c.g, c.b, c.r, c.g, c.b);
        lobe.push(l0, l0);
        yv.push(y, ny);
        ph.push(p0, p0);
        st.push(k, k + 1);
        x = nx;
        y = ny;
        z = nz;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col.slice(), 3));
    const ls = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, fog: false }));
    return { lines: ls, base: Float32Array.from(col), lobeOf: lobe, ys: yv, phase: ph, step: st };
  }, []);
  const colors = lines.geometry.attributes.color as THREE.BufferAttribute;
  const time = frame / 30;
  const lid = interpolate(t, [0.25, 0.62], [8.5, -8.5], clamp);
  const centre = interpolate(t, [0.62, 0.95], [1, 0.03], clamp);
  for (let i = 0; i < lobeOf.length; i++) {
    const wave = Math.sin(phase[i] + step[i] * 0.5 - time * 2.4);
    let k = 0.35 + 0.65 * wave * wave;
    if (lobeOf[i] <= 1) k *= interpolate(ys[i] - lid, [-0.8, 0.8], [1, 0.03], clamp);
    else k *= centre;
    colors.setXYZ(i, base[i * 3] * k, base[i * 3 + 1] * k, base[i * 3 + 2] * k);
  }
  colors.needsUpdate = true;
  return <primitive object={lines} position={[0, 30, -30]} rotation={[0.78, 0, 0]} scale={0.95} />;
};

const Stars: React.FC = () => {
  const pts = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p: number[] = [];
    for (let i = 0; i < 260; i++) p.push((hash(i) - 0.5) * 120, 10 + hash(i + 300) * 70, -20 - hash(i + 600) * 50);
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ color: "#c8d2ff", size: 1, sizeAttenuation: false, fog: false }));
  }, []);
  return <primitive object={pts} />;
};

// far below: roofs of the city, for scale
const Rooftops: React.FC = () => {
  const m = useMemo(() => ({ wall: flat({ color: "#1f284c" }), win: flat({ color: "#ffc86a" }) }), []);
  return (
    <group>
      {Array.from({ length: 12 }).map((_, i) => {
        const h = 6 + hash(i + 9) * 6;
        const x = -44 + i * 8 + hash(i) * 3;
        const z = -70 - hash(i + 3) * 8;
        return (
          <group key={i}>
            <mesh material={m.wall} position={[x, h / 2, z]}>
              <boxGeometry args={[6 + hash(i + 7) * 3, h, 3]} />
            </mesh>
            {hash(i + 20) > 0.55 && (
              <mesh material={m.win} position={[x - 0.4 + hash(i + 5) * 0.8, h - 1.5, z + 1.51]}>
                <planeGeometry args={[0.8, 1]} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};

const ApartmentBlock: React.FC = () => {
  const m = useMemo(() => ({ wall: lam({ color: "#0e1120" }), dark: flat({ color: "#05060b" }), lit: flat({ color: "#ffc86a" }), man: flat({ color: "#2a1a0a" }) }), []);
  const LIT = 11;
  return (
    <group position={[0, 0, -14]}>
      <mesh material={m.wall} position={[0, 6, 0]}>
        <boxGeometry args={[10, 12, 3]} />
      </mesh>
      {Array.from({ length: 40 }).map((_, i) => (
        <mesh key={i} material={i === LIT ? m.lit : m.dark} position={[-4 + (i % 8) * 1.15, 1.5 + Math.floor(i / 8) * 2.2, 1.51]}>
          <planeGeometry args={[0.6, 0.9]} />
        </mesh>
      ))}
      <mesh material={m.man} position={[-4 + (LIT % 8) * 1.15 + 0.08, 1.5 + Math.floor(LIT / 8) * 2.2 - 0.12, 1.52]}>
        <planeGeometry args={[0.18, 0.5]} />
      </mesh>
    </group>
  );
};

const AngleWrap: React.FC = () => {
  const m = useMemo(
    () => ({ steel: lam({ color: PAL.steel }), tile: lam({ color: "#f2efe6" }), tomato: lam({ color: "#d8321d" }), pepper: lam({ color: "#3c9a2a" }) }),
    [],
  );
  return (
    <group position={[WORK[0], WORK[1] + 0.02, WORK[2]]}>
      <mesh material={m.steel} position={[0.02, 0.012, 0]}>
        <boxGeometry args={[0.16, 0.025, 0.04]} />
      </mesh>
      <mesh material={m.tile} position={[0.08, 0.012, -0.06]}>
        <boxGeometry args={[0.04, 0.025, 0.16]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} material={m.tomato} position={[-0.12 + i * 0.05, 0.004, 0.08 - i * 0.03]}>
          <cylinderGeometry args={[0.028, 0.028, 0.008, 8]} />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={`j${i}`} material={m.pepper} position={[-0.06 + i * 0.045, 0.006, -0.1 + (i % 2) * 0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.014, 0.006, 4, 8]} />
        </mesh>
      ))}
    </group>
  );
};

// each thing drops gently onto the open lavash, one after another
const Filling: React.FC<{ frame: number; t: number }> = ({ frame, t }) => {
  const m = useMemo(() => ({ pillow: smooth({ color: "#c9d6ff", emissive: "#1d2a56" }), odd: flat({ map: missingTex() }) }), []);
  const land = (start: number) => {
    const k = interpolate(t, [start, start + 0.22], [0, 1], clamp);
    return (1 - (1 - k) * (1 - k)) ;
  };
  const drop = (start: number, rest: number) => rest + (1 - land(start)) * 0.35;
  const [wx, wy, wz] = WORK;
  return (
    <group>
      {t >= 0.05 && (
        <mesh material={m.pillow} position={[wx - 0.09, drop(0.05, wy + 0.025), wz - 0.06]} scale={[0.7, 0.2, 0.5]}>
          <sphereGeometry args={[0.1, 10, 6]} />
        </mesh>
      )}
      {t >= 0.3 && <SineWave frame={frame} y={drop(0.3, wy + 0.035)} width={0.2} glow={0} />}
      {t >= 0.5 && <Blob frame={frame} scale={0.35} position={[wx + 0.09, drop(0.5, wy + 0.04), wz + 0.05]} />}
      {t >= 0.68 && (
        <mesh material={m.odd} position={[wx + 0.08, drop(0.68, wy + 0.03), wz - 0.08]} rotation={[0.4, frame * 0.01, 0]}>
          <octahedronGeometry args={[0.03]} />
        </mesh>
      )}
    </group>
  );
};

// white sauce laid in a zigzag over the open, filled lavash
const Drizzle: React.FC<{ t: number }> = ({ t }) => {
  const mat = useMemo(() => smooth({ color: "#fbfaf2", emissive: "#303028" }), []);
  const bottle = useMemo(() => ({ body: smooth({ color: "#f7f6f0" }), cap: lam({ color: "#d0402a" }) }), []);
  const N = 60;
  const p = interpolate(t, [0.05, 0.9], [0, 1], clamp);
  const at = (u: number): [number, number] => [WORK[0] - 0.18 + u * 0.36, WORK[2] + Math.sin(u * Math.PI * 7) * 0.12];
  const shown = Math.floor(p * N);
  const [bx, bz] = at(p);
  return (
    <group>
      {Array.from({ length: shown }).map((_, i) => {
        const [x, z] = at(i / N);
        return (
          <mesh key={i} material={mat} position={[x, WORK[1] + 0.05, z]} scale={[1, 0.45, 1]}>
            <sphereGeometry args={[0.011, 5, 4]} />
          </mesh>
        );
      })}
      {p < 1 && (
        <group position={[bx, WORK[1] + 0.3, bz]} rotation={[0, 0, Math.PI * 0.85]}>
          <mesh material={bottle.body} position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.04, 0.045, 0.2, 10]} />
          </mesh>
          <mesh material={bottle.cap} position={[0, 0.23, 0]}>
            <coneGeometry args={[0.03, 0.06, 8]} />
          </mesh>
        </group>
      )}
    </group>
  );
};

// --- fixed cameras only: nothing drifts, nothing shakes -----------------------------------------------------------
const CAMS: Record<KioskScene, Cam> = {
  stallWide: { pos: [1.7, 1.35, 4.3], look: [0, 1.75, -0.6] },
  corner: { pos: [0.95, 1.4, 0.4], look: [1.6, 1.05, -0.35] },
  cornerRound: { pos: [0.95, 1.4, 0.4], look: [1.6, 1.05, -0.35] },
  angleWrap: { pos: [-0.2, 1.5, 0.15], look: [-0.25, 1.0, -0.3] },
  shadows: { pos: [3.2, 2.4, 4.6], look: [-0.2, 0.5, 1.0] },
  turns: { pos: [0.3, 8.5, 3.6], look: [0.3, 0, 2.6] },
  cabbage: { pos: [0.95, 1.32, 0.18], look: [0.95, 1.03, -0.42] },
  badFeeling: { pos: [-0.05, 1.45, 0.3], look: [-0.25, 1.03, -0.3] },
  heavy: { pos: [3.8, 1.5, 6.2], look: [0, 1.3, -0.6] },
  press: { pos: [0.05, 1.35, 0.45], look: [0.4, 1.08, -0.3] },
  sauceCreep: { pos: [-0.05, 1.28, 0.4], look: [0.28, 1.08, -0.38] },
  nameless: { pos: [-0.25, 1.3, 0.5], look: [-0.25, 1.1, -0.3] },
  granny: { pos: [-0.05, 1.32, 0.4], look: [-0.25, 1.14, -0.3] },
  hertz: { pos: [-0.25, 1.24, 0.4], look: [-0.25, 1.14, -0.3] },
  fold: { pos: [-0.25, 1.6, 0.12], look: [-0.25, 1.0, -0.31] },
  sauce: { pos: [0.05, 1.3, 0.35], look: [-0.25, 1.1, -0.3] },
  heat: { pos: [-0.8, 1.3, 0.3], look: [-1.05, 1.1, -0.3] },
  lavashAlone: { pos: [-0.25, 1.45, 0.55], look: [-0.25, 1.0, -0.3] },
  selfWrap: { pos: [0, 0, 1.2], look: [0, 0, -4] },
  wireframe: { pos: [2.3, 1.45, 5.6], look: [0, 1.6, -0.6] },
  crunch: { pos: [-0.05, 1.18, 0.25], look: [-0.25, 1.06, -0.3] },
  brainSky: { pos: [0, 1, 0], look: [0, 22, -30] },
  soslan: { pos: [0, 2.2, 1], look: [-0.55, 3.6, -12.5] },
};

const KioskWorld: React.FC<{ id: KioskScene }> = ({ id }) => {
  const frame = useCurrentFrame();
  const sf = stepped(frame);
  const { durationInFrames } = useVideoConfig();
  const t = interpolate(frame, [0, durationInFrames], [0, 1], clamp);
  const cam = CAMS[id];

  const black = id === "selfWrap" || id === "soslan" || id === "wireframe" || id === "brainSky";
  const sky = id === "brainSky" ? "#070b18" : black ? "#000000" : PAL.sky;
  const kiosk = id !== "selfWrap" && id !== "soslan" && id !== "brainSky";
  const sheet = ["angleWrap", "granny", "hertz", "fold", "sauce", "lavashAlone", "nameless"].includes(id) || (id === "badFeeling" && t < 0.58);
  // "heavy": the whole kiosk leans under the envelope
  const lean = id === "heavy" ? -interpolate(t, [0.15, 0.8], [0, 0.13], clamp) : 0;
  // time-lapse for the cabbage: day and night flick past
  const dayNight = id === "cabbage" ? 0.7 + 0.5 * Math.sin(sf * 0.9) : 1;
  const shadowsOn = id === "shadows" && t < 0.45;

  return (
    <>
      <color attach="background" args={[sky]} />
      {!black && <fog attach="fog" args={[sky, 8, 34]} />}
      <CameraRig from={cam} to={cam} t={0} />
      {kiosk && (
        <group rotation={[0, 0, lean]}>
          <Kiosk rounded={id !== "stallWide" && id !== "corner"} light={id === "lavashAlone" ? 0.55 : id === "fold" || id === "sauce" ? 0.38 : dayNight} />
          <Grill glow={id === "heat" ? 0.4 + 0.6 * Math.min(1, t * 1.6) : 0.55} />
          {id !== "sauceCreep" && <GarlicBottle x={0.1} />}
          {id !== "cabbage" && <Bins age={0} frame={frame} />}
          {(id === "stallWide" || id === "corner") && <Knife />}
        </group>
      )}
      {kiosk && <StreetLamp on={id === "heavy" && t > 0.8 ? (Math.floor(sf / 2) % 3 === 0 ? 0.2 : 1) : 1} />}
      {id === "brainSky" && (
        <>
          <Stars />
          <Rooftops />
          <Connectome frame={frame} t={t} />
        </>
      )}
      {id === "shadows" && (
        <>
          <StreetProps />
          <ambientLight intensity={0.5} color="#9aa8d8" />
          {/* the shadow-casting light simply stops casting; the light itself stays */}
          <directionalLight
            position={[5, 6, 2]}
            intensity={2.6}
            color={PAL.lamp}
            castShadow={shadowsOn}
            shadow-mapSize-width={256}
            shadow-mapSize-height={256}
            shadow-camera-left={-5}
            shadow-camera-right={5}
            shadow-camera-top={5}
            shadow-camera-bottom={-5}
          />
        </>
      )}
      {id === "turns" && (
        <>
          <StreetProps />
          {[0, 1, 2].map((i) => (
            <Pawn key={i} t={interpolate(t, [i * 0.18, i * 0.18 + 0.7], [0, 1], clamp)} x0={-0.9 + i * 0.35} color={["#e0b040", "#5aa0e0", "#d05a8a"][i]} />
          ))}
          <directionalLight position={[3, 8, 4]} intensity={2.2} color="#ffe6c0" />
          <ambientLight intensity={0.8} color="#9aa8d8" />
        </>
      )}
      {id === "cabbage" && <Bins age={t} frame={frame} />}
      {sheet && <LavashSheet />}
      {id === "angleWrap" && <AngleWrap />}
      {/* no folding on screen: the bad feeling, then — cut — the finished parcel */}
      {id === "badFeeling" && (t < 0.58 ? <Blob frame={frame} /> : <Parcel x={WORK[0]} y={COUNTER_Y + 0.04} aura={1} frame={frame} />)}
      {id === "heavy" && <Parcel x={WORK[0]} y={COUNTER_Y + 0.04} />}
      {(id === "press" || id === "sauceCreep") && (
        <>
          <Parcel x={PRESS_X} y={COUNTER_Y + 0.095} />
          <Press
            close={id === "sauceCreep" ? 1 : interpolate(t, [0.05, 0.3], [0, 1], clamp)}
            glow={id === "sauceCreep" ? 0.6 + 0.4 * Math.abs(Math.sin(frame * 0.08)) : t > 0.45 ? 0.5 + 0.5 * Math.abs(Math.sin(frame * 0.1)) : 0}
          />
        </>
      )}
      {id === "sauceCreep" && <GarlicBottle x={0.08} />}
      {id === "nameless" && <Nameless frame={frame} />}
      {id === "granny" && <GrannySleep frame={frame} />}
      {id === "hertz" && <SineWave frame={frame} />}
      {id === "fold" && <Filling frame={frame} t={t} />}
      {id === "sauce" && (
        <>
          <Filling frame={frame} t={1} />
          <Drizzle t={t} />
        </>
      )}
      {id === "heat" && <Roll position={[GRILL_X, COUNTER_Y + 0.19, -0.3]} frame={frame} />}
      {id === "crunch" && (
        <>
          <Roll position={[WORK[0], COUNTER_Y + 0.075, WORK[2]]} tremble={interpolate(t, [0, 1], [0.2, 1.6])} frame={frame} />
          <Cracks n={Math.floor(interpolate(t, [0.2, 0.9], [0, 9], clamp))} />
        </>
      )}
      {id === "selfWrap" && <SelfWrap frame={frame} />}
      {id === "wireframe" && (
        <>
          <Wireframer progress={interpolate(t, [0, 0.6], [0.05, 1.01], clamp)} />
          <gridHelper args={[80, 80, "#36ff9a", "#1a6a44"]} position={[0, -0.001, 0]} />
        </>
      )}
      {id === "soslan" && <ApartmentBlock />}
    </>
  );
};

export const KioskScene3D: React.FC<{ id: KioskScene }> = ({ id }) => (
  <Ps1Canvas shadows={id === "shadows"}>
    <KioskWorld id={id} />
  </Ps1Canvas>
);
