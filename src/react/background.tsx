import { createPortal, useThree } from "@react-three/fiber";
import React from "react";
import { BackSide, BufferAttribute, BufferGeometry, ColorRepresentation, FrontSide } from "three";

//TODO: map

const screenQuadGeometry = new BufferGeometry();
const vertices = new Float32Array([-1, -1, 3, -1, -1, 3]);
screenQuadGeometry.setAttribute("position", new BufferAttribute(vertices, 2));

export function Background({ color }: { color: ColorRepresentation }) {
  const camera = useThree(({ camera }) => camera);
  return createPortal(
    <mesh
      position={[0, 0, camera.far * -0.99]}
      scale={100000}
      renderOrder={-100}
      geometry={screenQuadGeometry}
    >
      <meshBasicMaterial depthWrite={false} depthTest={true} side={FrontSide} color={color} />
    </mesh>,
    camera,
  );
}
