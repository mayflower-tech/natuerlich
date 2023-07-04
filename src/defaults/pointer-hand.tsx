import { XIntersection } from "@coconut-xr/xinteraction";
import { InputDeviceFunctions, XStraightPointer } from "@coconut-xr/xinteraction/react";
import React, { ReactNode, Suspense, useRef, useMemo } from "react";
import { DynamicHandModel, HandBoneGroup } from "../react/hand.js";
import { useInputSourceEvent } from "../react/listeners.js";
import { SpaceGroup } from "../react/space.js";
import { ColorRepresentation, Mesh, Vector3 } from "three";
import {
  CursorBasicMaterial,
  RayBasicMaterial,
  updateColor,
  updateCursorTransformation,
  updateRayTransformation,
} from "./index.js";
import { createPortal, useThree } from "@react-three/fiber";

const negZAxis = new Vector3(0, 0, -1);

export function PointerHand({
  hand,
  inputSource,
  id,
  children,
  filterIntersections,
  cursorColor = "white",
  cursorPressColor = "blue",
  cursorOpacity = 1,
  cursorSize = 0.2,
  cursorVisible = true,
  rayColor = "white",
  rayPressColor = "blue",
  rayMaxLength = 1,
  rayVisibile = true,
  raySize = 0.01,
}: {
  hand: XRHand;
  inputSource: XRInputSource;
  children?: ReactNode;
  id: number;
  cursorColor?: ColorRepresentation;
  cursorPressColor?: ColorRepresentation;
  cursorOpacity?: number;
  cursorSize?: number;
  cursorVisible?: boolean;
  rayColor?: ColorRepresentation;
  rayPressColor?: ColorRepresentation;
  rayMaxLength?: number;
  rayVisibile?: boolean;
  raySize?: number;
  filterIntersections?: (intersections: XIntersection[]) => XIntersection[];
}) {
  const pointerRef = useRef<InputDeviceFunctions>(null);
  const pressedRef = useRef(false);
  const cursorRef = useRef<Mesh>(null);
  const rayRef = useRef<Mesh>(null);

  const cursorMaterial = useMemo(
    () => new CursorBasicMaterial({ transparent: true, toneMapped: false }),
    [],
  );
  cursorMaterial.opacity = cursorOpacity;
  updateColor(pressedRef.current, cursorMaterial, cursorColor, cursorPressColor);

  const rayMaterial = useMemo(
    () => new RayBasicMaterial({ transparent: true, toneMapped: false }),
    [],
  );

  updateColor(pressedRef.current, rayMaterial, rayColor, rayPressColor);

  useInputSourceEvent(
    "selectstart",
    inputSource,
    (e) => {
      pressedRef.current = true;
      updateColor(pressedRef.current, rayMaterial, rayColor, rayPressColor);
      updateColor(pressedRef.current, cursorMaterial, cursorColor, cursorPressColor);
      pointerRef.current?.press(0, e);
    },
    [],
  );
  useInputSourceEvent(
    "selectend",
    inputSource,
    (e) => {
      pressedRef.current = false;
      updateColor(pressedRef.current, rayMaterial, rayColor, rayPressColor);
      updateColor(pressedRef.current, cursorMaterial, cursorColor, cursorPressColor);
      pointerRef.current?.release(0, e);
    },
    [],
  );

  const scene = useThree(({ scene }) => scene);

  return (
    <>
      <Suspense>
        <DynamicHandModel hand={hand} handedness={inputSource.handedness}>
          {children != null && <HandBoneGroup joint="wrist">{children}</HandBoneGroup>}
        </DynamicHandModel>
      </Suspense>
      <SpaceGroup space={inputSource.targetRaySpace}>
        <XStraightPointer
          onIntersections={(intersections) => {
            updateCursorTransformation(intersections, cursorRef);
            updateRayTransformation(intersections, rayMaxLength, rayRef);
          }}
          direction={negZAxis}
          filterIntersections={filterIntersections}
          id={id}
          ref={pointerRef}
        />
        <mesh
          visible={rayVisibile}
          scale-x={raySize}
          scale-y={raySize}
          material={rayMaterial}
          ref={rayRef}
        >
          <boxGeometry />
        </mesh>
      </SpaceGroup>
      {createPortal(
        <mesh visible={cursorVisible} scale={cursorSize} ref={cursorRef} material={cursorMaterial}>
          <planeGeometry />
        </mesh>,
        scene,
      )}
    </>
  );
}
