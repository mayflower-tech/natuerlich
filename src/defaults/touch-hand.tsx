import { XIntersection } from "@coconut-xr/xinteraction";
import { XSphereCollider } from "@coconut-xr/xinteraction/react";
import React, { ReactNode } from "react";
import { DynamicHandModel, HandBoneGroup } from "../react/hand.js";

export function TouchHand({
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
  return (
    <DynamicHandModel hand={hand} handedness={inputSource.handedness}>
      <HandBoneGroup joint={"index-finger-tip"}>
        <XSphereCollider
          radius={0.03}
          distanceElement={{ id: 0, downRadius: 0.02 }}
          id={id}
          filterIntersections={filterIntersections}
        />
      </HandBoneGroup>
      {children != null ?? <HandBoneGroup joint="wrist">{children}</HandBoneGroup>}
    </DynamicHandModel>
  );
}
