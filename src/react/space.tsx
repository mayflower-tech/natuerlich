/* eslint-disable react/display-name */
import { RootState, useFrame } from "@react-three/fiber";
import React, { forwardRef, ReactNode, useRef } from "react";
import { useImperativeHandle } from "react";
import { Group, Object3D } from "three";

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
  useImperativeHandle(ref, () => internalRef.current!);
  useFrame((rootState, delta, frame: XRFrame | undefined) => {
    const group = internalRef.current;
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
  return (
    <group matrixAutoUpdate={false} ref={internalRef}>
      {children}
    </group>
  );
});
