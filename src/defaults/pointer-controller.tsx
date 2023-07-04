import { ReactNode, Suspense, useMemo, useRef } from "react";
import { InputDeviceFunctions, XStraightPointer } from "@coconut-xr/xinteraction/react";
import { useInputSourceEvent } from "../react/listeners.js";
import { XIntersection } from "@coconut-xr/xinteraction";
import React from "react";
import { SpaceGroup } from "../react/space.js";
import { DynamicControllerModel } from "../react/controller.js";
import { ColorRepresentation, Mesh, Vector3 } from "three";
import {
  CursorBasicMaterial,
  RayBasicMaterial,
  triggerVibration,
  updateColor as updatePointerColor,
  updateCursorTransformation,
  updateRayTransformation,
} from "./index.js";
import { createPortal, useThree } from "@react-three/fiber";

const negZAxis = new Vector3(0, 0, -1);

export function PointerController({
  inputSource,
  children,
  filterIntersections,
  id,
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
  inputSource: XRInputSource;
  children?: ReactNode;
  id: number;
  filterIntersections?: (intersections: XIntersection[]) => XIntersection[];
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
}) {
  const pointerRef = useRef<InputDeviceFunctions>(null);
  const pressedRef = useRef(false);
  const cursorRef = useRef<Mesh>(null);
  const rayRef = useRef<Mesh>(null);
  const prevIntersected = useRef(false);

  const cursorMaterial = useMemo(
    () => new CursorBasicMaterial({ transparent: true, toneMapped: false }),
    [],
  );
  cursorMaterial.opacity = cursorOpacity;
  updatePointerColor(pressedRef.current, cursorMaterial, cursorColor, cursorPressColor);

  const rayMaterial = useMemo(
    () => new RayBasicMaterial({ transparent: true, toneMapped: false }),
    [],
  );
  updatePointerColor(pressedRef.current, rayMaterial, rayColor, rayPressColor);

  useInputSourceEvent(
    "selectstart",
    inputSource,
    (e) => {
      pressedRef.current = true;
      updatePointerColor(pressedRef.current, cursorMaterial, cursorColor, cursorPressColor);
      updatePointerColor(pressedRef.current, rayMaterial, rayColor, rayPressColor);
      pointerRef.current?.press(0, e);
    },
    [],
  );
  useInputSourceEvent(
    "selectend",
    inputSource,
    (e) => {
      pressedRef.current = false;
      updatePointerColor(pressedRef.current, cursorMaterial, cursorColor, cursorPressColor);
      updatePointerColor(pressedRef.current, rayMaterial, rayColor, rayPressColor);
      pointerRef.current?.release(0, e);
    },
    [],
  );

  const scene = useThree(({ scene }) => scene);

  return (
    <>
      {inputSource.gripSpace != null && (
        <SpaceGroup space={inputSource.gripSpace}>
          {children}
          <Suspense fallback={null}>
            <DynamicControllerModel inputSource={inputSource} />
          </Suspense>
        </SpaceGroup>
      )}
      <SpaceGroup space={inputSource.targetRaySpace}>
        <XStraightPointer
          onIntersections={(intersections) => {
            updateCursorTransformation(intersections, cursorRef);
            updateRayTransformation(intersections, rayMaxLength, rayRef);
            triggerVibration(intersections, inputSource, prevIntersected);
          }}
          id={id}
          direction={negZAxis}
          ref={pointerRef}
          filterIntersections={filterIntersections}
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
