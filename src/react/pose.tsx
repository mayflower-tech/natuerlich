import { useFrame } from "@react-three/fiber";
import { useCallback, useMemo, useRef } from "react";
import { computeHandPoseDistance, getHandPose, updateHandMatrices } from "../index.js";

/**
 * @returns a function to download the current hand pose (left and right)
 */
export function useHandPoses(
  hand: XRHand,
  handedness: XRHandedness,
  onPose: (name: string, prevName: string | undefined, offsetToOtherPoses: number) => void,
  poseUrlMap: Record<string, string>,
  baseUrl = "/",
): () => void {
  const handMatrices = useMemo(() => new Float32Array(hand.size * 16), [hand.size]);
  const prevPoseName = useRef<string | undefined>();
  const dumbRef = useRef<boolean>(false);
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
      if (dumbRef.current) {
        downloadPose(pose);
        dumbRef.current = false;
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

  return useCallback(() => (dumbRef.current = true), []);
}

function downloadPose(pose: Float32Array) {
  const a = window.document.createElement("a");

  a.href = window.URL.createObjectURL(
    new Blob([new Uint8Array(pose.buffer)], { type: "application/octet-stream" }),
  );
  a.download = "untitled.handpose";

  // Append anchor to body.
  document.body.appendChild(a);
  a.click();

  // Remove anchor from body
  document.body.removeChild(a);
}
