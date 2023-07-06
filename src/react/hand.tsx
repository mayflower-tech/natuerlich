/* eslint-disable react/display-name */
import { useLoader, useFrame } from "@react-three/fiber";
import React, { ReactNode, forwardRef, useMemo, useRef, useImperativeHandle } from "react";
import { OculusHandModel, GLTFLoader, SkeletonUtils } from "three-stdlib/index.js";
import {
  getMotionHandModelUrl,
  createMotionHand,
  updateMotionHand,
  isMotionHand,
  MotionHand,
} from "../motion-hand.js";
import { Group, Object3D } from "three";

export const HandBoneGroup = forwardRef<
  Group,
  {
    joint: XRHandJoint | Array<XRHandJoint>;
    rotationJoint?: XRHandJoint;
    children?: ReactNode;
  }
>(({ joint, rotationJoint, children }, ref) => {
  const internalRef = useRef<Group>(null);
  useFrame(() => {
    if (internalRef.current == null) {
      return;
    }
    const motionHand = internalRef.current.parent;
    if (motionHand == null || !isMotionHand(motionHand)) {
      throw new Error(`HandBoneGroup can only be placed directly under DynamicHandModel`);
    }
    const bone = Array.isArray(joint)
      ? joint.map(getBoneObject.bind(null, motionHand))
      : getBoneObject(motionHand, joint);
    if (Array.isArray(bone)) {
      internalRef.current.position.set(0, 0, 0);
      for (const object of bone) {
        internalRef.current.position.add(object.position);
      }
      internalRef.current.position.divideScalar(bone.length);
    } else {
      internalRef.current.position.copy(bone.position);
    }
    const rotationBone = rotationJoint == null ? bone : motionHand.boneMap.get(rotationJoint);
    if (rotationBone == null) {
      throw new Error(`unknown joint "${rotationJoint}" in ${motionHand.boneMap}`);
    }
    if (Array.isArray(rotationBone)) {
      throw new Error(`multiple rotation joints are not implemented`);
    } else {
      internalRef.current.quaternion.copy(rotationBone.quaternion);
    }
  });
  useImperativeHandle(ref, () => internalRef.current!, []);
  return <group ref={internalRef}>{children}</group>;
});

export function getBoneObject(motionHand: MotionHand, joint: XRHandJoint) {
  const bone = motionHand.boneMap.get(joint);
  if (bone == null) {
    throw new Error(`unknown joint "${joint}" in ${motionHand.boneMap}`);
  }
  return bone;
}

export const DynamicHandModel = forwardRef<
  Object3D,
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
  useFrame((state, delta, frame: XRFrame | undefined) => {
    if (
      frame == null ||
      frame.session.visibilityState === "hidden" ||
      frame.session.visibilityState === "visible-blurred"
    ) {
      motionHand.visible = false;
      return;
    }
    const referenceSpace = state.gl.xr.getReferenceSpace();
    if (referenceSpace == null) {
      motionHand.visible = false;
      return;
    }
    const poseValid = updateMotionHand(motionHand, frame, referenceSpace);
    motionHand.visible = poseValid;
  });
  useImperativeHandle(ref, () => motionHand.boneMap.get("wrist")!, []);
  return <primitive object={motionHand}>{children}</primitive>;
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
