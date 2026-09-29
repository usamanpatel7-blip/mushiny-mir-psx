import React, { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { CameraRig, Ps1Canvas, pixelTexture, useTextureSet, type Cam } from "../ps1kit";
import { DotaWorld } from "./Dota";
import { clamp, ease, flat, hash, lam, smooth } from "./mat";
import { FPS, isDota, type PcScene, type Scene3 } from "./script";

// --- procedural textures -----------------------------------------------------------------
const boardTex = () =>
  pixelTexture(128, 160, (ctx) => {
    ctx.fillStyle = "#3f7c4c";
    ctx.fillRect(0, 0, 128, 160);
    // gold traces: orthogonal runs with one bend
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(hash(i) * 128);
      const y = Math.floor(hash(i + 300) * 160);
      const l1 = 6 + Math.floor(hash(i + 600) * 30);
      const l2 = 4 + Math.floor(hash(i + 900) * 20);
      ctx.fillStyle = i % 5 === 0 ? "#e8c860" : "#c89c44";
      if (i % 2) {
        ctx.fillRect(x, y, l1, 1);
        ctx.fillRect(x + l1, y, 1, l2);
      } else {
        ctx.fillRect(x, y, 1, l1);
        ctx.fillRect(x, y + l1, l2, 1);
      }
    }
    // silkscreen outlines and vias
    ctx.fillStyle = "#cfe6d2";
    for (let i = 0; i < 14; i++) {
      const x = Math.floor(hash(i + 50) * 118);
      const y = Math.floor(hash(i + 80) * 150);
      const w = 4 + Math.floor(hash(i + 110) * 8);
      ctx.fillRect(x, y, w, 1);
      ctx.fillRect(x, y + 5, w, 1);
      ctx.fillRect(x, y, 1, 6);
      ctx.fillRect(x + w, y, 1, 6);
    }
    ctx.fillStyle = "#e0c070";
    for (let i = 0; i < 60; i++) ctx.fillRect(Math.floor(hash(i + 1000) * 128), Math.floor(hash(i + 1100) * 160), 1, 1);
  });

const matTex = () =>
  pixelTexture(64, 96, (ctx) => {
    ctx.fillStyle = "#3f7a68";
    ctx.fillRect(0, 0, 64, 96);
    ctx.fillStyle = "#4c8a76";
    for (let x = 0; x < 64; x += 4) ctx.fillRect(x, 0, 1, 96);
    for (let y = 0; y < 96; y += 4) ctx.fillRect(0, y, 64, 1);
    ctx.fillStyle = "#6aa892";
    for (let x = 0; x < 64; x += 16) ctx.fillRect(x, 0, 1, 96);
    for (let y = 0; y < 96; y += 16) ctx.fillRect(0, y, 64, 1);
  });

const PHOTO = ["soslan-photo"] as const;

// --- the pale Monday: a doughy half-cooked dumpling hangs where the sun should be -------------
const Pelmen: React.FC<{ s: number }> = ({ s }) => {
  const m = useMemo(
    () => ({
      dough: smooth({ color: "#f4eedc", emissive: "#4a463a" }),
      crimp: smooth({ color: "#faf6ea", emissive: "#4a463a" }),
      raw: flat({ color: "#dcc4ba" }),
      grey: flat({ color: "#d6d2c8" }),
      halo: flat({ color: "#d6d6cc", fog: false }),
    }),
    [],
  );
  const geo = useMemo(() => {
    const R = 1;
    const shape = new THREE.Shape();
    shape.moveTo(-R, 0);
    shape.absarc(0, 0, R, Math.PI, 0, true);
    shape.lineTo(-R, 0);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.42, bevelSize: 0.3, bevelSegments: 4, curveSegments: 22 });
    g.translate(0, 0, -0.175);
    return g;
  }, []);
  return (
    <group position={[-0.2, 9.4 + s * 0.04, -12]} rotation={[0.1, 0.2 + Math.sin(s * 0.4) * 0.05, -0.1]} scale={2.9}>
      <mesh material={m.halo} position={[0, 0.45, -0.6]}>
        <circleGeometry args={[2.3, 20]} />
      </mesh>
      <mesh material={m.dough} geometry={geo} />
      {Array.from({ length: 17 }).map((_, i) => {
        const a = Math.PI - (i / 16) * Math.PI;
        return (
          <mesh key={i} material={m.crimp} position={[Math.cos(a) * 1.3, Math.sin(a) * 1.3 + 0.02, 0]} rotation={[0, 0, a]} scale={[0.7, 1, 0.45]}>
            <sphereGeometry args={[0.16, 6, 4]} />
          </mesh>
        );
      })}
      {/* undercooked: the filling shows through the pale dough */}
      <mesh material={m.raw} position={[0.1, 0.45, 0.61]} scale={[1, 0.55, 1]}>
        <circleGeometry args={[0.42, 12]} />
      </mesh>
      <mesh material={m.grey} position={[-0.45, 0.25, 0.6]} scale={[1, 0.6, 1]}>
        <circleGeometry args={[0.2, 10]} />
      </mesh>
    </group>
  );
};

