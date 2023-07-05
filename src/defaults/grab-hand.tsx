import { XIntersection } from "@coconut-xr/xinteraction";
import { InputDeviceFunctions, XSphereCollider } from "@coconut-xr/xinteraction/react";
import React, { ReactNode, Suspense, useMemo, useRef } from "react";
import { DynamicHandModel, HandBoneGroup } from "../react/hand.js";
import { useInputSourceEvent } from "../react/listeners.js";
import { ColorRepresentation, Mesh } from "three";
import {
  CursorBasicMaterial,
  updateColor,
  updateCursorDistanceOpacity,
  updateCursorTransformation,
} from "./index.js";
import { createPortal, useThree } from "@react-three/fiber";

export function GrabHand({
  hand,
  inputSource,
  id,
  children,
  filterIntersections,
  cursorColor = "black",
  cursorOpacity = 0.5,
  cursorPressColor = "white",
  cursorSize = 0.1,
  cursorVisible = true,
  radius = 0.07,
  cursorOffset = 0.01,
}: {
  hand: XRHand;
  inputSource: XRInputSource;
  children?: ReactNode;
  id: number;
  filterIntersections?: (intersections: XIntersection[]) => XIntersection[];
  cursorColor?: ColorRepresentation;
  cursorPressColor?: ColorRepresentation;
  cursorOpacity?: number;
  cursorSize?: number;
  cursorVisible?: boolean;
  radius?: number;
  cursorOffset?: number;
}) {
  const colliderRef = useRef<InputDeviceFunctions>(null);
  const distanceRef = useRef(Infinity);
  const pressedRef = useRef(false);
  const cursorRef = useRef<Mesh>(null);
  const cursorMaterial = useMemo(
    () => new CursorBasicMaterial({ transparent: true, toneMapped: false }),
    [],
  );

  useInputSourceEvent(
    "selectstart",
    inputSource,
    (e) => {
      pressedRef.current = true;
      updateColor(pressedRef.current, cursorMaterial, cursorColor, cursorPressColor);
      colliderRef.current?.press(0, e);
    },
    [],
  );
  useInputSourceEvent(
    "selectend",
    inputSource,
    (e) => {
      pressedRef.current = false;
      updateColor(pressedRef.current, cursorMaterial, cursorColor, cursorPressColor);
      colliderRef.current?.release(0, e);
    },
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

  return (
    <>
      <Suspense fallback={null}>
        <DynamicHandModel hand={hand} handedness={inputSource.handedness}>
          <HandBoneGroup rotationJoint="wrist" joint={["thumb-tip", "index-finger-tip"]}>
            <XSphereCollider
              ref={colliderRef}
              radius={radius}
              id={id}
              filterIntersections={filterIntersections}
              onIntersections={(intersections) => {
                updateCursorTransformation(inputSource, intersections, cursorRef, cursorOffset);
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
            />
          </HandBoneGroup>
          {children != null && <HandBoneGroup joint="wrist">{children}</HandBoneGroup>}
        </DynamicHandModel>
      </Suspense>
      {createPortal(
        <mesh
          renderOrder={inputSource.handedness === "left" ? 1 : 2}
          visible={cursorVisible}
          scale={cursorSize}
          ref={cursorRef}
          material={cursorMaterial}
        >
          <planeGeometry />
        </mesh>,
        scene,
      )}
    </>
  );
}
