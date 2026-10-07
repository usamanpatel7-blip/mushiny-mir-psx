import React, { useEffect, useMemo, useState } from "react";
import { useThree } from "@react-three/fiber";
import { continueRender, delayRender } from "remotion";
import * as THREE from "three";
import { pixelTexture, snapVertices } from "../ps1kit";

// a finer vertex snap than ep4's beach: he is mostly seen up close
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

const tieTexture = () =>
  pixelTexture(8, 16, (ctx) => {
    ctx.fillStyle = "#8e2424";
    ctx.fillRect(0, 0, 8, 16);
    ctx.fillStyle = "#b8403a";
    for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) if ((x + y) % 4 === 0) ctx.fillRect(x, y, 1, 1);
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
      suit: lam({ color: "#3e3e66" }),
      suitDark: lam({ color: "#2a2a46" }),
      shirt: lam({ color: "#e4e0d6" }),
      tie: lam({ map: tieTexture() }),
      skin: lam({ color: "#b08a66" }),
      head: lam({ color: "#9c8668" }),
      headDark: lam({ color: "#5e4e3e" }),
      neck: lam({ color: "#3a3430" }),
      teeth: lam({ color: "#f4f0e4", emissive: "#2a2a24" }),
      mouth: flat({ color: "#2a0c0c", side: THREE.DoubleSide }),
      gum: lam({ color: "#8a3a34" }),
      eye: lam({ vertexColors: true, emissive: "#141428" }),
      eyeWhite: flat({ color: "#ffffff" }),
      antenna: lam({ color: "#2e2824" }),
      gold: lam({ color: "#c89c34", emissive: "#2a1c00" }),
      band: lam({ color: "#1c1a18" }),
      hose: lam({ color: "#22201e" }),
      emblem: flat({ map: emblemTexture("#d8a83a", "#1c1a18") }),
      shoe: lam({ color: "#141210" }),
      puff: flat({ color: "#e8f0f4", transparent: true, opacity: 0.7, depthWrite: false }),
    }),
    [],
  );
export type CastMats = ReturnType<typeof useCastMats>;

const EYE_GEO = eyeGeometry();
export const useEyeGeo = () => EYE_GEO;

// --- arms -----------------------------------------------------------------------------------------------------
// angles in radians; at zero the arm hangs straight down. +z swings the right arm outwards, -x lifts it forwards
export type Arm = { sx: number; sz: number; ex: number; ez?: number; tw?: number; hx?: number; grip?: number };
export const POSE = {
  hang: { sx: 0, sz: 0.08, ex: -0.15, tw: 0 },
  desk: { sx: -0.3, sz: 0.12, ex: -1.3, ez: 0.25, tw: 0, hx: 0.2 },
  // the reference pose: elbows in, forearms out, palms up
  shrug: { sx: -0.2, sz: 0.3, ex: -1.6, ez: 0.9, tw: 0, hx: 0, grip: 0 },
  point: { sx: -0.4, sz: 1.35, ex: -0.25, tw: 0, grip: 0.8 },
  rail: { sx: -2.75, sz: 0.25, ex: -0.25, tw: 0, grip: 1 },
  pat: { sx: -1.35, sz: -0.05, ex: -0.1, tw: -1.4, hx: 0.2 },
  valve: { sx: -0.6, sz: -0.05, ex: -2.5, ez: -0.6, tw: 0, grip: 0.7 },
  // seated on a sofa, a hand on the knee
  knee: { sx: -0.35, sz: 0.1, ex: -0.9, tw: -0.5, hx: 0.2 },
} satisfies Record<string, Arm>;
export const mixArm = (a: Arm, b: Arm, k: number): Arm => {
  const m = (x = 0, y = 0) => x + (y - x) * k;
  return { sx: m(a.sx, b.sx), sz: m(a.sz, b.sz), ex: m(a.ex, b.ex), ez: m(a.ez, b.ez), tw: m(a.tw, b.tw), hx: m(a.hx, b.hx), grip: m(a.grip, b.grip) };
};