const Rooftops: React.FC = () => {
  const m = useMemo(
    () => ({
      walls: ["#8a90a0", "#9a9894", "#7e8698", "#a49e96"].map((c) => lam({ color: c })),
      roof: ["#626a80", "#76666a", "#5e6a76"].map((c) => lam({ color: c })),
      win: flat({ color: "#c2c8d0" }),
      pole: lam({ color: "#5c6274" }),
      wire: new THREE.LineBasicMaterial({ color: "#6a7084" }),
    }),
    [],
  );
  const houses = useMemo(
    () =>
      Array.from({ length: 13 }).map((_, i) => ({
        x: -9 + i * 1.5 + (hash(i) - 0.5) * 0.6,
        z: -3.5 - hash(i + 3) * 5,
        w: 1.2 + hash(i + 7) * 0.9,
        h: 2.2 + hash(i + 9) * 3.2,
        gable: hash(i + 11) > 0.45,
      })),
    [],
  );
  const wire = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24;
      pts.push(new THREE.Vector3(-4 + u * 8, 5.4 - Math.sin(u * Math.PI) * 0.6, -3));
    }
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), m.wire);
  }, [m.wire]);
  return (
    <group>
      {houses.map((hs, i) => (
        <group key={i} position={[hs.x, 0, hs.z]}>
          <mesh material={m.walls[i % 4]} position={[0, hs.h / 2, 0]}>
            <boxGeometry args={[hs.w, hs.h, 1.4]} />
          </mesh>
          {hs.gable ? (
            <mesh material={m.roof[i % 3]} position={[0, hs.h + 0.35, 0]} rotation={[0, 0, 0]} scale={[hs.w * 0.62, 0.7, 1.45]}>
              <cylinderGeometry args={[1, 1, 1, 3]} />
            </mesh>
          ) : (
            <>
              <mesh material={m.pole} position={[hs.w * 0.2, hs.h + 0.6, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 1.2, 4]} />
              </mesh>
              <mesh material={m.pole} position={[hs.w * 0.2, hs.h + 1.0, 0]}>
                <boxGeometry args={[0.6, 0.03, 0.03]} />
              </mesh>
              <mesh material={m.pole} position={[hs.w * 0.2, hs.h + 0.8, 0]}>
                <boxGeometry args={[0.4, 0.03, 0.03]} />
              </mesh>
            </>
          )}
          {[0, 1, 2].map((r) =>
            [-1, 1].map((c) =>
              hs.h - 0.8 - r * 0.9 > 0.4 ? (
                <mesh key={`${r}${c}`} material={m.win} position={[c * hs.w * 0.22, hs.h - 0.8 - r * 0.9, 0.71]}>
                  <planeGeometry args={[0.22, 0.34]} />
                </mesh>
              ) : null,
            ),
          )}
        </group>
      ))}
      <primitive object={wire} />
    </group>
  );
};

// --- inside the old system unit ----------------------------------------------------------------
const Fan: React.FC<{ s: number }> = ({ s }) => {
  const m = useMemo(() => ({ frame: lam({ color: "#4e566c" }), blade: lam({ color: "#6a7288" }), hub: lam({ color: "#e0cc60" }) }), []);
  return (
    <group position={[0, 0.47, 0]}>
      {[
        [0, 0.29, 0.64, 0.06],
        [0, -0.29, 0.64, 0.06],
        [0.29, 0, 0.06, 0.64],
        [-0.29, 0, 0.06, 0.64],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} material={m.frame} position={[x, 0, z]}>
          <boxGeometry args={[w, 0.12, d]} />
        </mesh>
      ))}
      <group rotation={[0, s * 2.2, 0]}>
        {Array.from({ length: 7 }).map((_, i) => (
          <group key={i} rotation={[0, (i / 7) * Math.PI * 2, 0]}>
            <mesh material={m.blade} position={[0.15, 0, 0]} rotation={[0.45, 0, 0]}>
              <boxGeometry args={[0.2, 0.012, 0.09]} />
            </mesh>
          </group>
        ))}
        <mesh material={m.hub}>
          <cylinderGeometry args={[0.07, 0.07, 0.05, 10]} />
        </mesh>
      </group>
    </group>
  );
};

const Heatsink: React.FC<{ s: number }> = ({ s }) => {
  const mat = useMemo(() => lam({ color: "#b2bcc8" }), []);
  return (
    <group>
      <mesh material={mat} position={[0, 0.03, 0]}>
        <boxGeometry args={[0.62, 0.06, 0.62]} />
      </mesh>
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={i} material={mat} position={[0, 0.21, -0.28 + i * 0.07]}>
          <boxGeometry args={[0.62, 0.3, 0.022]} />
        </mesh>
      ))}
      <Fan s={s} />
    </group>
  );
};

// thermal paste with bite marks
const Paste: React.FC = () => {
  const mat = useMemo(() => smooth({ color: "#7e8494" }), []);
  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    const bites = [0.5, 1.5, 4.3];
    const N = 48;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      let r = 0.17 + 0.012 * Math.sin(a * 5);
      for (const b of bites) {
        const d = Math.atan2(Math.sin(a - b), Math.cos(a - b));
        if (Math.abs(d) < 0.42) r -= 0.075 * Math.sqrt(1 - (d / 0.42) ** 2);
      }
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 3 });
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  return (
    <group>
      <mesh material={mat} geometry={geo} position={[0, 0.03, 0]} />
      {[
        [0.26, 0.1],
        [0.3, -0.05],
        [-0.22, 0.24],
      ].map(([x, z], i) => (
        <mesh key={i} material={mat} position={[x, 0.015, z]} scale={[1, 0.5, 1]}>
          <dodecahedronGeometry args={[0.018 + i * 0.004]} />
        </mesh>
      ))}
    </group>
  );
};

