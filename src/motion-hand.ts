import { Object3D } from "three";
import { DEFAULT_PROFILES_PATH } from "./index.js";

//from https://github.com/pmndrs/three-stdlib/blob/main/src/webxr/XRHandMeshModel.ts

const DEFAULT_HAND_PROFILE = "generic-hand";

const joints = [
  "wrist",
  "thumb-metacarpal",
  "thumb-phalanx-proximal",
  "thumb-phalanx-distal",
  "thumb-tip",
  "index-finger-metacarpal",
  "index-finger-phalanx-proximal",
  "index-finger-phalanx-intermediate",
  "index-finger-phalanx-distal",
  "index-finger-tip",
  "middle-finger-metacarpal",
  "middle-finger-phalanx-proximal",
  "middle-finger-phalanx-intermediate",
  "middle-finger-phalanx-distal",
  "middle-finger-tip",
  "ring-finger-metacarpal",
  "ring-finger-phalanx-proximal",
  "ring-finger-phalanx-intermediate",
  "ring-finger-phalanx-distal",
  "ring-finger-tip",
  "pinky-finger-metacarpal",
  "pinky-finger-phalanx-proximal",
  "pinky-finger-phalanx-intermediate",
  "pinky-finger-phalanx-distal",
  "pinky-finger-tip",
] as const;

export function getMotionHandModelUrl(
  handedness: string,
  basePath = DEFAULT_PROFILES_PATH,
  defaultProfileId = DEFAULT_HAND_PROFILE,
) {
  return `${basePath}/${defaultProfileId}/${handedness}.glb`;
}

export type MotionHandBoneMap = Map<XRHandJoint, Object3D>;

export type MotionHand = Object3D & { boneMap: MotionHandBoneMap; hand: XRHand };

export function createMotionHand(hand: XRHand, object: Object3D): MotionHand {
  const mesh = object.getObjectByProperty("type", "SkinnedMesh")!;
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const boneMap: MotionHandBoneMap = new Map();

  for (const jointName of joints) {
    const bone = object.getObjectByName(jointName);
    if (bone == null) {
      continue;
    }
    boneMap.set(jointName, bone);
  }

  return Object.assign(object, { boneMap, hand });
}

export function isMotionHand(object: Object3D): object is MotionHand {
  return "boneMap" in object;
}

export function updateMotionHand(
  { boneMap, hand }: MotionHand,
  frame: XRFrame,
  referenceSpace: XRReferenceSpace,
) {
  for (const inputJoint of hand.values()) {
    const jointPose = frame.getJointPose?.(inputJoint, referenceSpace);
    const bone = boneMap.get(inputJoint.jointName);

    if (jointPose == null || bone == null) {
      continue;
    }

    const { position, orientation } = jointPose.transform;

    bone.position.set(position.x, position.y, position.z);
    bone.quaternion.set(orientation.x, orientation.y, orientation.z, orientation.w);
  }
}
