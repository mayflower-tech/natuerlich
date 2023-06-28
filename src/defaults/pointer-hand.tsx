import { XIntersection } from "@coconut-xr/xinteraction";
import { InputDeviceFunctions, XStraightPointer } from "@coconut-xr/xinteraction/react";
import React, { ReactNode, Suspense, useRef } from "react";
import { DynamicHandModel, HandBoneGroup } from "../react/hand.js";
import { useInputSourceEvent } from "../react/listeners.js";
import { SpaceGroup } from "../react/space.js";
import { BoxGeometry, Vector3 } from "three";

const geometry = new BoxGeometry();
geometry.translate(0, 0, -0.5);

const negZAxis = new Vector3(0, 0, -1);

export function PointerHand({
  hand,
  inputSource,
  id,
  children,
  filterIntersections,
}: {
  hand: XRHand;
  inputSource: XRInputSource;
  children?: ReactNode;
  id: number;
  filterIntersections?: (intersections: XIntersection[]) => XIntersection[];
}) {
  const pointerRef = useRef<InputDeviceFunctions>(null);

  useInputSourceEvent("selectstart", inputSource, (e) => pointerRef.current?.press(0, e), []);
  useInputSourceEvent("selectend", inputSource, (e) => pointerRef.current?.release(0, e), []);

  return (
    <>
      <Suspense>
        <DynamicHandModel hand={hand} handedness={inputSource.handedness}>
          {children != null && <HandBoneGroup joint="wrist">{children}</HandBoneGroup>}
        </DynamicHandModel>
      </Suspense>
      <SpaceGroup space={inputSource.targetRaySpace}>
        <XStraightPointer
          direction={negZAxis}
          filterIntersections={filterIntersections}
          id={id}
          ref={pointerRef}
        />
        <mesh scale={[0.01, 0.01, 1]} geometry={geometry}>
          <meshBasicMaterial color={0xffffff} />
        </mesh>
      </SpaceGroup>
    </>
  );
}
