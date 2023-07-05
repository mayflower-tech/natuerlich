/* eslint-disable react/display-name */
import { MeshProps, useFrame } from "@react-three/fiber";
import React, { useImperativeHandle, useMemo, useRef } from "react";
import { forwardRef, startTransition, useState } from "react";
import { BufferGeometry, Mesh, Shape, ShapeGeometry, Vector2 } from "three";
import { useApplySpace } from "./space.js";
import { useXR } from "./state.js";

export function useInitRoomCapture(): () => Promise<undefined> | undefined {
  const session = useXR(({ session }) => session);
  return useMemo(() => (session as any)?.initiateRoomCapture.bind(session), [session]);
}

export function useTrackedPlanes(): Array<XRPlane> | undefined {
  const [planes, setPlanes] = useState<Array<XRPlane> | undefined>([]);
  useFrame((_state, _delta, frame: XRFrame | undefined) => {
    const newPlanes = (frame as { detectedPlanes?: XRPlaneSet })?.detectedPlanes;
    startTransition(() =>
      setPlanes((oldPlanes) => {
        if (newPlanes == null) {
          return undefined;
        }
        if (oldPlanes == null || oldPlanes.length != newPlanes.size) {
          return Array.from(newPlanes);
        }
        for (const plane of newPlanes) {
          if (!oldPlanes.includes(plane)) {
            return Array.from(newPlanes);
          }
        }
        return oldPlanes;
      }),
    );
  });
  return planes;
}

function createGeometryFromPolygon(polygon: DOMPointReadOnly[]): BufferGeometry {
  const shape = new Shape();
  shape.setFromPoints(polygon.map(({ x, z }) => new Vector2(x, z)));
  const geometry = new ShapeGeometry(shape);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

export const TrackedPlane = forwardRef<Mesh, { plane: XRPlane } & MeshProps>(
  ({ plane, children, ...props }, ref) => {
    const lastUpdateRef = useRef<number | undefined>(undefined);
    const internalRef = useRef<Mesh>(null);
    useFrame(() => {
      if (internalRef.current == null) {
        return;
      }
      if (lastUpdateRef.current == null || lastUpdateRef.current < plane.lastChangedTime) {
        internalRef.current.geometry.dispose();
        internalRef.current.geometry = createGeometryFromPolygon(plane.polygon);
        lastUpdateRef.current = plane.lastChangedTime;
      }
    });
    useImperativeHandle(ref, () => internalRef.current!, []);
    useApplySpace(internalRef, plane.planeSpace);
    return (
      <mesh {...props} matrixAutoUpdate={false} ref={internalRef}>
        {children}
      </mesh>
    );
  },
);
