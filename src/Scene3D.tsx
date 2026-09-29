import React, { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { CameraRig, Ps1Canvas, lambert, pixelTexture, repeated, snapVertices, useTextureSet, type Cam } from "./ps1kit";
import { HORROR, LIGHTS_OUT_START, LIGHTS_OUT_STEP, beatStartSec, stepped, type SceneId } from "./script";

const TEX_NAMES = ["wall", "floor", "ceiling", "lockers", "trim"] as const;
type TexName = (typeof TEX_NAMES)[number];
const useTextures = () => useTextureSet("tex", TEX_NAMES);

const LEN = 40;

const Corridor: React.FC<{ tex: Record<TexName, THREE.Texture>; offLamps: number[]; offLights: number[]; ambient: number; glow: number }> = ({
  tex,
  offLamps,
  offLights,
  ambient,
  glow,
}) => {
  const mats = useMemo(
    () => ({
      floor: lambert({ map: repeated(tex.floor, 2, LEN / 2), color: "#ffc88c" }),
      ceiling: lambert({ map: repeated(tex.ceiling, 2, LEN / 2), color: "#d8c78a" }),
      wall: lambert({ map: repeated(tex.wall, LEN / 2.5, 1.4), color: "#bda45c", side: THREE.DoubleSide }),
      trim: lambert({ map: repeated(tex.trim, LEN, 0.2), color: "#8a6a3a" }),
      light: snapVertices(new THREE.MeshBasicMaterial({ color: "#fff6cf" })),
      lightOff: snapVertices(new THREE.MeshBasicMaterial({ color: "#1c1a12" })),
    }),
    [tex],
  );
  return (
    <group>
      <mesh material={mats.floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -LEN / 2 + 4]}>
        <planeGeometry args={[4, LEN, 2, 20]} />
      </mesh>
      <mesh material={mats.ceiling} rotation={[Math.PI / 2, 0, 0]} position={[0, 3, -LEN / 2 + 4]}>
        <planeGeometry args={[4, LEN, 2, 20]} />
      </mesh>
      {[-2, 2].map((x) => (
        <group key={x}>
          <mesh material={mats.wall} rotation={[0, x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]} position={[x, 1.5, -LEN / 2 + 4]}>
            <planeGeometry args={[LEN, 3, 20, 2]} />
          </mesh>
          <mesh material={mats.trim} position={[x * 0.99, 0.08, -LEN / 2 + 4]}>
            <boxGeometry args={[0.04, 0.16, LEN]} />
          </mesh>
        </group>
      ))}
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={i} material={offLamps.includes(i) ? mats.lightOff : mats.light} position={[0, 2.98, 2 - i * 4.2]}>
          <boxGeometry args={[1.1, 0.04, 0.5]} />
        </mesh>
      ))}
      <ambientLight intensity={0.95 * ambient} />
      {glow > 0 && <pointLight position={[0, 0.8, -12]} intensity={glow} distance={14} decay={1} color="#ff7a2a" />}
      {Array.from({ length: 5 }).map((_, i) => (
        <pointLight key={i} position={[0, 2.6, 1 - i * 8]} intensity={offLights.includes(i) ? 0 : 5} distance={10} decay={1.4} color="#ffe9a8" />
      ))}
    </group>
  );
};

const Pigeon: React.FC<{ position: [number, number, number]; yaw: number; bob: number }> = ({ position, yaw, bob }) => {
  const mats = useMemo(
    () => ({
      body: lambert({ color: "#8d8f93" }),
      head: lambert({ color: "#5e6b72" }),
      beak: lambert({ color: "#c98f3a" }),
      eye: snapVertices(new THREE.MeshBasicMaterial({ color: "#e05a1c" })),
    }),
    [],
  );
  return (
    <group position={[position[0], position[1] + bob, position[2]]} rotation={[0, yaw, 0]}>
      <mesh material={mats.body} scale={[1.5, 1, 1]}>
        <icosahedronGeometry args={[0.11, 0]} />
      </mesh>
      <mesh material={mats.body} position={[-0.17, 0.02, 0]} rotation={[0, 0, Math.PI / 2 + 0.3]}>
        <coneGeometry args={[0.06, 0.16, 4]} />
      </mesh>
      <mesh material={mats.head} position={[0.14, 0.1, 0]}>
        <icosahedronGeometry args={[0.065, 0]} />
      </mesh>
      <mesh material={mats.beak} position={[0.21, 0.09, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.018, 0.06, 3]} />
      </mesh>
      <mesh material={mats.eye} position={[0.17, 0.12, 0.05]}>
        <boxGeometry args={[0.02, 0.02, 0.01]} />
      </mesh>
    </group>
  );
};

