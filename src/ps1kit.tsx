import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import React, { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile, useVideoConfig } from "remotion";
import * as THREE from "three";

// Internal render resolution; upscaled x4 with nearest-neighbour.
export const IW = 270;
export const IH = 480;

// PS1 had no sub-pixel precision: vertices snap to a coarse screen grid.
// `div` 4 = chunky ep1 wobble, 2 = finer grid for calmer frames
export const snapVertices = <M extends THREE.Material>(m: M, div = 4): M => {
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      `#include <project_vertex>
      vec2 grid = vec2(${(IW / div).toFixed(1)}, ${(IH / div).toFixed(1)});
      gl_Position.xy = floor(gl_Position.xy / gl_Position.w * grid + 0.5) / grid * gl_Position.w;`,
    );
  };
  return m;
};

// Resolves only once every image is decoded, so clones never upload an empty texture.
export const useTextureSet = <N extends string>(dir: string, names: readonly N[]) => {
  const [handle] = useState(() => delayRender(`PS1 textures ${dir}`));
  const [textures, setTextures] = useState<Record<N, THREE.Texture> | null>(null);
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    Promise.all(names.map((name) => loader.loadAsync(staticFile(`${dir}/${name}.png`)))).then((loaded) => {
      for (const t of loaded) {
        t.magFilter = THREE.NearestFilter;
        t.minFilter = THREE.NearestFilter;
        t.generateMipmaps = false;
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
        t.colorSpace = THREE.SRGBColorSpace;
      }
      setTextures(Object.fromEntries(names.map((n, i) => [n, loaded[i]])) as Record<N, THREE.Texture>);
    });
  }, [handle, dir, names]);
  // frameloop is "never" while rendering: draw once more with the textures, then release the frame.
  const { advance } = useThree();
  useEffect(() => {
    if (!textures) return;
    advance(performance.now());
    continueRender(handle);
  }, [textures, advance, handle]);
  return textures;
};

export const repeated = (t: THREE.Texture, x: number, y: number) => {
  const c = t.clone();
  c.repeat.set(x, y);
  c.needsUpdate = true;
  return c;
};

export const lambert = (params: THREE.MeshLambertMaterialParameters) =>
  snapVertices(new THREE.MeshLambertMaterial({ flatShading: true, ...params }));

export const basic = (params: THREE.MeshBasicMaterialParameters) => snapVertices(new THREE.MeshBasicMaterial(params));

export const pixelTexture = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

export type Cam = { pos: [number, number, number]; look: [number, number, number] };

export const CameraRig: React.FC<{ from: Cam; to: Cam; t: number }> = ({ from, to, t }) => {
  const { camera } = useThree();
  const lerp = (a: number[], b: number[]) => a.map((v, i) => v + (b[i] - v) * t) as [number, number, number];
  const p = lerp(from.pos, to.pos);
  const l = lerp(from.look, to.look);
  camera.position.set(p[0], p[1], p[2]);
  camera.lookAt(l[0], l[1], l[2]);
  camera.updateProjectionMatrix();
  return null;
};

// 32 levels per channel = 15-bit colour
const POSTERIZE = Array.from({ length: 32 }, (_, i) => (i / 31).toFixed(3)).join(" ");

export const Ps1Canvas: React.FC<{ children: React.ReactNode; shadows?: boolean }> = ({ children, shadows = false }) => {
  const { width } = useVideoConfig();
  const scale = width / IW;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", imageRendering: "pixelated", filter: "url(#ps1-posterize)" }}>
      <div style={{ width: IW, height: IH, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <ThreeCanvas
          width={IW}
          height={IH}
          dpr={1}
          gl={{ antialias: false }}
          camera={{ fov: 62, near: 0.05, far: 60, position: [0, 1.5, 3] }}
          linear={false}
          shadows={shadows ? { type: THREE.BasicShadowMap } : false}
        >
          {children}
        </ThreeCanvas>
      </div>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id="ps1-posterize">
          <feComponentTransfer>
            <feFuncR type="discrete" tableValues={POSTERIZE} />
            <feFuncG type="discrete" tableValues={POSTERIZE} />
            <feFuncB type="discrete" tableValues={POSTERIZE} />
          </feComponentTransfer>
        </filter>
      </svg>
    </div>
  );
};
