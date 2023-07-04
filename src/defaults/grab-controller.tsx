import { XIntersection } from "@coconut-xr/xinteraction";
import { InputDeviceFunctions, XSphereCollider } from "@coconut-xr/xinteraction/react";
import React, { useRef, useMemo, Suspense, ReactNode } from "react";
import { ColorRepresentation, Mesh } from "three";
import { DynamicControllerModel } from "../react/controller.js";
import { useInputSourceEvent } from "../react/index.js";
import { SpaceGroup } from "../react/space.js";
import {
  CursorBasicMaterial,
  updateCursorTransformation,
  updateColor,
  updateCursorDistanceOpacity,
  triggerVibration,
} from "./index.js";
import { createPortal, useThree } from "@react-three/fiber";

export function GrabController({
  inputSource,
  children,
  filterIntersections,
  id,
  cursorColor = "black",
  cursorOpacity = 1,
  cursorPressColor = "white",
  cursorSize = 0.2,
  cursorVisible = true,
  radius = 0.07,
}: {
  inputSource: XRInputSource;
  children?: ReactNode;
  id: number;
  filterIntersections?: (intersections: Array<XIntersection>) => Array<XIntersection>;
  cursorColor?: ColorRepresentation;
  cursorPressColor?: ColorRepresentation;
  cursorOpacity?: number;
  cursorSize?: number;
  cursorVisible?: boolean;
  radius?: number;
}) {
  const colliderRef = useRef<InputDeviceFunctions>(null);
  const distanceRef = useRef(Infinity);
  const pressedRef = useRef(false);
  const prevIntersected = useRef(false);

  useInputSourceEvent(
    "squeezestart",
    inputSource,
    (e) => {
      pressedRef.current = true;
      updateColor(pressedRef.current, cursorMaterial, cursorColor, cursorPressColor);
      colliderRef.current?.press(0, e);
    },
    [],
  );
  useInputSourceEvent(
    "squeezeend",
    inputSource,
    (e) => {
      pressedRef.current = false;
      updateColor(pressedRef.current, cursorMaterial, cursorColor, cursorPressColor);
      colliderRef.current?.release(0, e);
    },
    [],
  );

  const cursorRef = useRef<Mesh>(null);
  const cursorMaterial = useMemo(
    () => new CursorBasicMaterial({ transparent: true, toneMapped: false }),
    [],
  );

  updateColor(pressedRef.current, cursorMaterial, cursorColor, cursorPressColor);
  updateCursorDistanceOpacity(
    cursorMaterial,
    distanceRef.current,
    radius / 2,
    radius,
    cursorOpacity,
  );

  const scene = useThree(({ scene }) => scene);

  if (inputSource.gripSpace == null) {
    return null;
  }

  return (
    <>
      <SpaceGroup space={inputSource.gripSpace}>
        <XSphereCollider
          id={id}
          filterIntersections={filterIntersections}
          onIntersections={(intersections) => {
            updateCursorTransformation(intersections, cursorRef);
            triggerVibration(intersections, inputSource, prevIntersected);
            if (intersections.length === 0) {
              return;
            }
            distanceRef.current = intersections[0].distance;
            updateCursorDistanceOpacity(
              cursorMaterial,
              distanceRef.current,
              radius / 2,
              radius,
              cursorOpacity,
            );
          }}
          ref={colliderRef}
          radius={radius}
        />
        {children}
        <Suspense fallback={null}>
          <DynamicControllerModel inputSource={inputSource} />
        </Suspense>
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