const WindowLedge: React.FC<{ withPigeons: boolean; frame: number }> = ({ withPigeons, frame }) => {
  const mats = useMemo(
    () => ({
      sky: snapVertices(new THREE.MeshBasicMaterial({ color: "#a9b8b0" })),
      frame: lambert({ color: "#6d5a34" }),
      ledge: lambert({ color: "#9a8756" }),
    }),
    [],
  );
  const z = -4.5;
  return (
    <group>
      <mesh material={mats.sky} position={[1.99, 1.8, z]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[1.6, 1.1]} />
      </mesh>
      {[
        [0, 2.37, 1.7, 0.08],
        [0, 1.23, 1.7, 0.08],
        [-0.82, 1.8, 0.08, 1.2],
        [0.82, 1.8, 0.08, 1.2],
        [0, 1.8, 0.05, 1.1],
      ].map(([dz, y, w, h], i) => (
        <mesh key={i} material={mats.frame} position={[1.96, y, z + dz]}>
          <boxGeometry args={[0.08, h, w]} />
        </mesh>
      ))}
      <mesh material={mats.ledge} position={[1.78, 1.15, z]}>
        <boxGeometry args={[0.45, 0.07, 1.9]} />
      </mesh>
      {withPigeons &&
        [-0.62, -0.2, 0.25, 0.66].map((dz, i) => (
          <Pigeon
            key={i}
            position={[1.72, 1.29, z + dz]}
            yaw={i % 2 === 0 ? Math.PI * 0.62 : Math.PI * 0.38}
            bob={Math.floor((frame + i * 5) / 6) % 2 === 0 ? 0 : 0.015}
          />
        ))}
    </group>
  );
};

const bagLabel = () =>
  pixelTexture(48, 64, (ctx) => {
    ctx.fillStyle = "#ddd3b2";
    ctx.fillRect(0, 0, 48, 64);
    ctx.fillStyle = "#b7a67a";
    for (let i = 0; i < 90; i++) ctx.fillRect((i * 29) % 48, (i * 17) % 64, 2, 2);
    ctx.fillStyle = "#b8332a";
    ctx.fillRect(0, 20, 48, 14);
    ctx.fillStyle = "#f3ead0";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("ГРЕЧКА", 24, 31);
    ctx.fillStyle = "#6b4a24";
    ctx.fillText("1 кг", 24, 48);
  });

