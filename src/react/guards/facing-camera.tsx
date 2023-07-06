import { useFrame, useThree } from "@react-three/fiber";
import { ReactNode, RefObject, useRef, useState } from "react";
import { Group, Quaternion, Vector3 } from "three";
import React from "react";

const vectorHelper = new Vector3();
const directionHelper = new Vector3();
const guardPosition = new Vector3();
const guardQuaternion = new Quaternion();

export function useIsFacingCamera(
  ref: RefObject<Group>,
  set: (show: boolean) => void,
  direction: Vector3,
  angle: number,
): void {
  const camera = useThree((state) => state.camera);
  useFrame(() => {
    if (ref.current == null) {
      return;
    }
    //compute object world direction -> directionHelper
    ref.current.getWorldQuaternion(guardQuaternion);
    directionHelper.copy(direction).applyQuaternion(guardQuaternion);

    //compute guardToCamera direction (guard - camera) -> vectorHelper
    ref.current.getWorldPosition(guardPosition);
    camera.getWorldPosition(vectorHelper);
    vectorHelper.sub(guardPosition);

    //compute the angle between guardToCamera and object world direction
    set(vectorHelper.angleTo(directionHelper) < angle / 2);
  });
}

export function VisibilityFacingCameraGuard({
  children,
  direction,
  angle = Math.PI / 2,
}: {
  children?: ReactNode;
  direction: Vector3;
  angle?: number;
}) {
  const ref = useRef<Group>(null);
  useIsFacingCamera(
    ref,
    (visible) => {
      if (ref.current == null) {
        return;
      }
      ref.current.visible = visible;
    },
    direction,
    angle,
  );
  return <group ref={ref}>{children}</group>;
}

export function FacingCameraGuard({
  children,
  direction,
  angle = Math.PI / 2,
}: {
  children?: ReactNode;
  direction: Vector3;
  angle?: number;
}) {
  const ref = useRef<Group>(null);
  const [show, setShow] = useState(false);
  useIsFacingCamera(ref, setShow, direction, angle);
  return show ? <>{children}</> : null;
}
