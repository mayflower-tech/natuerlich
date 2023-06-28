import { createPortal, useThree } from "@react-three/fiber";
import React from "react";
import { BackSide, ColorRepresentation } from "three";

//TODO: map

export function Background({ color }: { color: ColorRepresentation }) {
  const camera = useThree(({ camera }) => camera);
  return createPortal(
    <mesh scale={camera.far * 0.95} renderOrder={-100}>
      <sphereGeometry />
      <meshBasicMaterial depthWrite={false} depthTest={true} side={BackSide} color={color} />
    </mesh>,
    camera,
  );
}