const DustBall: React.FC<{ s: number; r?: number }> = ({ s, r = 0.05 }) => {
  const mat = useMemo(() => lam({ color: "#c8c4d0" }), []);
  return (
    <group rotation={[0, s * 0.15, 0]}>
      {Array.from({ length: 16 }).map((_, i) => (
        <mesh key={i} material={mat} position={[(hash(i) - 0.5) * r * 1.4, r * 0.8 + (hash(i + 3) - 0.5) * r, (hash(i + 6) - 0.5) * r * 1.4]} rotation={[i, i * 2, 0]}>
          <icosahedronGeometry args={[r * (0.35 + hash(i + 9) * 0.3), 0]} />
        </mesh>
      ))}
    </group>
  );
};

// a dust mite: pale oval, eight legs, a small head; `lean` tips it towards whoever it talks to
const Mite: React.FC<{ x: number; z: number; yaw: number; lean: number; s: number; k: number }> = ({ x, z, yaw, lean, s, k }) => {
  const m = useMemo(() => ({ body: smooth({ color: "#ecd2c0" }), leg: lam({ color: "#8a6450" }), eye: flat({ color: "#3a4058" }) }), []);
  const breathe = 1 + 0.04 * Math.sin(s * 3 + k);
  return (
    <group position={[x, 0, z]} rotation={[0, yaw, 0]}>
      <group rotation={[lean, 0, 0]} position={[0, 0.02, 0]}>
        <mesh material={m.body} position={[0, 0.022, -0.01]} scale={[1, 0.75 * breathe, 1.3]}>
          <sphereGeometry args={[0.022, 8, 6]} />
        </mesh>
        <mesh material={m.body} position={[0, 0.03, 0.035]}>
          <sphereGeometry args={[0.013, 6, 4]} />
        </mesh>
        {[-1, 1].map((sd) => (
          <mesh key={sd} material={m.eye} position={[sd * 0.006, 0.036, 0.046]}>
            <boxGeometry args={[0.004, 0.004, 0.004]} />
          </mesh>
        ))}
      </group>
      {[-1, 1].map((sd) =>
        [0, 1, 2, 3].map((i) => (
          <mesh key={`${sd}${i}`} material={m.leg} position={[sd * 0.03, 0.012, 0.02 - i * 0.016]} rotation={[0, 0, sd * (1.1 + 0.1 * Math.sin(s * 2 + i + k))]}>
            <cylinderGeometry args={[0.005, 0.003, 0.04, 3]} />
          </mesh>
        )),
      )}
    </group>
  );
};

const Candle: React.FC<{ x: number; z: number; h: number; s: number; i: number }> = ({ x, z, h, s, i }) => {
  const m = useMemo(() => ({ wax: smooth({ color: "#f4ecd8", emissive: "#3a2a18" }), flame: flat({ color: "#ffc860" }), core: flat({ color: "#fff6d0" }) }), []);
  const sway = Math.sin(s * 2.6 + i * 1.7) * 0.12;
  return (
    <group position={[x, 0, z]}>
      <mesh material={m.wax} position={[0, h / 2, 0]}>
        <cylinderGeometry args={[0.011, 0.012, h, 7]} />
      </mesh>
      <group position={[0, h + 0.004, 0]} rotation={[0, 0, sway]}>
        <mesh material={m.flame} position={[0, 0.012, 0]}>
          <coneGeometry args={[0.008, 0.028, 5]} />
        </mesh>
        <mesh material={m.core} position={[0, 0.007, 0]}>
          <coneGeometry args={[0.004, 0.012, 4]} />
        </mesh>
      </group>
    </group>
  );
};

const PhotoFrame: React.FC = () => {
  const tex = useTextureSet("ps1", PHOTO);
  const m = useMemo(() => ({ wood: lam({ color: "#8a5a3c" }), gold: lam({ color: "#b8a070" }), ribbon: lam({ color: "#444a60" }), leg: lam({ color: "#7a5034" }) }), []);
  const photo = useMemo(() => (tex ? flat({ map: tex["soslan-photo"] }) : null), [tex]);
  return (
    <group rotation={[-0.2, 0, 0]}>
      <mesh material={m.wood} position={[0, 0.15, 0]}>
        <boxGeometry args={[0.28, 0.3, 0.02]} />
      </mesh>
      <mesh material={m.gold} position={[0, 0.15, 0.006]}>
        <boxGeometry args={[0.24, 0.26, 0.012]} />
      </mesh>
      {photo && (
        <mesh material={photo} position={[0, 0.15, 0.0135]}>
          <planeGeometry args={[0.22, 0.24]} />
        </mesh>
      )}
      {/* mourning ribbon across the corner */}
      <mesh material={m.ribbon} position={[-0.1, 0.27, 0.016]} rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[0.13, 0.024, 0.006]} />
      </mesh>
      <mesh material={m.leg} position={[0, 0.1, -0.06]} rotation={[0.55, 0, 0]}>
        <boxGeometry args={[0.03, 0.2, 0.01]} />
      </mesh>
    </group>
  );
};

