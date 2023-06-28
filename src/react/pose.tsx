import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { computeHandPoseDistance, getHandPose, updateHandMatrices } from "../index.js";

export function useHandPoses(
  hand: XRHand,
  handedness: XRHandedness,
  onPose: (name: string, prevName: string | undefined, offsetToOtherPoses: number) => void,
  poseUrlMap: Record<string, string>,
  baseUrl = "https://192.168.179.56:5173/",
): void {
  const handMatrices = useMemo(() => new Float32Array(hand.size * 16), [hand.size]);
  const prevPoseName = useRef<string | undefined>();
  useFrame((state, _delta, frame: XRFrame | undefined) => {
    const referenceSpace = state.gl.xr.getReferenceSpace();
    if (frame == null || referenceSpace == null) {
      return;
    }

    updateHandMatrices(frame, referenceSpace, hand, handMatrices);

    let bestPoseName: string | undefined;
    let bestPoseDistance: number | undefined;
    let bestPoseOffset: number | undefined;
    for (const [name, path] of Object.entries(poseUrlMap)) {
      const pose = getHandPose(path, baseUrl);
      if (pose == null) {
        continue;
      }
      const distance = computeHandPoseDistance(handedness, handMatrices, pose);
      if (bestPoseDistance == null || distance < bestPoseDistance) {
        bestPoseOffset = bestPoseDistance == null ? Infinity : bestPoseDistance - distance;
        bestPoseDistance = distance;
        bestPoseName = name;
      } else if (bestPoseOffset != null) {
        bestPoseOffset = Math.min(bestPoseOffset, distance - bestPoseDistance);
      }
    }
    if (bestPoseName == null || bestPoseOffset == null) {
      return;
    }
    onPose(bestPoseName, prevPoseName.current, bestPoseOffset);
    prevPoseName.current = bestPoseName;
  });
}
