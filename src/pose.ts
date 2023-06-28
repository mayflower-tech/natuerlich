import { Matrix4, Quaternion } from "three";

//based on https://github.com/AdaRoseCannon/handy-work/blob/main/src/handpose.js

//null means that we are currently loading the pose
const poseStorage = new Map<string, Float32Array | undefined | null>();

const invertedWirstHelper = new Matrix4();
const matrixHelper = new Matrix4();

export function updateHandMatrices(
  frame: XRFrame,
  referenceSpace: XRSpace,
  hand: XRHand,
  handMatrices: Float32Array,
): void {
  (frame as any).fillPoses(hand.values(), referenceSpace, handMatrices);

  //calculate bone poses in relation to the wrist

  // The first item in hand pose information is the wrist
  invertedWirstHelper.fromArray(handMatrices, 0);
  invertedWirstHelper.invert();

  const size = handMatrices.length / 16;
  for (let i = 0; i < size; i++) {
    const offset = i * 16;
    matrixHelper.fromArray(handMatrices, offset);
    matrixHelper.premultiply(invertedWirstHelper);
    matrixHelper.toArray(handMatrices, offset);
  }
}

const tempMat1 = new Matrix4();
const tempMat2 = new Matrix4();
const tempQuat1 = new Quaternion();
const tempQuat2 = new Quaternion();

export function computeHandPoseDistance(
  handedness: XRHandedness,
  handMatrices: Float32Array,
  poseData: Float32Array,
): number {
  const isRight = Number(handedness === "right");
  const poseHandDataSize = poseData[0];
  const poseHandData = new Float32Array(
    poseData.buffer,
    (1 + // poseHandDataSize offset
      poseHandDataSize * 16 * isRight) * // offset for right hand
      4,
    poseHandDataSize * 16,
  );
  const poseWeightData = new Float32Array(
    poseData.buffer,
    (1 + // poseHandDataSize offset
      poseHandDataSize * 16 * 2 + // offset for after hand data
      poseHandDataSize * isRight) * // offset for right hand
      4,
    poseHandDataSize,
  );

  const jointCount = Math.min(poseHandDataSize, handMatrices.length / 16);
  let dist = 0;
  let totalWeight = 0.0001;
  for (let i = 0; i < jointCount; i++) {
    const poseWeight = poseWeightData[i];
    totalWeight += poseWeight;
    if (i === 0) continue;

    // Algo based on join rotation apply quaternion to a vector and
    // compare positions of vectors should work a bit better
    const o = i * 16;
    tempMat1.fromArray(poseHandData, o);
    tempMat2.fromArray(handMatrices, o);
    tempQuat1.setFromRotationMatrix(tempMat1);
    tempQuat2.setFromRotationMatrix(tempMat2);
    dist += tempQuat1.angleTo(tempQuat2) * poseWeight;
  }
  return dist / totalWeight;
}

export function getHandPose(path: string, baseUrl: string): Float32Array | undefined {
  const href = new URL(path, baseUrl).href;
  const pose = poseStorage.get(href);
  if (pose != null) {
    return pose;
  }
  if (pose === undefined) {
    //loading process was never started
    poseStorage.set(href, null);
    //start loading process and save to poseStorage
    fetch(href)
      .then((response) => response.arrayBuffer())
      .then((buffer) => poseStorage.set(href, new Float32Array(buffer)))
      .catch(console.error);
  }
  return undefined;
}
