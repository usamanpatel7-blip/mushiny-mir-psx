import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { Scene3D } from "./Scene3D";
import { beats, beatStarts, sec, type Shot } from "./script";

const ShotView: React.FC<{ shot: Shot }> = ({ shot }) => {
  if (shot.kind === "3d") return <Scene3D id={shot.id} />;
  return (
    <Img
      src={staticFile(shot.src)}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated" }}
    />
  );
};

// Fixed camera angles with hard cuts, no zooms.
export const Beat: React.FC<{ index: number }> = ({ index }) => {
  const frame = useCurrentFrame();
  const { shots, cuts } = beats[index];
  const shot = shots[cuts.filter((c) => frame >= sec(c) - beatStarts[index]).length];
  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: "#000" }}>
      <ShotView shot={shot} />
    </div>
  );
};
