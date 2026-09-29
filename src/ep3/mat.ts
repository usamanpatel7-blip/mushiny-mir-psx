import * as THREE from "three";
import { pixelTexture, snapVertices } from "../ps1kit";

// Clean low-poly: flat colours, procedural textures only, finer vertex snap for calm frames.
export const lam = (p: THREE.MeshLambertMaterialParameters) => snapVertices(new THREE.MeshLambertMaterial({ flatShading: true, ...p }), 2);
export const smooth = (p: THREE.MeshLambertMaterialParameters) => snapVertices(new THREE.MeshLambertMaterial({ flatShading: false, ...p }), 2);
export const flat = (p: THREE.MeshBasicMaterialParameters) => snapVertices(new THREE.MeshBasicMaterial(p), 2);

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const hash = (n: number) => {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

export const ease = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

// 5x7 pixel glyphs for in-world game numbers (no font loading inside the canvas)
const GLYPHS: Record<string, string[]> = {
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  ".": ["..", "..", "..", "..", "..", "##", "##"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
};

// text with a 1px dark outline; returns the texture and its aspect (w/h)
export const textTexture = (text: string, color: string, outline = "#1b2238") => {
  const chars = text.split("").map((c) => GLYPHS[c] ?? GLYPHS["."]);
  const w = chars.reduce((a, g) => a + g[0].length + 1, 1) + 1;
  const h = 7 + 2;
  const tex = pixelTexture(w, h, (ctx) => {
    const plot = (dx: number, dy: number, fill: string) => {
      ctx.fillStyle = fill;
      let x0 = 1;
      for (const g of chars) {
        g.forEach((row, y) => row.split("").forEach((c, x) => c === "#" && ctx.fillRect(x0 + x + dx, 1 + y + dy, 1, 1)));
        x0 += g[0].length + 1;
      }
    };
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ])
      plot(dx, dy, outline);
    plot(0, 0, color);
  });
  return { tex, aspect: w / h };
};

// --- MOBA fog of war: everything outside the allied vision circles is dimmed and desaturated ------------
// shared uniform: up to 24 circles (x, z, radius); radius 0 = unused
export const VISION_SLOTS = 24;
export const FOW = { value: Array.from({ length: VISION_SLOTS }, () => new THREE.Vector3(0, 0, 0)) };

export const fowify = <M extends THREE.Material>(m: M): M => {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uVision = FOW;
    shader.vertexShader =
      "varying vec3 vWPos;\n" +
      shader.vertexShader.replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        vec4 wp4 = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wp4 = instanceMatrix * wp4;
        #endif
        vWPos = (modelMatrix * wp4).xyz;
        vec2 grid = vec2(135.0, 240.0);
        gl_Position.xy = floor(gl_Position.xy / gl_Position.w * grid + 0.5) / grid * gl_Position.w;`,
      );
    shader.fragmentShader =
      `uniform vec3 uVision[${VISION_SLOTS}];\nvarying vec3 vWPos;\n` +
      shader.fragmentShader.replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
        float vis = 0.0;
        for (int i = 0; i < ${VISION_SLOTS}; i++) {
          vec3 c = uVision[i];
          if (c.z > 0.0) vis = max(vis, 1.0 - smoothstep(c.z * 0.7, c.z, distance(vWPos.xz, c.xy)));
        }
        float lum = dot(gl_FragColor.rgb, vec3(0.3, 0.59, 0.11));
        vec3 fogged = mix(vec3(lum), gl_FragColor.rgb, 0.35) * 0.6 + vec3(0.03, 0.035, 0.055);
        gl_FragColor.rgb = mix(fogged, gl_FragColor.rgb, vis);`,
      );
  };
  m.customProgramCacheKey = () => "ep3-fow";
  return m;
};

export const lamD = (p: THREE.MeshLambertMaterialParameters) => fowify(new THREE.MeshLambertMaterial({ flatShading: true, ...p }));
export const flatD = (p: THREE.MeshBasicMaterialParameters) => fowify(new THREE.MeshBasicMaterial(p));

// soft round puff (steam, glows)
export const puffTexture = () =>
  pixelTexture(32, 32, (ctx) => {
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "rgba(255,255,255,0.9)");
    g.addColorStop(0.5, "rgba(255,255,255,0.35)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  });
