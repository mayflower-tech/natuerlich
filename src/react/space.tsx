/* eslint-disable react/display-name */
import { RootState, useFrame } from "@react-three/fiber";
import React, { forwardRef, ReactNode, RefObject, useRef } from "react";
import { useImperativeHandle } from "react";
import { Group, Object3D } from "three";

/**
 * requires matrixAutoUpdate=false on the ref target
 */
export function useApplySpace(
  ref: RefObject<Object3D>,
  space: XRSpace,
  onFrame?: (
    rootState: RootState,
    delta: number,
    frame: XRFrame | undefined,
    object: Object3D,
  ) => void,
) {
  useFrame((rootState, delta, frame: XRFrame | undefined) => {
    const group = ref.current;
    if (group == null) {
      return;
    }
    const referenceSpace = rootState.gl.xr.getReferenceSpace();
    if (referenceSpace == null || frame == null) {
      group.visible = false;
      return;
    }
    const pose = frame.getPose(space, referenceSpace);
    if (pose == null) {
      group.visible = false;
      return;
    }
    group.visible = true;
    group.matrix.fromArray(pose.transform.matrix);
    if (onFrame != null) {
      group.updateMatrixWorld();
      onFrame(rootState, delta, frame, group);
    }
  });
}

export const SpaceGroup = forwardRef<
  Group,
  {
    space: XRSpace;
    children?: ReactNode;
    onFrame?: (
      rootState: RootState,
      delta: number,
      frame: XRFrame | undefined,
      object: Object3D,
    ) => void;
  }
>(({ space, children, onFrame }, ref) => {
  const internalRef = useRef<Group>(null);
  useImperativeHandle(ref, () => internalRef.current!, []);
  useApplySpace(internalRef, space, onFrame);
  return (
    <group matrixAutoUpdate={false} ref={internalRef}>
      {children}
    </group>
  );
});