const Hand: React.FC<{ m: THREE.Material; grip: number }> = ({ m, grip }) => (
  <group>
    <mesh material={m} position={[0, -0.045, 0]}>
      <boxGeometry args={[0.085, 0.09, 0.03]} />
    </mesh>
    {[-0.03, -0.01, 0.01, 0.03].map((x, i) => (
      <group key={i} position={[x, -0.09, 0]} rotation={[grip * 1.4, 0, (i - 1.5) * 0.12 * (1 - grip)]}>
        <mesh material={m} position={[0, -0.03, 0]}>
          <boxGeometry args={[0.018, 0.065 - Math.abs(i - 1.5) * 0.008, 0.018]} />
        </mesh>
      </group>
    ))}
    <group position={[0.045, -0.03, 0.01]} rotation={[0.3 + grip, 0, -0.7]}>
      <mesh material={m} position={[0, -0.025, 0]}>
        <boxGeometry args={[0.02, 0.05, 0.02]} />
      </mesh>
    </group>
  </group>
);

const ArmRig: React.FC<{ side: 1 | -1; a: Arm; mats: CastMats; sleeve: THREE.Material; cuff: THREE.Material }> = ({ side, a, mats, sleeve, cuff }) => (
  <group position={[side * 0.25, 1.44, 0]} rotation={[a.sx, 0, side * a.sz]}>
    <mesh material={sleeve} position={[0, -0.15, 0]}>
      <boxGeometry args={[0.1, 0.32, 0.1]} />
    </mesh>
    <group position={[0, -0.3, 0]} rotation={[a.ex, 0, side * (a.ez ?? 0)]}>
      <group rotation={[0, side * (a.tw ?? 0), 0]}>
        <mesh material={sleeve} position={[0, -0.13, 0]}>
          <boxGeometry args={[0.085, 0.28, 0.085]} />
        </mesh>
        <mesh material={cuff} position={[0, -0.275, 0]}>
          <boxGeometry args={[0.07, 0.04, 0.07]} />
        </mesh>
        <group position={[0, -0.295, 0]} rotation={[a.hx ?? 0, 0, 0]} scale={[side, 1, 1]}>
          <Hand m={mats.skin} grip={a.grip ?? 0} />
        </group>
      </group>
    </group>
  </group>
);

// --- the head ---------------------------------------------------------------------------------------------------
// the grin: a crescent whose corners ride up to the eyes; u runs -1..1 across the mouth
const GRIN_W = 0.13;
const upperY = (u: number) => -0.012 + 0.03 * u * u;
const lowerY = (u: number, jaw: number) => -0.07 - jaw * 0.05 + 0.062 * u * u;
const mouthGeo = (jaw: number) => {
  const shape = new THREE.Shape();
  const N = 10;
  for (let i = 0; i <= N; i++) {
    const u = -1 + (2 * i) / N;
    if (i === 0) shape.moveTo(u * GRIN_W, upperY(u));
    else shape.lineTo(u * GRIN_W, upperY(u));
  }
  for (let i = N; i >= 0; i--) {
    const u = -1 + (2 * i) / N;
    shape.lineTo(u * GRIN_W * 0.98, lowerY(u, jaw));
  }
  return new THREE.ShapeGeometry(shape);
};

// a dark crescent, upper teeth along its top edge, lower teeth that drop with the jaw
export const Grin: React.FC<{ mats: CastMats; jaw?: number }> = ({ mats, jaw = 0 }) => {
  const j = Math.round(jaw * 4) / 4;
  const mouth = useMemo(() => mouthGeo(j), [j]);
  return (
    <group>
      <mesh geometry={mouth} material={mats.mouth} position={[0, 0, -0.012]} />
      {Array.from({ length: 11 }).map((_, i) => {
        const u = (i - 5) / 5.4;
        return (
          <mesh key={`u${i}`} material={mats.teeth} position={[u * GRIN_W * 0.95, upperY(u) - 0.018, -u * u * 0.05]} rotation={[0, -u * 0.8, 0.25 * u]}>
            <boxGeometry args={[0.022, 0.034 - Math.abs(u) * 0.008, 0.01]} />
          </mesh>
        );
      })}
      {Array.from({ length: 9 }).map((_, i) => {
        const u = (i - 4) / 4.8;
        return (
          <mesh key={`l${i}`} material={mats.teeth} position={[u * GRIN_W * 0.9, lowerY(u, j) + 0.016, -u * u * 0.05]} rotation={[0, -u * 0.8, 0.3 * u]}>
            <boxGeometry args={[0.021, 0.028 - Math.abs(u) * 0.006, 0.01]} />
          </mesh>
        );
      })}
    </group>
  );
};

