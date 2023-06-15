import { useFrame, useThree } from "@react-three/fiber";
import { RefObject } from "react";
import { Group, Quaternion, Vector3 } from "three";
import { IncludeGuard, VisibleGuard } from "./index.js";

const vectorHelper = new Vector3();
const directionHelper = new Vector3();
const guardPosition = new Vector3();
const guardQuaternion = new Quaternion();

export function useIsFacingCamera(
  ref: RefObject<Group>,
  set: (show: boolean) => void,
  {
    angle = Math.PI / 2,
    direction,
  }: {
    angle?: number;
    direction: Vector3;
  },
) {
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

export const VisibleWhenFacingCamera = VisibleGuard(useIsFacingCamera);
export const IncludeWhenFacingCamera = IncludeGuard(useIsFacingCamera);