type CaseMode = "wide" | "paste" | "mites" | "memorial";
const CPU: [number, number] = [-0.5, -0.6];
const MITES_AT: [number, number] = [0.85, 0.5];
const MEMORIAL_AT: [number, number] = [-0.8, 0.75];

const PcCase: React.FC<{ mode: CaseMode; s: number; t: number }> = ({ mode, s, t }) => {
  const m = useMemo(() => {
    const bt = boardTex();
    return {
      board: lam({ map: bt }),
      steel: lam({ color: "#8e96a4" }),
      beige: lam({ color: "#d2c8ae" }),
      socket: lam({ color: "#ddd4bc" }),
      cpu: lam({ color: "#b6bec8" }),
      ram: lam({ color: "#44946a" }),
      chip: lam({ color: "#5a6278" }),
      goldc: lam({ color: "#e0bc5a" }),
      slot: lam({ color: "#e2ddcc" }),
      psu: lam({ color: "#6e7688" }),
      cap: lam({ color: "#3e62b8" }),
      capTop: lam({ color: "#d0d6de" }),
      ribbon: lam({ color: "#c8c8d0", side: THREE.DoubleSide }),
      red: lam({ color: "#cc4a3a" }),
      yellow: lam({ color: "#e2c450" }),
      black: lam({ color: "#4c5468" }),
      card: lam({ color: "#2c6a58" }),
      eye: flat({ color: "#3e2c36" }),
      mote: flat({ color: "#dcdce8" }),
    };
  }, []);
  const cables = useMemo(() => {
    const tube = (pts: [number, number, number][], r: number) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 20, r, 5, false);
    const rect = new THREE.Shape();
    rect.moveTo(-0.004, -0.13);
    rect.lineTo(0.004, -0.13);
    rect.lineTo(0.004, 0.13);
    rect.lineTo(-0.004, 0.13);
    rect.lineTo(-0.004, -0.13);
    const ribbonPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.35, 0.05, 0.75),
      new THREE.Vector3(1.2, 0.3, 0.2),
      new THREE.Vector3(1.05, 0.32, -0.45),
      new THREE.Vector3(1.0, 0.07, -0.95),
    ]);
    return {
      ribbon: new THREE.ExtrudeGeometry(rect, { steps: 24, bevelEnabled: false, extrudePath: ribbonPath }),
      power: [0, 1, 2].map((i) =>
        tube(
          [
            [0.7 + i * 0.05, 0.7, -1.3],
            [0.62 + i * 0.05, 0.6, -0.9],
            [0.2 + i * 0.05, 0.25, 0.1],
            [-0.3 + i * 0.05, 0.08, 0.35],
          ],
          0.024,
        ),
      ),
    };
  }, []);
  const wake = mode === "wide" ? ease((t - 0.55) / 0.2) : 0;
  m.eye.color.set("#3e2c36").lerp(new THREE.Color("#ff4a30"), wake);
  const heatsinkOff = mode !== "wide";
  return (
    <group>
      {/* case: steel tray, beige walls */}
      <mesh material={m.steel} position={[0, -0.03, -0.1]}>
        <boxGeometry args={[4, 0.04, 4.8]} />
      </mesh>
      <mesh material={m.board} position={[0, 0.001, -0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.2, 4]} />
      </mesh>
      <mesh material={m.beige} position={[-1.95, 0.7, -0.1]}>
        <boxGeometry args={[0.08, 1.45, 4.8]} />
      </mesh>
      <mesh material={m.psu} position={[0, 0.7, -2.5]}>
        <boxGeometry args={[4, 1.45, 0.08]} />
      </mesh>
      {/* CPU socket */}
      <group position={[CPU[0], 0, CPU[1]]}>
        <mesh material={m.socket} position={[0, 0.03, 0]}>
          <boxGeometry args={[0.72, 0.06, 0.72]} />
        </mesh>
        <mesh material={m.cpu} position={[0, 0.075, 0]}>
          <boxGeometry args={[0.56, 0.03, 0.56]} />
        </mesh>
        {heatsinkOff ? (
          <group position={[0, 0.06, 0]}>
            <Paste />
          </group>
        ) : (
          <group position={[0, 0.09, 0]}>
            <Heatsink s={s} />
          </group>
        )}
      </group>
      {heatsinkOff && (
        <group position={[-1.3, 0.34, -0.2]} rotation={[0, 0.3, 1.45]}>
          <Heatsink s={0} />
        </group>
      )}
      {/* capacitors round the socket */}
      {Array.from({ length: 9 }).map((_, i) => {
        const x = CPU[0] - 0.55 + (i % 5) * 0.28;
        const z = CPU[1] + (i < 5 ? 0.56 : -0.56);
        return (
          <group key={i} position={[x, 0, z]}>
            <mesh material={m.cap} position={[0, 0.07, 0]}>
              <cylinderGeometry args={[0.045, 0.045, 0.14, 8]} />
            </mesh>
            <mesh material={m.capTop} position={[0, 0.142, 0]}>
              <cylinderGeometry args={[0.045, 0.045, 0.006, 8]} />
            </mesh>
          </group>
        );
      })}
      {/* RAM */}
      {[0, 1, 2].map((i) => (
        <group key={i} position={[0.3 + i * 0.16, 0, -0.55]}>
          <mesh material={m.slot} position={[0, 0.03, 0]}>
            <boxGeometry args={[0.07, 0.06, 1.1]} />
          </mesh>
          <mesh material={m.ram} position={[0, 0.2, 0]}>
            <boxGeometry args={[0.025, 0.3, 1.0]} />
          </mesh>
          <mesh material={m.goldc} position={[0, 0.07, 0]}>
            <boxGeometry args={[0.028, 0.03, 0.96]} />
          </mesh>
          {Array.from({ length: 5 }).map((_, k) => (
            <mesh key={k} material={m.chip} position={[0.016, 0.22, -0.4 + k * 0.2]}>
              <boxGeometry args={[0.012, 0.12, 0.13]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* PSU */}
      <mesh material={m.psu} position={[0.95, 0.42, -1.75]}>
        <boxGeometry args={[1.5, 0.84, 1.0]} />
      </mesh>
      {cables.power.map((g, i) => (
        <mesh key={i} geometry={g} material={[m.red, m.yellow, m.black][i]} />
      ))}
      <mesh geometry={cables.ribbon} material={m.ribbon} />
      {/* expansion cards */}
      {[1.45, 1.8].map((z, i) => (
        <group key={i} position={[-0.45, 0, z]}>
          <mesh material={m.card} position={[0, 0.27, 0]}>
            <boxGeometry args={[1.5, 0.46, 0.03]} />
          </mesh>
          <mesh material={m.chip} position={[0.2, 0.25, 0.02]}>
            <boxGeometry args={[0.24, 0.14, 0.012]} />
          </mesh>
          <mesh material={m.goldc} position={[0, 0.03, 0]}>
            <boxGeometry args={[1.0, 0.05, 0.035]} />
          </mesh>
          <mesh material={m.steel} position={[-0.8, 0.3, 0]}>
            <boxGeometry args={[0.06, 0.6, 0.12]} />
          </mesh>
        </group>
      ))}
      {/* dust bunnies */}
      {(
        [
          [-1.6, 0.9],
          [1.5, 1.4],
          [-1.5, -1.9],
          [0.02, -0.56],
        ] as [number, number][]
      ).map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <DustBall s={0} r={0.08 + i * 0.01} />
        </group>
      ))}
      {/* slow dust motes in the light */}
      {Array.from({ length: 18 }).map((_, i) => (
        <mesh
          key={`mt${i}`}
          material={m.mote}
          position={[-1 + hash(i) * 2.4, 0.3 + ((hash(i + 5) * 1.4 + s * 0.05) % 1.4), -1.4 + hash(i + 9) * 2.6 + Math.sin(s * 0.5 + i) * 0.05]}
        >
          <boxGeometry args={[0.012, 0.012, 0.012]} />
        </mesh>
      ))}
      {/* Sosik wakes: two red eyes under the ribbon cable */}
      {mode === "wide" && (
        <group position={[0.02, 0.08, -0.45]}>
          {[-1, 1].map((sd) => (
            <mesh key={sd} material={m.eye} position={[sd * 0.035, 0, 0]}>
              <sphereGeometry args={[0.024, 6, 5]} />
            </mesh>
          ))}
          <pointLight position={[0, 0.06, 0.08]} intensity={0.7 * wake} distance={0.35} color="#ff5a3a" />
        </group>
      )}
      {mode === "mites" && (
        <group position={[MITES_AT[0], 0, MITES_AT[1]]}>
          <DustBall s={s} />
          {Array.from({ length: 5 }).map((_, k) => {
            const a = (k / 5) * Math.PI * 2 + 0.3;
            const talk = Math.pow(0.5 + 0.5 * Math.sin(s * 2.2 - k * 1.26), 4);
            return <Mite key={k} x={Math.sin(a) * 0.15} z={Math.cos(a) * 0.15} yaw={a + Math.PI} lean={0.1 + 0.35 * talk} s={s} k={k} />;
          })}
        </group>
      )}
      {mode === "memorial" && (
        <group position={[MEMORIAL_AT[0], 0, MEMORIAL_AT[1]]}>
          <PhotoFrame />
          {[-0.12, -0.06, 0, 0.06, 0.12].map((x, i) => (
            <Candle key={i} x={x} z={0.1 + Math.abs(x) * 0.25} h={0.04 + hash(i + 2) * 0.03} s={s} i={i} />
          ))}
          <mesh material={m.red} position={[0.02, 0.012, 0.05]}>
            <dodecahedronGeometry args={[0.014]} />
          </mesh>
          {[
            [-0.24, 0.06, 0.6],
            [-0.2, 0.2, 0.4],
            [0.22, 0.2, -0.4],
            [0.25, 0.06, -0.6],
          ].map(([x, z, yaw], k) => (
            <Mite key={k} x={x} z={z} yaw={Math.PI + yaw} lean={0.35 + 0.03 * Math.sin(s * 1.2 + k)} s={s} k={k} />
          ))}
          <pointLight position={[0, 0.3, 0.3]} intensity={0.22 + 0.02 * Math.sin(s * 2.1)} distance={0.8} decay={2} color="#ffc080" />
        </group>
      )}
      <ambientLight intensity={mode === "memorial" ? 1.0 : 1.3} color="#8e9cd0" />
      <pointLight position={[0.3, 2.4, 0.6]} intensity={mode === "memorial" ? 3 : 5} distance={6} decay={1.2} color="#ffe6c4" />
    </group>
  );
};

// --- the radio that works, and the same radio laid out part by part ---------------------------------
const RADIO_Z = -0.4;

const Radio: React.FC<{ s: number }> = ({ s }) => {
  const m = useMemo(
    () => ({
      wood: lam({ color: "#aa6c3c" }),
      panel: lam({ color: "#e8dcc0" }),
      grille: lam({ color: "#cab88e" }),
      slat: lam({ color: "#9a8660" }),
      dial: flat({ color: "#f2e6b4" }),
      tick: flat({ color: "#6a5a40" }),
      needle: flat({ color: "#d83a2a" }),
      knob: lam({ color: "#50525e" }),
      led: flat({ color: "#6aff7a" }),
      halo: flat({ color: "#6aff7a", transparent: true, opacity: 0.3, depthWrite: false }),
      handle: lam({ color: "#5c4c40" }),
      rod: lam({ color: "#c8ccd4" }),
    }),
    [],
  );
  const needle = -0.16 + 0.32 * (0.5 + 0.5 * Math.sin(s * 0.7));
  const F = 0.251;
  return (
    <group position={[0, 0, RADIO_Z]}>
      <mesh material={m.wood} position={[0, 0.42, 0]}>
        <boxGeometry args={[1.3, 0.8, 0.5]} />
      </mesh>
      <mesh material={m.panel} position={[0, 0.42, F]}>
        <boxGeometry args={[1.18, 0.68, 0.01]} />
      </mesh>
      <mesh material={m.grille} position={[-0.26, 0.42, F + 0.006]}>
        <boxGeometry args={[0.54, 0.54, 0.01]} />
      </mesh>
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} material={m.slat} position={[-0.26, 0.21 + i * 0.07, F + 0.013]}>
          <boxGeometry args={[0.54, 0.018, 0.01]} />
        </mesh>
      ))}
      <mesh material={m.dial} position={[0.3, 0.6, F + 0.006]}>
        <boxGeometry args={[0.44, 0.16, 0.01]} />
      </mesh>
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={`t${i}`} material={m.tick} position={[0.14 + i * 0.04, 0.63, F + 0.013]}>
          <boxGeometry args={[0.006, i % 2 ? 0.03 : 0.05, 0.004]} />
        </mesh>
      ))}
      <mesh material={m.needle} position={[0.3 + needle, 0.6, F + 0.015]}>
        <boxGeometry args={[0.01, 0.13, 0.004]} />
      </mesh>
      {[0.2, 0.42].map((x) => (
        <mesh key={x} material={m.knob} position={[x, 0.3, F + 0.03]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.075, 0.06, 10]} />
        </mesh>
      ))}
      {/* the OK light */}
      <mesh material={m.led} position={[0.47, 0.46, F + 0.012]}>
        <sphereGeometry args={[0.022, 8, 6]} />
      </mesh>
      <mesh material={m.halo} position={[0.47, 0.46, F + 0.02]}>
        <circleGeometry args={[0.055, 12]} />
      </mesh>
      <pointLight position={[0.47, 0.46, F + 0.15]} intensity={0.8} distance={0.8} color="#6aff7a" />
      {/* handle and antenna */}
      <mesh material={m.handle} position={[0, 0.84, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.3, 0.025, 4, 14, Math.PI]} />
      </mesh>
      <mesh material={m.rod} position={[0.5, 1.1, -0.1]} rotation={[0, 0, -0.45]}>
        <cylinderGeometry args={[0.008, 0.012, 0.9, 4]} />
      </mesh>
      {[-0.5, 0.5].map((x) => (
        <mesh key={`f${x}`} material={m.handle} position={[x, 0.01, 0.15]}>
          <boxGeometry args={[0.1, 0.03, 0.1]} />
        </mesh>
      ))}
    </group>
  );
};