// jaw 0 = the closed grin, 1 = wide open; eyes 0..1 lets them swell in
export const FlyHead: React.FC<{ mats: CastMats; jaw?: number; eyes?: number; twitch?: number }> = ({ mats, jaw = 0, eyes = 1, twitch = 0 }) => {
  const eyeGeo = useEyeGeo();
  return (
    <group>
      {/* skull: a faceted wedge, wide at the eyes, a pinched chin */}
      <mesh material={mats.head} scale={[1.0, 0.92, 0.9]}>
        <sphereGeometry args={[0.15, 6, 5]} />
      </mesh>
      <mesh material={mats.headDark} position={[0, -0.12, 0.01]} rotation={[Math.PI, 0, 0]} scale={[1.1, 1, 0.75]}>
        <coneGeometry args={[0.1, 0.12, 5]} />
      </mesh>
      {/* the muzzle that carries the grin */}
      <mesh material={mats.head} position={[0, -0.05, 0.07]} scale={[1.3, 0.85, 0.8]}>
        <sphereGeometry args={[0.12, 7, 4]} />
      </mesh>
      {/* brow ridge and nose bridge between the eyes */}
      <mesh material={mats.headDark} position={[0, 0.07, 0.115]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.07, 0.025, 0.05]} />
      </mesh>
      <mesh material={mats.head} position={[0, 0.03, 0.15]} rotation={[0.3, Math.PI / 4, 0]}>
        <boxGeometry args={[0.035, 0.07, 0.035]} />
      </mesh>
      {/* compound eyes, tilted outwards */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          geometry={eyeGeo}
          material={mats.eye}
          position={[side * 0.125, 0.065, 0.075]}
          rotation={[0, side * 0.5, side * -0.3]}
          scale={[0.105 * eyes, 0.098 * eyes, 0.085 * eyes]}
          visible={eyes > 0.01}
        />
      ))}
      {/* antennae: two jointed sticks, they twitch */}
      {[-1, 1].map((side) => (
        <group key={`a${side}`} position={[side * 0.04, 0.12, 0.03]} rotation={[-0.35 + twitch * 0.15 * side, 0, -side * 0.3]}>
          <mesh material={mats.antenna} position={[0, 0.08, 0]}>
            <boxGeometry args={[0.018, 0.17, 0.018]} />
          </mesh>
          <group position={[0, 0.16, 0]} rotation={[0.45 - twitch * 0.2, 0, -side * 0.2]}>
            <mesh material={mats.antenna} position={[0, 0.07, 0]}>
              <boxGeometry args={[0.014, 0.15, 0.014]} />
            </mesh>
          </group>
        </group>
      ))}
      <group position={[0, -0.035, 0.168]} rotation={[-0.2, 0, 0]}>
        <Grin mats={mats} jaw={jaw} />
      </group>
    </group>
  );
};

// the air bottle on his chest: gold, black bands, the mark, a valve right under the chin
export const Canister: React.FC<{ mats: CastMats; valve?: number }> = ({ mats, valve = 0 }) => (
  <group>
    <mesh material={mats.gold}>
      <cylinderGeometry args={[0.055, 0.055, 0.2, 8]} />
    </mesh>
    {[-0.07, 0.035].map((y) => (
      <mesh key={y} material={mats.band} position={[0, y, 0]}>
        <cylinderGeometry args={[0.057, 0.057, 0.035, 8]} />
      </mesh>
    ))}
    <mesh material={mats.emblem} position={[0, -0.018, 0.058]}>
      <planeGeometry args={[0.07, 0.052]} />
    </mesh>
    <mesh material={mats.gold} position={[0, 0.115, 0]}>
      <cylinderGeometry args={[0.03, 0.05, 0.035, 8]} />
    </mesh>
    <group position={[0, 0.145, 0]} rotation={[0, valve * 2.5, 0]}>
      <mesh material={mats.band}>
        <cylinderGeometry args={[0.018, 0.018, 0.04, 6]} />
      </mesh>
      <mesh material={mats.band} position={[0, 0.02, 0]}>
        <boxGeometry args={[0.08, 0.012, 0.016]} />
      </mesh>
    </group>
  </group>
);

const hoseGeo = () => {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.05, 1.53, 0.17),
    new THREE.Vector3(0.17, 1.5, 0.16),
    new THREE.Vector3(0.2, 1.56, 0.02),
    new THREE.Vector3(0.07, 1.6, -0.06),
  ]);
  return new THREE.TubeGeometry(curve, 8, 0.012, 4, false);
};
const HOSE = hoseGeo();

export type VozPose = {
  armL?: Arm;
  armR?: Arm;
  jaw?: number;
  eyes?: number;
  twitch?: number;
  headTilt?: number;
  headYaw?: number;
  headNod?: number;
  valve?: number;
  seated?: boolean;
  // white puffs of air leaving the valve (0 = none)
  puff?: number;
  s?: number;
};