// Easter egg: a connectome-style projection of the Drosophila brain, drawn procedurally.
const drosophilaBrain = () =>
  pixelTexture(96, 128, (ctx) => {
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const blobs: [number, number, number, number][] = [
      [16, 50, 14, 23],
      [80, 50, 14, 23],
      [48, 45, 23, 18],
      [48, 63, 11, 8],
    ];
    const inside = (x: number, y: number) => blobs.some(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1);
    ctx.fillStyle = "#050507";
    ctx.fillRect(0, 0, 96, 128);
    ctx.globalAlpha = 0.75;
    for (let n = 0; n < 900; n++) {
      let x = 2 + rnd() * 92;
      let y = 24 + rnd() * 52;
      if (!inside(x, y)) continue;
      let a = rnd() * Math.PI * 2;
      ctx.strokeStyle = `hsl(${Math.floor(rnd() * 360)}, 90%, 60%)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 18; k++) {
        a += (rnd() - 0.5) * 0.9;
        const nx = x + Math.cos(a) * 1.8;
        const ny = y + Math.sin(a) * 1.8;
        if (!inside(nx, ny)) {
          a += Math.PI;
          continue;
        }
        x = nx;
        y = ny;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#d8d8d8";
    ctx.font = "7px monospace";
    ctx.textAlign = "center";
    ctx.fillText("DROSOPHILA", 48, 104);
    ctx.fillText("MELANOGASTER", 48, 113);
  });

const BrainPoster: React.FC = () => {
  const mats = useMemo(() => ({ print: lambert({ map: drosophilaBrain() }), frame: lambert({ color: "#2a2418" }) }), []);
  return (
    <group position={[-1.97, 1.38, -5.2]} rotation={[0, Math.PI / 2, 0]}>
      <mesh material={mats.frame} position={[0, 0, -0.01]}>
        <boxGeometry args={[0.86, 1.12, 0.02]} />
      </mesh>
      <mesh material={mats.print} position={[0, 0, 0.005]}>
        <planeGeometry args={[0.78, 1.04]} />
      </mesh>
    </group>
  );
};

const LockerRow: React.FC<{ tex: Record<TexName, THREE.Texture> }> = ({ tex }) => {
  const mats = useMemo(() => {
    const front = snapVertices(new THREE.MeshBasicMaterial({ map: repeated(tex.lockers, 6, 1), color: "#d9d2b4" }));
    const side = lambert({ color: "#6e7071" });
    const label = bagLabel();
    return {
      bank: [front, side, side, side, side, side],
      interior: snapVertices(new THREE.MeshBasicMaterial({ color: "#16120a" })),
      door: lambert({ color: "#7d8a95" }),
      bag: [lambert({ color: "#cfc3a0" }), lambert({ color: "#cfc3a0" }), lambert({ color: "#e0d6b8" }), lambert({ color: "#cfc3a0" }), lambert({ map: label }), lambert({ color: "#cfc3a0" })],
      sticker: lambert({
        map: pixelTexture(32, 16, (ctx) => {
          ctx.fillStyle = "#efe6c0";
          ctx.fillRect(0, 0, 32, 16);
          ctx.fillStyle = "#3a2c14";
          ctx.font = "bold 10px monospace";
          ctx.textAlign = "center";
          ctx.fillText("2024", 16, 12);
        }),
      }),
    };
  }, [tex]);
  const z = -5.6;
  return (
    <group>
      <mesh material={mats.bank} position={[-1.8, 1.05, -6]}>
        <boxGeometry args={[0.4, 2.1, 8]} />
      </mesh>
      <mesh material={mats.interior} position={[-1.59, 1.25, z]}>
        <boxGeometry args={[0.01, 1.3, 0.62]} />
      </mesh>
      <group position={[-1.58, 1.25, z + 0.31]} rotation={[0, 1.15, 0]}>
        <mesh material={mats.door} position={[0, 0, -0.31]}>
          <boxGeometry args={[0.03, 1.3, 0.62]} />
        </mesh>
        <mesh material={mats.sticker} position={[0.02, 0.35, -0.31]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.26, 0.13]} />
        </mesh>
      </group>
      <mesh material={mats.bag} position={[-1.55, 0.92, z]} rotation={[0, Math.PI / 2 + 0.15, 0.04]}>
        <boxGeometry args={[0.3, 0.42, 0.16]} />
      </mesh>
    </group>
  );
};

const dayPage = (label: string) =>
  pixelTexture(40, 48, (ctx) => {
    ctx.fillStyle = "#efe7cc";
    ctx.fillRect(0, 0, 40, 48);
    ctx.fillStyle = "#b8332a";
    ctx.fillRect(0, 0, 40, 10);
    ctx.fillStyle = "#2a2418";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.fillText(label, 20, 34);
    ctx.fillStyle = "#b9ad8c";
    ctx.fillRect(4, 40, 32, 1);
  });

const PAGE_W = 0.5;
const PAGE_H = 0.6;

// Tear-off calendar on the right wall; `torn` = seconds at which each top page is ripped off.
const WallCalendar: React.FC<{ pages: string[]; torn: number[]; t: number }> = ({ pages, torn, t }) => {
  const mats = useMemo(
    () => ({
      pages: pages.map((p) => lambert({ map: dayPage(p), side: THREE.DoubleSide })),
      back: lambert({ color: "#6b5634" }),
    }),
    [pages],
  );
  const pos: [number, number, number] = [1.95, 1.65, -3.6];
  return (
    <group position={pos} rotation={[0, -Math.PI / 2, 0]}>
      <mesh material={mats.back} position={[0, 0, -0.03]}>
        <boxGeometry args={[PAGE_W + 0.06, PAGE_H + 0.08, 0.04]} />
      </mesh>
      {pages.map((_, i) => {
        const tornAt = torn[i] ?? Infinity;
        const fall = t - tornAt;
        if (fall > 1.2) return null;
        const f = Math.max(0, fall);
        return (
          <mesh
            key={i}
            material={mats.pages[i]}
            position={[f * 0.15, -f * f * 2.2, 0.005 * (pages.length - i) + f * 0.4]}
            rotation={[f * 2.4, f * 1.3, f * 0.9]}
          >
            <planeGeometry args={[PAGE_W, PAGE_H]} />
          </mesh>
        );
      })}
    </group>
  );
};

const PEDESTAL_TOP = 0.4;

const LooseDay: React.FC<{ label: string }> = ({ label }) => {
  const mat = useMemo(() => lambert({ map: dayPage(label), side: THREE.DoubleSide }), [label]);
  return (
    <mesh material={mat} position={[0, PEDESTAL_TOP + 0.01, -3.2]} rotation={[-Math.PI / 2, 0, 0.25]}>
      <planeGeometry args={[PAGE_W * 0.8, PAGE_H * 0.8]} />
    </mesh>
  );
};

const banknote = () =>
  pixelTexture(48, 24, (ctx) => {
    ctx.fillStyle = "#a8b27a";
    ctx.fillRect(0, 0, 48, 24);
    ctx.fillStyle = "#7c8a52";
    ctx.fillRect(2, 2, 44, 20);
    ctx.fillStyle = "#c9c79a";
    ctx.fillRect(4, 4, 14, 16);
    ctx.fillStyle = "#3e4526";
    ctx.font = "bold 9px monospace";
    ctx.fillText("100", 24, 15);
  });

// Four 100-ruble notes land one by one: 400 ₽.
const CashDrop: React.FC<{ t: number; drops: number[] }> = ({ t, drops }) => {
  const mat = useMemo(() => lambert({ map: banknote(), side: THREE.DoubleSide }), []);
  return (
    <group position={[0, PEDESTAL_TOP, -3.2]}>
      {drops.map((d, i) => {
        const k = Math.min(1, Math.max(0, (t - d) / 0.35));
        if (t < d) return null;
        const y = 0.01 + i * 0.004 + (1 - k) * (1 - k) * 1.4;
        return (
          <mesh key={i} material={mat} position={[(i % 2 ? 0.05 : -0.04) + i * 0.01, y, i * 0.03 - 0.04]} rotation={[-Math.PI / 2, 0, (i - 1.5) * 0.35 + (1 - k) * 2]}>
            <planeGeometry args={[0.36, 0.18]} />
          </mesh>
        );
      })}
    </group>
  );
};

// 12 + 10 + 8 + 6 + 4 + 2 = 42 bricks
const BrickPile: React.FC = () => {
  const mats = useMemo(() => ["#c07458", "#a8644b", "#d08466", "#b06a50"].map((c) => lambert({ color: c })), []);
  const bricks: { p: [number, number, number]; r: number; m: number }[] = [];
  const rows = [12, 10, 8, 6, 4, 2];
  let n = 0;
  rows.forEach((count, layer) => {
    for (let i = 0; i < count; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const jitter = Math.sin(n * 7.3) * 0.04;
      bricks.push({
        p: [(col - 1.5) * 0.27 * (1 - layer * 0.12) + jitter, 0.04 + layer * 0.075, (row - (count / 4 - 1) / 2) * 0.14 * (1 - layer * 0.1)],
        r: Math.sin(n * 3.1) * 0.35,
        m: n % 4,
      });
      n++;
    }
  });
  return (
    <group position={[0, 0, -3.4]}>
      {bricks.map((b, i) => (
        <mesh key={i} material={mats[b.m]} position={b.p} rotation={[0, b.r, 0]}>
          <boxGeometry args={[0.25, 0.07, 0.12]} />
        </mesh>
      ))}
    </group>
  );
};

// 10 x 6 x 5 = 300 shares
const SHARE_DIMS = [6, 10, 5] as const;

const SplitBag: React.FC<{ progress: number }> = ({ progress }) => {
  const mesh = useMemo(() => {
    const count = SHARE_DIMS[0] * SHARE_DIMS[1] * SHARE_DIMS[2];
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), lambert({ color: "#ffffff" }), count);
    const light = new THREE.Color("#ddd1ad");
    const dark = new THREE.Color("#7a5a30");
    const red = new THREE.Color("#b8332a");
    for (let i = 0; i < count; i++) {
      const y = Math.floor(i / (SHARE_DIMS[0] * SHARE_DIMS[2])) % SHARE_DIMS[1];
      const c = y >= 4 && y <= 5 ? red : (i * 7919) % 5 === 0 ? dark : light;
      m.setColorAt(i, c);
    }
    return m;
  }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const spread = 1 + progress * 1.4;
  let i = 0;
  for (let y = 0; y < SHARE_DIMS[1]; y++) {
    for (let x = 0; x < SHARE_DIMS[0]; x++) {
      for (let z = 0; z < SHARE_DIMS[2]; z++) {
        const bx = (x - (SHARE_DIMS[0] - 1) / 2) * 0.05;
        const by = (y - (SHARE_DIMS[1] - 1) / 2) * 0.05;
        const bz = (z - (SHARE_DIMS[2] - 1) / 2) * 0.05;
        const wobble = Math.sin(i * 12.9898) * 0.5;
        dummy.position.set(bx * spread + wobble * progress * 0.08, by * spread + 0.7, bz * spread);
        dummy.rotation.set(progress * wobble * 2, progress * wobble * 3, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        i++;
      }
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} position={[0, 0, -3.2]} />;
};

const Pedestal: React.FC<{ tex: Record<TexName, THREE.Texture> }> = ({ tex }) => {
  const mat = useMemo(() => lambert({ map: repeated(tex.trim, 1, 1), color: "#a08a60" }), [tex]);
  return (
    <mesh material={mat} position={[0, 0.2, -3.2]}>
      <boxGeometry args={[0.7, 0.4, 0.5]} />
    </mesh>
  );
};

const Ps1World: React.FC<{ id: SceneId }> = ({ id }) => {
  const frame = stepped(useCurrentFrame());
  const { durationInFrames } = useVideoConfig();
  const tex = useTextures();
  const t = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: "clamp" });
  const ease = (x: number) => 1 - Math.pow(1 - x, 2);

  const window: Cam = { pos: [-0.9, 1.45, -1.9], look: [1.9, 1.45, -4.6] };
  const calendar: Cam = { pos: [-0.7, 1.55, -1.7], look: [1.95, 1.5, -3.7] };
  const pedestal: Cam = { pos: [1.0, 1.35, -1.4], look: [0, 0.35, -3.2] };
  const cams: Record<SceneId, [Cam, Cam]> = {
    // static on purpose: the poster's fine detail shimmers under a moving PS1 camera
    emptyPedestal: [
      { pos: [1.35, 1.3, 0.1], look: [-0.7, 0.55, -4.1] },
      { pos: [1.35, 1.3, 0.1], look: [-0.7, 0.55, -4.1] },
    ],
    tuesday: [calendar, { pos: [-0.3, 1.55, -2.3], look: [1.95, 1.55, -3.65] }],
    cash: [pedestal, { pos: [0.75, 1.2, -1.8], look: [0, 0.38, -3.2] }],
    wednesday: [pedestal, { pos: [0.75, 1.2, -1.8], look: [0, 0.38, -3.2] }],
    week: [calendar, calendar],
    bricks: [
      { pos: [0.7, 0.55, -2.1], look: [0, 0.18, -3.4] },
      { pos: [1.2, 1.5, -0.9], look: [0, 0.18, -3.4] },
    ],
    pigeons: [window, window],
    pigeonsGone: [window, window],
    locker: [
      { pos: [0.6, 1.6, 1.5], look: [-1.8, 1.1, -7] },
      { pos: [-0.2, 1.35, -3.9], look: [-1.8, 1.05, -5.7] },
    ],
    shares: [
      { pos: [1.3, 1.35, -0.6], look: [0, 0.75, -3.2] },
      { pos: [0.9, 1.25, -0.9], look: [0, 0.75, -3.2] },
    ],
    spawn: [
      { pos: [0, 1.55, 3.4], look: [0, 1.3, -20] },
      { pos: [0, 1.55, 3.4], look: [0, 1.3, -20] },
    ],
    spawnEnd: [
      { pos: [0, 1.55, 3.4], look: [0, 1.3, -20] },
      { pos: [0, 1.55, 3.4], look: [0, 1.3, -20] },
    ],
  };
  const [from, to] = cams[id];
  const sec = frame / 30;
  // ending: lamps die from the far end toward the camera
  const outAt = LIGHTS_OUT_START - beatStartSec[14];
  const lampsOut = id === "spawnEnd" ? Math.max(0, Math.floor((sec - outAt) / LIGHTS_OUT_STEP) + 1) : 0;
  const flickerOff = false;
  const abs = beatStartSec[14] + sec;
  const flickerOn = id === "spawnEnd" && HORROR.flickers.some(([a, b]) => abs >= a && abs < b);
  const ambient = id === "spawnEnd" ? (flickerOn ? 0.55 : interpolate(lampsOut, [0, 9], [1, 0], { extrapolateRight: "clamp" })) : 1;
  // Kebab-Maker is somewhere down there: a grill glow breathing in the dark
  const glow = id === "emptyPedestal" ? 3 + Math.floor(frame / 3) % 3 : 0;
  // local-time tears/drops, synced to the HUD (absolute times minus beat start)
  const WEEK_TEARS = [14.95, 15.15, 15.35, 15.55].map((a) => a - 13.69);
  const lampsOutForWeek = id === "week" ? WEEK_TEARS.filter((x) => sec >= x).length : 0;
  const offLamps = [...(flickerOff ? [2] : []), ...Array.from({ length: Math.max(lampsOutForWeek * 2, flickerOn ? 8 : lampsOut) }, (_, i) => 8 - i)];
  const offLights = [
    ...(flickerOff ? [1] : []),
    ...Array.from({ length: Math.max(lampsOutForWeek + (lampsOutForWeek === 4 ? 1 : 0), flickerOn ? 4 : Math.ceil(lampsOut / 2)) }, (_, i) => 4 - i),
  ];
  const shareProgress = interpolate(t, [0.3, 0.85], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <>
      <color attach="background" args={["#1d180b"]} />
      <fog attach="fog" args={["#1d180b", 3, 17]} />
      <CameraRig from={from} to={to} t={ease(t)} />
      {tex && <Corridor tex={tex} offLamps={offLamps} offLights={offLights} ambient={ambient} glow={glow} />}
      {(id === "pigeons" || id === "pigeonsGone") && <WindowLedge withPigeons={id === "pigeons"} frame={frame} />}
      {id === "locker" && tex && <LockerRow tex={tex} />}
      {(id === "emptyPedestal" || id === "spawn" || id === "spawnEnd") && <BrainPoster />}
      {id === "tuesday" && <WallCalendar pages={["ВТ", "СР", "ЧТ"]} torn={[6.23 - 2.78]} t={sec} />}
      {id === "week" && <WallCalendar pages={["ЧТ", "ПТ", "СБ", "ВС"]} torn={WEEK_TEARS} t={sec} />}
            {(id === "cash" || id === "wednesday" || id === "emptyPedestal") && tex && <Pedestal tex={tex} />}
      {id === "cash" && <CashDrop t={sec} drops={[8.3, 8.45, 8.6, 8.75].map((a) => a - 7.19)} />}
      {id === "wednesday" && sec < 12.55 - 9.88 && <LooseDay label="СР" />}
      {id === "bricks" && <BrickPile />}
      {(id === "cash" || id === "wednesday" || id === "bricks" || id === "shares" || id === "emptyPedestal") && (
        <pointLight position={[0.3, 1.9, -2.6]} intensity={4.5} distance={4} decay={1.2} color="#fff1c4" />
      )}
      {id === "shares" && (
        <>
          {tex && <Pedestal tex={tex} />}
          <SplitBag progress={shareProgress} />
        </>
      )}
    </>
  );
};

export const Scene3D: React.FC<{ id: SceneId }> = ({ id }) => (
  <Ps1Canvas>
    <Ps1World id={id} />
  </Ps1Canvas>
);