// music notes drifting up from the speaker: it works
const Notes: React.FC<{ s: number }> = ({ s }) => {
  const mats = useMemo(() => [0, 1, 2].map(() => flat({ color: "#fff4d8", transparent: true, depthWrite: false })), []);
  return (
    <group>
      {mats.map((mat, i) => {
        const k = ((s * 0.45 + i / 3) % 1 + 1) % 1;
        mat.opacity = interpolate(k, [0, 0.2, 0.7, 1], [0, 1, 1, 0]);
        return (
          <group key={i} position={[-0.3 + Math.sin(k * 5 + i) * 0.08 - i * 0.12, 0.95 + k * 0.7, RADIO_Z + 0.3]} rotation={[0, 0, 0.2 * Math.sin(k * 4 + i)]}>
            <mesh material={mat}>
              <boxGeometry args={[0.06, 0.045, 0.01]} />
            </mesh>
            <mesh material={mat} position={[0.026, 0.07, 0]}>
              <boxGeometry args={[0.012, 0.15, 0.01]} />
            </mesh>
            <mesh material={mat} position={[0.05, 0.135, 0]}>
              <boxGeometry args={[0.05, 0.02, 0.01]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

const Screwdriver: React.FC<{ x: number; z: number; yaw: number }> = ({ x, z, yaw }) => {
  const m = useMemo(() => ({ handle: lam({ color: "#d8443a" }), shaft: lam({ color: "#c8ccd4" }) }), []);
  return (
    <group position={[x, 0.02, z]} rotation={[0, yaw, Math.PI / 2]}>
      <mesh material={m.handle} position={[0, -0.08, 0]}>
        <cylinderGeometry args={[0.025, 0.028, 0.16, 6]} />
      </mesh>
      <mesh material={m.shaft} position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.007, 0.007, 0.18, 4]} />
      </mesh>
    </group>
  );
};

const RadioRoom: React.FC<{ s: number }> = ({ s }) => {
  const m = useMemo(() => ({ table: lam({ color: "#9c6c46" }), wall: lam({ color: "#5f8a88" }), skirting: lam({ color: "#4e7472" }) }), []);
  return (
    <group>
      <mesh material={m.table} position={[0, -0.03, 0]}>
        <boxGeometry args={[4, 0.06, 2.6]} />
      </mesh>
      <mesh material={m.wall} position={[0, 1.2, -1.1]}>
        <boxGeometry args={[6, 3, 0.05]} />
      </mesh>
      <Radio s={s} />
      <Notes s={s} />
      <Screwdriver x={0.85} z={0.25} yaw={0.5} />
      <ambientLight intensity={1.2} color="#b4bcd8" />
      <directionalLight position={[1.5, 3, 2.5]} intensity={2.2} color="#fff0d8" />
    </group>
  );
};

// knolling: the radio in parts, in a perfect grid; the LED is still green
const Knolling: React.FC<{ s: number }> = ({ s }) => {
  const m = useMemo(() => {
    const t = matTex();
    return {
      mat: lam({ map: t }),
      table: lam({ color: "#9c6c46" }),
      wood: lam({ color: "#aa6c3c" }),
      panel: lam({ color: "#e8dcc0" }),
      grille: lam({ color: "#cab88e" }),
      slat: lam({ color: "#9a8660" }),
      cone: lam({ color: "#8a7a64" }),
      dial: lam({ color: "#f2e6b4" }),
      glass: lam({ color: "#cfe2ee", transparent: true, opacity: 0.85 }),
      tubeIn: lam({ color: "#8a92a0" }),
      knob: lam({ color: "#50525e" }),
      cap: lam({ color: "#3e62b8" }),
      res: lam({ color: "#e0c890" }),
      band: lam({ color: "#b8443a" }),
      copper: lam({ color: "#d08a4a" }),
      screw: lam({ color: "#c8ccd4" }),
      board: lam({ color: "#3a7e58" }),
      chip: lam({ color: "#444a5e" }),
      led: flat({ color: "#6aff7a" }),
      halo: flat({ color: "#6aff7a", transparent: true, opacity: 0.3, depthWrite: false }),
      handle: lam({ color: "#5c4c40" }),
    };
  }, []);
  const glow = 0.85 + 0.15 * Math.sin(s * 2);
  const Z = [-1.62, -1.02, -0.5, -0.05, 0.3, 0.62];
  return (
    <group>
      <mesh material={m.table} position={[0, -0.04, 0]}>
        <boxGeometry args={[5, 0.06, 6]} />
      </mesh>
      <mesh material={m.mat} position={[0, 0.001, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.1, 3.3]} />
      </mesh>
      {/* row 0: panels */}
      <mesh material={m.wood} position={[-0.47, 0.02, Z[0]]}>
        <boxGeometry args={[0.8, 0.04, 0.5]} />
      </mesh>
      <mesh material={m.panel} position={[0.47, 0.02, Z[0]]}>
        <boxGeometry args={[0.8, 0.04, 0.5]} />
      </mesh>
      {/* row 1: speaker, grille, dial */}
      <mesh material={m.cone} position={[-0.6, 0.03, Z[1]]}>
        <cylinderGeometry args={[0.2, 0.2, 0.06, 12]} />
      </mesh>
      <mesh material={m.knob} position={[-0.6, 0.07, Z[1]]}>
        <cylinderGeometry args={[0.06, 0.06, 0.03, 8]} />
      </mesh>
      <mesh material={m.grille} position={[0, 0.01, Z[1]]}>
        <boxGeometry args={[0.42, 0.02, 0.42]} />
      </mesh>
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} material={m.slat} position={[0, 0.025, Z[1] - 0.175 + i * 0.07]}>
          <boxGeometry args={[0.42, 0.01, 0.015]} />
        </mesh>
      ))}
      <mesh material={m.dial} position={[0.6, 0.01, Z[1]]}>
        <boxGeometry args={[0.38, 0.02, 0.14]} />
      </mesh>
      {/* row 2: the board — the OK light still on */}
      <mesh material={m.board} position={[0, 0.012, Z[2]]}>
        <boxGeometry args={[0.72, 0.024, 0.34]} />
      </mesh>
      {[-0.24, -0.08, 0.08].map((x) => (
        <mesh key={x} material={m.chip} position={[x, 0.035, Z[2] + 0.04]}>
          <boxGeometry args={[0.1, 0.025, 0.08]} />
        </mesh>
      ))}
      <mesh material={m.led} position={[0.24, 0.045, Z[2] - 0.05]}>
        <sphereGeometry args={[0.024, 8, 6]} />
      </mesh>
      <mesh material={m.halo} position={[0.24, 0.05, Z[2] - 0.05]} rotation={[-Math.PI / 2, 0, 0]} scale={glow}>
        <circleGeometry args={[0.07, 12]} />
      </mesh>
      <pointLight position={[0.24, 0.2, Z[2] - 0.05]} intensity={1.1 * glow} distance={0.9} color="#6aff7a" />
      <mesh material={m.handle} position={[-0.72, 0.02, Z[2]]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
        <torusGeometry args={[0.13, 0.02, 4, 10, Math.PI]} />
      </mesh>
      <mesh material={m.screw} position={[0.72, 0.012, Z[2]]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.01, 0.34, 4]} />
      </mesh>
      {/* row 3: valves and knobs */}
      {[-0.6, -0.42, -0.24].map((x) => (
        <group key={x} position={[x, 0.05, Z[3]]}>
          <mesh material={m.tubeIn}>
            <cylinderGeometry args={[0.022, 0.022, 0.16, 6]} />
          </mesh>
          <mesh material={m.glass}>
            <cylinderGeometry args={[0.045, 0.045, 0.22, 8]} />
          </mesh>
        </group>
      ))}
      {[0.1, 0.3, 0.5, 0.7].map((x, i) => (
        <mesh key={x} material={i < 2 ? m.knob : m.cap} position={[x, 0.035, Z[3]]}>
          <cylinderGeometry args={i < 2 ? [0.07, 0.075, 0.06, 10] : [0.04, 0.04, 0.08, 8]} />
        </mesh>
      ))}
      {/* row 4: resistors, coil */}
      {[-0.6, -0.45, -0.3, -0.15, 0].map((x) => (
        <group key={x} position={[x, 0.015, Z[4]]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh material={m.res}>
            <cylinderGeometry args={[0.014, 0.014, 0.08, 6]} />
          </mesh>
          <mesh material={m.band}>
            <cylinderGeometry args={[0.0145, 0.0145, 0.012, 6]} />
          </mesh>
        </group>
      ))}
      <mesh material={m.copper} position={[0.45, 0.02, Z[4]]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.07, 0.022, 5, 12]} />
      </mesh>
      {/* row 5: screws */}
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={`sc${i}`} material={m.screw} position={[-0.64 + i * 0.16, 0.008, Z[5]]}>
          <cylinderGeometry args={[0.022, 0.022, 0.016, 6]} />
        </mesh>
      ))}
      <Screwdriver x={0.98} z={-0.4} yaw={Math.PI / 2} />
      <ambientLight intensity={1.3} color="#b4bcd8" />
      <directionalLight position={[1, 4, 1.5]} intensity={2.0} color="#fff0d8" />
    </group>
  );
};