// Воздухан, built after the reference stills. Origin at his feet; about 1.95 tall with the antennae.
export const Vozdukhan: React.FC<{ mats: CastMats; pose: VozPose; position?: [number, number, number]; rotation?: [number, number, number]; scale?: number }> = ({
  mats,
  pose,
  position,
  rotation,
  scale = 1,
}) => {
  const { armL = POSE.hang, armR = POSE.hang, jaw = 0, eyes = 1, twitch = 0, headTilt = 0, headYaw = 0, headNod = 0, valve = 0, seated = false, puff = 0, s = 0 } = pose;
  const legs = seated ? [-1.5, 1.5] : [0, 0];
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <group position={[0, seated ? -0.45 : 0, 0]}>
        {/* legs */}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.1, 0.95, 0]} rotation={[legs[0], 0, 0]}>
            <mesh material={mats.suitDark} position={[0, -0.23, 0]}>
              <boxGeometry args={[0.13, 0.47, 0.14]} />
            </mesh>
            <group position={[0, -0.46, 0]} rotation={[legs[1], 0, 0]}>
              <mesh material={mats.suitDark} position={[0, -0.22, 0]}>
                <boxGeometry args={[0.11, 0.45, 0.12]} />
              </mesh>
              <mesh material={mats.shoe} position={[0, -0.46, 0.05]}>
                <boxGeometry args={[0.11, 0.06, 0.24]} />
              </mesh>
            </group>
          </group>
        ))}
        {/* torso: a tapered four-sided jacket, flattened front to back */}
        <group scale={[1, 1, 0.55]}>
          <mesh material={mats.suit} position={[0, 1.2, 0]} rotation={[0, Math.PI / 4, 0]}>
            <cylinderGeometry args={[0.34, 0.27, 0.56, 4]} />
          </mesh>
        </group>
        {/* shirt V, tie, button */}
        <mesh material={mats.shirt} position={[0, 1.4, 0.13]} rotation={[-0.12, 0, 0]}>
          <circleGeometry args={[0.11, 3, -Math.PI / 2]} />
        </mesh>
        <mesh material={mats.tie} position={[0, 1.33, 0.142]} rotation={[-0.1, 0, 0]}>
          <boxGeometry args={[0.055, 0.26, 0.01]} />
        </mesh>
        <mesh material={mats.tie} position={[0, 1.465, 0.135]}>
          <boxGeometry args={[0.045, 0.04, 0.02]} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={`lap${side}`} material={mats.suitDark} position={[side * 0.075, 1.4, 0.135]} rotation={[-0.1, 0, side * 0.42]}>
            <boxGeometry args={[0.03, 0.24, 0.012]} />
          </mesh>
        ))}
        <mesh material={mats.band} position={[0, 1.1, 0.125]}>
          <boxGeometry args={[0.02, 0.02, 0.01]} />
        </mesh>
        {/* shoulders */}
        <mesh material={mats.suit} position={[0, 1.46, 0]} scale={[1, 0.35, 0.6]}>
          <boxGeometry args={[0.56, 0.2, 0.3]} />
        </mesh>
        <ArmRig side={-1} a={armL} mats={mats} sleeve={mats.suit} cuff={mats.shirt} />
        <ArmRig side={1} a={armR} mats={mats} sleeve={mats.suit} cuff={mats.shirt} />
        {/* neck, bottle and hose */}
        <mesh material={mats.neck} position={[0, 1.56, 0]}>
          <cylinderGeometry args={[0.045, 0.05, 0.16, 5]} />
        </mesh>
        <group position={[0.04, 1.38, 0.2]} rotation={[0.12, 0, -0.05]}>
          <Canister mats={mats} valve={valve} />
        </group>
        <mesh geometry={HOSE} material={mats.hose} />
        {puff > 0 &&
          Array.from({ length: 8 }).map((_, i) => {
            const k = (s * 2.2 + i / 8) % 1;
            return (
              <mesh key={`p${i}`} material={mats.puff} position={[0.04 + (hash(i) - 0.5) * 0.1 * k, 1.56 + k * 0.25, 0.22 + k * 0.5]} scale={(0.02 + k * 0.07) * puff}>
                <icosahedronGeometry args={[1, 0]} />
              </mesh>
            );
          })}
        <group position={[0, 1.76, 0.02]} rotation={[headNod, headYaw, headTilt]}>
          <FlyHead mats={mats} jaw={jaw} eyes={eyes} twitch={twitch} />
        </group>
      </group>
    </group>
  );
};

