import { XIntersection } from "@coconut-xr/xinteraction";
import { InputDeviceFunctions, XSphereCollider } from "@coconut-xr/xinteraction/react";
import React, { ReactNode, Suspense, useRef } from "react";
import { DynamicHandModel, HandBoneGroup } from "../react/hand.js";
import { useInputSourceEvent } from "../react/listeners.js";

export function GrabHand({
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
  const colliderRef = useRef<InputDeviceFunctions>(null);

  useInputSourceEvent("selectstart", inputSource, (e) => colliderRef.current?.press(0, e), []);
  useInputSourceEvent("selectend", inputSource, (e) => colliderRef.current?.release(0, e), []);

  return (
    <Suspense fallback={null}>
      <DynamicHandModel hand={hand} handedness={inputSource.handedness}>
        <HandBoneGroup rotationJoint="wrist" joint={["thumb-tip", "index-finger-tip"]}>
          <XSphereCollider
            ref={colliderRef}
            radius={0.01}
            id={id}
            filterIntersections={filterIntersections}
          />
        </HandBoneGroup>
        {children != null && <HandBoneGroup joint="wrist">{children}</HandBoneGroup>}
      </DynamicHandModel>
    </Suspense>
  );
}