// --- fixed cameras only -------------------------------------------------------------------------
const CAMS: Record<PcScene, Cam> = {
  pelmen: { pos: [0, 1.6, 9], look: [0, 4.6, 0] },
  pcCase: { pos: [0.15, 2.9, 1.25], look: [0.05, 0, -0.2] },
  radio: { pos: [0.3, 0.72, 1.75], look: [0, 0.38, RADIO_Z] },
  knolling: { pos: [0, 3.3, 0.5], look: [0, 0, -0.62] },
  paste: { pos: [CPU[0] + 0.08, 0.95, CPU[1] + 0.62], look: [CPU[0], 0.02, CPU[1] - 0.22] },
  mites: { pos: [MITES_AT[0] + 0.02, 0.36, MITES_AT[1] + 0.5], look: [MITES_AT[0], 0.0, MITES_AT[1] + 0.1] },
  memorial: { pos: [MEMORIAL_AT[0] + 0.06, 0.42, MEMORIAL_AT[1] + 0.72], look: [MEMORIAL_AT[0], 0.05, MEMORIAL_AT[1] + 0.2] },
};

const PcWorld: React.FC<{ id: PcScene }> = ({ id }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const s = frame / FPS;
  const t = interpolate(frame, [0, durationInFrames], [0, 1], clamp);
  const cam = CAMS[id];
  const pale = id === "pelmen";
  const sky = pale ? "#c4c8c8" : id === "radio" || id === "knolling" ? "#5f8a88" : "#2e3852";
  return (
    <>
      <color attach="background" args={[sky]} />
      {pale && <fog attach="fog" args={[sky, 18, 60]} />}
      <CameraRig from={cam} to={cam} t={0} />
      {pale && (
        <>
          <Pelmen s={s} />
          <Rooftops />
          <ambientLight intensity={1.6} color="#e6e4dc" />
          <directionalLight position={[0, 6, 8]} intensity={1.4} color="#fffaf0" />
        </>
      )}
      {id === "pcCase" && <PcCase mode="wide" s={s} t={t} />}
      {id === "paste" && <PcCase mode="paste" s={s} t={t} />}
      {id === "mites" && <PcCase mode="mites" s={s} t={t} />}
      {id === "memorial" && <PcCase mode="memorial" s={s} t={t} />}
      {id === "radio" && <RadioRoom s={s} />}
      {id === "knolling" && <Knolling s={s} />}
    </>
  );
};

const DotaSwitch: React.FC<{ id: Scene3 }> = ({ id }) => {
  const { durationInFrames } = useVideoConfig();
  return isDota(id) ? <DotaWorld id={id} durationInFrames={durationInFrames} /> : <PcWorld id={id} />;
};

export const Ep3Scene3D: React.FC<{ id: Scene3 }> = ({ id }) => (
  <Ps1Canvas>
    <DotaSwitch id={id} />
  </Ps1Canvas>
);