// --- the rest of the cast: students, passengers, neighbours ----------------------------------------------------
export type PersonLook = { body: string; legs: string; skin: string; hair: string | null; hat?: string };
export const PEOPLE: PersonLook[] = [
  { body: "#6a7a8a", legs: "#3a3e48", skin: "#c8a080", hair: "#3a2a1e" },
  { body: "#8a5a4a", legs: "#2e3038", skin: "#d0aa88", hair: "#c8b070" },
  { body: "#5a6a4a", legs: "#3a3a30", skin: "#b89070", hair: null },
  { body: "#7a6a8a", legs: "#2a2a34", skin: "#d4b090", hair: "#1e1a18" },
  { body: "#9a8a6a", legs: "#40382e", skin: "#c09878", hair: "#6a4a2a" },
  { body: "#4a5a7a", legs: "#2c2c30", skin: "#caa486", hair: "#8a8a8a" },
];

export const usePersonMats = (look: PersonLook) =>
  useMemo(
    () => ({ body: lam({ color: look.body }), legs: lam({ color: look.legs }), skin: lam({ color: look.skin }), hair: lam({ color: look.hair ?? look.skin }), eye: flat({ color: "#16120e" }) }),
    [look],
  );

// arms here are simple: [shoulder forward lift, outward swing] per side, forearms straight
export const Person: React.FC<{
  look: PersonLook;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  seated?: boolean;
  arms?: [[number, number], [number, number]];
  elbows?: [number, number];
  headTilt?: number;
  children?: React.ReactNode;
}> = ({ look, position, rotation, scale = 1, seated = false, arms = [[0, 0.1], [0, 0.1]], elbows = [0, 0], headTilt = 0, children }) => {
  const m = usePersonMats(look);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <group position={[0, seated ? -0.45 : 0, 0]}>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.1, 0.92, 0]} rotation={[seated ? -1.5 : 0, 0, 0]}>
            <mesh material={m.legs} position={[0, -0.22, 0]}>
              <boxGeometry args={[0.14, 0.46, 0.15]} />
            </mesh>
            <group position={[0, -0.45, 0]} rotation={[seated ? 1.5 : 0, 0, 0]}>
              <mesh material={m.legs} position={[0, -0.22, 0]}>
                <boxGeometry args={[0.12, 0.45, 0.13]} />
              </mesh>
            </group>
          </group>
        ))}
        <group scale={[1, 1, 0.6]}>
          <mesh material={m.body} position={[0, 1.18, 0]} rotation={[0, Math.PI / 4, 0]}>
            <cylinderGeometry args={[0.31, 0.27, 0.54, 4]} />
          </mesh>
        </group>
        {[-1, 1].map((side, i) => (
          <group key={`arm${side}`} position={[side * 0.23, 1.42, 0]} rotation={[arms[i][0], 0, side * arms[i][1]]}>
            <mesh material={m.body} position={[0, -0.15, 0]}>
              <boxGeometry args={[0.1, 0.3, 0.1]} />
            </mesh>
            <group position={[0, -0.3, 0]} rotation={[elbows[i], 0, 0]}>
              <mesh material={m.body} position={[0, -0.12, 0]}>
                <boxGeometry args={[0.09, 0.26, 0.09]} />
              </mesh>
              <mesh material={m.skin} position={[0, -0.3, 0]}>
                <boxGeometry args={[0.08, 0.1, 0.04]} />
              </mesh>
            </group>
          </group>
        ))}
        <mesh material={m.skin} position={[0, 1.52, 0]}>
          <cylinderGeometry args={[0.05, 0.055, 0.1, 5]} />
        </mesh>
        <group position={[0, 1.68, 0]} rotation={[0, 0, headTilt]}>
          <mesh material={m.skin} scale={[0.9, 1.1, 0.95]}>
            <sphereGeometry args={[0.13, 6, 5]} />
          </mesh>
          {look.hair && (
            <mesh material={m.hair} position={[0, 0.04, -0.02]} scale={[0.95, 0.8, 1]}>
              <sphereGeometry args={[0.14, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            </mesh>
          )}
          {[-1, 1].map((side) => (
            <mesh key={`e${side}`} material={m.eye} position={[side * 0.045, 0.01, 0.118]}>
              <boxGeometry args={[0.025, 0.025, 0.01]} />
            </mesh>
          ))}
          {children}
        </group>
      </group>
    </group>
  );
};
