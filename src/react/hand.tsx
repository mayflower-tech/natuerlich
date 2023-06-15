/* eslint-disable react/display-name */
import { useLoader, useFrame } from "@react-three/fiber";
import React, { ReactNode, forwardRef, useMemo, useRef } from "react";
import { OculusHandModel, GLTFLoader, SkeletonUtils } from "three-stdlib/index.js";
import {
  getMotionHandModelUrl,
  createMotionHand,
  updateMotionHand,
  isMotionHand,
  MotionHand,
} from "../motion-hand.js";
import { Group } from "three";

export function HandBoneGroup({
  joint,
  rotationJoint,
  children,
}: {
  joint: XRHandJoint | Array<XRHandJoint>;
  rotationJoint?: XRHandJoint;
  children?: ReactNode;
}) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (ref.current == null) {
      return;
    }
    const motionHand = ref.current.parent;
    if (motionHand == null || !isMotionHand(motionHand)) {
      throw new Error(`HandBoneGroup can only be placed directly under DynamicHandModel`);
    }
    const bone = Array.isArray(joint)
      ? joint.map(getBone.bind(null, motionHand))
      : getBone(motionHand, joint);
    if (Array.isArray(bone)) {
      ref.current.position.set(0, 0, 0);
      for (const object of bone) {
        ref.current.position.add(object.position);
      }
      ref.current.position.divideScalar(bone.length);
    } else {
      ref.current.position.copy(bone.position);
    }
    const rotationBone = rotationJoint == null ? bone : motionHand.boneMap.get(rotationJoint);
    if (rotationBone == null) {
      throw new Error(`unknown joint "${rotationJoint}" in ${motionHand.boneMap}`);
    }
    if (Array.isArray(rotationBone)) {
      throw new Error(`multiple rotation joints are not implemented`);
    } else {
      ref.current.quaternion.copy(rotationBone.quaternion);
    }
  });
  return <group ref={ref}>{children}</group>;
}

function getBone(motionHand: MotionHand, joint: XRHandJoint) {
  const bone = motionHand.boneMap.get(joint);
  if (bone == null) {
    throw new Error(`unknown joint "${joint}" in ${motionHand.boneMap}`);
  }
  return bone;
}

export const DynamicHandModel = forwardRef<
  OculusHandModel,
  {
    handedness: string;
    basePath?: string;
    defaultProfileId?: string;
    hand: XRHand;
    children?: ReactNode;
  }
>(({ children, handedness, basePath, defaultProfileId, hand }, ref) => {
  const url = getMotionHandModelUrl(handedness, basePath, defaultProfileId);
  const { scene } = useLoader(GLTFLoader, url);
  const clonedScene = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const motionHand = useMemo(() => createMotionHand(hand, clonedScene), [clonedScene, hand]);
  useFrame((state, delta, frame) => {
    const referenceSpace = state.gl.xr.getReferenceSpace();
    if (frame == null || referenceSpace == null) {
      return;
    }
    updateMotionHand(motionHand, frame, referenceSpace);
  });
  return (
    <primitive ref={ref} object={motionHand}>
      {children}
    </primitive>
  );
});

export const StaticHandModel = forwardRef<
  OculusHandModel,
  {
    handedness: string;
    basePath?: string;
    defaultProfileId?: string;
  }
>(({ handedness, basePath, defaultProfileId }, ref) => {
  const { scene } = useLoader(
    GLTFLoader,
    getMotionHandModelUrl(handedness, basePath, defaultProfileId),
  );
  const clonedScene = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  return <primitive ref={ref} object={clonedScene} />;
});
