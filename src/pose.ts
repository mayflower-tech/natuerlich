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
  handMatrices: Float32Array,
  poseData: Float32Array,
  mirror: boolean,
): number {
  const joinCountFromPose = poseData[0];
  const poseHandData = new Float32Array(
    poseData.buffer,
    4 * 1, //1 float
    joinCountFromPose * 16, //1 matrix for every joint
  );
  const poseWeightData = new Float32Array(
    poseData.buffer,
    4 * (1 + joinCountFromPose * 16), //directly after the pose hand data
    joinCountFromPose, //1 weight as float for every joint
  );

  const jointCount = Math.min(joinCountFromPose, handMatrices.length / 16);
  let dist = 0;
  let totalWeight = 0.0001;
  for (let i = 0; i < jointCount; i++) {
    const poseWeight = poseWeightData[i];
    totalWeight += poseWeight;
    if (i === 0) continue;

    // Algo based on join rotation apply quaternion to a vector and
    // compare positions of vectors should work a bit better
    const offset = i * 16;

    //pose bone quaternion
    tempMat1.fromArray(poseHandData, offset);
    tempQuat1.setFromRotationMatrix(tempMat1);
    if (mirror) {
      mirrorQuaterionOnXAxis(tempQuat1);
    }

    //current bone quaternion
    tempMat2.fromArray(handMatrices, offset);
    tempQuat2.setFromRotationMatrix(tempMat2);

    dist += tempQuat1.angleTo(tempQuat2) * poseWeight;
  }
  return dist / totalWeight;
}

export function storeHandData(handMatrices: Float32Array, mirror: boolean): Float32Array {
  const jointCount = handMatrices.length / 16;
  const result = new Float32Array(1 + jointCount * 16 + jointCount);
  result[0] = jointCount;
  for (let i = 0; i < jointCount; i++) {
    tempMat1.fromArray(handMatrices, i * 16);
    if (mirror) {
      tempQuat1.setFromRotationMatrix(tempMat1);
      mirrorQuaterionOnXAxis(tempQuat1);
      // Copies the rotation component of the supplied matrix m into this matrix rotation component.
      tempMat1.makeRotationFromQuaternion(tempQuat1);
    }
    tempMat1.toArray(result, 1 + i * 16);
  }
  //weights are all 1
  result.fill(1, 1 + jointCount * 16);
  return result;
}

export function getHandPose(path: string, baseUrl: string): Float32Array | undefined {
  const href = [path, baseUrl].join("/").replace(/(?<!https:)(?<!http:)\/(\/)+/g, "/");
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

function mirrorQuaterionOnXAxis(quaternion: Quaternion): void {
  quaternion.x = -quaternion.x;
  quaternion.w = -quaternion.w;
}
