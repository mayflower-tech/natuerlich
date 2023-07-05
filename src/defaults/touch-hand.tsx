import { XIntersection } from "@coconut-xr/xinteraction";
import { XSphereCollider } from "@coconut-xr/xinteraction/react";
import React, { ReactNode, Suspense, useMemo, useRef } from "react";
import { DynamicHandModel, HandBoneGroup } from "../react/hand.js";
import { createPortal, useThree } from "@react-three/fiber";
import { Color, ColorRepresentation, Mesh } from "three";
import {
  CursorBasicMaterial,
  updateCursorDistanceOpacity,
  updateCursorTransformation,
} from "./index.js";

export function TouchHand({
  hand,
  inputSource,
  id,
  children,
  filterIntersections,
  cursorSize = 0.1,
  cursorVisible = true,
  hoverRadius = 0.1,
  pressRadius = 0.03,
  cursorColor = "black",
  cursorPressColor = "white",
  cursorOpacity = 0.5,
  cursorOffset = 0.01,
}: {
  hand: XRHand;
  inputSource: XRInputSource;
  children?: ReactNode;
  id: number;
  filterIntersections?: (intersections: XIntersection[]) => XIntersection[];
  hoverRadius?: number;
  pressRadius?: number;
  cursorColor?: ColorRepresentation;
  cursorPressColor?: ColorRepresentation;
  cursorOpacity?: number;
  cursorSize?: number;
  cursorVisible?: boolean;
  cursorOffset?: number;
}) {
  const scene = useThree(({ scene }) => scene);

  const distanceRef = useRef(Infinity);

  const cursorRef = useRef<Mesh>(null);
  const cursorMaterial = useMemo(
    () => new CursorBasicMaterial({ transparent: true, toneMapped: false }),
    [],
  );
  updateCursorAppearance(
    distanceRef.current,
    cursorMaterial,
    cursorColor,
    cursorPressColor,
    cursorOpacity,
    hoverRadius,
    pressRadius,
  );

  return (
    <>
      <Suspense>
        <DynamicHandModel hand={hand} handedness={inputSource.handedness}>
          <HandBoneGroup joint={"index-finger-tip"}>
            <XSphereCollider
              radius={hoverRadius}
              distanceElement={{ id: 0, downRadius: pressRadius }}
              id={id}
              filterIntersections={filterIntersections}
              onIntersections={(intersections) => {
                updateCursorTransformation(inputSource, intersections, cursorRef, cursorOffset);
                if (intersections.length === 0) {
                  return;
                }
                distanceRef.current = intersections[0].distance;
                updateCursorAppearance(
                  distanceRef.current,
                  cursorMaterial,
                  cursorColor,
                  cursorPressColor,
                  cursorOpacity,
                  hoverRadius,
                  pressRadius,
                );
              }}
            />
            {children}
          </HandBoneGroup>
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

function updateCursorAppearance(
  distance: number,
  material: { color: Color; opacity: number },
  cursorColor: ColorRepresentation,
  cursorPressColor: ColorRepresentation,
  cursorOpacity: number,
  hoverRadius: number,
  pressRadius?: number,
): void {
  if (pressRadius == null || distance < pressRadius) {
    material.color.set(cursorPressColor);
    material.opacity = cursorOpacity;
    return;
  }
  updateCursorDistanceOpacity(material, distance, pressRadius, hoverRadius, cursorOpacity);
  material.color.set(cursorColor);
}
